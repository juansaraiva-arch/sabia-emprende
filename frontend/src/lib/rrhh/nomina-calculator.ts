/**
 * Motor de Calculo de Nomina — Mi Director Financiero PTY
 * Base legal: Ley 462 de 2025 (CSS/SE) · Codigo de Trabajo · ISR Art. 700
 *
 * TASAS CORREGIDAS (Bug #1 — 2026-03-04):
 *   CSS Patronal = 12.25% (NO 13.25%)
 *   Total cargas patronales = 12.25 + 1.50 + 1.50 = 15.25%
 *
 * ISR (Bug #2 — 2026-03-04):
 *   1. Deducir 11% (CSS 9.75% + SE 1.25%) del bruto
 *   2. Anualizar x12
 *   3. Tabla DGI: 0-11K -> 0%, 11K-50K -> 15%, >50K -> 25%
 *   4. Dividir /12
 *   Verificacion: B/.1,500 bruto -> ISR mensual ~B/.62.75
 */

import type {
  EmpleadoInput,
  DesgloseCostosEmpleador,
  DesglosePagoEmpleado,
  ResultadoNominaEmpleado,
  ResultadoNominaTotal,
} from "./nomina-types";

// ============================================
// TASAS LEGALES (Ley 462/2025 corregida)
// ============================================

export const TASAS_NOMINA = {
  // Cargas patronales
  CSS_PATRONAL: 0.1225,              // 12.25% (CORREGIDO - Ley 462/2025)
  SE_PATRONAL: 0.0150,               // 1.50%
  RIESGOS_PROFESIONALES: 0.0150,     // 1.50%
  // Prestaciones sociales
  DECIMOTERCER_MES: 1 / 12,          // 8.33%
  VACACIONES: 1 / 24,                // 4.17%
  CESANTIA: 0.0225,                  // 2.25%
  // Retenciones al empleado
  CSS_EMPLEADO: 0.0975,              // 9.75%
  SE_EMPLEADO: 0.0125,               // 1.25%
  SIACAP_MENSUAL: 10.00,             // B/.10/mes (solo sector publico)
  // ISR
  ISR_MINIMO_NO_IMPONIBLE: 11_000,
  ISR_TRAMO_1_LIMITE: 50_000,
  ISR_TRAMO_1_TASA: 0.15,
  ISR_TRAMO_2_TASA: 0.25,
} as const;

// ============================================
// UTILITY
// ============================================

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================
// 1. COSTOS DEL EMPLEADOR
// ============================================

export function calcularCostosEmpleador(salario_bruto: number): DesgloseCostosEmpleador {
  if (salario_bruto <= 0) {
    return {
      salario_bruto: 0,
      css_patronal_pct: TASAS_NOMINA.CSS_PATRONAL * 100,
      css_patronal_monto: 0,
      se_patronal_pct: TASAS_NOMINA.SE_PATRONAL * 100,
      se_patronal_monto: 0,
      riesgos_profesionales_pct: TASAS_NOMINA.RIESGOS_PROFESIONALES * 100,
      riesgos_profesionales_monto: 0,
      decimotercer_mes_pct: r2(TASAS_NOMINA.DECIMOTERCER_MES * 100),
      decimotercer_mes_monto: 0,
      vacaciones_pct: r2(TASAS_NOMINA.VACACIONES * 100),
      vacaciones_monto: 0,
      cesantia_pct: TASAS_NOMINA.CESANTIA * 100,
      cesantia_monto: 0,
      total_cargas_porcentuales: 0,
      total_prestaciones: 0,
      total_carga_adicional: 0,
      costo_total_empleador: 0,
      factor_multiplicador: 0,
    };
  }

  // Cargas sobre la planilla
  const css_patronal = r2(salario_bruto * TASAS_NOMINA.CSS_PATRONAL);
  const se_patronal = r2(salario_bruto * TASAS_NOMINA.SE_PATRONAL);
  const riesgos = r2(salario_bruto * TASAS_NOMINA.RIESGOS_PROFESIONALES);
  const total_cargas = r2(css_patronal + se_patronal + riesgos);

  // Prestaciones sociales
  const decimotercer = r2(salario_bruto * TASAS_NOMINA.DECIMOTERCER_MES);
  const vacaciones = r2(salario_bruto * TASAS_NOMINA.VACACIONES);
  const cesantia = r2(salario_bruto * TASAS_NOMINA.CESANTIA);
  const total_prestaciones = r2(decimotercer + vacaciones + cesantia);

  // Totales
  const total_carga_adicional = r2(total_cargas + total_prestaciones);
  const costo_total = r2(salario_bruto + total_carga_adicional);
  const factor = r2((costo_total / salario_bruto) * 100) / 100;

  return {
    salario_bruto,
    css_patronal_pct: TASAS_NOMINA.CSS_PATRONAL * 100,
    css_patronal_monto: css_patronal,
    se_patronal_pct: TASAS_NOMINA.SE_PATRONAL * 100,
    se_patronal_monto: se_patronal,
    riesgos_profesionales_pct: TASAS_NOMINA.RIESGOS_PROFESIONALES * 100,
    riesgos_profesionales_monto: riesgos,
    decimotercer_mes_pct: r2(TASAS_NOMINA.DECIMOTERCER_MES * 100),
    decimotercer_mes_monto: decimotercer,
    vacaciones_pct: r2(TASAS_NOMINA.VACACIONES * 100),
    vacaciones_monto: vacaciones,
    cesantia_pct: TASAS_NOMINA.CESANTIA * 100,
    cesantia_monto: cesantia,
    total_cargas_porcentuales: r2(
      (TASAS_NOMINA.CSS_PATRONAL + TASAS_NOMINA.SE_PATRONAL + TASAS_NOMINA.RIESGOS_PROFESIONALES) * 100
    ),
    total_prestaciones,
    total_carga_adicional,
    costo_total_empleador: costo_total,
    factor_multiplicador: r2(factor * 100) / 100,
  };
}

