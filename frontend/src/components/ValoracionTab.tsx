"use client";
import React, { useState, useMemo } from "react";
import {
  Gem,
  Building2,
  TrendingUp,
  Landmark,
  CreditCard,
  ToggleLeft,
  ToggleRight,
  Crown,
  Shield,
} from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";
import { computeCascada, computeValoracion } from "@/lib/calculations";
import SmartTooltip from "@/components/SmartTooltip";

// ============================================
// TIPOS
// ============================================

interface ValoracionTabProps {
  record: FinancialRecord;
}

// ============================================
// CONTEXTO DEL SLIDER
// ============================================

interface MultiploNivel {
  min: number;
  max: number;
  label: string;
  description: string;
  color: string;
}

const MULTIPLO_NIVELES: MultiploNivel[] = [
  { min: 1, max: 2, label: "Autoempleo", description: "Negocio depende 100% del dueno. Si te vas, se muere.", color: "text-red-600" },
  { min: 2.5, max: 3.5, label: "PYME Estandar", description: "Negocio funciona con procesos basicos. Tiene clientes recurrentes.", color: "text-amber-600" },
  { min: 4, max: 5, label: "Maquina de Escalar", description: "Procesos documentados, equipo solido, marca reconocida.", color: "text-emerald-600" },
  { min: 5.5, max: 10, label: "Alto Valor", description: "Negocio escalable con ventaja competitiva duradera.", color: "text-violet-600" },
];

