import asyncio
import html as html_module
import json
import os
import re
import uuid
import httpx
from urllib.parse import urlparse
from typing import Dict, Optional

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

from app.core.config import settings

import logging
logger = logging.getLogger("uvicorn.error")

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
TIMEOUT_SECONDS = 30

def _is_tracking_or_preview_url(image_url: str) -> bool:
    return "fls-eu.amazon" in image_url or "oc-csi" in image_url

def _pick_best_image_from_dynamic_attribute(dynamic_value: str) -> Optional[str]:
    try:
        candidates = json.loads(dynamic_value)
    except Exception:
        return None
    if not isinstance(candidates, dict):
        return None
    ordered = sorted(
        candidates.items(),
        key=lambda item: item[1][0] * item[1][1] if isinstance(item[1], list) and len(item[1]) >= 2 else 0,
        reverse=True,
    )
    for image_url, _size in ordered:
        if image_url and not _is_tracking_or_preview_url(image_url):
            return image_url
    return None

def _extract_amazon_image_from_html(page_html: str) -> Optional[str]:
    old_hires_match = re.search(r'data-old-hires="([^"]+)"', page_html)
    if old_hires_match:
        candidate = html_module.unescape(old_hires_match.group(1))
        if candidate and not _is_tracking_or_preview_url(candidate):
            return candidate
    dynamic_match = re.search(r'data-a-dynamic-image="([^"]+)"', page_html)
    if dynamic_match:
        dynamic_value = html_module.unescape(dynamic_match.group(1))
        picked = _pick_best_image_from_dynamic_attribute(dynamic_value)
        if picked:
            return picked
    src_match = re.search(r'src="(https://m\.media-amazon\.com/images/I/[^"]+)"', page_html)
    if src_match:
        candidate = html_module.unescape(src_match.group(1))
        if candidate and not _is_tracking_or_preview_url(candidate):
            return candidate
    return None

async def _extract_image_url_from_page(page) -> Optional[str]:
    page_host = urlparse(page.url).netloc.lower()
    if "amazon" in page_host:
        try:
            await page.wait_for_function(
                """() => {
                    const img = document.querySelector('img#landingImage');
                    return !!(img && (img.getAttribute('data-old-hires') ||
                        (img.getAttribute('src') || '').includes('m.media-amazon.com') ||
                        img.getAttribute('data-a-dynamic-image')));
                }""",
                timeout=10000,
            )
        except Exception:
            pass
        try:
            page_html = await page.content()
            amazon_image = _extract_amazon_image_from_html(page_html)
            if amazon_image:
                return amazon_image
        except Exception:
            pass
        try:
            old_hires = await page.get_attribute('img#landingImage', 'data-old-hires', timeout=5000)
            if old_hires and not _is_tracking_or_preview_url(old_hires):
                return old_hires
        except Exception:
            pass
        try:
            dynamic = await page.get_attribute('img#landingImage', 'data-a-dynamic-image', timeout=5000)
            if dynamic:
                picked = _pick_best_image_from_dynamic_attribute(dynamic)
                if picked:
                    return picked
        except Exception:
            pass

    try:
        og = await page.get_attribute('meta[property="og:image"]', 'content', timeout=5000)
        if og and not _is_tracking_or_preview_url(og):
            return og
    except Exception:
        pass

    try:
        landing = await page.get_attribute('img#landingImage', 'src', timeout=5000)
        if landing and not _is_tracking_or_preview_url(landing):
            return landing
    except Exception:
        pass

    selectors = ['img.product-image', 'img#imgBlkFront', 'img._2r_T1I', 'img._2r_T1I img', 'img[alt*="product"]', 'img[alt*="Product"]']
    for sel in selectors:
        try:
            src = await page.get_attribute(sel, 'src', timeout=3000)
            if src and not _is_tracking_or_preview_url(src):
                return src
        except Exception:
            continue

    try:
        imgs = await page.evaluate("""
            (() => {
                const items = Array.from(document.images)
                    .map(i => ({
                        src: i.src,
                        w: i.naturalWidth || 0,
                        h: i.naturalHeight || 0
                    }));
                items.sort((a, b) => (b.w * b.h) - (a.w * a.h));
                return items.slice(0,1);
            })()
        """)
        if imgs:
            for item in imgs:
                src = item.get('src')
                if src and not _is_tracking_or_preview_url(src):
                    return src
    except Exception:
        logger.debug("Failed to pick largest image via evaluation")

    return None

