"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  AlertTriangle,
  AlertCircle,
  Download,
  Save,
  Users,
  Briefcase,
  ChevronDown,
  DollarSign,
  Info,
} from "lucide-react";
import {
  loadPersonal,
  loadPlanillas,
  loadPagosFreelancers,
  computeAcumuladosAnuales,
  type AcumuladoAnualEmpleado,
} from "@/lib/rrhh-types";

// ============================================
// TYPES
// ============================================

interface Form20ScreenProps {
  societyId: string;
}

interface BorradorForm20 {
  anioFiscal: number;
  ruc: string;
  dv: string;
  razonSocial: string;
  empleados: AcumuladoAnualEmpleado[];
  freelancers: AcumuladoAnualEmpleado[];
  savedAt: string;
}

// ============================================
// HELPERS
// ============================================

function formatBalboas(n: number | null | undefined): string {
  if (n === null || n === undefined) return "B/. 0.00";
  return `B/. ${n.toLocaleString("es-PA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getBorradorKey(anio: number): string {
  return `midf_form20_borrador_${anio}`;
}

function buildYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 1; y >= currentYear - 5; y--) {
    years.push(y);
  }
  return years;
}

// ============================================
// TOAST COMPONENT
// ============================================

function Toast({
  message,
  tipo,
  onClose,
}: {
  message: string;
  tipo: "success" | "info" | "warning" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colorMap = {
    success: "bg-emerald-50 border-emerald-300 text-emerald-800",
    info: "bg-blue-50 border-blue-300 text-blue-800",
    warning: "bg-amber-50 border-amber-300 text-amber-800",
    error: "bg-red-50 border-red-300 text-red-800",
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 ${colorMap[tipo]}`}
    >
      {message}
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ anio }: { anio: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="p-4 rounded-full bg-slate-100 mb-4">
        <Users size={32} className="text-slate-400" />
      </div>
      <h4 className="text-base font-bold text-slate-700 mb-2">
        Sin datos para {anio}
      </h4>
      <p className="text-sm text-slate-500 text-center max-w-md">
        No se encontraron planillas cerradas ni pagos a freelancers para el ano
        fiscal {anio}. Registra y cierra planillas en Mi RRHH para que aparezcan
        aqui automaticamente.
      </p>
    </div>
  );
}

// ============================================
// WARNING CARD
// ============================================

function WarningCard({
  titulo,
  mensaje,
  tipo = "warning",
}: {
  titulo: string;
  mensaje: string;
  tipo?: "warning" | "error";
}) {
  const isError = tipo === "error";
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${
        isError
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      {isError ? (
        <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
      )}
      <div>
        <p
          className={`text-sm font-bold ${
            isError ? "text-red-700" : "text-amber-700"
          }`}
        >
          {titulo}
        </p>
        <p
          className={`text-xs mt-0.5 ${
            isError ? "text-red-600" : "text-amber-600"
          }`}
        >
          {mensaje}
        </p>
      </div>
    </div>
  );
}

// ============================================
// TABLE HEADER (reusable)
// ============================================

