// ============================================
// MOTOR DE INTELIGENCIA FISCAL MUPA
// Acuerdo Municipal N° 40 de 2011
// Municipio de Panama
// ============================================

// ============================================
// TIPOS
// ============================================

export type SemaforoLevel = "verde" | "amarillo" | "rojo";

export interface SemaforoItem {
  id: string;
  label: string;
  level: SemaforoLevel;
  message: string;
  multa?: string;
}

export interface SancionRow {
  infraccion: string;
  sancion: string;
  mitigacion: string;
}

export interface SancionCategory {
  id: string;
  title: string;
  icon: string; // emoji
  rows: SancionRow[];
}

// ============================================
// MATRIZ MAESTRA DE SANCIONES
// ============================================

export const SANCIONES_ADMINISTRATIVAS: SancionRow[] = [
  {
    infraccion: "No presentar Declaracion Jurada",
    sancion: "$500.00 (Fija)",
    mitigacion: "Cargar formulario antes del 31 de marzo.",
  },
  {
    infraccion: "Declaracion Jurada Extemporanea",
    sancion: "$500.00 + Recargos",
    mitigacion: "Presentar antes de la auditoria de oficio.",
  },
  {
    infraccion: "No presentar el Carton de Impuestos",
    sancion: "$5.00 a $100.00",
    mitigacion: "Mantener el distintivo visible en el local.",
  },
  {
    infraccion: "Negar inspeccion municipal",
    sancion: "$100.00 a $1,000.00",
    mitigacion: "Protocolo de atencion a inspectores.",
  },
];

export const SANCIONES_PUBLICIDAD: SancionRow[] = [
  {
    infraccion: "Publicidad no declarada",
    sancion: "$10.00 a $500.00 + remocion",
    mitigacion: "Solicitar permiso de publicidad en el MUPA.",
  },
  {
    infraccion: "Rotulos en servidumbre publica",
    sancion: "$50.00 a $1,000.00",
    mitigacion: "Reubicar rotulo fuera de servidumbre publica.",
  },
  {
    infraccion: "Publicidad enganosa o mal estado",
    sancion: "$50.00 a $500.00",
    mitigacion: "Actualizar o retirar material publicitario.",
  },
];

export const SANCIONES_OPERATIVIDAD: SancionRow[] = [
  {
    infraccion: "Operar sin Licencia/Aviso",
    sancion: "$100.00 a $5,000.00",
    mitigacion: "Cierre inmediato del establecimiento.",
  },
  {
    infraccion: "Venta de licor sin permiso",
    sancion: "$500.00 a $2,000.00",
    mitigacion: "Suspension de la actividad comercial.",
  },
  {
    infraccion: "Ruido excesivo (Decibelios)",
    sancion: "$50.00 a $5,000.00",
    mitigacion: "Quejas vecinales y procesos civiles.",
  },
];

export const SANCIONES_MOROSIDAD: SancionRow[] = [
  {
    infraccion: "Recargo por Impago mensual",
    sancion: "20% sobre el monto base",
    mitigacion: "Pagar impuesto dentro del mes corriente.",
  },
  {
    infraccion: "Interes por Mora",
    sancion: "1% mensual (acumulativo)",
    mitigacion: "Regularizar saldo lo antes posible.",
  },
  {
    infraccion: "Tasa Unica Anual fuera de plazo",
    sancion: "10% de recargo adicional",
    mitigacion: "Pagar antes del 31 de marzo.",
  },
];

export const MATRIZ_SANCIONES: SancionCategory[] = [
  {
    id: "administrativas",
    title: "Incumplimientos Administrativos",
    icon: "📋",
    rows: SANCIONES_ADMINISTRATIVAS,
  },
  {
    id: "publicidad",
    title: "Publicidad y Rotulos",
    icon: "📢",
    rows: SANCIONES_PUBLICIDAD,
  },
  {
    id: "operatividad",
    title: "Operatividad y Negocio",
    icon: "🏪",
    rows: SANCIONES_OPERATIVIDAD,
  },
  {
    id: "morosidad",
    title: "Recargos por Morosidad",
    icon: "💰",
    rows: SANCIONES_MOROSIDAD,
  },
];

// ============================================
// SIMULADOR DE RECARGOS (Calculo Dinamico)
// ============================================

export interface RecargoResult {
  montoBase: number;
  recargo20: number;
  interesMensual: number;
  mesesMora: number;
  totalIntereses: number;
  totalAdeudado: number;
}

