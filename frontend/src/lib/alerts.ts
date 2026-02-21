/**
 * Motor de Alertas Centralizado — Mi Director Financiero PTY
 * Genera alertas contextuales basadas en datos financieros,
 * legales y laborales del negocio.
 */

import type { FinancialRecord } from "@/lib/calculations";
import { computeCascada, computeOxigeno } from "@/lib/calculations";

// ============================================
// TIPOS
// ============================================

export type AlertPriority = "red" | "orange" | "yellow" | "green";
export type AlertCategory = "dgi" | "capital_humano" | "liquidez" | "rentabilidad" | "legal";

export interface StrategicAlert {
  id: string;
  priority: AlertPriority;
  category: AlertCategory;
  title: string;
  message: string;
  emoji: string;
  /** Texto corto para el Smart Prompt placeholder */
  promptHint: string;
}

// ============================================
// MOTOR DE ALERTAS
// ============================================

export function computeAlerts(record: FinancialRecord): StrategicAlert[] {
  const alerts: StrategicAlert[] = [];
  const cascada = computeCascada(record);
  const ox = computeOxigeno(record);

  // ---- RENTABILIDAD ----

  // Utilidad Neta negativa
  if (cascada.net_income < 0) {
    alerts.push({
      id: "net_loss",
      priority: "red",
      category: "rentabilidad",
      title: "Perdida Neta",
      message: `Tu negocio esta perdiendo $${Math.abs(cascada.net_income).toLocaleString("es-PA")} al mes. Revisa costos y gastos urgentemente.`,
      emoji: "🚨",
      promptHint: "ALERTA: Tu negocio esta en numeros rojos este mes",
    });
  }

  // EBITDA negativo
  if (cascada.ebitda < 0) {
    alerts.push({
      id: "ebitda_negative",
      priority: "red",
      category: "rentabilidad",
      title: "EBITDA Negativo",
      message: `Tu operacion no genera caja. EBITDA: -$${Math.abs(cascada.ebitda).toLocaleString("es-PA")}. Los gastos operativos superan tu utilidad bruta.`,
      emoji: "💀",
      promptHint: "CRITICO: Tu operacion no genera caja suficiente",
    });
  } else if (cascada.ebitda_margin_pct < 10) {
    alerts.push({
      id: "ebitda_low",
      priority: "orange",
      category: "rentabilidad",
      title: "Margen EBITDA bajo",
      message: `Tu margen EBITDA es ${cascada.ebitda_margin_pct.toFixed(1)}% (meta: >15%). Necesitas optimizar costos o subir precios.`,
      emoji: "📉",
      promptHint: `Tu margen EBITDA es solo ${cascada.ebitda_margin_pct.toFixed(1)}%`,
    });
  }

  // Margen Bruto bajo
  if (cascada.gross_margin_pct < 25 && record.revenue > 0) {
    alerts.push({
      id: "gross_margin_low",
      priority: "orange",
      category: "rentabilidad",
      title: "Margen Bruto bajo",
      message: `Tu margen bruto es ${cascada.gross_margin_pct.toFixed(1)}%. Estas regalando margen. Revisa tu estructura de costos.`,
      emoji: "⚠️",
      promptHint: `Tu costo de ventas se come ${(100 - cascada.gross_margin_pct).toFixed(0)}% de tus ingresos`,
    });
  }

  // ---- LIQUIDEZ ----

  // Prueba Acida critica
  if (ox.pruebaAcida < 0.5) {
    alerts.push({
      id: "acid_critical",
      priority: "red",
      category: "liquidez",
      title: "Asfixia de Liquidez",
      message: `Prueba Acida: ${ox.pruebaAcida.toFixed(2)}x. No puedes cubrir tus deudas de corto plazo. Necesitas inyeccion de capital urgente.`,
      emoji: "🆘",
      promptHint: "ASFIXIA: No tienes liquidez para pagar deudas a corto plazo",
    });
  } else if (ox.pruebaAcida < 1.0) {
    alerts.push({
      id: "acid_warning",
      priority: "orange",
      category: "liquidez",
      title: "Liquidez Ajustada",
      message: `Prueba Acida: ${ox.pruebaAcida.toFixed(2)}x (meta: >1.0x). Si un cliente se atrasa, podrias tener problemas.`,
      emoji: "💧",
      promptHint: `Prueba Acida ${ox.pruebaAcida.toFixed(2)}x — liquidez ajustada`,
    });
  }

  // CCC demasiado alto
  if (ox.ccc > 60) {
    alerts.push({
      id: "ccc_critical",
      priority: "red",
      category: "liquidez",
      title: "Caja Atrapada",
      message: `Tu ciclo de caja es ${ox.ccc.toFixed(0)} dias. Tu dinero tarda mas de 2 meses en regresar. Plan de rescate urgente.`,
      emoji: "🔒",
      promptHint: `Tu dinero tarda ${ox.ccc.toFixed(0)} dias en regresar`,
    });
  } else if (ox.ccc > 30) {
    alerts.push({
      id: "ccc_warning",
      priority: "yellow",
      category: "liquidez",
      title: "Ciclo de Caja Lento",
      message: `CCC: ${ox.ccc.toFixed(0)} dias. Tu dinero tarda mas de un mes en regresar. Intenta cobrar mas rapido.`,
      emoji: "⏳",
      promptHint: `Tu ciclo de caja es ${ox.ccc.toFixed(0)} dias`,
    });
  }

  // Cobertura de deuda baja
  if (ox.coberturaBancaria < 1.0 && record.bank_debt > 0) {
    alerts.push({
      id: "debt_critical",
      priority: "red",
      category: "liquidez",
      title: "Deuda Insostenible",
      message: `Tu EBITDA no cubre los intereses bancarios. Cobertura: ${ox.coberturaBancaria.toFixed(1)}x. Renegocia la deuda YA.`,
      emoji: "🏦",
      promptHint: "Tu EBITDA no cubre los intereses del banco",
    });
  } else if (ox.coberturaBancaria < 1.5 && record.bank_debt > 0) {
    alerts.push({
      id: "debt_warning",
      priority: "yellow",
      category: "liquidez",
      title: "Cobertura de Deuda Justa",
      message: `Cobertura: ${ox.coberturaBancaria.toFixed(1)}x (meta: >1.5x). No contrates mas deuda sin mejorar el EBITDA.`,
      emoji: "⚖️",
      promptHint: `Cobertura de deuda ${ox.coberturaBancaria.toFixed(1)}x — no asumas mas deuda`,
    });
  }

  // Dinero atrapado alto
  if (ox.dineroAtrapado > record.revenue * 0.5 && record.revenue > 0) {
    alerts.push({
      id: "trapped_cash",
      priority: "orange",
      category: "liquidez",
      title: "Dinero Atrapado Excesivo",
      message: `$${ox.dineroAtrapado.toLocaleString("es-PA")} atrapados en cuentas por cobrar e inventario. Mas de la mitad de tus ventas.`,
      emoji: "🪤",
      promptHint: `$${ox.dineroAtrapado.toLocaleString("es-PA")} atrapados en CxC + inventario`,
    });
  }

  // ---- EFICIENCIA ----

  // Alquiler excesivo
  const rentRatio = record.revenue > 0 ? (record.opex_rent / record.revenue) * 100 : 0;
  if (rentRatio > 15) {
    alerts.push({
      id: "rent_high",
      priority: "orange",
      category: "rentabilidad",
      title: "Alquiler Excesivo",
      message: `Tu alquiler es ${rentRatio.toFixed(1)}% de tus ventas (meta: <10%). Estas trabajando para el dueno del local.`,
      emoji: "🏠",
      promptHint: `El alquiler consume ${rentRatio.toFixed(1)}% de tus ventas`,
    });
  }

  // Nomina excesiva vs Utilidad Bruta
  // Factor 1.36: Costo Real Empresa (Ley 462/2025)
  // Umbral: 30% segun especificacion ("planilla supero el 30% de tu U.B.")
  const FACTOR_COSTO_REAL = 1.36;
  const grossProfit = record.revenue - record.cogs;
  const costoRealNomina = record.opex_payroll * FACTOR_COSTO_REAL;
  const payrollRatio = grossProfit > 0 ? (costoRealNomina / grossProfit) * 100 : 0;
  if (payrollRatio > 30 && record.opex_payroll > 0) {
    alerts.push({
      id: "payroll_high",
      priority: payrollRatio > 45 ? "red" : "orange",
      category: "capital_humano",
      title: "Sobrecosto Laboral",
      message: `La nomina consume ${payrollRatio.toFixed(1)}% de tu utilidad bruta (meta: <30%). ${payrollRatio > 45 ? "CRITICO: Necesitas reducir plantilla o subir productividad urgentemente." : "Necesitas mas productividad o ajustar plantilla."}`,
      emoji: "💸",
      promptHint: `Sobrecosto Laboral: la planilla supero el 30% de tu U.B.`,
    });
  }

  // ---- FISCAL / DGI ----

  // ITBMS
  const annualRevenue = record.revenue * 12;
  if (annualRevenue >= 36000 && annualRevenue < 42000) {
    alerts.push({
      id: "itbms_precaucion",
      priority: "yellow",
      category: "dgi",
      title: "Acercandote al Limite ITBMS",
      message: `Ventas anuales proyectadas: $${annualRevenue.toLocaleString("es-PA")}. Cerca del limite de $36k. Prepara el registro de ITBMS.`,
      emoji: "📋",
      promptHint: "Estas cerca del limite de $36k para ITBMS",
    });
  } else if (annualRevenue >= 42000) {
    alerts.push({
      id: "itbms_obligatorio",
      priority: "orange",
      category: "dgi",
      title: "ITBMS Obligatorio",
      message: `Ventas anuales proyectadas: $${annualRevenue.toLocaleString("es-PA")}. Debes cobrar 7% de ITBMS y declarar ante la DGI.`,
      emoji: "🧾",
      promptHint: `ITBMS obligatorio — ventas proyectadas $${annualRevenue.toLocaleString("es-PA")}`,
    });
  }

  // ---- CAPITAL HUMANO: XIII Mes ----
  // Alerta cuando la provisión de XIII Mes acumulada supera el 50% del efectivo
  const xiiiMesProvision = record.opex_payroll * 0.0833 * 4; // Estimado peor caso (4 meses de tercio)
  if (xiiiMesProvision > record.cash_balance * 0.5 && record.opex_payroll > 0 && record.cash_balance > 0) {
    alerts.push({
      id: "xiii_mes_warning",
      priority: "orange",
      category: "capital_humano",
      title: "Reserva XIII Mes Ajustada",
      message: `La provision de XIII Mes estimada ($${xiiiMesProvision.toLocaleString("es-PA")}) supera el 50% de tu efectivo. Asegura fondos antes de la fecha de pago.`,
      emoji: "🎁",
      promptHint: "La provision de XIII Mes puede superar tu caja",
    });
  }

  // ---- FISCAL: ITBMS por Pagar vs Efectivo ----
  // Estimado: 7% de ventas menos credito fiscal (~2% compras)
  const itbmsPorPagar = record.revenue * 0.07;
  if (itbmsPorPagar > record.cash_balance && record.cash_balance > 0 && record.revenue > 0) {
    alerts.push({
      id: "itbms_vs_cash",
      priority: "red",
      category: "dgi",
      title: "ITBMS Supera tu Efectivo",
      message: `El ITBMS estimado por pagar ($${itbmsPorPagar.toLocaleString("es-PA")}) supera tu efectivo disponible ($${record.cash_balance.toLocaleString("es-PA")}). Riesgo de multa DGI.`,
      emoji: "🏛️",
      promptHint: "ALERTA: El ITBMS estimado supera tu caja disponible",
    });
  } else if (itbmsPorPagar > record.cash_balance * 0.7 && record.cash_balance > 0 && record.revenue > 0) {
    alerts.push({
      id: "itbms_vs_cash_warning",
      priority: "yellow",
      category: "dgi",
      title: "ITBMS consume mucha caja",
      message: `El ITBMS estimado ($${itbmsPorPagar.toLocaleString("es-PA")}) representa mas del 70% de tu efectivo. Asegura fondos para la declaracion.`,
      emoji: "💰",
      promptHint: "El ITBMS podria dejarte sin liquidez",
    });
  }

  // ---- TODO OK ----
  if (alerts.length === 0) {
    alerts.push({
      id: "all_ok",
      priority: "green",
      category: "rentabilidad",
      title: "Empresa Saludable",
      message: "Todos los indicadores estan en rango optimo. Sigue asi y enfocate en crecer.",
      emoji: "✅",
      promptHint: "TODO EN ORDEN: Tu empresa esta saludable",
    });
  }

  // Ordenar por prioridad
  const priorityOrder: Record<AlertPriority, number> = {
    red: 0,
    orange: 1,
    yellow: 2,
    green: 3,
  };
  alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return alerts;
}

