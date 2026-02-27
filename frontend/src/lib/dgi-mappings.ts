/**
 * DGI Form Mappings — Espejo de Declaracion de Renta
 *
 * Maps the DEFAULT_PANAMA_CHART accounts to official DGI form fields.
 * Form 430: Declaracion Jurada del ITBMS (trimestral)
 * Form 03:  Declaracion Jurada de Renta Anual para S.E. / Persona Juridica
 *
 * Casilla numbers match the forms shown in e-Tax 2.0 (DGI Panama).
 * This module is "Tax Preparation" only — it pre-fills form values
 * for the user to manually transcribe into e-Tax 2.0.
 */

import type { FinancialRecord } from "./calculations";

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
// Casillas alineadas con formulario e-Tax 2.0
// ============================================

export const FORM_430: DGIFormDefinition = {
  formId: "430",
  formName: "Declaracion Jurada del ITBMS",
  formDescription:
    "Formulario trimestral (o mensual si ventas > B/. 36,000/ano) para declarar el Impuesto de Transferencia de Bienes Muebles y Servicios.",
  frequency: "quarterly",
  dueDateRule: "15 del mes siguiente al cierre del trimestre",
  fields: [
    // === SECCION: INGRESOS GRAVADOS ===
    {
      casilla: "10",
      label: "Ingresos Gravados por Ventas y Servicios",
      accountCodes: ["4.1", "4.2"],
      aggregation: "sum_haber",
      section: "Ingresos Gravados",
      helpText: "Total de ventas y servicios sujetos al ITBMS 7% (Cuentas 4.1 + 4.2)",
    },

    // === SECCION: COMPRAS Y GASTOS ===
    {
      casilla: "30",
      label: "Compras y Gastos Gravados con ITBMS",
      accountCodes: ["5.1.01", "5.1.02", "5.2.05", "5.2.06", "5.2.07", "5.2.09", "5.2.10", "5.2.11", "5.2.12"],
      aggregation: "sum_debe",
      section: "Compras y Gastos",
      helpText: "Total de compras y gastos operativos sujetos al ITBMS (excluye nomina y CSS que son exentos)",
    },

    // === SECCION: LIQUIDACION DEL ITBMS ===
    {
      casilla: "45",
      label: "Saldo Neto a Pagar",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) => Math.max(0, (v["10"] || 0) * 0.07 - (v["30"] || 0) * 0.07),
      isSubtotal: true,
      section: "Liquidacion del ITBMS",
      helpText: "ITBMS Debito (7% de ventas) menos ITBMS Credito (7% de compras). Si es positivo, es la cantidad a pagar a la DGI.",
    },
    {
      casilla: "50",
      label: "Credito Fiscal a Favor",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) => Math.max(0, (v["30"] || 0) * 0.07 - (v["10"] || 0) * 0.07),
      isSubtotal: true,
      section: "Liquidacion del ITBMS",
      helpText: "Si el credito fiscal (ITBMS en compras) supera el debito fiscal (ITBMS en ventas), queda un saldo a tu favor.",
    },
  ],
};

// ============================================
// FORM 03 — DECLARACION JURADA DE RENTA ANUAL
// Casillas alineadas con formulario e-Tax 2.0
// ============================================

