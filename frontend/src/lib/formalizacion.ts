// ============================================
// FORMALIZACION S.E. — Ruta Legal Panama
// Tipos, datos y helpers para el tracker de
// Sociedad de Emprendimiento
// ============================================

export type StepStatus = "pendiente" | "en_proceso" | "completado";

export interface FormalizacionStep {
  id: string;
  order: number;
  title: string;
  entity: string;
  url: string;
  description: string;
  benefit: string;
  instruction: string;
  status: StepStatus;
  completedAt?: string;
}

export interface FormalizacionState {
  steps: FormalizacionStep[];
  startedAt: string;
  lastUpdated: string;
}

// ============================================
// 6 PASOS DE FORMALIZACION
// ============================================

export const FORMALIZACION_STEPS_DATA: Omit<FormalizacionStep, "status" | "completedAt">[] = [
  {
    id: "estatutos_se",
    order: 1,
    title: "Estatutos S.E.",
    entity: "Registro Publico",
    url: "https://www.rp.gob.pa/",
    description:
      "Redaccion y firma de los Estatutos de la Sociedad de Emprendimiento. Debe definir las reglas de juego de tu empresa: socios, capital y actividades.",
    benefit: "Define la estructura legal de tu negocio",
    instruction:
      "El asistente puede generar un borrador automatico usando los modelos estandar de la ley panamena para Sociedades de Emprendimiento.",
  },
  {
    id: "inscripcion_rp",
    order: 2,
    title: "Inscripcion en Registro Publico",
    entity: "Registro Publico",
    url: "https://www.rp.gob.pa/",
    description:
      "Registro oficial de la existencia de tu sociedad para obtener tu ficha y tomo. Es un proceso 100% digital y simplificado para este tipo de sociedades.",
    benefit: "Obtener ficha, tomo y asiento (existencia legal)",
    instruction:
      "Presenta los Estatutos firmados ante el Registro Publico de Panama. El proceso es digital.",
  },
  {
    id: "aviso_operacion",
    order: 3,
    title: "Aviso de Operacion",
    entity: "MICI - Panama Emprende",
    url: "https://www.panamaemprende.gob.pa/",
    description:
      "Obtencion del permiso legal para empezar a vender y operar comercialmente. Necesitaras el RUC de la sociedad obtenido en el paso anterior.",
    benefit: "Permiso comercial para operar",
    instruction:
      "Tramita el Aviso de Operacion en el Portal Panama Emprende del MICI.",
  },
  {
    id: "ruc_nit",
    order: 4,
    title: "RUC y NIT en la DGI",
    entity: "DGI - e-Tax 2.0",
    url: "https://dgi.mef.gob.pa/",
    description:
      "Inscripcion en el sistema e-Tax 2.0 para cumplir con tus obligaciones tributarias ante la Direccion General de Ingresos. Debes crear tu numero de identificacion tributaria (NIT).",
    benefit: "Cumplimiento tributario e identidad fiscal",
    instruction:
      "Registrate en e-Tax 2.0 y actualiza los datos de la sociedad para obtener el RUC y NIT.",
  },
  {
    id: "inscripcion_municipal",
    order: 5,
    title: "Inscripcion Municipal",
    entity: "Municipio de Panama (MUPA)",
    url: "https://mupa.gob.pa/",
    description:
      "Registro en la alcaldia correspondiente para el pago de impuestos municipales mensuales. Obligatorio para evitar multas por operar sin registro local.",
    benefit: "Registro local obligatorio para evitar multas",
    instruction:
      "Acude a la Tesoreria Municipal de Panama (MUPA) para registrar tu empresa.",
  },
  {
    id: "registro_ampyme",
    order: 6,
    title: "Registro Empresarial AMPYME",
    entity: "AMPYME",
    url: "https://ampyme.gob.pa/",
    description:
      "Tramite final para certificar tu negocio como micro o pequena empresa. Acceso a la exoneracion del Impuesto sobre la Renta (ISR) por tus primeros dos anos de operacion.",
    benefit: "Exoneracion ISR por 2 anos",
    instruction:
      "Registra tu empresa en AMPYME para obtener la certificacion MIPYME y el beneficio fiscal.",
  },
];

// ============================================
// MAPEO: Categoria de documento → Paso del tracker
// ============================================

export const DOC_CATEGORY_TO_STEP: Record<string, string> = {
  pacto_social: "estatutos_se",
  aviso_operacion: "aviso_operacion",
  ruc: "ruc_nit",
};

// ============================================
// LOCALSTORAGE HELPERS
// ============================================

const STORAGE_KEY = "midf_formalizacion_tracker";
const HAS_RUC_KEY = "midf_has_ruc";

export function getFormalizacionState(): FormalizacionState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function initFormalizacionState(): FormalizacionState {
  const now = new Date().toISOString();
  const state: FormalizacionState = {
    steps: FORMALIZACION_STEPS_DATA.map((s) => ({
      ...s,
      status: "pendiente" as StepStatus,
    })),
    startedAt: now,
    lastUpdated: now,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  return state;
}

export function saveFormalizacionState(state: FormalizacionState): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function updateStepStatus(
  stepId: string,
  status: StepStatus
): FormalizacionState | null {
  const state = getFormalizacionState();
  if (!state) return null;
  const step = state.steps.find((s) => s.id === stepId);
  if (!step) return null;
  step.status = status;
  if (status === "completado") {
    step.completedAt = new Date().toISOString();
  } else {
    step.completedAt = undefined;
  }
  state.lastUpdated = new Date().toISOString();
  saveFormalizacionState(state);

  // Si el paso de RUC se completa, actualizar flag
  if (stepId === "ruc_nit" && status === "completado") {
    localStorage.setItem(HAS_RUC_KEY, "true");
  }

  return state;
}

// ============================================
// FUNCIONES DE CONSULTA
// ============================================

export function checkFormalizationStatus(): {
  total: number;
  completed: number;
  pending: string[];
  inProgress: string[];
  completedSteps: string[];
  percentComplete: number;
  started: boolean;
} {
  const state = getFormalizacionState();
  if (!state) {
    return {
      total: 6,
      completed: 0,
      pending: FORMALIZACION_STEPS_DATA.map((s) => s.title),
      inProgress: [],
      completedSteps: [],
      percentComplete: 0,
      started: false,
    };
  }
  const pending = state.steps.filter((s) => s.status === "pendiente").map((s) => s.title);
  const inProgress = state.steps.filter((s) => s.status === "en_proceso").map((s) => s.title);
  const completedSteps = state.steps.filter((s) => s.status === "completado").map((s) => s.title);
  return {
    total: state.steps.length,
    completed: completedSteps.length,
    pending,
    inProgress,
    completedSteps,
    percentComplete: Math.round((completedSteps.length / state.steps.length) * 100),
    started: true,
  };
}

export function hasRuc(): boolean {
  if (typeof window === "undefined") return false;
  // Check 1: Flag directo
  if (localStorage.getItem(HAS_RUC_KEY) === "true") return true;
  // Check 2: Paso RUC completado en tracker
  const state = getFormalizacionState();
  if (state) {
    const rucStep = state.steps.find((s) => s.id === "ruc_nit");
    if (rucStep?.status === "completado") return true;
  }
  return false;
}
