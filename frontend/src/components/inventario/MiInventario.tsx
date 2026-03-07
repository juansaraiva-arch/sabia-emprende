"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Boxes,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Plus,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Filter,
  LayoutGrid,
  List,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Info,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Loader2,
  Eye,
  Save,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  type InventarioItem,
  type MovimientoInventario,
  type TipoMovimiento,
  type InventarioConfig,
  type InventarioMetrics,
  CATEGORIAS_DEFAULT,
  UNIDADES_INVENTARIO,
  TIPOS_MOVIMIENTO,
  esEntrada,
  esSalida,
  getLabelMovimiento,
  calcularMargen,
  calcularValorTotal,
  calcularROPAutomatico,
  calcularConsumoDiario,
  calcularCostoPromedioPonderado,
  generarSKU,
  loadCatalogo,
  saveCatalogo,
  loadMovimientos,
  saveMovimientos,
  loadCategoriasCustom,
  saveCategoriasCustom,
  getAllCategorias,
  loadConfig,
  saveConfig,
  computeInventarioMetrics,
  formatBalboas,
} from "@/lib/inventario-types";

// ============================================
// PROPS & TYPES
// ============================================

interface MiInventarioProps {
  societyId: string;
}

type InventarioTab = "dashboard" | "catalogo" | "movimientos";
type CatalogoView = "tabla" | "tarjetas";

// ============================================
// HELPERS
// ============================================

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatFechaHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ============================================
// SUMMARY CARD
// ============================================

