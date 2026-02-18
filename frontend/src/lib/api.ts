/**
 * Cliente API para comunicarse con el backend FastAPI.
 * Next.js redirige /api/* al backend via rewrites en next.config.ts.
 */

const API_BASE = "/api";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const userId = "demo-user-001"; // TODO: Reemplazar con auth real

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Error en la API");
  }

  return res.json();
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
  createRecord: (body: any) =>
    apiFetch<{ data: any }>("/financial/records", {
      method: "POST",
      body: JSON.stringify(body),
    }),
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
};

// --- Auditoría ---
export const auditApi = {
  getLogs: (limit = 50) => apiFetch<{ data: any[] }>(`/audit/logs?limit=${limit}`),
  getFinancialHistory: (recordId: string) =>
    apiFetch<{ data: any[] }>(`/audit/logs/financial/${recordId}`),
  getNlpHistory: () => apiFetch<{ data: any[] }>("/audit/logs/nlp"),
};
