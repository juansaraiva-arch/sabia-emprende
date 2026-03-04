"use client";
import React, { useState } from "react";
import {
  CalendarDays,
  ShieldAlert,
  ClipboardCheck,
} from "lucide-react";
import MultasDGICalculator from "@/components/MultasDGICalculator";
import ChecklistInspeccionDGI from "@/components/ChecklistInspeccionDGI";

// ============================================
// TIPOS
// ============================================

interface AuditTimelineProps {
  limit?: number;
}

type AuditTab = "calendario" | "multas" | "checklist";

// ============================================
// CONSTANTES
// ============================================

const AUDIT_TABS: { key: AuditTab; label: string; icon: React.ReactNode }[] = [
  { key: "calendario", label: "Calendario Fiscal", icon: <CalendarDays size={14} /> },
  { key: "multas", label: "Simulador Multas", icon: <ShieldAlert size={14} /> },
  { key: "checklist", label: "Checklist DGI", icon: <ClipboardCheck size={14} /> },
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
              {item.mes} {idx === currentMonth && "\u2190 HOY"}
            </p>
            {item.items.map((ob, j) => (
              <p key={j} className="text-slate-500 leading-relaxed">{"\u2022"} {ob}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTE: SIMULADOR DE MULTAS DGI
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
// COMPONENTE PRINCIPAL — Auditoria y DGI
// Default tab: Calendario Fiscal
// ============================================

export default function AuditTimeline({ limit: _limit = 20 }: AuditTimelineProps) {
  const [activeTab, setActiveTab] = useState<AuditTab>("calendario");

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
      {activeTab === "calendario" && <CalendarioFiscal />}
      {activeTab === "multas" && <SimuladorMultas />}
      {activeTab === "checklist" && <ChecklistInspeccionDGI />}
    </div>
  );
}
