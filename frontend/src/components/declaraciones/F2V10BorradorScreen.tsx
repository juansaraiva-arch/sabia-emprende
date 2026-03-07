"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Building2,
  DollarSign,
  Receipt,
  Users,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Download,
  ExternalLink,
  Shield,
  Calendar,
  TrendingUp,
  XCircle,
  Info,
} from "lucide-react";
import {
  generarBorradorF2V10,
  type F2V10DraftResult,
  type Advertencia,
} from "@/services/declaraciones/f2v10Draft.service";
import ReconciliacionIngresosF2 from "./ReconciliacionIngresosF2";

// ============================================
// TYPES
// ============================================

interface F2V10BorradorScreenProps {
  societyId: string;
}

type BorradorStep = "verificacion" | "borrador";
type SeccionKey =
  | "identificacion"
  | "ingresos"
  | "gastos"
  | "impuesto"
  | "utilidades";

// ============================================
// HELPERS
// ============================================

function formatBalboas(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `B/. ${n.toLocaleString("es-PA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getSeccionStatus(
  draft: F2V10DraftResult,
  seccion: SeccionKey
): "ok" | "warning" | "error" {
  const faltantes = draft.metadata.campos_faltantes;
  const advertencias = draft.metadata.advertencias;

  const seccionCampos: Record<SeccionKey, string[]> = {
    identificacion: [
      "nombre_sociedad",
      "ruc",
      "representante_legal",
      "direccion_fiscal",
      "fecha_constitucion",
    ],
    ingresos: ["ingresos_brutos_total"],
    gastos: ["gastos_deducibles"],
    impuesto: [],
    utilidades: ["socios"],
  };

  const campos = seccionCampos[seccion] || [];
  const tieneError = campos.some((c) => faltantes.includes(c));
  const tieneWarning = advertencias.some(
    (a) =>
      a.nivel === "warning" &&
      campos.some((c) => a.campo_afectado?.includes(c))
  );

  if (tieneError) return "error";
  if (tieneWarning) return "warning";
  return "ok";
}

function StatusIcon({ status }: { status: "ok" | "warning" | "error" }) {
  if (status === "ok")
    return <CheckCircle2 size={16} className="text-emerald-500" />;
  if (status === "warning")
    return <AlertTriangle size={16} className="text-amber-500" />;
  return <XCircle size={16} className="text-red-500" />;
}

// ============================================
// VERIFICACION PREVIA
// ============================================

function VerificacionPrevia({
  draft,
  onContinue,
}: {
  draft: F2V10DraftResult;
  onContinue: () => void;
}) {
  const checks = [
    {
      label: "Datos de empresa encontrados",
      ok: !!draft.seccion_identificacion.nombre_sociedad,
    },
    {
      label: `Facturas electronicas: ${
        draft.seccion_ingresos.ingresos_desde_facturas_electronicas
          ? `${formatBalboas(
              draft.seccion_ingresos.ingresos_desde_facturas_electronicas
            )}`
          : "sin registros"
      }`,
      ok: (draft.seccion_ingresos.ingresos_desde_facturas_electronicas || 0) > 0,
    },
    {
      label: `Registros contables: ${
        (draft.seccion_ingresos.ingresos_brutos_total || 0) > 0
          ? "datos disponibles"
          : "sin datos"
      }`,
      ok: (draft.seccion_ingresos.ingresos_brutos_total || 0) > 0,
    },
    {
      label: `Datos de socios: ${
        draft.seccion_distribucion_utilidades.socios.length > 0
          ? `${draft.seccion_distribucion_utilidades.socios.length} registrados`
          : "incompletos"
      }`,
      ok: draft.seccion_distribucion_utilidades.socios.length > 0,
    },
    {
      label:
        draft.seccion_identificacion.en_exoneracion_isr !== null
          ? draft.seccion_identificacion.en_exoneracion_isr
            ? `En exoneracion ISR (${draft.seccion_identificacion.meses_exoneracion_restantes} meses restantes)`
            : "Fuera de exoneracion ISR"
          : "Estado de exoneracion indeterminado",
      ok: draft.seccion_identificacion.en_exoneracion_isr !== null,
    },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-indigo-100">
            <FileText size={20} className="text-indigo-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Analizando tu informacion...
            </h3>
            <p className="text-xs text-slate-400">
              F2 V10 — Periodo Fiscal {draft.metadata.periodoFiscal}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-3">
              {check.ok ? (
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  check.ok ? "text-slate-700" : "text-amber-700"
                }`}
              >
                {check.label}
              </span>
            </div>
          ))}
        </div>

        {/* Barra de completitud */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">
              Completitud del borrador
            </span>
            <span className="text-sm font-bold text-slate-700">
              {draft.metadata.completitud}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                draft.metadata.completitud >= 80
                  ? "bg-emerald-500"
                  : draft.metadata.completitud >= 50
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${draft.metadata.completitud}%` }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onContinue}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Continuar con Borrador
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECCION DESPLEGABLE
// ============================================

function SeccionDesplegable({
  title,
  icon,
  status,
  defaultOpen,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  status: "ok" | "warning" | "error";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-slate-500">{icon}</span>
          <span className="text-sm font-bold text-slate-700">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          {open ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100">{children}</div>
      )}
    </div>
  );
}

// ============================================
// CAMPO DEL FORMULARIO
// ============================================

function CampoF2({
  label,
  value,
  faltante,
  nota,
}: {
  label: string;
  value: string | number | null;
  faltante?: boolean;
  nota?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div>
        <span className="text-[11px] text-slate-500">{label}</span>
        {nota && (
          <span className="text-[9px] text-amber-500 ml-2">({nota})</span>
        )}
      </div>
      <span
        className={`text-sm font-medium ${
          faltante ? "text-red-500 italic" : "text-slate-800"
        }`}
      >
        {faltante ? "Faltante" : value ?? "—"}
      </span>
    </div>
  );
}

// ============================================
// PANTALLA PRINCIPAL
// ============================================

export default function F2V10BorradorScreen({
  societyId,
}: F2V10BorradorScreenProps) {
  const [step, setStep] = useState<BorradorStep>("verificacion");
  const [draft, setDraft] = useState<F2V10DraftResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReconciliacion, setShowReconciliacion] = useState(false);

  const generateDraft = useCallback(async () => {
    setLoading(true);
    try {
      const result = await generarBorradorF2V10({
        societyId,
        periodoFiscal: 2025,
      });
      setDraft(result);
    } catch (err) {
      console.error("Error generating F2 V10 draft:", err);
    } finally {
      setLoading(false);
    }
  }, [societyId]);

  useEffect(() => {
    generateDraft();
  }, [generateDraft]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
        <span className="ml-2 text-sm text-slate-500">
          Generando borrador F2 V10...
        </span>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={32} className="mx-auto text-red-300 mb-3" />
        <p className="text-sm text-slate-500">
          No se pudo generar el borrador. Verifica tus datos e intenta
          nuevamente.
        </p>
      </div>
    );
  }

  // Step 1: Verificacion
  if (step === "verificacion") {
    return (
      <VerificacionPrevia
        draft={draft}
        onContinue={() => setStep("borrador")}
      />
    );
  }

  // Step 2: Borrador completo
  const { seccion_identificacion: ident, seccion_ingresos: ing, seccion_gastos: gast, seccion_impuesto: imp, seccion_distribucion_utilidades: dist } = draft;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-100">
            <FileText size={20} className="text-indigo-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              F2 V10 — Borrador Periodo Fiscal {draft.metadata.periodoFiscal}
            </h3>
            <p className="text-[10px] text-slate-400">
              Generado: {new Date(draft.metadata.fechaGeneracion).toLocaleString("es-PA")} | Completitud: {draft.metadata.completitud}%
            </p>
          </div>
        </div>
        <div
          className={`px-3 py-1.5 rounded-full text-[10px] font-medium border ${
            draft.metadata.listo_para_presentar
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}
        >
          {draft.metadata.listo_para_presentar
            ? "Listo para presentar"
            : `${draft.metadata.campos_faltantes.length} campo(s) pendientes`}
        </div>
      </div>

      {/* Advertencias globales */}
      {draft.metadata.advertencias
        .filter((a) => a.nivel === "error")
        .map((a, i) => (
          <div
            key={i}
            className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200"
          >
            <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-700">{a.mensaje}</p>
              {a.accion_requerida && (
                <p className="text-[10px] text-red-500 mt-0.5">
                  {a.accion_requerida}
                </p>
              )}
            </div>
          </div>
        ))}

      {/* SECCION: IDENTIFICACION */}
      <SeccionDesplegable
        title="Identificacion"
        icon={<Building2 size={16} />}
        status={getSeccionStatus(draft, "identificacion")}
        defaultOpen
      >
        <div className="pt-3 space-y-0.5">
          <CampoF2
            label="Sociedad"
            value={ident.nombre_sociedad}
            faltante={!ident.nombre_sociedad}
          />
          <CampoF2
            label="RUC"
            value={ident.ruc}
            faltante={!ident.ruc}
          />
          <CampoF2
            label="Fecha de Constitucion"
            value={
              ident.fecha_constitucion
                ? new Date(ident.fecha_constitucion).toLocaleDateString("es-PA")
                : null
            }
            faltante={!ident.fecha_constitucion}
          />
          <CampoF2
            label="Representante Legal"
            value={ident.representante_legal}
            faltante={!ident.representante_legal}
          />
          <CampoF2
            label="Cedula Rep. Legal"
            value={ident.cedula_representante}
            faltante={!ident.cedula_representante}
          />
          <CampoF2
            label="Actividad Economica"
            value={ident.actividad_economica}
            faltante={!ident.actividad_economica}
          />
          <CampoF2
            label="Direccion Fiscal"
            value={ident.direccion_fiscal}
            faltante={!ident.direccion_fiscal}
          />

          {/* Exoneracion ISR badge */}
          {ident.en_exoneracion_isr !== null && (
            <div
              className={`mt-3 p-3 rounded-lg ${
                ident.en_exoneracion_isr
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-amber-50 border border-amber-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield
                  size={14}
                  className={
                    ident.en_exoneracion_isr
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }
                />
                <span
                  className={`text-xs font-bold ${
                    ident.en_exoneracion_isr
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {ident.en_exoneracion_isr
                    ? "EN EXONERACION DE ISR"
                    : "FUERA DE EXONERACION DE ISR"}
                </span>
              </div>
              <p
                className={`text-[10px] mt-1 ${
                  ident.en_exoneracion_isr
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              >
                {ident.en_exoneracion_isr
                  ? `Mes ${ident.meses_exoneracion_transcurridos} de 24 — te quedan ${ident.meses_exoneracion_restantes} mes(es)`
                  : `Han transcurrido ${ident.meses_exoneracion_transcurridos} meses desde la constitucion`}
              </p>
            </div>
          )}
        </div>
      </SeccionDesplegable>

      {/* SECCION: INGRESOS */}
      <SeccionDesplegable
        title="Ingresos"
        icon={<DollarSign size={16} />}
        status={getSeccionStatus(draft, "ingresos")}
      >
        <div className="pt-3 space-y-0.5">
          <CampoF2
            label="Ingresos Brutos Total"
            value={formatBalboas(ing.ingresos_brutos_total)}
            faltante={!ing.ingresos_brutos_total}
          />
          <CampoF2
            label="Ingresos Exentos"
            value={formatBalboas(ing.ingresos_exentos)}
          />
          <CampoF2
            label="Ingresos Gravables"
            value={formatBalboas(ing.ingresos_gravables)}
          />
          <CampoF2
            label="Ingresos desde FE"
            value={formatBalboas(ing.ingresos_desde_facturas_electronicas)}
            nota={ing.ingresos_desde_facturas_electronicas ? "manual" : undefined}
          />
          {ing.discrepancia_fe_vs_declarado !== null &&
            ing.discrepancia_fe_vs_declarado > 0 && (
              <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
                <p className="text-[11px] text-red-700 font-bold">
                  Discrepancia: {formatBalboas(ing.discrepancia_fe_vs_declarado)}
                </p>
              </div>
            )}

          {/* Boton reconciliacion */}
          <button
            onClick={() => setShowReconciliacion(!showReconciliacion)}
            className="mt-3 text-[11px] text-indigo-600 font-medium hover:underline"
          >
            {showReconciliacion ? "Ocultar" : "Ver"} reconciliacion con FE
          </button>

          {showReconciliacion && (
            <div className="mt-2">
              <ReconciliacionIngresosF2
                ingresosRegistrados={ing.ingresos_brutos_total || 0}
                ingresosFE={ing.ingresos_desde_facturas_electronicas || 0}
              />
            </div>
          )}

          {/* Alerta umbral */}
          {ing.alerta_umbral_categoria && (
            <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-amber-600" />
                <p className="text-[11px] text-amber-700 font-bold">
                  Cerca del limite de microemprendedor (B/.150,000)
                </p>
              </div>
            </div>
          )}
        </div>
      </SeccionDesplegable>

      {/* SECCION: GASTOS */}
      <SeccionDesplegable
        title="Gastos Deducibles"
        icon={<Receipt size={16} />}
        status={getSeccionStatus(draft, "gastos")}
      >
        <div className="pt-3 space-y-0.5">
          {Object.entries(gast.gastos_por_categoria).map(([cat, val]) => (
            <CampoF2
              key={cat}
              label={cat}
              value={formatBalboas(val)}
            />
          ))}
          <div className="pt-2 mt-2 border-t border-slate-200">
            <CampoF2
              label="Total Gastos Deducibles"
              value={formatBalboas(gast.gastos_deducibles_total)}
              faltante={!gast.gastos_deducibles_total}
            />
          </div>
          <CampoF2
            label="CSS Patronal Pagada"
            value={formatBalboas(gast.css_patronal_pagada)}
          />
          <CampoF2
            label="Planilla Total"
            value={formatBalboas(gast.planilla_total)}
          />
        </div>
      </SeccionDesplegable>

      {/* SECCION: IMPUESTO */}
      <SeccionDesplegable
        title="Impuesto a Pagar"
        icon={<Shield size={16} />}
        status={getSeccionStatus(draft, "impuesto")}
      >
        <div className="pt-3 space-y-0.5">
          <CampoF2
            label="Renta Neta Gravable"
            value={formatBalboas(imp.renta_neta_gravable)}
          />
          <CampoF2
            label="ISR Calculado (25%)"
            value={formatBalboas(imp.isr_calculado)}
          />
          <div className="py-2 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                ISR a Pagar
              </span>
              <span
                className={`text-sm font-extrabold ${
                  imp.isr_a_pagar === 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatBalboas(imp.isr_a_pagar)}
                {imp.isr_a_pagar === 0 && (
                  <span className="ml-2 text-[10px] font-medium text-emerald-500">
                    EXENTO
                  </span>
                )}
              </span>
            </div>
          </div>
          <CampoF2
            label="Tasa Unica"
            value={formatBalboas(imp.tasa_unica)}
            nota="S.E.P."
          />
          <CampoF2
            label="FECI Retencion"
            value={formatBalboas(imp.feci_retencion)}
            nota="S.E.P."
          />
          <CampoF2
            label="ITBMS Declarado"
            value={formatBalboas(imp.itbms_declarado)}
          />
        </div>
      </SeccionDesplegable>

      {/* SECCION: DISTRIBUCION UTILIDADES */}
      <SeccionDesplegable
        title="Distribucion de Utilidades"
        icon={<Users size={16} />}
        status={getSeccionStatus(draft, "utilidades")}
      >
        <div className="pt-3">
          {dist.socios.length > 0 ? (
            <div className="space-y-2">
              {dist.socios.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-[11px] py-1 border-b border-slate-50"
                >
                  <span className="text-slate-700">
                    {s.nombre || "Sin nombre"}{" "}
                    {s.cedula && (
                      <span className="text-slate-400">({s.cedula})</span>
                    )}
                  </span>
                  <span className="font-bold text-slate-700">
                    {s.porcentaje_participacion !== null
                      ? `${s.porcentaje_participacion}%`
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              No hay socios registrados. Agrega datos en Perfil de Empresa.
            </p>
          )}
        </div>
      </SeccionDesplegable>

      {/* RESUMEN */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <h4 className="text-sm font-bold text-slate-700 mb-3">Resumen</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Ingresos brutos:</span>
            <span className="text-xs font-bold text-slate-700">
              {formatBalboas(ing.ingresos_brutos_total)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Gastos deducibles:</span>
            <span className="text-xs font-bold text-slate-700">
              {formatBalboas(gast.gastos_deducibles_total)}
              {gast.gastos_deducibles_total &&
                !draft.metadata.listo_para_presentar && (
                  <span className="text-amber-500 ml-1">(est.)</span>
                )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Renta neta gravable:
            </span>
            <span className="text-xs font-bold text-slate-700">
              {formatBalboas(imp.renta_neta_gravable)}
            </span>
          </div>
          <div className="flex items-center justify-between bg-emerald-50 -mx-2 px-2 py-1.5 rounded-lg">
            <span className="text-xs font-bold text-emerald-700">
              ISR a pagar:
            </span>
            <span className="text-sm font-extrabold text-emerald-700">
              {formatBalboas(imp.isr_a_pagar)}
              {imp.isr_a_pagar === 0 && " EXENTO"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Tasa unica:</span>
            <span className="text-xs font-bold text-slate-700">
              {formatBalboas(imp.tasa_unica)} (S.E.P.)
            </span>
          </div>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            // Guardar borrador en localStorage
            try {
              localStorage.setItem(
                `midf_borrador_f2v10_${draft.metadata.periodoFiscal}`,
                JSON.stringify(draft)
              );
              alert("Borrador guardado exitosamente");
            } catch {
              alert("Error al guardar el borrador");
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Download size={16} />
          Guardar Borrador
        </button>
        <button
          onClick={() => setStep("verificacion")}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <Info size={16} />
          Completar campos faltantes
        </button>
        <a
          href="https://etax2.mef.gob.pa"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-600 text-sm font-bold rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-colors"
        >
          <ExternalLink size={16} />
          Ir a e-Tax 2.0
        </a>
      </div>

      {/* Legal footer */}
      <p className="text-[10px] text-slate-400 italic border-t border-slate-100 pt-3">
        BORRADOR — No oficial — Generado por Mi Director Financiero PTY.
        Este documento es una estimacion educativa basada en los datos
        ingresados. Debe ser verificado por un profesional antes de
        presentar en e-Tax 2.0. Los datos de facturacion electronica deben
        coincidir con los registrados en el SFEP de la DGI.
      </p>
    </div>
  );
}
