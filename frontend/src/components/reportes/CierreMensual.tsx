"use client";

import React, { useState } from "react";
import { AlertTriangle, Lock, Loader2, X } from "lucide-react";

// ============================================
// TIPOS
// ============================================

interface CierreMensualProps {
  periodoLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// ============================================
// COMPONENTE
// ============================================

export default function CierreMensual({
  periodoLabel,
  onConfirm,
  onCancel,
  isLoading = false,
}: CierreMensualProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="mx-auto mb-4 w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={28} className="text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-[#1A242F]">
            Cerrar Periodo: {periodoLabel}
          </h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Una vez cerrado, los datos del periodo quedan como snapshot
            inmutable. No se podran modificar ni eliminar.
          </p>
        </div>

        {/* Checkbox */}
        <div className="px-6 py-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </div>
            <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors">
              Entiendo que esta accion no se puede deshacer
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 flex items-center gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!checked || isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Lock size={16} />
            )}
            {isLoading ? "Cerrando..." : "Confirmar Cierre"}
          </button>
        </div>
      </div>
    </div>
  );
}
