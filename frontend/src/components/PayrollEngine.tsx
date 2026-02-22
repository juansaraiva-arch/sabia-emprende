"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  UserPlus,
  Trash2,
  DollarSign,
  Users,
  AlertTriangle,
  TrendingDown,
  Shield,
  Calendar,
  Info,
  ClipboardList,
  Gift,
  Briefcase,
  LogOut,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import SmartTooltip from "@/components/SmartTooltip";
import AttendanceModal, {
  type AttendanceRecord,
} from "@/components/AttendanceModal";
import { payrollApi } from "@/lib/api";

// ============================================
// TYPES
// ============================================

type ContractType = "planilla" | "freelance";

interface Employee {
  id: string;
  society_id: string;
  employee_name: string;
  contract_type: string;
  gross_salary: number;
  years_worked: number;
  cedula?: string;
  entry_date?: string;
  exit_date?: string;
  exit_reason?: string;
  vacation_days_accrued: number;
  vacation_days_taken: number;
  xiii_mes_accumulated: number;
  employer_cost: number;
  employee_net: number;
  total_deductions: number;
  carga_patronal_pct: number;
  breakdown: Record<string, number>;
  is_active: boolean;
}

interface PayrollEngineProps {
  societyId: string;
}

// ============================================
// LOCAL CALCULATION (fallback when no API)
// ============================================

function calcularISR(salario: number): number {
  if (salario <= 846.15) return 0;
  if (salario <= 1538.46) return (salario - 846.15) * 0.15;
  let isr = (1538.46 - 846.15) * 0.15;
  isr += (salario - 1538.46) * 0.25;
  return isr;
}

