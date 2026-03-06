// ============================================
// ANALYTICS — PostHog + Delighted integration
// Wrapper para capturar eventos clave de la app
// ============================================

import posthog from "posthog-js";

// ============================================
// CONFIGURACION
// ============================================

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

// Evitar inicializar en SSR
let initialized = false;

export function initAnalytics() {
  if (typeof window === "undefined") return;
  if (initialized) return;
  if (!POSTHOG_KEY) {
    console.log("[Analytics] PostHog key no configurado — analytics desactivado");
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // No capturar automaticamente pageviews (Next.js SPA, lo hacemos manual)
    capture_pageview: false,
    // No capturar automaticamente pageleaves
    capture_pageleave: true,
    // Persistencia en localStorage
    persistence: "localStorage",
    // Respetar Do Not Track del navegador
    respect_dnt: true,
    // Autocapture de clicks (util para heatmaps)
    autocapture: true,
    // Deshabilitar session recording por defecto (activar despues si se necesita)
    disable_session_recording: true,
  });

  initialized = true;
  console.log("[Analytics] PostHog inicializado");
}

// ============================================
// IDENTIFICACION DE USUARIO
// ============================================

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.identify(userId, properties);
}

export function resetUser() {
  if (!initialized) return;
  posthog.reset();
}

// ============================================
// EVENTOS
// ============================================

// Evento generico
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

// --- Eventos de sesion ---

export function trackLogin(method: "supabase" | "demo" | "access_gate") {
  trackEvent("login", { method });
}

export function trackPageView(page: string) {
  if (!initialized) return;
  posthog.capture("$pageview", { $current_url: page });
}

// --- Eventos de modulo ---

export function trackModuleOpened(module: string, tab?: string) {
  trackEvent("modulo_abierto", { module, tab });
}

export function trackTabChanged(module: string, tab: string) {
  trackEvent("tab_cambiado", { module, tab });
}

// --- Eventos de datos ---

export function trackDataSaved(type: string, details?: Record<string, unknown>) {
  trackEvent("dato_guardado", { type, ...details });
}

export function trackFormCompleted(form: string, details?: Record<string, unknown>) {
  trackEvent("formulario_completado", { form, ...details });
}

// --- Eventos de onboarding ---

export function trackOnboardingProfile(profile: string) {
  trackEvent("onboarding_perfil_seleccionado", { profile });
}

export function trackOnboardingCompleted(profile: string) {
  trackEvent("onboarding_completado", { profile });
}

export function trackSetupCompleted() {
  trackEvent("setup_completado");
}

// --- Eventos de funcionalidades especificas ---

export function trackProjectionRun(type: "flujo_caja" | "escenarios" | "fiscal") {
  trackEvent("proyeccion_ejecutada", { type });
}

export function trackMupaAction(action: string, details?: Record<string, unknown>) {
  trackEvent("mupa_accion", { action, ...details });
}

export function trackComparativoViewed(tipo?: string) {
  trackEvent("comparativo_sociedades_visto", { tipo });
}

export function trackAsistenteMessage() {
  trackEvent("asistente_mensaje_enviado");
}

// ============================================
// DELIGHTED NPS
// ============================================

// Delighted se carga via snippet JS externo
// Esta funcion dispara la encuesta cuando se cumple la condicion

const DELIGHTED_KEY = process.env.NEXT_PUBLIC_DELIGHTED_KEY || "";
const FIRST_USE_KEY = "midf_first_use_date";
const LAST_NPS_KEY = "midf_last_nps_shown";

export function initDelighted() {
  if (typeof window === "undefined") return;
  if (!DELIGHTED_KEY) {
    console.log("[NPS] Delighted key no configurado — NPS desactivado");
    return;
  }

  // Registrar primera fecha de uso si no existe
  const firstUse = localStorage.getItem(FIRST_USE_KEY);
  if (!firstUse) {
    localStorage.setItem(FIRST_USE_KEY, new Date().toISOString());
    return; // No mostrar en primera visita
  }

  // Calcular dias desde primer uso
  const daysSinceFirstUse = Math.floor(
    (Date.now() - new Date(firstUse).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Verificar ultima vez que se mostro NPS
  const lastNps = localStorage.getItem(LAST_NPS_KEY);
  const daysSinceLastNps = lastNps
    ? Math.floor((Date.now() - new Date(lastNps).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  // Condiciones de disparo:
  // - Primera vez: despues de 7 dias de uso activo
  // - Seguimiento: cada 30 dias
  const shouldShow =
    (daysSinceFirstUse >= 7 && !lastNps) || // Primera vez a los 7 dias
    (daysSinceLastNps >= 30); // Cada 30 dias despues

  if (!shouldShow) return;

  // Cargar Delighted snippet
  loadDelightedScript();
}

function loadDelightedScript() {
  if (typeof window === "undefined") return;

  // Evitar cargar dos veces
  if (document.querySelector("script[data-delighted]")) return;

  // Snippet oficial de Delighted (minificado)
  const script = document.createElement("script");
  script.setAttribute("data-delighted", "true");
  script.async = true;
  script.src = "https://d2yyd1h5u9mauk.cloudfront.net/integrations/web/v1/library/" + DELIGHTED_KEY + "/delighted.js";

  script.onload = () => {
    // Marcar que se mostro NPS
    localStorage.setItem(LAST_NPS_KEY, new Date().toISOString());
    console.log("[NPS] Delighted cargado y encuesta disparada");
  };

  document.head.appendChild(script);
}

// ============================================
// POSTHOG INSTANCE (para uso directo si se necesita)
// ============================================

export function getPostHog() {
  if (!initialized) return null;
  return posthog;
}
