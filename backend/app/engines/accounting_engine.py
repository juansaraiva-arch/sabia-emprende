"""
Motor Contable — SABIA EMPRENDE
Plan de Cuentas, validacion de asientos, Libro Mayor, Balance de Comprobacion,
y puente automatico: asientos → financial_records.
"""
from typing import Optional
from datetime import date
from .account_mapping import (
    DEFAULT_CHART_OF_ACCOUNTS,
    ACCOUNT_TYPE_TO_FINANCIAL_FIELD,
)


# ==============================================================
# PLAN DE CUENTAS — Inicializacion
# ==============================================================

def get_default_chart_of_accounts(society_id: str) -> list[dict]:
    """Retorna el plan de cuentas default listo para insertar en BD."""
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
    return rows


# ==============================================================
# VALIDACION DE ASIENTOS (Partida Doble)
# ==============================================================

def validate_journal_entry(lines: list[dict]) -> dict:
    """
    Valida un asiento contable:
    1. DEBE == HABER (partida doble)
    2. Al menos 2 lineas
    3. Ninguna linea con DEBE y HABER al mismo tiempo
    4. Ningun monto negativo

    Returns: {"valid": True/False, "errors": [...], "total_debe": x, "total_haber": x}
    """
    errors = []

    if len(lines) < 2:
        errors.append("Un asiento debe tener al menos 2 lineas.")

    total_debe = 0.0
    total_haber = 0.0

    for i, line in enumerate(lines):
        d = float(line.get("debe", 0))
        h = float(line.get("haber", 0))

        if d > 0 and h > 0:
            errors.append(f"Linea {i + 1}: No puede tener DEBE y HABER al mismo tiempo.")
        if d < 0 or h < 0:
            errors.append(f"Linea {i + 1}: Los montos no pueden ser negativos.")
        if d == 0 and h == 0:
            errors.append(f"Linea {i + 1}: Debe tener monto en DEBE o HABER.")

        total_debe += d
        total_haber += h

    total_debe = round(total_debe, 2)
    total_haber = round(total_haber, 2)

    if total_debe != total_haber:
        errors.append(
            f"El asiento no cuadra: DEBE ${total_debe:,.2f} != HABER ${total_haber:,.2f}. "
            f"Diferencia: ${abs(total_debe - total_haber):,.2f}"
        )

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "total_debe": total_debe,
        "total_haber": total_haber,
    }


# ==============================================================
# LIBRO MAYOR — Saldo por cuenta
# ==============================================================

def compute_ledger(
    journal_lines: list[dict],
    account_code: str,
    normal_balance: str = "debe",
) -> dict:
    """
    Calcula el Libro Mayor de una cuenta:
    - Lista de movimientos con saldo acumulado
    - Saldo final

    Args:
        journal_lines: Lineas ya filtradas por account_code, ordenadas por fecha
        account_code: Codigo de la cuenta
        normal_balance: "debe" o "haber"

    Returns: {"account_code", "movements": [...], "saldo_final", "total_debe", "total_haber"}
    """
    movements = []
    saldo = 0.0
    total_debe = 0.0
    total_haber = 0.0

    for line in journal_lines:
        d = float(line.get("debe", 0))
        h = float(line.get("haber", 0))
        total_debe += d
        total_haber += h

        if normal_balance == "debe":
            saldo += d - h
        else:
            saldo += h - d

        movements.append({
            "date": line.get("entry_date", ""),
            "description": line.get("description", ""),
            "reference": line.get("reference", ""),
            "entry_number": line.get("entry_number", ""),
            "debe": round(d, 2),
            "haber": round(h, 2),
            "saldo": round(saldo, 2),
        })

    return {
        "account_code": account_code,
        "total_debe": round(total_debe, 2),
        "total_haber": round(total_haber, 2),
        "saldo_final": round(saldo, 2),
        "movements": movements,
    }


# ==============================================================
# BALANCE DE COMPROBACION
# ==============================================================