// ============================================
// HELPERS
// ============================================

/** Obtiene la alerta de mayor prioridad para el Smart Prompt */
export function getTopAlert(alerts: StrategicAlert[]): StrategicAlert | null {
  return alerts.length > 0 ? alerts[0] : null;
}

/** Cuenta alertas por categoria */
export function countByCategory(alerts: StrategicAlert[]): Record<AlertCategory, number> {
  const counts: Record<AlertCategory, number> = {
    dgi: 0,
    capital_humano: 0,
    liquidez: 0,
    rentabilidad: 0,
    legal: 0,
  };
  for (const a of alerts) {
    counts[a.category]++;
  }
  return counts;
}

/** Cuenta alertas por prioridad */
export function countByPriority(alerts: StrategicAlert[]): Record<AlertPriority, number> {
  const counts: Record<AlertPriority, number> = {
    red: 0,
    orange: 0,
    yellow: 0,
    green: 0,
  };
  for (const a of alerts) {
    counts[a.priority]++;
  }
  return counts;
}


// ============================================
// COMPLIANCE ALERTS
// ============================================

export interface ComplianceDeadline {
  id: string;
  name: string;
  dueDate: Date;
  category: AlertCategory;
  description: string;
  penaltyDescription: string;
}

/** Genera alertas de cumplimiento basadas en fechas limite de DGI y CSS */
export function computeComplianceAlerts(today: Date = new Date()): StrategicAlert[] {
  const alerts: StrategicAlert[] = [];
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDay = today.getDate();

  // ---- FERIADO PROXIMO (48 horas de anticipacion) ----
  const FERIADOS_2026 = [
    { m: 0, d: 1, n: "Ano Nuevo" },
    { m: 0, d: 9, n: "Dia de los Martires" },
    { m: 1, d: 14, n: "Carnaval (Sabado)" },
    { m: 1, d: 15, n: "Carnaval (Domingo)" },
    { m: 1, d: 16, n: "Carnaval (Lunes)" },
    { m: 1, d: 17, n: "Carnaval (Martes)" },
    { m: 3, d: 2, n: "Jueves Santo" },
    { m: 3, d: 3, n: "Viernes Santo" },
    { m: 4, d: 1, n: "Dia del Trabajo" },
    { m: 10, d: 3, n: "Separacion de Colombia" },
    { m: 10, d: 4, n: "Dia de la Bandera" },
    { m: 10, d: 5, n: "Consolidacion Separatista (Colon)" },
    { m: 10, d: 10, n: "Grito de Independencia (Los Santos)" },
    { m: 10, d: 28, n: "Independencia de Espana" },
    { m: 11, d: 8, n: "Dia de las Madres" },
    { m: 11, d: 25, n: "Navidad" },
  ];
  for (const fer of FERIADOS_2026) {
    const ferDate = new Date(2026, fer.m, fer.d);
    const diffMs = ferDate.getTime() - today.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > 0 && diffHours <= 48) {
      alerts.push({
        id: `holiday-48h-${fer.m}-${fer.d}`,
        priority: "orange",
        category: "capital_humano",
        title: `Feriado Proximo: ${fer.n}`,
        message: `Manana es feriado nacional (${fer.n}). Si el equipo labora, se aplica recargo del 150% automaticamente (triple pago). Planifica turnos.`,
        emoji: "🗓️",
        promptHint: `Feriado manana: ${fer.n} — recargo 150% si se trabaja`,
      });
    }
  }

  // ITBMS - Declaracion mensual (dia 15 del mes siguiente)
  const itbmsDueDay = 15;
  if (currentDay >= 10 && currentDay <= itbmsDueDay) {
    alerts.push({
      id: 'compliance-itbms-monthly',
      priority: currentDay >= 13 ? 'red' : 'orange',
      category: 'dgi',
      title: 'Declaracion ITBMS pendiente',
      message: `La declaracion mensual del ITBMS vence el dia ${itbmsDueDay} de este mes. ${currentDay >= 13 ? 'URGENTE: quedan menos de 3 dias.' : 'Tienes pocos dias para presentarla.'}`,
      emoji: '🧾',
      promptHint: 'Como calculo mi ITBMS este mes?',
    });
  }

  // Renta estimada - pagos trimestrales (jun, sep, dic)
  const rentaEstimadaMonths = [5, 8, 11]; // junio, septiembre, diciembre
  if (rentaEstimadaMonths.includes(currentMonth) && currentDay <= 30) {
    const daysLeft = 30 - currentDay;
    alerts.push({
      id: 'compliance-renta-estimada',
      priority: daysLeft <= 5 ? 'red' : daysLeft <= 15 ? 'orange' : 'yellow',
      category: 'dgi',
      title: 'Pago trimestral de Renta Estimada',
      message: `Este mes corresponde pago trimestral de renta estimada. Quedan ${daysLeft} dias.`,
      emoji: '💰',
      promptHint: 'Cuanto debo pagar de renta estimada?',
    });
  }

  // CSS - Planilla (cuota obrero-patronal, dia 15 del mes siguiente)
  if (currentDay >= 8 && currentDay <= 15) {
    alerts.push({
      id: 'compliance-css-planilla',
      priority: currentDay >= 13 ? 'red' : 'orange',
      category: 'capital_humano',
      title: 'Cuota CSS obrero-patronal',
      message: `El pago de la cuota obrero-patronal a la CSS vence el dia 15. ${currentDay >= 13 ? 'URGENTE: presente antes de la fecha limite para evitar recargos.' : 'Prepare el pago con anticipacion.'}`,
      emoji: '🏥',
      promptHint: 'Como calculo las cuotas CSS de mis empleados?',
    });
  }

  // Declaracion de Renta Anual - marzo 31
  if (currentMonth === 2) { // marzo
    const daysLeft = 31 - currentDay;
    alerts.push({
      id: 'compliance-renta-anual',
      priority: daysLeft <= 5 ? 'red' : daysLeft <= 15 ? 'orange' : 'yellow',
      category: 'dgi',
      title: 'Declaracion de Renta Anual',
      message: `La declaracion jurada de renta del ano anterior vence el 31 de marzo. Quedan ${daysLeft} dias.`,
      emoji: '📋',
      promptHint: 'Que necesito para mi declaracion de renta anual?',
    });
  }

  // Aviso de Operaciones - enero 31
  if (currentMonth === 0) { // enero
    const daysLeft = 31 - currentDay;
    alerts.push({
      id: 'compliance-aviso-operaciones',
      priority: daysLeft <= 5 ? 'red' : daysLeft <= 15 ? 'orange' : 'yellow',
      category: 'legal',
      title: 'Aviso de Operaciones',
      message: `El Aviso de Operaciones debe renovarse antes del 31 de enero. Quedan ${daysLeft} dias.`,
      emoji: '📄',
      promptHint: 'Como renuevo mi aviso de operaciones?',
    });
  }

  return alerts;
}

