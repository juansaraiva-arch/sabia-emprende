"""
Motor de IA centralizado — Anthropic Claude API.
Reemplaza las llamadas directas a OpenAI GPT-4o con Claude.
Whisper (transcripcion de audio) se mantiene con OpenAI — Claude no tiene ASR.
"""
import os
import json
import re
from pathlib import Path
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import HTTPException

# Cargar .env relativo a backend/
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

DEFAULT_MODEL = "claude-sonnet-4-6"


@lru_cache()
def get_claude():
    """Cliente Anthropic singleton (lazy)."""
    try:
        import anthropic
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Paquete 'anthropic' no instalado. Ejecuta: pip install anthropic",
        )

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail=f"ANTHROPIC_API_KEY no configurada. Archivo .env: {_env_path} (existe: {_env_path.exists()})",
        )
    return anthropic.Anthropic(api_key=api_key)


def _safe_json_parse(text: str) -> dict:
    """Intenta parsear JSON de la respuesta de Claude."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Intentar extraer JSON de un bloque markdown ```json ... ```
        match = re.search(r"```json?\s*([\s\S]*?)```", text)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        # Intentar extraer el primer {...} del texto
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        return {"raw_response": text, "error": "No se pudo parsear JSON"}


def _handle_claude_error(e: Exception) -> None:
    """Convierte errores de Anthropic a HTTPException."""
    import anthropic

    error_msg = str(e)

    if isinstance(e, anthropic.RateLimitError):
        raise HTTPException(
            status_code=429,
            detail="Limite de uso de Claude alcanzado. Intenta en unos segundos.",
        )
    elif isinstance(e, anthropic.AuthenticationError):
        raise HTTPException(
            status_code=401,
            detail="API Key de Anthropic invalida. Verifica tu ANTHROPIC_API_KEY.",
        )
    elif isinstance(e, anthropic.PermissionDeniedError):
        raise HTTPException(
            status_code=403,
            detail="Permiso denegado por la API de Anthropic.",
        )
    elif isinstance(e, anthropic.NotFoundError):
        raise HTTPException(
            status_code=404,
            detail=f"Modelo Claude no disponible: {error_msg[:200]}",
        )
    elif isinstance(e, anthropic.APIError):
        raise HTTPException(
            status_code=500,
            detail=f"Error API Anthropic: {error_msg[:200]}",
        )
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Error Claude ({type(e).__name__}): {error_msg[:200]}",
        )


def claude_json(
    system_prompt: str,
    user_content: str,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 1000,
    temperature: float = 0.3,
) -> dict:
    """
    Llamada a Claude que espera respuesta JSON.
    Agrega instruccion de formato JSON al system prompt.
    """
    client = get_claude()

    # Reforzar instruccion de JSON en el system prompt
    json_instruction = (
        "\n\nIMPORTANTE: Responde UNICAMENTE con un JSON valido, "
        "sin texto adicional, sin markdown, sin explicaciones."
    )
    full_system = system_prompt + json_instruction

    try:
        response = client.messages.create(
            model=model,
            system=full_system,
            messages=[{"role": "user", "content": user_content}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        text = response.content[0].text
        return _safe_json_parse(text)

    except Exception as e:
        _handle_claude_error(e)


def claude_text(
    system_prompt: str,
    user_content: str,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 1500,
    temperature: float = 0.4,
    history: list[dict] | None = None,
) -> str:
    """
    Llamada a Claude que retorna texto libre (para chat conversacional).
    Soporta historial de mensajes.
    """
    client = get_claude()

    messages = []
    if history:
        for msg in history[-10:]:  # Max 10 mensajes de contexto
            if msg.get("role") in ("user", "assistant"):
                messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": user_content})

    try:
        response = client.messages.create(
            model=model,
            system=system_prompt,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.content[0].text.strip()

    except Exception as e:
        _handle_claude_error(e)


def claude_vision(
    system_prompt: str,
    image_b64: str,
    mime_type: str,
    user_text: str = "Analiza esta imagen.",
    model: str = DEFAULT_MODEL,
    max_tokens: int = 1000,
    temperature: float = 0.3,
) -> dict:
    """
    Llamada a Claude Vision (imagenes en base64).
    Retorna JSON parseado.
    """
    client = get_claude()

    json_instruction = (
        "\n\nIMPORTANTE: Responde UNICAMENTE con un JSON valido, "
        "sin texto adicional, sin markdown, sin explicaciones."
    )
    full_system = system_prompt + json_instruction

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime_type,
                        "data": image_b64,
                    },
                },
                {
                    "type": "text",
                    "text": user_text,
                },
            ],
        }
    ]

    try:
        response = client.messages.create(
            model=model,
            system=full_system,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        text = response.content[0].text
        return _safe_json_parse(text)

    except Exception as e:
        _handle_claude_error(e)
