"""
Fixtures compartidos para tests de SABIA EMPRENDE.
"""
import pytest


@pytest.fixture
def sample_financial_record():
    """Registro financiero mensual tipico de un negocio pequeno en Panama."""
    return {
        "revenue": 50000,
        "cogs": 20000,
        "opex_rent": 3000,
        "opex_payroll": 8000,
        "opex_other": 4000,
        "depreciation": 500,
        "interest_expense": 300,
        "tax_expense": 200,
        "cash_balance": 12000,
        "accounts_receivable": 8000,
        "inventory": 5000,
        "accounts_payable": 6000,
        "bank_debt": 10000,
    }


@pytest.fixture
def zero_revenue_record():
    """Negocio sin ingresos."""
    return {
        "revenue": 0,
        "cogs": 0,
        "opex_rent": 2000,
        "opex_payroll": 3000,
        "opex_other": 1000,
        "depreciation": 0,
        "interest_expense": 0,
        "tax_expense": 0,
        "cash_balance": 500,
        "accounts_receivable": 0,
        "inventory": 0,
        "accounts_payable": 0,
        "bank_debt": 0,
    }


@pytest.fixture
def loss_record():
    """Negocio operando con perdida."""
    return {
        "revenue": 10000,
        "cogs": 7000,
        "opex_rent": 2500,
        "opex_payroll": 3000,
        "opex_other": 1500,
        "depreciation": 200,
        "interest_expense": 100,
        "tax_expense": 0,
        "cash_balance": 2000,
        "accounts_receivable": 3000,
        "inventory": 4000,
        "accounts_payable": 5000,
        "bank_debt": 8000,
    }


@pytest.fixture
def all_zeros_record():
    """Registro con todos los campos en cero."""
    return {
        "revenue": 0,
        "cogs": 0,
        "opex_rent": 0,
        "opex_payroll": 0,
        "opex_other": 0,
        "depreciation": 0,
        "interest_expense": 0,
        "tax_expense": 0,
        "cash_balance": 0,
        "accounts_receivable": 0,
        "inventory": 0,
        "accounts_payable": 0,
        "bank_debt": 0,
    }


@pytest.fixture
def sample_employees():
    """Lista de empleados para tests de nomina."""
    return [
        {"employee_name": "Ana Lopez", "contract_type": "payroll", "gross_salary": 1500, "years_worked": 3},
        {"employee_name": "Carlos Rivera", "contract_type": "payroll", "gross_salary": 2000, "years_worked": 0},
        {"employee_name": "Diana Kim", "contract_type": "freelance", "gross_salary": 3000, "years_worked": 0},
    ]
