/**
 * Datos mock para renderizar gráficos inmediatamente en el dashboard.
 * Replica la lógica del backend Python (financial_engine.py) en TypeScript.
 * Solo se usa para la carga inicial; datos reales del NLP los reemplazan.
 */

export const MOCK_RECORD = {
  revenue: 50000,
  cogs: 30000,
  opex_rent: 5000,
  opex_payroll: 7000,
  opex_other: 3000,
  depreciation: 500,
  interest_expense: 800,
  tax_expense: 700,
  cash_balance: 12000,
  accounts_receivable: 8000,
  inventory: 6000,
  accounts_payable: 4000,
  bank_debt: 10000,
};

type Record = typeof MOCK_RECORD;

export function computeMockCascada(r: Record) {
  const gross_profit = r.revenue - r.cogs;
  const total_opex = r.opex_rent + r.opex_payroll + r.opex_other;
  const ebitda = gross_profit - total_opex;
  const ebit = ebitda - r.depreciation;
  const ebt = ebit - r.interest_expense;
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
    waterfall_steps: [
      { label: "Ventas", value: r.revenue, type: "increase" as const },
      { label: "Costo Ventas", value: -r.cogs, type: "decrease" as const },
      { label: "U.B.", value: gross_profit, type: "total" as const },
      { label: "OPEX", value: -total_opex, type: "decrease" as const },
      { label: "EBITDA", value: ebitda, type: "total" as const },
      { label: "Deprec.", value: -r.depreciation, type: "decrease" as const },
      { label: "EBIT", value: ebit, type: "total" as const },
      { label: "Intereses", value: -r.interest_expense, type: "decrease" as const },
      { label: "EBT", value: ebt, type: "total" as const },
      { label: "Impuestos", value: -r.tax_expense, type: "decrease" as const },
      { label: "U.N.", value: net_income, type: "total" as const },
    ],
  };
}

export function computeMockRatios(r: Record) {
  const gross_profit = r.revenue - r.cogs;
  const total_opex = r.opex_rent + r.opex_payroll + r.opex_other;
  const ebitda = gross_profit - total_opex;

  const gross_margin = r.revenue > 0 ? (gross_profit / r.revenue) * 100 : 0;
  const ebitda_margin = r.revenue > 0 ? (ebitda / r.revenue) * 100 : 0;
  const rent_ratio = r.revenue > 0 ? (r.opex_rent / r.revenue) * 100 : 0;
  // Factor 1.36: Costo Real Empresa (Ley 462/2025)
  // El usuario ingresa sueldos brutos; el costo patronal real es ~36% más
  // (SS 12.25% + SE 1.5% + RP 1.5% + XIII 8.33% + Vac 4.17% + Prima 1.92%)
  const FACTOR_COSTO_REAL = 1.36;
  const costoRealNomina = r.opex_payroll * FACTOR_COSTO_REAL;
  const payroll_ratio =
    gross_profit > 0 ? (costoRealNomina / gross_profit) * 100 : 0;

  const pasivo_cp = r.accounts_payable + r.bank_debt;
  const acid_test =
    pasivo_cp > 0 ? (r.cash_balance + r.accounts_receivable) / pasivo_cp : 0;
  const debt_coverage =
    r.interest_expense > 0 ? ebitda / r.interest_expense : 10;

  const days_receivable =
    r.revenue > 0 ? (r.accounts_receivable / r.revenue) * 30 : 0;
  const days_inventory = r.cogs > 0 ? (r.inventory / r.cogs) * 30 : 0;
  const days_payable =
    r.cogs > 0 ? (r.accounts_payable / r.cogs) * 30 : 0;
  const ccc = days_receivable + days_inventory - days_payable;

  const annual_revenue = r.revenue * 12;

  return {
    margins: {
      gross_margin_pct: +gross_margin.toFixed(2),
      ebitda_margin_pct: +ebitda_margin.toFixed(2),
    },
    efficiency: {
      rent_ratio_pct: +rent_ratio.toFixed(2),
      payroll_ratio_pct: +payroll_ratio.toFixed(2),
      rent_status: rent_ratio > 15 ? "danger" : rent_ratio > 10 ? "warning" : "ok",
      payroll_status:
        payroll_ratio > 45 ? "danger" : payroll_ratio > 35 ? "warning" : "ok",
    },
    solvency: {
      acid_test: +acid_test.toFixed(2),
      debt_coverage: +debt_coverage.toFixed(2),
      acid_status: acid_test >= 1.0 ? "ok" : "danger",
      debt_status: debt_coverage >= 1.5 ? "ok" : "danger",
    },
    oxygen: {
      days_receivable: +days_receivable.toFixed(1),
      days_inventory: +days_inventory.toFixed(1),
      days_payable: +days_payable.toFixed(1),
      ccc_days: +ccc.toFixed(1),
      trapped_cash: r.accounts_receivable + r.inventory,
    },
    fiscal: {
      annual_revenue_projected: annual_revenue,
      itbms_status:
        annual_revenue >= 36000
          ? "obligatorio"
          : annual_revenue >= 30000
            ? "precaucion"
            : "libre",
    },
  };
}

