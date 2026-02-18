"""
Capa de Lenguaje Natural (NLP Engine)
Interpreta frases en español plano y las convierte en operaciones financieras.

El usuario describe resultados en lenguaje natural en lugar de pensar en fórmulas.
Ejemplo: "Mis ventas de enero fueron 50 mil y gasté 30 mil en mercancía"
-> Crea un financial_record con revenue=50000, cogs=30000, period_month=1
"""
import re
from typing import Optional


# Mapeo de meses en español a números
MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
    "ene": 1, "feb": 2, "mar": 3, "abr": 4,
    "may": 5, "jun": 6, "jul": 7, "ago": 8,
    "sep": 9, "oct": 10, "nov": 11, "dic": 12,
}

# Patrones de intención
PATTERNS = {
    "register_sales": [
        r"(?:mis\s+)?ventas?\s+(?:de\s+)?(?P<month>\w+)\s+(?:fueron?|son)\s+(?:de\s+)?\$?(?P<amount>[\d.,]+)\s*(?:mil|k)?",
        r"vend[ií]\s+\$?(?P<amount>[\d.,]+)\s*(?:mil|k)?\s+(?:en\s+)?(?P<month>\w+)?",
        r"(?:factur[eé]|ingres[eé])\s+\$?(?P<amount>[\d.,]+)\s*(?:mil|k)?",
    ],
    "register_costs": [
        r"(?:gast[eé]|cost[oó])\s+(?:de\s+)?(?:ventas?\s+)?\$?(?P<amount>[\d.,]+)\s*(?:mil|k)?\s+(?:en\s+)?(?:mercancía|producto|material|inventario)?",
        r"(?:costo\s+de\s+ventas?|cogs?)\s+(?:es|fue|son)\s+(?:de\s+)?\$?(?P<amount>[\d.,]+)\s*(?:mil|k)?",
    ],
    "register_rent": [
        r"(?:alquiler|renta|arrendamiento)\s+(?:es|fue|cuesta)\s+(?:de\s+)?\$?(?P<amount>[\d.,]+)\s*(?:mil|k)?",
        r"pago?\s+(?:de\s+)?(?:alquiler|renta)\s+(?:de\s+)?\$?(?P<amount>[\d.,]+)\s*(?:mil|k)?",
    ],
    "register_payroll": [
        r"(?:n[oó]mina|planilla|salarios)\s+(?:es|fue|cuesta|total)\s+(?:de\s+)?\$?(?P<amount>[\d.,]+)\s*(?:mil|k)?",
        r"pago?\s+(?:de\s+)?(?:n[oó]mina|planilla)\s+(?:de\s+)?\$?(?P<amount>[\d.,]+)\s*(?:mil|k)?",
    ],
    "query_profit": [
        r"(?:cu[aá]nto\s+)?(?:me\s+queda|gano|utilidad|ganancia)",
        r"(?:cu[aá]l\s+es\s+)?(?:mi\s+)?(?:utilidad|ganancia|beneficio)",
    ],
    "query_breakeven": [
        r"(?:punto\s+de\s+equilibrio|cu[aá]nto\s+(?:debo|tengo\s+que)\s+vender)",
        r"(?:m[ií]nimo\s+de\s+ventas?|breakeven)",
    ],
    "simulate_price": [
        r"(?:si\s+)?sub[oa]\s+(?:el\s+)?precio\s+(?:un\s+)?(?P<percent>\d+)\s*%",
        r"(?:qu[eé]\s+pasa\s+si\s+)?aumento?\s+(?:precios?|ventas?)\s+(?:un\s+)?(?P<percent>\d+)\s*%",
    ],
    "query_diagnosis": [
        r"(?:c[oó]mo\s+(?:est[aá]|va)\s+)?(?:mi\s+)?(?:negocio|empresa|salud)",
        r"diagn[oó]stico|veredicto|an[aá]lisis",
    ],
}


