"use client";
import { useState, useMemo } from "react";
import { Send, ChevronLeft, ChevronRight, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import SurveyBloque from "./SurveyBloque";
import Estrellas from "./inputs/Estrellas";
import Escala from "./inputs/Escala";
import NPS from "./inputs/NPS";
import Opciones from "./inputs/Opciones";
import Texto from "./inputs/Texto";

// ============================================================
// TIPOS
// ============================================================

interface Respuestas {
  nombre?: string;
  empresa?: string;
  perfil?: string;
  // Bloque 1
  impresion_general?: number;
  claridad_hub?: number;
  atractivo_visual?: number;
  // Bloque 2
  facilidad_diagnostico?: number;
  utilidad_rrhh?: number;
  inventario_claro?: number;
  espejo_dgi?: string;
  // Bloque 3
  cascada_util?: number;
  simulador_valor?: number;
  lab_precios?: number;
  herramienta_mas_util?: string;
  // Bloque 4
  vigilante_util?: number;
  boveda_confianza?: number;
  ley186_relevante?: string;
  // Bloque 5
  asistente_util?: number;
  asistente_respuestas?: number;
  asistente_usaria?: string;
  // Bloque 6
  velocidad?: number;
  mobile?: string;
  mobile_experiencia?: number;
  recomendaria?: number;
  // Bloque 7
  mejor_de_la_app?: string;
  mejorar?: string;
  problema_encontrado?: string;
}

// ============================================================
// DEFINICION DE BLOQUES
// ============================================================

const BLOQUES = [
  {
    id: "intro",
    titulo: "Bienvenida",
    icono: "🧭",
    color: "#C5A059",
  },
  {
    id: "bloque1",
    titulo: "Primera Impresion",
    icono: "👋",
    color: "#059669",
  },
  {
    id: "bloque2",
    titulo: "Mi Contabilidad",
    icono: "📊",
    color: "#059669",
  },
  {
    id: "bloque3",
    titulo: "Mis Finanzas",
    icono: "💰",
    color: "#C5A059",
  },
  {
    id: "bloque4",
    titulo: "Doc Legales",
    icono: "⚖️",
    color: "#7C3AED",
  },
  {
    id: "bloque5",
    titulo: "Asistente IA",
    icono: "🤖",
    color: "#0EA5E9",
  },
  {
    id: "bloque6",
    titulo: "Experiencia General",
    icono: "📱",
    color: "#059669",
  },
  {
    id: "bloque7",
    titulo: "Tu Voz",
    icono: "💬",
    color: "#C5A059",
  },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function SurveyForm() {
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [bloqueActual, setBloqueActual] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [tiempoInicio] = useState(() => Date.now());

  const update = <K extends keyof Respuestas>(key: K, val: Respuestas[K]) => {
    setRespuestas((prev) => ({ ...prev, [key]: val }));
    setError("");
  };

  // Progreso: campos obligatorios respondidos
  const progreso = useMemo(() => {
    const obligatorios: (keyof Respuestas)[] = [
      "impresion_general",
      "claridad_hub",
      "atractivo_visual",
      "facilidad_diagnostico",
      "cascada_util",
      "velocidad",
      "recomendaria",
    ];
    const respondidos = obligatorios.filter(
      (k) => respuestas[k] !== undefined && respuestas[k] !== null
    ).length;
    return Math.round((respondidos / obligatorios.length) * 100);
  }, [respuestas]);

  // Validar si el bloque actual tiene las preguntas obligatorias
  const puedeAvanzar = useMemo(() => {
    switch (bloqueActual) {
      case 0: return true; // intro
      case 1: return !!respuestas.impresion_general && !!respuestas.claridad_hub && !!respuestas.atractivo_visual;
      case 2: return !!respuestas.facilidad_diagnostico;
      case 3: return !!respuestas.cascada_util;
      case 4: return true;
      case 5: return true;
      case 6: return !!respuestas.velocidad && respuestas.recomendaria !== undefined;
      case 7: return true;
      default: return true;
    }
  }, [bloqueActual, respuestas]);

  const handleEnviar = async () => {
    setEnviando(true);
    setError("");
    const tiempoFinal = Math.round((Date.now() - tiempoInicio) / 1000);

    try {
      const res = await fetch("/api/beta-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...respuestas,
          tiempo_completado_seg: tiempoFinal,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setEnviado(true);
      } else {
        setError("No pudimos guardar tu respuesta. Por favor intenta de nuevo.");
      }
    } catch {
      setError("Error de conexion. Por favor intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  // ============================================================
  // PANTALLA DE CONFIRMACION
  // ============================================================
  if (enviado) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white font-heading">
            ¡Gracias por tu evaluación!
          </h2>
          <p className="text-slate-400 text-sm">
            Tu retroalimentación es invaluable para mejorar Mi Director Financiero PTY.
            Los resultados nos ayudarán a priorizar las mejoras más importantes.
          </p>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2 text-left">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Resumen de tu evaluación</p>
            {respuestas.impresion_general && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Impresión general</span>
                <span className="text-amber-400">{"⭐".repeat(respuestas.impresion_general)}</span>
              </div>
            )}
            {respuestas.recomendaria !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">NPS (recomendaría)</span>
                <span className={
                  respuestas.recomendaria >= 9
                    ? "text-emerald-400"
                    : respuestas.recomendaria >= 7
                    ? "text-yellow-400"
                    : "text-red-400"
                }>
                  {respuestas.recomendaria}/10
                </span>
              </div>
            )}
          </div>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors"
          >
            Volver a la app
          </a>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER DE CADA BLOQUE
  // ============================================================
  const renderBloque = () => {
    switch (bloqueActual) {
      // ── INTRO ──
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <span className="text-5xl">🧭</span>
              <h2 className="text-2xl font-bold text-white font-heading">
                Evaluación Beta
              </h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Tu opinión nos ayuda a construir la mejor herramienta financiera
                para emprendedores panameños. Toma 5-8 minutos.
              </p>
            </div>
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">
                  Tu nombre (opcional)
                </label>
                <input
                  type="text"
                  value={respuestas.nombre ?? ""}
                  onChange={(e) => update("nombre", e.target.value)}
                  placeholder="Ej: María García"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">
                  Tu empresa (opcional)
                </label>
                <input
                  type="text"
                  value={respuestas.empresa ?? ""}
                  onChange={(e) => update("empresa", e.target.value)}
                  placeholder="Ej: Panadería El Buen Pan"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">
                  Tu perfil
                </label>
                <Opciones
                  value={respuestas.perfil}
                  onChange={(v) => update("perfil", v)}
                  options={[
                    "Emprendedor / dueño de negocio",
                    "Contador / profesional financiero",
                    "Estudiante de negocios",
                    "Consultor / asesor",
                    "Inversionista",
                    "Otro",
                  ]}
                  color="#C5A059"
                />
              </div>
            </div>
          </div>
        );

      // ── BLOQUE 1: Primera Impresión ──
      case 1:
        return (
          <SurveyBloque titulo="Primera Impresión" icono="👋" color="#059669" numero={1}>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Cuál es tu impresión general de la app? <span className="text-red-400">*</span>
                </p>
                <Estrellas
                  value={respuestas.impresion_general}
                  onChange={(v) => update("impresion_general", v)}
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Qué tan claro es el Hub principal (organigrama)? <span className="text-red-400">*</span>
                </p>
                <Escala
                  value={respuestas.claridad_hub}
                  onChange={(v) => update("claridad_hub", v)}
                  labelMin="Confuso"
                  labelMax="Muy claro"
                  color="#059669"
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Qué tan atractivo te parece el diseño visual? <span className="text-red-400">*</span>
                </p>
                <Estrellas
                  value={respuestas.atractivo_visual}
                  onChange={(v) => update("atractivo_visual", v)}
                />
              </div>
            </div>
          </SurveyBloque>
        );

      // ── BLOQUE 2: Mi Contabilidad ──
      case 2:
        return (
          <SurveyBloque titulo="Mi Contabilidad" icono="📊" color="#059669" numero={2}>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Qué tan fácil fue ingresar datos en el Diagnóstico Flash? <span className="text-red-400">*</span>
                </p>
                <Escala
                  value={respuestas.facilidad_diagnostico}
                  onChange={(v) => update("facilidad_diagnostico", v)}
                  labelMin="Muy difícil"
                  labelMax="Muy fácil"
                  color="#059669"
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Qué tan útil te parece el módulo Mi RRHH?
                </p>
                <Escala
                  value={respuestas.utilidad_rrhh}
                  onChange={(v) => update("utilidad_rrhh", v)}
                  labelMin="Poco útil"
                  labelMax="Muy útil"
                  color="#059669"
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿El módulo de inventario es claro y funcional?
                </p>
                <Escala
                  value={respuestas.inventario_claro}
                  onChange={(v) => update("inventario_claro", v)}
                  labelMin="Confuso"
                  labelMax="Muy claro"
                  color="#059669"
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿El Espejo de Formularios DGI te parece útil?
                </p>
                <Opciones
                  value={respuestas.espejo_dgi}
                  onChange={(v) => update("espejo_dgi", v)}
                  options={[
                    "Muy útil — me ahorra tiempo",
                    "Útil pero necesita más formularios",
                    "No lo entendí bien",
                    "No aplica a mi negocio",
                  ]}
                  color="#059669"
                />
              </div>
            </div>
          </SurveyBloque>
        );

      // ── BLOQUE 3: Mis Finanzas ──
      case 3:
        return (
          <SurveyBloque titulo="Mis Finanzas" icono="💰" color="#C5A059" numero={3}>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Qué tan útil es la Cascada de Rentabilidad? <span className="text-red-400">*</span>
                </p>
                <Escala
                  value={respuestas.cascada_util}
                  onChange={(v) => update("cascada_util", v)}
                  labelMin="Poco útil"
                  labelMax="Muy útil"
                  color="#C5A059"
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿El Simulador Estratégico te aporta valor?
                </p>
                <Escala
                  value={respuestas.simulador_valor}
                  onChange={(v) => update("simulador_valor", v)}
                  labelMin="Ningún valor"
                  labelMax="Mucho valor"
                  color="#C5A059"
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Qué tan útil es el Laboratorio de Precios?
                </p>
                <Estrellas
                  value={respuestas.lab_precios}
                  onChange={(v) => update("lab_precios", v)}
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Cuál herramienta financiera te parece MÁS útil?
                </p>
                <Opciones
                  value={respuestas.herramienta_mas_util}
                  onChange={(v) => update("herramienta_mas_util", v)}
                  options={[
                    "Cascada de Rentabilidad",
                    "Simulador Estratégico",
                    "Laboratorio de Precios",
                    "Punto de Equilibrio",
                    "Indicador de Liquidez (Oxígeno)",
                    "Valoración de Empresa",
                    "Presupuesto Maestro",
                  ]}
                  color="#C5A059"
                />
              </div>
            </div>
          </SurveyBloque>
        );

      // ── BLOQUE 4: Doc Legales ──
      case 4:
        return (
          <SurveyBloque titulo="Doc Legales" icono="⚖️" color="#7C3AED" numero={4}>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Qué tan útil es el Vigilante Legal?
                </p>
                <Escala
                  value={respuestas.vigilante_util}
                  onChange={(v) => update("vigilante_util", v)}
                  labelMin="Poco útil"
                  labelMax="Muy útil"
                  color="#7C3AED"
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Confías en la Bóveda Legal para guardar documentos?
                </p>
                <Escala
                  value={respuestas.boveda_confianza}
                  onChange={(v) => update("boveda_confianza", v)}
                  labelMin="No confío"
                  labelMax="Mucha confianza"
                  color="#7C3AED"
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿El monitor de Ley 186 (S.E.P.) es relevante para ti?
                </p>
                <Opciones
                  value={respuestas.ley186_relevante}
                  onChange={(v) => update("ley186_relevante", v)}
                  options={[
                    "Sí, tengo o planeo tener una S.E.P.",
                    "Sí, me interesa para informarme",
                    "No me aplica, pero es buena función",
                    "No me interesa",
                  ]}
                  color="#7C3AED"
                />
              </div>
            </div>
          </SurveyBloque>
        );

      // ── BLOQUE 5: Asistente IA ──
      case 5:
        return (
          <SurveyBloque titulo="Asistente IA" icono="🤖" color="#0EA5E9" numero={5}>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Qué tan útil te parece Mi Asistente (chatbot IA)?
                </p>
                <Estrellas
                  value={respuestas.asistente_util}
                  onChange={(v) => update("asistente_util", v)}
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Las respuestas del asistente son relevantes y precisas?
                </p>
                <Escala
                  value={respuestas.asistente_respuestas}
                  onChange={(v) => update("asistente_respuestas", v)}
                  labelMin="Irrelevantes"
                  labelMax="Muy precisas"
                  color="#0EA5E9"
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Usarías el asistente regularmente?
                </p>
                <Opciones
                  value={respuestas.asistente_usaria}
                  onChange={(v) => update("asistente_usaria", v)}
                  options={[
                    "Sí, a diario",
                    "Sí, varias veces por semana",
                    "Ocasionalmente",
                    "Probablemente no",
                    "No lo usé",
                  ]}
                  color="#0EA5E9"
                />
              </div>
            </div>
          </SurveyBloque>
        );

      // ── BLOQUE 6: Experiencia General ──
      case 6:
        return (
          <SurveyBloque titulo="Experiencia General" icono="📱" color="#059669" numero={6}>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Qué tan rápida se siente la aplicación? <span className="text-red-400">*</span>
                </p>
                <Escala
                  value={respuestas.velocidad}
                  onChange={(v) => update("velocidad", v)}
                  labelMin="Muy lenta"
                  labelMax="Muy rápida"
                  color="#059669"
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Probaste la app en celular?
                </p>
                <Opciones
                  value={respuestas.mobile}
                  onChange={(v) => update("mobile", v)}
                  options={[
                    "Sí, en iPhone",
                    "Sí, en Android",
                    "Sí, en tablet",
                    "No, solo en computadora",
                  ]}
                  color="#059669"
                />
              </div>
              {respuestas.mobile && respuestas.mobile !== "No, solo en computadora" && (
                <div>
                  <p className="text-sm text-white mb-2 font-medium">
                    ¿Cómo fue la experiencia en móvil?
                  </p>
                  <Escala
                    value={respuestas.mobile_experiencia}
                    onChange={(v) => update("mobile_experiencia", v)}
                    labelMin="Muy mala"
                    labelMax="Excelente"
                    color="#059669"
                  />
                </div>
              )}
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  Del 0 al 10, ¿qué tan probable es que recomiendes esta app a otro emprendedor? <span className="text-red-400">*</span>
                </p>
                <NPS
                  value={respuestas.recomendaria}
                  onChange={(v) => update("recomendaria", v)}
                />
              </div>
            </div>
          </SurveyBloque>
        );

      // ── BLOQUE 7: Tu Voz ──
      case 7:
        return (
          <SurveyBloque titulo="Tu Voz" icono="💬" color="#C5A059" numero={7}>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Qué es lo MEJOR de la aplicación?
                </p>
                <Texto
                  value={respuestas.mejor_de_la_app}
                  onChange={(v) => update("mejor_de_la_app", v)}
                  placeholder="Lo que más me gustó fue..."
                  rows={3}
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Qué mejorarías o agregarías?
                </p>
                <Texto
                  value={respuestas.mejorar}
                  onChange={(v) => update("mejorar", v)}
                  placeholder="Me gustaría que la app..."
                  rows={3}
                />
              </div>
              <div>
                <p className="text-sm text-white mb-2 font-medium">
                  ¿Encontraste algún problema o error?
                </p>
                <Texto
                  value={respuestas.problema_encontrado}
                  onChange={(v) => update("problema_encontrado", v)}
                  placeholder="Encontré un error cuando..."
                  rows={3}
                />
              </div>
            </div>
          </SurveyBloque>
        );

      default:
        return null;
    }
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      {/* Header sticky */}
      <header className="sticky top-0 z-50 bg-[#0D1117]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧭</span>
              <div>
                <h1 className="text-sm font-bold text-white">Mi Director Financiero PTY</h1>
                <p className="text-[10px] text-slate-500">Evaluación Beta v1.0.0</p>
              </div>
            </div>
            <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
              {progreso}% completado
            </span>
          </div>
          {/* Barra de progreso con íconos de bloques */}
          <div className="flex gap-1">
            {BLOQUES.map((b, i) => (
              <button
                key={b.id}
                onClick={() => i <= bloqueActual && setBloqueActual(i)}
                className={`
                  flex-1 h-1.5 rounded-full transition-all
                  ${i < bloqueActual ? "opacity-100" : i === bloqueActual ? "opacity-100 animate-pulse" : "opacity-30"}
                `}
                style={{ backgroundColor: i <= bloqueActual ? b.color : "#374151" }}
                title={b.titulo}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Contenido del bloque */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {renderBloque()}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Navegación */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setBloqueActual(Math.max(0, bloqueActual - 1))}
            disabled={bloqueActual === 0}
            className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          {bloqueActual < BLOQUES.length - 1 ? (
            <button
              onClick={() => setBloqueActual(bloqueActual + 1)}
              disabled={!puedeAvanzar}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleEnviar}
              disabled={enviando || !puedeAvanzar}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
            >
              {enviando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Enviar Evaluación
                </>
              )}
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-[10px] text-slate-600">
        © {new Date().getFullYear()} Mi Director Financiero PTY — Evaluación confidencial
      </footer>
    </div>
  );
}
