"use client";
import React from "react";
import { DollarSign, FileText } from "lucide-react";
import type { DesglosePagoEmpleado as TDesglose } from "@/lib/rrhh/nomina-types";

interface Props {
  desglose: TDesglose;
}

function fmt(n: number): string {
  return n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DesglosePagoEmpleado({ desglose }: Props) {
  const d = desglose;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-[#1A242F] text-sm">
          VISTA EMPLEADO — Cuanto recibe en mano?
        </h3>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Salario bruto */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <span className="text-sm text-slate-600">Salario bruto</span>
          <span className="font-semibold text-[#1A242F]">B/. {fmt(d.salario_bruto)}</span>
        </div>

        {/* Retenciones obligatorias */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Retenciones obligatorias
            </span>
          </div>
          <div className="space-y-1.5 pl-5">
            <Row
              label={`CSS Obrero (${d.css_empleado_pct}%)`}
              value={d.css_empleado_monto}
              negative
            />
            <Row
              label={`Seguro Educativo (${d.se_empleado_pct}%)`}
              value={d.se_empleado_monto}
              negative
            />
            {d.siacap_mensual > 0 && (
              <Row
                label="SIACAP (sector publico)"
                value={d.siacap_mensual}
                negative
              />
            )}
          </div>
        </div>

        {/* ISR mensual estimado */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              ISR mensual estimado (Art. 700)
            </span>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Base gravable mensual</span>
              <span className="text-xs text-slate-600">B/. {fmt(d.isr_base_calculo)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Renta anual estimada</span>
              <span className="text-xs text-slate-600">B/. {fmt(d.salario_anual_estimado)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Tramo DGI aplicable</span>
              <span className={`text-xs font-medium ${
                d.isr_tramo === "0%" ? "text-emerald-600" :
                d.isr_tramo === "15%" ? "text-amber-600" :
                "text-red-600"
              }`}>
                {d.isr_tramo}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">ISR anual estimado</span>
              <span className="text-xs text-slate-600">B/. {fmt(d.isr_anual_estimado)}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
              <span className="text-xs font-medium text-slate-600">ISR mensual retenido</span>
              <span className="text-sm font-medium text-red-600">- B/. {fmt(d.isr_mensual)}</span>
            </div>
          </div>
        </div>

        {/* Total retenciones */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
          <span className="text-sm font-semibold text-slate-600">TOTAL RETENCIONES</span>
          <span className="font-bold text-red-600">- B/. {fmt(d.total_retenciones)}</span>
        </div>

        {/* Salario neto (highlighted) */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-[#1A242F]">SALARIO NETO AL EMPLEADO</span>
            <span className="text-lg font-bold text-emerald-700">
              B/. {fmt(d.salario_neto)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-slate-500">Retencion efectiva</span>
            <span className="text-sm font-semibold text-slate-600">
              {d.pct_retencion_efectiva.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ROW HELPER
// ============================================

function Row({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-600">{label}</span>
      <span className={`text-sm ${negative ? "text-red-600" : "text-slate-700"}`}>
        {negative ? "- " : ""}B/. {fmt(value)}
      </span>
    </div>
  );
}
