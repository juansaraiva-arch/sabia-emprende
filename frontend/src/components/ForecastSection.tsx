"use client";
import React from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Sparkles, ArrowRight } from "lucide-react";
import type { TrendPoint, ForecastPoint } from "@/lib/multiperiodMockData";

// ============================================
// TIPOS
// ============================================

interface ForecastSectionProps {
  historical: TrendPoint[];
  projected: ForecastPoint[];
  method: string;
}

// ============================================
// COMPONENTE
// ============================================

export default function ForecastSection({
  historical,
  projected,
  method,
}: ForecastSectionProps) {
  if (!historical.length || !projected.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Se necesitan al menos 2 periodos para proyectar.
      </div>
    );
  }

  // Combinar datos para el chart
  const chartData = [
    ...historical.map((p) => ({
      label: p.label,
      revenue: p.revenue,
      ebitda: p.ebitda,
      projected_revenue: undefined as number | undefined,
      projected_ebitda: undefined as number | undefined,
      confidence_low: undefined as number | undefined,
      confidence_high: undefined as number | undefined,
    })),
    // Punto de conexion
    {
      label: historical[historical.length - 1].label,
      revenue: undefined as number | undefined,
      ebitda: undefined as number | undefined,
      projected_revenue: historical[historical.length - 1].revenue,
      projected_ebitda: historical[historical.length - 1].ebitda,
      confidence_low: historical[historical.length - 1].revenue,
      confidence_high: historical[historical.length - 1].revenue,
    },
    ...projected.map((p) => ({
      label: p.label,
      revenue: undefined as number | undefined,
      ebitda: undefined as number | undefined,
      projected_revenue: p.revenue,
      projected_ebitda: p.ebitda,
      confidence_low: p.confidence_low,
      confidence_high: p.confidence_high,
    })),
  ];

  // Indice del punto de separacion
  const separatorLabel = historical[historical.length - 1].label;

  // Resumen 3 y 6 meses
  const proj3 = projected.length >= 3 ? projected[2] : null;
  const proj6 = projected.length >= 6 ? projected[5] : null;
  const lastHist = historical[historical.length - 1];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-bold text-slate-700 mb-2">{label}</p>
        {payload
          .filter((p: any) => p.value != null)
          .map((p: any) => {
            const labels: Record<string, string> = {
              revenue: "Ventas (real)",
              ebitda: "EBITDA (real)",
              projected_revenue: "Ventas (proy.)",
              projected_ebitda: "EBITDA (proy.)",
            };
            return (
              <p key={p.dataKey} style={{ color: p.stroke || p.fill }}>
                {labels[p.dataKey] || p.dataKey}: $
                {Number(p.value).toLocaleString("es-PA")}
              </p>
            );
          })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-amber-500" />
        <h3 className="text-sm font-bold text-slate-700">
          Proyección ({method === "moving_average" ? "Promedio Móvil" : method})
        </h3>
      </div>

      {/* Chart */}
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={separatorLabel}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              label={{
                value: "Hoy",
                position: "top",
                fontSize: 10,
                fill: "#94a3b8",
              }}
            />

            {/* Banda de confianza */}
            <Area
              type="monotone"
              dataKey="confidence_high"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.08}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="confidence_low"
              stroke="none"
              fill="#ffffff"
              fillOpacity={1}
              connectNulls
            />

            {/* Lineas historicas (solidas) */}
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#3b82f6" }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="ebitda"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#10b981" }}
              connectNulls={false}
            />

            {/* Lineas proyectadas (punteadas) */}
            <Line
              type="monotone"
              dataKey="projected_revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: "#3b82f6", strokeDasharray: "0" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="projected_ebitda"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: "#10b981", strokeDasharray: "0" }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {proj3 && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-3">
            <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">
              Proyección 3 meses
            </p>
            <div className="flex items-center gap-2 mt-1">
              <ArrowRight size={14} className="text-blue-500" />
              <div>
                <p className="text-sm font-bold text-blue-700">
                  ${proj3.revenue.toLocaleString("es-PA")}
                </p>
                <p className="text-[10px] text-blue-500">
                  vs actual: $
                  {(proj3.revenue - lastHist.revenue).toLocaleString("es-PA")}
                </p>
              </div>
            </div>
          </div>
        )}
        {proj6 && (
          <div className="bg-violet-50 rounded-xl border border-violet-200 p-3">
            <p className="text-[10px] text-violet-500 font-medium uppercase tracking-wide">
              Proyección 6 meses
            </p>
            <div className="flex items-center gap-2 mt-1">
              <ArrowRight size={14} className="text-violet-500" />
              <div>
                <p className="text-sm font-bold text-violet-700">
                  ${proj6.revenue.toLocaleString("es-PA")}
                </p>
                <p className="text-[10px] text-violet-500">
                  vs actual: $
                  {(proj6.revenue - lastHist.revenue).toLocaleString("es-PA")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
