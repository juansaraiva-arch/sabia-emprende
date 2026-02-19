"""
Tests unitarios para csv_exporter.py — Fase 11
Motor de exportacion CSV: cascada, tendencias, comparacion, varianza presupuestal.
"""
import csv
import io

import pytest

from app.engines.csv_exporter import (
    export_cascada_csv,
    export_trends_csv,
    export_comparison_csv,
    export_budget_variance_csv,
)
from app.engines.financial_engine import calcular_cascada, calcular_ratios
from app.engines.multiperiod_engine import (
    calcular_tendencias,
    comparar_periodos,
    calcular_varianza_presupuesto,
)


SAMPLE_RECORD = {
    "revenue": 50000, "cogs": 20000,
    "opex_rent": 3000, "opex_payroll": 8000, "opex_other": 4000,
    "depreciation": 500, "interest_expense": 300, "tax_expense": 200,
    "cash_balance": 12000, "accounts_receivable": 8000, "inventory": 5000,
    "accounts_payable": 6000, "bank_debt": 10000,
}


def _parse_csv(csv_bytes: bytes) -> list[list[str]]:
    """Decodifica CSV bytes (con BOM) y retorna lista de filas."""
    text = csv_bytes.decode("utf-8")
    if text.startswith("\ufeff"):
        text = text[1:]
    reader = csv.reader(io.StringIO(text))
    return list(reader)


# ============================================================
# export_cascada_csv
# ============================================================

class TestExportCascadaCsv:
    """Tests para export_cascada_csv (cascada P&L + ratios)."""

    def test_returns_bytes(self):
        """Resultado debe ser bytes."""
        cascada = calcular_cascada(SAMPLE_RECORD)
        ratios = calcular_ratios(SAMPLE_RECORD)
        result = export_cascada_csv(cascada, ratios)
        assert isinstance(result, bytes)

    def test_bom_present(self):
        """CSV comienza con BOM UTF-8."""
        cascada = calcular_cascada(SAMPLE_RECORD)
        ratios = calcular_ratios(SAMPLE_RECORD)
        result = export_cascada_csv(cascada, ratios)
        text = result.decode("utf-8")
        assert text.startswith("\ufeff")

    def test_has_headers(self):
        """Primera fila tiene los headers esperados."""
        cascada = calcular_cascada(SAMPLE_RECORD)
        ratios = calcular_ratios(SAMPLE_RECORD)
        rows = _parse_csv(export_cascada_csv(cascada, ratios))
        assert rows[0] == ["Concepto", "Valor ($)", "% sobre Ventas"]

    def test_has_ventas_row(self):
        """Debe incluir fila de Ventas con valor correcto."""
        cascada = calcular_cascada(SAMPLE_RECORD)
        ratios = calcular_ratios(SAMPLE_RECORD)
        rows = _parse_csv(export_cascada_csv(cascada, ratios))
        ventas_row = rows[1]
        assert ventas_row[0] == "Ventas"
        assert "50" in ventas_row[1]  # contiene 50,000
        assert ventas_row[2] == "100.00%"

    def test_has_ratios_section(self):
        """CSV incluye seccion de ratios clave."""
        cascada = calcular_cascada(SAMPLE_RECORD)
        ratios = calcular_ratios(SAMPLE_RECORD)
        rows = _parse_csv(export_cascada_csv(cascada, ratios))
        flat = [cell for row in rows for cell in row]
        assert "--- RATIOS CLAVE ---" in flat
        assert any("Margen Bruto" in cell for cell in flat)
        assert any("Prueba Acida" in cell for cell in flat)

    def test_zero_revenue_no_crash(self):
        """Revenue = 0 no causa division por cero."""
        record_zero = {**SAMPLE_RECORD, "revenue": 0, "cogs": 0}
        cascada = calcular_cascada(record_zero)
        ratios = calcular_ratios(record_zero)
        result = export_cascada_csv(cascada, ratios)
        assert isinstance(result, bytes)
        rows = _parse_csv(result)
        assert len(rows) > 5  # debe tener contenido

    def test_negative_values_work(self):
        """Valores negativos (perdida) se exportan sin error."""
        record_neg = {
            **SAMPLE_RECORD,
            "revenue": 5000, "cogs": 8000,
            "opex_rent": 3000, "opex_payroll": 2000, "opex_other": 1000,
        }
        cascada = calcular_cascada(record_neg)
        ratios = calcular_ratios(record_neg)
        result = export_cascada_csv(cascada, ratios)
        assert isinstance(result, bytes)
        rows = _parse_csv(result)
        # Gross profit negativo debe aparecer
        gross_row = [r for r in rows if r and r[0] == "= Utilidad Bruta"]
        assert len(gross_row) == 1


