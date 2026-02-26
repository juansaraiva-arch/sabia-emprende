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
