/**
 * Utilidad para ordenar gastos fijos segun el rubro de la empresa.
 */

import { GASTOS_FIJOS_TIPICOS, type GastoFijoTipico } from '../constants/gastos-fijos-tipicos';
import { ORDEN_GASTOS_POR_RUBRO, CANTIDAD_DEFAULTS_ACTIVOS } from '../constants/gastos-fijos-por-rubro';

export interface GastoOrdenado {
  gasto: GastoFijoTipico;
  activoPorDefecto: boolean;
}

/**
 * Retorna los gastos fijos ordenados segun el tipo de actividad del negocio.
 * Los primeros 4 items se marcan como activos por defecto.
 */
export function getGastosOrdenadosPorRubro(tipoActividad: string): GastoOrdenado[] {
  const orden = ORDEN_GASTOS_POR_RUBRO[tipoActividad] ?? ORDEN_GASTOS_POR_RUBRO['otro'];

  return orden
    .map((id, index) => {
      const gasto = GASTOS_FIJOS_TIPICOS.find(g => g.id === id);
      if (!gasto) return null;
      return {
        gasto,
        activoPorDefecto: index < CANTIDAD_DEFAULTS_ACTIVOS,
      };
    })
    .filter((item): item is GastoOrdenado => item !== null);
}

/** Mapa legible de tipo_actividad a nombre en espanol */
export const RUBROS_LABELS: Record<string, string> = {
  restaurante_alimentos: 'Restaurante / Alimentos',
  servicios_profesionales: 'Servicios Profesionales',
  construccion_remodelacion: 'Construccion / Remodelacion',
  comercio_retail: 'Comercio / Retail',
  salud_belleza: 'Salud / Belleza',
  educacion_tutoria: 'Educacion / Tutoria',
  otro: 'General',
};
