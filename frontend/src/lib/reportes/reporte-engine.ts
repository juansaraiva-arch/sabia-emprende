/**
 * Motor de Reportes Mensuales — MDF PTY
 * Genera un snapshot inmutable del estado financiero del negocio
 * en un periodo especifico. Usa datos de localStorage.
 */

import type { FinancialRecord, CascadaResult } from "@/lib/calculations";
import { computeCascada } from "@/lib/calculations";
import { computeAlerts, type StrategicAlert } from "@/lib/alerts";
import { getVentas } from "@/lib/ventas-storage";
import { loadPersonal } from "@/lib/rrhh-types";
import type { Venta } from "@/lib/ventas-types";
import { METODO_PAGO_LABELS, ORIGEN_VENTA_LABELS } from "@/lib/ventas-types";

// ============================================
// TIPOS
// ============================================

export interface ReporteMensual {
  id: string;
  societyId: string;
  periodo: { anio: number; mes: number };
  periodoLabel: string;       // "Marzo 2026"
  estado: "borrador" | "cerrado";
  cerrado_en: string | null;
  created_at: string;

  // Secciones del reporte
  resumen_ejecutivo: {
    ingresos: number;
    costos: number;
    utilidad_bruta: number;
    gastos_operativos: number;
    ebitda: number;
    utilidad_neta: number;
    margen_neto_pct: number;
    total_empleados: number;
    total_facturas: number;
  };

  cascada: CascadaResult | null;

  ventas_resumen: {
    total_ventas: number;
    cantidad_facturas: number;
    por_metodo_pago: { metodo: string; total: number; cantidad: number }[];
    por_origen: { origen: string; total: number; cantidad: number }[];
  } | null;

  alertas_activas: {
    total: number;
    criticas: number;
    precaucion: number;
    lista: { titulo: string; nivel: string; mensaje: string }[];
  } | null;
}

// ============================================
// CONSTANTES
// ============================================

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const STORAGE_KEY = "midf_reportes_cierres";

// ============================================
// HELPERS
// ============================================

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Lee reportes guardados desde localStorage */
function readReportes(): ReporteMensual[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Escribe reportes a localStorage */
function writeReportes(reportes: ReporteMensual[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reportes));
  } catch {
    // localStorage lleno o no disponible
  }
}

/** Filtra ventas del periodo (mes/anio) que no estan anuladas */
function getVentasDelPeriodo(societyId: string, anio: number, mes: number): Venta[] {
  const mesStr = String(mes).padStart(2, "0");
  const desde = `${anio}-${mesStr}-01`;
  const lastDay = new Date(anio, mes, 0).getDate();
  const hasta = `${anio}-${mesStr}-${String(lastDay).padStart(2, "0")}`;

  return getVentas(societyId, { desde, hasta, anulada: false });
}

/** Construye resumen de ventas agrupado por metodo de pago y origen */
function buildVentasResumen(ventas: Venta[]): ReporteMensual["ventas_resumen"] {
  if (ventas.length === 0) return null;

  // Agrupar por metodo de pago
  const byMetodo = new Map<string, { total: number; cantidad: number }>();
  // Agrupar por origen
  const byOrigen = new Map<string, { total: number; cantidad: number }>();

  let totalVentas = 0;

  for (const v of ventas) {
    totalVentas += v.montoTotal;

    // Por metodo de pago
    const metodoLabel = METODO_PAGO_LABELS[v.metodoPago] || v.metodoPago;
    const mEntry = byMetodo.get(metodoLabel) || { total: 0, cantidad: 0 };
    mEntry.total += v.montoTotal;
    mEntry.cantidad++;
    byMetodo.set(metodoLabel, mEntry);

    // Por origen
    const origenLabel = ORIGEN_VENTA_LABELS[v.origen] || v.origen;
    const oEntry = byOrigen.get(origenLabel) || { total: 0, cantidad: 0 };
    oEntry.total += v.montoTotal;
    oEntry.cantidad++;
    byOrigen.set(origenLabel, oEntry);
  }

  return {
    total_ventas: Math.round(totalVentas * 100) / 100,
    cantidad_facturas: ventas.length,
    por_metodo_pago: Array.from(byMetodo.entries()).map(([metodo, data]) => ({
      metodo,
      total: Math.round(data.total * 100) / 100,
      cantidad: data.cantidad,
    })),
    por_origen: Array.from(byOrigen.entries()).map(([origen, data]) => ({
      origen,
      total: Math.round(data.total * 100) / 100,
      cantidad: data.cantidad,
    })),
  };
}

/** Construye resumen de alertas activas */
function buildAlertasResumen(
  record: FinancialRecord | null
): ReporteMensual["alertas_activas"] {
  if (!record) return null;

  const alerts = computeAlerts(record);

  const criticas = alerts.filter((a) => a.priority === "red").length;
  const precaucion = alerts.filter(
    (a) => a.priority === "orange" || a.priority === "yellow"
  ).length;

  return {
    total: alerts.length,
    criticas,
    precaucion,
    lista: alerts.map((a) => ({
      titulo: a.title,
      nivel: a.priority,
      mensaje: a.message,
    })),
  };
}

