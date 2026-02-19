"""
Tests unitarios para financial_engine.py
Motor de Verdad Financiera — Cascada P&L, Ratios, Diagnostico
"""
import pytest
from app.engines.financial_engine import (
    calcular_cascada,
    calcular_ratios,
    calcular_punto_equilibrio,
    diagnostico_juez_digital,
    valoracion_empresa,
)


# ============================================================
# calcular_cascada
# ============================================================

class TestCalcularCascada:
    def test_profitable_business(self, sample_financial_record):
        """Negocio rentable -> waterfall correcto."""
        result = calcular_cascada(sample_financial_record)
        assert result["gross_profit"] == 30000  # 50000 - 20000
        assert result["total_opex"] == 15000  # 3000 + 8000 + 4000
        assert result["ebitda"] == 15000  # 30000 - 15000
        assert result["ebit"] == 14500  # 15000 - 500
        assert result["net_income"] == 14000  # 14500 - 300 - 200

    def test_zero_revenue(self, zero_revenue_record):
        """Revenue 0 -> net_income negativo."""
        result = calcular_cascada(zero_revenue_record)
        assert result["gross_profit"] == 0
        assert result["ebitda"] < 0
        assert result["net_income"] < 0

    def test_loss_scenario(self, loss_record):
        """Escenario de perdida -> net_income < 0."""
        result = calcular_cascada(loss_record)
        assert result["net_income"] < 0

    def test_all_zeros(self, all_zeros_record):
        """Todo en ceros -> todo resulta 0."""
        result = calcular_cascada(all_zeros_record)
        assert result["revenue"] == 0
        assert result["gross_profit"] == 0
        assert result["ebitda"] == 0
        assert result["net_income"] == 0

    def test_waterfall_steps_count(self, sample_financial_record):
        """waterfall_steps tiene 7 elementos."""
        result = calcular_cascada(sample_financial_record)
        assert len(result["waterfall_steps"]) == 7

    def test_values_rounded(self, sample_financial_record):
        """Valores redondeados a 2 decimales."""
        result = calcular_cascada(sample_financial_record)
        assert result["gross_profit"] == round(result["gross_profit"], 2)
        assert result["net_income"] == round(result["net_income"], 2)


# ============================================================
# calcular_ratios
# ============================================================

class TestCalcularRatios:
    def test_profitable_margins(self, sample_financial_record):
        """Negocio rentable -> margenes correctos."""
        result = calcular_ratios(sample_financial_record)
        assert result["margins"]["gross_margin_pct"] == pytest.approx(60.0, abs=0.1)
        assert result["margins"]["ebitda_margin_pct"] == pytest.approx(30.0, abs=0.1)

    def test_zero_revenue_no_division_error(self, zero_revenue_record):
        """Revenue 0 -> todos los % = 0."""
        result = calcular_ratios(zero_revenue_record)
        assert result["margins"]["gross_margin_pct"] == 0
        assert result["margins"]["ebitda_margin_pct"] == 0

    def test_efficiency_ratios(self, sample_financial_record):
        """Eficiencia: rent_ratio_pct y payroll_ratio_pct correctos."""
        result = calcular_ratios(sample_financial_record)
        # rent_ratio = 3000/50000*100 = 6%
        assert result["efficiency"]["rent_ratio_pct"] == pytest.approx(6.0, abs=0.1)
        assert result["efficiency"]["rent_status"] == "ok"

    def test_solvency_acid_test(self, sample_financial_record):
        """Solvencia: acid_test correcto."""
        result = calcular_ratios(sample_financial_record)
        # acid_test = (12000 + 8000) / (6000 + 10000) = 1.25
        assert result["solvency"]["acid_test"] == pytest.approx(1.25, abs=0.01)

    def test_no_interest_debt_coverage(self):
        """Interest 0 -> debt_coverage = 10.0."""
        record = {
            "revenue": 50000, "cogs": 20000,
            "opex_rent": 3000, "opex_payroll": 8000, "opex_other": 4000,
            "depreciation": 0, "interest_expense": 0, "tax_expense": 0,
            "cash_balance": 10000, "accounts_receivable": 5000,
            "inventory": 3000, "accounts_payable": 4000, "bank_debt": 0,
        }
        result = calcular_ratios(record)
        assert result["solvency"]["debt_coverage"] == 10.0

    def test_zero_pasivo_cp(self):
        """pasivo_cp = 0 -> acid_test = 0."""
        record = {
            "revenue": 10000, "cogs": 5000,
            "opex_rent": 1000, "opex_payroll": 1000, "opex_other": 500,
            "depreciation": 0, "interest_expense": 0, "tax_expense": 0,
            "cash_balance": 5000, "accounts_receivable": 2000,
            "inventory": 1000, "accounts_payable": 0, "bank_debt": 0,
        }
        result = calcular_ratios(record)
        assert result["solvency"]["acid_test"] == 0

    def test_ccc_days(self, sample_financial_record):
        """CCC days correctamente calculados."""
        result = calcular_ratios(sample_financial_record)
        # days_receivable = (8000/50000)*30 = 4.8
        # days_inventory = (5000/20000)*30 = 7.5
        # days_payable = (6000/20000)*30 = 9.0
        # CCC = 4.8 + 7.5 - 9.0 = 3.3
        assert result["oxygen"]["ccc_days"] == pytest.approx(3.3, abs=0.1)

    def test_itbms_obligatorio(self):
        """Revenue annual >= 36k -> obligatorio."""
        record = {
            "revenue": 3500, "cogs": 0, "opex_rent": 0, "opex_payroll": 0,
            "opex_other": 0, "depreciation": 0, "interest_expense": 0, "tax_expense": 0,
            "cash_balance": 0, "accounts_receivable": 0, "inventory": 0,
            "accounts_payable": 0, "bank_debt": 0,
        }
        result = calcular_ratios(record)
        assert result["fiscal"]["itbms_status"] == "obligatorio"  # 3500*12 = 42000

    def test_itbms_precaucion(self):
        """Revenue annual 30k-36k -> precaucion."""
        record = {
            "revenue": 2600, "cogs": 0, "opex_rent": 0, "opex_payroll": 0,
            "opex_other": 0, "depreciation": 0, "interest_expense": 0, "tax_expense": 0,
            "cash_balance": 0, "accounts_receivable": 0, "inventory": 0,
            "accounts_payable": 0, "bank_debt": 0,
        }
        result = calcular_ratios(record)
        assert result["fiscal"]["itbms_status"] == "precaucion"  # 2600*12 = 31200

    def test_itbms_libre(self):
        """Revenue annual < 30k -> libre."""
        record = {
            "revenue": 2000, "cogs": 0, "opex_rent": 0, "opex_payroll": 0,
            "opex_other": 0, "depreciation": 0, "interest_expense": 0, "tax_expense": 0,
            "cash_balance": 0, "accounts_receivable": 0, "inventory": 0,
            "accounts_payable": 0, "bank_debt": 0,
        }
        result = calcular_ratios(record)
        assert result["fiscal"]["itbms_status"] == "libre"  # 2000*12 = 24000


