"""
Capa de Inteligencia Artificial (OpenAI) — Mi Director Financiero PTY
Endpoints: scan-receipt, voice-expense, merge-transaction, simplify-legal, survival-alert
Todos usan response_format={"type":"json_object"} para GPT-4o.
"""
import os
import json
import base64
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.auth import AuthenticatedUser, get_current_user
from pydantic import BaseModel
from dotenv import load_dotenv

# Buscar .env relativo a este archivo: backend/.env
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

router = APIRouter()

# ============================================
# CLIENTE OPENAI — inicialización lazy
# ============================================

_openai_client = None


def get_openai():
    global _openai_client
    if _openai_client is None:
        try:
            from openai import OpenAI
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="Paquete 'openai' no instalado. Ejecuta: pip install openai",
            )

        # Re-cargar .env por si no se leyó en el import
        load_dotenv(dotenv_path=_env_path, override=True)
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail=f"OPENAI_API_KEY no configurada. Archivo .env: {_env_path} (existe: {_env_path.exists()})",
            )
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


# ============================================
# HELPERS
# ============================================

def safe_json_parse(text: str) -> dict:
    """Intenta parsear JSON de la respuesta de GPT."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Intenta extraer JSON de un bloque markdown ```json ... ```
        import re
        match = re.search(r"```json?\s*([\s\S]*?)```", text)
        if match:
            return json.loads(match.group(1))
        return {"raw_response": text, "error": "No se pudo parsear JSON"}


def gpt4o_json(system_prompt: str, user_content, model: str = "gpt-4o") -> dict:
    """Llamada genérica a GPT-4o con response_format json_object."""
    client = get_openai()

    # user_content puede ser string o lista (para vision)
    if isinstance(user_content, str):
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]
    else:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=1000,
        )
        return safe_json_parse(response.choices[0].message.content)

    except Exception as e:
        error_type = type(e).__name__
        # Manejar errores específicos de OpenAI
        error_msg = str(e)

        if "rate_limit" in error_msg.lower() or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Limite de uso de OpenAI alcanzado. Intenta en unos segundos.",
            )
        elif "invalid_api_key" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(
                status_code=401,
                detail="API Key de OpenAI invalida. Verifica tu OPENAI_API_KEY.",
            )
        elif "insufficient_quota" in error_msg.lower():
            raise HTTPException(
                status_code=402,
                detail="Credito insuficiente en tu cuenta de OpenAI.",
            )
        elif "model_not_found" in error_msg.lower() or "404" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Modelo '{model}' no disponible en tu cuenta OpenAI.",
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Error OpenAI ({error_type}): {error_msg[:200]}",
            )


# ============================================
# 1. SCAN RECEIPT — Vision (imagen de factura)
# ============================================

@router.post("/scan-receipt")
async def scan_receipt(file: UploadFile = File(...), user: AuthenticatedUser = Depends(get_current_user)):
    """
    Recibe imagen de factura/recibo.
    GPT-4o Vision extrae: total, ITBMS, proveedor, categoría.
    """
    # Validar tipo de archivo
    allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no soportado: {file.content_type}. Usa JPG, PNG o WebP.",
        )

    # Leer y codificar en base64
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:  # 20MB max
        raise HTTPException(status_code=400, detail="Imagen demasiado grande (max 20MB).")

    b64_image = base64.b64encode(content).decode("utf-8")
    mime = file.content_type

    system_prompt = (
        "Eres un contador publico autorizado en Panama. "
        "Analiza esta imagen de factura o recibo y extrae la informacion financiera. "
        "Devuelve UNICAMENTE un JSON con estos campos exactos: "
        '{"total": number, "itbms": number, "proveedor": string, '
        '"categoria_sugerida": string, "fecha": string|null, '
        '"descripcion_items": string, "confianza": "alta"|"media"|"baja"}. '
        "El ITBMS en Panama es 7%. Si no puedes detectar un campo, usa null. "
        "Las categorias sugeridas son: alimentacion, transporte, servicios, "
        "suministros, tecnologia, alquiler, profesional, otro."
    )

    user_content = [
        {
            "type": "text",
            "text": "Analiza esta factura/recibo y extrae la informacion financiera en JSON.",
        },
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:{mime};base64,{b64_image}",
                "detail": "high",
            },
        },
    ]

    result = gpt4o_json(system_prompt, user_content)

    return {
        "status": "ok",
        "source": "gpt-4o-vision",
        "filename": file.filename,
        "data": result,
    }


# ============================================
# 2. VOICE EXPENSE — Whisper + GPT-4o
# ============================================

@router.post("/voice-expense")
async def voice_expense(file: UploadFile = File(...), user: AuthenticatedUser = Depends(get_current_user)):
    """
    Recibe audio de cualquier formato (incluido 3GP/AMR de Android).
    Transcribe con Whisper. GPT-4o extrae intención financiera.
    """
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:  # 25MB Whisper limit
        raise HTTPException(status_code=400, detail="Audio demasiado grande (max 25MB).")

    if len(content) < 100:
        raise HTTPException(status_code=400, detail="Audio demasiado corto o vacio.")

    client = get_openai()

    # Mapear extensión a formato que Whisper acepta
    # Whisper acepta: mp3, mp4, mpeg, mpga, m4a, wav, webm
    # Android graba en 3gp/amr que son contenedores mp4-compatibles
    WHISPER_EXT_MAP = {
        "mp3": "mp3", "wav": "wav", "webm": "webm", "ogg": "ogg",
        "m4a": "m4a", "mp4": "mp4", "mpeg": "mpeg", "mpga": "mpga",
        "3gp": "mp4", "3gpp": "mp4", "amr": "mp4",  # Android → mp4
        "aac": "m4a", "flac": "mp3", "wma": "mp3",
    }

    original_ext = (file.filename or "audio.webm").split(".")[-1].lower()
    safe_ext = WHISPER_EXT_MAP.get(original_ext, "mp4")  # default mp4

    tmp_path = None
    try:
        # Crear archivo temporal con extensión segura para Whisper
        with tempfile.NamedTemporaryFile(suffix=f".{safe_ext}", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="es",
                response_format="text",
            )
    except Exception as e:
        error_str = str(e)
        # Si falla con mp4, reintentar con webm
        if safe_ext != "webm" and tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
            try:
                with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp2:
                    tmp2.write(content)
                    tmp_path = tmp2.name
                with open(tmp_path, "rb") as audio_file2:
                    transcription = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file2,
                        language="es",
                        response_format="text",
                    )
            except Exception as e2:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error Whisper (formato {original_ext}→{safe_ext}, retry webm): {str(e2)[:200]}",
                )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Error Whisper (formato {original_ext}→{safe_ext}): {error_str[:200]}",
            )
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    transcript_text = transcription.strip() if isinstance(transcription, str) else str(transcription).strip()

    if not transcript_text:
        return {
            "status": "warning",
            "transcript": "",
            "data": None,
            "message": "No se detecto audio con voz.",
        }

    # Paso 2: GPT-4o interpreta la intención financiera
    system_prompt = (
        "Eres un asistente financiero para emprendedores en Panama. "
        "El usuario dicto un gasto o ingreso por voz. Analiza la transcripcion "
        "y extrae la intencion financiera. "
        "Devuelve UNICAMENTE un JSON con estos campos: "
        '{"tipo": "ingreso"|"gasto", "monto": number|null, '
        '"concepto": string, "categoria": string, '
        '"confianza": "alta"|"media"|"baja", '
        '"nota": string}. '
        "Si no puedes determinar el monto, usa null y explica en 'nota'. "
        "Las categorias son: alimentacion, transporte, servicios, "
        "suministros, tecnologia, alquiler, profesional, nomina, ventas, otro."
    )

    result = gpt4o_json(system_prompt, f"Transcripcion de voz: \"{transcript_text}\"")

    return {
        "status": "ok",
        "source": "whisper-1 + gpt-4o",
        "transcript": transcript_text,
        "data": result,
    }


# ============================================
# 3. SIMPLIFY LEGAL — Traductor de jerga legal
# ============================================

class SimplifyRequest(BaseModel):
    text: str
    context: Optional[str] = "contrato de sociedad anonima en Panama"


@router.post("/simplify-legal")
async def simplify_legal(req: SimplifyRequest, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Recibe texto jurídico complejo.
    GPT-4o lo traduce a lenguaje coloquial simple.
    """
    if not req.text or len(req.text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="El texto legal debe tener al menos 10 caracteres.",
        )

    if len(req.text) > 5000:
        raise HTTPException(
            status_code=400,
            detail="Texto demasiado largo. Maximo 5000 caracteres por consulta.",
        )

    system_prompt = (
        "Eres un abogado panameno con experiencia en derecho corporativo y "
        "una habilidad especial para explicar cosas complejas de forma simple. "
        "Traduce la clausula legal que recibas a maximo 2 lineas de lenguaje "
        "coloquial simple que cualquier emprendedor sin formacion legal pueda entender. "
        "Devuelve UNICAMENTE un JSON con estos campos: "
        '{"simple": string, "riesgo": "bajo"|"medio"|"alto", '
        '"emoji": string, "tip": string}. '
        "En 'simple' pon la traduccion coloquial (max 2 lineas). "
        "En 'riesgo' indica si la clausula representa riesgo para el emprendedor. "
        "En 'emoji' pon un emoji representativo. "
        "En 'tip' da un consejo practico de 1 linea."
    )

    user_text = f"Contexto: {req.context}\n\nClausula legal:\n{req.text}"

    result = gpt4o_json(system_prompt, user_text)

    return {
        "status": "ok",
        "source": "gpt-4o",
        "original_length": len(req.text),
        "data": result,
    }


