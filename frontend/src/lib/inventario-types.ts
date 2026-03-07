/**
 * Tipos, interfaces y utilidades para el modulo Mi Inventario.
 * Patron: misma arquitectura que rrhh-types.ts — tipos + CRUD localStorage.
 *
 * Keys:
 *   midf_inventario_catalogo        → InventarioItem[]
 *   midf_inventario_movimientos     → MovimientoInventario[]
 *   midf_inventario_categorias      → string[]
 *   midf_inventario_config          → InventarioConfig
 */

// ============================================
// CONSTANTS
// ============================================

export const CATEGORIAS_DEFAULT: string[] = [
  "Materia Prima",
  "Empaque",
  "Producto Terminado",
  "Insumo",
  "Repuesto",
  "Otro",
];

/** Unidades de medida para inventario (discretas + peso/volumen) */
export const UNIDADES_INVENTARIO = [
  { id: "unidad", label: "Unidades" },
  { id: "kg", label: "Kilos" },
  { id: "g", label: "Gramos" },
  { id: "lb", label: "Libras" },
  { id: "litro", label: "Litros" },
  { id: "ml", label: "Mililitros" },
  { id: "metro", label: "Metros" },
  { id: "pie", label: "Pies" },
  { id: "galon", label: "Galones" },
  { id: "caja", label: "Cajas" },
  { id: "paquete", label: "Paquetes" },
  { id: "otro", label: "Otro" },
] as const;

/** Prefijos de SKU segun categoria */
export const SKU_PREFIXES: Record<string, string> = {
  "Materia Prima": "MP",
  "Empaque": "EMP",
  "Producto Terminado": "PT",
  "Insumo": "INS",
  "Repuesto": "REP",
  "Otro": "OTR",
};

// ============================================
// TIPOS PRINCIPALES
// ============================================

export interface InventarioItem {
  id: string;
  sku: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  cantidad_actual: number;
  unidad_medida: string;
  costo_unitario: number;
  precio_venta: number;
  punto_reorden: number;
  modo_calculo_rop: "manual" | "automatico";
  lead_time_dias?: number;
  consumo_diario_promedio?: number;
  safety_stock: number;
  proveedor_principal?: string;
  contacto_proveedor?: string;
  ubicacion_bin?: string;
  estado: "activo" | "descontinuado";
  imagen?: string;
  fecha_creacion: string;
  ultima_actualizacion: string;
  societyId: string;
}

export type TipoMovimiento =
  | "entrada_compra"
  | "entrada_produccion"
  | "entrada_devolucion_cliente"
  | "entrada_ajuste_positivo"
  | "salida_venta"
  | "salida_consumo_produccion"
  | "salida_merma_perdida"
  | "salida_devolucion_proveedor"
  | "salida_ajuste_negativo";

export interface MovimientoInventario {
  id: string;
  fecha: string;
  tipo: TipoMovimiento;
  item_id: string;
  item_sku: string;
  item_nombre: string;
  cantidad: number;
  costo_unitario_momento: number;
  referencia?: string;
  proveedor_cliente?: string;
  notas?: string;
  cantidad_resultante: number;
  societyId: string;
}

export interface InventarioConfig {
  umbral_valor_inmovilizado?: number;
  dias_sin_movimiento: number;
  categorias_custom: string[];
}

// ============================================
// METADATA DE MOVIMIENTOS
// ============================================

export interface TipoMovimientoMeta {
  key: TipoMovimiento;
  label: string;
  efecto: "entrada" | "salida";
  color: string;
  ejemplo: string;
}

