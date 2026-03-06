/**
 * Proyecciones Financieras — GAP #1
 *
 * Logica de calculo pura para:
 * 1. Simulador de Flujo de Caja a 90 dias
 * 2. Proyector de Escenarios (Optimista / Base / Pesimista)
 * 3. Proyeccion Fiscal (ISR + ITBMS estimado)
 *
 * Contexto Panama: B/. moneda, ITBMS 7%, ISR PJ 25%
 */

import type { FinancialRecord } from "@/lib/calculations";
import { formatBalboas } from "@/lib/currency";

// ============================================
// TIPOS
// ============================================

/** Inputs del usuario para el simulador de flujo de caja */
export interface ProyeccionInputs {
  ingresosMes1: number;
  ingresosMes2: number;
  ingresosMes3: number;
  gastosFijos: number;
  gastosVariablesPct: number; // % sobre ingresos
  estacionalidad: [number, number, number]; // factores mes1, mes2, mes3
  saldoInicial: number;
}

/** Resultado de un mes en la proyeccion de flujo de caja */
export interface FlujoCajaMes {
  mes: number;
  label: string;
  ingresos: number;
  gastosVariables: number;
  gastosFijos: number;
  gastosTotales: number;
  flujoNeto: number;
  saldoAcumulado: number;
  reservaPct: number;
  semaforo: "verde" | "amarillo" | "rojo";
}

/** Resultado completo del simulador de flujo de caja */
export interface FlujoCajaResult {
  meses: FlujoCajaMes[];
  diasHastaCero: number | null;
  alertaText: string;
  semaforoGeneral: "verde" | "amarillo" | "rojo";
}

/** Tipo de escenario */
export type EscenarioTipo = "optimista" | "base" | "pesimista";

/** Resultado de un escenario individual */
export interface EscenarioResult {
  tipo: EscenarioTipo;
  label: string;
  variacionPct: number;
  ventasMensuales: number;
  costoVentas: number;
  utilidadBruta: number;
  opexTotal: number;
  utilidadNeta: number;
  puntoEquilibrio: number;
  mesesRunway: number | null;
  margenNeto: number;
}

/** Resultado del comparativo de 3 escenarios */
export interface EscenariosResult {
  escenarios: EscenarioResult[];
  chartData: Array<{
    metric: string;
    optimista: number;
    base: number;
    pesimista: number;
  }>;
}

/** Resultado de la proyeccion fiscal */
export interface ProyeccionFiscalResult {
  ventasProyectadas3m: number;
  itbmsEstimado: number;
  isrEstimado: number;
  totalApartar: number;
  debeRegistrarITBMS: boolean;
  proximoVencimiento: string;
  alertaText: string;
}

// ============================================
// SIMULADOR FLUJO DE CAJA 90 DIAS
// ============================================

const MESES_LABELS = ["Mes 1", "Mes 2", "Mes 3"];

