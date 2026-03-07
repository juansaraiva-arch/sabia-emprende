"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  AlertCircle,
  X,
  Settings,
  TrendingUp,
} from "lucide-react";
import { detectarSegmentoLocal } from "@/lib/ventas-segmento";
import type { ResultadoSegmento } from "@/lib/ventas-types";

// ============================================
// TYPES
// ============================================

interface AlertaMigracionPACProps {
  societyId: string;
  onConfigurePAC?: () => void;
}

const DISMISSED_KEY_PREFIX = "midf_alerta_pac_dismissed_";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// ============================================
// HELPERS
// ============================================

interface DismissedState {
  timestamp: number;
  alertaNivel: string;
}

function getDismissedState(societyId: string): DismissedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${DISMISSED_KEY_PREFIX}${societyId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setDismissedState(societyId: string, nivel: string): void {
  if (typeof window === "undefined") return;
  try {
    const state: DismissedState = {
      timestamp: Date.now(),
      alertaNivel: nivel,
    };
    localStorage.setItem(`${DISMISSED_KEY_PREFIX}${societyId}`, JSON.stringify(state));
  } catch {
    // localStorage lleno
  }
}

function shouldShowAlert(societyId: string, currentNivel: string): boolean {
  const dismissed = getDismissedState(societyId);
  if (!dismissed) return true;

  // Re-show si el nivel de alerta cambio
  if (dismissed.alertaNivel !== currentNivel) return true;

  // Re-show si pasaron 7 dias
  const elapsed = Date.now() - dismissed.timestamp;
  if (elapsed >= DISMISS_DURATION_MS) return true;

  return false;
}

// ============================================
// BARRA DE PROGRESO
// ============================================

function BarraProgreso({ porcentaje, color }: { porcentaje: number; color: "amber" | "red" }) {
  const pctClamped = Math.min(porcentaje, 100);

  return (
    <div className="w-full h-2 rounded-full bg-white/50 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          color === "amber" ? "bg-amber-500" : "bg-red-500"
        }`}
        style={{ width: `${pctClamped}%` }}
      />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AlertaMigracionPAC({
  societyId,
  onConfigurePAC,
}: AlertaMigracionPACProps) {
  const [visible, setVisible] = useState(false);
  const [segmento, setSegmento] = useState<ResultadoSegmento | null>(null);

  // Detectar segmento al montar
  useEffect(() => {
    const resultado = detectarSegmentoLocal(societyId);
    setSegmento(resultado);

    if (resultado.alertaNivel === "verde") {
      setVisible(false);
      return;
    }

    const show = shouldShowAlert(societyId, resultado.alertaNivel);
    setVisible(show);
  }, [societyId]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleDismiss = useCallback(() => {
    if (segmento) {
      setDismissedState(societyId, segmento.alertaNivel);
    }
    setVisible(false);
  }, [societyId, segmento]);

  // ============================================
  // RENDER
  // ============================================

  if (!visible || !segmento) return null;

  const isRojo = segmento.alertaNivel === "rojo";
  const maxPct = Math.max(segmento.pctIngresos, segmento.pctFacturas);

  return (
    <div
      className={`w-full rounded-lg px-4 py-3 ${
        isRojo
          ? "bg-red-50 border border-red-200"
          : "bg-amber-50 border border-amber-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`shrink-0 mt-0.5 ${isRojo ? "text-red-600" : "text-amber-600"}`}
        >
          {isRojo ? <AlertCircle size={20} /> : <AlertTriangle size={20} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p
              className={`text-sm font-bold ${
                isRojo ? "text-red-800" : "text-amber-800"
              }`}
            >
              {isRojo
                ? "Migracion a facturacion electronica requerida"
                : "Alerta preventiva — Limites de facturacion"}
            </p>
            {segmento.mensajeAlerta && (
              <p
                className={`text-xs mt-0.5 ${
                  isRojo ? "text-red-700" : "text-amber-700"
                }`}
              >
                {segmento.mensajeAlerta}
              </p>
            )}
          </div>

          {/* Progress bars */}
          <div className="space-y-1.5">
            {/* Ingresos */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={`text-[10px] font-medium ${
                    isRojo ? "text-red-700" : "text-amber-700"
                  }`}
                >
                  Ingresos 12 meses
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    isRojo ? "text-red-800" : "text-amber-800"
                  }`}
                >
                  {segmento.pctIngresos.toFixed(0)}%
                </span>
              </div>
              <BarraProgreso
                porcentaje={segmento.pctIngresos}
                color={isRojo ? "red" : "amber"}
              />
              <p
                className={`text-[9px] mt-0.5 ${
                  isRojo ? "text-red-500" : "text-amber-500"
                }`}
              >
                B/.
                {segmento.ingresos12m.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                de B/.
                {segmento.limiteIngresos.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            {/* Facturas mes */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={`text-[10px] font-medium ${
                    isRojo ? "text-red-700" : "text-amber-700"
                  }`}
                >
                  Facturas del mes
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    isRojo ? "text-red-800" : "text-amber-800"
                  }`}
                >
                  {segmento.pctFacturas.toFixed(0)}%
                </span>
              </div>
              <BarraProgreso
                porcentaje={segmento.pctFacturas}
                color={isRojo ? "red" : "amber"}
              />
              <p
                className={`text-[9px] mt-0.5 ${
                  isRojo ? "text-red-500" : "text-amber-500"
                }`}
              >
                {segmento.facturasMes} de {segmento.limiteFacturas} documentos
              </p>
            </div>
          </div>

          {/* CTA button */}
          {onConfigurePAC && (
            <button
              type="button"
              onClick={onConfigurePAC}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all mt-1 ${
                isRojo
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              <Settings size={12} />
              Configurar PAC
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className={`shrink-0 transition-colors ${
            isRojo
              ? "text-red-400 hover:text-red-600"
              : "text-amber-400 hover:text-amber-600"
          }`}
          aria-label="Cerrar alerta"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
