"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  BarChart3,
  Table2,
  Pencil,
  Check,
  X,
  RotateCcw,
  Info,
} from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";
import { formatBalboas } from "@/lib/currency";
import {
  calcularForecast12Meses,
  buildHistorialFromVentas,
  calcularSupuestosDesdeRecord,
  saveForecastEdit,
  clearForecastEdit,
} from "@/lib/analytics/forecast-engine";
import type {
  SupuestosForecast,
  MesProyectado,
  ResultadoForecast,
} from "@/lib/analytics/forecast-engine";
import ForecastSupuestos from "./ForecastSupuestos";

// ============================================
// TIPOS
// ============================================

interface ForecastPLProps {
  societyId: string;
  record: FinancialRecord | null;
}

// ============================================
// TOOLTIP PERSONALIZADO PARA RECHARTS
// ============================================

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}:</span>
          <span className="font-semibold">{formatBalboas(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ForecastPL({ societyId, record }: ForecastPLProps) {
  // ---- Estado de supuestos ----
  const [supuestos, setSupuestos] = useState<SupuestosForecast>(() =>
    calcularSupuestosDesdeRecord(record)
  );

  // ---- Trigger de recalculo ----
  const [version, setVersion] = useState(0);

  // ---- Vista: chart vs table ----
  const [vista, setVista] = useState<"chart" | "table">("chart");

  // ---- Edicion inline de revenue ----
  const [editingCell, setEditingCell] = useState<string | null>(null); // "2026-3"
  const [editValue, setEditValue] = useState("");

  // Recalcular supuestos si record cambia
  useEffect(() => {
    setSupuestos(calcularSupuestosDesdeRecord(record));
  }, [record]);

  // ---- Calculo del forecast ----
  const resultado: ResultadoForecast = useMemo(() => {
    const historial = buildHistorialFromVentas(societyId);

    // Determinar mes de inicio: mes siguiente al ultimo historico, o mes actual
    let mesInicio: { anio: number; mes: number };
    if (historial.length > 0) {
      const ultimo = historial[historial.length - 1];
      if (ultimo.mes === 12) {
        mesInicio = { anio: ultimo.anio + 1, mes: 1 };
      } else {
        mesInicio = { anio: ultimo.anio, mes: ultimo.mes + 1 };
      }
    } else {
      const now = new Date();
      mesInicio = { anio: now.getFullYear(), mes: now.getMonth() + 1 };
    }

    return calcularForecast12Meses(historial, supuestos, mesInicio, societyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societyId, supuestos, record, version]);

  // ---- Datos combinados para chart ----
  const chartData = useMemo(() => {
    const data: Array<{
      label: string;
      historico?: number;
      proyeccion?: number;
      ebitda_hist?: number;
      ebitda_proy?: number;
    }> = [];

    // Historico
    for (const m of resultado.historico) {
      data.push({
        label: m.mesLabel,
        historico: m.revenue,
        ebitda_hist: m.ebitda,
      });
    }

    // Punto de conexion: ultimo historico = primer punto proyectado
    if (resultado.historico.length > 0) {
      const last = resultado.historico[resultado.historico.length - 1];
      // Agregar como punto de enlace en la serie proyectada
      data[data.length - 1] = {
        ...data[data.length - 1],
        proyeccion: last.revenue,
        ebitda_proy: last.ebitda,
      };
    }

    // Proyeccion
    for (const m of resultado.proyeccion) {
      data.push({
        label: m.mesLabel,
        proyeccion: m.revenue,
        ebitda_proy: m.ebitda,
      });
    }

    return data;
  }, [resultado]);

  // ---- Todas las filas (historico + proyeccion) para la tabla ----
  const allMeses = useMemo(
    () => [...resultado.historico, ...resultado.proyeccion],
    [resultado]
  );

  // ---- Handlers ----
  const handleSupuestosChange = useCallback((s: SupuestosForecast) => {
    setSupuestos(s);
  }, []);

  const handleStartEdit = (m: MesProyectado) => {
    if (m.es_real) return; // No editar meses historicos
    setEditingCell(`${m.anio}-${m.mes}`);
    setEditValue(String(m.revenue));
  };

  const handleConfirmEdit = (m: MesProyectado) => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) {
      saveForecastEdit(societyId, m.anio, m.mes, val);
      setVersion((v) => v + 1);
    }
    setEditingCell(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleResetEdit = (m: MesProyectado) => {
    clearForecastEdit(societyId, m.anio, m.mes);
    setVersion((v) => v + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent, m: MesProyectado) => {
    if (e.key === "Enter") handleConfirmEdit(m);
    if (e.key === "Escape") handleCancelEdit();
  };

  // ---- Icono de tendencia ----
  const TendenciaIcon =
    resultado.kpis.tendencia === "creciente"
      ? TrendingUp
      : resultado.kpis.tendencia === "decreciente"
        ? TrendingDown
        : Minus;

  const tendenciaColor =
    resultado.kpis.tendencia === "creciente"
      ? "text-emerald-600"
      : resultado.kpis.tendencia === "decreciente"
        ? "text-red-600"
        : "text-amber-600";

  const tendenciaLabel =
    resultado.kpis.tendencia === "creciente"
      ? "Creciente"
      : resultado.kpis.tendencia === "decreciente"
        ? "Decreciente"
        : "Estable";

  // ---- Metodo label ----
  const metodoLabel =
    resultado.metodo === "regresion_lineal"
      ? "Regresion Lineal"
      : resultado.metodo === "promedio_simple"
        ? "Promedio Simple"
        : "Sin Datos";

  // ---- Filas de la tabla P&L ----
  const rows: Array<{
    label: string;
    key: keyof MesProyectado;
    bold?: boolean;
    highlight?: boolean;
  }> = [
    { label: "Revenue", key: "revenue", bold: true },
    { label: "(-) COGS", key: "cogs" },
    { label: "U. Bruta", key: "utilidad_bruta", bold: true },
    { label: "(-) OPEX", key: "opex" },
    { label: "(-) Nomina", key: "nomina" },
    { label: "EBITDA", key: "ebitda", bold: true, highlight: true },
    { label: "U. Neta", key: "utilidad_neta", bold: true, highlight: true },
  ];

  return (
    <div className="space-y-6">
      {/* ====== HEADER ====== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator size={20} className="text-[#C5A059]" />
          <h3 className="text-lg font-extrabold text-slate-800">
            Proyeccion Financiera 12 Meses
          </h3>
        </div>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
          {metodoLabel}
        </span>
      </div>

      {/* ====== KPIs RESUMEN ====== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Revenue Total 12m */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
            Revenue 12M
          </p>
          <p className="text-lg font-extrabold text-slate-800">
            {formatBalboas(resultado.kpis.revenue_total_12m, { compact: true })}
          </p>
        </div>

        {/* Utilidad Neta 12m */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
            U. Neta 12M
          </p>
          <p
            className={`text-lg font-extrabold ${
              resultado.kpis.utilidad_neta_12m >= 0
                ? "text-emerald-700"
                : "text-red-600"
            }`}
          >
            {formatBalboas(resultado.kpis.utilidad_neta_12m, { compact: true })}
          </p>
        </div>

        {/* Margen Neto Promedio */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
            Margen Neto
          </p>
          <p
            className={`text-lg font-extrabold ${
              resultado.kpis.margen_neto_promedio >= 0
                ? "text-emerald-700"
                : "text-red-600"
            }`}
          >
            {resultado.kpis.margen_neto_promedio.toFixed(1)}%
          </p>
        </div>

        {/* Tendencia */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
            Tendencia
          </p>
          <div className="flex items-center gap-2">
            <TendenciaIcon size={20} className={tendenciaColor} />
            <p className={`text-lg font-extrabold ${tendenciaColor}`}>
              {tendenciaLabel}
            </p>
          </div>
        </div>
      </div>

      {/* ====== BREAKEVEN ALERT ====== */}
      {resultado.kpis.mes_breakeven !== null && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-emerald-800">
          <Info size={16} />
          <span>
            Punto de equilibrio estimado en el{" "}
            <strong>mes {resultado.kpis.mes_breakeven}</strong> de la proyeccion
          </span>
        </div>
      )}

      {/* ====== TOGGLE VISTA ====== */}
      <div className="flex gap-2">
        <button
          onClick={() => setVista("chart")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            vista === "chart"
              ? "bg-[#1A242F] text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <BarChart3 size={14} />
          Grafico
        </button>
        <button
          onClick={() => setVista("table")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            vista === "table"
              ? "bg-[#1A242F] text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Table2 size={14} />
          Tabla P&L
        </button>
      </div>

      {/* ====== CHART ====== */}
      {vista === "chart" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                }
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconType="line"
              />
              {/* Revenue historico (linea solida azul) */}
              <Line
                type="monotone"
                dataKey="historico"
                name="Revenue Real"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#3b82f6" }}
                connectNulls={false}
              />
              {/* Revenue proyectado (linea punteada esmeralda) */}
              <Line
                type="monotone"
                dataKey="proyeccion"
                name="Revenue Proyectado"
                stroke="#10b981"
                strokeWidth={2.5}
                strokeDasharray="8 4"
                dot={{ r: 4, fill: "#10b981" }}
                connectNulls={false}
              />
              {/* EBITDA historico */}
              <Line
                type="monotone"
                dataKey="ebitda_hist"
                name="EBITDA Real"
                stroke="#6366f1"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
              />
              {/* EBITDA proyectado */}
              <Line
                type="monotone"
                dataKey="ebitda_proy"
                name="EBITDA Proyectado"
                stroke="#a78bfa"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ====== TABLA P&L ====== */}
      {vista === "table" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 bg-slate-50 z-10 px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-500 font-semibold min-w-[100px]">
                    Concepto
                  </th>
                  {allMeses.map((m) => (
                    <th
                      key={`${m.anio}-${m.mes}`}
                      className={`px-2 py-2.5 text-right text-[10px] uppercase tracking-wider font-semibold min-w-[90px] ${
                        m.es_real
                          ? "text-blue-600 bg-blue-50/50"
                          : "text-emerald-600"
                      }`}
                    >
                      {m.mesLabel}
                      {m.es_real && (
                        <span className="block text-[8px] font-normal text-blue-400">
                          Real
                        </span>
                      )}
                      {m.es_editado && (
                        <span className="block text-[8px] font-normal text-amber-500">
                          Editado
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className={`border-b border-slate-100 ${
                      row.highlight ? "bg-slate-50/60" : ""
                    }`}
                  >
                    <td
                      className={`sticky left-0 bg-white z-10 px-3 py-2 text-slate-700 ${
                        row.bold ? "font-bold" : "text-slate-500 pl-6"
                      } ${row.highlight ? "bg-slate-50/60" : ""}`}
                    >
                      {row.label}
                    </td>
                    {allMeses.map((m) => {
                      const cellKey = `${m.anio}-${m.mes}`;
                      const value = m[row.key] as number;
                      const isEditing =
                        row.key === "revenue" &&
                        !m.es_real &&
                        editingCell === cellKey;

                      return (
                        <td
                          key={cellKey}
                          className={`px-2 py-2 text-right whitespace-nowrap ${
                            row.bold ? "font-semibold" : ""
                          } ${
                            m.es_real ? "bg-blue-50/30" : ""
                          } ${
                            value < 0 ? "text-red-600" : "text-slate-700"
                          } ${
                            row.key === "revenue" && !m.es_real
                              ? "cursor-pointer hover:bg-amber-50 group relative"
                              : ""
                          }`}
                          onClick={() => {
                            if (row.key === "revenue" && !m.es_real && !isEditing) {
                              handleStartEdit(m);
                            }
                          }}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-end">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, m)}
                                className="w-20 px-1 py-0.5 border border-amber-300 rounded text-right text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                                autoFocus
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmEdit(m);
                                }}
                                className="text-emerald-600 hover:text-emerald-800"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelEdit();
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {formatBalboas(value, {
                                decimals: true,
                                compact: value >= 10000,
                              })}
                              {row.key === "revenue" && !m.es_real && (
                                <Pencil
                                  size={10}
                                  className="opacity-0 group-hover:opacity-50 text-slate-400"
                                />
                              )}
                              {row.key === "revenue" && m.es_editado && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResetEdit(m);
                                  }}
                                  title="Restaurar valor calculado"
                                  className="opacity-0 group-hover:opacity-100 text-amber-500 hover:text-amber-700"
                                >
                                  <RotateCcw size={10} />
                                </button>
                              )}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====== SUPUESTOS ====== */}
      <ForecastSupuestos
        supuestos={supuestos}
        onChange={handleSupuestosChange}
        metodo={resultado.metodo}
      />
    </div>
  );
}
