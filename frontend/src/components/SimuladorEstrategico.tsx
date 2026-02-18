"use client";
import React, { useState, useMemo } from "react";
import {
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";
import {
  computeSimulation,
  computeMaxClientLoss,
  computeLegadoPrice,
} from "@/lib/calculations";

// ============================================
// TIPOS
// ============================================

interface SimuladorEstrategicoProps {
  record: FinancialRecord;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function SimuladorEstrategico({
  record,
}: SimuladorEstrategicoProps) {
  // Sliders
  const [pricePct, setPricePct] = useState(0);
  const [costPct, setCostPct] = useState(0);
  const [volumePct, setVolumePct] = useState(0);

  // Tooltip state
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // ====== SIMULACION ======
  const simulation = useMemo(
    () => computeSimulation(record, pricePct, costPct, volumePct),
    [record, pricePct, costPct, volumePct]
  );

  // ====== ESCUDO CONTRA EL MIEDO ======
  const maxClientLoss = useMemo(
    () =>
      pricePct > 0
        ? computeMaxClientLoss(pricePct, record.revenue, record.cogs)
        : 0,
    [pricePct, record.revenue, record.cogs]
  );

  // ====== PRECIO DE LEGADO ======
  const totalOpex =
    record.opex_rent + record.opex_payroll + record.opex_other;
  const legado = useMemo(
    () => computeLegadoPrice(record.revenue, record.cogs, totalOpex),
    [record.revenue, record.cogs, totalOpex]
  );

  const resetSliders = () => {
    setPricePct(0);
    setCostPct(0);
    setVolumePct(0);
  };

  return (
    <div className="space-y-6">
      {/* ====== HEADER ====== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={20} className="text-blue-600" />
          <h3 className="text-lg font-extrabold text-slate-800">
            ¿Que pasaria si...?
          </h3>
        </div>
        <button
          onClick={resetSliders}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          Reiniciar
        </button>
      </div>

      {/* ====== SLIDERS ====== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SliderCard
          label="Cambio en Precio"
          value={pricePct}
          onChange={setPricePct}
          min={-30}
          max={30}
          color="emerald"
          suffix="%"
          tooltip="Si subes tus precios un 10%, tu EBITDA puede mejorar significativamente."
          activeTooltip={activeTooltip}
          onTooltip={setActiveTooltip}
          id="price"
        />
        <SliderCard
          label="Reduccion de Costos"
          value={costPct}
          onChange={setCostPct}
          min={0}
          max={30}
          color="blue"
          suffix="%"
          tooltip="Cuanto puedes reducir tus gastos operativos (alquiler, nomina, otros)."
          activeTooltip={activeTooltip}
          onTooltip={setActiveTooltip}
          id="cost"
        />
        <SliderCard
          label="Cambio en Volumen"
          value={volumePct}
          onChange={setVolumePct}
          min={-30}
          max={50}
          color="violet"
          suffix="%"
          tooltip="Mas clientes o mas unidades vendidas. Recuerda: mas volumen = mas costo variable."
          activeTooltip={activeTooltip}
          onTooltip={setActiveTooltip}
          id="volume"
        />
      </div>

      {/* ====== RESULTADO SIMULACION ====== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EBITDA Comparativo */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <h4 className="text-sm font-bold text-slate-400 mb-4">
            EBITDA Mensual
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Actual</p>
              <p className="text-xl font-extrabold">
                ${simulation.original.ebitda.toLocaleString("es-PA")}
              </p>
              <p className="text-xs text-slate-500">
                Margen: {simulation.original.ebitda_margin_pct.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Simulado</p>
              <p
                className={`text-xl font-extrabold ${
                  simulation.simulated.ebitda >= simulation.original.ebitda
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                ${simulation.simulated.ebitda.toLocaleString("es-PA")}
              </p>
              <p className="text-xs text-slate-500">
                Margen: {simulation.simulated.ebitda_margin_pct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Delta */}
          <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-3">
            {simulation.delta_ebitda >= 0 ? (
              <TrendingUp size={20} className="text-emerald-400" />
            ) : (
              <TrendingDown size={20} className="text-red-400" />
            )}
            <div>
              <p
                className={`text-lg font-extrabold ${
                  simulation.delta_ebitda >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {simulation.delta_ebitda >= 0 ? "+" : ""}$
                {simulation.delta_ebitda.toLocaleString("es-PA")}
              </p>
              <p className="text-xs text-slate-500">
                {simulation.delta_margin >= 0 ? "+" : ""}
                {simulation.delta_margin.toFixed(1)} pts de margen
              </p>
            </div>
          </div>
        </div>

        {/* Cascada comparativa */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
          <h4 className="text-sm font-bold text-slate-600 mb-3">
            Comparacion Detallada
          </h4>
          <CompareRow
            label="Ventas"
            original={simulation.original.revenue}
            simulated={simulation.simulated.revenue}
          />
          <CompareRow
            label="Costo Ventas"
            original={simulation.original.cogs}
            simulated={simulation.simulated.cogs}
          />
          <CompareRow
            label="Ut. Bruta"
            original={simulation.original.gross_profit}
            simulated={simulation.simulated.gross_profit}
          />
          <CompareRow
            label="OPEX Total"
            original={simulation.original.total_opex}
            simulated={simulation.simulated.total_opex}
          />
          <CompareRow
            label="EBITDA"
            original={simulation.original.ebitda}
            simulated={simulation.simulated.ebitda}
            highlight
          />
          <CompareRow
            label="Ut. Neta"
            original={simulation.original.net_income}
            simulated={simulation.simulated.net_income}
          />
        </div>
      </div>

      {/* ====== ESCUDO CONTRA EL MIEDO ====== */}
      {pricePct > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={20} className="text-amber-600" />
            <h4 className="text-base font-extrabold text-amber-800">
              Escudo Contra el Miedo
            </h4>
          </div>
          <p className="text-sm text-amber-700 mb-3">
            Si subes tu precio un{" "}
            <span className="font-extrabold">{pricePct}%</span>, puedes perder
            hasta{" "}
            <span className="font-extrabold text-lg">
              {maxClientLoss.toFixed(1)}%
            </span>{" "}
            de tus clientes y aun asi ganar lo mismo.
          </p>
          <div className="w-full bg-amber-200 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-amber-500 transition-all"
              style={{ width: `${Math.min(maxClientLoss, 100)}%` }}
            />
          </div>
          <p className="text-xs text-amber-500 mt-1">
            Colchon de seguridad: {maxClientLoss.toFixed(1)}% de clientes
          </p>
        </div>
      )}

      {/* ====== CALCULADOR DE LEGADO ====== */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200">
        <div className="flex items-center gap-2 mb-3">
          <Target size={20} className="text-violet-600" />
          <h4 className="text-base font-extrabold text-violet-800">
            Precio de Legado
          </h4>
          <span className="text-xs text-violet-400">
            (Meta: EBITDA 15%)
          </span>
        </div>

        {legado ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white border border-violet-100">
              <p className="text-xs text-violet-500 mb-1">
                Ventas necesarias / mes
              </p>
              <p className="text-xl font-extrabold text-violet-800">
                ${legado.ventasNecesarias.toLocaleString("es-PA", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-violet-100">
              <p className="text-xs text-violet-500 mb-1">
                Ajuste de precio requerido
              </p>
              <p
                className={`text-xl font-extrabold ${
                  legado.ajustePrecioPct > 0
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {legado.ajustePrecioPct >= 0 ? "+" : ""}
                {legado.ajustePrecioPct.toFixed(1)}%
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-violet-500">
            <Sparkles size={14} className="inline mr-1" />
            Con tu estructura actual de costos, un EBITDA del 15% no es
            alcanzable solo con precio. Necesitas reducir costos primero.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// SLIDER CARD
// ============================================

function SliderCard({
  label,
  value,
  onChange,
  min,
  max,
  color,
  suffix,
  tooltip,
  activeTooltip,
  onTooltip,
  id,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  color: string;
  suffix: string;
  tooltip: string;
  activeTooltip: string | null;
  onTooltip: (id: string | null) => void;
  id: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; range: string }> = {
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      range: "accent-emerald-600",
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      range: "accent-blue-600",
    },
    violet: {
      bg: "bg-violet-50",
      text: "text-violet-700",
      range: "accent-violet-600",
    },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`p-4 rounded-2xl ${c.bg} border border-slate-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <span className={`text-sm font-bold ${c.text}`}>{label}</span>
          <button
            onClick={() => onTooltip(activeTooltip === id ? null : id)}
            className="text-slate-400 hover:text-slate-600"
          >
            <HelpCircle size={14} />
          </button>
        </div>
        <span className={`text-lg font-extrabold ${c.text}`}>
          {value > 0 ? "+" : ""}
          {value}
          {suffix}
        </span>
      </div>

      {activeTooltip === id && (
        <p className="text-xs text-slate-500 mb-2 bg-white p-2 rounded-lg">
          {tooltip}
        </p>
      )}

      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full h-3 rounded-full cursor-pointer ${c.range}`}
        style={{ minHeight: "48px" }}
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

// ============================================
// COMPARE ROW
// ============================================

function CompareRow({
  label,
  original,
  simulated,
  highlight = false,
}: {
  label: string;
  original: number;
  simulated: number;
  highlight?: boolean;
}) {
  const diff = simulated - original;
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${
        highlight
          ? "bg-slate-50 -mx-2 px-2 rounded-lg"
          : "border-b border-slate-50"
      }`}
    >
      <span
        className={`text-xs ${
          highlight ? "font-extrabold text-slate-800" : "text-slate-500"
        }`}
      >
        {label}
      </span>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-400">
          ${original.toLocaleString("es-PA")}
        </span>
        <span className="text-slate-300">→</span>
        <span className={highlight ? "font-extrabold text-slate-800" : "text-slate-700"}>
          ${simulated.toLocaleString("es-PA")}
        </span>
        {diff !== 0 && (
          <span
            className={`text-[10px] font-bold ${
              diff > 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {diff > 0 ? "+" : ""}${diff.toLocaleString("es-PA")}
          </span>
        )}
      </div>
    </div>
  );
}
