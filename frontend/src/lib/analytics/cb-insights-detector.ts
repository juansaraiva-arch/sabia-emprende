/**
 * DETECTOR DE LAS 6 CAUSAS CB INSIGHTS
 * Evalua la salud del negocio basado en datos financieros locales.
 * Fuente: CB Insights "Top 20 Reasons Startups Fail" (2023)
 *
 * Usa computeCascada() y datos del FinancialRecord existente,
 * NO requiere Supabase.
 */

import type { FinancialRecord } from "@/lib/calculations";
import { computeCascada } from "@/lib/calculations";

// ============================================
// TIPOS
// ============================================

export type NivelRiesgo = "critico" | "precaucion" | "en_orden" | "sin_datos";

export interface ResultadoCausa {
  id: number;
  titulo: string;
  subtitulo: string;
  nivel: NivelRiesgo;
  valor_actual: string;
  umbral: string;
  tendencia: "mejorando" | "estable" | "empeorando" | "sin_datos";
  mensaje: string;
  accion: string;
  emoji: string;
  base_cb: string;
}

export interface ResultadoCBInsights {
  calculado_en: string;
  causas: ResultadoCausa[];
  score_salud: number; // 0-100
  nivel_general: NivelRiesgo;
  resumen: string;
}

// ============================================
// CONSTANTES
// ============================================

/** Factor costo real empresa Panama (CSS 12.25% + RP 1.50% + SE 1.50% = 15.25%, redondeado 1.36x) */
const FACTOR_COSTO_EMPRESA = 1.36;

// Umbrales
const RUNWAY_CRITICO_MESES = 3;
const RUNWAY_PRECAUCION_MESES = 6;
const PAYROLL_CRITICO_PCT = 40;
const PAYROLL_PRECAUCION_PCT = 30;
const GROSS_MARGIN_CRITICO_PCT = 15;
const GROSS_MARGIN_PRECAUCION_PCT = 20;
const COGS_CRITICO_PCT = 70;
const COGS_PRECAUCION_PCT = 60;
const GROWTH_CRITICO_PCT = 0;
const GROWTH_PRECAUCION_PCT = 5;

// ============================================
// HELPERS
// ============================================

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function formatMeses(n: number): string {
  if (n >= 99) return ">99 meses";
  return `${n.toFixed(1)} meses`;
}

