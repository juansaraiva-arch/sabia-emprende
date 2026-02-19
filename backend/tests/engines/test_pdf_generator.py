"""
Tests unitarios para pdf_generator.py
Smoke tests: verificar que los PDFs se generan sin errores
y retornan bytes validos (header %PDF).
"""
import pytest
from app.engines.pdf_generator import (
    generate_libro_diario_pdf,
    generate_libro_mayor_pdf,
    generate_trial_balance_pdf,
)


# ============================================================
# generate_libro_diario_pdf
# ============================================================

class TestGenerateLibroDiarioPDF:
    def test_empty_entries(self):
        """Entries vacio -> retorna bytes que empiezan con %PDF."""
        result = generate_libro_diario_pdf([], "Test S.A.", 2026, 1)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_with_entries(self):
        """Con entries y journal_lines -> retorna PDF valido."""
        entries = [{
            "entry_number": 1,
            "entry_date": "2026-01-15",
            "description": "Venta de contado",
            "reference": "F-001",
            "source": "manual",
            "is_locked": False,
            "journal_lines": [
                {"account_code": "1.1.1", "description": "Caja", "debe": 1000, "haber": 0, "line_order": 1},
                {"account_code": "4.1.1", "description": "Ventas", "debe": 0, "haber": 1000, "line_order": 2},
            ],
        }]
        result = generate_libro_diario_pdf(entries, "Mi Empresa S.A.", 2026, 1)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"
        assert len(result) > 100

    def test_entry_without_journal_lines(self):
        """Entry sin journal_lines -> no crashea."""
        entries = [{
            "entry_number": 1,
            "entry_date": "2026-02-01",
            "description": "Asiento vacio",
        }]
        result = generate_libro_diario_pdf(entries, "Test S.A.", 2026, 2)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"


# ============================================================
# generate_libro_mayor_pdf
# ============================================================

class TestGenerateLibroMayorPDF:
    def test_empty_lines(self):
        """Lines vacio -> retorna PDF valido."""
        ledger = {
            "account_code": "1.1.1",
            "account_name": "Caja y Bancos",
            "total_debe": 0,
            "total_haber": 0,
            "final_balance": 0,
            "lines": [],
        }
        result = generate_libro_mayor_pdf(ledger, "Test S.A.")
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_with_movements(self):
        """Con movements -> retorna PDF mayor que vacio."""
        ledger = {
            "account_code": "1.1.1",
            "account_name": "Caja y Bancos",
            "total_debe": 5000,
            "total_haber": 2000,
            "final_balance": 3000,
            "lines": [
                {"entry_date": "2026-01-01", "entry_number": 1, "description": "Venta", "debe": 5000, "haber": 0, "running_balance": 5000},
                {"entry_date": "2026-01-15", "entry_number": 2, "description": "Gasto", "debe": 0, "haber": 2000, "running_balance": 3000},
            ],
        }
        result = generate_libro_mayor_pdf(ledger, "Mi Empresa S.A.", 2026, 1)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_without_period(self):
        """Sin period (optional) -> funciona."""
        ledger = {
            "account_code": "1.1.1",
            "account_name": "Caja",
            "total_debe": 0, "total_haber": 0, "final_balance": 0,
            "lines": [],
        }
        result = generate_libro_mayor_pdf(ledger, "Test S.A.")
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"


# ============================================================
# generate_trial_balance_pdf
# ============================================================

class TestGenerateTrialBalancePDF:
    def test_empty_accounts(self):
        """Accounts vacio -> retorna PDF valido."""
        trial = {"accounts": [], "total_debe": 0, "total_haber": 0,
                 "total_saldo_debe": 0, "total_saldo_haber": 0}
        result = generate_trial_balance_pdf(trial, "Test S.A.")
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_with_accounts(self):
        """Con cuentas -> retorna PDF."""
        trial = {
            "accounts": [
                {"account_code": "1.1.1", "account_name": "Caja", "account_type": "activo",
                 "total_debe": 5000, "total_haber": 2000, "saldo_debe": 3000, "saldo_haber": 0},
                {"account_code": "4.1.1", "account_name": "Ventas", "account_type": "ingreso",
                 "total_debe": 0, "total_haber": 5000, "saldo_debe": 0, "saldo_haber": 5000},
            ],
            "total_debe": 5000, "total_haber": 7000,
            "total_saldo_debe": 3000, "total_saldo_haber": 5000,
        }
        result = generate_trial_balance_pdf(trial, "Mi Empresa S.A.", 2026, 1)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_unbalanced_no_crash(self):
        """Desbalanceado -> no crashea."""
        trial = {
            "accounts": [
                {"account_code": "1.1.1", "account_name": "Caja", "account_type": "activo",
                 "total_debe": 5000, "total_haber": 0, "saldo_debe": 5000, "saldo_haber": 0},
            ],
            "total_debe": 5000, "total_haber": 0,
            "total_saldo_debe": 5000, "total_saldo_haber": 0,
        }
        result = generate_trial_balance_pdf(trial, "Test S.A.", 2026, 3)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"
