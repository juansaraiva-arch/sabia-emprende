"use client";
import React, { useEffect, useState } from "react";
import {
  History,
  Brain,
  FileEdit,
  AlertTriangle,
  CalendarDays,
  ShieldAlert,
  ClipboardCheck,
} from "lucide-react";
import { auditApi } from "@/lib/api";
import MultasDGICalculator from "@/components/MultasDGICalculator";
import ChecklistInspeccionDGI from "@/components/ChecklistInspeccionDGI";

// ============================================
// TIPOS
// ============================================

interface AuditTimelineProps {
  limit?: number;
}

type AuditTab = "registro" | "calendario" | "multas" | "checklist";

// ============================================
// CONSTANTES
// ============================================

const ACTION_ICONS: Record<string, React.ReactNode> = {
  financial_record_created: <FileEdit size={14} className="text-emerald-600" />,
  financial_record_updated: <FileEdit size={14} className="text-blue-600" />,
  financial_record_deleted: <AlertTriangle size={14} className="text-red-600" />,
  nlp_query_executed: <Brain size={14} className="text-purple-600" />,
  assumption_changed: <AlertTriangle size={14} className="text-amber-600" />,
  simulation_run: <History size={14} className="text-slate-600" />,
};

const AUDIT_TABS: { key: AuditTab; label: string; icon: React.ReactNode }[] = [
  { key: "registro", label: "Registro", icon: <History size={14} /> },
  { key: "calendario", label: "Calendario Fiscal", icon: <CalendarDays size={14} /> },
  { key: "multas", label: "Simulador Multas", icon: <ShieldAlert size={14} /> },
  { key: "checklist", label: "Checklist DGI", icon: <ClipboardCheck size={14} /> },
];

// Logs de ejemplo para demo mode
const DEMO_LOGS = [
  { id: "d1", action_type: "financial_record_created", action_description: "Registro financiero creado — Diagnostico Flash", user_id: "demo-user-001", created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "d2", action_type: "nlp_query_executed", action_description: "Consulta NLP procesada", nlp_raw_input: "Como esta mi negocio?", user_id: "demo-user-001", created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: "d3", action_type: "simulation_run", action_description: "Simulacion estrategica — Escenario de crecimiento", user_id: "demo-user-001", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "d4", action_type: "financial_record_updated", action_description: "Datos financieros actualizados — Enero 2026", user_id: "demo-user-001", created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: "d5", action_type: "assumption_changed", action_description: "Supuesto modificado: Tasa de crecimiento", field_changed: "growth_rate", previous_value: "3%", new_value: "5%", user_id: "demo-user-001", created_at: new Date(Date.now() - 259200000).toISOString() },
];

// ============================================
// OBLIGACIONES FISCALES PANAMA 2026
// ============================================

const OBLIGACIONES_CALENDARIO = [
  { mes: "Enero", items: ["Declaracion ISR (si aplica)", "Planilla CSS (dic anterior)"] },
  { mes: "Febrero", items: ["Planilla CSS (ene)"] },
  { mes: "Marzo", items: ["Tasa Unica (si aniversario)", "Planilla CSS (feb)", "Declaracion ITBMS trimestral (Q4)"] },
  { mes: "Abril", items: ["Planilla CSS (mar)"] },
  { mes: "Mayo", items: ["Planilla CSS (abr)"] },
  { mes: "Junio", items: ["Planilla CSS (may)", "Declaracion ITBMS trimestral (Q1)", "Informe Agente Residente"] },
  { mes: "Julio", items: ["Planilla CSS (jun)"] },
  { mes: "Agosto", items: ["Planilla CSS (jul)"] },
  { mes: "Septiembre", items: ["Planilla CSS (ago)", "Declaracion ITBMS trimestral (Q2)"] },
  { mes: "Octubre", items: ["Planilla CSS (sep)"] },
  { mes: "Noviembre", items: ["Planilla CSS (oct)"] },
  { mes: "Diciembre", items: ["Planilla CSS (nov)", "Declaracion ITBMS trimestral (Q3)", "Renovacion Aviso Operaciones"] },
];

// ============================================
// SUB-COMPONENTE: REGISTRO DE SESION (audit logs)
// ============================================

function AuditLogList({ limit }: { limit: number }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditApi
      .getLogs(limit)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setLogs(res.data);
        } else {
          setLogs(DEMO_LOGS.slice(0, limit));
        }
      })
      .catch(() => setLogs(DEMO_LOGS.slice(0, limit)))
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">
        <History size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay actividad registrada aun.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <History size={18} className="text-slate-600" />
        <h3 className="font-bold text-slate-800 text-sm">
          Registro de Sesion (Audit Log)
        </h3>
      </div>

      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all"
        >
          <div className="mt-0.5">
            {ACTION_ICONS[log.action_type] || (
              <History size={14} className="text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 truncate">
              {log.action_description}
            </p>
            {log.nlp_raw_input && (
              <p className="text-xs text-purple-500 mt-1 italic">
                &quot;{log.nlp_raw_input}&quot;
              </p>
            )}
            {log.field_changed && (
              <p className="text-xs text-slate-400 mt-1">
                {log.field_changed}: {log.previous_value} &rarr;{" "}
                {log.new_value}
              </p>
            )}
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap">
            {new Date(log.created_at).toLocaleString("es-PA", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// SUB-COMPONENTE: CALENDARIO FISCAL
// ============================================

function CalendarioFiscal() {
  const currentMonth = new Date().getMonth();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays size={18} className="text-blue-600" />
        <h3 className="font-bold text-slate-800 text-sm">
          Calendario Fiscal Panama 2026
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {OBLIGACIONES_CALENDARIO.map((item, idx) => (
          <div
            key={item.mes}
            className={`p-2.5 rounded-lg border text-[10px] ${
              idx === currentMonth
                ? "bg-violet-50 border-violet-300 ring-2 ring-violet-200"
                : "bg-white border-slate-200"
            }`}
          >
            <p className={`font-bold mb-1 ${idx === currentMonth ? "text-violet-700" : "text-slate-600"}`}>
              {item.mes} {idx === currentMonth && "← HOY"}
            </p>
            {item.items.map((ob, j) => (
              <p key={j} className="text-slate-500 leading-relaxed">• {ob}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTE: SIMULADOR DE MULTAS
// ============================================

function SimuladorMultas() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert size={18} className="text-red-600" />
        <h3 className="font-bold text-slate-800 text-sm">
          Simulador de Multas DGI
        </h3>
      </div>
      <MultasDGICalculator />
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL (Dashboard con subtabs)
// ============================================

export default function AuditTimeline({ limit = 20 }: AuditTimelineProps) {
  const [activeTab, setActiveTab] = useState<AuditTab>("registro");

  return (
    <div className="space-y-4">
      {/* Mini-tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1">
        {AUDIT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido condicional */}
      {activeTab === "registro" && <AuditLogList limit={limit} />}
      {activeTab === "calendario" && <CalendarioFiscal />}
      {activeTab === "multas" && <SimuladorMultas />}
      {activeTab === "checklist" && <ChecklistInspeccionDGI />}
    </div>
  );
}
