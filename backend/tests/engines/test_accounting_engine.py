"""
Tests unitarios para accounting_engine.py
Motor Contable — Plan de Cuentas, Validacion, Libro Mayor, Balance
"""
import pytest
from app.engines.accounting_engine import (
    get_default_chart_of_accounts,
    validate_journal_entry,
    compute_ledger,
    compute_trial_balance,
    aggregate_to_financial_record,
)


# ============================================================
# get_default_chart_of_accounts
# ============================================================

class TestGetDefaultChartOfAccounts:
    def test_returns_non_empty(self):
        """Retorna lista no vacia."""
        rows = get_default_chart_of_accounts("test-society")
        assert len(rows) > 0

    def test_all_rows_have_society_id(self):
        """Todos los rows tienen el society_id proporcionado."""
        rows = get_default_chart_of_accounts("my-society")
        for row in rows:
            assert row["society_id"] == "my-society"

    def test_all_rows_have_required_keys(self):
        """Todos tienen keys requeridas."""
        rows = get_default_chart_of_accounts("s1")
        required = {"society_id", "account_code", "account_name", "account_type",
                     "parent_code", "level", "is_header", "normal_balance", "is_active"}
        for row in rows:
            assert required.issubset(row.keys())

    def test_has_headers(self):
        """Cuentas header tienen is_header=True."""
        rows = get_default_chart_of_accounts("s1")
        headers = [r for r in rows if r["is_header"]]
        assert len(headers) > 0

    def test_covers_five_groups(self):
        """Cubre los 5 grupos top (1.x, 2.x, 3.x, 4.x, 5.x)."""
        rows = get_default_chart_of_accounts("s1")
        codes = {r["account_code"] for r in rows}
        assert "1" in codes
        assert "2" in codes
        assert "3" in codes
        assert "4" in codes
        assert "5" in codes


# ============================================================
# validate_journal_entry
# ============================================================

class TestValidateJournalEntry:
    def test_balanced_two_lines(self):
        """2 lineas balanceadas -> valid=True."""
        lines = [
            {"account_code": "1.1.1", "debe": 1000, "haber": 0},
            {"account_code": "4.1.1", "debe": 0, "haber": 1000},
        ]
        result = validate_journal_entry(lines)
        assert result["valid"] is True
        assert len(result["errors"]) == 0
        assert result["total_debe"] == 1000
        assert result["total_haber"] == 1000

    def test_single_line_error(self):
        """1 sola linea -> error 'al menos 2 lineas'."""
        lines = [{"account_code": "1.1.1", "debe": 500, "haber": 0}]
        result = validate_journal_entry(lines)
        assert result["valid"] is False
        assert any("al menos 2" in e for e in result["errors"])

    def test_empty_lines(self):
        """Lista vacia -> error."""
        result = validate_journal_entry([])
        assert result["valid"] is False

    def test_unbalanced(self):
        """Desbalanceado -> error con diferencia."""
        lines = [
            {"account_code": "1.1.1", "debe": 1000, "haber": 0},
            {"account_code": "4.1.1", "debe": 0, "haber": 800},
        ]
        result = validate_journal_entry(lines)
        assert result["valid"] is False
        assert any("no cuadra" in e.lower() for e in result["errors"])

    def test_both_debe_and_haber(self):
        """Linea con debe > 0 Y haber > 0 -> error."""
        lines = [
            {"account_code": "1.1.1", "debe": 500, "haber": 500},
            {"account_code": "4.1.1", "debe": 0, "haber": 0},
        ]
        result = validate_journal_entry(lines)
        assert result["valid"] is False
        assert any("DEBE y HABER al mismo tiempo" in e for e in result["errors"])

    def test_negative_amounts(self):
        """Montos negativos -> error."""
        lines = [
            {"account_code": "1.1.1", "debe": -100, "haber": 0},
            {"account_code": "4.1.1", "debe": 0, "haber": -100},
        ]
        result = validate_journal_entry(lines)
        assert result["valid"] is False
        assert any("negativos" in e for e in result["errors"])

    def test_zero_amounts(self):
        """Linea con debe=0 y haber=0 -> error."""
        lines = [
            {"account_code": "1.1.1", "debe": 0, "haber": 0},
            {"account_code": "4.1.1", "debe": 1000, "haber": 0},
        ]
        result = validate_journal_entry(lines)
        assert result["valid"] is False
        assert any("DEBE o HABER" in e for e in result["errors"])

    def test_four_lines_balanced(self):
        """4+ lineas balanceadas -> valid=True."""
        lines = [
            {"account_code": "1.1.1", "debe": 500, "haber": 0},
            {"account_code": "1.1.2", "debe": 500, "haber": 0},
            {"account_code": "4.1.1", "debe": 0, "haber": 700},
            {"account_code": "4.1.2", "debe": 0, "haber": 300},
        ]
        result = validate_journal_entry(lines)
        assert result["valid"] is True


