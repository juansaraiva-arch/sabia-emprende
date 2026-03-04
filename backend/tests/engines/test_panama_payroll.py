"""
Tests unitarios para panama_payroll.py
Motor de Nomina Panama 2026 — Ley 462 de 2025
"""
import pytest
from app.engines.panama_payroll import (
    calcular_isr_mensual,
    calcular_carga_panama,
    calcular_liquidacion,
    calcular_reserva_xiii_mes,
    calcular_deduccion_ausencia,
    calcular_recargo_feriado,
    calcular_nomina_total,
)


# ============================================================
# calcular_isr_mensual
# ============================================================

class TestCalcularIsrMensual:
    """
    ISR correcto: deducir CSS+SE 11%, anualizar, tabla anual DGI, dividir /12.
    Tabla anual: 0-11,000 → 0% | 11,001-50,000 → 15% | >50,000 → 25%
    """

    @staticmethod
    def _expected_isr(salario):
        """Calcula ISR esperado paso a paso para verificacion."""
        if salario <= 0:
            return 0.0
        base_mensual = salario * 0.89       # deducir 11%
        base_anual = base_mensual * 12
        if base_anual <= 11_000:
            isr_anual = 0.0
        elif base_anual <= 50_000:
            isr_anual = (base_anual - 11_000) * 0.15
        else:
            isr_anual = (50_000 - 11_000) * 0.15
            isr_anual += (base_anual - 50_000) * 0.25
        return isr_anual / 12

    def test_zero_salary(self):
        assert calcular_isr_mensual(0) == 0.0

    def test_negative_salary(self):
        assert calcular_isr_mensual(-100) == 0.0

    def test_tramo1_low_salary_500(self):
        """500 × 0.89 × 12 = 5,340 < 11,000 → ISR = 0"""
        assert calcular_isr_mensual(500) == 0.0

    def test_tramo1_boundary_exact(self):
        """Salario donde base_anual = 11,000 exacto → ISR = 0.
        11,000 / 12 / 0.89 = ~1,030.17"""
        salario = 11_000 / 12 / 0.89
        assert calcular_isr_mensual(salario) == pytest.approx(0.0, abs=0.01)

    def test_tramo1_salary_1000(self):
        """1,000 × 0.89 × 12 = 10,680 < 11,000 → ISR = 0"""
        assert calcular_isr_mensual(1000) == 0.0

    def test_verificacion_salario_1500(self):
        """Caso de verificacion del requerimiento:
        1,500 × 0.89 = 1,335 → anual = 16,020
        ISR anual = (16,020 - 11,000) × 15% = 753
        Mensual = 753 / 12 = 62.75"""
        result = calcular_isr_mensual(1500)
        assert result == pytest.approx(62.75, abs=0.01)

    def test_tramo2_salary_2000(self):
        """2,000 × 0.89 × 12 = 21,360
        ISR = (21,360 - 11,000) × 15% = 1,554 / 12 = 129.50"""
        result = calcular_isr_mensual(2000)
        expected = self._expected_isr(2000)
        assert result == pytest.approx(expected, abs=0.01)
        assert result == pytest.approx(129.50, abs=0.01)

    def test_tramo2_salary_3000(self):
        result = calcular_isr_mensual(3000)
        expected = self._expected_isr(3000)
        assert result == pytest.approx(expected, abs=0.01)

    def test_tramo3_boundary(self):
        """Salario donde base_anual = 50,000 → frontera tramo 3.
        50,000 / 12 / 0.89 = ~4,681.65"""
        salario = 50_000 / 12 / 0.89
        result = calcular_isr_mensual(salario)
        # ISR = (50,000 - 11,000) × 15% = 5,850 / 12 = 487.50
        assert result == pytest.approx(487.50, abs=0.01)

    def test_tramo3_salary_5000(self):
        """5,000 × 0.89 × 12 = 53,400 > 50,000 → entra a tramo 3"""
        result = calcular_isr_mensual(5000)
        expected = self._expected_isr(5000)
        assert result == pytest.approx(expected, abs=0.01)

    def test_tramo3_salary_high(self):
        """10,000 × 0.89 × 12 = 106,800 → bien dentro del tramo 3"""
        result = calcular_isr_mensual(10000)
        expected = self._expected_isr(10000)
        assert result == pytest.approx(expected, abs=0.01)

    def test_isr_increases_with_salary(self):
        salarios = [0, 500, 1000, 1500, 2000, 3000, 5000, 10000]
        isrs = [calcular_isr_mensual(s) for s in salarios]
        for i in range(1, len(isrs)):
            assert isrs[i] >= isrs[i - 1]


