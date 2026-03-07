"use client";
import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

// ============================================
// ReconciliacionIngresosF2
// Compara ingresos registrados vs FE
// ============================================

interface ReconciliacionIngresosF2Props {
  ingresosRegistrados: number;
  ingresosFE: number;
}

function fmt(n: number): string {
  return `B/. ${n.toLocaleString("es-PA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ReconciliacionIngresosF2({
  ingresosRegistrados,
  ingresosFE,
}: ReconciliacionIngresosF2Props) {
  const diferencia = Math.abs(ingresosFE - ingresosRegistrados);
  const coincide = diferencia < 0.01;
  const feEsMayor = ingresosFE > ingresosRegistrados;

  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <Info size={16} className="text-indigo-600" />
        <h4 className="text-xs font-bold text-slate-700">
          Verificacion de ingresos vs. Facturacion Electronica (DGI)
        </h4>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Ingresos en tus registros:
          </span>
          <span className="text-sm font-bold text-slate-700">
            {fmt(ingresosRegistrados)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Total facturas electronicas:
          </span>
          <span className="text-sm font-bold text-slate-700">
            {fmt(ingresosFE)}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-600">
            Diferencia:
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-bold ${
                coincide ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {fmt(diferencia)}
            </span>
            {coincide ? (
              <CheckCircle2 size={16} className="text-emerald-500" />
            ) : (
              <AlertTriangle size={16} className="text-red-500" />
            )}
          </div>
        </div>
      </div>

      {!coincide && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] text-red-700 font-bold">
                ATENCION: La DGI validara tus ingresos contra tus facturas
                electronicas. Una diferencia puede causar el RECHAZO de tu
                declaracion.
              </p>
              <div className="mt-2 text-[10px] text-red-600 space-y-1">
                <p>Posibles causas:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {feEsMayor ? (
                    <>
                      <li>Facturas emitidas sin registrar en la app</li>
                      <li>Anulaciones no registradas</li>
                    </>
                  ) : (
                    <>
                      <li>Ingresos registrados sin factura electronica</li>
                      <li>Ingresos en efectivo no facturados</li>
                    </>
                  )}
                  <li>Diferencias de redondeo o tipo de cambio</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {coincide && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <p className="text-[11px] text-emerald-700 font-bold">
              Tus ingresos coinciden con tus facturas electronicas.
            </p>
          </div>
        </div>
      )}

      {ingresosFE === 0 && ingresosRegistrados === 0 && (
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[11px] text-slate-500 italic">
            No hay datos de facturacion electronica ni registros contables
            para este periodo. Ingresa tus facturas manualmente o conecta un
            PAC certificado DGI.
          </p>
        </div>
      )}
    </div>
  );
}