export const FORM_03: DGIFormDefinition = {
  formId: "03",
  formName: "Declaracion Jurada de Renta Anual",
  formDescription:
    "Formulario anual de Impuesto sobre la Renta. Para persona juridica (S.E.) la tasa es 25% sobre la utilidad neta gravable.",
  frequency: "annual",
  dueDateRule: "30 de marzo del ano siguiente al periodo fiscal",
  fields: [
    // === SECCION: INGRESOS ===
    {
      casilla: "15",
      label: "Ingresos Brutos Anuales",
      accountCodes: ["4.1", "4.2", "4.3"],
      aggregation: "sum_haber",
      section: "Ingresos",
      helpText: "Total de ingresos por ventas, servicios y otros (Cuentas 4.1 + 4.2 + 4.3) neto de devoluciones",
    },

    // === SECCION: GASTOS DEDUCIBLES ===
    {
      casilla: "30",
      label: "Total de Gastos Deducibles",
      accountCodes: [
        "5.1.01", "5.1.02",
        "5.2.01", "5.2.02", "5.2.03", "5.2.04",
        "5.2.05", "5.2.06", "5.2.07", "5.2.08",
        "5.2.09", "5.2.10", "5.2.11", "5.2.12",
        "5.3.01", "5.3.02",
      ],
      aggregation: "sum_debe",
      section: "Gastos Deducibles",
      helpText: "Costo de ventas + gastos de operacion + gastos financieros (todas las cuentas 5.x)",
    },

    // === SECCION: RESULTADO FISCAL ===
    {
      casilla: "45",
      label: "Utilidad Neta Gravable",
      accountCodes: [],
      aggregation: "formula",
      formula: (v) => (v["15"] || 0) - (v["30"] || 0),
      isSubtotal: true,
      section: "Resultado Fiscal",
      helpText: "Ingresos Brutos menos Gastos Deducibles (Casilla 15 - 30)",
    },
  ],
};

// ============================================
// FINANCIAL RECORD → ACCOUNT BALANCES FALLBACK
// ============================================

/**
 * Converts a FinancialRecord (from Diagnostico Flash) to AccountBalance[]
 * so the Espejo can auto-populate even without formal journal entries.
 */
export function financialRecordToBalances(r: FinancialRecord): AccountBalance[] {
  const balances: AccountBalance[] = [];

  const add = (code: string, name: string, debe: number, haber: number) => {
    if (debe > 0 || haber > 0) {
      balances.push({
        account_code: code,
        account_name: name,
        total_debe: debe,
        total_haber: haber,
        saldo_debe: Math.max(0, debe - haber),
        saldo_haber: Math.max(0, haber - debe),
      });
    }
  };

  // Ingresos (haber)
  add("4.1", "Ingresos por Ventas", 0, r.revenue);

  // Costo de ventas (debe)
  add("5.1.01", "Compras de Mercancia", r.cogs, 0);

  // Gastos de operacion (debe)
  add("5.2.01", "Sueldos y Salarios", r.opex_payroll, 0);
  add("5.2.05", "Alquiler de Local", r.opex_rent, 0);
  add("5.2.06", "Servicios Publicos y Otros", r.opex_other, 0);
  add("5.2.08", "Depreciacion", r.depreciation, 0);

  // Gastos financieros (debe)
  add("5.3.01", "Intereses Bancarios", r.interest_expense, 0);

  return balances;
}

// ============================================
// COMPUTATION ENGINE
// ============================================

/**
 * Computes form field values from account balances.
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
    // Check zero sales
    if ((values["10"] || 0) === 0) {
      validations.push({
        type: "warning",
        message: "No hay ventas gravadas en este periodo. Verifica que hayas registrado ingresos.",
      });
    }
  }

  if (form.formId === "03") {
    // Check zero revenue
    if ((values["15"] || 0) === 0) {
      validations.push({
        type: "warning",
        message: "No hay ingresos registrados en el periodo fiscal. Verifica los datos.",
      });
    }

    // Check negative taxable income
    if ((values["45"] || 0) < 0) {
      validations.push({
        type: "ok",
        message: `Resultado fiscal: Perdida de B/. ${Math.abs(values["45"]).toFixed(2)}. No hay ISR a pagar.`,
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
      message: "No hay movimientos contables registrados. Ingresa datos en Mi Contabilidad primero.",
    });
  }

  if (
    hasAnyBalance &&
    validations.filter((v) => v.type === "error").length === 0
  ) {
    validations.unshift({
      type: "ok",
      message: "Datos listos para transcribir a e-Tax 2.0.",
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
