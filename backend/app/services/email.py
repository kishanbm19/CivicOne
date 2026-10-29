"""
Email delivery service for CivicOne.

Sends transactional emails (e.g. password-reset links) via SMTP.
The module degrades gracefully: if SMTP credentials are not configured it
raises ``EmailNotConfiguredError`` so callers can surface a meaningful error
instead of silently swallowing the failure.
"""
from __future__ import annotations

import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ..core.config import settings

logger = logging.getLogger("civicone.email")


class EmailNotConfiguredError(RuntimeError):
    """Raised when SMTP settings are absent and email cannot be sent."""


class EmailDeliveryError(RuntimeError):
    """Raised when the SMTP connection or send operation fails."""


def _smtp_configured() -> bool:
    """Return True only when all mandatory SMTP settings are present."""
    return bool(
        settings.SMTP_HOST
        and settings.SMTP_USER
        and settings.SMTP_PASSWORD
        and settings.SMTP_FROM
    )


def send_password_reset_email(to_address: str, reset_link: str) -> None:
    """
    Deliver a password-reset email to *to_address*.

    Raises:
        EmailNotConfiguredError: SMTP settings are absent.
        EmailDeliveryError:      The SMTP handshake or delivery failed.

    The raw reset token is **never** logged.  Only the recipient address and
    the fact that an email was attempted is recorded at INFO level.
    """
    if not _smtp_configured():
        raise EmailNotConfiguredError(
            "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, "
            "and SMTP_FROM in the server environment or .env file."
        )

    subject = "CivicOne — Password Reset Request"
    html_body = f"""\
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#333;max-width:600px;margin:auto">
  <h2>Password Reset</h2>
  <p>We received a request to reset the password for your CivicOne account.</p>
  <p>
    <a href="{reset_link}" style="
      display:inline-block;padding:12px 24px;background:#1a73e8;
      color:#fff;border-radius:4px;text-decoration:none;font-weight:bold
    ">Reset My Password</a>
  </p>
  <p>This link expires in {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes
     and can only be used once.</p>
  <p>If you did not request a password reset, you can safely ignore this email.</p>
  <hr/>
  <small>CivicOne — Unified Digital Citizen Services</small>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_address
    msg.attach(MIMEText(html_body, "html"))

    logger.info("Sending password-reset email to %s", to_address)

    try:
        if settings.SMTP_TLS:
            context = ssl.create_default_context()
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
                smtp.ehlo()
                smtp.starttls(context=context)
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.sendmail(settings.SMTP_FROM, to_address, msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.sendmail(settings.SMTP_FROM, to_address, msg.as_string())
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending to %s: %s", to_address, exc)
        raise EmailDeliveryError(f"Failed to send email: {exc}") from exc
    except OSError as exc:
        logger.error("Network error sending to %s: %s", to_address, exc)
        raise EmailDeliveryError(f"Failed to send email: {exc}") from exc

    logger.info("Password-reset email delivered to %s", to_address)

