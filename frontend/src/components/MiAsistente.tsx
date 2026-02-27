"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  BookOpen,
  Check,
  Bot,
} from "lucide-react";
import { nlpApi, accountingApi } from "@/lib/api";
import { checkFormalizationStatus } from "@/lib/formalizacion";

// ============================================
// MI ASISTENTE — Chatbot IA Flotante
// Nucleo de inteligencia de Mi Director Financiero PTY
// ============================================

interface MiAsistenteProps {
  societyId: string;
  onResult?: (result: any) => void;
  /** Force the chat panel open (controlled from parent) */
  forceOpen?: boolean;
  /** Called when user closes the chat (for parent to sync state) */
  onClose?: () => void;
  /** Hide the floating button (when org chart node replaces it) */
  hideButton?: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  journalPreview?: any;
  confirmed?: boolean;
  reasoning?: string;
}

const RUBROS_LABELS: Record<string, string> = {
  restaurante: "Restaurante / Alimentos y Bebidas",
  comercio_minorista: "Comercio Minorista",
  tecnologia: "Tecnologia / Software",
  servicios_profesionales: "Servicios Profesionales (Consultoria, Legal, Contable)",
  construccion: "Construccion / Bienes Raices",
  transporte: "Transporte / Logistica",
  salud: "Salud / Clinica / Farmacia",
  educacion: "Educacion / Academia",
  turismo: "Turismo / Hoteleria",
  manufactura: "Manufactura / Produccion Industrial",
  agro: "Agropecuario / Agroindustria",
  belleza: "Belleza / Estetica / Salon",
  otro: "Otro",
};

