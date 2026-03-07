/**
 * Detector de Segmento de Facturacion — Logica Client-Side
 * Mi Director Financiero PTY
 *
 * Basado en Resolucion DGI 201-6299:
 * - Segmento 1: Sin obligacion (sin ventas registradas)
 * - Segmento 2: CSV manual (ingresos < B/.36,000/12m Y facturas < 100/mes)
 * - Segmento 3: PAC electronico (supera limites de Segmento 2)
 *
 * Umbrales:
 * - Ingresos: B/.36,000 en ultimos 12 meses
 * - Facturas: 100 documentos en el mes actual
 */

import { getVentas } from "./ventas-storage";
import type { ResultadoSegmento, SegmentoFacturacion } from "./ventas-types";

// ============================================
// CONSTANTES (exportadas para reutilizacion)
// ============================================

/** Limite de ingresos anuales para permanecer en Segmento 2 */
const LIMITE_INGRESOS = 36_000; // B/.36,000

/** Limite de documentos mensuales para permanecer en Segmento 2 */
const LIMITE_FACTURAS = 100;

/** Umbral porcentual para alerta preventiva (amarillo) */
const UMBRAL_ALERTA_PCT = 80;

// ============================================
// DETECTOR DE SEGMENTO
// ============================================

/**
 * Detecta el segmento de facturacion DGI basado en los datos locales.
 *
 * Algoritmo:
 * 1. Obtener todas las ventas no anuladas del society
 * 2. Sumar montoTotal de los ultimos 12 meses = ingresos12m
 * 3. Contar ventas del mes actual = facturasMes
 * 4. Calcular porcentajes de limites
 * 5. Determinar segmento y nivel de alerta
 *
 * @param societyId - ID de la sociedad/empresa
 * @returns ResultadoSegmento con toda la informacion de clasificacion
 */
export function detectarSegmentoLocal(societyId: string): ResultadoSegmento {
  const ahora = new Date();

  // Fecha de hace 12 meses (desde el primer dia de ese mes)
  const hace12m = new Date(ahora.getFullYear(), ahora.getMonth() - 12, 1);
  const desdeISO = formatFechaISO(hace12m);

  // Primer y ultimo dia del mes actual
  const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const desdeMesISO = formatFechaISO(primerDiaMes);
  const hastaMesISO = formatFechaISO(ultimoDiaMes);

  // Obtener ventas no anuladas de los ultimos 12 meses
  const ventas12m = getVentas(societyId, {
    desde: desdeISO,
    anulada: false,
  });

  // Sumar ingresos de los ultimos 12 meses
  const ingresos12m = ventas12m.reduce((sum, v) => sum + v.montoTotal, 0);
  const ingresos12mRedondeado = Math.round(ingresos12m * 100) / 100;

  // Contar facturas del mes actual (no anuladas)
  const ventasMesActual = getVentas(societyId, {
    desde: desdeMesISO,
    hasta: hastaMesISO,
    anulada: false,
  });
  const facturasMes = ventasMesActual.length;

  // Calcular porcentajes de limites consumidos
  const pctIngresos = LIMITE_INGRESOS > 0
    ? Math.round((ingresos12mRedondeado / LIMITE_INGRESOS) * 10000) / 100
    : 0;
  const pctFacturas = LIMITE_FACTURAS > 0
    ? Math.round((facturasMes / LIMITE_FACTURAS) * 10000) / 100
    : 0;

  // Determinar segmento, nivel de alerta y mensaje
  let segmento: SegmentoFacturacion;
  let alertaNivel: "verde" | "amarillo" | "rojo";
  let debeMigrar = false;
  let mensajeAlerta: string | undefined;

  // Si no hay ventas registradas: Segmento 1
  if (ventas12m.length === 0) {
    segmento = 1;
    alertaNivel = "verde";
    mensajeAlerta = undefined;
  }
  // Si supera algun limite: Segmento 3 obligatorio
  else if (ingresos12mRedondeado > LIMITE_INGRESOS || facturasMes > LIMITE_FACTURAS) {
    segmento = 3;
    alertaNivel = "rojo";
    debeMigrar = true;

    if (ingresos12mRedondeado > LIMITE_INGRESOS && facturasMes > LIMITE_FACTURAS) {
      mensajeAlerta =
        `Supero ambos limites: ingresos B/.${formatMonto(ingresos12mRedondeado)} ` +
        `(limite B/.${formatMonto(LIMITE_INGRESOS)}) y ${facturasMes} facturas/mes ` +
        `(limite ${LIMITE_FACTURAS}). Debe migrar a facturacion electronica (PAC).`;
    } else if (ingresos12mRedondeado > LIMITE_INGRESOS) {
      mensajeAlerta =
        `Ingresos B/.${formatMonto(ingresos12mRedondeado)} superan el limite de ` +
        `B/.${formatMonto(LIMITE_INGRESOS)} en 12 meses. Debe migrar a facturacion electronica (PAC).`;
    } else {
      mensajeAlerta =
        `${facturasMes} facturas este mes superan el limite de ${LIMITE_FACTURAS}. ` +
        `Debe migrar a facturacion electronica (PAC).`;
    }
  }
  // Si esta al 80% o mas de algun limite: alerta preventiva
  else if (pctIngresos >= UMBRAL_ALERTA_PCT || pctFacturas >= UMBRAL_ALERTA_PCT) {
    segmento = 2;
    alertaNivel = "amarillo";

    const alertas: string[] = [];
    if (pctIngresos >= UMBRAL_ALERTA_PCT) {
      alertas.push(
        `ingresos al ${pctIngresos.toFixed(0)}% del limite ` +
        `(B/.${formatMonto(ingresos12mRedondeado)} de B/.${formatMonto(LIMITE_INGRESOS)})`
      );
    }
    if (pctFacturas >= UMBRAL_ALERTA_PCT) {
      alertas.push(
        `facturas al ${pctFacturas.toFixed(0)}% del limite ` +
        `(${facturasMes} de ${LIMITE_FACTURAS})`
      );
    }
    mensajeAlerta =
      `Alerta preventiva: ${alertas.join(" y ")}. ` +
      `Considere preparar migracion a facturacion electronica.`;
  }
  // Tiene ventas pero esta dentro de limites: Segmento 2 normal
  else {
    segmento = 2;
    alertaNivel = "verde";
    mensajeAlerta = undefined;
  }

  return {
    segmento,
    ingresos12m: ingresos12mRedondeado,
    facturasMes,
    limiteIngresos: LIMITE_INGRESOS,
    limiteFacturas: LIMITE_FACTURAS,
    pctIngresos,
    pctFacturas,
    debeMigrar,
    alertaNivel,
    mensajeAlerta,
  };
}

// ============================================
// HELPERS INTERNOS
// ============================================

/**
 * Formatea una fecha como "YYYY-MM-DD" (ISO date sin hora).
 * Se usa internamente para construir filtros.
 */
function formatFechaISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formatea un monto numerico con separador de miles y 2 decimales.
 * Ejemplo: 36000 -> "36,000.00"
 * No importa formatBalboas para mantener este archivo como logica pura.
 */
function formatMonto(valor: number): string {
  return valor.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Exportar constantes para reutilizacion externa
export { LIMITE_INGRESOS, LIMITE_FACTURAS };
