from pydantic import EmailStr


def normalize_email(email: str) -> str:
    return str(EmailStr(email)).lower()


__all__ = ["normalize_email"]