function buildSystemPrompt(): string {
  const companyName = typeof window !== "undefined" ? localStorage.getItem("midf_company_name") || "" : "";
  const rubroKey = typeof window !== "undefined" ? localStorage.getItem("midf_company_rubro") || "" : "";
  const rubroLabel = RUBROS_LABELS[rubroKey] || "";

  const rubroContext = rubroLabel
    ? `\nContexto de la Empresa:\n- Nombre: ${companyName || "No especificado"}\n- Rubro/Industria: ${rubroLabel}\n- IMPORTANTE: Todas tus respuestas, calculos, margenes sugeridos, clausulas legales y estrategias fiscales deben estar orientadas especificamente al sector de ${rubroLabel}. Usa referencias, benchmarks y ejemplos propios de este rubro.\n`
    : companyName
      ? `\nContexto de la Empresa:\n- Nombre: ${companyName}\n- Rubro: No especificado. Puedes preguntar al usuario su rubro para dar respuestas mas precisas.\n`
      : "";

  return `Identidad y Rol: Eres el CFO y Consultor Legal Senior de Mi Director Financiero PTY. Tu mision es guiar al emprendedor panameno en rentabilidad y estructura corporativa, actuando siempre como una herramienta de preparacion y soporte, no de ejecucion final autonoma. Tu tono es profesional, ejecutivo, eficiente y con un toque de calidez local ("Panameno-friendly").

Contexto Operativo:
- Ubicacion: Operas bajo el marco legal y tributario de la Republica de Panama.
- Conocimiento del Negocio: Tienes acceso en tiempo real a tres modulos:
  * Mi Contador: Facturas, ingresos, egresos y flujo de caja.
  * Mis Finanzas: Analisis de rentabilidad y proyecciones.
  * Mi Empresa (Doc. Legales): Pactos sociales, Avisos de Operacion, Actas de Junta Directiva y registros municipales.
${rubroContext}
Facultades Estrategicas:

1. Consultoria de Precios (Pricing & Margins):
- Ayuda al usuario a calcular el precio de sus productos o servicios aplicando logica financiera.
- Calculo de Costos: Identificacion de costos directos e indirectos.
- Margen de Contribucion: Sugerencias basadas en el rubro (ej. Restaurantes 60-70%, Servicios 40-50%, Tecnologia SaaS 75-85%).
- Punto de Equilibrio: Explica cuantas unidades debe vender para cubrir gastos fijos usando datos de Mis Finanzas.

2. Operacion del Modulo 'Mi Contador':
- Guia al usuario en el uso operativo de la plataforma.
- Registro: Como ingresar transacciones en el Libro Diario para su reflejo automatico en el Libro Mayor.
- Validacion: Como revisar el Balance de Comprobacion para asegurar la exactitud del 'Espejo DGI'.

3. Soporte Legal y Redaccion (LegalTech):
- Actua como asistente legal para la constitucion y vida corporativa.
- Estatutos Originales: Provee clausulas base para los pactos sociales de una S.E. segun el rubro (ej. propiedad intelectual para tecnologia, responsabilidad para transporte).
- Actas de Juntas Extraordinarias: Ayuda a redactar borradores para cambios de junta, aumentos de capital o prestamos, siguiendo las formalidades de la Ley panamena.
- ADVERTENCIA OBLIGATORIA: En cada consulta legal, SIEMPRE recomienda que los borradores sean revisados y avalados por un abogado idoneo antes de su firma o inscripcion en el Registro Publico.

4. Ingenieria Fiscal (Tax Shield & Deducciones):
- Analiza y sugiere beneficios fiscales permitidos en Panama para optimizar la caja.
- Leasing Financiero: Explica como el canon de arrendamiento de un auto comercial puede ser deducible al 100% como gasto operativo.
- Escudo Fiscal por Depreciacion: Asesora sobre el uso de la depreciacion de activos fijos (equipos, mobiliario, vehiculos) para reducir la base imponible del ISR.
- Gastos Deducibles: Identifica oportunidades de ahorro fiscal legitimas segun el rubro.
- ADVERTENCIA OBLIGATORIA: En cada consulta fiscal, SIEMPRE indica al usuario que toda estrategia fiscal y deduccion sugerida debe ser verificada y validada con su contador publico autorizado antes de proceder con el registro contable final o la declaracion de impuestos.

Protocolo de Registro de Transacciones:
- Cuando el usuario indique un movimiento financiero, debes:
  1. Identificar: Tipo (Gasto/Ingreso), Monto, Proveedor/Cliente y Categoria.
  2. Confirmar: "Entendido. Registro un [tipo] de $[monto] en la categoria de [categoria]. Es correcto?"
  3. Una vez confirmado, generar el asiento contable automaticamente.

Reglas de Operacion y Seguridad:
- Cumplimiento Local: Todas las respuestas deben alinearse con el Codigo de Comercio de Panama y las normativas de la DGI.
- Si no encuentras un dato, no lo inventes. Di: "No encuentro esa informacion en el sistema, te gustaria que la registremos ahora?"
- Siempre prioriza la seguridad de los datos.

IMPORTANTE: Eres un facilitador de gestion empresarial. No sustituyes la asesoria profesional especializada de abogados, contadores publicos autorizados o asesores financieros certificados. Cuando la consulta sea compleja o tenga implicaciones legales/fiscales significativas, siempre recomienda al usuario consultar con el profesional correspondiente.`;
}

const QUICK_ACTIONS = [
  { label: "Registrar gasto", text: "Quiero registrar un gasto" },
  { label: "Ver mi EBITDA", text: "Como esta mi EBITDA este mes?" },
  { label: "Proximos pagos", text: "Que pagos tengo pendientes?" },
  { label: "Salud financiera", text: "Como esta la salud de mi negocio?" },
  { label: "Mi formalizacion", text: "Como va mi formalizacion de Sociedad de Emprendimiento?" },
];

// Keywords que indican que el usuario pregunta sobre formalizacion
const FORMALIZACION_KEYWORDS = [
  "formalizacion", "formalización", "sociedad de emprendimiento",
  "s.e.", "que me falta", "qué me falta", "pasos legales",
  "ruta legal", "constituir empresa", "crear empresa",
  "registro publico", "aviso de operacion", "ampyme",
  "ruc", "inscripcion municipal", "estatutos",
];

