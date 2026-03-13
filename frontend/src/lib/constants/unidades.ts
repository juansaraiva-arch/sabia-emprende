/**
 * Sistema de unidades de medida para Mi Precio Justo v2.
 * Soporta peso, volumen, longitud, area y unidades discretas.
 * Cada unidad define un factor de conversion a su unidad base de categoria.
 */

export type CategoriaUnidad = 'peso' | 'volumen' | 'longitud' | 'area' | 'unidad';

export interface UnidadMedida {
  id: string;
  label: string;
  abrev: string;
  categoria: CategoriaUnidad;
  /** Factor de conversion a la unidad base de la categoria:
   *  peso → gramos, volumen → mililitros, longitud → centimetros, area → cm² */
  factorBase: number;
}

// ── PESO (base: gramos) ──────────────────────────────────────────────────────
const PESO: UnidadMedida[] = [
  { id: 'g',   label: 'Gramo',     abrev: 'g',   categoria: 'peso', factorBase: 1 },
  { id: 'kg',  label: 'Kilogramo', abrev: 'kg',  categoria: 'peso', factorBase: 1_000 },
  { id: 'lb',  label: 'Libra',     abrev: 'lb',  categoria: 'peso', factorBase: 453.592 },
  { id: 'oz',  label: 'Onza',      abrev: 'oz',  categoria: 'peso', factorBase: 28.3495 },
];

// ── VOLUMEN (base: mililitros) ───────────────────────────────────────────────
const VOLUMEN: UnidadMedida[] = [
  { id: 'ml',          label: 'Mililitro',   abrev: 'ml',    categoria: 'volumen', factorBase: 1 },
  { id: 'L',           label: 'Litro',       abrev: 'L',     categoria: 'volumen', factorBase: 1_000 },
  { id: 'tazas',       label: 'Taza',        abrev: 'taza',  categoria: 'volumen', factorBase: 236.588 },
  { id: 'cucharadas',  label: 'Cucharada',   abrev: 'cda',   categoria: 'volumen', factorBase: 15 },
  { id: 'cucharaditas', label: 'Cucharadita', abrev: 'cdta', categoria: 'volumen', factorBase: 5 },
];

// ── LONGITUD (base: centimetros) ─────────────────────────────────────────────
const LONGITUD: UnidadMedida[] = [
  { id: 'cm', label: 'Centimetro', abrev: 'cm', categoria: 'longitud', factorBase: 1 },
  { id: 'm',  label: 'Metro',      abrev: 'm',  categoria: 'longitud', factorBase: 100 },
  { id: 'yd', label: 'Yarda',      abrev: 'yd', categoria: 'longitud', factorBase: 91.44 },
];

// ── AREA (base: cm²) ────────────────────────────────────────────────────────
const AREA: UnidadMedida[] = [
  { id: 'm2',  label: 'Metro cuadrado',  abrev: 'm\u00B2',  categoria: 'area', factorBase: 10_000 },
  { id: 'ft2', label: 'Pie cuadrado',    abrev: 'ft\u00B2', categoria: 'area', factorBase: 929.03 },
];

// ── UNIDAD DISCRETA (sin conversion entre ellas) ─────────────────────────────
const UNIDAD: UnidadMedida[] = [
  { id: 'unidades', label: 'Unidad',   abrev: 'u',    categoria: 'unidad', factorBase: 1 },
  { id: 'paquete',  label: 'Paquete',  abrev: 'paq',  categoria: 'unidad', factorBase: 1 },
  { id: 'docena',   label: 'Docena',   abrev: 'doc',  categoria: 'unidad', factorBase: 12 },
  { id: 'bolsa',    label: 'Bolsa',    abrev: 'bolsa', categoria: 'unidad', factorBase: 1 },
];

/** Todas las unidades disponibles */
export const UNIDADES: UnidadMedida[] = [
  ...PESO,
  ...VOLUMEN,
  ...LONGITUD,
  ...AREA,
  ...UNIDAD,
];

/** Buscar unidad por ID */
export function buscarUnidad(id: string): UnidadMedida | undefined {
  return UNIDADES.find(u => u.id === id);
}

/** Obtener unidades filtradas por categoria */
export function unidadesPorCategoria(cat: CategoriaUnidad): UnidadMedida[] {
  return UNIDADES.filter(u => u.categoria === cat);
}

/** Verificar si dos unidades son compatibles (misma categoria) */
export function sonCompatibles(idA: string, idB: string): boolean {
  const a = buscarUnidad(idA);
  const b = buscarUnidad(idB);
  if (!a || !b) return false;
  return a.categoria === b.categoria;
}
