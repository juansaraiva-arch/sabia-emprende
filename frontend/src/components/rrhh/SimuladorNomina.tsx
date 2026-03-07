"use client";
import React, { useState, useCallback, useMemo } from "react";
import {
  Calculator,
  DollarSign,
  Users,
  Building2,
  FileText,
  Plus,
  Minus,
  ArrowRight,
} from "lucide-react";
import type {
  EmpleadoInput,
  ResultadoNominaEmpleado,
  ResultadoNominaTotal,
} from "@/lib/rrhh/nomina-types";
import {
  calcularCostosEmpleador,
  calcularPagoEmpleado,
  calcularNominaTotal,
  validarResultadoNomina,
  TASAS_NOMINA,
} from "@/lib/rrhh/nomina-calculator";
import DesglosePagoEmpleador from "./DesglosePagoEmpleador";
import DesglosePagoEmpleado from "./DesglosePagoEmpleado";
import ResumenNominaTotal from "./ResumenNominaTotal";

interface SimuladorNominaProps {
  societyId: string;
}

type Vista = "individual" | "nomina";

function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function fmt(n: number): string {
  return n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SimuladorNomina({ societyId }: SimuladorNominaProps) {
  const [vista, setVista] = useState<Vista>("individual");

  // Individual view state
  const [nombre, setNombre] = useState("Empleado 1");
  const [salarioBruto, setSalarioBruto] = useState<number>(1500);
  const [esPublico, setEsPublico] = useState(false);
  const [resultadoIndividual, setResultadoIndividual] = useState<ResultadoNominaEmpleado | null>(null);
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([]);

  // Nomina completa view state
  const [empleados, setEmpleados] = useState<EmpleadoInput[]>([
    {
      id: genId(),
      nombre: "Empleado 1",
      salario_bruto: 1500,
      es_publico: false,
      tipo_contrato: "indefinido",
      fecha_ingreso: new Date().toISOString().split("T")[0],
    },
  ]);
  const [resultadoNomina, setResultadoNomina] = useState<ResultadoNominaTotal | null>(null);

  // ============================================
  // INDIVIDUAL VIEW HANDLERS
  // ============================================

  const handleCalcularIndividual = useCallback(() => {
    if (salarioBruto <= 0) return;

    const empleado: EmpleadoInput = {
      id: genId(),
      nombre: nombre || "Empleado",
      salario_bruto: salarioBruto,
      es_publico: esPublico,
      tipo_contrato: "indefinido",
      fecha_ingreso: new Date().toISOString().split("T")[0],
    };

    const empleador = calcularCostosEmpleador(salarioBruto);
    const empleado_recibe = calcularPagoEmpleado(salarioBruto, esPublico);

    const resultado: ResultadoNominaEmpleado = {
      empleado,
      empleador,
      empleado_recibe,
      resumen: {
        salario_bruto: salarioBruto,
        lo_que_paga_empresa: empleador.costo_total_empleador,
        lo_que_recibe_empleado: empleado_recibe.salario_neto,
        diferencia: Math.round((empleador.costo_total_empleador - empleado_recibe.salario_neto) * 100) / 100,
        pct_diferencia: salarioBruto > 0
          ? Math.round(((empleador.costo_total_empleador - empleado_recibe.salario_neto) / salarioBruto) * 10000) / 100
          : 0,
      },
    };

    const errores = validarResultadoNomina(resultado);
    setResultadoIndividual(resultado);
    setErroresValidacion(errores);
  }, [nombre, salarioBruto, esPublico]);

  // ============================================
  // NOMINA VIEW HANDLERS
  // ============================================

  const agregarEmpleado = useCallback(() => {
    setEmpleados((prev) => [
      ...prev,
      {
        id: genId(),
        nombre: `Empleado ${prev.length + 1}`,
        salario_bruto: 1000,
        es_publico: false,
        tipo_contrato: "indefinido" as const,
        fecha_ingreso: new Date().toISOString().split("T")[0],
      },
    ]);
  }, []);

  const eliminarEmpleado = useCallback((id: string) => {
    setEmpleados((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const actualizarEmpleado = useCallback(
    (id: string, field: keyof EmpleadoInput, value: string | number | boolean) => {
      setEmpleados((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
      );
    },
    []
  );

  const handleCalcularNomina = useCallback(() => {
    const validEmpleados = empleados.filter((e) => e.salario_bruto > 0);
    if (validEmpleados.length === 0) return;

    const now = new Date();
    const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const resultado = calcularNominaTotal(validEmpleados, periodo);
    setResultadoNomina(resultado);
  }, [empleados]);

  // ============================================
  // COMPUTED: CSS/SE declarations for individual
  // ============================================

  const obligaciones = useMemo(() => {
    if (!resultadoIndividual) return null;
    const r = resultadoIndividual;
    const css_obrero = r.empleado_recibe.css_empleado_monto;
    const se_obrero = r.empleado_recibe.se_empleado_monto;
    const css_patronal = r.empleador.css_patronal_monto;
    const se_patronal = r.empleador.se_patronal_monto;
    const rp = r.empleador.riesgos_profesionales_monto;

    return {
      planilla_css: Math.round((css_obrero + css_patronal + se_obrero + se_patronal + rp) * 100) / 100,
      isr_retenido: r.empleado_recibe.isr_mensual,
      css_obrero,
      se_obrero,
      css_patronal,
      se_patronal,
      rp,
    };
  }, [resultadoIndividual]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-[#C5A059]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1A242F] font-['Playfair_Display']">
              Simulador de Nomina
            </h2>
            <p className="text-xs text-slate-500">
              Base legal: Ley 462/2025 · Codigo de Trabajo · Art. 700 CF
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setVista("individual")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              vista === "individual"
                ? "bg-white text-[#1A242F] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setVista("nomina")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              vista === "nomina"
                ? "bg-white text-[#1A242F] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Nomina Completa
          </button>
        </div>
      </div>

      {/* Rates badge */}
      <div className="flex flex-wrap gap-2">
        <Badge label="CSS Patronal" value="12.25%" />
        <Badge label="SE Patronal" value="1.50%" />
        <Badge label="Riesgos Prof." value="1.50%" />
        <Badge label="CSS Obrero" value="9.75%" />
        <Badge label="SE Obrero" value="1.25%" />
      </div>

      {/* ============================================ */}
      {/* VISTA INDIVIDUAL */}
      {/* ============================================ */}
      {vista === "individual" && (
        <div className="space-y-6">
          {/* Input form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Nombre del empleado
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#1A242F] focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059]"
                  placeholder="Nombre"
                />
              </div>

              {/* Salario bruto */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Salario bruto mensual (B/.)
                </label>
                <input
                  type="number"
                  value={salarioBruto}
                  onChange={(e) => setSalarioBruto(parseFloat(e.target.value) || 0)}
                  min={0}
                  step={50}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#1A242F] focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059]"
                  placeholder="1,500.00"
                />
              </div>

              {/* Publico / Privado */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Sector
                </label>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => setEsPublico(false)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      !esPublico
                        ? "bg-[#1A242F] text-white border-[#1A242F]"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    Privado
                  </button>
                  <button
                    onClick={() => setEsPublico(true)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      esPublico
                        ? "bg-[#1A242F] text-white border-[#1A242F]"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    Publico
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCalcularIndividual}
              disabled={salarioBruto <= 0}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C5A059] text-white font-medium text-sm hover:bg-[#b08d4a] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Calcular Desglose
            </button>
          </div>

          {/* Validation errors */}
          {erroresValidacion.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-2">Errores de validacion:</p>
              <ul className="list-disc pl-5 space-y-1">
                {erroresValidacion.map((err, i) => (
                  <li key={i} className="text-xs text-red-600">{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Results side by side */}
          {resultadoIndividual && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DesglosePagoEmpleador desglose={resultadoIndividual.empleador} />
                <DesglosePagoEmpleado desglose={resultadoIndividual.empleado_recibe} />
              </div>

              {/* RESUMEN DE LA BRECHA */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-[#C5A059]" />
                  <h3 className="font-semibold text-[#1A242F] text-sm">
                    RESUMEN DE LA BRECHA
                  </h3>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <MetricCard
                      label="Lo que paga la empresa"
                      value={resultadoIndividual.resumen.lo_que_paga_empresa}
                      color="text-[#C5A059]"
                      icon={<Building2 className="w-4 h-4" />}
                    />
                    <MetricCard
                      label="Lo que recibe el empleado"
                      value={resultadoIndividual.resumen.lo_que_recibe_empleado}
                      color="text-emerald-700"
                      icon={<DollarSign className="w-4 h-4" />}
                    />
                    <MetricCard
                      label="Diferencia"
                      value={resultadoIndividual.resumen.diferencia}
                      color="text-red-600"
                      icon={<ArrowRight className="w-4 h-4" />}
                      suffix={` (${resultadoIndividual.resumen.pct_diferencia.toFixed(1)}%)`}
                    />
                  </div>
                </div>
              </div>

              {/* OBLIGACIONES DE DECLARACION */}
              {obligaciones && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#C5A059]" />
                    <h3 className="font-semibold text-[#1A242F] text-sm">
                      OBLIGACIONES DE DECLARACION
                    </h3>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-blue-700 mb-2">
                          Planilla CSS (Form 20)
                        </p>
                        <div className="space-y-1">
                          <ObRow label="CSS Obrero" value={obligaciones.css_obrero} />
                          <ObRow label="CSS Patronal" value={obligaciones.css_patronal} />
                          <ObRow label="SE Obrero" value={obligaciones.se_obrero} />
                          <ObRow label="SE Patronal" value={obligaciones.se_patronal} />
                          <ObRow label="Riesgos Prof." value={obligaciones.rp} />
                          <div className="flex justify-between items-center pt-1.5 border-t border-blue-200">
                            <span className="text-xs font-bold text-blue-800">Total a pagar CSS</span>
                            <span className="text-sm font-bold text-blue-800">
                              B/. {fmt(obligaciones.planilla_css)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-amber-700 mb-2">
                          ISR Retenido (Form 03 DGI)
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-amber-600">Retencion mensual</span>
                          <span className="text-sm font-bold text-amber-800">
                            B/. {fmt(obligaciones.isr_retenido)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* VISTA NOMINA COMPLETA */}
      {/* ============================================ */}
      {vista === "nomina" && (
        <div className="space-y-6">
          {/* Employee list */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#C5A059]" />
                <h3 className="font-semibold text-[#1A242F] text-sm">
                  Empleados ({empleados.length})
                </h3>
              </div>
              <button
                onClick={agregarEmpleado}
                className="px-3 py-1.5 rounded-lg bg-[#C5A059] text-white text-xs font-medium hover:bg-[#b08d4a] transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar empleado
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {empleados.map((emp, idx) => (
                <div key={emp.id} className="px-5 py-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* Nombre */}
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={emp.nombre}
                        onChange={(e) => actualizarEmpleado(emp.id, "nombre", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-[#1A242F] focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059]"
                      />
                    </div>

                    {/* Salario */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                        Salario bruto (B/.)
                      </label>
                      <input
                        type="number"
                        value={emp.salario_bruto}
                        onChange={(e) =>
                          actualizarEmpleado(emp.id, "salario_bruto", parseFloat(e.target.value) || 0)
                        }
                        min={0}
                        step={50}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-[#1A242F] focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059]"
                      />
                    </div>

                    {/* Sector toggle */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                        Sector
                      </label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => actualizarEmpleado(emp.id, "es_publico", false)}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            !emp.es_publico
                              ? "bg-[#1A242F] text-white border-[#1A242F]"
                              : "bg-white text-slate-400 border-slate-200"
                          }`}
                        >
                          Privado
                        </button>
                        <button
                          onClick={() => actualizarEmpleado(emp.id, "es_publico", true)}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            emp.es_publico
                              ? "bg-[#1A242F] text-white border-[#1A242F]"
                              : "bg-white text-slate-400 border-slate-200"
                          }`}
                        >
                          Publico
                        </button>
                      </div>
                    </div>

                    {/* Delete button */}
                    <div className="sm:col-span-2 flex justify-end">
                      {empleados.length > 1 && (
                        <button
                          onClick={() => eliminarEmpleado(emp.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-all flex items-center gap-1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculate button */}
            <div className="px-5 py-4 border-t border-slate-100">
              <button
                onClick={handleCalcularNomina}
                disabled={empleados.every((e) => e.salario_bruto <= 0)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C5A059] text-white font-medium text-sm hover:bg-[#b08d4a] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Calcular Nomina Completa
              </button>
            </div>
          </div>

          {/* Results */}
          {resultadoNomina && <ResumenNominaTotal resultado={resultadoNomina} />}
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-[10px] font-medium text-slate-600">
      {label}: <span className="font-semibold text-[#1A242F]">{value}</span>
    </span>
  );
}

function MetricCard({
  label,
  value,
  color,
  icon,
  suffix,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 text-center">
      <div className={`flex items-center justify-center gap-1 mb-1 ${color}`}>
        {icon}
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>
        B/. {fmt(value)}
        {suffix && <span className="text-xs font-normal text-slate-500">{suffix}</span>}
      </p>
    </div>
  );
}

function ObRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-700">B/. {fmt(value)}</span>
    </div>
  );
}