export const TIPOS_MOVIMIENTO: TipoMovimientoMeta[] = [
  { key: "entrada_compra", label: "Entrada - Compra", efecto: "entrada", color: "emerald", ejemplo: "Recepcion de mercancia del proveedor" },
  { key: "entrada_produccion", label: "Entrada - Produccion", efecto: "entrada", color: "emerald", ejemplo: "Producto terminado ingresa al inventario" },
  { key: "entrada_devolucion_cliente", label: "Entrada - Devolucion Cliente", efecto: "entrada", color: "emerald", ejemplo: "Cliente devuelve producto" },
  { key: "entrada_ajuste_positivo", label: "Entrada - Ajuste Positivo", efecto: "entrada", color: "emerald", ejemplo: "Correccion por conteo fisico (sobrante)" },
  { key: "salida_venta", label: "Salida - Venta", efecto: "salida", color: "red", ejemplo: "Producto vendido al cliente" },
  { key: "salida_consumo_produccion", label: "Salida - Consumo/Produccion", efecto: "salida", color: "red", ejemplo: "Materia prima usada en produccion" },
  { key: "salida_merma_perdida", label: "Salida - Merma/Perdida", efecto: "salida", color: "red", ejemplo: "Producto danado, vencido, robado" },
  { key: "salida_devolucion_proveedor", label: "Salida - Devolucion Proveedor", efecto: "salida", color: "red", ejemplo: "Devuelves mercancia defectuosa" },
  { key: "salida_ajuste_negativo", label: "Salida - Ajuste Negativo", efecto: "salida", color: "red", ejemplo: "Correccion por conteo fisico (faltante)" },
];

export function esEntrada(tipo: TipoMovimiento): boolean {
  return tipo.startsWith("entrada_");
}

export function esSalida(tipo: TipoMovimiento): boolean {
  return tipo.startsWith("salida_");
}

export function getLabelMovimiento(tipo: TipoMovimiento): string {
  return TIPOS_MOVIMIENTO.find((t) => t.key === tipo)?.label || tipo;
}

// ============================================
// CAMPOS CALCULADOS
// ============================================

/** Calcula el margen de ganancia % */
export function calcularMargen(costo: number, precioVenta: number): number | null {
  if (precioVenta <= 0 || costo <= 0) return null;
  return ((precioVenta - costo) / costo) * 100;
}

/** Calcula el valor total en inventario (dinero inmovilizado) */
export function calcularValorTotal(item: InventarioItem): number {
  return round2(item.cantidad_actual * item.costo_unitario);
}

/** Calcula el ROP automatico */
export function calcularROPAutomatico(
  leadTimeDias: number,
  consumoDiarioPromedio: number,
  safetyStock: number,
): number {
  return Math.ceil((leadTimeDias * consumoDiarioPromedio) + safetyStock);
}

/** Calcula consumo diario promedio desde historial de movimientos (ultimos 30 dias) */
export function calcularConsumoDiario(movimientos: MovimientoInventario[], itemId: string): number {
  const ahora = new Date();
  const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

  const salidas = movimientos.filter(
    (m) =>
      m.item_id === itemId &&
      esSalida(m.tipo) &&
      new Date(m.fecha) >= hace30Dias
  );

  const totalSalidas = salidas.reduce((sum, m) => sum + m.cantidad, 0);
  return round2(totalSalidas / 30);
}

/** Costo promedio ponderado al recibir compra */
export function calcularCostoPromedioPonderado(
  cantidadExistente: number,
  costoActual: number,
  cantidadCompra: number,
  costoCompra: number,
): number {
  const totalCantidad = cantidadExistente + cantidadCompra;
  if (totalCantidad <= 0) return costoCompra;
  return round2(
    ((cantidadExistente * costoActual) + (cantidadCompra * costoCompra)) / totalCantidad
  );
}

/** Genera un SKU automatico */
export function generarSKU(categoria: string, items: InventarioItem[]): string {
  const prefix = SKU_PREFIXES[categoria] || "OTR";
  const existingNumbers = items
    .filter((i) => i.sku.startsWith(prefix + "-"))
    .map((i) => {
      const num = parseInt(i.sku.split("-").pop() || "0", 10);
      return isNaN(num) ? 0 : num;
    });
  const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
}

/** Redondea a 2 decimales */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================
// CRUD localStorage
// ============================================