# ============================================================
# export_trends_csv
# ============================================================

class TestExportTrendsCsv:
    """Tests para export_trends_csv (tendencias multi-periodo)."""

    def test_empty_points(self):
        """Sin registros -> CSV con solo headers."""
        trends = calcular_tendencias([])
        result = export_trends_csv(trends)
        rows = _parse_csv(result)
        assert len(rows) == 1  # solo headers
        assert rows[0][0] == "Periodo"

    def test_single_point(self):
        """Un solo periodo -> 1 fila de datos, sin growth rates."""
        record = {**SAMPLE_RECORD, "period_year": 2026, "period_month": 1}
        trends = calcular_tendencias([record])
        result = export_trends_csv(trends)
        rows = _parse_csv(result)
        # header + 1 data row (no growth rates con 1 punto)
        data_rows = [r for r in rows[1:] if r and r[0]]
        assert len(data_rows) == 1
        assert "Ene 2026" in data_rows[0][0]

    def test_multiple_points_all_columns(self):
        """Multiples periodos -> todas las columnas presentes."""
        records = [
            {**SAMPLE_RECORD, "period_year": 2026, "period_month": m}
            for m in range(1, 4)
        ]
        trends = calcular_tendencias(records)
        result = export_trends_csv(trends)
        rows = _parse_csv(result)
        assert rows[0] == [
            "Periodo", "Ventas", "COGS", "Ut.Bruta", "OPEX",
            "EBITDA", "Ut.Neta", "Margen Bruto %", "Margen EBITDA %", "Margen Neto %",
        ]
        # 3 data rows
        data_rows = [r for r in rows[1:] if len(r) > 1 and r[0] and "Crecimiento" not in r[0]]
        assert len(data_rows) == 3

    def test_growth_rates_appended(self):
        """Con 2+ periodos, se agrega fila de crecimiento."""
        records = [
            {**SAMPLE_RECORD, "period_year": 2026, "period_month": m}
            for m in range(1, 4)
        ]
        trends = calcular_tendencias(records)
        result = export_trends_csv(trends)
        rows = _parse_csv(result)
        flat = [cell for row in rows for cell in row]
        assert "Crecimiento (%)" in flat

    def test_bom_present(self):
        """CSV de tendencias comienza con BOM."""
        trends = calcular_tendencias([])
        result = export_trends_csv(trends)
        text = result.decode("utf-8")
        assert text.startswith("\ufeff")


# ============================================================
# export_comparison_csv
# ============================================================

