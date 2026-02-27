// ============================================
// FORMALIZACION S.E. — Ruta Legal Panama
// Tipos, datos y helpers para el tracker de
// Sociedad de Emprendimiento
// Orden basado en Ley 186 de 2020
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
  requirements: string[];
  costEstimate: string;
  status: StepStatus;
  completedAt?: string;
}

export interface FormalizacionState {
  steps: FormalizacionStep[];
  startedAt: string;
  lastUpdated: string;
}

// ============================================
// 6 PASOS DE FORMALIZACION (Ley 186 de 2020)
// ============================================

export const FORMALIZACION_STEPS_DATA: Omit<FormalizacionStep, "status" | "completedAt">[] = [
  {
    id: "registro_ampyme",
    order: 1,
    title: "Registro Empresarial AMPYME (Ventanilla Unica)",
    entity: "AMPYME",
    url: "https://ampyme.gob.pa/",
    description:
      "Registro inicial para habilitar la exoneracion de impuestos. Es el primer paso obligatorio antes de constituir la sociedad.",
    benefit: "Exoneracion ISR por 2 anos (ahorro de $300/ano en Tasa Unica)",
    instruction:
      "Acude a la Ventanilla Unica de AMPYME con los documentos requeridos para iniciar el registro empresarial.",
    requirements: [
      "2 a 5 socios (personas naturales)",
      "Copia de cedula de cada socio",
      "Recibo de servicios publicos (domicilio)",
      "Capital social declarado minimo de $500",
    ],
    costEstimate: "$0",
  },
  {
    id: "estatutos_se",
    order: 2,
    title: "Redaccion de Estatutos S.E.",
    entity: "AMPYME / Registro Publico",
    url: "https://www.rp.gob.pa/",
    description:
      "Aprobacion del estatuto tipo (modelo estandar) de AMPYME. Define las reglas de juego: socios, capital y actividades de tu empresa.",
    benefit: "Define la estructura legal de tu negocio",
    instruction:
      "Utiliza el modelo estandar de estatutos de AMPYME o contrata asesoria legal externa para redactar estatutos personalizados.",
    requirements: [
      "Definicion de objeto comercial",
      "Distribucion de acciones entre socios",
      "Registro AMPYME completado (Paso 1)",
    ],
    costEstimate: "$0 (autogestionado) / $200-$400 (con abogado)",
  },
  {
    id: "inscripcion_rp",
    order: 3,
    title: "Inscripcion en Registro Publico",
    entity: "Registro Publico",
    url: "https://www.rp.gob.pa/",
    description:
      "Elevacion a Escritura Publica digital para obtener Personeria Juridica (ficha y tomo). Es un proceso 100% digital y simplificado para Sociedades de Emprendimiento.",
    benefit: "Obtener ficha, tomo y asiento (existencia legal)",
    instruction:
      "Presenta los Estatutos aprobados ante el Registro Publico de Panama. El proceso es digital.",
    requirements: [
      "Estatutos aprobados en el paso anterior",
    ],
    costEstimate: "$50-$100 (gastos administrativos y registrales)",
  },
  {
    id: "ruc_nit",
    order: 4,
    title: "RUC y NIT en la DGI (e-Tax 2.0)",
    entity: "DGI - e-Tax 2.0",
    url: "https://dgi.mef.gob.pa/",
    description:
      "Creacion de la identidad tributaria. Inscripcion en el sistema e-Tax 2.0 para cumplir con tus obligaciones ante la Direccion General de Ingresos.",
    benefit: "Identidad fiscal + Tasa Unica exonerada por 2 anos",
    instruction:
      "Registrate en e-Tax 2.0 con la ficha del Registro Publico para obtener el RUC y NIT.",
    requirements: [
      "Ficha del Registro Publico (Paso 3)",
    ],
    costEstimate: "$0 (Tasa Unica exonerada por 2 anos: ahorro de $300/ano)",
  },
  {
    id: "aviso_operacion",
    order: 5,
    title: "Aviso de Operacion (MICI)",
    entity: "MICI - Panama Emprende",
    url: "https://www.panamaemprende.gob.pa/",
    description:
      "Permiso comercial definitivo para facturar. Es el documento que te autoriza a operar comercialmente en Panama.",
    benefit: "Permiso comercial para operar y facturar",
    instruction:
      "Tramita el Aviso de Operacion en el Portal Panama Emprende del MICI con tu RUC.",
    requirements: [
      "RUC obtenido en el paso 4",
    ],
    costEstimate: "$15-$55 (varia segun actividad declarada)",
  },
  {
    id: "inscripcion_municipal",
    order: 6,
    title: "Inscripcion Municipal (MUPA)",
    entity: "Municipio de Panama (MUPA)",
    url: "https://mupa.gob.pa/",
    description:
      "Registro local para pago de tributos municipales. Obligatorio para evitar multas por operar sin registro local. Incluye inspeccion fisica del local si aplica.",
    benefit: "Registro local obligatorio para evitar multas",
    instruction:
      "Acude a la Tesoreria Municipal de Panama (MUPA) para registrar tu empresa y obtener el permiso de operacion municipal.",
    requirements: [
      "Aviso de Operacion (Paso 5)",
      "Inspeccion fisica del local (si aplica)",
    ],
    costEstimate: "$10-$20 (timbres y tramites, independiente del impuesto mensual)",
  },
];

