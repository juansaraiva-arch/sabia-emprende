"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Film,
  ArrowLeft,
  Home,
  Mic,
  MicOff,
  ScanLine,
  Sparkles,
  Loader2,
  BookOpen,
  Check,
  X,
  Keyboard,
  Send,
} from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";
import DiagnosticoFlashForm from "./DiagnosticoFlashForm";
import CsvUploader from "./CsvUploader";
import { nlpApi, aiApi, accountingApi } from "@/lib/api";

// ============================================
// TIPOS
// ============================================

export type FlashAction = "text" | "voice" | "camera" | null;

interface DataEntryWizardProps {
  onRecordSaved: (record: FinancialRecord, autoJournal?: boolean) => void;
  onBulkRecordsSaved: (records: FinancialRecord[]) => void;
  onNavigateHome?: () => void;
  /** Trigger an action from global FloatingActionBar (Option B navigation) */
  initialAction?: FlashAction;
  /** Callback to clear the action after it's been consumed */
  onActionConsumed?: () => void;
}

type Mode = "flash" | "estratega" | null;

interface MergedTransaction {
  amount: number;
  date: string;
  supplier: string;
  category: string;
  type: string;
  description: string;
  itbms: number;
  concept_key: string;
  fingerprint: string;
}

interface JournalPreview {
  concept_description: string;
  entry_date: string;
  lines: Array<{
    account_code: string;
    description: string;
    debe: number;
    haber: number;
  }>;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function DataEntryWizard({
  onRecordSaved,
  onBulkRecordsSaved,
  onNavigateHome,
  initialAction,
  onActionConsumed,
}: DataEntryWizardProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [showAiToast, setShowAiToast] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Data Merging state
  const [pendingMerge, setPendingMerge] = useState<{
    merged: MergedTransaction;
    journal_entry_preview: JournalPreview;
    confirm_payload: any;
    reasoning?: string;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Manual text entry state
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const textInputRef = useRef<HTMLInputElement>(null);

  // --- Toast helper ---
  const showToast = (msg: string, duration = 3000) => {
    setShowAiToast(msg);
    if (duration > 0) setTimeout(() => setShowAiToast(null), duration);
  };

  // --- Flujo completo de voz: Speech-to-Text -> NLP -> Asiento Diario ---
  const handleDictarGasto = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-PA";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceTranscript(null);
      showToast("Escuchando... habla ahora", 0);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setVoiceTranscript(transcript);
      recognitionRef.current._lastTranscript = transcript;
    };

    recognition.onend = async () => {
      setIsListening(false);
      const text = recognitionRef.current?._lastTranscript;
      if (!text || !text.trim()) {
        showToast("No se detecto audio. Intenta de nuevo.");
        return;
      }

      // Fase 2: NLP - Extraer intencion financiera
      setIsProcessing(true);
      showToast(`Procesando: "${text}"`, 0);

      try {
        const result = await nlpApi.interpret(text, "demo-society-001");
        // Demo mode: API retorna { data: [], success: true }
        if (Array.isArray(result?.data) && result.data.length === 0) {
          showToast(`Dictado: "${text}" — Motor NLP no disponible en modo demo. Usa el Libro Diario para crear asientos.`);
        } else if (result?.data?.requires_confirmation && result?.data?.journal_entry_preview) {
          setPendingMerge({
            merged: {
              amount: result.data.amount || 0,
              date: result.data.journal_entry_preview.entry_date || new Date().toISOString().split("T")[0],
              supplier: result.data.supplier || text,
              category: result.data.category || "general",
              type: result.data.type || "gasto",
              description: text,
              itbms: 0,
              concept_key: result.data.concept_key || "gasto_general",
              fingerprint: result.data.fingerprint || "",
            },
            journal_entry_preview: result.data.journal_entry_preview,
            confirm_payload: result.data.confirm_payload,
            reasoning: result.data.reasoning || "",
          });
          showToast("");
        } else {
          showToast(result?.description || "Procesado correctamente");
          if (result?.data && !Array.isArray(result.data)) {
            onRecordSaved(result.data as FinancialRecord, true);
          }
        }
      } catch {
        showToast(`Dictado: "${text}" - enviado al asistente`);
      } finally {
        setIsProcessing(false);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        showToast("Permiso de microfono denegado");
      } else {
        showToast(`Error de voz: ${event.error}`);
      }
    };

    recognition.start();
  };

