"""
Tests para accounting_assistant_engine.py — Sugerencias de cuentas del catalogo real.
"""
import pytest
from unittest.mock import patch, MagicMock


class TestSugerirCuenta:
    """Tests para sugerir_cuenta."""

    @patch("app.engines.accounting_assistant_engine.get_supabase")
    def test_sugiere_cuenta_gasto_alquiler(self, mock_db):
        from app.engines.accounting_assistant_engine import sugerir_cuenta

        # Mock: catalogo con cuentas basicas
        mock_result = MagicMock()
        mock_result.data = [
            {"account_code": "1.1.1", "account_name": "Caja y Bancos", "account_type": "activo", "level": 3, "is_header": False, "normal_balance": "debe"},
            {"account_code": "5.1.1", "account_name": "Alquiler", "account_type": "gasto", "level": 3, "is_header": False, "normal_balance": "debe"},
        ]
        mock_db.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = mock_result

        result = sugerir_cuenta("society-1", "alquiler", "gasto")

        assert result is not None
        assert result["debe"]["code"] == "5.1.1"
        assert result["haber"]["code"] == "1.1.1"

    @patch("app.engines.accounting_assistant_engine.get_supabase")
    def test_sugiere_cuenta_ingreso_venta(self, mock_db):
        from app.engines.accounting_assistant_engine import sugerir_cuenta

        mock_result = MagicMock()
        mock_result.data = [
            {"account_code": "1.1.1", "account_name": "Caja y Bancos", "account_type": "activo", "level": 3, "is_header": False, "normal_balance": "debe"},
            {"account_code": "4.1.1", "account_name": "Ventas", "account_type": "ingreso", "level": 3, "is_header": False, "normal_balance": "haber"},
        ]
        mock_db.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = mock_result

        result = sugerir_cuenta("society-1", "venta_contado", "ingreso")

        assert result is not None
        assert result["debe"]["code"] == "1.1.1"
        assert result["haber"]["code"] == "4.1.1"

    @patch("app.engines.accounting_assistant_engine.get_supabase")
    def test_concepto_desconocido_usa_gasto_general(self, mock_db):
        from app.engines.accounting_assistant_engine import sugerir_cuenta

        mock_result = MagicMock()
        mock_result.data = [
            {"account_code": "1.1.1", "account_name": "Caja y Bancos", "account_type": "activo", "level": 3, "is_header": False, "normal_balance": "debe"},
            {"account_code": "5.1.15", "account_name": "Otros Gastos Generales", "account_type": "gasto", "level": 3, "is_header": False, "normal_balance": "debe"},
        ]
        mock_db.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = mock_result

        result = sugerir_cuenta("society-1", "algo_raro_desconocido", "gasto")

        assert result is not None
        assert result["debe"]["code"] == "5.1.15"
        assert result["haber"]["code"] == "1.1.1"


class TestCatalogoComoContexto:
    """Tests para catalogo_como_contexto."""

    @patch("app.engines.accounting_assistant_engine.get_supabase")
    def test_genera_string_con_catalogo(self, mock_db):
        from app.engines.accounting_assistant_engine import catalogo_como_contexto

        mock_result = MagicMock()
        mock_result.data = [
            {"account_code": "1", "account_name": "Activos", "level": 1, "is_header": True},
            {"account_code": "1.1", "account_name": "Activo Corriente", "level": 2, "is_header": True},
            {"account_code": "1.1.1", "account_name": "Caja y Bancos", "level": 3, "is_header": False},
        ]
        mock_db.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = mock_result

        context = catalogo_como_contexto("society-1")

        assert "CATALOGO DE CUENTAS" in context
        assert "1.1.1" in context
        assert "Caja y Bancos" in context

    @patch("app.engines.accounting_assistant_engine.get_supabase")
    def test_catalogo_vacio(self, mock_db):
        from app.engines.accounting_assistant_engine import catalogo_como_contexto

        mock_result = MagicMock()
        mock_result.data = []
        mock_db.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = mock_result

        # When empty, it triggers provisioning which also returns empty in mock
        context = catalogo_como_contexto("society-1")
        assert isinstance(context, str)


class TestProvisionCatalogo:
    """Tests para provision_catalogo_panama."""

    @patch("app.engines.accounting_assistant_engine.get_supabase")
    def test_provision_returns_accounts(self, mock_db):
        from app.engines.accounting_assistant_engine import provision_catalogo_panama

        mock_upsert = MagicMock()
        mock_db.return_value.table.return_value.upsert.return_value.execute = mock_upsert

        result = provision_catalogo_panama("society-test")

        assert isinstance(result, list)
        assert len(result) > 0
        # All rows should have society_id
        for row in result:
            assert row["society_id"] == "society-test"
            assert "account_code" in row
            assert "account_name" in row