export function computeFlujoCaja90Dias(inputs: ProyeccionInputs): FlujoCajaResult {
  const meses: FlujoCajaMes[] = [];
  let saldoAcumulado = inputs.saldoInicial;
  const ingresosArr = [inputs.ingresosMes1, inputs.ingresosMes2, inputs.ingresosMes3];

  for (let i = 0; i < 3; i++) {
    const factor = inputs.estacionalidad[i] || 1;
    const ingresos = Math.max(0, ingresosArr[i] * factor);
    const gastosVariables = ingresos * (inputs.gastosVariablesPct / 100);
    const gastosFijos = Math.max(0, inputs.gastosFijos);
    const gastosTotales = gastosVariables + gastosFijos;
    const flujoNeto = ingresos - gastosTotales;
    saldoAcumulado += flujoNeto;

    const reservaPct =
      gastosTotales > 0 ? (saldoAcumulado / gastosTotales) * 100 : saldoAcumulado > 0 ? 100 : 0;

    const semaforo: FlujoCajaMes["semaforo"] =
      reservaPct > 20 ? "verde" : reservaPct >= 10 ? "amarillo" : "rojo";

    meses.push({
      mes: i + 1,
      label: MESES_LABELS[i],
      ingresos,
      gastosVariables,
      gastosFijos,
      gastosTotales,
      flujoNeto,
      saldoAcumulado,
      reservaPct,
      semaforo,
    });
  }

  // Calcular dias hasta que la caja llegue a cero
  let diasHastaCero: number | null = null;

  for (let i = 0; i < meses.length; i++) {
    if (meses[i].saldoAcumulado <= 0) {
      const prevSaldo = i === 0 ? inputs.saldoInicial : meses[i - 1].saldoAcumulado;
      const burn = prevSaldo - meses[i].saldoAcumulado;
      if (burn > 0) {
        const fraccion = prevSaldo / burn;
        diasHastaCero = Math.round(i * 30 + fraccion * 30);
      } else {
        diasHastaCero = i * 30;
      }
      break;
    }
  }

  // Si no llega a cero en 90 dias pero esta declinando, extrapolar
  if (diasHastaCero === null && meses.length >= 2) {
    const ultimo = meses[meses.length - 1];
    if (ultimo.flujoNeto < 0 && ultimo.saldoAcumulado > 0) {
      const quemaMensual = Math.abs(ultimo.flujoNeto);
      const mesesRestantes = ultimo.saldoAcumulado / quemaMensual;
      diasHastaCero = Math.round(90 + mesesRestantes * 30);
    }
  }

  const semaforoGeneral: FlujoCajaResult["semaforoGeneral"] = meses.some(
    (m) => m.semaforo === "rojo"
  )
    ? "rojo"
    : meses.some((m) => m.semaforo === "amarillo")
      ? "amarillo"
      : "verde";

  const alertaText =
    diasHastaCero !== null
      ? `A este ritmo, tu caja llega a cero en ${diasHastaCero} dias`
      : "Tu caja se mantiene positiva en el horizonte de 90 dias";

  return { meses, diasHastaCero, alertaText, semaforoGeneral };
}

// ============================================
// PROYECTOR DE ESCENARIOS
// ============================================

export function computeEscenarios(
  record: FinancialRecord,
  variacionOptimista: number = 20,
  variacionPesimista: number = -20
): EscenariosResult {
  const variaciones: Array<{ tipo: EscenarioTipo; label: string; pct: number }> = [
    { tipo: "optimista", label: "Optimista", pct: variacionOptimista },
    { tipo: "base", label: "Base", pct: 0 },
    { tipo: "pesimista", label: "Pesimista", pct: variacionPesimista },
  ];

  const opexTotal = record.opex_rent + record.opex_payroll + record.opex_other;

  const escenarios: EscenarioResult[] = variaciones.map((v) => {
    const factor = 1 + v.pct / 100;
    const ventasMensuales = record.revenue * factor;

    // Costos variables escalan parcialmente (90% de la variacion)
    const cogsFactor = factor > 1 ? 1 + (v.pct / 100) * 0.9 : factor;
    const costoVentas = record.cogs * cogsFactor;

    const utilidadBruta = ventasMensuales - costoVentas;
    const ebitda = utilidadBruta - opexTotal;
    const utilidadNeta = ebitda - record.depreciation - record.interest_expense;
    const margenNeto = ventasMensuales > 0 ? (utilidadNeta / ventasMensuales) * 100 : 0;

    // Punto de equilibrio mensual
    const mcPct = ventasMensuales > 0 ? (ventasMensuales - costoVentas) / ventasMensuales : 0;
    const puntoEquilibrio = mcPct > 0 ? opexTotal / mcPct : 0;

    // Meses de runway
    let mesesRunway: number | null = null;
    if (utilidadNeta < 0 && record.cash_balance > 0) {
      mesesRunway = Math.round((record.cash_balance / Math.abs(utilidadNeta)) * 10) / 10;
    }

    return {
      tipo: v.tipo,
      label: v.label,
      variacionPct: v.pct,
      ventasMensuales,
      costoVentas,
      utilidadBruta,
      opexTotal,
      utilidadNeta,
      puntoEquilibrio,
      mesesRunway,
      margenNeto,
    };
  });

  const chartData = [
    {
      metric: "Ventas",
      optimista: escenarios[0].ventasMensuales,
      base: escenarios[1].ventasMensuales,
      pesimista: escenarios[2].ventasMensuales,
    },
    {
      metric: "Ut. Bruta",
      optimista: escenarios[0].utilidadBruta,
      base: escenarios[1].utilidadBruta,
      pesimista: escenarios[2].utilidadBruta,
    },
    {
      metric: "Ut. Neta",
      optimista: escenarios[0].utilidadNeta,
      base: escenarios[1].utilidadNeta,
      pesimista: escenarios[2].utilidadNeta,
    },
    {
      metric: "P. Equilibrio",
      optimista: escenarios[0].puntoEquilibrio,
      base: escenarios[1].puntoEquilibrio,
      pesimista: escenarios[2].puntoEquilibrio,
    },
  ];

  return { escenarios, chartData };
}

