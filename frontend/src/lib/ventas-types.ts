/**
 * Tipos compartidos — Modulo Libro de Ventas
 * Mi Director Financiero PTY
 *
 * Basado en Resolucion DGI 201-6299 (segmentos de facturacion)
 * y estructura localStorage-first del proyecto.
 */

// ============================================
// SEGMENTOS DE FACTURACION (Resolucion DGI 201-6299)
// ============================================

/** Segmento 1: sin obligacion fiscal, Segmento 2: CSV manual, Segmento 3: PAC electronico */
export type SegmentoFacturacion = 1 | 2 | 3;

// ============================================
// ENUMS DE VENTA
// ============================================

/** Origen de la venta: manual, importacion CSV DGI, o PAC electronico */
export type OrigenVenta = "manual" | "importacion_dgi" | "pac";

/** Metodos de pago soportados */
export type MetodoPagoVenta = "efectivo" | "tarjeta" | "transferencia" | "yappy" | "otro";

/** Estado de la venta */
export type EstadoVenta = "activa" | "anulada";

/** Estado de factura en el PAC (Segmento 3) */
export type EstadoFacturaPAC = "AUTORIZADA" | "PENDIENTE" | "RECHAZADA" | "ANULADA" | "ERROR";

// ============================================
// VENTA (registro principal)
// ============================================

export interface Venta {
  id: string;
  societyId: string;
  fecha: string;              // ISO date "2026-03-07"
  hora?: string;              // "14:30"
  cliente: string;
  concepto: string;
  montoBase: number;          // subtotal sin ITBMS
  itbms: number;              // ITBMS (7% si aplica)
  montoTotal: number;         // montoBase + itbms
  metodoPago: MetodoPagoVenta;
  origen: OrigenVenta;
  anulada: boolean;
  // Campos DGI (importacion CSV Segmento 2)
  dgiNumFactura?: string;
  dgiSerie?: string;
  dgiRucCliente?: string;
  dgiTipoDoc?: string;
  importacionId?: string;
  // Campos PAC (Segmento 3)
  cufe?: string;
  xmlFirmado?: string;
  pdfUrl?: string;
  estadoPac?: EstadoFacturaPAC;
  // Metadata
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// INPUT PARA CREAR VENTA
// ============================================

export interface VentaInput {
  societyId: string;
  fecha?: string;
  hora?: string;
  cliente?: string;
  concepto: string;
  montoBase: number;
  aplicaItbms?: boolean;      // default true -> auto-calcula 7%
  metodoPago?: MetodoPagoVenta;
  origen?: OrigenVenta;
  // Campos opcionales DGI/PAC
  dgiNumFactura?: string;
  dgiSerie?: string;
  dgiRucCliente?: string;
  dgiTipoDoc?: string;
  importacionId?: string;
  cufe?: string;
  notas?: string;
}

// ============================================
// RESULTADO DETECCION DE SEGMENTO
// ============================================

export interface ResultadoSegmento {
  segmento: SegmentoFacturacion;
  ingresos12m: number;        // ingresos ultimos 12 meses
  facturasMes: number;        // facturas del mes actual
  limiteIngresos: number;     // B/.36,000
  limiteFacturas: number;     // 100 documentos
  pctIngresos: number;        // % del limite consumido
  pctFacturas: number;        // % del limite consumido
  debeMigrar: boolean;        // true si supero el limite
  alertaNivel: "verde" | "amarillo" | "rojo";
  mensajeAlerta?: string;
}

// ============================================
// FILTROS DE CONSULTA
// ============================================

export interface VentasFilter {
  desde?: string;             // ISO date
  hasta?: string;             // ISO date
  origen?: OrigenVenta;
  anulada?: boolean;
  metodoPago?: MetodoPagoVenta;
  cliente?: string;
}

// ============================================
// RESUMEN MENSUAL
// ============================================

export interface ResumenMensual {
  total: number;
  totalItbms: number;
  count: number;
  byOrigen: Record<OrigenVenta, { total: number; count: number }>;
  byMetodoPago: Record<MetodoPagoVenta, { total: number; count: number }>;
}

// ============================================
// LABELS Y CONSTANTES UI
// ============================================

export const ORIGEN_VENTA_LABELS: Record<OrigenVenta, string> = {
  manual: "Manual",
  importacion_dgi: "Importacion DGI",
  pac: "PAC Electronico",
};

export const METODO_PAGO_LABELS: Record<MetodoPagoVenta, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  yappy: "Yappy",
  otro: "Otro",
};

export const ESTADO_PAC_LABELS: Record<EstadoFacturaPAC, string> = {
  AUTORIZADA: "Autorizada",
  PENDIENTE: "Pendiente",
  RECHAZADA: "Rechazada",
  ANULADA: "Anulada",
  ERROR: "Error",
};

export const ALERTA_NIVEL_LABELS: Record<"verde" | "amarillo" | "rojo", string> = {
  verde: "Normal",
  amarillo: "Preventiva",
  rojo: "Critico",
};
