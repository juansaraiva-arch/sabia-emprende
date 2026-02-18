"use client";
import React, { useState, useMemo } from "react";
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

// ============================================
// MOTOR DE CALCULO NOMINA PANAMA 2026
// Ley 462 de 2025 — SS Patronal 13.25%
// ============================================

type ContractType = "planilla" | "freelance";

interface Employee {
  id: string;
  name: string;
  contractType: ContractType;
  grossSalary: number;
  yearsWorked: number; // Para prima de antigüedad
}

interface PayrollResult {
  employerCost: number;
  employeeNet: number;
  totalDeductions: number;
  breakdown: Record<string, number>;
  cargaPatronalPct: number; // % total sobre bruto
}

/**
 * TABLA ISR MENSUAL DGI PANAMA 2026
 * Tramo 1: $0 – $846.15 → 0%
 * Tramo 2: $846.16 – $1,538.46 → 15%
 * Tramo 3: >$1,538.46 → 25%
 */
function calcularISR(salario: number): number {
  if (salario <= 846.15) return 0;

  let isr = 0;
  if (salario <= 1538.46) {
    // Tramo 2: 15% sobre excedente de $846.15
    isr = (salario - 846.15) * 0.15;
  } else {
    // Tramo 2 completo + Tramo 3
    isr = (1538.46 - 846.15) * 0.15; // $103.85
    isr += (salario - 1538.46) * 0.25;
  }
  return isr;
}

/**
 * CALCULO COMPLETO DE CARGA LABORAL PANAMA 2026
 * Ley 462 de 2025: SS Patronal sube de 12.25% a 13.25%
 */
