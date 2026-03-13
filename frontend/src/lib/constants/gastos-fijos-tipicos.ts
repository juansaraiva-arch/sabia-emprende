/**
 * Lista de 16 gastos fijos tipicos para emprendedores panamenos.
 * Usada por Mi Precio Justo v2 para pre-llenar el paso de gastos fijos.
 */

export interface GastoFijoTipico {
  id: string;
  nombre: string;
  icono: string;       // nombre del icono de lucide-react
  categoria: string;
  sugerencia: string;  // rango tipico en Panama
}

export const GASTOS_FIJOS_TIPICOS: GastoFijoTipico[] = [
  { id: 'alquiler',      nombre: 'Alquiler del local',                icono: 'Home',        categoria: 'local',          sugerencia: 'B/.250 - B/.800/mes' },
  { id: 'mantenimiento', nombre: 'Mantenimiento y reparaciones',      icono: 'Wrench',      categoria: 'local',          sugerencia: 'B/.30 - B/.100/mes' },
  { id: 'electricidad',  nombre: 'Electricidad (ENSA/EDECHI/Elektra)', icono: 'Zap',        categoria: 'servicios',      sugerencia: 'B/.40 - B/.200/mes' },
  { id: 'agua',          nombre: 'Agua (IDAAN)',                       icono: 'Droplets',   categoria: 'servicios',      sugerencia: 'B/.15 - B/.50/mes' },
  { id: 'gas',           nombre: 'Gas',                                icono: 'Flame',      categoria: 'servicios',      sugerencia: 'B/.10 - B/.40/mes' },
  { id: 'basura',        nombre: 'Recoleccion de basura',              icono: 'Trash2',     categoria: 'servicios',      sugerencia: 'B/.5 - B/.20/mes' },
  { id: 'transporte',    nombre: 'Transporte y combustible',           icono: 'Car',        categoria: 'transporte',     sugerencia: 'B/.40 - B/.150/mes' },
  { id: 'delivery',      nombre: 'Delivery o envios',                  icono: 'Package',    categoria: 'transporte',     sugerencia: 'segun volumen' },
  { id: 'internet',      nombre: 'Internet',                           icono: 'Wifi',       categoria: 'comunicaciones', sugerencia: 'B/.25 - B/.80/mes' },
  { id: 'telefono',      nombre: 'Telefono',                           icono: 'Phone',      categoria: 'comunicaciones', sugerencia: 'B/.20 - B/.60/mes' },
  { id: 'redes',         nombre: 'Publicidad en redes sociales',       icono: 'Megaphone',  categoria: 'comunicaciones', sugerencia: 'B/.20 - B/.100/mes' },
  { id: 'ayudante',      nombre: 'Ayudantes o colaboradores',          icono: 'Users',      categoria: 'personal',       sugerencia: 'usar modulo Nomina' },
  { id: 'cuota',         nombre: 'Cuota de prestamo',                  icono: 'CreditCard', categoria: 'financiero',     sugerencia: 'segun prestamo' },
  { id: 'seguro',        nombre: 'Seguro del negocio',                 icono: 'Shield',     categoria: 'financiero',     sugerencia: 'B/.20 - B/.80/mes' },
  { id: 'licencia',      nombre: 'Aviso de operaciones / MUPA',        icono: 'FileText',   categoria: 'financiero',     sugerencia: 'B/.20 - B/.80/ano' },
  { id: 'contador',      nombre: 'Honorarios de contador',             icono: 'Calculator', categoria: 'financiero',     sugerencia: 'B/.50 - B/.150/mes' },
  { id: 'otro',          nombre: 'Otro gasto fijo',                    icono: 'Plus',       categoria: 'otro',           sugerencia: '' },
];
