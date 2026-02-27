/**
 * Funciones de calculo financiero client-side para Mi Director Financiero PTY.
 * Usadas por SimuladorEstrategico, LabPrecios y ValoracionTab.
 */

// ============================================
// TIPOS
// ============================================

export interface FinancialRecord {
  revenue: number;
  cogs: number;
  opex_rent: number;
  opex_payroll: number;
  opex_other: number;
  depreciation: number;
  interest_expense: number;
  tax_expense: number;
  cash_balance: number;
  accounts_receivable: number;
  inventory: number;
  accounts_payable: number;
  bank_debt: number;
}

export interface CascadaResult {
  revenue: number;
  cogs: number;
  gross_profit: number;
  total_opex: number;
  ebitda: number;
  ebit: number;
  ebt: number;
  net_income: number;
  gross_margin_pct: number;
  ebitda_margin_pct: number;
  net_margin_pct: number;
}

export interface SimulationResult {
  original: CascadaResult;
  simulated: CascadaResult;
  delta_ebitda: number;
  delta_margin: number;
}

export interface PricingResult {
  costo_materiales: number;
  costo_mano_obra: number;
  costo_fijo_unitario: number;
  costo_total_unitario: number;
  precio_sin_itbms: number;
  itbms: number;
  precio_final: number;
  ganancia_por_unidad: number;
}

/** Categoria de unidad de medida */
export type UnitCategory = "weight" | "volume";

/** Definicion de una unidad de medida (built-in o custom) */
export interface UnitOfMeasure {
  id: string;
  label: string;
  category: UnitCategory;
  /** Cuantos gramos (peso) o ml (volumen) equivale 1 unidad */
  conversionFactor: number;
  isCustom?: boolean;
}

export interface Ingredient {
  id: string;
  nombre: string;
  /** Monto pagado por la compra (ej: $500 por un quintal) */
  costoAdquisicion: number;
  /** ID de la unidad de compra (ej: "quintal", "kg", "lb", "galon", "litro") */
  unidadCompraId: string;
  /** Cantidad utilizada por unidad de producto, en gramos o ml */
  cantidadUtilizada: number;
  /** Costo calculado del ingrediente por unidad de producto (auto o manual) */
  costo: number;
  /** true = modo legacy (usuario ingresa costo directo sin conversion) */
  modoSimple?: boolean;
}

// ============================================
// CASCADA (P&L)
// ============================================

export function computeCascada(r: FinancialRecord): CascadaResult {
  const gross_profit = r.revenue - r.cogs;
  const total_opex = r.opex_rent + r.opex_payroll + r.opex_other;
  const ebitda = gross_profit - total_opex;
  const ebit = ebitda - r.depreciation;
  const ebt = ebit - r.interest_expense; // Earnings Before Tax
  const net_income = ebt - r.tax_expense;

  return {
    revenue: r.revenue,
    cogs: r.cogs,
    gross_profit,
    total_opex,
    ebitda,
    ebit,
    ebt,
    net_income,
    gross_margin_pct: r.revenue > 0 ? (gross_profit / r.revenue) * 100 : 0,
    ebitda_margin_pct: r.revenue > 0 ? (ebitda / r.revenue) * 100 : 0,
    net_margin_pct: r.revenue > 0 ? (net_income / r.revenue) * 100 : 0,
  };
}

// ============================================
// SIMULADOR ESTRATEGICO
// ============================================

export function computeSimulation(
  base: FinancialRecord,
  priceChangePct: number,
  costChangePct: number,
  volumeChangePct: number
): SimulationResult {
  const original = computeCascada(base);

  // Factores
  const fPrecio = 1 + priceChangePct / 100;
  const fCostos = 1 - costChangePct / 100; // positivo = reduccion
  const fVolumen = 1 + volumeChangePct / 100;

  // Simulacion
  const simRecord: FinancialRecord = {
    ...base,
    revenue: base.revenue * fPrecio * fVolumen,
    cogs: base.cogs * fVolumen, // costo variable: solo afectado por volumen
    opex_rent: base.opex_rent * fCostos,
    opex_payroll: base.opex_payroll * fCostos,
    opex_other: base.opex_other * fCostos,
  };

  const simulated = computeCascada(simRecord);

  return {
    original,
    simulated,
    delta_ebitda: simulated.ebitda - original.ebitda,
    delta_margin: simulated.ebitda_margin_pct - original.ebitda_margin_pct,
  };
}

// ============================================
// ESCUDO CONTRA EL MIEDO
// ============================================

/**
 * Si subes precio X%, puedes perder hasta Y% de clientes
 * y seguir ganando lo mismo.
 */
export function computeMaxClientLoss(
  priceIncreasePct: number,
  revenue: number,
  cogs: number
): number {
  if (priceIncreasePct <= 0 || revenue <= 0) return 0;

  const mcPct = (revenue - cogs) / revenue; // margen de contribucion
  const pDelta = priceIncreasePct / 100;

  if (pDelta + mcPct <= 0) return 0;

  return (pDelta / (pDelta + mcPct)) * 100;
}

// ============================================
// CALCULADOR DE PRECIO DE LEGADO
// ============================================

/**
 * Calcula las ventas necesarias para alcanzar un margen EBITDA del 15%.
 * Devuelve el % de aumento de precio necesario.
 */