# ============================================================
# calcular_carga_panama
# ============================================================

class TestCalcularCargaPanama:
    def test_payroll_basic_structure(self):
        result = calcular_carga_panama(1500, "payroll", 0)
        assert result["employer_cost"] > 1500
        assert result["employee_net"] < 1500
        assert result["total_deductions"] > 0
        assert "breakdown" in result
        assert "carga_patronal_pct" in result

    def test_payroll_patronal_rates(self):
        result = calcular_carga_panama(1500, "payroll", 0)
        bd = result["breakdown"]
        assert bd["css_patronal_12_25"] == pytest.approx(1500 * 0.1225, abs=0.01)
        assert bd["se_patronal"] == pytest.approx(1500 * 0.015, abs=0.01)
        assert bd["rp_patronal"] == pytest.approx(1500 * 0.015, abs=0.01)

    def test_payroll_employee_deductions(self):
        result = calcular_carga_panama(1500, "payroll", 0)
        bd = result["breakdown"]
        assert bd["ss_empleado"] == pytest.approx(1500 * 0.0975, abs=0.01)
        assert bd["se_empleado"] == pytest.approx(1500 * 0.0125, abs=0.01)

    def test_payroll_decimo_provision(self):
        result = calcular_carga_panama(1200, "payroll", 0)
        assert result["breakdown"]["decimo_provision"] == pytest.approx(1200 / 12, abs=0.01)

    def test_payroll_vacaciones_provision(self):
        result = calcular_carga_panama(1500, "payroll", 0)
        expected = (1500 / 30) * 2.5 / 12
        assert result["breakdown"]["vacaciones_provision"] == pytest.approx(expected, abs=0.01)

    def test_payroll_no_seniority(self):
        result = calcular_carga_panama(1500, "payroll", 0)
        assert result["breakdown"]["prima_antiguedad_provision"] == 0

    def test_payroll_with_seniority(self):
        result = calcular_carga_panama(1500, "payroll", 5)
        expected_prima = (1500 / 4) / 12
        assert result["breakdown"]["prima_antiguedad_provision"] == pytest.approx(expected_prima, abs=0.01)

    def test_payroll_zero_salary(self):
        result = calcular_carga_panama(0, "payroll", 0)
        assert result["employer_cost"] == 0
        assert result["employee_net"] == 0
        assert result["total_deductions"] == 0
        assert result["breakdown"] == {}

    def test_payroll_negative_salary(self):
        result = calcular_carga_panama(-500, "payroll", 0)
        assert result["employer_cost"] == 0
        assert result["employee_net"] == 0

    def test_payroll_below_isr_threshold(self):
        result = calcular_carga_panama(500, "payroll", 0)
        assert result["breakdown"]["isr_empleado"] == 0

    def test_payroll_tramo2_isr(self):
        result = calcular_carga_panama(1200, "payroll", 0)
        expected_isr = calcular_isr_mensual(1200)
        assert result["breakdown"]["isr_empleado"] == pytest.approx(expected_isr, abs=0.01)

    def test_payroll_tramo3_isr(self):
        result = calcular_carga_panama(2500, "payroll", 0)
        expected_isr = calcular_isr_mensual(2500)
        assert result["breakdown"]["isr_empleado"] == pytest.approx(expected_isr, abs=0.01)

    def test_payroll_employer_cost_formula(self):
        result = calcular_carga_panama(1800, "payroll", 2)
        bd = result["breakdown"]
        expected_employer = 1800 + bd["carga_patronal_total"]
        assert result["employer_cost"] == pytest.approx(expected_employer, abs=0.01)

    def test_payroll_employee_net_formula(self):
        result = calcular_carga_panama(1800, "payroll", 0)
        bd = result["breakdown"]
        expected_deductions = bd["ss_empleado"] + bd["se_empleado"] + bd["isr_empleado"]
        assert result["total_deductions"] == pytest.approx(expected_deductions, abs=0.01)
        assert result["employee_net"] == pytest.approx(1800 - expected_deductions, abs=0.01)

    def test_payroll_carga_patronal_pct(self):
        result = calcular_carga_panama(1500, "payroll", 0)
        assert result["carga_patronal_pct"] > 0

    def test_freelance(self):
        result = calcular_carga_panama(3000, "freelance", 0)
        assert result["employer_cost"] == 3000
        assert result["employee_net"] == 2700
        assert result["total_deductions"] == 300
        assert result["breakdown"]["retencion_isr_10pct"] == 300
        assert result["carga_patronal_pct"] == 0

    def test_freelance_small_salary(self):
        result = calcular_carga_panama(100, "freelance", 0)
        assert result["employer_cost"] == 100
        assert result["employee_net"] == 90
        assert result["total_deductions"] == 10

    def test_unknown_type(self):
        result = calcular_carga_panama(2000, "unknown", 0)
        assert result["employer_cost"] == 2000
        assert result["employee_net"] == 2000
        assert result["total_deductions"] == 0
        assert result["breakdown"] == {}

    def test_unknown_type_zero_carga_pct(self):
        result = calcular_carga_panama(2000, "other_type", 0)
        assert result["carga_patronal_pct"] == 0


