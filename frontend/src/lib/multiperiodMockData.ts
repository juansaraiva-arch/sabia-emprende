/**
 * Mock data multi-periodo — Fase 10
 * Tendencias, comparaciones, proyecciones y presupuesto.
 * Usa MOCK_12_MONTHS existente y agrega funciones de calculo client-side.
 */

import { MOCK_12_MONTHS } from "./mockData";
import { periodLabel } from "./calculations";

// ============================================
// TIPOS
// ============================================

export interface TrendPoint {
  year: number;
  month: number;
  label: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  total_opex: number;
  ebitda: number;
  net_income: number;
  gross_margin_pct: number;
  ebitda_margin_pct: number;
  net_margin_pct: number;
}

export interface ForecastPoint {
  year: number;
  month: number;
  label: string;
  revenue: number;
  ebitda: number;
  net_income: number;
  confidence_low: number;
  confidence_high: number;
}

export interface BudgetTarget {
  period_year: number;
  period_month: number;
  revenue_target: number;
  cogs_target: number;
  opex_rent_target: number;
  opex_payroll_target: number;
  opex_other_target: number;
}

export interface BudgetVarianceItem {
  metric: string;
  metric_key: string;
  actual: number;
  budget: number;
  variance: number;
  variance_pct: number;
  status: "on_track" | "favorable" | "desfavorable";
}

// ============================================
// BUDGET TARGETS MOCK (12 meses)
// ============================================

export const MOCK_BUDGET_TARGETS: BudgetTarget[] = [
  { period_year: 2026, period_month: 1, revenue_target: 43000, cogs_target: 25800, opex_rent_target: 5000, opex_payroll_target: 6500, opex_other_target: 2800 },
  { period_year: 2026, period_month: 2, revenue_target: 45000, cogs_target: 27000, opex_rent_target: 5000, opex_payroll_target: 6500, opex_other_target: 2900 },
  { period_year: 2026, period_month: 3, revenue_target: 47000, cogs_target: 28200, opex_rent_target: 5000, opex_payroll_target: 6800, opex_other_target: 2800 },
  { period_year: 2026, period_month: 4, revenue_target: 49000, cogs_target: 29400, opex_rent_target: 5000, opex_payroll_target: 7000, opex_other_target: 3000 },
  { period_year: 2026, period_month: 5, revenue_target: 48000, cogs_target: 28800, opex_rent_target: 5000, opex_payroll_target: 7000, opex_other_target: 3000 },
  { period_year: 2026, period_month: 6, revenue_target: 51000, cogs_target: 30600, opex_rent_target: 5000, opex_payroll_target: 7200, opex_other_target: 3000 },
  { period_year: 2026, period_month: 7, revenue_target: 53000, cogs_target: 31800, opex_rent_target: 5000, opex_payroll_target: 7200, opex_other_target: 3100 },
  { period_year: 2026, period_month: 8, revenue_target: 50000, cogs_target: 30000, opex_rent_target: 5000, opex_payroll_target: 7200, opex_other_target: 3000 },
  { period_year: 2026, period_month: 9, revenue_target: 52000, cogs_target: 31200, opex_rent_target: 5000, opex_payroll_target: 7500, opex_other_target: 3000 },
  { period_year: 2026, period_month: 10, revenue_target: 54000, cogs_target: 32400, opex_rent_target: 5000, opex_payroll_target: 7500, opex_other_target: 3200 },
  { period_year: 2026, period_month: 11, revenue_target: 56000, cogs_target: 33600, opex_rent_target: 5000, opex_payroll_target: 7800, opex_other_target: 3200 },
  { period_year: 2026, period_month: 12, revenue_target: 59000, cogs_target: 35400, opex_rent_target: 5000, opex_payroll_target: 8000, opex_other_target: 3400 },
];

// ============================================
// FUNCIONES DE CALCULO CLIENT-SIDE
// ============================================

function _safePctChange(old: number, newVal: number): number {
  if (Math.abs(old) < 0.01) return Math.abs(newVal) < 0.01 ? 0 : 100;
  return +((newVal - old) / Math.abs(old) * 100).toFixed(2);
}

function _movingAverage(values: number[], window = 3): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    return +(slice.reduce((a, b) => a + b, 0) / window).toFixed(2);
  });
}

