"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  BarChart3,
  ShoppingCart,
  Calendar,
} from "lucide-react";
import { formatBalboas } from "@/lib/currency";
import type { ReporteMensual as ReporteMensualType } from "@/lib/reportes/reporte-engine";
import CierreMensual from "./CierreMensual";

// ============================================
// TIPOS
// ============================================

interface ReporteMensualProps {
  reporte: ReporteMensualType;
  onClose?: () => void;
  onCerrar?: (id: string) => void;
}

// ============================================
// HELPERS
// ============================================

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  yellow: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  green: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

const PRIORITY_LABELS: Record<string, string> = {
  red: "Critica",
  orange: "Precaucion",
  yellow: "Alerta",
  green: "OK",
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ReporteMensual({
  reporte,
  onClose,
  onCerrar,
}: ReporteMensualProps) {
  const [showCierre, setShowCierre] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const { resumen_ejecutivo, cascada, ventas_resumen, alertas_activas } = reporte;
  const isCerrado = reporte.estado === "cerrado";

  const handleCerrar = () => {
    setIsClosing(true);
    onCerrar?.(reporte.id);
    setShowCierre(false);
    setIsClosing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* ========== HEADER ========== */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-xl">
              <FileText size={20} className="text-[#C5A059]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1A242F]">
                Reporte Mensual — {reporte.periodoLabel}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isCerrado
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {isCerrado ? <Lock size={10} /> : <Unlock size={10} />}
                  {isCerrado ? "Cerrado" : "Borrador"}
                </span>
                <span className="text-[10px] text-slate-400">
                  <Calendar size={10} className="inline mr-1" />
                  Generado: {new Date(reporte.created_at).toLocaleDateString("es-PA")}
                </span>
                {reporte.cerrado_en && (
                  <span className="text-[10px] text-slate-400">
                    | Cerrado: {new Date(reporte.cerrado_en).toLocaleDateString("es-PA")}
                  </span>
                )}
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={18} className="text-slate-400" />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* ========== RESUMEN EJECUTIVO ========== */}
          <section>
            <h3 className="text-sm font-bold text-[#1A242F] mb-3 flex items-center gap-2">
              <BarChart3 size={16} className="text-[#C5A059]" />
              Resumen Ejecutivo
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPICard
                label="Ingresos"
                value={formatBalboas(resumen_ejecutivo.ingresos)}
                icon={<DollarSign size={14} />}
                color="emerald"
              />
              <KPICard
                label="Utilidad Bruta"
                value={formatBalboas(resumen_ejecutivo.utilidad_bruta)}
                icon={<TrendingUp size={14} />}
                color="blue"
              />
              <KPICard
                label="EBITDA"
                value={formatBalboas(resumen_ejecutivo.ebitda)}
                icon={<BarChart3 size={14} />}
                color={resumen_ejecutivo.ebitda >= 0 ? "emerald" : "red"}
              />
              <KPICard
                label="Utilidad Neta"
                value={formatBalboas(resumen_ejecutivo.utilidad_neta)}
                subtext={`Margen: ${resumen_ejecutivo.margen_neto_pct.toFixed(1)}%`}
                icon={
                  resumen_ejecutivo.utilidad_neta >= 0 ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )
                }
                color={resumen_ejecutivo.utilidad_neta >= 0 ? "emerald" : "red"}
              />
              <KPICard
                label="Facturas"
                value={String(resumen_ejecutivo.total_facturas)}
                icon={<Receipt size={14} />}
                color="slate"
              />
              <KPICard
                label="Empleados"
                value={String(resumen_ejecutivo.total_empleados)}
                icon={<Users size={14} />}
                color="slate"
              />
            </div>
          </section>

          {/* ========== CASCADA DE RENTABILIDAD ========== */}
          {cascada && (
            <section>
              <h3 className="text-sm font-bold text-[#1A242F] mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#C5A059]" />
                Cascada de Rentabilidad
              </h3>
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left px-4 py-2 font-bold text-slate-600">
                        Concepto
                      </th>
                      <th className="text-right px-4 py-2 font-bold text-slate-600">
                        Monto
                      </th>
                      <th className="text-right px-4 py-2 font-bold text-slate-600">
                        % Ventas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <CascadaRow
                      label="Ingresos"
                      value={cascada.revenue}
                      pct={100}
                      bold
                    />
                    <CascadaRow
                      label="(-) Costo de Ventas"
                      value={-cascada.cogs}
                      pct={
                        cascada.revenue > 0
                          ? (cascada.cogs / cascada.revenue) * 100
                          : 0
                      }
                      negative
                    />
                    <CascadaRow
                      label="Utilidad Bruta"
                      value={cascada.gross_profit}
                      pct={cascada.gross_margin_pct}
                      bold
                      highlight
                    />
                    <CascadaRow
                      label="(-) Gastos Operativos"
                      value={-cascada.total_opex}
                      pct={
                        cascada.revenue > 0
                          ? (cascada.total_opex / cascada.revenue) * 100
                          : 0
                      }
                      negative
                    />
                    <CascadaRow
                      label="EBITDA"
                      value={cascada.ebitda}
                      pct={cascada.ebitda_margin_pct}
                      bold
                      highlight
                    />
                    <CascadaRow
                      label="(-) Depreciacion"
                      value={-(cascada.ebitda - cascada.ebit)}
                      pct={
                        cascada.revenue > 0
                          ? ((cascada.ebitda - cascada.ebit) / cascada.revenue) * 100
                          : 0
                      }
                      negative
                    />
                    <CascadaRow
                      label="EBIT"
                      value={cascada.ebit}
                      pct={
                        cascada.revenue > 0
                          ? (cascada.ebit / cascada.revenue) * 100
                          : 0
                      }
                      bold
                    />
                    <CascadaRow
                      label="(-) Intereses"
                      value={-(cascada.ebit - cascada.ebt)}
                      pct={
                        cascada.revenue > 0
                          ? ((cascada.ebit - cascada.ebt) / cascada.revenue) * 100
                          : 0
                      }
                      negative
                    />
                    <CascadaRow
                      label="Utilidad Neta"
                      value={cascada.net_income}
                      pct={cascada.net_margin_pct}
                      bold
                      highlight
                    />
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ========== RESUMEN DE VENTAS ========== */}
          {ventas_resumen && (
            <section>
              <h3 className="text-sm font-bold text-[#1A242F] mb-3 flex items-center gap-2">
                <ShoppingCart size={16} className="text-[#C5A059]" />
                Resumen de Ventas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Por metodo de pago */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold text-slate-600 mb-2">
                    Por Metodo de Pago
                  </h4>
                  <div className="space-y-1.5">
                    {ventas_resumen.por_metodo_pago.map((item) => (
                      <div
                        key={item.metodo}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-600">{item.metodo}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">
                            {item.cantidad} fact.
                          </span>
                          <span className="font-bold text-slate-700">
                            {formatBalboas(item.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 mt-2 pt-2 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">Total</span>
                    <span className="text-[#1A242F]">
                      {formatBalboas(ventas_resumen.total_ventas)}
                    </span>
                  </div>
                </div>

                {/* Por origen */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold text-slate-600 mb-2">
                    Por Origen
                  </h4>
                  <div className="space-y-1.5">
                    {ventas_resumen.por_origen.map((item) => (
                      <div
                        key={item.origen}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-600">{item.origen}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">
                            {item.cantidad} fact.
                          </span>
                          <span className="font-bold text-slate-700">
                            {formatBalboas(item.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 mt-2 pt-2 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">Total</span>
                    <span className="text-[#1A242F]">
                      {formatBalboas(ventas_resumen.total_ventas)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========== ALERTAS ACTIVAS ========== */}
          {alertas_activas && alertas_activas.lista.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-[#1A242F] mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#C5A059]" />
                Alertas Activas
                <span className="text-[10px] font-normal text-slate-400">
                  ({alertas_activas.total} total | {alertas_activas.criticas}{" "}
                  criticas | {alertas_activas.precaucion} precaucion)
                </span>
              </h3>
              <div className="space-y-2">
                {alertas_activas.lista.map((alerta, idx) => {
                  const style = PRIORITY_STYLES[alerta.nivel] || PRIORITY_STYLES.green;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${style.bg} ${style.border}`}
                    >
                      <div className="mt-0.5">
                        {alerta.nivel === "red" ? (
                          <AlertTriangle size={14} className="text-red-500" />
                        ) : alerta.nivel === "green" ? (
                          <CheckCircle2 size={14} className="text-emerald-500" />
                        ) : (
                          <AlertTriangle size={14} className="text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${style.text}`}>
                            {alerta.titulo}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${style.bg} ${style.text}`}
                          >
                            {PRIORITY_LABELS[alerta.nivel] || alerta.nivel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {alerta.mensaje}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ========== FOOTER ========== */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          <p className="text-[10px] text-slate-400">
            Reporte generado por Mi Director Financiero PTY
          </p>
          {!isCerrado && onCerrar && (
            <button
              onClick={() => setShowCierre(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Lock size={14} />
              Cerrar Periodo
            </button>
          )}
        </div>
      </div>

      {/* ========== MODAL DE CIERRE ========== */}
      {showCierre && (
        <CierreMensual
          periodoLabel={reporte.periodoLabel}
          onConfirm={handleCerrar}
          onCancel={() => setShowCierre(false)}
          isLoading={isClosing}
        />
      )}
    </div>
  );
}

// ============================================
// SUB-COMPONENTES
// ============================================

function KPICard({
  label,
  value,
  subtext,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; iconBg: string; text: string }> = {
    emerald: { bg: "bg-emerald-50", iconBg: "bg-emerald-100 text-emerald-600", text: "text-emerald-700" },
    blue: { bg: "bg-blue-50", iconBg: "bg-blue-100 text-blue-600", text: "text-blue-700" },
    red: { bg: "bg-red-50", iconBg: "bg-red-100 text-red-600", text: "text-red-700" },
    slate: { bg: "bg-slate-50", iconBg: "bg-slate-100 text-slate-600", text: "text-slate-700" },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className={`${c.bg} rounded-xl border border-slate-200 p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`p-1 rounded-lg ${c.iconBg}`}>{icon}</span>
        <span className="text-[10px] text-slate-500 font-medium">{label}</span>
      </div>
      <p className={`text-sm font-bold ${c.text}`}>{value}</p>
      {subtext && (
        <p className="text-[10px] text-slate-400 mt-0.5">{subtext}</p>
      )}
    </div>
  );
}

function CascadaRow({
  label,
  value,
  pct,
  bold,
  negative,
  highlight,
}: {
  label: string;
  value: number;
  pct: number;
  bold?: boolean;
  negative?: boolean;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? "bg-slate-100/50" : ""}>
      <td
        className={`px-4 py-2 ${
          bold ? "font-bold text-slate-800" : "text-slate-600"
        } ${negative ? "pl-8" : ""}`}
      >
        {label}
      </td>
      <td
        className={`px-4 py-2 text-right ${
          bold ? "font-bold" : ""
        } ${value < 0 ? "text-red-600" : "text-slate-800"}`}
      >
        {formatBalboas(Math.abs(value))}
      </td>
      <td className="px-4 py-2 text-right text-slate-400">
        {pct.toFixed(1)}%
      </td>
    </tr>
  );
}
