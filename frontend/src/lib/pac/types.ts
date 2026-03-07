/**
 * Tipos PAC — Libro de Ventas (Segmento 3)
 * Mi Director Financiero PTY
 *
 * Tipos simplificados para la integracion PAC del modulo de ventas.
 * Para la interface completa de un PAC certificado, ver:
 *   services/facturacion/pac/PACProvider.interface.ts
 *
 * PENDING SANDBOX VERIFICATION — Gosocket (gosocket.net)
 */

// Re-exportar tipos base relevantes del sistema existente
export type { DocumentType, DocumentStatus } from "@/services/facturacion/pac/PACProvider.interface";

// ============================================
// CONFIGURACION PAC PARA VENTAS
// ============================================

/** Estado del ambiente PAC */
export type PACEnvironment = "SANDBOX" | "PRODUCTION";

/** Proveedores PAC certificados DGI Panama */
export type PACProviderType = "GOSOCKET" | "EDICOM" | "SOVOS";

/** Configuracion de conexion PAC */
export interface ConfiguracionPAC {
  societyId: string;
  provider: PACProviderType;
  environment: PACEnvironment;
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  certificadoBase64?: string;
  webhookUrl?: string;
  isActive: boolean;
}

// ============================================
// FACTURA PAC (entrada simplificada desde ventas)
// ============================================

/** Item de linea para factura PAC */
export interface ItemFacturaPAC {
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  descuento?: number;
  exentoItbms: boolean;
  tasaItbms: 0 | 7 | 10;
}

/** Input para emitir una factura via PAC */
export interface FacturaInputPAC {
  societyId: string;
  tipoDocumento: "01" | "04" | "05"; // Factura, NC, ND
  receptor: {
    tipo: "CONSUMIDOR_FINAL" | "CONTRIBUYENTE";
    nombre: string;
    ruc?: string;
    email?: string;
    direccion?: string;
  };
  items: ItemFacturaPAC[];
  notas?: string;
  referenciaOriginal?: string; // CUFE de factura original (para NC/ND)
}

/** Resultado de emision PAC */
export interface FacturaOutputPAC {
  cufe: string;
  numeroDGI: string;
  fechaAutorizacion: string;
  urlQR: string;
  xmlFirmado: string;
  pdfUrl?: string;
  estado: "AUTORIZADA" | "PENDIENTE" | "RECHAZADA" | "ERROR";
  transaccionId: string;
  montoTotal: number;
  itbmsTotal: number;
}

// ============================================
// ERRORES PAC
// ============================================

/** Categorias de error del PAC */
export type ErrorPACCategoria =
  | "AUTENTICACION"
  | "VALIDACION"
  | "CONEXION"
  | "DGI_RECHAZO"
  | "CERTIFICADO"
  | "LIMITE_EXCEDIDO"
  | "SERVIDOR";

/** Error estructurado del PAC */
export interface ErrorPAC {
  categoria: ErrorPACCategoria;
  codigo: string;
  mensaje: string;
  detalle?: string;
  reintentable: boolean;
}

// ============================================
// ESTADO ONBOARDING PAC
// ============================================

export type PasoOnboarding = "checklist" | "credenciales" | "verificacion" | "prueba";

export interface EstadoOnboardingPAC {
  pasoActual: PasoOnboarding;
  completados: PasoOnboarding[];
  config?: Partial<ConfiguracionPAC>;
  conexionVerificada: boolean;
  facturaPruebaEmitida: boolean;
}

// ============================================
// WEBHOOK PAC
// ============================================

export type EventoWebhook =
  | "DOCUMENT_AUTHORIZED"
  | "DOCUMENT_REJECTED"
  | "DOCUMENT_CANCELLED";

export interface PayloadWebhook {
  evento: EventoWebhook;
  cufe: string;
  timestamp: string;
  detalle?: string;
}
