import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.core.config import settings


logger = logging.getLogger("uvicorn.error")


async def send_otp_email(recipient_email: str, otp_code: str, subject_prefix: Optional[str] = None) -> bool:
    """
    Send OTP verification email via SMTP.
    Uses Mailtrap for testing or any SMTP provider.
    Returns True if successful, False otherwise.
    """
    try:
        # Prepare email content
        subject_label = subject_prefix or "Email Verification"
        subject = f"Your {subject_label} Code - FashionAI"
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #c65d2c; text-align: center;">{subject_label}</h2>
                    <p>Hi there,</p>
                    <p>Your OTP verification code is:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <h1 style="color: #c65d2c; letter-spacing: 3px; margin: 0; font-family: monospace;">{otp_code}</h1>
                    </div>
                    <p style="color: #666;">This code will expire in {settings.otp_expiry_minutes} minutes.</p>
                    <p style="color: #666; font-size: 12px;">If you did not request this code, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">FashionAI Team</p>
                </div>
            </body>
        </html>
        """

        # Normalize credentials and sender
        smtp_password = settings.smtp_password.replace(" ", "") if settings.smtp_password else ""
        from_email = settings.smtp_from_email
        if "gmail" in settings.smtp_host.lower() and settings.smtp_username:
            from_email = settings.smtp_username

        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{settings.smtp_from_name} <{from_email}>"
        message["To"] = recipient_email

        # Attach HTML
        html_part = MIMEText(html_body, "html")
        message.attach(html_part)

        # Send email
        logger.info(f"Attempting to send OTP email to {recipient_email}")
        logger.info(f"SMTP Server: {settings.smtp_host}:{settings.smtp_port}, UseSTLS: {settings.smtp_use_tls}")

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            
            # Only login if credentials are provided
            if settings.smtp_username and smtp_password:
                try:
                    server.login(settings.smtp_username, smtp_password)
                except smtplib.SMTPAuthenticationError as auth_err:
                    # Re-raise authentication errors - credentials are wrong
                    raise auth_err
                except smtplib.SMTPException as smtp_err:
                    # Some servers (like debug server) don't support AUTH, which is okay
                    if "AUTH" in str(smtp_err).upper():
                        logger.warning(f"SMTP server doesn't support AUTH, continuing without login")
                    else:
                        raise smtp_err
            
            server.sendmail(from_email, recipient_email, message.as_string())

        logger.info(f"✓ OTP email sent successfully to {recipient_email}")
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"✗ SMTP Authentication failed: {str(e)}")
        logger.error("Check SMTP_USERNAME and SMTP_PASSWORD in .env")
        return False
    
    except smtplib.SMTPException as e:
        logger.error(f"✗ SMTP error occurred: {str(e)}")
        return False
    
    except Exception as e:
        # Log full stack trace to help diagnose unexpected failures (credentials, network, etc.)
        logger.exception("✗ Failed to send OTP email")
        return False


__all__ = ["send_otp_email"]
