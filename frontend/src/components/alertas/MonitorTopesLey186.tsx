"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  TrendingUp,
  Clock,
  AlertTriangle,
  FileText,
  ToggleLeft,
  ToggleRight,
  CalendarClock,
  BadgeAlert,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface MonitorProps {
  /** Ingresos brutos acumulados del ano fiscal */
  ingresosAcumulados: number;
  /** Meses con datos de ingresos (para proyeccion lineal) */
  mesesConDatos: number;
  /** Documentos emitidos en el mes actual */
  docsEmitidosMes: number;
}

const TOPE_LEY186 = 75_000;
const TOPE_FACTURADOR_INGRESOS = 36_000;
const TOPE_FACTURADOR_DOCS = 100;
const MESES_NOMBRES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// ============================================
// HELPERS
// ============================================

function getSemaforoColor(pct: number): { bg: string; text: string; label: string } {
  if (pct >= 96) return { bg: "bg-red-500", text: "text-red-700", label: "Critico" };
  if (pct >= 81) return { bg: "bg-orange-500", text: "text-orange-700", label: "Alto" };
  if (pct >= 61) return { bg: "bg-amber-500", text: "text-amber-700", label: "Medio" };
  return { bg: "bg-emerald-500", text: "text-emerald-700", label: "Normal" };
}