# ============================================================
# compute_ledger
# ============================================================

class TestComputeLedger:
    def test_debe_normal_balance(self):
        """normal_balance 'debe': saldo sube con debe, baja con haber."""
        lines = [
            {"debe": 1000, "haber": 0, "entry_date": "2026-01-01"},
            {"debe": 0, "haber": 300, "entry_date": "2026-01-15"},
        ]
        result = compute_ledger(lines, "1.1.1", "debe")
        assert result["saldo_final"] == pytest.approx(700, abs=0.01)
        assert result["total_debe"] == 1000
        assert result["total_haber"] == 300

    def test_haber_normal_balance(self):
        """normal_balance 'haber': saldo sube con haber, baja con debe."""
        lines = [
            {"debe": 0, "haber": 500, "entry_date": "2026-01-01"},
            {"debe": 200, "haber": 0, "entry_date": "2026-01-15"},
        ]
        result = compute_ledger(lines, "2.1.1", "haber")
        assert result["saldo_final"] == pytest.approx(300, abs=0.01)

    def test_empty_lines(self):
        """Lista vacia -> saldo_final=0."""
        result = compute_ledger([], "1.1.1", "debe")
        assert result["saldo_final"] == 0
        assert len(result["movements"]) == 0

    def test_single_line(self):
        """1 linea -> running balance correcto."""
        lines = [{"debe": 750, "haber": 0, "entry_date": "2026-02-01"}]
        result = compute_ledger(lines, "1.1.1", "debe")
        assert result["saldo_final"] == 750
        assert len(result["movements"]) == 1
        assert result["movements"][0]["saldo"] == 750

    def test_running_balance(self):
        """Multiples lineas -> running balance acumulativo."""
        lines = [
            {"debe": 1000, "haber": 0, "entry_date": "2026-01-01"},
            {"debe": 500, "haber": 0, "entry_date": "2026-01-10"},
            {"debe": 0, "haber": 200, "entry_date": "2026-01-20"},
        ]
        result = compute_ledger(lines, "1.1.1", "debe")
        assert result["movements"][0]["saldo"] == 1000
        assert result["movements"][1]["saldo"] == 1500
        assert result["movements"][2]["saldo"] == 1300
        assert result["saldo_final"] == 1300


# ============================================================
# compute_trial_balance
# ============================================================

