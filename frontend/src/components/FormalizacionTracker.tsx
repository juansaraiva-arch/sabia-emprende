"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Circle,
  Clock,
  Rocket,
  FileText,
  Building2,
  Receipt,
  Landmark,
  Award,
} from "lucide-react";
import type { FormalizacionState, FormalizacionStep, StepStatus } from "@/lib/formalizacion";
import {
  getFormalizacionState,
  initFormalizacionState,
  updateStepStatus,
} from "@/lib/formalizacion";

// Icono por paso
const STEP_ICONS: Record<string, React.ReactNode> = {
  estatutos_se: <FileText size={20} />,
  inscripcion_rp: <Building2 size={20} />,
  aviso_operacion: <Receipt size={20} />,
  ruc_nit: <Receipt size={20} />,
  inscripcion_municipal: <Landmark size={20} />,
  registro_ampyme: <Award size={20} />,
};

const THEME = {
  heading: "#1A242F",
  label: "#374151",
  body: "#4B5563",
  muted: "#9CA3AF",
  accent: "#1D9E75",
  accentBg: "#E1F5EE",
  border: "#E5E7EB",
  cardBg: "#FFFFFF",
};

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }: { status: StepStatus }) {
  const config = {
    pendiente: {
      bg: "rgba(148, 163, 184, 0.15)",
      color: "#94a3b8",
      label: "Pendiente",
      icon: <Circle size={12} />,
    },
    en_proceso: {
      bg: "rgba(29, 158, 117, 0.15)",
      color: THEME.accent,
      label: "En Proceso",
      icon: <Clock size={12} />,
    },
    completado: {
      bg: "rgba(16, 185, 129, 0.2)",
      color: "#10b981",
      label: "Completado",
      icon: <CheckCircle2 size={12} />,
    },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

// ============================================
// STEP CARD
// ============================================

function StepCard({
  step,
  isExpanded,
  onToggle,
  onStatusChange,
  isLast,
}: {
  step: FormalizacionStep;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: StepStatus) => void;
  isLast: boolean;
}) {
  const icon = STEP_ICONS[step.id] || <Circle size={20} />;

  // Color del circulo segun estado
  const circleStyle =
    step.status === "completado"
      ? { backgroundColor: "#10b981", borderColor: "#10b981" }
      : step.status === "en_proceso"
        ? { backgroundColor: "rgba(29, 158, 117, 0.15)", borderColor: THEME.accent }
        : { backgroundColor: "rgba(148, 163, 184, 0.1)", borderColor: "rgba(148, 163, 184, 0.3)" };

  const circleTextColor =
    step.status === "completado" ? "#fff" : step.status === "en_proceso" ? THEME.accent : "#94a3b8";

  return (
    <div className="flex gap-4 lg:gap-6">
      {/* Timeline column: circle + line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-10 h-10 lg:w-12 lg:h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all"
          style={{ ...circleStyle, color: circleTextColor }}
        >
          {step.status === "completado" ? <CheckCircle2 size={20} /> : step.order}
        </div>
        {!isLast && (
          <div
            className="w-[2px] flex-1 min-h-[20px]"
            style={{
              backgroundColor:
                step.status === "completado"
                  ? "rgba(16, 185, 129, 0.4)"
                  : THEME.border,
            }}
          />
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 pb-6">
        <button
          onClick={onToggle}
          className="w-full text-left rounded-xl border-2 p-4 lg:p-5 transition-all hover:border-opacity-60"
          style={{
            backgroundColor: isExpanded
              ? THEME.accentBg
              : THEME.cardBg,
            borderColor: isExpanded
              ? THEME.accent
              : THEME.border,
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="p-2 rounded-lg shrink-0"
                style={{
                  backgroundColor: THEME.accentBg,
                  color: step.status === "completado" ? "#10b981" : THEME.accent,
                }}
              >
                {icon}
              </div>
              <div className="min-w-0">
                <h3
                  className="text-sm lg:text-base font-bold truncate"
                  style={{
                    color: step.status === "completado" ? "#10b981" : THEME.heading,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-[10px] lg:text-xs font-medium"
                  style={{ color: THEME.muted }}
                >
                  {step.entity}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={step.status} />
              {isExpanded ? (
                <ChevronUp size={16} style={{ color: THEME.muted }} />
              ) : (
                <ChevronDown size={16} style={{ color: THEME.muted }} />
              )}
            </div>
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
              {/* Descripcion */}
              <p className="text-sm text-slate-400 leading-relaxed">
                {step.description}
              </p>

              {/* Beneficio */}
              <div
                className="flex items-start gap-2 p-3 rounded-lg"
                style={{ backgroundColor: THEME.accentBg }}
              >
                <Rocket
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: THEME.accent }}
                />
                <p className="text-xs font-semibold" style={{ color: THEME.accent }}>
                  {step.benefit}
                </p>
              </div>

              {/* Instruccion */}
              <p className="text-xs text-slate-500 italic">{step.instruction}</p>

              {/* Enlace externo */}
              <a
                href={step.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                style={{ backgroundColor: THEME.accentBg, color: THEME.accent }}
              >
                <ExternalLink size={14} />
                Ir a {step.entity}
              </a>

              {/* Botones de estado */}
              <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: THEME.border }}>
                <p
                  className="text-[10px] font-medium w-full mb-1"
                  style={{ color: THEME.muted }}
                >
                  Cambiar estado:
                </p>
                {(["pendiente", "en_proceso", "completado"] as StepStatus[]).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => onStatusChange(s)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                      style={{
                        backgroundColor:
                          step.status === s
                            ? s === "completado"
                              ? "rgba(16, 185, 129, 0.25)"
                              : s === "en_proceso"
                                ? "rgba(29, 158, 117, 0.15)"
                                : "rgba(148, 163, 184, 0.2)"
                            : "rgba(148, 163, 184, 0.08)",
                        color:
                          step.status === s
                            ? s === "completado"
                              ? "#10b981"
                              : s === "en_proceso"
                                ? THEME.accent
                                : "#94a3b8"
                            : "rgba(148, 163, 184, 0.5)",
                        border:
                          step.status === s
                            ? `1px solid ${s === "completado" ? "rgba(16,185,129,0.4)" : s === "en_proceso" ? "rgba(29,158,117,0.4)" : "rgba(148,163,184,0.3)"}`
                            : "1px solid transparent",
                      }}
                    >
                      {s === "pendiente"
                        ? "Pendiente"
                        : s === "en_proceso"
                          ? "En Proceso"
                          : "Completado"}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function FormalizacionTracker() {
  const router = useRouter();
  const [trackerState, setTrackerState] = useState<FormalizacionState | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  useEffect(() => {
    const existing = getFormalizacionState();
    if (existing) {
      setTrackerState(existing);
    } else {
      setTrackerState(initFormalizacionState());
    }
  }, []);

  const handleStatusChange = (stepId: string, status: StepStatus) => {
    const updated = updateStepStatus(stepId, status);
    if (updated) setTrackerState({ ...updated });
  };

  const handleToggleStep = (stepId: string) => {
    setExpandedStep((prev) => (prev === stepId ? null : stepId));
  };

  if (!trackerState) return null;

  const completedCount = trackerState.steps.filter(
    (s) => s.status === "completado"
  ).length;
  const percentComplete = Math.round(
    (completedCount / trackerState.steps.length) * 100
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Decorative accent lines */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#1D9E75] to-transparent opacity-40" />
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#1D9E75] to-transparent opacity-40" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6 pb-20 lg:pt-10 lg:pb-24">
        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-80 mb-6"
          style={{ color: THEME.accent, backgroundColor: THEME.accentBg }}
        >
          <ArrowLeft size={16} />
          Volver al Inicio
        </button>

        {/* Header */}
        <div className="text-center mb-8 lg:mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: THEME.accentBg }}
          >
            <Rocket size={32} style={{ color: THEME.accent }} />
          </div>
          <h1
            className="text-2xl lg:text-3xl font-extrabold tracking-tight font-heading"
            style={{ color: THEME.heading }}
          >
            Ruta de Formalizacion S.E.
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: THEME.body }}
          >
            Sociedad de Emprendimiento &mdash; Panama
          </p>

          {/* Progress bar */}
          <div className="mt-6 max-w-sm mx-auto">
            <div className="flex items-center justify-between text-xs mb-2">
              <span style={{ color: THEME.muted }}>Progreso</span>
              <span className="font-bold" style={{ color: THEME.heading }}>
                {completedCount} de {trackerState.steps.length} pasos
              </span>
            </div>
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{ backgroundColor: THEME.border }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${percentComplete}%`,
                  backgroundColor:
                    percentComplete === 100 ? "#10b981" : THEME.accent,
                }}
              />
            </div>
            <p
              className="text-right text-[11px] mt-1 font-bold"
              style={{
                color: percentComplete === 100 ? "#10b981" : THEME.accent,
              }}
            >
              {percentComplete}%
            </p>
          </div>
        </div>

        {/* Steps timeline */}
        <div>
          {trackerState.steps.map((step, idx) => (
            <StepCard
              key={step.id}
              step={step}
              isExpanded={expandedStep === step.id}
              onToggle={() => handleToggleStep(step.id)}
              onStatusChange={(status) =>
                handleStatusChange(step.id, status)
              }
              isLast={idx === trackerState.steps.length - 1}
            />
          ))}
        </div>

        {/* Completion message */}
        {percentComplete === 100 && (
          <div
            className="mt-8 p-6 rounded-2xl border-2 text-center"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.08)",
              borderColor: "rgba(16, 185, 129, 0.3)",
            }}
          >
            <CheckCircle2
              size={40}
              className="mx-auto mb-3"
              style={{ color: "#10b981" }}
            />
            <h3 className="text-lg font-bold" style={{ color: "#10b981" }}>
              Felicitaciones!
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Has completado todos los pasos de formalizacion de tu Sociedad de
              Emprendimiento. Tu empresa esta lista para operar legalmente en
              Panama.
            </p>
          </div>
        )}

        {/* Footer */}
        <p
          className="mt-10 text-[10px] text-center"
          style={{ color: THEME.muted }}
        >
          Basado en la Ley de Sociedades de Emprendimiento de Panama
        </p>
      </div>
    </div>
  );
}
