/**
 * Calendario de Panama 2026
 * Feriados nacionales, recargos laborales y fechas limite fiscales.
 */

// ============================================
// FERIADOS NACIONALES PANAMA 2026
// ============================================

export interface Feriado {
  fecha: Date;
  nombre: string;
  tipo: "fijo" | "movil";
  /** Si cae en domingo, se mueve al lunes */
  puenteHabilitado: boolean;
}

export const FERIADOS_PANAMA_2026: Feriado[] = [
  { fecha: new Date(2026, 0, 1), nombre: "Ano Nuevo", tipo: "fijo", puenteHabilitado: true },
  { fecha: new Date(2026, 0, 9), nombre: "Dia de los Martires", tipo: "fijo", puenteHabilitado: true },
  // Carnaval 2026: 14-17 febrero (sabado-martes antes de Miercoles de Ceniza)
  { fecha: new Date(2026, 1, 14), nombre: "Carnaval (Sabado)", tipo: "movil", puenteHabilitado: false },
  { fecha: new Date(2026, 1, 15), nombre: "Carnaval (Domingo)", tipo: "movil", puenteHabilitado: false },
  { fecha: new Date(2026, 1, 16), nombre: "Carnaval (Lunes)", tipo: "movil", puenteHabilitado: false },
  { fecha: new Date(2026, 1, 17), nombre: "Carnaval (Martes)", tipo: "movil", puenteHabilitado: false },
  { fecha: new Date(2026, 3, 2), nombre: "Jueves Santo", tipo: "movil", puenteHabilitado: false },
  { fecha: new Date(2026, 3, 3), nombre: "Viernes Santo", tipo: "movil", puenteHabilitado: false },
  { fecha: new Date(2026, 4, 1), nombre: "Dia del Trabajo", tipo: "fijo", puenteHabilitado: true },
  { fecha: new Date(2026, 10, 3), nombre: "Separacion de Colombia", tipo: "fijo", puenteHabilitado: true },
  { fecha: new Date(2026, 10, 4), nombre: "Dia de la Bandera", tipo: "fijo", puenteHabilitado: true },
  { fecha: new Date(2026, 10, 5), nombre: "Consolidacion Separatista (Colon)", tipo: "fijo", puenteHabilitado: true },
  { fecha: new Date(2026, 10, 10), nombre: "Grito de Independencia (Los Santos)", tipo: "fijo", puenteHabilitado: true },
  { fecha: new Date(2026, 10, 28), nombre: "Independencia de Espana", tipo: "fijo", puenteHabilitado: true },
  { fecha: new Date(2026, 11, 8), nombre: "Dia de las Madres", tipo: "fijo", puenteHabilitado: true },
  { fecha: new Date(2026, 11, 25), nombre: "Navidad", tipo: "fijo", puenteHabilitado: true },
];

// ============================================
// FECHAS LIMITE FISCALES / LABORALES
// ============================================

export interface FechaLimite {
  fecha: Date;
  nombre: string;
  categoria: "dgi" | "css" | "laboral" | "municipal";
  descripcion: string;
}

