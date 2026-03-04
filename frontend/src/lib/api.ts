/**
 * Cliente API para comunicarse con el backend FastAPI.
 * Next.js redirige /api/* al backend via rewrites en next.config.ts.
 *
 * Fase 9: Autenticacion real con Supabase JWT.
 * En DEMO_MODE, fallback a x-user-id header para compatibilidad.
 */

import { createClient } from "@/lib/supabase/client";

const API_BASE = "/api";
const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Obtener token JWT de la sesion de Supabase
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    } else if (IS_DEMO_MODE) {
      // Fallback para desarrollo local sin auth configurado
      headers["x-user-id"] = "demo-user-001";
    }
  } catch {
    if (IS_DEMO_MODE) {
      headers["x-user-id"] = "demo-user-001";
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    // Network error (backend unreachable) — in demo mode, return empty data
    if (IS_DEMO_MODE) {
      console.warn(`[MiDF] API no disponible (${path}) — modo demo, retornando vacio`);
      return { data: [], success: true } as T;
    }
    throw new Error("No se pudo conectar con el servidor.");
  }

  // Si la sesion expiro, redirigir a login
  if (res.status === 401 && !IS_DEMO_MODE) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login?error=session_expired";
    }
    throw new Error("Sesion expirada. Redirigiendo al login...");
  }

  if (!res.ok) {
    // In demo mode, silently return empty data instead of erroring
    if (IS_DEMO_MODE) {
      console.warn(`[MiDF] API error ${res.status} (${path}) — modo demo, retornando vacio`);
      return { data: [], success: true } as T;
    }
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Error en la API");
  }

  return res.json();
}

/**
 * Fetch binario (PDF/CSV) del API. Misma logica de auth que apiFetch pero retorna Blob.
 */
async function apiFetchBlob(
  path: string,
  options: RequestInit = {}
): Promise<Blob> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    } else if (IS_DEMO_MODE) {
      headers["x-user-id"] = "demo-user-001";
    }
  } catch {
    if (IS_DEMO_MODE) {
      headers["x-user-id"] = "demo-user-001";
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    if (IS_DEMO_MODE) {
      throw new Error("Generacion de reportes no disponible en modo demo. Conecta el backend para descargar PDFs y CSVs.");
    }
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (res.status === 401 && !IS_DEMO_MODE) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login?error=session_expired";
    }
    throw new Error("Sesion expirada.");
  }

  if (!res.ok) {
    if (IS_DEMO_MODE) {
      throw new Error("Generacion de reportes no disponible en modo demo. Conecta el backend para descargar PDFs y CSVs.");
    }
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Error en la API");
  }

  return res.blob();
}

/**
 * Dispara descarga de un Blob en el navegador.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Sociedades ---
export const societiesApi = {
  list: () => apiFetch<{ data: any[] }>("/societies"),
  get: (id: string) => apiFetch<{ data: any }>(`/societies/${id}`),
  create: (body: any) =>
    apiFetch<{ data: any }>("/societies", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// --- Motor Financiero ---
export const financialApi = {
  createRecord: (body: any, autoJournal = false) =>
    apiFetch<{ data: any; journal_entries_created?: number }>(
      `/financial/records${autoJournal ? "?auto_journal=true" : ""}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),
  listRecords: (societyId: string) =>
    apiFetch<{ data: any[] }>(`/financial/records/${societyId}`),
  getCascade: (societyId: string, year: number, month: number) =>
    apiFetch<any>(`/financial/cascade/${societyId}/${year}/${month}`),
  getRatios: (societyId: string, year: number, month: number) =>
    apiFetch<any>(`/financial/ratios/${societyId}/${year}/${month}`),
  getBreakeven: (
    societyId: string,
    year: number,
    month: number,
    targetProfit = 0
  ) =>
    apiFetch<any>(
      `/financial/breakeven/${societyId}/${year}/${month}?target_profit=${targetProfit}`
    ),
  getDiagnosis: (societyId: string, year: number, month: number) =>
    apiFetch<any>(`/financial/diagnosis/${societyId}/${year}/${month}`),
  getValuation: (
    societyId: string,
    year: number,
    month: number,
    multiple = 3.0
  ) =>
    apiFetch<any>(
      `/financial/valuation/${societyId}/${year}/${month}?multiple=${multiple}`
    ),
};

// --- NLP (Lenguaje Natural) ---
export const nlpApi = {
  interpret: (query: string, societyId: string) =>
    apiFetch<any>("/nlp/interpret", {
      method: "POST",
      body: JSON.stringify({ query, society_id: societyId }),
    }),

  /** Chat conversacional con GPT-4o como motor inteligente */
  chat: (
    query: string,
    societyId: string,
    systemPrompt: string,
    history: { role: string; content: string }[] = []
  ) =>
    apiFetch<{
      reply: string;
      action?: string;
      data?: any;
      source: string;
    }>("/nlp/chat", {
      method: "POST",
      body: JSON.stringify({
        query,
        society_id: societyId,
        system_prompt: systemPrompt,
        history,
      }),
    }),
};

