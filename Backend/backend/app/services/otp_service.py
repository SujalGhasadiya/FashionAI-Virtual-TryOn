import random
import string
import hashlib
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.utils.helpers import utcnow


def generate_otp(length: int | None = None) -> str:
    """Generate a random OTP code (digits only)."""
    otp_length = length or settings.otp_length
    return "".join(random.choices(string.digits, k=otp_length))


def hash_otp(otp_code: str) -> str:
    """Hash OTP code for secure storage."""
    return hashlib.sha256(otp_code.encode()).hexdigest()


def verify_otp_hash(plain_otp: str, stored_hash: str) -> bool:
    """Verify plain OTP against stored hash."""
    return hash_otp(plain_otp) == stored_hash


def is_otp_expired(expires_at: datetime) -> bool:
    """Check if OTP has expired."""
    # Ensure expires_at is timezone-aware (assume UTC if naive) to avoid
    # comparisons between offset-naive and offset-aware datetimes.
    if expires_at.tzinfo is None or expires_at.tzinfo.utcoffset(expires_at) is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return utcnow() > expires_at


def create_otp_record(email: str, otp_code: str) -> dict:
    """Create a new OTP verification record."""
    now = utcnow()
    expires_at = now + timedelta(minutes=settings.otp_expiry_minutes)

    return {
        "email": email.lower(),
        "otp_hash": hash_otp(otp_code),
        "expires_at": expires_at,
        "is_verified": False,
        "verify_attempts": 0,
        "resend_count": 0,
        "last_sent_at": now,
        "created_at": now,
        "updated_at": now,
    }


__all__ = [
    "create_otp_record",
    "generate_otp",
    "hash_otp",
    "is_otp_expired",
    "verify_otp_hash",
]
