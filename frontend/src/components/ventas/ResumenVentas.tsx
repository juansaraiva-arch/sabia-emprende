"use client";

import {
  BarChart3,
  Banknote,
  CreditCard,
  Receipt,
  Smartphone,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import type { Venta, OrigenVenta, MetodoPagoVenta } from "@/lib/ventas-types";
import {
  ORIGEN_VENTA_LABELS,
  METODO_PAGO_LABELS,
} from "@/lib/ventas-types";
import { formatBalboas } from "@/lib/currency";

interface ResumenVentasProps {
  ventas: Venta[];
}

/** Icono para cada metodo de pago */
function MetodoPagoIcon({ metodo }: { metodo: MetodoPagoVenta }) {
  const size = 14;
  switch (metodo) {
    case "efectivo":
      return <Banknote size={size} className="text-emerald-600" />;
    case "tarjeta":
      return <CreditCard size={size} className="text-blue-600" />;
    case "transferencia":
      return <Receipt size={size} className="text-violet-600" />;
    case "yappy":
      return <Smartphone size={size} className="text-purple-600" />;
    default:
      return <DollarSign size={size} className="text-gray-500" />;
  }
}

/** Color del badge por origen */
const ORIGEN_COLORS: Record<OrigenVenta, { bg: string; bar: string }> = {
  manual: { bg: "bg-gray-200", bar: "bg-gray-500" },
  importacion_dgi: { bg: "bg-blue-200", bar: "bg-blue-500" },
  pac: { bg: "bg-emerald-200", bar: "bg-emerald-500" },
};

/**
 * Tarjeta resumen de ventas del mes.
 * Muestra KPIs (total, ITBMS, transacciones) y
 * desgloses por origen y metodo de pago.
 */
export default function ResumenVentas({ ventas }: ResumenVentasProps) {
  // Filtrar solo ventas activas (no anuladas)
  const activas = ventas.filter((v) => !v.anulada);

  const totalVentas = activas.reduce((sum, v) => sum + v.montoTotal, 0);
  const totalItbms = activas.reduce((sum, v) => sum + v.itbms, 0);
  const countActivas = activas.length;

  // Desglose por origen
  const byOrigen: Record<OrigenVenta, { total: number; count: number }> = {
    manual: { total: 0, count: 0 },
    importacion_dgi: { total: 0, count: 0 },
    pac: { total: 0, count: 0 },
  };
  for (const v of activas) {
    byOrigen[v.origen].total += v.montoTotal;
    byOrigen[v.origen].count++;
  }

  // Desglose por metodo de pago
  const byMetodo: Record<MetodoPagoVenta, { total: number; count: number }> = {
    efectivo: { total: 0, count: 0 },
    tarjeta: { total: 0, count: 0 },
    transferencia: { total: 0, count: 0 },
    yappy: { total: 0, count: 0 },
    otro: { total: 0, count: 0 },
  };
  for (const v of activas) {
    byMetodo[v.metodoPago].total += v.montoTotal;
    byMetodo[v.metodoPago].count++;
  }

  // Origenes con al menos una venta
  const origenesActivos = (Object.keys(byOrigen) as OrigenVenta[]).filter(
    (o) => byOrigen[o].count > 0
  );

  // Metodos con al menos una venta
  const metodosActivos = (Object.keys(byMetodo) as MetodoPagoVenta[]).filter(
    (m) => byMetodo[m].count > 0
  );

  // Empty state
  if (ventas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} style={{ color: "#C5A059" }} />
          <h3
            className="font-heading text-base font-semibold"
            style={{ color: "#1A242F" }}
          >
            Resumen del Mes
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-slate-400" />
          </div>
          <p className="text-sm text-slate-400 text-center">
            Registra ventas para ver el resumen mensual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} style={{ color: "#C5A059" }} />
        <h3
          className="font-heading text-base font-semibold"
          style={{ color: "#1A242F" }}
        >
          Resumen del Mes
        </h3>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {/* Ventas Totales */}
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
            Ventas Totales
          </p>
          <p
            className="text-lg font-bold leading-tight"
            style={{ color: "#C5A059" }}
          >
            {formatBalboas(Math.round(totalVentas * 100) / 100)}
          </p>
        </div>

        {/* ITBMS Recaudado */}
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
            ITBMS Recaudado
          </p>
          <p
            className="text-lg font-bold leading-tight"
            style={{ color: "#1A242F" }}
          >
            {formatBalboas(Math.round(totalItbms * 100) / 100)}
          </p>
        </div>

        {/* Transacciones */}
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
            Transacciones
          </p>
          <p
            className="text-lg font-bold leading-tight"
            style={{ color: "#1A242F" }}
          >
            {countActivas}
          </p>
        </div>
      </div>

      {/* Breakdown por origen */}
      {origenesActivos.length > 0 && (
        <div className="mb-4">
          <p
            className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: "#1A242F" }}
          >
            Por Origen
          </p>
          <div className="space-y-2">
            {origenesActivos.map((origen) => {
              const data = byOrigen[origen];
              const pct =
                totalVentas > 0
                  ? Math.round((data.total / totalVentas) * 100)
                  : 0;
              const colors = ORIGEN_COLORS[origen];

              return (
                <div key={origen}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">
                      {ORIGEN_VENTA_LABELS[origen]}{" "}
                      <span className="text-slate-400">
                        ({data.count})
                      </span>
                    </span>
                    <span
                      className="font-medium"
                      style={{ color: "#1A242F" }}
                    >
                      {formatBalboas(
                        Math.round(data.total * 100) / 100
                      )}
                    </span>
                  </div>
                  {/* Horizontal bar */}
                  <div className={`h-1.5 rounded-full ${colors.bg} overflow-hidden`}>
                    <div
                      className={`h-full rounded-full ${colors.bar} transition-all duration-300`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Breakdown por metodo de pago */}
      {metodosActivos.length > 0 && (
        <div>
          <p
            className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: "#1A242F" }}
          >
            Por Metodo de Pago
          </p>
          <div className="space-y-1.5">
            {metodosActivos.map((metodo) => {
              const data = byMetodo[metodo];
              return (
                <div
                  key={metodo}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2">
                    <MetodoPagoIcon metodo={metodo} />
                    <span className="text-xs text-slate-600">
                      {METODO_PAGO_LABELS[metodo]}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({data.count})
                    </span>
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#1A242F" }}
                  >
                    {formatBalboas(Math.round(data.total * 100) / 100)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
