"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Calculator,
  AlertTriangle,
  Banknote,
  Landmark,
  ArrowRight,
  RefreshCw,
  ChevronRight,
  DollarSign,
  Percent,
} from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";
import { formatBalboas } from "@/lib/currency";
import {
  computeFlujoCaja90Dias,
  computeEscenarios,
  computeProyeccionFiscal,
  crearInputsDesdeRecord,
} from "@/lib/proyecciones";
import type {
  ProyeccionInputs,
  FlujoCajaResult,
  EscenariosResult,
  ProyeccionFiscalResult,
} from "@/lib/proyecciones";

// ============================================
// TIPOS
// ============================================

interface ProyeccionesFinancierasProps {
  record: FinancialRecord;
}

type SubTab = "flujo" | "escenarios" | "fiscal";

const STORAGE_KEY = "midf_proyecciones_flujo";

// ============================================
// HELPERS
// ============================================

function semaforoColor(s: "verde" | "amarillo" | "rojo") {
  return s === "verde"
    ? "text-emerald-600"
    : s === "amarillo"
      ? "text-amber-500"
      : "text-red-600";
}

function semaforoBg(s: "verde" | "amarillo" | "rojo") {
  return s === "verde"
    ? "bg-emerald-50 border-emerald-200"
    : s === "amarillo"
      ? "bg-amber-50 border-amber-200"
      : "bg-red-50 border-red-200";
}

function semaforoDot(s: "verde" | "amarillo" | "rojo") {
  return s === "verde"
    ? "bg-emerald-500"
    : s === "amarillo"
      ? "bg-amber-500"
      : "bg-red-500";
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ProyeccionesFinancieras({
  record,
}: ProyeccionesFinancierasProps) {
  const [activeTab, setActiveTab] = useState<SubTab>("flujo");

  // ===== FLUJO DE CAJA — State =====
  const defaultInputs = useMemo(() => crearInputsDesdeRecord(record), [record]);

  const [flujoInputs, setFlujoInputs] = useState<ProyeccionInputs>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return defaultInputs;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flujoInputs));
    } catch { /* ignore */ }
  }, [flujoInputs]);

  const flujoResult = useMemo(
    () => computeFlujoCaja90Dias(flujoInputs),
    [flujoInputs]
  );

  // ===== ESCENARIOS — State =====
  const [varOptimista, setVarOptimista] = useState(20);
  const [varPesimista, setVarPesimista] = useState(-20);

  const escenariosResult = useMemo(
    () => computeEscenarios(record, varOptimista, varPesimista),
    [record, varOptimista, varPesimista]
  );

  // ===== FISCAL — derived =====
  const ventasProyectadas3m = useMemo(
    () =>
      flujoInputs.ingresosMes1 + flujoInputs.ingresosMes2 + flujoInputs.ingresosMes3,
    [flujoInputs]
  );

  const fiscalResult = useMemo(
    () => computeProyeccionFiscal(record, ventasProyectadas3m),
    [record, ventasProyectadas3m]
  );

  const resetFlujo = () => setFlujoInputs(defaultInputs);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-emerald-600" />
        <h3 className="text-lg font-extrabold text-slate-800">
          Proyecciones Financieras
        </h3>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { key: "flujo" as SubTab, label: "Flujo de Caja 90d", icon: <Banknote size={14} /> },
          { key: "escenarios" as SubTab, label: "Escenarios", icon: <Calculator size={14} /> },
          { key: "fiscal" as SubTab, label: "Proyeccion Fiscal", icon: <Landmark size={14} /> },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === t.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ====== TAB: FLUJO DE CAJA 90 DIAS ====== */}
      {activeTab === "flujo" && (
        <FlujoTab
          inputs={flujoInputs}
          setInputs={setFlujoInputs}
          result={flujoResult}
          onReset={resetFlujo}
        />
      )}

      {/* ====== TAB: ESCENARIOS ====== */}
      {activeTab === "escenarios" && (
        <EscenariosTab
          result={escenariosResult}
          varOptimista={varOptimista}
          varPesimista={varPesimista}
          setVarOptimista={setVarOptimista}
          setVarPesimista={setVarPesimista}
        />
      )}

      {/* ====== TAB: FISCAL ====== */}
      {activeTab === "fiscal" && (
        <FiscalTab result={fiscalResult} />
      )}
    </div>
  );
}

