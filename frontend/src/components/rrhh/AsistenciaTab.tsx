"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Download, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  type PersonalRecord,
  type TipoAsistencia,
  type RegistroAsistencia,
  ASISTENCIA_TYPES,
  loadAsistencia,
  saveAsistencia,
  genId,
} from "@/lib/rrhh-types";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

interface AsistenciaTabProps {
  personal: PersonalRecord[];
}

export default function AsistenciaTab({ personal }: AsistenciaTabProps) {
  const [allData, setAllData] = useState<RegistroAsistencia[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editTipo, setEditTipo] = useState<TipoAsistencia>("presente");
  const [editHoraEntrada, setEditHoraEntrada] = useState("08:00");
  const [editHoraSalida, setEditHoraSalida] = useState("17:00");
  const [editNotas, setEditNotas] = useState("");

  const activeEmployees = useMemo(
    () => personal.filter((p) => p.tipo_personal === "empleado" && p.estado === "activo"),
    [personal]
  );

  useEffect(() => { setAllData(loadAsistencia()); }, []);

  useEffect(() => {
    if (activeEmployees.length > 0 && !selectedEmployee) setSelectedEmployee(activeEmployees[0].id);
  }, [activeEmployees, selectedEmployee]);

  // Calendar data
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();

  const employeeRecords = useMemo(() => {
    if (!selectedEmployee) return [];
    return allData.filter((r) => {
      const d = new Date(r.fecha);
      return r.personal_id === selectedEmployee && d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [allData, selectedEmployee, selectedYear, selectedMonth]);

  const recordMap = useMemo(() => {
    const map = new Map<number, RegistroAsistencia>();
    employeeRecords.forEach((r) => {
      const day = new Date(r.fecha).getDate();
      map.set(day, r);
    });
    return map;
  }, [employeeRecords]);

  // Stats
  const stats = useMemo(() => {
    const counts: Record<TipoAsistencia, number> = {
      presente: 0,
      ausente_justificada: 0,
      ausente_injustificada: 0,
      tardanza: 0,
      permiso: 0,
      incapacidad: 0,
      feriado: 0,
      vacacion: 0,
    };
    employeeRecords.forEach((r) => { counts[r.tipo]++; });
    let diasLaborables = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const dow = new Date(selectedYear, selectedMonth, i).getDay();
      if (dow !== 0 && dow !== 6) diasLaborables++;
    }
    return { ...counts, diasLaborables, totalRegistros: employeeRecords.length };
  }, [employeeRecords, daysInMonth, selectedYear, selectedMonth]);

  const persist = useCallback((updated: RegistroAsistencia[]) => {
    setAllData(updated);
    saveAsistencia(updated);
  }, []);

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    const existing = recordMap.get(day);
    if (existing) {
      setEditTipo(existing.tipo);
      setEditHoraEntrada(existing.hora_entrada || "08:00");
      setEditHoraSalida(existing.hora_salida || "17:00");
      setEditNotas(existing.notas || "");
    } else {
      // Detect if weekend
      const dow = new Date(selectedYear, selectedMonth, day).getDay();
      setEditTipo(dow === 0 || dow === 6 ? "feriado" : "presente");
      setEditHoraEntrada("08:00");
      setEditHoraSalida("17:00");
      setEditNotas("");
    }
  };

  const saveRecord = () => {
    if (selectedDay === null || !selectedEmployee) return;
    const fecha = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    const existing = recordMap.get(selectedDay);
    if (existing) {
      persist(allData.map((r) => r.id === existing.id
        ? { ...r, tipo: editTipo, hora_entrada: editHoraEntrada, hora_salida: editHoraSalida, notas: editNotas }
        : r
      ));
    } else {
      const nuevo: RegistroAsistencia = {
        id: genId(),
        personal_id: selectedEmployee,
        fecha,
        tipo: editTipo,
        hora_entrada: editHoraEntrada,
        hora_salida: editHoraSalida,
        notas: editNotas,
      };
      persist([...allData, nuevo]);
    }
    setSelectedDay(null);
  };

  const removeRecord = () => {
    if (selectedDay === null) return;
    const existing = recordMap.get(selectedDay);
    if (existing) {
      persist(allData.filter((r) => r.id !== existing.id));
    }
    setSelectedDay(null);
  };

  // Quick-fill: mark all weekdays as "presente"
  const fillAllPresente = () => {
    if (!selectedEmployee) return;
    const newRecords = [...allData];
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(selectedYear, selectedMonth, day).getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      if (recordMap.has(day)) continue; // don't overwrite existing
      const fecha = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      newRecords.push({
        id: genId(),
        personal_id: selectedEmployee,
        fecha,
        tipo: "presente",
        hora_entrada: "08:00",
        hora_salida: "17:00",
        notas: "",
      });
    }
    persist(newRecords);
  };

  // CSV export
  const exportCSV = () => {
    const emp = activeEmployees.find((e) => e.id === selectedEmployee);
    const empName = emp?.nombre_completo || "empleado";
    const header = "Fecha,Tipo,Hora Entrada,Hora Salida,Notas\n";
    const rows = employeeRecords
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((r) => `${r.fecha},${ASISTENCIA_TYPES[r.tipo].label},${r.hora_entrada || ""},${r.hora_salida || ""},"${r.notas || ""}"`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `asistencia_${empName.replace(/\s+/g, "_")}_${MONTHS[selectedMonth]}_${selectedYear}.csv`;
    link.click();
  };

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
    else setSelectedMonth(selectedMonth - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
    else setSelectedMonth(selectedMonth + 1);
    setSelectedDay(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Control de Asistencia</h3>
          <p className="text-xs text-slate-500">Registro diario por empleado — calendario mensual</p>
        </div>
      </div>

      {/* Employee selector + actions */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedEmployee}
          onChange={(e) => { setSelectedEmployee(e.target.value); setSelectedDay(null); }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex-1 min-w-[200px]"
        >
          {activeEmployees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.nombre_completo || "Sin nombre"}</option>
          ))}
        </select>
        <button onClick={fillAllPresente} disabled={!selectedEmployee} className="px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:bg-slate-300" title="Marcar todos los dias laborables como presente">
          Llenar Presente
        </button>
        <button onClick={exportCSV} disabled={employeeRecords.length === 0} className="flex items-center gap-1 px-3 py-2 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700 disabled:bg-slate-300">
          <Download size={14} /> CSV
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div className="bg-emerald-50 rounded-lg p-2 text-center">
          <p className="text-[9px] font-bold text-emerald-600 uppercase">Presente</p>
          <p className="text-lg font-bold text-emerald-800">{stats.presente}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-2 text-center">
          <p className="text-[9px] font-bold text-yellow-600 uppercase">Tardanzas</p>
          <p className="text-lg font-bold text-yellow-800">{stats.tardanza}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <p className="text-[9px] font-bold text-red-600 uppercase">Faltas Inj.</p>
          <p className="text-lg font-bold text-red-800">{stats.ausente_injustificada}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <p className="text-[9px] font-bold text-amber-600 uppercase">Faltas Just.</p>
          <p className="text-lg font-bold text-amber-800">{stats.ausente_justificada}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <p className="text-[9px] font-bold text-purple-600 uppercase">Incapacidad</p>
          <p className="text-lg font-bold text-purple-800">{stats.incapacidad}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <p className="text-[9px] font-bold text-blue-600 uppercase">Vacacion</p>
          <p className="text-lg font-bold text-blue-800">{stats.vacacion}</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {/* Calendar header */}
        <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-b border-slate-200">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-200 rounded">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-slate-700">{MONTHS[selectedMonth]} {selectedYear}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-200 rounded">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {DAYS_SHORT.map((d) => (
            <div key={d} className="text-center py-1 text-[10px] font-bold text-slate-500 bg-slate-50">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 border-b border-r border-slate-100 bg-slate-50" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const record = recordMap.get(day);
            const dow = new Date(selectedYear, selectedMonth, day).getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isToday = day === new Date().getDate() && selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();
            const isSelected = selectedDay === day;
            const typeInfo = record ? ASISTENCIA_TYPES[record.tipo] : null;

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`h-16 border-b border-r border-slate-100 p-1 text-left transition-all hover:bg-blue-50 ${
                  isWeekend && !record ? "bg-slate-50" : "bg-white"
                } ${isSelected ? "ring-2 ring-teal-500 ring-inset" : ""} ${isToday ? "ring-1 ring-blue-400 ring-inset" : ""}`}
              >
                <span className={`text-[10px] font-bold ${isToday ? "text-blue-600" : isWeekend ? "text-slate-400" : "text-slate-700"}`}>
                  {day}
                </span>
                {typeInfo && (
                  <div className={`mt-0.5 px-1 py-0.5 rounded text-center ${typeInfo.bgColor}`}>
                    <span className={`text-[9px] font-bold ${typeInfo.color}`}>{typeInfo.short}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day editor */}
      {selectedDay !== null && (
        <div className="border border-teal-200 bg-teal-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-bold text-teal-800">
            {selectedDay} de {MONTHS[selectedMonth]} {selectedYear}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Tipo de Asistencia</label>
              <select value={editTipo} onChange={(e) => setEditTipo(e.target.value as TipoAsistencia)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {(Object.keys(ASISTENCIA_TYPES) as TipoAsistencia[]).map((t) => (
                  <option key={t} value={t}>{ASISTENCIA_TYPES[t].label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-600">Hora Entrada</label>
                <input type="time" value={editHoraEntrada} onChange={(e) => setEditHoraEntrada(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600">Hora Salida</label>
                <input type="time" value={editHoraSalida} onChange={(e) => setEditHoraSalida(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-600">Notas</label>
            <input type="text" value={editNotas} onChange={(e) => setEditNotas(e.target.value)} placeholder="Observaciones..." className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div className="flex gap-2 justify-end">
            {recordMap.has(selectedDay) && (
              <button onClick={removeRecord} className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800">Eliminar</button>
            )}
            <button onClick={() => setSelectedDay(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
            <button onClick={saveRecord} className="px-4 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700">Guardar</button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-bold text-slate-700 mb-2">Leyenda</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(ASISTENCIA_TYPES) as TipoAsistencia[]).map((t) => {
            const info = ASISTENCIA_TYPES[t];
            return (
              <div key={t} className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${info.bgColor} ${info.color}`}>{info.short}</span>
                <span className="text-xs text-slate-600">{info.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
