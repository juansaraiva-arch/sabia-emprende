/**
 * Tipos del Simulador de Nomina — Mi Director Financiero PTY
 * Base legal: Ley 462 de 2025 (CSS/SE) · Codigo de Trabajo · ISR Art. 700
 * CORRECCION: CSS Patronal = 12.25% (no 13.25%, ver Bug #1 2026-03-04)
 */

// ============================================
// EMPLOYEE INPUT
// ============================================

export interface EmpleadoInput {
  id: string;
  nombre: string;
  salario_bruto: number;
  es_publico: boolean;
  tipo_contrato: "indefinido" | "temporal" | "prueba";
  fecha_ingreso: string;
}

// ============================================
// EMPLOYER COST BREAKDOWN
// ============================================

export interface DesgloseCostosEmpleador {
  salario_bruto: number;
  // Cargas sobre la planilla (Ley 462/2025)
  css_patronal_pct: number;                // 12.25%
  css_patronal_monto: number;
  se_patronal_pct: number;                 // 1.50%
  se_patronal_monto: number;
  riesgos_profesionales_pct: number;       // 1.50%
  riesgos_profesionales_monto: number;
  // Prestaciones sociales (Codigo de Trabajo)
  decimotercer_mes_pct: number;            // 8.33% (1/12)
  decimotercer_mes_monto: number;
  vacaciones_pct: number;                  // 4.17% (1/24)
  vacaciones_monto: number;
  cesantia_pct: number;                    // 2.25%
  cesantia_monto: number;
  // Totals
  total_cargas_porcentuales: number;       // CSS+SE+RP = 15.25%
  total_prestaciones: number;              // XIII+Vac+Cesantia
  total_carga_adicional: number;           // Sum of all charges above salary
  costo_total_empleador: number;           // salario_bruto + total_carga_adicional
  factor_multiplicador: number;            // costo_total_empleador / salario_bruto
}

// ============================================
// EMPLOYEE PAY BREAKDOWN
// ============================================

export interface DesglosePagoEmpleado {
  salario_bruto: number;
  // Retenciones obligatorias
  css_empleado_pct: number;                // 9.75%
  css_empleado_monto: number;
  se_empleado_pct: number;                 // 1.25%
  se_empleado_monto: number;
  siacap_mensual: number;                  // B/.10.00 si es publico, 0 si privado
  // ISR
  salario_anual_estimado: number;
  isr_tramo: "0%" | "15%" | "25%";
  isr_base_calculo: number;
  isr_anual_estimado: number;
  isr_mensual: number;
  // Totals
  total_retenciones: number;
  salario_neto: number;
  pct_retencion_efectiva: number;          // total_retenciones / salario_bruto * 100
}

// ============================================
// PER-EMPLOYEE RESULT
// ============================================

export interface ResultadoNominaEmpleado {
  empleado: EmpleadoInput;
  empleador: DesgloseCostosEmpleador;
  empleado_recibe: DesglosePagoEmpleado;
  resumen: {
    salario_bruto: number;
    lo_que_paga_empresa: number;
    lo_que_recibe_empleado: number;
    diferencia: number;
    pct_diferencia: number;
  };
}

// ============================================
// CONSOLIDATED PAYROLL RESULT
// ============================================

export interface ResultadoNominaTotal {
  periodo: string;
  empleados: ResultadoNominaEmpleado[];
  totales_empresa: {
    total_salarios_brutos: number;
    total_css_patronal: number;
    total_se_patronal: number;
    total_riesgos: number;
    total_decimotercer_mes: number;
    total_vacaciones: number;
    total_cesantia: number;
    total_cargas_adicionales: number;
    gran_total_costo_empresa: number;
  };
  totales_retenciones: {
    total_css_empleados: number;
    total_se_empleados: number;
    total_css_patronal: number;
    total_se_patronal: number;
    total_planilla_css: number;           // CSS+SE obrero + CSS+SE patronal
    total_isr_retenido: number;
    total_siacap: number;
  };
  totales_empleados: {
    total_salarios_netos: number;
    total_isr_retenido: number;
  };
}
