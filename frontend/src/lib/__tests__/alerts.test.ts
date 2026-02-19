/**
 * Tests unitarios para alerts.ts
 * Motor de Alertas Centralizado — SABIA EMPRENDE
 */
import { describe, it, expect } from "vitest";
import {
  computeAlerts,
  getTopAlert,
  countByCategory,
  countByPriority,
} from "@/lib/alerts";
import type { FinancialRecord } from "@/lib/calculations";

// ============================================
// Helper: records
// ============================================

// Record que NO dispara ninguna alerta:
// - margen bruto > 25%, EBITDA > 0, EBITDA margin > 10%
// - acid test > 1, CCC < 30, debt coverage > 1.5
// - rent < 15%, payroll < 45% ut. bruta
// - annual revenue < 36k (no ITBMS), ITBMS < cash
const healthyRecord: FinancialRecord = {
  revenue: 2500,      // annual = 30k (libre de ITBMS)
  cogs: 500,          // gross margin = 80%
  opex_rent: 100,     // rent ratio = 4%
  opex_payroll: 200,  // payroll ratio = 10% de ut. bruta
  opex_other: 100,
  depreciation: 50,
  interest_expense: 30,
  tax_expense: 20,
  cash_balance: 5000, // ITBMS = 175, muy por debajo de cash
  accounts_receivable: 300,
  inventory: 200,
  accounts_payable: 400,
  bank_debt: 200,
};

// ============================================
// computeAlerts
// ============================================

describe("computeAlerts", () => {
  it("negocio saludable -> solo alerta 'all_ok' green", () => {
    const alerts = computeAlerts(healthyRecord);
    expect(alerts.length).toBe(1);
    expect(alerts[0].id).toBe("all_ok");
    expect(alerts[0].priority).toBe("green");
  });

  it("net loss -> alerta 'net_loss' red", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 10000,
      cogs: 5000,
      opex_rent: 3000,
      opex_payroll: 4000,
      opex_other: 2000,
      depreciation: 500,
      interest_expense: 300,
      tax_expense: 200,
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "net_loss")).toBe(true);
  });

  it("EBITDA negativo -> alerta 'ebitda_negative' red", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 10000,
      cogs: 5000,
      opex_rent: 3000,
      opex_payroll: 4000,
      opex_other: 2000,
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "ebitda_negative")).toBe(true);
  });

  it("EBITDA margin < 10% -> alerta 'ebitda_low' orange", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 100000,
      cogs: 50000,
      opex_rent: 10000,
      opex_payroll: 25000,
      opex_other: 6000,
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "ebitda_low")).toBe(true);
  });

  it("gross margin < 25% -> alerta 'gross_margin_low' orange", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 100000,
      cogs: 80000,
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "gross_margin_low")).toBe(true);
  });

  it("acid test < 0.5 -> alerta 'acid_critical' red", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      cash_balance: 1000,
      accounts_receivable: 1000,
      accounts_payable: 10000,
      bank_debt: 10000,
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "acid_critical")).toBe(true);
  });

  it("acid test 0.5-1.0 -> alerta 'acid_warning' orange", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      cash_balance: 5000,
      accounts_receivable: 3000,
      accounts_payable: 6000,
      bank_debt: 5000,
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "acid_warning")).toBe(true);
  });

  it("CCC > 60 -> alerta 'ccc_critical' red", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      accounts_receivable: 200000,
      inventory: 100000,
      accounts_payable: 2000,
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "ccc_critical")).toBe(true);
  });

  it("CCC 30-60 -> alerta 'ccc_warning' yellow", () => {
    // Need CCC between 30 and 60:
    // CCC = diasCalle + diasInv - diasProv
    // diasCalle = (AR/revenue)*30, diasInv = (inv/cogs)*30, diasProv = (AP/cogs)*30
    // revenue=10000, cogs=3000, AR=15000, inv=2000, AP=500
    // diasCalle = (15000/10000)*30 = 45
    // diasInv = (2000/3000)*30 = 20
    // diasProv = (500/3000)*30 = 5
    // CCC = 45 + 20 - 5 = 60... Need < 60 and > 30
    // AR=12000 -> diasCalle = 36, diasInv=(2000/3000)*30=20, diasProv=5
    // CCC = 36 + 20 - 5 = 51 (between 30 and 60)
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 10000,
      cogs: 3000,
      opex_rent: 500,
      opex_payroll: 1000,
      opex_other: 500,
      accounts_receivable: 12000,
      inventory: 2000,
      accounts_payable: 500,
      cash_balance: 20000,
      bank_debt: 500,
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "ccc_warning")).toBe(true);
  });

  it("debt coverage < 1.0 -> alerta 'debt_critical' red", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 10000,
      cogs: 3000,
      opex_rent: 1000,
      opex_payroll: 2000,
      opex_other: 1000,
      interest_expense: 5000,
      bank_debt: 50000,
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "debt_critical")).toBe(true);
  });

  it("dinero atrapado > 50% revenue -> alerta 'trapped_cash' orange", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 50000,
      accounts_receivable: 20000,
      inventory: 15000,
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "trapped_cash")).toBe(true);
  });

  it("rent > 15% -> alerta 'rent_high' orange", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 50000,
      opex_rent: 10000,
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "rent_high")).toBe(true);
  });

  it("payroll > 45% ut. bruta -> alerta 'payroll_high' orange", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 50000,
      cogs: 20000,
      opex_payroll: 20000, // 20000 * 1.36 / 30000 = 90.67% > 45%
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "payroll_high")).toBe(true);
  });

  it("annual revenue >= 42k -> 'itbms_obligatorio' orange", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 4000, // 4000*12 = 48000 >= 42000
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "itbms_obligatorio")).toBe(true);
  });

  it("ITBMS > cash -> 'itbms_vs_cash' red", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 50000,
      cash_balance: 2000, // ITBMS = 50000*0.07 = 3500 > 2000
    };
    const alerts = computeAlerts(record);
    expect(alerts.some((a) => a.id === "itbms_vs_cash")).toBe(true);
  });

  it("alertas ordenadas por prioridad (red primero)", () => {
    const record: FinancialRecord = {
      ...healthyRecord,
      revenue: 10000,
      cogs: 5000,
      opex_rent: 3000,
      opex_payroll: 4000,
      opex_other: 2000,
      cash_balance: 500,
      bank_debt: 20000,
      accounts_payable: 10000,
      interest_expense: 5000,
    };
    const alerts = computeAlerts(record);
    if (alerts.length > 1) {
      const priorities = alerts.map((a) => a.priority);
      const order = { red: 0, orange: 1, yellow: 2, green: 3 };
      for (let i = 1; i < priorities.length; i++) {
        expect(order[priorities[i]]).toBeGreaterThanOrEqual(
          order[priorities[i - 1]]
        );
      }
    }
  });
});