const KEY_CATALOGO = "midf_inventario_catalogo";
const KEY_MOVIMIENTOS = "midf_inventario_movimientos";
const KEY_CATEGORIAS = "midf_inventario_categorias";
const KEY_CONFIG = "midf_inventario_config";

// ---- CATALOGO ----

export function loadCatalogo(): InventarioItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_CATALOGO);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCatalogo(items: InventarioItem[]): void {
  localStorage.setItem(KEY_CATALOGO, JSON.stringify(items));
}

export function addItem(item: InventarioItem): InventarioItem[] {
  const items = loadCatalogo();
  items.push(item);
  saveCatalogo(items);
  return items;
}

export function updateItem(updated: InventarioItem): InventarioItem[] {
  const items = loadCatalogo();
  const idx = items.findIndex((i) => i.id === updated.id);
  if (idx >= 0) {
    items[idx] = { ...updated, ultima_actualizacion: new Date().toISOString() };
  }
  saveCatalogo(items);
  return items;
}

export function deleteItem(id: string): InventarioItem[] {
  let items = loadCatalogo();
  items = items.filter((i) => i.id !== id);
  saveCatalogo(items);
  return items;
}

// ---- MOVIMIENTOS ----

export function loadMovimientos(): MovimientoInventario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_MOVIMIENTOS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMovimientos(movimientos: MovimientoInventario[]): void {
  localStorage.setItem(KEY_MOVIMIENTOS, JSON.stringify(movimientos));
}

export function addMovimiento(mov: MovimientoInventario): MovimientoInventario[] {
  const movimientos = loadMovimientos();
  movimientos.push(mov);
  saveMovimientos(movimientos);
  return movimientos;
}

// ---- CATEGORIAS CUSTOM ----