export function computeLegadoPrice(
  revenue: number,
  cogs: number,
  fixedCosts: number, // opex total
  targetMargin: number = 0.15
): { ventasNecesarias: number; ajustePrecioPct: number } | null {
  const ratioCV = revenue > 0 ? cogs / revenue : 0;
  const denominador = 1 - ratioCV - targetMargin;

  if (denominador <= 0) return null; // matematicamente imposible

  const ventasNecesarias = fixedCosts / denominador;
  const factorAjuste = revenue > 0 ? ventasNecesarias / revenue : 0;
  const ajustePrecioPct = (factorAjuste - 1) * 100;

  return { ventasNecesarias, ajustePrecioPct };
}

// ============================================
// LAB DE PRECIOS (UNITARIO)
// ============================================

export function computePricing(
  ingredientes: Ingredient[],
  salarioMensual: number,
  minutosElaboracion: number,
  opexMensualTotal: number,
  capacidadMensual: number,
  margenDeseadoPct: number,
  comisionPlataformaPct: number = 0
): PricingResult {
  // Costo materiales
  const costo_materiales = ingredientes.reduce((sum, i) => sum + i.costo, 0);

  // Mano de obra directa (192 horas/mes = 11520 minutos)
  const costoMinuto = salarioMensual / 11520;
  const costo_mano_obra = costoMinuto * minutosElaboracion;

  // Costo fijo por unidad
  const costo_fijo_unitario =
    capacidadMensual > 0 ? opexMensualTotal / capacidadMensual : 0;

  // Costo total unitario
  const costo_total_unitario =
    costo_materiales + costo_mano_obra + costo_fijo_unitario;

  // Precio = Costo / (1 - %Margen - %Comision)
  const denominador =
    1 - (margenDeseadoPct + comisionPlataformaPct) / 100;

  let precio_sin_itbms = 0;
  let ganancia_por_unidad = 0;

  if (denominador > 0) {
    precio_sin_itbms = costo_total_unitario / denominador;
    ganancia_por_unidad = precio_sin_itbms - costo_total_unitario;
  }

  const itbms = precio_sin_itbms * 0.07;
  const precio_final = precio_sin_itbms + itbms;

  return {
    costo_materiales,
    costo_mano_obra,
    costo_fijo_unitario,
    costo_total_unitario,
    precio_sin_itbms,
    itbms,
    precio_final,
    ganancia_por_unidad,
  };
}

// ============================================
// VALORACION EMPRESA
// ============================================

export function computeValoracion(
  ebitdaMensual: number,
  multiplo: number,
  esDuenoLocal: boolean = false,
  alquilerVirtual: number = 0,
  valorEdificio: number = 0,
  deudaTotal: number = 0
): {
  ebitdaAjustado: number;
  valorOperativo: number;
  patrimonio: number;
} {
  const ebitdaAnual = esDuenoLocal
    ? (ebitdaMensual - alquilerVirtual) * 12
    : ebitdaMensual * 12;

  const valorOperativo = Math.max(ebitdaAnual * multiplo, 0);
  const patrimonio = valorOperativo + (esDuenoLocal ? valorEdificio : 0) - deudaTotal;

  return {
    ebitdaAjustado: ebitdaAnual,
    valorOperativo,
    patrimonio,
  };
}

// ============================================
// MULTI-PERIODO (Fase 10)
// ============================================

export type PeriodKey = { year: number; month: number };

const MONTHS_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function periodLabel(year: number, month: number): string {
  return `${MONTHS_ES[month - 1]} ${year}`;
}

export function periodCompare(a: PeriodKey, b: PeriodKey): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

export type PeriodPreset = "last_quarter" | "last_semester" | "last_year" | "ytd";

export function getPresetRange(preset: PeriodPreset, refYear = 2026, refMonth = 6): { from: PeriodKey; to: PeriodKey } {
  const to = { year: refYear, month: refMonth };
  switch (preset) {
    case "last_quarter": {
      let m = refMonth - 2;
      let y = refYear;
      if (m < 1) { m += 12; y -= 1; }
      return { from: { year: y, month: m }, to };
    }
    case "last_semester": {
      let m = refMonth - 5;
      let y = refYear;
      if (m < 1) { m += 12; y -= 1; }
      return { from: { year: y, month: m }, to };
    }
    case "last_year": {
      let m = refMonth;
      let y = refYear - 1;
      return { from: { year: y, month: m + 1 > 12 ? 1 : m + 1 }, to };
    }
    case "ytd":
      return { from: { year: refYear, month: 1 }, to };
  }
}

// ============================================
// OXIGENO (Ratios de liquidez)
// ============================================

export function computeOxigeno(r: FinancialRecord) {
  const diasCalle =
    r.revenue > 0 ? (r.accounts_receivable / r.revenue) * 30 : 0;
  const diasInventario =
    r.cogs > 0 ? (r.inventory / r.cogs) * 30 : 0;
  const diasProveedor =
    r.cogs > 0 ? (r.accounts_payable / r.cogs) * 30 : 0;
  const ccc = diasCalle + diasInventario - diasProveedor;

  const totalLiquido = r.cash_balance + r.accounts_receivable;
  const pasivoCorto = r.accounts_payable + r.bank_debt;
  const pruebaAcida = pasivoCorto > 0 ? totalLiquido / pasivoCorto : 0;

  const dineroAtrapado = r.accounts_receivable + r.inventory;

  const cascada = computeCascada(r);
  const coberturaBancaria =
    r.interest_expense > 0 ? cascada.ebitda / r.interest_expense : 10;

  return {
    diasCalle,
    diasInventario,
    diasProveedor,
    ccc,
    pruebaAcida,
    dineroAtrapado,
    coberturaBancaria,
    totalLiquido,
    pasivoCorto,
  };
}
