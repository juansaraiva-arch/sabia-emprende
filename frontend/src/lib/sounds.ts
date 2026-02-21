/**
 * Sistema de sonidos para alertas criticas — Mi Director Financiero PTY
 * Usa Web Audio API (sin archivos MP3, sin dependencias externas).
 * Preferencia de usuario almacenada en localStorage.
 */

const SOUND_ENABLED_KEY = "sabia_sound_enabled";

/** Verifica si el sonido esta habilitado (default: true) */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOUND_ENABLED_KEY) !== "false";
}

/** Habilita o deshabilita sonidos */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

/** Reproduce un sonido sintetizado segun el tipo de alerta */
export function playAlertSound(
  type: "danger" | "warning" | "reminder"
): void {
  if (!isSoundEnabled()) return;
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    // Tonos diferentes segun nivel de alerta
    switch (type) {
      case "danger":
        oscillator.frequency.value = 440; // A4 — atencion
        gain.gain.value = 0.3;
        break;
      case "warning":
        oscillator.frequency.value = 523; // C5 — advertencia suave
        gain.gain.value = 0.15;
        break;
      case "reminder":
        oscillator.frequency.value = 659; // E5 — sutil
        gain.gain.value = 0.1;
        break;
    }

    oscillator.type = "sine";
    oscillator.start();

    // Duracion corta: 150ms
    const duration = type === "reminder" ? 0.1 : 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.stop(ctx.currentTime + duration + 0.05);

    // Limpiar contexto despues de reproducir
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch {
    // Si Web Audio API no esta disponible, ignorar silenciosamente
  }
}