export function computeMockBreakeven(r: Record, targetProfit = 0) {
  const gross_profit = r.revenue - r.cogs;
  const total_opex = r.opex_rent + r.opex_payroll + r.opex_other;
  const costos_fijos = total_opex + r.interest_expense;
  const mc_ratio = r.revenue > 0 ? (r.revenue - r.cogs) / r.revenue : 0;

  const breakeven = mc_ratio > 0 ? costos_fijos / mc_ratio : 0;
  const target_sales =
    mc_ratio > 0 && targetProfit > 0
      ? (costos_fijos + targetProfit) / mc_ratio
      : null;
  const margin_of_safety = r.revenue - breakeven;

  return {
    breakeven_monthly: +breakeven.toFixed(2),
    current_sales: r.revenue,
    margin_of_safety: +margin_of_safety.toFixed(2),
    target_sales: target_sales ? +target_sales.toFixed(2) : null,
    zone: margin_of_safety > 0 ? "profit" : margin_of_safety === 0 ? "even" : "loss",
    contribution_margin_pct: +(mc_ratio * 100).toFixed(2),
  };
}

// ============================================
// DATOS MOCK 12 MESES (para Mandibulas / Modo B)
// ============================================

export const MOCK_12_MONTHS = [
  { mes: "Ene", revenue: 42000, cogs: 25200, opex_rent: 5000, opex_payroll: 6500, opex_other: 2800, depreciation: 500, interest_expense: 800, tax_expense: 600, cash_balance: 8000, accounts_receivable: 7000, inventory: 5500, accounts_payable: 3500, bank_debt: 12000 },
  { mes: "Feb", revenue: 44000, cogs: 26400, opex_rent: 5000, opex_payroll: 6500, opex_other: 2900, depreciation: 500, interest_expense: 780, tax_expense: 650, cash_balance: 9000, accounts_receivable: 7500, inventory: 5800, accounts_payable: 3800, bank_debt: 11500 },
  { mes: "Mar", revenue: 46000, cogs: 27600, opex_rent: 5000, opex_payroll: 6800, opex_other: 2700, depreciation: 500, interest_expense: 760, tax_expense: 700, cash_balance: 10000, accounts_receivable: 8000, inventory: 6000, accounts_payable: 4000, bank_debt: 11000 },
  { mes: "Abr", revenue: 48000, cogs: 28800, opex_rent: 5000, opex_payroll: 6800, opex_other: 3000, depreciation: 500, interest_expense: 740, tax_expense: 750, cash_balance: 10500, accounts_receivable: 8200, inventory: 5500, accounts_payable: 4200, bank_debt: 10500 },
  { mes: "May", revenue: 47000, cogs: 28200, opex_rent: 5000, opex_payroll: 7000, opex_other: 3100, depreciation: 500, interest_expense: 720, tax_expense: 700, cash_balance: 11000, accounts_receivable: 7800, inventory: 6200, accounts_payable: 4000, bank_debt: 10200 },
  { mes: "Jun", revenue: 50000, cogs: 30000, opex_rent: 5000, opex_payroll: 7000, opex_other: 3000, depreciation: 500, interest_expense: 700, tax_expense: 800, cash_balance: 12000, accounts_receivable: 8000, inventory: 6000, accounts_payable: 4000, bank_debt: 10000 },
  { mes: "Jul", revenue: 52000, cogs: 31200, opex_rent: 5000, opex_payroll: 7200, opex_other: 3200, depreciation: 500, interest_expense: 680, tax_expense: 850, cash_balance: 13000, accounts_receivable: 8500, inventory: 6300, accounts_payable: 4300, bank_debt: 9500 },
  { mes: "Ago", revenue: 49000, cogs: 29400, opex_rent: 5000, opex_payroll: 7200, opex_other: 3000, depreciation: 500, interest_expense: 660, tax_expense: 750, cash_balance: 12500, accounts_receivable: 8100, inventory: 6100, accounts_payable: 4100, bank_debt: 9200 },
  { mes: "Sep", revenue: 51000, cogs: 30600, opex_rent: 5000, opex_payroll: 7500, opex_other: 3100, depreciation: 500, interest_expense: 640, tax_expense: 800, cash_balance: 13500, accounts_receivable: 8300, inventory: 5800, accounts_payable: 4200, bank_debt: 8800 },
  { mes: "Oct", revenue: 53000, cogs: 31800, opex_rent: 5000, opex_payroll: 7500, opex_other: 3200, depreciation: 500, interest_expense: 620, tax_expense: 900, cash_balance: 14000, accounts_receivable: 8800, inventory: 6500, accounts_payable: 4500, bank_debt: 8500 },
  { mes: "Nov", revenue: 55000, cogs: 33000, opex_rent: 5000, opex_payroll: 7800, opex_other: 3300, depreciation: 500, interest_expense: 600, tax_expense: 950, cash_balance: 15000, accounts_receivable: 9000, inventory: 6800, accounts_payable: 4800, bank_debt: 8000 },
  { mes: "Dic", revenue: 58000, cogs: 34800, opex_rent: 5000, opex_payroll: 8000, opex_other: 3500, depreciation: 500, interest_expense: 580, tax_expense: 1000, cash_balance: 16000, accounts_receivable: 9500, inventory: 7000, accounts_payable: 5000, bank_debt: 7500 },
];

