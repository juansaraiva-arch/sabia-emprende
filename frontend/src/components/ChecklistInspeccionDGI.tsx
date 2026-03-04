"use client";
import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  FileCheck,
  Printer,
  Users,
  AlertTriangle,
  Award,
  Building2,
  ShieldCheck,
} from "lucide-react";

// ============================================
// TIPOS
// ============================================

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  reference: string;
}

interface ChecklistState {
  [key: string]: boolean;
}

const STORAGE_KEY = "midf_dgi_checklist";

// ============================================
// ITEMS DEL CHECKLIST DGI
// ============================================

const DGI_CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "aviso_operacion",
    label: "Aviso de Operacion vigente",
    description: "Documento emitido por el municipio que autoriza la operacion comercial en la direccion registrada.",
    icon: <FileCheck size={20} />,
    reference: "Ley 5 de 2007",
  },
  {
    id: "facturacion_fiscal",
    label: "Sistema de Facturacion Fiscal",
    description: "Equipos fiscales autorizados por la DGI o sistema de factura electronica (SFEP) operativo y al dia.",
    icon: <Printer size={20} />,
    reference: "Decreto Ejecutivo 463 de 2019",
  },
  {
    id: "css_planilla",
    label: "CSS (Caja de Seguro Social)",
    description: "Planilla obrero-patronal al dia. Incluye cuota obrera (9.75%) y patronal (12.25%).",
    icon: <Users size={20} />,
    reference: "Ley 51 de 2005",
  },
  {
    id: "carteles_obligatorios",
    label: "Carteles Obligatorios",
    description: "Lista de precios visible, horario de atencion, senalizacion de No Fumar, y otros carteles requeridos.",
    icon: <AlertTriangle size={20} />,
    reference: "ACODECO / Ley 45 de 2007",
  },
  {
    id: "paz_salvo_municipal",
    label: "Paz y Salvo Municipal",
    description: "Certificado de estar al dia con impuestos y tasas municipales. Requerido para renovaciones.",
    icon: <Award size={20} />,
    reference: "Municipio correspondiente",
  },
  {
    id: "inscripcion_municipal",
    label: "Inscripcion Municipal / Permiso de Operacion",
    description: "Registro vigente ante el municipio con el permiso de operacion comercial correspondiente.",
    icon: <Building2 size={20} />,
    reference: "Ordenanzas municipales",
  },
];

// ============================================
// COMPONENTE
// ============================================

export default function ChecklistInspeccionDGI() {
  const [checklist, setChecklist] = useState<ChecklistState>({});

  // Cargar desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setChecklist(JSON.parse(saved));
      }
    } catch {
      // silently ignore
    }
  }, []);

  // Persistir en localStorage
  const updateItem = (id: string, value: boolean) => {
    const updated = { ...checklist, [id]: value };
    setChecklist(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // silently ignore
    }
  };

  const completedCount = DGI_CHECKLIST_ITEMS.filter((item) => checklist[item.id]).length;
  const totalCount = DGI_CHECKLIST_ITEMS.length;
  const allComplete = completedCount === totalCount;

  return (
    <div className="space-y-5">
      {/* Header con score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${allComplete ? "bg-emerald-100" : "bg-amber-100"}`}>
            <ShieldCheck size={22} className={allComplete ? "text-emerald-600" : "text-amber-600"} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Checklist de Inspeccion DGI
            </h3>
            <p className="text-xs text-slate-500">
              Requisitos obligatorios para operar en Panama
            </p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
          allComplete
            ? "bg-emerald-100 text-emerald-700"
            : completedCount >= totalCount / 2
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
        }`}>
          {completedCount}/{totalCount} cumplidos
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            allComplete ? "bg-emerald-500" : completedCount >= totalCount / 2 ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Items del checklist */}
      <div className="space-y-2">
        {DGI_CHECKLIST_ITEMS.map((item) => {
          const isChecked = !!checklist[item.id];
          return (
            <button
              key={item.id}
              onClick={() => updateItem(item.id, !isChecked)}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                isChecked
                  ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                  : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {/* Toggle indicator */}
              <div className="mt-0.5 flex-shrink-0">
                {isChecked ? (
                  <CheckCircle2 size={22} className="text-emerald-500" />
                ) : (
                  <XCircle size={22} className="text-slate-300" />
                )}
              </div>

              {/* Icon */}
              <div className={`p-2 rounded-lg flex-shrink-0 ${
                isChecked ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
              }`}>
                {item.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${isChecked ? "text-emerald-700" : "text-slate-700"}`}>
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ref: {item.reference}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mensaje de estado */}
      {allComplete && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-700 font-medium">
            Todos los requisitos de inspeccion DGI estan cubiertos. Manten tus documentos actualizados.
          </p>
        </div>
      )}
      {!allComplete && completedCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Tienes {totalCount - completedCount} requisito(s) pendiente(s). Completa todos antes de una inspeccion DGI.
          </p>
        </div>
      )}
    </div>
  );
}