// --- Nómina ---
export const payrollApi = {
  // Empleados
  createEmployee: (body: any) =>
    apiFetch<{ data: any }>("/payroll/employees", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listEmployees: (societyId: string, activeOnly = true) =>
    apiFetch<{ data: any[] }>(
      `/payroll/employees/${societyId}?active_only=${activeOnly}`
    ),
  getEmployee: (societyId: string, employeeId: string) =>
    apiFetch<{ data: any }>(`/payroll/employees/${societyId}/${employeeId}`),
  updateEmployee: (societyId: string, employeeId: string, body: any) =>
    apiFetch<{ data: any }>(`/payroll/employees/${societyId}/${employeeId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteEmployee: (societyId: string, employeeId: string) =>
    apiFetch<{ success: boolean }>(
      `/payroll/employees/${societyId}/${employeeId}`,
      { method: "DELETE" }
    ),

  // Nómina total
  getTotal: (societyId: string) =>
    apiFetch<any>(`/payroll/total/${societyId}`),

  // Asistencia
  createAttendance: (body: any) =>
    apiFetch<{ data: any }>("/payroll/attendance", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listAttendance: (societyId: string, employeeId?: string) =>
    apiFetch<{ data: any[] }>(
      `/payroll/attendance/${societyId}${employeeId ? `?employee_id=${employeeId}` : ""}`
    ),

  // XIII Mes
  getXIIIMes: (societyId: string, monthsInTercio: number) =>
    apiFetch<any>(
      `/payroll/xiii-mes/${societyId}?months_in_tercio=${monthsInTercio}`
    ),

  // Liquidación
  calculateLiquidacion: (
    societyId: string,
    employeeId: string,
    exitReason: string,
    monthsCurrentTercio = 0
  ) =>
    apiFetch<any>(
      `/payroll/liquidacion/${societyId}/${employeeId}?exit_reason=${exitReason}&months_current_tercio=${monthsCurrentTercio}`,
      { method: "POST" }
    ),

  // KPI Ausentismo
  getAbsenteeismKPI: (societyId: string, year = 2026, month = 1) =>
    apiFetch<any>(
      `/payroll/kpi/absenteeism/${societyId}?period_year=${year}&period_month=${month}`
    ),
};

// --- Contabilidad ---
export const accountingApi = {
  // Plan de Cuentas
  initializeChart: (societyId: string) =>
    apiFetch<{ success: boolean; accounts_created: number }>(
      `/accounting/chart/initialize/${societyId}`,
      { method: "POST" }
    ),
  listChart: (societyId: string, activeOnly = true) =>
    apiFetch<{ data: any[] }>(
      `/accounting/chart/${societyId}?active_only=${activeOnly}`
    ),
  createAccount: (body: any) =>
    apiFetch<{ success: boolean; data: any }>("/accounting/chart", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAccount: (societyId: string, accountCode: string, body: any) =>
    apiFetch<{ success: boolean; data: any }>(
      `/accounting/chart/${societyId}/${accountCode}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),

  // Libro Diario
  createJournalEntry: (body: any) =>
    apiFetch<{ success: boolean; data: any }>("/accounting/journal", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listJournalEntries: (
    societyId: string,
    periodYear?: number,
    periodMonth?: number,
    limit = 50
  ) => {
    let url = `/accounting/journal/${societyId}?limit=${limit}`;
    if (periodYear) url += `&period_year=${periodYear}`;
    if (periodMonth) url += `&period_month=${periodMonth}`;
    return apiFetch<{ data: any[] }>(url);
  },
  getJournalEntry: (societyId: string, entryId: string) =>
    apiFetch<{ data: any }>(`/accounting/journal/${societyId}/${entryId}`),
  deleteJournalEntry: (societyId: string, entryId: string) =>
    apiFetch<{ success: boolean }>(
      `/accounting/journal/${societyId}/${entryId}`,
      { method: "DELETE" }
    ),

  // Libro Mayor
  getLedger: (
    societyId: string,
    accountCode: string,
    periodYear?: number,
    periodMonth?: number
  ) => {
    let url = `/accounting/ledger/${societyId}/${accountCode}`;
    const params: string[] = [];
    if (periodYear) params.push(`period_year=${periodYear}`);
    if (periodMonth) params.push(`period_month=${periodMonth}`);
    if (params.length) url += `?${params.join("&")}`;
    return apiFetch<{ data: any }>(url);
  },

  // Balance de Comprobacion
  getTrialBalance: (
    societyId: string,
    periodYear?: number,
    periodMonth?: number
  ) => {
    let url = `/accounting/trial-balance/${societyId}`;
    const params: string[] = [];
    if (periodYear) params.push(`period_year=${periodYear}`);
    if (periodMonth) params.push(`period_month=${periodMonth}`);
    if (params.length) url += `?${params.join("&")}`;
    return apiFetch<{ data: any }>(url);
  },

  // Periodos
  listPeriods: (societyId: string) =>
    apiFetch<{ data: any[] }>(`/accounting/periods/${societyId}`),
  closePeriod: (societyId: string, periodYear: number, periodMonth: number) =>
    apiFetch<{ success: boolean }>("/accounting/periods/close", {
      method: "POST",
      body: JSON.stringify({
        society_id: societyId,
        period_year: periodYear,
        period_month: periodMonth,
      }),
    }),
  reopenPeriod: (societyId: string, periodYear: number, periodMonth: number, adminCode: string) =>
    apiFetch<{ success: boolean }>("/accounting/periods/reopen", {
      method: "POST",
      body: JSON.stringify({
        society_id: societyId,
        period_year: periodYear,
        period_month: periodMonth,
      }),
      headers: { "x-admin-code": adminCode },
    }),
};

// --- Auditoría ---
export const auditApi = {
  getLogs: (limit = 50) => apiFetch<{ data: any[] }>(`/audit/logs?limit=${limit}`),
  getFinancialHistory: (recordId: string) =>
    apiFetch<{ data: any[] }>(`/audit/logs/financial/${recordId}`),
  getNlpHistory: () => apiFetch<{ data: any[] }>("/audit/logs/nlp"),
};

// --- Multi-Periodo (Fase 10) ---
export const multiperiodApi = {
  getTrends: (
    societyId: string,
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number
  ) =>
    apiFetch<any>(
      `/financial/trends/${societyId}?from_year=${fromYear}&from_month=${fromMonth}&to_year=${toYear}&to_month=${toMonth}`
    ),
  getComparison: (
    societyId: string,
    year1: number,
    month1: number,
    year2: number,
    month2: number
  ) =>
    apiFetch<any>(
      `/financial/comparison/${societyId}/${year1}/${month1}/${year2}/${month2}`
    ),
  getForecast: (societyId: string, monthsAhead = 6) =>
    apiFetch<any>(
      `/financial/forecast/${societyId}?months_ahead=${monthsAhead}`
    ),
  getBudgetVsActual: (societyId: string, year: number, month: number) =>
    apiFetch<any>(`/financial/budget-vs-actual/${societyId}/${year}/${month}`),
};

// --- Presupuesto (Fase 10) ---
export const budgetApi = {
  createOrUpdate: (body: any) =>
    apiFetch<{ success: boolean; data: any; action: string }>(
      "/budget/targets",
      { method: "POST", body: JSON.stringify(body) }
    ),
  list: (societyId: string, periodYear?: number) => {
    let url = `/budget/targets/${societyId}`;
    if (periodYear) url += `?period_year=${periodYear}`;
    return apiFetch<{ data: any[] }>(url);
  },
  get: (societyId: string, year: number, month: number) =>
    apiFetch<{ data: any }>(
      `/budget/targets/${societyId}/${year}/${month}`
    ),
  update: (targetId: string, body: any) =>
    apiFetch<{ success: boolean; data: any }>(
      `/budget/targets/${targetId}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  delete: (targetId: string) =>
    apiFetch<{ success: boolean }>(`/budget/targets/${targetId}`, {
      method: "DELETE",
    }),
};

// --- Inteligencia Artificial (Vision, Whisper, Data Merging) ---
export const aiApi = {
  /** Escanear factura con GPT-4o Vision */
  scanReceipt: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      } else if (IS_DEMO_MODE) {
        headers["x-user-id"] = "demo-user-001";
      }
    } catch {
      if (IS_DEMO_MODE) headers["x-user-id"] = "demo-user-001";
    }

    const res = await fetch(`${API_BASE}/ai/scan-receipt`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      if (IS_DEMO_MODE) return { status: "demo", data: null };
      const err = await res.json().catch(() => ({ detail: "Error de OCR" }));
      throw new Error(err.detail);
    }
    return res.json();
  },

  /** Transcribir audio con Whisper + GPT-4o intent extraction */
  voiceExpense: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      } else if (IS_DEMO_MODE) {
        headers["x-user-id"] = "demo-user-001";
      }
    } catch {
      if (IS_DEMO_MODE) headers["x-user-id"] = "demo-user-001";
    }

    const res = await fetch(`${API_BASE}/ai/voice-expense`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      if (IS_DEMO_MODE) return { status: "demo", data: null };
      const err = await res.json().catch(() => ({ detail: "Error de voz" }));
      throw new Error(err.detail);
    }
    return res.json();
  },

  /** Simplificar texto legal con GPT-4o */
  simplifyLegal: (text: string, context = "contrato de sociedad anonima en Panama") =>
    apiFetch<{ data: { simple: string; riesgo: "bajo" | "medio" | "alto"; emoji: string; tip: string } }>("/ai/simplify-legal", {
      method: "POST",
      body: JSON.stringify({ text, context }),
    }),

  /** Data Merging: fusionar datos de factura + voz en un solo registro */
  mergeTransaction: (body: {
    receipt_data?: any;
    voice_data?: any;
    voice_transcript?: string;
    society_id?: string;
  }) =>
    apiFetch<any>("/ai/merge-transaction", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Deduplication: verificar si una transaccion ya fue registrada */
  checkDuplicate: (fingerprint: string, societyId: string) =>
    apiFetch<any>("/ai/check-duplicate", {
      method: "POST",
      body: JSON.stringify({ fingerprint, society_id: societyId }),
    }),
};

// --- Reportes Ejecutivos (Fase 11) ---
export const reportsApi = {
  // PDF downloads
  downloadEstadoResultados: (societyId: string, year: number, month: number) =>
    apiFetchBlob(
      `/reports/estado-resultados/${societyId}?period_year=${year}&period_month=${month}`
    ),
  downloadBalanceGeneral: (societyId: string, year: number, month: number) =>
    apiFetchBlob(
      `/reports/balance-general/${societyId}?period_year=${year}&period_month=${month}`
    ),
  downloadFlujoCaja: (societyId: string, monthsAhead = 6) =>
    apiFetchBlob(
      `/reports/flujo-caja/${societyId}?months_ahead=${monthsAhead}`
    ),
  downloadResumenEjecutivo: (societyId: string, year: number, month: number) =>
    apiFetchBlob(
      `/reports/resumen-ejecutivo/${societyId}?period_year=${year}&period_month=${month}`
    ),

  // CSV exports
  downloadCsvCascada: (societyId: string, year: number, month: number) =>
    apiFetchBlob(
      `/reports/export-csv/${societyId}/cascada?period_year=${year}&period_month=${month}`
    ),
  downloadCsvTrends: (
    societyId: string,
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number
  ) =>
    apiFetchBlob(
      `/reports/export-csv/${societyId}/trends?from_year=${fromYear}&from_month=${fromMonth}&to_year=${toYear}&to_month=${toMonth}`
    ),
  downloadCsvComparison: (
    societyId: string,
    year1: number,
    month1: number,
    year2: number,
    month2: number
  ) =>
    apiFetchBlob(
      `/reports/export-csv/${societyId}/comparison?year1=${year1}&month1=${month1}&year2=${year2}&month2=${month2}`
    ),
  downloadCsvBudgetVariance: (societyId: string, year: number, month: number) =>
    apiFetchBlob(
      `/reports/export-csv/${societyId}/budget_variance?period_year=${year}&period_month=${month}`
    ),

  // Report history
  getHistory: (societyId: string, limit = 20) =>
    apiFetch<{ data: any[] }>(`/reports/history/${societyId}?limit=${limit}`),

  // Email reports
  emailReport: (
    societyId: string,
    reportType: string,
    year: number,
    month: number,
    recipients: string
  ) =>
    apiFetch<{ success: boolean; message: string }>(
      `/reports/email/${societyId}?report_type=${reportType}&period_year=${year}&period_month=${month}&recipients=${encodeURIComponent(recipients)}`,
      { method: "POST" }
    ),
};