export default function MiAsistente({ societyId, onResult, forceOpen, onClose, hideButton }: MiAsistenteProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sync forceOpen from parent
  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hola! Soy tu Asistente Financiero. Puedo ayudarte a registrar gastos, revisar tus finanzas o responder preguntas sobre tu negocio. En que puedo ayudarte?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll al ultimo mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input cuando se abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const addMessage = (role: ChatMessage["role"], content: string, extra?: Partial<ChatMessage>) => {
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
      ...extra,
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const handleSend = async (text?: string) => {
    const userText = text || input;
    if (!userText.trim() || loading) return;

    addMessage("user", userText);
    setInput("");
    setLoading(true);

    // Detectar queries sobre formalizacion S.E. (respuesta local, sin API)
    const lowerText = userText.toLowerCase();
    const isFormalizacionQuery = FORMALIZACION_KEYWORDS.some((kw) =>
      lowerText.includes(kw)
    );

    if (isFormalizacionQuery) {
      const status = checkFormalizationStatus();
      let response = `Tu Ruta de Formalizacion S.E. va al ${status.percentComplete}% (${status.completed} de ${status.total} pasos completados).\n\n`;
      if (status.pending.length > 0) {
        response += `Pasos pendientes:\n${status.pending.map((p) => `• ${p}`).join("\n")}\n\n`;
      }
      if (status.inProgress.length > 0) {
        response += `En proceso:\n${status.inProgress.map((p) => `• ${p}`).join("\n")}\n\n`;
      }
      if (status.completedSteps.length > 0) {
        response += `Completados:\n${status.completedSteps.map((p) => `✓ ${p}`).join("\n")}\n\n`;
      }
      if (!status.started) {
        response += "Aun no has iniciado tu ruta de formalizacion. Te recomiendo visitar la seccion de Formalizacion desde el banner en tu inicio.";
      } else if (status.completed === status.total) {
        response += "¡Felicitaciones! Has completado todos los pasos. Tu S.E. esta formalizada.";
      } else {
        response += "Puedes actualizar el estado de cada paso desde la seccion de Formalizacion.";
      }
      addMessage("assistant", response);
      setLoading(false);
      return;
    }

    try {
      // Build conversation history for GPT-4o context
      const chatHistory = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10) // Last 10 messages for context
        .map((m) => ({ role: m.role, content: m.content }));

      const systemPrompt = buildSystemPrompt();
      const result = await nlpApi.chat(userText, societyId, systemPrompt, chatHistory);

      // Demo mode: API retorna { data: [], success: true }
      if (Array.isArray(result?.data) && result.data.length === 0 && !result?.reply) {
        addMessage(
          "assistant",
          `Recibi tu mensaje: "${userText}". El motor NLP no esta disponible en modo demo, pero puedes crear asientos manualmente en el Libro Diario o usar las herramientas de cada modulo.`
        );
      } else if (result?.data?.requires_confirmation && result?.data?.journal_entry_preview) {
        // Regex captured a structured accounting action → show journal entry preview
        addMessage("assistant", result.reply || "He preparado este asiento contable:", {
          journalPreview: result.data.journal_entry_preview,
          reasoning: result.data.reasoning || "",
        });
      } else {
        // GPT-4o conversational response or regex result
        const responseText = result?.reply || "Procesado correctamente.";
        addMessage("assistant", responseText);
        if (result?.data) {
          onResult?.(result);
        }
      }
    } catch (err: any) {
      const errorDetail = err?.message || "Error desconocido";
      console.error("[MiAsistente] Error:", errorDetail);
      addMessage(
        "assistant",
        `No pude procesar tu solicitud: ${errorDetail}. Intenta de nuevo o reformula tu pregunta.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmJournal = async (msgId: string, payload: any) => {
    setLoading(true);
    try {
      const result = await accountingApi.createJournalEntry(payload);
      // Marcar como confirmado
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, confirmed: true } : m))
      );
      addMessage(
        "assistant",
        `Asiento #${result.data?.entry_number || ""} guardado correctamente. Total: $${result.data?.total_debe?.toLocaleString("es-PA") || "0"}`
      );
      onResult?.({ action: "journal_entry_created", data: result.data });
    } catch (err: any) {
      addMessage("assistant", `Error al guardar el asiento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Voice input
  const handleVoice = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addMessage("system", "Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-PA";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Auto-send after voice
      setTimeout(() => handleSend(transcript), 200);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
  };

  return (
    <>
      {/* Floating Button (hidden when hideButton=true, e.g. in Hub org chart) */}
      {!isOpen && !hideButton && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-50 flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all group"
          style={{
            backgroundColor: "#1A242F",
            color: "#C5A059",
            boxShadow: "0 4px 24px rgba(26, 36, 47, 0.35)",
          }}
          aria-label="Abrir Mi Asistente"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#C5A059]/20 group-hover:bg-[#C5A059]/30 transition-colors">
            <Bot size={18} className="text-[#C5A059]" />
          </div>
          <span className="hidden sm:inline">Mi Asistente</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[400px] h-full sm:h-[600px] sm:max-h-[80vh] flex flex-col bg-white sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ backgroundColor: "#1A242F" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(197, 160, 89, 0.2)" }}
              >
                <Sparkles size={18} style={{ color: "#C5A059" }} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: "#C5A059" }}>
                  Mi Asistente
                </h3>
                <p className="text-[10px] text-slate-400">
                  Director Financiero PTY
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Cerrar asistente"
            >
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#1A242F] text-white rounded-br-md"
                      : msg.role === "system"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-white text-slate-700 border border-slate-200 rounded-bl-md shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Journal Entry Preview */}
                  {msg.journalPreview && !msg.confirmed && (
                    <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <BookOpen size={14} className="text-blue-600" />
                        <span className="text-xs font-bold text-blue-700">
                          Asiento Contable
                        </span>
                      </div>
                      {/* Razonamiento del sistema */}
                      {msg.reasoning && (
                        <div className="mb-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                          <div className="flex items-start gap-1.5">
                            <Sparkles size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-amber-600 leading-relaxed">{msg.reasoning}</p>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-600 mb-2">
                        {msg.journalPreview.concept_description}
                      </p>
                      {msg.journalPreview.lines?.map((line: any, i: number) => (
                        <div key={i} className="flex justify-between text-[11px] text-slate-600 py-0.5">
                          <span className="font-mono">{line.account_code}</span>
                          <span>
                            {line.debe > 0 && `D: $${line.debe.toLocaleString()}`}
                            {line.haber > 0 && `H: $${line.haber.toLocaleString()}`}
                          </span>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          handleConfirmJournal(msg.id, msg.journalPreview)
                        }
                        disabled={loading}
                        className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Check size={12} />
                        Confirmar
                      </button>
                    </div>
                  )}

                  {msg.confirmed && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <Check size={12} />
                      Asiento confirmado
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400">Procesando...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (solo al inicio) */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 bg-white border-t border-slate-100">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => handleSend(qa.text)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex items-center gap-2 px-3 py-3 bg-white border-t border-slate-200 flex-shrink-0">
            <button
              onClick={handleVoice}
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              aria-label={isListening ? "Detener" : "Dictar por voz"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isListening ? "Escuchando..." : "Escribe o dicta..."}
              className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] transition-all"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl font-bold transition-all disabled:opacity-40 flex-shrink-0"
              style={{ backgroundColor: "#C5A059", color: "#1A242F" }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          {/* Aviso Legal — Disclaimer */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex-shrink-0">
            <p className="text-[8px] leading-relaxed text-slate-400 text-center">
              AVISO LEGAL: Las respuestas son generadas con IA como herramienta de orientacion.
              No constituyen asesoria legal, contable ni financiera definitiva.
              Toda estrategia debe ser validada por un profesional idoneo (abogado o CPA) antes de su uso.
              Mi Director Financiero PTY es un facilitador de gestion y no sustituye el criterio profesional especializado.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