function TableHeader({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="bg-slate-800 text-white">
        {columns.map((col, i) => (
          <th
            key={i}
            className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${
              i === 0 ? "text-left rounded-tl-lg" : ""
            } ${i === columns.length - 1 ? "rounded-tr-lg" : ""} ${
              i > 0 ? "text-right" : ""
            }`}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ============================================
// EMPLEADOS TABLE
// ============================================

function EmpleadosTable({
  empleados,
}: {
  empleados: AcumuladoAnualEmpleado[];
}) {
  if (empleados.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-400 italic">
          No hay empleados en planilla para este periodo.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[700px] text-sm">
        <TableHeader
          columns={[
            "Nombre",
            "Cedula",
            "Tipo",
            "Monto Bruto Anual",
            "ISR Retenido",
            "CSS Retenida",
            "SE Retenida",
          ]}
        />
        <tbody>
          {empleados.map((emp, i) => (
            <tr
              key={emp.personal_id}
              className={`border-b border-slate-100 ${
                i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
              } hover:bg-blue-50/40 transition-colors`}
            >
              <td className="px-3 py-2.5 text-slate-700 font-medium">
                {emp.nombre}
              </td>
              <td className="px-3 py-2.5 text-slate-600 text-right font-mono text-xs">
                {emp.cedula}
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                  Planilla
                </span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-800 font-medium">
                {formatBalboas(emp.salario_bruto_acumulado)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                {formatBalboas(emp.isr_retenido_acumulado)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                {formatBalboas(emp.css_obrero_acumulado)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                {formatBalboas(emp.se_obrero_acumulado)}
              </td>
            </tr>
          ))}
        </tbody>
        {/* Subtotal row */}
        <tfoot>
          <tr className="bg-slate-100 border-t-2 border-slate-300">
            <td
              colSpan={3}
              className="px-3 py-2.5 text-xs font-bold text-slate-700 text-right"
            >
              Subtotal Empleados:
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
              {formatBalboas(
                empleados.reduce((s, e) => s + e.salario_bruto_acumulado, 0)
              )}
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
              {formatBalboas(
                empleados.reduce((s, e) => s + e.isr_retenido_acumulado, 0)
              )}
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
              {formatBalboas(
                empleados.reduce((s, e) => s + e.css_obrero_acumulado, 0)
              )}
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
              {formatBalboas(
                empleados.reduce((s, e) => s + e.se_obrero_acumulado, 0)
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ============================================
// FREELANCERS TABLE
// ============================================

function FreelancersTable({
  freelancers,
}: {
  freelancers: AcumuladoAnualEmpleado[];
}) {
  if (freelancers.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-400 italic">
          No hay pagos a freelancers registrados para este periodo.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[560px] text-sm">
        <TableHeader
          columns={[
            "Nombre",
            "Cedula / RUC",
            "Tipo",
            "Monto Bruto Anual",
            "ISR Retenido",
          ]}
        />
        <tbody>
          {freelancers.map((fl, i) => (
            <tr
              key={fl.personal_id}
              className={`border-b border-slate-100 ${
                i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
              } hover:bg-blue-50/40 transition-colors`}
            >
              <td className="px-3 py-2.5 text-slate-700 font-medium">
                {fl.nombre}
              </td>
              <td className="px-3 py-2.5 text-slate-600 text-right font-mono text-xs">
                {fl.cedula}
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 text-violet-700">
                  Servicios Profesionales
                </span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-800 font-medium">
                {formatBalboas(fl.salario_bruto_acumulado)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                {formatBalboas(fl.isr_retenido_acumulado)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 border-t-2 border-slate-300">
            <td
              colSpan={3}
              className="px-3 py-2.5 text-xs font-bold text-slate-700 text-right"
            >
              Subtotal Freelancers:
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
              {formatBalboas(
                freelancers.reduce((s, f) => s + f.salario_bruto_acumulado, 0)
              )}
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
              {formatBalboas(
                freelancers.reduce((s, f) => s + f.isr_retenido_acumulado, 0)
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ============================================
// SUMMARY CARD
// ============================================

function SummaryCard({
  empleados,
  freelancers,
}: {
  empleados: AcumuladoAnualEmpleado[];
  freelancers: AcumuladoAnualEmpleado[];
}) {
  const totalEmpleados = empleados.reduce(
    (s, e) => s + e.salario_bruto_acumulado,
    0
  );
  const totalFreelancers = freelancers.reduce(
    (s, f) => s + f.salario_bruto_acumulado,
    0
  );
  const granTotal = totalEmpleados + totalFreelancers;

  const isrEmpleados = empleados.reduce(
    (s, e) => s + e.isr_retenido_acumulado,
    0
  );
  const isrFreelancers = freelancers.reduce(
    (s, f) => s + f.isr_retenido_acumulado,
    0
  );
  const totalISR = isrEmpleados + isrFreelancers;

  const rows = [
    {
      label: "Total pagado a empleados",
      value: totalEmpleados,
      highlight: false,
    },
    {
      label: "Total pagado a freelancers",
      value: totalFreelancers,
      highlight: false,
    },
    {
      label: "Gran total pagos a terceros",
      value: granTotal,
      highlight: true,
    },
    {
      label: "Total ISR retenido (emp. + free.)",
      value: totalISR,
      highlight: false,
    },
  ];

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign size={16} className="text-slate-500" />
        <h4 className="text-sm font-bold text-slate-700">
          Resumen de Pagos a Terceros
        </h4>
      </div>
      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`flex items-center justify-between ${
              row.highlight
                ? "bg-blue-50 border border-blue-200 -mx-2 px-4 py-2 rounded-lg"
                : ""
            }`}
          >
            <span
              className={`text-xs ${
                row.highlight
                  ? "font-bold text-blue-800"
                  : "text-slate-600"
              }`}
            >
              {row.label}
            </span>
            <span
              className={`font-mono ${
                row.highlight
                  ? "text-sm font-extrabold text-blue-800"
                  : "text-sm font-bold text-slate-800"
              }`}
            >
              {formatBalboas(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function Form20Screen({ societyId }: Form20ScreenProps) {
  // ---- State ----
  const [anioFiscal, setAnioFiscal] = useState<number>(
    new Date().getFullYear() - 1
  );
  const [acumulados, setAcumulados] = useState<AcumuladoAnualEmpleado[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tipo: "success" | "info" | "warning" | "error";
  } | null>(null);

  // ---- Header fields from localStorage ----
  const [ruc, setRuc] = useState("");
  const [dv, setDv] = useState("");
  const [razonSocial, setRazonSocial] = useState("");

  const yearOptions = useMemo(() => buildYearOptions(), []);

  // ---- Load header data ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    setRuc(localStorage.getItem("midf_ruc") || "");
    setDv(localStorage.getItem("midf_dv") || "");
    setRazonSocial(localStorage.getItem("midf_company_name") || "");
  }, []);

  // ---- Load acumulados when year changes ----
  const loadData = useCallback(() => {
    const personal = loadPersonal();
    const planillas = loadPlanillas();
    const pagosFreelancers = loadPagosFreelancers();
    const data = computeAcumuladosAnuales(
      personal,
      planillas,
      pagosFreelancers,
      anioFiscal
    );
    setAcumulados(data);
    setLoaded(true);
  }, [anioFiscal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---- Derived data ----
  const empleados = useMemo(
    () => acumulados.filter((a) => a.tipo === "empleado"),
    [acumulados]
  );

  const freelancers = useMemo(
    () => acumulados.filter((a) => a.tipo === "freelancer"),
    [acumulados]
  );

  const hasData = empleados.length > 0 || freelancers.length > 0;

  // ---- Validations ----
  const warnings = useMemo(() => {
    const list: { titulo: string; mensaje: string; tipo: "warning" | "error" }[] = [];

    if (loaded && !hasData) {
      list.push({
        titulo: "Sin datos para este periodo",
        mensaje: `No se encontraron planillas cerradas ni pagos a freelancers para el ano fiscal ${anioFiscal}. Verifica que las planillas esten cerradas en Mi RRHH.`,
        tipo: "warning",
      });
    }

    // Beneficiaries with monto > 0 but ISR = 0
    const sinISR = acumulados.filter(
      (a) => a.salario_bruto_acumulado > 0 && a.isr_retenido_acumulado === 0
    );
    if (sinISR.length > 0) {
      const nombres = sinISR.map((s) => s.nombre).join(", ");
      list.push({
        titulo: `${sinISR.length} beneficiario(s) sin retencion ISR`,
        mensaje: `Los siguientes tienen pagos registrados pero ISR retenido en B/. 0.00: ${nombres}. Verifica si aplica exoneracion o si faltan datos.`,
        tipo: "warning",
      });
    }

    return list;
  }, [acumulados, loaded, hasData, anioFiscal]);

  // ---- Actions ----
  const handleGuardarBorrador = useCallback(() => {
    try {
      const borrador: BorradorForm20 = {
        anioFiscal,
        ruc,
        dv,
        razonSocial,
        empleados,
        freelancers,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(getBorradorKey(anioFiscal), JSON.stringify(borrador));
      setToast({
        message: `Borrador Form 20 (${anioFiscal}) guardado exitosamente.`,
        tipo: "success",
      });
    } catch {
      setToast({
        message: "Error al guardar el borrador. Intenta nuevamente.",
        tipo: "error",
      });
    }
  }, [anioFiscal, ruc, dv, razonSocial, empleados, freelancers]);

  const handleExportarCSV = useCallback(() => {
    setToast({
      message: "Exportar CSV estara disponible proximamente.",
      tipo: "info",
    });
  }, []);

  // ---- Render ----
  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-8">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          tipo={toast.tipo}
          onClose={() => setToast(null)}
        />
      )}

      {/* ========== HEADER ========== */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-3 px-5 py-4 bg-slate-800">
          <div className="p-2 rounded-lg bg-slate-700">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Form 20 — Declaracion Jurada de Pagos a Terceros
            </h2>
            <p className="text-[11px] text-slate-400">
              Formulario espejo — Pre-llenado desde Mi RRHH
            </p>
          </div>
        </div>

        {/* Header fields */}
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* RUC */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                RUC
              </label>
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 font-mono">
                {ruc || "—"}
              </div>
            </div>

            {/* DV */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                DV
              </label>
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 font-mono">
                {dv || "—"}
              </div>
            </div>

            {/* Razon Social */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Razon Social
              </label>
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 truncate">
                {razonSocial || "—"}
              </div>
            </div>

            {/* Ano fiscal */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Ano Fiscal
              </label>
              <div className="relative">
                <select
                  value={anioFiscal}
                  onChange={(e) => setAnioFiscal(Number(e.target.value))}
                  className="w-full appearance-none px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-800 cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== WARNINGS ========== */}
      {warnings.length > 0 && (
        <div className="space-y-3">
          {warnings.map((w, i) => (
            <WarningCard
              key={i}
              titulo={w.titulo}
              mensaje={w.mensaje}
              tipo={w.tipo}
            />
          ))}
        </div>
      )}

      {/* ========== EMPTY STATE ========== */}
      {loaded && !hasData && <EmptyState anio={anioFiscal} />}

      {/* ========== BLOQUE A — EMPLEADOS ========== */}
      {loaded && hasData && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
            <div className="p-1.5 rounded-lg bg-blue-100">
              <Users size={16} className="text-blue-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Bloque A — Empleados en Planilla
              </h3>
              <p className="text-[10px] text-slate-400">
                {empleados.length} empleado(s) registrado(s) en planillas
                cerradas
              </p>
            </div>
          </div>
          <div className="p-4">
            <EmpleadosTable empleados={empleados} />
          </div>
        </div>
      )}

      {/* ========== BLOQUE B — FREELANCERS ========== */}
      {loaded && hasData && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
            <div className="p-1.5 rounded-lg bg-violet-100">
              <Briefcase size={16} className="text-violet-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Bloque B — Freelancers / Servicios Profesionales
              </h3>
              <p className="text-[10px] text-slate-400">
                {freelancers.length} proveedor(es) de servicios profesionales
              </p>
            </div>
          </div>
          <div className="p-4">
            <FreelancersTable freelancers={freelancers} />
          </div>
        </div>
      )}

      {/* ========== SUMMARY ========== */}
      {loaded && hasData && (
        <SummaryCard empleados={empleados} freelancers={freelancers} />
      )}

      {/* ========== ACTIONS ========== */}
      {loaded && hasData && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGuardarBorrador}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            <Save size={16} />
            Guardar Borrador
          </button>
          <button
            onClick={handleExportarCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 text-sm font-bold rounded-xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      )}

      {/* ========== INFO FOOTER ========== */}
      {loaded && hasData && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
          <Info size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-blue-600/80 leading-relaxed">
            <span className="font-bold">BORRADOR — No oficial.</span> Este
            formulario es una estimacion educativa generada por Mi Director
            Financiero PTY a partir de las planillas y pagos registrados en Mi
            RRHH. Los datos deben ser verificados por un contador publico
            autorizado antes de presentar el formulario oficial (Form 20) ante
            la DGI. Los montos reflejan unicamente las planillas en estado
            &quot;cerrado&quot; para el ano fiscal seleccionado.
          </p>
        </div>
      )}
    </div>
  );
}
