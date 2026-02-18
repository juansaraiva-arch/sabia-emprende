"use client";
import React, { useState } from "react";
import { BrainCircuit, Send, Loader2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { nlpApi } from "@/lib/api";
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
  "Mi alquiler cuesta 5 mil",
  "Como esta mi negocio?",
  "Si subo el precio un 10%, que pasa?",
  "Cuanto debo vender para no perder?",
];

export default function NaturalLanguageInput({
  societyId,
  onResult,
  topAlert,
}: NaturalLanguageInputProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleSubmit = async (text?: string) => {
    const input = text || query;
    if (!input.trim()) return;

    setLoading(true);
    try {
      const result = await nlpApi.interpret(input, societyId);
      setLastResult(result);
      onResult?.(result);
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

      {/* Result */}
      {lastResult && (
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
