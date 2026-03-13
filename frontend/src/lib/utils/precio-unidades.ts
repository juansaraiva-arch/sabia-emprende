/**
 * Funciones de conversion de costo de materiales entre unidades.
 * Usa decimal.js para precision financiera.
 */

import Decimal from 'decimal.js';
import { buscarUnidad, sonCompatibles } from '../constants/unidades';

export interface ResultadoConversion {
  costoCalculado: number;
  error?: string;
}

/**
 * Convierte el costo de un material de la unidad de compra a la unidad de uso.
 *
 * Formula: costoCalculado = (costoCompra / cantidadCompra) * (cantidadUso * factorUso / factorCompra)
 *
 * Ejemplo: 1 kg harina B/.1.20, uso 200g
 *   → (1.20 / 1) * (200 * 1 / 1000) = B/.0.24
 */
export function convertirCostoMaterial(
  costoCompra: number,
  cantidadCompra: number,
  unidadCompraId: string,
  cantidadUso: number,
  unidadUsoId: string,
): ResultadoConversion {
  if (costoCompra <= 0 || cantidadCompra <= 0 || cantidadUso <= 0) {
    return { costoCalculado: 0 };
  }

  const uCompra = buscarUnidad(unidadCompraId);
  const uUso = buscarUnidad(unidadUsoId);

  if (!uCompra || !uUso) {
    return { costoCalculado: 0, error: 'Unidad no encontrada.' };
  }

  // Verificar compatibilidad
  if (!sonCompatibles(unidadCompraId, unidadUsoId)) {
    return {
      costoCalculado: 0,
      error: 'Esa combinacion no la puedo calcular. Usa la misma tipo de medida \u2014 peso con peso, liquido con liquido.',
    };
  }

  // Para unidades discretas sin conversion real (paquete, bolsa, unidad)
  // Solo docena tiene factor != 1, el resto se trata 1:1
  const costo = new Decimal(costoCompra);
  const qtyCompra = new Decimal(cantidadCompra);
  const qtyUso = new Decimal(cantidadUso);
  const fCompra = new Decimal(uCompra.factorBase);
  const fUso = new Decimal(uUso.factorBase);

  // Costo por unidad base = costoCompra / (cantidadCompra * factorCompra)
  const costoPorBase = costo.div(qtyCompra.mul(fCompra));

  // Costo del uso = costoPorBase * cantidadUso * factorUso
  const costoCalculado = costoPorBase.mul(qtyUso.mul(fUso));

  return {
    costoCalculado: parseFloat(costoCalculado.toFixed(4)),
  };
}
