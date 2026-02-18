"use client";
import React, { useState } from "react";
import {
  BookOpen,
  Loader2,
  AlertTriangle,
  X,
  Sparkles,
  ShieldAlert,
  Lightbulb,
} from "lucide-react";

// ============================================
// TIPOS
// ============================================

interface SimplifyResult {
  simple: string;
  riesgo: "bajo" | "medio" | "alto";
  emoji: string;
  tip: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function LegalSimplifierButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimplifyResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleSimplify = async () => {
    if (!inputText.trim() || inputText.trim().length < 10) {
      setError("Pega al menos 10 caracteres de texto legal.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/simplify-legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          context: "contrato de sociedad anonima en Panama",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      if (data.data) {
        setResult(data.data);
      } else {
        setError("No se pudo simplificar el texto.");
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con la IA.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setInputText("");
    setError("");
  };

  const riesgoColor: Record<string, { bg: string; text: string; border: string }> = {
    bajo: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    medio: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    alto: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  };

  return (
    <div className="space-y-3">
      {/* ====== TRIGGER BUTTON ====== */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all w-full ${
          isOpen
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
            : "bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100"
        }`}
      >
        <BookOpen size={14} />
        Traductor de Jerga Legal (IA)
        <Sparkles size={12} className="ml-auto" />
      </button>

      {/* ====== PANEL EXPANDIBLE ====== */}
      {isOpen && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-indigo-600 font-medium">
              Pega cualquier clausula legal y la IA la traduce a espanol simple.
            </p>
            <button
              onClick={() => { setIsOpen(false); reset(); }}
              className="text-indigo-300 hover:text-indigo-500"
            >
              <X size={14} />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder='Ejemplo: "El compareciente confiere poder especial irrevocable al apoderado para que en su nombre y representación ejerza todos los actos de dominio..."'
            rows={4}
            className="w-full text-xs bg-white border border-indigo-200 rounded-lg p-3 outline-none focus:border-indigo-400 resize-none text-slate-700 placeholder:text-slate-300"
          />

          {/* Botón Simplificar */}
          <button
            onClick={handleSimplify}
            disabled={isLoading || inputText.trim().length < 10}
            className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              isLoading
                ? "bg-indigo-100 text-indigo-400 cursor-wait"
                : inputText.trim().length >= 10
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Traduciendo con GPT-4o...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Simplificar Clausula
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-red-600">{error}</p>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="space-y-3">
              {/* Traducción simple */}
              <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{result.emoji}</span>
                  <span className="text-xs font-bold text-indigo-700">
                    En palabras simples:
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {result.simple}
                </p>
              </div>

              {/* Nivel de riesgo */}
              {result.riesgo && (
                <div
                  className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                    riesgoColor[result.riesgo]?.bg
                  } ${riesgoColor[result.riesgo]?.border}`}
                >
                  <ShieldAlert
                    size={14}
                    className={riesgoColor[result.riesgo]?.text}
                  />
                  <span
                    className={`text-[11px] font-bold ${
                      riesgoColor[result.riesgo]?.text
                    }`}
                  >
                    Riesgo: {result.riesgo.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Tip */}
              {result.tip && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <Lightbulb size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-amber-700">
                    <span className="font-bold">Tip:</span> {result.tip}
                  </p>
                </div>
              )}

              {/* Reset */}
              <button
                onClick={reset}
                className="text-[11px] text-indigo-400 hover:text-indigo-600 font-medium"
              >
                Traducir otra clausula
              </button>
            </div>
          )}

          {/* Ejemplos rápidos */}
          {!result && !isLoading && (
            <div className="space-y-1">
              <p className="text-[10px] text-indigo-400 font-bold uppercase">
                Ejemplos de prueba:
              </p>
              {LEGAL_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setInputText(ex)}
                  className="block w-full text-left text-[10px] text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 p-1.5 rounded-lg transition-colors truncate"
                >
                  &quot;{ex.substring(0, 90)}...&quot;
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// CONSTANTES
// ============================================

const LEGAL_EXAMPLES = [
  "El compareciente confiere poder especial irrevocable al apoderado para que en su nombre y representacion ejerza todos los actos de dominio sobre los bienes muebles e inmuebles de la sociedad, incluyendo pero sin limitarse a la compraventa, hipoteca, gravamen y cualquier otro acto de disposicion.",
  "La junta directiva podra declarar dividendos preferenciales acumulativos a favor de las acciones de clase B, con prelacion sobre cualesquiera distribuciones a los tenedores de acciones comunes, siempre que el patrimonio neto de la sociedad exceda el capital social autorizado.",
  "En caso de incumplimiento de las obligaciones fiscales descritas en la clausula septima, el representante legal sera solidariamente responsable con la sociedad por las multas, recargos e intereses moratorios que imponga la Direccion General de Ingresos.",
];
