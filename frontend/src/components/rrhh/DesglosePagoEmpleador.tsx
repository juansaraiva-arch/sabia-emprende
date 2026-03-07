"use client";
import React from "react";
import { Building2, FileText } from "lucide-react";
import type { DesgloseCostosEmpleador } from "@/lib/rrhh/nomina-types";

interface Props {
  desglose: DesgloseCostosEmpleador;
}

function fmt(n: number): string {
  return n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DesglosePagoEmpleador({ desglose }: Props) {
  const d = desglose;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-[#C5A059]" />
        <h3 className="font-semibold text-[#1A242F] text-sm">
          VISTA EMPRESA — Cuanto le cuesta este empleado?
        </h3>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Salario bruto */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <span className="text-sm text-slate-600">Salario bruto acordado</span>
          <span className="font-semibold text-[#1A242F]">B/. {fmt(d.salario_bruto)}</span>
        </div>

        {/* Cargas sobre la planilla */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Cargas sobre la planilla (Ley 462/2025)
            </span>
          </div>
          <div className="space-y-1.5 pl-5">
            <Row
              label={`CSS Patronal (${d.css_patronal_pct}%)`}
              value={d.css_patronal_monto}
            />
            <Row
              label={`Seguro Educativo (${d.se_patronal_pct}%)`}
              value={d.se_patronal_monto}
            />
            <Row
              label={`Riesgos Profesionales (${d.riesgos_profesionales_pct}%)`}
              value={d.riesgos_profesionales_monto}
            />
          </div>
          <div className="flex justify-between items-center mt-2 pl-5 pt-2 border-t border-dashed border-slate-200">
            <span className="text-xs font-medium text-slate-500">
              Subtotal cargas ({d.total_cargas_porcentuales}%)
            </span>
            <span className="text-sm font-medium text-slate-700">
              B/. {fmt(d.css_patronal_monto + d.se_patronal_monto + d.riesgos_profesionales_monto)}
            </span>
          </div>
        </div>

        {/* Prestaciones sociales */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Prestaciones sociales (Codigo de Trabajo)
            </span>
          </div>
          <div className="space-y-1.5 pl-5">
            <Row
              label={`XIII Mes (${d.decimotercer_mes_pct.toFixed(2)}%)`}
              value={d.decimotercer_mes_monto}
            />
            <Row
              label={`Vacaciones (${d.vacaciones_pct.toFixed(2)}%)`}
              value={d.vacaciones_monto}
            />
            <Row
              label={`Fondo Cesantia (${d.cesantia_pct}%)`}
              value={d.cesantia_monto}
            />
          </div>
          <div className="flex justify-between items-center mt-2 pl-5 pt-2 border-t border-dashed border-slate-200">
            <span className="text-xs font-medium text-slate-500">
              Subtotal prestaciones
            </span>
            <span className="text-sm font-medium text-slate-700">
              B/. {fmt(d.total_prestaciones)}
            </span>
          </div>
        </div>

        {/* Carga adicional total */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
          <span className="text-sm font-semibold text-slate-600">CARGA ADICIONAL TOTAL</span>
          <span className="font-bold text-[#1A242F]">B/. {fmt(d.total_carga_adicional)}</span>
        </div>

        {/* Costo real para la empresa (highlighted) */}
        <div className="bg-amber-50 border border-[#C5A059]/30 rounded-xl px-4 py-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-[#1A242F]">COSTO REAL PARA LA EMPRESA</span>
            <span className="text-lg font-bold text-[#C5A059]">
              B/. {fmt(d.costo_total_empleador)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-slate-500">Factor multiplicador</span>
            <span className="text-sm font-semibold text-[#C5A059]">
              {d.factor_multiplicador.toFixed(2)}x
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

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-600">{label}</span>
      <span className="text-sm text-slate-700">B/. {fmt(value)}</span>
    </div>
  );
}
