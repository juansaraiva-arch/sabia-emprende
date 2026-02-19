"use client";
import React, { useState, useCallback } from "react";
import {
  BarChart3,
  Landmark,
  Wallet,
  ClipboardList,
  FileSpreadsheet,
  TrendingUp,
  ArrowLeftRight,
  Target,
  Download,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
  Mail,
  Send,
} from "lucide-react";
import PeriodSelector from "@/components/PeriodSelector";
import { reportsApi } from "@/lib/api";
import type { PeriodKey } from "@/lib/calculations";

// ============================================
// TIPOS
// ============================================

type ReportId =
  | "estado_resultados"
  | "balance_general"
  | "flujo_caja"
  | "resumen_ejecutivo"
  | "csv_cascada"
  | "csv_trends"
  | "csv_comparison"
  | "csv_budget_variance";

interface ReportCard {
  id: ReportId;
  title: string;
  description: string;
  icon: React.ElementType;
  format: "pdf" | "csv";
  needsPeriod?: boolean;
  needsRange?: boolean;
  needsCompare?: boolean;
}

interface ReportGeneratorProps {
  societyId: string;
}

// ============================================
// CONSTANTES
// ============================================

const REPORTS: ReportCard[] = [
  {
    id: "estado_resultados",
    title: "Estado de Resultados",
    description: "P&L completo con cascada de margenes",
    icon: BarChart3,
    format: "pdf",
    needsPeriod: true,
  },
  {
    id: "balance_general",
    title: "Balance General",
    description: "Activos, pasivos y patrimonio",
    icon: Landmark,
    format: "pdf",
    needsPeriod: true,
  },
  {
    id: "flujo_caja",
    title: "Flujo de Caja",
    description: "Proyeccion de flujo a 6 meses",
    icon: Wallet,
    format: "pdf",
  },
  {
    id: "resumen_ejecutivo",
    title: "Resumen Ejecutivo",
    description: "KPIs, alertas y recomendaciones",
    icon: ClipboardList,
    format: "pdf",
    needsPeriod: true,
  },
  {
    id: "csv_cascada",
    title: "Cascada P&L",
    description: "Datos de cascada en formato tabular",
    icon: FileSpreadsheet,
    format: "csv",
    needsPeriod: true,
  },
  {
    id: "csv_trends",
    title: "Tendencias",
    description: "Evolucion multi-periodo de KPIs",
    icon: TrendingUp,
    format: "csv",
    needsRange: true,
  },
  {
    id: "csv_comparison",
    title: "Comparativo",
    description: "Periodo A vs Periodo B lado a lado",
    icon: ArrowLeftRight,
    format: "csv",
    needsCompare: true,
  },
  {
    id: "csv_budget_variance",
    title: "Presupuesto vs Real",
    description: "Variaciones contra metas presupuestarias",
    icon: Target,
    format: "csv",
    needsPeriod: true,
  },
];

