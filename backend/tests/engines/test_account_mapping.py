"""
Tests de integridad para account_mapping.py
Valida la coherencia de las estructuras de datos contables.
"""
import pytest
from app.engines.account_mapping import (
    DEFAULT_CHART_OF_ACCOUNTS,
    CONCEPT_TO_ACCOUNTS,
    ACCOUNT_TYPE_TO_FINANCIAL_FIELD,
)


class TestDefaultChartOfAccounts:
    def test_not_empty(self):
        """El plan de cuentas no esta vacio."""
        assert len(DEFAULT_CHART_OF_ACCOUNTS) > 0

    def test_required_keys(self):
        """Todos tienen keys requeridas (code, name, type)."""
        for acct in DEFAULT_CHART_OF_ACCOUNTS:
            assert "code" in acct, f"Falta 'code' en {acct}"
            assert "name" in acct, f"Falta 'name' en {acct}"
            assert "type" in acct, f"Falta 'type' en {acct}"

    def test_no_duplicate_codes(self):
        """Sin codigos duplicados."""
        codes = [a["code"] for a in DEFAULT_CHART_OF_ACCOUNTS]
        assert len(codes) == len(set(codes)), f"Codigos duplicados: {[c for c in codes if codes.count(c) > 1]}"

    def test_covers_five_groups(self):
        """Cubre 5 grupos (1.x-5.x)."""
        codes = {a["code"] for a in DEFAULT_CHART_OF_ACCOUNTS}
        for group in ["1", "2", "3", "4", "5"]:
            assert group in codes, f"Falta grupo top-level '{group}'"


class TestConceptToAccounts:
    def test_has_description_and_lines(self):
        """Cada concepto tiene 'description' y 'lines'."""
        for concept_key, concept in CONCEPT_TO_ACCOUNTS.items():
            assert "description" in concept, f"Concepto '{concept_key}' sin description"
            assert "lines" in concept, f"Concepto '{concept_key}' sin lines"

    def test_exactly_two_lines(self):
        """Cada concepto tiene exactamente 2 lineas (debe y haber)."""
        for concept_key, concept in CONCEPT_TO_ACCOUNTS.items():
            assert len(concept["lines"]) == 2, (
                f"Concepto '{concept_key}' tiene {len(concept['lines'])} lineas, esperaba 2"
            )

    def test_all_referenced_codes_exist(self):
        """Todas las account codes referenciadas existen en DEFAULT_CHART."""
        valid_codes = {a["code"] for a in DEFAULT_CHART_OF_ACCOUNTS}
        for concept_key, concept in CONCEPT_TO_ACCOUNTS.items():
            for line in concept["lines"]:
                code = line["account_code"]
                assert code in valid_codes, (
                    f"Concepto '{concept_key}' referencia cuenta '{code}' que no existe en el plan"
                )

    def test_each_concept_has_debe_and_haber(self):
        """Cada concepto tiene al menos una linea DEBE y una HABER."""
        for concept_key, concept in CONCEPT_TO_ACCOUNTS.items():
            has_debe = any(line.get("debe") for line in concept["lines"])
            has_haber = any(line.get("haber") for line in concept["lines"])
            assert has_debe, f"Concepto '{concept_key}' sin linea DEBE"
            assert has_haber, f"Concepto '{concept_key}' sin linea HABER"


class TestAccountTypeToFinancialField:
    def test_not_empty(self):
        """El mapeo no esta vacio."""
        assert len(ACCOUNT_TYPE_TO_FINANCIAL_FIELD) > 0

    def test_valid_field_names(self):
        """Todos los campos son campos validos de financial_records."""
        valid_fields = {
            "revenue", "cogs", "opex_rent", "opex_payroll", "opex_other",
            "depreciation", "interest_expense", "tax_expense",
            "cash_balance", "accounts_receivable", "inventory",
            "accounts_payable", "bank_debt",
        }
        for code, field in ACCOUNT_TYPE_TO_FINANCIAL_FIELD.items():
            assert field in valid_fields, (
                f"Cuenta '{code}' mapea a campo invalido '{field}'"
            )
