"use client";
import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Eye, EyeOff } from "lucide-react";
import type { TrendPoint } from "@/lib/multiperiodMockData";

// ============================================
// TIPOS
// ============================================

interface TrendsChartProps {
  points: TrendPoint[];
  growthRates: Record<string, number>;
  movingAverages: Record<string, (number | null)[]>;
}

// ============================================
// COLORES
// ============================================

const LINE_CONFIG = [
  { key: "revenue", label: "Ventas", color: "#3b82f6" },
  { key: "ebitda", label: "EBITDA", color: "#10b981" },
  { key: "net_income", label: "Utilidad Neta", color: "#8b5cf6" },
] as const;

// ============================================
// COMPONENTE
// ============================================

export default function TrendsChart({
  points,
  growthRates,
  movingAverages,
}: TrendsChartProps) {
  const [visibleLines, setVisibleLines] = useState<Set<string>>(
    new Set(["revenue", "ebitda", "net_income"])
  );
  const [showMA, setShowMA] = useState(false);

  if (!points || points.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No hay datos para mostrar tendencias.
      </div>
    );
  }

  const toggleLine = (key: string) => {
    const next = new Set(visibleLines);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setVisibleLines(next);
  };

  // Preparar datos con promedios moviles
  const chartData = points.map((p, i) => ({
    label: p.label,
    revenue: p.revenue,
    ebitda: p.ebitda,
    net_income: p.net_income,
    ma_revenue: movingAverages?.revenue?.[i] ?? undefined,
    ma_ebitda: movingAverages?.ebitda?.[i] ?? undefined,
    ma_net_income: movingAverages?.net_income?.[i] ?? undefined,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-bold text-slate-700 mb-2">{label}</p>
        {payload
          .filter((p: any) => !p.dataKey.startsWith("ma_"))
          .map((p: any) => (
            <p key={p.dataKey} style={{ color: p.stroke }}>
              {p.name}: ${Number(p.value).toLocaleString("es-PA")}
            </p>
          ))}
      </div>
    );
  };

  const GrowthBadge = ({
    label,
    value,
  }: {
    label: string;
    value: number | undefined;
  }) => {
    if (value === undefined) return null;
    const isPositive = value > 0;
    const isNeutral = Math.abs(value) < 1;
    return (
      <div
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium ${
          isNeutral
            ? "border-slate-200 text-slate-600 bg-slate-50"
            : isPositive
              ? "border-emerald-200 text-emerald-700 bg-emerald-50"
              : "border-red-200 text-red-700 bg-red-50"
        }`}
      >
        {isNeutral ? (
          <Minus size={12} />
        ) : isPositive ? (
          <TrendingUp size={12} />
        ) : (
          <TrendingDown size={12} />
        )}
        <span>{label}</span>
        <span className="font-bold">
          {isPositive ? "+" : ""}
          {value.toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toggle controles */}
      <div className="flex flex-wrap items-center gap-2">
        {LINE_CONFIG.map((line) => (
          <button
            key={line.key}
            onClick={() => toggleLine(line.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              visibleLines.has(line.key)
                ? "border-slate-300 bg-white text-slate-700"
                : "border-slate-200 bg-slate-100 text-slate-400"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: visibleLines.has(line.key)
                  ? line.color
                  : "#d1d5db",
              }}
            />
            {line.label}
          </button>
        ))}
        <button
          onClick={() => setShowMA(!showMA)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ml-auto ${
            showMA
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          {showMA ? <Eye size={12} /> : <EyeOff size={12} />}
          Prom. Móvil
        </button>
      </div>

      {/* Chart */}
      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }}
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
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  revenue: "Ventas",
                  ebitda: "EBITDA",
                  net_income: "Utilidad Neta",
                };
                return (
                  <span style={{ color: "#64748b" }}>
                    {labels[value] || value}
                  </span>
                );
              }}
            />

            {LINE_CONFIG.map(
              (line) =>
                visibleLines.has(line.key) && (
                  <Line
                    key={line.key}
                    type="monotone"
                    dataKey={line.key}
                    name={line.key}
                    stroke={line.color}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: line.color }}
                    activeDot={{ r: 5 }}
                  />
                )
            )}

            {showMA &&
              LINE_CONFIG.map(
                (line) =>
                  visibleLines.has(line.key) && (
                    <Line
                      key={`ma_${line.key}`}
                      type="monotone"
                      dataKey={`ma_${line.key}`}
                      name={`ma_${line.key}`}
                      stroke={line.color}
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      connectNulls
                      legendType="none"
                    />
                  )
              )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Growth rate badges */}
      {growthRates && Object.keys(growthRates).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <GrowthBadge label="Ventas" value={growthRates.revenue} />
          <GrowthBadge label="EBITDA" value={growthRates.ebitda} />
          <GrowthBadge label="U. Neta" value={growthRates.net_income} />
          <GrowthBadge
            label="Margen Bruto"
            value={growthRates.gross_margin_pct}
          />
          <GrowthBadge
            label="Margen EBITDA"
            value={growthRates.ebitda_margin_pct}
          />
        </div>
      )}
    </div>
  );
}