// ============================================
// HELPERS
// ============================================

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function defaultPeriod(): PeriodKey {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function formatPeriodFilename(p: PeriodKey): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ReportGenerator({ societyId }: ReportGeneratorProps) {
  const [selectedReport, setSelectedReport] = useState<ReportId | null>(null);
  const [period, setPeriod] = useState<PeriodKey>(defaultPeriod());
  const [rangeFrom, setRangeFrom] = useState<PeriodKey>({ year: 2026, month: 1 });
  const [rangeTo, setRangeTo] = useState<PeriodKey>(defaultPeriod());
  const [compareA, setCompareA] = useState<PeriodKey>(defaultPeriod());
  const [compareB, setCompareB] = useState<PeriodKey>(() => {
    const now = new Date();
    let m = now.getMonth(); // previous month (0-indexed is already -1)
    let y = now.getFullYear();
    if (m < 1) { m = 12; y -= 1; }
    return { year: y, month: m };
  });
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Lookup the selected report config
  const selected = REPORTS.find((r) => r.id === selectedReport) || null;

  // Determine PeriodSelector mode
  const selectorMode: "single" | "range" | "compare" | null = selected
    ? selected.needsRange
      ? "range"
      : selected.needsCompare
      ? "compare"
      : selected.needsPeriod
      ? "single"
      : null
    : null;

  // ============================================
  // DESCARGA
  // ============================================

  const handleDownload = useCallback(async () => {
    if (!selectedReport || !selected) return;

    setDownloading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let blob: Blob;
      let filename: string;
      const ext = selected.format === "csv" ? "csv" : "pdf";

      switch (selectedReport) {
        case "estado_resultados":
          blob = await reportsApi.downloadEstadoResultados(
            societyId,
            period.year,
            period.month
          );
          filename = `estado-resultados_${formatPeriodFilename(period)}.${ext}`;
          break;

        case "balance_general":
          blob = await reportsApi.downloadBalanceGeneral(
            societyId,
            period.year,
            period.month
          );
          filename = `balance-general_${formatPeriodFilename(period)}.${ext}`;
          break;

        case "flujo_caja":
          blob = await reportsApi.downloadFlujoCaja(societyId, 6);
          filename = `flujo-caja_${formatPeriodFilename(defaultPeriod())}.${ext}`;
          break;

        case "resumen_ejecutivo":
          blob = await reportsApi.downloadResumenEjecutivo(
            societyId,
            period.year,
            period.month
          );
          filename = `resumen-ejecutivo_${formatPeriodFilename(period)}.${ext}`;
          break;

        case "csv_cascada":
          blob = await reportsApi.downloadCsvCascada(
            societyId,
            period.year,
            period.month
          );
          filename = `cascada-pl_${formatPeriodFilename(period)}.${ext}`;
          break;

        case "csv_trends":
          blob = await reportsApi.downloadCsvTrends(
            societyId,
            rangeFrom.year,
            rangeFrom.month,
            rangeTo.year,
            rangeTo.month
          );
          filename = `tendencias_${formatPeriodFilename(rangeFrom)}_a_${formatPeriodFilename(rangeTo)}.${ext}`;
          break;

        case "csv_comparison":
          blob = await reportsApi.downloadCsvComparison(
            societyId,
            compareA.year,
            compareA.month,
            compareB.year,
            compareB.month
          );
          filename = `comparativo_${formatPeriodFilename(compareA)}_vs_${formatPeriodFilename(compareB)}.${ext}`;
          break;

        case "csv_budget_variance":
          blob = await reportsApi.downloadCsvBudgetVariance(
            societyId,
            period.year,
            period.month
          );
          filename = `presupuesto-vs-real_${formatPeriodFilename(period)}.${ext}`;
          break;

        default:
          throw new Error("Reporte no reconocido");
      }

      downloadBlob(blob, filename);
      setSuccessMsg(`${selected.title} descargado correctamente`);

      // Auto-clear success message after 4 seconds
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setError(e.message || "Error al generar el reporte");
    } finally {
      setDownloading(false);
    }
  }, [selectedReport, selected, societyId, period, rangeFrom, rangeTo, compareA, compareB]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">
          Centro de Reportes
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Selecciona un reporte, configura el periodo y descarga
        </p>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const isActive = selectedReport === report.id;

          return (
            <button
              key={report.id}
              onClick={() => {
                setSelectedReport(report.id);
                setError(null);
                setSuccessMsg(null);
              }}
              className={`relative bg-white rounded-xl p-4 text-left transition-all hover:shadow-md ${
                isActive
                  ? "border-2 border-[#C9A84C] ring-2 ring-[#C9A84C]/20"
                  : "border border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Format badge */}
              <span
                className={`absolute top-2 right-2 inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  report.format === "pdf"
                    ? "bg-red-50 text-red-500"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {report.format.toUpperCase()}
              </span>

              <Icon
                size={24}
                className={`mb-2 ${
                  isActive ? "text-[#C9A84C]" : "text-slate-400"
                }`}
              />

              <h3
                className={`text-sm font-semibold leading-tight ${
                  isActive ? "text-slate-900" : "text-slate-700"
                }`}
              >
                {report.title}
              </h3>

              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                {report.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Period Selector (conditionally rendered) */}
      {selected && selectorMode === "single" && (
        <PeriodSelector
          mode="single"
          value={period}
          onChange={setPeriod}
          label="Periodo del reporte"
        />
      )}

      {selected && selectorMode === "range" && (
        <PeriodSelector
          mode="range"
          from={rangeFrom}
          to={rangeTo}
          onChangeFrom={setRangeFrom}
          onChangeTo={setRangeTo}
        />
      )}

      {selected && selectorMode === "compare" && (
        <PeriodSelector
          mode="compare"
          periodA={compareA}
          periodB={compareB}
          onChangePeriodA={setCompareA}
          onChangePeriodB={setCompareB}
        />
      )}

      {/* Flujo de Caja note (no period needed) */}
      {selected && selected.id === "flujo_caja" && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs text-slate-500">
          Este reporte proyecta los proximos 6 meses a partir de la fecha actual.
          No requiere seleccion de periodo.
        </div>
      )}

      {/* Action Buttons */}
      {selected && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {downloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {downloading
              ? "Generando..."
              : `Descargar ${selected.title}`}
          </button>

          {/* Email Button (solo PDFs: estado_resultados, balance_general, resumen_ejecutivo) */}
          {selected.format === "pdf" && selected.id !== "flujo_caja" && (
            <button
              onClick={() => setShowEmailInput(!showEmailInput)}
              className="inline-flex items-center gap-2 bg-[#1B2838] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#2a3d52] transition-colors"
            >
              <Mail size={16} />
              Enviar por Email
            </button>
          )}
        </div>
      )}

      {/* Email Input */}
      {showEmailInput && selected && selected.format === "pdf" && (
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <input
            type="text"
            placeholder="correo@ejemplo.com (separar con comas)"
            value={emailRecipients}
            onChange={(e) => setEmailRecipients(e.target.value)}
            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30"
          />
          <button
            onClick={async () => {
              if (!emailRecipients.trim()) return;
              setSendingEmail(true);
              setError(null);
              try {
                const reportType = selected.id as string;
                const result = await reportsApi.emailReport(
                  societyId,
                  reportType,
                  period.year,
                  period.month,
                  emailRecipients.trim()
                );
                setSuccessMsg(result.message || "Email enviado correctamente");
                setShowEmailInput(false);
                setEmailRecipients("");
                setTimeout(() => setSuccessMsg(null), 4000);
              } catch (e: any) {
                setError(e.message || "Error al enviar el email");
              } finally {
                setSendingEmail(false);
              }
            }}
            disabled={sendingEmail || !emailRecipients.trim()}
            className="inline-flex items-center gap-1.5 bg-[#C9A84C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#b8973e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sendingEmail ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Enviar
          </button>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Success Toast */}
      {successMsg && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl text-sm">
          <CheckCircle size={16} className="flex-shrink-0" />
          {successMsg}
        </div>
      )}
    </div>
  );
}
