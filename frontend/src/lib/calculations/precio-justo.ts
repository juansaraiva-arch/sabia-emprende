/**
 * Calculadora de Precio Justo v2 para MDF PTY.
 * Usa decimal.js para todos los calculos financieros.
 */

import Decimal from 'decimal.js';

// ── TIPOS ─────────────────────────────────────────────────────────────────────

export interface MaterialConUnidades {
  nombre: string;
  costoCompra: number;
  cantidadCompra: number;
  unidadCompraId: string;
  cantidadUso: number;
  unidadUsoId: string;
  costoCalculado: number; // pre-calculado por el wizard via convertirCostoMaterial
}

export interface InputProducto {
  materiales: MaterialConUnidades[];
  costoEmpaque: number;
  duracionMinutos: number;
  tarifaHora: number;
  fuenteTarifa: 'manual' | 'empleado' | 'promedio';
  gastosFijosMes: number;
  unidadesMes: number;
  margenDecimal: number; // ej: 0.30 para 30%
}

export interface InputServicio {
  nombreServicio: string;
  duracionMinutos: number;
  tarifaHora: number;
  fuenteTarifa: 'manual' | 'empleado' | 'promedio';
  costoInsumos: number;
  gastosFijosMes: number;
  serviciosPorMes: number;
  margenDecimal: number;
}

export interface ResultadoPrecio {
  costoMateriales: string;
  costoTiempo: string;
  gastosFijosUnitario: string;
  costoUnitario: string;
  precioSugerido: string;
  gananciaPorUnidad: string;
  gananciaMensual: string;
  margenReal: string;
}

// ── PRODUCTO ──────────────────────────────────────────────────────────────────

export function calcularPrecioProducto(input: InputProducto): ResultadoPrecio {
  const costoMats = input.materiales.reduce(
    (acc, m) => acc.plus(new Decimal(m.costoCalculado)),
    new Decimal(0),
  );

  const costoTiempo = new Decimal(input.duracionMinutos)
    .div(60)
    .mul(new Decimal(input.tarifaHora));

  const gastosFijosUnit = input.unidadesMes > 0
    ? new Decimal(input.gastosFijosMes).div(new Decimal(input.unidadesMes))
    : new Decimal(0);

  const costoUnit = costoMats
    .plus(new Decimal(input.costoEmpaque))
    .plus(costoTiempo)
    .plus(gastosFijosUnit);

  const margen = new Decimal(input.margenDecimal);
  const divisor = new Decimal(1).minus(margen);
  const precioSug = divisor.gt(0) ? costoUnit.div(divisor) : new Decimal(0);
  const gananciaUnit = precioSug.minus(costoUnit);
  const gananciaMes = gananciaUnit.mul(new Decimal(input.unidadesMes));

  return {
    costoMateriales:     costoMats.toFixed(2),
    costoTiempo:         costoTiempo.toFixed(2),
    gastosFijosUnitario: gastosFijosUnit.toFixed(2),
    costoUnitario:       costoUnit.toFixed(2),
    precioSugerido:      precioSug.toFixed(2),
    gananciaPorUnidad:   gananciaUnit.toFixed(2),
    gananciaMensual:     gananciaMes.toFixed(2),
    margenReal:          margen.mul(100).toFixed(1),
  };
}

// ── SERVICIO ──────────────────────────────────────────────────────────────────

export function calcularPrecioServicio(input: InputServicio): ResultadoPrecio {
  const costoTiempo = new Decimal(input.duracionMinutos)
    .div(60)
    .mul(new Decimal(input.tarifaHora));

  const gastosFijosUnit = input.serviciosPorMes > 0
    ? new Decimal(input.gastosFijosMes).div(new Decimal(input.serviciosPorMes))
    : new Decimal(0);

  const costoBase = costoTiempo
    .plus(new Decimal(input.costoInsumos))
    .plus(gastosFijosUnit);

  const margen = new Decimal(input.margenDecimal);
  const divisor = new Decimal(1).minus(margen);
  const precioSug = divisor.gt(0) ? costoBase.div(divisor) : new Decimal(0);
  const gananciaUnit = precioSug.minus(costoBase);
  const gananciaMes = gananciaUnit.mul(new Decimal(input.serviciosPorMes));

  return {
    costoMateriales:     new Decimal(input.costoInsumos).toFixed(2),
    costoTiempo:         costoTiempo.toFixed(2),
    gastosFijosUnitario: gastosFijosUnit.toFixed(2),
    costoUnitario:       costoBase.toFixed(2),
    precioSugerido:      precioSug.toFixed(2),
    gananciaPorUnidad:   gananciaUnit.toFixed(2),
    gananciaMensual:     gananciaMes.toFixed(2),
    margenReal:          margen.mul(100).toFixed(1),
  };
}
