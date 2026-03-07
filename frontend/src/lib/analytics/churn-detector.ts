/**
 * Churn Rate Detector — MDF PTY (GAP-5)
 *
 * Definiciones:
 * - Activo: login en ultimos 30 dias + al menos 1 accion
 * - Churned: registrado hace >60 dias y sin actividad en 60 dias
 * - En riesgo: sin actividad entre 21-59 dias
 * - Churn Rate = usuarios que dejaron de ser activos / activos al inicio del periodo
 *
 * En modo local/demo retorna datos mock.
 * Cuando Supabase este conectado, usar calcularChurnMetrics() y calcularCohortes().
 */

// ============================================
// TIPOS
// ============================================

export interface UserEngagementData {
  user_id: string;
  email: string;
  registro_en: string;       // ISO date string
  ultima_sesion: string | null;
  total_acciones: number;
  activo_30d: boolean;
  churned: boolean;
}

export interface ChurnMetrics {
  total_usuarios: number;
  activos_30d: number;
  churned: number;
  churn_rate_pct: number;
  tasa_retencion_pct: number;
  en_riesgo: number;         // sin actividad 21-59 dias
  meta_churn: number;        // 4% target
  cumple_meta: boolean;
}

export interface CohortData {
  cohorte_mes: string;
  usuarios_cohorte: number;
  retencion: { mes: number; pct: number }[];
}

export interface KPIsDashboard {
  churn: ChurnMetrics;
  cohortes: CohortData[];
  modulos_mas_usados: { modulo: string; acciones: number }[];
  usuarios_en_riesgo: { email: string; dias_sin_actividad: number }[];
}

// ============================================
// CONSTANTES
// ============================================

const DIAS_ACTIVO = 30;
const DIAS_CHURNED = 60;
const DIAS_RIESGO_MIN = 21;
const META_CHURN_PCT = 4.0;

// ============================================
// HELPERS
// ============================================

function diasDesde(fechaISO: string | null): number {
  if (!fechaISO) return Infinity;
  const ahora = new Date();
  const fecha = new Date(fechaISO);
  return Math.floor((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================
// CALCULO DESDE DATOS REALES (Supabase)
// ============================================

export function calcularChurnMetrics(users: UserEngagementData[]): ChurnMetrics {
  const total = users.length;
  if (total === 0) {
    return {
      total_usuarios: 0,
      activos_30d: 0,
      churned: 0,
      churn_rate_pct: 0,
      tasa_retencion_pct: 100,
      en_riesgo: 0,
      meta_churn: META_CHURN_PCT,
      cumple_meta: true,
    };
  }

  let activos = 0;
  let churned = 0;
  let en_riesgo = 0;

  for (const u of users) {
    const diasInactivo = diasDesde(u.ultima_sesion);
    const diasRegistro = diasDesde(u.registro_en);

    if (diasInactivo <= DIAS_ACTIVO && u.total_acciones > 0) {
      activos++;
    } else if (diasRegistro > DIAS_CHURNED && diasInactivo >= DIAS_CHURNED) {
      churned++;
    } else if (diasInactivo >= DIAS_RIESGO_MIN && diasInactivo < DIAS_CHURNED) {
      en_riesgo++;
    }
  }

  // Churn rate: churned / (activos al inicio del periodo)
  // Aproximamos activos_inicio como activos + churned (los que eran activos antes)
  const activos_inicio = activos + churned;
  const churn_rate = activos_inicio > 0 ? (churned / activos_inicio) * 100 : 0;

  return {
    total_usuarios: total,
    activos_30d: activos,
    churned,
    churn_rate_pct: Math.round(churn_rate * 10) / 10,
    tasa_retencion_pct: Math.round((100 - churn_rate) * 10) / 10,
    en_riesgo,
    meta_churn: META_CHURN_PCT,
    cumple_meta: churn_rate <= META_CHURN_PCT,
  };
}

export function calcularCohortes(users: UserEngagementData[]): CohortData[] {
  // Agrupar usuarios por mes de registro
  const cohorteMap = new Map<string, UserEngagementData[]>();

  for (const u of users) {
    const fecha = new Date(u.registro_en);
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    if (!cohorteMap.has(key)) cohorteMap.set(key, []);
    cohorteMap.get(key)!.push(u);
  }

  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const resultado: CohortData[] = [];

  for (const [key, grupo] of cohorteMap) {
    const [anio, mesStr] = key.split("-");
    const mesIdx = parseInt(mesStr) - 1;
    const label = `${meses[mesIdx]} ${anio}`;
    const totalCohorte = grupo.length;

    // Calcular retencion por mes transcurrido
    const ahora = new Date();
    const inicioCohorte = new Date(parseInt(anio), mesIdx, 1);
    const mesesTranscurridos = Math.floor(
      (ahora.getTime() - inicioCohorte.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    const retencion: { mes: number; pct: number }[] = [];
    for (let m = 1; m <= Math.min(mesesTranscurridos, 12); m++) {
      // Usuarios que tuvieron actividad en el mes m despues de registro
      const activos = grupo.filter((u) => {
        if (!u.ultima_sesion) return false;
        const diasDesdeRegistro = diasDesde(u.registro_en);
        return diasDesdeRegistro >= 0 && diasDesde(u.ultima_sesion) <= (mesesTranscurridos - m + 1) * 30;
      }).length;

      const pct = totalCohorte > 0 ? Math.round((activos / totalCohorte) * 100) : 0;
      retencion.push({ mes: m, pct });
    }

    resultado.push({
      cohorte_mes: label,
      usuarios_cohorte: totalCohorte,
      retencion,
    });
  }

  return resultado.sort((a, b) => a.cohorte_mes.localeCompare(b.cohorte_mes));
}

// ============================================
// DATOS MOCK (modo demo / local)
// ============================================

export function generateMockKPIs(): KPIsDashboard {
  return {
    churn: {
      total_usuarios: 24,
      activos_30d: 18,
      churned: 2,
      churn_rate_pct: 2.1,
      tasa_retencion_pct: 97.9,
      en_riesgo: 4,
      meta_churn: META_CHURN_PCT,
      cumple_meta: true,
    },
    cohortes: [
      {
        cohorte_mes: "Ene 2026",
        usuarios_cohorte: 12,
        retencion: [
          { mes: 1, pct: 91 },
          { mes: 2, pct: 83 },
          { mes: 3, pct: 75 },
        ],
      },
      {
        cohorte_mes: "Feb 2026",
        usuarios_cohorte: 8,
        retencion: [
          { mes: 1, pct: 87 },
          { mes: 2, pct: 75 },
        ],
      },
      {
        cohorte_mes: "Mar 2026",
        usuarios_cohorte: 4,
        retencion: [{ mes: 1, pct: 100 }],
      },
    ],
    modulos_mas_usados: [
      { modulo: "Libro de Ventas", acciones: 156 },
      { modulo: "Diagnostico Flash", acciones: 124 },
      { modulo: "Mi RRHH", acciones: 87 },
      { modulo: "Forecasting", acciones: 41 },
    ],
    usuarios_en_riesgo: [
      { email: "maria@example.com", dias_sin_actividad: 35 },
      { email: "pedro@example.com", dias_sin_actividad: 28 },
    ],
  };
}
