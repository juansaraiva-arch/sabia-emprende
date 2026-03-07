/**
 * ManualEntryAdapter — Implementacion actual del sistema.
 *
 * Cumple el contrato PACProvider leyendo/escribiendo en localStorage.
 * Cuando se active un PAC real, este adaptador se reemplaza sin tocar
 * ningun otro archivo del proyecto.
 */

import type {
  PACProvider,
  DocumentInput,
  AuthorizedDocument,
  PeriodSummary,
  DocumentStatus,
  DocumentType,
} from "./PACProvider.interface";

// ============================================================
// localStorage helpers para facturas manuales
// ============================================================

const INVOICES_KEY = "midf_electronic_invoices";

interface StoredInvoice {
  id: string;
  society_id: string;
  document_type: string;
  internal_number: string;
  cufe: string;
  receptor_name: string;
  receptor_ruc: string;
  subtotal_taxable: number;
  subtotal_exempt: number;
  total_discounts: number;
  total_itbms: number;
  total_amount: number;
  status: string;
  issue_date: string;
  origin: string;
  created_at: string;
}

function loadInvoices(): StoredInvoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveInvoices(invoices: StoredInvoice[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
  } catch {}
}

// ============================================================
// ManualEntryAdapter
// ============================================================

export class ManualEntryAdapter implements PACProvider {
  readonly name = "MANUAL_ENTRY";
  readonly api_version = "1.0";
  readonly environment = "PRODUCTION" as const;
  readonly dgi_resolution = "N/A";

  async testConnection() {
    return { ok: true, latency_ms: 0, message: "Modo entrada manual activo" };
  }

  async refreshAuth(): Promise<void> {
    // No aplica en modo manual
  }

  async issueDocument(doc: DocumentInput): Promise<AuthorizedDocument> {
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const invoice: StoredInvoice = {
      id,
      society_id: "",
      document_type: doc.document_type,
      internal_number: doc.internal_number || "",
      cufe: `MANUAL-${id}`,
      receptor_name: doc.receiver.name,
      receptor_ruc: doc.receiver.ruc || "",
      subtotal_taxable: doc.summary.taxable_subtotal,
      subtotal_exempt: doc.summary.exempt_subtotal,
      total_discounts: doc.summary.total_discounts,
      total_itbms: doc.summary.total_itbms,
      total_amount: doc.summary.document_total,
      status: "MANUAL",
      issue_date: doc.issue_date.toISOString(),
      origin: "MANUAL_INPUT",
      created_at: new Date().toISOString(),
    };

    const invoices = loadInvoices();
    invoices.push(invoice);
    saveInvoices(invoices);

    return {
      cufe: invoice.cufe,
      dgi_number: "",
      authorization_date: new Date(),
      qr_url: "",
      signed_xml: "",
      pdf_url: undefined,
      status: "MANUAL",
      pac_transaction_id: id,
    };
  }

  async queryDocumentStatus(cufe: string) {
    const invoices = loadInvoices();
    const doc = invoices.find((i) => i.cufe === cufe);
    return {
      status: (doc?.status as DocumentStatus) ?? "DRAFT",
    };
  }

  async cancelDocument(cufe: string, reason: string) {
    const invoices = loadInvoices();
    const idx = invoices.findIndex((i) => i.cufe === cufe);
    if (idx >= 0) {
      invoices[idx].status = "CANCELLED";
      saveInvoices(invoices);
    }
    return {
      ok: true,
      new_status: "CANCELLED" as DocumentStatus,
      cancelled_at: new Date(),
    };
  }

  async queryIssuedDocuments(params: {
    issuer_ruc: string;
    date_from: Date;
    date_to: Date;
    document_type?: DocumentType;
    page?: number;
    per_page?: number;
  }) {
    const invoices = loadInvoices();
    const from = params.date_from.getTime();
    const to = params.date_to.getTime();

    const filtered = invoices.filter((i) => {
      const d = new Date(i.issue_date).getTime();
      if (d < from || d > to) return false;
      if (params.document_type && i.document_type !== params.document_type) return false;
      if (i.status === "CANCELLED") return false;
      return true;
    });

    return {
      documents: filtered.map((i) => ({
        cufe: i.cufe,
        dgi_number: "",
        authorization_date: new Date(i.created_at),
        qr_url: "",
        signed_xml: "",
        status: i.status as DocumentStatus,
        pac_transaction_id: i.id,
      })),
      total: filtered.length,
      current_page: 1,
      total_pages: 1,
    };
  }

  async queryReceivedDocuments(params: {
    receiver_ruc: string;
    date_from: Date;
    date_to: Date;
  }) {
    // En modo manual no se registran facturas recibidas
    return { documents: [], total: 0 };
  }

  async getPeriodSummary(params: {
    ruc: string;
    fiscal_year: number;
    month?: number;
  }): Promise<PeriodSummary> {
    const invoices = loadInvoices();
    const year = params.fiscal_year;

    const yearInvoices = invoices.filter((i) => {
      const d = new Date(i.issue_date);
      if (d.getFullYear() !== year) return false;
      if (params.month !== undefined && d.getMonth() + 1 !== params.month) return false;
      return true;
    });

    const active = yearInvoices.filter((i) => i.status !== "CANCELLED");
    const cancelled = yearInvoices.filter((i) => i.status === "CANCELLED");

    // Facturas tipo 01 (normales)
    const normales = active.filter((i) => i.document_type === "01" || i.document_type === "02");
    // Notas de credito (04)
    const creditNotes = active.filter((i) => i.document_type === "04");
    // Notas de debito (05)
    const debitNotes = active.filter((i) => i.document_type === "05");

    const gross = normales.reduce((s, i) => s + i.total_amount, 0);
    const credits = creditNotes.reduce((s, i) => s + i.total_amount, 0);
    const debits = debitNotes.reduce((s, i) => s + i.total_amount, 0);
    const cancels = cancelled.reduce((s, i) => s + i.total_amount, 0);
    const itbms = active.reduce((s, i) => s + i.total_itbms, 0);

    // Desglose por mes
    const byMonth: PeriodSummary["by_month"] = [];
    for (let m = 1; m <= 12; m++) {
      const monthInv = active.filter((i) => new Date(i.issue_date).getMonth() + 1 === m);
      if (monthInv.length > 0 || !params.month) {
        byMonth.push({
          month: m,
          invoiced: monthInv.reduce((s, i) => s + i.total_amount, 0),
          itbms: monthInv.reduce((s, i) => s + i.total_itbms, 0),
          net: monthInv
            .filter((i) => i.document_type !== "04")
            .reduce((s, i) => s + i.total_amount, 0) -
            monthInv
              .filter((i) => i.document_type === "04")
              .reduce((s, i) => s + i.total_amount, 0),
        });
      }
    }

    return {
      gross_invoiced: gross + debits,
      credit_notes_total: credits,
      debit_notes_total: debits,
      cancellations_total: cancels,
      net_total: gross + debits - credits,
      itbms_collected: itbms,
      document_count: active.length,
      by_month: byMonth,
    };
  }

  async validateSigningCert(_ruc: string) {
    return {
      valid: false,
      message: "Certificado de firma disponible cuando se active PAC",
    };
  }

  async registerWebhook(_params: {
    url: string;
    events: Array<
      "DOCUMENT_AUTHORIZED" | "DOCUMENT_REJECTED" | "DOCUMENT_CANCELLED"
    >;
    secret: string;
  }) {
    return { webhook_id: "MANUAL-NO-WEBHOOK" };
  }
}
