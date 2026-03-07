/**
 * Sistema de Onboarding Contextual — MDF PTY
 * Tooltips y tour guiado para usuarios de baja sofisticacion digital.
 * Datos persisten en localStorage con prefijo midf_.
 */

const STORAGE_KEY = 'midf_onboarding_guide';
const FIRST_USE_KEY = 'midf_first_use_date';

export interface TooltipConfig {
  id: string;
  elementSelector: string;
  texto: string;
  posicion: 'top' | 'bottom' | 'left' | 'right';
  solo_primeros_dias: number;   // dias desde primer uso
  categoria: 'finanzas' | 'ventas' | 'legal' | 'general';
}

export interface OnboardingState {
  tourCompletado: boolean;
  tooltipsDismissed: string[];   // IDs of dismissed tooltips
  primerUso: string;             // ISO date
  pasosCompletados: string[];
}

export const TOOLTIPS_ONBOARDING: TooltipConfig[] = [
  {
    id: 'cascada-rentabilidad',
    elementSelector: '[data-tooltip="cascada"]',
    texto: 'Esto es como el "estado de salud" de tu negocio. Muestra si estas ganando o perdiendo dinero paso a paso.',
    posicion: 'bottom',
    solo_primeros_dias: 7,
    categoria: 'finanzas',
  },
  {
    id: 'ebitda-valor',
    elementSelector: '[data-tooltip="ebitda"]',
    texto: 'EBITDA = Lo que gana tu negocio antes de pagar impuestos y deudas. Si es verde, vas bien.',
    posicion: 'right',
    solo_primeros_dias: 14,
    categoria: 'finanzas',
  },
  {
    id: 'vigilante-legal',
    elementSelector: '[data-tooltip="vigilante"]',
    texto: 'El Vigilante Legal te avisa cuando hay algo que debes hacer para no meterte en problemas con la DGI o la CSS.',
    posicion: 'left',
    solo_primeros_dias: 14,
    categoria: 'legal',
  },
  {
    id: 'boton-venta-rapida',
    elementSelector: '[data-tooltip="venta-rapida"]',
    texto: 'Toca este boton cada vez que hagas una venta. Es la forma mas rapida de llevar tu registro.',
    posicion: 'left',
    solo_primeros_dias: 7,
    categoria: 'ventas',
  },
  {
    id: 'alertas-campana',
    elementSelector: '[data-tooltip="alertas"]',
    texto: 'Esta campanita muestra las alertas urgentes de tu negocio. Si esta roja, revisa de inmediato.',
    posicion: 'bottom',
    solo_primeros_dias: 7,
    categoria: 'general',
  },
];

export const TOUR_PASOS = [
  {
    id: 'bienvenida',
    titulo: 'Bienvenida a Mi Director Financiero PTY',
    descripcion: 'Esta app va a ser tu contador digital. Te voy a guiar en los pasos mas importantes.',
    emoji: '\u{1F44B}',
  },
  {
    id: 'diagnostico',
    titulo: 'Diagnostico Flash',
    descripcion: 'Aqui registras los numeros basicos de tu negocio: ventas, costos y gastos. Con eso, la app calcula si estas ganando o perdiendo.',
    emoji: '\u{1F4CA}',
  },
  {
    id: 'ventas',
    titulo: 'Libro de Ventas',
    descripcion: 'Registra cada venta con un solo toque. La app calcula el ITBMS automaticamente.',
    emoji: '\u{1F4B0}',
  },
  {
    id: 'alertas',
    titulo: 'Vigilante Legal',
    descripcion: 'Nunca mas te olvidas de pagar un impuesto o presentar una declaracion. Las alertas te avisan antes de la fecha limite.',
    emoji: '\u{26A0}\u{FE0F}',
  },
  {
    id: 'listo',
    titulo: 'Listo! Tu Director Financiero esta activo',
    descripcion: 'Ya tienes todo configurado. Estas son las 3 cosas que mas te van a ayudar: Diagnostico Flash, Libro de Ventas y Vigilante Legal.',
    emoji: '\u{1F389}',
  },
];

// ─── Default state ───

function defaultState(): OnboardingState {
  return {
    tourCompletado: false,
    tooltipsDismissed: [],
    primerUso: new Date().toISOString(),
    pasosCompletados: [],
  };
}

// ─── CRUD functions ───

export function getOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = defaultState();
      saveOnboardingState(fresh);
      // Also set first use date separately for quick access
      if (!localStorage.getItem(FIRST_USE_KEY)) {
        localStorage.setItem(FIRST_USE_KEY, fresh.primerUso);
      }
      return fresh;
    }
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return defaultState();
  }
}

export function saveOnboardingState(state: OnboardingState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage lleno o no disponible — silently fail
  }
}

export function markTourCompleted(): void {
  const state = getOnboardingState();
  state.tourCompletado = true;
  saveOnboardingState(state);
}

export function dismissTooltip(tooltipId: string): void {
  const state = getOnboardingState();
  if (!state.tooltipsDismissed.includes(tooltipId)) {
    state.tooltipsDismissed.push(tooltipId);
    saveOnboardingState(state);
  }
}

export function shouldShowTooltip(tooltip: TooltipConfig): boolean {
  if (typeof window === 'undefined') return false;

  const state = getOnboardingState();

  // 1. Ya fue descartado?
  if (state.tooltipsDismissed.includes(tooltip.id)) return false;

  // 2. Estamos dentro de la ventana de dias?
  const primerUso = new Date(state.primerUso);
  const ahora = new Date();
  const diasTranscurridos = Math.floor(
    (ahora.getTime() - primerUso.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diasTranscurridos > tooltip.solo_primeros_dias) return false;

  // 3. Existe el elemento en el DOM?
  const element = document.querySelector(tooltip.elementSelector);
  if (!element) return false;

  return true;
}

export function shouldShowTour(): boolean {
  if (typeof window === 'undefined') return false;

  const state = getOnboardingState();

  // Tour ya completado? No mostrar
  if (state.tourCompletado) return false;

  // Setup wizard esta completo? Solo mostrar tour despues del wizard
  const setupComplete = localStorage.getItem('midf_setup_complete') === 'true';
  if (!setupComplete) return false;

  return true;
}

export function markPasoCompletado(pasoId: string): void {
  const state = getOnboardingState();
  if (!state.pasosCompletados.includes(pasoId)) {
    state.pasosCompletados.push(pasoId);
    saveOnboardingState(state);
  }
}
