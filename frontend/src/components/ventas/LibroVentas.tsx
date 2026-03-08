"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Receipt,
  FileSpreadsheet,
  Wifi,
  PenLine,
  Info,
} from "lucide-react";
import { detectarSegmentoLocal } from "@/lib/ventas-segmento";
import { getPACConfig } from "@/lib/pac/pac-client";
import { getVentas, anularVenta } from "@/lib/ventas-storage";
import type { ResultadoSegmento } from "@/lib/ventas-types";
import type { Venta } from "@/lib/ventas-types";

import AlertaMigracionPAC from "./AlertaMigracionPAC";
import BotonVentaRapida from "./BotonVentaRapida";
import TablaVentas from "./TablaVentas";
import ResumenVentas from "./ResumenVentas";
import ImportadorDGI from "./ImportadorDGI";
import GuiaDGI from "./GuiaDGI";
import PanelPAC from "./PanelPAC";
import OnboardingPAC from "./OnboardingPAC";

// ============================================
// TYPES
// ============================================

interface LibroVentasProps {
  societyId: string;
}

type TabId = "mis-ventas" | "importar-csv" | "pac";

// ============================================
// SEGMENT BADGE CONFIG
// ============================================

const SEGMENT_BADGE: Record<1 | 2 | 3, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-gray-100", text: "text-gray-700", label: "Manual" },
  2: { bg: "bg-blue-100", text: "text-blue-700", label: "Facturador Gratuito DGI" },
  3: { bg: "bg-emerald-100", text: "text-emerald-700", label: "PAC Electronico" },
};

const SEGMENT_DESC: Record<1 | 2 | 3, string> = {
  1: "Registra tus ventas manualmente. Sin obligacion de facturacion electronica.",
  2: "Usa el facturador gratuito de la DGI o importa tus CSV de ventas.",
  3: "Facturacion electronica obligatoria via PAC (Proveedor Autorizado Certificado).",
};

// ============================================
// TAB CONFIG
// ============================================

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  activeColor: string;
  activeBg: string;
  minSegment: 1 | 2 | 3;
}

