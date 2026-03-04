/**
 * DGI Form Mappings — Espejo DGI
 *
 * Maps the DEFAULT_PANAMA_CHART accounts to official DGI form fields.
 * Form 430: Declaracion Jurada del ITBMS (trimestral)
 * Form 03:  Declaracion de Rentas (anual) para S.E. / Persona Juridica
 *
 * This module is "Tax Preparation" only — it pre-fills form values
 * for the user to manually transcribe into e-Tax 2.0.
 */

// ============================================
// TYPES
// ============================================

export interface DGIFormField {
  /** Casilla number as it appears on the DGI form */
  casilla: string;
  /** Label as it appears on the DGI form */
  label: string;
  /** Account codes from DEFAULT_PANAMA_CHART that feed this field */
  accountCodes: string[];
  /** How to aggregate: "sum_debe" | "sum_haber" | "net" (debe - haber) | "formula" */
  aggregation: "sum_debe" | "sum_haber" | "net" | "formula";
  /** For formula fields: function that computes from other casillas */
  formula?: (values: Record<string, number>) => number;
  /** Whether this is a calculated subtotal (not directly from accounts) */
  isSubtotal?: boolean;
  /** Section grouping within the form */
  section: string;
  /** Tooltip / help text for the user */
  helpText?: string;
}

export interface DGIFormDefinition {
  formId: string;
  formName: string;
  formDescription: string;
  /** "monthly" | "quarterly" | "annual" */
  frequency: "monthly" | "quarterly" | "annual";
  /** DGI due date rule */
  dueDateRule: string;
  fields: DGIFormField[];
}

export interface AccountBalance {
  account_code: string;
  account_name: string;
  total_debe: number;
  total_haber: number;
  saldo_debe: number;
  saldo_haber: number;
}

export interface ComputedFormResult {
  formId: string;
  formName: string;
  period: string;
  fields: { casilla: string; label: string; section: string; value: number; helpText?: string }[];
  validations: FormValidation[];
  generatedAt: string;
}

export interface FormValidation {
  type: "ok" | "warning" | "error";
  message: string;
}

// ============================================
// FORM 430 — DECLARACION JURADA DEL ITBMS
// ============================================

export const FORM_430: DGIFormDefinition = {
  formId: "430",
  formName: "Declaracion Jurada del ITBMS",
  formDescription:
    "Formulario trimestral (o mensual si ventas > B/. 36,000/ano) para declarar el Impuesto de Transferencia de Bienes Muebles y Servicios.",
  frequency: "quarterly",
  dueDateRule: "15 del mes siguiente al cierre del trimestre",
  fields: [
    // === SECCION: VENTAS E INGRESOS ===
    {
      casilla: "40",
      label: "Ventas Gravadas (bienes y servicios)",
      accountCodes: ["4.1.1", "4.2.1"],
      aggregation: "sum_haber",
      section: "Ingresos Gravados",
      helpText: "Total de ingresos por ventas y servicios sujetos al ITBMS 7%",
    },
    {
      casilla: "41",
      label: "Otros Ingresos Gravados",
      accountCodes: ["4.3.1"],
      aggregation: "sum_haber",
      section: "Ingresos Gravados",
      helpText: "Otros ingresos sujetos a ITBMS",
    },
    {
      casilla: "42",
      label: "(-) Descuentos y Devoluciones sobre Ventas",
      accountCodes: ["4.4.1", "4.5.1"],
      aggregation: "sum_debe",
      section: "Ingresos Gravados",
      helpText: "Descuentos y devoluciones que reducen la base gravable",
    },
    {
      casilla: "43",
      label: "Base Imponible (Ventas Netas Gravadas)",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) => (v["40"] || 0) + (v["41"] || 0) - (v["42"] || 0),
      isSubtotal: true,
      section: "Ingresos Gravados",
      helpText: "Casilla 40 + 41 - 42",
    },

    // === SECCION: CALCULO DEL ITBMS ===
    {
      casilla: "50",
      label: "ITBMS Causado (Debito Fiscal) — 7%",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) => (v["43"] || 0) * 0.07,
      isSubtotal: true,
      section: "Calculo del ITBMS",
      helpText: "Base Imponible × 7%. Debe coincidir con cuenta 2.1.02",
    },
    {
      casilla: "51",
      label: "(-) Credito Fiscal (ITBMS pagado en compras)",
      accountCodes: ["1.1.07"],
      aggregation: "sum_debe",
      section: "Calculo del ITBMS",
      helpText: "ITBMS que pagaste a tus proveedores — cuenta 1.1.07",
    },
    {
      casilla: "52",
      label: "ITBMS Neto a Pagar (o a Favor)",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) => (v["50"] || 0) - (v["51"] || 0),
      isSubtotal: true,
      section: "Calculo del ITBMS",
      helpText: "Casilla 50 - 51. Positivo = a pagar, Negativo = credito a favor",
    },

    // === SECCION: INFORMATIVA (COMPRAS) ===
    {
      casilla: "60",
      label: "Total Compras del Periodo",
      accountCodes: ["5.1.1", "5.1.2"],
      aggregation: "sum_debe",
      section: "Datos Informativos (Compras)",
      helpText: "Total de compras realizadas en el periodo (informativo)",
    },
  ],
};

