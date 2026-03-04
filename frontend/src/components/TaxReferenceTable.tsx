"use client";
import React from "react";
import { BookOpen } from "lucide-react";
import SmartTooltip from "@/components/SmartTooltip";

// ============================================
// TABLA DE REFERENCIA FISCAL PANAMA 2026
// ============================================

interface TaxRow {
  impuesto: string;
  tasa: string;
  base: string;
  frecuencia: string;
  aplica: string;
  tooltipTerm?: string;
}

const TAX_DATA: TaxRow[] = [
  {
    impuesto: "ISR Persona Natural",
    tasa: "0% / 15% / 25%",
    base: "Renta neta gravable",
    frecuencia: "Anual (declaracion marzo)",
    aplica: "Todos los residentes con ingresos",
    tooltipTerm: "isr_panama",
  },
  {
    impuesto: "ISR Persona Juridica",
    tasa: "25%",
    base: "Renta neta gravable",
    frecuencia: "Anual",
    aplica: "Sociedades (SA, SRL)",
  },
  {
    impuesto: "ITBMS",
    tasa: "7%",
    base: "Valor de venta",
    frecuencia: "Mensual (si ventas > $36k/ano)",
    aplica: "Bienes y servicios gravados",
    tooltipTerm: "itbms",
  },
  {
    impuesto: "Aviso de Operacion",
    tasa: "2%",
    base: "Capital de la empresa",
    frecuencia: "Anual",
    aplica: "Todas las empresas",
  },
  {
    impuesto: "CSS Patronal",
    tasa: "12.25%",
    base: "Salario bruto empleado",
    frecuencia: "Mensual",
    aplica: "Empleadores con planilla",
    tooltipTerm: "css_patronal",
  },
  {
    impuesto: "CSS Empleado",
    tasa: "9.75%",
    base: "Salario bruto",
    frecuencia: "Mensual (retencion)",
    aplica: "Empleados en planilla",
    tooltipTerm: "css_planilla",
  },
  {
    impuesto: "Seguro Educativo Patr.",
    tasa: "1.50%",
    base: "Salario bruto",
    frecuencia: "Mensual",
    aplica: "Empleadores",
  },
  {
    impuesto: "Seguro Educativo Empl.",
    tasa: "1.25%",
    base: "Salario bruto",
    frecuencia: "Mensual (retencion)",
    aplica: "Empleados",
  },
  {
    impuesto: "Riesgos Profesionales",
    tasa: "1.50%",
    base: "Salario bruto",
    frecuencia: "Mensual",
    aplica: "Empleadores (promedio)",
  },
  {
    impuesto: "Carga Total Planilla",
    tasa: "~35.92%",
    base: "Salario bruto",
    frecuencia: "Mensual",
    aplica: "Patron + Empleado combinado",
    tooltipTerm: "costo_patronal",
  },
  {
    impuesto: "Retencion Freelance",
    tasa: "10%",
    base: "Honorarios pagados",
    frecuencia: "Por pago",
    aplica: "Servicios profesionales",
  },
  {
    impuesto: "Tasa Unica Municipal",
    tasa: "Fija (varia)",
    base: "Tipo de actividad",
    frecuencia: "Anual",
    aplica: "Negocios con local",
  },
];

export default function TaxReferenceTable() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen size={16} className="text-blue-500" />
        <h3 className="text-sm font-bold text-slate-700">
          Tabla de Impuestos Panama 2026
        </h3>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2.5 font-bold text-slate-600">
                Impuesto
              </th>
              <th className="text-left px-3 py-2.5 font-bold text-slate-600">
                Tasa
              </th>
              <th className="text-left px-3 py-2.5 font-bold text-slate-600 hidden sm:table-cell">
                Base Imponible
              </th>
              <th className="text-left px-3 py-2.5 font-bold text-slate-600 hidden md:table-cell">
                Frecuencia
              </th>
              <th className="text-left px-3 py-2.5 font-bold text-slate-600 hidden lg:table-cell">
                Aplica a
              </th>
            </tr>
          </thead>
          <tbody>
            {TAX_DATA.map((row, i) => {
              const isHighlight =
                row.impuesto === "Carga Total Planilla";
              return (
                <tr
                  key={i}
                  className={`border-b border-slate-100 ${
                    isHighlight
                      ? "bg-amber-50 font-bold"
                      : i % 2 === 0
                      ? "bg-white"
                      : "bg-slate-50/50"
                  }`}
                >
                  <td className="px-3 py-2 text-slate-700">
                    <span className="flex items-center gap-1">
                      {row.impuesto}
                      {row.tooltipTerm && (
                        <SmartTooltip
                          term={row.tooltipTerm}
                          size={11}
                        />
                      )}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2 font-bold ${
                      isHighlight ? "text-amber-700" : "text-blue-600"
                    }`}
                  >
                    {row.tasa}
                  </td>
                  <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">
                    {row.base}
                  </td>
                  <td className="px-3 py-2 text-slate-500 hidden md:table-cell">
                    {row.frecuencia}
                  </td>
                  <td className="px-3 py-2 text-slate-500 hidden lg:table-cell">
                    {row.aplica}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ISR Tramos detail */}
      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
        <p className="text-[11px] font-bold text-blue-700 mb-2">
          Tramos ISR Persona Natural (Mensual DGI 2026)
        </p>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="p-2 rounded-lg bg-white border border-blue-100 text-center">
            <p className="font-bold text-emerald-600">0%</p>
            <p className="text-slate-500">$0 – $846/mes</p>
            <p className="text-slate-400">$0 – $11k/ano</p>
          </div>
          <div className="p-2 rounded-lg bg-white border border-blue-100 text-center">
            <p className="font-bold text-amber-600">15%</p>
            <p className="text-slate-500">$846 – $1,538/mes</p>
            <p className="text-slate-400">$11k – $20k/ano</p>
          </div>
          <div className="p-2 rounded-lg bg-white border border-blue-100 text-center">
            <p className="font-bold text-red-600">25%</p>
            <p className="text-slate-500">{">"}$1,538/mes</p>
            <p className="text-slate-400">{">"}$20k/ano</p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 italic">
        Ley 462 de 2025. Tasas vigentes enero 2026. Consulte con un
        profesional para su caso particular.
      </p>
    </div>
  );
}
