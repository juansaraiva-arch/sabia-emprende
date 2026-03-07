/**
 * Libro de Ventas — Storage Layer
 * Mi Director Financiero PTY
 * CRUD localStorage para ventas (facturacion)
 *
 * Clave localStorage: midf_ventas
 * Tasa ITBMS: 7%
 */

import type {
  Venta,
  VentaInput,
  VentasFilter,
  ResumenMensual,
  OrigenVenta,
  MetodoPagoVenta,
} from "./ventas-types";

const VENTAS_KEY = "midf_ventas";
const ITBMS_RATE = 0.07;

// ============================================
// HELPERS
// ============================================

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Lee todas las ventas desde localStorage */
export function readVentas(): Venta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VENTAS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Escribe todas las ventas a localStorage */
export function writeVentas(ventas: Venta[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VENTAS_KEY, JSON.stringify(ventas));
  } catch {
    // localStorage lleno o no disponible
  }
}

/** Fecha de hoy en formato ISO "YYYY-MM-DD" */
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Hora actual en formato "HH:MM" */
function nowTime(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

// ============================================
// CONSULTAS
// ============================================

/**
 * Obtiene ventas filtradas por societyId y filtros opcionales.
 * Retorna ordenadas por fecha descendente (mas reciente primero).
 */
export function getVentas(societyId: string, filters?: VentasFilter): Venta[] {
  let ventas = readVentas().filter((v) => v.societyId === societyId);

  if (filters) {
    if (filters.desde) {
      ventas = ventas.filter((v) => v.fecha >= filters.desde!);
    }
    if (filters.hasta) {
      ventas = ventas.filter((v) => v.fecha <= filters.hasta!);
    }
    if (filters.origen) {
      ventas = ventas.filter((v) => v.origen === filters.origen);
    }
    if (filters.anulada !== undefined) {
      ventas = ventas.filter((v) => v.anulada === filters.anulada);
    }
    if (filters.metodoPago) {
      ventas = ventas.filter((v) => v.metodoPago === filters.metodoPago);
    }
    if (filters.cliente) {
      const termino = filters.cliente.toLowerCase();
      ventas = ventas.filter((v) => v.cliente.toLowerCase().includes(termino));
    }
  }

  // Ordenar por fecha descendente, luego por hora descendente
  ventas.sort((a, b) => {
    const cmpFecha = b.fecha.localeCompare(a.fecha);
    if (cmpFecha !== 0) return cmpFecha;
    return (b.hora ?? "").localeCompare(a.hora ?? "");
  });

  return ventas;
}

/** Busca una venta por ID */
export function getVentaById(id: string): Venta | null {
  return readVentas().find((v) => v.id === id) ?? null;
}

/** Obtiene ventas del dia de hoy para un societyId */
export function getVentasHoy(societyId: string): Venta[] {
  const hoy = todayISO();
  return getVentas(societyId, { desde: hoy, hasta: hoy });
}

// ============================================
// CREAR / ANULAR
// ============================================

/**
 * Crea una nueva venta a partir de VentaInput.
 * - Auto-calcula ITBMS al 7% si aplicaItbms es true (default).
 * - Auto-genera id, timestamps, fecha y hora si no se proveen.
 */
export function saveVenta(input: VentaInput): Venta {
  const all = readVentas();
  const now = new Date().toISOString();

  const aplicaItbms = input.aplicaItbms !== false; // default true
  const itbms = aplicaItbms
    ? Math.round(input.montoBase * ITBMS_RATE * 100) / 100
    : 0;
  const montoTotal = Math.round((input.montoBase + itbms) * 100) / 100;

  const venta: Venta = {
    id: generateId(),
    societyId: input.societyId,
    fecha: input.fecha ?? todayISO(),
    hora: input.hora ?? nowTime(),
    cliente: input.cliente ?? "",
    concepto: input.concepto,
    montoBase: input.montoBase,
    itbms,
    montoTotal,
    metodoPago: input.metodoPago ?? "efectivo",
    origen: input.origen ?? "manual",
    anulada: false,
    // Campos DGI
    dgiNumFactura: input.dgiNumFactura,
    dgiSerie: input.dgiSerie,
    dgiRucCliente: input.dgiRucCliente,
    dgiTipoDoc: input.dgiTipoDoc,
    importacionId: input.importacionId,
    // Campos PAC
    cufe: input.cufe,
    // Metadata
    notas: input.notas,
    createdAt: now,
    updatedAt: now,
  };

  all.push(venta);
  writeVentas(all);
  return venta;
}

/**
 * Anula una venta (marca anulada=true).
 * Las ventas anuladas se conservan para trazabilidad DGI.
 * Retorna la venta actualizada o null si no se encontro.
 */
export function anularVenta(id: string): Venta | null {
  const all = readVentas();
  const idx = all.findIndex((v) => v.id === id);
  if (idx < 0) return null;

  all[idx] = {
    ...all[idx],
    anulada: true,
    updatedAt: new Date().toISOString(),
  };

  writeVentas(all);
  return all[idx];
}

// ============================================
// IMPORTACION BATCH (CSV DGI Segmento 2)
// ============================================

/**
 * Importa un lote de ventas desde CSV DGI.
 * Deduplicacion por dgiNumFactura: si ya existe una venta con el mismo
 * dgiNumFactura para el mismo societyId, se considera duplicada.
 *
 * @returns Conteo de importadas, duplicadas y errores
 */
export function importVentasBatch(
  ventas: VentaInput[],
  importacionId: string
): { imported: number; duplicates: number; errors: string[] } {
  const all = readVentas();
  const now = new Date().toISOString();

  // Indice de numeros de factura existentes para deduplicacion rapida
  const existingNums = new Set<string>();
  for (const v of all) {
    if (v.dgiNumFactura) {
      existingNums.add(`${v.societyId}:${v.dgiNumFactura}`);
    }
  }

  let imported = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (let i = 0; i < ventas.length; i++) {
    const input = ventas[i];

    // Validacion basica
    if (!input.societyId) {
      errors.push(`Fila ${i + 1}: falta societyId`);
      continue;
    }
    if (!input.concepto) {
      errors.push(`Fila ${i + 1}: falta concepto`);
      continue;
    }
    if (input.montoBase <= 0) {
      errors.push(`Fila ${i + 1}: montoBase debe ser mayor a 0`);
      continue;
    }

    // Deduplicacion por numero de factura
    if (input.dgiNumFactura) {
      const key = `${input.societyId}:${input.dgiNumFactura}`;
      if (existingNums.has(key)) {
        duplicates++;
        continue;
      }
      existingNums.add(key);
    }

    // Calcular ITBMS
    const aplicaItbms = input.aplicaItbms !== false;
    const itbms = aplicaItbms
      ? Math.round(input.montoBase * ITBMS_RATE * 100) / 100
      : 0;
    const montoTotal = Math.round((input.montoBase + itbms) * 100) / 100;

    const venta: Venta = {
      id: generateId(),
      societyId: input.societyId,
      fecha: input.fecha ?? todayISO(),
      hora: input.hora,
      cliente: input.cliente ?? "",
      concepto: input.concepto,
      montoBase: input.montoBase,
      itbms,
      montoTotal,
      metodoPago: input.metodoPago ?? "efectivo",
      origen: input.origen ?? "importacion_dgi",
      anulada: false,
      // Campos DGI
      dgiNumFactura: input.dgiNumFactura,
      dgiSerie: input.dgiSerie,
      dgiRucCliente: input.dgiRucCliente,
      dgiTipoDoc: input.dgiTipoDoc,
      importacionId,
      // Campos PAC
      cufe: input.cufe,
      // Metadata
      notas: input.notas,
      createdAt: now,
      updatedAt: now,
    };

    all.push(venta);
    imported++;
  }

  writeVentas(all);
  return { imported, duplicates, errors };
}

// ============================================
// RESUMEN MENSUAL
// ============================================

/** Estructura vacia para inicializar conteos por origen */
function emptyByOrigen(): Record<OrigenVenta, { total: number; count: number }> {
  return {
    manual: { total: 0, count: 0 },
    importacion_dgi: { total: 0, count: 0 },
    pac: { total: 0, count: 0 },
  };
}

/** Estructura vacia para inicializar conteos por metodo de pago */
function emptyByMetodoPago(): Record<MetodoPagoVenta, { total: number; count: number }> {
  return {
    efectivo: { total: 0, count: 0 },
    tarjeta: { total: 0, count: 0 },
    transferencia: { total: 0, count: 0 },
    yappy: { total: 0, count: 0 },
    otro: { total: 0, count: 0 },
  };
}

/**
 * Calcula el resumen mensual de ventas (no anuladas) para un mes especifico.
 * @param year - Anio (e.g. 2026)
 * @param month - Mes 1-12
 */
export function getVentasResumenMensual(
  societyId: string,
  year: number,
  month: number
): ResumenMensual {
  // Construir rango de fechas del mes
  const mesStr = String(month).padStart(2, "0");
  const desde = `${year}-${mesStr}-01`;
  // Ultimo dia del mes
  const lastDay = new Date(year, month, 0).getDate();
  const hasta = `${year}-${mesStr}-${String(lastDay).padStart(2, "0")}`;

  const ventas = getVentas(societyId, { desde, hasta, anulada: false });

  const resumen: ResumenMensual = {
    total: 0,
    totalItbms: 0,
    count: ventas.length,
    byOrigen: emptyByOrigen(),
    byMetodoPago: emptyByMetodoPago(),
  };

  for (const v of ventas) {
    resumen.total += v.montoTotal;
    resumen.totalItbms += v.itbms;

    // Acumular por origen
    resumen.byOrigen[v.origen].total += v.montoTotal;
    resumen.byOrigen[v.origen].count++;

    // Acumular por metodo de pago
    resumen.byMetodoPago[v.metodoPago].total += v.montoTotal;
    resumen.byMetodoPago[v.metodoPago].count++;
  }

  // Redondear totales a 2 decimales
  resumen.total = Math.round(resumen.total * 100) / 100;
  resumen.totalItbms = Math.round(resumen.totalItbms * 100) / 100;

  return resumen;
}

// Exportar constante de tasa ITBMS para reutilizar
export { ITBMS_RATE, VENTAS_KEY };
