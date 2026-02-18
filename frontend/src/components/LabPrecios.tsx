"use client";
import React, { useState, useMemo } from "react";
import {
  FlaskConical,
  Plus,
  Trash2,
  HelpCircle,
  DollarSign,
  Package,
  Users,
  Building,
  Percent,
  ShoppingCart,
} from "lucide-react";
import { computePricing } from "@/lib/calculations";
import type { Ingredient, PricingResult } from "@/lib/calculations";

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function LabPrecios() {
  // Estado de ingredientes/materiales
  const [ingredientes, setIngredientes] = useState<Ingredient[]>([
    { id: "1", nombre: "Material principal", costo: 5.0 },
    { id: "2", nombre: "Empaque", costo: 1.5 },
  ]);

  // Parametros
  const [salarioMensual, setSalarioMensual] = useState(800);
  const [minutosElaboracion, setMinutosElaboracion] = useState(30);
  const [opexMensual, setOpexMensual] = useState(3000);
  const [capacidadMensual, setCapacidadMensual] = useState(200);
  const [margenDeseado, setMargenDeseado] = useState(35);
  const [comisionPlataforma, setComisionPlataforma] = useState(0);

  // Tooltips
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // ====== CALCULO ======
  const result: PricingResult = useMemo(
    () =>
      computePricing(
        ingredientes,
        salarioMensual,
        minutosElaboracion,
        opexMensual,
        capacidadMensual,
        margenDeseado,
        comisionPlataforma
      ),
    [
      ingredientes,
      salarioMensual,
      minutosElaboracion,
      opexMensual,
      capacidadMensual,
      margenDeseado,
      comisionPlataforma,
    ]
  );

  // ====== INGREDIENT HANDLERS ======
  const addIngredient = () => {
    setIngredientes([
      ...ingredientes,
      {
        id: Date.now().toString(),
        nombre: "",
        costo: 0,
      },
    ]);
  };

  const removeIngredient = (id: string) => {
    if (ingredientes.length <= 1) return;
    setIngredientes(ingredientes.filter((i) => i.id !== id));
  };

  const updateIngredient = (
    id: string,
    field: "nombre" | "costo",
    value: string | number
  ) => {
    setIngredientes(
      ingredientes.map((i) =>
        i.id === id ? { ...i, [field]: value } : i
      )
    );
  };

  const toggleTooltip = (id: string) => {
    setActiveTooltip(activeTooltip === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* ====== HEADER ====== */}
      <div className="flex items-center gap-2">
        <FlaskConical size={20} className="text-violet-500" />
        <h3 className="text-lg font-extrabold text-slate-800 font-heading">
          Estrategia de Precios
        </h3>
        <span className="text-xs text-slate-500">
          Calcula el precio justo para tu producto
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ====== COLUMNA IZQUIERDA: INPUTS ====== */}
        <div className="space-y-5">
          {/* --- Ingredientes / Materiales --- */}
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-purple-500" />
                <span className="text-sm font-bold text-purple-800">
                  Materiales / Ingredientes
                </span>
                <TooltipButton
                  id="materiales"
                  text="Lista todo lo que necesitas para hacer UNA unidad de tu producto."
                  active={activeTooltip}
                  onToggle={toggleTooltip}
                />
              </div>
              <button
                onClick={addIngredient}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-purple-700 bg-white rounded-lg hover:bg-purple-100 transition-colors min-h-[36px]"
              >
                <Plus size={14} />
                Agregar
              </button>
            </div>

            <div className="space-y-2">
              {ingredientes.map((ing) => (
                <div
                  key={ing.id}
                  className="flex items-center gap-2 bg-white rounded-xl p-2"
                >
                  <input
                    type="text"
                    value={ing.nombre}
                    onChange={(e) =>
                      updateIngredient(ing.id, "nombre", e.target.value)
                    }
                    placeholder="Nombre"
                    className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 outline-none min-h-[44px]"
                  />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      value={ing.costo || ""}
                      onChange={(e) =>
                        updateIngredient(
                          ing.id,
                          "costo",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0.00"
                      className="w-24 text-sm pl-7 pr-2 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 outline-none min-h-[44px]"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <button
                    onClick={() => removeIngredient(ing.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    disabled={ingredientes.length <= 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* --- Mano de Obra --- */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-blue-500" />
              <span className="text-sm font-bold text-blue-800">
                Mano de Obra
              </span>
              <TooltipButton
                id="mano_obra"
                text="El salario mensual del trabajador y cuantos minutos tarda en hacer UNA unidad."
                active={activeTooltip}
                onToggle={toggleTooltip}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Salario mensual"
                value={salarioMensual}
                onChange={setSalarioMensual}
                prefix="$"
                min={0}
              />
              <InputField
                label="Minutos por unidad"
                value={minutosElaboracion}
                onChange={setMinutosElaboracion}
                suffix="min"
                min={0}
              />
            </div>
          </div>

          {/* --- Gastos Fijos --- */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <Building size={16} className="text-amber-500" />
              <span className="text-sm font-bold text-amber-800">
                Gastos Fijos
              </span>
              <TooltipButton
                id="gastos_fijos"
                text="Total de gastos mensuales fijos (alquiler, luz, internet, etc.) y cuantas unidades puedes producir al mes."
                active={activeTooltip}
                onToggle={toggleTooltip}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="OPEX mensual total"
                value={opexMensual}
                onChange={setOpexMensual}
                prefix="$"
                min={0}
              />
              <InputField
                label="Capacidad/mes"
                value={capacidadMensual}
                onChange={setCapacidadMensual}
                suffix="uds"
                min={1}
              />
            </div>
          </div>

          {/* --- Margen y Comision --- */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 mb-3">
              <Percent size={16} className="text-emerald-500" />
              <span className="text-sm font-bold text-emerald-800">
                Margen y Comision
              </span>
              <TooltipButton
                id="margen"
                text="Cuanto % quieres ganar y si vendes en plataformas (Uber, Rappi, etc.) que cobran comision."
                active={activeTooltip}
                onToggle={toggleTooltip}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Margen deseado
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={5}
                    max={80}
                    value={margenDeseado}
                    onChange={(e) =>
                      setMargenDeseado(parseInt(e.target.value))
                    }
                    className="flex-1 h-3 rounded-full accent-emerald-500 cursor-pointer"
                    style={{ minHeight: "44px" }}
                  />
                  <span className="text-sm font-bold text-emerald-600 min-w-[40px] text-right">
                    {margenDeseado}%
                  </span>
                </div>
              </div>
              <InputField
                label="Comision plataforma"
                value={comisionPlataforma}
                onChange={setComisionPlataforma}
                suffix="%"
                min={0}
                max={50}
              />
            </div>
          </div>
        </div>

        {/* ====== COLUMNA DERECHA: RESULTADOS ====== */}
        <div className="space-y-4">
          {/* --- Precio Final Hero --- */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-center">
            <p className="text-sm font-bold text-emerald-200 mb-1">
              Precio sugerido (con ITBMS)
            </p>
            <p className="text-5xl font-extrabold">
              ${result.precio_final.toFixed(2)}
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-emerald-200">
                Sin ITBMS: ${result.precio_sin_itbms.toFixed(2)}
              </span>
              <span className="text-emerald-300 font-bold">
                ITBMS: ${result.itbms.toFixed(2)}
              </span>
            </div>
          </div>

          {/* --- Desglose de Costos --- */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-violet-500" />
              Desglose por Unidad
            </h4>

            <div className="space-y-2">
              <CostRow
                label="Materiales"
                value={result.costo_materiales}
                color="text-purple-500"
                total={result.precio_sin_itbms}
              />
              <CostRow
                label="Mano de obra"
                value={result.costo_mano_obra}
                color="text-blue-500"
                total={result.precio_sin_itbms}
              />
              <CostRow
                label="Gasto fijo/unidad"
                value={result.costo_fijo_unitario}
                color="text-amber-500"
                total={result.precio_sin_itbms}
              />
              <div className="border-t border-slate-200 pt-2">
                <CostRow
                  label="Costo total"
                  value={result.costo_total_unitario}
                  color="text-slate-800"
                  total={result.precio_sin_itbms}
                  bold
                />
              </div>
              <div className="border-t border-dashed border-emerald-300 pt-2">
                <CostRow
                  label="Tu ganancia"
                  value={result.ganancia_por_unidad}
                  color="text-emerald-600"
                  total={result.precio_sin_itbms}
                  bold
                />
              </div>
            </div>
          </div>

          {/* --- Proyeccion Mensual --- */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <ShoppingCart size={16} className="text-violet-500" />
              Proyeccion Mensual
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                label="Ventas brutas"
                value={`$${(result.precio_final * capacidadMensual).toLocaleString("es-PA", { maximumFractionDigits: 0 })}`}
              />
              <MiniStat
                label="Ganancia"
                value={`$${(result.ganancia_por_unidad * capacidadMensual).toLocaleString("es-PA", { maximumFractionDigits: 0 })}`}
                green
              />
              <MiniStat
                label="Unidades"
                value={capacidadMensual.toString()}
              />
              <MiniStat
                label="Margen real"
                value={`${result.precio_sin_itbms > 0 ? ((result.ganancia_por_unidad / result.precio_sin_itbms) * 100).toFixed(1) : "0"}%`}
              />
            </div>
          </div>

          {/* --- Alerta de margen --- */}
          {margenDeseado + comisionPlataforma >= 90 && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
              Margen + Comision suman {margenDeseado + comisionPlataforma}%.
              Es imposible cubrir costos. Reduce el margen o la comision.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`w-full text-sm py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 outline-none min-h-[44px] ${
            prefix ? "pl-7 pr-3" : suffix ? "pl-3 pr-10" : "px-3"
          }`}
          min={min}
          max={max}
          step="0.01"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function TooltipButton({
  id,
  text,
  active,
  onToggle,
}: {
  id: string;
  text: string;
  active: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => onToggle(id)}
        className="text-slate-400 hover:text-violet-500"
      >
        <HelpCircle size={14} />
      </button>
      {active === id && (
        <div className="absolute z-10 left-0 top-6 w-60 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg border border-slate-700">
          {text}
        </div>
      )}
    </div>
  );
}

function CostRow({
  label,
  value,
  color,
  total,
  bold = false,
}: {
  label: string;
  value: number;
  color: string;
  total: number;
  bold?: boolean;
}) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(0) : "0";
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${color.replace("text-", "bg-")}`}
        />
        <span
          className={`text-xs ${bold ? "font-bold text-slate-800" : "text-slate-500"}`}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs ${bold ? "font-bold" : ""} ${color}`}
        >
          ${value.toFixed(2)}
        </span>
        <span className="text-[10px] text-slate-400 w-8 text-right">
          {pct}%
        </span>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="p-3 rounded-xl bg-white border border-slate-100">
      <p className="text-[10px] text-slate-500 mb-1">{label}</p>
      <p
        className={`text-sm font-bold ${
          green ? "text-emerald-600" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
