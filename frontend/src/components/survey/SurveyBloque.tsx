"use client";
import { ReactNode } from "react";

interface Props {
  titulo: string;
  icono: string;
  color: string;
  numero: number;
  children: ReactNode;
}

export default function SurveyBloque({ titulo, icono, color, numero, children }: Props) {
  return (
    <div
      className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden"
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      {/* Header del bloque */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
        <span className="text-2xl">{icono}</span>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Bloque {numero}
          </p>
          <h3 className="text-white font-semibold text-sm">{titulo}</h3>
        </div>
      </div>
      {/* Preguntas */}
      <div className="p-5 space-y-6">{children}</div>
    </div>
  );
}