function calcularCargaPanama(emp: Employee): PayrollResult {
  const salario = emp.grossSalary;

  if (salario <= 0) {
    return {
      employerCost: 0,
      employeeNet: 0,
      totalDeductions: 0,
      breakdown: {},
      cargaPatronalPct: 0,
    };
  }

  if (emp.contractType === "planilla") {
    // =============================================
    // 1. COSTOS PATRONALES (empresa paga ADICIONAL)
    // =============================================
    const ssPatronal = salario * 0.1325;  // LEY 462/2025: 13.25%
    const sePatronal = salario * 0.015;   // Seguro Educativo
    const rpPatronal = salario * 0.015;   // Riesgos Profesionales
    const decimoProv = salario / 12;      // XIII Mes (8.33%)

    // Vacaciones proporcionales: 30 dias/año = 2.5 dias/mes
    const vacacionesProv = (salario / 30) * 2.5 / 12; // provision mensual

    // Prima de antigüedad: 1 semana por año trabajado (provision mensual)
    // Se paga al terminar relación laboral, pero provisionamos mensualmente
    const primaAntig = emp.yearsWorked > 0
      ? ((salario / 4) * emp.yearsWorked) / 12 / emp.yearsWorked // = salario/48 por mes
      : 0;

    const cargaPatronal = ssPatronal + sePatronal + rpPatronal + decimoProv + vacacionesProv + primaAntig;
    const employerCost = salario + cargaPatronal;

    // =============================================
    // 2. RETENCIONES AL EMPLEADO
    // =============================================
    const ssEmpleado = salario * 0.0975;  // SS Empleado
    const seEmpleado = salario * 0.0125;  // SE Empleado
    const isrEmpleado = calcularISR(salario); // ISR progresivo

    const totalDeductions = ssEmpleado + seEmpleado + isrEmpleado;
    const employeeNet = salario - totalDeductions;

    const cargaPatronalPct = salario > 0 ? (cargaPatronal / salario) * 100 : 0;

    return {
      employerCost: round2(employerCost),
      employeeNet: round2(employeeNet),
      totalDeductions: round2(totalDeductions),
      cargaPatronalPct: round2(cargaPatronalPct),
      breakdown: {
        "CSS Patronal (13.25%)": round2(ssPatronal),
        "Seguro Educativo Patr. (1.50%)": round2(sePatronal),
        "Riesgos Prof. (1.50%)": round2(rpPatronal),
        "Prov. XIII Mes (8.33%)": round2(decimoProv),
        "Prov. Vacaciones": round2(vacacionesProv),
        "Prov. Prima Antiguedad": round2(primaAntig),
        "CSS Empleado (9.75%)": round2(ssEmpleado),
        "SE Empleado (1.25%)": round2(seEmpleado),
        "ISR Empleado (Tabla DGI)": round2(isrEmpleado),
      },
    };
  }

  // =============================================
  // SERVICIOS PROFESIONALES (Freelance)
  // =============================================
  const retencion10 = salario * 0.1;
  return {
    employerCost: round2(salario),
    employeeNet: round2(salario - retencion10),
    totalDeductions: round2(retencion10),
    cargaPatronalPct: 0,
    breakdown: {
      "Retencion ISR (10%)": round2(retencion10),
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================
// DATOS MOCK INICIALES
// ============================================
const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: generateId(),
    name: "Gerente General",
    contractType: "planilla",
    grossSalary: 2500,
    yearsWorked: 3,
  },
  {
    id: generateId(),
    name: "Asistente Admin",
    contractType: "planilla",
    grossSalary: 850,
    yearsWorked: 1,
  },
  {
    id: generateId(),
    name: "Contador Externo",
    contractType: "freelance",
    grossSalary: 300,
    yearsWorked: 0,
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PayrollEngine() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Calcular resultados para cada empleado
  const results = useMemo(() => {
    return employees.map((emp) => ({
      ...emp,
      result: calcularCargaPanama(emp),
    }));
  }, [employees]);

  // Totales
  const totals = useMemo(() => {
    const totalGross = results.reduce((s, r) => s + r.grossSalary, 0);
    const totalEmployerCost = results.reduce(
      (s, r) => s + r.result.employerCost,
      0
    );
    const totalNet = results.reduce((s, r) => s + r.result.employeeNet, 0);
    const totalDeductions = results.reduce(
      (s, r) => s + r.result.totalDeductions,
      0
    );
    const hiddenCost = totalEmployerCost - totalGross;
    const planillaCount = results.filter((r) => r.contractType === "planilla").length;
    const freelanceCount = results.filter((r) => r.contractType === "freelance").length;

    return {
      totalGross: round2(totalGross),
      totalEmployerCost: round2(totalEmployerCost),
      totalNet: round2(totalNet),
      totalDeductions: round2(totalDeductions),
      hiddenCost: round2(hiddenCost),
      planillaCount,
      freelanceCount,
      costoAnual: round2(totalEmployerCost * 12),
    };
  }, [results]);

  // Chart data
  const chartData = useMemo(() => {
    return results.map((r) => ({
      name: r.name.length > 12 ? r.name.substring(0, 12) + "..." : r.name,
      "Costo Empresa": r.result.employerCost,
      "Neto Empleado": r.result.employeeNet,
      "Bruto": r.grossSalary,
    }));
  }, [results]);

  // Detalle del empleado seleccionado
  const selectedDetail = useMemo(() => {
    if (!selectedId) return null;
    return results.find((r) => r.id === selectedId) || null;
  }, [selectedId, results]);

  // Handlers
  const addEmployee = () => {
    setEmployees((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "",
        contractType: "planilla",
        grossSalary: 0,
        yearsWorked: 0,
      },
    ]);
  };

  const removeEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateEmployee = (
    id: string,
    field: keyof Employee,
    value: string | number
  ) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

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
            Incluye: XIII Mes, Vacaciones, Prima de Antiguedad, ISR progresivo (3 tramos DGI).
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
          subtitle={`+${totals.totalGross > 0 ? ((totals.hiddenCost / totals.totalGross) * 100).toFixed(1) : 0}% sobre bruto`}
        />
      </div>

      {/* ====== LAYOUT: TABLE + CHART ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de empleados */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700 text-sm flex items-center">
              Equipo ({employees.length})
              <SmartTooltip term="css_patronal" size={14} />
            </h3>
            <button
              onClick={addEmployee}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all"
            >
              <UserPlus size={14} />
              Agregar
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {employees.map((emp) => {
              const res = calcularCargaPanama(emp);
              const isSelected = selectedId === emp.id;
              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedId(isSelected ? null : emp.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {/* Nombre */}
                    <input
                      type="text"
                      value={emp.name}
                      onChange={(e) =>
                        updateEmployee(emp.id, "name", e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Nombre del cargo..."
                      className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-800 placeholder:text-slate-300"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEmployee(emp.id);
                      }}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Tipo contrato */}
                    <select
                      value={emp.contractType}
                      onChange={(e) =>
                        updateEmployee(
                          emp.id,
                          "contractType",
                          e.target.value as ContractType
                        )
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-blue-400"
                    >
                      <option value="planilla">Planilla</option>
                      <option value="freelance">Freelance</option>
                    </select>

                    {/* Salario */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-emerald-500">$</span>
                      <input
                        type="number"
                        value={emp.grossSalary || ""}
                        onChange={(e) =>
                          updateEmployee(
                            emp.id,
                            "grossSalary",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Salario"
                        className="w-20 text-sm font-bold bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-800"
                      />
                    </div>

                    {/* Anos trabajados (solo planilla) */}
                    {emp.contractType === "planilla" && (
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" />
                        <input
                          type="number"
                          value={emp.yearsWorked || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "yearsWorked",
                              parseInt(e.target.value) || 0
                            )
                          }
                          onClick={(e) => e.stopPropagation()}
                          placeholder="0"
                          min="0"
                          max="40"
                          className="w-8 text-[11px] bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-700 text-center"
                        />
                        <span className="text-[10px] text-slate-400">anos</span>
                      </div>
                    )}
                  </div>

                  {/* Resultado inline */}
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-red-600 font-bold">
                      Costo: ${res.employerCost.toLocaleString("es-PA")}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      Neto: ${res.employeeNet.toLocaleString("es-PA")}
                    </span>
                    {emp.contractType === "planilla" && res.cargaPatronalPct > 0 && (
                      <span className="text-[10px] text-amber-600 font-bold ml-auto">
                        +{res.cargaPatronalPct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
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

          {/* Detalle de desglose si hay empleado seleccionado */}
          {selectedDetail && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-sm font-bold text-slate-700 mb-3">
                Desglose: {selectedDetail.name || "Sin nombre"}
                <span className="text-[10px] text-slate-500 ml-2 font-normal">
                  ({selectedDetail.contractType === "planilla"
                    ? "Planilla - Ley 462/2025"
                    : "Servicios Profesionales"})
                </span>
              </h4>

              {/* Separar costos patronales vs retenciones */}
              {selectedDetail.contractType === "planilla" && (
                <>
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5">
                    Cargas Patronales (empresa paga adicional)
                  </p>
                  <div className="space-y-1 mb-3">
                    {Object.entries(selectedDetail.result.breakdown)
                      .filter(([key]) => !key.includes("Empleado"))
                      .map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">{key}</span>
                          <span className="text-[11px] font-bold text-red-600">
                            ${val.toLocaleString("es-PA")}
                          </span>
                        </div>
                      ))}
                  </div>

                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1.5">
                    Retenciones al Empleado (se descuenta del sueldo)
                  </p>
                  <div className="space-y-1 mb-3">
                    {Object.entries(selectedDetail.result.breakdown)
                      .filter(([key]) => key.includes("Empleado"))
                      .map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">{key}</span>
                          <span className="text-[11px] font-bold text-blue-600">
                            ${val.toLocaleString("es-PA")}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {selectedDetail.contractType === "freelance" && (
                <div className="space-y-1 mb-3">
                  {Object.entries(selectedDetail.result.breakdown).map(
                    ([key, val]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">{key}</span>
                        <span className="text-[11px] font-bold text-slate-700">
                          ${val.toLocaleString("es-PA")}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Resumen final */}
              <div className="pt-3 border-t border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Salario Bruto:</span>
                  <span className="text-xs font-bold text-slate-700">
                    ${selectedDetail.grossSalary.toLocaleString("es-PA")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Costo Real Empresa:</span>
                  <span className="text-xs font-extrabold text-red-600">
                    ${selectedDetail.result.employerCost.toLocaleString("es-PA")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Neto Empleado:</span>
                  <span className="text-xs font-extrabold text-emerald-600">
                    ${selectedDetail.result.employeeNet.toLocaleString("es-PA")}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-amber-50 -mx-2 px-2 py-1 rounded-lg">
                  <span className="text-xs font-bold text-amber-700">Sobrecosto Oculto:</span>
                  <span className="text-xs font-extrabold text-amber-700">
                    +${(selectedDetail.result.employerCost - selectedDetail.grossSalary).toLocaleString("es-PA")}
                    {selectedDetail.grossSalary > 0 &&
                      ` (+${(
                        ((selectedDetail.result.employerCost - selectedDetail.grossSalary) /
                          selectedDetail.grossSalary) * 100
                      ).toFixed(1)}%)`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ISR Explicacion */}
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
        Basado en legislacion laboral de Panama 2026. <strong>Ley 462 de 2025</strong>: CSS
        Patronal 13.25%, SE 1.50%, Riesgos Prof. 1.50%, XIII Mes, Vacaciones (30 dias/ano),
        Prima de Antiguedad (1 semana/ano). ISR segun tabla DGI mensual 2026 (3 tramos
        progresivos). Esto es una estimacion educativa, no constituye asesoria legal ni contable.
      </p>
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