// ============================================
// 2. PAGO AL EMPLEADO (desglose retenciones)
// ============================================

export function calcularPagoEmpleado(
  salario_bruto: number,
  es_publico: boolean
): DesglosePagoEmpleado {
  if (salario_bruto <= 0) {
    return {
      salario_bruto: 0,
      css_empleado_pct: TASAS_NOMINA.CSS_EMPLEADO * 100,
      css_empleado_monto: 0,
      se_empleado_pct: TASAS_NOMINA.SE_EMPLEADO * 100,
      se_empleado_monto: 0,
      siacap_mensual: 0,
      salario_anual_estimado: 0,
      isr_tramo: "0%",
      isr_base_calculo: 0,
      isr_anual_estimado: 0,
      isr_mensual: 0,
      total_retenciones: 0,
      salario_neto: 0,
      pct_retencion_efectiva: 0,
    };
  }

  // Retenciones CSS/SE
  const css_empleado = r2(salario_bruto * TASAS_NOMINA.CSS_EMPLEADO);
  const se_empleado = r2(salario_bruto * TASAS_NOMINA.SE_EMPLEADO);
  const siacap = es_publico ? TASAS_NOMINA.SIACAP_MENSUAL : 0;

  // ISR mensual — Bug #2 corregido (2026-03-04)
  // Paso 1: Deducir cuota obrera (CSS 9.75% + SE 1.25% = 11%) del bruto
  const base_gravable_mensual = salario_bruto - css_empleado - se_empleado;

  // Paso 2: Anualizar
  const salario_anual = r2(base_gravable_mensual * 12);

  // Paso 3: Tabla DGI progresiva anual
  let isr_anual = 0;
  let isr_tramo: "0%" | "15%" | "25%" = "0%";

  if (salario_anual <= TASAS_NOMINA.ISR_MINIMO_NO_IMPONIBLE) {
    isr_anual = 0;
    isr_tramo = "0%";
  } else if (salario_anual <= TASAS_NOMINA.ISR_TRAMO_1_LIMITE) {
    isr_anual = (salario_anual - TASAS_NOMINA.ISR_MINIMO_NO_IMPONIBLE) * TASAS_NOMINA.ISR_TRAMO_1_TASA;
    isr_tramo = "15%";
  } else {
    // B/.5,850 fija (39,000 * 15%) + 25% sobre excedente de 50,000
    isr_anual =
      (TASAS_NOMINA.ISR_TRAMO_1_LIMITE - TASAS_NOMINA.ISR_MINIMO_NO_IMPONIBLE) * TASAS_NOMINA.ISR_TRAMO_1_TASA +
      (salario_anual - TASAS_NOMINA.ISR_TRAMO_1_LIMITE) * TASAS_NOMINA.ISR_TRAMO_2_TASA;
    isr_tramo = "25%";
  }

  // Paso 4: Retencion mensual
  const isr_mensual = r2(isr_anual / 12);

  // Totales
  const total_retenciones = r2(css_empleado + se_empleado + siacap + isr_mensual);
  const salario_neto = r2(salario_bruto - total_retenciones);
  const pct_retencion = salario_bruto > 0 ? r2((total_retenciones / salario_bruto) * 100) : 0;

  return {
    salario_bruto,
    css_empleado_pct: TASAS_NOMINA.CSS_EMPLEADO * 100,
    css_empleado_monto: css_empleado,
    se_empleado_pct: TASAS_NOMINA.SE_EMPLEADO * 100,
    se_empleado_monto: se_empleado,
    siacap_mensual: siacap,
    salario_anual_estimado: salario_anual,
    isr_tramo,
    isr_base_calculo: r2(base_gravable_mensual),
    isr_anual_estimado: r2(isr_anual),
    isr_mensual,
    total_retenciones,
    salario_neto,
    pct_retencion_efectiva: pct_retencion,
  };
}

