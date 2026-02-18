"use client";
import React, { useState } from "react";
import {
  Bell,
  X,
  AlertTriangle,
  Siren,
  CheckCircle2,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Droplets,
  ChevronRight,
} from "lucide-react";
import type { StrategicAlert, AlertCategory, AlertPriority } from "@/lib/alerts";
import { countByPriority } from "@/lib/alerts";

// ============================================
// TIPOS
// ============================================

interface AlertsSidebarProps {
  alerts: StrategicAlert[];
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// ICONOS POR CATEGORIA
// ============================================

const CATEGORY_ICONS: Record<AlertCategory, React.ReactNode> = {
  dgi: <FileText size={14} />,
  capital_humano: <Users size={14} />,
  liquidez: <Droplets size={14} />,
  rentabilidad: <TrendingDown size={14} />,
  legal: <FileText size={14} />,
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  dgi: "DGI / Fiscal",
  capital_humano: "Capital Humano",
  liquidez: "Liquidez",
  rentabilidad: "Rentabilidad",
  legal: "Legal",
};

const PRIORITY_STYLES: Record<AlertPriority, {
  bg: string;
  border: string;
  text: string;
  accent: string;
  badge: string;
  icon: string;
}> = {
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    accent: "border-l-red-500",
    badge: "bg-red-100 text-red-700",
    icon: "text-red-500",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    accent: "border-l-orange-500",
    badge: "bg-orange-100 text-orange-700",
    icon: "text-orange-500",
  },
  yellow: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    accent: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-700",
    icon: "text-amber-500",
  },
  green: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    accent: "border-l-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    icon: "text-emerald-500",
  },
};

const PRIORITY_LABELS: Record<AlertPriority, string> = {
  red: "Critico",
  orange: "Alerta",
  yellow: "Precaucion",
  green: "OK",
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AlertsSidebar({ alerts, isOpen, onClose }: AlertsSidebarProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const counts = countByPriority(alerts);

  // Agrupar por categoria
  const grouped = alerts.reduce<Record<AlertCategory, StrategicAlert[]>>(
    (acc, alert) => {
      if (!acc[alert.category]) acc[alert.category] = [];
      acc[alert.category].push(alert);
      return acc;
    },
    { dgi: [], capital_humano: [], liquidez: [], rentabilidad: [], legal: [] }
  );

  const activeCategories = (Object.keys(grouped) as AlertCategory[]).filter(
    (cat) => grouped[cat].length > 0
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-white border-l border-slate-200 shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-slate-600" />
            <h2 className="text-sm font-extrabold text-slate-800">
              Alertas Estrategicas
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 overflow-x-auto">
          {counts.red > 0 && (
            <CountBadge count={counts.red} label="Critico" color="red" />
          )}
          {counts.orange > 0 && (
            <CountBadge count={counts.orange} label="Alerta" color="orange" />
          )}
          {counts.yellow > 0 && (
            <CountBadge count={counts.yellow} label="Precaucion" color="amber" />
          )}
          {counts.green > 0 && (
            <CountBadge count={counts.green} label="OK" color="emerald" />
          )}
        </div>

        {/* Alert list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5" style={{ maxHeight: "calc(100vh - 140px)" }}>
          {activeCategories.map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-slate-500">{CATEGORY_ICONS[cat]}</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {grouped[cat].length}
                </span>
              </div>

              <div className="space-y-2">
                {grouped[cat].map((alert) => {
                  const s = PRIORITY_STYLES[alert.priority];
                  const isExpanded = expandedId === alert.id;

                  return (
                    <div
                      key={alert.id}
                      onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                      className={`p-3 rounded-xl border-l-4 border ${s.border} ${s.accent} ${s.bg} cursor-pointer transition-all hover:shadow-sm`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-base mt-0.5">{alert.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs font-bold ${s.text}`}>
                              {alert.title}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.badge}`}>
                              {PRIORITY_LABELS[alert.priority]}
                            </span>
                          </div>
                          {isExpanded && (
                            <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                              {alert.message}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          size={14}
                          className={`text-slate-300 flex-shrink-0 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Sin Alertas</p>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa datos financieros para recibir alertas.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ============================================
// BADGE HELPER
// ============================================

function CountBadge({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    red: "bg-red-100 text-red-700 border-red-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${
        colorMap[color] || colorMap.amber
      }`}
    >
      {count} {label}
    </span>
  );
}

// ============================================
// BELL BUTTON (para usar en el header)
// ============================================

export function AlertBellButton({
  alertCount,
  hasRed,
  onClick,
}: {
  alertCount: number;
  hasRed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl hover:bg-slate-100 transition-all group"
      aria-label={`${alertCount} alertas`}
    >
      <Bell
        size={20}
        className={`${
          hasRed
            ? "text-red-500 animate-bounce"
            : alertCount > 0
              ? "text-amber-500"
              : "text-slate-400"
        } group-hover:text-slate-600 transition-colors`}
      />
      {alertCount > 0 && (
        <span
          className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-extrabold text-white rounded-full px-1 ${
            hasRed ? "bg-red-500" : "bg-amber-500"
          }`}
        >
          {alertCount > 9 ? "9+" : alertCount}
        </span>
      )}
    </button>
  );
}
