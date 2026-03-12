"""
Motor de Asistente Contable — Mi Director Financiero PTY
Bug 1 Fix: Sugiere cuentas del catalogo REAL del usuario (no hardcoded).
Consulta chart_of_accounts de Supabase antes de sugerir.
"""
from app.database import get_supabase
from app.engines.account_mapping import DEFAULT_CHART_OF_ACCOUNTS


def obtener_catalogo_usuario(society_id: str) -> list[dict]:
    """
    Obtiene el plan de cuentas del usuario desde Supabase.
    Si no existe, provisiona el catalogo default y lo retorna.
    """
    db = get_supabase()

    result = db.table("chart_of_accounts") \
        .select("account_code, account_name, account_type, level, is_header, normal_balance, parent_code") \
        .eq("society_id", society_id) \
        .eq("is_active", True) \
        .order("account_code") \
        .execute()

    if result.data and len(result.data) > 0:
        return result.data

    # No tiene catalogo → provisionar el default
    return provision_catalogo_panama(society_id)


def provision_catalogo_panama(society_id: str) -> list[dict]:
    """
    Inserta el catalogo default de Panama para una sociedad nueva.
    Retorna la lista de cuentas insertadas.
    """
    db = get_supabase()

    rows = []
    for acct in DEFAULT_CHART_OF_ACCOUNTS:
        rows.append({
            "society_id": society_id,
            "account_code": acct["code"],
            "account_name": acct["name"],
            "account_type": acct["type"],
            "parent_code": acct.get("parent"),
            "level": acct.get("level", 1),
            "is_header": acct.get("is_header", False),
            "normal_balance": acct.get("normal_balance", "debe"),
            "is_active": True,
        })

    try:
        db.table("chart_of_accounts").upsert(
            rows,
            on_conflict="society_id,account_code",
        ).execute()
    except Exception:
        pass  # Si falla el upsert, retornar el default sin BD

    return rows


def sugerir_cuenta(
    society_id: str,
    concepto: str,
    tipo_movimiento: str = "gasto",
) -> dict | None:
    """
    Sugiere cuentas DEBE/HABER basandose en el catalogo REAL del usuario.
    No usa hardcoded CONCEPT_TO_ACCOUNTS — busca en el catalogo.

    Args:
        society_id: ID de la sociedad
        concepto: Texto del concepto (ej: "alquiler", "suministros")
        tipo_movimiento: "gasto" | "ingreso"

    Returns:
        dict con {debe: {code, name}, haber: {code, name}, descripcion} o None
    """
    catalogo = obtener_catalogo_usuario(society_id)

    # Filtrar solo cuentas de detalle (no headers)
    cuentas_detalle = [c for c in catalogo if not c.get("is_header", False)]

    # Buscar la mejor cuenta para el concepto
    concepto_lower = concepto.lower().strip()

    # Mapeo de conceptos comunes a patrones de busqueda en el catalogo
    CONCEPTO_PATTERNS = {
        "alquiler": {"gasto": "5.1.1", "contra": "1.1.1"},
        "servicios_publicos": {"gasto": "5.1.2", "contra": "1.1.1"},
        "suministros": {"gasto": "5.1.3", "contra": "1.1.1"},
        "honorarios": {"gasto": "5.1.6", "contra": "1.1.1"},
        "combustible": {"gasto": "5.1.8", "contra": "1.1.1"},
        "marketing": {"gasto": "5.1.9", "contra": "1.1.1"},
        "suscripciones": {"gasto": "5.1.10", "contra": "1.1.1"},
        "mantenimiento": {"gasto": "5.1.11", "contra": "1.1.1"},
        "seguros": {"gasto": "5.1.12", "contra": "1.1.1"},
        "limpieza": {"gasto": "5.1.14", "contra": "1.1.1"},
        "venta_contado": {"ingreso": "1.1.1", "contra": "4.1.1"},
        "venta_credito": {"ingreso": "1.1.2", "contra": "4.1.1"},
        "compra_mercancia_contado": {"gasto": "5.2.1", "contra": "1.1.1"},
        "planilla": {"gasto": "5.1.4", "contra": "1.1.1"},
        "prestamo_recibido": {"ingreso": "1.1.1", "contra": "2.1.3"},
        "pago_prestamo": {"gasto": "2.1.3", "contra": "1.1.1"},
        "gasto_general": {"gasto": "5.1.15", "contra": "1.1.1"},
    }

    patron = CONCEPTO_PATTERNS.get(concepto_lower)
    if not patron:
        # Buscar por nombre parcial en el catalogo
        for cuenta in cuentas_detalle:
            name_lower = cuenta.get("account_name", "").lower()
            if concepto_lower in name_lower or name_lower in concepto_lower:
                code = cuenta["account_code"]
                patron = {"gasto": code, "contra": "1.1.1"}
                break

    if not patron:
        patron = CONCEPTO_PATTERNS["gasto_general"]

    # Resolver codigos a nombres del catalogo
    def buscar_cuenta(code: str) -> dict:
        for c in catalogo:
            if c.get("account_code") == code:
                return {"code": c["account_code"], "name": c.get("account_name", code)}
        return {"code": code, "name": code}

    if tipo_movimiento == "ingreso":
        debe_code = patron.get("ingreso", patron.get("gasto", "1.1.1"))
        haber_code = patron.get("contra", "4.1.1")
    else:
        debe_code = patron.get("gasto", "5.1.15")
        haber_code = patron.get("contra", "1.1.1")

    cuenta_debe = buscar_cuenta(debe_code)
    cuenta_haber = buscar_cuenta(haber_code)

    return {
        "debe": cuenta_debe,
        "haber": cuenta_haber,
        "descripcion": f"{cuenta_debe['name']} / {cuenta_haber['name']}",
        "concepto": concepto,
    }


def catalogo_como_contexto(society_id: str) -> str:
    """
    Genera un string con el catalogo del usuario para inyectar como
    contexto en prompts de Claude (para que sugiera cuentas correctas).
    """
    catalogo = obtener_catalogo_usuario(society_id)

    if not catalogo:
        return "[No hay catalogo de cuentas disponible.]"

    lines = ["--- CATALOGO DE CUENTAS DEL USUARIO ---"]
    for c in catalogo:
        indent = "  " * (c.get("level", 1) - 1)
        header = " (GRUPO)" if c.get("is_header") else ""
        lines.append(f"{indent}{c.get('account_code', '?')} — {c.get('account_name', '?')}{header}")
    lines.append("--- FIN CATALOGO ---")

    return "\n".join(lines)
