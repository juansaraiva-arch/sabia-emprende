"use client";
import React, { useState, useMemo } from "react";
import {
  DollarSign,
  Users,
  AlertTriangle,
  TrendingDown,
  Info,
  Shield,
  ArrowRight,
  Plus,
  Trash2,
  Calculator,
} from "lucide-react";
import SmartTooltip from "@/components/SmartTooltip";

// ============================================
// TYPES
// ============================================

interface SimRow {
  id: string;
  cargo: string;
  tipo: "planilla" | "freelance";
  salario: number;
  cantidad: number;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calcISR(salario: number): number {
  if (salario <= 846.15) return 0;
  if (salario <= 1538.46) return (salario - 846.15) * 0.15;
  let isr = (1538.46 - 846.15) * 0.15;
  isr += (salario - 1538.46) * 0.25;
  return isr;
}

function calcCargaPlanilla(salario: number) {
  const cssP = salario * 0.1325;
  const seP = salario * 0.015;
  const rpP = salario * 0.015;
  const decimo = salario / 12;
  const vac = salario * 0.0909;
  const cesantia = salario * 0.0225;
  const totalPatronal = cssP + seP + rpP + decimo + vac + cesantia;

  const cssE = salario * 0.0975;
  const seE = salario * 0.0125;
  const isrE = calcISR(salario);
  const totalDeduccion = cssE + seE + isrE;

  return {
    costoEmpresa: r2(salario + totalPatronal),
    netoEmpleado: r2(salario - totalDeduccion),
    sobrecosto: r2(totalPatronal),
    pctSobrecosto: r2((totalPatronal / salario) * 100),
  };
}

function calcCargaFreelance(honorario: number) {
  return {
    costoEmpresa: r2(honorario),
    netoEmpleado: r2(honorario * 0.9),
    sobrecosto: 0,
    pctSobrecosto: 0,
  };
}

function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================
// COMPONENT
// ============================================

export default function SimuladorCostoPlanilla() {
  const [rows, setRows] = useState<SimRow[]>([
    { id: genId(), cargo: "Vendedor", tipo: "planilla", salario: 800, cantidad: 1 },
    { id: genId(), cargo: "Asistente Admin", tipo: "planilla", salario: 650, cantidad: 1 },
  ]);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: genId(), cargo: "", tipo: "planilla", salario: 0, cantidad: 1 },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof SimRow, value: string | number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Compute totals
  const results = useMemo(() => {
    let totalBruto = 0;
    let totalCosto = 0;
    let totalNeto = 0;
    let countPlanilla = 0;
    let countFreelance = 0;

    const detalles = rows.map((row) => {
      const calc = row.tipo === "planilla"
        ? calcCargaPlanilla(row.salario)
        : calcCargaFreelance(row.salario);

      const qty = Math.max(1, row.cantidad);
      totalBruto += row.salario * qty;
      totalCosto += calc.costoEmpresa * qty;
      totalNeto += calc.netoEmpleado * qty;
      if (row.tipo === "planilla") countPlanilla += qty;
      else countFreelance += qty;

      return { ...row, ...calc, qty };
    });

    return {
      detalles,
      totalBruto: r2(totalBruto),
      totalCosto: r2(totalCosto),
      totalNeto: r2(totalNeto),
      totalSobrecosto: r2(totalCosto - totalBruto),
      costoAnual: r2(totalCosto * 12),
      countPlanilla,
      countFreelance,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* ====== BANNER INFORMATIVO ====== */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
        <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-blue-700">
            Simulador de Costos Estimados
          </p>
          <p className="text-[10px] text-blue-600 mt-0.5">
            Este simulador calcula costos aproximados de planilla. No guarda datos de empleados reales
            ni alimenta formularios fiscales. Para gestionar tu planilla real y generar formularios,
            ve a <span className="font-bold">Mi Contabilidad &rarr; Mi RRHH</span>.
          </p>
        </div>
      </div>

      {/* ====== LEY 462 BANNER ====== */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <Shield size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-700">
            Ley 462 de 2025 — Tasas aplicadas
          </p>
          <p className="text-[10px] text-amber-600 mt-0.5">
            CSS Patronal 13.25%, SE 1.50%, Riesgos Prof. 1.50%, Fondo Cesantia 2.25%,
            XIII Mes 8.33%, Vacaciones 9.09%. ISR progresivo (3 tramos DGI).
          </p>
        </div>
      </div>

      {/* ====== SUMMARY CARDS ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Salario Bruto Total"
          value={results.totalBruto}
          icon={<DollarSign size={16} />}
          color="blue"
          subtitle={`${results.countPlanilla} planilla, ${results.countFreelance} freelance`}
        />
        <SummaryCard
          label="Costo Real Empresa"
          value={results.totalCosto}
          icon={<AlertTriangle size={16} />}
          color="red"
          highlight
          subtitle={`Anual: B/.${results.costoAnual.toLocaleString("es-PA")}`}
        />
        <SummaryCard
          label="Neto Total"
          value={results.totalNeto}
          icon={<Users size={16} />}
          color="emerald"
        />
        <SummaryCard
          label="Sobrecosto Oculto"
          value={results.totalSobrecosto}
          icon={<TrendingDown size={16} />}
          color="amber"
          subtitle={results.totalBruto > 0 ? `+${((results.totalSobrecosto / results.totalBruto) * 100).toFixed(1)}% sobre bruto` : ""}
        />
      </div>

      {/* ====== ROWS ====== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
            <Calculator size={14} />
            Cargos Simulados ({rows.length})
          </h3>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all"
          >
            <Plus size={14} />
            Agregar Cargo
          </button>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {rows.map((row) => {
            const calc = row.tipo === "planilla"
              ? calcCargaPlanilla(row.salario)
              : calcCargaFreelance(row.salario);

            return (
              <div
                key={row.id}
                className="p-3 rounded-xl border border-slate-200 bg-white space-y-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={row.cargo}
                    onChange={(e) => updateRow(row.id, "cargo", e.target.value)}
                    placeholder="Cargo / Descripcion..."
                    className="flex-1 min-w-[120px] text-sm font-medium bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-800 placeholder:text-slate-300"
                  />
                  <select
                    value={row.tipo}
                    onChange={(e) => updateRow(row.id, "tipo", e.target.value)}
                    className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option value="planilla">Planilla</option>
                    <option value="freelance">Freelance</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-emerald-500">B/.</span>
                    <input
                      type="number"
                      value={row.salario || ""}
                      onChange={(e) => updateRow(row.id, "salario", parseFloat(e.target.value) || 0)}
                      placeholder="Salario"
                      className="w-20 text-sm font-bold bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-800"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">x</span>
                    <input
                      type="number"
                      value={row.cantidad}
                      onChange={(e) => updateRow(row.id, "cantidad", parseInt(e.target.value) || 1)}
                      min={1}
                      max={50}
                      className="w-10 text-sm text-center bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-700"
                    />
                  </div>
                  <button
                    onClick={() => removeRow(row.id)}
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {/* Result row */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-red-600 font-bold">
                    Costo: B/.{calc.costoEmpresa.toLocaleString("es-PA")}
                    {row.cantidad > 1 && ` x${row.cantidad} = B/.${(calc.costoEmpresa * row.cantidad).toLocaleString("es-PA")}`}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    Neto: B/.{calc.netoEmpleado.toLocaleString("es-PA")}
                  </span>
                  {row.tipo === "planilla" && calc.pctSobrecosto > 0 && (
                    <span className="text-[10px] text-amber-600 font-bold ml-auto">
                      +{calc.pctSobrecosto.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="py-8 text-center">
              <Calculator size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">Agrega cargos para simular costos</p>
            </div>
          )}
        </div>
      </div>

      {/* ====== ISR REFERENCE ====== */}
      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className="text-blue-600" />
          <p className="text-[11px] font-bold text-blue-700">
            Tabla ISR Mensual DGI 2026 (3 tramos)
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="p-2 rounded-lg bg-white border border-blue-100 text-center">
            <p className="font-bold text-emerald-600">0%</p>
            <p className="text-slate-500">$0 - $846</p>
          </div>
          <div className="p-2 rounded-lg bg-white border border-blue-100 text-center">
            <p className="font-bold text-amber-600">15%</p>
            <p className="text-slate-500">$846 - $1,538</p>
          </div>
          <div className="p-2 rounded-lg bg-white border border-blue-100 text-center">
            <p className="font-bold text-red-600">25%</p>
            <p className="text-slate-500">{">"}$1,538</p>
          </div>
        </div>
      </div>

      {/* ====== CTA TO MI RRHH ====== */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200">
        <div className="flex-1">
          <p className="text-xs font-bold text-blue-800">Necesitas la planilla real?</p>
          <p className="text-[10px] text-blue-600 mt-0.5">
            Registra empleados, procesa nomina mensual y genera formularios DGI automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
          Mi RRHH <ArrowRight size={14} />
        </div>
      </div>

      {/* ====== LEGAL FOOTER ====== */}
      <p className="text-[10px] text-slate-400 italic border-t border-slate-100 pt-3">
        Basado en legislacion laboral de Panama 2026. Ley 462 de 2025: CSS Patronal 13.25%,
        SE 1.50%, Riesgos Prof. 1.50%, Fondo Cesantia 2.25%, XIII Mes (8.33%), Vacaciones (9.09%).
        ISR segun tabla DGI mensual 2026 (3 tramos progresivos). Esto es una estimacion educativa,
        no constituye asesoria legal ni contable.
      </p>
    </div>
  );
}

// ============================================
// HELPER
// ============================================

function SummaryCard({
  label,
  value,
  icon,
  color,
  highlight = false,
  subtitle,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
  subtitle?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`p-3 rounded-xl border ${c.border} ${c.bg} ${highlight ? "ring-2 ring-red-200" : ""}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={c.text}>{icon}</span>
        <span className={`text-[10px] font-bold uppercase ${c.text}`}>{label}</span>
      </div>
      <p className={`text-lg font-extrabold ${c.text}`}>
        B/.{value.toLocaleString("es-PA")}
      </p>
      {subtitle && (
        <p className={`text-[10px] mt-0.5 ${c.text} opacity-70`}>{subtitle}</p>
      )}
    </div>
  );
}
