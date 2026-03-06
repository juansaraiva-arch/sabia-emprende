/**
 * Mi RRHH — Types and localStorage utilities
 * Single Source of Truth for employee/freelancer data
 * Feeds: Form 03, F2 V10, Form 20, Planilla CSS
 */

// ============================================
// TYPES
// ============================================

export type TipoPersonal = "empleado" | "freelancer";
export type TipoDocumento = "cedula" | "pasaporte" | "carnet_residente";
export type TipoContrato = "indefinido" | "definido" | "por_obra";
export type FormaPago = "mensual" | "quincenal" | "bisemanal" | "semanal";
export type Jornada = "completa" | "parcial";
export type EstadoPersonal = "activo" | "inactivo";
export type ModalidadPagoFreelance = "por_proyecto" | "mensual" | "por_hora";

export interface PersonalRecord {
  id: string;
  // Common fields
  tipo_personal: TipoPersonal;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  dv: string;
  nombre_completo: string;
  telefono: string;
  email: string;
  direccion: string;
  ruc_personal: string;
  estado: EstadoPersonal;

  // Empleado fields
  fecha_nacimiento: string;
  sexo: string;
  nacionalidad: string;
  estado_civil: string;
  numero_dependientes: number;
  fecha_ingreso: string;
  fecha_egreso: string;
  tipo_contrato: TipoContrato;
  cargo: string;
  departamento: string;
  jornada: Jornada;
  salario_mensual: number;
  forma_pago: FormaPago;
  cuenta_bancaria: string;
  banco: string;
  numero_css: string;
  fecha_inscripcion_css: string;
  aplica_deduccion_conyugal: boolean;
  deduccion_hipotecaria_anual: number;
  gastos_escolares_anuales: number;
  gastos_escolares_discapacitados: number;
  seguro_hospitalizacion_anual: number;
  tiene_gastos_representacion: boolean;

  // Freelancer fields
  tipo_servicio: string;
  tiene_contrato_vigente: boolean;
  fecha_inicio_relacion: string;
  fecha_fin_relacion: string;
  tarifa_honorario: number;
  modalidad_pago_freelance: ModalidadPagoFreelance;
  retiene_isr: boolean;
}

export interface PlanillaMensualEntry {
  personal_id: string;
  nombre: string;
  cedula: string;
  // Pre-filled from registro
  salario_base: number;
  // Variable
  dias_trabajados: number;
  horas_extras: number;
  comisiones: number;
  bonificaciones: number;
  gastos_representacion: number;
  decimo_tercer_mes: number;
  vacaciones_proporcionales: number;
  otros_ingresos_gravables: number;
  otros_descuentos: number;
  // Calculated
  total_devengado: number;
  css_trabajador: number;
  se_trabajador: number;
  retencion_isr: number;
  retencion_isr_gastos_rep: number;
  total_deducciones: number;
  css_empleador: number;
  se_empleador: number;
  riesgos_profesionales: number;
  total_aportes_empleador: number;
  salario_neto: number;
  costo_total_empresa: number;
}

export interface PlanillaMensual {
  id: string;
  anio: number;
  mes: number;
  estado: "borrador" | "cerrado";
  entries: PlanillaMensualEntry[];
  created_at: string;
  closed_at: string | null;
}

export interface PagoFreelancerEntry {
  personal_id: string;
  nombre: string;
  cedula_ruc: string;
  descripcion_servicio: string;
  monto_bruto: number;
  itbms: number;
  retencion_isr: number;
  monto_neto: number;
  numero_factura: string;
  fecha_pago: string;
}

export interface PagosFreelancerMes {
  id: string;
  anio: number;
  mes: number;
  estado: "borrador" | "cerrado";
  entries: PagoFreelancerEntry[];
  created_at: string;
  closed_at: string | null;
}

