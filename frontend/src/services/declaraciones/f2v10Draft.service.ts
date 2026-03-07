/**
 * F2V10DraftService — Generador de borrador automatico
 * Formulario F2 V10 — Declaracion Jurada de Renta para S.E.P.
 *
 * Recopila datos de TODAS las fuentes del proyecto:
 * 1. Facturas electronicas (via FacturacionService)
 * 2. Registros contables (financial_records)
 * 3. Datos de empresa (societies, society_members)
 * 4. Nomina (PayrollTotals)
 * 5. Entrada manual (ultimo recurso)
 */

import { getFacturacionService } from "../facturacion/FacturacionService";

// ============================================================
// TYPES
// ============================================================

export interface Advertencia {
  nivel: "error" | "warning" | "info";
  codigo: string;
  mensaje: string;
  campo_afectado?: string;
  accion_requerida?: string;
}

export interface FuenteDato {
  campo: string;
  fuente:
    | "db_automatico"
    | "facturacion_electronica"
    | "ingreso_manual"
    | "calculado"
    | "faltante";
  confianza: "alta" | "media" | "baja";
  nota?: string;
}

export interface SocioDistribucion {
  nombre: string | null;
  cedula: string | null;
  porcentaje_participacion: number | null;
  monto_distribuido: number | null;
}

export interface F2V10DraftResult {
  metadata: {
    formulario: "F2";
    version: "V10";
    sector: "EMPRENDIMIENTO";
    periodoFiscal: number;
    fechaGeneracion: string;
    completitud: number;
    listo_para_presentar: boolean;
    advertencias: Advertencia[];
    campos_faltantes: string[];
  };
  seccion_identificacion: {
    nombre_sociedad: string | null;
    ruc: string | null;
    fecha_constitucion: string | null;
    representante_legal: string | null;
    cedula_representante: string | null;
    actividad_economica: string | null;
    direccion_fiscal: string | null;
    en_exoneracion_isr: boolean | null;
    meses_exoneracion_transcurridos: number | null;
    meses_exoneracion_restantes: number | null;
  };
  seccion_ingresos: {
    ingresos_brutos_total: number | null;
    ingresos_exentos: number | null;
    ingresos_gravables: number | null;
    ingresos_desde_facturas_electronicas: number | null;
    discrepancia_fe_vs_declarado: number | null;
    alerta_umbral_categoria: boolean;
  };
  seccion_gastos: {
    gastos_deducibles_total: number | null;
    gastos_por_categoria: Record<string, number>;
    css_patronal_pagada: number | null;
    planilla_total: number | null;
  };
  seccion_impuesto: {
    renta_neta_gravable: number | null;
    isr_calculado: number | null;
    isr_a_pagar: number | null;
    tasa_unica: number;
    feci_retencion: number;
    itbms_declarado: number | null;
    credito_fiscal_disponible: number | null;
  };
  seccion_distribucion_utilidades: {
    utilidades_distribuidas: number | null;
    socios: SocioDistribucion[];
  };
  fuentes_datos: FuenteDato[];
}

// ============================================================
// DATOS desde localStorage (modo demo / fallback)
// ============================================================

interface SocietyData {
  legal_name: string | null;
  tax_id: string | null;
  entity_type: string;
  incorporation_date: string | null;
  fiscal_regime: string;
  industry: string | null;
  fiscal_address: string | null;
}

interface MemberData {
  full_name: string;
  id_number: string | null;
  role: string;
  ownership_pct: number | null;
}

interface FinancialSummary {
  revenue: number;
  cogs: number;
  opex_rent: number;
  opex_payroll: number;
  opex_other: number;
  depreciation: number;
  interest_expense: number;
  tax_expense: number;
}

function loadSocietyFromStorage(): SocietyData {
  if (typeof window === "undefined") {
    return {
      legal_name: null, tax_id: null, entity_type: "SE",
      incorporation_date: null, fiscal_regime: "se_exempt",
      industry: null, fiscal_address: null,
    };
  }
  return {
    legal_name: localStorage.getItem("midf_company_name") || null,
    tax_id: localStorage.getItem("midf_ruc") || null,
    entity_type: localStorage.getItem("midf_entity_type") || "SE",
    incorporation_date: localStorage.getItem("midf_incorporation_date") || null,
    fiscal_regime: localStorage.getItem("midf_fiscal_regime") || "se_exempt",
    industry: localStorage.getItem("midf_company_rubro") || null,
    fiscal_address: localStorage.getItem("midf_fiscal_address") || null,
  };
}

