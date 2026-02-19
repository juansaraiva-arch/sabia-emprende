"use client";
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Target, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { BudgetVarianceItem } from "@/lib/multiperiodMockData";

// ============================================
// TIPOS
// ============================================

interface BudgetChartProps {
  items: BudgetVarianceItem[];
  overallScore: number;
}

// ============================================
// COMPONENTE
// ============================================

export default function BudgetChart({ items, overallScore }: BudgetChartProps) {
  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No hay datos de presupuesto para este periodo.
      </div>
    );
  }

  // Datos para el bar chart
  const chartData = items.map((item) => ({
    name: item.metric,
    Actual: item.actual,
    Presupuesto: item.budget,
    status: item.status,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-bold text-slate-700 mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.fill || p.color }}>
            {p.name}: ${Number(p.value).toLocaleString("es-PA")}
          </p>
        ))}
      </div>
    );
  };

  // Indicador circular score
  const scoreColor =
    overallScore >= 80
      ? "text-emerald-600"
      : overallScore >= 50
        ? "text-amber-600"
        : "text-red-600";
  const scoreBg =
    overallScore >= 80
      ? "bg-emerald-50 border-emerald-200"
      : overallScore >= 50
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  const statusIcon = (status: string) => {
    switch (status) {
      case "on_track":
        return <CheckCircle2 size={14} className="text-blue-500" />;
      case "favorable":
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case "desfavorable":
        return <XCircle size={14} className="text-red-500" />;
      default:
        return <AlertTriangle size={14} className="text-amber-500" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "on_track":
        return "En Meta";
      case "favorable":
        return "Favorable";
      case "desfavorable":
        return "Desfavorable";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Score + header */}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${scoreBg}`}
        >
          <Target size={16} className={scoreColor} />
          <div>
            <p className="text-[10px] text-slate-500 font-medium uppercase">
              Score General
            </p>
            <p className={`text-xl font-bold ${scoreColor}`}>
              {overallScore.toFixed(0)}%
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {items
            .filter((i) => i.metric_key !== "ebitda")
            .map((item) => (
              <div
                key={item.metric_key}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${
                  item.status === "on_track"
                    ? "bg-blue-50 text-blue-700"
                    : item.status === "favorable"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                }`}
              >
                {statusIcon(item.status)}
                {item.metric}
              </div>
            ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value: string) => (
                <span style={{ color: "#64748b" }}>{value}</span>
              )}
            />
            <Bar dataKey="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar
              dataKey="Presupuesto"
              fill="#cbd5e1"
              radius={[4, 4, 0, 0]}
              strokeDasharray="3 3"
              stroke="#94a3b8"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Variance table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-left font-bold text-slate-500">
                Métrica
              </th>
              <th className="px-3 py-2 text-right font-bold text-blue-600">
                Real
              </th>
              <th className="px-3 py-2 text-right font-bold text-slate-500">
                Presup.
              </th>
              <th className="px-3 py-2 text-right font-bold text-slate-500">
                Varianza
              </th>
              <th className="px-3 py-2 text-right font-bold text-slate-500">
                %
              </th>
              <th className="px-3 py-2 text-center font-bold text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.metric_key}
                className={`border-t border-slate-100 ${
                  item.metric_key === "ebitda" ? "bg-slate-50 font-bold" : ""
                }`}
              >
                <td className="px-3 py-2 font-medium text-slate-700">
                  {item.metric}
                </td>
                <td className="px-3 py-2 text-right">
                  ${item.actual.toLocaleString("es-PA")}
                </td>
                <td className="px-3 py-2 text-right text-slate-500">
                  ${item.budget.toLocaleString("es-PA")}
                </td>
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    item.status === "favorable"
                      ? "text-emerald-600"
                      : item.status === "desfavorable"
                        ? "text-red-600"
                        : "text-blue-600"
                  }`}
                >
                  {item.variance > 0 ? "+" : ""}$
                  {item.variance.toLocaleString("es-PA")}
                </td>
                <td
                  className={`px-3 py-2 text-right ${
                    item.status === "favorable"
                      ? "text-emerald-600"
                      : item.status === "desfavorable"
                        ? "text-red-600"
                        : "text-blue-600"
                  }`}
                >
                  {item.variance_pct > 0 ? "+" : ""}
                  {item.variance_pct.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {statusIcon(item.status)}
                    <span className="text-[10px] text-slate-600">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
