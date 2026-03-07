"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Eye,
  Trash2,
  Lock,
  Unlock,
  Calendar,
  Loader2,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";
import {
  generarReporteMensual,
  guardarReporte,
  getReportes,
  cerrarReporte,
  eliminarBorrador,
  MESES,
  type ReporteMensual as ReporteMensualType,
} from "@/lib/reportes/reporte-engine";
import { formatBalboas } from "@/lib/currency";
import ReporteMensual from "./ReporteMensual";

// ============================================
// TIPOS
// ============================================

interface ListaReportesProps {
  societyId: string;
  record: FinancialRecord | null;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ListaReportes({
  societyId,
  record,
}: ListaReportesProps) {
  const [reportes, setReportes] = useState<ReporteMensualType[]>([]);
  const [selectedReporte, setSelectedReporte] = useState<ReporteMensualType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Period selector state
  const now = new Date();
  const [selectedMes, setSelectedMes] = useState(now.getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState(now.getFullYear());

  // Load reportes on mount
  const loadReportes = useCallback(() => {
    const data = getReportes(societyId);
    setReportes(data);
  }, [societyId]);

  useEffect(() => {
    loadReportes();
  }, [loadReportes]);

  // Check if a report already exists for the selected period
  const existeReporte = reportes.find(
    (r) => r.periodo.anio === selectedAnio && r.periodo.mes === selectedMes
  );

  // Generate new report
  const handleGenerar = () => {
    setIsGenerating(true);
    try {
      const reporte = generarReporteMensual(
        societyId,
        record,
        selectedAnio,
        selectedMes
      );
      guardarReporte(reporte);
      loadReportes();
      // Auto-open the new report
      setSelectedReporte(reporte);
    } finally {
      setIsGenerating(false);
    }
  };

  // Close a report (irreversible)
  const handleCerrar = (reporteId: string) => {
    const cerrado = cerrarReporte(reporteId);
    if (cerrado) {
      loadReportes();
      // Update the selected report view
      setSelectedReporte(cerrado);
    }
  };

  // Delete a draft report
  const handleEliminar = (reporteId: string) => {
    const deleted = eliminarBorrador(reporteId);
    if (deleted) {
      loadReportes();
      setShowDeleteConfirm(null);
      if (selectedReporte?.id === reporteId) {
        setSelectedReporte(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* ========== HEADER ========== */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1A242F] flex items-center gap-2">
          <BarChart3 size={20} className="text-[#C5A059]" />
          Reportes Mensuales
        </h3>
      </div>

      {/* ========== GENERAR NUEVO REPORTE ========== */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <label className="text-xs text-slate-500 font-medium">
              Periodo:
            </label>
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(Number(e.target.value))}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#C5A059] focus:outline-none"
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(Number(e.target.value))}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#C5A059] focus:outline-none"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerar}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C5A059] text-white text-xs font-bold rounded-lg hover:bg-[#b08d4a] disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            {existeReporte
              ? "Regenerar Reporte"
              : "Generar Reporte"}
          </button>

          {existeReporte && (
            <span className="text-[10px] text-slate-400">
              {existeReporte.estado === "cerrado"
                ? "Periodo cerrado — no se puede regenerar"
                : "Se reemplazara el borrador existente"}
            </span>
          )}
        </div>
      </div>

      {/* ========== LISTA DE REPORTES ========== */}
      {reportes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <FileText size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">
            No hay reportes generados todavia.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Selecciona un periodo y haz clic en &quot;Generar Reporte&quot; para
            crear tu primer cierre mensual.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h4 className="text-xs font-bold text-slate-600">
              Historial de Reportes ({reportes.length})
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {reportes.map((rpt) => (
              <div
                key={rpt.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg ${
                      rpt.estado === "cerrado"
                        ? "bg-amber-100"
                        : "bg-blue-100"
                    }`}
                  >
                    {rpt.estado === "cerrado" ? (
                      <Lock size={14} className="text-amber-600" />
                    ) : (
                      <Unlock size={14} className="text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {rpt.periodoLabel}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rpt.estado === "cerrado"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {rpt.estado === "cerrado" ? "Cerrado" : "Borrador"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-slate-400">
                        Ingresos: {formatBalboas(rpt.resumen_ejecutivo.ingresos)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        U.Neta: {formatBalboas(rpt.resumen_ejecutivo.utilidad_neta)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rpt.created_at).toLocaleDateString("es-PA")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setSelectedReporte(rpt)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <Eye size={12} />
                    Ver
                  </button>
                  {rpt.estado === "borrador" && (
                    <>
                      {showDeleteConfirm === rpt.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEliminar(rpt.id)}
                            className="px-2 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-2 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowDeleteConfirm(rpt.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar borrador"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== MODAL DE REPORTE ========== */}
      {selectedReporte && (
        <ReporteMensual
          reporte={selectedReporte}
          onClose={() => setSelectedReporte(null)}
          onCerrar={handleCerrar}
        />
      )}
    </div>
  );
}
