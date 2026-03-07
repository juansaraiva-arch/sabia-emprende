/**
 * PACProvider Interface — Spec DGI Panama (SFEP)
 *
 * Contrato que todo PAC certificado debe implementar.
 * Hoy corre con ManualEntryAdapter (entrada manual).
 * Cuando se active un PAC real, solo se crea un nuevo adaptador.
 */

// ============================================================
// TIPOS BASE SFEP
// ============================================================

export type DocumentType =
  | "01" // Factura Operaciones Internas
  | "02" // Factura Exportacion
  | "03" // Factura Importacion
  | "04" // Nota de Credito
  | "05" // Nota de Debito
  | "06" // Recibo
  | "07"; // Orden de Compra

export type DocumentStatus =
  | "DRAFT"
  | "MANUAL"
  | "SENT_TO_PAC"
  | "AUTHORIZED_DGI"
  | "REJECTED_PAC"
  | "REJECTED_DGI"
  | "CANCELLED"
  | "CONTINGENCY";

export interface FiscalIssuer {
  ruc: string;
  dv: string;
  legal_name: string;
  trade_name?: string;
  address: string;
  phone?: string;
  email: string;
  taxpayer_type: "NATURAL" | "JURIDICO";
  economic_activity: string;
}

export interface FiscalReceiver {
  type: "CONSUMIDOR_FINAL" | "CONTRIBUYENTE";
  ruc?: string;
  name: string;
  email?: string;
  address?: string;
}

export interface InvoiceItem {
  code?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount?: number;
  is_exempt_itbms: boolean;
  itbms_rate?: 0 | 7 | 10;
  subtotal: number;
  itbms_amount: number;
  total: number;
}

export interface FiscalSummary {
  taxable_subtotal: number;
  exempt_subtotal: number;
  total_discounts: number;
  itbms_7_total: number;
  itbms_10_total: number;
  total_itbms: number;
  document_total: number;
}

export interface DocumentInput {
  document_type: DocumentType;
  internal_number?: string;
  issue_date: Date;
  issuer: FiscalIssuer;
  receiver: FiscalReceiver;
  items: InvoiceItem[];
  summary: FiscalSummary;
  notes?: string;
  reference_cufe?: string;
  signing_cert?: string;
}

export interface AuthorizedDocument {
  cufe: string;
  dgi_number: string;
  authorization_date: Date;
  qr_url: string;
  signed_xml: string;
  pdf_url?: string;
  status: DocumentStatus;
  pac_transaction_id: string;
}

export interface PeriodSummary {
  gross_invoiced: number;
  credit_notes_total: number;
  debit_notes_total: number;
  cancellations_total: number;
  net_total: number;
  itbms_collected: number;
  document_count: number;
  by_month: Array<{
    month: number;
    invoiced: number;
    itbms: number;
    net: number;
  }>;
}

// ============================================================
// CONTRATO — Todo PAC debe implementar esta interface
// ============================================================

export interface PACProvider {
  readonly name: string;
  readonly api_version: string;
  readonly environment: "SANDBOX" | "PRODUCTION";
  readonly dgi_resolution: string;

  testConnection(): Promise<{
    ok: boolean;
    latency_ms: number;
    message?: string;
  }>;

  refreshAuth(): Promise<void>;

  issueDocument(doc: DocumentInput): Promise<AuthorizedDocument>;

  queryDocumentStatus(cufe: string): Promise<{
    status: DocumentStatus;
    detail?: string;
  }>;

  cancelDocument(
    cufe: string,
    reason: string
  ): Promise<{
    ok: boolean;
    new_status: DocumentStatus;
    cancelled_at?: Date;
  }>;

  queryIssuedDocuments(params: {
    issuer_ruc: string;
    date_from: Date;
    date_to: Date;
    document_type?: DocumentType;
    page?: number;
    per_page?: number;
  }): Promise<{
    documents: AuthorizedDocument[];
    total: number;
    current_page: number;
    total_pages: number;
  }>;

  queryReceivedDocuments(params: {
    receiver_ruc: string;
    date_from: Date;
    date_to: Date;
    page?: number;
    per_page?: number;
  }): Promise<{
    documents: AuthorizedDocument[];
    total: number;
  }>;

  getPeriodSummary(params: {
    ruc: string;
    fiscal_year: number;
    month?: number;
  }): Promise<PeriodSummary>;

  validateSigningCert(ruc: string): Promise<{
    valid: boolean;
    expires_at?: Date;
    issuer?: string;
    days_until_expiry?: number;
  }>;

  registerWebhook(params: {
    url: string;
    events: Array<
      "DOCUMENT_AUTHORIZED" | "DOCUMENT_REJECTED" | "DOCUMENT_CANCELLED"
    >;
    secret: string;
  }): Promise<{ webhook_id: string }>;
}