function loadMembersFromStorage(): MemberData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("midf_society_members");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadFinancialSummary(periodoFiscal: number): FinancialSummary {
  if (typeof window === "undefined") {
    return { revenue: 0, cogs: 0, opex_rent: 0, opex_payroll: 0, opex_other: 0, depreciation: 0, interest_expense: 0, tax_expense: 0 };
  }
  try {
    // Intentar cargar registros financieros por periodo
    const key = `midf_financial_${periodoFiscal}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // Fallback: ultimo registro guardado
    const lastKey = "midf_last_financial";
    const lastRaw = localStorage.getItem(lastKey);
    if (lastRaw) {
      const rec = JSON.parse(lastRaw);
      return {
        revenue: (rec.revenue || 0) * 12,
        cogs: (rec.cogs || 0) * 12,
        opex_rent: (rec.opex_rent || 0) * 12,
        opex_payroll: (rec.opex_payroll || 0) * 12,
        opex_other: (rec.opex_other || 0) * 12,
        depreciation: (rec.depreciation || 0) * 12,
        interest_expense: (rec.interest_expense || 0) * 12,
        tax_expense: (rec.tax_expense || 0) * 12,
      };
    }
    return { revenue: 0, cogs: 0, opex_rent: 0, opex_payroll: 0, opex_other: 0, depreciation: 0, interest_expense: 0, tax_expense: 0 };
  } catch {
    return { revenue: 0, cogs: 0, opex_rent: 0, opex_payroll: 0, opex_other: 0, depreciation: 0, interest_expense: 0, tax_expense: 0 };
  }
}

function loadPayrollTotals(): { totalGross: number; totalEmployerCost: number } {
  if (typeof window === "undefined") return { totalGross: 0, totalEmployerCost: 0 };
  try {
    const raw = localStorage.getItem("midf_payroll_totals");
    if (raw) {
      const data = JSON.parse(raw);
      return {
        totalGross: (data.totalGross || 0) * 12,
        totalEmployerCost: (data.totalEmployerCost || 0) * 12,
      };
    }
    return { totalGross: 0, totalEmployerCost: 0 };
  } catch {
    return { totalGross: 0, totalEmployerCost: 0 };
  }
}

// ============================================================
// CALCULO DE EXONERACION ISR — Ley 186 Art. 37
// ============================================================

export function calcularEstadoExoneracion(
  incorporationDate: string | Date | null,
  periodoFiscal: number
): {
  en_exoneracion: boolean | null;
  meses_transcurridos: number | null;
  meses_restantes: number | null;
} {
  if (!incorporationDate) {
    return {
      en_exoneracion: null,
      meses_transcurridos: null,
      meses_restantes: null,
    };
  }

  let incDate: Date;
  if (typeof incorporationDate === "string") {
    // Parsear como fecha local para evitar desfase de timezone
    const parts = incorporationDate.split("-").map(Number);
    if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      incDate = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      return { en_exoneracion: null, meses_transcurridos: null, meses_restantes: null };
    }
  } else {
    incDate = incorporationDate;
  }

  if (isNaN(incDate.getTime())) {
    return { en_exoneracion: null, meses_transcurridos: null, meses_restantes: null };
  }

  // Referencia: fin del periodo fiscal (31 dic del ano)
  const ref = new Date(periodoFiscal, 11, 31);

  // Calcular diferencia en meses (0-based: Jan→Dec = 11)
  const meses =
    (ref.getFullYear() - incDate.getFullYear()) * 12 +
    (ref.getMonth() - incDate.getMonth());

  // La exoneracion cubre 24 meses calendario desde constitucion (Ley 186 Art. 37).
  // Con conteo inclusivo (mes de constitucion = mes 1), 24 meses calendario
  // equivalen a una diferencia de meses >= 23. Al cierre del periodo fiscal,
  // si ya transcurrieron 23+ meses de diferencia, la exoneracion ha expirado.
  const en_exoneracion = meses < 23;

  return {
    en_exoneracion,
    meses_transcurridos: Math.max(0, meses),
    meses_restantes: en_exoneracion ? Math.max(0, 24 - meses) : 0,
  };
}

// ============================================================
// VERIFICACION DE UMBRALES DE CATEGORIA
// ============================================================

export function verificarUmbralesCategoria(ingresosBrutos: number): {
  categoria: "microemprendedor" | "pequena_empresa" | "requiere_transformacion";
  alerta: boolean;
  mensaje: string | null;
} {
  if (ingresosBrutos > 1_000_000) {
    return {
      categoria: "requiere_transformacion",
      alerta: true,
      mensaje:
        "Tus ingresos superan B/.1,000,000. Debes transformarte a otra " +
        "figura juridica dentro de 6 meses.",
    };
  }
  if (ingresosBrutos > 150_000) {
    return {
      categoria: "pequena_empresa",
      alerta: true,
      mensaje:
        "Tus ingresos superan B/.150,000. Pasas a categoria de " +
        "pequena empresa con diferentes obligaciones.",
    };
  }
  if (ingresosBrutos >= 135_000) {
    return {
      categoria: "microemprendedor",
      alerta: true,
      mensaje:
        "Tus ingresos se acercan al limite de B/.150,000 para " +
        "microemprendedores (90% alcanzado).",
    };
  }
  return { categoria: "microemprendedor", alerta: false, mensaje: null };
}

// ============================================================
// GENERADOR PRINCIPAL DE BORRADOR
// ============================================================

export async function generarBorradorF2V10(params: {
  societyId: string;
  periodoFiscal: number;
}): Promise<F2V10DraftResult> {
  const { periodoFiscal } = params;
  const advertencias: Advertencia[] = [];
  const campos_faltantes: string[] = [];
  const fuentes: FuenteDato[] = [];

  // ── 1. Datos de empresa ──────────────────────────────────
  const society = loadSocietyFromStorage();
  const members = loadMembersFromStorage();
  const repLegal = members.find((m) => m.role === "REPRESENTANTE_LEGAL");

  // Track fuentes
  fuentes.push({
    campo: "nombre_sociedad",
    fuente: society.legal_name ? "db_automatico" : "faltante",
    confianza: society.legal_name ? "alta" : "baja",
  });
  if (!society.legal_name) campos_faltantes.push("nombre_sociedad");

  fuentes.push({
    campo: "ruc",
    fuente: society.tax_id ? "db_automatico" : "faltante",
    confianza: society.tax_id ? "alta" : "baja",
  });
  if (!society.tax_id) campos_faltantes.push("ruc");

  fuentes.push({
    campo: "representante_legal",
    fuente: repLegal ? "db_automatico" : "faltante",
    confianza: repLegal ? "alta" : "baja",
  });
  if (!repLegal) {
    campos_faltantes.push("representante_legal");
    advertencias.push({
      nivel: "warning",
      codigo: "REP_LEGAL_FALTANTE",
      mensaje: "Falta el representante legal. Agregalo en Perfil de Empresa > Socios.",
      campo_afectado: "representante_legal",
      accion_requerida: "Agregar representante legal en seccion Socios",
    });
  }

  fuentes.push({
    campo: "direccion_fiscal",
    fuente: society.fiscal_address ? "db_automatico" : "faltante",
    confianza: society.fiscal_address ? "media" : "baja",
  });
  if (!society.fiscal_address) campos_faltantes.push("direccion_fiscal");

  // ── 2. Exoneracion ISR ───────────────────────────────────
  const exoneracion = calcularEstadoExoneracion(
    society.incorporation_date,
    periodoFiscal
  );

  fuentes.push({
    campo: "exoneracion_isr",
    fuente: society.incorporation_date ? "calculado" : "faltante",
    confianza: society.incorporation_date ? "alta" : "baja",
  });

  if (!society.incorporation_date) {
    campos_faltantes.push("fecha_constitucion");
    advertencias.push({
      nivel: "error",
      codigo: "FECHA_CONSTITUCION_FALTANTE",
      mensaje:
        "Ingresa la fecha de constitucion de tu empresa. " +
        "Sin este dato no podemos calcular si estas en " +
        "periodo de exoneracion de ISR.",
      campo_afectado: "fecha_constitucion",
      accion_requerida: "Actualizar en Perfil de Empresa > Datos Legales",
    });
  } else if (
    exoneracion.en_exoneracion &&
    exoneracion.meses_restantes !== null &&
    exoneracion.meses_restantes <= 3
  ) {
    advertencias.push({
      nivel: "warning",
      codigo: "VENCIMIENTO_EXONERACION_PROXIMO",
      mensaje:
        `Tu exoneracion de ISR vence en ${exoneracion.meses_restantes} mes(es). ` +
        "A partir de entonces deberas pagar ISR sobre tus ganancias.",
      campo_afectado: "exoneracion_isr",
    });
  }

  if (exoneracion.en_exoneracion === true && exoneracion.meses_transcurridos !== null && exoneracion.meses_transcurridos <= 12) {
    advertencias.push({
      nivel: "info",
      codigo: "EXONERACION_PRIMER_ANO",
      mensaje:
        "Estas en tu primer ano. No pagas ISR ni Tasa Unica. " +
        "Igual debes presentar la declaracion.",
    });
  }

  // ── 3. Ingresos — via FacturacionService ─────────────────
  let ingresosFE = 0;
  let itbmsFE = 0;
  let docCount = 0;
  let feAdvertencia: string | undefined;

  try {
    const facturacion = getFacturacionService();
    const resumen = await facturacion.getResumenParaDeclaracion({
      societyId: params.societyId,
      periodoFiscal,
      ruc: society.tax_id || undefined,
    });
    ingresosFE = resumen.total_facturado_neto;
    itbmsFE = resumen.total_itbms_cobrado;
    docCount = resumen.documentos_count;
    feAdvertencia = resumen.advertencia;

    fuentes.push({
      campo: "ingresos_facturacion_electronica",
      fuente: "facturacion_electronica",
      confianza: resumen.fuente === "PAC_SYNC" ? "alta" : "baja",
      nota: resumen.fuente === "MANUAL"
        ? "Ingresado manualmente — verificar contra SFEP"
        : "Sincronizado con PAC",
    });
  } catch {
    fuentes.push({
      campo: "ingresos_facturacion_electronica",
      fuente: "faltante",
      confianza: "baja",
      nota: "No se pudo obtener resumen de facturacion",
    });
  }

  if (feAdvertencia) {
    advertencias.push({
      nivel: "warning",
      codigo: "FE_MODO_MANUAL",
      mensaje: feAdvertencia,
      campo_afectado: "ingresos_brutos_total",
    });
  }

  // Ingresos desde registros contables
  const financials = loadFinancialSummary(periodoFiscal);
  const ingresosContables = financials.revenue;

  fuentes.push({
    campo: "ingresos_contables",
    fuente: ingresosContables > 0 ? "db_automatico" : "faltante",
    confianza: ingresosContables > 0 ? "media" : "baja",
  });

  // Usar el mayor de FE vs contables como ingresos brutos
  const ingresosBrutos = Math.max(ingresosFE, ingresosContables);

  // Discrepancia FE vs contables
  const discrepancia = ingresosFE > 0 && ingresosContables > 0
    ? Math.abs(ingresosFE - ingresosContables)
    : null;

  if (discrepancia && discrepancia > 0) {
    advertencias.push({
      nivel: "error",
      codigo: "DISCREPANCIA_FE_VS_REGISTROS",
      mensaje:
        `Hay una diferencia de B/.${discrepancia.toFixed(2)} entre tus facturas ` +
        "electronicas y tus registros contables. La DGI validara esto automaticamente.",
      campo_afectado: "ingresos_brutos_total",
      accion_requerida: "Revisar y conciliar discrepancias",
    });
  }

  // Umbral de categoria
  const umbral = verificarUmbralesCategoria(ingresosBrutos);
  if (umbral.alerta && umbral.mensaje) {
    advertencias.push({
      nivel: umbral.categoria === "requiere_transformacion" ? "error" : "warning",
      codigo: "CERCANO_LIMITE_MICROEMPRENDEDOR",
      mensaje: umbral.mensaje,
      campo_afectado: "ingresos_brutos_total",
    });
  }

  // ── 4. Gastos deducibles ─────────────────────────────────
  const payroll = loadPayrollTotals();

  const gastosPorCategoria: Record<string, number> = {
    "Costo de Ventas": financials.cogs,
    "Sueldos y Salarios": Math.max(financials.opex_payroll, payroll.totalGross),
    "CSS Patronal": payroll.totalEmployerCost > payroll.totalGross
      ? payroll.totalEmployerCost - payroll.totalGross
      : 0,
    "Alquiler de Local": financials.opex_rent,
    "Otros Gastos Operativos": financials.opex_other,
    "Depreciacion": financials.depreciation,
    "Gastos Financieros": financials.interest_expense,
  };

  const gastosTotalDeducible = Object.values(gastosPorCategoria).reduce(
    (s, v) => s + v, 0
  );

  fuentes.push({
    campo: "gastos_deducibles",
    fuente: gastosTotalDeducible > 0 ? "db_automatico" : "faltante",
    confianza: gastosTotalDeducible > 0 ? "media" : "baja",
    nota: "Agregado de registros contables + nomina",
  });

  // ── 5. Impuesto ──────────────────────────────────────────
  const rentaNeta = ingresosBrutos - gastosTotalDeducible;
  const isrCalculado = rentaNeta > 0 ? rentaNeta * 0.25 : 0; // 25% juridica
  const isrAPagar = exoneracion.en_exoneracion !== false ? 0 : isrCalculado;
  // Si en_exoneracion === null (indeterminado), asumir 0 con advertencia

  fuentes.push({
    campo: "isr_a_pagar",
    fuente: "calculado",
    confianza: exoneracion.en_exoneracion !== null ? "alta" : "baja",
    nota: exoneracion.en_exoneracion
      ? "ISR = 0 por exoneracion Ley 186"
      : exoneracion.en_exoneracion === false
      ? "ISR calculado al 25% — fuera de exoneracion"
      : "Indeterminado — falta fecha de constitucion",
  });

  // ── 6. Distribucion de utilidades ────────────────────────
  const socios: SocioDistribucion[] = members
    .filter((m) => m.role === "SOCIO" || m.role === "REPRESENTANTE_LEGAL")
    .map((m) => ({
      nombre: m.full_name || null,
      cedula: m.id_number || null,
      porcentaje_participacion: m.ownership_pct ?? null,
      monto_distribuido: null,
    }));

  if (socios.length === 0) {
    campos_faltantes.push("socios");
    advertencias.push({
      nivel: "warning",
      codigo: "SOCIOS_FALTANTES",
      mensaje: "No hay socios registrados. Agrega los datos de socios para la seccion de distribucion de utilidades.",
      campo_afectado: "socios",
    });
  }

  // ── 7. Calcular completitud ──────────────────────────────
  const totalCampos = 15;
  const camposCompletos = totalCampos - campos_faltantes.length;
  const completitud = Math.round((camposCompletos / totalCampos) * 100);

  const listoPresentar =
    campos_faltantes.length === 0 &&
    advertencias.filter((a) => a.nivel === "error").length === 0;

  // ── 8. Construir resultado ───────────────────────────────

  return {
    metadata: {
      formulario: "F2",
      version: "V10",
      sector: "EMPRENDIMIENTO",
      periodoFiscal,
      fechaGeneracion: new Date().toISOString(),
      completitud,
      listo_para_presentar: listoPresentar,
      advertencias,
      campos_faltantes,
    },
    seccion_identificacion: {
      nombre_sociedad: society.legal_name,
      ruc: society.tax_id,
      fecha_constitucion: society.incorporation_date,
      representante_legal: repLegal?.full_name || null,
      cedula_representante: repLegal?.id_number || null,
      actividad_economica: society.industry,
      direccion_fiscal: society.fiscal_address,
      en_exoneracion_isr: exoneracion.en_exoneracion,
      meses_exoneracion_transcurridos: exoneracion.meses_transcurridos,
      meses_exoneracion_restantes: exoneracion.meses_restantes,
    },
    seccion_ingresos: {
      ingresos_brutos_total: ingresosBrutos || null,
      ingresos_exentos: 0,
      ingresos_gravables: ingresosBrutos || null,
      ingresos_desde_facturas_electronicas: ingresosFE || null,
      discrepancia_fe_vs_declarado: discrepancia,
      alerta_umbral_categoria: umbral.alerta,
    },
    seccion_gastos: {
      gastos_deducibles_total: gastosTotalDeducible || null,
      gastos_por_categoria: gastosPorCategoria,
      css_patronal_pagada:
        payroll.totalEmployerCost > payroll.totalGross
          ? payroll.totalEmployerCost - payroll.totalGross
          : null,
      planilla_total: payroll.totalGross || null,
    },
    seccion_impuesto: {
      renta_neta_gravable: rentaNeta || null,
      isr_calculado: isrCalculado || null,
      isr_a_pagar: isrAPagar,
      tasa_unica: 0,
      feci_retencion: 0,
      itbms_declarado: itbmsFE || null,
      credito_fiscal_disponible: null,
    },
    seccion_distribucion_utilidades: {
      utilidades_distribuidas: null,
      socios,
    },
    fuentes_datos: fuentes,
  };
}
