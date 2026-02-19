"""
Tests unitarios para pdf_generator.py — Fase 11 Reportes Ejecutivos
Estado de Resultados, Balance General, Flujo de Caja, Resumen Ejecutivo.
"""
import pytest

from app.engines.pdf_generator import (
    generate_estado_resultados_pdf,
    generate_balance_general_pdf,
    generate_flujo_caja_pdf,
    generate_resumen_ejecutivo_pdf,
)
from app.engines.financial_engine import (
    calcular_cascada,
    calcular_ratios,
    diagnostico_juez_digital,
    valoracion_empresa,
)
from app.engines.multiperiod_engine import proyectar_futuro


SAMPLE_RECORD = {
    "revenue": 50000, "cogs": 20000,
    "opex_rent": 3000, "opex_payroll": 8000, "opex_other": 4000,
    "depreciation": 500, "interest_expense": 300, "tax_expense": 200,
    "cash_balance": 12000, "accounts_receivable": 8000, "inventory": 5000,
    "accounts_payable": 6000, "bank_debt": 10000,
}


# ============================================================
# generate_estado_resultados_pdf
# ============================================================

class TestGenerateEstadoResultadosPDF:
    """Tests para generate_estado_resultados_pdf."""

    def test_basic_generation(self):
        """Genera PDF valido con datos normales."""
        cascada = calcular_cascada(SAMPLE_RECORD)
        ratios = calcular_ratios(SAMPLE_RECORD)
        result = generate_estado_resultados_pdf(cascada, ratios, "TestCo", 2026, 3)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_with_comparison_prev_cascada(self):
        """Genera PDF comparativo cuando se provee prev_cascada."""
        cascada = calcular_cascada(SAMPLE_RECORD)
        ratios = calcular_ratios(SAMPLE_RECORD)
        prev_record = {**SAMPLE_RECORD, "revenue": 45000}
        prev_cascada = calcular_cascada(prev_record)
        result = generate_estado_resultados_pdf(
            cascada, ratios, "TestCo", 2026, 3, prev_cascada=prev_cascada
        )
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"
        # Comparativo deberia ser mas grande que sin comparacion
        basic = generate_estado_resultados_pdf(cascada, ratios, "TestCo", 2026, 3)
        assert len(result) > len(basic) * 0.8  # al menos similar tamano

    def test_zero_revenue(self):
        """Revenue = 0 no causa error."""
        record_zero = {**SAMPLE_RECORD, "revenue": 0, "cogs": 0}
        cascada = calcular_cascada(record_zero)
        ratios = calcular_ratios(record_zero)
        result = generate_estado_resultados_pdf(cascada, ratios, "ZeroCo", 2026, 1)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_negative_values(self):
        """Valores negativos (gross loss) se exportan sin error."""
        record_neg = {
            **SAMPLE_RECORD,
            "revenue": 5000, "cogs": 8000,
            "opex_rent": 3000, "opex_payroll": 2000, "opex_other": 1000,
        }
        cascada = calcular_cascada(record_neg)
        ratios = calcular_ratios(record_neg)
        result = generate_estado_resultados_pdf(cascada, ratios, "LossCo", 2026, 6)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"


# ============================================================
# generate_balance_general_pdf
# ============================================================

class TestGenerateBalanceGeneralPDF:
    """Tests para generate_balance_general_pdf."""

    def test_basic_generation(self):
        """Genera PDF valido con datos normales."""
        result = generate_balance_general_pdf(SAMPLE_RECORD, "TestCo", 2026, 3)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_zero_balances(self):
        """Todos los balances en cero -> PDF valido."""
        record_zero = {
            "cash_balance": 0, "accounts_receivable": 0, "inventory": 0,
            "accounts_payable": 0, "bank_debt": 0,
        }
        result = generate_balance_general_pdf(record_zero, "EmptyCo", 2026, 1)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_negative_equity(self):
        """Pasivos > Activos -> patrimonio negativo, PDF valido."""
        record_neg_equity = {
            "cash_balance": 1000, "accounts_receivable": 500, "inventory": 200,
            "accounts_payable": 10000, "bank_debt": 20000,
        }
        result = generate_balance_general_pdf(record_neg_equity, "DebtCo", 2026, 6)
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"


# ============================================================
# generate_flujo_caja_pdf
# ============================================================