class TestComputeTrialBalance:
    def test_balanced(self):
        """Balanceado -> total_saldo_deudor == total_saldo_acreedor."""
        accounts = [
            {"account_code": "1.1.1", "account_name": "Caja", "account_type": "activo", "is_header": False},
            {"account_code": "4.1.1", "account_name": "Ventas", "account_type": "ingreso", "is_header": False},
        ]
        lines_by_account = {
            "1.1.1": [{"debe": 5000, "haber": 0}],
            "4.1.1": [{"debe": 0, "haber": 5000}],
        }
        result = compute_trial_balance(accounts, lines_by_account)
        assert result["totals"]["balanced"] is True
        assert result["totals"]["total_deudor"] == result["totals"]["total_acreedor"]

    def test_headers_appear(self):
        """Headers aparecen con is_header=True."""
        accounts = [
            {"account_code": "1", "account_name": "Activos", "account_type": "activo", "is_header": True},
            {"account_code": "1.1.1", "account_name": "Caja", "account_type": "activo", "is_header": False},
        ]
        lines_by_account = {"1.1.1": [{"debe": 1000, "haber": 0}]}
        result = compute_trial_balance(accounts, lines_by_account)
        headers = [r for r in result["rows"] if r["is_header"]]
        assert len(headers) >= 1

    def test_no_movement_accounts_omitted(self):
        """Cuentas sin movimiento -> omitidas."""
        accounts = [
            {"account_code": "1.1.1", "account_name": "Caja", "account_type": "activo", "is_header": False},
            {"account_code": "1.1.2", "account_name": "CxC", "account_type": "activo", "is_header": False},
        ]
        lines_by_account = {"1.1.1": [{"debe": 500, "haber": 0}]}
        result = compute_trial_balance(accounts, lines_by_account)
        detail_rows = [r for r in result["rows"] if not r["is_header"]]
        codes = {r["account_code"] for r in detail_rows}
        assert "1.1.1" in codes
        assert "1.1.2" not in codes

    def test_saldo_deudor_vs_acreedor(self):
        """Saldo deudor vs acreedor clasificacion correcta."""
        accounts = [
            {"account_code": "1.1.1", "account_name": "Caja", "account_type": "activo", "is_header": False},
            {"account_code": "2.1.1", "account_name": "CxP", "account_type": "pasivo", "is_header": False},
        ]
        lines_by_account = {
            "1.1.1": [{"debe": 3000, "haber": 1000}],  # saldo deudor 2000
            "2.1.1": [{"debe": 500, "haber": 2500}],    # saldo acreedor 2000
        }
        result = compute_trial_balance(accounts, lines_by_account)
        for row in result["rows"]:
            if row.get("account_code") == "1.1.1":
                assert row["saldo_deudor"] == 2000
                assert row["saldo_acreedor"] == 0
            elif row.get("account_code") == "2.1.1":
                assert row["saldo_deudor"] == 0
                assert row["saldo_acreedor"] == 2000

    def test_empty_lines_by_account(self):
        """Lines_by_account vacio -> sin rows de detalle."""
        accounts = [
            {"account_code": "1.1.1", "account_name": "Caja", "account_type": "activo", "is_header": False},
        ]
        result = compute_trial_balance(accounts, {})
        detail_rows = [r for r in result["rows"] if not r["is_header"]]
        assert len(detail_rows) == 0


# ============================================================
# aggregate_to_financial_record
# ============================================================

class TestAggregateToFinancialRecord:
    def test_revenue_from_4x(self):
        """Cuentas 4.x (ingresos) -> campo 'revenue'."""
        lines = [
            {"account_code": "4.1.1", "debe": 0, "haber": 10000},
        ]
        result = aggregate_to_financial_record(lines, 2026, 1)
        assert result["revenue"] == 10000

    def test_cogs_from_5x(self):
        """Cuentas 5.1.x (costos) -> campo 'cogs'."""
        lines = [
            {"account_code": "5.1.1", "debe": 5000, "haber": 0},
        ]
        result = aggregate_to_financial_record(lines, 2026, 1)
        assert result["cogs"] == 5000

    def test_balance_accounts_1x(self):
        """Cuentas 1.x (activos) -> campos de balance."""
        lines = [
            {"account_code": "1.1.1", "debe": 8000, "haber": 2000},
            {"account_code": "1.1.2", "debe": 3000, "haber": 0},
        ]
        result = aggregate_to_financial_record(lines, 2026, 2)
        assert result["cash_balance"] == 6000  # 8000-2000
        assert result["accounts_receivable"] == 3000

    def test_empty_lines(self):
        """Lista vacia -> todos los campos = 0."""
        result = aggregate_to_financial_record([], 2026, 3)
        assert result["revenue"] == 0
        assert result["cogs"] == 0
        assert result["cash_balance"] == 0

    def test_source_always_accounting(self):
        """source = 'accounting' siempre."""
        result = aggregate_to_financial_record([], 2026, 1)
        assert result["source"] == "accounting"
        assert result["period_year"] == 2026
        assert result["period_month"] == 1