// ============================================
// FUNCIONES PUBLICAS
// ============================================

/**
 * Genera un reporte mensual a partir de los datos actuales en localStorage.
 * El reporte se crea con estado 'borrador'.
 */
export function generarReporteMensual(
  societyId: string,
  record: FinancialRecord | null,
  anio: number,
  mes: number
): ReporteMensual {
  // 1. Cascada P&L
  const cascada = record ? computeCascada(record) : null;

  // 2. Ventas del periodo
  const ventasDelPeriodo = getVentasDelPeriodo(societyId, anio, mes);
  const ventasResumen = buildVentasResumen(ventasDelPeriodo);

  // 3. Alertas
  const alertasActivas = buildAlertasResumen(record);

  // 4. Total empleados desde RRHH
  const personal = loadPersonal();
  const totalEmpleados = personal.filter((p) => p.estado === "activo").length;

  // 5. Resumen ejecutivo
  const ingresos = cascada?.revenue ?? 0;
  const costos = cascada?.cogs ?? 0;
  const utilidadBruta = cascada?.gross_profit ?? 0;
  const gastosOperativos = cascada?.total_opex ?? 0;
  const ebitda = cascada?.ebitda ?? 0;
  const utilidadNeta = cascada?.net_income ?? 0;
  const margenNetoPct = cascada?.net_margin_pct ?? 0;

  const reporte: ReporteMensual = {
    id: generateId(),
    societyId,
    periodo: { anio, mes },
    periodoLabel: `${MESES[mes - 1]} ${anio}`,
    estado: "borrador",
    cerrado_en: null,
    created_at: new Date().toISOString(),

    resumen_ejecutivo: {
      ingresos,
      costos,
      utilidad_bruta: utilidadBruta,
      gastos_operativos: gastosOperativos,
      ebitda,
      utilidad_neta: utilidadNeta,
      margen_neto_pct: margenNetoPct,
      total_empleados: totalEmpleados,
      total_facturas: ventasDelPeriodo.length,
    },

    cascada,
    ventas_resumen: ventasResumen,
    alertas_activas: alertasActivas,
  };

  return reporte;
}

/**
 * Guarda un reporte en localStorage.
 * Si ya existe un reporte para el mismo periodo, lo reemplaza
 * (solo si el existente es borrador).
 */
export function guardarReporte(reporte: ReporteMensual): void {
  const all = readReportes();

  // Buscar si ya existe uno para el mismo periodo y sociedad
  const existingIdx = all.findIndex(
    (r) =>
      r.societyId === reporte.societyId &&
      r.periodo.anio === reporte.periodo.anio &&
      r.periodo.mes === reporte.periodo.mes
  );

  if (existingIdx >= 0) {
    const existing = all[existingIdx];
    // No reemplazar un reporte cerrado
    if (existing.estado === "cerrado") {
      return;
    }
    all[existingIdx] = reporte;
  } else {
    all.push(reporte);
  }

  writeReportes(all);
}

/**
 * Obtiene todos los reportes de una sociedad, ordenados
 * por periodo descendente (mas reciente primero).
 */
export function getReportes(societyId: string): ReporteMensual[] {
  const all = readReportes();
  return all
    .filter((r) => r.societyId === societyId)
    .sort((a, b) => {
      if (a.periodo.anio !== b.periodo.anio)
        return b.periodo.anio - a.periodo.anio;
      return b.periodo.mes - a.periodo.mes;
    });
}

/**
 * Cierra un reporte (accion irreversible).
 * Una vez cerrado, el reporte queda como snapshot inmutable
 * y no se puede modificar ni eliminar.
 */
export function cerrarReporte(reporteId: string): ReporteMensual | null {
  const all = readReportes();
  const idx = all.findIndex((r) => r.id === reporteId);
  if (idx < 0) return null;

  const reporte = all[idx];
  if (reporte.estado === "cerrado") return reporte; // ya cerrado

  all[idx] = {
    ...reporte,
    estado: "cerrado",
    cerrado_en: new Date().toISOString(),
  };

  writeReportes(all);
  return all[idx];
}

/**
 * Elimina un reporte en estado borrador.
 * Los reportes cerrados no se pueden eliminar.
 */
export function eliminarBorrador(reporteId: string): boolean {
  const all = readReportes();
  const idx = all.findIndex((r) => r.id === reporteId);
  if (idx < 0) return false;

  const reporte = all[idx];
  if (reporte.estado === "cerrado") return false;

  all.splice(idx, 1);
  writeReportes(all);
  return true;
}

/** Exporta MESES para uso en componentes */
export { MESES };