# ============================================================
# calcular_liquidacion
# ============================================================

class TestCalcularLiquidacion:
    def test_renuncia_con_antiguedad(self):
        result = calcular_liquidacion(
            salario=1500, years_worked=3, exit_reason="renuncia",
            vacation_days_accrued=15, vacation_days_taken=5,
            months_current_tercio=2,
        )
        assert result["aplica_indemnizacion"] is False
        assert result["indemnizacion"] == 0
        assert result["prima_antiguedad"] > 0
        assert result["vacation_days_pending"] == 10
        assert result["pago_vacaciones_proporcional"] > 0
        assert result["pago_xiii_proporcional"] > 0

    def test_despido_con_indemnizacion(self):
        result = calcular_liquidacion(
            salario=2000, years_worked=5, exit_reason="despido",
        )
        assert result["aplica_indemnizacion"] is True
        expected_indem = (2000 / 4) * 3.4 * 5
        assert result["indemnizacion"] == pytest.approx(expected_indem, abs=0.01)

    def test_despido_zero_years(self):
        result = calcular_liquidacion(salario=1500, years_worked=0, exit_reason="despido")
        assert result["aplica_indemnizacion"] is True
        assert result["indemnizacion"] == 0

    def test_mutuo_acuerdo_sin_indemnizacion(self):
        result = calcular_liquidacion(salario=1500, years_worked=2, exit_reason="mutuo_acuerdo")
        assert result["indemnizacion"] == 0
        assert result["aplica_indemnizacion"] is False

    def test_fin_contrato_sin_indemnizacion(self):
        result = calcular_liquidacion(salario=1500, years_worked=1, exit_reason="fin_contrato")
        assert result["indemnizacion"] == 0
        assert result["aplica_indemnizacion"] is False

    def test_zero_years_no_prima(self):
        result = calcular_liquidacion(salario=1500, years_worked=0, exit_reason="renuncia")
        assert result["prima_antiguedad"] == 0

    def test_prima_antiguedad_formula(self):
        result = calcular_liquidacion(salario=2000, years_worked=4, exit_reason="renuncia")
        expected = (2000 / 4) * 4
        assert result["prima_antiguedad"] == pytest.approx(expected, abs=0.01)

    def test_vacation_calculation(self):
        result = calcular_liquidacion(
            salario=1500, years_worked=1, exit_reason="renuncia",
            vacation_days_accrued=15, vacation_days_taken=10,
        )
        assert result["vacation_days_pending"] == 5
        expected_pago = 5 * (1500 / 30)
        assert result["pago_vacaciones_proporcional"] == pytest.approx(expected_pago, abs=0.01)

    def test_vacation_no_days(self):
        result = calcular_liquidacion(
            salario=1500, years_worked=1, exit_reason="renuncia",
            vacation_days_accrued=0, vacation_days_taken=0,
        )
        assert result["vacation_days_pending"] == 0
        assert result["pago_vacaciones_proporcional"] == 0

    def test_vacation_taken_exceeds_accrued(self):
        result = calcular_liquidacion(
            salario=1500, years_worked=0, exit_reason="renuncia",
            vacation_days_accrued=5, vacation_days_taken=10,
        )
        assert result["vacation_days_pending"] == 0
        assert result["pago_vacaciones_proporcional"] == 0

    def test_xiii_proporcional_basic(self):
        result = calcular_liquidacion(
            salario=1200, years_worked=1, exit_reason="renuncia",
            months_current_tercio=3,
        )
        expected = (1200 / 12) * 3
        assert result["pago_xiii_proporcional"] == pytest.approx(expected, abs=0.01)

    def test_xiii_proporcional_with_accumulated(self):
        result = calcular_liquidacion(
            salario=1200, years_worked=1, exit_reason="renuncia",
            xiii_mes_accumulated=150, months_current_tercio=3,
        )
        xiii_proporcional = (1200 / 12) * 3
        expected = max(0, xiii_proporcional - 150)
        assert result["pago_xiii_proporcional"] == pytest.approx(expected, abs=0.01)

    def test_xiii_accumulated_exceeds_proporcional(self):
        result = calcular_liquidacion(
            salario=1200, years_worked=1, exit_reason="renuncia",
            xiii_mes_accumulated=500, months_current_tercio=3,
        )
        assert result["pago_xiii_proporcional"] == 0

    def test_total_liquidacion_sum(self):
        result = calcular_liquidacion(
            salario=2000, years_worked=3, exit_reason="despido",
            vacation_days_accrued=20, vacation_days_taken=5,
            months_current_tercio=2,
        )
        expected_total = (
            result["pago_vacaciones_proporcional"]
            + result["pago_xiii_proporcional"]
            + result["prima_antiguedad"]
            + result["indemnizacion"]
        )
        assert result["total_liquidacion"] == pytest.approx(expected_total, abs=0.01)

    def test_return_fields(self):
        result = calcular_liquidacion(salario=1500, years_worked=1, exit_reason="renuncia")
        expected_keys = {
            "salario_base", "years_worked", "exit_reason",
            "pago_vacaciones_proporcional", "vacation_days_pending",
            "pago_xiii_proporcional", "prima_antiguedad",
            "indemnizacion", "total_liquidacion", "aplica_indemnizacion",
        }
        assert expected_keys.issubset(result.keys())


