"""
Tests para multiperiod_engine.py — Fase 10
Tendencias, comparaciones, proyecciones y varianza presupuestal.
"""
import pytest
from app.engines.multiperiod_engine import (
    calcular_tendencias,
    comparar_periodos,
    proyectar_futuro,
    calcular_varianza_presupuesto,
    _safe_pct_change,
    _moving_average,
    _std_dev,
    _period_label,
)


# ============================================
# Fixtures
# ============================================

def _make_record(year: int, month: int, revenue: float, cogs: float,
                 opex_rent: float = 5000, opex_payroll: float = 7000,
                 opex_other: float = 3000, **kwargs) -> dict:
    """Crea un registro financiero minimo."""
    return {
        "period_year": year,
        "period_month": month,
        "revenue": revenue,
        "cogs": cogs,
        "opex_rent": opex_rent,
        "opex_payroll": opex_payroll,
        "opex_other": opex_other,
        "depreciation": kwargs.get("depreciation", 500),
        "interest_expense": kwargs.get("interest_expense", 800),
        "tax_expense": kwargs.get("tax_expense", 700),
        "cash_balance": kwargs.get("cash_balance", 12000),
        "accounts_receivable": kwargs.get("accounts_receivable", 8000),
        "inventory": kwargs.get("inventory", 6000),
        "accounts_payable": kwargs.get("accounts_payable", 4000),
        "bank_debt": kwargs.get("bank_debt", 10000),
    }


@pytest.fixture
def sample_records():
    """6 meses de datos con tendencia creciente."""
    return [
        _make_record(2026, 1, 42000, 25200),
        _make_record(2026, 2, 44000, 26400),
        _make_record(2026, 3, 46000, 27600),
        _make_record(2026, 4, 48000, 28800),
        _make_record(2026, 5, 50000, 30000),
        _make_record(2026, 6, 52000, 31200),
    ]


@pytest.fixture
def budget_target():
    return {
        "revenue_target": 50000,
        "cogs_target": 28000,
        "opex_rent_target": 4500,
        "opex_payroll_target": 6500,
        "opex_other_target": 2800,
    }


# ============================================
# Helpers
# ============================================

class TestHelpers:
    def test_period_label(self):
        assert _period_label(2026, 1) == "Ene 2026"
        assert _period_label(2026, 6) == "Jun 2026"
        assert _period_label(2025, 12) == "Dic 2025"

    def test_safe_pct_change_normal(self):
        assert _safe_pct_change(100, 120) == 20.0

    def test_safe_pct_change_decrease(self):
        assert _safe_pct_change(100, 80) == -20.0

    def test_safe_pct_change_zero_old(self):
        assert _safe_pct_change(0, 50) == 100.0

    def test_safe_pct_change_both_zero(self):
        assert _safe_pct_change(0, 0) == 0.0

    def test_safe_pct_change_negative_old(self):
        # -100 a -50: mejora del 50%
        result = _safe_pct_change(-100, -50)
        assert result == 50.0

    def test_moving_average_basic(self):
        values = [10.0, 20.0, 30.0, 40.0, 50.0]
        result = _moving_average(values, 3)
        assert result[0] is None
        assert result[1] is None
        assert result[2] == 20.0  # (10+20+30)/3
        assert result[3] == 30.0  # (20+30+40)/3
        assert result[4] == 40.0  # (30+40+50)/3

    def test_moving_average_short_list(self):
        result = _moving_average([10.0], 3)
        assert result == [None]

    def test_std_dev_basic(self):
        values = [10.0, 10.0, 10.0]
        assert _std_dev(values) == 0.0

    def test_std_dev_variation(self):
        values = [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]
        result = _std_dev(values)
        assert result > 0
        assert abs(result - 2.0) < 0.2  # ~2.0

    def test_std_dev_single_value(self):
        assert _std_dev([42.0]) == 0.0


# ============================================
# Tendencias
# ============================================