export function getFechasLimite2026(): FechaLimite[] {
  const fechas: FechaLimite[] = [];

  // CSS: Planilla mensual (vence el 15 de cada mes)
  for (let m = 0; m < 12; m++) {
    fechas.push({
      fecha: new Date(2026, m, 15),
      nombre: "Planilla CSS",
      categoria: "css",
      descripcion: `Pago cuotas obrero-patronales de ${nombreMes(m === 0 ? 11 : m - 1)}`,
    });
  }

  // XIII Mes: 3 cortes al ano
  fechas.push({
    fecha: new Date(2026, 3, 15),
    nombre: "XIII Mes (1er tercio)",
    categoria: "laboral",
    descripcion: "Pago del primer tercio del XIII Mes (16 dic - 15 abr)",
  });
  fechas.push({
    fecha: new Date(2026, 7, 15),
    nombre: "XIII Mes (2do tercio)",
    categoria: "laboral",
    descripcion: "Pago del segundo tercio del XIII Mes (16 abr - 15 ago)",
  });
  fechas.push({
    fecha: new Date(2026, 11, 15),
    nombre: "XIII Mes (3er tercio)",
    categoria: "laboral",
    descripcion: "Pago del tercer tercio del XIII Mes (16 ago - 15 dic)",
  });

  // ITBMS: Declaracion trimestral
  fechas.push({ fecha: new Date(2026, 0, 15), nombre: "ITBMS Q4/2025", categoria: "dgi", descripcion: "Declaracion ITBMS trimestral (Oct-Dic 2025)" });
  fechas.push({ fecha: new Date(2026, 3, 15), nombre: "ITBMS Q1/2026", categoria: "dgi", descripcion: "Declaracion ITBMS trimestral (Ene-Mar 2026)" });
  fechas.push({ fecha: new Date(2026, 6, 15), nombre: "ITBMS Q2/2026", categoria: "dgi", descripcion: "Declaracion ITBMS trimestral (Abr-Jun 2026)" });
  fechas.push({ fecha: new Date(2026, 9, 15), nombre: "ITBMS Q3/2026", categoria: "dgi", descripcion: "Declaracion ITBMS trimestral (Jul-Sep 2026)" });

  // ISR: Declaracion anual (30 de marzo)
  fechas.push({
    fecha: new Date(2026, 2, 30),
    nombre: "Declaracion ISR",
    categoria: "dgi",
    descripcion: "Declaracion de Impuesto sobre la Renta anual 2025",
  });

  // Agente Residente: 30 de junio
  fechas.push({
    fecha: new Date(2026, 5, 30),
    nombre: "Informe Agente Residente",
    categoria: "dgi",
    descripcion: "Informe anual de beneficiarios finales (Ley 129/2020)",
  });

  // Aviso de Operaciones: Renovacion anual (depende del municipio, generalizar diciembre)
  fechas.push({
    fecha: new Date(2026, 11, 31),
    nombre: "Renovacion Aviso Operaciones",
    categoria: "municipal",
    descripcion: "Renovacion anual del Aviso de Operaciones en el municipio",
  });

  return fechas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

// ============================================
// RECARGOS LABORALES
// ============================================

export const RECARGOS = {
  /** Recargo por trabajo en domingo */
  domingo: 0.50, // 50% adicional
  /** Recargo por trabajo en feriado */
  feriado: 1.50, // 150% adicional (paga triple)
  /** Horas extras diurnas (>8h) */
  horasExtrasDiurnas: 0.25, // 25% adicional
  /** Horas extras nocturnas (>8h, 6pm-6am) */
  horasExtrasNocturnas: 0.75, // 75% adicional
  /** Turno nocturno (6pm-6am) */
  turnoNocturno: 0.50, // 50% adicional
};

// ============================================
// HELPERS
// ============================================

function nombreMes(m: number): string {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return meses[m] || "";
}

/** Verifica si una fecha es feriado */
export function esFeriado(fecha: Date): Feriado | null {
  return FERIADOS_PANAMA_2026.find(
    (f) =>
      f.fecha.getDate() === fecha.getDate() &&
      f.fecha.getMonth() === fecha.getMonth() &&
      f.fecha.getFullYear() === fecha.getFullYear()
  ) || null;
}

/** Verifica si una fecha es domingo */
export function esDomingo(fecha: Date): boolean {
  return fecha.getDay() === 0;
}

/** Calcula dias laborables en un mes (excluyendo domingos y feriados) */
export function diasLaborables(mes: number, year = 2026): number {
  let count = 0;
  const daysInMonth = new Date(year, mes + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const fecha = new Date(year, mes, d);
    if (!esDomingo(fecha) && !esFeriado(fecha)) {
      count++;
    }
  }
  return count;
}

/** Obtiene los proximos N eventos del calendario fiscal */
export function getProximosEventos(n = 5, fromDate?: Date): FechaLimite[] {
  const now = fromDate || new Date();
  return getFechasLimite2026()
    .filter((f) => f.fecha.getTime() >= now.getTime())
    .slice(0, n);
}