// ============================================
// PROYECCION FISCAL (ISR + ITBMS)
// ============================================

export function computeProyeccionFiscal(
  record: FinancialRecord,
  ventasProyectadas3m: number
): ProyeccionFiscalResult {
  // ITBMS: 7% sobre ventas gravadas
  const itbmsEstimado = ventasProyectadas3m * 0.07;

  // ISR Persona Juridica: 25% sobre utilidad gravable proyectada
  const totalGastos = record.cogs + record.opex_rent + record.opex_payroll + record.opex_other;
  const ratioGastos = record.revenue > 0 ? totalGastos / record.revenue : 0.8;
  const utilidadProyectada3m = ventasProyectadas3m * (1 - ratioGastos);
  const isrEstimado = Math.max(0, utilidadProyectada3m * 0.25);

  const totalApartar = itbmsEstimado + isrEstimado;

  // Umbral anual ITBMS
  const ventasMensualProm = ventasProyectadas3m / 3;
  const annualEstimado = ventasMensualProm * 12;
  const debeRegistrarITBMS = annualEstimado >= 36000;

  // Proximo vencimiento DGI
  const now = new Date();
  const mes = now.getMonth(); // 0-indexed
  let proximoVencimiento: string;
  if (mes < 3) {
    proximoVencimiento = "Declaracion ITBMS Q1 — vence 15 de abril";
  } else if (mes < 6) {
    proximoVencimiento = "Declaracion ITBMS Q2 — vence 15 de julio";
  } else if (mes < 9) {
    proximoVencimiento = "Declaracion ITBMS Q3 — vence 15 de octubre";
  } else {
    proximoVencimiento = "Declaracion ITBMS Q4 — vence 15 de enero";
  }

  const alertaText = debeRegistrarITBMS
    ? `Si facturas ${formatBalboas(ventasProyectadas3m)} en los proximos 3 meses, deberas apartar ~${formatBalboas(itbmsEstimado)} para ITBMS y ~${formatBalboas(isrEstimado)} para ISR`
    : `Tus ventas proyectadas anuales (~${formatBalboas(annualEstimado)}) estan por debajo del limite de B/. 36,000 para ITBMS obligatorio`;

  return {
    ventasProyectadas3m,
    itbmsEstimado,
    isrEstimado,
    totalApartar,
    debeRegistrarITBMS,
    proximoVencimiento,
    alertaText,
  };
}

// ============================================
// UTILIDAD: Crear inputs iniciales desde FinancialRecord
// ============================================

export function crearInputsDesdeRecord(record: FinancialRecord): ProyeccionInputs {
  const gastosFijos = record.opex_rent + record.opex_payroll + record.opex_other;
  const gastosVariablesPct =
    record.revenue > 0 ? Math.round((record.cogs / record.revenue) * 100) : 60;

  return {
    ingresosMes1: record.revenue,
    ingresosMes2: record.revenue,
    ingresosMes3: record.revenue,
    gastosFijos,
    gastosVariablesPct,
    estacionalidad: [1, 1, 1],
    saldoInicial: record.cash_balance,
  };
}