function _stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Transforma MOCK_12_MONTHS a TrendPoints.
 */
export function computeMockTrends(
  months: typeof MOCK_12_MONTHS = MOCK_12_MONTHS,
  year = 2026
): {
  points: TrendPoint[];
  growth_rates: Record<string, number>;
  moving_averages: Record<string, (number | null)[]>;
} {
  const points: TrendPoint[] = months.map((m, i) => {
    const month = i + 1;
    const gross_profit = m.revenue - m.cogs;
    const total_opex = m.opex_rent + m.opex_payroll + m.opex_other;
    const ebitda = gross_profit - total_opex;
    const ebt = ebitda - m.depreciation - m.interest_expense;
    const net_income = ebt - m.tax_expense;

    return {
      year,
      month,
      label: periodLabel(year, month),
      revenue: m.revenue,
      cogs: m.cogs,
      gross_profit,
      total_opex,
      ebitda,
      net_income,
      gross_margin_pct: m.revenue > 0 ? +((gross_profit / m.revenue) * 100).toFixed(2) : 0,
      ebitda_margin_pct: m.revenue > 0 ? +((ebitda / m.revenue) * 100).toFixed(2) : 0,
      net_margin_pct: m.revenue > 0 ? +((net_income / m.revenue) * 100).toFixed(2) : 0,
    };
  });

  const revenues = points.map((p) => p.revenue);
  const ebitdas = points.map((p) => p.ebitda);
  const netIncomes = points.map((p) => p.net_income);

  const growth_rates: Record<string, number> = {};
  if (points.length >= 2) {
    const first = points[0];
    const last = points[points.length - 1];
    for (const key of ["revenue", "ebitda", "net_income", "gross_margin_pct", "ebitda_margin_pct"] as const) {
      growth_rates[key] = _safePctChange(first[key], last[key]);
    }
  }

  return {
    points,
    growth_rates,
    moving_averages: {
      revenue: _movingAverage(revenues),
      ebitda: _movingAverage(ebitdas),
      net_income: _movingAverage(netIncomes),
    },
  };
}

/**
 * Compara dos registros client-side.
 */
export function computeMockComparison(
  recordA: (typeof MOCK_12_MONTHS)[0],
  recordB: (typeof MOCK_12_MONTHS)[0]
) {
  const calc = (r: typeof recordA) => {
    const gross_profit = r.revenue - r.cogs;
    const total_opex = r.opex_rent + r.opex_payroll + r.opex_other;
    const ebitda = gross_profit - total_opex;
    const net_income = ebitda - r.depreciation - r.interest_expense - r.tax_expense;
    return { revenue: r.revenue, cogs: r.cogs, gross_profit, total_opex, ebitda, net_income };
  };

  const a = calc(recordA);
  const b = calc(recordB);

  const LOWER_IS_BETTER = new Set(["cogs", "total_opex"]);
  const keys = ["revenue", "cogs", "gross_profit", "total_opex", "ebitda", "net_income"] as const;

  const deltas: Record<string, number> = {};
  const pct_changes: Record<string, number> = {};
  const improvements: string[] = [];
  const deteriorations: string[] = [];

  for (const key of keys) {
    const delta = +(b[key] - a[key]).toFixed(2);
    deltas[key] = delta;
    pct_changes[key] = _safePctChange(a[key], b[key]);

    if (LOWER_IS_BETTER.has(key)) {
      if (delta < 0) improvements.push(key);
      else if (delta > 0) deteriorations.push(key);
    } else {
      if (delta > 0) improvements.push(key);
      else if (delta < 0) deteriorations.push(key);
    }
  }

  return { period_a: a, period_b: b, deltas, pct_changes, improvements, deteriorations };
}

/**
 * Proyeccion por promedio movil client-side.
 */
