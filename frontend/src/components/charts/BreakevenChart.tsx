"use client";
import React from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { Target, TrendingUp, Shield, AlertTriangle } from "lucide-react";
import SmartTooltip from "@/components/SmartTooltip";

interface BreakevenChartProps {
  breakevenMonthly: number;
  currentSales: number;
  marginOfSafety: number;
  zone: "profit" | "even" | "loss";
  contributionMarginPct: number;
  targetSales?: number | null;
}

function formatDollar(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value.toLocaleString("es-PA")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-200">
      <p className="text-xs text-slate-400 mb-1">
        Ventas: ${data.revenue?.toLocaleString("es-PA")}
      </p>
      <p className="text-sm text-blue-600 font-bold">
        Ingresos: ${data.revenue?.toLocaleString("es-PA")}
      </p>
      <p className="text-sm text-red-500 font-bold">
        Costo Total: ${data.totalCost?.toLocaleString("es-PA")}
      </p>
      {data.profit !== undefined && (
        <p
          className={`text-sm font-bold ${data.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}
        >
          {data.profit >= 0 ? "Ganancia" : "Perdida"}: $
          {Math.abs(data.profit).toLocaleString("es-PA")}
        </p>
      )}
    </div>
  );
}

export default function BreakevenChart({
  breakevenMonthly,
  currentSales,
  marginOfSafety,
  zone,
  contributionMarginPct,
  targetSales,
}: BreakevenChartProps) {
  const variableCostRatio = 1 - contributionMarginPct / 100;
  const maxX = Math.max(currentSales, breakevenMonthly, targetSales || 0) * 1.4;
  const fixedCosts = breakevenMonthly * (contributionMarginPct / 100);

  const points = 14;
  const chartData = Array.from({ length: points + 1 }, (_, i) => {
    const revenue = (maxX / points) * i;
    const totalCost = fixedCosts + revenue * variableCostRatio;
    const profit = revenue - totalCost;
    return {
      revenue: Math.round(revenue),
      totalCost: Math.round(totalCost),
      profit: Math.round(profit),
      revenueLabel: formatDollar(Math.round(revenue)),
    };
  });

  const zoneColors = {
    profit: { bg: "bg-emerald-50", border: "border-emerald-500", text: "text-emerald-700", label: "GANANCIA" },
    even: { bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-700", label: "TABLAS" },
    loss: { bg: "bg-red-50", border: "border-red-500", text: "text-red-700", label: "PERDIDA" },
  };
  const zoneStyle = zoneColors[zone];

  const marginPct = currentSales > 0
    ? ((currentSales - breakevenMonthly) / currentSales * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Zone indicator banner */}
      <div className={`flex items-center gap-3 p-4 rounded-2xl ${zoneStyle.bg} border ${zoneStyle.border}`}>
        {zone === "loss" ? (
          <AlertTriangle size={24} className="text-red-500" />
        ) : zone === "profit" ? (
          <Shield size={24} className="text-emerald-500" />
        ) : (
          <Target size={24} className="text-amber-500" />
        )}
        <div>
          <p className={`text-sm font-extrabold ${zoneStyle.text}`}>
            ZONA {zoneStyle.label}
          </p>
          <p className="text-xs text-slate-500">
            {zone === "profit"
              ? `Vendes ${formatDollar(marginOfSafety)} por encima del equilibrio (${marginPct.toFixed(1)}% de margen de seguridad)`
              : zone === "loss"
                ? `Te faltan ${formatDollar(Math.abs(marginOfSafety))} para alcanzar el punto de equilibrio`
                : "Estas justo en el limite. Cualquier baja en ventas te pone en perdida."}
          </p>
        </div>
      </div>

      {/* Chart — taller para mayor impacto */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="revenue"
            tickFormatter={(v) => formatDollar(v)}
            tick={{ fill: "#94A3B8", fontSize: 11 }}
            label={{
              value: "Ventas ($)",
              position: "insideBottomRight",
              offset: -5,
              fill: "#94A3B8",
              fontSize: 12,
            }}
          />
          <YAxis
            tickFormatter={(v) => formatDollar(v)}
            tick={{ fill: "#94A3B8", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Area de costo total (zona roja) */}
          <Area
            type="monotone"
            dataKey="totalCost"
            fill="url(#lossGradient)"
            stroke="transparent"
          />

          {/* Area de ventas (zona verde) */}
          <Area
            type="monotone"
            dataKey="revenue"
            fill="url(#profitGradient)"
            stroke="transparent"
          />

          {/* Linea de ventas */}
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={false}
            name="Ventas"
          />

          {/* Linea de costo total */}
          <Line
            type="monotone"
            dataKey="totalCost"
            stroke="#EF4444"
            strokeWidth={3}
            dot={false}
            name="Costo Total"
          />

          {/* Punto de equilibrio */}
          <ReferenceLine
            x={Math.round(breakevenMonthly)}
            stroke="#F59E0B"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: `Equilibrio: ${formatDollar(breakevenMonthly)}`,
              position: "top",
              fill: "#92400E",
              fontSize: 11,
              fontWeight: 700,
            }}
          />

          {/* Ventas actuales */}
          <ReferenceLine
            x={Math.round(currentSales)}
            stroke="#10B981"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: `Hoy: ${formatDollar(currentSales)}`,
              position: "top",
              fill: "#065F46",
              fontSize: 11,
              fontWeight: 700,
            }}
          />

          {/* Meta */}
          {targetSales && (
            <ReferenceLine
              x={Math.round(targetSales)}
              stroke="#8B5CF6"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Meta: ${formatDollar(targetSales)}`,
                position: "top",
                fill: "#6D28D9",
                fontSize: 11,
                fontWeight: 700,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Leyenda mejorada */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded bg-blue-500" />
          <span className="text-xs text-slate-500">Ventas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded bg-red-500" />
          <span className="text-xs text-slate-500">Costo Total</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded bg-amber-500" />
          <span className="text-xs text-slate-500">Equilibrio</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
          <span className="text-xs text-slate-500">Zona Beneficio</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
          <span className="text-xs text-slate-500">Zona Deficit</span>
        </div>
      </div>

      {/* Summary cards con SmartTooltip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700 uppercase flex items-center">
              Punto de Equilibrio
              <SmartTooltip term="breakeven" size={12} />
            </span>
          </div>
          <p className="text-xl font-extrabold text-amber-800">
            {formatDollar(breakevenMonthly)}/mes
          </p>
        </div>

        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase">
              Ventas Actuales
            </span>
          </div>
          <p className="text-xl font-extrabold text-blue-800">
            {formatDollar(currentSales)}/mes
          </p>
        </div>

        <div className={`p-4 rounded-xl ${zoneStyle.bg} border ${zoneStyle.border}`}>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className={zoneStyle.text} />
            <span className={`text-xs font-bold uppercase flex items-center ${zoneStyle.text}`}>
              Margen Seguridad
              <SmartTooltip term="margen_seguridad" size={12} />
            </span>
          </div>
          <p className={`text-xl font-extrabold ${zoneStyle.text}`}>
            {marginOfSafety >= 0 ? "+" : ""}
            {formatDollar(marginOfSafety)}
          </p>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${zoneStyle.bg} ${zoneStyle.text} border ${zoneStyle.border}`}
          >
            ZONA {zoneStyle.label}
          </span>
        </div>
      </div>
    </div>
  );
}
