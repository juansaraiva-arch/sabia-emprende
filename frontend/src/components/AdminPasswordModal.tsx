"use client";
import React, { useState } from "react";
import { Lock, X, AlertTriangle, Loader2 } from "lucide-react";

interface AdminPasswordModalProps {
  title: string;
  description: string;
  onConfirm: (code: string) => Promise<void>;
  onCancel: () => void;
}

export default function AdminPasswordModal({
  title,
  description,
  onConfirm,
  onCancel,
}: AdminPasswordModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError("Ingresa el codigo de administrador.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(code);
    } catch (e: any) {
      setError(e.message || "Codigo incorrecto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-full">
            <Lock size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-800">{title}</h3>
            <p className="text-xs text-amber-600">{description}</p>
          </div>
          <button
            onClick={onCancel}
            className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Esta accion puede afectar la integridad de los registros contables.
              Solo el administrador puede autorizar esta operacion.
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-600 font-medium">
              Codigo de Administrador
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Ingresa el codigo..."
              className="w-full mt-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={loading || !code.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Confirmar
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
