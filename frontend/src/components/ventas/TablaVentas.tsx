"use client";

import { useState } from "react";
import { Trash2, Receipt, ShoppingBag } from "lucide-react";
import type { Venta, OrigenVenta } from "@/lib/ventas-types";
import { ORIGEN_VENTA_LABELS, METODO_PAGO_LABELS } from "@/lib/ventas-types";
import { formatBalboas } from "@/lib/currency";

interface TablaVentasProps {
  ventas: Venta[];
  onAnular?: (id: string) => void;
  showActions?: boolean;
}

/** Formato dd/mm/yyyy a partir de ISO "YYYY-MM-DD" */
function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Badge de origen con colores por tipo */
function OrigenBadge({ origen }: { origen: OrigenVenta }) {
  const config: Record<
    OrigenVenta,
    { bg: string; text: string; label: string }
  > = {
    manual: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      label: ORIGEN_VENTA_LABELS.manual,
    },
    importacion_dgi: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      label: "DGI Gratuito",
    },
    pac: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      label: "DGI PAC \u2713",
    },
  };

  const c = config[origen];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

/** Maximo de filas a mostrar */
const MAX_ROWS = 50;

/**
 * Tabla unificada de ventas con badges de origen,
 * soporte para anulacion y estado visual de filas anuladas.
 */
export default function TablaVentas({
  ventas,
  onAnular,
  showActions = true,
}: TablaVentasProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const displayVentas = ventas.slice(0, MAX_ROWS);

  const handleAnular = (id: string) => {
    if (confirmId === id) {
      onAnular?.(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
      // Auto-dismiss confirm after 3 seconds
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  // Empty state
  if (ventas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <ShoppingBag size={28} className="text-slate-400" />
        </div>
        <p
          className="text-base font-semibold mb-1"
          style={{ color: "#1A242F" }}
        >
          No hay ventas registradas
        </p>
        <p className="text-sm text-slate-400 text-center max-w-xs">
          Registra tu primera venta con el boton $ para comenzar a llevar tu
          Libro de Ventas.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th
              className="text-left py-3 px-3 font-medium text-xs uppercase tracking-wide"
              style={{ color: "#1A242F" }}
            >
              Fecha
            </th>
            <th
              className="text-left py-3 px-3 font-medium text-xs uppercase tracking-wide"
              style={{ color: "#1A242F" }}
            >
              Cliente
            </th>
            <th
              className="text-left py-3 px-3 font-medium text-xs uppercase tracking-wide hidden sm:table-cell"
              style={{ color: "#1A242F" }}
            >
              Concepto
            </th>
            <th
              className="text-right py-3 px-3 font-medium text-xs uppercase tracking-wide"
              style={{ color: "#1A242F" }}
            >
              Total
            </th>
            <th
              className="text-left py-3 px-3 font-medium text-xs uppercase tracking-wide hidden md:table-cell"
              style={{ color: "#1A242F" }}
            >
              Metodo
            </th>
            <th
              className="text-left py-3 px-3 font-medium text-xs uppercase tracking-wide hidden lg:table-cell"
              style={{ color: "#1A242F" }}
            >
              Origen
            </th>
            {showActions && (
              <th
                className="text-right py-3 px-3 font-medium text-xs uppercase tracking-wide"
                style={{ color: "#1A242F" }}
              >
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {displayVentas.map((v) => (
            <tr
              key={v.id}
              className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors
                ${v.anulada ? "opacity-50" : ""}`}
            >
              {/* Fecha */}
              <td className="py-3 px-3 whitespace-nowrap">
                <span className={v.anulada ? "line-through text-red-400" : ""}>
                  {formatFecha(v.fecha)}
                </span>
              </td>

              {/* Cliente */}
              <td className="py-3 px-3">
                <span
                  className={`truncate max-w-[120px] inline-block ${
                    v.anulada ? "line-through text-red-400" : ""
                  }`}
                  title={v.cliente}
                >
                  {v.cliente || "—"}
                </span>
              </td>

              {/* Concepto (hidden on mobile) */}
              <td className="py-3 px-3 hidden sm:table-cell">
                <span
                  className={`truncate max-w-[180px] inline-block ${
                    v.anulada ? "line-through text-red-400" : ""
                  }`}
                  title={v.concepto}
                >
                  {v.concepto}
                </span>
              </td>

              {/* Total */}
              <td className="py-3 px-3 text-right whitespace-nowrap font-medium">
                <span
                  className={v.anulada ? "line-through text-red-400" : ""}
                  style={v.anulada ? {} : { color: "#1A242F" }}
                >
                  {formatBalboas(v.montoTotal)}
                </span>
              </td>

              {/* Metodo Pago (hidden on small) */}
              <td className="py-3 px-3 hidden md:table-cell">
                <span className="text-slate-600">
                  {METODO_PAGO_LABELS[v.metodoPago]}
                </span>
              </td>

              {/* Origen (hidden on smaller) */}
              <td className="py-3 px-3 hidden lg:table-cell">
                {v.anulada ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    Anulada
                  </span>
                ) : (
                  <OrigenBadge origen={v.origen} />
                )}
              </td>

              {/* Acciones */}
              {showActions && (
                <td className="py-3 px-3 text-right">
                  {v.anulada ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 lg:hidden">
                      Anulada
                    </span>
                  ) : onAnular ? (
                    <button
                      onClick={() => handleAnular(v.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1 min-h-[44px] rounded-lg
                        text-xs font-medium transition-colors
                        ${
                          confirmId === v.id
                            ? "bg-red-100 text-red-700"
                            : "text-red-500 hover:bg-red-50"
                        }`}
                      title={
                        confirmId === v.id
                          ? "Presiona de nuevo para confirmar"
                          : "Anular venta"
                      }
                    >
                      <Trash2 size={14} />
                      {confirmId === v.id ? "Confirmar" : "Anular"}
                    </button>
                  ) : null}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {ventas.length > MAX_ROWS && (
        <p className="text-xs text-slate-400 text-center py-3">
          Mostrando {MAX_ROWS} de {ventas.length} ventas
        </p>
      )}
    </div>
  );
}
