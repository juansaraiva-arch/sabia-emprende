"""
Sistema de errores contables — Mi Director Financiero PTY
Bug 6 Fix: Errores tipados para el modulo de contabilidad.
"""
from fastapi import Request
from fastapi.responses import JSONResponse


class AccountingError(Exception):
    """Error base para operaciones contables."""

    def __init__(self, message: str, code: str = "ACCOUNTING_ERROR", status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)


class EntryNotBalancedError(AccountingError):
    """El asiento no cuadra (DEBE != HABER)."""

    def __init__(self, debe: float, haber: float):
        diff = round(abs(debe - haber), 2)
        super().__init__(
            message=f"El asiento no cuadra. DEBE (${debe:,.2f}) != HABER (${haber:,.2f}). Diferencia: ${diff:,.2f}",
            code="ENTRY_NOT_BALANCED",
            status_code=400,
        )


class PeriodClosedError(AccountingError):
    """El periodo contable esta cerrado."""

    def __init__(self, month: int, year: int):
        super().__init__(
            message=f"El periodo {month}/{year} esta cerrado. No se pueden modificar asientos.",
            code="PERIOD_CLOSED",
            status_code=400,
        )


class AccountNotFoundError(AccountingError):
    """Cuenta no encontrada en el plan de cuentas."""

    def __init__(self, account_code: str):
        super().__init__(
            message=f"Cuenta '{account_code}' no existe en el plan de cuentas.",
            code="ACCOUNT_NOT_FOUND",
            status_code=404,
        )


class InsufficientBalanceError(AccountingError):
    """Saldo insuficiente en la cuenta."""

    def __init__(self, account_code: str, saldo: float, monto: float):
        super().__init__(
            message=f"Saldo insuficiente en cuenta {account_code}. Saldo actual: ${saldo:,.2f}, monto requerido: ${monto:,.2f}.",
            code="INSUFFICIENT_BALANCE",
            status_code=400,
        )


class DuplicateEntryError(AccountingError):
    """Asiento duplicado detectado."""

    def __init__(self, fingerprint: str):
        super().__init__(
            message=f"Transaccion duplicada detectada (fingerprint: {fingerprint[:30]}...).",
            code="DUPLICATE_ENTRY",
            status_code=409,
        )


async def accounting_error_handler(request: Request, exc: AccountingError) -> JSONResponse:
    """Handler global para AccountingError — se registra en main.py."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "ok": False,
            "error": exc.message,
            "code": exc.code,
        },
    )