/**
 * Convierte MOCK_12_MONTHS a formato para MandibulasChart
 */
export function computeMandibulasData(months: typeof MOCK_12_MONTHS) {
  return months.map((m) => {
    const costos_totales = m.cogs + m.opex_rent + m.opex_payroll + m.opex_other;
    return {
      mes: m.mes,
      ventas: m.revenue,
      costos_totales,
      utilidad: m.revenue - costos_totales,
    };
  });
}

export function computeMockDiagnosis(r: Record) {
  const cascada = computeMockCascada(r);
  const ratios = computeMockRatios(r);
  const ebitda_margin = ratios.margins.ebitda_margin_pct;
  const ccc = ratios.oxygen.ccc_days;
  const rent_ratio = ratios.efficiency.rent_ratio_pct;

  let verdict: string, detail: string, severity: string;
  if (cascada.ebitda < 0) {
    verdict = "INTERVENCIÓN DE EMERGENCIA";
    detail = "El negocio consume capital. Problema estructural.";
    severity = "critical";
  } else if (ccc > 60) {
    verdict = "AGUJERO NEGRO";
    detail = "Rentable pero insolvente. Prioridad: Cobrar.";
    severity = "warning";
  } else if (rent_ratio > 15) {
    verdict = "RIESGO INMOBILIARIO";
    detail = "Trabajas para pagar el local.";
    severity = "warning";
  } else {
    verdict = "EMPRESA SALUDABLE Y ESCALABLE";
    detail = "Listo para crecer.";
    severity = "ok";
  }

  let motor_desc: string, motor_status: string;
  if (ebitda_margin < 10) {
    motor_desc = "Motor débil. Tu margen operativo es muy bajo (<10%).";
    motor_status = "weak";
  } else if (ebitda_margin < 15) {
    motor_desc = "Motor estable. La operación genera flujo positivo.";
    motor_status = "stable";
  } else {
    motor_desc = "Motor potente. Capacidad de reinversión sin desangrar la caja.";
    motor_status = "strong";
  }

  const actions: string[] = [];
  if (rent_ratio > 15) actions.push("ALQUILER: Renegociar contrato o subarrendar.");
  if (ratios.efficiency.payroll_ratio_pct > 45)
    actions.push("NOMINA: Revisar eficiencia y turnos.");
  if (ratios.solvency.debt_coverage < 1.5)
    actions.push("DEUDA: Detener deuda nueva.");
  if (ratios.solvency.acid_test < 1.0)
    actions.push("LIQUIDEZ: Ejecutar rescate de caja.");

  const legacy =
    ebitda_margin > 15
      ? "EMPRESA ESCALABLE: Capacidad para reinvertir."
      : cascada.net_income > 0
        ? "EMPRESA EN CRECIMIENTO: Optimizar antes de escalar."
        : "EMPRESA EN TERAPIA: Prioridad absoluta detener sangrado.";

  return {
    verdict,
    detail,
    severity,
    motor: { description: motor_desc, status: motor_status },
    legacy,
    action_plan: actions,
    cascada,
    ratios,
  };
}
