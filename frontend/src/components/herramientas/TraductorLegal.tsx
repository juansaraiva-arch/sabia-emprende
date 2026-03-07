"use client";

import { useState, useCallback } from "react";
import {
  BookOpen,
  Loader2,
  Trash2,
  CheckCircle,
  Briefcase,
  ClipboardList,
  Pin,
  AlertTriangle,
  Send,
} from "lucide-react";

// ============================================================
// TIPOS
// ============================================================

interface TraduccionResult {
  en_simple: string;
  para_negocio: string;
  accion_requerida: string;
  datos_importantes: string;
}

// ============================================================
// PARSER: extrae secciones del response GPT
// ============================================================

function parseTraduccion(raw: string): TraduccionResult {
  const sections: TraduccionResult = {
    en_simple: "",
    para_negocio: "",
    accion_requerida: "",
    datos_importantes: "",
  };

  // Buscar secciones por header
  const headerMap: [RegExp, keyof TraduccionResult][] = [
    [/EN SIMPLE:?/i, "en_simple"],
    [/PARA TU NEGOCIO:?/i, "para_negocio"],
    [/ACCION REQUERIDA:?/i, "accion_requerida"],
    [/DATOS IMPORTANTES:?/i, "datos_importantes"],
  ];

  // Encontrar posiciones de cada header
  const positions: { key: keyof TraduccionResult; start: number }[] = [];
  for (const [regex, key] of headerMap) {
    const match = raw.match(regex);
    if (match && match.index !== undefined) {
      positions.push({ key, start: match.index + match[0].length });
    }
  }

  // Ordenar por posicion
  positions.sort((a, b) => a.start - b.start);

  // Extraer contenido entre headers
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start;
    const end = i + 1 < positions.length ? raw.lastIndexOf("\n", positions[i + 1].start - 1) : raw.length;
    const content = raw.slice(start, end > start ? end : raw.length).trim();
    sections[positions[i].key] = content;
  }

  // Si no se encontraron secciones, poner todo en en_simple
  if (positions.length === 0 && raw.trim()) {
    sections.en_simple = raw.trim();
  }

  return sections;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function TraductorLegal() {
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<TraduccionResult | null>(null);
  const [error, setError] = useState("");
  const [esDemo, setEsDemo] = useState(false);

  const MAX_CHARS = 5000;

  const handleTraducir = useCallback(async () => {
    if (!texto.trim() || texto.trim().length < 10) {
      setError("Pega al menos 10 caracteres de texto legal.");
      return;
    }

    setError("");
    setResultado(null);
    setEsDemo(false);
    setLoading(true);

    try {
      const res = await fetch("/api/herramientas/traductor-legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Error al procesar la traduccion.");
        return;
      }

      setResultado(parseTraduccion(data.traduccion));
      if (data.demo) setEsDemo(true);
    } catch (err: unknown) {
      setError("Error de conexion. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [texto]);

  const handleLimpiar = () => {
    setTexto("");
    setResultado(null);
    setError("");
    setEsDemo(false);
  };

  const charCount = texto.length;
  const charPct = Math.min((charCount / MAX_CHARS) * 100, 100);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Input Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#C5A059]" />
          <h2 className="text-base font-bold text-[#1A242F] font-[family-name:var(--font-heading)]">
            Traductor Legal
          </h2>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-slate-500">
            Pega un texto legal y lo traducimos a lenguaje simple para que
            entiendas que significa para tu negocio.
          </p>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={texto}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setTexto(e.target.value);
                  if (error) setError("");
                }
              }}
              placeholder="Pega aqui el texto legal que quieres entender..."
              rows={6}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#1A242F] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 focus:border-[#C5A059] resize-none font-[family-name:var(--font-body)]"
            />
            {/* Character counter */}
            <div className="flex items-center justify-between mt-1">
              <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden mr-3">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    charPct > 90
                      ? "bg-red-400"
                      : charPct > 70
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  }`}
                  style={{ width: `${charPct}%` }}
                />
              </div>
              <span
                className={`text-xs font-medium ${
                  charPct > 90 ? "text-red-500" : "text-slate-400"
                }`}
              >
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTraducir}
              disabled={loading || !texto.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C5A059] hover:bg-[#b8944f] disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium rounded-xl text-sm transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traduciendo...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Traducir a lenguaje simple
                </>
              )}
            </button>
            <button
              onClick={handleLimpiar}
              disabled={loading || (!texto && !resultado)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-600 font-medium rounded-xl text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Result Section */}
      {resultado && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Demo Banner */}
          {esDemo && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-amber-600">
                Modo demo - Sin API Key de OpenAI, mostrando respuesta de ejemplo
              </span>
            </div>
          )}

          <div className="p-4 space-y-4">
            {/* EN SIMPLE */}
            {resultado.en_simple && (
              <ResultSection
                icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
                title="En simple"
                content={resultado.en_simple}
                borderColor="border-emerald-200"
                bgColor="bg-emerald-50"
              />
            )}

            {/* PARA TU NEGOCIO */}
            {resultado.para_negocio && (
              <ResultSection
                icon={<Briefcase className="w-5 h-5 text-blue-500" />}
                title="Para tu negocio"
                content={resultado.para_negocio}
                borderColor="border-blue-200"
                bgColor="bg-blue-50"
              />
            )}

            {/* ACCION REQUERIDA */}
            {resultado.accion_requerida && (
              <ResultSection
                icon={<ClipboardList className="w-5 h-5 text-[#C5A059]" />}
                title="Accion requerida"
                content={resultado.accion_requerida}
                borderColor="border-[#C5A059]/30"
                bgColor="bg-amber-50"
              />
            )}

            {/* DATOS IMPORTANTES */}
            {resultado.datos_importantes && (
              <ResultSection
                icon={<Pin className="w-5 h-5 text-red-500" />}
                title="Datos importantes"
                content={resultado.datos_importantes}
                borderColor="border-red-200"
                bgColor="bg-red-50"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTE: Seccion de resultado
// ============================================================

function ResultSection({
  icon,
  title,
  content,
  borderColor,
  bgColor,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  borderColor: string;
  bgColor: string;
}) {
  return (
    <div className={`border ${borderColor} ${bgColor} rounded-xl p-3`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-bold text-[#1A242F] font-[family-name:var(--font-heading)]">
          {title}
        </h3>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-[family-name:var(--font-body)]">
        {content}
      </p>
    </div>
  );
}
