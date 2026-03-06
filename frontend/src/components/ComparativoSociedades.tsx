"use client";
import React, { useState } from "react";
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Shield,
  DollarSign,
  Clock,
  Users,
  Scale,
  Briefcase,
  Star,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  FORMAS_JURIDICAS,
  COMPARATIVO_COLUMNAS,
  getComparativoRow,
} from "@/lib/rutaSE";
import type { TipoSociedad, FormaJuridica } from "@/lib/rutaSE";

const GOLD = "#C5A059";
const NAVY = "#1A242F";

const TIPO_COLORS: Record<TipoSociedad, { bg: string; text: string; border: string; light: string }> = {
  SEP: { bg: "bg-emerald-600", text: "text-emerald-700", border: "border-emerald-300", light: "bg-emerald-50" },
  SA: { bg: "bg-blue-600", text: "text-blue-700", border: "border-blue-300", light: "bg-blue-50" },
  SRL: { bg: "bg-violet-600", text: "text-violet-700", border: "border-violet-300", light: "bg-violet-50" },
  EIRL: { bg: "bg-amber-600", text: "text-amber-700", border: "border-amber-300", light: "bg-amber-50" },
};

// ─── Sub-tab navigation ───
type SubTab = "comparativo" | "detalle";

export default function ComparativoSociedades() {
  const [subTab, setSubTab] = useState<SubTab>("comparativo");
  const [selectedTipo, setSelectedTipo] = useState<TipoSociedad>("SEP");
  const [expandedPaso, setExpandedPaso] = useState<number | null>(null);

  const selected = FORMAS_JURIDICAS.find((f) => f.tipo === selectedTipo)!;
  const colors = TIPO_COLORS[selectedTipo];

  // ─── Comparativo Table ───
  const renderComparativo = () => (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {FORMAS_JURIDICAS.map((f) => {
          const c = TIPO_COLORS[f.tipo];
          const isSelected = f.tipo === selectedTipo;
          return (
            <button
              key={f.tipo}
              onClick={() => { setSelectedTipo(f.tipo); setSubTab("detalle"); }}
              className={`relative p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${isSelected ? c.border : "border-slate-200"}`}
            >
              <div className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-white mb-2 ${c.bg}`}>
                {f.nombreCorto}
              </div>
              <p className="text-xs font-bold text-slate-800 leading-tight mb-1">{f.nombre}</p>
              <p className="text-[10px] text-slate-400">{f.ley}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-800">
                  B/.{f.costoMin === 0 ? "0" : f.costoMin.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">– B/.{f.costoMax.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{f.tiempoEstimado}</p>
              {!f.requiereAbogado && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700">
                  Sin abogado
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-4 py-3 font-bold text-slate-600 w-36">Caracteristica</th>
                {FORMAS_JURIDICAS.map((f) => (
                  <th key={f.tipo} className="text-center px-3 py-3 font-bold" style={{ minWidth: 120 }}>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] text-white ${TIPO_COLORS[f.tipo].bg}`}>
                      {f.nombreCorto}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARATIVO_COLUMNAS.map((col, i) => (
                <tr key={col.key} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-semibold text-slate-600">{col.label}</td>
                  {FORMAS_JURIDICAS.map((f) => {
                    const val = getComparativoRow(f, col.key);
                    const isHighlight = col.key === "abogado" && val === "No";
                    return (
                      <td key={f.tipo} className="px-3 py-2.5 text-center text-slate-700">
                        {col.key === "abogado" ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isHighlight ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {isHighlight ? <Check size={10} /> : <X size={10} />}
                            {val}
                          </span>
                        ) : (
                          <span className="text-xs">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ventajas / Desventajas side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {FORMAS_JURIDICAS.map((f) => {
          const c = TIPO_COLORS[f.tipo];
          return (
            <div key={f.tipo} className={`rounded-xl border p-4 ${c.light} ${c.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${c.bg}`}>{f.nombreCorto}</span>
                <span className="text-xs font-bold text-slate-700">{f.nombre}</span>
              </div>

              <div className="space-y-2 mb-3">
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Ventajas</p>
                {f.ventajas.slice(0, 3).map((v, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-slate-600">{v}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-red-600 uppercase">Desventajas</p>
                {f.desventajas.slice(0, 3).map((d, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <X size={12} className="text-red-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-slate-600">{d}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setSelectedTipo(f.tipo); setSubTab("detalle"); }}
                className="mt-3 text-[11px] font-bold underline"
                style={{ color: GOLD }}
              >
                Ver pasos y costos detallados →
              </button>
            </div>
          );
        })}
      </div>

      {/* Casos de uso recomendados */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Star size={16} style={{ color: GOLD }} />
          ¿Cual te conviene?
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FORMAS_JURIDICAS.map((f) => {
            const c = TIPO_COLORS[f.tipo];
            return (
              <div key={f.tipo} className="space-y-1.5">
                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${c.bg}`}>
                  {f.nombreCorto}
                </span>
                {f.casosUso.map((caso, i) => (
                  <p key={i} className="text-[11px] text-slate-600 pl-2 flex items-start gap-1.5">
                    <span className="shrink-0 mt-0.5">•</span>
                    {caso}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── Detail view for selected type ───
  const renderDetalle = () => (
    <div className="space-y-5">
      {/* Type selector pills */}
      <div className="flex flex-wrap gap-2">
        {FORMAS_JURIDICAS.map((f) => {
          const c = TIPO_COLORS[f.tipo];
          const isActive = f.tipo === selectedTipo;
          return (
            <button
              key={f.tipo}
              onClick={() => { setSelectedTipo(f.tipo); setExpandedPaso(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? `${c.bg} text-white` : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              {f.nombreCorto}
            </button>
          );
        })}
      </div>

      {/* Header card */}
      <div className={`rounded-xl border-2 p-5 ${colors.light} ${colors.border}`}>
        <div className="flex items-start justify-between">
          <div>
            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-white mb-2 ${colors.bg}`}>
              {selected.nombreCorto}
            </span>
            <h3 className="text-base font-bold text-slate-800">{selected.nombre}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{selected.ley}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-800">
              B/.{selected.costoMin === 0 ? "0" : selected.costoMin.toLocaleString()} – B/.{selected.costoMax.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500">Costo total estimado</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { icon: <Users size={14} />, label: "Socios", value: selected.sociosMax === null ? `${selected.sociosMin}+ ilimitado` : selected.sociosMin === selected.sociosMax ? `${selected.sociosMin}` : `${selected.sociosMin} – ${selected.sociosMax}` },
            { icon: <Clock size={14} />, label: "Tiempo", value: selected.tiempoEstimado },
            { icon: <Scale size={14} />, label: "Abogado", value: selected.requiereAbogado ? "Requerido" : "No necesario" },
            { icon: <DollarSign size={14} />, label: "Capital min.", value: selected.capitalMinimo.replace(/\(.*\)/, "").trim() },
          ].map((stat, i) => (
            <div key={i} className="bg-white/70 rounded-lg p-2.5 text-center">
              <div className="flex justify-center mb-1 text-slate-400">{stat.icon}</div>
              <p className="text-[10px] text-slate-500">{stat.label}</p>
              <p className="text-xs font-bold text-slate-800">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ventajas & Desventajas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="text-xs font-bold text-emerald-700 uppercase mb-3 flex items-center gap-1.5">
            <Check size={14} /> Ventajas
          </h4>
          <div className="space-y-2">
            {selected.ventajas.map((v, i) => (
              <div key={i} className="flex items-start gap-2">
                <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-600">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="text-xs font-bold text-red-600 uppercase mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Desventajas
          </h4>
          <div className="space-y-2">
            {selected.desventajas.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <X size={12} className="text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-600">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pasos de formalizacion */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText size={16} style={{ color: GOLD }} />
          Pasos para constituir tu {selected.nombreCorto}
        </h4>

        <div className="space-y-2">
          {selected.pasos.map((paso) => {
            const isExpanded = expandedPaso === paso.orden;
            return (
              <div
                key={paso.orden}
                className={`rounded-xl border transition-all ${isExpanded ? colors.border + " " + colors.light : "border-slate-200"}`}
              >
                <button
                  onClick={() => setExpandedPaso(isExpanded ? null : paso.orden)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${colors.bg}`}>
                    {paso.orden}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{paso.titulo}</p>
                    <p className="text-[10px] text-slate-400">{paso.entidad}</p>
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: GOLD }}>{paso.costoEstimado.split("+")[0].trim()}</span>
                  {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2">
                    <p className="text-xs text-slate-600 leading-relaxed pl-10">{paso.descripcion}</p>
                    <div className="flex items-center gap-2 pl-10">
                      <span className="text-[10px] text-slate-500">Costo:</span>
                      <span className="text-xs font-bold" style={{ color: GOLD }}>{paso.costoEstimado}</span>
                    </div>
                    {paso.url && (
                      <a
                        href={paso.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold pl-10 hover:underline"
                        style={{ color: GOLD }}
                      >
                        Ir al sitio oficial <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total cost summary */}
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800">Costo total estimado</p>
            <p className="text-[10px] text-slate-500">Desde cero hasta operativo</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: NAVY }}>
              B/.{selected.costoMin === 0 ? "0" : selected.costoMin.toLocaleString()} – B/.{selected.costoMax.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500">{selected.tiempoEstimado}</p>
          </div>
        </div>
      </div>

      {/* Recommended use cases */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-1.5">
          <Briefcase size={14} style={{ color: GOLD }} /> Ideal para
        </h4>
        <div className="space-y-1.5">
          {selected.casosUso.map((caso, i) => (
            <div key={i} className="flex items-start gap-2">
              <Star size={11} className="text-amber-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-600">{caso}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── Main render ───
  return (
    <div className="space-y-4">
      {/* Sub-tab pills */}
      <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
        {[
          { key: "comparativo" as SubTab, label: "Tabla Comparativa" },
          { key: "detalle" as SubTab, label: "Detalle por Tipo" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === tab.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "comparativo" && renderComparativo()}
      {subTab === "detalle" && renderDetalle()}
    </div>
  );
}
