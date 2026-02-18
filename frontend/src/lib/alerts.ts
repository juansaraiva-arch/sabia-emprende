/**
 * Motor de Alertas Centralizado — SABIA EMPRENDE
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
  const FACTOR_COSTO_REAL = 1.36;
  const grossProfit = record.revenue - record.cogs;
  const costoRealNomina = record.opex_payroll * FACTOR_COSTO_REAL;
  const payrollRatio = grossProfit > 0 ? (costoRealNomina / grossProfit) * 100 : 0;
  if (payrollRatio > 45 && record.opex_payroll > 0) {
    alerts.push({
      id: "payroll_high",
      priority: "orange",
      category: "capital_humano",
      title: "Nomina Alta vs Utilidad Bruta",
      message: `La nomina consume ${payrollRatio.toFixed(1)}% de tu utilidad bruta (meta: <35%). Necesitas mas productividad o ajustar plantilla.`,
      emoji: "👥",
      promptHint: `La nomina consume ${payrollRatio.toFixed(1)}% de la utilidad bruta`,
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