// ============================================
// 3. NOMINA TOTAL (multiples empleados)
// ============================================

export function calcularNominaTotal(
  empleados: EmpleadoInput[],
  periodo: string
): ResultadoNominaTotal {
  const resultados: ResultadoNominaEmpleado[] = empleados.map((emp) => {
    const empleador = calcularCostosEmpleador(emp.salario_bruto);
    const empleado_recibe = calcularPagoEmpleado(emp.salario_bruto, emp.es_publico);

    return {
      empleado: emp,
      empleador,
      empleado_recibe,
      resumen: {
        salario_bruto: emp.salario_bruto,
        lo_que_paga_empresa: empleador.costo_total_empleador,
        lo_que_recibe_empleado: empleado_recibe.salario_neto,
        diferencia: r2(empleador.costo_total_empleador - empleado_recibe.salario_neto),
        pct_diferencia: emp.salario_bruto > 0
          ? r2(((empleador.costo_total_empleador - empleado_recibe.salario_neto) / emp.salario_bruto) * 100)
          : 0,
      },
    };
  });

  // Aggregate employer totals
  const totales_empresa = {
    total_salarios_brutos: r2(resultados.reduce((s, r) => s + r.empleador.salario_bruto, 0)),
    total_css_patronal: r2(resultados.reduce((s, r) => s + r.empleador.css_patronal_monto, 0)),
    total_se_patronal: r2(resultados.reduce((s, r) => s + r.empleador.se_patronal_monto, 0)),
    total_riesgos: r2(resultados.reduce((s, r) => s + r.empleador.riesgos_profesionales_monto, 0)),
    total_decimotercer_mes: r2(resultados.reduce((s, r) => s + r.empleador.decimotercer_mes_monto, 0)),
    total_vacaciones: r2(resultados.reduce((s, r) => s + r.empleador.vacaciones_monto, 0)),
    total_cesantia: r2(resultados.reduce((s, r) => s + r.empleador.cesantia_monto, 0)),
    total_cargas_adicionales: 0,
    gran_total_costo_empresa: 0,
  };
  totales_empresa.total_cargas_adicionales = r2(
    totales_empresa.total_css_patronal +
    totales_empresa.total_se_patronal +
    totales_empresa.total_riesgos +
    totales_empresa.total_decimotercer_mes +
    totales_empresa.total_vacaciones +
    totales_empresa.total_cesantia
  );
  totales_empresa.gran_total_costo_empresa = r2(
    totales_empresa.total_salarios_brutos + totales_empresa.total_cargas_adicionales
  );

  // Aggregate retention totals
  const total_css_empleados = r2(resultados.reduce((s, r) => s + r.empleado_recibe.css_empleado_monto, 0));
  const total_se_empleados = r2(resultados.reduce((s, r) => s + r.empleado_recibe.se_empleado_monto, 0));
  const total_isr = r2(resultados.reduce((s, r) => s + r.empleado_recibe.isr_mensual, 0));
  const total_siacap = r2(resultados.reduce((s, r) => s + r.empleado_recibe.siacap_mensual, 0));

  const totales_retenciones = {
    total_css_empleados,
    total_se_empleados,
    total_css_patronal: totales_empresa.total_css_patronal,
    total_se_patronal: totales_empresa.total_se_patronal,
    total_planilla_css: r2(
      total_css_empleados + total_se_empleados +
      totales_empresa.total_css_patronal + totales_empresa.total_se_patronal
    ),
    total_isr_retenido: total_isr,
    total_siacap,
  };

  // Aggregate employee net totals
  const totales_empleados = {
    total_salarios_netos: r2(resultados.reduce((s, r) => s + r.empleado_recibe.salario_neto, 0)),
    total_isr_retenido: total_isr,
  };

  return {
    periodo,
    empleados: resultados,
    totales_empresa,
    totales_retenciones,
    totales_empleados,
  };
}

