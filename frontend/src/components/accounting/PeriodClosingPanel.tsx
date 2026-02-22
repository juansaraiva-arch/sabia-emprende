"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Lock,
  Unlock,
  FileText,
  Download,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
} from "lucide-react";
import { accountingApi } from "@/lib/api";
import SmartTooltip from "@/components/SmartTooltip";
import AdminPasswordModal from "@/components/AdminPasswordModal";

interface PeriodClosingPanelProps {
  societyId: string;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const API_BASE = "/api";

export default function PeriodClosingPanel({ societyId }: PeriodClosingPanelProps) {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingPeriod, setClosingPeriod] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Period selection for actions
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountingApi.listPeriods(societyId);
      if (res.data && res.data.length > 0) {
        setPeriods(res.data);
      }
      // Si vacio (demo mode), mantener periodos locales
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [societyId]);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/history/${societyId}`, {
        headers: { "x-user-id": "demo-user-001" },
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedReports(data.data || []);
      }
    } catch {
      // Silently ignore
    }
  }, [societyId]);

  useEffect(() => {
    loadPeriods();
    loadReports();
  }, [loadPeriods, loadReports]);

  const getPeriodStatus = (year: number, month: number): string => {
    const period = periods.find(
      (p) => p.period_year === year && p.period_month === month
    );
    return period?.status || "open";
  };

  const handleClosePeriod = async () => {
    const key = `${selectedYear}-${selectedMonth}`;
    if (!confirm(
      `Cerrar el periodo ${MONTHS[selectedMonth - 1]} ${selectedYear}? ` +
      `Los asientos del periodo seran bloqueados y no se podran editar.`
    )) return;

    setClosingPeriod(key);
    setError(null);
    try {
      await accountingApi.closePeriod(societyId, selectedYear, selectedMonth);
      // Intentar recargar del backend
      const res = await accountingApi.listPeriods(societyId);
      if (res.data && res.data.length > 0) {
        setPeriods(res.data);
      } else {
        // Demo mode: agregar periodo cerrado localmente
        setPeriods((prev) => [
          ...prev.filter((p) => !(p.period_year === selectedYear && p.period_month === selectedMonth)),
          { period_year: selectedYear, period_month: selectedMonth, status: "closed", closed_at: new Date().toISOString() },
        ]);
      }
    } catch {
      // Fallback local: marcar como cerrado
      setPeriods((prev) => [
        ...prev.filter((p) => !(p.period_year === selectedYear && p.period_month === selectedMonth)),
        { period_year: selectedYear, period_month: selectedMonth, status: "closed", closed_at: new Date().toISOString() },
      ]);
    } finally {
      setClosingPeriod(null);
    }
  };

  const handleReopenPeriod = () => {
    setShowAdminModal(true);
  };

  const handleReopenWithCode = async (adminCode: string) => {
    setClosingPeriod(`${selectedYear}-${selectedMonth}`);
    setError(null);
    try {
      await accountingApi.reopenPeriod(societyId, selectedYear, selectedMonth, adminCode);
      const res = await accountingApi.listPeriods(societyId);
      if (res.data && res.data.length > 0) {
        setPeriods(res.data);
      } else {
        // Demo mode: reabrir localmente
        setPeriods((prev) =>
          prev.map((p) =>
            p.period_year === selectedYear && p.period_month === selectedMonth
              ? { ...p, status: "open" }
              : p
          )
        );
      }
      setShowAdminModal(false);
    } catch (e: any) {
      throw e; // Let AdminPasswordModal handle the error display
    } finally {
      setClosingPeriod(null);
    }
  };

  const handleDownloadReport = async (reportType: string) => {
    const key = `${reportType}-${selectedYear}-${selectedMonth}`;
    setDownloadingReport(key);
    try {
      const url = `${API_BASE}/reports/${reportType}/${societyId}?period_year=${selectedYear}&period_month=${selectedMonth}`;
      const res = await fetch(url, {
        headers: { "x-user-id": "demo-user-001" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Error" }));
        throw new Error(err.detail || "Error al generar PDF");
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${reportType}_${selectedYear}_${selectedMonth}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      await loadReports();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDownloadingReport(null);
    }
  };

  const currentStatus = getPeriodStatus(selectedYear, selectedMonth);
  const isClosed = currentStatus === "closed";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold text-slate-800">Cierre de Periodo</h3>
        <SmartTooltip term="cierre_periodo" size={16} />
      </div>

      {/* Period Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <label className="text-xs text-slate-500 font-medium">Periodo:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            isClosed
              ? "bg-amber-100 text-amber-700"
              : currentStatus === "reopened"
              ? "bg-blue-100 text-blue-700"
              : "bg-emerald-100 text-emerald-700"
          }`}>
            {isClosed ? <Lock size={12} /> : <Unlock size={12} />}
            {isClosed ? "Cerrado" : currentStatus === "reopened" ? "Reabierto" : "Abierto"}
          </div>

          <button
            onClick={loadPeriods}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            title="Refrescar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">{error}</div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Close/Reopen Period */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            {isClosed ? <Lock size={16} className="text-amber-500" /> : <Unlock size={16} className="text-emerald-500" />}
            Estado del Periodo
          </h4>
          <p className="text-xs text-slate-500">
            {isClosed
              ? "Este periodo esta cerrado. Los asientos no se pueden editar ni eliminar."
              : "Este periodo esta abierto. Puedes agregar, editar o eliminar asientos."
            }
          </p>
          {isClosed ? (
            <button
              onClick={handleReopenPeriod}
              disabled={closingPeriod !== null}
              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {closingPeriod ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
              Reabrir Periodo
            </button>
          ) : (
            <button
              onClick={handleClosePeriod}
              disabled={closingPeriod !== null}
              className="inline-flex items-center gap-1 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {closingPeriod ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              Cerrar Periodo
            </button>
          )}
        </div>

        {/* Generate PDFs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            Generar Reportes PDF
          </h4>
          <p className="text-xs text-slate-500">
            Descarga los libros contables del periodo seleccionado en formato PDF.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "libro-diario", label: "Libro Diario" },
              { key: "balance-comprobacion", label: "Balance Comprobacion" },
            ].map((report) => (
              <button
                key={report.key}
                onClick={() => handleDownloadReport(report.key)}
                disabled={downloadingReport !== null}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                {downloadingReport === `${report.key}-${selectedYear}-${selectedMonth}` ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Download size={12} />
                )}
                {report.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period History */}
      {periods.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            Historial de Periodos
          </h4>
          <div className="space-y-1">
            {periods.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">
                    {MONTHS[p.period_month - 1]} {p.period_year}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    p.status === "closed"
                      ? "bg-amber-100 text-amber-700"
                      : p.status === "reopened"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {p.status === "closed" ? "Cerrado" : p.status === "reopened" ? "Reabierto" : "Abierto"}
                  </span>
                </div>
                {p.closed_at && (
                  <span className="text-slate-400">
                    {p.status === "closed" ? "Cerrado" : "Actualizado"}: {new Date(p.closed_at).toLocaleDateString("es-PA")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report History */}
      {generatedReports.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <FileText size={16} className="text-slate-400" />
            Reportes Generados
          </h4>
          <div className="space-y-1">
            {generatedReports.slice(0, 10).map((r, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50 text-xs">
                <div className="flex items-center gap-2">
                  <FileText size={12} className="text-blue-400" />
                  <span className="font-medium text-slate-700">
                    {r.report_type.replace("_", " ").replace("-", " ")}
                  </span>
                  <span className="text-slate-400">
                    {r.period_month && r.period_year
                      ? `${MONTHS[r.period_month - 1]} ${r.period_year}`
                      : "Todos"
                    }
                  </span>
                </div>
                <span className="text-slate-400">
                  {new Date(r.generated_at).toLocaleDateString("es-PA")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Password Modal (Fase 7) */}
      {showAdminModal && (
        <AdminPasswordModal
          title="Reabrir Periodo Cerrado"
          description={`${MONTHS[selectedMonth - 1]} ${selectedYear}`}
          onConfirm={handleReopenWithCode}
          onCancel={() => setShowAdminModal(false)}
        />
      )}
    </div>
  );
}