// ============================================
// FORM 03 — DECLARACION DE RENTAS (Anual)
// ============================================

export const FORM_03: DGIFormDefinition = {
  formId: "03",
  formName: "Declaracion de Rentas (ISR)",
  formDescription:
    "Formulario anual de Impuesto sobre la Renta. Para persona juridica (S.E.) la tasa es 25% sobre la utilidad neta gravable.",
  frequency: "annual",
  dueDateRule: "30 de marzo del ano siguiente al periodo fiscal",
  fields: [
    // === SECCION: INGRESOS ===
    {
      casilla: "10",
      label: "Ingresos por Ventas de Bienes",
      accountCodes: ["4.1.1"],
      aggregation: "sum_haber",
      section: "Ingresos",
      helpText: "Cuenta 4.1.1 — Ingresos por Ventas",
    },
    {
      casilla: "11",
      label: "Ingresos por Servicios Prestados",
      accountCodes: ["4.2.1"],
      aggregation: "sum_haber",
      section: "Ingresos",
      helpText: "Cuenta 4.2.1 — Ingresos por Servicios",
    },
    {
      casilla: "12",
      label: "Otros Ingresos",
      accountCodes: ["4.3.1"],
      aggregation: "sum_haber",
      section: "Ingresos",
      helpText: "Cuenta 4.3.1 — Otros Ingresos",
    },
    {
      casilla: "13",
      label: "(-) Descuentos y Devoluciones",
      accountCodes: ["4.4.1", "4.5.1"],
      aggregation: "sum_debe",
      section: "Ingresos",
      helpText: "Cuentas 4.4.1 + 4.5.1",
    },
    {
      casilla: "14",
      label: "Ingresos Brutos",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) =>
        (v["10"] || 0) + (v["11"] || 0) + (v["12"] || 0) - (v["13"] || 0),
      isSubtotal: true,
      section: "Ingresos",
      helpText: "Casillas 10 + 11 + 12 - 13",
    },

    // === SECCION: COSTO DE VENTAS ===
    {
      casilla: "20",
      label: "Compras de Mercancia",
      accountCodes: ["5.1.1"],
      aggregation: "sum_debe",
      section: "Costo de Ventas",
      helpText: "Cuenta 5.1.1",
    },
    {
      casilla: "21",
      label: "Fletes y Gastos de Importacion",
      accountCodes: ["5.1.2"],
      aggregation: "sum_debe",
      section: "Costo de Ventas",
      helpText: "Cuenta 5.1.2",
    },
    {
      casilla: "22",
      label: "Total Costo de Ventas",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) => (v["20"] || 0) + (v["21"] || 0),
      isSubtotal: true,
      section: "Costo de Ventas",
      helpText: "Casillas 20 + 21",
    },

    // === SECCION: UTILIDAD BRUTA ===
    {
      casilla: "25",
      label: "Utilidad Bruta",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) => (v["14"] || 0) - (v["22"] || 0),
      isSubtotal: true,
      section: "Utilidad Bruta",
      helpText: "Ingresos Brutos - Costo de Ventas (Casilla 14 - 22)",
    },

    // === SECCION: GASTOS DE OPERACION ===
    {
      casilla: "30",
      label: "Sueldos, Salarios y Prestaciones Laborales",
      accountCodes: ["5.2.01", "5.2.02", "5.2.03", "5.2.04"],
      aggregation: "sum_debe",
      section: "Gastos de Operacion",
      helpText: "Sueldos + CSS Patronal + Seguro Educativo + XIII Mes",
    },
    {
      casilla: "31",
      label: "Alquiler de Local Comercial",
      accountCodes: ["5.2.05"],
      aggregation: "sum_debe",
      section: "Gastos de Operacion",
      helpText: "Cuenta 5.2.05",
    },
    {
      casilla: "32",
      label: "Servicios Publicos (Agua, Luz, Internet, Telefono)",
      accountCodes: ["5.2.06"],
      aggregation: "sum_debe",
      section: "Gastos de Operacion",
      helpText: "Cuenta 5.2.06",
    },
    {
      casilla: "33",
      label: "Honorarios Profesionales",
      accountCodes: ["5.2.07"],
      aggregation: "sum_debe",
      section: "Gastos de Operacion",
      helpText: "Cuenta 5.2.07 — Contadores, abogados, consultores",
    },
    {
      casilla: "34",
      label: "Depreciacion de Activos Fijos",
      accountCodes: ["5.2.08"],
      aggregation: "sum_debe",
      section: "Gastos de Operacion",
      helpText: "Cuenta 5.2.08",
    },
    {
      casilla: "35",
      label: "Publicidad y Marketing",
      accountCodes: ["5.2.09"],
      aggregation: "sum_debe",
      section: "Gastos de Operacion",
      helpText: "Cuenta 5.2.09",
    },
    {
      casilla: "36",
      label: "Seguros",
      accountCodes: ["5.2.10"],
      aggregation: "sum_debe",
      section: "Gastos de Operacion",
      helpText: "Cuenta 5.2.10",
    },
    {
      casilla: "37",
      label: "Gastos Legales y Notariales",
      accountCodes: ["5.2.11"],
      aggregation: "sum_debe",
      section: "Gastos de Operacion",
      helpText: "Cuenta 5.2.11",
    },
    {
      casilla: "38",
      label: "Suministros de Oficina",
      accountCodes: ["5.2.12"],
      aggregation: "sum_debe",
      section: "Gastos de Operacion",
      helpText: "Cuenta 5.2.12",
    },
    {
      casilla: "39",
      label: "Total Gastos de Operacion",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) =>
        (v["30"] || 0) +
        (v["31"] || 0) +
        (v["32"] || 0) +
        (v["33"] || 0) +
        (v["34"] || 0) +
        (v["35"] || 0) +
        (v["36"] || 0) +
        (v["37"] || 0) +
        (v["38"] || 0),
      isSubtotal: true,
      section: "Gastos de Operacion",
      helpText: "Suma de casillas 30 a 38",
    },

    // === SECCION: GASTOS FINANCIEROS ===
    {
      casilla: "44",
      label: "Intereses Bancarios",
      accountCodes: ["5.3.01"],
      aggregation: "sum_debe",
      section: "Gastos Financieros",
      helpText: "Cuenta 5.3.01",
    },
    {
      casilla: "45",
      label: "Comisiones Bancarias",
      accountCodes: ["5.3.02"],
      aggregation: "sum_debe",
      section: "Gastos Financieros",
      helpText: "Cuenta 5.3.02",
    },
    {
      casilla: "46",
      label: "Total Gastos Financieros",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) => (v["44"] || 0) + (v["45"] || 0),
      isSubtotal: true,
      section: "Gastos Financieros",
      helpText: "Casilla 44 + 45",
    },

    // === SECCION: RESULTADO FISCAL ===
    {
      casilla: "55",
      label: "Utilidad Neta Gravable",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) => (v["25"] || 0) - (v["39"] || 0) - (v["46"] || 0),
      isSubtotal: true,
      section: "Resultado Fiscal",
      helpText: "Utilidad Bruta - Gastos Operacion - Gastos Financieros",
    },
    {
      casilla: "56",
      label: "ISR a Pagar (25% Persona Juridica)",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) => Math.max(0, (v["55"] || 0) * 0.25),
      isSubtotal: true,
      section: "Resultado Fiscal",
      helpText:
        "25% sobre la Utilidad Neta Gravable. Si hay perdida, ISR = 0. Debe coincidir con cuenta 2.1.03",
    },
  ],
};

