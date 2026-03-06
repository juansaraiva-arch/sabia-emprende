"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Gift, ToggleLeft, ToggleRight } from "lucide-react";
import {
  type PersonalRecord,
  type TipoBonificacion,
  type BonificacionEntry,
  type BonificacionesMes,
  BONUS_TYPES,
  loadBonificaciones,
  saveBonificaciones,
  genId,
} from "@/lib/rrhh-types";

function fmt(n: number): string {
  return n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface BonificacionesTabProps {
  personal: PersonalRecord[];
}

export default function BonificacionesTab({ personal }: BonificacionesTabProps) {
  const [allData, setAllData] = useState<BonificacionesMes[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const activeEmployees = useMemo(
    () => personal.filter((p) => p.tipo_personal === "empleado" && p.estado === "activo"),
    [personal]
  );

  useEffect(() => { setAllData(loadBonificaciones()); }, []);

  useEffect(() => {
    if (activeEmployees.length > 0 && !selectedEmployee) setSelectedEmployee(activeEmployees[0].id);
  }, [activeEmployees, selectedEmployee]);

  const currentPeriod = useMemo(() => {
    return allData.find((d) => d.anio === selectedYear && d.mes === selectedMonth + 1);
  }, [allData, selectedYear, selectedMonth]);

  const employeeEntries = useMemo(() => {
    if (!currentPeriod || !selectedEmployee) return [];
    return currentPeriod.entries.filter((e) => e.personal_id === selectedEmployee);
  }, [currentPeriod, selectedEmployee]);

  const totals = useMemo(() => {
    const gravable = employeeEntries.filter((e) => e.es_gravable).reduce((s, e) => s + e.monto, 0);
    const noGravable = employeeEntries.filter((e) => !e.es_gravable).reduce((s, e) => s + e.monto, 0);
    return { gravable, noGravable, total: gravable + noGravable };
  }, [employeeEntries]);

  const updateData = (updatedEntries: BonificacionEntry[]) => {
    const newData = [...allData];
    const idx = newData.findIndex((d) => d.anio === selectedYear && d.mes === selectedMonth + 1);
    if (idx >= 0) {
      newData[idx] = { ...newData[idx], entries: updatedEntries };
    } else {
      newData.push({ anio: selectedYear, mes: selectedMonth + 1, entries: updatedEntries });
    }
    setAllData(newData);
    saveBonificaciones(newData);
  };

  const addEntry = () => {
    if (!selectedEmployee) return;
    const entry: BonificacionEntry = {
      id: genId(),
      personal_id: selectedEmployee,
      tipo: "productividad",
      descripcion: "",
      monto: 0,
      es_gravable: true,
      fecha: new Date().toISOString().split("T")[0],
    };
    const allEntries = currentPeriod ? [...currentPeriod.entries, entry] : [entry];
    updateData(allEntries);
  };

  const removeEntry = (entryId: string) => {
    if (!currentPeriod) return;
    updateData(currentPeriod.entries.filter((e) => e.id !== entryId));
  };

  const updateEntry = (entryId: string, field: string, value: number | string | boolean) => {
    if (!currentPeriod) return;
    const updated = currentPeriod.entries.map((e) => {
      if (e.id !== entryId) return e;
      const entry = { ...e, [field]: value };
      if (field === "tipo") {
        const tipo = value as TipoBonificacion;
        entry.es_gravable = BONUS_TYPES[tipo].defaultGravable;
      }
      return entry;
    });
    updateData(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Bonificaciones</h3>
          <p className="text-xs text-slate-500">Bonos gravables se suman al devengado bruto; no gravables se suman al neto</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
          {MONTHS.map((m, i) => (<option key={i} value={i}>{m}</option>))}
        </select>
        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
          {[2025, 2026, 2027].map((y) => (<option key={y} value={y}>{y}</option>))}
        </select>
        <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex-1 min-w-[200px]">
          {activeEmployees.map((emp) => (<option key={emp.id} value={emp.id}>{emp.nombre_completo || "Sin nombre"}</option>))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-red-600 uppercase">Gravable (CSS+ISR)</p>
          <p className="text-lg font-bold text-red-800">B/. {fmt(totals.gravable)}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">No Gravable</p>
          <p className="text-lg font-bold text-emerald-800">B/. {fmt(totals.noGravable)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-blue-600 uppercase">Total Bonos</p>
          <p className="text-lg font-bold text-blue-800">B/. {fmt(totals.total)}</p>
        </div>
      </div>

      {/* Entries */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-b border-slate-200">
          <span className="text-sm font-bold text-slate-700">Bonos del Mes</span>
          <button onClick={addEntry} disabled={!selectedEmployee} className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:bg-slate-300">
            <Plus size={14} /> Agregar
          </button>
        </div>

        {employeeEntries.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            <Gift className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Sin bonificaciones para este empleado en {MONTHS[selectedMonth]} {selectedYear}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {employeeEntries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <select value={entry.tipo} onChange={(e) => updateEntry(entry.id, "tipo", e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded text-sm flex-1 min-w-[180px]">
                    {(Object.keys(BONUS_TYPES) as TipoBonificacion[]).map((t) => (
                      <option key={t} value={t}>{BONUS_TYPES[t].label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">B/.</span>
                    <input
                      type="number"
                      value={entry.monto || ""}
                      onChange={(e) => updateEntry(entry.id, "monto", Math.max(0, Number(e.target.value)))}
                      min={0}
                      step={10}
                      className="px-2 py-1.5 border border-slate-200 rounded text-sm w-[100px] text-right"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    onClick={() => updateEntry(entry.id, "es_gravable", !entry.es_gravable)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      entry.es_gravable ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {entry.es_gravable ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {entry.es_gravable ? "Gravable" : "No gravable"}
                  </button>
                  <button onClick={() => removeEntry(entry.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  value={entry.descripcion}
                  onChange={(e) => updateEntry(entry.id, "descripcion", e.target.value)}
                  placeholder="Descripcion (opcional)"
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-600"
                />
                {/* Nota legal para transporte/alimentacion */}
                {(entry.tipo === "transporte" || entry.tipo === "alimentacion") && entry.monto > 100 && (
                  <p className="text-[10px] text-amber-600">
                    Nota: Hasta B/.100/mes es no gravable si esta documentado como beneficio adicional. El excedente (B/. {fmt(entry.monto - 100)}) es gravable.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reference */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-bold text-slate-700 mb-2">Tipos de Bonificacion</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600">
          {(Object.keys(BONUS_TYPES) as TipoBonificacion[]).map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${BONUS_TYPES[t].defaultGravable ? "bg-red-400" : "bg-emerald-400"}`} />
              <span>{BONUS_TYPES[t].label}</span>
              <span className="text-slate-400">— {BONUS_TYPES[t].defaultGravable ? "Gravable" : `No gravable${BONUS_TYPES[t].maxExento ? ` (hasta B/.${BONUS_TYPES[t].maxExento}/mes)` : ""}`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
