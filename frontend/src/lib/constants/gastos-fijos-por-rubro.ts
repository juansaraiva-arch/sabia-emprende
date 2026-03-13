/**
 * Orden de gastos fijos por tipo de actividad (rubro).
 * Los primeros N items aparecen con toggle ON por defecto.
 */

export const ORDEN_GASTOS_POR_RUBRO: Record<string, string[]> = {
  restaurante_alimentos: [
    'electricidad', 'gas', 'alquiler', 'agua', 'basura',
    'transporte', 'telefono', 'internet', 'ayudante', 'licencia',
    'seguro', 'mantenimiento', 'cuota', 'redes', 'contador', 'delivery', 'otro',
  ],
  servicios_profesionales: [
    'internet', 'telefono', 'redes', 'alquiler', 'transporte',
    'contador', 'licencia', 'seguro', 'cuota', 'ayudante',
    'electricidad', 'agua', 'gas', 'basura', 'mantenimiento', 'delivery', 'otro',
  ],
  construccion_remodelacion: [
    'transporte', 'ayudante', 'alquiler', 'telefono', 'internet',
    'seguro', 'mantenimiento', 'cuota', 'licencia', 'electricidad',
    'gas', 'agua', 'redes', 'contador', 'basura', 'delivery', 'otro',
  ],
  comercio_retail: [
    'alquiler', 'electricidad', 'internet', 'redes', 'transporte',
    'delivery', 'telefono', 'ayudante', 'licencia', 'cuota',
    'seguro', 'contador', 'agua', 'gas', 'basura', 'mantenimiento', 'otro',
  ],
  salud_belleza: [
    'alquiler', 'electricidad', 'agua', 'internet', 'telefono',
    'redes', 'ayudante', 'licencia', 'seguro', 'contador',
    'transporte', 'gas', 'cuota', 'basura', 'mantenimiento', 'delivery', 'otro',
  ],
  educacion_tutoria: [
    'internet', 'telefono', 'redes', 'alquiler', 'electricidad',
    'transporte', 'contador', 'licencia', 'cuota', 'seguro',
    'ayudante', 'agua', 'gas', 'basura', 'mantenimiento', 'delivery', 'otro',
  ],
  // Orden neutro para tipo 'otro' o no definido:
  otro: [
    'alquiler', 'electricidad', 'internet', 'transporte', 'telefono',
    'agua', 'gas', 'redes', 'ayudante', 'licencia',
    'seguro', 'cuota', 'contador', 'basura', 'mantenimiento', 'delivery', 'otro',
  ],
};

/** Cantidad de items que se muestran con toggle ON por defecto */
export const CANTIDAD_DEFAULTS_ACTIVOS = 4;
