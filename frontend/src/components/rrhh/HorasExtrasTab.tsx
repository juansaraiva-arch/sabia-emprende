"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, AlertTriangle, Clock } from "lucide-react";
import {
  type PersonalRecord,
  type TipoHoraExtra,
  type HoraExtraEntry,
  type HorasExtrasMes,
  OVERTIME_TYPES,
  calcularTarifaHoraBase,
  calcularMontoHoraExtra,
  loadHorasExtras,
  saveHorasExtras,
  genId,
} from "@/lib/rrhh-types";

// ============================================
// HELPERS
// ============================================

function fmt(n: number): string {
  return n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ============================================
// PROPS
// ============================================

interface HorasExtrasTabProps {
  personal: PersonalRecord[];
}

// ============================================
// COMPONENT
// ============================================

export default function HorasExtrasTab({ personal }: HorasExtrasTabProps) {
  const [allData, setAllData] = useState<HorasExtrasMes[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const activeEmployees = useMemo(
    () => personal.filter((p) => p.tipo_personal === "empleado" && p.estado === "activo"),
    [personal]
  );

  useEffect(() => {
    setAllData(loadHorasExtras());
  }, []);

  useEffect(() => {
    if (activeEmployees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(activeEmployees[0].id);
    }
  }, [activeEmployees, selectedEmployee]);

  const currentPeriod = useMemo(() => {
    return allData.find((d) => d.anio === selectedYear && d.mes === selectedMonth + 1);
  }, [allData, selectedYear, selectedMonth]);

  const employeeEntries = useMemo(() => {
    if (!currentPeriod || !selectedEmployee) return [];
    return currentPeriod.entries.filter((e) => e.personal_id === selectedEmployee);
  }, [currentPeriod, selectedEmployee]);

  const selectedEmp = useMemo(
    () => activeEmployees.find((e) => e.id === selectedEmployee),
    [activeEmployees, selectedEmployee]
  );

  const tarifaBase = selectedEmp ? calcularTarifaHoraBase(selectedEmp.salario_mensual) : 0;

  // Alertas de limites legales
  const weeklyHours = useMemo(() => {
    return employeeEntries.reduce((sum, e) => sum + e.horas, 0);
  }, [employeeEntries]);

  const totalMontoMes = useMemo(() => {
    return employeeEntries.reduce((sum, e) => sum + e.monto, 0);
  }, [employeeEntries]);

  // Total general de todos los empleados para el periodo
  const totalGeneral = useMemo(() => {
    if (!currentPeriod) return 0;
    return currentPeriod.entries.reduce((sum, e) => sum + e.monto, 0);
  }, [currentPeriod]);

  const updateData = (updatedEntries: HoraExtraEntry[]) => {
    const newData = [...allData];
    const idx = newData.findIndex((d) => d.anio === selectedYear && d.mes === selectedMonth + 1);
    if (idx >= 0) {
      newData[idx] = { ...newData[idx], entries: updatedEntries };
    } else {
      newData.push({ anio: selectedYear, mes: selectedMonth + 1, entries: updatedEntries });
    }
    setAllData(newData);
    saveHorasExtras(newData);
  };

  const addEntry = () => {
    if (!selectedEmployee) return;
    const entry: HoraExtraEntry = {
      id: genId(),
      personal_id: selectedEmployee,
      fecha: new Date().toISOString().split("T")[0],
      tipo: "diurna",
      horas: 1,
      tarifa_hora_base: tarifaBase,
      recargo_pct: OVERTIME_TYPES.diurna.surcharge,
      monto: calcularMontoHoraExtra(1, tarifaBase, OVERTIME_TYPES.diurna.surcharge),
    };
    const allEntries = currentPeriod ? [...currentPeriod.entries, entry] : [entry];
    updateData(allEntries);
  };

  const removeEntry = (entryId: string) => {
    if (!currentPeriod) return;
    updateData(currentPeriod.entries.filter((e) => e.id !== entryId));
  };

  const updateEntry = (entryId: string, field: string, value: number | string) => {
    if (!currentPeriod) return;
    const updated = currentPeriod.entries.map((e) => {
      if (e.id !== entryId) return e;
      const entry = { ...e, [field]: value };
      if (field === "tipo") {
        const tipo = value as TipoHoraExtra;
        entry.recargo_pct = OVERTIME_TYPES[tipo].surcharge;
        entry.monto = calcularMontoHoraExtra(entry.horas, entry.tarifa_hora_base, entry.recargo_pct);
      }
      if (field === "horas") {
        entry.monto = calcularMontoHoraExtra(value as number, entry.tarifa_hora_base, entry.recargo_pct);
      }
      return entry;
    });
    updateData(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Horas Extras</h3>
          <p className="text-xs text-slate-500">Ley 44 de 1995 — Codigo de Trabajo de Panama</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex-1 min-w-[200px]"
        >
          {activeEmployees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.nombre_completo || "Sin nombre"}</option>
          ))}
        </select>
      </div>

      {/* Info cards */}
      {selectedEmp && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-[10px] font-bold text-blue-600 uppercase">Salario Mensual</p>
            <p className="text-lg font-bold text-blue-800">B/. {fmt(selectedEmp.salario_mensual)}</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3">
            <p className="text-[10px] font-bold text-indigo-600 uppercase">Tarifa Hora</p>
            <p className="text-lg font-bold text-indigo-800">B/. {fmt(tarifaBase)}</p>
            <p className="text-[9px] text-indigo-500">Salario / 240 horas</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-[10px] font-bold text-amber-600 uppercase">Total Horas Mes</p>
            <p className="text-lg font-bold text-amber-800">{fmt(weeklyHours)} h</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Monto</p>
            <p className="text-lg font-bold text-emerald-800">B/. {fmt(totalMontoMes)}</p>
          </div>
        </div>
      )}

      {/* Legal alert */}
      {weeklyHours > 36 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">Limite legal excedido</p>
            <p className="text-xs text-red-600">
              Este empleado tiene {fmt(weeklyHours)} horas extras en el mes.
              Maximo legal: 9 horas por semana (~36/mes). Consulta con tu abogado laboral.
            </p>
          </div>
        </div>
      )}

      {/* Entries table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-b border-slate-200">
          <span className="text-sm font-bold text-slate-700">Registros del Mes</span>
          <button
            onClick={addEntry}
            disabled={!selectedEmployee}
            className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:bg-slate-300"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {employeeEntries.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Sin horas extras registradas para este empleado en {MONTHS[selectedMonth]} {selectedYear}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {employeeEntries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={entry.fecha}
                  onChange={(e) => updateEntry(entry.id, "fecha", e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded text-sm w-[140px]"
                />
                <select
                  value={entry.tipo}
                  onChange={(e) => updateEntry(entry.id, "tipo", e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded text-sm flex-1 min-w-[180px]"
                >
                  {(Object.keys(OVERTIME_TYPES) as TipoHoraExtra[]).map((t) => (
                    <option key={t} value={t}>
                      {OVERTIME_TYPES[t].label} (+{OVERTIME_TYPES[t].surcharge}%)
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={entry.horas}
                    onChange={(e) => updateEntry(entry.id, "horas", Math.max(0.5, Number(e.target.value)))}
                    min={0.5}
                    max={24}
                    step={0.5}
                    className="px-2 py-1.5 border border-slate-200 rounded text-sm w-[70px] text-right"
                  />
                  <span className="text-xs text-slate-500">hrs</span>
                </div>
                <div className="text-right min-w-[100px]">
                  <p className="text-sm font-bold text-emerald-700">B/. {fmt(entry.monto)}</p>
                  <p className="text-[9px] text-slate-400">{fmt(entry.horas)} × B/.{fmt(entry.tarifa_hora_base)} × {(1 + entry.recargo_pct / 100).toFixed(2)}</p>
                </div>
                <button onClick={() => removeEntry(entry.id)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen general */}
      {totalGeneral > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <h4 className="text-sm font-bold text-teal-800 mb-2">Resumen General — {MONTHS[selectedMonth]} {selectedYear}</h4>
          <p className="text-xs text-teal-600">
            Total horas extras todos los empleados: <span className="font-bold">B/. {fmt(totalGeneral)}</span>
          </p>
          <p className="text-[10px] text-teal-500 mt-1">
            Este monto se suma al devengado bruto de cada empleado en la Planilla antes de calcular CSS e ISR.
          </p>
        </div>
      )}

      {/* Referencia legal */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-bold text-slate-700 mb-2">Referencia Legal — Ley 44 de 1995</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
          <div>Hora extra diurna (6am-6pm, dia laborable): <span className="font-bold">+25%</span></div>
          <div>Hora extra nocturna (6pm-6am): <span className="font-bold">+50%</span></div>
          <div>Hora en dia de descanso semanal: <span className="font-bold">+50%</span></div>
          <div>Hora nocturna en descanso: <span className="font-bold">+75%</span></div>
          <div>Hora en feriado nacional: <span className="font-bold">+150%</span></div>
          <div className="text-amber-600">Maximo: 3 horas/dia, 9 horas/semana</div>
        </div>
      </div>
    </div>
  );
}