// Accumulated annual totals (derived, not stored separately)
export interface AcumuladoAnualEmpleado {
  personal_id: string;
  nombre: string;
  cedula: string;
  tipo: TipoPersonal;
  salario_bruto_acumulado: number;
  isr_retenido_acumulado: number;
  css_obrero_acumulado: number;
  se_obrero_acumulado: number;
  css_patronal_acumulado: number;
  se_patronal_acumulado: number;
  riesgos_prof_acumulado: number;
  xiii_mes_acumulado: number;
}

// ============================================
// FREQUENCY CONFIG (Expansion #1 — Frecuencias de planilla)
// ============================================

export interface FrequencyConfig {
  key: FormaPago;
  label: string;
  periodsPerYear: number;
  divisor: number; // factor para convertir salario mensual a periodo
  isrExemptPerPeriod: number;
  isr15PctLimitPerPeriod: number;
}

export const FREQUENCY_CONFIGS: Record<FormaPago, FrequencyConfig> = {
  mensual: {
    key: "mensual",
    label: "Mensual",
    periodsPerYear: 12,
    divisor: 1,
    isrExemptPerPeriod: 916.67,    // 11000 / 12
    isr15PctLimitPerPeriod: 4166.67, // 50000 / 12
  },
  quincenal: {
    key: "quincenal",
    label: "Quincenal",
    periodsPerYear: 24,
    divisor: 2, // salario mensual / 2
    isrExemptPerPeriod: 458.33,    // 11000 / 24
    isr15PctLimitPerPeriod: 2083.33, // 50000 / 24
  },
  bisemanal: {
    key: "bisemanal",
    label: "Bisemanal",
    periodsPerYear: 26,
    divisor: 26 / 12, // salario mensual * 12 / 26
    isrExemptPerPeriod: 423.08,    // 11000 / 26
    isr15PctLimitPerPeriod: 1923.08, // 50000 / 26
  },
  semanal: {
    key: "semanal",
    label: "Semanal",
    periodsPerYear: 52,
    divisor: 52 / 12, // salario mensual * 12 / 52
    isrExemptPerPeriod: 211.54,    // 11000 / 52
    isr15PctLimitPerPeriod: 961.54, // 50000 / 52
  },
};

// ============================================
// FISCAL RATES (parametrizable)
// ============================================

export interface TasasFiscales {
  css_obrero: number;        // 9.75%
  css_patronal: number;      // 12.25%
  se_trabajador: number;     // 1.25%
  se_empleador: number;      // 1.50%
  riesgos_profesionales: number; // 1.50% (from company config)
  salario_minimo: number;    // 650.00
  retencion_isr_freelancers: number; // 50% del ITBMS
}

export const DEFAULT_TASAS: TasasFiscales = {
  css_obrero: 9.75,
  css_patronal: 12.25,
  se_trabajador: 1.25,
  se_empleador: 1.50,
  riesgos_profesionales: 1.50,
  salario_minimo: 650.00,
  retencion_isr_freelancers: 50,
};

// ============================================
// ISR CALCULATION (Art. 700 Codigo Fiscal)
// ============================================

/**
 * Calcula retencion ISR mensual segun Art. 700 CF
 * Tabla anual:
 *   Hasta B/.11,000 → 0%
 *   B/.11,001 - B/.50,000 → 15% sobre excedente de B/.11,000
 *   Mas de B/.50,000 → B/.5,850 + 25% sobre excedente de B/.50,000
 */