  // --- Escanear factura con OCR (Data Merging) ---
  const handleEscanearFactura = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async () => {
      if (!input.files || !input.files[0]) return;
      const file = input.files[0];

      setIsProcessing(true);
      showToast(`Escaneando factura: ${file.name}...`, 0);

      try {
        // Fase 1: OCR con GPT-4o Vision
        const scanResult = await aiApi.scanReceipt(file);

        // Demo mode: scanResult.data es [] vacio
        if (Array.isArray(scanResult?.data) && scanResult.data.length === 0) {
          showToast("OCR no disponible en modo demo. Crea el asiento manualmente desde el Libro Diario.");
        } else if (scanResult?.data) {
          const mergeResult = await aiApi.mergeTransaction({
            receipt_data: scanResult.data,
            society_id: "demo-society-001",
          });

          if (mergeResult?.merged && mergeResult?.journal_entry_preview) {
            setPendingMerge({
              merged: mergeResult.merged,
              journal_entry_preview: mergeResult.journal_entry_preview,
              confirm_payload: mergeResult.confirm_payload,
              reasoning: mergeResult.reasoning || "",
            });
            showToast("");
          } else {
            showToast("Factura procesada pero no se pudo crear asiento");
          }
        } else {
          showToast("No se pudo leer la factura. Intenta con mejor iluminacion.");
        }
      } catch (err: any) {
        showToast(`Error OCR: ${err.message || "Intenta de nuevo"}`);
      } finally {
        setIsProcessing(false);
      }
    };
    input.click();
  };

  // --- Confirmar asiento contable (Fase 5: Feedback Loop) ---
  const handleConfirmAsiento = async () => {
    if (!pendingMerge) return;
    setIsConfirming(true);

    try {
      // Deduplication check
      if (pendingMerge.merged.fingerprint) {
        const dupCheck = await aiApi.checkDuplicate(
          pendingMerge.merged.fingerprint,
          "demo-society-001"
        );
        if (dupCheck?.is_duplicate) {
          showToast(`Duplicado detectado: ${dupCheck.message}`);
        }
      }

      // Crear asiento contable
      await accountingApi.createJournalEntry(pendingMerge.confirm_payload);
      showToast(
        `Registrado: $${pendingMerge.merged.amount.toLocaleString("es-PA")} en ${pendingMerge.merged.category}`
      );
      setPendingMerge(null);

      // Notificar al dashboard
      onRecordSaved({} as FinancialRecord, true);
    } catch (err: any) {
      showToast(`Error al guardar: ${err.message}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelAsiento = () => {
    setPendingMerge(null);
    showToast("Asiento cancelado");
  };

  // --- Ingreso manual por texto ---
  const handleToggleTextInput = () => {
    setShowTextInput((prev) => !prev);
    if (!showTextInput) {
      setTimeout(() => textInputRef.current?.focus(), 200);
    }
  };

  // --- Trigger initial action from global FloatingActionBar ---
  useEffect(() => {
    if (!initialAction) return;
    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      switch (initialAction) {
        case "text":
          if (!showTextInput) handleToggleTextInput();
          break;
        case "voice":
          handleDictarGasto();
          break;
        case "camera":
          handleEscanearFactura();
          break;
      }
      onActionConsumed?.();
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAction]);

  const handleTextSubmit = async () => {
    const text = textInput.trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    showToast(`Procesando: "${text}"`, 0);

    try {
      const result = await nlpApi.interpret(text, "demo-society-001");
      // Demo mode: API retorna { data: [], success: true }
      if (Array.isArray(result?.data) && result.data.length === 0) {
        showToast(`"${text}" — Motor NLP no disponible en modo demo. Usa el Libro Diario.`);
      } else if (result?.data?.requires_confirmation && result?.data?.journal_entry_preview) {
        setPendingMerge({
          merged: {
            amount: result.data.amount || 0,
            date: result.data.journal_entry_preview.entry_date || new Date().toISOString().split("T")[0],
            supplier: result.data.supplier || text,
            category: result.data.category || "general",
            type: result.data.type || "gasto",
            description: text,
            itbms: 0,
            concept_key: result.data.concept_key || "gasto_general",
            fingerprint: result.data.fingerprint || "",
          },
          journal_entry_preview: result.data.journal_entry_preview,
          confirm_payload: result.data.confirm_payload,
          reasoning: result.data.reasoning || "",
        });
        setTextInput("");
        setShowTextInput(false);
        showToast("");
      } else {
        showToast(result?.description || "Procesado correctamente");
        if (result?.data && !Array.isArray(result.data)) {
          onRecordSaved(result.data as FinancialRecord, true);
        }
      }
    } catch {
      showToast(`Texto: "${text}" - no se pudo procesar. Intenta de nuevo.`);
    } finally {
      setIsProcessing(false);
    }
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
      {mode === null && !pendingMerge && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("flash")}
            className="group relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 transition-all min-h-[200px] text-left"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform">
              <Camera size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-extrabold text-emerald-800 mb-1">Diagnostico Flash</h3>
              <p className="text-sm text-emerald-600 font-medium mb-2">Foto de un mes</p>
              <p className="text-xs text-slate-500 leading-relaxed">Llena un formulario rapido con los datos de un solo mes. Perfecto para empezar.</p>
            </div>
            <span className="absolute top-3 right-3 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full uppercase tracking-wider">Rapido</span>
          </button>

          <button
            onClick={() => setMode("estratega")}
            className="group relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 transition-all min-h-[200px] text-left"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500 text-white shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <Film size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-extrabold text-blue-800 mb-1">Estratega</h3>
              <p className="text-sm text-blue-600 font-medium mb-2">Pelicula de 12 meses</p>
              <p className="text-xs text-slate-500 leading-relaxed">Sube un archivo CSV con 12 meses de datos para un analisis completo.</p>
            </div>
            <span className="absolute top-3 right-3 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full uppercase tracking-wider">Completo</span>
          </button>
        </div>
      )}

      {/* ====== CHILD COMPONENTS ====== */}
      {mode === "flash" && !pendingMerge && <DiagnosticoFlashForm onSave={onRecordSaved} onBackToMenu={() => setMode(null)} />}
      {mode === "estratega" && !pendingMerge && <CsvUploader onUpload={onBulkRecordsSaved} />}

      {/* ====== JOURNAL ENTRY PREVIEW (Data Merging Result) ====== */}
      {pendingMerge && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">Confirmar Registro Contable</h3>
          </div>

          {/* Razonamiento del Sistema */}
          {pendingMerge.reasoning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <Sparkles size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-700 mb-1">Razonamiento del Sistema</p>
                <p className="text-xs text-amber-600 leading-relaxed">{pendingMerge.reasoning}</p>
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Tipo</span>
              <span className={`text-sm font-bold ${pendingMerge.merged.type === "ingreso" ? "text-emerald-600" : "text-red-600"}`}>
                {pendingMerge.merged.type === "ingreso" ? "INGRESO" : "GASTO"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Monto</span>
              <span className="text-lg font-bold text-slate-800">
                ${pendingMerge.merged.amount.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Proveedor</span>
              <span className="text-sm text-slate-700">{pendingMerge.merged.supplier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Categoria</span>
              <span className="text-sm text-slate-700 capitalize">{pendingMerge.merged.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Fecha</span>
              <span className="text-sm text-slate-700">{pendingMerge.merged.date}</span>
            </div>
            {pendingMerge.merged.itbms > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">ITBMS (7%)</span>
                <span className="text-sm text-slate-700">
                  ${pendingMerge.merged.itbms.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          <div className="border border-blue-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-blue-50 text-[11px] font-bold text-blue-700 uppercase">
              <div className="col-span-3">Cuenta</div>
              <div className="col-span-4">Detalle</div>
              <div className="col-span-2 text-right">Debe</div>
              <div className="col-span-2 text-right">Haber</div>
            </div>
            {pendingMerge.journal_entry_preview.lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1 px-4 py-2 border-t border-blue-100 text-sm">
                <div className="col-span-3 font-mono text-slate-500">{line.account_code}</div>
                <div className="col-span-4 text-slate-600">{line.description}</div>
                <div className="col-span-2 text-right font-medium">
                  {line.debe > 0 ? `$${Number(line.debe).toLocaleString("es-PA", { minimumFractionDigits: 2 })}` : ""}
                </div>
                <div className="col-span-2 text-right font-medium">
                  {line.haber > 0 ? `$${Number(line.haber).toLocaleString("es-PA", { minimumFractionDigits: 2 })}` : ""}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirmAsiento}
              disabled={isConfirming}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors min-h-[48px]"
            >
              {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Confirmar Asiento
            </button>
            <button
              onClick={handleCancelAsiento}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-300 transition-colors min-h-[48px]"
            >
              <X size={18} />
              Cancelar
            </button>
          </div>

          <p className="text-[11px] text-slate-400 italic text-center">
            Al confirmar, el asiento se registra automaticamente en el Libro Diario y el Libro Mayor.
          </p>
        </div>
      )}

      {/* ====== MANUAL TEXT INPUT PANEL ====== */}
      {showTextInput && !pendingMerge && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] sm:w-96">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Keyboard size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-slate-700">Escribir Transaccion</span>
              <button
                onClick={() => setShowTextInput(false)}
                className="ml-auto p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                ref={textInputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                placeholder="Ej: Pague $200 de luz ayer"
                className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] transition-all"
                disabled={isProcessing}
              />
              <button
                onClick={handleTextSubmit}
                disabled={isProcessing || !textInput.trim()}
                className="p-2.5 rounded-xl font-bold transition-all disabled:opacity-40 flex-shrink-0"
                style={{ backgroundColor: "#C5A059", color: "#1A242F" }}
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Escribe en lenguaje natural. El sistema detectara automaticamente el tipo de asiento.
            </p>
          </div>
        </div>
      )}

      {/* Floating buttons moved to global FloatingActionBar */}

      {/* ====== VOICE TRANSCRIPT ====== */}
      {isListening && voiceTranscript && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-5 py-3 bg-amber-600 text-white text-sm font-bold rounded-full shadow-xl max-w-sm">
            <Mic size={16} className="animate-pulse flex-shrink-0" />
            <span className="truncate">&ldquo;{voiceTranscript}&rdquo;</span>
          </div>
        </div>
      )}

      {/* ====== TOAST ====== */}
      {showAiToast && !isListening && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-800 text-white text-sm font-bold rounded-full shadow-xl border border-slate-700">
            <Sparkles size={16} className="text-amber-400" />
            {showAiToast}
          </div>
        </div>
      )}
    </div>
  );
}