/**
 * Calcula recargos por morosidad municipal
 * - 20% recargo sobre monto base
 * - 1% interes mensual acumulativo
 */
export function calcularRecargos(montoBase: number, mesesMora: number): RecargoResult {
  const recargo20 = montoBase * 0.20;
  const interesMensual = montoBase * 0.01;
  const totalIntereses = interesMensual * mesesMora;
  const totalAdeudado = montoBase + recargo20 + totalIntereses;

  return {
    montoBase,
    recargo20,
    interesMensual,
    mesesMora,
    totalIntereses,
    totalAdeudado,
  };
}

/**
 * Calcula recargo por Tasa Unica Municipal pagada tarde
 * - 10% recargo si se paga despues del 31 de marzo
 */
export function calcularRecargoTasaAnual(montoTasa: number, pagadoTarde: boolean): {
  montoBase: number;
  recargo10: number;
  total: number;
} {
  const recargo10 = pagadoTarde ? montoTasa * 0.10 : 0;
  return {
    montoBase: montoTasa,
    recargo10,
    total: montoTasa + recargo10,
  };
}

// ============================================
// SEMAFORO DE SUPERVIVENCIA
// ============================================

/**
 * Genera estado del semaforo para Declaracion Jurada MUPA
 * basado en la fecha actual y si el documento existe en Boveda
 */
export function getSemaforoDeclaracion(
  now: Date,
  declaracionEnBoveda: boolean
): SemaforoItem {
  const year = now.getFullYear();
  const deadline = new Date(year, 2, 31); // 31 de marzo
  const warningDate = new Date(year, 2, 16); // 16 de marzo (15 dias antes)

  if (declaracionEnBoveda) {
    return {
      id: "declaracion_jurada",
      label: "Declaracion Jurada Anual",
      level: "verde",
      message: "Documento cargado y vigente.",
    };
  }

  if (now > deadline) {
    return {
      id: "declaracion_jurada",
      label: "Declaracion Jurada Anual",
      level: "rojo",
      message: "Multa de $500.00 y riesgo de CIERRE del establecimiento comercial por incumplimiento del Acuerdo Municipal N° 40 de 2011.",
      multa: "$500.00",
    };
  }

  if (now >= warningDate) {
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
    return {
      id: "declaracion_jurada",
      label: "Declaracion Jurada Anual",
      level: "amarillo",
      message: `Faltan ${daysLeft} dias para el vencimiento. Ahorra $500.00 actuando hoy.`,
    };
  }

  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
  return {
    id: "declaracion_jurada",
    label: "Declaracion Jurada Anual",
    level: "verde",
    message: `En plazo. Vence el 31 de marzo (${daysLeft} dias restantes).`,
  };
}

/**
 * Genera estado del semaforo para impuesto mensual
 */
export function getSemaforoImpuestoMensual(
  now: Date,
  pagado: boolean
): SemaforoItem {
  const deadlineDay = 15;
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const deadline = new Date(currentYear, currentMonth, deadlineDay);

  if (pagado) {
    return {
      id: "impuesto_mensual",
      label: "Impuesto Municipal Mensual",
      level: "verde",
      message: "Pago del mes corriente realizado.",
    };
  }

  if (now > deadline) {
    return {
      id: "impuesto_mensual",
      label: "Impuesto Municipal Mensual",
      level: "rojo",
      message: "Tu flujo de caja esta perdiendo dinero en recargos ahora mismo. 20% recargo + 1% interes mensual.",
      multa: "20% + 1%/mes",
    };
  }

  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
  if (daysLeft <= 5) {
    return {
      id: "impuesto_mensual",
      label: "Impuesto Municipal Mensual",
      level: "amarillo",
      message: `Faltan ${daysLeft} dias para el vencimiento. Paga a tiempo para evitar recargos.`,
    };
  }

  return {
    id: "impuesto_mensual",
    label: "Impuesto Municipal Mensual",
    level: "verde",
    message: `En plazo. Vence el dia 15 (${daysLeft} dias restantes).`,
  };
}

// ============================================
// GAP #3 — CALCULADORA IMPUESTO MUNICIPAL MENSUAL
// ============================================

export interface CategoriaActividadMupa {
  id: string;
  label: string;
  tarifa: number; // porcentaje sobre ingresos brutos
  descripcion: string;
}