def _parse_amount(text: str) -> float:
    """Convierte texto a número: '50 mil' -> 50000, '30,500' -> 30500."""
    clean = text.replace(",", "").replace(".", "").strip()
    try:
        value = float(clean)
    except ValueError:
        return 0

    # Detectar "mil" o "k" en contexto cercano
    return value


def _detect_multiplier(query: str, amount: float) -> float:
    """Si el usuario dice 'mil' o 'k', multiplicar por 1000."""
    if re.search(r"\b(?:mil|k)\b", query, re.IGNORECASE):
        if amount < 1000:
            return amount * 1000
    return amount


def _extract_month(query: str) -> Optional[int]:
    """Extrae el mes de la frase."""
    query_lower = query.lower()
    for mes_name, mes_num in MESES.items():
        if mes_name in query_lower:
            return mes_num
    return None


def interpret_query(query: str) -> dict:
    """
    Interpreta una frase en español plano y devuelve la acción a tomar.

    Returns:
        dict con:
        - action: tipo de acción detectada
        - understood: si se entendió la intención
        - extracted_data: datos extraídos (montos, meses, etc.)
        - description: descripción legible de lo que se interpretó
        - suggestion: sugerencia si no se entendió
    """
    query_lower = query.lower().strip()

    # Buscar coincidencia en cada patrón
    for action, patterns in PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, query_lower)
            if match:
                groups = match.groupdict()
                extracted = {}

                # Extraer monto
                if "amount" in groups:
                    raw_amount = _parse_amount(groups["amount"])
                    extracted["amount"] = _detect_multiplier(query_lower, raw_amount)

                # Extraer mes
                if "month" in groups and groups["month"]:
                    month = MESES.get(groups["month"])
                    if month:
                        extracted["month"] = month
                else:
                    month = _extract_month(query_lower)
                    if month:
                        extracted["month"] = month

                # Extraer porcentaje
                if "percent" in groups:
                    extracted["percent"] = float(groups["percent"])

                # Generar descripción
                description = _generate_description(action, extracted)

                return {
                    "action": action,
                    "understood": True,
                    "extracted_data": extracted,
                    "description": description,
                    "suggestion": None,
                }

    # No se entendió
    return {
        "action": "unknown",
        "understood": False,
        "extracted_data": {},
        "description": "No pude interpretar tu solicitud.",
        "suggestion": (
            "Intenta frases como:\n"
            "- 'Mis ventas de enero fueron 50 mil'\n"
            "- 'Gasté 30 mil en mercancía'\n"
            "- 'Mi alquiler cuesta 5 mil'\n"
            "- 'Cómo está mi negocio?'\n"
            "- 'Si subo el precio un 10%, qué pasa?'"
        ),
    }


def _generate_description(action: str, data: dict) -> str:
    """Genera una descripción legible de la acción interpretada."""
    month_names = {v: k.capitalize() for k, v in MESES.items() if len(k) > 3}

    descriptions = {
        "register_sales": lambda: (
            f"Registrar ventas de ${data.get('amount', 0):,.0f}"
            + (f" para {month_names.get(data.get('month', 0), '')}" if data.get("month") else "")
        ),
        "register_costs": lambda: f"Registrar costo de ventas: ${data.get('amount', 0):,.0f}",
        "register_rent": lambda: f"Registrar alquiler: ${data.get('amount', 0):,.0f}",
        "register_payroll": lambda: f"Registrar nómina: ${data.get('amount', 0):,.0f}",
        "query_profit": lambda: "Consultar utilidad/ganancia del negocio",
        "query_breakeven": lambda: "Calcular punto de equilibrio",
        "simulate_price": lambda: f"Simular aumento de precio del {data.get('percent', 0)}%",
        "query_diagnosis": lambda: "Generar diagnóstico completo del negocio",
    }

    gen = descriptions.get(action, lambda: "Acción detectada")
    return gen()
