"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  X,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
} from "lucide-react";
import type { Venta, MetodoPagoVenta } from "@/lib/ventas-types";
import { METODO_PAGO_LABELS } from "@/lib/ventas-types";
import { saveVenta, ITBMS_RATE } from "@/lib/ventas-storage";
import { formatBalboas } from "@/lib/currency";

interface FormVentaRapidaProps {
  societyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (venta: Venta) => void;
}

/** Fecha de hoy en formato YYYY-MM-DD para input[type=date] */
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Icono segun metodo de pago */
function MetodoPagoIcon({ metodo }: { metodo: MetodoPagoVenta }) {
  switch (metodo) {
    case "efectivo":
      return <Banknote size={16} className="text-emerald-600" />;
    case "tarjeta":
      return <CreditCard size={16} className="text-blue-600" />;
    case "transferencia":
      return <Receipt size={16} className="text-violet-600" />;
    case "yappy":
      return <Smartphone size={16} className="text-purple-600" />;
    default:
      return <DollarSign size={16} className="text-gray-500" />;
  }
}

/**
 * Modal de entrada de venta rapida (Segmento 1 — manual).
 * Campos: fecha, cliente, concepto, montoBase, ITBMS toggle, metodo pago, notas.
 */
export default function FormVentaRapida({
  societyId,
  isOpen,
  onClose,
  onSaved,
}: FormVentaRapidaProps) {
  const [fecha, setFecha] = useState(todayISO());
  const [cliente, setCliente] = useState("Consumidor Final");
  const [concepto, setConcepto] = useState("");
  const [montoBase, setMontoBase] = useState("");
  const [aplicaItbms, setAplicaItbms] = useState(true);
  const [metodoPago, setMetodoPago] = useState<MetodoPagoVenta>("efectivo");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFecha(todayISO());
      setCliente("Consumidor Final");
      setConcepto("");
      setMontoBase("");
      setAplicaItbms(true);
      setMetodoPago("efectivo");
      setNotas("");
      setSaving(false);
      setShowSuccess(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const montoNum = parseFloat(montoBase) || 0;
  const itbmsCalc = aplicaItbms
    ? Math.round(montoNum * ITBMS_RATE * 100) / 100
    : 0;
  const totalCalc = Math.round((montoNum + itbmsCalc) * 100) / 100;

  const canSave = concepto.trim().length > 0 && montoNum > 0;

  const handleSave = useCallback(() => {
    if (!canSave || saving) return;
    setSaving(true);

    try {
      const venta = saveVenta({
        societyId,
        fecha,
        cliente: cliente.trim() || "Consumidor Final",
        concepto: concepto.trim(),
        montoBase: montoNum,
        aplicaItbms,
        metodoPago,
        origen: "manual",
        notas: notas.trim() || undefined,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onSaved(venta);
      }, 600);
    } catch {
      setSaving(false);
    }
  }, [
    canSave,
    saving,
    societyId,
    fecha,
    cliente,
    concepto,
    montoNum,
    aplicaItbms,
    metodoPago,
    notas,
    onSaved,
  ]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#C5A059" }}
            >
              <DollarSign size={16} color="#FFFFFF" />
            </div>
            <h2
              className="font-heading text-lg"
              style={{ color: "#1A242F" }}
            >
              Registrar Venta
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center
              rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Success overlay */}
        {showSuccess && (
          <div className="absolute inset-0 bg-white/90 rounded-2xl z-10 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <Receipt size={28} className="text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-emerald-700">
              Venta registrada
            </p>
          </div>
        )}

        {/* Form body */}
        <div className="p-5 space-y-4">
          {/* Fecha */}
          <div>
            <label
              htmlFor="vr-fecha"
              className="block text-sm font-medium mb-1"
              style={{ color: "#1A242F" }}
            >
              Fecha
            </label>
            <input
              id="vr-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 min-h-[44px] border border-slate-200 rounded-xl
                text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40
                focus:border-[#C5A059]"
            />
          </div>

          {/* Cliente */}
          <div>
            <label
              htmlFor="vr-cliente"
              className="block text-sm font-medium mb-1"
              style={{ color: "#1A242F" }}
            >
              Cliente
            </label>
            <input
              id="vr-cliente"
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Consumidor Final"
              className="w-full px-3 py-2 min-h-[44px] border border-slate-200 rounded-xl
                text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40
                focus:border-[#C5A059]"
            />
          </div>

          {/* Concepto */}
          <div>
            <label
              htmlFor="vr-concepto"
              className="block text-sm font-medium mb-1"
              style={{ color: "#1A242F" }}
            >
              Concepto <span className="text-red-400">*</span>
            </label>
            <input
              id="vr-concepto"
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Descripcion del producto o servicio"
              className="w-full px-3 py-2 min-h-[44px] border border-slate-200 rounded-xl
                text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40
                focus:border-[#C5A059]"
            />
          </div>

          {/* Monto Base */}
          <div>
            <label
              htmlFor="vr-monto"
              className="block text-sm font-medium mb-1"
              style={{ color: "#1A242F" }}
            >
              Monto Base <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">
                B/.
              </span>
              <input
                id="vr-monto"
                type="number"
                min="0"
                step="0.01"
                value={montoBase}
                onChange={(e) => setMontoBase(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-3 py-2 min-h-[44px] border border-slate-200 rounded-xl
                  text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40
                  focus:border-[#C5A059]"
              />
            </div>
          </div>

          {/* ITBMS toggle */}
          <div className="flex items-center justify-between">
            <label
              htmlFor="vr-itbms"
              className="text-sm font-medium"
              style={{ color: "#1A242F" }}
            >
              Aplica ITBMS 7%
            </label>
            <button
              id="vr-itbms"
              type="button"
              role="switch"
              aria-checked={aplicaItbms}
              onClick={() => setAplicaItbms(!aplicaItbms)}
              className={`relative w-11 h-6 rounded-full transition-colors min-h-[44px] flex items-center
                ${aplicaItbms ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span
                className={`absolute w-5 h-5 bg-white rounded-full shadow transition-transform
                  ${aplicaItbms ? "translate-x-[22px]" : "translate-x-[2px]"}`}
              />
            </button>
          </div>

          {/* Metodo de Pago */}
          <div>
            <label
              htmlFor="vr-metodo"
              className="block text-sm font-medium mb-1"
              style={{ color: "#1A242F" }}
            >
              Metodo de Pago
            </label>
            <div className="relative">
              <select
                id="vr-metodo"
                value={metodoPago}
                onChange={(e) =>
                  setMetodoPago(e.target.value as MetodoPagoVenta)
                }
                className="w-full px-3 py-2 min-h-[44px] border border-slate-200 rounded-xl
                  text-sm appearance-none bg-white
                  focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40
                  focus:border-[#C5A059]"
              >
                {(
                  Object.entries(METODO_PAGO_LABELS) as [
                    MetodoPagoVenta,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <MetodoPagoIcon metodo={metodoPago} />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label
              htmlFor="vr-notas"
              className="block text-sm font-medium mb-1"
              style={{ color: "#1A242F" }}
            >
              Notas{" "}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="vr-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones adicionales..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl
                text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40
                focus:border-[#C5A059]"
            />
          </div>

          {/* Summary box */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span style={{ color: "#1A242F" }}>
                {formatBalboas(montoNum)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">
                ITBMS (7%){" "}
                {!aplicaItbms && (
                  <span className="text-slate-400">— exento</span>
                )}
              </span>
              <span style={{ color: "#1A242F" }}>
                {formatBalboas(itbmsCalc)}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
              <span
                className="text-sm font-semibold"
                style={{ color: "#1A242F" }}
              >
                Total
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: "#C5A059" }}
              >
                {formatBalboas(totalCalc)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 min-h-[44px] rounded-xl border border-slate-200
              text-sm font-medium text-slate-600
              hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 px-4 py-2 min-h-[44px] rounded-xl
              text-sm font-medium text-white
              bg-emerald-600 hover:bg-emerald-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors flex items-center justify-center gap-2"
          >
            <Receipt size={16} />
            {saving ? "Guardando..." : "Registrar Venta"}
          </button>
        </div>
      </div>
    </div>
  );
}