# ============================================================
# calcular_reserva_xiii_mes
# ============================================================

class TestCalcularReservaXiiiMes:
    def test_two_payroll_employees(self):
        empleados = [
            {"employee_name": "A", "contract_type": "payroll", "gross_salary": 1200},
            {"employee_name": "B", "contract_type": "payroll", "gross_salary": 1800},
        ]
        result = calcular_reserva_xiii_mes(empleados, 3)
        expected = (1200 / 12) * 3 + (1800 / 12) * 3
        assert result["total_reserva_pendiente"] == pytest.approx(expected, abs=0.01)
        assert len(result["empleados"]) == 2

    def test_employee_detail_fields(self):
        empleados = [
            {"employee_name": "Ana", "contract_type": "payroll", "gross_salary": 1500},
        ]
        result = calcular_reserva_xiii_mes(empleados, 2)
        detail = result["empleados"][0]
        assert detail["employee_name"] == "Ana"
        assert detail["provision_mensual"] == pytest.approx(1500 / 12, abs=0.01)
        assert detail["acumulado_tercio"] == pytest.approx((1500 / 12) * 2, abs=0.01)

    def test_freelance_excluded(self):
        empleados = [
            {"employee_name": "A", "contract_type": "payroll", "gross_salary": 1500},
            {"employee_name": "B", "contract_type": "freelance", "gross_salary": 3000},
        ]
        result = calcular_reserva_xiii_mes(empleados, 2)
        expected = (1500 / 12) * 2
        assert result["total_reserva_pendiente"] == pytest.approx(expected, abs=0.01)
        assert len(result["empleados"]) == 1

    def test_empty_list(self):
        result = calcular_reserva_xiii_mes([], 3)
        assert result["total_reserva_pendiente"] == 0
        assert len(result["empleados"]) == 0

    def test_zero_months(self):
        empleados = [{"employee_name": "A", "contract_type": "payroll", "gross_salary": 1500}]
        result = calcular_reserva_xiii_mes(empleados, 0)
        assert result["total_reserva_pendiente"] == 0

    def test_months_in_tercio_returned(self):
        result = calcular_reserva_xiii_mes([], 4)
        assert result["months_in_tercio"] == 4

    def test_missing_employee_name_defaults_empty(self):
        empleados = [{"contract_type": "payroll", "gross_salary": 1000}]
        result = calcular_reserva_xiii_mes(empleados, 1)
        assert result["empleados"][0]["employee_name"] == ""

    def test_missing_gross_salary_defaults_zero(self):
        empleados = [{"employee_name": "X", "contract_type": "payroll"}]
        result = calcular_reserva_xiii_mes(empleados, 2)
        assert result["total_reserva_pendiente"] == 0