# ============================================
# 4. SURVIVAL ALERT — Alerta de supervivencia
# ============================================

class SurvivalRequest(BaseModel):
    ebitda: float
    monthly_burn: float
    revenue: float
    tasa_unica_deadline: Optional[str] = None  # ISO date string
    society_name: Optional[str] = "Tu empresa"


@router.post("/survival-alert")
async def survival_alert(req: SurvivalRequest, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Recibe datos financieros.
    GPT-4o genera mensaje empático sobre oxígeno financiero.
    """
    # Calcular meses de oxígeno
    if req.monthly_burn > 0:
        months_oxygen = round(max(0, req.ebitda * 12 / req.monthly_burn), 1)
    else:
        months_oxygen = 99  # Sin quema = oxígeno infinito

    # Calcular días para Tasa Única
    tasa_info = "No hay fecha de vencimiento registrada."
    if req.tasa_unica_deadline:
        try:
            deadline = datetime.fromisoformat(req.tasa_unica_deadline)
            days_remaining = (deadline - datetime.now()).days
            if days_remaining < 0:
                tasa_info = f"Tasa Unica VENCIDA hace {abs(days_remaining)} dias. Multa de $50 aplicable."
            elif days_remaining <= 30:
                tasa_info = f"Tasa Unica vence en {days_remaining} dias ({deadline.strftime('%d/%m/%Y')})."
            else:
                tasa_info = f"Tasa Unica al dia. Proximo pago en {days_remaining} dias."
        except Exception:
            tasa_info = "Fecha de Tasa Unica no valida."

    system_prompt = (
        "Eres un mentor financiero empatico para emprendedores en Panama. "
        "Hablas de forma directa pero con calidez humana. "
        "Genera un mensaje de EXACTAMENTE 3 lineas: "
        "Linea 1: Estado del oxigeno financiero (cuantos meses puede sobrevivir). "
        "Linea 2: Situacion de la Tasa Unica. "
        "Linea 3: Un consejo actionable de 1 linea. "
        "Devuelve UNICAMENTE un JSON con: "
        '{"mensaje_linea_1": string, "mensaje_linea_2": string, '
        '"mensaje_linea_3": string, "severity": "ok"|"warning"|"critical", '
        '"months_oxygen": number, "emoji": string}.'
    )

    user_data = (
        f"Empresa: {req.society_name}\n"
        f"EBITDA mensual: ${req.ebitda:,.2f}\n"
        f"Quema mensual (gastos fijos): ${req.monthly_burn:,.2f}\n"
        f"Ingresos mensuales: ${req.revenue:,.2f}\n"
        f"Meses estimados de oxigeno: {months_oxygen}\n"
        f"Tasa Unica: {tasa_info}"
    )

    result = gpt4o_json(system_prompt, user_data)

    return {
        "status": "ok",
        "source": "gpt-4o",
        "calculated": {
            "months_oxygen": months_oxygen,
            "tasa_unica_info": tasa_info,
        },
        "data": result,
    }


# ============================================
# 5. MERGE TRANSACTION — Data Merging (foto + voz)
# ============================================
# Fusiona datos de factura (OCR) con contexto de voz (NLP)
# en un solo registro contable unificado.

class MergeRequest(BaseModel):
    receipt_data: Optional[dict] = None  # Resultado de scan-receipt
    voice_data: Optional[dict] = None    # Resultado de voice-expense
    voice_transcript: Optional[str] = None
    society_id: str = "demo-society-001"


@router.post("/merge-transaction")
async def merge_transaction(req: MergeRequest, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Data Merging: Combina informacion de factura escaneada (OCR) con
    contexto dictado por voz (NLP) para crear un registro contable completo.

    Regla: La foto aporta monto exacto, fecha y proveedor.
    La voz aporta categoria y contexto ("esto fue almuerzo con clientes").
    El sistema fusiona ambos y genera el asiento de diario automaticamente.
    """
    from app.engines.account_mapping import CONCEPT_TO_ACCOUNTS

    # Extraer datos de ambas fuentes
    receipt = req.receipt_data or {}
    voice = req.voice_data or {}

    # Prioridad: monto de factura > monto de voz
    amount = receipt.get("total") or voice.get("monto")
    if not amount or amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="No se pudo determinar el monto. Proporciona una foto o dicta el monto.",
        )

    # Prioridad: fecha de factura > hoy
    date_str = receipt.get("fecha") or datetime.now().strftime("%Y-%m-%d")

    # Proveedor: de la factura
    supplier = receipt.get("proveedor") or voice.get("concepto") or "No especificado"

    # Categoria: voz tiene prioridad (el usuario la dice) > OCR sugiere
    category = voice.get("categoria") or receipt.get("categoria_sugerida") or "otro"

    # Tipo: voz tiene prioridad
    tx_type = voice.get("tipo", "gasto")

    # Descripcion fusionada
    receipt_desc = receipt.get("descripcion_items", "")
    voice_note = req.voice_transcript or voice.get("nota", "")
    description = f"{supplier} - {receipt_desc}" if receipt_desc else supplier
    if voice_note:
        description += f" ({voice_note})"

    # ITBMS de la factura
    itbms = receipt.get("itbms", 0)

    # Mapeo a concepto contable
    CATEGORY_TO_CONCEPT = {
        "alimentacion": "comida_clientes",
        "transporte": "combustible",
        "servicios": "servicios_publicos",
        "suministros": "suministros",
        "tecnologia": "suscripciones",
        "alquiler": "alquiler",
        "profesional": "honorarios",
        "nomina": "planilla",
        "ventas": "venta_contado",
        "mantenimiento": "mantenimiento",
        "combustible": "combustible",
        "viaticos": "viaticos",
        "seguros": "seguros",
        "marketing": "marketing",
        "capacitacion": "capacitacion",
        "entrenamiento": "capacitacion",
        "limpieza": "limpieza",
        "suscripciones": "suscripciones",
        "reparaciones": "reparaciones",
        "donaciones": "donaciones",
        "viaje": "viajes",
        "legal": "gastos_legales",
        "flete": "flete",
        "representacion": "representacion",
        "otro": "gasto_general",
    }

    concept_key = CATEGORY_TO_CONCEPT.get(category, "gasto_general")
    if tx_type == "ingreso":
        concept_key = "venta_contado"

    concept = CONCEPT_TO_ACCOUNTS.get(concept_key, CONCEPT_TO_ACCOUNTS["gasto_general"])

    # Generar preview de asiento contable
    journal_lines = []
    for line in concept["lines"]:
        journal_lines.append({
            "account_code": line["account_code"],
            "description": line["description"],
            "debe": float(amount) if line.get("debe") else 0.0,
            "haber": float(amount) if line.get("haber") else 0.0,
        })

    # Generar fingerprint para deduplication
    fingerprint = f"{date_str}|{supplier}|{amount}|{category}".lower().strip()

    # Generar razonamiento para el usuario
    reasoning = (
        f"Categoria detectada: '{category}'. "
        f"Mapeada al concepto contable: '{concept['description']}'. "
        f"Cuenta DEBE: {concept['lines'][0]['account_code']} ({concept['lines'][0]['description']}), "
        f"Cuenta HABER: {concept['lines'][1]['account_code']} ({concept['lines'][1]['description']})."
    )

    return {
        "status": "ok",
        "source": "data-merge",
        "reasoning": reasoning,
        "merged": {
            "amount": float(amount),
            "date": date_str,
            "supplier": supplier,
            "category": category,
            "type": tx_type,
            "description": description,
            "itbms": float(itbms) if itbms else 0.0,
            "concept_key": concept_key,
            "fingerprint": fingerprint,
        },
        "journal_entry_preview": {
            "concept_description": concept["description"],
            "entry_date": date_str,
            "lines": journal_lines,
        },
        "requires_confirmation": True,
        "confirm_payload": {
            "society_id": req.society_id,
            "entry_date": date_str,
            "concept": concept_key,
            "description": description,
            "lines": journal_lines,
            "fingerprint": fingerprint,
        },
    }