export function loadCategoriasCustom(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_CATEGORIAS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCategoriasCustom(cats: string[]): void {
  localStorage.setItem(KEY_CATEGORIAS, JSON.stringify(cats));
}

export function getAllCategorias(): string[] {
  const custom = loadCategoriasCustom();
  const combined = [...CATEGORIAS_DEFAULT];
  for (const c of custom) {
    if (!combined.includes(c)) combined.push(c);
  }
  return combined;
}

// ---- CONFIG ----

export function loadConfig(): InventarioConfig {
  if (typeof window === "undefined") {
    return { dias_sin_movimiento: 60, categorias_custom: [] };
  }
  try {
    const raw = localStorage.getItem(KEY_CONFIG);
    if (!raw) return { dias_sin_movimiento: 60, categorias_custom: [] };
    return JSON.parse(raw);
  } catch {
    return { dias_sin_movimiento: 60, categorias_custom: [] };
  }
}

export function saveConfig(config: InventarioConfig): void {
  localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
}

// ============================================
// METRICAS DE DASHBOARD
// ============================================

export interface InventarioMetrics {
  totalItemsActivos: number;
  valorTotalInventario: number;
  itemsEnPuntoCritico: number;
  itemsAgotados: number;
  itemsCriticos: InventarioItem[];
}

export function computeInventarioMetrics(items: InventarioItem[]): InventarioMetrics {
  const activos = items.filter((i) => i.estado === "activo");

  const itemsCriticos = activos.filter(
    (i) => i.punto_reorden > 0 && i.cantidad_actual <= i.punto_reorden
  );

  const itemsAgotados = activos.filter((i) => i.cantidad_actual === 0);

  const valorTotal = activos.reduce(
    (sum, i) => sum + i.cantidad_actual * i.costo_unitario,
    0
  );

  return {
    totalItemsActivos: activos.length,
    valorTotalInventario: round2(valorTotal),
    itemsEnPuntoCritico: itemsCriticos.length,
    itemsAgotados: itemsAgotados.length,
    itemsCriticos,
  };
}

// ============================================
// ALERTAS DE INVENTARIO
// ============================================

import type { StrategicAlert } from "@/lib/alerts";

export function computeInventarioAlerts(
  items: InventarioItem[],
  movimientos: MovimientoInventario[],
  config: InventarioConfig,
): StrategicAlert[] {
  const alerts: StrategicAlert[] = [];
  const activos = items.filter((i) => i.estado === "activo");
  const ahora = new Date();

  for (const item of activos) {
    // 1. Agotamiento (stock = 0)
    if (item.cantidad_actual === 0) {
      alerts.push({
        id: `inv-agotado-${item.id}`,
        priority: "red",
        category: "inventario",
        title: "Producto agotado",
        message: `${item.nombre} (SKU: ${item.sku}) esta AGOTADO.`,
        emoji: "🚨",
        promptHint: `${item.nombre} esta agotado — registra una compra`,
      });
      continue; // No generar alerta de reorden si ya esta agotado
    }

    // 2. Reorden (stock > 0 pero <= ROP)
    if (item.punto_reorden > 0 && item.cantidad_actual <= item.punto_reorden) {
      const deficit = item.punto_reorden - item.cantidad_actual;
      alerts.push({
        id: `inv-reorden-${item.id}`,
        priority: "orange",
        category: "inventario",
        title: "Punto de reorden alcanzado",
        message: `${item.nombre} (SKU: ${item.sku}) ha alcanzado su punto de reorden. Stock: ${item.cantidad_actual}/${item.punto_reorden}. ${item.proveedor_principal ? `Proveedor: ${item.proveedor_principal}.` : ""}`,
        emoji: "📦",
        promptHint: `${item.nombre} necesita reorden — deficit de ${deficit} unidades`,
      });
    }
  }

  // 3. Items sin movimiento
  const diasSinMovConfig = config.dias_sin_movimiento || 60;
  const umbralFecha = new Date(ahora.getTime() - diasSinMovConfig * 24 * 60 * 60 * 1000);

  for (const item of activos) {
    if (item.cantidad_actual === 0) continue; // No alertar sobre items agotados

    const ultimoMov = movimientos
      .filter((m) => m.item_id === item.id)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

    const sinMovimiento = !ultimoMov || new Date(ultimoMov.fecha) < umbralFecha;

    if (sinMovimiento && item.cantidad_actual > 0) {
      const valor = round2(item.cantidad_actual * item.costo_unitario);
      const diasSinMov = ultimoMov
        ? Math.floor((ahora.getTime() - new Date(ultimoMov.fecha).getTime()) / (1000 * 60 * 60 * 24))
        : diasSinMovConfig;

      alerts.push({
        id: `inv-sinmov-${item.id}`,
        priority: "yellow",
        category: "inventario",
        title: "Item sin rotacion",
        message: `${item.nombre} (SKU: ${item.sku}) no ha tenido movimientos en ${diasSinMov} dias. Valor inmovilizado: B/.${valor.toLocaleString("es-PA", { minimumFractionDigits: 2 })}.`,
        emoji: "💤",
        promptHint: `${item.nombre} lleva ${diasSinMov} dias sin movimiento`,
      });
    }
  }

  // 4. Valor inmovilizado total (si umbral configurado)
  if (config.umbral_valor_inmovilizado && config.umbral_valor_inmovilizado > 0) {
    const valorTotal = activos.reduce(
      (sum, i) => sum + i.cantidad_actual * i.costo_unitario,
      0
    );
    if (valorTotal > config.umbral_valor_inmovilizado) {
      alerts.push({
        id: "inv-valor-inmovilizado",
        priority: "yellow",
        category: "inventario",
        title: "Alto valor inmovilizado",
        message: `Tu inventario tiene B/.${round2(valorTotal).toLocaleString("es-PA", { minimumFractionDigits: 2 })} inmovilizados. Revisa items con baja rotacion.`,
        emoji: "💰",
        promptHint: `B/.${round2(valorTotal).toLocaleString("es-PA")} en inventario inmovilizado`,
      });
    }
  }

  // Ordenar: red > orange > yellow
  const priorityOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
  alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return alerts;
}

// ============================================
// HELPERS FORMAT
// ============================================

export function formatBalboas(n: number): string {
  return `B/. ${n.toLocaleString("es-PA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
