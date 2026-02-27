"use client";
import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Plus,
  Minus,
  ExternalLink,
  Upload,
  DollarSign,
  FileText,
  Clock,
  Rocket,
  Building2,
  Scale,
  Receipt,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import {
  getFormalizacionState,
  initFormalizacionState,
  updateStepStatus,
  checkFormalizationStatus,
  STEP_TO_DOC_CATEGORY,
  getStepDocuments,
  saveStepDocument,
  getSyncEventsForStep,
  pushDocSyncEvent,
} from "@/lib/formalizacion";
import type { FormalizacionStep, StepStatus } from "@/lib/formalizacion";

// ============================================
// ICONOS POR PASO
// ============================================

const STEP_ICONS: Record<string, React.ReactNode> = {
  registro_ampyme: <Rocket size={20} />,
  estatutos_se: <FileText size={20} />,
  inscripcion_rp: <Building2 size={20} />,
  ruc_nit: <Receipt size={20} />,
  aviso_operacion: <Scale size={20} />,
  inscripcion_municipal: <Landmark size={20} />,
};

const STEP_COLORS: Record<string, string> = {
  registro_ampyme: "bg-emerald-600",
  estatutos_se: "bg-blue-600",
  inscripcion_rp: "bg-violet-600",
  ruc_nit: "bg-amber-600",
  aviso_operacion: "bg-cyan-600",
  inscripcion_municipal: "bg-red-600",
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

interface FabricaEmpresaProps {
  onDocumentUploaded?: (category: string) => void;
  onFileUpload?: (file: File, category: string) => Promise<void>;
  showWelcome?: boolean;
}

export default function FabricaEmpresa({ onDocumentUploaded, onFileUpload, showWelcome = false }: FabricaEmpresaProps) {
  const [steps, setSteps] = useState<FormalizacionStep[]>([]);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(showWelcome);
  const [stepDocs, setStepDocs] = useState<Record<string, { fileName: string; syncedToBoveda: boolean }>>({});
  const [syncedSteps, setSyncedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    let state = getFormalizacionState();
    if (!state) {
      state = initFormalizacionState();
    }
    // Ordenar por campo order para garantizar secuencia correcta
    setSteps([...state.steps].sort((a, b) => a.order - b.order));
    // Load attached documents & sync events
    setStepDocs(getStepDocuments());
    const allSyncEvents = state.steps.map((s) => s.id).filter((id) => getSyncEventsForStep(id).length > 0);
    setSyncedSteps(new Set(allSyncEvents));
  }, []);

  const handleStatusChange = (stepId: string, newStatus: StepStatus) => {
    const updated = updateStepStatus(stepId, newStatus);
    if (updated) {
      setSteps([...updated.steps].sort((a, b) => a.order - b.order));

      // Si se marca completado y hay callback, notificar para sincronizar con Boveda
      if (newStatus === "completado" && onDocumentUploaded) {
        // Map step to document category for Boveda sync
        const stepToCat: Record<string, string> = {
          registro_ampyme: "certificacion_ampyme",
          estatutos_se: "pacto_social",
          inscripcion_rp: "registro_mercantil",
          ruc_nit: "ruc",
          aviso_operacion: "aviso_operacion",
          inscripcion_municipal: "declaracion_mupa",
        };
        const cat = stepToCat[stepId];
        if (cat) onDocumentUploaded(cat);
      }
    }
  };

  const status = checkFormalizationStatus();
  const progressPct = steps.length > 0
    ? Math.round((steps.filter((s) => s.status === "completado").length / steps.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Popup de bienvenida (Smart Routing) */}
      {showWelcomePopup && (
        <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5 rounded-2xl shadow-lg">
          <button
            onClick={() => setShowWelcomePopup(false)}
            className="absolute top-3 right-3 text-white/70 hover:text-white text-lg"
          >
            &times;
          </button>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-xl flex-shrink-0">
              <Rocket size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold mb-1">
                Excelente! Estas en el lugar correcto.
              </h3>
              <p className="text-sm text-white/90 leading-relaxed">
                Completa esta ruta para fundar tu Sociedad de Emprendimiento y proteger
                tus primeros dolares. Empecemos con el Paso 1.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header con progreso */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100">
              <ShieldCheck size={22} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Constitucion de mi Empresa — Ruta S.E.
              </h3>
              <p className="text-xs text-slate-500">
                Sociedad de Emprendimiento (Ley 186 de 2020)
              </p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            progressPct === 100
              ? "bg-emerald-100 text-emerald-700"
              : progressPct > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500"
          }`}>
            {progressPct}% Completado
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ${
              progressPct === 100 ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-slate-400">
            {steps.filter((s) => s.status === "completado").length} de {steps.length} pasos completados
          </p>
          {progressPct === 100 && (
            <p className="text-[10px] text-emerald-600 font-bold">
              Felicidades! Tu empresa esta formalizada
            </p>
          )}
        </div>
      </div>

      {/* Timeline de pasos */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isExpanded = expandedStep === step.id;
          const isCompleted = step.status === "completado";
          const isInProgress = step.status === "en_proceso";
          const isPending = step.status === "pendiente";
          const prevCompleted = idx === 0 || steps[idx - 1]?.status === "completado";

          return (
            <div
              key={step.id}
              className={`rounded-2xl border-2 transition-all ${
                isCompleted
                  ? "bg-emerald-50 border-emerald-200"
                  : isInProgress
                    ? "bg-amber-50 border-amber-200"
                    : "bg-white border-slate-200"
              }`}
            >
              {/* Header del paso */}
              <button
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                {/* Numero/check */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm ${
                  isCompleted
                    ? "bg-emerald-500"
                    : isInProgress
                      ? "bg-amber-500"
                      : prevCompleted
                        ? STEP_COLORS[step.id] || "bg-slate-400"
                        : "bg-slate-300"
                }`}>
                  {isCompleted ? <CheckCircle2 size={18} /> : step.order}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-bold ${
                      isCompleted ? "text-emerald-700" : "text-slate-800"
                    }`}>
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{step.entity}</p>
                </div>

                {/* Costo */}
                <div className="text-right flex-shrink-0 mr-2">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <DollarSign size={12} />
                    <span className="font-medium">{step.costEstimate}</span>
                  </div>
                </div>

                {/* Expand arrow */}
                <div className="flex-shrink-0 text-slate-400">
                  {isExpanded ? <Minus size={18} /> : <Plus size={18} />}
                </div>
              </button>

              {/* Contenido expandido */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                  {/* Descripcion */}
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Beneficio */}
                  <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-xl">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">{step.benefit}</p>
                  </div>

                  {/* Requisitos */}
                  {step.requirements && step.requirements.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Requisitos
                      </p>
                      {step.requirements.map((req, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Circle size={6} className="text-slate-400 mt-1.5 flex-shrink-0" />
                          <p className="text-xs text-slate-600">{req}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Instruccion */}
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <span className="font-bold">Como hacerlo: </span>
                      {step.instruction}
                    </p>
                  </div>

                  {/* Link a entidad */}
                  <a
                    href={step.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
                  >
                    <ExternalLink size={14} />
                    Ir a {step.entity}
                  </a>

                  {/* Botones de accion */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleStatusChange(step.id, "en_proceso")}
                          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors"
                        >
                          <Clock size={14} />
                          Iniciar Tramite
                        </button>
                        <button
                          onClick={() => handleStatusChange(step.id, "completado")}
                          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors"
                        >
                          <CheckCircle2 size={14} />
                          Marcar como Completado
                        </button>
                      </>
                    )}
                    {isInProgress && (
                      <>
                        <button
                          onClick={() => handleStatusChange(step.id, "completado")}
                          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors"
                        >
                          <CheckCircle2 size={14} />
                          Completado
                        </button>
                        <button
                          onClick={() => handleStatusChange(step.id, "pendiente")}
                          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                          Revertir
                        </button>
                      </>
                    )}
                    {isCompleted && (
                      <button
                        onClick={() => handleStatusChange(step.id, "pendiente")}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                        Revertir a Pendiente
                      </button>
                    )}
                  </div>

                  {/* Upload de documento de respaldo */}
                  {(isInProgress || isCompleted) && (
                    <StepDocumentUpload
                      stepId={step.id}
                      existingDoc={stepDocs[step.id]}
                      isSynced={syncedSteps.has(step.id)}
                      onFileAttached={(fileName) => {
                        const category = STEP_TO_DOC_CATEGORY[step.id] || "otro";
                        saveStepDocument(step.id, fileName, false);
                        setStepDocs((prev) => ({ ...prev, [step.id]: { fileName, syncedToBoveda: false } }));
                        pushDocSyncEvent({ fileName, category, stepId: step.id, source: "fabrica" });
                        setSyncedSteps((prev) => new Set([...prev, step.id]));
                      }}
                      onFileUpload={onFileUpload ? async (file) => {
                        const category = STEP_TO_DOC_CATEGORY[step.id] || "otro";
                        await onFileUpload(file, category);
                        saveStepDocument(step.id, file.name, true);
                        setStepDocs((prev) => ({ ...prev, [step.id]: { fileName: file.name, syncedToBoveda: true } }));
                        pushDocSyncEvent({ fileName: file.name, category, stepId: step.id, source: "fabrica" });
                        setSyncedSteps((prev) => new Set([...prev, step.id]));
                      } : undefined}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer legal */}
      <p className="text-[10px] text-slate-400 italic border-t border-slate-100 pt-3">
        Ruta basada en la Ley 186 de 2020 (Sociedades de Emprendimiento). Los costos son estimados
        y pueden variar segun la jurisdiccion y asesoria contratada. Esta herramienta es informativa
        y no constituye asesoria legal.
      </p>
    </div>
  );
}

// ============================================
// SUB-COMPONENTE: Upload por Paso
// ============================================

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function StepDocumentUpload({
  stepId,
  existingDoc,
  isSynced,
  onFileAttached,
  onFileUpload,
}: {
  stepId: string;
  existingDoc?: { fileName: string; syncedToBoveda: boolean };
  isSynced: boolean;
  onFileAttached: (fileName: string) => void;
  onFileUpload?: (file: File) => Promise<void>;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Solo JPG, PNG, WebP o PDF");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Archivo excede 10 MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      if (onFileUpload) {
        await onFileUpload(file);
      } else {
        // No backend upload, just save reference locally
        onFileAttached(file.name);
      }
    } catch (err: any) {
      setError(err?.message || "Error al subir archivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (existingDoc) {
    return (
      <div className="mt-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-bold text-emerald-700">Documento adjunto</span>
        </div>
        <p className="text-[10px] text-emerald-600 truncate pl-6">
          {existingDoc.fileName}
        </p>
        {(existingDoc.syncedToBoveda || isSynced) && (
          <div className="flex items-center gap-1.5 pl-6">
            <ShieldCheck size={12} className="text-violet-500" />
            <span className="text-[10px] font-medium text-violet-600">En Boveda KYC</span>
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="ml-6 text-[10px] text-slate-400 hover:text-slate-600 underline"
        >
          Cambiar archivo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl transition-colors disabled:opacity-50"
      >
        <Upload size={14} />
        {uploading ? "Subiendo..." : "Adjuntar documento de respaldo"}
      </button>
      {error && (
        <p className="text-[10px] text-red-500 pl-1">{error}</p>
      )}
      {isSynced && !existingDoc && (
        <div className="flex items-center gap-1.5 pl-1">
          <ShieldCheck size={12} className="text-violet-500" />
          <span className="text-[10px] font-medium text-violet-600">Documento en Boveda KYC</span>
        </div>
      )}
    </div>
  );
}
