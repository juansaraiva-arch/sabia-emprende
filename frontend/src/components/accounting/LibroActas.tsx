"use client";
import React, { useState } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  FileText,
  CheckCircle2,
} from "lucide-react";

// ============================================
// TIPOS
// ============================================

interface Acta {
  id: string;
  numero: number;
  fecha: string;
  tipo: "asamblea_ordinaria" | "asamblea_extraordinaria" | "junta_directiva";
  lugar: string;
  asistentes: string;
  agendaItems: string[];
  resoluciones: string;
  firmas: string;
}

interface LibroActasProps {
  societyId: string;
}

const TIPO_LABELS: Record<Acta["tipo"], string> = {
  asamblea_ordinaria: "Asamblea de Accionistas (Ordinaria)",
  asamblea_extraordinaria: "Asamblea de Accionistas (Extraordinaria)",
  junta_directiva: "Reunion de Junta Directiva",
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function LibroActas({ societyId }: LibroActasProps) {
  const [actas, setActas] = useState<Acta[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // New acta form state
  const [newActa, setNewActa] = useState<Omit<Acta, "id" | "numero">>({
    fecha: new Date().toISOString().split("T")[0],
    tipo: "junta_directiva",
    lugar: "",
    asistentes: "",
    agendaItems: [""],
    resoluciones: "",
    firmas: "",
  });

  const addActa = () => {
    const nextNum = actas.length > 0 ? Math.max(...actas.map((a) => a.numero)) + 1 : 1;
    const acta: Acta = {
      ...newActa,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      numero: nextNum,
    };
    setActas((prev) => [acta, ...prev]);
    setShowForm(false);
    setNewActa({
      fecha: new Date().toISOString().split("T")[0],
      tipo: "junta_directiva",
      lugar: "",
      asistentes: "",
      agendaItems: [""],
      resoluciones: "",
      firmas: "",
    });
  };

  const removeActa = (id: string) => {
    setActas((prev) => prev.filter((a) => a.id !== id));
  };

  const addAgendaItem = () => {
    setNewActa((prev) => ({ ...prev, agendaItems: [...prev.agendaItems, ""] }));
  };

  const updateAgendaItem = (index: number, value: string) => {
    setNewActa((prev) => {
      const items = [...prev.agendaItems];
      items[index] = value;
      return { ...prev, agendaItems: items };
    });
  };

  const removeAgendaItem = (index: number) => {
    setNewActa((prev) => ({
      ...prev,
      agendaItems: prev.agendaItems.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen size={20} className="text-violet-600" />
            Libro de Actas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Registro cronologico de decisiones de Junta Directiva y Asamblea de Accionistas (Codigo de Comercio Panama).
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nueva Acta
        </button>
      </div>

      {/* Formulario de nueva acta */}
      {showForm && (
        <div className="p-5 rounded-2xl border-2 border-violet-200 bg-violet-50/50 space-y-4">
          <h3 className="text-sm font-bold text-violet-800 flex items-center gap-2">
            <FileText size={16} />
            Registrar Acta
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Fecha</label>
              <input
                type="date"
                value={newActa.fecha}
                onChange={(e) => setNewActa((p) => ({ ...p, fecha: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tipo de Reunion</label>
              <select
                value={newActa.tipo}
                onChange={(e) => setNewActa((p) => ({ ...p, tipo: e.target.value as Acta["tipo"] }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
              >
                {Object.entries(TIPO_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Lugar</label>
            <input
              type="text"
              value={newActa.lugar}
              onChange={(e) => setNewActa((p) => ({ ...p, lugar: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
              placeholder="Oficinas de la sociedad, Ciudad de Panama"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Asistentes (nombres y cargos)
            </label>
            <textarea
              value={newActa.asistentes}
              onChange={(e) => setNewActa((p) => ({ ...p, asistentes: e.target.value }))}
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
              placeholder="Juan Perez (Presidente), Maria Garcia (Secretaria), ..."
            />
          </div>

          {/* Agenda */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Orden del Dia</label>
            <div className="space-y-2">
              {newActa.agendaItems.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-xs font-bold text-slate-400 mt-2 w-6">{i + 1}.</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateAgendaItem(i, e.target.value)}
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
                    placeholder="Punto de agenda"
                  />
                  {newActa.agendaItems.length > 1 && (
                    <button onClick={() => removeAgendaItem(i)} className="text-slate-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addAgendaItem}
                className="text-xs font-bold text-violet-600 hover:text-violet-800"
              >
                + Agregar punto
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Resoluciones Aprobadas
            </label>
            <textarea
              value={newActa.resoluciones}
              onChange={(e) => setNewActa((p) => ({ ...p, resoluciones: e.target.value }))}
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
              placeholder="Se aprueba por unanimidad..."
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Firmas (quienes firman el acta)
            </label>
            <input
              type="text"
              value={newActa.firmas}
              onChange={(e) => setNewActa((p) => ({ ...p, firmas: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
              placeholder="Presidente y Secretario"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={addActa}
              disabled={!newActa.resoluciones.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle2 size={16} />
              Guardar Acta
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 text-sm font-bold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de actas */}
      {actas.length === 0 && !showForm && (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">
            No hay actas registradas
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Registra las decisiones de tu Junta Directiva y Asambleas de Accionistas
          </p>
        </div>
      )}

      {actas.map((acta) => (
        <div
          key={acta.id}
          className="rounded-xl border border-slate-200 overflow-hidden bg-white"
        >
          {/* Header - clickable */}
          <button
            onClick={() => setExpandedId(expandedId === acta.id ? null : acta.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 text-violet-600 font-extrabold text-sm">
                #{acta.numero}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">
                  {TIPO_LABELS[acta.tipo]}
                </p>
                <p className="text-[11px] text-slate-500 flex items-center gap-2">
                  <Calendar size={10} />
                  {new Date(acta.fecha).toLocaleDateString("es-PA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {acta.lugar && (
                    <>
                      <span className="text-slate-300">|</span>
                      {acta.lugar}
                    </>
                  )}
                </p>
              </div>
            </div>
            {expandedId === acta.id ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </button>

          {/* Expanded content */}
          {expandedId === acta.id && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
              {acta.asistentes && (
                <div className="pt-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Users size={10} /> Asistentes
                  </p>
                  <p className="text-xs text-slate-700 mt-1">{acta.asistentes}</p>
                </div>
              )}

              {acta.agendaItems.filter((a) => a.trim()).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Orden del Dia</p>
                  <ol className="list-decimal list-inside text-xs text-slate-700 mt-1 space-y-0.5">
                    {acta.agendaItems
                      .filter((a) => a.trim())
                      .map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                  </ol>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Resoluciones</p>
                <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{acta.resoluciones}</p>
              </div>

              {acta.firmas && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Firmas</p>
                  <p className="text-xs text-slate-700 mt-1">{acta.firmas}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => removeActa(acta.id)}
                  className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={12} />
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <p className="text-[10px] text-slate-400 italic">
        Libro de Actas conforme al Codigo de Comercio de Panama. Las sociedades anonimas
        deben mantener un registro cronologico de todas las decisiones tomadas en Junta
        Directiva y Asamblea de Accionistas.
      </p>
    </div>
  );
}
