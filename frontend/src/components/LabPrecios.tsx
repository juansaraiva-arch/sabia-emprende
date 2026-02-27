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
  ChevronDown,
  ChevronUp,
  Ruler,
  Save,
  X,
} from "lucide-react";
import { computePricing } from "@/lib/calculations";
import type { Ingredient, PricingResult, UnitOfMeasure, UnitCategory } from "@/lib/calculations";
import {
  BUILTIN_UNITS,
  findUnit,
  baseUnitLabel,
  computeIngredientCost,
  resolveIngredientCosts,
} from "@/lib/unit-conversions";

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function LabPrecios() {
  // Nombre del producto o servicio
  const [productName, setProductName] = useState("");

  // Estado de ingredientes/materiales
  const [ingredientes, setIngredientes] = useState<Ingredient[]>([
    {
      id: "1",
      nombre: "Material principal",
      costoAdquisicion: 5.0,
      cantidadCompra: 1,
      unidadCompraId: "kg",
      cantidadUtilizada: 1000,
      unidadUsoId: "g",
      costo: 5.0,
    },
    {
      id: "2",
      nombre: "Empaque",
      costoAdquisicion: 1.5,
      cantidadCompra: 1,
      unidadCompraId: "kg",
      cantidadUtilizada: 1000,
      unidadUsoId: "g",
      costo: 1.5,
    },
  ]);

  // Unidades personalizadas
  const [customUnits, setCustomUnits] = useState<UnitOfMeasure[]>([]);
  const [showCustomUnitForm, setShowCustomUnitForm] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitCategory, setNewUnitCategory] = useState<UnitCategory>("weight");
  const [newUnitFactor, setNewUnitFactor] = useState(0);

  const allUnits = useMemo(
    () => [...BUILTIN_UNITS, ...customUnits],
    [customUnits]
  );

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
  const result: PricingResult = useMemo(() => {
    const resolved = resolveIngredientCosts(ingredientes, customUnits);
    return computePricing(
      resolved,
      salarioMensual,
      minutosElaboracion,
      opexMensual,
      capacidadMensual,
      margenDeseado,
      comisionPlataforma
    );
  }, [
    ingredientes,
    customUnits,
    salarioMensual,
    minutosElaboracion,
    opexMensual,
    capacidadMensual,
    margenDeseado,
    comisionPlataforma,
  ]);

  // ====== INGREDIENT HANDLERS ======
  const addIngredient = () => {
    setIngredientes([
      ...ingredientes,
      {
        id: Date.now().toString(),
        nombre: "",
        costoAdquisicion: 0,
        cantidadCompra: 1,
        unidadCompraId: "kg",
        cantidadUtilizada: 0,
        unidadUsoId: "g",
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
    field: keyof Ingredient,
    value: string | number
  ) => {
    setIngredientes(
      ingredientes.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, [field]: value };
        // Si cambia la unidad de compra a otra categoria, resetear unidad de uso
        if (field === "unidadCompraId") {
          const newCat = findUnit(value as string, customUnits)?.category;
          const oldCat = findUnit(i.unidadCompraId, customUnits)?.category;
          if (newCat && oldCat && newCat !== oldCat) {
            updated.unidadUsoId = newCat === "weight" ? "g" : "ml";
          }
        }
        // Recalcular costo si cambia un campo de conversion
        if (
          !updated.modoSimple &&
          (field === "costoAdquisicion" ||
            field === "cantidadCompra" ||
            field === "unidadCompraId" ||
            field === "cantidadUtilizada" ||
            field === "unidadUsoId")
        ) {
          updated.costo = computeIngredientCost(
            updated.costoAdquisicion,
            updated.unidadCompraId,
            updated.cantidadUtilizada,
            customUnits,
            updated.cantidadCompra,
            updated.unidadUsoId,
          );
        }
        return updated;
      })
    );
  };

  // ====== CUSTOM UNIT HANDLERS ======
  const addCustomUnit = () => {
    if (!newUnitName.trim() || newUnitFactor <= 0) return;
    const newUnit: UnitOfMeasure = {
      id: `custom_${Date.now()}`,
      label: newUnitName.trim(),
      category: newUnitCategory,
      conversionFactor: newUnitFactor,
      isCustom: true,
    };
    setCustomUnits([...customUnits, newUnit]);
    setNewUnitName("");
    setNewUnitFactor(0);
    setShowCustomUnitForm(false);
  };

  const removeCustomUnit = (unitId: string) => {
    const remaining = customUnits.filter((u) => u.id !== unitId);
    setCustomUnits(remaining);
    // Si algun ingrediente usaba esta unidad (compra o uso), resetearlo
    setIngredientes(
      ingredientes.map((ing) => {
        const resetCompra = ing.unidadCompraId === unitId;
        const resetUso = ing.unidadUsoId === unitId;
        if (!resetCompra && !resetUso) return ing;
        const updated = { ...ing };
        if (resetCompra) updated.unidadCompraId = "kg";
        if (resetUso) updated.unidadUsoId = "g";
        updated.costo = computeIngredientCost(
          updated.costoAdquisicion,
          updated.unidadCompraId,
          updated.cantidadUtilizada,
          remaining,
          updated.cantidadCompra,
          updated.unidadUsoId,
        );
        return updated;
      })
    );
  };

  const toggleTooltip = (id: string) => {
    setActiveTooltip(activeTooltip === id ? null : id);
  };

  // Obtener la categoria de la unidad actual de un ingrediente
  const getUnitCategory = (unitId: string): UnitCategory => {
    const unit = findUnit(unitId, customUnits);
    return unit?.category || "weight";
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

      {/* ====== NOMBRE DEL PRODUCTO/SERVICIO ====== */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200">
        <label className="block text-sm font-bold text-violet-800 mb-2">
          <FlaskConical size={14} className="inline mr-1.5 -mt-0.5" />
          Nombre del Producto o Servicio
        </label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Ej: Pizza Margarita, Corte de Cabello, Camiseta Estampada..."
          className="w-full px-4 py-3 rounded-xl border border-violet-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400 focus:border-violet-400 focus:outline-none font-medium"
        />
        <p className="text-[10px] text-violet-500 mt-1.5">Este nombre se usara para guardar el calculo en tu base de datos de precios.</p>
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
                  text="Ingresa el costo total de compra, cantidad y unidad comprada, y cuanto usas por producto. El sistema calcula el precio unitario y costo automaticamente."
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

            <div className="space-y-3">
              {ingredientes.map((ing) => {
                const unitCategory = getUnitCategory(ing.unidadCompraId);

                return (
                  <div
                    key={ing.id}
                    className="bg-white rounded-xl p-3 space-y-2 border border-purple-100"
                  >
                    {/* Fila 1: Nombre + Eliminar */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ing.nombre}
                        onChange={(e) =>
                          updateIngredient(ing.id, "nombre", e.target.value)
                        }
                        placeholder="Nombre del material"
                        className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 outline-none min-h-[40px]"
                      />
                      <button
                        onClick={() => removeIngredient(ing.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                        disabled={ingredientes.length <= 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Fila 2: Compra (3 campos) */}
                    <div>
                      <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">Compra</span>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {/* Costo total de la compra */}
                        <div>
                          <label className="text-[10px] text-slate-400 mb-0.5 block">
                            Costo total
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500 text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              value={ing.costoAdquisicion || ""}
                              onChange={(e) =>
                                updateIngredient(
                                  ing.id,
                                  "costoAdquisicion",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0.00"
                              className="w-full text-xs pl-5 pr-1 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:border-purple-400 focus:ring-1 focus:ring-purple-500/10 outline-none min-h-[36px]"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>

                        {/* Cantidad comprada */}
                        <div>
                          <label className="text-[10px] text-slate-400 mb-0.5 block">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            value={ing.cantidadCompra || ""}
                            onChange={(e) =>
                              updateIngredient(
                                ing.id,
                                "cantidadCompra",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="1"
                            className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:border-purple-400 focus:ring-1 focus:ring-purple-500/10 outline-none min-h-[36px]"
                            step="1"
                            min="0"
                          />
                        </div>

                        {/* Unidad de Compra */}
                        <div>
                          <label className="text-[10px] text-slate-400 mb-0.5 block">
                            Unidad
                          </label>
                          <select
                            value={ing.unidadCompraId}
                            onChange={(e) =>
                              updateIngredient(
                                ing.id,
                                "unidadCompraId",
                                e.target.value
                              )
                            }
                            className="w-full text-xs py-2 px-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-purple-400 focus:ring-1 focus:ring-purple-500/10 outline-none min-h-[36px] cursor-pointer"
                          >
                            <optgroup label="Peso">
                              {allUnits
                                .filter((u) => u.category === "weight")
                                .map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.label}
                                    {u.isCustom ? " *" : ""}
                                  </option>
                                ))}
                            </optgroup>
                            <optgroup label="Volumen">
                              {allUnits
                                .filter((u) => u.category === "volume")
                                .map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.label}
                                    {u.isCustom ? " *" : ""}
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>
                      {/* Precio unitario calculado */}
                      {(ing.cantidadCompra ?? 1) > 1 && ing.costoAdquisicion > 0 && (
                        <p className="text-[10px] text-emerald-600 mt-1">
                          Precio unitario: ${(ing.costoAdquisicion / (ing.cantidadCompra ?? 1)).toFixed(2)}/{findUnit(ing.unidadCompraId, customUnits)?.label ?? ing.unidadCompraId}
                        </p>
                      )}
                    </div>

                    {/* Fila 3: Uso por producto (2 campos) */}
                    <div>
                      <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">Uso por producto</span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {/* Cantidad que usas */}
                        <div>
                          <label className="text-[10px] text-slate-400 mb-0.5 block">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            value={ing.cantidadUtilizada || ""}
                            onChange={(e) =>
                              updateIngredient(
                                ing.id,
                                "cantidadUtilizada",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:border-purple-400 focus:ring-1 focus:ring-purple-500/10 outline-none min-h-[36px]"
                            step="0.01"
                            min="0"
                          />
                        </div>

                        {/* Unidad de uso */}
                        <div>
                          <label className="text-[10px] text-slate-400 mb-0.5 block">
                            Unidad
                          </label>
                          <select
                            value={ing.unidadUsoId || (unitCategory === "weight" ? "g" : "ml")}
                            onChange={(e) =>
                              updateIngredient(
                                ing.id,
                                "unidadUsoId",
                                e.target.value
                              )
                            }
                            className="w-full text-xs py-2 px-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-purple-400 focus:ring-1 focus:ring-purple-500/10 outline-none min-h-[36px] cursor-pointer"
                          >
                            {allUnits
                              .filter((u) => u.category === unitCategory)
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.label}
                                  {u.isCustom ? " *" : ""}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Fila 4: Costo calculado */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-purple-50 rounded-lg border border-purple-100">
                      <span className="text-[10px] text-purple-500 font-medium">
                        Costo en tu producto:
                      </span>
                      <span className="text-xs font-bold text-purple-800">
                        ${ing.costo.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* --- Unidades Personalizadas --- */}
            <div className="mt-3 pt-3 border-t border-purple-200">
              <button
                onClick={() => setShowCustomUnitForm(!showCustomUnitForm)}
                className="flex items-center gap-1.5 text-[11px] text-purple-500 hover:text-purple-700 font-medium transition-colors"
              >
                <Ruler size={12} />
                {showCustomUnitForm ? "Cancelar" : "Crear unidad personalizada"}
                {showCustomUnitForm ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>

              {showCustomUnitForm && (
                <div className="mt-2 p-3 bg-white rounded-xl border border-purple-100 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 mb-0.5 block">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                        placeholder="Ej: Saco 25kg"
                        className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 outline-none focus:border-purple-400 min-h-[36px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 mb-0.5 block">
                        Tipo
                      </label>
                      <select
                        value={newUnitCategory}
                        onChange={(e) =>
                          setNewUnitCategory(e.target.value as UnitCategory)
                        }
                        className="w-full text-xs py-2 px-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:border-purple-400 min-h-[36px] cursor-pointer"
                      >
                        <option value="weight">Peso (g)</option>
                        <option value="volume">Volumen (ml)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 mb-0.5 block">
                        Equivale a ({baseUnitLabel(newUnitCategory)})
                      </label>
                      <input
                        type="number"
                        value={newUnitFactor || ""}
                        onChange={(e) =>
                          setNewUnitFactor(parseFloat(e.target.value) || 0)
                        }
                        placeholder="25000"
                        className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 outline-none focus:border-purple-400 min-h-[36px]"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addCustomUnit}
                    disabled={!newUnitName.trim() || newUnitFactor <= 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save size={12} />
                    Guardar unidad
                  </button>
                </div>
              )}

              {/* Lista de unidades custom */}
              {customUnits.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {customUnits.map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-purple-600 bg-purple-100 rounded-full"
                    >
                      {u.label} ({u.conversionFactor.toLocaleString()}{baseUnitLabel(u.category)})
                      <button
                        onClick={() => removeCustomUnit(u.id)}
                        className="text-purple-400 hover:text-red-500 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
