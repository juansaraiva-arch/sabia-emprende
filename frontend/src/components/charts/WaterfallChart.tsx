"use client";
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface WaterfallStep {
  label: string;
  value: number;
  type: "increase" | "decrease" | "total";
}

interface WaterfallChartProps {
  steps: WaterfallStep[];
}

// Colores: Azul (entradas), Rojo (salidas), Verde/Naranja (totales)
const COLORS = {
  increase: "#3B82F6", // blue-500
  decrease: "#EF4444", // red-500
  totalPositive: "#10B981", // emerald-500
  totalNegative: "#F97316", // orange-500
};

function getBarColor(type: string, value: number): string {
  if (type === "increase") return COLORS.increase;
  if (type === "decrease") return COLORS.decrease;
  return value >= 0 ? COLORS.totalPositive : COLORS.totalNegative;
}

/**
 * Transforma waterfall_steps en datos para Recharts BarChart apilado.
 * Técnica: Barra invisible "base" + barra visible "visible" apiladas.
 */
function transformWaterfallData(steps: WaterfallStep[]) {
  let runningTotal = 0;
  return steps.map((step) => {
    let base: number;
    let visible: number;

    if (step.type === "total") {
      // Los totales parten desde 0
      base = step.value >= 0 ? 0 : step.value;
      visible = Math.abs(step.value);
      runningTotal = step.value;
    } else if (step.type === "increase") {
      base = runningTotal;
      visible = step.value;
      runningTotal += step.value;
    } else {
      // decrease: value es negativo
      runningTotal += step.value;
      base = runningTotal >= 0 ? runningTotal : runningTotal;
      visible = Math.abs(step.value);
      if (runningTotal < 0 && runningTotal + Math.abs(step.value) >= 0) {
        base = runningTotal;
      }
    }

    return {
      label: step.label,
      base: Math.max(base, 0),
      visible,
      rawValue: step.value,
      type: step.type,
      total: runningTotal,
    };
  });
}

function formatDollar(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toLocaleString("es-PA")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const color = getBarColor(data.type, data.rawValue);

  return (
    <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-200">
      <p className="text-sm font-bold text-slate-800">{data.label}</p>
      <p className="text-lg font-extrabold" style={{ color }}>
        {data.rawValue >= 0 ? "+" : ""}$
        {Math.abs(data.rawValue).toLocaleString("es-PA")}
      </p>
      <p className="text-xs text-slate-400">
        Acumulado: ${data.total.toLocaleString("es-PA")}
      </p>
    </div>
  );
}

export default function WaterfallChart({ steps }: WaterfallChartProps) {
  const chartData = transformWaterfallData(steps);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748B", fontSize: 12, fontWeight: 600 }}
            axisLine={{ stroke: "#CBD5E1" }}
          />
          <YAxis
            tickFormatter={(v) => formatDollar(v)}
            tick={{ fill: "#94A3B8", fontSize: 11 }}
            axisLine={{ stroke: "#CBD5E1" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1} />

          {/* Barra invisible (base) */}
          <Bar dataKey="base" stackId="waterfall" fill="transparent" />

          {/* Barra visible (valor) */}
          <Bar dataKey="visible" stackId="waterfall" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.type, entry.rawValue)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Leyenda manual */}
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: COLORS.increase }}
          />
          <span className="text-xs text-slate-500">Ingresos</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: COLORS.decrease }}
          />
          <span className="text-xs text-slate-500">Costos/Gastos</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: COLORS.totalPositive }}
          />
          <span className="text-xs text-slate-500">Subtotal (+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: COLORS.totalNegative }}
          />
          <span className="text-xs text-slate-500">Subtotal (-)</span>
        </div>
      </div>
    </div>
  );
}