function SummaryCard({
  label,
  value,
  icon,
  color,
  subtext,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtext?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xl font-extrabold text-slate-800 mt-0.5">{value}</p>
        {subtext && (
          <p className="text-[10px] text-slate-400 mt-0.5">{subtext}</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// ITEM FORM MODAL
// ============================================

function ItemFormModal({
  item,
  allItems,
  categorias,
  onSave,
  onClose,
  onAddCategoria,
}: {
  item: InventarioItem | null;
  allItems: InventarioItem[];
  categorias: string[];
  onSave: (item: InventarioItem) => void;
  onClose: () => void;
  onAddCategoria: (cat: string) => void;
}) {
  const isEdit = !!item;

  const [sku, setSku] = useState(item?.sku || "");
  const [nombre, setNombre] = useState(item?.nombre || "");
  const [descripcion, setDescripcion] = useState(item?.descripcion || "");
  const [categoria, setCategoria] = useState(item?.categoria || CATEGORIAS_DEFAULT[0]);
  const [cantidadActual, setCantidadActual] = useState(item?.cantidad_actual ?? 0);
  const [unidadMedida, setUnidadMedida] = useState(item?.unidad_medida || "unidad");
  const [costoUnitario, setCostoUnitario] = useState(item?.costo_unitario ?? 0);
  const [precioVenta, setPrecioVenta] = useState(item?.precio_venta ?? 0);
  const [puntoReorden, setPuntoReorden] = useState(item?.punto_reorden ?? 0);
  const [modoRop, setModoRop] = useState<"manual" | "automatico">(item?.modo_calculo_rop || "manual");
  const [leadTime, setLeadTime] = useState(item?.lead_time_dias ?? 0);
  const [consumoDiario, setConsumoDiario] = useState(item?.consumo_diario_promedio ?? 0);
  const [safetyStock, setSafetyStock] = useState(item?.safety_stock ?? 0);
  const [proveedor, setProveedor] = useState(item?.proveedor_principal || "");
  const [contactoProveedor, setContactoProveedor] = useState(item?.contacto_proveedor || "");
  const [ubicacion, setUbicacion] = useState(item?.ubicacion_bin || "");
  const [estado, setEstado] = useState<"activo" | "descontinuado">(item?.estado || "activo");
  const [newCat, setNewCat] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Auto-generate SKU
  useEffect(() => {
    if (!isEdit && !sku) {
      setSku(generarSKU(categoria, allItems));
    }
  }, [categoria]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-calc ROP
  const ropCalculado = useMemo(() => {
    if (modoRop === "automatico" && leadTime > 0 && consumoDiario > 0) {
      return calcularROPAutomatico(leadTime, consumoDiario, safetyStock);
    }
    return null;
  }, [modoRop, leadTime, consumoDiario, safetyStock]);

  useEffect(() => {
    if (ropCalculado !== null) {
      setPuntoReorden(ropCalculado);
    }
  }, [ropCalculado]);

  const margen = useMemo(() => calcularMargen(costoUnitario, precioVenta), [costoUnitario, precioVenta]);

  function validate(): boolean {
    const errs: string[] = [];
    if (!sku.trim()) errs.push("SKU es obligatorio");
    if (!nombre.trim()) errs.push("Nombre es obligatorio");
    if (!categoria) errs.push("Categoria es obligatoria");
    if (costoUnitario < 0) errs.push("Costo unitario no puede ser negativo");
    // Validate SKU uniqueness
    const existingSku = allItems.find(
      (i) => i.sku.toUpperCase() === sku.toUpperCase().trim() && i.id !== item?.id
    );
    if (existingSku) errs.push(`Ya existe un item con SKU "${sku}"`);
    if (modoRop === "automatico") {
      if (!leadTime || leadTime <= 0) errs.push("Lead Time es obligatorio en modo automatico");
      if (!consumoDiario || consumoDiario <= 0) errs.push("Consumo diario es obligatorio en modo automatico");
    }
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const now = new Date().toISOString();
    const saved: InventarioItem = {
      id: item?.id || generateId(),
      sku: sku.toUpperCase().trim(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      categoria,
      cantidad_actual: isEdit ? cantidadActual : cantidadActual,
      unidad_medida: unidadMedida,
      costo_unitario: costoUnitario,
      precio_venta: precioVenta,
      punto_reorden: puntoReorden,
      modo_calculo_rop: modoRop,
      lead_time_dias: leadTime || undefined,
      consumo_diario_promedio: consumoDiario || undefined,
      safety_stock: safetyStock,
      proveedor_principal: proveedor.trim() || undefined,
      contacto_proveedor: contactoProveedor.trim() || undefined,
      ubicacion_bin: ubicacion.trim() || undefined,
      estado,
      imagen: item?.imagen,
      fecha_creacion: item?.fecha_creacion || now,
      ultima_actualizacion: now,
      societyId: item?.societyId || "",
    };
    onSave(saved);
  }

  function handleAddCategoria() {
    const trimmed = newCat.trim();
    if (trimmed && !categorias.includes(trimmed)) {
      onAddCategoria(trimmed);
      setCategoria(trimmed);
    }
    setNewCat("");
    setShowNewCat(false);
  }

  const inputClass = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none";
  const labelClass = "text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">
            {isEdit ? "Editar Item" : "Nuevo Item de Inventario"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle size={12} /> {e}
              </p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Row 1: SKU + Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>SKU *</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className={`${inputClass} font-mono`}
                placeholder="MP-001"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Nombre *</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputClass}
                placeholder="Nombre del producto o materia prima"
              />
            </div>
          </div>

          {/* Row 2: Categoria + Unidad + Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Categoria *</label>
              {showNewCat ? (
                <div className="flex gap-1">
                  <input
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    className={inputClass}
                    placeholder="Nueva categoria"
                    autoFocus
                  />
                  <button type="button" onClick={handleAddCategoria} className="px-2 bg-amber-500 text-white rounded-lg text-xs font-bold">
                    +
                  </button>
                  <button type="button" onClick={() => setShowNewCat(false)} className="px-2 bg-slate-200 rounded-lg text-xs">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClass}>
                    {categorias.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowNewCat(true)} className="px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-600" title="Agregar categoria">
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Unidad de Medida *</label>
              <select value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value)} className={inputClass}>
                {UNIDADES_INVENTARIO.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as "activo" | "descontinuado")} className={inputClass}>
                <option value="activo">Activo</option>
                <option value="descontinuado">Descontinuado</option>
              </select>
            </div>
          </div>

          {/* Row 3: Cantidad + Costo + Precio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {!isEdit && (
              <div>
                <label className={labelClass}>Cantidad Inicial</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={cantidadActual}
                  onChange={(e) => setCantidadActual(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>Costo Unitario (B/.) *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={costoUnitario}
                onChange={(e) => setCostoUnitario(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Precio de Venta (B/.)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(Number(e.target.value))}
                className={inputClass}
              />
              {margen !== null && (
                <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                  Margen: {margen.toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          {/* Descripcion */}
          <div>
            <label className={labelClass}>Descripcion</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Detalles adicionales del producto..."
            />
          </div>

          {/* ROP Section */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-800">Punto de Reorden (ROP)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Modo de Calculo</label>
                <select value={modoRop} onChange={(e) => setModoRop(e.target.value as "manual" | "automatico")} className={inputClass}>
                  <option value="manual">Manual</option>
                  <option value="automatico">Automatico</option>
                </select>
              </div>
              {modoRop === "manual" ? (
                <div>
                  <label className={labelClass}>Punto de Reorden</label>
                  <input
                    type="number"
                    min={0}
                    value={puntoReorden}
                    onChange={(e) => setPuntoReorden(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className={labelClass}>Lead Time (dias) *</label>
                    <input
                      type="number"
                      min={0}
                      value={leadTime}
                      onChange={(e) => setLeadTime(Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Consumo Diario Prom. *</label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={consumoDiario}
                      onChange={(e) => setConsumoDiario(Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Safety Stock</label>
                    <input
                      type="number"
                      min={0}
                      value={safetyStock}
                      onChange={(e) => setSafetyStock(Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  {ropCalculado !== null && (
                    <div className="sm:col-span-2 text-xs text-amber-700 bg-white p-2 rounded-lg border border-amber-200">
                      <strong>ROP calculado:</strong> ({leadTime} dias x {consumoDiario} uds/dia) + {safetyStock} = <strong>{ropCalculado} unidades</strong>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Proveedor + Ubicacion */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Proveedor Principal</label>
              <input
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                className={inputClass}
                placeholder="Nombre del proveedor"
              />
            </div>
            <div>
              <label className={labelClass}>Contacto Proveedor</label>
              <input
                value={contactoProveedor}
                onChange={(e) => setContactoProveedor(e.target.value)}
                className={inputClass}
                placeholder="Tel. o email"
              />
            </div>
            <div>
              <label className={labelClass}>Ubicacion / Bin</label>
              <input
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                className={inputClass}
                placeholder="Pasillo A, Estante 3"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 flex items-center gap-2">
              <Save size={16} />
              {isEdit ? "Guardar Cambios" : "Crear Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// MOVIMIENTO FORM MODAL
// ============================================

function MovimientoFormModal({
  items,
  preselectedItemId,
  onSave,
  onClose,
}: {
  items: InventarioItem[];
  preselectedItemId?: string;
  onSave: (mov: MovimientoInventario, updateCosto: boolean) => void;
  onClose: () => void;
}) {
  const [itemId, setItemId] = useState(preselectedItemId || "");
  const [tipo, setTipo] = useState<TipoMovimiento>("entrada_compra");
  const [cantidad, setCantidad] = useState<number>(0);
  const [costoMomento, setCostoMomento] = useState<number>(0);
  const [referencia, setReferencia] = useState("");
  const [proveedorCliente, setProveedorCliente] = useState("");
  const [notas, setNotas] = useState("");
  const [fecha, setFecha] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [showCostPrompt, setShowCostPrompt] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const selectedItem = useMemo(() => items.find((i) => i.id === itemId), [items, itemId]);

  // Pre-fill cost from selected item
  useEffect(() => {
    if (selectedItem) {
      setCostoMomento(selectedItem.costo_unitario);
      if (selectedItem.proveedor_principal) {
        setProveedorCliente(selectedItem.proveedor_principal);
      }
    }
  }, [selectedItem]);

  const filteredItems = useMemo(() => {
    const q = searchQ.toLowerCase().trim();
    if (!q) return items.filter((i) => i.estado === "activo");
    return items.filter(
      (i) =>
        i.estado === "activo" &&
        (i.nombre.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    );
  }, [items, searchQ]);

  function validate(): boolean {
    const errs: string[] = [];
    if (!itemId) errs.push("Selecciona un item");
    if (cantidad <= 0) errs.push("Cantidad debe ser mayor a 0");
    if (!fecha) errs.push("Fecha es obligatoria");
    // Check stock for salidas
    if (selectedItem && esSalida(tipo)) {
      if (cantidad > selectedItem.cantidad_actual) {
        errs.push(`No hay suficiente stock. Disponible: ${selectedItem.cantidad_actual}`);
      }
    }
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !selectedItem) return;

    // Check if cost changed for compra
    if (tipo === "entrada_compra" && costoMomento !== selectedItem.costo_unitario && costoMomento > 0) {
      setShowCostPrompt(true);
      return;
    }

    doSave(false);
  }

  function doSave(updateCosto: boolean) {
    if (!selectedItem) return;

    const esEnt = esEntrada(tipo);
    const cantidadResultante = esEnt
      ? selectedItem.cantidad_actual + cantidad
      : selectedItem.cantidad_actual - cantidad;

    const mov: MovimientoInventario = {
      id: generateId(),
      fecha: new Date(fecha).toISOString(),
      tipo,
      item_id: selectedItem.id,
      item_sku: selectedItem.sku,
      item_nombre: selectedItem.nombre,
      cantidad,
      costo_unitario_momento: costoMomento,
      referencia: referencia.trim() || undefined,
      proveedor_cliente: proveedorCliente.trim() || undefined,
      notas: notas.trim() || undefined,
      cantidad_resultante: cantidadResultante,
      societyId: selectedItem.societyId,
    };

    onSave(mov, updateCosto);
    setShowCostPrompt(false);
  }

  const inputClass = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none";
  const labelClass = "text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8">
        {/* Cost change prompt */}
        {showCostPrompt && (
          <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-3">Costo diferente detectado</h4>
              <p className="text-xs text-slate-600 mb-4">
                El costo de compra ({formatBalboas(costoMomento)}) es diferente al costo actual del catalogo ({formatBalboas(selectedItem?.costo_unitario || 0)}).
                ¿Deseas actualizar el costo unitario con el promedio ponderado?
              </p>
              <div className="flex gap-2">
                <button onClick={() => doSave(true)} className="flex-1 px-3 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700">
                  Si, actualizar
                </button>
                <button onClick={() => doSave(false)} className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200">
                  No, mantener
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">Registrar Movimiento</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle size={12} /> {e}
              </p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Item search */}
          <div>
            <label className={labelClass}>Item (SKU o Nombre) *</label>
            <input
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); if (itemId) setItemId(""); }}
              className={inputClass}
              placeholder="Buscar por SKU o nombre..."
            />
            {searchQ && !itemId && filteredItems.length > 0 && (
              <div className="mt-1 bg-white border border-slate-200 rounded-lg max-h-40 overflow-y-auto shadow-lg">
                {filteredItems.slice(0, 10).map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setItemId(it.id);
                      setSearchQ(`${it.sku} — ${it.nombre}`);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                  >
                    <span>
                      <span className="font-mono font-bold text-amber-700">{it.sku}</span>
                      <span className="text-slate-600 ml-2">{it.nombre}</span>
                    </span>
                    <span className="text-slate-400">Stock: {it.cantidad_actual}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedItem && (
              <p className="text-[10px] text-slate-400 mt-1">
                Stock actual: <strong>{selectedItem.cantidad_actual}</strong> {selectedItem.unidad_medida} | Costo: {formatBalboas(selectedItem.costo_unitario)}
              </p>
            )}
          </div>

          {/* Tipo + Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tipo de Movimiento *</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimiento)} className={inputClass}>
                <optgroup label="Entradas (+)">
                  {TIPOS_MOVIMIENTO.filter((t) => t.efecto === "entrada").map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Salidas (-)">
                  {TIPOS_MOVIMIENTO.filter((t) => t.efecto === "salida").map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha y Hora *</label>
              <input
                type="datetime-local"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Cantidad + Costo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Cantidad *</label>
              <input
                type="number"
                min={0.01}
                step="any"
                value={cantidad || ""}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Costo Unitario (B/.)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={costoMomento}
                onChange={(e) => setCostoMomento(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Referencia + Proveedor/Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Referencia / Documento</label>
              <input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className={inputClass}
                placeholder="Nro. factura, O.C., etc."
              />
            </div>
            <div>
              <label className={labelClass}>Proveedor / Cliente</label>
              <input
                value={proveedorCliente}
                onChange={(e) => setProveedorCliente(e.target.value)}
                className={inputClass}
                placeholder="Nombre"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={labelClass}>Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Observaciones..."
            />
          </div>

          {/* Preview */}
          {selectedItem && cantidad > 0 && (
            <div className={`p-3 rounded-xl border text-xs ${esEntrada(tipo) ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              <strong>Vista previa:</strong> {selectedItem.nombre} — Stock actual: {selectedItem.cantidad_actual} {esEntrada(tipo) ? "+" : "−"} {cantidad} = <strong>{esEntrada(tipo) ? selectedItem.cantidad_actual + cantidad : selectedItem.cantidad_actual - cantidad}</strong>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 flex items-center gap-2">
              {esEntrada(tipo) ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD TAB
// ============================================

function DashboardTab({
  items,
  movimientos,
  metrics,
  onRegistrarCompra,
}: {
  items: InventarioItem[];
  movimientos: MovimientoInventario[];
  metrics: InventarioMetrics;
  onRegistrarCompra: (itemId: string) => void;
}) {
  // Top 10 by value
  const top10Valor = useMemo(() => {
    return items
      .filter((i) => i.estado === "activo" && i.cantidad_actual > 0)
      .map((i) => ({
        nombre: i.nombre.length > 20 ? i.nombre.slice(0, 20) + "..." : i.nombre,
        valor: Math.round(i.cantidad_actual * i.costo_unitario * 100) / 100,
        sku: i.sku,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [items]);

  // Movimientos del mes (entradas vs salidas por dia)
  const movimientosMes = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const data: { dia: number; entradas: number; salidas: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      data.push({ dia: d, entradas: 0, salidas: 0 });
    }

    const mesMovs = movimientos.filter((m) => {
      const d = new Date(m.fecha);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    for (const m of mesMovs) {
      const dia = new Date(m.fecha).getDate();
      const idx = dia - 1;
      if (idx >= 0 && idx < data.length) {
        if (esEntrada(m.tipo)) {
          data[idx].entradas += m.cantidad;
        } else {
          data[idx].salidas += m.cantidad;
        }
      }
    }

    return data;
  }, [movimientos]);

  // Items en reorden
  const itemsReorden = useMemo(() => {
    return items
      .filter(
        (i) => i.estado === "activo" && i.punto_reorden > 0 && i.cantidad_actual <= i.punto_reorden
      )
      .map((i) => ({
        ...i,
        deficit: i.punto_reorden - i.cantidad_actual,
      }))
      .sort((a, b) => {
        // Agotados primero, luego por deficit
        if (a.cantidad_actual === 0 && b.cantidad_actual > 0) return -1;
        if (b.cantidad_actual === 0 && a.cantidad_actual > 0) return 1;
        return b.deficit - a.deficit;
      });
  }, [items]);

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Items Activos"
          value={metrics.totalItemsActivos}
          icon={<Package size={20} className="text-blue-600" />}
          color="bg-blue-100"
        />
        <SummaryCard
          label="Valor Total Inventario"
          value={formatBalboas(metrics.valorTotalInventario)}
          icon={<Boxes size={20} className="text-amber-600" />}
          color="bg-amber-100"
          subtext="Dinero inmovilizado"
        />
        <SummaryCard
          label="Punto Critico"
          value={metrics.itemsEnPuntoCritico}
          icon={<AlertTriangle size={20} className="text-orange-600" />}
          color="bg-orange-100"
          subtext={metrics.itemsEnPuntoCritico > 0 ? "Requieren reorden" : "Todo OK"}
        />
        <SummaryCard
          label="Agotados"
          value={metrics.itemsAgotados}
          icon={<AlertTriangle size={20} className="text-red-600" />}
          color="bg-red-100"
          subtext={metrics.itemsAgotados > 0 ? "Sin stock" : "Ningun agotado"}
        />
      </div>

      {/* Alerts Table */}
      {itemsReorden.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-amber-50 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <h4 className="text-sm font-bold text-amber-800">
              Alertas de Reorden ({itemsReorden.length})
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2.5 font-bold text-slate-600">SKU</th>
                  <th className="text-left px-3 py-2.5 font-bold text-slate-600">Nombre</th>
                  <th className="text-center px-3 py-2.5 font-bold text-slate-600">Stock</th>
                  <th className="text-center px-3 py-2.5 font-bold text-slate-600">ROP</th>
                  <th className="text-center px-3 py-2.5 font-bold text-red-600">Deficit</th>
                  <th className="text-left px-3 py-2.5 font-bold text-slate-600">Proveedor</th>
                  <th className="text-center px-3 py-2.5 font-bold text-slate-600">Accion</th>
                </tr>
              </thead>
              <tbody>
                {itemsReorden.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-100 ${
                      item.cantidad_actual === 0 ? "bg-red-50" : "bg-amber-50/30"
                    }`}
                  >
                    <td className="px-3 py-2 font-mono font-bold text-amber-700">{item.sku}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium">{item.nombre}</td>
                    <td className={`px-3 py-2 text-center font-bold ${item.cantidad_actual === 0 ? "text-red-600" : "text-amber-600"}`}>
                      {item.cantidad_actual}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500">{item.punto_reorden}</td>
                    <td className="px-3 py-2 text-center font-bold text-red-600">-{item.deficit}</td>
                    <td className="px-3 py-2 text-slate-500">{item.proveedor_principal || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onRegistrarCompra(item.id)}
                        className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700"
                      >
                        <ShoppingCart size={10} className="inline mr-1" />
                        Comprar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 por valor */}
        {top10Valor.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <BarChart3 size={16} className="text-amber-600" />
              Top 10 por Valor Inmovilizado
            </h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10Valor} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `B/.${v.toLocaleString()}`} />
                <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number) => [formatBalboas(value), "Valor"]}
                  labelStyle={{ fontSize: 11, fontWeight: "bold" }}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {top10Valor.map((_, index) => (
                    <Cell key={index} fill={index === 0 ? "#d97706" : index < 3 ? "#f59e0b" : "#fbbf24"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Movimientos del mes */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-600" />
            Movimientos del Mes
          </h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={movimientosMes} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                labelFormatter={(dia) => `Dia ${dia}`}
              />
              <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="salidas" name="Salidas" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Entradas</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-sm" /> Salidas</span>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Boxes size={48} className="mx-auto text-slate-300 mb-4" />
          <h4 className="text-base font-bold text-slate-600 mb-2">
            Tu inventario esta vacio
          </h4>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Comienza agregando productos o materias primas en la seccion <strong>Catalogo</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// CATALOGO TAB
// ============================================

function CatalogoTab({
  items,
  categorias,
  onEdit,
  onDelete,
  onCreate,
  onExportCSV,
}: {
  items: InventarioItem[];
  categorias: string[];
  onEdit: (item: InventarioItem) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onExportCSV: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterEstado, setFilterEstado] = useState<"" | "activo" | "descontinuado">("");
  const [sortBy, setSortBy] = useState<"nombre" | "cantidad" | "valor" | "sku">("nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [view, setView] = useState<CatalogoView>("tabla");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...items];

    // Search
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (i) =>
          i.nombre.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          (i.proveedor_principal && i.proveedor_principal.toLowerCase().includes(q)) ||
          (i.ubicacion_bin && i.ubicacion_bin.toLowerCase().includes(q))
      );
    }

    // Filters
    if (filterCat) result = result.filter((i) => i.categoria === filterCat);
    if (filterEstado) result = result.filter((i) => i.estado === filterEstado);

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "nombre": cmp = a.nombre.localeCompare(b.nombre); break;
        case "sku": cmp = a.sku.localeCompare(b.sku); break;
        case "cantidad": cmp = a.cantidad_actual - b.cantidad_actual; break;
        case "valor": cmp = (a.cantidad_actual * a.costo_unitario) - (b.cantidad_actual * b.costo_unitario); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [items, search, filterCat, filterEstado, sortBy, sortDir]);

  function toggleSort(key: "nombre" | "cantidad" | "valor" | "sku") {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            placeholder="Buscar por SKU, nombre, proveedor..."
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            showFilters ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Filter size={14} />
          Filtros
        </button>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setView("tabla")}
            className={`p-2 ${view === "tabla" ? "bg-amber-100 text-amber-700" : "bg-white text-slate-400 hover:bg-slate-50"}`}
          >
            <List size={14} />
          </button>
          <button
            onClick={() => setView("tarjetas")}
            className={`p-2 ${view === "tarjetas" ? "bg-amber-100 text-amber-700" : "bg-white text-slate-400 hover:bg-slate-50"}`}
          >
            <LayoutGrid size={14} />
          </button>
        </div>
        <button
          onClick={onExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <Download size={14} />
          CSV
        </button>
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700"
        >
          <Plus size={14} />
          Nuevo Item
        </button>
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="">Todas las categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as "" | "activo" | "descontinuado")}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="descontinuado">Descontinuado</option>
          </select>
          <span className="text-[10px] text-slate-400 self-center ml-auto">
            {filtered.length} de {items.length} items
          </span>
        </div>
      )}

      {/* TABLE VIEW */}
      {view === "tabla" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2.5 font-bold text-slate-600 cursor-pointer hover:text-amber-600" onClick={() => toggleSort("sku")}>
                    <span className="flex items-center gap-1">SKU <SortIcon field="sku" /></span>
                  </th>
                  <th className="text-left px-3 py-2.5 font-bold text-slate-600 cursor-pointer hover:text-amber-600 min-w-[140px]" onClick={() => toggleSort("nombre")}>
                    <span className="flex items-center gap-1">Nombre <SortIcon field="nombre" /></span>
                  </th>
                  <th className="text-left px-3 py-2.5 font-bold text-slate-600">Categoria</th>
                  <th className="text-center px-3 py-2.5 font-bold text-slate-600 cursor-pointer hover:text-amber-600" onClick={() => toggleSort("cantidad")}>
                    <span className="flex items-center gap-1 justify-center">Stock <SortIcon field="cantidad" /></span>
                  </th>
                  <th className="text-right px-3 py-2.5 font-bold text-slate-600">Costo Unit.</th>
                  <th className="text-right px-3 py-2.5 font-bold text-slate-600">P. Venta</th>
                  <th className="text-right px-3 py-2.5 font-bold text-amber-700 bg-amber-50 cursor-pointer hover:text-amber-800" onClick={() => toggleSort("valor")}>
                    <span className="flex items-center gap-1 justify-end">Valor Total <SortIcon field="valor" /></span>
                  </th>
                  <th className="text-center px-3 py-2.5 font-bold text-slate-600">ROP</th>
                  <th className="text-center px-3 py-2.5 font-bold text-slate-600">Estado</th>
                  <th className="text-center px-3 py-2.5 font-bold text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const valor = calcularValorTotal(item);
                  const margen = calcularMargen(item.costo_unitario, item.precio_venta);
                  const enReorden = item.punto_reorden > 0 && item.cantidad_actual <= item.punto_reorden;
                  const agotado = item.cantidad_actual === 0;

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        agotado ? "bg-red-50/30" : enReorden ? "bg-amber-50/30" : ""
                      } ${item.estado === "descontinuado" ? "opacity-50" : ""}`}
                    >
                      <td className="px-3 py-2 font-mono font-bold text-amber-700">{item.sku}</td>
                      <td className="px-3 py-2 text-slate-700 font-medium">
                        {item.nombre}
                        {enReorden && <AlertTriangle size={10} className="inline ml-1 text-amber-500" />}
                        {agotado && <AlertTriangle size={10} className="inline ml-1 text-red-500" />}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">{item.categoria}</span>
                      </td>
                      <td className={`px-3 py-2 text-center font-bold ${agotado ? "text-red-600" : enReorden ? "text-amber-600" : "text-slate-700"}`}>
                        {item.cantidad_actual}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{formatBalboas(item.costo_unitario)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">
                        {item.precio_venta > 0 ? formatBalboas(item.precio_venta) : "—"}
                        {margen !== null && (
                          <span className="block text-[9px] text-emerald-500">{margen.toFixed(0)}%</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-amber-700 bg-amber-50/50">
                        {formatBalboas(valor)}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500">
                        {item.punto_reorden > 0 ? item.punto_reorden : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          item.estado === "activo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-400"
                        }`}>
                          {item.estado === "activo" ? "Activo" : "Descontin."}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => onEdit(item)} className="p-1 hover:bg-amber-50 rounded text-slate-400 hover:text-amber-600" title="Editar">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => onDelete(item.id)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500" title="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-sm text-slate-400">
              No se encontraron items con esos criterios
            </div>
          )}
        </div>
      )}

      {/* CARD VIEW */}
      {view === "tarjetas" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => {
            const valor = calcularValorTotal(item);
            const margen = calcularMargen(item.costo_unitario, item.precio_venta);
            const enReorden = item.punto_reorden > 0 && item.cantidad_actual <= item.punto_reorden;
            const agotado = item.cantidad_actual === 0;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md ${
                  agotado ? "border-red-200 bg-red-50/20" : enReorden ? "border-amber-200 bg-amber-50/20" : "border-slate-200"
                } ${item.estado === "descontinuado" ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-amber-600">{item.sku}</span>
                    <h5 className="text-sm font-bold text-slate-800 mt-0.5 line-clamp-1">{item.nombre}</h5>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                    item.estado === "activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}>
                    {item.estado === "activo" ? "Activo" : "Descontin."}
                  </span>
                </div>

                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 inline-block mb-3">{item.categoria}</span>

                <div className="grid grid-cols-2 gap-2 text-[10px] mb-3">
                  <div>
                    <span className="text-slate-400 block">Stock</span>
                    <span className={`font-bold ${agotado ? "text-red-600" : enReorden ? "text-amber-600" : "text-slate-700"}`}>
                      {item.cantidad_actual} {item.unidad_medida}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Valor</span>
                    <span className="font-bold text-amber-700">{formatBalboas(valor)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Costo</span>
                    <span className="font-mono text-slate-600">{formatBalboas(item.costo_unitario)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">P. Venta</span>
                    <span className="font-mono text-slate-600">
                      {item.precio_venta > 0 ? formatBalboas(item.precio_venta) : "—"}
                      {margen !== null && <span className="text-emerald-500 ml-1">({margen.toFixed(0)}%)</span>}
                    </span>
                  </div>
                </div>

                {(enReorden || agotado) && (
                  <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg mb-2 ${
                    agotado ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    <AlertTriangle size={10} />
                    {agotado ? "AGOTADO" : `Reorden (ROP: ${item.punto_reorden})`}
                  </div>
                )}

                {item.proveedor_principal && (
                  <p className="text-[10px] text-slate-400 truncate">
                    Prov: {item.proveedor_principal}
                  </p>
                )}

                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-100">
                  <button onClick={() => onEdit(item)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg text-[10px] font-bold text-amber-700">
                    <Edit3 size={11} /> Editar
                  </button>
                  <button onClick={() => onDelete(item.id)} className="px-2 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-[10px] font-bold text-red-600">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-10 text-sm text-slate-400">
              No se encontraron items
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MOVIMIENTOS TAB
// ============================================

function MovimientosTab({
  movimientos,
  onNuevoMovimiento,
  onExportCSV,
}: {
  movimientos: MovimientoInventario[];
  onNuevoMovimiento: () => void;
  onExportCSV: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<TipoMovimiento | "">("");
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...movimientos].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (m) =>
          m.item_nombre.toLowerCase().includes(q) ||
          m.item_sku.toLowerCase().includes(q) ||
          (m.referencia && m.referencia.toLowerCase().includes(q)) ||
          (m.proveedor_cliente && m.proveedor_cliente.toLowerCase().includes(q))
      );
    }

    if (filterTipo) result = result.filter((m) => m.tipo === filterTipo);

    if (filterDesde) {
      const desde = new Date(filterDesde);
      result = result.filter((m) => new Date(m.fecha) >= desde);
    }
    if (filterHasta) {
      const hasta = new Date(filterHasta);
      hasta.setHours(23, 59, 59);
      result = result.filter((m) => new Date(m.fecha) <= hasta);
    }

    return result;
  }, [movimientos, search, filterTipo, filterDesde, filterHasta]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            placeholder="Buscar por SKU, item, referencia..."
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            showFilters ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Filter size={14} />
          Filtros
        </button>
        <button
          onClick={onExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <Download size={14} />
          CSV
        </button>
        <button
          onClick={onNuevoMovimiento}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700"
        >
          <Plus size={14} />
          Nuevo Movimiento
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as TipoMovimiento | "")}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="">Todos los tipos</option>
            <optgroup label="Entradas">
              {TIPOS_MOVIMIENTO.filter((t) => t.efecto === "entrada").map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </optgroup>
            <optgroup label="Salidas">
              {TIPOS_MOVIMIENTO.filter((t) => t.efecto === "salida").map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </optgroup>
          </select>
          <input
            type="date"
            value={filterDesde}
            onChange={(e) => setFilterDesde(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
            placeholder="Desde"
          />
          <input
            type="date"
            value={filterHasta}
            onChange={(e) => setFilterHasta(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
            placeholder="Hasta"
          />
          <span className="text-[10px] text-slate-400 self-center ml-auto">
            {filtered.length} movimientos
          </span>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
        <Info size={14} className="text-blue-500 flex-shrink-0" />
        <p className="text-[10px] text-blue-700">
          Los movimientos son inmutables — no se pueden eliminar ni editar. Para corregir errores, registra un ajuste.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Fecha</th>
                <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Tipo</th>
                <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">SKU</th>
                <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap min-w-[120px]">Item</th>
                <th className="text-center px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Cant.</th>
                <th className="text-right px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Costo Unit.</th>
                <th className="text-center px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Stock Result.</th>
                <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Referencia</th>
                <th className="text-left px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Prov/Cliente</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mov) => {
                const isEnt = esEntrada(mov.tipo);
                return (
                  <tr key={mov.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatFechaHora(mov.fecha)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        isEnt
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        {isEnt ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                        {getLabelMovimiento(mov.tipo)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-amber-700">{mov.item_sku}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium">{mov.item_nombre}</td>
                    <td className={`px-3 py-2 text-center font-bold ${isEnt ? "text-emerald-600" : "text-red-600"}`}>
                      {isEnt ? "+" : "-"}{mov.cantidad}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">{formatBalboas(mov.costo_unitario_momento)}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{mov.cantidad_resultante}</td>
                    <td className="px-3 py-2 text-slate-500">{mov.referencia || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{mov.proveedor_cliente || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-slate-400">
            No hay movimientos registrados
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MiInventario({ societyId }: MiInventarioProps) {
  // State
  const [activeTab, setActiveTab] = useState<InventarioTab>("dashboard");
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [config, setConfig] = useState<InventarioConfig>({ dias_sin_movimiento: 60, categorias_custom: [] });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);
  const [showMovModal, setShowMovModal] = useState(false);
  const [preselectedItemForMov, setPreselectedItemForMov] = useState<string | undefined>();

  // Load data
  useEffect(() => {
    setItems(loadCatalogo());
    setMovimientos(loadMovimientos());
    setCategorias(getAllCategorias());
    setConfig(loadConfig());
    setLoading(false);
  }, []);

  // Metrics
  const metrics = useMemo(() => computeInventarioMetrics(items), [items]);

  // ---- HANDLERS ----

  const handleSaveItem = useCallback((item: InventarioItem) => {
    item.societyId = societyId;
    let updated: InventarioItem[];
    if (editingItem) {
      updated = items.map((i) =>
        i.id === item.id ? { ...item, ultima_actualizacion: new Date().toISOString() } : i
      );
    } else {
      updated = [...items, item];
    }
    saveCatalogo(updated);
    setItems(updated);
    setShowItemModal(false);
    setEditingItem(null);
  }, [items, editingItem, societyId]);

  const handleDeleteItem = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (!window.confirm(`¿Eliminar "${item.nombre}" (${item.sku}) del catalogo?`)) return;
    const updated = items.filter((i) => i.id !== id);
    saveCatalogo(updated);
    setItems(updated);
  }, [items]);

  const handleSaveMovimiento = useCallback((mov: MovimientoInventario, updateCosto: boolean) => {
    const item = items.find((i) => i.id === mov.item_id);
    if (!item) return;

    // Update item quantity
    const isEnt = esEntrada(mov.tipo);
    const nuevaCantidad = isEnt
      ? item.cantidad_actual + mov.cantidad
      : item.cantidad_actual - mov.cantidad;

    if (nuevaCantidad < 0) {
      alert(`No hay suficiente stock. Disponible: ${item.cantidad_actual}`);
      return;
    }

    // Update cost if requested (weighted average)
    let nuevoCosto = item.costo_unitario;
    if (updateCosto && mov.tipo === "entrada_compra") {
      nuevoCosto = calcularCostoPromedioPonderado(
        item.cantidad_actual,
        item.costo_unitario,
        mov.cantidad,
        mov.costo_unitario_momento,
      );
    }

    // Save movement
    const updatedMovimientos = [...movimientos, mov];
    saveMovimientos(updatedMovimientos);
    setMovimientos(updatedMovimientos);

    // Update item
    const updatedItems = items.map((i) =>
      i.id === item.id
        ? {
            ...i,
            cantidad_actual: nuevaCantidad,
            costo_unitario: nuevoCosto,
            ultima_actualizacion: new Date().toISOString(),
          }
        : i
    );
    saveCatalogo(updatedItems);
    setItems(updatedItems);

    setShowMovModal(false);
    setPreselectedItemForMov(undefined);
  }, [items, movimientos]);

  const handleAddCategoria = useCallback((cat: string) => {
    const custom = loadCategoriasCustom();
    if (!custom.includes(cat)) {
      const updated = [...custom, cat];
      saveCategoriasCustom(updated);
    }
    setCategorias(getAllCategorias());
  }, []);

  const handleRegistrarCompra = useCallback((itemId: string) => {
    setPreselectedItemForMov(itemId);
    setShowMovModal(true);
  }, []);

  // Export CSV helpers
  const exportCatalogoCSV = useCallback(() => {
    if (items.length === 0) return;
    const headers = ["SKU", "Nombre", "Categoria", "Cantidad", "Unidad", "Costo Unitario", "Precio Venta", "Valor Total", "ROP", "Proveedor", "Estado"];
    const rows = items.map((i) =>
      [
        i.sku,
        `"${i.nombre}"`,
        i.categoria,
        i.cantidad_actual,
        i.unidad_medida,
        i.costo_unitario.toFixed(2),
        i.precio_venta.toFixed(2),
        (i.cantidad_actual * i.costo_unitario).toFixed(2),
        i.punto_reorden,
        `"${i.proveedor_principal || ""}"`,
        i.estado,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    downloadCSV(csv, "inventario_catalogo.csv");
  }, [items]);

  const exportMovimientosCSV = useCallback(() => {
    if (movimientos.length === 0) return;
    const headers = ["Fecha", "Tipo", "SKU", "Item", "Cantidad", "Costo Unit.", "Stock Result.", "Referencia", "Proveedor/Cliente", "Notas"];
    const rows = movimientos
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .map((m) =>
        [
          m.fecha,
          getLabelMovimiento(m.tipo),
          m.item_sku,
          `"${m.item_nombre}"`,
          `${esEntrada(m.tipo) ? "+" : "-"}${m.cantidad}`,
          m.costo_unitario_momento.toFixed(2),
          m.cantidad_resultante,
          `"${m.referencia || ""}"`,
          `"${m.proveedor_cliente || ""}"`,
          `"${m.notas || ""}"`,
        ].join(",")
      );
    const csv = [headers.join(","), ...rows].join("\n");
    downloadCSV(csv, "inventario_movimientos.csv");
  }, [movimientos]);

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-amber-500" />
        <span className="ml-2 text-sm text-slate-500">Cargando inventario...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100">
            <Boxes size={22} className="text-amber-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Mi Inventario</h2>
            <p className="text-[11px] text-slate-400">
              Control de stock, movimientos y alertas de reorden
            </p>
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { key: "dashboard" as InventarioTab, label: "Dashboard", icon: <BarChart3 size={14} /> },
          { key: "catalogo" as InventarioTab, label: "Catalogo", icon: <Package size={14} /> },
          { key: "movimientos" as InventarioTab, label: "Movimientos", icon: <ArrowUpCircle size={14} /> },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-white shadow-sm text-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === "dashboard" && (
        <DashboardTab
          items={items}
          movimientos={movimientos}
          metrics={metrics}
          onRegistrarCompra={handleRegistrarCompra}
        />
      )}

      {activeTab === "catalogo" && (
        <CatalogoTab
          items={items}
          categorias={categorias}
          onEdit={(item) => {
            setEditingItem(item);
            setShowItemModal(true);
          }}
          onDelete={handleDeleteItem}
          onCreate={() => {
            setEditingItem(null);
            setShowItemModal(true);
          }}
          onExportCSV={exportCatalogoCSV}
        />
      )}

      {activeTab === "movimientos" && (
        <MovimientosTab
          movimientos={movimientos}
          onNuevoMovimiento={() => {
            setPreselectedItemForMov(undefined);
            setShowMovModal(true);
          }}
          onExportCSV={exportMovimientosCSV}
        />
      )}

      {/* MODALS */}
      {showItemModal && (
        <ItemFormModal
          item={editingItem}
          allItems={items}
          categorias={categorias}
          onSave={handleSaveItem}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
          onAddCategoria={handleAddCategoria}
        />
      )}

      {showMovModal && (
        <MovimientoFormModal
          items={items}
          preselectedItemId={preselectedItemForMov}
          onSave={handleSaveMovimiento}
          onClose={() => {
            setShowMovModal(false);
            setPreselectedItemForMov(undefined);
          }}
        />
      )}
    </div>
  );
}