# ============================================================
# calcular_deduccion_ausencia
# ============================================================

class TestCalcularDeduccionAusencia:
    def test_two_days_absent(self):
        result = calcular_deduccion_ausencia(1500, 2)
        expected_deduccion = (1500 / 30) * 2
        assert result["deduccion_empleado"] == pytest.approx(expected_deduccion, abs=0.01)
        assert result["salario_ajustado"] == pytest.approx(1500 - expected_deduccion, abs=0.01)
        assert result["ahorro_patronal_ss"] == pytest.approx(expected_deduccion * 0.1225, abs=0.01)

    def test_ahorro_patronal_breakdown(self):
        result = calcular_deduccion_ausencia(1500, 3)
        deduccion = (1500 / 30) * 3
        assert result["ahorro_patronal_ss"] == pytest.approx(deduccion * 0.1225, abs=0.01)
        assert result["ahorro_patronal_se"] == pytest.approx(deduccion * 0.015, abs=0.01)
        assert result["ahorro_patronal_rp"] == pytest.approx(deduccion * 0.015, abs=0.01)
        expected_total = deduccion * 0.1225 + deduccion * 0.015 + deduccion * 0.015
        assert result["ahorro_patronal_total"] == pytest.approx(expected_total, abs=0.01)

    def test_zero_days_absent(self):
        result = calcular_deduccion_ausencia(1500, 0)
        assert result["deduccion_empleado"] == 0
        assert result["salario_ajustado"] == 1500
        assert result["ahorro_patronal_total"] == 0

    def test_zero_salary(self):
        result = calcular_deduccion_ausencia(0, 5)
        assert result["deduccion_empleado"] == 0
        assert result["ahorro_patronal_total"] == 0

    def test_thirty_days_absent(self):
        result = calcular_deduccion_ausencia(1500, 30)
        assert result["salario_ajustado"] == 0
        assert result["deduccion_empleado"] == pytest.approx(1500, abs=0.01)

    def test_return_fields(self):
        result = calcular_deduccion_ausencia(1000, 1)
        expected_keys = {
            "salario_original", "dias_injustificados", "deduccion_empleado",
            "salario_ajustado", "ahorro_patronal_ss", "ahorro_patronal_se",
            "ahorro_patronal_rp", "ahorro_patronal_total",
        }
        assert expected_keys == set(result.keys())


# ============================================================
# calcular_recargo_feriado
# ============================================================

class TestCalcularRecargoFeriado:
    def test_feriado_150(self):
        result = calcular_recargo_feriado(50, "feriado")
        assert result["monto_recargo"] == pytest.approx(75, abs=0.01)
        assert result["pago_total_dia"] == pytest.approx(125, abs=0.01)

    def test_domingo_50(self):
        result = calcular_recargo_feriado(50, "domingo")
        assert result["monto_recargo"] == pytest.approx(25, abs=0.01)
        assert result["pago_total_dia"] == pytest.approx(75, abs=0.01)

    def test_extra_diurna_25(self):
        result = calcular_recargo_feriado(50, "extra_diurna")
        assert result["monto_recargo"] == pytest.approx(12.50, abs=0.01)
        assert result["pago_total_dia"] == pytest.approx(62.50, abs=0.01)

    def test_extra_nocturna_75(self):
        result = calcular_recargo_feriado(50, "extra_nocturna")
        assert result["monto_recargo"] == pytest.approx(37.50, abs=0.01)
        assert result["pago_total_dia"] == pytest.approx(87.50, abs=0.01)

    def test_nocturno_50(self):
        result = calcular_recargo_feriado(50, "nocturno")
        assert result["monto_recargo"] == pytest.approx(25, abs=0.01)
        assert result["pago_total_dia"] == pytest.approx(75, abs=0.01)

    def test_unknown_type_zero(self):
        result = calcular_recargo_feriado(50, "unknown")
        assert result["monto_recargo"] == 0
        assert result["pago_total_dia"] == 50

    def test_zero_salary_diario(self):
        result = calcular_recargo_feriado(0, "feriado")
        assert result["monto_recargo"] == 0
        assert result["pago_total_dia"] == 0

    def test_return_fields(self):
        result = calcular_recargo_feriado(100, "feriado")
        expected_keys = {
            "tipo_recargo", "salario_diario", "porcentaje_recargo",
            "monto_recargo", "pago_total_dia",
        }
        assert expected_keys == set(result.keys())

    def test_porcentaje_recargo_format(self):
        result = calcular_recargo_feriado(100, "feriado")
        assert result["porcentaje_recargo"] == "150%"
        result = calcular_recargo_feriado(100, "extra_diurna")
        assert result["porcentaje_recargo"] == "25%"


