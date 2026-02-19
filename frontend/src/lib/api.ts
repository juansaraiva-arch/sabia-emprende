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