export function calcularISRMensual(params: {
  totalDevengadoMensual: number;
  cssTrabajador: number;
  seTrabajador: number;
  deduccionConyugal: boolean;
  deduccionHipotecariaAnual: number;
  gastosEscolaresAnuales: number;
  gastosEscolaresDiscapacitados: number;
  seguroHospitalizacionAnual: number;
  periodsPerYear?: number; // default 12 (mensual); 24=quincenal, 26=bisemanal, 52=semanal
}): number {
  const {
    totalDevengadoMensual,
    cssTrabajador,
    seTrabajador,
    deduccionConyugal,
    deduccionHipotecariaAnual,
    gastosEscolaresAnuales,
    gastosEscolaresDiscapacitados,
    seguroHospitalizacionAnual,
    periodsPerYear = 12,
  } = params;

  // Step 1: Ingreso neto del periodo (despues de CSS + SE)
  const ingresoNetoPeriodo = totalDevengadoMensual - cssTrabajador - seTrabajador;

  // Step 2: Anualizar (multiplicar por periodos/anio)
  const ingresoAnual = ingresoNetoPeriodo * periodsPerYear;

  // Step 3: Deducciones personales
  let deduccionesPersonales = 0;
  if (deduccionConyugal) deduccionesPersonales += 800; // B/.800 anual
  deduccionesPersonales += Math.min(deduccionHipotecariaAnual, 15000);
  deduccionesPersonales += gastosEscolaresAnuales;
  deduccionesPersonales += gastosEscolaresDiscapacitados;
  deduccionesPersonales += seguroHospitalizacionAnual;

  // Step 4: Renta neta gravable
  const rentaNetaAnual = Math.max(0, ingresoAnual - deduccionesPersonales);

  // Step 5: Aplicar tabla escalonada
  let isrAnual = 0;
  if (rentaNetaAnual <= 11000) {
    isrAnual = 0;
  } else if (rentaNetaAnual <= 50000) {
    isrAnual = (rentaNetaAnual - 11000) * 0.15;
  } else {
    isrAnual = 5850 + (rentaNetaAnual - 50000) * 0.25;
  }

  // Step 6: Dividir entre periodos/anio
  return Math.round((isrAnual / periodsPerYear) * 100) / 100;
}

/**
 * Calcula retencion ISR sobre gastos de representacion
 * Hasta B/.25,000/ano → 10%
 * Excedente → 15%
 */
export function calcularISRGastosRepresentacion(gastosMensuales: number): number {
  // Anualizar
  const gastosAnuales = gastosMensuales * 12;
  let isrAnual = 0;
  if (gastosAnuales <= 25000) {
    isrAnual = gastosAnuales * 0.10;
  } else {
    isrAnual = 25000 * 0.10 + (gastosAnuales - 25000) * 0.15;
  }
  return Math.round((isrAnual / 12) * 100) / 100;
}

// ============================================
// LOCALSTORAGE KEYS
// ============================================

const KEYS = {
  personal: "midf_rrhh_personal",
  planillas: "midf_rrhh_planillas",
  pagos_freelancers: "midf_rrhh_pagos_freelancers",
};

// ============================================
// CRUD OPERATIONS
// ============================================

export function loadPersonal(): PersonalRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.personal);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePersonal(records: PersonalRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.personal, JSON.stringify(records));
}

export function loadPlanillas(): PlanillaMensual[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.planillas);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePlanillas(planillas: PlanillaMensual[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.planillas, JSON.stringify(planillas));
}

export function loadPagosFreelancers(): PagosFreelancerMes[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.pagos_freelancers);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePagosFreelancers(pagos: PagosFreelancerMes[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.pagos_freelancers, JSON.stringify(pagos));
}

// ============================================
// ACCUMULATORS (derived from closed planillas)
// ============================================