// ============================================
// SUB-TAB: FLUJO DE CAJA
// ============================================

function FlujoTab({
  inputs,
  setInputs,
  result,
  onReset,
}: {
  inputs: ProyeccionInputs;
  setInputs: React.Dispatch<React.SetStateAction<ProyeccionInputs>>;
  result: FlujoCajaResult;
  onReset: () => void;
}) {
  const updateField = (field: keyof ProyeccionInputs, value: number) =>
    setInputs((prev) => ({ ...prev, [field]: value }));

  const updateEstacionalidad = (idx: number, value: number) =>
    setInputs((prev) => {
      const e: [number, number, number] = [...prev.estacionalidad];
      e[idx] = value;
      return { ...prev, estacionalidad: e };
    });

  // Chart data
  const chartData = result.meses.map((m) => ({
    label: m.label,
    ingresos: m.ingresos,
    gastos: m.gastosTotales,
    flujoNeto: m.flujoNeto,
    saldo: m.saldoAcumulado,
    semaforo: m.semaforo,
  }));

  return (
    <div className="space-y-4">
      {/* Alerta semaforo */}
      <div className={`rounded-xl border p-3 flex items-start gap-3 ${semaforoBg(result.semaforoGeneral)}`}>
        <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${semaforoDot(result.semaforoGeneral)}`} />
        <div>
          <p className={`text-sm font-bold ${semaforoColor(result.semaforoGeneral)}`}>
            {result.semaforoGeneral === "verde" ? "Caja Saludable" : result.semaforoGeneral === "amarillo" ? "Atencion Requerida" : "Riesgo de Liquidez"}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">{result.alertaText}</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-slate-700">Ingresos Proyectados</h4>
            <button onClick={onReset} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <RefreshCw size={10} /> Reiniciar
            </button>
          </div>
          {(["ingresosMes1", "ingresosMes2", "ingresosMes3"] as const).map((field, i) => (
            <NumInput key={field} label={`Mes ${i + 1}`} value={inputs[field]} onChange={(v) => updateField(field, v)} prefix="B/." />
          ))}
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
          <h4 className="text-sm font-bold text-slate-700 mb-1">Gastos y Saldo</h4>
          <NumInput label="Gastos Fijos / mes" value={inputs.gastosFijos} onChange={(v) => updateField("gastosFijos", v)} prefix="B/." />
          <NumInput label="Gastos Variables" value={inputs.gastosVariablesPct} onChange={(v) => updateField("gastosVariablesPct", v)} suffix="% s/ventas" min={0} max={100} />
          <NumInput label="Saldo Inicial" value={inputs.saldoInicial} onChange={(v) => updateField("saldoInicial", v)} prefix="B/." />
        </div>
      </div>

      {/* Estacionalidad */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h4 className="text-sm font-bold text-slate-700 mb-2">Factor Estacionalidad</h4>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Mes {i + 1}</label>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={inputs.estacionalidad[i]}
                onChange={(e) => updateEstacionalidad(i, parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-[10px] text-slate-500 block text-center">{(inputs.estacionalidad[i] * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="text-sm font-bold text-slate-700 mb-3">Flujo de Caja Mensual</h4>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number, name: string) => [formatBalboas(value), name === "ingresos" ? "Ingresos" : name === "gastos" ? "Gastos" : name === "flujoNeto" ? "Flujo Neto" : "Saldo"]}
              contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
            />
            <Bar dataKey="ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} name="Ingresos" />
            <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={28} name="Gastos" />
            <Line type="monotone" dataKey="saldo" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: "#10b981" }} name="Saldo" />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla resumen */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 text-slate-500 font-bold">Mes</th>
              <th className="text-right px-3 py-2 text-slate-500 font-bold">Ingresos</th>
              <th className="text-right px-3 py-2 text-slate-500 font-bold">Gastos</th>
              <th className="text-right px-3 py-2 text-slate-500 font-bold">Flujo</th>
              <th className="text-right px-3 py-2 text-slate-500 font-bold">Saldo</th>
              <th className="text-center px-3 py-2 text-slate-500 font-bold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {result.meses.map((m) => (
              <tr key={m.mes} className="border-t border-slate-100">
                <td className="px-3 py-2 font-bold text-slate-700">{m.label}</td>
                <td className="px-3 py-2 text-right text-blue-600">{formatBalboas(m.ingresos)}</td>
                <td className="px-3 py-2 text-right text-red-500">{formatBalboas(m.gastosTotales)}</td>
                <td className={`px-3 py-2 text-right font-bold ${m.flujoNeto >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatBalboas(m.flujoNeto)}</td>
                <td className={`px-3 py-2 text-right font-bold ${m.saldoAcumulado >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatBalboas(m.saldoAcumulado)}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${semaforoDot(m.semaforo)}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// SUB-TAB: ESCENARIOS
// ============================================

function EscenariosTab({
  result,
  varOptimista,
  varPesimista,
  setVarOptimista,
  setVarPesimista,
}: {
  result: EscenariosResult;
  varOptimista: number;
  varPesimista: number;
  setVarOptimista: (v: number) => void;
  setVarPesimista: (v: number) => void;
}) {
  const COLORS = { optimista: "#10b981", base: "#3b82f6", pesimista: "#ef4444" };

  return (
    <div className="space-y-4">
      {/* Sliders variacion */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
          <label className="text-[10px] font-bold text-emerald-700 block mb-1">Variacion Optimista</label>
          <input type="range" min={5} max={50} value={varOptimista} onChange={(e) => setVarOptimista(Number(e.target.value))} className="w-full accent-emerald-500" />
          <span className="text-xs font-bold text-emerald-600 block text-center">+{varOptimista}%</span>
        </div>
        <div className="bg-red-50 rounded-xl p-3 border border-red-200">
          <label className="text-[10px] font-bold text-red-700 block mb-1">Variacion Pesimista</label>
          <input type="range" min={-50} max={-5} value={varPesimista} onChange={(e) => setVarPesimista(Number(e.target.value))} className="w-full accent-red-500" />
          <span className="text-xs font-bold text-red-600 block text-center">{varPesimista}%</span>
        </div>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {result.escenarios.map((e) => {
          const borderColor = e.tipo === "optimista" ? "border-emerald-300" : e.tipo === "base" ? "border-blue-300" : "border-red-300";
          const bgColor = e.tipo === "optimista" ? "bg-emerald-50" : e.tipo === "base" ? "bg-blue-50" : "bg-red-50";
          const textColor = e.tipo === "optimista" ? "text-emerald-700" : e.tipo === "base" ? "text-blue-700" : "text-red-700";

          return (
            <div key={e.tipo} className={`rounded-xl border-2 ${borderColor} ${bgColor} p-4 space-y-2`}>
              <h4 className={`text-sm font-extrabold ${textColor}`}>{e.label}</h4>
              <p className="text-[10px] text-slate-500">{e.variacionPct > 0 ? "+" : ""}{e.variacionPct}% en ventas</p>
              <div className="space-y-1.5">
                <MetricRow label="Ventas" value={formatBalboas(e.ventasMensuales)} />
                <MetricRow label="Ut. Bruta" value={formatBalboas(e.utilidadBruta)} />
                <MetricRow label="Ut. Neta" value={formatBalboas(e.utilidadNeta)} bold color={e.utilidadNeta >= 0 ? "text-emerald-600" : "text-red-600"} />
                <MetricRow label="Margen" value={`${e.margenNeto.toFixed(1)}%`} />
                <MetricRow label="P. Equilibrio" value={formatBalboas(e.puntoEquilibrio)} />
                {e.mesesRunway !== null && (
                  <MetricRow label="Runway" value={`${e.mesesRunway} meses`} color="text-amber-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart comparativo */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="text-sm font-bold text-slate-700 mb-3">Comparativo de Escenarios</h4>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={result.chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number, name: string) => [formatBalboas(value), name === "optimista" ? "Optimista" : name === "base" ? "Base" : "Pesimista"]}
              contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
            />
            <Legend />
            <Bar dataKey="optimista" fill={COLORS.optimista} radius={[4, 4, 0, 0]} name="Optimista" />
            <Bar dataKey="base" fill={COLORS.base} radius={[4, 4, 0, 0]} name="Base" />
            <Bar dataKey="pesimista" fill={COLORS.pesimista} radius={[4, 4, 0, 0]} name="Pesimista" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================
// SUB-TAB: PROYECCION FISCAL
// ============================================

function FiscalTab({ result }: { result: ProyeccionFiscalResult }) {
  return (
    <div className="space-y-4">
      {/* Alerta principal */}
      <div className={`rounded-xl border p-3 flex items-start gap-3 ${result.debeRegistrarITBMS ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
        <AlertTriangle size={16} className={result.debeRegistrarITBMS ? "text-amber-500 mt-0.5" : "text-emerald-500 mt-0.5"} />
        <div>
          <p className={`text-sm font-bold ${result.debeRegistrarITBMS ? "text-amber-700" : "text-emerald-700"}`}>
            {result.debeRegistrarITBMS ? "Obligado a declarar ITBMS" : "Por debajo del umbral ITBMS"}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">{result.alertaText}</p>
        </div>
      </div>

      {/* Cards de impuestos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FiscalCard
          title="ITBMS Estimado"
          subtitle="7% sobre ventas gravadas"
          value={formatBalboas(result.itbmsEstimado)}
          icon={<Percent size={18} />}
          color="blue"
        />
        <FiscalCard
          title="ISR Estimado"
          subtitle="25% sobre utilidad (PJ)"
          value={formatBalboas(result.isrEstimado)}
          icon={<DollarSign size={18} />}
          color="violet"
        />
        <FiscalCard
          title="Total a Apartar"
          subtitle="Reserva impuestos 3 meses"
          value={formatBalboas(result.totalApartar)}
          icon={<Banknote size={18} />}
          color="amber"
          highlight
        />
      </div>

      {/* Detalle */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h4 className="text-sm font-bold text-slate-700">Detalle de Proyeccion</h4>
        <div className="space-y-2">
          <DetailRow label="Ventas Proyectadas (3 meses)" value={formatBalboas(result.ventasProyectadas3m)} />
          <DetailRow label="ITBMS (7%)" value={formatBalboas(result.itbmsEstimado)} />
          <DetailRow label="ISR PJ (25% s/ utilidad)" value={formatBalboas(result.isrEstimado)} />
          <div className="pt-2 border-t border-slate-200">
            <DetailRow label="Total a Apartar" value={formatBalboas(result.totalApartar)} bold />
          </div>
        </div>
      </div>

      {/* Proximo vencimiento */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-3">
        <Landmark size={18} className="text-slate-500 shrink-0" />
        <div>
          <p className="text-xs font-bold text-slate-600">Proximo Vencimiento DGI</p>
          <p className="text-sm font-bold text-slate-800">{result.proximoVencimiento}</p>
        </div>
      </div>

      {/* Registro ITBMS */}
      {result.debeRegistrarITBMS && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <h4 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-2">
            <AlertTriangle size={14} />
            Registro ITBMS Obligatorio
          </h4>
          <p className="text-xs text-amber-800">
            Con ventas anuales proyectadas por encima de B/.36,000, estas obligado a registrarte como contribuyente ITBMS ante la DGI. Si aun no lo has hecho, hazlo antes de la proxima declaracion trimestral.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function NumInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">{label}</label>
      <div className="flex items-center gap-1.5">
        {prefix && <span className="text-[10px] text-slate-400 font-bold">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => {
            let v = parseFloat(e.target.value) || 0;
            if (min !== undefined) v = Math.max(min, v);
            if (max !== undefined) v = Math.min(max, v);
            onChange(v);
          }}
          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        {suffix && <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className={`text-xs ${bold ? "font-extrabold" : "font-bold"} ${color || "text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}

function FiscalCard({
  title,
  subtitle,
  value,
  icon,
  color,
  highlight,
}: {
  title: string;
  subtitle: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "violet" | "amber";
  highlight?: boolean;
}) {
  const colorMap = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", value: "text-blue-700" },
    violet: { bg: "bg-violet-50", border: "border-violet-200", icon: "text-violet-600", value: "text-violet-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", value: "text-amber-700" },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-xl border ${highlight ? "border-2" : ""} ${c.border} ${c.bg} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={c.icon}>{icon}</span>
        <span className="text-xs font-bold text-slate-600">{title}</span>
      </div>
      <p className={`text-xl font-extrabold ${c.value}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs ${bold ? "font-extrabold text-slate-800" : "font-bold text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}
