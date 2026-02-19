/**
 * Tests unitarios para calculations.ts
 * Funciones de calculo financiero client-side
 */
import { describe, it, expect } from "vitest";
import {
  computeCascada,
  computeSimulation,
  computeMaxClientLoss,
  computeLegadoPrice,
  computePricing,
  computeValoracion,
  computeOxigeno,
} from "@/lib/calculations";
import type { FinancialRecord, Ingredient } from "@/lib/calculations";

// ============================================
// Helper: record base
// ============================================

const baseRecord: FinancialRecord = {
  revenue: 50000,
  cogs: 20000,
  opex_rent: 3000,
  opex_payroll: 8000,
  opex_other: 4000,
  depreciation: 500,
  interest_expense: 300,
  tax_expense: 200,
  cash_balance: 12000,
  accounts_receivable: 8000,
  inventory: 5000,
  accounts_payable: 6000,
  bank_debt: 10000,
};

const zeroRecord: FinancialRecord = {
  revenue: 0,
  cogs: 0,
  opex_rent: 0,
  opex_payroll: 0,
  opex_other: 0,
  depreciation: 0,
  interest_expense: 0,
  tax_expense: 0,
  cash_balance: 0,
  accounts_receivable: 0,
  inventory: 0,
  accounts_payable: 0,
  bank_debt: 0,
};

// ============================================
// computeCascada
// ============================================

describe("computeCascada", () => {
  it("calcula waterfall correctamente para negocio rentable", () => {
    const r = computeCascada(baseRecord);
    expect(r.gross_profit).toBe(30000); // 50000 - 20000
    expect(r.total_opex).toBe(15000); // 3000 + 8000 + 4000
    expect(r.ebitda).toBe(15000); // 30000 - 15000
    expect(r.ebit).toBe(14500); // 15000 - 500
    expect(r.net_income).toBe(14000); // 14500 - 300 - 200
  });

  it("calcula margenes porcentuales correctos", () => {
    const r = computeCascada(baseRecord);
    expect(r.gross_margin_pct).toBeCloseTo(60, 1); // (30000/50000)*100
    expect(r.ebitda_margin_pct).toBeCloseTo(30, 1); // (15000/50000)*100
    expect(r.net_margin_pct).toBeCloseTo(28, 1); // (14000/50000)*100
  });

  it("retorna margenes 0 cuando revenue = 0", () => {
    const r = computeCascada(zeroRecord);
    expect(r.gross_margin_pct).toBe(0);
    expect(r.ebitda_margin_pct).toBe(0);
    expect(r.net_margin_pct).toBe(0);
  });

  it("retorna gross_profit 0 cuando revenue == cogs", () => {
    const r = computeCascada({ ...baseRecord, cogs: 50000 });
    expect(r.gross_profit).toBe(0);
  });

  it("calcula ebt correctamente (separado de net_income)", () => {
    const r = computeCascada(baseRecord);
    expect(r.ebt).toBe(14200); // ebit(14500) - interest(300)
  });
});

// ============================================
// computeSimulation
// ============================================

describe("computeSimulation", () => {
  it("+10% precio -> revenue sube 10%, COGS sin cambio", () => {
    const sim = computeSimulation(baseRecord, 10, 0, 0);
    expect(sim.simulated.revenue).toBeCloseTo(55000, 0);
    expect(sim.delta_ebitda).toBeGreaterThan(0);
  });

  it("-10% costo -> opex baja", () => {
    const sim = computeSimulation(baseRecord, 0, 10, 0);
    expect(sim.simulated.total_opex).toBeLessThan(sim.original.total_opex);
  });

  it("+20% volumen -> revenue y COGS suben 20%", () => {
    const sim = computeSimulation(baseRecord, 0, 0, 20);
    expect(sim.simulated.revenue).toBeCloseTo(60000, 0);
    expect(sim.simulated.cogs).toBeCloseTo(24000, 0);
  });

  it("cambios combinados producen delta_ebitda y delta_margin", () => {
    const sim = computeSimulation(baseRecord, 5, 5, 5);
    expect(sim.delta_ebitda).not.toBe(0);
    expect(sim.delta_margin).not.toBe(0);
  });

  it("sin cambios -> delta = 0", () => {
    const sim = computeSimulation(baseRecord, 0, 0, 0);
    expect(sim.delta_ebitda).toBeCloseTo(0, 2);
    expect(sim.delta_margin).toBeCloseTo(0, 2);
  });
});

