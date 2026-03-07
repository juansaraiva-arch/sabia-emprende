/**
 * Motor de Forecasting 12 Meses — MDF PTY
 * Metodo: Regresion lineal (minimos cuadrados) + supuestos de costos historicos
 * Fuente de datos: localStorage (midf_ventas + FinancialRecord)
 *
 * GAP-4: Sistema de Proyecciones Financieras
 */

import type { FinancialRecord } from "@/lib/calculations";
import { readVentas } from "@/lib/ventas-storage";

// ============================================
// TIPOS
// ============================================

export interface PuntoHistorico {
  mes: number;   // 1-12
  anio: number;
  revenue: number;
}

export interface SupuestosForecast {
  cogs_pct: number;          // % COGS sobre Revenue
  opex_pct: number;          // % OPEX sobre Revenue
  nomina_pct: number;        // % Nomina sobre Revenue
  tasa_crecimiento: number;  // % crecimiento mensual (for manual/promedio mode)
}

export interface MesProyectado {
  anio: number;
  mes: number;
  mesLabel: string;          // "Ene 2026"
  revenue: number;
  cogs: number;
  opex: number;
  nomina: number;
  utilidad_bruta: number;
  ebitda: number;
  utilidad_neta: number;
  es_real: boolean;
  es_editado: boolean;
}

export interface ResultadoForecast {
  historico: MesProyectado[];
  proyeccion: MesProyectado[];
  supuestos: SupuestosForecast;
  metodo: "regresion_lineal" | "promedio_simple" | "sin_datos";
  kpis: {
    revenue_total_12m: number;
    utilidad_neta_12m: number;
    margen_neto_promedio: number;
    mes_breakeven: number | null;   // Indice del mes donde UN pasa de negativo a positivo
    tendencia: "creciente" | "estable" | "decreciente";
  };
}

// ============================================
// CONSTANTES
// ============================================

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/** ISR estimado para Panama (25% sobre EBITDA positivo) */
const ISR_RATE = 0.25;

/** Supuestos por defecto cuando no hay datos */
const DEFAULT_SUPUESTOS: SupuestosForecast = {
  cogs_pct: 40,
  opex_pct: 20,
  nomina_pct: 15,
  tasa_crecimiento: 5,
};

// localStorage key para ediciones manuales de revenue
const FORECAST_EDITS_KEY = "midf_forecast_edits";

// ============================================
// REGRESION LINEAL (MINIMOS CUADRADOS)
// ============================================

interface RegresionResult {
  slope: number;
  intercept: number;
  r_squared: number;
}

/**
 * Calcula regresion lineal simple por minimos cuadrados.
 * x = indice secuencial (0, 1, 2, ...), y = revenue
 */
function regresionLineal(puntos: { x: number; y: number }[]): RegresionResult {
  const n = puntos.length;
  if (n < 2) {
    return { slope: 0, intercept: puntos[0]?.y ?? 0, r_squared: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const p of puntos) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, r_squared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared (coeficiente de determinacion)
  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of puntos) {
    ssTot += (p.y - yMean) ** 2;
    ssRes += (p.y - (intercept + slope * p.x)) ** 2;
  }
  const r_squared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r_squared };
}

// ============================================
// HELPERS
// ============================================

/** Genera label "Ene 2026" desde mes y anio */
function mesLabel(mes: number, anio: number): string {
  return `${MESES[mes - 1]} ${anio}`;
}

/** Avanza un mes (maneja diciembre -> enero del siguiente anio) */
function siguienteMes(anio: number, mes: number): { anio: number; mes: number } {
  if (mes === 12) return { anio: anio + 1, mes: 1 };
  return { anio, mes: mes + 1 };
}

/** Construye un MesProyectado dado revenue y supuestos */
function buildMes(
  anio: number,
  mes: number,
  revenue: number,
  supuestos: SupuestosForecast,
  esReal: boolean,
  esEditado: boolean
): MesProyectado {
  const rev = Math.max(0, revenue);
  const cogs = round2(rev * (supuestos.cogs_pct / 100));
  const opex = round2(rev * (supuestos.opex_pct / 100));
  const nomina = round2(rev * (supuestos.nomina_pct / 100));
  const utilidad_bruta = round2(rev - cogs);
  const ebitda = round2(utilidad_bruta - opex - nomina);
  const isr = ebitda > 0 ? round2(ebitda * ISR_RATE) : 0;
  const utilidad_neta = round2(ebitda - isr);

  return {
    anio,
    mes,
    mesLabel: mesLabel(mes, anio),
    revenue: round2(rev),
    cogs,
    opex,
    nomina,
    utilidad_bruta,
    ebitda,
    utilidad_neta,
    es_real: esReal,
    es_editado: esEditado,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================
// EDICIONES MANUALES (localStorage)
// ============================================

interface ForecastEdit {
  anio: number;
  mes: number;
  revenue: number;
}

/** Lee ediciones manuales desde localStorage */
export function readForecastEdits(societyId: string): ForecastEdit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FORECAST_EDITS_KEY);
    if (!raw) return [];
    const all: Record<string, ForecastEdit[]> = JSON.parse(raw);
    return all[societyId] ?? [];
  } catch {
    return [];
  }
}

