/**
 * PACClient — Cliente abstracto para proveedores PAC
 * Mi Director Financiero PTY
 *
 * Clase base que define las operaciones simplificadas
 * del Libro de Ventas para emision electronica.
 *
 * Para la interface completa del sistema SFEP, ver:
 *   services/facturacion/pac/PACProvider.interface.ts
 *
 * PENDING SANDBOX VERIFICATION
 */

import type {
  ConfiguracionPAC,
  FacturaInputPAC,
  FacturaOutputPAC,
  ErrorPAC,
  PACProviderType,
  PACEnvironment,
} from "./types";

// ============================================
// CLASE ABSTRACTA
// ============================================

export abstract class PACClient {
  protected config: ConfiguracionPAC;

  constructor(config: ConfiguracionPAC) {
    this.config = config;
  }

  /** Nombre del proveedor PAC */
  abstract get providerName(): PACProviderType;

  /** Verificar conexion con el PAC */
  abstract testConnection(): Promise<{
    ok: boolean;
    latencyMs: number;
    mensaje?: string;
  }>;

  /** Emitir factura electronica */
  abstract emitirFactura(input: FacturaInputPAC): Promise<FacturaOutputPAC>;

  /** Consultar estado de un documento por CUFE */
  abstract consultarEstado(cufe: string): Promise<{
    estado: string;
    detalle?: string;
  }>;

  /** Anular factura */
  abstract anularFactura(cufe: string, motivo: string): Promise<{
    ok: boolean;
    nuevoEstado: string;
  }>;

  /** Descargar PDF de factura */
  abstract descargarPDF(cufe: string): Promise<{
    url: string;
    base64?: string;
  }>;

  // ============================================
  // HELPERS COMPARTIDOS
  // ============================================

  /** Calcular totales de una factura a partir de items */
  protected calcularTotales(items: FacturaInputPAC["items"]): {
    subtotalGravado: number;
    subtotalExento: number;
    totalDescuentos: number;
    totalItbms: number;
    totalDocumento: number;
  } {
    let subtotalGravado = 0;
    let subtotalExento = 0;
    let totalDescuentos = 0;
    let totalItbms = 0;

    for (const item of items) {
      const subtotal = item.cantidad * item.precioUnitario;
      const descuento = item.descuento ?? 0;
      const base = subtotal - descuento;

      totalDescuentos += descuento;

      if (item.exentoItbms) {
        subtotalExento += base;
      } else {
        subtotalGravado += base;
        const itbms = Math.round(base * (item.tasaItbms / 100) * 100) / 100;
        totalItbms += itbms;
      }
    }

    return {
      subtotalGravado: Math.round(subtotalGravado * 100) / 100,
      subtotalExento: Math.round(subtotalExento * 100) / 100,
      totalDescuentos: Math.round(totalDescuentos * 100) / 100,
      totalItbms: Math.round(totalItbms * 100) / 100,
      totalDocumento: Math.round((subtotalGravado + subtotalExento + totalItbms) * 100) / 100,
    };
  }

  /** Construir un ErrorPAC estructurado */
  protected buildError(
    categoria: ErrorPAC["categoria"],
    codigo: string,
    mensaje: string,
    reintentable = false,
    detalle?: string
  ): ErrorPAC {
    return { categoria, codigo, mensaje, detalle, reintentable };
  }
}

// ============================================
// FACTORY
// ============================================

/**
 * Crea una instancia del cliente PAC segun el proveedor configurado.
 * Importa dinamicamente el adaptador para evitar cargar todos los proveedores.
 */
export async function createPACClient(config: ConfiguracionPAC): Promise<PACClient> {
  switch (config.provider) {
    case "GOSOCKET": {
      const { GosocketClient } = await import("./gosocket");
      return new GosocketClient(config);
    }
    case "EDICOM":
      throw new Error(
        "EDICOM adapter no implementado. Crear lib/pac/edicom.ts implementando PACClient."
      );
    case "SOVOS":
      throw new Error(
        "SOVOS adapter no implementado. Crear lib/pac/sovos.ts implementando PACClient."
      );
    default:
      throw new Error(`Proveedor PAC desconocido: ${config.provider}`);
  }
}

// ============================================
// HELPER: Leer config PAC desde localStorage
// ============================================

const PAC_CONFIG_KEY = "midf_pac_config";

export function getPACConfig(societyId: string): ConfiguracionPAC | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PAC_CONFIG_KEY);
    if (!raw) return null;
    const configs: ConfiguracionPAC[] = JSON.parse(raw);
    return configs.find((c) => c.societyId === societyId) ?? null;
  } catch {
    return null;
  }
}

export function savePACConfig(config: ConfiguracionPAC): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PAC_CONFIG_KEY);
    const configs: ConfiguracionPAC[] = raw ? JSON.parse(raw) : [];
    const idx = configs.findIndex((c) => c.societyId === config.societyId);
    if (idx >= 0) {
      configs[idx] = config;
    } else {
      configs.push(config);
    }
    localStorage.setItem(PAC_CONFIG_KEY, JSON.stringify(configs));
  } catch {
    // localStorage lleno o no disponible
  }
}
