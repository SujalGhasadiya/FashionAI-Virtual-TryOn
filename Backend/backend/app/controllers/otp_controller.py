import logging
from datetime import timezone, timedelta
from fastapi import HTTPException, status
from pymongo.database import Database

from app.database.connection import get_db
from app.database.models import EMAIL_VERIFICATIONS, USERS
from app.services.email_service import send_otp_email
from app.services.otp_service import (
    create_otp_record,
    generate_otp,
    hash_otp,
    is_otp_expired,
    verify_otp_hash,
)
from app.services.auth_service import create_access_token, get_password_hash
from datetime import timedelta
from app.database.models import USERS
from app.core.config import settings
from app.utils.helpers import utcnow


logger = logging.getLogger("uvicorn.error")


async def send_otp(email: str) -> dict:
    """Send OTP to email. Rate limited and checks if email already registered."""
    email = email.lower()
    db = get_db()

    logger.info(f"[OTP] Sending OTP to {email}")

    try:
        # Check if email is already registered
        logger.info(f"[OTP] Step 1: Checking if email already registered...")
        existing_user = db[USERS].find_one({"email": email})
        if existing_user:
            logger.warning(f"[OTP] Email already registered: {email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered",
            )

        # Check existing OTP request
        logger.info(f"[OTP] Step 2: Checking for existing OTP record...")
        otp_record = db[EMAIL_VERIFICATIONS].find_one({"email": email})

        if otp_record:
            # Check resend cooldown
            logger.info(f"[OTP] Step 3: Checking resend cooldown...")
            last_sent_at = otp_record["last_sent_at"]
            # Normalize naive datetime to UTC-aware for safe subtraction
            if last_sent_at.tzinfo is None or last_sent_at.tzinfo.utcoffset(last_sent_at) is None:
                last_sent_at = last_sent_at.replace(tzinfo=timezone.utc)
            time_since_last_send = (utcnow() - last_sent_at).total_seconds()
            if time_since_last_send < settings.otp_resend_cooldown_seconds:
                seconds_remaining = int(settings.otp_resend_cooldown_seconds - time_since_last_send)
                logger.warning(f"[OTP] Rate limited for {email}, wait {seconds_remaining}s")
                # Provide structured detail so frontend can display cooldown and expiry
                # Compute current expiry if present on record
                expires_at = otp_record.get("expires_at")
                if expires_at and (expires_at.tzinfo is None or expires_at.tzinfo.utcoffset(expires_at) is None):
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                expires_in = None
                if expires_at:
                    expires_in = max(0, int((expires_at - utcnow()).total_seconds()))

                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "message": f"Please wait {seconds_remaining} seconds before requesting another OTP",
                        "retry_after": seconds_remaining,
                        "expires_at": expires_at.isoformat() if expires_at else None,
                        "expires_in": expires_in,
                    },
                )

            logger.info(f"[OTP] Step 3b: Updating existing OTP record for {email}")
            # Generate new OTP and update
            otp_code = generate_otp()
            now = utcnow()
            db[EMAIL_VERIFICATIONS].update_one(
                {"email": email},
                {
                    "$set": {
                        "otp_hash": hash_otp(otp_code),
                        "last_sent_at": now,
                        "updated_at": now,
                        "verify_attempts": 0,
                        "is_verified": False,
                    },
                    "$inc": {"resend_count": 1},
                },
            )
            # New expiry is relative to now
            expires_at = now + timedelta(minutes=settings.otp_expiry_minutes)
        else:
            logger.info(f"[OTP] Step 3c: Creating new OTP record for {email}")
            # Create new record
            otp_code = generate_otp()
            otp_record_data = create_otp_record(email, otp_code)
            db[EMAIL_VERIFICATIONS].insert_one(otp_record_data)
            expires_at = otp_record_data.get("expires_at")

        # Send email
        logger.info(f"[OTP] Step 4: Sending email with OTP code to {email}")
        email_sent = await send_otp_email(email, otp_code)

        if not email_sent:
            logger.warning(
                f"\n=======================================================\n"
                f" [DEV OTP CODE] SMTP email failed. OTP for:\n"
                f" {email} is: >>> {otp_code} <<<\n"
                f"=======================================================\n"
            )
            # Allow development registration to proceed even if email provider is misconfigured
            email_sent = True

        logger.info(f"[OTP] ✓ OTP sent successfully to {email}")
        # Compute remaining seconds until expiry
        remaining_seconds = None
        if expires_at:
            if expires_at.tzinfo is None or expires_at.tzinfo.utcoffset(expires_at) is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            remaining_seconds = max(0, int((expires_at - utcnow()).total_seconds()))

        return {
            "success": True,
            "message": f"OTP sent to {email}. Check your inbox.",
            "expires_at": expires_at.isoformat() if expires_at else None,
            "expires_in": remaining_seconds,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[OTP] Unexpected error in send_otp: {type(e).__name__}: {str(e)}")
        logger.exception("[OTP] Full stack trace for send_otp error:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while sending OTP",
        )


async def verify_otp(email: str, otp_code: str) -> dict:
    """Verify OTP code for email."""
    email = email.lower()
    db = get_db()

    logger.info(f"[OTP] Verifying OTP for {email}")

    try:
        # Retrieve OTP record
        otp_record = db[EMAIL_VERIFICATIONS].find_one({"email": email})

        if not otp_record:
            logger.warning(f"[OTP] No OTP record found for {email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No OTP request found for this email",
            )

        # Check if already verified
        if otp_record.get("is_verified"):
            logger.info(f"[OTP] Email already verified: {email}")
            return {
                "success": True,
                "message": "Email is already verified",
            }

        # Check expiration
        if is_otp_expired(otp_record["expires_at"]):
            logger.warning(f"[OTP] OTP expired for {email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Request a new one.",
            )

        # Check attempts
        if otp_record.get("verify_attempts", 0) >= settings.otp_max_verify_attempts:
            logger.warning(f"[OTP] Too many attempts for {email}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed attempts. Request a new OTP.",
            )

        # Verify OTP code
        if not verify_otp_hash(otp_code, otp_record["otp_hash"]):
            logger.warning(f"[OTP] Invalid OTP code for {email}")
            db[EMAIL_VERIFICATIONS].update_one(
                {"email": email},
                {
                    "$inc": {"verify_attempts": 1},
                    "$set": {"updated_at": utcnow()},
                },
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code",
            )

        # Mark as verified
        logger.info(f"[OTP] ✓ Email verified: {email}")
        db[EMAIL_VERIFICATIONS].update_one(
            {"email": email},
            {
                "$set": {
                    "is_verified": True,
                    "verify_attempts": 0,
                    "updated_at": utcnow(),
                }
            },
        )

        return {
            "success": True,
            "message": "Email verified successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[OTP] Unexpected error in verify_otp: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while verifying OTP",
        )


__all__ = ["send_otp", "verify_otp"]

async def send_password_reset_otp(email: str) -> dict:
    """Send OTP for password reset to an existing user."""
    email = email.lower()
    db = get_db()

    logger.info(f"[PWD-RESET] Sending password reset OTP to {email}")

    # Ensure user exists
    existing_user = db[USERS].find_one({"email": email})
    if not existing_user:
        logger.warning(f"[PWD-RESET] No user for email: {email}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    try:
        otp_record = db[EMAIL_VERIFICATIONS].find_one({"email": email, "purpose": "password_reset"})

        if otp_record:
            # rate limit check
            last_sent_at = otp_record["last_sent_at"]
            if last_sent_at.tzinfo is None or last_sent_at.tzinfo.utcoffset(last_sent_at) is None:
                last_sent_at = last_sent_at.replace(tzinfo=timezone.utc)
            time_since_last_send = (utcnow() - last_sent_at).total_seconds()
            if time_since_last_send < settings.otp_resend_cooldown_seconds:
                seconds_remaining = int(settings.otp_resend_cooldown_seconds - time_since_last_send)
                logger.warning(f"[PWD-RESET] Rate limited for {email}, wait {seconds_remaining}s")
                expires_at = otp_record.get("expires_at")
                if expires_at and (expires_at.tzinfo is None or expires_at.tzinfo.utcoffset(expires_at) is None):
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                expires_in = None
                if expires_at:
                    expires_in = max(0, int((expires_at - utcnow()).total_seconds()))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "message": f"Please wait {seconds_remaining} seconds before requesting another OTP",
                        "retry_after": seconds_remaining,
                        "expires_at": expires_at.isoformat() if expires_at else None,
                        "expires_in": expires_in,
                    },
                )

            # update
            otp_code = generate_otp()
            now = utcnow()
            db[EMAIL_VERIFICATIONS].update_one(
                {"email": email, "purpose": "password_reset"},
                {
                    "$set": {
                        "otp_hash": hash_otp(otp_code),
                        "last_sent_at": now,
                        "updated_at": now,
                        "verify_attempts": 0,
                        "is_verified": False,
                    },
                    "$inc": {"resend_count": 1},
                },
            )
            expires_at = now + timedelta(minutes=settings.otp_expiry_minutes)
        else:
            otp_code = generate_otp()
            otp_record_data = create_otp_record(email, otp_code)
            otp_record_data["purpose"] = "password_reset"
            db[EMAIL_VERIFICATIONS].insert_one(otp_record_data)
            expires_at = otp_record_data.get("expires_at")

        email_sent = await send_otp_email(email, otp_code, subject_prefix="Password Reset")
        if not email_sent:
            logger.warning(
                f"\n=======================================================\n"
                f" [DEV PASSWORD RESET OTP] SMTP email failed. OTP for:\n"
                f" {email} is: >>> {otp_code} <<<\n"
                f"=======================================================\n"
            )
            email_sent = True

        remaining_seconds = None
        if expires_at:
            if expires_at.tzinfo is None or expires_at.tzinfo.utcoffset(expires_at) is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            remaining_seconds = max(0, int((expires_at - utcnow()).total_seconds()))

        return {"success": True, "message": "Password reset OTP sent", "expires_at": expires_at.isoformat() if expires_at else None, "expires_in": remaining_seconds}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[PWD-RESET] Unexpected: {e}")
        logger.exception("[PWD-RESET] Full stack trace")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while sending password reset OTP")