/** Guarda una edicion manual de revenue */
export function saveForecastEdit(
  societyId: string,
  anio: number,
  mes: number,
  revenue: number
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(FORECAST_EDITS_KEY);
    const all: Record<string, ForecastEdit[]> = raw ? JSON.parse(raw) : {};
    const edits = all[societyId] ?? [];
    const idx = edits.findIndex((e) => e.anio === anio && e.mes === mes);
    if (idx >= 0) {
      edits[idx].revenue = revenue;
    } else {
      edits.push({ anio, mes, revenue });
    }
    all[societyId] = edits;
    localStorage.setItem(FORECAST_EDITS_KEY, JSON.stringify(all));
  } catch {
    // localStorage lleno o no disponible
  }
}

/** Elimina una edicion manual */
export function clearForecastEdit(
  societyId: string,
  anio: number,
  mes: number
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(FORECAST_EDITS_KEY);
    if (!raw) return;
    const all: Record<string, ForecastEdit[]> = JSON.parse(raw);
    const edits = all[societyId] ?? [];
    all[societyId] = edits.filter((e) => !(e.anio === anio && e.mes === mes));
    localStorage.setItem(FORECAST_EDITS_KEY, JSON.stringify(all));
  } catch {
    // noop
  }
}

// ============================================
// MOTOR PRINCIPAL
// ============================================

/**
 * Calcula forecast de 12 meses a partir de historial y supuestos.
 *
 * Logica:
 * 1. Si historial >= 3 meses: regresion lineal (minimos cuadrados)
 * 2. Si historial 1-2 meses: promedio simple con tasa de crecimiento
 * 3. Si historial 0 meses: retorna sin_datos (todo ceros)
 *
 * Los meses proyectados aplican supuestos (COGS%, OPEX%, Nomina%) sobre revenue.
 * ISR estimado al 25% sobre EBITDA positivo.
 */
export function calcularForecast12Meses(
  historial: PuntoHistorico[],
  supuestos: SupuestosForecast,
  mesInicio: { anio: number; mes: number },
  societyId?: string
): ResultadoForecast {
  // Cargar ediciones manuales
  const edits = societyId ? readForecastEdits(societyId) : [];

  // ---- Sin datos ----
  if (historial.length === 0) {
    const proyeccion: MesProyectado[] = [];
    let cursor = { ...mesInicio };
    for (let i = 0; i < 12; i++) {
      const edit = edits.find((e) => e.anio === cursor.anio && e.mes === cursor.mes);
      proyeccion.push(
        buildMes(cursor.anio, cursor.mes, edit?.revenue ?? 0, supuestos, false, !!edit)
      );
      cursor = siguienteMes(cursor.anio, cursor.mes);
    }

    return {
      historico: [],
      proyeccion,
      supuestos,
      metodo: "sin_datos",
      kpis: calcularKPIs(proyeccion),
    };
  }

  // ---- Construir historico como MesProyectado[] ----
  const historicoMeses: MesProyectado[] = historial.map((p) =>
    buildMes(p.anio, p.mes, p.revenue, supuestos, true, false)
  );

  // ---- Determinar metodo ----
  let metodo: "regresion_lineal" | "promedio_simple";
  let proyeccion: MesProyectado[];

  if (historial.length >= 3) {
    // Regresion lineal
    metodo = "regresion_lineal";

    const puntos = historial.map((p, i) => ({ x: i, y: p.revenue }));
    const reg = regresionLineal(puntos);

    proyeccion = [];
    let cursor = { ...mesInicio };
    for (let i = 0; i < 12; i++) {
      // x continua desde donde termino el historial
      const xProjected = historial.length + i;
      const revenueRegresion = Math.max(0, reg.intercept + reg.slope * xProjected);

      // Verificar si hay edicion manual
      const edit = edits.find((e) => e.anio === cursor.anio && e.mes === cursor.mes);
      const revFinal = edit ? edit.revenue : revenueRegresion;

      proyeccion.push(
        buildMes(cursor.anio, cursor.mes, revFinal, supuestos, false, !!edit)
      );
      cursor = siguienteMes(cursor.anio, cursor.mes);
    }
  } else {
    // Promedio simple con tasa de crecimiento
    metodo = "promedio_simple";

    const avgRevenue =
      historial.reduce((sum, p) => sum + p.revenue, 0) / historial.length;
    const growthFactor = 1 + supuestos.tasa_crecimiento / 100;

    proyeccion = [];
    let cursor = { ...mesInicio };
    let baseRevenue = avgRevenue;

    for (let i = 0; i < 12; i++) {
      const edit = edits.find((e) => e.anio === cursor.anio && e.mes === cursor.mes);
      const revFinal = edit ? edit.revenue : Math.max(0, baseRevenue);

      proyeccion.push(
        buildMes(cursor.anio, cursor.mes, revFinal, supuestos, false, !!edit)
      );
      baseRevenue *= growthFactor;
      cursor = siguienteMes(cursor.anio, cursor.mes);
    }
  }

  return {
    historico: historicoMeses,
    proyeccion,
    supuestos,
    metodo,
    kpis: calcularKPIs(proyeccion),
  };
}