class TestTendencias:
    def test_empty_records(self):
        result = calcular_tendencias([])
        assert result["points"] == []
        assert result["growth_rates"] == {}
        assert result["moving_averages"] == {}

    def test_single_record(self):
        records = [_make_record(2026, 1, 50000, 30000)]
        result = calcular_tendencias(records)
        assert len(result["points"]) == 1
        assert result["growth_rates"] == {}  # necesita >=2 puntos
        point = result["points"][0]
        assert point["year"] == 2026
        assert point["month"] == 1
        assert point["label"] == "Ene 2026"
        assert point["revenue"] == 50000
        assert point["cogs"] == 30000
        assert point["gross_profit"] == 20000

    def test_multiple_records(self, sample_records):
        result = calcular_tendencias(sample_records)
        points = result["points"]
        assert len(points) == 6

        # Verificar primer y ultimo punto
        assert points[0]["revenue"] == 42000
        assert points[5]["revenue"] == 52000

        # Growth rates calculados
        gr = result["growth_rates"]
        assert "revenue" in gr
        assert "ebitda" in gr
        assert gr["revenue"] > 0  # tendencia creciente

    def test_moving_averages(self, sample_records):
        result = calcular_tendencias(sample_records)
        ma = result["moving_averages"]
        assert "revenue" in ma
        assert "ebitda" in ma
        assert "net_income" in ma
        # Primeros 2 son None, tercero en adelante tiene valor
        assert ma["revenue"][0] is None
        assert ma["revenue"][1] is None
        assert ma["revenue"][2] is not None

    def test_margins_calculated(self, sample_records):
        result = calcular_tendencias(sample_records)
        point = result["points"][0]
        assert "gross_margin_pct" in point
        assert "ebitda_margin_pct" in point
        assert "net_margin_pct" in point
        assert point["gross_margin_pct"] > 0
        assert point["ebitda_margin_pct"] > 0


# ============================================
# Comparacion de periodos
# ============================================

class TestComparacion:
    def test_basic_comparison(self):
        rec_a = _make_record(2026, 1, 42000, 25200)
        rec_b = _make_record(2026, 6, 52000, 31200)
        result = comparar_periodos(rec_a, rec_b)

        assert "period_a" in result
        assert "period_b" in result
        assert "deltas" in result
        assert "pct_changes" in result
        assert "improvements" in result
        assert "deteriorations" in result

    def test_revenue_improvement(self):
        rec_a = _make_record(2026, 1, 40000, 24000)
        rec_b = _make_record(2026, 2, 50000, 30000)
        result = comparar_periodos(rec_a, rec_b)

        assert result["deltas"]["revenue"] == 10000
        assert "revenue" in result["improvements"]

    def test_cogs_increase_is_deterioration(self):
        rec_a = _make_record(2026, 1, 50000, 25000)
        rec_b = _make_record(2026, 2, 50000, 30000)
        result = comparar_periodos(rec_a, rec_b)

        # cogs aumento = deterioracion (lower_is_better)
        assert result["deltas"]["cogs"] == 5000
        assert "cogs" in result["deteriorations"]

    def test_cogs_decrease_is_improvement(self):
        rec_a = _make_record(2026, 1, 50000, 30000)
        rec_b = _make_record(2026, 2, 50000, 25000)
        result = comparar_periodos(rec_a, rec_b)

        assert result["deltas"]["cogs"] == -5000
        assert "cogs" in result["improvements"]

    def test_cascada_and_ratios_present(self):
        rec_a = _make_record(2026, 1, 42000, 25200)
        rec_b = _make_record(2026, 6, 52000, 31200)
        result = comparar_periodos(rec_a, rec_b)

        assert "cascada" in result["period_a"]
        assert "ratios" in result["period_a"]
        assert "cascada" in result["period_b"]
        assert "ratios" in result["period_b"]

    def test_ratio_comparison(self):
        rec_a = _make_record(2026, 1, 42000, 25200)
        rec_b = _make_record(2026, 6, 52000, 31200)
        result = comparar_periodos(rec_a, rec_b)

        # Los ratios deben tener deltas
        assert "gross_margin_pct" in result["deltas"]
        assert "ebitda_margin_pct" in result["deltas"]
        assert "acid_test" in result["deltas"]

    def test_same_period_no_changes(self):
        rec = _make_record(2026, 1, 50000, 30000)
        result = comparar_periodos(rec, rec)

        assert result["deltas"]["revenue"] == 0
        assert len(result["improvements"]) == 0
        assert len(result["deteriorations"]) == 0


# ============================================
# Proyeccion (Forecast)
# ============================================

