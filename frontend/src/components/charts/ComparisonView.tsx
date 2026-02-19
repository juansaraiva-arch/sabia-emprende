"use client";
import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

// ============================================
// TIPOS
// ============================================

interface ComparisonData {
  period_a: Record<string, number>;
  period_b: Record<string, number>;
  deltas: Record<string, number>;
  pct_changes: Record<string, number>;
  improvements: string[];
  deteriorations: string[];
}

interface ComparisonViewProps {
  data: ComparisonData;
  labelA: string;
  labelB: string;
}

// ============================================
// LABELS Y CONFIG
// ============================================

const METRIC_LABELS: Record<string, string> = {
  revenue: "Ventas",
  cogs: "Costo de Ventas",
  gross_profit: "Utilidad Bruta",
  total_opex: "OPEX Total",
  ebitda: "EBITDA",
  net_income: "Utilidad Neta",
  gross_margin_pct: "Margen Bruto %",
  ebitda_margin_pct: "Margen EBITDA %",
  rent_ratio_pct: "Ratio Alquiler %",
  payroll_ratio_pct: "Ratio Nómina %",
  acid_test: "Prueba Ácida",
  ccc_days: "CCC (días)",
};

const LOWER_IS_BETTER = new Set([
  "cogs",
  "total_opex",
  "rent_ratio_pct",
  "payroll_ratio_pct",
  "ccc_days",
]);

function formatValue(key: string, value: number): string {
  if (key.endsWith("_pct")) return `${value.toFixed(1)}%`;
  if (key === "acid_test") return value.toFixed(2);
  if (key === "ccc_days") return `${value.toFixed(0)} días`;
  return `$${value.toLocaleString("es-PA")}`;
}

// ============================================
// COMPONENTE
// ============================================

export default function ComparisonView({
  data,
  labelA,
  labelB,
}: ComparisonViewProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Selecciona dos periodos para comparar.
      </div>
    );
  }

  const cascadaKeys = [
    "revenue",
    "cogs",
    "gross_profit",
    "total_opex",
    "ebitda",
    "net_income",
  ];
  const ratioKeys = [
    "gross_margin_pct",
    "ebitda_margin_pct",
    "rent_ratio_pct",
    "payroll_ratio_pct",
    "acid_test",
    "ccc_days",
  ];

  const DeltaCell = ({
    metricKey,
    delta,
    pctChange,
  }: {
    metricKey: string;
    delta: number;
    pctChange: number;
  }) => {
    const isLowerBetter = LOWER_IS_BETTER.has(metricKey);
    const isImproved = isLowerBetter ? delta < 0 : delta > 0;
    const isNeutral = Math.abs(pctChange) < 1;

    return (
      <div
        className={`flex items-center gap-1 text-xs font-medium ${
          isNeutral
            ? "text-slate-500"
            : isImproved
              ? "text-emerald-600"
              : "text-red-600"
        }`}
      >
        {isNeutral ? (
          <Minus size={12} />
        ) : isImproved ? (
          <ArrowUpRight size={12} />
        ) : (
          <ArrowDownRight size={12} />
        )}
        <span>
          {pctChange > 0 ? "+" : ""}
          {pctChange.toFixed(1)}%
        </span>
      </div>
    );
  };

  const renderTable = (keys: string[], title: string) => (
    <div>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        {title}
      </h4>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-left font-bold text-slate-500">
                Métrica
              </th>
              <th className="px-3 py-2 text-right font-bold text-blue-600">
                {labelA}
              </th>
              <th className="px-3 py-2 text-right font-bold text-violet-600">
                {labelB}
              </th>
              <th className="px-3 py-2 text-right font-bold text-slate-500">
                Cambio
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const valA = data.deltas[key] !== undefined
                ? (data.period_a as any)[key] ?? 0
                : 0;
              const valB = data.deltas[key] !== undefined
                ? (data.period_b as any)[key] ?? 0
                : 0;

              // For cascada keys, get from period data directly
              const displayA =
                key in (data.period_a || {}) ? data.period_a[key] : 0;
              const displayB =
                key in (data.period_b || {}) ? data.period_b[key] : 0;

              return (
                <tr
                  key={key}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {METRIC_LABELS[key] || key}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {formatValue(key, displayA)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {formatValue(key, displayB)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DeltaCell
                      metricKey={key}
                      delta={data.deltas[key] || 0}
                      pctChange={data.pct_changes[key] || 0}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Resumen badges */}
      <div className="flex flex-wrap gap-3">
        {data.improvements.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            <ArrowUpRight size={14} />
            {data.improvements.length} mejora
            {data.improvements.length > 1 ? "s" : ""}
          </div>
        )}
        {data.deteriorations.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            <ArrowDownRight size={14} />
            {data.deteriorations.length} deterioro
            {data.deteriorations.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Delta cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cascadaKeys.map((key) => {
          const delta = data.deltas[key] || 0;
          const pct = data.pct_changes[key] || 0;
          const isLowerBetter = LOWER_IS_BETTER.has(key);
          const isGood = isLowerBetter ? delta < 0 : delta > 0;
          const isNeutral = Math.abs(pct) < 1;

          return (
            <div
              key={key}
              className={`rounded-xl border p-3 ${
                isNeutral
                  ? "border-slate-200 bg-white"
                  : isGood
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                {METRIC_LABELS[key]}
              </p>
              <p
                className={`text-lg font-bold mt-1 ${
                  isNeutral
                    ? "text-slate-700"
                    : isGood
                      ? "text-emerald-700"
                      : "text-red-700"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {formatValue(key, delta)}
              </p>
              <p
                className={`text-xs ${
                  isNeutral
                    ? "text-slate-500"
                    : isGood
                      ? "text-emerald-600"
                      : "text-red-600"
                }`}
              >
                {pct > 0 ? "+" : ""}
                {pct.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>

      {/* Tablas */}
      {renderTable(cascadaKeys, "Cascada de Rentabilidad")}
      {renderTable(
        ratioKeys.filter((k) => data.deltas[k] !== undefined),
        "Ratios Operativos"
      )}
    </div>
  );
}
