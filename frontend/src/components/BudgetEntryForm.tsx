"use client";
import React, { useState } from "react";
import { Save, DollarSign } from "lucide-react";
import type { PeriodKey } from "@/lib/calculations";

// ============================================
// TIPOS
// ============================================

interface BudgetFormData {
  revenue_target: number;
  cogs_target: number;
  opex_rent_target: number;
  opex_payroll_target: number;
  opex_other_target: number;
  notes: string;
}

interface BudgetEntryFormProps {
  period: PeriodKey;
  initialData?: Partial<BudgetFormData>;
  onSave: (data: BudgetFormData & { period_year: number; period_month: number }) => void;
  saving?: boolean;
}

// ============================================
// CAMPOS
// ============================================

const FIELDS: { key: keyof BudgetFormData; label: string; placeholder: string }[] = [
  { key: "revenue_target", label: "Meta de Ventas", placeholder: "50000" },
  { key: "cogs_target", label: "Costo de Ventas Esperado", placeholder: "30000" },
  { key: "opex_rent_target", label: "Alquiler Presupuestado", placeholder: "5000" },
  { key: "opex_payroll_target", label: "Nómina Presupuestada", placeholder: "7000" },
  { key: "opex_other_target", label: "Otros Gastos Presupuestados", placeholder: "3000" },
];

// ============================================
// COMPONENTE
// ============================================

export default function BudgetEntryForm({
  period,
  initialData,
  onSave,
  saving = false,
}: BudgetEntryFormProps) {
  const [form, setForm] = useState<BudgetFormData>({
    revenue_target: initialData?.revenue_target ?? 0,
    cogs_target: initialData?.cogs_target ?? 0,
    opex_rent_target: initialData?.opex_rent_target ?? 0,
    opex_payroll_target: initialData?.opex_payroll_target ?? 0,
    opex_other_target: initialData?.opex_other_target ?? 0,
    notes: initialData?.notes ?? "",
  });

  const handleChange = (key: keyof BudgetFormData, value: string) => {
    if (key === "notes") {
      setForm((prev) => ({ ...prev, notes: value }));
    } else {
      const num = parseFloat(value) || 0;
      setForm((prev) => ({ ...prev, [key]: num }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      period_year: period.year,
      period_month: period.month,
    });
  };

  // Calcular EBITDA presupuestado
  const budgetGross = form.revenue_target - form.cogs_target;
  const budgetOpex = form.opex_rent_target + form.opex_payroll_target + form.opex_other_target;
  const budgetEbitda = budgetGross - budgetOpex;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {label}
            </label>
            <div className="relative">
              <DollarSign
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={form[key] || ""}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* EBITDA preview */}
      <div
        className={`rounded-xl border p-3 ${
          budgetEbitda >= 0
            ? "bg-emerald-50 border-emerald-200"
            : "bg-red-50 border-red-200"
        }`}
      >
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
          EBITDA Presupuestado
        </p>
        <p
          className={`text-xl font-bold ${
            budgetEbitda >= 0 ? "text-emerald-700" : "text-red-700"
          }`}
        >
          ${budgetEbitda.toLocaleString("es-PA")}
        </p>
        <p className="text-[10px] text-slate-500 mt-1">
          Margen:{" "}
          {form.revenue_target > 0
            ? ((budgetEbitda / form.revenue_target) * 100).toFixed(1)
            : "0.0"}
          %
        </p>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Notas (opcional)
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Notas sobre este presupuesto..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save size={14} />
        {saving ? "Guardando..." : "Guardar Presupuesto"}
      </button>
    </form>
  );
}