export function computeAcumuladosAnuales(
  personal: PersonalRecord[],
  planillas: PlanillaMensual[],
  pagosFreelancers: PagosFreelancerMes[],
  anioFiscal: number
): AcumuladoAnualEmpleado[] {
  const result: AcumuladoAnualEmpleado[] = [];

  // Empleados from planillas
  const planillasAnio = planillas.filter((p) => p.anio === anioFiscal && p.estado === "cerrado");
  const empleadoMap = new Map<string, AcumuladoAnualEmpleado>();

  for (const planilla of planillasAnio) {
    for (const entry of planilla.entries) {
      if (!empleadoMap.has(entry.personal_id)) {
        const p = personal.find((r) => r.id === entry.personal_id);
        empleadoMap.set(entry.personal_id, {
          personal_id: entry.personal_id,
          nombre: entry.nombre,
          cedula: entry.cedula,
          tipo: "empleado",
          salario_bruto_acumulado: 0,
          isr_retenido_acumulado: 0,
          css_obrero_acumulado: 0,
          se_obrero_acumulado: 0,
          css_patronal_acumulado: 0,
          se_patronal_acumulado: 0,
          riesgos_prof_acumulado: 0,
          xiii_mes_acumulado: 0,
        });
      }
      const acc = empleadoMap.get(entry.personal_id)!;
      acc.salario_bruto_acumulado += entry.total_devengado;
      acc.isr_retenido_acumulado += entry.retencion_isr + entry.retencion_isr_gastos_rep;
      acc.css_obrero_acumulado += entry.css_trabajador;
      acc.se_obrero_acumulado += entry.se_trabajador;
      acc.css_patronal_acumulado += entry.css_empleador;
      acc.se_patronal_acumulado += entry.se_empleador;
      acc.riesgos_prof_acumulado += entry.riesgos_profesionales;
      acc.xiii_mes_acumulado += entry.decimo_tercer_mes;
    }
  }

  result.push(...empleadoMap.values());

  // Freelancers from pagos
  const pagosAnio = pagosFreelancers.filter((p) => p.anio === anioFiscal && p.estado === "cerrado");
  const freelancerMap = new Map<string, AcumuladoAnualEmpleado>();

  for (const pago of pagosAnio) {
    for (const entry of pago.entries) {
      if (!freelancerMap.has(entry.personal_id)) {
        freelancerMap.set(entry.personal_id, {
          personal_id: entry.personal_id,
          nombre: entry.nombre,
          cedula: entry.cedula_ruc,
          tipo: "freelancer",
          salario_bruto_acumulado: 0,
          isr_retenido_acumulado: 0,
          css_obrero_acumulado: 0,
          se_obrero_acumulado: 0,
          css_patronal_acumulado: 0,
          se_patronal_acumulado: 0,
          riesgos_prof_acumulado: 0,
          xiii_mes_acumulado: 0,
        });
      }
      const acc = freelancerMap.get(entry.personal_id)!;
      acc.salario_bruto_acumulado += entry.monto_bruto;
      acc.isr_retenido_acumulado += entry.retencion_isr;
    }
  }

  result.push(...freelancerMap.values());

  // Round all values
  return result.map((r) => ({
    ...r,
    salario_bruto_acumulado: Math.round(r.salario_bruto_acumulado * 100) / 100,
    isr_retenido_acumulado: Math.round(r.isr_retenido_acumulado * 100) / 100,
    css_obrero_acumulado: Math.round(r.css_obrero_acumulado * 100) / 100,
    se_obrero_acumulado: Math.round(r.se_obrero_acumulado * 100) / 100,
    css_patronal_acumulado: Math.round(r.css_patronal_acumulado * 100) / 100,
    se_patronal_acumulado: Math.round(r.se_patronal_acumulado * 100) / 100,
    riesgos_prof_acumulado: Math.round(r.riesgos_prof_acumulado * 100) / 100,
    xiii_mes_acumulado: Math.round(r.xiii_mes_acumulado * 100) / 100,
  }));
}

export function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================
// EXPANSION #2 — HORAS EXTRAS (Ley 44 de 1995)
// ============================================

export type TipoHoraExtra =
  | "diurna"             // +25% dia laborable 6am-6pm
  | "nocturna"           // +50% dia laborable 6pm-6am
  | "descanso"           // +50% dia de descanso semanal
  | "nocturna_descanso"  // +75% nocturna en descanso
  | "feriado";           // +150% feriado nacional

export interface OvertimeTypeInfo {
  label: string;
  surcharge: number; // porcentaje recargo
  color: string;
}