export function computeMockForecast(
  months: typeof MOCK_12_MONTHS = MOCK_12_MONTHS,
  monthsAhead = 6,
  year = 2026
): {
  historical: TrendPoint[];
  projected: ForecastPoint[];
  method: string;
} {
  const trends = computeMockTrends(months, year);
  const historical = trends.points;

  if (historical.length < 2) {
    return { historical, projected: [], method: "moving_average" };
  }

  const revenues = historical.map((p) => p.revenue);
  const ebitdas = historical.map((p) => p.ebitda);
  const netIncomes = historical.map((p) => p.net_income);

  const revStd = _stdDev(revenues.slice(-6));
  const window = Math.min(3, revenues.length);

  const revExt = [...revenues];
  const ebitdaExt = [...ebitdas];
  const netExt = [...netIncomes];

  const lastMonth = historical[historical.length - 1].month;
  const lastYear = historical[historical.length - 1].year;

  const projected: ForecastPoint[] = [];

  for (let i = 0; i < monthsAhead; i++) {
    let nextMonth = lastMonth + i + 1;
    let nextYear = lastYear + Math.floor((nextMonth - 1) / 12);
    nextMonth = ((nextMonth - 1) % 12) + 1;

    const revProj = +(revExt.slice(-window).reduce((a, b) => a + b, 0) / window).toFixed(2);
    const ebitdaProj = +(ebitdaExt.slice(-window).reduce((a, b) => a + b, 0) / window).toFixed(2);
    const netProj = +(netExt.slice(-window).reduce((a, b) => a + b, 0) / window).toFixed(2);

    projected.push({
      year: nextYear,
      month: nextMonth,
      label: periodLabel(nextYear, nextMonth),
      revenue: revProj,
      ebitda: ebitdaProj,
      net_income: netProj,
      confidence_low: +(revProj - revStd).toFixed(2),
      confidence_high: +(revProj + revStd).toFixed(2),
    });

    revExt.push(revProj);
    ebitdaExt.push(ebitdaProj);
    netExt.push(netProj);
  }

  return { historical, projected, method: "moving_average" };
}

/**
 * Varianza presupuestal client-side.
 */
export function computeMockBudgetVsActual(
  record: (typeof MOCK_12_MONTHS)[0],
  budget: BudgetTarget
): {
  items: BudgetVarianceItem[];
  overall_score: number;
} {
  const metrics: [string, string, string, boolean][] = [
    ["Ventas", "revenue", "revenue_target", true],
    ["Costo de Ventas", "cogs", "cogs_target", false],
    ["Alquiler", "opex_rent", "opex_rent_target", false],
    ["Nomina", "opex_payroll", "opex_payroll_target", false],
    ["Otros Gastos", "opex_other", "opex_other_target", false],
  ];

  const items: BudgetVarianceItem[] = [];
  let favorableCount = 0;

  for (const [label, actualKey, budgetKey, higherIsBetter] of metrics) {
    const actual = (record as any)[actualKey] || 0;
    const budgetVal = (budget as any)[budgetKey] || 0;
    const variance = +(actual - budgetVal).toFixed(2);
    const variance_pct = _safePctChange(budgetVal, actual);

    let status: "on_track" | "favorable" | "desfavorable";
    if (Math.abs(variance_pct) <= 5) {
      status = "on_track";
      favorableCount++;
    } else if (higherIsBetter) {
      status = variance > 0 ? "favorable" : "desfavorable";
      if (variance > 0) favorableCount++;
    } else {
      status = variance < 0 ? "favorable" : "desfavorable";
      if (variance < 0) favorableCount++;
    }

    items.push({ metric: label, metric_key: actualKey, actual, budget: budgetVal, variance, variance_pct, status });
  }

  // EBITDA derivado
  const actualEbitda =
    record.revenue - record.cogs - record.opex_rent - record.opex_payroll - record.opex_other;
  const budgetGross = budget.revenue_target - budget.cogs_target;
  const budgetOpex = budget.opex_rent_target + budget.opex_payroll_target + budget.opex_other_target;
  const budgetEbitda = budgetGross - budgetOpex;

  items.push({
    metric: "EBITDA",
    metric_key: "ebitda",
    actual: actualEbitda,
    budget: +budgetEbitda.toFixed(2),
    variance: +(actualEbitda - budgetEbitda).toFixed(2),
    variance_pct: _safePctChange(budgetEbitda, actualEbitda),
    status: actualEbitda >= budgetEbitda ? "favorable" : "desfavorable",
  });

  const overall_score = +((favorableCount / metrics.length) * 100).toFixed(1);

  return { items, overall_score };
}