# ============================================================
# calcular_punto_equilibrio
# ============================================================

class TestCalcularPuntoEquilibrio:
    def test_profitable_zone(self, sample_financial_record):
        """Rentable -> breakeven < revenue, zone = 'profit'."""
        result = calcular_punto_equilibrio(sample_financial_record)
        assert result["zone"] == "profit"
        assert result["breakeven_monthly"] < result["current_sales"]

    def test_loss_zone(self, loss_record):
        """Perdida -> zone = 'loss'."""
        result = calcular_punto_equilibrio(loss_record)
        assert result["zone"] == "loss"

    def test_zero_revenue(self, zero_revenue_record):
        """Revenue 0 -> mc_ratio = 0, breakeven = 0."""
        result = calcular_punto_equilibrio(zero_revenue_record)
        assert result["contribution_margin_pct"] == 0
        assert result["breakeven_monthly"] == 0

    def test_with_target_profit(self, sample_financial_record):
        """Con ganancia_deseada -> target_sales calculado."""
        result = calcular_punto_equilibrio(sample_financial_record, ganancia_deseada=5000)
        assert result["target_sales"] is not None
        assert result["target_sales"] > result["breakeven_monthly"]

    def test_without_target_profit(self, sample_financial_record):
        """Sin ganancia_deseada -> target_sales = None."""
        result = calcular_punto_equilibrio(sample_financial_record, ganancia_deseada=0)
        assert result["target_sales"] is None


# ============================================================
# diagnostico_juez_digital
# ============================================================

class TestDiagnosticoJuezDigital:
    def test_intervencion_emergencia(self, zero_revenue_record):
        """EBITDA < 0 -> INTERVENCION DE EMERGENCIA."""
        zero_revenue_record["opex_rent"] = 5000
        result = diagnostico_juez_digital(zero_revenue_record)
        assert result["verdict"] == "INTERVENCIÓN DE EMERGENCIA"
        assert result["severity"] == "critical"

    def test_agujero_negro(self):
        """EBITDA > 0 pero CCC > 60 -> AGUJERO NEGRO."""
        record = {
            "revenue": 10000, "cogs": 3000,
            "opex_rent": 500, "opex_payroll": 1000, "opex_other": 500,
            "depreciation": 0, "interest_expense": 0, "tax_expense": 0,
            "cash_balance": 1000, "accounts_receivable": 25000,
            "inventory": 15000, "accounts_payable": 1000, "bank_debt": 0,
        }
        result = diagnostico_juez_digital(record)
        assert result["verdict"] == "AGUJERO NEGRO"

    def test_riesgo_inmobiliario(self):
        """EBITDA > 0, CCC ok, rent > 15% -> RIESGO INMOBILIARIO."""
        record = {
            "revenue": 20000, "cogs": 5000,
            "opex_rent": 4000, "opex_payroll": 2000, "opex_other": 1000,
            "depreciation": 0, "interest_expense": 0, "tax_expense": 0,
            "cash_balance": 5000, "accounts_receivable": 2000,
            "inventory": 1000, "accounts_payable": 2000, "bank_debt": 0,
        }
        result = diagnostico_juez_digital(record)
        assert result["verdict"] == "RIESGO INMOBILIARIO"

    def test_saludable(self, sample_financial_record):
        """Negocio saludable -> EMPRESA SALUDABLE Y ESCALABLE."""
        result = diagnostico_juez_digital(sample_financial_record)
        assert result["verdict"] == "EMPRESA SALUDABLE Y ESCALABLE"
        assert result["severity"] == "ok"

    def test_motor_strong(self, sample_financial_record):
        """EBITDA margin > 15% -> motor strong."""
        result = diagnostico_juez_digital(sample_financial_record)
        assert result["motor"]["status"] == "strong"


# ============================================================
# valoracion_empresa
# ============================================================

class TestValoracionEmpresa:
    def test_positive_ebitda(self):
        """EBITDA positivo -> enterprise_value = ebitda * 12 * multiplo."""
        result = valoracion_empresa(5000, 3.0)
        assert result["ebitda_annual"] == 60000
        assert result["enterprise_value"] == 180000
        assert result["multiple"] == 3.0

    def test_zero_ebitda(self):
        """EBITDA 0 -> enterprise_value = 0."""
        result = valoracion_empresa(0, 3.0)
        assert result["enterprise_value"] == 0