// ============================================
// KPIs
// ============================================

function calcularKPIs(proyeccion: MesProyectado[]): ResultadoForecast["kpis"] {
  const revenue_total_12m = round2(
    proyeccion.reduce((sum, m) => sum + m.revenue, 0)
  );
  const utilidad_neta_12m = round2(
    proyeccion.reduce((sum, m) => sum + m.utilidad_neta, 0)
  );

  const margen_neto_promedio =
    revenue_total_12m > 0
      ? round2((utilidad_neta_12m / revenue_total_12m) * 100)
      : 0;

  // Mes breakeven: primer mes donde utilidad_neta pasa de negativa a positiva
  let mes_breakeven: number | null = null;
  for (let i = 0; i < proyeccion.length; i++) {
    if (proyeccion[i].utilidad_neta > 0) {
      if (i === 0 || proyeccion[i - 1].utilidad_neta <= 0) {
        mes_breakeven = i + 1; // 1-based
        break;
      }
    }
  }

  // Tendencia: comparar primer tercio vs ultimo tercio de la proyeccion
  const tercio = Math.max(1, Math.floor(proyeccion.length / 3));
  const revPrimerTercio =
    proyeccion.slice(0, tercio).reduce((s, m) => s + m.revenue, 0) / tercio;
  const revUltimoTercio =
    proyeccion.slice(-tercio).reduce((s, m) => s + m.revenue, 0) / tercio;

  let tendencia: "creciente" | "estable" | "decreciente";
  if (revPrimerTercio === 0 && revUltimoTercio === 0) {
    tendencia = "estable";
  } else if (revUltimoTercio > revPrimerTercio * 1.05) {
    tendencia = "creciente";
  } else if (revUltimoTercio < revPrimerTercio * 0.95) {
    tendencia = "decreciente";
  } else {
    tendencia = "estable";
  }

  return {
    revenue_total_12m,
    utilidad_neta_12m,
    margen_neto_promedio,
    mes_breakeven,
    tendencia,
  };
}

// ============================================
// HELPER: Construir historial desde ventas localStorage
// ============================================

/**
 * Lee ventas de localStorage (midf_ventas) y las agrupa por mes.
 * Retorna puntos historicos ordenados cronologicamente (ascendente).
 */
export function buildHistorialFromVentas(societyId: string): PuntoHistorico[] {
  if (typeof window === "undefined") return [];

  const ventas = readVentas().filter(
    (v) => v.societyId === societyId && !v.anulada
  );

  if (ventas.length === 0) return [];

  // Agrupar por "YYYY-MM"
  const byMonth = new Map<string, number>();

  for (const v of ventas) {
    // v.fecha = "2026-03-07"
    const key = v.fecha.slice(0, 7); // "2026-03"
    byMonth.set(key, (byMonth.get(key) ?? 0) + v.montoTotal);
  }

  // Convertir a PuntoHistorico y ordenar cronologicamente
  const puntos: PuntoHistorico[] = [];
  for (const [key, revenue] of byMonth) {
    const [anioStr, mesStr] = key.split("-");
    puntos.push({
      anio: parseInt(anioStr, 10),
      mes: parseInt(mesStr, 10),
      revenue: round2(revenue),
    });
  }

  puntos.sort((a, b) => {
    if (a.anio !== b.anio) return a.anio - b.anio;
    return a.mes - b.mes;
  });

  return puntos;
}

// ============================================
// HELPER: Calcular supuestos desde FinancialRecord
// ============================================

/**
 * Deriva supuestos (%) del FinancialRecord guardado en localStorage.
 * Si no hay record o revenue es cero, retorna valores por defecto.
 */
export function calcularSupuestosDesdeRecord(
  record: FinancialRecord | null
): SupuestosForecast {
  if (!record || record.revenue <= 0) {
    return { ...DEFAULT_SUPUESTOS };
  }

  const rev = record.revenue;

  const cogs_pct = round2((record.cogs / rev) * 100);
  const opex_pct = round2(
    ((record.opex_rent + record.opex_other) / rev) * 100
  );
  const nomina_pct = round2((record.opex_payroll / rev) * 100);

  // Tasa de crecimiento: default 5% si no hay datos multi-periodo
  const tasa_crecimiento = 5;

  return {
    cogs_pct: clamp(cogs_pct, 0, 95),
    opex_pct: clamp(opex_pct, 0, 80),
    nomina_pct: clamp(nomina_pct, 0, 60),
    tasa_crecimiento,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ============================================
// EXPORTS ADICIONALES
// ============================================

export { MESES, DEFAULT_SUPUESTOS };
