"use client";

import React, { useState, useMemo } from "react";
import { Brain } from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";
import {
  detectarCausasCBInsights,
  type ResultadoCausa,
  type NivelRiesgo,
} from "@/lib/analytics/cb-insights-detector";
import CausaDetalle from "./CausaDetalle";

// ============================================
// SVG DONUT CHART (sin Recharts)
// ============================================

function DonutScore({ score, nivel }: { score: number; nivel: NivelRiesgo }) {
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const colorMap: Record<NivelRiesgo, string> = {
    en_orden: "#059669",   // emerald-600
    precaucion: "#d97706", // amber-600
    critico: "#ef4444",    // red-500
    sin_datos: "#94a3b8",  // slate-400
  };

  const strokeColor = colorMap[nivel];

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-lg font-bold leading-none"
          style={{ color: strokeColor }}
        >
          {score}
        </span>
        <span className="text-[9px] text-slate-400 leading-none mt-0.5">
          /100
        </span>
      </div>
    </div>
  );
}

// ============================================
// INDICATOR DOT + LABEL
// ============================================

const DOT_COLORS: Record<NivelRiesgo, string> = {
  en_orden: "bg-emerald-500",
  precaucion: "bg-amber-500",
  critico: "bg-red-500",
  sin_datos: "bg-slate-300",
};

function CausaIndicator({
  causa,
  onClick,
}: {
  causa: ResultadoCausa;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left w-full group"
      title={causa.mensaje}
    >
      <span className="text-sm flex-shrink-0">{causa.emoji}</span>
      <span className="text-[11px] text-slate-600 truncate flex-1 group-hover:text-slate-900 transition-colors">
        {causa.titulo}
      </span>
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLORS[causa.nivel]}`}
      />
    </button>
  );
}

// ============================================
// BORDER COLOR
// ============================================

function getBorderColor(score: number): string {
  if (score >= 70) return "border-emerald-300";
  if (score >= 40) return "border-amber-300";
  return "border-red-300";
}

// ============================================
// WIDGET PRINCIPAL
// ============================================

interface Widget6CausasCBProps {
  record: FinancialRecord | null;
  ventasMensuales?: { mes: string; total: number }[];
}

export default function Widget6CausasCB({
  record,
  ventasMensuales,
}: Widget6CausasCBProps) {
  const [selectedCausa, setSelectedCausa] = useState<ResultadoCausa | null>(
    null
  );

  const resultado = useMemo(
    () => detectarCausasCBInsights(record, ventasMensuales),
    [record, ventasMensuales]
  );

  return (
    <>
      <div
        className={`bg-white rounded-2xl border-2 ${getBorderColor(
          resultado.score_salud
        )} p-4 shadow-sm`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
            Salud del Negocio
          </h3>
          <span className="text-[10px] text-slate-400 ml-auto">
            CB Insights
          </span>
        </div>

        {/* Score + Grid */}
        <div className="flex items-start gap-3">
          {/* Donut Score */}
          <div className="flex-shrink-0">
            <DonutScore
              score={resultado.score_salud}
              nivel={resultado.nivel_general}
            />
          </div>

          {/* 3x2 Grid of causes */}
          <div className="flex-1 grid grid-cols-1 gap-0.5 min-w-0">
            {resultado.causas.map((causa) => (
              <CausaIndicator
                key={causa.id}
                causa={causa}
                onClick={() => setSelectedCausa(causa)}
              />
            ))}
          </div>
        </div>

        {/* Resumen */}
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          {resultado.resumen}
        </p>
      </div>

      {/* Drawer de detalle */}
      <CausaDetalle
        causa={selectedCausa}
        isOpen={selectedCausa !== null}
        onClose={() => setSelectedCausa(null)}
      />
    </>
  );
}