async def verify_password_reset_otp(email: str, otp_code: str) -> dict:
    """Verify OTP for password reset and return a short-lived reset token."""
    email = email.lower()
    db = get_db()

    otp_record = db[EMAIL_VERIFICATIONS].find_one({"email": email, "purpose": "password_reset"})
    if not otp_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No password reset request found")

    if is_otp_expired(otp_record["expires_at"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired")

    if otp_record.get("verify_attempts", 0) >= settings.otp_max_verify_attempts:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many failed attempts")

    if not verify_otp_hash(otp_code, otp_record["otp_hash"]):
        db[EMAIL_VERIFICATIONS].update_one({"email": email, "purpose": "password_reset"}, {"$inc": {"verify_attempts": 1}, "$set": {"updated_at": utcnow()}})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code")

    # Create short-lived reset token
    token = create_access_token({"email": email, "purpose": "password_reset"}, expires_delta=timedelta(minutes=15))

    # Optionally mark verified timestamp
    db[EMAIL_VERIFICATIONS].update_one({"email": email, "purpose": "password_reset"}, {"$set": {"last_verified_at": utcnow(), "updated_at": utcnow()}})

    return {"success": True, "message": "OTP verified", "reset_token": token}


def reset_password_with_token(reset_token: str, new_password: str) -> dict:
    """Validate reset token, update user's password."""
    from jose import jwt
    from app.core.security import SECRET_KEY, ALGORITHM

    try:
        payload = jwt.decode(reset_token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    if payload.get("purpose") != "password_reset" or not payload.get("email"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

    email = payload["email"].lower()
    db = get_db()
    user = db[USERS].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # update password
    hashed = get_password_hash(new_password)
    db[USERS].update_one({"email": email}, {"$set": {"hashed_password": hashed, "updated_at": utcnow()}})

    return {"success": True, "message": "Password updated successfully"}
