"""
Tests para utils/errors.py — Sistema de errores contables.
"""
import pytest
from app.utils.errors import (
    AccountingError,
    EntryNotBalancedError,
    PeriodClosedError,
    AccountNotFoundError,
    InsufficientBalanceError,
    DuplicateEntryError,
)


class TestAccountingError:
    def test_base_error(self):
        err = AccountingError("Test error")
        assert err.message == "Test error"
        assert err.code == "ACCOUNTING_ERROR"
        assert err.status_code == 400

    def test_custom_code_and_status(self):
        err = AccountingError("Custom", code="CUSTOM", status_code=500)
        assert err.code == "CUSTOM"
        assert err.status_code == 500


class TestEntryNotBalancedError:
    def test_message_includes_amounts(self):
        err = EntryNotBalancedError(debe=1000.00, haber=950.50)
        assert "1,000.00" in err.message
        assert "950.50" in err.message
        assert err.code == "ENTRY_NOT_BALANCED"

    def test_shows_difference(self):
        err = EntryNotBalancedError(debe=500, haber=400)
        assert "100.00" in err.message


class TestPeriodClosedError:
    def test_message_includes_period(self):
        err = PeriodClosedError(month=3, year=2026)
        assert "3/2026" in err.message
        assert err.code == "PERIOD_CLOSED"


class TestAccountNotFoundError:
    def test_message_includes_code(self):
        err = AccountNotFoundError("5.1.99")
        assert "5.1.99" in err.message
        assert err.code == "ACCOUNT_NOT_FOUND"
        assert err.status_code == 404


class TestInsufficientBalanceError:
    def test_message_includes_amounts(self):
        err = InsufficientBalanceError("1.1.1", saldo=500.0, monto=1000.0)
        assert "1.1.1" in err.message
        assert "500.00" in err.message
        assert "1,000.00" in err.message


class TestDuplicateEntryError:
    def test_message_includes_fingerprint(self):
        err = DuplicateEntryError("2026-03-01|Super99|150|alimentacion")
        assert "2026-03-01" in err.message
        assert err.code == "DUPLICATE_ENTRY"
        assert err.status_code == 409
