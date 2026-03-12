"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic,
  MicOff,
  Camera,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Receipt,
  Volume2,
  FileAudio,
  Upload,
} from "lucide-react";

// ============================================
// TIPOS
// ============================================

interface ScanResult {
  total: number | null;
  itbms: number | null;
  proveedor: string | null;
  categoria_sugerida: string | null;
  fecha: string | null;
  descripcion_items: string | null;
  confianza: "alta" | "media" | "baja";
}

interface VoiceResult {
  tipo: "ingreso" | "gasto";
  monto: number | null;
  concepto: string;
  categoria: string;
  confianza: "alta" | "media" | "baja";
  nota: string;
}

type ProcessingState = "idle" | "recording" | "processing" | "success" | "error";

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function SmartExpenseInput() {
  // --- Detección de capacidad de micrófono ---
  const [canRecord, setCanRecord] = useState<boolean>(true);

  useEffect(() => {
    // getUserMedia requiere HTTPS o localhost
    const isSecure =
      typeof window !== "undefined" &&
      (window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    const hasMediaDevices =
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";
    setCanRecord(isSecure && hasMediaDevices);
  }, []);

  // --- Estado de voz ---
  const [voiceState, setVoiceState] = useState<ProcessingState>("idle");
  const [voiceResult, setVoiceResult] = useState<VoiceResult | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [voiceError, setVoiceError] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // --- Estado de escaneo ---
  const [scanState, setScanState] = useState<ProcessingState>("idle");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // CONVERTIR AUDIO A WAV EN EL NAVEGADOR
  // ============================================

  const convertToWav = useCallback(async (blob: Blob): Promise<Blob> => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Convertir a WAV PCM 16-bit mono
      const sampleRate = Math.min(audioBuffer.sampleRate, 16000); // 16kHz es suficiente para voz
      const numChannels = 1; // mono
      const length = Math.floor(audioBuffer.length * sampleRate / audioBuffer.sampleRate);

      // Offline context para resamplear
      const offlineCtx = new OfflineAudioContext(numChannels, length, sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);
      const renderedBuffer = await offlineCtx.startRendering();

      // Extraer datos PCM
      const pcmData = renderedBuffer.getChannelData(0);

      // Construir WAV
      const wavBuffer = new ArrayBuffer(44 + pcmData.length * 2);
      const view = new DataView(wavBuffer);

      // WAV header
      const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + pcmData.length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * 2, true);
      view.setUint16(32, numChannels * 2, true);
      view.setUint16(34, 16, true); // 16-bit
      writeString(36, 'data');
      view.setUint32(40, pcmData.length * 2, true);

      // Escribir muestras PCM 16-bit
      for (let i = 0; i < pcmData.length; i++) {
        const s = Math.max(-1, Math.min(1, pcmData[i]));
        view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }

      await audioContext.close();
      return new Blob([wavBuffer], { type: 'audio/wav' });
    } catch {
      // Si falla la conversión, devolver el blob original
      return blob;
    }
  }, []);

  // ============================================
  // ENVIAR AUDIO AL BACKEND (compartido)
  // ============================================

  const sendAudioToBackend = useCallback(async (blob: Blob, ext: string) => {
    setVoiceState("processing");

    try {
      // Convertir a WAV antes de enviar para máxima compatibilidad con Whisper
      let audioBlob = blob;
      let audioExt = ext;

      // Si NO es un formato que Whisper acepta nativo, convertir a WAV
      const whisperNative = ["mp3", "wav", "webm", "ogg", "m4a", "mp4", "mpeg", "mpga"];
      if (!whisperNative.includes(ext.toLowerCase()) || ["m4a", "3gp", "3gpp", "amr", "aac"].includes(ext.toLowerCase())) {
        // Intentar convertir a WAV en el navegador
        audioBlob = await convertToWav(blob);
        audioExt = "wav";
      }

      const formData = new FormData();
      formData.append("file", audioBlob, `voice.${audioExt}`);

      const res = await fetch("/api/ai/voice-expense", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      setTranscript(data.transcript || "");

      if (data.data) {
        setVoiceResult(data.data);
        setVoiceState("success");
      } else {
        setVoiceState("error");
        setVoiceError(data.message || "No se detecto audio con voz.");
      }
    } catch (err: any) {
      setVoiceState("error");
      setVoiceError(err.message || "Error procesando audio.");
    }
  }, [convertToWav]);

  // ============================================
  // VOZ — MediaRecorder (HTTPS / localhost)
  // ============================================

  const startRecording = useCallback(async () => {
    setVoiceError("");
    setVoiceResult(null);
    setTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 1000) {
          setVoiceState("error");
          setVoiceError("Audio demasiado corto. Intenta de nuevo.");
          return;
        }

        const ext = mimeType.includes("webm") ? "webm" : "m4a";
        await sendAudioToBackend(blob, ext);
      };

      recorder.start(250);
      setVoiceState("recording");
    } catch (err: any) {
      setVoiceState("error");
      if (err.name === "NotAllowedError") {
        setVoiceError("Permiso de microfono denegado. Activa el microfono en tu navegador.");
      } else {
        setVoiceError(err.message || "No se pudo acceder al microfono.");
      }
    }
  }, [sendAudioToBackend]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ============================================
  // VOZ — Fallback archivo de audio (HTTP móvil)
  // ============================================

  const handleAudioFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setVoiceError("");
      setVoiceResult(null);
      setTranscript("");

      if (file.size > 25 * 1024 * 1024) {
        setVoiceState("error");
        setVoiceError("Audio demasiado grande (max 25MB).");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "m4a";
      await sendAudioToBackend(file, ext);

      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
    },
    [sendAudioToBackend]
  );

  // ============================================
  // ESCANEO — Cámara/Archivo + Claude Vision
  // ============================================

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError("");
    setScanResult(null);

    // Validar
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setScanError("Solo se aceptan imagenes JPG, PNG o WebP.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setScanError("Imagen demasiado grande (max 20MB).");
      return;
    }

    // Preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScanState("processing");

    // Enviar al backend
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ai/scan-receipt", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      if (data.data) {
        setScanResult(data.data);
        setScanState("success");
      } else {
        setScanState("error");
        setScanError("No se pudo extraer informacion de la imagen.");
      }
    } catch (err: any) {
      setScanState("error");
      setScanError(err.message || "Error procesando imagen.");
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetAll = () => {
    setVoiceState("idle");
    setVoiceResult(null);
    setTranscript("");
    setVoiceError("");
    setScanState("idle");
    setScanResult(null);
    setScanError("");
    setPreviewUrl("");
  };

  // ============================================
  // HELPERS
  // ============================================

  const confianzaBadge = (conf: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      alta: { bg: "bg-emerald-100", text: "text-emerald-700" },
      media: { bg: "bg-amber-100", text: "text-amber-700" },
      baja: { bg: "bg-red-100", text: "text-red-700" },
    };
    const c = map[conf] || map.baja;
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
        {conf.toUpperCase()}
      </span>
    );
  };

  const isProcessing = voiceState === "processing" || scanState === "processing";
  const hasResults = voiceResult || scanResult;

  return (
    <div className="space-y-4">
      {/* ====== HEADER ====== */}
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-violet-500" />
        <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">
          Captura Inteligente (IA)
        </span>
        {hasResults && (
          <button
            onClick={resetAll}
            className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ====== ACTION BUTTONS ====== */}
      <div className="flex gap-3">
        {/* Botón Dictar — con fallback para HTTP móvil */}
        {canRecord ? (
          <button
            onClick={voiceState === "recording" ? stopRecording : startRecording}
            disabled={isProcessing && voiceState !== "recording"}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              voiceState === "recording"
                ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200"
                : voiceState === "processing"
                  ? "bg-violet-100 text-violet-400 cursor-wait"
                  : "bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {voiceState === "recording" ? (
              <>
                <MicOff size={18} />
                Detener
              </>
            ) : voiceState === "processing" ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Mic size={18} />
                Dictar Gasto
              </>
            )}
          </button>
        ) : (
          /* Fallback: subir archivo de audio (HTTP móvil) */
          <button
            onClick={() => audioFileInputRef.current?.click()}
            disabled={isProcessing}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              voiceState === "processing"
                ? "bg-violet-100 text-violet-400 cursor-wait"
                : "bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {voiceState === "processing" ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Upload size={18} />
                Enviar Audio
              </>
            )}
          </button>
        )}
        <input
          ref={audioFileInputRef}
          type="file"
          accept="audio/*"
          capture="user"
          onChange={handleAudioFileSelect}
          className="hidden"
        />

        {/* Botón Escanear */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
            scanState === "processing"
              ? "bg-amber-100 text-amber-400 cursor-wait"
              : "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {scanState === "processing" ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              IA Escaneando...
            </>
          ) : (
            <>
              <Camera size={18} />
              Escanear Factura
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* ====== RECORDING INDICATOR ====== */}
      {voiceState === "recording" && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl animate-pulse">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          <Volume2 size={16} className="text-red-500" />
          <span className="text-xs font-medium text-red-600">
            Grabando... Habla claro y menciona el monto. Pulsa &quot;Detener&quot; al terminar.
          </span>
        </div>
      )}

      {/* ====== PROCESSING BAR ====== */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-amber-500 rounded-full animate-[loading_2s_ease-in-out_infinite]"
              style={{ width: "70%", animation: "loading 2s ease-in-out infinite" }} />
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            Procesando con IA... Esto puede tomar unos segundos.
          </p>
        </div>
      )}

      {/* ====== VOICE RESULT ====== */}
      {voiceResult && (
        <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 space-y-3">
          <div className="flex items-center gap-2">
            <FileAudio size={16} className="text-violet-600" />
            <span className="text-xs font-bold text-violet-700">
              Resultado por Voz
            </span>
            {confianzaBadge(voiceResult.confianza)}
          </div>

          {transcript && (
            <div className="p-2 bg-white rounded-lg border border-violet-100">
              <p className="text-[11px] text-slate-500 italic">
                &quot;{transcript}&quot;
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <ResultField
              label="Tipo"
              value={voiceResult.tipo === "gasto" ? "Gasto" : "Ingreso"}
              color={voiceResult.tipo === "gasto" ? "text-red-600" : "text-emerald-600"}
            />
            <ResultField
              label="Monto"
              value={
                voiceResult.monto !== null
                  ? `$${voiceResult.monto.toLocaleString("es-PA")}`
                  : "No detectado"
              }
              color="text-slate-800"
            />
            <ResultField label="Concepto" value={voiceResult.concepto} color="text-slate-700" />
            <ResultField label="Categoria" value={voiceResult.categoria} color="text-slate-600" />
          </div>

          {voiceResult.nota && (
            <p className="text-[10px] text-violet-500 italic">
              Nota IA: {voiceResult.nota}
            </p>
          )}
        </div>
      )}

      {/* ====== VOICE ERROR ====== */}
      {voiceState === "error" && voiceError && (
        <ErrorBanner message={voiceError} onDismiss={() => { setVoiceState("idle"); setVoiceError(""); }} />
      )}

      {/* ====== SCAN RESULT ====== */}
      {scanResult && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700">
              Factura Escaneada
            </span>
            {confianzaBadge(scanResult.confianza)}
          </div>

          <div className="flex gap-4">
            {/* Preview de imagen */}
            {previewUrl && (
              <div className="flex-shrink-0">
                <img
                  src={previewUrl}
                  alt="Factura"
                  className="w-20 h-20 object-cover rounded-lg border border-amber-200"
                />
              </div>
            )}

            {/* Datos extraídos */}
            <div className="flex-1 grid grid-cols-2 gap-2">
              <ResultField
                label="Total"
                value={
                  scanResult.total !== null
                    ? `$${scanResult.total.toLocaleString("es-PA")}`
                    : "No detectado"
                }
                color="text-slate-800"
                bold
              />
              <ResultField
                label="ITBMS (7%)"
                value={
                  scanResult.itbms !== null
                    ? `$${scanResult.itbms.toLocaleString("es-PA")}`
                    : "No detectado"
                }
                color="text-blue-600"
              />
              <ResultField
                label="Proveedor"
                value={scanResult.proveedor || "No detectado"}
                color="text-slate-700"
              />
              <ResultField
                label="Categoria"
                value={scanResult.categoria_sugerida || "otro"}
                color="text-slate-600"
              />
            </div>
          </div>

          {scanResult.descripcion_items && (
            <p className="text-[10px] text-amber-600">
              Items: {scanResult.descripcion_items}
            </p>
          )}
        </div>
      )}

      {/* ====== SCAN ERROR ====== */}
      {scanState === "error" && scanError && (
        <ErrorBanner message={scanError} onDismiss={() => { setScanState("idle"); setScanError(""); }} />
      )}

      {/* ====== CSS ANIMATION ====== */}
      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function ResultField({
  label,
  value,
  color,
  bold = false,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-xs ${bold ? "font-extrabold" : "font-medium"} ${color} truncate`}>
        {value}
      </p>
    </div>
  );
}

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
      <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
      <p className="flex-1 text-xs text-red-600">{message}</p>
      <button onClick={onDismiss} className="text-red-300 hover:text-red-500">
        <X size={14} />
      </button>
    </div>
  );
}
