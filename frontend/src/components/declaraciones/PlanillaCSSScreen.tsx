"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Users,
  Info,
  Loader2,
  Building2,
} from "lucide-react";
import {
  loadPersonal,
  loadPlanillas,
  type PlanillaMensual,
  type PlanillaMensualEntry,
  type PersonalRecord,
} from "@/lib/rrhh-types";

// ============================================
// TYPES
// ============================================

interface PlanillaCSSScreenProps {
  societyId: string;
}

interface CompanyHeader {
  ruc: string;
  dv: string;
  razonSocial: string;
  numeroPatronalCSS: string;
}

interface CSSEmployeeRow {
  personalId: string;
  cedula: string;
  dv: string;
  nombre: string;
  numeroCSS: string;
  fechaIngreso: string;
  diasTrabajados: number;
  salarioBruto: number;
  horasExtras: number;
  decimoTercerMes: number;
  otrosIngresos: number;
  totalDevengado: number;
  cssObrero: number;
  cssPatronal: number;
  seObrero: number;
  sePatronal: number;
  riesgosProfesionales: number;
  totalDeduccionesTrabajador: number;
  totalAportesEmpleador: number;
}

type PlanillaStatus = "sincronizado" | "borrador" | "sin_datos";

interface CSSValidationWarning {
  tipo: "sin_css" | "salario_bajo" | "sin_datos";
  mensaje: string;
  personalId?: string;
}

// ============================================
// CONSTANTS
// ============================================

const SALARIO_MINIMO = 650.0;

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const YEARS = [2024, 2025, 2026, 2027];

// ============================================
// HELPERS
// ============================================

function formatBalboas(n: number): string {
  return `B/. ${n.toLocaleString("es-PA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseNumeroPatronalCSS(): string {
  try {
    const raw = localStorage.getItem("midf_numero_patronal_css");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0].numero || "";
    }
    if (typeof parsed === "string") return parsed;
    if (typeof parsed === "object" && parsed.numero) return parsed.numero;
    return String(parsed);
  } catch {
    const raw = localStorage.getItem("midf_numero_patronal_css");
    return raw || "";
  }
}

function loadCompanyHeader(): CompanyHeader {
  if (typeof window === "undefined") {
    return { ruc: "", dv: "", razonSocial: "", numeroPatronalCSS: "" };
  }
  return {
    ruc: localStorage.getItem("midf_ruc") || "",
    dv: localStorage.getItem("midf_dv") || "",
    razonSocial: localStorage.getItem("midf_company_name") || "",
    numeroPatronalCSS: parseNumeroPatronalCSS(),
  };
}

function getMonthLabel(mes: number): string {
  return MONTHS.find((m) => m.value === mes)?.label || String(mes);
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }: { status: PlanillaStatus }) {
  const config = {
    sincronizado: {
      icon: <CheckCircle2 size={14} />,
      label: "Sincronizado",
      classes: "bg-emerald-50 border-emerald-200 text-emerald-700",
    },
    borrador: {
      icon: <Info size={14} />,
      label: "Borrador",
      classes: "bg-violet-50 border-violet-200 text-violet-700",
    },
    sin_datos: {
      icon: <AlertCircle size={14} />,
      label: "Sin datos",
      classes: "bg-amber-50 border-amber-200 text-amber-700",
    },
  };

  const c = config[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border ${c.classes}`}
    >
      {c.icon}
      {c.label}
    </div>
  );
}

// ============================================
// VALIDATION WARNINGS PANEL
// ============================================

