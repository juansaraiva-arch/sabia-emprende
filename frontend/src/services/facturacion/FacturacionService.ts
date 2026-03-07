/**
 * FacturacionService — Unico punto de entrada al sistema de facturacion.
 *
 * El resto de la app (incluyendo F2V10DraftService) solo habla con
 * FacturacionService, nunca directamente con el adaptador PAC.
 *
 * Hoy: lee de localStorage (ManualEntryAdapter).
 * Futuro PAC: lee del servidor del PAC. Nada cambia aqui.
 */

import { PACFactory } from "./pac/PACFactory";
import type { PACProvider, PeriodSummary } from "./pac/PACProvider.interface";

// ============================================================
// Tipos de resultado para el F2 V10
// ============================================================

export interface ResumenFacturacion {
  total_facturado_neto: number;
  total_itbms_cobrado: number;
  por_mes: PeriodSummary["by_month"];
  fuente: "MANUAL" | "PAC_SYNC";
  documentos_count: number;
  discrepancia_posible: boolean;
  advertencia?: string;
}

export interface IntegrationStatus {
  mode: "MANUAL" | "PAC_ACTIVE";
  pac_name: string;
  pac_environment: string;
  connected: boolean;
  latency_ms: number;
}

export interface FreeInvoicerLimits {
  docs_this_month: number;
  docs_monthly_limit: number;
  docs_pct: number;
  docs_alert: boolean;
  revenue_annual: number;
  revenue_annual_limit: number;
  revenue_pct: number;
  revenue_alert: boolean;
  requires_pac_now: boolean;
  alert_message?: string;
}

// ============================================================
// Limites DGI — Resolucion 201-6299
// ============================================================

const FREE_INVOICER_DOCS_LIMIT = 100;
const FREE_INVOICER_REVENUE_LIMIT = 36_000;
const DOCS_ALERT_PCT = 0.80;
const REVENUE_ALERT_PCT = 0.85;

// ============================================================
// Service
// ============================================================

export class FacturacionService {
  private pac: PACProvider;

  constructor() {
    this.pac = PACFactory.createFromEnv();
  }

  // ── Para el F2 V10 ─────────────────────────────────────────

  async getResumenParaDeclaracion(params: {
    societyId: string;
    periodoFiscal: number;
    ruc?: string;
  }): Promise<ResumenFacturacion> {
    const summary = await this.pac.getPeriodSummary({
      ruc: params.ruc || params.societyId,
      fiscal_year: params.periodoFiscal,
    });

    const isManual = this.pac.name === "MANUAL_ENTRY";

    return {
      total_facturado_neto: summary.net_total,
      total_itbms_cobrado: summary.itbms_collected,
      por_mes: summary.by_month,
      fuente: isManual ? "MANUAL" : "PAC_SYNC",
      documentos_count: summary.document_count,
      discrepancia_posible: isManual,
      advertencia: isManual
        ? "Los ingresos fueron ingresados manualmente. La DGI validara " +
          "contra tus facturas electronicas en el SFEP. Verifica que " +
          "coincidan antes de presentar."
        : undefined,
    };
  }

  // ── Estado de la integracion ───────────────────────────────

  async getIntegrationStatus(): Promise<IntegrationStatus> {
    const connection = await this.pac.testConnection();
    return {
      mode: this.pac.name === "MANUAL_ENTRY" ? "MANUAL" : "PAC_ACTIVE",
      pac_name: this.pac.name,
      pac_environment: this.pac.environment,
      connected: connection.ok,
      latency_ms: connection.latency_ms,
    };
  }

  // ── Limites del facturador gratuito DGI ─────────────────────

  async checkFreeInvoicerLimits(
    societyId: string
  ): Promise<FreeInvoicerLimits> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Documentos este mes
    const monthSummary = await this.pac.getPeriodSummary({
      ruc: societyId,
      fiscal_year: year,
      month,
    });

    // Ingresos anuales
    const yearSummary = await this.pac.getPeriodSummary({
      ruc: societyId,
      fiscal_year: year,
    });

    const docs = monthSummary.document_count;
    const revenue = yearSummary.net_total;

    const docs_pct = (docs / FREE_INVOICER_DOCS_LIMIT) * 100;
    const revenue_pct = (revenue / FREE_INVOICER_REVENUE_LIMIT) * 100;
    const requires_pac_now =
      docs >= FREE_INVOICER_DOCS_LIMIT ||
      revenue >= FREE_INVOICER_REVENUE_LIMIT;

    return {
      docs_this_month: docs,
      docs_monthly_limit: FREE_INVOICER_DOCS_LIMIT,
      docs_pct,
      docs_alert: docs_pct >= DOCS_ALERT_PCT * 100,
      revenue_annual: revenue,
      revenue_annual_limit: FREE_INVOICER_REVENUE_LIMIT,
      revenue_pct,
      revenue_alert: revenue_pct >= REVENUE_ALERT_PCT * 100,
      requires_pac_now,
      alert_message: requires_pac_now
        ? "Has superado los limites del facturador gratuito DGI. " +
          "Necesitas contratar un PAC certificado para seguir facturando."
        : undefined,
    };
  }

  // ── Sincronizacion futura ──────────────────────────────────

  async syncWithPAC(_params: {
    societyId: string;
    from: Date;
    to: Date;
  }): Promise<void> {
    if (this.pac.name === "MANUAL_ENTRY") {
      throw new Error(
        "La sincronizacion con PAC no esta disponible en modo manual. " +
          "Activa un PAC certificado DGI en Configuracion > Facturacion."
      );
    }
    // Logica de sync cuando exista un adaptador PAC real
  }
}

// Singleton para uso en componentes
let _instance: FacturacionService | null = null;
export function getFacturacionService(): FacturacionService {
  if (!_instance) _instance = new FacturacionService();
  return _instance;
}
