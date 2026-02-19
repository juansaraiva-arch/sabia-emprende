"use client";
import React, { useState, useMemo } from "react";
import { AlertTriangle, Calculator, DollarSign, Calendar } from "lucide-react";
import SmartTooltip from "@/components/SmartTooltip";

// ============================================
// MULTAS Y SANCIONES DGI PANAMA 2026
// ============================================

type MultaType = "isr_tardia" | "itbms_tardia" | "css_tardia" | "no_presentacion" | "tasa_unica";

interface MultaConfig {
  key: MultaType;
  label: string;
  description: string;
  baseAmount?: number;
  hasMonths: boolean;
  hasAmount: boolean;
}

const MULTA_CONFIGS: MultaConfig[] = [
  {
    key: "isr_tardia",
    label: "ISR — Declaracion Tardia",
    description:
      "Persona Natural: $100 por declaracion. Persona Juridica: $500 por declaracion. Mas 10% de recargo + 1% interes mensual sobre impuesto adeudado.",
    hasMonths: true,
    hasAmount: true,
  },
  {
    key: "itbms_tardia",
    label: "ITBMS — Declaracion Tardia",
    description:
      "10% de recargo sobre ITBMS adeudado + 1% de interes moratorio mensual.",
    hasMonths: true,
    hasAmount: true,
  },
  {
    key: "css_tardia",
    label: "CSS — Planilla Tardia",
    description:
      "Recargo del 10% sobre cuotas adeudadas + 1% de interes mensual. Puede escalar a sanciones administrativas.",
    hasMonths: true,
    hasAmount: true,
  },
  {
    key: "no_presentacion",
    label: "No Presentacion de Informes",
    description:
      "Multa de $1,000 a $5,000 por no presentar informes de ventas o Planilla 03 (reporte anual de compensaciones).",
    hasMonths: false,
    hasAmount: false,
  },
  {
    key: "tasa_unica",
    label: "Tasa Unica Municipal",
    description:
      "Multa fija de $50 por declaracion tardia o no presentada. Aplicable a cualquier municipio.",
    baseAmount: 50,
    hasMonths: false,
    hasAmount: false,
  },
];

function calcularMulta(
  tipo: MultaType,
  monto: number,
  mesesAtraso: number,
  esJuridica: boolean
): {
  multaBase: number;
  recargo: number;
  interes: number;
  total: number;
  desglose: string[];
} {
  const desglose: string[] = [];

  if (tipo === "isr_tardia") {
    const multaBase = esJuridica ? 500 : 100;
    const recargo = monto * 0.1;
    const interes = monto * 0.01 * mesesAtraso;
    desglose.push(
      `Multa fija: $${multaBase} (${esJuridica ? "Juridica" : "Natural"})`,
      `Recargo 10%: $${recargo.toFixed(2)}`,
      `Interes 1%/mes x ${mesesAtraso}: $${interes.toFixed(2)}`
    );
    return {
      multaBase,
      recargo,
      interes,
      total: multaBase + recargo + interes,
      desglose,
    };
  }

  if (tipo === "itbms_tardia") {
    const recargo = monto * 0.1;
    const interes = monto * 0.01 * mesesAtraso;
    desglose.push(
      `Recargo 10%: $${recargo.toFixed(2)}`,
      `Interes 1%/mes x ${mesesAtraso}: $${interes.toFixed(2)}`
    );
    return {
      multaBase: 0,
      recargo,
      interes,
      total: recargo + interes,
      desglose,
    };
  }

  if (tipo === "css_tardia") {
    const recargo = monto * 0.1;
    const interes = monto * 0.01 * mesesAtraso;
    desglose.push(
      `Recargo 10%: $${recargo.toFixed(2)}`,
      `Interes 1%/mes x ${mesesAtraso}: $${interes.toFixed(2)}`
    );
    return {
      multaBase: 0,
      recargo,
      interes,
      total: recargo + interes,
      desglose,
    };
  }

  if (tipo === "no_presentacion") {
    return {
      multaBase: 1000,
      recargo: 0,
      interes: 0,
      total: 5000,
      desglose: [
        "Multa minima: $1,000",
        "Multa maxima: $5,000",
        "Aplica por no presentar informes de ventas o Planilla 03",
        "El monto exacto depende de la gravedad y reincidencia",
      ],
    };
  }

  // Tasa unica
  return {
    multaBase: 50,
    recargo: 0,
    interes: 0,
    total: 50,
    desglose: ["Multa fija: $50"],
  };
}

export default function MultasDGICalculator() {
  const [selectedTipo, setSelectedTipo] = useState<MultaType>("isr_tardia");
  const [monto, setMonto] = useState(0);
  const [mesesAtraso, setMesesAtraso] = useState(1);
  const [esJuridica, setEsJuridica] = useState(false);

  const config = MULTA_CONFIGS.find((c) => c.key === selectedTipo)!;

  const resultado = useMemo(
    () => calcularMulta(selectedTipo, monto, mesesAtraso, esJuridica),
    [selectedTipo, monto, mesesAtraso, esJuridica]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calculator size={16} className="text-red-500" />
        <h3 className="text-sm font-bold text-slate-700">
          Simulador de Multas DGI
          <SmartTooltip term="multa_dgi" size={13} />
        </h3>
      </div>

      {/* Tipo de multa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MULTA_CONFIGS.map((cfg) => (
          <button
            key={cfg.key}
            onClick={() => setSelectedTipo(cfg.key)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedTipo === cfg.key
                ? "border-red-400 bg-red-50 ring-1 ring-red-200"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <p
              className={`text-xs font-bold ${
                selectedTipo === cfg.key ? "text-red-700" : "text-slate-700"
              }`}
            >
              {cfg.label}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
              {cfg.description}
            </p>
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {config.hasAmount && (
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Impuesto Adeudado ($)
            </label>
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-3 py-2 bg-white">
              <DollarSign size={14} className="text-slate-400" />
              <input
                type="number"
                value={monto || ""}
                onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="flex-1 text-sm outline-none text-slate-700"
              />
            </div>
          </div>
        )}
        {config.hasMonths && (
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Meses de Atraso
            </label>
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-3 py-2 bg-white">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="number"
                value={mesesAtraso}
                onChange={(e) =>
                  setMesesAtraso(parseInt(e.target.value) || 1)
                }
                min={1}
                max={60}
                className="flex-1 text-sm outline-none text-slate-700"
              />
            </div>
          </div>
        )}
        {selectedTipo === "isr_tardia" && (
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Tipo de Persona
            </label>
            <select
              value={esJuridica ? "juridica" : "natural"}
              onChange={(e) => setEsJuridica(e.target.value === "juridica")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none bg-white"
            >
              <option value="natural">Persona Natural ($100)</option>
              <option value="juridica">Persona Juridica ($500)</option>
            </select>
          </div>
        )}
      </div>

      {/* Resultado */}
      {resultado.total > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-sm font-bold text-red-700">
                Sancion Estimada
              </span>
            </div>
            <span className="text-xl font-extrabold text-red-700">
              ${resultado.total.toFixed(2)}
            </span>
          </div>
          <div className="space-y-1">
            {resultado.desglose.map((line, i) => (
              <p key={i} className="text-[11px] text-red-600">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 italic">
        Calculo estimativo basado en legislacion DGI Panama vigente 2026. No
        constituye asesoria fiscal. Consulte con su contador para montos
        exactos.
      </p>
    </div>
  );
}