export const CATEGORIAS_ACTIVIDAD_MUPA: CategoriaActividadMupa[] = [
  { id: "comercio_general", label: "Comercio General", tarifa: 1.0, descripcion: "Tarifa estandar comercio/servicios" },
  { id: "servicios_profesionales", label: "Servicios Profesionales", tarifa: 1.0, descripcion: "Consultoria, contabilidad, legal, etc." },
  { id: "manufactura", label: "Manufactura", tarifa: 0.75, descripcion: "Produccion industrial" },
  { id: "restaurantes_hoteles", label: "Restaurantes y Hoteles", tarifa: 1.0, descripcion: "Sector hotelero y gastronomico" },
  { id: "construccion", label: "Construccion", tarifa: 1.0, descripcion: "Empresas constructoras" },
  { id: "financiero", label: "Actividades Financieras", tarifa: 1.5, descripcion: "Banca, seguros, casas de cambio" },
];

export interface ImpuestoMensualResult {
  ingresosBrutos: number;
  tarifa: number;
  montoImpuesto: number;
  fechaLimite: string;
  fechaLimiteDate: Date;
  categoriaId: string;
}

export function calcularImpuestoMensual(
  ingresosBrutos: number,
  categoriaId: string,
  mesActual: number,
  anioActual: number
): ImpuestoMensualResult {
  const cat = CATEGORIAS_ACTIVIDAD_MUPA.find((c) => c.id === categoriaId)
    || CATEGORIAS_ACTIVIDAD_MUPA[0];

  const tarifa = cat.tarifa;
  const montoImpuesto = ingresosBrutos * (tarifa / 100);

  // Fecha limite: ultimo dia del mes siguiente
  const mesSiguiente = mesActual + 1;
  const anioFechaLimite = mesSiguiente > 11 ? anioActual + 1 : anioActual;
  const mesFechaLimite = mesSiguiente > 11 ? 0 : mesSiguiente;
  const fechaLimiteDate = new Date(anioFechaLimite, mesFechaLimite + 1, 0);

  const fechaLimite = fechaLimiteDate.toLocaleDateString("es-PA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return { ingresosBrutos, tarifa, montoImpuesto, fechaLimite, fechaLimiteDate, categoriaId: cat.id };
}

// ============================================
// GAP #3 — DECLARACION JURADA ANUAL MUNICIPAL
// ============================================

export type DJAnualStatus = "pendiente" | "presentada" | "pagada";

export interface DJAnualState {
  anioFiscal: number;
  status: DJAnualStatus;
  fechaPresentacion?: string;
  fechaPago?: string;
  montoDeclarado?: number;
}

export interface DJAnualSemaforoResult {
  status: DJAnualStatus;
  semaforo: SemaforoLevel;
  message: string;
  diasRestantes: number | null;
  multa?: string;
}

export function getSemaforoDJAnual(
  now: Date,
  djState: DJAnualState | null
): DJAnualSemaforoResult {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const anioFiscalVigente = currentYear - 1;
  const deadline = new Date(currentYear, 0, 31); // 31 enero

  if (djState && djState.anioFiscal === anioFiscalVigente) {
    if (djState.status === "pagada") {
      return { status: "pagada", semaforo: "verde", message: `DJ Anual ${anioFiscalVigente} pagada. Cumplimiento al dia.`, diasRestantes: null };
    }
    if (djState.status === "presentada") {
      return { status: "presentada", semaforo: "amarillo", message: `DJ Anual ${anioFiscalVigente} presentada, pendiente de pago.`, diasRestantes: null };
    }
  }

  if (currentMonth === 0) {
    const diasRestantes = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
    if (diasRestantes <= 0) {
      return { status: "pendiente", semaforo: "rojo", message: `DJ Anual ${anioFiscalVigente} VENCIDA. Multa $500.`, diasRestantes: 0, multa: "$500.00" };
    }
    if (diasRestantes <= 10) {
      return { status: "pendiente", semaforo: "rojo", message: `Faltan ${diasRestantes} dias para la DJ Anual ${anioFiscalVigente}. Actua YA.`, diasRestantes, multa: "$500.00 si no se presenta" };
    }
    return { status: "pendiente", semaforo: "amarillo", message: `Faltan ${diasRestantes} dias. DJ Anual ${anioFiscalVigente} vence 31 de enero.`, diasRestantes };
  }

  if (currentMonth > 0 && (!djState || djState.anioFiscal !== anioFiscalVigente || djState.status === "pendiente")) {
    return { status: "pendiente", semaforo: "rojo", message: `DJ Anual ${anioFiscalVigente} NO presentada. Plazo vencido (31 enero). Multa: $500.`, diasRestantes: 0, multa: "$500.00" };
  }

  return { status: "pendiente", semaforo: "verde", message: `DJ Anual ${currentYear} se presenta en enero ${currentYear + 1}.`, diasRestantes: null };
}

// ============================================
// GAP #3 — ROTULOS Y AVISOS (PATENTE MUNICIPAL)
// ============================================

export interface Rotulo {
  id: string;
  descripcion: string;
  anchoM: number;
  altoM: number;
  areaM2: number;
  fechaVencimiento: string;
  costoAnual: number;
}

export interface RotulosState {
  rotulos: Rotulo[];
  lastUpdated: string;
}

export interface RotuloSemaforoResult {
  id: string;
  descripcion: string;
  semaforo: SemaforoLevel;
  message: string;
  diasParaVencimiento: number;
  costoAnual: number;
}

/** Tarifa: B/.5.00 por m2, minimo B/.20.00 */
export function calcularCostoRotulo(areaM2: number): number {
  return Math.max(areaM2 * 5.0, 20.0);
}

/** Semaforo por rotulo: alerta 30 dias antes de vencimiento */
export function getSemaforoRotulo(now: Date, rotulo: Rotulo): RotuloSemaforoResult {
  const vencimiento = new Date(rotulo.fechaVencimiento);
  const diasParaVencimiento = Math.ceil((vencimiento.getTime() - now.getTime()) / 86400000);

  let semaforo: SemaforoLevel;
  let message: string;

  if (diasParaVencimiento < 0) {
    semaforo = "rojo";
    message = `VENCIDO hace ${Math.abs(diasParaVencimiento)} dias. Riesgo de multa.`;
  } else if (diasParaVencimiento <= 30) {
    semaforo = "amarillo";
    message = `Vence en ${diasParaVencimiento} dias. Renueva antes del ${vencimiento.toLocaleDateString("es-PA")}.`;
  } else {
    semaforo = "verde";
    message = `Vigente. Vence el ${vencimiento.toLocaleDateString("es-PA")} (${diasParaVencimiento} dias).`;
  }

  return { id: rotulo.id, descripcion: rotulo.descripcion, semaforo, message, diasParaVencimiento, costoAnual: rotulo.costoAnual };
}

/** Resumen de todos los rotulos */
export function calcularResumenRotulos(rotulos: Rotulo[], now: Date) {
  let costoAnualTotal = 0;
  let vencidos = 0;
  let porVencer30d = 0;
  let vigentes = 0;

  for (const r of rotulos) {
    costoAnualTotal += r.costoAnual;
    const sem = getSemaforoRotulo(now, r);
    if (sem.semaforo === "rojo") vencidos++;
    else if (sem.semaforo === "amarillo") porVencer30d++;
    else vigentes++;
  }

  return { totalRotulos: rotulos.length, costoAnualTotal, vencidos, porVencer30d, vigentes };
}

// ============================================
// PERSISTENCIA localStorage
// ============================================

const MUPA_DJ_ANUAL_KEY = "midf_mupa_dj_anual";
const MUPA_ROTULOS_KEY = "midf_mupa_rotulos";
const MUPA_CATEGORIA_KEY = "midf_mupa_categoria_actividad";
const MUPA_IMPUESTO_KEY = "midf_mupa_impuesto_ingresos";

export function getDJAnualState(): DJAnualState | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(MUPA_DJ_ANUAL_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function saveDJAnualState(state: DJAnualState): void {
  if (typeof window !== "undefined") localStorage.setItem(MUPA_DJ_ANUAL_KEY, JSON.stringify(state));
}

export function getRotulosState(): RotulosState | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(MUPA_ROTULOS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function saveRotulosState(state: RotulosState): void {
  if (typeof window !== "undefined") localStorage.setItem(MUPA_ROTULOS_KEY, JSON.stringify(state));
}

export function getCategoriaActividad(): string {
  if (typeof window === "undefined") return "comercio_general";
  return localStorage.getItem(MUPA_CATEGORIA_KEY) || "comercio_general";
}
export function saveCategoriaActividad(id: string): void {
  if (typeof window !== "undefined") localStorage.setItem(MUPA_CATEGORIA_KEY, id);
}

export function getImpuestoIngresos(): number {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(MUPA_IMPUESTO_KEY);
  return v ? parseFloat(v) || 0 : 0;
}
export function saveImpuestoIngresos(v: number): void {
  if (typeof window !== "undefined") localStorage.setItem(MUPA_IMPUESTO_KEY, String(v));
}