// ============================================
// COMPUTATION ENGINE
// ============================================

/**
 * Computes form field values from account balances.
 *
 * @param form - The DGI form definition
 * @param balances - Array of account balances (from Balance de Comprobacion)
 * @returns Computed form values + validations
 */
export function computeFormValues(
  form: DGIFormDefinition,
  balances: AccountBalance[],
  periodLabel: string
): ComputedFormResult {
  // Index balances by account_code for fast lookup
  const balanceMap = new Map<string, AccountBalance>();
  for (const b of balances) {
    balanceMap.set(b.account_code, b);
  }

  // First pass: compute account-based fields
  const values: Record<string, number> = {};

  for (const field of form.fields) {
    if (field.aggregation !== "formula") {
      let total = 0;
      for (const code of field.accountCodes) {
        const bal = balanceMap.get(code);
        if (bal) {
          if (field.aggregation === "sum_debe") {
            total += bal.total_debe;
          } else if (field.aggregation === "sum_haber") {
            total += bal.total_haber;
          } else if (field.aggregation === "net") {
            total += bal.total_debe - bal.total_haber;
          }
        }
      }
      values[field.casilla] = total;
    }
  }

  // Second pass: compute formula fields (in order, so dependencies resolve)
  for (const field of form.fields) {
    if (field.aggregation === "formula" && field.formula) {
      values[field.casilla] = field.formula(values);
    }
  }

  // Build result
  const fields = form.fields.map((f) => ({
    casilla: f.casilla,
    label: f.label,
    section: f.section,
    value: Math.round((values[f.casilla] || 0) * 100) / 100,
    helpText: f.helpText,
  }));

  // Validations
  const validations: FormValidation[] = [];

  if (form.formId === "430") {
    // Check ITBMS coherence
    const itbmsPorPagar = balanceMap.get("2.1.02");
    const itbmsCausado = values["50"] || 0;
    if (itbmsPorPagar) {
      const diff = Math.abs(itbmsCausado - itbmsPorPagar.saldo_haber);
      if (diff > itbmsCausado * 0.01 && itbmsCausado > 0) {
        validations.push({
          type: "warning",
          message: `ITBMS Causado (B/. ${itbmsCausado.toFixed(2)}) difiere de la cuenta 2.1.02 (B/. ${itbmsPorPagar.saldo_haber.toFixed(2)}). Revisa los asientos.`,
        });
      }
    }

    // Check zero sales
    if ((values["43"] || 0) === 0) {
      validations.push({
        type: "warning",
        message: "No hay ventas gravadas en este periodo. Verifica que hayas registrado ingresos.",
      });
    }
  }

  if (form.formId === "03") {
    // Check ISR coherence
    const isrPorPagar = balanceMap.get("2.1.03");
    const isrCalculado = values["56"] || 0;
    if (isrPorPagar && isrCalculado > 0) {
      const diff = Math.abs(isrCalculado - isrPorPagar.saldo_haber);
      if (diff > isrCalculado * 0.01) {
        validations.push({
          type: "warning",
          message: `ISR calculado (B/. ${isrCalculado.toFixed(2)}) difiere de cuenta 2.1.03 (B/. ${isrPorPagar.saldo_haber.toFixed(2)}). Revisa los asientos.`,
        });
      }
    }

    // Check zero revenue
    if ((values["14"] || 0) === 0) {
      validations.push({
        type: "warning",
        message: "No hay ingresos registrados en el periodo fiscal. Verifica los datos.",
      });
    }

    // Check negative taxable income
    if ((values["55"] || 0) < 0) {
      validations.push({
        type: "ok",
        message: `Resultado fiscal: Perdida de B/. ${Math.abs(values["55"]).toFixed(2)}. No hay ISR a pagar.`,
      });
    }
  }

  // General: check if there are any balances at all
  const hasAnyBalance = balances.some(
    (b) => b.total_debe > 0 || b.total_haber > 0
  );
  if (!hasAnyBalance) {
    validations.push({
      type: "error",
      message: "No hay movimientos contables registrados. Ingresa datos en el Libro Diario primero.",
    });
  }

  // Check balance cuadrado
  const totalDebe = balances.reduce((s, b) => s + b.total_debe, 0);
  const totalHaber = balances.reduce((s, b) => s + b.total_haber, 0);
  if (Math.abs(totalDebe - totalHaber) > 0.01 && hasAnyBalance) {
    validations.push({
      type: "error",
      message: `Balance NO cuadra: Debe B/. ${totalDebe.toFixed(2)} ≠ Haber B/. ${totalHaber.toFixed(2)}. Corrige antes de exportar.`,
    });
  }

  if (
    hasAnyBalance &&
    Math.abs(totalDebe - totalHaber) < 0.01 &&
    validations.filter((v) => v.type === "error").length === 0
  ) {
    validations.unshift({
      type: "ok",
      message: "Balance cuadrado correctamente. Datos listos para transcribir a e-Tax 2.0.",
    });
  }

  return {
    formId: form.formId,
    formName: form.formName,
    period: periodLabel,
    fields,
    validations,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================
// DGI TAX CALENDAR — Compliance Alerts
// ============================================

export interface DGIDeadline {
  id: string;
  formId: string;
  formName: string;
  period: string;
  dueDate: Date;
  description: string;
  /** "pending" | "filed" | "overdue" */
  status: "pending" | "filed" | "overdue";
}

/**
 * Generates the DGI tax calendar for a given year.
 * Includes ITBMS quarterly + ISR annual.
 */
export function getDGICalendar(year: number): DGIDeadline[] {
  const now = new Date();
  const deadlines: DGIDeadline[] = [];

  // ITBMS Quarterly (due 15th of month after quarter end)
  const quarters = [
    { q: "Q1", months: "Ene-Mar", dueMonth: 3, dueDay: 15 },
    { q: "Q2", months: "Abr-Jun", dueMonth: 6, dueDay: 15 },
    { q: "Q3", months: "Jul-Sep", dueMonth: 9, dueDay: 15 },
    { q: "Q4", months: "Oct-Dic", dueMonth: 0, dueDay: 15 }, // January next year
  ];

  for (const qt of quarters) {
    const dueYear = qt.q === "Q4" ? year + 1 : year;
    const dueDate = new Date(dueYear, qt.dueMonth, qt.dueDay);
    const status: "pending" | "filed" | "overdue" =
      dueDate < now ? "overdue" : "pending";

    deadlines.push({
      id: `itbms-${year}-${qt.q}`,
      formId: "430",
      formName: "ITBMS",
      period: `${qt.q} ${year} (${qt.months})`,
      dueDate,
      description: `Declaracion ITBMS trimestral — ${qt.months} ${year}`,
      status,
    });
  }

  // ISR Annual (due March 30 of next year)
  const isrDue = new Date(year + 1, 2, 30);
  deadlines.push({
    id: `isr-${year}`,
    formId: "03",
    formName: "Renta (ISR)",
    period: `Ano Fiscal ${year}`,
    dueDate: isrDue,
    description: `Declaracion de Impuesto sobre la Renta — Ano fiscal ${year}`,
    status: isrDue < now ? "overdue" : "pending",
  });

  return deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

/**
 * Mark a deadline as filed (persisted in localStorage)
 */
export function markAsFiled(deadlineId: string): void {
  const key = "midf_dgi_filed";
  const filed = JSON.parse(localStorage.getItem(key) || "{}");
  filed[deadlineId] = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(filed));
}

/**
 * Get filed status for all deadlines
 */
export function getFiledStatuses(): Record<string, string> {
  const key = "midf_dgi_filed";
  return JSON.parse(localStorage.getItem(key) || "{}");
}
