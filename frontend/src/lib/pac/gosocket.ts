/**
 * GosocketClient — Adaptador PAC Gosocket (gosocket.net)
 * Mi Director Financiero PTY
 *
 * Implementacion del cliente PAC para Gosocket.
 * API REST — Facturacion Electronica Panama (SFEP DGI).
 *
 * PENDING SANDBOX VERIFICATION
 * Este codigo fue escrito basado en la documentacion publica de Gosocket.
 * Requiere verificacion con cuenta sandbox real antes de produccion.
 * Contacto: gosocket.net
 */

import { PACClient } from "./pac-client";
import type {
  ConfiguracionPAC,
  FacturaInputPAC,
  FacturaOutputPAC,
  ErrorPAC,
  PACProviderType,
} from "./types";

// ============================================
// CONSTANTES GOSOCKET
// ============================================

const GOSOCKET_SANDBOX_URL = "https://sandbox-api.gosocket.net";
const GOSOCKET_PROD_URL = "https://api.gosocket.net";
const API_VERSION = "v1";
const REQUEST_TIMEOUT = 30_000; // 30 segundos

// ============================================
// GOSOCKET CLIENT
// ============================================

export class GosocketClient extends PACClient {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: ConfiguracionPAC) {
    super(config);
  }

  get providerName(): PACProviderType {
    return "GOSOCKET";
  }

  // -- URL base segun ambiente ------------------------------------------

  private get baseUrl(): string {
    if (this.config.baseUrl) return this.config.baseUrl;
    return this.config.environment === "PRODUCTION"
      ? GOSOCKET_PROD_URL
      : GOSOCKET_SANDBOX_URL;
  }

  // -- Autenticacion ----------------------------------------------------

  /**
   * Obtener token de acceso OAuth2.
   * PENDING SANDBOX VERIFICATION — endpoint y formato de respuesta
   * pueden variar segun documentacion oficial de Gosocket.
   */
  private async authenticate(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const url = `${this.baseUrl}/${API_VERSION}/auth/token`;

    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.config.apiKey,
        api_secret: this.config.apiSecret,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw this.buildError(
        "AUTENTICACION",
        `AUTH_${res.status}`,
        "Error de autenticacion con Gosocket",
        res.status >= 500,
        body
      );
    }

    const data = await res.json();
    this.token = data.access_token || data.token;
    // Token valido por 50 minutos (asumiendo 1 hora de vida)
    this.tokenExpiry = Date.now() + 50 * 60 * 1000;

    return this.token!;
  }

  // -- Implementacion de metodos abstractos -----------------------------

  async testConnection(): Promise<{
    ok: boolean;
    latencyMs: number;
    mensaje?: string;
  }> {
    const start = Date.now();
    try {
      await this.authenticate();
      const latencyMs = Date.now() - start;
      return {
        ok: true,
        latencyMs,
        mensaje: `Conectado a Gosocket (${this.config.environment})`,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      return {
        ok: false,
        latencyMs,
        mensaje: err instanceof Error ? err.message : "Error de conexion",
      };
    }
  }

  /**
   * Emitir factura electronica via Gosocket API.
   * PENDING SANDBOX VERIFICATION — estructura del request body
   * y response pueden variar segun la API real.
   */
  async emitirFactura(input: FacturaInputPAC): Promise<FacturaOutputPAC> {
    const token = await this.authenticate();
    const totales = this.calcularTotales(input.items);

    // Construir payload segun formato esperado por Gosocket
    const payload = {
      document_type: input.tipoDocumento,
      receiver: {
        type: input.receptor.tipo,
        name: input.receptor.nombre,
        ruc: input.receptor.ruc || undefined,
        email: input.receptor.email || undefined,
        address: input.receptor.direccion || undefined,
      },
      items: input.items.map((item) => ({
        description: item.descripcion,
        quantity: item.cantidad,
        unit: item.unidad,
        unit_price: item.precioUnitario,
        discount: item.descuento ?? 0,
        is_exempt: item.exentoItbms,
        itbms_rate: item.tasaItbms,
      })),
      summary: {
        taxable_subtotal: totales.subtotalGravado,
        exempt_subtotal: totales.subtotalExento,
        total_discounts: totales.totalDescuentos,
        total_itbms: totales.totalItbms,
        document_total: totales.totalDocumento,
      },
      notes: input.notas,
      reference_cufe: input.referenciaOriginal,
    };

    const url = `${this.baseUrl}/${API_VERSION}/documents/issue`;
    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      throw this.mapGosocketError(res.status, body);
    }

    const data = await res.json();

    return {
      cufe: data.cufe || data.CUFE,
      numeroDGI: data.dgi_number || data.numero_dgi || "",
      fechaAutorizacion: data.authorization_date || new Date().toISOString(),
      urlQR: data.qr_url || "",
      xmlFirmado: data.signed_xml || "",
      pdfUrl: data.pdf_url,
      estado: this.mapEstadoGosocket(data.status),
      transaccionId: data.transaction_id || data.id || "",
      montoTotal: totales.totalDocumento,
      itbmsTotal: totales.totalItbms,
    };
  }

  async consultarEstado(cufe: string): Promise<{
    estado: string;
    detalle?: string;
  }> {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/${API_VERSION}/documents/${cufe}/status`;

    const res = await this.fetchWithTimeout(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw this.mapGosocketError(res.status, body);
    }

    const data = await res.json();
    return {
      estado: data.status,
      detalle: data.detail || data.message,
    };
  }

  async anularFactura(cufe: string, motivo: string): Promise<{
    ok: boolean;
    nuevoEstado: string;
  }> {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/${API_VERSION}/documents/${cufe}/cancel`;

    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: motivo }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw this.mapGosocketError(res.status, body);
    }

    const data = await res.json();
    return {
      ok: true,
      nuevoEstado: data.new_status || "CANCELLED",
    };
  }

  async descargarPDF(cufe: string): Promise<{
    url: string;
    base64?: string;
  }> {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/${API_VERSION}/documents/${cufe}/pdf`;

    const res = await this.fetchWithTimeout(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw this.buildError(
        "SERVIDOR",
        `PDF_${res.status}`,
        "No se pudo descargar el PDF de la factura",
        true
      );
    }

    const data = await res.json();
    return {
      url: data.url || data.pdf_url || "",
      base64: data.base64,
    };
  }

  // -- Helpers privados -------------------------------------------------

  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw this.buildError(
          "CONEXION",
          "TIMEOUT",
          `Timeout despues de ${REQUEST_TIMEOUT / 1000}s conectando a Gosocket`,
          true
        );
      }
      throw this.buildError(
        "CONEXION",
        "NETWORK",
        "Error de red conectando a Gosocket",
        true,
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapEstadoGosocket(
    status: string
  ): "AUTORIZADA" | "PENDIENTE" | "RECHAZADA" | "ERROR" {
    const upper = (status || "").toUpperCase();
    if (upper.includes("AUTHORIZED") || upper.includes("AUTORIZADA")) return "AUTORIZADA";
    if (upper.includes("PENDING") || upper.includes("PENDIENTE")) return "PENDIENTE";
    if (upper.includes("REJECTED") || upper.includes("RECHAZADA")) return "RECHAZADA";
    return "ERROR";
  }

  private mapGosocketError(status: number, body: string): ErrorPAC {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(body);
    } catch {
      // body no es JSON
    }

    const mensaje = (parsed.message as string) || (parsed.error as string) || body;

    if (status === 401 || status === 403) {
      this.token = null; // Forzar re-autenticacion
      return this.buildError(
        "AUTENTICACION",
        `GOSOCKET_${status}`,
        "Credenciales invalidas o sesion expirada",
        true,
        mensaje
      );
    }
    if (status === 400 || status === 422) {
      return this.buildError(
        "VALIDACION",
        `GOSOCKET_${status}`,
        "Error de validacion en el documento",
        false,
        mensaje
      );
    }
    if (status === 429) {
      return this.buildError(
        "LIMITE_EXCEDIDO",
        "RATE_LIMIT",
        "Limite de solicitudes excedido. Intente en unos minutos.",
        true,
        mensaje
      );
    }
    return this.buildError(
      "SERVIDOR",
      `GOSOCKET_${status}`,
      "Error del servidor Gosocket",
      status >= 500,
      mensaje
    );
  }
}
