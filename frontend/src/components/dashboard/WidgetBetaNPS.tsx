"use client";
import React from "react";
import { ClipboardList, ExternalLink, BarChart3 } from "lucide-react";

export default function WidgetBetaNPS() {
  const [copied, setCopied] = React.useState(false);

  const surveyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/beta-evaluacion`
    : "/beta-evaluacion";

  const handleCopy = () => {
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <ClipboardList size={16} className="text-violet-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-700">Programa Beta</h3>
          <p className="text-xs text-slate-400">Evaluacion de usuarios</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ExternalLink size={12} />
          {copied ? "Link copiado!" : "Copiar link encuesta"}
        </button>
        <a
          href="/admin/beta-resultados"
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          <BarChart3 size={12} />
          Ver resultados
        </a>
      </div>
    </div>
  );
}
