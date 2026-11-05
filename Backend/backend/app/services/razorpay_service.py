from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Any
from urllib import error, request

from fastapi import HTTPException, status

from app.core.config import settings


RAZORPAY_API_BASE_URL = "https://api.razorpay.com/v1"


def _require_configuration() -> None:
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay is not configured on the server",
        )


def _basic_auth_header() -> str:
    token = base64.b64encode(f"{settings.razorpay_key_id}:{settings.razorpay_key_secret}".encode("utf-8")).decode(
        "utf-8"
    )
    return f"Basic {token}"


def _make_request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    _require_configuration()
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = request.Request(f"{RAZORPAY_API_BASE_URL}{path}", data=body, method=method)
    req.add_header("Authorization", _basic_auth_header())
    req.add_header("Content-Type", "application/json")

    try:
        with request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        payload_text = exc.read().decode("utf-8") if exc.fp else ""
        message = payload_text or exc.reason or "Razorpay request failed"
        if payload_text:
            try:
                parsed = json.loads(payload_text)
                message = parsed.get("error", {}).get("description") or message
            except json.JSONDecodeError:
                pass

        if exc.code == 401:
            message = "Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"

        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=message)
    except error.URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to reach Razorpay: {exc.reason}",
        )

    return json.loads(raw) if raw else {}


def create_razorpay_order(amount_paise: int, receipt: str, notes: dict[str, str]) -> dict[str, Any]:
    payload = {
        "amount": amount_paise,
        "currency": settings.razorpay_currency,
        "receipt": receipt,
        "notes": notes,
    }
    return _make_request("POST", "/orders", payload)


def fetch_razorpay_order(order_id: str) -> dict[str, Any]:
    return _make_request("GET", f"/orders/{order_id}")


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    _require_configuration()
    expected_signature = hmac.new(
        settings.razorpay_key_secret.encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)


__all__ = ["create_razorpay_order", "fetch_razorpay_order", "verify_razorpay_signature"]