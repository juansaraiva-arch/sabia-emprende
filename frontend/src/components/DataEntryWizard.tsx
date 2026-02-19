"use client";
import React, { useState } from "react";
import {
  Camera,
  Film,
  ArrowLeft,
  Home,
  Mic,
  ScanLine,
  Sparkles,
} from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";
import DiagnosticoFlashForm from "./DiagnosticoFlashForm";
import CsvUploader from "./CsvUploader";

// ============================================
// TIPOS
// ============================================

interface DataEntryWizardProps {
  onRecordSaved: (record: FinancialRecord) => void;
  onBulkRecordsSaved: (records: FinancialRecord[]) => void;
  onNavigateHome?: () => void;
}

type Mode = "flash" | "estratega" | null;

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function DataEntryWizard({
  onRecordSaved,
  onBulkRecordsSaved,
  onNavigateHome,
}: DataEntryWizardProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [showAiToast, setShowAiToast] = useState<string | null>(null);

  // --- Handlers para FABs de IA (placeholder) ---
  const handleDictarGasto = () => {
    setShowAiToast("Dictar Gasto");
    setTimeout(() => setShowAiToast(null), 2500);
  };

  const handleEscanearFactura = () => {
    setShowAiToast("Escanear Factura");
    setTimeout(() => setShowAiToast(null), 2500);
  };

  return (
    <div className="relative min-h-[60vh] pb-28">
      {/* ====== HEADER ====== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-violet-500" />
          <h2 className="text-lg font-extrabold text-slate-800 font-heading">
            Ingresa tus datos
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          Elige como quieres cargar la informacion de tu negocio.
        </p>
      </div>

      {/* ====== VOLVER BUTTONS ====== */}
      {mode !== null && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setMode(null)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors min-h-[48px]"
          >
            <ArrowLeft size={18} />
            Volver a elegir modo
          </button>
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors min-h-[48px]"
            >
              <Home size={18} />
              Volver al Inicio
            </button>
          )}
        </div>
      )}

      {/* ====== MODE SELECTOR ====== */}
      {mode === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* --- Diagnostico Flash --- */}
          <button
            onClick={() => setMode("flash")}
            className="group relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 transition-all min-h-[200px] text-left"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform">
              <Camera size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-extrabold text-emerald-800 mb-1">
                Diagnostico Flash
              </h3>
              <p className="text-sm text-emerald-600 font-medium mb-2">
                Foto de un mes
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Llena un formulario rapido con los datos de un solo mes.
                Perfecto para empezar.
              </p>
            </div>
            <span className="absolute top-3 right-3 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full uppercase tracking-wider">
              Rapido
            </span>
          </button>

          {/* --- Estratega --- */}
          <button
            onClick={() => setMode("estratega")}
            className="group relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 transition-all min-h-[200px] text-left"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500 text-white shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <Film size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-extrabold text-blue-800 mb-1">
                Estratega
              </h3>
              <p className="text-sm text-blue-600 font-medium mb-2">
                Pelicula de 12 meses
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sube un archivo CSV con 12 meses de datos para un analisis
                completo.
              </p>
            </div>
            <span className="absolute top-3 right-3 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full uppercase tracking-wider">
              Completo
            </span>
          </button>
        </div>
      )}

      {/* ====== CHILD COMPONENTS ====== */}
      {mode === "flash" && (
        <DiagnosticoFlashForm
          onSave={onRecordSaved}
          onBackToMenu={() => setMode(null)}
        />
      )}

      {mode === "estratega" && <CsvUploader onUpload={onBulkRecordsSaved} />}

      {/* ====== FLOATING AI BUTTONS ====== */}
      <div className="fixed bottom-6 right-4 flex flex-col gap-3 z-50">
        {/* Dictar Gasto */}
        <button
          onClick={handleDictarGasto}
          className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-500/30 hover:bg-amber-600 hover:scale-105 active:scale-95 transition-all min-h-[48px]"
          aria-label="Dictar gasto por voz"
        >
          <Mic size={20} />
          <span className="hidden sm:inline">Dictar Gasto</span>
        </button>

        {/* Escanear Factura */}
        <button
          onClick={handleEscanearFactura}
          className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-violet-600 text-white font-bold text-sm shadow-lg shadow-violet-500/30 hover:bg-violet-700 hover:scale-105 active:scale-95 transition-all min-h-[48px]"
          aria-label="Escanear factura con camara"
        >
          <ScanLine size={20} />
          <span className="hidden sm:inline">Escanear Factura</span>
        </button>
      </div>

      {/* ====== TOAST PLACEHOLDER ====== */}
      {showAiToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-800 text-white text-sm font-bold rounded-full shadow-xl border border-slate-700">
            <Sparkles size={16} className="text-amber-400" />
            {showAiToast} — Proximamente
          </div>
        </div>
      )}
    </div>
  );
}
