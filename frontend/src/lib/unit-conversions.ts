/**
 * Tabla de equivalencias y funciones de conversion para materiales/ingredientes.
 * Soporta unidades de peso (gramos) y volumen (mililitros).
 *
 * Usado por LabPrecios para calcular el costo real de cada ingrediente
 * en una unidad de producto sin que el usuario necesite calculadora externa.
 */

import type { UnitOfMeasure, UnitCategory, Ingredient } from "./calculations";

// ============================================
// UNIDADES BUILT-IN
// ============================================

export const BUILTIN_UNITS: UnitOfMeasure[] = [
  // Peso — conversion a gramos
  { id: "quintal", label: "Quintal", category: "weight", conversionFactor: 45_359 },
  { id: "kg", label: "Kilogramo", category: "weight", conversionFactor: 1_000 },
  { id: "lb", label: "Libra", category: "weight", conversionFactor: 453.59 },
  // Volumen — conversion a mililitros
  { id: "galon", label: "Galon", category: "volume", conversionFactor: 3_785 },
  { id: "litro", label: "Litro", category: "volume", conversionFactor: 1_000 },
];

// ============================================
// LOOKUP HELPERS
// ============================================

/**
 * Busca una unidad por ID en built-in + custom.
 */
export function findUnit(
  unitId: string,
  customUnits: UnitOfMeasure[] = []
): UnitOfMeasure | undefined {
  return (
    BUILTIN_UNITS.find((u) => u.id === unitId) ??
    customUnits.find((u) => u.id === unitId)
  );
}

/**
 * Retorna la etiqueta de la unidad base segun la categoria.
 * Peso -> "g", Volumen -> "ml"
 */
export function baseUnitLabel(category: UnitCategory): string {
  return category === "weight" ? "g" : "ml";
}

/**
 * Retorna la etiqueta larga de la unidad base.
 * Peso -> "gramos", Volumen -> "mililitros"
 */
export function baseUnitLabelLong(category: UnitCategory): string {
  return category === "weight" ? "gramos" : "mililitros";
}

// ============================================
// CALCULO DE COSTO POR INGREDIENTE
// ============================================

/**
 * Calcula el costo de un ingrediente por unidad de producto.
 *
 * Formula: (costoAdquisicion / conversionFactor) * cantidadUtilizada
 *
 * Ejemplo: Quintal cuesta $500, receta usa 1000g
 *   -> (500 / 45359) * 1000 = $11.02
 *
 * Retorna 0 si algun input es invalido.
 */
export function computeIngredientCost(
  costoAdquisicion: number,
  unitId: string,
  cantidadUtilizada: number,
  customUnits: UnitOfMeasure[] = []
): number {
  if (costoAdquisicion <= 0 || cantidadUtilizada <= 0) return 0;

  const unit = findUnit(unitId, customUnits);
  if (!unit || unit.conversionFactor <= 0) return 0;

  const costoPorBaseUnit = costoAdquisicion / unit.conversionFactor;
  return costoPorBaseUnit * cantidadUtilizada;
}

/**
 * Retorna el costo por gramo o por ml de una compra.
 * Util para mostrar al usuario "precio por gramo".
 */
export function costPerBaseUnit(
  costoAdquisicion: number,
  unitId: string,
  customUnits: UnitOfMeasure[] = []
): number {
  if (costoAdquisicion <= 0) return 0;
  const unit = findUnit(unitId, customUnits);
  if (!unit || unit.conversionFactor <= 0) return 0;
  return costoAdquisicion / unit.conversionFactor;
}

// ============================================
// PRE-PROCESADOR DE INGREDIENTES
// ============================================

/**
 * Pre-procesa un array de ingredientes: para cada uno en modo avanzado,
 * recalcula el campo `costo` a partir de los 3 sub-campos.
 * Retorna un nuevo array (no muta el original).
 */
export function resolveIngredientCosts(
  ingredientes: Ingredient[],
  customUnits: UnitOfMeasure[] = []
): Ingredient[] {
  return ingredientes.map((ing) => {
    if (ing.modoSimple) return ing; // legacy — costo ya fijado por usuario
    const computed = computeIngredientCost(
      ing.costoAdquisicion,
      ing.unidadCompraId,
      ing.cantidadUtilizada,
      customUnits
    );
    return { ...ing, costo: computed };
  });
}