function formatBalboas(n: number): string {
  return `B/.${Math.abs(n).toLocaleString("es-PA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Calcula tendencia simple comparando 2-3 valores mensuales.
 * Retorna 'mejorando' si el ultimo es mayor, 'empeorando' si es menor.
 */
function calcularTendencia(
  valores: number[]
): "mejorando" | "estable" | "empeorando" | "sin_datos" {
  if (valores.length < 2) return "sin_datos";

  const ultimo = valores[valores.length - 1];
  const penultimo = valores[valores.length - 2];
  const diff = ultimo - penultimo;
  const umbralCambio = Math.abs(penultimo) * 0.02; // 2% de cambio minimo

  if (Math.abs(diff) < umbralCambio) return "estable";
  return diff > 0 ? "mejorando" : "empeorando";
}

// ============================================
// DETECTORES INDIVIDUALES
// ============================================

/**
 * Causa 1: Sin mercado (no product-market fit)
 * Crecimiento de ventas < 5% en meses consecutivos
 */
function detectarSinMercado(
  record: FinancialRecord | null,
  ventasMensuales?: { mes: string; total: number }[]
): ResultadoCausa {
  const base: Omit<ResultadoCausa, "nivel" | "valor_actual" | "umbral" | "tendencia" | "mensaje" | "accion"> = {
    id: 1,
    titulo: "Sin mercado",
    subtitulo: "Product-Market Fit",
    emoji: "🎯",
    base_cb: "CB Insights: 42% de startups fallan por no tener mercado real para su producto.",
  };

  // Si hay datos de ventas mensuales, comparar crecimiento
  if (ventasMensuales && ventasMensuales.length >= 2) {
    const totales = ventasMensuales.map((v) => v.total);
    const ultimo = totales[totales.length - 1];
    const penultimo = totales[totales.length - 2];
    const growthPct =
      penultimo > 0 ? ((ultimo - penultimo) / penultimo) * 100 : 0;
    const tendencia = calcularTendencia(totales);

    if (growthPct <= GROWTH_CRITICO_PCT) {
      return {
        ...base,
        nivel: "critico",
        valor_actual: formatPct(growthPct) + " crecimiento",
        umbral: `Minimo ${GROWTH_PRECAUCION_PCT}% mensual`,
        tendencia,
        mensaje: `Tus ventas ${growthPct < 0 ? "cayeron" : "se estancaron"} (${formatPct(growthPct)}). Un negocio saludable crece al menos ${GROWTH_PRECAUCION_PCT}% mensual.`,
        accion: "Revisar tu propuesta de valor y canales de venta",
      };
    }
    if (growthPct < GROWTH_PRECAUCION_PCT) {
      return {
        ...base,
        nivel: "precaucion",
        valor_actual: formatPct(growthPct) + " crecimiento",
        umbral: `Minimo ${GROWTH_PRECAUCION_PCT}% mensual`,
        tendencia,
        mensaje: `Crecimiento lento (${formatPct(growthPct)}). Necesitas acelerar ventas para validar product-market fit.`,
        accion: "Explorar nuevos canales o ajustar tu oferta",
      };
    }
    return {
      ...base,
      nivel: "en_orden",
      valor_actual: formatPct(growthPct) + " crecimiento",
      umbral: `Minimo ${GROWTH_PRECAUCION_PCT}% mensual`,
      tendencia,
      mensaje: `Buen crecimiento de ventas (${formatPct(growthPct)}). Tu mercado esta respondiendo.`,
      accion: "Seguir monitoreando y escalar",
    };
  }

  // Sin datos de ventas mensuales, usar revenue como check estatico
  if (!record || record.revenue <= 0) {
    return {
      ...base,
      nivel: "sin_datos",
      valor_actual: "Sin datos de ventas",
      umbral: `Minimo ${GROWTH_PRECAUCION_PCT}% mensual`,
      tendencia: "sin_datos",
      mensaje: "Registra tus ventas mensuales para evaluar si tienes product-market fit.",
      accion: "Registrar ventas en el Libro de Ventas",
    };
  }

  // Solo 1 mes de datos
  return {
    ...base,
    nivel: "sin_datos",
    valor_actual: formatBalboas(record.revenue) + " revenue",
    umbral: `Minimo 2 meses para comparar`,
    tendencia: "sin_datos",
    mensaje: "Necesitas al menos 2 meses de datos de ventas para evaluar tendencia de crecimiento.",
    accion: "Continuar registrando ventas cada mes",
  };
}

/**
 * Causa 2: Sin caja (ran out of cash)
 * Cash Runway < 3 meses = critico, < 6 meses = precaucion
 */
function detectarSinCaja(record: FinancialRecord | null): ResultadoCausa {
  const base: Omit<ResultadoCausa, "nivel" | "valor_actual" | "umbral" | "tendencia" | "mensaje" | "accion"> = {
    id: 2,
    titulo: "Sin caja",
    subtitulo: "Cash Runway",
    emoji: "💸",
    base_cb: "CB Insights: 29% de startups mueren por quedarse sin efectivo.",
  };

  if (!record) {
    return {
      ...base,
      nivel: "sin_datos",
      valor_actual: "Sin datos",
      umbral: `Minimo ${RUNWAY_PRECAUCION_MESES} meses de pista`,
      tendencia: "sin_datos",
      mensaje: "Ingresa tus datos financieros para calcular tu pista de efectivo.",
      accion: "Completar datos en Flash Data Entry",
    };
  }

  const totalMonthlyExpenses =
    record.cogs +
    record.opex_rent +
    record.opex_payroll +
    record.opex_other;

  if (totalMonthlyExpenses <= 0) {
    return {
      ...base,
      nivel: "sin_datos",
      valor_actual: formatBalboas(record.cash_balance) + " en caja",
      umbral: `Minimo ${RUNWAY_PRECAUCION_MESES} meses`,
      tendencia: "sin_datos",
      mensaje: "No se registran gastos mensuales. Revisa tus datos para calcular el runway.",
      accion: "Registrar gastos operativos",
    };
  }

  const runway = record.cash_balance / totalMonthlyExpenses;

  if (runway < RUNWAY_CRITICO_MESES) {
    return {
      ...base,
      nivel: "critico",
      valor_actual: formatMeses(runway) + " de pista",
      umbral: `Minimo ${RUNWAY_PRECAUCION_MESES} meses`,
      tendencia: "empeorando",
      mensaje: `Solo te quedan ${formatMeses(runway)} de efectivo al ritmo actual de gastos (${formatBalboas(totalMonthlyExpenses)}/mes). Accion urgente.`,
      accion: "Reducir gastos o buscar financiamiento de emergencia",
    };
  }

  if (runway < RUNWAY_PRECAUCION_MESES) {
    return {
      ...base,
      nivel: "precaucion",
      valor_actual: formatMeses(runway) + " de pista",
      umbral: `Minimo ${RUNWAY_PRECAUCION_MESES} meses`,
      tendencia: "estable",
      mensaje: `Tienes ${formatMeses(runway)} de pista. Empieza a planificar como extenderla antes de que sea critico.`,
      accion: "Crear plan de contingencia financiera",
    };
  }

  return {
    ...base,
    nivel: "en_orden",
    valor_actual: formatMeses(runway) + " de pista",
    umbral: `Minimo ${RUNWAY_PRECAUCION_MESES} meses`,
    tendencia: "estable",
    mensaje: `Buena posicion de caja: ${formatMeses(runway)} de pista con ${formatBalboas(record.cash_balance)} disponible.`,
    accion: "Mantener control de gastos",
  };
}

/**
 * Causa 3: Equipo incorrecto
 * Nomina > 30% de Ganancia Bruta
 */
function detectarEquipoIncorrecto(
  record: FinancialRecord | null
): ResultadoCausa {
  const base: Omit<ResultadoCausa, "nivel" | "valor_actual" | "umbral" | "tendencia" | "mensaje" | "accion"> = {
    id: 3,
    titulo: "Equipo incorrecto",
    subtitulo: "Payroll vs Ganancia Bruta",
    emoji: "👥",
    base_cb: "CB Insights: 23% de startups fallan por no tener el equipo adecuado.",
  };

  if (!record || record.revenue <= 0) {
    return {
      ...base,
      nivel: "sin_datos",
      valor_actual: "Sin datos",
      umbral: `Nomina < ${PAYROLL_PRECAUCION_PCT}% de ganancia bruta`,
      tendencia: "sin_datos",
      mensaje: "Registra ingresos y nomina para evaluar si tu estructura de personal es sostenible.",
      accion: "Completar datos financieros",
    };
  }

  const grossProfit = record.revenue - record.cogs;
  if (grossProfit <= 0) {
    return {
      ...base,
      nivel: "critico",
      valor_actual: "Ganancia bruta negativa",
      umbral: `Nomina < ${PAYROLL_PRECAUCION_PCT}% de ganancia bruta`,
      tendencia: "empeorando",
      mensaje: "Tu ganancia bruta es negativa: cualquier gasto de nomina agrava el problema. Revisa precios y costos primero.",
      accion: "Resolver margen bruto antes de evaluar equipo",
    };
  }

  const payrollReal = record.opex_payroll * FACTOR_COSTO_EMPRESA;
  const payrollPct = (payrollReal / grossProfit) * 100;

  if (payrollPct > PAYROLL_CRITICO_PCT) {
    return {
      ...base,
      nivel: "critico",
      valor_actual: formatPct(payrollPct) + " de ganancia bruta",
      umbral: `< ${PAYROLL_PRECAUCION_PCT}%`,
      tendencia: "empeorando",
      mensaje: `Tu nomina real (${formatBalboas(payrollReal)}/mes con cargas) consume ${formatPct(payrollPct)} de la ganancia bruta. Es insostenible.`,
      accion: "Revisar estructura de personal y automatizar procesos",
    };
  }

  if (payrollPct > PAYROLL_PRECAUCION_PCT) {
    return {
      ...base,
      nivel: "precaucion",
      valor_actual: formatPct(payrollPct) + " de ganancia bruta",
      umbral: `< ${PAYROLL_PRECAUCION_PCT}%`,
      tendencia: "estable",
      mensaje: `Tu nomina consume ${formatPct(payrollPct)} de la ganancia bruta. Esta cerca del limite saludable.`,
      accion: "Evaluar productividad del equipo vs ingresos",
    };
  }

  return {
    ...base,
    nivel: "en_orden",
    valor_actual: formatPct(payrollPct) + " de ganancia bruta",
    umbral: `< ${PAYROLL_PRECAUCION_PCT}%`,
    tendencia: "estable",
    mensaje: `Nomina saludable: ${formatPct(payrollPct)} de ganancia bruta. Tu equipo esta bien dimensionado.`,
    accion: "Monitorear al crecer",
  };
}

/**
 * Causa 4: Aplastado por competencia
 * Margen Bruto < 20%
 */
function detectarCompetencia(record: FinancialRecord | null): ResultadoCausa {
  const base: Omit<ResultadoCausa, "nivel" | "valor_actual" | "umbral" | "tendencia" | "mensaje" | "accion"> = {
    id: 4,
    titulo: "Aplastado por competencia",
    subtitulo: "Margen Bruto",
    emoji: "⚔️",
    base_cb: "CB Insights: 19% de startups son superadas por su competencia.",
  };

  if (!record || record.revenue <= 0) {
    return {
      ...base,
      nivel: "sin_datos",
      valor_actual: "Sin datos",
      umbral: `Margen bruto > ${GROSS_MARGIN_PRECAUCION_PCT}%`,
      tendencia: "sin_datos",
      mensaje: "Registra tus ingresos y costos para evaluar tu posicion competitiva.",
      accion: "Ingresar datos de ventas y COGS",
    };
  }

  const grossMargin =
    ((record.revenue - record.cogs) / record.revenue) * 100;

  if (grossMargin < GROSS_MARGIN_CRITICO_PCT) {
    return {
      ...base,
      nivel: "critico",
      valor_actual: formatPct(grossMargin) + " margen bruto",
      umbral: `> ${GROSS_MARGIN_PRECAUCION_PCT}%`,
      tendencia: "empeorando",
      mensaje: `Margen bruto de ${formatPct(grossMargin)}: muy bajo para sobrevivir. La competencia te esta forzando a regalar tu producto.`,
      accion: "Diferenciarte urgentemente o buscar nicho con menos competencia",
    };
  }

  if (grossMargin < GROSS_MARGIN_PRECAUCION_PCT) {
    return {
      ...base,
      nivel: "precaucion",
      valor_actual: formatPct(grossMargin) + " margen bruto",
      umbral: `> ${GROSS_MARGIN_PRECAUCION_PCT}%`,
      tendencia: "estable",
      mensaje: `Margen bruto de ${formatPct(grossMargin)}: presion competitiva. Necesitas diferenciar tu oferta.`,
      accion: "Analizar propuesta de valor unica vs competidores",
    };
  }

  return {
    ...base,
    nivel: "en_orden",
    valor_actual: formatPct(grossMargin) + " margen bruto",
    umbral: `> ${GROSS_MARGIN_PRECAUCION_PCT}%`,
    tendencia: "estable",
    mensaje: `Margen bruto saludable de ${formatPct(grossMargin)}. Tienes espacio para competir y crecer.`,
    accion: "Proteger tu ventaja competitiva",
  };
}

/**
 * Causa 5: Problemas de precios
 * EBITDA negativo con Revenue positivo
 */
function detectarProblemaPrecios(
  record: FinancialRecord | null
): ResultadoCausa {
  const base: Omit<ResultadoCausa, "nivel" | "valor_actual" | "umbral" | "tendencia" | "mensaje" | "accion"> = {
    id: 5,
    titulo: "Problemas de precios",
    subtitulo: "EBITDA vs Revenue",
    emoji: "🏷️",
    base_cb: "CB Insights: 18% de startups fallan por problemas de pricing y modelo de ingresos.",
  };

  if (!record || record.revenue <= 0) {
    return {
      ...base,
      nivel: "sin_datos",
      valor_actual: "Sin datos",
      umbral: "EBITDA positivo con ventas activas",
      tendencia: "sin_datos",
      mensaje: "Ingresa tus datos financieros para evaluar si tus precios cubren todos los costos.",
      accion: "Completar datos en Flash Data Entry",
    };
  }

  const cascada = computeCascada(record);
  const ebitdaMargin = cascada.ebitda_margin_pct;

  if (cascada.ebitda < 0 && record.revenue > 0) {
    return {
      ...base,
      nivel: "critico",
      valor_actual: formatBalboas(cascada.ebitda) + " EBITDA",
      umbral: "EBITDA positivo",
      tendencia: "empeorando",
      mensaje: `Estas vendiendo ${formatBalboas(record.revenue)}/mes pero perdiendo ${formatBalboas(Math.abs(cascada.ebitda))} en EBITDA. Tus precios no cubren los costos operativos.`,
      accion: "Usar el Lab de Precios para recalcular tu precio minimo",
    };
  }

  if (ebitdaMargin < 10 && ebitdaMargin >= 0) {
    return {
      ...base,
      nivel: "precaucion",
      valor_actual: formatPct(ebitdaMargin) + " margen EBITDA",
      umbral: "> 10% margen EBITDA",
      tendencia: "estable",
      mensaje: `Margen EBITDA de solo ${formatPct(ebitdaMargin)}. Cualquier imprevisto te pone en rojo. Considera ajustar precios.`,
      accion: "Simular aumento de precio en el Simulador Estrategico",
    };
  }

  return {
    ...base,
    nivel: "en_orden",
    valor_actual: formatPct(ebitdaMargin) + " margen EBITDA",
    umbral: "> 10% margen EBITDA",
    tendencia: "estable",
    mensaje: `Buen margen EBITDA de ${formatPct(ebitdaMargin)}. Tus precios cubren costos y dejan ganancia operativa.`,
    accion: "Optimizar con el Simulador Estrategico",
  };
}

/**
 * Causa 6: Modelo no escalable
 * COGS > 60% de Revenue
 */
function detectarModeloNoEscalable(
  record: FinancialRecord | null
): ResultadoCausa {
  const base: Omit<ResultadoCausa, "nivel" | "valor_actual" | "umbral" | "tendencia" | "mensaje" | "accion"> = {
    id: 6,
    titulo: "Modelo no escalable",
    subtitulo: "COGS vs Revenue",
    emoji: "📦",
    base_cb: "CB Insights: 17% de startups fallan porque su modelo de negocio no escala.",
  };

  if (!record || record.revenue <= 0) {
    return {
      ...base,
      nivel: "sin_datos",
      valor_actual: "Sin datos",
      umbral: `COGS < ${COGS_PRECAUCION_PCT}% de ventas`,
      tendencia: "sin_datos",
      mensaje: "Registra tus costos de venta e ingresos para evaluar la escalabilidad de tu modelo.",
      accion: "Completar datos financieros",
    };
  }

  const cogsPct = (record.cogs / record.revenue) * 100;

  if (cogsPct > COGS_CRITICO_PCT) {
    return {
      ...base,
      nivel: "critico",
      valor_actual: formatPct(cogsPct) + " de ventas en COGS",
      umbral: `< ${COGS_PRECAUCION_PCT}%`,
      tendencia: "empeorando",
      mensaje: `El ${formatPct(cogsPct)} de cada venta se va en costos directos. Tu modelo no escala: a mas ventas, mas pierdes.`,
      accion: "Redisenar modelo o renegociar con proveedores",
    };
  }

  if (cogsPct > COGS_PRECAUCION_PCT) {
    return {
      ...base,
      nivel: "precaucion",
      valor_actual: formatPct(cogsPct) + " de ventas en COGS",
      umbral: `< ${COGS_PRECAUCION_PCT}%`,
      tendencia: "estable",
      mensaje: `COGS al ${formatPct(cogsPct)} de ventas. Hay presion en costos que limita el crecimiento.`,
      accion: "Buscar eficiencias en produccion y compras",
    };
  }

  return {
    ...base,
    nivel: "en_orden",
    valor_actual: formatPct(cogsPct) + " de ventas en COGS",
    umbral: `< ${COGS_PRECAUCION_PCT}%`,
    tendencia: "estable",
    mensaje: `COGS saludable al ${formatPct(cogsPct)} de ventas. Tu modelo tiene espacio para escalar.`,
    accion: "Explorar como crecer volumen con costos estables",
  };
}

// ============================================
// SCORE DE SALUD
// ============================================

function calcularScoreSalud(causas: ResultadoCausa[]): number {
  const PUNTOS_POR_NIVEL: Record<NivelRiesgo, number> = {
    en_orden: 16,
    precaucion: 8,
    critico: 0,
    sin_datos: 10,
  };

  const totalPuntos = causas.reduce(
    (sum, c) => sum + PUNTOS_POR_NIVEL[c.nivel],
    0
  );

  // Max posible = 6 * 16 = 96, normalizar a 100
  return Math.round((totalPuntos / 96) * 100);
}

function determinarNivelGeneral(causas: ResultadoCausa[]): NivelRiesgo {
  const hasCritico = causas.some((c) => c.nivel === "critico");
  const precaucionCount = causas.filter(
    (c) => c.nivel === "precaucion"
  ).length;
  const sinDatosCount = causas.filter(
    (c) => c.nivel === "sin_datos"
  ).length;

  if (hasCritico) return "critico";
  if (precaucionCount >= 2) return "precaucion";
  if (sinDatosCount >= 4) return "sin_datos";
  return "en_orden";
}

function generarResumen(
  causas: ResultadoCausa[],
  score: number,
  nivel: NivelRiesgo
): string {
  const criticos = causas.filter((c) => c.nivel === "critico");
  const precauciones = causas.filter((c) => c.nivel === "precaucion");
  const sinDatos = causas.filter((c) => c.nivel === "sin_datos");

  if (sinDatos.length >= 4) {
    return "Necesitas mas datos para un diagnostico completo. Registra tus finanzas para activar el analisis.";
  }

  if (criticos.length > 0) {
    const nombres = criticos.map((c) => c.titulo).join(", ");
    return `Atencion urgente en: ${nombres}. Score de salud: ${score}/100.`;
  }

  if (precauciones.length > 0) {
    return `Tu negocio esta estable pero con ${precauciones.length} areas de precaucion. Score: ${score}/100.`;
  }

  return `Tu negocio esta saludable en las 6 dimensiones CB Insights. Score: ${score}/100.`;
}

// ============================================
// FUNCION PRINCIPAL
// ============================================

/**
 * Ejecuta el analisis completo de las 6 causas CB Insights.
 *
 * @param record - FinancialRecord del periodo actual (de localStorage)
 * @param ventasMensuales - Ventas mensuales para calcular tendencia (opcional)
 * @returns ResultadoCBInsights con las 6 causas evaluadas y score general
 */
export function detectarCausasCBInsights(
  record: FinancialRecord | null,
  ventasMensuales?: { mes: string; total: number }[]
): ResultadoCBInsights {
  const causas: ResultadoCausa[] = [
    detectarSinMercado(record, ventasMensuales),
    detectarSinCaja(record),
    detectarEquipoIncorrecto(record),
    detectarCompetencia(record),
    detectarProblemaPrecios(record),
    detectarModeloNoEscalable(record),
  ];

  const score_salud = calcularScoreSalud(causas);
  const nivel_general = determinarNivelGeneral(causas);
  const resumen = generarResumen(causas, score_salud, nivel_general);

  return {
    calculado_en: new Date().toISOString(),
    causas,
    score_salud,
    nivel_general,
    resumen,
  };
}
