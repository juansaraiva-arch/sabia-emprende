"""
Utilidad de envio de email — SABIA EMPRENDE
Configurable via variables de entorno. Degrada gracefully si no hay SMTP configurado.
Usa stdlib smtplib + email (sin dependencias externas).

Variables de entorno:
    SMTP_HOST: Servidor SMTP (ej: smtp.gmail.com)
    SMTP_PORT: Puerto SMTP (default 587)
    SMTP_USER: Usuario/email para autenticacion
    SMTP_PASSWORD: Contrasena o app password
    SMTP_FROM_EMAIL: Email remitente (default = SMTP_USER)
    SMTP_FROM_NAME: Nombre del remitente (default = SABIA EMPRENDE)
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders


def is_email_configured() -> bool:
    """Verifica si las variables de SMTP estan configuradas."""
    return bool(os.getenv("SMTP_HOST")) and bool(os.getenv("SMTP_USER"))


def send_report_email(
    to_emails: list[str],
    subject: str,
    body_html: str,
    attachment_bytes: bytes | None = None,
    attachment_filename: str | None = None,
) -> dict:
    """
    Envia un email con reporte PDF adjunto.

    Args:
        to_emails: Lista de correos destinatarios
        subject: Asunto del email
        body_html: Cuerpo del email en HTML
        attachment_bytes: Bytes del PDF/CSV adjunto (opcional)
        attachment_filename: Nombre del archivo adjunto (opcional)

    Returns:
        {"success": True/False, "message": "..."}
    """
    if not is_email_configured():
        return {
            "success": False,
            "message": (
                "Email no configurado. Configure SMTP_HOST, SMTP_PORT, "
                "SMTP_USER, SMTP_PASSWORD en las variables de entorno."
            ),
        }

    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user)
    from_name = os.getenv("SMTP_FROM_NAME", "SABIA EMPRENDE")

    try:
        # Construir mensaje
        msg = MIMEMultipart()
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = ", ".join(to_emails)
        msg["Subject"] = subject

        # Cuerpo HTML
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        # Adjunto (PDF/CSV)
        if attachment_bytes and attachment_filename:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment_bytes)
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{attachment_filename}"',
            )
            msg.attach(part)

        # Enviar
        with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        return {
            "success": True,
            "message": f"Email enviado exitosamente a {', '.join(to_emails)}",
        }

    except smtplib.SMTPAuthenticationError:
        return {
            "success": False,
            "message": "Error de autenticacion SMTP. Verifique usuario y contrasena.",
        }
    except smtplib.SMTPConnectError:
        return {
            "success": False,
            "message": f"No se pudo conectar al servidor SMTP ({smtp_host}:{smtp_port}).",
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error al enviar email: {str(e)}",
        }