// ============================================
// getTopAlert
// ============================================

describe("getTopAlert", () => {
  it("array no vacio -> retorna primer elemento", () => {
    const alerts = computeAlerts(healthyRecord);
    const top = getTopAlert(alerts);
    expect(top).not.toBeNull();
    expect(top).toBe(alerts[0]);
  });

  it("array vacio -> retorna null", () => {
    expect(getTopAlert([])).toBeNull();
  });
});

// ============================================
// countByCategory / countByPriority
// ============================================

describe("countByCategory", () => {
  it("conteo correcto por categoria", () => {
    const alerts = computeAlerts(healthyRecord);
    const counts = countByCategory(alerts);
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    expect(total).toBe(alerts.length);
  });

  it("sin alertas -> todos los counts = 0 (excepto green en rentabilidad)", () => {
    const alerts = computeAlerts(healthyRecord);
    const counts = countByCategory(alerts);
    // "all_ok" is category "rentabilidad"
    expect(counts.rentabilidad).toBe(1);
    expect(counts.dgi).toBe(0);
    expect(counts.liquidez).toBe(0);
  });
});

describe("countByPriority", () => {
  it("conteo correcto por prioridad", () => {
    const alerts = computeAlerts(healthyRecord);
    const counts = countByPriority(alerts);
    expect(counts.green).toBe(1);
    expect(counts.red).toBe(0);
    expect(counts.orange).toBe(0);
    expect(counts.yellow).toBe(0);
  });
});
