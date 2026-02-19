"use client";
import React from "react";
import { Calendar } from "lucide-react";
import type { PeriodKey, PeriodPreset } from "@/lib/calculations";

// ============================================
// TIPOS
// ============================================

interface PeriodSelectorSingleProps {
  mode: "single";
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
  label?: string;
}

interface PeriodSelectorRangeProps {
  mode: "range";
  from: PeriodKey;
  to: PeriodKey;
  onChangeFrom: (period: PeriodKey) => void;
  onChangeTo: (period: PeriodKey) => void;
  onPreset?: (preset: PeriodPreset) => void;
}

interface PeriodSelectorCompareProps {
  mode: "compare";
  periodA: PeriodKey;
  periodB: PeriodKey;
  onChangePeriodA: (period: PeriodKey) => void;
  onChangePeriodB: (period: PeriodKey) => void;
}

type PeriodSelectorProps =
  | PeriodSelectorSingleProps
  | PeriodSelectorRangeProps
  | PeriodSelectorCompareProps;

// ============================================
// CONSTANTES
// ============================================

const MONTHS = [
  { value: 1, label: "Ene" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Abr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Ago" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dic" },
];

const YEARS = [2024, 2025, 2026, 2027];

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "last_quarter", label: "Ult. Trimestre" },
  { key: "last_semester", label: "Ult. Semestre" },
  { key: "last_year", label: "Ult. Año" },
  { key: "ytd", label: "YTD" },
];

// ============================================
// SUB-COMPONENTE: Un par de dropdowns (año + mes)
// ============================================

function PeriodDropdown({
  value,
  onChange,
  label,
}: {
  value: PeriodKey;
  onChange: (p: PeriodKey) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
          {label}
        </span>
      )}
      <select
        value={value.year}
        onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
        className="text-xs lg:text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        value={value.month}
        onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
        className="text-xs lg:text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
      >
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PeriodSelector(props: PeriodSelectorProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-3">
      <Calendar size={16} className="text-slate-400" />

      {props.mode === "single" && (
        <PeriodDropdown
          value={props.value}
          onChange={props.onChange}
          label={props.label || "Periodo"}
        />
      )}

      {props.mode === "range" && (
        <>
          <PeriodDropdown
            value={props.from}
            onChange={props.onChangeFrom}
            label="Desde"
          />
          <span className="text-slate-300">→</span>
          <PeriodDropdown
            value={props.to}
            onChange={props.onChangeTo}
            label="Hasta"
          />
          {props.onPreset && (
            <div className="flex gap-1 ml-auto">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => props.onPreset!(p.key)}
                  className="text-[10px] lg:text-xs px-2 py-1 rounded-full border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {props.mode === "compare" && (
        <>
          <PeriodDropdown
            value={props.periodA}
            onChange={props.onChangePeriodA}
            label="Periodo A"
          />
          <span className="text-slate-300 font-bold">vs</span>
          <PeriodDropdown
            value={props.periodB}
            onChange={props.onChangePeriodB}
            label="Periodo B"
          />
        </>
      )}
    </div>
  );
}