const TABS: TabConfig[] = [
  {
    id: "mis-ventas",
    label: "Mis Ventas",
    icon: <PenLine size={14} />,
    activeColor: "text-white",
    activeBg: "bg-emerald-600",
    minSegment: 1,
  },
  {
    id: "importar-csv",
    label: "Importar CSV DGI",
    icon: <FileSpreadsheet size={14} />,
    activeColor: "text-white",
    activeBg: "bg-blue-600",
    minSegment: 1,
  },
  {
    id: "pac",
    label: "Facturacion PAC",
    icon: <Wifi size={14} />,
    activeColor: "text-white",
    activeBg: "bg-amber-600",
    minSegment: 2,
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function LibroVentas({ societyId }: LibroVentasProps) {
  // -- State --
  const [segmentoResult, setSegmentoResult] = useState<ResultadoSegmento | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("mis-ventas");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGuiaDGI, setShowGuiaDGI] = useState(false);

  // -- Detect segment on mount and on refresh --
  useEffect(() => {
    const resultado = detectarSegmentoLocal(societyId);
    setSegmentoResult(resultado);

    // Check PAC config to determine onboarding state
    const pacConfig = getPACConfig(societyId);
    setShowOnboarding(!pacConfig);

    // Auto-select prominent tab based on segment
    if (resultado.segmento === 3) {
      setActiveTab("pac");
    } else {
      setActiveTab("mis-ventas");
    }
  }, [societyId, refreshKey]);

  // -- Handlers --
  const handleVentaCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleImportComplete = useCallback((count: number) => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handlePACConfigured = useCallback(() => {
    setShowOnboarding(false);
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleConfigurePAC = useCallback(() => {
    setActiveTab("pac");
  }, []);

  const handleAnularVenta = useCallback(
    (id: string) => {
      anularVenta(id);
      setRefreshKey((prev) => prev + 1);
    },
    []
  );

  // -- Load ventas for child components --
  const ventas = useMemo(() => {
    // refreshKey dependency ensures re-read after mutations
    void refreshKey;
    return getVentas(societyId);
  }, [societyId, refreshKey]);

  // -- Visible tabs based on segment --
  const visibleTabs = useMemo(() => {
    if (!segmentoResult) return [TABS[0]];
    return TABS.filter((tab) => segmentoResult.segmento >= tab.minSegment);
  }, [segmentoResult]);

  // -- PAC not configured indicator --
  const pacNotConfigured = useMemo(() => {
    if (!segmentoResult || segmentoResult.segmento < 3) return false;
    const pacConfig = getPACConfig(societyId);
    return !pacConfig;
  }, [segmentoResult, societyId]);

  // ============================================
  // RENDER
  // ============================================

  // Loading state while detecting segment
  if (!segmentoResult) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-slate-400 text-sm">
          Detectando segmento de facturacion...
        </div>
      </div>
    );
  }

  const segmento = segmentoResult.segmento;
  const badge = SEGMENT_BADGE[segmento];
  const description = SEGMENT_DESC[segmento];

  return (
    <div className="space-y-4">
      {/* ============================================ */}
      {/* ALERTA MIGRACION PAC (si aplica) */}
      {/* ============================================ */}
      {(segmentoResult.alertaNivel === "amarillo" ||
        segmentoResult.alertaNivel === "rojo") && (
        <AlertaMigracionPAC
          societyId={societyId}
          onConfigurePAC={handleConfigurePAC}
        />
      )}

      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ backgroundColor: "#C5A059" }}
          >
            <Receipt size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className="text-lg font-bold font-[Playfair_Display]"
                style={{ color: "#1A242F" }}
              >
                Libro de Ventas
              </h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.bg} ${badge.text}`}
              >
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-start gap-1">
              <Info size={12} className="shrink-0 mt-0.5 text-slate-400" />
              <span>{description}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* TAB PILLS */}
      {/* ============================================ */}
      <div className="flex gap-2 overflow-x-auto pb-1 px-1">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showAmberDot =
            tab.id === "pac" && segmento === 3 && pacNotConfigured;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 min-h-[36px] ${
                isActive
                  ? `${tab.activeBg} ${tab.activeColor} shadow-sm`
                  : "text-slate-500 hover:bg-slate-50 bg-white border border-slate-200"
              }`}
            >
              {tab.icon}
              {tab.label}
              {showAmberDot && (
                <span className="relative flex h-2 w-2 ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================ */}
      {/* TAB CONTENT */}
      {/* ============================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        {/* --- Mis Ventas --- */}
        {activeTab === "mis-ventas" && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <p className="text-sm text-slate-600">
                Registra ventas de forma rapida con el boton{" "}
                <span
                  className="font-bold"
                  style={{ color: "#C5A059" }}
                >
                  $
                </span>{" "}
                flotante.
              </p>
              {segmento === 1 && (
                <p className="text-xs text-slate-400 mt-1">
                  Tus ventas se guardan localmente. Cuando superes los limites de la DGI,
                  te guiaremos a facturacion electronica.
                </p>
              )}
            </div>
            <BotonVentaRapida
              societyId={societyId}
              onVentaRegistered={handleVentaCreated}
            />
          </div>
        )}

        {/* --- Importar CSV DGI --- */}
        {activeTab === "importar-csv" && (
          <div className="space-y-4">
            <ImportadorDGI
              societyId={societyId}
              onImportComplete={handleImportComplete}
            />
            {showGuiaDGI ? (
              <GuiaDGI onClose={() => setShowGuiaDGI(false)} />
            ) : (
              <button
                onClick={() => setShowGuiaDGI(true)}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Info size={12} />
                Como descargar el CSV desde la DGI?
              </button>
            )}
          </div>
        )}

        {/* --- PAC --- */}
        {activeTab === "pac" && (
          <div>
            {showOnboarding ? (
              <OnboardingPAC
                societyId={societyId}
                onComplete={handlePACConfigured}
              />
            ) : (
              <PanelPAC societyId={societyId} />
            )}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* RESUMEN VENTAS (mensual) */}
      {/* ============================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <ResumenVentas ventas={ventas} />
      </div>

      {/* ============================================ */}
      {/* TABLA VENTAS (unificada) */}
      {/* ============================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <TablaVentas
          ventas={ventas}
          onAnular={handleAnularVenta}
          showActions
        />
      </div>
    </div>
  );
}