class TestExportComparisonCsv:
    """Tests para export_comparison_csv (comparacion de periodos)."""

    def test_returns_bytes(self):
        """Resultado debe ser bytes."""
        record_a = {**SAMPLE_RECORD, "period_year": 2026, "period_month": 1}
        record_b = {**SAMPLE_RECORD, "revenue": 55000, "period_year": 2026, "period_month": 2}
        comparison = comparar_periodos(record_a, record_b)
        result = export_comparison_csv(comparison)
        assert isinstance(result, bytes)

    def test_has_correct_headers(self):
        """Headers incluyen las 5 columnas esperadas con labels por defecto."""
        record_a = {**SAMPLE_RECORD}
        record_b = {**SAMPLE_RECORD, "revenue": 60000}
        comparison = comparar_periodos(record_a, record_b)
        rows = _parse_csv(export_comparison_csv(comparison))
        assert rows[0] == ["Metrica", "Periodo A", "Periodo B", "Delta ($)", "Cambio (%)"]

    def test_six_cascada_metric_rows(self):
        """Debe tener 6 filas de metricas cascada (antes de ratios)."""
        record_a = {**SAMPLE_RECORD}
        record_b = {**SAMPLE_RECORD, "revenue": 60000}
        comparison = comparar_periodos(record_a, record_b)
        rows = _parse_csv(export_comparison_csv(comparison))
        # Primeras 6 filas despues del header son metricas cascada
        metric_labels = {"Ventas", "Costo de Ventas", "Utilidad Bruta",
                         "Gastos Operativos", "EBITDA", "Utilidad Neta"}
        found = {r[0] for r in rows[1:7]}
        assert metric_labels == found

    def test_custom_labels(self):
        """Labels personalizados se reflejan en los headers."""
        record_a = {**SAMPLE_RECORD}
        record_b = {**SAMPLE_RECORD, "revenue": 60000}
        comparison = comparar_periodos(record_a, record_b)
        rows = _parse_csv(export_comparison_csv(comparison, label_a="Enero", label_b="Febrero"))
        assert rows[0][1] == "Enero"
        assert rows[0][2] == "Febrero"


# ============================================================
# export_budget_variance_csv
# ============================================================

class TestExportBudgetVarianceCsv:
    """Tests para export_budget_variance_csv (varianza presupuestal)."""

    def test_returns_bytes(self):
        """Resultado debe ser bytes."""
        actual = {**SAMPLE_RECORD, "period_year": 2026, "period_month": 1}
        budget = {
            "revenue_target": 48000, "cogs_target": 19000,
            "opex_rent_target": 3000, "opex_payroll_target": 8000,
            "opex_other_target": 4000,
        }
        variance = calcular_varianza_presupuesto(actual, budget)
        result = export_budget_variance_csv(variance)
        assert isinstance(result, bytes)

    def test_has_metric_items(self):
        """CSV contiene filas de metricas presupuestales."""
        actual = {**SAMPLE_RECORD, "period_year": 2026, "period_month": 1}
        budget = {
            "revenue_target": 48000, "cogs_target": 19000,
            "opex_rent_target": 3000, "opex_payroll_target": 8000,
            "opex_other_target": 4000,
        }
        variance = calcular_varianza_presupuesto(actual, budget)
        rows = _parse_csv(export_budget_variance_csv(variance))
        flat = [cell for row in rows for cell in row]
        assert "Ventas" in flat
        assert "EBITDA" in flat

    def test_overall_score_appended(self):
        """Debe incluir fila de Score General al final."""
        actual = {**SAMPLE_RECORD, "period_year": 2026, "period_month": 1}
        budget = {
            "revenue_target": 48000, "cogs_target": 19000,
            "opex_rent_target": 3000, "opex_payroll_target": 8000,
            "opex_other_target": 4000,
        }
        variance = calcular_varianza_presupuesto(actual, budget)
        rows = _parse_csv(export_budget_variance_csv(variance))
        flat = [cell for row in rows for cell in row]
        assert "Score General" in flat

    def test_empty_items(self):
        """Variance data sin items -> solo score general y headers."""
        empty_variance = {"items": [], "overall_score": 0.0}
        result = export_budget_variance_csv(empty_variance)
        rows = _parse_csv(result)
        assert rows[0] == ["Metrica", "Real ($)", "Presupuesto ($)", "Varianza ($)", "Varianza (%)", "Estado"]
        # Deberia tener header + empty row + score row
        non_empty = [r for r in rows if r and any(cell for cell in r)]
        assert any("Score General" in cell for row in non_empty for cell in row)