// ============================================
// 4. VALIDACION
// ============================================

export function validarResultadoNomina(resultado: ResultadoNominaEmpleado): string[] {
  const errores: string[] = [];
  const { empleador, empleado_recibe, resumen } = resultado;

  // Validate employer cost = bruto + charges
  const costoEsperado = r2(empleador.salario_bruto + empleador.total_carga_adicional);
  if (Math.abs(empleador.costo_total_empleador - costoEsperado) > 0.02) {
    errores.push(
      `Costo empleador (${empleador.costo_total_empleador}) no coincide con bruto + cargas (${costoEsperado})`
    );
  }

  // Validate employee net = bruto - retenciones
  const netoEsperado = r2(empleado_recibe.salario_bruto - empleado_recibe.total_retenciones);
  if (Math.abs(empleado_recibe.salario_neto - netoEsperado) > 0.02) {
    errores.push(
      `Neto empleado (${empleado_recibe.salario_neto}) no coincide con bruto - retenciones (${netoEsperado})`
    );
  }

  // Validate employer charges add up
  const cargasEsperadas = r2(
    empleador.css_patronal_monto +
    empleador.se_patronal_monto +
    empleador.riesgos_profesionales_monto +
    empleador.decimotercer_mes_monto +
    empleador.vacaciones_monto +
    empleador.cesantia_monto
  );
  if (Math.abs(empleador.total_carga_adicional - cargasEsperadas) > 0.02) {
    errores.push(
      `Cargas adicionales (${empleador.total_carga_adicional}) no coinciden con suma individual (${cargasEsperadas})`
    );
  }

  // Validate CSS Patronal rate is 12.25% NOT 13.25%
  if (empleador.css_patronal_pct !== 12.25) {
    errores.push(
      `CSS Patronal debe ser 12.25% (Ley 462/2025), se encontro ${empleador.css_patronal_pct}%`
    );
  }

  // Validate employee retenciones add up
  const retencionesEsperadas = r2(
    empleado_recibe.css_empleado_monto +
    empleado_recibe.se_empleado_monto +
    empleado_recibe.siacap_mensual +
    empleado_recibe.isr_mensual
  );
  if (Math.abs(empleado_recibe.total_retenciones - retencionesEsperadas) > 0.02) {
    errores.push(
      `Total retenciones (${empleado_recibe.total_retenciones}) no coincide con suma individual (${retencionesEsperadas})`
    );
  }

  // Validate factor multiplicador is reasonable (should be ~1.30-1.40 typically)
  if (empleador.factor_multiplicador > 0 && (empleador.factor_multiplicador < 1.1 || empleador.factor_multiplicador > 2.0)) {
    errores.push(
      `Factor multiplicador fuera de rango razonable: ${empleador.factor_multiplicador}x`
    );
  }

  // Validate net salary is positive
  if (empleado_recibe.salario_neto < 0) {
    errores.push(`Salario neto negativo: B/.${empleado_recibe.salario_neto}`);
  }

  // Cross-validate resumen
  if (Math.abs(resumen.lo_que_paga_empresa - empleador.costo_total_empleador) > 0.02) {
    errores.push("Resumen: lo_que_paga_empresa no coincide con costo_total_empleador");
  }
  if (Math.abs(resumen.lo_que_recibe_empleado - empleado_recibe.salario_neto) > 0.02) {
    errores.push("Resumen: lo_que_recibe_empleado no coincide con salario_neto");
  }

  return errores;
}
