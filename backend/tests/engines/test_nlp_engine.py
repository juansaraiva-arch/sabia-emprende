"""
Tests unitarios para nlp_engine.py
Capa de Lenguaje Natural — interpretacion de frases en espanol plano
"""
import pytest
from datetime import date, timedelta
from freezegun import freeze_time

from app.engines.nlp_engine import (
    _parse_amount,
    _detect_multiplier,
    _extract_month,
    _resolve_relative_date,
    _extract_concept,
    interpret_query,
    _generate_description,
)


# ============================================================
# _parse_amount
# ============================================================

class TestParseAmount:
    def test_integer(self):
        assert _parse_amount("50000") == 50000.0

    def test_with_commas(self):
        """'30,500' -> 30500.0 (elimina comas)."""
        assert _parse_amount("30,500") == 30500.0

    def test_empty_string(self):
        assert _parse_amount("") == 0

    def test_non_numeric(self):
        assert _parse_amount("abc") == 0


# ============================================================
# _detect_multiplier
# ============================================================

class TestDetectMultiplier:
    def test_mil_keyword(self):
        """'50 mil', amount 50 -> 50000."""
        assert _detect_multiplier("50 mil", 50) == 50000

    def test_k_keyword(self):
        """'50 k', amount 50 -> 50000 (word boundary required)."""
        assert _detect_multiplier("50 k", 50) == 50000

    def test_k_no_boundary(self):
        """'50k' (sin espacio) -> no detecta 'k' por word boundary."""
        assert _detect_multiplier("50k", 50) == 50

    def test_no_multiplier(self):
        """Sin 'mil'/'k' -> sin cambio."""
        assert _detect_multiplier("50000", 50000) == 50000

    def test_already_large_with_mil(self):
        """Si amount >= 1000 y dice 'mil', no multiplica."""
        assert _detect_multiplier("1000 mil", 1000) == 1000


# ============================================================
# _extract_month
# ============================================================

class TestExtractMonth:
    def test_enero(self):
        assert _extract_month("ventas de enero") == 1

    def test_diciembre(self):
        assert _extract_month("en diciembre") == 12

    def test_abreviado(self):
        assert _extract_month("ventas feb") == 2

    def test_no_month(self):
        assert _extract_month("sin mes") is None


# ============================================================
# _resolve_relative_date
# ============================================================

class TestResolveRelativeDate:
    @freeze_time("2026-03-15")
    def test_hoy(self):
        assert _resolve_relative_date("hoy") == date(2026, 3, 15)

    @freeze_time("2026-03-15")
    def test_ayer(self):
        assert _resolve_relative_date("ayer") == date(2026, 3, 14)

    @freeze_time("2026-03-15")
    def test_antier(self):
        assert _resolve_relative_date("antier") == date(2026, 3, 13)

    @freeze_time("2026-03-18")  # Miercoles
    def test_el_lunes(self):
        """'el lunes' -> lunes anterior (2026-03-16)."""
        result = _resolve_relative_date("el lunes")
        assert result == date(2026, 3, 16)

    @freeze_time("2026-03-15")
    def test_day_number(self):
        """'el 10' -> dia 10 del mes actual."""
        result = _resolve_relative_date("el 10")
        assert result == date(2026, 3, 10)

    def test_no_date(self):
        """Texto sin fecha -> None."""
        assert _resolve_relative_date("texto sin fecha relativa info") is None


# ============================================================
# _extract_concept
# ============================================================

class TestExtractConcept:
    def test_luz(self):
        assert _extract_concept("pague la luz") == "servicios_publicos"

    def test_alquiler(self):
        assert _extract_concept("alquiler del local") == "alquiler"

    def test_marketing(self):
        assert _extract_concept("gasto de marketing") == "marketing"

    def test_unknown(self):
        assert _extract_concept("random cosa desconocida xyz") is None


# ============================================================
# interpret_query
# ============================================================

class TestInterpretQuery:
    def test_register_sales(self):
        """'Mis ventas de enero fueron 50 mil'."""
        result = interpret_query("Mis ventas de enero fueron 50 mil")
        assert result["understood"] is True
        assert result["action"] == "register_sales"
        assert result["extracted_data"]["amount"] == 50000
        assert result["extracted_data"]["month"] == 1

    def test_register_costs(self):
        """'Gaste 30 mil en mercancia'."""
        result = interpret_query("Gaste 30 mil en mercancia")
        assert result["understood"] is True
        assert result["action"] == "register_costs"
        assert result["extracted_data"]["amount"] == 30000

    def test_register_expense(self):
        """'Pague la luz 200'."""
        result = interpret_query("Pague la luz 200")
        assert result["understood"] is True
        assert result["action"] == "register_expense"
        assert result["extracted_data"]["amount"] == 200

    def test_register_income(self):
        """'Me pago el cliente 5000'."""
        result = interpret_query("Me pago el cliente 5000")
        assert result["understood"] is True
        assert result["action"] == "register_income"
        assert result["extracted_data"]["amount"] == 5000

    def test_register_loan(self):
        """'Saque un prestamo de 20 mil'."""
        result = interpret_query("Saque un prestamo de 20 mil")
        assert result["understood"] is True
        assert result["action"] == "register_loan"
        assert result["extracted_data"]["amount"] == 20000

    def test_query_diagnosis(self):
        """'Como esta mi negocio?'."""
        result = interpret_query("Como esta mi negocio?")
        assert result["understood"] is True
        assert result["action"] == "query_diagnosis"

    def test_simulate_price(self):
        """'Si subo el precio un 10%'."""
        result = interpret_query("Si subo el precio un 10%")
        assert result["understood"] is True
        assert result["action"] == "simulate_price"
        assert result["extracted_data"]["percent"] == 10.0

    def test_register_rent(self):
        """'Alquiler fue 2000'."""
        result = interpret_query("Alquiler fue 2000")
        assert result["understood"] is True
        assert result["action"] == "register_rent"
        assert result["extracted_data"]["amount"] == 2000

    def test_unknown_gibberish(self):
        """Texto sin sentido -> understood=False."""
        result = interpret_query("asdflkj qwerty xyz 123")
        assert result["understood"] is False
        assert result["action"] == "unknown"
        assert result["suggestion"] is not None


# ============================================================
# _generate_description
# ============================================================

class TestGenerateDescription:
    def test_register_sales(self):
        desc = _generate_description("register_sales", {"amount": 50000, "month": 1})
        assert "50,000" in desc
        assert "Enero" in desc

    def test_query_diagnosis(self):
        desc = _generate_description("query_diagnosis", {})
        assert "diagn" in desc.lower()

    def test_unknown_action(self):
        desc = _generate_description("nonexistent_action", {})
        assert len(desc) > 0