function WarningsPanel({ warnings }: { warnings: CSSValidationWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 p-3 rounded-xl border ${
            w.tipo === "salario_bajo"
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <AlertTriangle
            size={14}
            className={`mt-0.5 flex-shrink-0 ${
              w.tipo === "salario_bajo" ? "text-red-500" : "text-amber-500"
            }`}
          />
          <p
            className={`text-xs ${
              w.tipo === "salario_bajo" ? "text-red-700" : "text-amber-700"
            }`}
          >
            {w.mensaje}
          </p>
        </div>
      ))}
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ anio, mes }: { anio: number; mes: number }) {
  return (
    <div className="text-center py-16">
      <Users size={40} className="mx-auto text-slate-300 mb-4" />
      <h4 className="text-base font-bold text-slate-600 mb-2">
        Sin datos de planilla para {getMonthLabel(mes)} {anio}
      </h4>
      <p className="text-sm text-slate-400 max-w-md mx-auto">
        No se encontro una planilla mensual para este periodo.
        Ve a <span className="font-semibold text-violet-600">Mi RRHH</span> para
        crear y cerrar la planilla del mes antes de generar el reporte CSS.
      </p>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PlanillaCSSScreen({
  societyId,
}: PlanillaCSSScreenProps) {
  // State
  const [anio, setAnio] = useState<number>(() => new Date().getFullYear());
  const [mes, setMes] = useState<number>(() => new Date().getMonth() + 1);
  const [header, setHeader] = useState<CompanyHeader>({
    ruc: "",
    dv: "",
    razonSocial: "",
    numeroPatronalCSS: "",
  });
  const [personal, setPersonal] = useState<PersonalRecord[]>([]);
  const [planillas, setPlanillas] = useState<PlanillaMensual[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Load data
  useEffect(() => {
    setHeader(loadCompanyHeader());
    setPersonal(loadPersonal());
    setPlanillas(loadPlanillas());
    setLoading(false);
  }, []);

  // Find planilla for selected period
  const planillaMes = useMemo(() => {
    return planillas.find((p) => p.anio === anio && p.mes === mes) || null;
  }, [planillas, anio, mes]);

  // Determine status
  const status: PlanillaStatus = useMemo(() => {
    if (!planillaMes) return "sin_datos";
    if (planillaMes.estado === "cerrado") return "sincronizado";
    return "borrador";
  }, [planillaMes]);

  // Build employee rows
  const rows: CSSEmployeeRow[] = useMemo(() => {
    if (!planillaMes) return [];

    return planillaMes.entries.map((entry) => {
      const person = personal.find((p) => p.id === entry.personal_id);

      const salarioBruto = round2(
        entry.salario_base +
          entry.horas_extras +
          entry.comisiones +
          entry.bonificaciones
      );

      return {
        personalId: entry.personal_id,
        cedula: person?.numero_documento || entry.cedula || "",
        dv: person?.dv || "",
        nombre: person?.nombre_completo || entry.nombre || "",
        numeroCSS: person?.numero_css || "",
        fechaIngreso: person?.fecha_ingreso || "",
        diasTrabajados: entry.dias_trabajados,
        salarioBruto,
        horasExtras: entry.horas_extras,
        decimoTercerMes: entry.decimo_tercer_mes,
        otrosIngresos: entry.otros_ingresos_gravables,
        totalDevengado: entry.total_devengado,
        cssObrero: entry.css_trabajador,
        cssPatronal: entry.css_empleador,
        seObrero: entry.se_trabajador,
        sePatronal: entry.se_empleador,
        riesgosProfesionales: entry.riesgos_profesionales,
        totalDeduccionesTrabajador: entry.total_deducciones,
        totalAportesEmpleador: entry.total_aportes_empleador,
      };
    });
  }, [planillaMes, personal]);

  // Calculate totals
  const totals = useMemo(() => {
    const t = {
      totalDevengado: 0,
      cssObrero: 0,
      cssPatronal: 0,
      seObrero: 0,
      sePatronal: 0,
      riesgos: 0,
      totalDeduccionesTrabajador: 0,
      totalAportesEmpleador: 0,
      granTotal: 0,
    };

    for (const row of rows) {
      t.totalDevengado += row.totalDevengado;
      t.cssObrero += row.cssObrero;
      t.cssPatronal += row.cssPatronal;
      t.seObrero += row.seObrero;
      t.sePatronal += row.sePatronal;
      t.riesgos += row.riesgosProfesionales;
      t.totalDeduccionesTrabajador += row.totalDeduccionesTrabajador;
      t.totalAportesEmpleador += row.totalAportesEmpleador;
    }

    t.granTotal = round2(
      t.cssObrero + t.cssPatronal + t.seObrero + t.sePatronal + t.riesgos
    );

    // Round all
    t.totalDevengado = round2(t.totalDevengado);
    t.cssObrero = round2(t.cssObrero);
    t.cssPatronal = round2(t.cssPatronal);
    t.seObrero = round2(t.seObrero);
    t.sePatronal = round2(t.sePatronal);
    t.riesgos = round2(t.riesgos);
    t.totalDeduccionesTrabajador = round2(t.totalDeduccionesTrabajador);
    t.totalAportesEmpleador = round2(t.totalAportesEmpleador);

    return t;
  }, [rows]);

  // Validation warnings
  const warnings: CSSValidationWarning[] = useMemo(() => {
    const w: CSSValidationWarning[] = [];

    if (status === "sin_datos") {
      w.push({
        tipo: "sin_datos",
        mensaje: `No hay planilla para ${getMonthLabel(mes)} ${anio}. Crea la planilla en Mi RRHH.`,
      });
      return w;
    }

    for (const row of rows) {
      if (!row.numeroCSS) {
        w.push({
          tipo: "sin_css",
          mensaje: `${row.nombre} no tiene numero CSS registrado.`,
          personalId: row.personalId,
        });
      }
      if (row.salarioBruto > 0 && row.salarioBruto < SALARIO_MINIMO) {
        w.push({
          tipo: "salario_bajo",
          mensaje: `${row.nombre}: salario bruto (${formatBalboas(row.salarioBruto)}) inferior al salario minimo (${formatBalboas(SALARIO_MINIMO)}).`,
          personalId: row.personalId,
        });
      }
    }

    return w;
  }, [rows, status, anio, mes]);

  // Export CSV stub
  const handleExportCSV = useCallback(() => {
    if (rows.length === 0) return;

    const headers = [
      "Cedula",
      "DV",
      "Nombre",
      "No. CSS",
      "Fecha Ingreso",
      "Dias Trabajados",
      "Salario Bruto",
      "Horas Extras",
      "XIII Mes",
      "Otros Ingresos",
      "Total Devengado",
      "CSS Obrero 9.75%",
      "CSS Patronal 12.25%",
      "SE Obrero 1.25%",
      "SE Patronal 1.50%",
      "Riesgos Prof.",
      "Total Deducc. Trabajador",
      "Total Aportes Empleador",
    ];

    const csvRows = rows.map((r) =>
      [
        r.cedula,
        r.dv,
        `"${r.nombre}"`,
        r.numeroCSS,
        r.fechaIngreso,
        r.diasTrabajados,
        r.salarioBruto.toFixed(2),
        r.horasExtras.toFixed(2),
        r.decimoTercerMes.toFixed(2),
        r.otrosIngresos.toFixed(2),
        r.totalDevengado.toFixed(2),
        r.cssObrero.toFixed(2),
        r.cssPatronal.toFixed(2),
        r.seObrero.toFixed(2),
        r.sePatronal.toFixed(2),
        r.riesgosProfesionales.toFixed(2),
        r.totalDeduccionesTrabajador.toFixed(2),
        r.totalAportesEmpleador.toFixed(2),
      ].join(",")
    );

    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planilla_css_${anio}_${String(mes).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, anio, mes]);

  // Save borrador
  const handleGuardarBorrador = useCallback(() => {
    try {
      const key = `midf_planilla_css_borrador_${anio}_${mes}`;
      const data = {
        header,
        anio,
        mes,
        rows,
        totals,
        status,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(data));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert("Error al guardar el borrador");
    }
  }, [header, anio, mes, rows, totals, status]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-violet-500" />
        <span className="ml-2 text-sm text-slate-500">
          Cargando datos de planilla CSS...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ========== TITLE ========== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-100">
            <Shield size={22} className="text-violet-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Planilla CSS — Reporte Mensual
            </h2>
            <p className="text-[11px] text-slate-400">
              Caja de Seguro Social — Espejo de planilla pre-llenado desde Mi RRHH
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* ========== COMPANY HEADER ========== */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-700">
            Datos del Empleador
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              RUC
            </label>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">
              {header.ruc || <span className="text-slate-300 italic">Sin registrar</span>}
            </p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              DV
            </label>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">
              {header.dv || <span className="text-slate-300 italic">—</span>}
            </p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              Razon Social
            </label>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">
              {header.razonSocial || (
                <span className="text-slate-300 italic">Sin registrar</span>
              )}
            </p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              No. Patronal CSS
            </label>
            <p className="text-sm font-semibold text-violet-700 mt-0.5">
              {header.numeroPatronalCSS || (
                <span className="text-slate-300 italic">Sin registrar</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ========== PERIOD SELECTOR ========== */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-wrap items-center gap-3">
        <Calendar size={16} className="text-slate-400" />
        <span className="text-xs font-medium text-slate-500">Periodo:</span>
        <select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="text-xs lg:text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="text-xs lg:text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <span className="text-[10px] text-slate-400 ml-auto hidden sm:inline">
          {rows.length} empleado{rows.length !== 1 ? "s" : ""} en planilla
        </span>
      </div>

      {/* ========== WARNINGS ========== */}
      <WarningsPanel warnings={warnings} />

      {/* ========== EMPTY STATE or TABLE ========== */}
      {status === "sin_datos" ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState anio={anio} mes={mes} />
        </div>
      ) : (
        <>
          {/* ========== EMPLOYEE TABLE ========== */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap sticky left-0 bg-slate-50 z-10">
                      #
                    </th>
                    <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap sticky left-8 bg-slate-50 z-10 min-w-[120px]">
                      Cedula / DV
                    </th>
                    <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap min-w-[160px]">
                      Nombre
                    </th>
                    <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      No. CSS
                    </th>
                    <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      F. Ingreso
                    </th>
                    <th className="text-center px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      Dias
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      Salario Bruto
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      H. Extras
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      XIII Mes
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      Otros Ing.
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-violet-700 whitespace-nowrap bg-violet-50">
                      Total Devengado
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      CSS Obrero 9.75%
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      CSS Patronal 12.25%
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      SE Obrero 1.25%
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      SE Patronal 1.50%
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                      Riesgos Prof.
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-red-600 whitespace-nowrap bg-red-50">
                      Total Deducc. Trab.
                    </th>
                    <th className="text-right px-3 py-2.5 font-bold text-amber-700 whitespace-nowrap bg-amber-50">
                      Total Aportes Empl.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const sinCSS = !row.numeroCSS;
                    const salarioBajo =
                      row.salarioBruto > 0 && row.salarioBruto < SALARIO_MINIMO;

                    return (
                      <tr
                        key={row.personalId}
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                          sinCSS || salarioBajo ? "bg-amber-50/30" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-slate-400 sticky left-0 bg-white z-10">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-700 sticky left-8 bg-white z-10">
                          {row.cedula}
                          {row.dv && (
                            <span className="text-slate-400">-{row.dv}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700 font-medium">
                          {row.nombre}
                          {sinCSS && (
                            <AlertTriangle
                              size={10}
                              className="inline ml-1 text-amber-500"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-violet-700">
                          {row.numeroCSS || (
                            <span className="text-amber-400 italic text-[10px]">
                              Sin CSS
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {row.fechaIngreso
                            ? new Date(row.fechaIngreso).toLocaleDateString(
                                "es-PA"
                              )
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-700">
                          {row.diasTrabajados}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-mono ${
                            salarioBajo ? "text-red-600 font-bold" : "text-slate-700"
                          }`}
                        >
                          {formatBalboas(row.salarioBruto)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          {formatBalboas(row.horasExtras)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          {formatBalboas(row.decimoTercerMes)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          {formatBalboas(row.otrosIngresos)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-violet-700 bg-violet-50/50">
                          {formatBalboas(row.totalDevengado)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          {formatBalboas(row.cssObrero)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          {formatBalboas(row.cssPatronal)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          {formatBalboas(row.seObrero)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          {formatBalboas(row.sePatronal)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          {formatBalboas(row.riesgosProfesionales)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-red-600 bg-red-50/50">
                          {formatBalboas(row.totalDeduccionesTrabajador)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-amber-700 bg-amber-50/50">
                          {formatBalboas(row.totalAportesEmpleador)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* TOTALS ROW */}
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                      <td
                        colSpan={6}
                        className="px-3 py-3 text-xs text-slate-700 sticky left-0 bg-slate-100 z-10"
                      >
                        TOTALES ({rows.length} empleado{rows.length !== 1 ? "s" : ""})
                      </td>
                      <td colSpan={4} className="px-3 py-3 text-right text-xs text-slate-500">
                        —
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-violet-700 bg-violet-50">
                        {formatBalboas(totals.totalDevengado)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-slate-700">
                        {formatBalboas(totals.cssObrero)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-slate-700">
                        {formatBalboas(totals.cssPatronal)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-slate-700">
                        {formatBalboas(totals.seObrero)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-slate-700">
                        {formatBalboas(totals.sePatronal)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-slate-700">
                        {formatBalboas(totals.riesgos)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-red-600 bg-red-50">
                        {formatBalboas(totals.totalDeduccionesTrabajador)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-amber-700 bg-amber-50">
                        {formatBalboas(totals.totalAportesEmpleador)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* ========== FOOTER SUMMARY ========== */}
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
            <h4 className="text-sm font-bold text-violet-800 mb-4">
              Resumen de Aportes a la CSS
            </h4>

            {/* Gran total */}
            <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-violet-200 mb-4">
              <span className="text-sm font-bold text-violet-800">
                GRAN TOTAL a pagar a CSS
              </span>
              <span className="text-xl font-extrabold text-violet-700">
                {formatBalboas(totals.granTotal)}
              </span>
            </div>

            {/* Subtotals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white rounded-lg px-3 py-2.5 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                  CSS Patronal (12.25%)
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {formatBalboas(totals.cssPatronal)}
                </span>
              </div>
              <div className="bg-white rounded-lg px-3 py-2.5 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                  CSS Obrero (9.75%)
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {formatBalboas(totals.cssObrero)}
                </span>
              </div>
              <div className="bg-white rounded-lg px-3 py-2.5 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                  SE Patronal (1.50%)
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {formatBalboas(totals.sePatronal)}
                </span>
              </div>
              <div className="bg-white rounded-lg px-3 py-2.5 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                  SE Obrero (1.25%)
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {formatBalboas(totals.seObrero)}
                </span>
              </div>
              <div className="bg-white rounded-lg px-3 py-2.5 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                  Riesgos Profesionales
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {formatBalboas(totals.riesgos)}
                </span>
              </div>
            </div>
          </div>

          {/* ========== ACTIONS ========== */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGuardarBorrador}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${
                saved
                  ? "bg-emerald-600 text-white"
                  : "bg-violet-600 text-white hover:bg-violet-700"
              }`}
            >
              {saved ? (
                <>
                  <CheckCircle2 size={16} />
                  Guardado
                </>
              ) : (
                <>
                  <Download size={16} />
                  Guardar Borrador
                </>
              )}
            </button>
            <button
              onClick={handleExportCSV}
              disabled={rows.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-bold rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet size={16} />
              Exportar CSV
            </button>
          </div>
        </>
      )}

      {/* ========== LEGAL FOOTER ========== */}
      <p className="text-[10px] text-slate-400 italic border-t border-slate-100 pt-3">
        ESPEJO — No oficial — Generado por Mi Director Financiero PTY.
        Este documento es una vista previa educativa de la planilla CSS
        basada en los datos ingresados en Mi RRHH. Debe ser verificado
        por un profesional antes de presentar a la Caja de Seguro Social.
        No sustituye la planilla oficial SIPE.
      </p>
    </div>
  );
}
