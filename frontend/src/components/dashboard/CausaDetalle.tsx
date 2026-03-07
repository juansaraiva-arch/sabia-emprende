"use client";

import React, { useEffect, useRef } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import type { ResultadoCausa, NivelRiesgo } from "@/lib/analytics/cb-insights-detector";

// ============================================
// CONFIGURACION POR NIVEL
// ============================================

const NIVEL_CONFIG: Record<
  NivelRiesgo,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    headerBg: string;
    icon: React.ReactNode;
  }
> = {
  critico: {
    label: "CRITICO",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    headerBg: "bg-gradient-to-r from-red-50 to-red-100/50",
    icon: <span className="text-lg">🔴</span>,
  },
  precaucion: {
    label: "PRECAUCION",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    headerBg: "bg-gradient-to-r from-amber-50 to-amber-100/50",
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  },
  en_orden: {
    label: "EN ORDEN",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    headerBg: "bg-gradient-to-r from-emerald-50 to-emerald-100/50",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  },
  sin_datos: {
    label: "SIN DATOS",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-500",
    headerBg: "bg-gradient-to-r from-slate-50 to-slate-100/50",
    icon: <HelpCircle className="w-5 h-5 text-slate-400" />,
  },
};

// ============================================
// TENDENCIA
// ============================================

function TendenciaDisplay({
  tendencia,
}: {
  tendencia: ResultadoCausa["tendencia"];
}) {
  const config = {
    mejorando: {
      icon: <TrendingUp className="w-4 h-4" />,
      text: "Mejorando",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    empeorando: {
      icon: <TrendingDown className="w-4 h-4" />,
      text: "Empeorando",
      color: "text-red-500",
      bg: "bg-red-50",
    },
    estable: {
      icon: <Minus className="w-4 h-4" />,
      text: "Estable",
      color: "text-slate-500",
      bg: "bg-slate-50",
    },
    sin_datos: {
      icon: <HelpCircle className="w-4 h-4" />,
      text: "Sin datos suficientes",
      color: "text-slate-400",
      bg: "bg-slate-50",
    },
  };

  const c = config[tendencia];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${c.color} ${c.bg}`}
    >
      {c.icon}
      {c.text}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

interface CausaDetalleProps {
  causa: ResultadoCausa | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CausaDetalle({
  causa,
  isOpen,
  onClose,
}: CausaDetalleProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevenir scroll del body cuando esta abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!causa) return null;

  const config = NIVEL_CONFIG[causa.nivel];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle: ${causa.titulo}`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className={`${config.headerBg} px-5 py-4`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{causa.emoji}</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {causa.id}. {causa.titulo}
                  </h2>
                  <p className="text-xs text-slate-500">{causa.subtitulo}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/60 transition-colors text-slate-500 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Level badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.badgeBg} ${config.badgeText}`}
            >
              {config.icon}
              {config.label}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 px-5 py-5 space-y-5">
            {/* Current value */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Valor actual
              </label>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {causa.valor_actual}
              </p>
            </div>

            {/* Threshold */}
            <div className="bg-slate-50 rounded-lg p-3">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Umbral de referencia
              </label>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {causa.umbral}
              </p>
            </div>

            {/* Trend */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                Tendencia
              </label>
              <TendenciaDisplay tendencia={causa.tendencia} />
            </div>

            {/* Full message */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Analisis
              </label>
              <p className="text-sm text-slate-700 leading-relaxed mt-1">
                {causa.mensaje}
              </p>
            </div>

            {/* CB Insights citation */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <label className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">
                Base CB Insights
              </label>
              <p className="text-xs text-blue-700 italic leading-relaxed mt-1">
                {causa.base_cb}
              </p>
            </div>
          </div>

          {/* Action CTA (fixed at bottom) */}
          <div className="px-5 py-4 border-t border-slate-100 bg-white">
            <button
              onClick={() => {
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#C5A059" }}
            >
              {causa.accion}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
