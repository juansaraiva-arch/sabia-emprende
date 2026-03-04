"use client";
import React, { useState } from "react";
import { BrainCircuit, Send, Loader2, Sparkles, AlertTriangle, CheckCircle2, BookOpen, Check, X } from "lucide-react";
import { nlpApi, accountingApi } from "@/lib/api";
import type { StrategicAlert } from "@/lib/alerts";

interface NaturalLanguageInputProps {
  societyId: string;
  onResult?: (result: any) => void;
  /** Alerta de mayor prioridad para el Smart Prompt */
  topAlert?: StrategicAlert | null;
}

const EXAMPLES = [
  "Mis ventas de enero fueron 50 mil",
  "Gaste 30 mil en mercancia",
  "Pague la luz 200 dolares",
  "Me pago el cliente 5 mil",
  "Como esta mi negocio?",
  "Si subo el precio un 10%, que pasa?",
];

// Smart Prompt: Respuestas proactivas basadas en contexto
function getProactiveMessages(topAlert: StrategicAlert | null): string[] {
  if (!topAlert) return [];
  const msgs: string[] = [];

  // Deteccion de ausentismo
  if (topAlert.id === "ausentismo-critico") {
    msgs.push("Detecte faltas injustificadas. He recalculado el costo patronal (12.25%) ahorrandote el sobrecosto de los dias no laborados.");
  }
  // Vacaciones acumuladas
  if (topAlert.id.startsWith("vacaciones-acumuladas")) {
    msgs.push("Tu colaborador tiene vacaciones pendientes. Planifica su salida para reducir el Pasivo Laboral acumulado.");
  }
  // ITBMS provision
  if (topAlert.id === "itbms_obligatorio" || topAlert.id === "itbms_vs_cash") {
    msgs.push("Alerta: Asegurate de provisionar el 7% de ITBMS de cada venta. No uses ese dinero — es del fisco.");
  }
  // XIII Mes
  if (topAlert.id === "xiii_mes_warning") {
    msgs.push("Tienes acumulado de XIII Mes que podria afectar tu flujo de caja. Quieres ver como impacta?");
  }
  // Empresa saludable
  if (topAlert.priority === "green") {
    msgs.push("Tu empresa esta saludable y escalable. En que mas puedo ayudarte hoy?");
  }

  return msgs;
}