# ============================================
# 6. CHECK DUPLICATE — Deduplication
# ============================================

class DeduplicationCheckRequest(BaseModel):
    fingerprint: str
    society_id: str = "demo-society-001"


@router.post("/check-duplicate")
async def check_duplicate(req: DeduplicationCheckRequest, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Deduplication: Verifica si una transaccion ya fue registrada
    usando un fingerprint unico (fecha|proveedor|monto|categoria).
    Evita que el usuario registre el mismo recibo dos veces.
    """
    from app.database import get_supabase

    try:
        supabase = get_supabase()
        # Buscar en journal_entries por fingerprint en metadata
        result = supabase.table("journal_entries") \
            .select("id, entry_date, description, created_at") \
            .eq("society_id", req.society_id) \
            .like("description", f"%{req.fingerprint[:30]}%") \
            .limit(5) \
            .execute()

        if result.data and len(result.data) > 0:
            return {
                "status": "duplicate_found",
                "message": f"Esta transaccion ya fue registrada el {result.data[0].get('entry_date', 'fecha desconocida')}. Quieres registrarla de nuevo?",
                "existing_entries": result.data,
                "is_duplicate": True,
            }

        return {
            "status": "ok",
            "message": "No se encontraron duplicados.",
            "is_duplicate": False,
        }

    except Exception as e:
        # En modo demo o si la tabla no existe, no bloquear
        return {
            "status": "ok",
            "message": "Verificacion de duplicados no disponible (modo demo).",
            "is_duplicate": False,
        }