// ============================================
// computeMaxClientLoss
// ============================================

describe("computeMaxClientLoss", () => {
  it("10% aumento con 60% margen -> perdida maxima correcta", () => {
    const loss = computeMaxClientLoss(10, 50000, 20000);
    // mcPct = 0.6, pDelta = 0.1 -> 0.1/(0.1+0.6)*100 = 14.29%
    expect(loss).toBeCloseTo(14.29, 1);
  });

  it("0% aumento -> retorna 0", () => {
    expect(computeMaxClientLoss(0, 50000, 20000)).toBe(0);
  });

  it("revenue 0 -> retorna 0", () => {
    expect(computeMaxClientLoss(10, 0, 0)).toBe(0);
  });

  it("cogs == revenue (0% margen)", () => {
    const loss = computeMaxClientLoss(10, 10000, 10000);
    // mcPct = 0, pDelta = 0.1 -> 0.1/(0.1+0)*100 = 100%
    expect(loss).toBeCloseTo(100, 0);
  });
});

// ============================================
// computeLegadoPrice
// ============================================

describe("computeLegadoPrice", () => {
  it("negocio con gap -> calcula ventasNecesarias y ajustePrecioPct", () => {
    const result = computeLegadoPrice(50000, 20000, 15000);
    expect(result).not.toBeNull();
    expect(result!.ventasNecesarias).toBeGreaterThan(0);
    expect(result!.ajustePrecioPct).toBeDefined();
  });

  it("ya alcanza 15% margen -> ajuste puede ser negativo", () => {
    // revenue=100k, cogs=30k, fixedCosts=10k -> actual margin=(100k-30k-10k)/100k = 60%
    const result = computeLegadoPrice(100000, 30000, 10000);
    expect(result).not.toBeNull();
    expect(result!.ajustePrecioPct).toBeLessThan(0);
  });

  it("denominador <= 0 -> retorna null", () => {
    // ratioCV=0.9 -> denominador = 1-0.9-0.15 = -0.05
    const result = computeLegadoPrice(10000, 9000, 5000);
    expect(result).toBeNull();
  });

  it("revenue 0 -> factorAjuste = 0", () => {
    const result = computeLegadoPrice(0, 0, 5000, 0.15);
    // denominador = 1-0-0.15 = 0.85 > 0, pero ventasNecesarias = 5000/0.85
    expect(result).not.toBeNull();
    // ajustePrecioPct depends on factorAjuste which is 0 when revenue is 0
    expect(result!.ajustePrecioPct).toBe(-100); // (0-1)*100
  });
});

// ============================================
// computePricing
// ============================================

describe("computePricing", () => {
  const ingredientes: Ingredient[] = [
    { id: "1", nombre: "Harina", costo: 2.5 },
    { id: "2", nombre: "Azucar", costo: 1.0 },
  ];

  it("calcula costo total unitario correcto", () => {
    const r = computePricing(ingredientes, 1200, 30, 5000, 100, 30);
    expect(r.costo_materiales).toBeCloseTo(3.5, 2);
    expect(r.costo_mano_obra).toBeCloseTo((1200 / 11520) * 30, 2);
    expect(r.costo_fijo_unitario).toBeCloseTo(50, 2);
    expect(r.costo_total_unitario).toBeCloseTo(
      r.costo_materiales + r.costo_mano_obra + r.costo_fijo_unitario,
      2
    );
  });

  it("ingredientes vacios -> costo_materiales = 0", () => {
    const r = computePricing([], 1200, 30, 5000, 100, 30);
    expect(r.costo_materiales).toBe(0);
  });

  it("capacidad 0 -> costo_fijo_unitario = 0", () => {
    const r = computePricing(ingredientes, 1200, 30, 5000, 0, 30);
    expect(r.costo_fijo_unitario).toBe(0);
  });

  it("30% margen -> precio = costo / 0.70", () => {
    const r = computePricing(ingredientes, 0, 0, 0, 100, 30);
    // costo_total = 3.5 + 0 + 0 = 3.5
    // precio = 3.5 / (1 - 0.30) = 5.0
    expect(r.precio_sin_itbms).toBeCloseTo(3.5 / 0.7, 2);
  });

  it("ITBMS = 7% del precio", () => {
    const r = computePricing(ingredientes, 0, 0, 0, 100, 30);
    expect(r.itbms).toBeCloseTo(r.precio_sin_itbms * 0.07, 2);
    expect(r.precio_final).toBeCloseTo(r.precio_sin_itbms + r.itbms, 2);
  });

  it("con comision de plataforma -> denominador ajustado", () => {
    const sinComision = computePricing(ingredientes, 0, 0, 0, 100, 30, 0);
    const conComision = computePricing(ingredientes, 0, 0, 0, 100, 30, 10);
    expect(conComision.precio_sin_itbms).toBeGreaterThan(
      sinComision.precio_sin_itbms
    );
  });
});

