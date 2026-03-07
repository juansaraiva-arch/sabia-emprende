"use client";
import React from "react";
import { Users, FileText, DollarSign, ArrowRight } from "lucide-react";
import type { ResultadoNominaTotal } from "@/lib/rrhh/nomina-types";

interface Props {
  resultado: ResultadoNominaTotal;
}

function fmt(n: number): string {
  return n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ResumenNominaTotal({ resultado }: Props) {
  const { empleados, totales_empresa, totales_retenciones, totales_empleados } = resultado;

  // Calculate SALIDA REAL DE CAJA vs PROVISIONES
  const transferencias_netas = totales_empleados.total_salarios_netos;
  const pago_css_se = totales_retenciones.total_planilla_css;
  const pago_isr = totales_retenciones.total_isr_retenido;
  const provisiones = totales_empresa.total_decimotercer_mes +
    totales_empresa.total_vacaciones +
    totales_empresa.total_cesantia;
  const salida_real_caja = transferencias_netas + pago_css_se + pago_isr;

  return (
    <div className="space-y-6">
      {/* Table 1: Employer costs per employee */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#C5A059]" />
          <h3 className="font-semibold text-[#1A242F] text-sm">
            COSTOS DEL EMPLEADOR POR EMPLEADO
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-slate-500 font-medium">Empleado</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">Bruto</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">CSS Pat</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">SE Pat</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">XIII Mes</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">Vacac</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">Cesantia</th>
                <th className="text-right px-3 py-2 text-[#C5A059] font-semibold">Costo Emp</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((r) => (
                <tr key={r.empleado.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700 font-medium">{r.empleado.nombre}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(r.empleador.salario_bruto)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(r.empleador.css_patronal_monto)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(r.empleador.se_patronal_monto)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(r.empleador.decimotercer_mes_monto)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(r.empleador.vacaciones_monto)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(r.empleador.cesantia_monto)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-[#C5A059]">{fmt(r.empleador.costo_total_empleador)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="px-3 py-2 text-[#1A242F]">TOTAL</td>
                <td className="px-3 py-2 text-right text-[#1A242F]">{fmt(totales_empresa.total_salarios_brutos)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmt(totales_empresa.total_css_patronal)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmt(totales_empresa.total_se_patronal)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmt(totales_empresa.total_decimotercer_mes)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmt(totales_empresa.total_vacaciones)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmt(totales_empresa.total_cesantia)}</td>
                <td className="px-3 py-2 text-right text-[#C5A059] font-bold">{fmt(totales_empresa.gran_total_costo_empresa)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Table 2: Employee deductions per employee */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-[#1A242F] text-sm">
            RETENCIONES Y NETO POR EMPLEADO
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-slate-500 font-medium">Empleado</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">Bruto</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">CSS Emp</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">SE Emp</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">SIACAP</th>
                <th className="text-right px-3 py-2 text-slate-500 font-medium">ISR</th>
                <th className="text-right px-3 py-2 text-red-500 font-medium">Retenc</th>
                <th className="text-right px-3 py-2 text-emerald-600 font-semibold">Neto</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((r) => (
                <tr key={r.empleado.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700 font-medium">{r.empleado.nombre}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(r.empleado_recibe.salario_bruto)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(r.empleado_recibe.css_empleado_monto)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(r.empleado_recibe.se_empleado_monto)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(r.empleado_recibe.siacap_mensual)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmt(r.empleado_recibe.isr_mensual)}</td>
                  <td className="px-3 py-2 text-right text-red-600 font-medium">{fmt(r.empleado_recibe.total_retenciones)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-700">{fmt(r.empleado_recibe.salario_neto)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="px-3 py-2 text-[#1A242F]">TOTAL</td>
                <td className="px-3 py-2 text-right text-[#1A242F]">{fmt(totales_empresa.total_salarios_brutos)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmt(totales_retenciones.total_css_empleados)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmt(totales_retenciones.total_se_empleados)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmt(totales_retenciones.total_siacap)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmt(totales_retenciones.total_isr_retenido)}</td>
                <td className="px-3 py-2 text-right text-red-600">{fmt(
                  totales_retenciones.total_css_empleados +
                  totales_retenciones.total_se_empleados +
                  totales_retenciones.total_siacap +
                  totales_retenciones.total_isr_retenido
                )}</td>
                <td className="px-3 py-2 text-right text-emerald-700 font-bold">{fmt(totales_empleados.total_salarios_netos)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* RESUMEN DE CAJA */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#C5A059]" />
          <h3 className="font-semibold text-[#1A242F] text-sm">
            RESUMEN DE CAJA
          </h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          {/* Immediate payments */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Pagos inmediatos (salida de caja)
            </span>
            <div className="pl-3 space-y-1.5">
              <CashRow
                label="Transferencias netas a empleados"
                value={transferencias_netas}
              />
              <CashRow
                label="Pago planilla CSS/SE (Form 20)"
                value={pago_css_se}
              />
              <CashRow
                label="ISR retenido (Form 03)"
                value={pago_isr}
              />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-sm font-bold text-[#1A242F] flex items-center gap-1">
                <ArrowRight className="w-4 h-4 text-[#C5A059]" />
                SALIDA REAL DE CAJA
              </span>
              <span className="text-base font-bold text-[#C5A059]">
                B/. {fmt(salida_real_caja)}
              </span>
            </div>
          </div>

          {/* Provisions */}
          <div className="mt-4 space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Provisiones del mes *
            </span>
            <div className="pl-3 space-y-1.5">
              <CashRow
                label="XIII Mes *"
                value={totales_empresa.total_decimotercer_mes}
                muted
              />
              <CashRow
                label="Vacaciones *"
                value={totales_empresa.total_vacaciones}
                muted
              />
              <CashRow
                label="Fondo Cesantia *"
                value={totales_empresa.total_cesantia}
                muted
              />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
              <span className="text-sm font-semibold text-slate-500 flex items-center gap-1">
                <ArrowRight className="w-4 h-4 text-slate-400" />
                PROVISIONES DEL MES
              </span>
              <span className="text-sm font-semibold text-slate-500">
                B/. {fmt(provisiones)}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-3">
            * Las provisiones se acumulan mensualmente pero se pagan en fechas especificas
            (XIII Mes: 15 abr/15 ago/15 dic; Vacaciones: al tomarlas; Cesantia: al terminar relacion laboral).
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CASH ROW HELPER
// ============================================

function CashRow({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs ${muted ? "text-slate-400" : "text-slate-600"}`}>{label}</span>
      <span className={`text-sm ${muted ? "text-slate-400" : "text-slate-700"}`}>
        B/. {fmt(value)}
      </span>
    </div>
  );
}
