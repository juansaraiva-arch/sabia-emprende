"use client";
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Skull, TrendingUp, TrendingDown } from "lucide-react";
import SmartTooltip from "@/components/SmartTooltip";

// ============================================
// TIPOS
// ============================================

interface MandibulasData {
  mes: string;
  ventas: number;
  costos_totales: number;
  utilidad: number;
}

interface MandibulasChartProps {
  data: MandibulasData[];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function MandibulasChart({ data }: MandibulasChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Carga datos de 12 meses (Modo Estratega) para ver las Mandibulas.
      </div>
    );
  }

  // Detectar divergencia (mandibulas abriendose)
  const first = data[0];
  const last = data[data.length - 1];
  const gapInicio = first.ventas - first.costos_totales;
  const gapFin = last.ventas - last.costos_totales;
  const mandibulasAbren = gapFin > gapInicio;
  const mandibulasEstables =
    Math.abs(gapFin - gapInicio) < gapInicio * 0.1;

  // Detectar cruce (mordida)
  const hasCruce = data.some((d) => d.costos_totales > d.ventas);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const ventas = payload.find((p: any) => p.dataKey === "ventas")?.value ?? 0;
    const costos =
      payload.find((p: any) => p.dataKey === "costos_totales")?.value ?? 0;
    const utilidad =
      payload.find((p: any) => p.dataKey === "utilidad")?.value ?? 0;

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-bold text-slate-700 mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-blue-600">
            Ventas: ${ventas.toLocaleString("es-PA")}
          </p>
          <p className="text-red-600">
            Costos: ${costos.toLocaleString("es-PA")}
          </p>
          <p
            className={`font-bold ${
              utilidad >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            Utilidad: ${utilidad.toLocaleString("es-PA")}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ====== STATUS BADGE ====== */}
      <div className="flex items-center gap-3 flex-wrap">
        {hasCruce ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
            <Skull size={14} />
            ZONA DE MORDIDA — Los costos superan las ventas
          </div>
        ) : mandibulasAbren ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            <TrendingUp size={14} />
            Las mandibulas se abren — Tendencia positiva
          </div>
        ) : mandibulasEstables ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
            <TrendingDown size={14} />
            Mandibulas estables — Sin mejora significativa
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
            <TrendingDown size={14} />
            Las mandibulas se cierran — Peligro
          </div>
        )}
      </div>

      {/* ====== CHART ====== */}
      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  ventas: "Ventas",
                  costos_totales: "Costos Totales",
                  utilidad: "Utilidad",
                };
                return <span style={{ color: "#64748b" }}>{labels[value] || value}</span>;
              }}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />

            <Line
              type="monotone"
              dataKey="ventas"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: "#3b82f6" }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="costos_totales"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4, fill: "#ef4444" }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="utilidad"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: "#10b981" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ====== SUMMARY TABLE ====== */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-left font-bold text-slate-500">
                Mes
              </th>
              <th className="px-3 py-2 text-right font-bold text-blue-600">
                Ventas
              </th>
              <th className="px-3 py-2 text-right font-bold text-red-600">
                Costos
              </th>
              <th className="px-3 py-2 text-right font-bold text-emerald-600">
                Utilidad
              </th>
              <th className="px-3 py-2 text-right font-bold text-slate-500">
                Margen
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => {
              const margen =
                d.ventas > 0
                  ? ((d.utilidad / d.ventas) * 100).toFixed(1)
                  : "0.0";
              return (
                <tr
                  key={i}
                  className={`border-t border-slate-200 ${
                    d.utilidad < 0 ? "bg-red-50" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-3 py-2 font-bold text-slate-700">
                    {d.mes}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    ${d.ventas.toLocaleString("es-PA")}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    ${d.costos_totales.toLocaleString("es-PA")}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-bold ${
                      d.utilidad >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    ${d.utilidad.toLocaleString("es-PA")}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500">
                    {margen}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