function calcularCargaLocal(
  salario: number,
  tipo: string,
  years: number
): { employerCost: number; employeeNet: number; totalDeductions: number; cargaPatronalPct: number; breakdown: Record<string, number> } {
  if (salario <= 0) {
    return { employerCost: 0, employeeNet: 0, totalDeductions: 0, cargaPatronalPct: 0, breakdown: {} };
  }

  if (tipo === "planilla" || tipo === "payroll") {
    const ssP = salario * 0.1325;
    const seP = salario * 0.015;
    const rpP = salario * 0.015;
    const decimo = salario / 12;
    const vac = salario * 0.0909;          // 9.09% — 30 dias por cada 11 meses laborados
    const cesantia = salario * 0.0225;     // 2.25% — Fondo de Cesantia (Prima + Indemnizacion)
    const prima = years > 0 ? (salario / 4) / 12 : 0;
    const carga = ssP + seP + rpP + decimo + vac + cesantia + prima;

    const ssE = salario * 0.0975;
    const seE = salario * 0.0125;
    const isrE = calcularISR(salario);
    const totalDed = ssE + seE + isrE;

    return {
      employerCost: r2(salario + carga),
      employeeNet: r2(salario - totalDed),
      totalDeductions: r2(totalDed),
      cargaPatronalPct: r2((carga / salario) * 100),
      breakdown: {
        "CSS Patronal (13.25%)": r2(ssP),
        "Seguro Educativo Patr. (1.50%)": r2(seP),
        "Riesgos Prof. (1.50%)": r2(rpP),
        "Fondo Cesantia (2.25%)": r2(cesantia),
        "Prov. XIII Mes (8.33%)": r2(decimo),
        "Prov. Vacaciones (9.09%)": r2(vac),
        "Prov. Prima Antiguedad": r2(prima),
        "CSS Empleado (9.75%)": r2(ssE),
        "SE Empleado (1.25%)": r2(seE),
        "ISR Empleado (Tabla DGI)": r2(isrE),
      },
    };
  }

  // Freelance
  const ret = salario * 0.1;
  return {
    employerCost: r2(salario),
    employeeNet: r2(salario - ret),
    totalDeductions: r2(ret),
    cargaPatronalPct: 0,
    breakdown: { "Retencion ISR (10%)": r2(ret) },
  };
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PayrollEngine({ societyId }: PayrollEngineProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendanceModal, setAttendanceModal] = useState<{
    employeeId: string;
    employeeName: string;
  } | null>(null);
  const [xiiiMes, setXiiiMes] = useState<any>(null);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});

  // Load employees from API
  const loadEmployees = useCallback(async () => {
    if (!societyId) return;
    try {
      setLoading(true);
      const res = await payrollApi.listEmployees(societyId, false);
      if (res.data && res.data.length > 0) {
        setEmployees(res.data);
      }
      // Si data es vacio, mantener estado local (demo mode)
    } catch {
      // Fallback: keep current local state
    } finally {
      setLoading(false);
    }
  }, [societyId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Load XIII Mes
  const loadXIIIMes = useCallback(async () => {
    if (!societyId) return;
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      // Tercios: Ene-Abr (1-4), May-Ago (5-8), Sep-Dic (9-12)
      let monthsInTercio: number;
      if (month <= 4) monthsInTercio = month;
      else if (month <= 8) monthsInTercio = month - 4;
      else monthsInTercio = month - 8;
      const res = await payrollApi.getXIIIMes(societyId, monthsInTercio);
      setXiiiMes(res);
    } catch {
      // Ignore
    }
  }, [societyId]);

  useEffect(() => {
    loadXIIIMes();
  }, [loadXIIIMes]);

  // Load attendance counts (unjustified absences for current month)
  const loadAttendanceCounts = useCallback(async () => {
    if (!societyId || employees.length === 0) return;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const counts: Record<string, number> = {};
    for (const emp of employees) {
      try {
        const res = await payrollApi.listAttendance(societyId, emp.id);
        const records = res?.data || res || [];
        const unjustified = Array.isArray(records)
          ? records.filter((r: any) => r.record_type === "unjustified_absence").length
          : 0;
        if (unjustified > 0) counts[emp.id] = unjustified;
      } catch {
        // Ignore — no attendance data
      }
    }
    setAttendanceCounts(counts);
  }, [societyId, employees]);

  useEffect(() => {
    loadAttendanceCounts();
  }, [loadAttendanceCounts]);

  /** Salario ajustado por faltas injustificadas: (Base/30) * (30 - Faltas) */
  function salarioAjustado(empId: string, salarioBase: number): number {
    const faltas = attendanceCounts[empId] || 0;
    if (faltas > 0) return r2((salarioBase / 30) * (30 - faltas));
    return salarioBase;
  }

  // Computed totals
  const totals = useMemo(() => {
    const active = employees.filter((e) => e.is_active);
    const totalGross = active.reduce((s, e) => s + (e.gross_salary || 0), 0);
    const totalEmployerCost = active.reduce((s, e) => {
      const adj = salarioAjustado(e.id, e.gross_salary);
      const calc = calcularCargaLocal(adj, e.contract_type, e.years_worked).employerCost;
      return s + calc;
    }, 0);
    const totalNet = active.reduce((s, e) => {
      const adj = salarioAjustado(e.id, e.gross_salary);
      const calc = calcularCargaLocal(adj, e.contract_type, e.years_worked).employeeNet;
      return s + calc;
    }, 0);

    const planillaCount = active.filter(
      (e) => e.contract_type === "planilla" || e.contract_type === "payroll"
    ).length;
    const freelanceCount = active.filter(
      (e) => e.contract_type === "freelance"
    ).length;

    return {
      totalGross: r2(totalGross),
      totalEmployerCost: r2(totalEmployerCost),
      totalNet: r2(totalNet),
      hiddenCost: r2(totalEmployerCost - totalGross),
      planillaCount,
      freelanceCount,
      costoAnual: r2(totalEmployerCost * 12),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, attendanceCounts]);

  // Chart data
  const chartData = useMemo(() => {
    return employees
      .filter((e) => e.is_active)
      .map((e) => {
        const adj = salarioAjustado(e.id, e.gross_salary);
        const calc = calcularCargaLocal(
          adj,
          e.contract_type,
          e.years_worked
        );
        return {
          name:
            (e.employee_name || "").length > 12
              ? e.employee_name.substring(0, 12) + "..."
              : e.employee_name || "Sin nombre",
          "Costo Empresa": calc.employerCost,
          "Neto Empleado": calc.employeeNet,
          Bruto: adj,
        };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, attendanceCounts]);

  // Selected detail
  const selectedDetail = useMemo(() => {
    if (!selectedId) return null;
    const emp = employees.find((e) => e.id === selectedId);
    if (!emp) return null;
    const adj = salarioAjustado(emp.id, emp.gross_salary);
    const faltas = attendanceCounts[emp.id] || 0;
    const calc = calcularCargaLocal(
      adj,
      emp.contract_type,
      emp.years_worked
    );
    return {
      ...emp,
      salario_ajustado: adj,
      faltas_injustificadas: faltas,
      employer_cost: calc.employerCost,
      employee_net: calc.employeeNet,
      total_deductions: calc.totalDeductions,
      carga_patronal_pct: calc.cargaPatronalPct,
      breakdown: calc.breakdown,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, employees, attendanceCounts]);

  // ---- HANDLERS ----

  const addLocalEmployee = () => {
    setEmployees((prev) => [
      ...prev,
      {
        id: generateId(),
        society_id: societyId,
        employee_name: "",
        contract_type: "payroll",
        gross_salary: 0,
        years_worked: 0,
        vacation_days_accrued: 0,
        vacation_days_taken: 0,
        xiii_mes_accumulated: 0,
        employer_cost: 0,
        employee_net: 0,
        total_deductions: 0,
        carga_patronal_pct: 0,
        breakdown: {},
        is_active: true,
      },
    ]);
  };

  const addEmployee = async () => {
    setSaving(true);
    try {
      const res = await payrollApi.createEmployee({
        society_id: societyId,
        employee_name: "",
        contract_type: "payroll",
        gross_salary: 0,
        years_worked: 0,
      });
      // Verificar que el backend realmente creo el empleado
      if (res.data && !Array.isArray(res.data) && res.data.id) {
        await loadEmployees();
      } else {
        // Demo mode: API retorna exito pero sin datos reales
        addLocalEmployee();
      }
    } catch {
      // Backend no disponible — fallback local
      addLocalEmployee();
    } finally {
      setSaving(false);
    }
  };

  const removeEmployee = async (id: string) => {
    try {
      await payrollApi.deleteEmployee(societyId, id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  };

  const updateEmployee = async (
    id: string,
    field: string,
    value: string | number
  ) => {
    // Update local state immediately for responsiveness
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );

    // Debounced API update
    try {
      const apiField =
        field === "contractType"
          ? "contract_type"
          : field === "grossSalary"
          ? "gross_salary"
          : field === "yearsWorked"
          ? "years_worked"
          : field === "employeeName"
          ? "employee_name"
          : field;
      await payrollApi.updateEmployee(societyId, id, { [apiField]: value });
    } catch {
      // Local state already updated
    }
  };

  const handleAttendanceSave = async (record: AttendanceRecord) => {
    try {
      await payrollApi.createAttendance(record);
      setAttendanceModal(null);
      // Reload to get updated vacation counts
      await loadEmployees();
    } catch {
      setAttendanceModal(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-slate-500">
          Cargando nomina...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ====== LEY 462 BANNER ====== */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <Shield size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-700">
            Ley 462 de 2025 — CSS Patronal actualizada al 13.25%
          </p>
          <p className="text-[10px] text-amber-600 mt-0.5">
            Incluye: XIII Mes, Vacaciones (9.09%), Fondo Cesantia (2.25%), Prima de
            Antiguedad, ISR progresivo (3 tramos DGI). Descuento automatico por faltas.
          </p>
        </div>
      </div>

      {/* ====== SUMMARY CARDS ====== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Salario Bruto Total"
          value={totals.totalGross}
          icon={<DollarSign size={18} />}
          color="blue"
          subtitle={`${totals.planillaCount} planilla · ${totals.freelanceCount} freelance`}
        />
        <SummaryCard
          label="Costo Real Empresa"
          value={totals.totalEmployerCost}
          icon={<AlertTriangle size={18} />}
          color="red"
          highlight
          subtitle={`Anual: $${totals.costoAnual.toLocaleString("es-PA")}`}
        />
        <SummaryCard
          label="Neto Total Empleados"
          value={totals.totalNet}
          icon={<Users size={18} />}
          color="emerald"
        />
        <SummaryCard
          label="Sobrecosto Oculto"
          value={totals.hiddenCost}
          icon={<TrendingDown size={18} />}
          color="amber"
          subtitle={`+${
            totals.totalGross > 0
              ? ((totals.hiddenCost / totals.totalGross) * 100).toFixed(1)
              : 0
          }% sobre bruto`}
        />
      </div>

      {/* ====== XIII MES CARD ====== */}
      {xiiiMes && xiiiMes.total_reserva_pendiente > 0 && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Gift size={16} className="text-purple-600" />
            <h4 className="text-sm font-bold text-purple-700">
              Reserva XIII Mes (Decimo Tercer Mes)
              <SmartTooltip term="reserva_xiii_mes" size={13} />
            </h4>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600">
                Meses en tercio actual: {xiiiMes.months_in_tercio}
              </p>
              <p className="text-[10px] text-purple-500 mt-0.5">
                Pagos: 15 Abr · 15 Ago · 15 Dic
              </p>
            </div>
            <p className="text-xl font-extrabold text-purple-700">
              ${xiiiMes.total_reserva_pendiente.toLocaleString("es-PA")}
            </p>
          </div>
          {xiiiMes.empleados && xiiiMes.empleados.length > 0 && (
            <div className="mt-3 pt-2 border-t border-purple-200 space-y-1">
              {xiiiMes.empleados.map((emp: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="text-purple-600">{emp.employee_name}</span>
                  <span className="font-bold text-purple-700">
                    ${emp.acumulado_tercio.toLocaleString("es-PA")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====== LAYOUT: TABLE + CHART ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de empleados */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700 text-sm flex items-center">
              Equipo ({employees.filter((e) => e.is_active).length})
              <SmartTooltip term="costo_patronal" size={14} />
            </h3>
            <button
              onClick={addEmployee}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              Agregar
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {employees.map((emp) => {
              const adj = salarioAjustado(emp.id, emp.gross_salary);
              const faltasCount = attendanceCounts[emp.id] || 0;
              const calc = calcularCargaLocal(
                adj,
                emp.contract_type,
                emp.years_worked
              );
              const ec = calc.employerCost;
              const en = calc.employeeNet;
              const cp = calc.cargaPatronalPct;
              const isSelected = selectedId === emp.id;
              const isPlanilla =
                emp.contract_type === "planilla" ||
                emp.contract_type === "payroll";

              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedId(isSelected ? null : emp.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    !emp.is_active
                      ? "border-slate-200 bg-slate-50 opacity-60"
                      : isSelected
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={emp.employee_name || ""}
                      onChange={(e) =>
                        updateEmployee(emp.id, "employee_name", e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Nombre del cargo..."
                      className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-800 placeholder:text-slate-300"
                    />
                    {/* Cedula badge */}
                    {!emp.cedula && isPlanilla && emp.is_active && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">
                        Sin Cedula
                      </span>
                    )}
                    {!emp.is_active && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded font-bold">
                        Inactivo
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {emp.is_active && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttendanceModal({
                              employeeId: emp.id,
                              employeeName: emp.employee_name || "Empleado",
                            });
                          }}
                          title="Registrar asistencia"
                          className="p-1 text-slate-300 hover:text-blue-500 transition-colors"
                        >
                          <ClipboardList size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEmployee(emp.id);
                        }}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={
                        emp.contract_type === "payroll"
                          ? "planilla"
                          : emp.contract_type
                      }
                      onChange={(e) =>
                        updateEmployee(
                          emp.id,
                          "contract_type",
                          e.target.value === "planilla"
                            ? "payroll"
                            : e.target.value
                        )
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-blue-400"
                    >
                      <option value="planilla">Planilla</option>
                      <option value="freelance">Freelance</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-emerald-500">$</span>
                      <input
                        type="number"
                        value={emp.gross_salary || ""}
                        onChange={(e) =>
                          updateEmployee(
                            emp.id,
                            "gross_salary",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Salario"
                        className="w-20 text-sm font-bold bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-800"
                      />
                    </div>

                    {isPlanilla && (
                      <>
                        <div className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" />
                          <input
                            type="number"
                            value={emp.years_worked || ""}
                            onChange={(e) =>
                              updateEmployee(
                                emp.id,
                                "years_worked",
                                parseInt(e.target.value) || 0
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            placeholder="0"
                            min="0"
                            max="40"
                            className="w-8 text-[11px] bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-700 text-center"
                          />
                          <span className="text-[10px] text-slate-400">
                            anos
                          </span>
                        </div>

                        {/* Cedula input */}
                        <div className="flex items-center gap-1">
                          <Briefcase size={11} className="text-slate-400" />
                          <input
                            type="text"
                            value={emp.cedula || ""}
                            onChange={(e) =>
                              updateEmployee(emp.id, "cedula", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Cedula"
                            className="w-20 text-[11px] bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-700"
                          />
                        </div>
                      </>
                    )}

                    {/* Fecha ingreso / salida */}
                    {isPlanilla && (
                      <div className="flex items-center gap-2 mt-1.5 w-full flex-wrap">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Ingreso:</span>
                          <input
                            type="date"
                            value={emp.entry_date || ""}
                            onChange={(e) =>
                              updateEmployee(emp.id, "entry_date", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] px-1 py-0.5 bg-transparent outline-none border border-slate-200 rounded text-slate-600 focus:border-blue-400"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Salida:</span>
                          <input
                            type="date"
                            value={emp.exit_date || ""}
                            onChange={(e) =>
                              updateEmployee(emp.id, "exit_date", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] px-1 py-0.5 bg-transparent outline-none border border-slate-200 rounded text-slate-600 focus:border-blue-400"
                          />
                        </div>
                        {emp.exit_date && (
                          <select
                            value={emp.exit_reason || ""}
                            onChange={(e) =>
                              updateEmployee(emp.id, "exit_reason", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] px-1 py-0.5 border border-slate-200 rounded bg-white text-slate-600 outline-none focus:border-blue-400"
                          >
                            <option value="">Motivo...</option>
                            <option value="renuncia">Renuncia</option>
                            <option value="despido">Despido</option>
                            <option value="mutuo_acuerdo">Mutuo Acuerdo</option>
                          </select>
                        )}
                      </div>
                    )}

                    {/* Faltas injustificadas badge */}
                    {faltasCount > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">
                          {faltasCount} falta{faltasCount > 1 ? "s" : ""} injustificada{faltasCount > 1 ? "s" : ""} — Salario ajustado: ${adj.toLocaleString("es-PA")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Vacation info for planilla */}
                  {isPlanilla &&
                    (emp.vacation_days_accrued > 0 ||
                      emp.vacation_days_taken > 0) && (
                      <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                        <span className="text-blue-500">
                          Vac. acumuladas:{" "}
                          {emp.vacation_days_accrued?.toFixed(1) || "0"} d
                        </span>
                        <span className="text-amber-500">
                          Tomadas:{" "}
                          {emp.vacation_days_taken?.toFixed(1) || "0"} d
                        </span>
                        <span className="text-emerald-500">
                          Pendientes:{" "}
                          {(
                            (emp.vacation_days_accrued || 0) -
                            (emp.vacation_days_taken || 0)
                          ).toFixed(1)}{" "}
                          d
                        </span>
                      </div>
                    )}

                  {/* Result inline */}
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-red-600 font-bold">
                      Costo: ${ec.toLocaleString("es-PA")}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      Neto: ${en.toLocaleString("es-PA")}
                    </span>
                    {isPlanilla && cp > 0 && (
                      <span className="text-[10px] text-amber-600 font-bold ml-auto">
                        +{cp.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {employees.length === 0 && (
              <div className="py-8 text-center">
                <Users size={32} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm text-slate-400">
                  No hay empleados registrados
                </p>
                <p className="text-[10px] text-slate-300 mt-1">
                  Haz clic en "Agregar" para crear tu primer empleado
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Grafico + Detalle */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700 text-sm">
            Brecha: Costo Empresa vs. Bolsillo Empleado
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E2E8F0"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `$${v.toLocaleString()}`}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString("es-PA")}`,
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                    color: "#334155",
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#64748b" }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span style={{ color: "#64748b" }}>{value}</span>
                  )}
                />
                <Bar
                  dataKey="Costo Empresa"
                  fill="#EF4444"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
                <Bar
                  dataKey="Neto Empleado"
                  fill="#10B981"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-12 text-sm">
              Agrega empleados para ver el grafico
            </p>
          )}

          {/* Detalle del empleado seleccionado */}
          {selectedDetail && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              {/* Alerta de faltas injustificadas */}
              {(selectedDetail as any).faltas_injustificadas > 0 && (
                <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-[11px] text-red-700 font-bold">
                    ⚠️ {(selectedDetail as any).faltas_injustificadas} falta{(selectedDetail as any).faltas_injustificadas > 1 ? "s" : ""} injustificada{(selectedDetail as any).faltas_injustificadas > 1 ? "s" : ""} este mes
                  </p>
                  <p className="text-[10px] text-red-600">
                    Salario ajustado: ${(selectedDetail as any).salario_ajustado?.toLocaleString("es-PA")} (de ${selectedDetail.gross_salary.toLocaleString("es-PA")})
                  </p>
                </div>
              )}
              <h4 className="text-sm font-bold text-slate-700 mb-3">
                Desglose: {selectedDetail.employee_name || "Sin nombre"}
                <span className="text-[10px] text-slate-500 ml-2 font-normal">
                  (
                  {selectedDetail.contract_type === "planilla" ||
                  selectedDetail.contract_type === "payroll"
                    ? "Planilla - Ley 462/2025"
                    : "Servicios Profesionales"}
                  )
                </span>
              </h4>

              {(selectedDetail.contract_type === "planilla" ||
                selectedDetail.contract_type === "payroll") && (
                <>
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5">
                    Cargas Patronales (empresa paga adicional)
                  </p>
                  <div className="space-y-1 mb-3">
                    {Object.entries(selectedDetail.breakdown)
                      .filter(([key]) => !key.includes("Empleado"))
                      .map(([key, val]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-[11px] text-slate-500">
                            {key}
                          </span>
                          <span className="text-[11px] font-bold text-red-600">
                            ${(val as number).toLocaleString("es-PA")}
                          </span>
                        </div>
                      ))}
                  </div>

                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1.5">
                    Retenciones al Empleado (se descuenta del sueldo)
                  </p>
                  <div className="space-y-1 mb-3">
                    {Object.entries(selectedDetail.breakdown)
                      .filter(([key]) => key.includes("Empleado"))
                      .map(([key, val]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-[11px] text-slate-500">
                            {key}
                          </span>
                          <span className="text-[11px] font-bold text-blue-600">
                            ${(val as number).toLocaleString("es-PA")}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {selectedDetail.contract_type === "freelance" && (
                <div className="space-y-1 mb-3">
                  {Object.entries(selectedDetail.breakdown).map(
                    ([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between"
                      >
                        <span className="text-[11px] text-slate-500">
                          {key}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700">
                          ${(val as number).toLocaleString("es-PA")}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="pt-3 border-t border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Salario Bruto:
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    $
                    {selectedDetail.gross_salary.toLocaleString("es-PA")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Costo Real Empresa:
                  </span>
                  <span className="text-xs font-extrabold text-red-600">
                    $
                    {selectedDetail.employer_cost.toLocaleString("es-PA")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Neto Empleado:
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600">
                    $
                    {selectedDetail.employee_net.toLocaleString("es-PA")}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-amber-50 -mx-2 px-2 py-1 rounded-lg">
                  <span className="text-xs font-bold text-amber-700">
                    Sobrecosto Oculto:
                  </span>
                  <span className="text-xs font-extrabold text-amber-700">
                    +$
                    {(
                      selectedDetail.employer_cost -
                      selectedDetail.gross_salary
                    ).toLocaleString("es-PA")}
                    {selectedDetail.gross_salary > 0 &&
                      ` (+${(
                        ((selectedDetail.employer_cost -
                          selectedDetail.gross_salary) /
                          selectedDetail.gross_salary) *
                        100
                      ).toFixed(1)}%)`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ISR Reference */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-blue-600" />
              <p className="text-[11px] font-bold text-blue-700">
                Tabla ISR Mensual DGI 2026 (3 tramos)
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="p-2 rounded-lg bg-white border border-blue-100 text-center">
                <p className="font-bold text-emerald-600">0%</p>
                <p className="text-slate-500">$0 – $846</p>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100 text-center">
                <p className="font-bold text-amber-600">15%</p>
                <p className="text-slate-500">$846 – $1,538</p>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100 text-center">
                <p className="font-bold text-red-600">25%</p>
                <p className="text-slate-500">{">"}$1,538</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== LEGAL FOOTER ====== */}
      <p className="text-[10px] text-slate-400 italic border-t border-slate-100 pt-3">
        Basado en legislacion laboral de Panama 2026.{" "}
        <strong>Ley 462 de 2025</strong>: CSS Patronal 13.25%, SE 1.50%,
        Riesgos Prof. 1.50%, Fondo Cesantia 2.25%, XIII Mes (8.33%),
        Vacaciones (9.09%), Prima de Antiguedad (1 semana/ano). Descuento
        automatico por faltas injustificadas: (Salario/30) x (30 - Faltas).
        ISR segun tabla DGI mensual 2026 (3 tramos progresivos). Esto es
        una estimacion educativa, no constituye asesoria legal ni contable.
      </p>

      {/* ====== ATTENDANCE MODAL ====== */}
      {attendanceModal && (
        <AttendanceModal
          employeeId={attendanceModal.employeeId}
          employeeName={attendanceModal.employeeName}
          societyId={societyId}
          onClose={() => setAttendanceModal(null)}
          onSave={handleAttendanceSave}
        />
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function SummaryCard({
  label,
  value,
  icon,
  color,
  highlight = false,
  subtitle,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
  subtitle?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> =
    {
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      },
      red: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
      emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
      },
      amber: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
      },
    };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`p-4 rounded-xl border ${c.border} ${c.bg} ${
        highlight ? "ring-2 ring-red-200" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={c.text}>{icon}</span>
        <span className={`text-[11px] font-bold uppercase ${c.text}`}>
          {label}
        </span>
      </div>
      <p className={`text-xl font-extrabold ${c.text}`}>
        ${value.toLocaleString("es-PA")}
      </p>
      {subtitle && (
        <p className={`text-[10px] mt-0.5 ${c.text} opacity-70`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