class TestProyeccion:
    def test_empty_records(self):
        result = proyectar_futuro([], 6)
        assert result["projected"] == []
        assert result["method"] == "moving_average"

    def test_single_record_no_projection(self):
        records = [_make_record(2026, 1, 50000, 30000)]
        result = proyectar_futuro(records, 6)
        assert len(result["historical"]) == 1
        assert len(result["projected"]) == 0

    def test_basic_projection(self, sample_records):
        result = proyectar_futuro(sample_records, 6)
        assert len(result["historical"]) == 6
        assert len(result["projected"]) == 6
        assert result["method"] == "moving_average"

    def test_projected_months_sequential(self, sample_records):
        result = proyectar_futuro(sample_records, 6)
        projected = result["projected"]

        # Ultimo historico es Jun 2026, proyectado empieza Jul 2026
        assert projected[0]["year"] == 2026
        assert projected[0]["month"] == 7
        assert projected[0]["label"] == "Jul 2026"
        assert projected[5]["year"] == 2026
        assert projected[5]["month"] == 12
        assert projected[5]["label"] == "Dic 2026"

    def test_year_rollover(self):
        """Proyeccion que cruza de un anio a otro."""
        records = [
            _make_record(2026, 10, 50000, 30000),
            _make_record(2026, 11, 52000, 31200),
            _make_record(2026, 12, 54000, 32400),
        ]
        result = proyectar_futuro(records, 4)
        projected = result["projected"]

        assert projected[0]["year"] == 2027
        assert projected[0]["month"] == 1
        assert projected[0]["label"] == "Ene 2027"

    def test_confidence_bands(self, sample_records):
        result = proyectar_futuro(sample_records, 3)
        projected = result["projected"]

        for point in projected:
            assert "confidence_low" in point
            assert "confidence_high" in point
            assert point["confidence_low"] <= point["revenue"]
            assert point["confidence_high"] >= point["revenue"]

    def test_projected_values_reasonable(self, sample_records):
        """Los valores proyectados deben estar en rango razonable."""
        result = proyectar_futuro(sample_records, 3)
        last_rev = sample_records[-1]["revenue"]

        for point in result["projected"]:
            # No deberia ser mas del doble ni menos de la mitad
            assert point["revenue"] > last_rev * 0.5
            assert point["revenue"] < last_rev * 2.0


# ============================================
# Varianza Presupuestal
# ============================================

class TestVarianzaPresupuesto:
    def test_on_track(self):
        """Todo dentro del 5% = on_track."""
        actual = _make_record(2026, 1, 50000, 30000,
                              opex_rent=5000, opex_payroll=7000, opex_other=3000)
        budget = {
            "revenue_target": 50000,
            "cogs_target": 30000,
            "opex_rent_target": 5000,
            "opex_payroll_target": 7000,
            "opex_other_target": 3000,
        }
        result = calcular_varianza_presupuesto(actual, budget)

        assert result["period_year"] == 2026
        assert result["period_month"] == 1
        assert result["overall_score"] == 100.0

        # Todas las metricas base deben ser on_track
        for item in result["items"]:
            if item["metric_key"] != "ebitda":  # EBITDA es derivado
                assert item["status"] == "on_track"

    def test_favorable_revenue(self):
        """Revenue mayor que presupuesto = favorable."""
        actual = _make_record(2026, 1, 60000, 30000)
        budget = {
            "revenue_target": 50000,
            "cogs_target": 30000,
            "opex_rent_target": 5000,
            "opex_payroll_target": 7000,
            "opex_other_target": 3000,
        }
        result = calcular_varianza_presupuesto(actual, budget)

        revenue_item = next(i for i in result["items"] if i["metric_key"] == "revenue")
        assert revenue_item["status"] == "favorable"
        assert revenue_item["variance"] == 10000
        assert revenue_item["variance_pct"] == 20.0

    def test_desfavorable_cogs(self):
        """COGS mayor que presupuesto = desfavorable (lower_is_better)."""
        actual = _make_record(2026, 1, 50000, 35000)
        budget = {
            "revenue_target": 50000,
            "cogs_target": 28000,
            "opex_rent_target": 5000,
            "opex_payroll_target": 7000,
            "opex_other_target": 3000,
        }
        result = calcular_varianza_presupuesto(actual, budget)

        cogs_item = next(i for i in result["items"] if i["metric_key"] == "cogs")
        assert cogs_item["status"] == "desfavorable"
        assert cogs_item["variance"] == 7000

    def test_ebitda_derived(self, budget_target):
        """EBITDA se calcula como metrica derivada."""
        actual = _make_record(2026, 1, 50000, 30000)
        result = calcular_varianza_presupuesto(actual, budget_target)

        ebitda_item = next(i for i in result["items"] if i["metric_key"] == "ebitda")
        assert "actual" in ebitda_item
        assert "budget" in ebitda_item
        assert ebitda_item["actual"] == 5000  # 50000-30000-15000

    def test_overall_score(self, budget_target):
        actual = _make_record(2026, 1, 50000, 30000)
        result = calcular_varianza_presupuesto(actual, budget_target)
        assert 0 <= result["overall_score"] <= 100

    def test_items_count(self, budget_target):
        """Debe haber 5 metricas base + EBITDA derivado = 6."""
        actual = _make_record(2026, 1, 50000, 30000)
        result = calcular_varianza_presupuesto(actual, budget_target)
        assert len(result["items"]) == 6

    def test_zero_budget(self):
        """Presupuesto en cero no debe causar errores."""
        actual = _make_record(2026, 1, 50000, 30000)
        budget = {
            "revenue_target": 0,
            "cogs_target": 0,
            "opex_rent_target": 0,
            "opex_payroll_target": 0,
            "opex_other_target": 0,
        }
        result = calcular_varianza_presupuesto(actual, budget)
        assert len(result["items"]) == 6