# ============================================================
# calcular_nomina_total
# ============================================================

class TestCalcularNominaTotal:
    def test_mixed_employees(self, sample_employees):
        result = calcular_nomina_total(sample_employees)
        assert result["total_employer_cost"] > 0
        assert result["total_employee_net"] > 0
        assert len(result["employees"]) == 3
        assert result["hidden_cost"] > 0
        assert result["ley"] == "Ley 462 de 2025 — CSS Patronal 12.25% + RP 1.50% + SE 1.50%"

    def test_empty_list(self):
        result = calcular_nomina_total([])
        assert result["total_employer_cost"] == 0
        assert result["total_employee_net"] == 0
        assert len(result["employees"]) == 0
        assert result["hidden_cost"] == 0

    def test_single_employee_matches_carga(self):
        emp = {"employee_name": "Test", "contract_type": "payroll", "gross_salary": 1500, "years_worked": 0}
        nomina = calcular_nomina_total([emp])
        carga = calcular_carga_panama(1500, "payroll", 0)
        assert nomina["total_employer_cost"] == carga["employer_cost"]
        assert nomina["total_employee_net"] == carga["employee_net"]

    def test_hidden_cost_calculation(self, sample_employees):
        result = calcular_nomina_total(sample_employees)
        total_gross = sum(e["gross_salary"] for e in sample_employees)
        expected_hidden = result["total_employer_cost"] - total_gross
        assert result["hidden_cost"] == pytest.approx(expected_hidden, abs=0.01)

    def test_employee_detail_includes_carga_fields(self, sample_employees):
        result = calcular_nomina_total(sample_employees)
        for emp_detail in result["employees"]:
            assert "employer_cost" in emp_detail
            assert "employee_net" in emp_detail
            assert "total_deductions" in emp_detail
            assert "breakdown" in emp_detail
            assert "employee_name" in emp_detail
            assert "contract_type" in emp_detail
            assert "gross_salary" in emp_detail

    def test_totals_match_sum_of_individuals(self, sample_employees):
        result = calcular_nomina_total(sample_employees)
        sum_employer = sum(e["employer_cost"] for e in result["employees"])
        sum_net = sum(e["employee_net"] for e in result["employees"])
        assert result["total_employer_cost"] == pytest.approx(sum_employer, abs=0.01)
        assert result["total_employee_net"] == pytest.approx(sum_net, abs=0.01)

    def test_freelance_only(self):
        empleados = [
            {"employee_name": "F1", "contract_type": "freelance", "gross_salary": 2000},
            {"employee_name": "F2", "contract_type": "freelance", "gross_salary": 3000},
        ]
        result = calcular_nomina_total(empleados)
        assert result["hidden_cost"] == 0
        assert result["total_employer_cost"] == 5000

    def test_years_worked_default(self):
        emp = {"employee_name": "New", "contract_type": "payroll", "gross_salary": 1000}
        result = calcular_nomina_total([emp])
        carga = calcular_carga_panama(1000, "payroll", 0)
        assert result["total_employer_cost"] == carga["employer_cost"]

    def test_ley_string(self):
        result = calcular_nomina_total([])
        assert result["ley"] == "Ley 462 de 2025 — CSS Patronal 12.25% + RP 1.50% + SE 1.50%"
