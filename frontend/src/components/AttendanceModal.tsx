"use client";
import React, { useState } from "react";
import {
  X,
  Calendar,
  Umbrella,
  AlertTriangle,
  PartyPopper,
  Sun,
  Clock,
} from "lucide-react";

interface AttendanceModalProps {
  employeeId: string;
  employeeName: string;
  societyId: string;
  onClose: () => void;
  onSave: (record: AttendanceRecord) => void;
}

export interface AttendanceRecord {
  payroll_entry_id: string;
  society_id: string;
  record_date: string;
  record_type: string;
  hours: number;
  surcharge_pct: number;
  notes: string;
}

const RECORD_TYPES = [
  {
    value: "vacation_taken",
    label: "Vacacion Tomada",
    icon: <Umbrella size={14} />,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    value: "justified_absence",
    label: "Falta Justificada",
    icon: <Calendar size={14} />,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    value: "unjustified_absence",
    label: "Falta Injustificada",
    icon: <AlertTriangle size={14} />,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  {
    value: "holiday_worked",
    label: "Feriado Trabajado",
    icon: <PartyPopper size={14} />,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    value: "sunday_worked",
    label: "Domingo Trabajado",
    icon: <Sun size={14} />,
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  {
    value: "compensatory_day",
    label: "Dia Compensatorio",
    icon: <Clock size={14} />,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
];

export default function AttendanceModal({
  employeeId,
  employeeName,
  societyId,
  onClose,
  onSave,
}: AttendanceModalProps) {
  const [recordType, setRecordType] = useState("vacation_taken");
  const [recordDate, setRecordDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [hours, setHours] = useState(8);
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    const selected = RECORD_TYPES.find((t) => t.value === recordType);
    if (!selected) return;

    // Surcharge based on type
    let surcharge = 0;
    if (recordType === "holiday_worked") surcharge = 150;
    if (recordType === "sunday_worked") surcharge = 50;

    onSave({
      payroll_entry_id: employeeId,
      society_id: societyId,
      record_date: recordDate,
      record_type: recordType,
      hours,
      surcharge_pct: surcharge,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Registrar Asistencia
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {employeeName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Tipo de registro */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">
              Tipo de Registro
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RECORD_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setRecordType(type.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-medium transition-all ${
                    recordType === type.value
                      ? `${type.color} ring-2 ring-offset-1 ring-current`
                      : "text-slate-500 bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
              Fecha
            </label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* Horas */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
              Horas
            </label>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
              min={0}
              max={24}
              step={0.5}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: Cita medica, feriado nacional..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none placeholder:text-slate-300"
            />
          </div>

          {/* Info box */}
          {recordType === "unjustified_absence" && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-[10px] text-red-700">
                Las faltas injustificadas generan deduccion proporcional del
                salario diario y reducen la base para CSS/SE.
              </p>
            </div>
          )}
          {(recordType === "holiday_worked" ||
            recordType === "sunday_worked") && (
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-[10px] text-purple-700">
                {recordType === "holiday_worked"
                  ? "Recargo del 150% sobre salario diario (Codigo de Trabajo PTY)."
                  : "Recargo del 50% sobre salario diario (Codigo de Trabajo PTY)."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Guardar Registro
          </button>
        </div>
      </div>
    </div>
  );
}