// ============================================
// MAPEO: Categoria de documento → Paso del tracker
// ============================================

export const DOC_CATEGORY_TO_STEP: Record<string, string> = {
  certificacion_ampyme: "registro_ampyme",
  pacto_social: "estatutos_se",
  registro_mercantil: "inscripcion_rp",
  ruc: "ruc_nit",
  aviso_operacion: "aviso_operacion",
  declaracion_mupa: "inscripcion_municipal",
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
    const saved: FormalizacionState = JSON.parse(raw);
    // Migrar: actualizar datos de cada paso desde FORMALIZACION_STEPS_DATA
    // pero conservar status y completedAt del usuario
    const statusMap: Record<string, { status: StepStatus; completedAt?: string }> = {};
    for (const s of saved.steps) {
      statusMap[s.id] = { status: s.status, completedAt: s.completedAt };
    }
    const migrated: FormalizacionState = {
      ...saved,
      steps: FORMALIZACION_STEPS_DATA.map((canonical) => ({
        ...canonical,
        status: statusMap[canonical.id]?.status || ("pendiente" as StepStatus),
        completedAt: statusMap[canonical.id]?.completedAt,
      })),
    };
    // Guardar migrado para que la proxima carga sea rapida
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
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

// ─── Validacion de RUC (Registro Unico de Contribuyente) ───

/**
 * Regex para validar formato de RUC panameño.
 * Cubre:
 *   Persona natural (cedula): 8-765-4321, 2-123-4567
 *   Persona juridica: 155622334, 1556-223-34567
 *   Extranjeros: PE-123-456, E-8-12345, N-19-1234, PI-1-234
 *   Sociedad de Emprendimiento: SE-0001-0001
 *
 * Solo validacion de formato — no verifica contra registros de la DGI.
 */
export const RUC_REGEX =
  /^(?:(?:PE|E|N|PI|SE|[1-9]|1[0-3])-?\d{1,6}-?\d{1,6}|\d{5,15})$/i;

export function isValidRuc(ruc: string): boolean {
  if (!ruc || ruc.trim().length < 5) return false;
  return RUC_REGEX.test(ruc.trim());
}

// ============================================
// MAPEO INVERSO: Paso → Categoria de documento
// ============================================

export const STEP_TO_DOC_CATEGORY: Record<string, string> = {
  registro_ampyme: "certificacion_ampyme",
  estatutos_se: "pacto_social",
  inscripcion_rp: "registro_mercantil",
  ruc_nit: "ruc",
  aviso_operacion: "aviso_operacion",
  inscripcion_municipal: "declaracion_mupa",
};

// ============================================
// SISTEMA DE SYNC BIDIRECCIONAL
// ============================================

export interface DocSyncEvent {
  id: string;
  fileName: string;
  category: string;
  stepId: string;
  source: "fabrica" | "boveda";
  timestamp: string;
}

const SYNC_EVENTS_KEY = "midf_doc_sync_events";
const STEP_DOCUMENTS_KEY = "midf_step_documents";

export function getDocSyncEvents(): DocSyncEvent[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SYNC_EVENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function pushDocSyncEvent(event: Omit<DocSyncEvent, "id" | "timestamp">): DocSyncEvent {
  const fullEvent: DocSyncEvent = {
    ...event,
    id: Math.random().toString(36).substring(2, 15),
    timestamp: new Date().toISOString(),
  };
  const events = getDocSyncEvents();
  events.push(fullEvent);
  if (typeof window !== "undefined") {
    localStorage.setItem(SYNC_EVENTS_KEY, JSON.stringify(events));
  }
  return fullEvent;
}

export function getStepDocuments(): Record<string, { fileName: string; syncedToBoveda: boolean }> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STEP_DOCUMENTS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveStepDocument(stepId: string, fileName: string, syncedToBoveda: boolean): void {
  const docs = getStepDocuments();
  docs[stepId] = { fileName, syncedToBoveda };
  if (typeof window !== "undefined") {
    localStorage.setItem(STEP_DOCUMENTS_KEY, JSON.stringify(docs));
  }
}

export function getSyncEventsForStep(stepId: string): DocSyncEvent[] {
  return getDocSyncEvents().filter((e) => e.stepId === stepId);
}

export function getSyncEventsFromSource(source: "fabrica" | "boveda"): DocSyncEvent[] {
  return getDocSyncEvents().filter((e) => e.source === source);
}