export default function NaturalLanguageInput({
  societyId,
  onResult,
  topAlert,
}: NaturalLanguageInputProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  const handleSubmit = async (text?: string) => {
    const input = text || query;
    if (!input.trim()) return;

    setLoading(true);
    setPendingPayload(null);
    try {
      const result = await nlpApi.interpret(input, societyId);

      // Demo mode: API retorna { data: [], success: true }
      if (Array.isArray(result.data) && result.data.length === 0) {
        setLastResult({
          understood: true,
          description: `Recibido: "${input}". El motor NLP no esta disponible en modo demo. Puedes crear asientos manualmente desde el Libro Diario.`,
        });
        onResult?.({ understood: true, description: input });
      } else if (result.data?.requires_confirmation && result.data?.confirm_payload) {
        setLastResult(result);
        setPendingPayload(result.data.confirm_payload);
      } else {
        setLastResult(result);
        onResult?.(result);
      }
    } catch (err) {
      setLastResult({
        understood: false,
        description: "Error de conexion con el servidor.",
      });
    } finally {
      setLoading(false);
      if (!text) setQuery("");
    }
  };

  const handleConfirmJournalEntry = async () => {
    if (!pendingPayload) return;
    setConfirming(true);
    try {
      const result = await accountingApi.createJournalEntry(pendingPayload);
      setLastResult({
        understood: true,
        action: "journal_entry_created",
        description: `Asiento #${result.data?.entry_number || ""} guardado correctamente. Total: $${result.data?.total_debe?.toLocaleString("es-PA") || "0"}`,
        data: result.data,
      });
      setPendingPayload(null);
      onResult?.({ action: "journal_entry_created", data: result.data });
    } catch (err: any) {
      setLastResult({
        understood: false,
        description: `Error al guardar asiento: ${err.message}`,
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelJournalEntry = () => {
    setPendingPayload(null);
    setLastResult({
      understood: true,
      description: "Asiento cancelado. Puedes intentar de nuevo.",
    });
  };

  // Smart Prompt: placeholder dinámico basado en alertas
  const smartPlaceholder = topAlert
    ? `${topAlert.emoji} ${topAlert.promptHint}`
    : "Ej: Mis ventas de enero fueron 50 mil...";

  const promptColor = topAlert
    ? topAlert.priority === "red"
      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
      : topAlert.priority === "orange"
        ? "border-orange-300 focus:border-orange-500 focus:ring-orange-500/10"
        : topAlert.priority === "yellow"
          ? "border-amber-300 focus:border-amber-500 focus:ring-amber-500/10"
          : "border-slate-300 focus:border-purple-500 focus:ring-purple-500/10"
    : "border-slate-300 focus:border-purple-500 focus:ring-purple-500/10";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <BrainCircuit size={20} className="text-purple-600" />
        <h3 className="font-bold text-slate-800">
          Habla en Espanol Plano
        </h3>
      </div>

      {/* Smart Alert Banner */}
      {topAlert && topAlert.priority !== "green" && (
        <div
          className={`flex items-start gap-2 p-3 rounded-xl mb-4 ${
            topAlert.priority === "red"
              ? "bg-red-50 border border-red-200"
              : topAlert.priority === "orange"
                ? "bg-orange-50 border border-orange-200"
                : "bg-amber-50 border border-amber-200"
          }`}
        >
          <span className="text-base mt-0.5">{topAlert.emoji}</span>
          <div className="flex-1">
            <p
              className={`text-xs font-bold ${
                topAlert.priority === "red"
                  ? "text-red-700"
                  : topAlert.priority === "orange"
                    ? "text-orange-700"
                    : "text-amber-700"
              }`}
            >
              {topAlert.title}
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {topAlert.message}
            </p>
          </div>
        </div>
      )}

      {topAlert && topAlert.priority === "green" && (
        <div className="flex items-center gap-2 p-3 rounded-xl mb-4 bg-emerald-50 border border-emerald-200">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <p className="text-xs font-bold text-emerald-700">
            {topAlert.message}
          </p>
        </div>
      )}

      {/* Proactive Messages */}
      {topAlert && getProactiveMessages(topAlert).length > 0 && (
        <div className="mb-4 space-y-1">
          {getProactiveMessages(topAlert).map((msg, i) => (
            <p key={i} className="text-[11px] text-slate-500 italic px-1">
              💡 {msg}
            </p>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={smartPlaceholder}
          className={`flex-1 p-3 border rounded-xl outline-none focus:ring-4 transition-all text-sm ${promptColor}`}
          disabled={loading}
        />
        <button
          onClick={() => handleSubmit()}
          disabled={loading || !query.trim()}
          className="px-5 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      {/* Quick examples */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setQuery(ex);
              handleSubmit(ex);
            }}
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-purple-50 hover:text-purple-700 transition-all"
          >
            <Sparkles size={10} className="inline mr-1" />
            {ex}
          </button>
        ))}
      </div>

      {/* Journal Entry Preview (Fase 5) */}
      {pendingPayload && lastResult?.data?.journal_entry_preview && (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-blue-600" />
            <p className="text-sm font-bold text-blue-800">
              Previsualizacion del Asiento Contable
            </p>
          </div>
          <p className="text-xs text-slate-600">
            {lastResult.data.journal_entry_preview.concept_description} — {lastResult.data.journal_entry_preview.entry_date}
          </p>

          {/* Lines preview table */}
          <div className="border border-blue-200 rounded-lg overflow-hidden bg-white">
            <div className="grid grid-cols-12 gap-1 px-3 py-1.5 bg-blue-100 text-[10px] font-bold text-blue-700 uppercase">
              <div className="col-span-3">Cuenta</div>
              <div className="col-span-4">Detalle</div>
              <div className="col-span-2 text-right">Debe</div>
              <div className="col-span-2 text-right">Haber</div>
            </div>
            {lastResult.data.journal_entry_preview.lines.map((line: any, idx: number) => (
              <div key={idx} className="grid grid-cols-12 gap-1 px-3 py-1.5 border-t border-blue-100 text-xs">
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

          <div className="flex gap-2">
            <button
              onClick={handleConfirmJournalEntry}
              disabled={confirming}
              className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {confirming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Confirmar Asiento
            </button>
            <button
              onClick={handleCancelJournalEntry}
              className="inline-flex items-center gap-1 px-4 py-2 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300 transition-colors"
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {lastResult && !pendingPayload && (
        <div
          className={`p-4 rounded-xl border ${
            lastResult.understood
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <p className="text-sm font-medium text-slate-700">
            {lastResult.description}
          </p>
          {lastResult.suggestion && (
            <p className="text-xs text-slate-500 mt-2 whitespace-pre-line">
              {lastResult.suggestion}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