// ============================================
// computeValoracion
// ============================================

describe("computeValoracion", () => {
  it("EBITDA positivo -> valorOperativo = ebitda * 12 * multiplo", () => {
    const r = computeValoracion(5000, 3);
    expect(r.ebitdaAjustado).toBe(60000);
    expect(r.valorOperativo).toBe(180000);
  });

  it("EBITDA negativo -> valorOperativo clamped a 0", () => {
    const r = computeValoracion(-5000, 3);
    expect(r.valorOperativo).toBe(0);
  });

  it("esDuenoLocal=true -> ajuste por alquilerVirtual y valorEdificio", () => {
    const r = computeValoracion(5000, 3, true, 1000, 200000, 0);
    // ebitda ajustado = (5000-1000)*12 = 48000
    expect(r.ebitdaAjustado).toBe(48000);
    // valorOp = 48000*3 = 144000
    expect(r.valorOperativo).toBe(144000);
    // patrimonio = 144000 + 200000 - 0 = 344000
    expect(r.patrimonio).toBe(344000);
  });

  it("deudaTotal restado del patrimonio", () => {
    const r = computeValoracion(5000, 3, false, 0, 0, 50000);
    expect(r.patrimonio).toBe(180000 - 50000);
  });

  it("esDuenoLocal=false -> sin ajuste edificio", () => {
    const r = computeValoracion(5000, 3, false, 0, 500000, 0);
    // edificio no se suma si no es dueno
    expect(r.patrimonio).toBe(180000);
  });
});

// ============================================
// computeOxigeno
// ============================================

describe("computeOxigeno", () => {
  it("calcula dias correctamente", () => {
    const ox = computeOxigeno(baseRecord);
    // diasCalle = (8000/50000)*30 = 4.8
    expect(ox.diasCalle).toBeCloseTo(4.8, 1);
    // diasInventario = (5000/20000)*30 = 7.5
    expect(ox.diasInventario).toBeCloseTo(7.5, 1);
    // diasProveedor = (6000/20000)*30 = 9.0
    expect(ox.diasProveedor).toBeCloseTo(9.0, 1);
    // ccc = 4.8 + 7.5 - 9.0 = 3.3
    expect(ox.ccc).toBeCloseTo(3.3, 1);
  });

  it("revenue 0 -> diasCalle = 0", () => {
    const ox = computeOxigeno({ ...baseRecord, revenue: 0 });
    expect(ox.diasCalle).toBe(0);
  });

  it("cogs 0 -> diasInventario y diasProveedor = 0", () => {
    const ox = computeOxigeno({ ...baseRecord, cogs: 0 });
    expect(ox.diasInventario).toBe(0);
    expect(ox.diasProveedor).toBe(0);
  });

  it("prueba acida correcta", () => {
    const ox = computeOxigeno(baseRecord);
    // (12000 + 8000) / (6000 + 10000) = 1.25
    expect(ox.pruebaAcida).toBeCloseTo(1.25, 2);
  });

  it("pasivo corto = 0 -> prueba acida = 0", () => {
    const ox = computeOxigeno({
      ...baseRecord,
      accounts_payable: 0,
      bank_debt: 0,
    });
    expect(ox.pruebaAcida).toBe(0);
  });

  it("interest 0 -> coberturaBancaria = 10", () => {
    const ox = computeOxigeno({ ...baseRecord, interest_expense: 0 });
    expect(ox.coberturaBancaria).toBe(10);
  });
});