// ============================================
// PAYROLL/HR ALERTS (Capital Humano)
// ============================================

/** Genera alertas de ausentismo basadas en KPI de asistencia */
export function computePayrollAlerts(
  ausentismoPercent?: number,
  empleadosConVacacionesPendientes?: { nombre: string; diasPendientes: number }[],
): StrategicAlert[] {
  const alerts: StrategicAlert[] = [];

  // Ausentismo Critico (>5% = amarillo, >8% = rojo)
  if (ausentismoPercent !== undefined && ausentismoPercent > 5) {
    alerts.push({
      id: "ausentismo-critico",
      priority: ausentismoPercent > 8 ? "red" : "orange",
      category: "capital_humano",
      title: "Ausentismo Critico",
      message: `El equipo supero el ${ausentismoPercent.toFixed(1)}% de faltas este mes. ${ausentismoPercent > 8 ? "CRITICO: Alto riesgo de incumplimiento con clientes y sobrecarga del personal restante." : "Alerta: Falta de personal puede afectar la generacion de ingresos."}`,
      emoji: "👥",
      promptHint: `Ausentismo critico: ${ausentismoPercent.toFixed(1)}% de faltas`,
    });
  }

  // Vacaciones Acumuladas >30 dias
  if (empleadosConVacacionesPendientes) {
    for (const emp of empleadosConVacacionesPendientes) {
      if (emp.diasPendientes > 30) {
        alerts.push({
          id: `vacaciones-acumuladas-${emp.nombre.toLowerCase().replace(/\s/g, "-")}`,
          priority: emp.diasPendientes > 45 ? "red" : "orange",
          category: "capital_humano",
          title: "Vacaciones Acumuladas",
          message: `${emp.nombre} tiene ${emp.diasPendientes} dias de vacaciones pendientes. Impacto en Pasivo Laboral. Planifica su salida antes de que se acumule mas.`,
          emoji: "🏖️",
          promptHint: `${emp.nombre} tiene >${emp.diasPendientes} dias de vacaciones pendientes`,
        });
      }
    }
  }

  return alerts;
}
