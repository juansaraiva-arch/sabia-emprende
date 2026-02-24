"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  Building2,
  Calendar,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Shield,
  RefreshCw,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { accountingApi } from "@/lib/api";
import {
  FORM_430,
  FORM_03,
  computeFormValues,
  getDGICalendar,
  markAsFiled,
  getFiledStatuses,
} from "@/lib/dgi-mappings";
import type {
  DGIFormDefinition,
  AccountBalance,
  ComputedFormResult,
  DGIDeadline,
} from "@/lib/dgi-mappings";
import { DEFAULT_PANAMA_CHART } from "@/components/accounting/ChartOfAccounts";
import { formatBalboas } from "@/lib/currency";

// ============================================
// TYPES
// ============================================

interface EspejoDGIProps {
  societyId: string;
}

type DGIView = "form430" | "form03" | "calendario";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function EspejoDGI({ societyId }: EspejoDGIProps) {
  const [activeView, setActiveView] = useState<DGIView>("form430");

  const views: { key: DGIView; label: string; icon: React.ReactNode }[] = [
    { key: "form430", label: "Form. 430 (ITBMS)", icon: <FileText size={14} /> },
    { key: "form03", label: "Form. 03 (Renta)", icon: <Building2 size={14} /> },
    { key: "calendario", label: "Calendario DGI", icon: <Calendar size={14} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-100">
            <Shield size={20} className="text-amber-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Espejo DGI</h3>
            <p className="text-[10px] text-slate-400">
              Tax Preparation — Prepara tus datos para e-Tax 2.0
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-700">
          Solo preparacion — Tu transcribes a e-Tax
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {views.map((v) => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeView === v.key
                ? "bg-white shadow-sm text-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeView === "form430" && <FormView form={FORM_430} societyId={societyId} />}
      {activeView === "form03" && <FormView form={FORM_03} societyId={societyId} />}
      {activeView === "calendario" && <CalendarioView />}
    </div>
  );
}

// ============================================
// FORM VIEW (shared for 430 and 03)
// ============================================

function FormView({
  form,
  societyId,
}: {
  form: DGIFormDefinition;
  societyId: string;
}) {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(false);

  // Period filter
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterQuarter, setFilterQuarter] = useState(
    Math.ceil((now.getMonth() + 1) / 3)
  );

  const isQuarterly = form.frequency === "quarterly";
  const isAnnual = form.frequency === "annual";

  // Load balances from Balance de Comprobacion
  const loadBalances = useCallback(async () => {
    setLoading(true);
    try {
      // For quarterly: load 3 months and aggregate
      // For annual: load all 12 months
      // For demo mode: we'll get empty arrays, which is fine
      if (isAnnual) {
        const res = await accountingApi.getTrialBalance(societyId, filterYear);
        if (res.data && !Array.isArray(res.data) && res.data.accounts) {
          setBalances(res.data.accounts);
        } else {
          setBalances([]);
        }
      } else if (isQuarterly) {
        // Trimestral: use the last month of the quarter
        const lastMonthOfQ = filterQuarter * 3;
        const res = await accountingApi.getTrialBalance(
          societyId,
          filterYear,
          lastMonthOfQ
        );
        if (res.data && !Array.isArray(res.data) && res.data.accounts) {
          setBalances(res.data.accounts);
        } else {
          setBalances([]);
        }
      } else {
        const res = await accountingApi.getTrialBalance(
          societyId,
          filterYear,
          filterMonth
        );
        if (res.data && !Array.isArray(res.data) && res.data.accounts) {
          setBalances(res.data.accounts);
        } else {
          setBalances([]);
        }
      }
    } catch {
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, [societyId, filterYear, filterMonth, filterQuarter, isAnnual, isQuarterly]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // Period label
  const periodLabel = isAnnual
    ? `Ano Fiscal ${filterYear}`
    : isQuarterly
    ? `Q${filterQuarter} ${filterYear} (${MONTHS[(filterQuarter - 1) * 3]} - ${MONTHS[filterQuarter * 3 - 1]})`
    : `${MONTHS[filterMonth - 1]} ${filterYear}`;

  // Compute form
  const result = useMemo(
    () => computeFormValues(form, balances, periodLabel),
    [form, balances, periodLabel]
  );

  // Group fields by section
  const sections = useMemo(() => {
    const map = new Map<string, typeof result.fields>();
    for (const f of result.fields) {
      if (!map.has(f.section)) map.set(f.section, []);
      map.get(f.section)!.push(f);
    }
    return Array.from(map.entries());
  }, [result.fields]);

  // Copy to clipboard
  const [copied, setCopied] = useState(false);
  const handleCopyAll = () => {
    const lines = result.fields.map(
      (f) => `Casilla ${f.casilla}\t${f.label}\t${f.value.toFixed(2)}`
    );
    const text = `${form.formName} — ${periodLabel}\n\n${lines.join("\n")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {/* Form header */}
      <div className="border border-slate-200 rounded-xl p-4 bg-gradient-to-r from-slate-50 to-amber-50/30">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h4 className="font-bold text-slate-800">
              Formulario {form.formId} — {form.formName}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-lg">
              {form.formDescription}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Frecuencia: {form.frequency === "quarterly" ? "Trimestral" : form.frequency === "annual" ? "Anual" : "Mensual"} | Vence: {form.dueDateRule}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadBalances}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-white"
              title="Refrescar datos"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copiado" : "Copiar Todo"}
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200">
          <span className="text-xs font-medium text-slate-500">Periodo:</span>
          {isQuarterly && (
            <select
              value={filterQuarter}
              onChange={(e) => setFilterQuarter(Number(e.target.value))}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              <option value={1}>Q1 (Ene-Mar)</option>
              <option value={2}>Q2 (Abr-Jun)</option>
              <option value={3}>Q3 (Jul-Sep)</option>
              <option value={4}>Q4 (Oct-Dic)</option>
            </select>
          )}
          {!isQuarterly && !isAnnual && (
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
            {periodLabel}
          </span>
        </div>
      </div>

      {/* Validations */}
      {result.validations.length > 0 && (
        <div className="space-y-2">
          {result.validations.map((v, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${
                v.type === "ok"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : v.type === "warning"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {v.type === "ok" ? (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              ) : v.type === "warning" ? (
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
              )}
              <span>{v.message}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-slate-400" size={24} />
          <span className="ml-2 text-sm text-slate-400">Calculando formulario...</span>
        </div>
      ) : (
        /* Form table by sections */
        <div className="space-y-3">
          {sections.map(([sectionName, fields]) => (
            <FormSection key={sectionName} sectionName={sectionName} fields={fields} />
          ))}
        </div>
      )}

      {/* Footer disclaimer */}
      <div className="text-[10px] text-slate-400 text-center py-3 border-t border-slate-100">
        Este es un espejo de preparacion. Los valores deben ser transcritos manualmente a{" "}
        <span className="font-bold">e-Tax 2.0 (DGI Panama)</span>. Mi Director Financiero PTY no
        presenta declaraciones ni se conecta al sistema de la DGI.
      </div>
    </div>
  );
}

// ============================================
// FORM SECTION (collapsible group)
// ============================================

function FormSection({
  sectionName,
  fields,
}: {
  sectionName: string;
  fields: { casilla: string; label: string; value: number; helpText?: string }[];
}) {
  const [expanded, setExpanded] = useState(true);
  const sectionTotal = fields[fields.length - 1]; // Last field is usually the subtotal

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
          <span className="text-sm font-bold text-slate-700">{sectionName}</span>
        </div>
        {sectionTotal && (
          <span
            className={`text-sm font-bold ${
              sectionTotal.value >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatBalboas(sectionTotal.value)}
          </span>
        )}
      </button>

      {/* Fields */}
      {expanded && (
        <div className="divide-y divide-slate-100">
          {fields.map((field) => (
            <FormFieldRow key={field.casilla} field={field} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// FORM FIELD ROW
// ============================================

function FormFieldRow({
  field,
}: {
  field: { casilla: string; label: string; value: number; helpText?: string };
}) {
  const [showHelp, setShowHelp] = useState(false);
  const isSubtotal = field.label.startsWith("Total") || field.label.startsWith("=") || field.label.includes("Neto") || field.label.includes("Utilidad") || field.label.includes("ISR a Pagar") || field.label.includes("Base Imponible") || field.label.includes("ITBMS Causado") || field.label.includes("Ingresos Brutos");

  return (
    <div
      className={`px-4 py-2.5 flex items-center gap-3 ${
        isSubtotal ? "bg-slate-50 font-bold" : "hover:bg-slate-50/50"
      } transition-colors`}
    >
      {/* Casilla badge */}
      <div className="w-10 shrink-0">
        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 text-[10px] font-mono text-slate-600">
          {field.casilla}
        </span>
      </div>

      {/* Label + help */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs ${
              isSubtotal ? "text-slate-800" : "text-slate-600"
            } truncate`}
          >
            {field.label}
          </span>
          {field.helpText && (
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <HelpCircle size={12} />
            </button>
          )}
        </div>
        {showHelp && field.helpText && (
          <p className="text-[10px] text-slate-400 mt-1">{field.helpText}</p>
        )}
      </div>

      {/* Value */}
      <div className="shrink-0 text-right">
        <span
          className={`text-xs font-mono ${
            isSubtotal
              ? field.value >= 0
                ? "text-emerald-700 text-sm"
                : "text-red-700 text-sm"
              : field.value > 0
              ? "text-slate-700"
              : "text-slate-400"
          }`}
        >
          {formatBalboas(field.value)}
        </span>
      </div>
    </div>
  );
}

// ============================================
// CALENDARIO DGI VIEW
// ============================================

function CalendarioView() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [filedStatuses, setFiledStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    setFiledStatuses(getFiledStatuses());
  }, []);

  const deadlines = useMemo(() => {
    const cal = getDGICalendar(year);
    // Apply filed statuses
    return cal.map((d) => ({
      ...d,
      status: filedStatuses[d.id]
        ? ("filed" as const)
        : d.status,
    }));
  }, [year, filedStatuses]);

  const handleMarkFiled = (id: string) => {
    markAsFiled(id);
    setFiledStatuses(getFiledStatuses());
  };

  const now = new Date();
  const upcoming = deadlines.filter(
    (d) => d.status !== "filed" && d.dueDate >= now
  );
  const nextDeadline = upcoming[0];
  const daysUntilNext = nextDeadline
    ? Math.ceil(
        (nextDeadline.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      {nextDeadline && daysUntilNext !== null && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            daysUntilNext <= 7
              ? "bg-red-50 border-red-200 text-red-700"
              : daysUntilNext <= 30
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-blue-50 border-blue-200 text-blue-700"
          }`}
        >
          <Clock size={18} className="shrink-0" />
          <div>
            <p className="text-sm font-bold">
              Proxima fecha limite: {nextDeadline.formName} — {nextDeadline.period}
            </p>
            <p className="text-xs mt-0.5">
              {nextDeadline.dueDate.toLocaleDateString("es-PA", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {" "}({daysUntilNext} dia{daysUntilNext !== 1 ? "s" : ""})
            </p>
          </div>
        </div>
      )}

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-500">Ano fiscal:</span>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {deadlines.map((d) => {
          const isPast = d.dueDate < now;
          const isFiled = d.status === "filed";
          const isOverdue = !isFiled && isPast;
          const daysLeft = Math.ceil(
            (d.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          return (
            <div
              key={d.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                isFiled
                  ? "bg-emerald-50/50 border-emerald-200"
                  : isOverdue
                  ? "bg-red-50/50 border-red-200"
                  : daysLeft <= 30
                  ? "bg-amber-50/50 border-amber-200"
                  : "bg-white border-slate-200"
              }`}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {isFiled ? (
                  <CheckCircle2 size={22} className="text-emerald-500" />
                ) : isOverdue ? (
                  <AlertCircle size={22} className="text-red-500" />
                ) : (
                  <Clock size={22} className="text-amber-500" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      d.formId === "430"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    Form. {d.formId}
                  </span>
                  <span className="text-sm font-bold text-slate-700">{d.period}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{d.description}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Vence:{" "}
                  {d.dueDate.toLocaleDateString("es-PA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {isFiled && (
                    <span className="ml-2 text-emerald-600 font-medium">
                      Presentada el{" "}
                      {new Date(filedStatuses[d.id]).toLocaleDateString("es-PA", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </p>
              </div>

              {/* Days left / Action */}
              <div className="shrink-0 text-right">
                {isFiled ? (
                  <span className="text-xs font-bold text-emerald-600">Presentada</span>
                ) : isOverdue ? (
                  <div>
                    <span className="text-xs font-bold text-red-600">Vencida</span>
                    <button
                      onClick={() => handleMarkFiled(d.id)}
                      className="block mt-1 text-[10px] text-red-500 hover:text-red-700 underline"
                    >
                      Marcar presentada
                    </button>
                  </div>
                ) : (
                  <div>
                    <span
                      className={`text-xs font-bold ${
                        daysLeft <= 7
                          ? "text-red-600"
                          : daysLeft <= 30
                          ? "text-amber-600"
                          : "text-slate-500"
                      }`}
                    >
                      {daysLeft} dia{daysLeft !== 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={() => handleMarkFiled(d.id)}
                      className="block mt-1 text-[10px] text-slate-400 hover:text-slate-600 underline"
                    >
                      Marcar presentada
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-[10px] text-slate-400 text-center py-3 border-t border-slate-100">
        Calendario basado en la normativa DGI Panama vigente. Las fechas de ITBMS aplican para
        contribuyentes con declaracion trimestral. Contribuyentes mensuales deben presentar el 15 de
        cada mes.
      </div>
    </div>
  );
}
