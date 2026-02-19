"""
Tests unitarios para la generacion automatica de asientos contables
a partir de financial_records (puente inverso).
"""
import pytest
from app.engines.accounting_engine import (
    generate_journal_from_financial_record,
    validate_journal_entry,
)


# ============================================================
# Fixture: financial_record completo
# ============================================================

@pytest.fixture
def complete_record():
    """Record con todos los campos P&L con valores > 0."""
    return {
        "revenue": 50000,
        "cogs": 20000,
        "opex_rent": 3000,
        "opex_payroll": 8000,
        "opex_other": 4000,
        "depreciation": 500,
        "interest_expense": 300,
        "tax_expense": 200,
    }


@pytest.fixture
def partial_record():
    """Record con solo algunos campos."""
    return {
        "revenue": 30000,
        "cogs": 15000,
        "opex_rent": 0,
        "opex_payroll": 0,
        "opex_other": 0,
        "depreciation": 0,
        "interest_expense": 0,
        "tax_expense": 0,
    }


@pytest.fixture
def empty_record():
    """Record con todos los campos en 0."""
    return {
        "revenue": 0,
        "cogs": 0,
        "opex_rent": 0,
        "opex_payroll": 0,
        "opex_other": 0,
        "depreciation": 0,
        "interest_expense": 0,
        "tax_expense": 0,
    }


# ============================================================
# Tests de generacion
# ============================================================

class TestGenerateJournal:
    def test_complete_record_generates_8_entries(self, complete_record):
        """Record completo -> 8 asientos (uno por campo P&L)."""
        entries = generate_journal_from_financial_record(complete_record)
        assert len(entries) == 8

    def test_partial_record_skips_zeros(self, partial_record):
        """Campos en 0 no generan asientos."""
        entries = generate_journal_from_financial_record(partial_record)
        assert len(entries) == 2  # Solo revenue y cogs

    def test_empty_record_no_entries(self, empty_record):
        """Record todo en 0 -> lista vacia."""
        entries = generate_journal_from_financial_record(empty_record)
        assert len(entries) == 0

    def test_revenue_entry_correct_accounts(self, complete_record):
        """Revenue -> Debe 1.1.1 (Bancos), Haber 4.1.1 (Ventas)."""
        entries = generate_journal_from_financial_record(complete_record)
        revenue_entry = entries[0]  # Revenue es el primero en el mapeo
        assert revenue_entry["description"] == "Ingreso por ventas del periodo"
        assert revenue_entry["lines"][0]["account_code"] == "1.1.1"
        assert revenue_entry["lines"][0]["debe"] == 50000
        assert revenue_entry["lines"][1]["account_code"] == "4.1.1"
        assert revenue_entry["lines"][1]["haber"] == 50000

    def test_depreciation_uses_contra_account(self, complete_record):
        """Depreciacion -> Haber 1.2.4 (Dep. Acumulada), no 1.1.1."""
        entries = generate_journal_from_financial_record(complete_record)
        # Depreciation es el 6to en la lista (index 5)
        dep_entry = [e for e in entries if "Depreciacion" in e["description"]][0]
        assert dep_entry["lines"][0]["account_code"] == "5.4.1"
        assert dep_entry["lines"][1]["account_code"] == "1.2.4"

    def test_tax_uses_isr_por_pagar(self, complete_record):
        """Impuestos -> Haber 2.1.7 (ISR por Pagar), no 1.1.1."""
        entries = generate_journal_from_financial_record(complete_record)
        tax_entry = [e for e in entries if "ISR" in e["description"]][0]
        assert tax_entry["lines"][0]["account_code"] == "5.5.1"
        assert tax_entry["lines"][1]["account_code"] == "2.1.7"


# ============================================================
# Tests de validacion (cada asiento pasa partida doble)
# ============================================================

class TestAutoJournalValidation:
    def test_all_entries_pass_validation(self, complete_record):
        """Todos los asientos auto-generados pasan validate_journal_entry."""
        entries = generate_journal_from_financial_record(complete_record)
        for entry in entries:
            result = validate_journal_entry(entry["lines"])
            assert result["valid"], f"Asiento '{entry['description']}' fallo: {result['errors']}"

    def test_entries_balanced(self, complete_record):
        """Cada asiento tiene DEBE == HABER."""
        entries = generate_journal_from_financial_record(complete_record)
        for entry in entries:
            total_debe = sum(l["debe"] for l in entry["lines"])
            total_haber = sum(l["haber"] for l in entry["lines"])
            assert total_debe == total_haber, (
                f"Asiento '{entry['description']}': DEBE={total_debe} != HABER={total_haber}"
            )

    def test_all_entries_have_source_marker(self, complete_record):
        """Todos los asientos tienen source = 'auto_from_financial'."""
        entries = generate_journal_from_financial_record(complete_record)
        for entry in entries:
            assert entry["source"] == "auto_from_financial"

    def test_each_entry_has_two_lines(self, complete_record):
        """Cada asiento tiene exactamente 2 lineas (partida simple)."""
        entries = generate_journal_from_financial_record(complete_record)
        for entry in entries:
            assert len(entry["lines"]) == 2

    def test_no_line_has_both_debe_and_haber(self, complete_record):
        """Ninguna linea tiene DEBE y HABER al mismo tiempo."""
        entries = generate_journal_from_financial_record(complete_record)
        for entry in entries:
            for line in entry["lines"]:
                assert not (line["debe"] > 0 and line["haber"] > 0)