function parseDateLocal(dateStr: string): Date | null {
  const parts = dateStr.split("-").map(Number);
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MonitorTopesLey186({
  ingresosAcumulados,
  mesesConDatos,
  docsEmitidosMes,
}: MonitorProps) {
  // Datos de empresa desde localStorage
  const [incorporationDate, setIncorporationDate] = useState<string | null>(null);
  const [usaFacturador, setUsaFacturador] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIncorporationDate(localStorage.getItem("midf_incorporation_date"));
    setUsaFacturador(localStorage.getItem("midf_usa_facturador_gratuito") === "true");
  }, []);

  const toggleFacturador = () => {
    const next = !usaFacturador;
    setUsaFacturador(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("midf_usa_facturador_gratuito", String(next));
    }
  };

  // ── A. Calculo de tope de ingresos ──────────────────────

  const pctIngresos = Math.min((ingresosAcumulados / TOPE_LEY186) * 100, 120);
  const restanteIngresos = Math.max(0, TOPE_LEY186 - ingresosAcumulados);
  const semaforo = getSemaforoColor(pctIngresos);

  // Proyeccion lineal
  const proyeccion = useMemo(() => {
    if (mesesConDatos <= 0 || ingresosAcumulados <= 0) return null;
    const promedioMensual = ingresosAcumulados / mesesConDatos;
    if (promedioMensual <= 0) return null;
    const mesesParaTope = Math.ceil(TOPE_LEY186 / promedioMensual);
    if (mesesParaTope > 12) return { mes: null, texto: "No alcanzarias el tope este ano" };
    return {
      mes: mesesParaTope - 1, // 0-indexed
      texto: `Al ritmo actual (B/.${promedioMensual.toLocaleString("es-PA", { maximumFractionDigits: 0 })}/mes), alcanzarias el tope en ${MESES_NOMBRES[Math.min(mesesParaTope - 1, 11)]}`,
    };
  }, [ingresosAcumulados, mesesConDatos]);

  // ── B. Cuenta regresiva de exoneracion ──────────────────

  const exoneracion = useMemo(() => {
    if (!incorporationDate) return null;
    const incDate = parseDateLocal(incorporationDate);
    if (!incDate) return null;

    const vencimiento = new Date(incDate);
    vencimiento.setMonth(vencimiento.getMonth() + 24);

    const now = new Date();
    const diffMs = vencimiento.getTime() - now.getTime();
    const diffDiasTotal = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const totalMs = 24 * 30 * 24 * 60 * 60 * 1000; // ~24 meses en ms
    const transcurridoMs = now.getTime() - incDate.getTime();
    const pctTiempo = Math.min(Math.max((transcurridoMs / totalMs) * 100, 0), 100);

    if (diffDiasTotal <= 0) {
      return {
        vencido: true,
        fechaVencimiento: vencimiento,
        fechaInscripcion: incDate,
        diasRestantes: 0,
        mesesRestantes: 0,
        pctTiempo: 100,
      };
    }

    const mesesRestantes = Math.floor(diffDiasTotal / 30);
    const diasRestantes = diffDiasTotal % 30;

    return {
      vencido: false,
      fechaVencimiento: vencimiento,
      fechaInscripcion: incDate,
      diasRestantes,
      mesesRestantes,
      pctTiempo,
    };
  }, [incorporationDate]);

  // ── C. Facturador Gratuito ──────────────────────────────

  const pctFacturadorIngresos = Math.min((ingresosAcumulados / TOPE_FACTURADOR_INGRESOS) * 100, 120);
  const pctFacturadorDocs = Math.min((docsEmitidosMes / TOPE_FACTURADOR_DOCS) * 100, 120);

  // ── RENDER ──────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-indigo-100">
          <Shield size={20} className="text-indigo-700" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">Monitor de Topes — Ley 186</h3>
          <p className="text-[10px] text-slate-400">Seguimiento de limites para Sociedades de Emprendimiento</p>
        </div>
      </div>

      {/* ====== SECCION A: Tope de Ingresos ====== */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-indigo-600" />
            Tope de Ingresos Ley 186
          </h4>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            pctIngresos >= 96 ? "bg-red-100 text-red-700" :
            pctIngresos >= 81 ? "bg-orange-100 text-orange-700" :
            pctIngresos >= 61 ? "bg-amber-100 text-amber-700" :
            "bg-emerald-100 text-emerald-700"
          }`}>
            {semaforo.label}
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="relative">
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${semaforo.bg}`}
              style={{ width: `${Math.min(pctIngresos, 100)}%` }}
            />
          </div>
          {/* Marcadores de umbral */}
          <div className="absolute top-0 left-[60%] h-4 w-px bg-amber-400 opacity-60" />
          <div className="absolute top-0 left-[80%] h-4 w-px bg-orange-400 opacity-60" />
          <div className="absolute top-0 left-[95%] h-4 w-px bg-red-400 opacity-60" />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600">
            <span className={`font-bold ${semaforo.text}`}>
              B/.{ingresosAcumulados.toLocaleString("es-PA", { maximumFractionDigits: 0 })}
            </span>
            {" / B/.75,000"}
          </p>
          <p className={`text-sm font-bold ${semaforo.text}`}>
            {pctIngresos.toFixed(0)}%
          </p>
        </div>

        {restanteIngresos > 0 && (
          <p className="text-[11px] text-slate-500">
            Te quedan <span className="font-bold">B/.{restanteIngresos.toLocaleString("es-PA", { maximumFractionDigits: 0 })}</span> antes de perder la exoneracion
          </p>
        )}

        {pctIngresos >= 100 && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
            <BadgeAlert size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-red-700 font-medium">
              TOPE SUPERADO. Tu exoneracion se ha perdido retroactivamente.
              Multas de B/.1,000 a B/.10,000. Consulta con tu contador.
            </p>
          </div>
        )}

        {/* Proyeccion */}
        {proyeccion && pctIngresos < 100 && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <TrendingUp size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-slate-500">{proyeccion.texto}</p>
          </div>
        )}
      </div>

      {/* ====== SECCION B: Cuenta Regresiva 24 Meses ====== */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <CalendarClock size={14} className="text-indigo-600" />
          Cuenta Regresiva de Exoneracion (24 meses)
        </h4>

        {!exoneracion ? (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-700 font-medium">
              Ingresa la fecha de inscripcion de tu S.E. en el perfil de empresa para activar este monitor.
            </p>
          </div>
        ) : exoneracion.vencido ? (
          <>
            <div className="w-full h-3 bg-red-200 rounded-full">
              <div className="h-full rounded-full bg-red-500" style={{ width: "100%" }} />
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <BadgeAlert size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-red-700">Exoneracion VENCIDA</p>
                <p className="text-[11px] text-red-600 mt-0.5">
                  Vencio el {exoneracion.fechaVencimiento.toLocaleDateString("es-PA", { day: "numeric", month: "long", year: "numeric" })}.
                  Estas obligado a tributar ISR (25%) e ITBMS (7%).
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Info de fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-50">
                <p className="text-[10px] text-slate-400 mb-0.5">Inscripcion</p>
                <p className="text-xs font-bold text-slate-700">
                  {exoneracion.fechaInscripcion.toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50">
                <p className="text-[10px] text-slate-400 mb-0.5">Vencimiento</p>
                <p className="text-xs font-bold text-slate-700">
                  {exoneracion.fechaVencimiento.toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Barra temporal */}
            <div className="relative">
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    exoneracion.pctTiempo >= 90 ? "bg-red-500" :
                    exoneracion.pctTiempo >= 75 ? "bg-orange-500" :
                    "bg-indigo-500"
                  }`}
                  style={{ width: `${exoneracion.pctTiempo}%` }}
                />
              </div>
            </div>

            {/* Cuenta regresiva */}
            <div className="flex items-center justify-center gap-2">
              <Clock size={14} className={exoneracion.mesesRestantes <= 3 ? "text-red-500" : "text-indigo-600"} />
              <p className={`text-sm font-bold ${exoneracion.mesesRestantes <= 3 ? "text-red-600" : "text-indigo-700"}`}>
                {exoneracion.mesesRestantes > 0
                  ? `${exoneracion.mesesRestantes} mes${exoneracion.mesesRestantes !== 1 ? "es" : ""} y ${exoneracion.diasRestantes} dia${exoneracion.diasRestantes !== 1 ? "s" : ""} restantes`
                  : `${exoneracion.diasRestantes} dia${exoneracion.diasRestantes !== 1 ? "s" : ""} restantes`
                }
              </p>
            </div>
          </>
        )}
      </div>

      {/* ====== SECCION C: Facturador Gratuito (Condicional) ====== */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <FileText size={14} className="text-indigo-600" />
            Facturador Gratuito DGI
          </h4>
          <button
            onClick={toggleFacturador}
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            {usaFacturador ? (
              <ToggleRight size={20} className="text-emerald-600" />
            ) : (
              <ToggleLeft size={20} className="text-slate-300" />
            )}
            {usaFacturador ? "Activo" : "No usa"}
          </button>
        </div>

        {usaFacturador ? (
          <div className="space-y-3">
            {/* Ingresos vs B/.36,000 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-slate-500">Ingresos anuales</p>
                <p className="text-[11px] font-bold text-slate-600">
                  B/.{ingresosAcumulados.toLocaleString("es-PA", { maximumFractionDigits: 0 })} / B/.36,000
                </p>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pctFacturadorIngresos >= 100 ? "bg-red-500" :
                    pctFacturadorIngresos >= 80 ? "bg-orange-500" :
                    "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(pctFacturadorIngresos, 100)}%` }}
                />
              </div>
            </div>

            {/* Documentos mensuales */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-slate-500">Documentos este mes</p>
                <p className="text-[11px] font-bold text-slate-600">
                  {docsEmitidosMes} / 100
                </p>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pctFacturadorDocs >= 100 ? "bg-red-500" :
                    pctFacturadorDocs >= 80 ? "bg-orange-500" :
                    "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(pctFacturadorDocs, 100)}%` }}
                />
              </div>
            </div>

            {(pctFacturadorIngresos >= 100 || pctFacturadorDocs >= 100) && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-red-700 font-medium">
                  Has superado un limite del Facturador Gratuito. Debes contratar un PAC certificado DGI.
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 italic">
            Activa este monitor si utilizas el Facturador Gratuito de la DGI.
          </p>
        )}
      </div>
    </div>
  );
}