export const OVERTIME_TYPES: Record<TipoHoraExtra, OvertimeTypeInfo> = {
  diurna: { label: "Diurna (dia laborable)", surcharge: 25, color: "text-blue-600" },
  nocturna: { label: "Nocturna (dia laborable)", surcharge: 50, color: "text-indigo-600" },
  descanso: { label: "Dia de descanso", surcharge: 50, color: "text-orange-600" },
  nocturna_descanso: { label: "Nocturna (descanso)", surcharge: 75, color: "text-red-600" },
  feriado: { label: "Feriado nacional", surcharge: 150, color: "text-purple-600" },
};

export interface HoraExtraEntry {
  id: string;
  personal_id: string;
  fecha: string;
  tipo: TipoHoraExtra;
  horas: number;
  tarifa_hora_base: number;
  recargo_pct: number;
  monto: number;
}

export interface HorasExtrasMes {
  anio: number;
  mes: number;
  entries: HoraExtraEntry[];
}

// Tarifa hora base = salario mensual / 240
export function calcularTarifaHoraBase(salarioMensual: number): number {
  return Math.round((salarioMensual / 240) * 100) / 100;
}

export function calcularMontoHoraExtra(horas: number, tarifaBase: number, recargoPct: number): number {
  return Math.round(horas * tarifaBase * (1 + recargoPct / 100) * 100) / 100;
}

const HORAS_EXTRAS_KEY = "midf_rrhh_horas_extras";