def compute_trial_balance(
    accounts: list[dict],
    journal_lines_by_account: dict[str, list[dict]],
) -> dict:
    """
    Calcula el Balance de Comprobacion (4 columnas):
    - Cuenta, DEBE acumulado, HABER acumulado, Saldo Deudor, Saldo Acreedor

    Args:
        accounts: Lista de cuentas del plan [{code, name, type, normal_balance, is_header}]
        journal_lines_by_account: Dict de code -> [lines]

    Returns: {"rows": [...], "totals": {...}}
    """
    rows = []
    total_debe = 0.0
    total_haber = 0.0
    total_deudor = 0.0
    total_acreedor = 0.0

    for acct in sorted(accounts, key=lambda a: a.get("account_code", a.get("code", ""))):
        code = acct.get("account_code", acct.get("code", ""))
        is_header = acct.get("is_header", False)

        if is_header:
            rows.append({
                "account_code": code,
                "account_name": acct.get("account_name", acct.get("name", "")),
                "is_header": True,
                "debe": 0,
                "haber": 0,
                "saldo_deudor": 0,
                "saldo_acreedor": 0,
            })
            continue

        lines = journal_lines_by_account.get(code, [])
        debe_sum = sum(float(l.get("debe", 0)) for l in lines)
        haber_sum = sum(float(l.get("haber", 0)) for l in lines)

        # Skip accounts with no movement
        if debe_sum == 0 and haber_sum == 0:
            continue

        saldo = debe_sum - haber_sum
        saldo_deudor = saldo if saldo > 0 else 0
        saldo_acreedor = abs(saldo) if saldo < 0 else 0

        total_debe += debe_sum
        total_haber += haber_sum
        total_deudor += saldo_deudor
        total_acreedor += saldo_acreedor

        rows.append({
            "account_code": code,
            "account_name": acct.get("account_name", acct.get("name", "")),
            "account_type": acct.get("account_type", acct.get("type", "")),
            "is_header": False,
            "debe": round(debe_sum, 2),
            "haber": round(haber_sum, 2),
            "saldo_deudor": round(saldo_deudor, 2),
            "saldo_acreedor": round(saldo_acreedor, 2),
        })

    return {
        "rows": rows,
        "totals": {
            "total_debe": round(total_debe, 2),
            "total_haber": round(total_haber, 2),
            "total_deudor": round(total_deudor, 2),
            "total_acreedor": round(total_acreedor, 2),
            "balanced": round(total_deudor, 2) == round(total_acreedor, 2),
        },
    }


# ==============================================================
# PUENTE: Asientos → financial_records
# ==============================================================

def aggregate_to_financial_record(
    journal_lines: list[dict],
    period_year: int,
    period_month: int,
) -> dict:
    """
    Suma todas las lineas del periodo por tipo de cuenta y genera
    un dict listo para upsert en financial_records.

    Cuentas de P&L (4.x, 5.x): suman flujo del mes
    Cuentas de Balance (1.x, 2.x): foto al cierre (saldo acumulado)

    Returns: dict con campos de financial_records
    """
    field_sums: dict[str, float] = {
        "revenue": 0,
        "cogs": 0,
        "opex_rent": 0,
        "opex_payroll": 0,
        "opex_other": 0,
        "depreciation": 0,
        "interest_expense": 0,
        "tax_expense": 0,
        "cash_balance": 0,
        "accounts_receivable": 0,
        "inventory": 0,
        "accounts_payable": 0,
        "bank_debt": 0,
    }

    for line in journal_lines:
        code = line.get("account_code", "")
        field = ACCOUNT_TYPE_TO_FINANCIAL_FIELD.get(code)
        if not field:
            continue

        d = float(line.get("debe", 0))
        h = float(line.get("haber", 0))

        # P&L accounts: ingresos HABER suman, costos/gastos DEBE suman
        if code.startswith("4"):
            # Ingresos: haber = positivo, debe = negativo (devoluciones)
            field_sums[field] += h - d
        elif code.startswith("5"):
            # Costos/gastos: debe = positivo
            field_sums[field] += d - h
        else:
            # Balance accounts: activos debe = +, pasivos haber = +
            if code.startswith("1"):
                field_sums[field] += d - h
            elif code.startswith("2"):
                field_sums[field] += h - d

    return {
        "period_year": period_year,
        "period_month": period_month,
        "source": "accounting",
        **{k: round(v, 2) for k, v in field_sums.items()},
    }