async def _download_image(url: str, storage_path: str, filename: str) -> str:
    os.makedirs(storage_path, exist_ok=True)
    local_path = os.path.join(storage_path, filename)
    headers = {"User-Agent": USER_AGENT}
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        # Use a stream or HEAD request to check headers first for security
        async with client.stream("GET", url, headers=headers) as resp:
            resp.raise_for_status()
            
            # 1. Validate Content-Type
            content_type = resp.headers.get("Content-Type", "")
            if not content_type.startswith("image/"):
                raise Exception(f"Invalid content type: {content_type}. Only images are allowed.")
            
            # 2. Validate Content-Length (Max 10MB)
            content_length = resp.headers.get("Content-Length")
            if content_length and int(content_length) > 10 * 1024 * 1024:
                raise Exception("Image is too large (max 10MB allowed).")
            
            # Download content
            content = await resp.aread()
            with open(local_path, "wb") as f:
                f.write(content)
    return local_path

async def _fallback_http_extract(url: str) -> Optional[str]:
    try:
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            html = resp.text
            
            # Simple meta og:image extraction
            og_match = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
            if og_match:
                candidate = html_module.unescape(og_match.group(1))
                if not _is_tracking_or_preview_url(candidate):
                    return candidate
            
            # Amazon fallback
            amazon = _extract_amazon_image_from_html(html)
            if amazon: return amazon
            
            return None
    except Exception as e:
        logger.error(f"Fallback HTTP extract failed: {e}")
        return None

async def scrape_image(url: str) -> Dict[str, Optional[str]]:
    async def _run():
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True, 
                args=[
                    '--no-sandbox', 
                    '--disable-http2',
                    '--disable-blink-features=AutomationControlled'
                ]
            )
            context = await browser.new_context(user_agent=USER_AGENT, viewport={'width': 1280, 'height': 720})
            page = await context.new_page()
            
            # Anti-bot stealth injections
            await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            try:
                await page.goto(url, wait_until='domcontentloaded', timeout=TIMEOUT_SECONDS * 1000)
            except PlaywrightTimeoutError:
                raise asyncio.TimeoutError("Page load timed out")
            except Exception as e:
                # If connection reset or other hard network error, fall back to simple HTTP request
                logger.warning(f"Playwright navigation failed ({e}), attempting fallback HTTP request")
                await browser.close()
                return await _fallback_http_extract(url)
            try:
                await page.wait_for_load_state('networkidle', timeout=5000)
            except PlaywrightTimeoutError:
                pass
            await page.wait_for_timeout(3000)
            image_url = await _extract_image_url_from_page(page)
            await browser.close()
            return image_url

    try:
        image_url = await asyncio.wait_for(_run(), timeout=TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        logger.warning("Timeout while scraping %s", url)
        raise Exception("Scraping timed out")
    except Exception as exc:
        logger.exception("Error scraping %s: %s", url, exc)
        raise

    if not image_url:
        return {"image_url": None, "local_path": None}

    ext = os.path.splitext(image_url)[1] or ".jpg"
    ext = ext.split('?')[0] # remove query params from extension
    filename = f"temp_{uuid.uuid4()}{ext}"
    temp_dir = str(settings.media_root / "temp")
    
    try:
        local_path = await _download_image(image_url, temp_dir, filename)
    except Exception as exc:
        logger.exception("Failed to download image %s: %s", image_url, exc)
        raise Exception("Failed to download image")

    return {"image_url": image_url, "local_path": local_path, "filename": filename}