export function loadHorasExtras(): HorasExtrasMes[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HORAS_EXTRAS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveHorasExtras(data: HorasExtrasMes[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HORAS_EXTRAS_KEY, JSON.stringify(data));
}

// ============================================
// EXPANSION #3 — BONIFICACIONES
// ============================================

export type TipoBonificacion =
  | "productividad"
  | "antiguedad"
  | "representacion"
  | "comision_ventas"
  | "navidad_voluntaria"
  | "transporte"
  | "alimentacion"
  | "otro";

export interface BonusTypeInfo {
  label: string;
  defaultGravable: boolean;
  maxExento?: number; // monto maximo no gravable por mes
}

export const BONUS_TYPES: Record<TipoBonificacion, BonusTypeInfo> = {
  productividad: { label: "Productividad / Desempeno", defaultGravable: true },
  antiguedad: { label: "Antiguedad", defaultGravable: true },
  representacion: { label: "Gastos de Representacion", defaultGravable: true },
  comision_ventas: { label: "Comision de Ventas", defaultGravable: true },
  navidad_voluntaria: { label: "Bono Navidad Voluntario", defaultGravable: true },
  transporte: { label: "Auxilio de Transporte", defaultGravable: false, maxExento: 100 },
  alimentacion: { label: "Auxilio de Alimentacion", defaultGravable: false, maxExento: 100 },
  otro: { label: "Otro", defaultGravable: true },
};

export interface BonificacionEntry {
  id: string;
  personal_id: string;
  tipo: TipoBonificacion;
  descripcion: string;
  monto: number;
  es_gravable: boolean;
  fecha: string;
}

export interface BonificacionesMes {
  anio: number;
  mes: number;
  entries: BonificacionEntry[];
}

const BONIFICACIONES_KEY = "midf_rrhh_bonificaciones";

export function loadBonificaciones(): BonificacionesMes[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BONIFICACIONES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveBonificaciones(data: BonificacionesMes[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BONIFICACIONES_KEY, JSON.stringify(data));
}

// ============================================
// EXPANSION #4 — PRESTAMOS A EMPLEADOS
// ============================================

export type EstadoPrestamo = "activo" | "pagado" | "congelado";

export interface PagoPrestamo {
  id: string;
  fecha: string;
  monto: number;
  fuente: "nomina" | "manual";
}

export interface Prestamo {
  id: string;
  personal_id: string;
  monto_original: number;
  fecha_desembolso: string;
  cuotas_total: number;
  cuota_mensual: number;
  saldo_pendiente: number;
  estado: EstadoPrestamo;
  descripcion: string;
  pagos: PagoPrestamo[];
}

const PRESTAMOS_KEY = "midf_rrhh_prestamos";

export function loadPrestamos(): Prestamo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESTAMOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePrestamos(data: Prestamo[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRESTAMOS_KEY, JSON.stringify(data));
}

// ============================================
// EXPANSION #6 — CONTRATOS DIGITALES
// ============================================

export type TipoContratoCompleto = "indefinido" | "temporal" | "por_obra" | "prueba";
export type EstadoContrato = "vigente" | "por_vencer" | "vencido" | "terminado";

export interface ContratoLaboral {
  id: string;
  personal_id: string;
  tipo: TipoContratoCompleto;
  fecha_inicio: string;
  fecha_fin: string;
  salario_pactado: number;
  jornada: string;
  funciones: string;
  periodo_prueba_dias: number;
  beneficios_adicionales: string;
  estado: EstadoContrato;
  notas: string;
}

export function computeEstadoContrato(contrato: ContratoLaboral, now: Date = new Date()): EstadoContrato {
  if (contrato.estado === "terminado") return "terminado";
  if (contrato.tipo === "indefinido") return "vigente";
  if (!contrato.fecha_fin) return "vigente";
  const fin = new Date(contrato.fecha_fin);
  const diffDays = Math.floor((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "vencido";
  if (diffDays <= 30) return "por_vencer";
  return "vigente";
}

const CONTRATOS_KEY = "midf_rrhh_contratos";

export function loadContratos(): ContratoLaboral[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONTRATOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveContratos(data: ContratoLaboral[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONTRATOS_KEY, JSON.stringify(data));
}

// ============================================
// EXPANSION #5 — CONTROL DE ASISTENCIA
// ============================================

export type TipoAsistencia =
  | "presente"
  | "ausente_justificada"
  | "ausente_injustificada"
  | "tardanza"
  | "permiso"
  | "incapacidad"
  | "feriado"
  | "vacacion";

export interface AsistenciaTypeInfo {
  label: string;
  color: string;
  bgColor: string;
  short: string; // 1-2 char for calendar cells
}

export const ASISTENCIA_TYPES: Record<TipoAsistencia, AsistenciaTypeInfo> = {
  presente: { label: "Presente", color: "text-emerald-700", bgColor: "bg-emerald-100", short: "P" },
  ausente_justificada: { label: "Falta Justificada", color: "text-amber-700", bgColor: "bg-amber-100", short: "FJ" },
  ausente_injustificada: { label: "Falta Injustificada", color: "text-red-700", bgColor: "bg-red-100", short: "FI" },
  tardanza: { label: "Tardanza", color: "text-yellow-700", bgColor: "bg-yellow-100", short: "T" },
  permiso: { label: "Permiso", color: "text-orange-700", bgColor: "bg-orange-100", short: "PE" },
  incapacidad: { label: "Incapacidad CSS", color: "text-purple-700", bgColor: "bg-purple-100", short: "IC" },
  feriado: { label: "Feriado", color: "text-slate-600", bgColor: "bg-slate-200", short: "FE" },
  vacacion: { label: "Vacacion", color: "text-blue-700", bgColor: "bg-blue-100", short: "V" },
};

export interface RegistroAsistencia {
  id: string;
  personal_id: string;
  fecha: string; // YYYY-MM-DD
  tipo: TipoAsistencia;
  hora_entrada?: string;
  hora_salida?: string;
  notas: string;
}

const ASISTENCIA_KEY = "midf_rrhh_asistencia";

export function loadAsistencia(): RegistroAsistencia[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ASISTENCIA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveAsistencia(data: RegistroAsistencia[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ASISTENCIA_KEY, JSON.stringify(data));
}
