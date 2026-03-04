"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Landmark,
  Receipt,
  Scale,
  Siren,
  FastForward,
  RotateCcw,
  Clock,
} from "lucide-react";
import {
  MATRIZ_SANCIONES,
  calcularRecargos,
  calcularRecargoTasaAnual,
  getSemaforoDeclaracion,
  getSemaforoImpuestoMensual,
} from "@/lib/mupaEngine";
import type { SemaforoItem } from "@/lib/mupaEngine";
import { getDocSyncEvents } from "@/lib/formalizacion";

// ============================================
// COMPONENTE PRINCIPAL — MUPA Panel
// Acuerdo Municipal N° 40 de 2011
// ============================================

export default function MupaPanel() {
  // Selector de publicidad
  const [hasPublicidad, setHasPublicidad] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("midf_has_publicidad") === "true";
    return false;
  });

  const handlePublicidadChange = (val: boolean) => {
    setHasPublicidad(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("midf_has_publicidad", val ? "true" : "false");
    }
  };

  // Simulador de recargos
  const [simMontoBase, setSimMontoBase] = useState(0);
  const [simMesesMora, setSimMesesMora] = useState(1);
  const [simTasaAnual, setSimTasaAnual] = useState(0);
  const [simTasaTarde, setSimTasaTarde] = useState(false);

  // Verificar si Declaracion Jurada existe en Boveda KYC
  const [declaracionEnBoveda, setDeclaracionEnBoveda] = useState(false);

  useEffect(() => {
    const checkBoveda = () => {
      const events = getDocSyncEvents();
      const hasDeclaracion = events.some((e) => e.category === "declaracion_mupa");
      if (typeof window !== "undefined") {
        const stepDocs = localStorage.getItem("midf_step_documents");
        if (stepDocs) {
          try {
            const parsed = JSON.parse(stepDocs);
            if (parsed["inscripcion_municipal"]) {
              setDeclaracionEnBoveda(true);
              return;
            }
          } catch {}
        }
      }
      setDeclaracionEnBoveda(hasDeclaracion);
    };
    checkBoveda();
    const interval = setInterval(checkBoveda, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simulador de tiempo (dev)
  const [timeOffsetMonths, setTimeOffsetMonths] = useState(0);
  const [timeOffsetDays, setTimeOffsetDays] = useState(0);

  const simulatedNow = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + timeOffsetMonths);
    d.setDate(d.getDate() + timeOffsetDays);
    return d;
  }, [timeOffsetMonths, timeOffsetDays]);

  const resetTime = () => {
    setTimeOffsetMonths(0);
    setTimeOffsetDays(0);
  };

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="space-y-6">
      {/* ====== HEADER ====== */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-red-50 to-amber-50 border border-red-200">
        <div className="p-2.5 bg-red-100 rounded-xl flex-shrink-0">
          <Landmark size={20} className="text-red-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-red-800">
            Inteligencia Fiscal MUPA
          </h3>
          <p className="text-xs text-red-600 mt-0.5">
            Municipio de Panama — Acuerdo Municipal N° 40 de 2011. Gestiona tus obligaciones municipales, calcula recargos y consulta la matriz de sanciones.
          </p>
        </div>
      </div>

      {/* ====== SIMULADOR DE RECARGOS ====== */}
      <SimuladorRecargos
        montoBase={simMontoBase}
        setMontoBase={setSimMontoBase}
        mesesMora={simMesesMora}
        setMesesMora={setSimMesesMora}
        tasaAnual={simTasaAnual}
        setTasaAnual={setSimTasaAnual}
        tasaTarde={simTasaTarde}
        setTasaTarde={setSimTasaTarde}
      />

      {/* ====== MATRIZ MAESTRA DE SANCIONES ====== */}
      <MatrizSanciones hasPublicidad={hasPublicidad} />

      {/* ====== SEMAFORO DE SUPERVIVENCIA ====== */}
      <SemaforoPanel simulatedNow={simulatedNow} declaracionEnBoveda={declaracionEnBoveda} />

      {/* ====== SELECTOR DE PUBLICIDAD ====== */}
      <details className="rounded-xl border border-amber-200 overflow-hidden" open>
        <summary className="px-4 py-3 cursor-pointer flex items-center gap-2 text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors bg-amber-50/50">
          <AlertTriangle size={14} className="text-amber-500" />
          Diagnostico: Publicidad y Rotulos
        </summary>
        <div className="p-4 bg-white space-y-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={hasPublicidad}
              onChange={(e) => handlePublicidadChange(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-2 border-amber-400 accent-amber-500 flex-shrink-0"
            />
            <div>
              <span className="text-xs font-bold text-amber-800 group-hover:text-amber-900 transition-colors">
                Posee letreros o flota vehicular rotulada?
              </span>
              <p className="text-[10px] text-amber-600 mt-0.5">
                Si tu negocio tiene rotulacion exterior, vallas o vehiculos con publicidad, necesitas un permiso del MUPA. Al marcar esta casilla activaras alertas de precaucion.
              </p>
            </div>
          </label>
          {hasPublicidad && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-[11px] font-bold text-red-700">Alerta de Precaucion</span>
              </div>
              <p className="text-[10px] text-red-600 mt-1">
                Riesgo de sanciones: Publicidad no declarada ($10 a $500 + remocion), rotulos en servidumbre publica ($50 a $1,000). Verifica tu permiso en la Boveda KYC.
              </p>
            </div>
          )}
        </div>
      </details>

      {/* ====== PUENTES DE ACCION ====== */}
      <div className="flex flex-wrap gap-2 justify-center">
        <a
          href="https://mupa.gob.pa/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
        >
          <ExternalLink size={14} />
          Tramites MUPA
        </a>
        <a
          href="https://mupa.gob.pa/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
        >
          <Receipt size={14} />
          Pagar Impuestos Municipales
        </a>
        <a
          href="https://mupa.gob.pa/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
        >
          <FileText size={14} />
          Autorizacion Municipal
        </a>
      </div>

      {/* ====== DEV TIME CONTROLS ====== */}
      {isDev && (
        <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
          <div className="flex items-center gap-2 mb-3">
            <FastForward size={16} className="text-violet-600" />
            <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">
              Simulador de Tiempo (Dev Only)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setTimeOffsetMonths((p) => p + 1)}
              className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all flex items-center gap-1">
              <FastForward size={12} /> +1 Mes
            </button>
            <button onClick={() => setTimeOffsetDays((p) => p + 10)}
              className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-all flex items-center gap-1">
              <FastForward size={12} /> +10 Dias
            </button>
            <button onClick={resetTime}
              className="px-3 py-1.5 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-all flex items-center gap-1">
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Clock size={12} className="text-violet-500" />
            <span className="text-[11px] text-violet-600">
              Fecha simulada: <span className="font-bold">{simulatedNow.toLocaleDateString("es-PA")}</span>
              {(timeOffsetMonths > 0 || timeOffsetDays > 0) && (
                <span className="text-violet-400 ml-1">(+{timeOffsetMonths}m +{timeOffsetDays}d)</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* ====== LEGAL FOOTER ====== */}
      <p className="text-[10px] text-slate-400 italic border-t border-slate-100 pt-3">
        Obligaciones basadas en el Acuerdo Municipal N° 40 de 2011 del Municipio de Panama.
        Declaracion Jurada Anual: multa $500 si no se presenta antes del 31 de marzo.
        Tasa Unica Municipal: 10% recargo si se paga tarde.
        Morosidad mensual: 20% recargo + 1% interes por mes adicional.
      </p>
    </div>
  );
}

// ============================================
// SEMAFORO DE SUPERVIVENCIA
// ============================================

function SemaforoPanel({ simulatedNow, declaracionEnBoveda }: { simulatedNow: Date; declaracionEnBoveda: boolean }) {
  const declaracionSemaforo = getSemaforoDeclaracion(simulatedNow, declaracionEnBoveda);
  const impuestoSemaforo = getSemaforoImpuestoMensual(simulatedNow, false);

  const items: SemaforoItem[] = [declaracionSemaforo, impuestoSemaforo];

  const levelColors = {
    verde: { bg: "bg-emerald-50", border: "border-emerald-300", dot: "bg-emerald-500", text: "text-emerald-700", label: "BLINDADO" },
    amarillo: { bg: "bg-amber-50", border: "border-amber-300", dot: "bg-amber-400", text: "text-amber-700", label: "ALERTA" },
    rojo: { bg: "bg-red-50", border: "border-red-400", dot: "bg-red-500 animate-pulse", text: "text-red-700", label: "IMPACTO" },
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Siren size={14} className="text-red-500" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semaforo de Supervivencia</span>
      </div>
      {items.map((item) => {
        const c = levelColors[item.level];
        return (
          <div key={item.id} className={`p-3 rounded-xl border ${c.border} ${c.bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${c.dot}`} />
              <span className={`text-xs font-bold ${c.text}`}>{item.label}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
                {c.label}
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed pl-5 ${item.level === "rojo" ? "font-bold text-red-700" : "text-slate-600"}`}>
              {item.message}
            </p>
            {item.multa && (
              <p className="text-[10px] font-bold text-red-600 pl-5 mt-1">
                Multa: {item.multa}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// SIMULADOR DE RECARGOS MUPA
// ============================================

function SimuladorRecargos({
  montoBase, setMontoBase,
  mesesMora, setMesesMora,
  tasaAnual, setTasaAnual,
  tasaTarde, setTasaTarde,
}: {
  montoBase: number; setMontoBase: (v: number) => void;
  mesesMora: number; setMesesMora: (v: number) => void;
  tasaAnual: number; setTasaAnual: (v: number) => void;
  tasaTarde: boolean; setTasaTarde: (v: boolean) => void;
}) {
  const recargo = calcularRecargos(montoBase, mesesMora);
  const tasa = calcularRecargoTasaAnual(tasaAnual, tasaTarde);

  const fmt = (n: number) => n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <details className="rounded-xl border border-slate-200 overflow-hidden">
      <summary className="px-4 py-3 cursor-pointer flex items-center gap-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors bg-white">
        <Receipt size={14} className="text-amber-500" />
        Simulador de Recargos por Morosidad
      </summary>
      <div className="p-4 bg-white space-y-4">
        {/* Impuesto Mensual */}
        <div className="space-y-3">
          <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Impuesto Municipal Mensual</h5>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-slate-500 block mb-1">Monto Base ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={montoBase || ""}
                onChange={(e) => setMontoBase(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                placeholder="Ej: 150.00"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 block mb-1">Meses de Mora</label>
              <input
                type="number"
                min={1}
                max={36}
                value={mesesMora}
                onChange={(e) => setMesesMora(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          {montoBase > 0 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600">Monto base:</span>
                <span className="font-bold text-slate-700">${fmt(recargo.montoBase)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-red-600">Recargo 20%:</span>
                <span className="font-bold text-red-700">+${fmt(recargo.recargo20)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-red-600">Interes {mesesMora} mes(es) x 1%:</span>
                <span className="font-bold text-red-700">+${fmt(recargo.totalIntereses)}</span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 border-t border-red-200">
                <span className="font-bold text-red-800">TOTAL ADEUDADO:</span>
                <span className="font-extrabold text-red-800">${fmt(recargo.totalAdeudado)}</span>
              </div>
              <p className="text-[9px] text-red-500 mt-1">
                Tu flujo de caja esta perdiendo ${fmt(recargo.recargo20 + recargo.totalIntereses)} en recargos ahora mismo.
              </p>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="border-t border-slate-100" />

        {/* Tasa Unica Municipal */}
        <div className="space-y-3">
          <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Tasa Unica Municipal Anual</h5>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-slate-500 block mb-1">Monto de la Tasa ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={tasaAnual || ""}
                onChange={(e) => setTasaAnual(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                placeholder="Ej: 300.00"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tasaTarde}
                  onChange={(e) => setTasaTarde(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-amber-400 accent-amber-500"
                />
                <span className="text-[10px] font-medium text-slate-600">Pagada despues del 31 de marzo</span>
              </label>
            </div>
          </div>

          {tasaAnual > 0 && (
            <div className={`p-3 rounded-xl border space-y-1.5 ${tasaTarde ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600">Monto tasa:</span>
                <span className="font-bold text-slate-700">${fmt(tasa.montoBase)}</span>
              </div>
              {tasaTarde && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-red-600">Recargo 10%:</span>
                  <span className="font-bold text-red-700">+${fmt(tasa.recargo10)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-1.5 border-t border-slate-200">
                <span className={`font-bold ${tasaTarde ? "text-red-800" : "text-emerald-800"}`}>TOTAL:</span>
                <span className={`font-extrabold ${tasaTarde ? "text-red-800" : "text-emerald-800"}`}>${fmt(tasa.total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

// ============================================
// MATRIZ MAESTRA DE SANCIONES
// ============================================

function MatrizSanciones({ hasPublicidad }: { hasPublicidad: boolean }) {
  return (
    <details className="rounded-xl border border-slate-200 overflow-hidden">
      <summary className="px-4 py-3 cursor-pointer flex items-center gap-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors bg-white">
        <Scale size={14} className="text-red-500" />
        Matriz Maestra de Sanciones y Multas MUPA
      </summary>
      <div className="p-4 bg-white space-y-4">
        {MATRIZ_SANCIONES.map((cat) => {
          const isHighlighted = cat.id === "publicidad" && hasPublicidad;
          return (
            <div
              key={cat.id}
              className={`rounded-xl border overflow-hidden ${
                isHighlighted ? "border-red-300 ring-2 ring-red-200" : "border-slate-200"
              }`}
            >
              <div className={`px-4 py-2.5 flex items-center gap-2 ${
                isHighlighted ? "bg-red-50" : "bg-slate-50"
              }`}>
                <span className="text-sm">{cat.icon}</span>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  isHighlighted ? "text-red-700" : "text-slate-600"
                }`}>
                  {cat.title}
                </span>
                {isHighlighted && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse">
                    RIESGO ACTIVO
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left font-bold text-slate-500 w-[40%]">Infraccion</th>
                      <th className="px-3 py-2 text-left font-bold text-red-500 w-[25%]">Sancion</th>
                      <th className="px-3 py-2 text-left font-bold text-emerald-500 w-[35%]">Mitigacion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.rows.map((row, i) => (
                      <tr key={i} className={`border-b border-slate-100 ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                        <td className="px-3 py-2 text-slate-700">{row.infraccion}</td>
                        <td className="px-3 py-2 font-bold text-red-600">{row.sancion}</td>
                        <td className="px-3 py-2 text-emerald-700">{row.mitigacion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