function getMultiploNivel(multiplo: number): MultiploNivel {
  if (multiplo <= 2) return MULTIPLO_NIVELES[0];
  if (multiplo <= 3.5) return MULTIPLO_NIVELES[1];
  if (multiplo <= 5) return MULTIPLO_NIVELES[2];
  return MULTIPLO_NIVELES[3];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ValoracionTab({ record }: ValoracionTabProps) {
  const [multiplo, setMultiplo] = useState(3);
  const [esDuenoLocal, setEsDuenoLocal] = useState(false);
  const [alquilerVirtual, setAlquilerVirtual] = useState(0);
  const [valorEdificio, setValorEdificio] = useState(0);
  const [deudaTotal, setDeudaTotal] = useState(record.bank_debt);

  // ====== CALCULOS ======
  const cascada = useMemo(() => computeCascada(record), [record]);
  const ebitdaMensual = cascada.ebitda;

  const valoracion = useMemo(
    () =>
      computeValoracion(
        ebitdaMensual,
        multiplo,
        esDuenoLocal,
        alquilerVirtual,
        valorEdificio,
        deudaTotal
      ),
    [ebitdaMensual, multiplo, esDuenoLocal, alquilerVirtual, valorEdificio, deudaTotal]
  );

  const nivelActual = getMultiploNivel(multiplo);

  // Multiplos de referencia por industria
  const multiplosReferencia = [
    { label: "Comida / Retail", range: "2-3x", emoji: "🍽️" },
    { label: "Servicios Prof.", range: "3-5x", emoji: "💼" },
    { label: "Tecnologia", range: "5-10x", emoji: "💻" },
    { label: "Manufactura", range: "3-6x", emoji: "🏭" },
  ];

  return (
    <div className="space-y-6">
      {/* ====== HEADER ====== */}
      <div className="flex items-center gap-2">
        <Gem size={20} className="text-amber-600" />
        <h3 className="text-lg font-extrabold text-slate-800 flex items-center">
          Motor de Riqueza
          <SmartTooltip term="valoracion" size={14} />
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ====== COLUMNA IZQUIERDA: INPUTS ====== */}
        <div className="space-y-5">
          {/* --- EBITDA Base --- */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-800 flex items-center">
                Tu EBITDA
                <SmartTooltip term="ebitda" size={13} />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white border border-blue-100">
                <p className="text-[10px] text-slate-400">Mensual</p>
                <p className="text-lg font-extrabold text-blue-700">
                  ${ebitdaMensual.toLocaleString("es-PA")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-blue-100">
                <p className="text-[10px] text-slate-400">Anual proyectado</p>
                <p className="text-lg font-extrabold text-blue-700">
                  ${(ebitdaMensual * 12).toLocaleString("es-PA")}
                </p>
              </div>
            </div>
          </div>

          {/* --- Multiplo con contexto --- */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <Landmark size={16} className="text-amber-600" />
              <span className="text-sm font-bold text-amber-800 flex items-center">
                Multiplo EBITDA
                <SmartTooltip term="multiplo_ebitda" size={13} />
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={multiplo}
                onChange={(e) => setMultiplo(parseFloat(e.target.value))}
                className="flex-1 h-3 rounded-full accent-amber-600 cursor-pointer"
                style={{ minHeight: "48px" }}
              />
              <span className="text-2xl font-extrabold text-amber-700 min-w-[50px] text-right">
                {multiplo}x
              </span>
            </div>

            {/* Nivel actual del multiplo */}
            <div className={`p-3 rounded-xl bg-white border border-amber-100 mb-3`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-extrabold ${nivelActual.color}`}>
                  {nivelActual.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{nivelActual.description}</p>
            </div>

            {/* Escala visual */}
            <div className="flex gap-1 mb-3">
              {MULTIPLO_NIVELES.map((nivel) => (
                <div
                  key={nivel.label}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    multiplo >= nivel.min && multiplo <= nivel.max
                      ? nivel.color === "text-red-600" ? "bg-red-400"
                        : nivel.color === "text-amber-600" ? "bg-amber-400"
                        : nivel.color === "text-emerald-600" ? "bg-emerald-400"
                        : "bg-violet-400"
                      : "bg-slate-200"
                  }`}
                  title={`${nivel.label}: ${nivel.min}-${nivel.max}x`}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {multiplosReferencia.map((ref) => (
                <div
                  key={ref.label}
                  className="p-2 rounded-lg bg-white border border-amber-100 text-center"
                >
                  <p className="text-base mb-0.5">{ref.emoji}</p>
                  <p className="text-[10px] text-slate-400">{ref.label}</p>
                  <p className="text-xs font-bold text-amber-700">{ref.range}</p>
                </div>
              ))}
            </div>
          </div>

          {/* --- Normalizacion OpCo/PropCo --- */}
          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-violet-600" />
                <span className="text-sm font-bold text-violet-800">
                  Eres dueno del local?
                </span>
                <SmartTooltip
                  term="valoracion"
                  text="Si eres dueno del local, separamos el valor del edificio (PropCo) del valor del negocio (OpCo). Restamos un alquiler virtual para obtener el EBITDA limpio."
                  size={13}
                />
              </div>
              <button
                onClick={() => setEsDuenoLocal(!esDuenoLocal)}
                className="text-violet-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {esDuenoLocal ? (
                  <ToggleRight size={28} />
                ) : (
                  <ToggleLeft size={28} className="text-slate-400" />
                )}
              </button>
            </div>

            {esDuenoLocal && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    Alquiler virtual/mes
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      value={alquilerVirtual || ""}
                      onChange={(e) => setAlquilerVirtual(parseFloat(e.target.value) || 0)}
                      className="w-full text-sm pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none min-h-[44px]"
                      placeholder="ej: 2000"
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    Valor del edificio
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      value={valorEdificio || ""}
                      onChange={(e) => setValorEdificio(parseFloat(e.target.value) || 0)}
                      className="w-full text-sm pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none min-h-[44px]"
                      placeholder="ej: 150000"
                      min={0}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- Deuda --- */}
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={16} className="text-red-600" />
              <span className="text-sm font-bold text-red-800 flex items-center">
                Deuda total
                <SmartTooltip term="bank_debt" size={13} />
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={deudaTotal || ""}
                onChange={(e) => setDeudaTotal(parseFloat(e.target.value) || 0)}
                className="w-full text-sm pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none min-h-[44px]"
                min={0}
              />
            </div>
          </div>
        </div>

        {/* ====== COLUMNA DERECHA: RESULTADO ====== */}
        <div className="space-y-4">
          {/* --- Patrimonio Hero --- */}
          <div
            className={`p-6 rounded-2xl text-white text-center relative overflow-hidden ${
              valoracion.patrimonio >= 0
                ? "bg-gradient-to-br from-emerald-600 to-emerald-800"
                : "bg-gradient-to-br from-red-600 to-red-800"
            }`}
          >
            <Crown size={48} className="absolute top-3 right-3 opacity-10" />
            <p className="text-xs font-bold opacity-80 mb-1 uppercase tracking-wider">
              Riqueza Real del Negocio
            </p>
            <p className="text-5xl font-extrabold">
              ${valoracion.patrimonio.toLocaleString("es-PA", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm mt-2 opacity-70">
              {valoracion.patrimonio >= 0
                ? "Patrimonio Neto Estimado"
                : "La deuda supera el valor del negocio"}
            </p>
          </div>

          {/* --- Ecuacion de Patrimonio visual --- */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
              <Shield size={14} className="text-slate-400" />
              Ecuacion de Patrimonio
            </h4>

            <div className="space-y-3">
              <FormulaRow
                label={esDuenoLocal ? "EBITDA Ajustado (anual)" : "EBITDA (anual)"}
                value={valoracion.ebitdaAjustado}
                note={
                  esDuenoLocal
                    ? `(${ebitdaMensual.toLocaleString("es-PA")} - ${alquilerVirtual.toLocaleString("es-PA")}) x 12`
                    : `${ebitdaMensual.toLocaleString("es-PA")} x 12`
                }
              />

              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-lg">x</span>
                <span className="text-xs">Multiplo</span>
                <span className="text-sm font-bold text-amber-600">{multiplo}x</span>
                <span className={`text-[10px] ${nivelActual.color}`}>({nivelActual.label})</span>
              </div>

              <FormulaRow label="= Valor Operativo (OpCo)" value={valoracion.valorOperativo} highlight />

              {esDuenoLocal && valorEdificio > 0 && (
                <>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-lg">+</span>
                    <span className="text-xs">Valor edificio (PropCo)</span>
                  </div>
                  <FormulaRow label="Inmueble" value={valorEdificio} />
                </>
              )}

              {deudaTotal > 0 && (
                <>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-lg">-</span>
                    <span className="text-xs">Deuda total</span>
                  </div>
                  <FormulaRow label="Deuda" value={-deudaTotal} negative />
                </>
              )}

              <div className="border-t-2 border-slate-300 pt-3">
                <FormulaRow label="= PATRIMONIO NETO REAL" value={valoracion.patrimonio} highlight large />
              </div>
            </div>
          </div>

          {/* --- Interpretacion --- */}
          <div
            className={`p-4 rounded-2xl border ${
              valoracion.patrimonio > valoracion.valorOperativo * 0.5
                ? "bg-emerald-50 border-emerald-200"
                : valoracion.patrimonio > 0
                  ? "bg-amber-50 border-amber-200"
                  : "bg-red-50 border-red-200"
            }`}
          >
            <p className="text-sm font-bold text-slate-700 mb-1">
              {valoracion.patrimonio > valoracion.valorOperativo * 0.5
                ? "💎 Negocio con buen patrimonio"
                : valoracion.patrimonio > 0
                  ? "⚠️ Patrimonio positivo pero cargado de deuda"
                  : "🚨 Patrimonio negativo — la deuda supera el valor"}
            </p>
            <p className="text-xs text-slate-500">
              {valoracion.patrimonio > valoracion.valorOperativo * 0.5
                ? "Tu negocio tiene un valor solido. Sigue reinvirtiendo y generando EBITDA."
                : valoracion.patrimonio > 0
                  ? "Reduce deuda antes de pensar en vender o asociarte."
                  : "Prioridad absoluta: Detener deuda nueva, aumentar EBITDA, y reestructurar obligaciones."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function FormulaRow({
  label,
  value,
  note,
  highlight = false,
  negative = false,
  large = false,
}: {
  label: string;
  value: number;
  note?: string;
  highlight?: boolean;
  negative?: boolean;
  large?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${highlight ? "bg-slate-50" : ""}`}>
      <div>
        <p className={`${large ? "text-sm font-extrabold" : "text-xs"} ${highlight ? "font-bold text-slate-800" : "text-slate-500"}`}>
          {label}
        </p>
        {note && <p className="text-[10px] text-slate-400">{note}</p>}
      </div>
      <p
        className={`${large ? "text-xl" : "text-sm"} font-extrabold ${
          negative || value < 0
            ? "text-red-600"
            : highlight
              ? "text-emerald-700"
              : "text-slate-700"
        }`}
      >
        {value < 0 ? "-" : ""}${Math.abs(value).toLocaleString("es-PA", { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}
