"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Minus,
  HelpCircle,
} from "lucide-react";
import type { ResultadoCausa, NivelRiesgo } from "@/lib/analytics/cb-insights-detector";

// ============================================
// HELPERS
// ============================================

const NIVEL_CONFIG: Record<
  NivelRiesgo,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    icon: React.ReactNode;
  }
> = {
  critico: {
    label: "CRITICO",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    borderColor: "border-red-200",
    icon: <span className="text-sm">🔴</span>,
  },
  precaucion: {
    label: "PRECAUCION",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    borderColor: "border-amber-200",
    icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  },
  en_orden: {
    label: "EN ORDEN",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    borderColor: "border-emerald-200",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  },
  sin_datos: {
    label: "SIN DATOS",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-500",
    borderColor: "border-slate-200",
    icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
  },
};

function TendenciaIndicator({
  tendencia,
}: {
  tendencia: ResultadoCausa["tendencia"];
}) {
  switch (tendencia) {
    case "mejorando":
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
          <TrendingUp className="w-3.5 h-3.5" />
          Mejorando
        </span>
      );
    case "empeorando":
      return (
        <span className="inline-flex items-center gap-1 text-red-500 text-xs">
          <TrendingDown className="w-3.5 h-3.5" />
          Empeorando
        </span>
      );
    case "estable":
      return (
        <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
          <Minus className="w-3.5 h-3.5" />
          Estable
        </span>
      );
    case "sin_datos":
      return (
        <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
          <HelpCircle className="w-3.5 h-3.5" />
          Sin datos
        </span>
      );
  }
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

interface CausaCardProps {
  causa: ResultadoCausa;
  onAction?: () => void;
}

export default function CausaCard({ causa, onAction }: CausaCardProps) {
  const config = NIVEL_CONFIG[causa.nivel];

  return (
    <div
      className={`bg-white rounded-xl border ${config.borderColor} p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{causa.emoji}</span>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">
              {causa.id}. {causa.titulo}
            </h4>
            <p className="text-[11px] text-slate-400">{causa.subtitulo}</p>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.badgeBg} ${config.badgeText}`}
        >
          {config.icon}
          {config.label}
        </span>
      </div>

      {/* Current value */}
      <p className="text-base font-bold text-slate-900 mb-1">
        {causa.valor_actual}
      </p>

      {/* Message */}
      <p className="text-xs text-slate-600 leading-relaxed mb-2">
        {causa.mensaje}
      </p>

      {/* Threshold + Tendencia */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
        <span>Umbral: {causa.umbral}</span>
        <TendenciaIndicator tendencia={causa.tendencia} />
      </div>

      {/* CB citation */}
      <p className="text-[10px] text-slate-400 italic mb-3 leading-relaxed">
        {causa.base_cb}
      </p>

      {/* Action CTA */}
      {onAction && (
        <button
          onClick={onAction}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 transition-colors border border-slate-200"
        >
          {causa.accion}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
