"use client";

import React from "react";
import { Settings2, Info } from "lucide-react";
import type { SupuestosForecast } from "@/lib/analytics/forecast-engine";

// ============================================
// TIPOS
// ============================================

interface ForecastSupuestosProps {
  supuestos: SupuestosForecast;
  onChange: (s: SupuestosForecast) => void;
  metodo: string;
}

// ============================================
// SLIDER ROW
// ============================================

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  color: string;
  onChange: (val: number) => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 0.5,
  suffix = "%",
  color,
  onChange,
}: SliderRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-600">{label}</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= min && v <= max) onChange(v);
            }}
            min={min}
            max={max}
            step={step}
            className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-right text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
          <span className="text-xs text-slate-400 w-3">{suffix}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} ${
            ((value - min) / (max - min)) * 100
          }%, #e2e8f0 ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
      <div className="flex justify-between text-[9px] text-slate-400">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ForecastSupuestos({
  supuestos,
  onChange,
  metodo,
}: ForecastSupuestosProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleChange = (field: keyof SupuestosForecast, value: number) => {
    onChange({ ...supuestos, [field]: value });
  };

  const metodoLabel =
    metodo === "regresion_lineal"
      ? "Regresion Lineal"
      : metodo === "promedio_simple"
        ? "Promedio Simple"
        : "Sin Datos";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-[#C5A059]" />
          <span className="text-sm font-bold text-slate-700">
            Supuestos de Proyeccion
          </span>
        </div>
        <span
          className={`text-xs text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {/* Panel colapsable */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
          {/* Info sobre el metodo */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-blue-700 leading-relaxed">
              {metodo === "regresion_lineal" ? (
                <>
                  Los % se calcularon automaticamente de tus datos historicos
                  usando <strong>{metodoLabel}</strong>. La tasa de crecimiento
                  esta implicitamente capturada en la pendiente de la regresion.
                </>
              ) : metodo === "promedio_simple" ? (
                <>
                  Con menos de 3 meses de datos se usa{" "}
                  <strong>{metodoLabel}</strong>. El revenue se proyecta aplicando
                  la tasa de crecimiento mensual sobre el promedio historico.
                </>
              ) : (
                <>
                  No hay datos historicos. Ingresa valores de revenue manualmente
                  en la tabla o ajusta los supuestos aqui.
                </>
              )}
            </p>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SliderRow
              label="Tasa de Crecimiento Mensual"
              value={supuestos.tasa_crecimiento}
              min={0}
              max={50}
              step={0.5}
              color="#10b981"
              onChange={(v) => handleChange("tasa_crecimiento", v)}
            />
            <SliderRow
              label="COGS % del Revenue"
              value={supuestos.cogs_pct}
              min={0}
              max={95}
              step={0.5}
              color="#ef4444"
              onChange={(v) => handleChange("cogs_pct", v)}
            />
            <SliderRow
              label="OPEX % del Revenue"
              value={supuestos.opex_pct}
              min={0}
              max={80}
              step={0.5}
              color="#f59e0b"
              onChange={(v) => handleChange("opex_pct", v)}
            />
            <SliderRow
              label="Nomina % del Revenue"
              value={supuestos.nomina_pct}
              min={0}
              max={60}
              step={0.5}
              color="#6366f1"
              onChange={(v) => handleChange("nomina_pct", v)}
            />
          </div>

          {/* Resumen de costos totales */}
          <div className="bg-slate-50 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Costos totales estimados sobre Revenue
            </span>
            <span
              className={`text-xs font-bold ${
                supuestos.cogs_pct + supuestos.opex_pct + supuestos.nomina_pct >
                100
                  ? "text-red-600"
                  : "text-slate-700"
              }`}
            >
              {(
                supuestos.cogs_pct +
                supuestos.opex_pct +
                supuestos.nomina_pct
              ).toFixed(1)}
              %
            </span>
          </div>

          {supuestos.cogs_pct + supuestos.opex_pct + supuestos.nomina_pct >
            100 && (
            <p className="text-[10px] text-red-600 flex items-center gap-1">
              <Info size={12} />
              Los costos superan el 100% del revenue. La utilidad neta sera
              negativa.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