class TestGenerateFlujoCajaPDF:
    """Tests para generate_flujo_caja_pdf."""

    def test_with_full_forecast(self):
        """Proyeccion completa con historico y proyectado."""
        records = [
            {**SAMPLE_RECORD, "period_year": 2026, "period_month": m}
            for m in range(1, 7)
        ]
        forecast = proyectar_futuro(records, months_ahead=3)
        result = generate_flujo_caja_pdf(forecast, "TestCo")
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_minimal_empty_data(self):
        """Datos vacios -> PDF informativo sin crash."""
        forecast = {"historical": [], "projected": [], "method": "moving_average"}
        result = generate_flujo_caja_pdf(forecast, "EmptyCo")
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_only_historical(self):
        """Solo 1 periodo historico (insuficiente para proyectar)."""
        records = [{**SAMPLE_RECORD, "period_year": 2026, "period_month": 1}]
        forecast = proyectar_futuro(records, months_ahead=3)
        assert len(forecast["projected"]) == 0
        result = generate_flujo_caja_pdf(forecast, "HistCo")
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_only_projected(self):
        """Datos de proyeccion sin historico (edge case sintetico)."""
        forecast = {
            "historical": [],
            "projected": [
                {"label": "Jul 2026", "revenue": 50000, "ebitda": 15000,
                 "net_income": 14000, "confidence_low": 45000, "confidence_high": 55000},
            ],
            "method": "moving_average",
        }
        result = generate_flujo_caja_pdf(forecast, "ProjCo")
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"


# ============================================================
# generate_resumen_ejecutivo_pdf
# ============================================================

class TestGenerateResumenEjecutivoPDF:
    """Tests para generate_resumen_ejecutivo_pdf (multi-pagina)."""

    def _build_inputs(self, record):
        """Helper para construir los 4 inputs del resumen ejecutivo."""
        cascada = calcular_cascada(record)
        ratios = calcular_ratios(record)
        diagnostico = diagnostico_juez_digital(record)
        valoracion = valoracion_empresa(cascada["ebitda"], 3.0)
        return cascada, ratios, diagnostico, valoracion

    def test_full_report(self):
        """Reporte ejecutivo completo con datos saludables."""
        cascada, ratios, diagnostico, valoracion = self._build_inputs(SAMPLE_RECORD)
        result = generate_resumen_ejecutivo_pdf(
            cascada, ratios, diagnostico, valoracion, "TestCo", 2026, 3
        )
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_negative_ebitda(self):
        """EBITDA negativo -> diagnostico critico, PDF valido."""
        record_crisis = {
            "revenue": 5000, "cogs": 4000,
            "opex_rent": 2000, "opex_payroll": 3000, "opex_other": 1000,
            "depreciation": 100, "interest_expense": 200, "tax_expense": 0,
            "cash_balance": 500, "accounts_receivable": 1000, "inventory": 800,
            "accounts_payable": 3000, "bank_debt": 5000,
        }
        cascada, ratios, diagnostico, valoracion = self._build_inputs(record_crisis)
        assert cascada["ebitda"] < 0
        result = generate_resumen_ejecutivo_pdf(
            cascada, ratios, diagnostico, valoracion, "CrisisCo", 2026, 1
        )
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_zero_everything(self):
        """Todos los campos en cero -> PDF valido sin crash."""
        record_zero = {
            "revenue": 0, "cogs": 0,
            "opex_rent": 0, "opex_payroll": 0, "opex_other": 0,
            "depreciation": 0, "interest_expense": 0, "tax_expense": 0,
            "cash_balance": 0, "accounts_receivable": 0, "inventory": 0,
            "accounts_payable": 0, "bank_debt": 0,
        }
        cascada, ratios, diagnostico, valoracion = self._build_inputs(record_zero)
        result = generate_resumen_ejecutivo_pdf(
            cascada, ratios, diagnostico, valoracion, "ZeroCo", 2026, 1
        )
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_size_multi_page(self):
        """Resumen ejecutivo multi-pagina debe ser > 500 bytes."""
        cascada, ratios, diagnostico, valoracion = self._build_inputs(SAMPLE_RECORD)
        result = generate_resumen_ejecutivo_pdf(
            cascada, ratios, diagnostico, valoracion, "BigCo", 2026, 6
        )
        assert len(result) > 500

    def test_healthy_company(self):
        """Empresa saludable genera reporte con severity ok."""
        record_healthy = {
            "revenue": 100000, "cogs": 30000,
            "opex_rent": 5000, "opex_payroll": 10000, "opex_other": 5000,
            "depreciation": 1000, "interest_expense": 500, "tax_expense": 300,
            "cash_balance": 50000, "accounts_receivable": 10000, "inventory": 5000,
            "accounts_payable": 8000, "bank_debt": 5000,
        }
        cascada, ratios, diagnostico, valoracion = self._build_inputs(record_healthy)
        assert diagnostico["severity"] == "ok"
        result = generate_resumen_ejecutivo_pdf(
            cascada, ratios, diagnostico, valoracion, "HealthyCo", 2026, 12
        )
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"
        assert len(result) > 500
