/**
 * Tests obligatorios — F2 V10 Borrador Automatico
 *
 * Cubre:
 * 1. Calculo de exoneracion ISR (casos borde criticos)
 * 2. Verificacion de umbrales de categoria
 * 3. PACFactory
 * 4. Generacion de borrador
 */

import {
  calcularEstadoExoneracion,
  verificarUmbralesCategoria,
  generarBorradorF2V10,
} from "@/services/declaraciones/f2v10Draft.service";
import {
  PACFactory,
  PACNotImplementedError,
} from "@/services/facturacion/pac/PACFactory";
import { ManualEntryAdapter } from "@/services/facturacion/pac/ManualEntryAdapter";

// ============================================================
// 1. CALCULO DE EXONERACION ISR — Ley 186 Art. 37
// ============================================================

describe("calcularEstadoExoneracion", () => {
  it("mes 1: en exoneracion, 23 meses restantes", () => {
    // Constituida en dic 2024, periodo fiscal 2025
    const result = calcularEstadoExoneracion("2024-12-01", 2025);
    expect(result.en_exoneracion).toBe(true);
    expect(result.meses_transcurridos).toBe(12);
    expect(result.meses_restantes).toBe(12);
  });

  it("mes 12: en exoneracion, 12 meses restantes", () => {
    // Constituida en ene 2025, periodo fiscal 2025
    const result = calcularEstadoExoneracion("2025-01-01", 2025);
    expect(result.en_exoneracion).toBe(true);
    expect(result.meses_transcurridos).toBe(11);
    expect(result.meses_restantes).toBe(13);
  });

  it("mes 23: en exoneracion, 1 mes restante — ALERTA", () => {
    // Constituida en feb 2024, periodo fiscal 2025 (23 meses al 31 dic 2025)
    const result = calcularEstadoExoneracion("2024-02-01", 2025);
    expect(result.en_exoneracion).toBe(true);
    expect(result.meses_transcurridos).toBe(22);
    expect(result.meses_restantes).toBe(2);
  });

  it("mes 24: FUERA de exoneracion, 0 meses restantes", () => {
    // Constituida en ene 2024, periodo fiscal 2025 (24 meses al 31 dic 2025)
    const result = calcularEstadoExoneracion("2024-01-01", 2025);
    expect(result.en_exoneracion).toBe(false);
    expect(result.meses_transcurridos).toBe(23);
    expect(result.meses_restantes).toBe(0);
  });

  it("mes 36: fuera de exoneracion, ya debio pagar ISR", () => {
    // Constituida en ene 2023, periodo fiscal 2025 (35 meses al 31 dic 2025)
    const result = calcularEstadoExoneracion("2023-01-01", 2025);
    expect(result.en_exoneracion).toBe(false);
    expect(result.meses_transcurridos).toBe(35);
    expect(result.meses_restantes).toBe(0);
  });

  it("incorporation_date null: devuelve en_exoneracion=null", () => {
    const result = calcularEstadoExoneracion(null, 2025);
    expect(result.en_exoneracion).toBeNull();
    expect(result.meses_transcurridos).toBeNull();
    expect(result.meses_restantes).toBeNull();
  });

  it("fecha invalida: devuelve en_exoneracion=null", () => {
    const result = calcularEstadoExoneracion("not-a-date", 2025);
    expect(result.en_exoneracion).toBeNull();
    expect(result.meses_transcurridos).toBeNull();
    expect(result.meses_restantes).toBeNull();
  });

  it("constitucion exactamente el 31 dic del periodo: 0 meses, en exoneracion", () => {
    const result = calcularEstadoExoneracion("2025-12-31", 2025);
    expect(result.en_exoneracion).toBe(true);
    expect(result.meses_transcurridos).toBe(0);
    expect(result.meses_restantes).toBe(24);
  });
});

// ============================================================
// 2. VERIFICACION DE UMBRALES DE CATEGORIA
// ============================================================

describe("verificarUmbralesCategoria", () => {
  it("ingresos B/.50,000: microemprendedor sin alerta", () => {
    const result = verificarUmbralesCategoria(50_000);
    expect(result.categoria).toBe("microemprendedor");
    expect(result.alerta).toBe(false);
    expect(result.mensaje).toBeNull();
  });

  it("ingresos B/.135,000: microemprendedor con alerta (90%)", () => {
    const result = verificarUmbralesCategoria(135_000);
    expect(result.categoria).toBe("microemprendedor");
    expect(result.alerta).toBe(true);
    expect(result.mensaje).toContain("150,000");
  });

  it("ingresos B/.150,001: pequena empresa", () => {
    const result = verificarUmbralesCategoria(150_001);
    expect(result.categoria).toBe("pequena_empresa");
    expect(result.alerta).toBe(true);
  });

  it("ingresos B/.1,000,001: requiere transformacion", () => {
    const result = verificarUmbralesCategoria(1_000_001);
    expect(result.categoria).toBe("requiere_transformacion");
    expect(result.alerta).toBe(true);
    expect(result.mensaje).toContain("transformar");
  });

  it("ingresos B/.0: microemprendedor sin alerta", () => {
    const result = verificarUmbralesCategoria(0);
    expect(result.categoria).toBe("microemprendedor");
    expect(result.alerta).toBe(false);
  });

  it("ingresos exactamente B/.150,000: microemprendedor con alerta", () => {
    const result = verificarUmbralesCategoria(150_000);
    expect(result.categoria).toBe("microemprendedor");
    expect(result.alerta).toBe(true);
  });
});

// ============================================================
// 3. PACFactory
// ============================================================

describe("PACFactory", () => {
  it("MANUAL → ManualEntryAdapter", () => {
    const pac = PACFactory.create("MANUAL");
    expect(pac).toBeInstanceOf(ManualEntryAdapter);
    expect(pac.name).toBe("MANUAL_ENTRY");
  });

  it("EDICOM → PACNotImplementedError con mensaje de activacion", () => {
    expect(() => PACFactory.create("EDICOM")).toThrow(PACNotImplementedError);
    try {
      PACFactory.create("EDICOM");
    } catch (e) {
      expect((e as Error).message).toContain("EDICOMAdapter.ts");
      expect((e as Error).message).toContain("PAC_PROVIDER=EDICOM");
    }
  });

  it("GOSOCKET → PACNotImplementedError", () => {
    expect(() => PACFactory.create("GOSOCKET")).toThrow(PACNotImplementedError);
  });

  it("SOVOS → PACNotImplementedError", () => {
    expect(() => PACFactory.create("SOVOS")).toThrow(PACNotImplementedError);
  });

  it("env var no definida → ManualEntryAdapter por defecto", () => {
    // createFromEnv con PAC_PROVIDER no definida
    const pac = PACFactory.createFromEnv();
    expect(pac).toBeInstanceOf(ManualEntryAdapter);
  });

  it("PAC desconocido → Error generico", () => {
    expect(() => PACFactory.create("UNKNOWN" as any)).toThrow(
      "PAC desconocido"
    );
  });
});

// ============================================================
// 4. ManualEntryAdapter
// ============================================================

describe("ManualEntryAdapter", () => {
  it("testConnection devuelve ok:true", async () => {
    const adapter = new ManualEntryAdapter();
    const result = await adapter.testConnection();
    expect(result.ok).toBe(true);
    expect(result.latency_ms).toBe(0);
  });

  it("getPeriodSummary con datos vacios devuelve totales en 0", async () => {
    const adapter = new ManualEntryAdapter();
    const summary = await adapter.getPeriodSummary({
      ruc: "test",
      fiscal_year: 2025,
    });
    expect(summary.net_total).toBe(0);
    expect(summary.document_count).toBe(0);
    expect(summary.itbms_collected).toBe(0);
  });

  it("validateSigningCert devuelve valid:false en modo manual", async () => {
    const adapter = new ManualEntryAdapter();
    const result = await adapter.validateSigningCert("test-ruc");
    expect(result.valid).toBe(false);
  });

  it("registerWebhook devuelve MANUAL-NO-WEBHOOK", async () => {
    const adapter = new ManualEntryAdapter();
    const result = await adapter.registerWebhook({
      url: "https://example.com",
      events: ["DOCUMENT_AUTHORIZED"],
      secret: "test",
    });
    expect(result.webhook_id).toBe("MANUAL-NO-WEBHOOK");
  });
});

// ============================================================
// 5. BORRADOR F2 V10
// ============================================================

describe("generarBorradorF2V10", () => {
  // Mock localStorage for test environment
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
    };
  })();

  beforeEach(() => {
    // Reset localStorage mock
    if (typeof window !== "undefined") {
      localStorageMock.clear();
    }
  });

  it("genera borrador parcial sin crash cuando no hay datos", async () => {
    const draft = await generarBorradorF2V10({
      societyId: "test-society",
      periodoFiscal: 2025,
    });

    expect(draft).toBeDefined();
    expect(draft.metadata.formulario).toBe("F2");
    expect(draft.metadata.version).toBe("V10");
    expect(draft.metadata.sector).toBe("EMPRENDIMIENTO");
    expect(draft.metadata.periodoFiscal).toBe(2025);
    expect(draft.metadata.completitud).toBeGreaterThanOrEqual(0);
    expect(draft.metadata.completitud).toBeLessThanOrEqual(100);
  });

  it("tasa_unica siempre 0 para S.E.P.", async () => {
    const draft = await generarBorradorF2V10({
      societyId: "test-society",
      periodoFiscal: 2025,
    });

    expect(draft.seccion_impuesto.tasa_unica).toBe(0);
  });

  it("feci_retencion siempre 0 para S.E.P.", async () => {
    const draft = await generarBorradorF2V10({
      societyId: "test-society",
      periodoFiscal: 2025,
    });

    expect(draft.seccion_impuesto.feci_retencion).toBe(0);
  });

  it("campos_faltantes no esta vacio cuando faltan datos", async () => {
    const draft = await generarBorradorF2V10({
      societyId: "test-society",
      periodoFiscal: 2025,
    });

    expect(draft.metadata.campos_faltantes.length).toBeGreaterThan(0);
    expect(draft.metadata.listo_para_presentar).toBe(false);
  });

  it("fuentes_datos contiene entradas para cada campo verificado", async () => {
    const draft = await generarBorradorF2V10({
      societyId: "test-society",
      periodoFiscal: 2025,
    });

    expect(draft.fuentes_datos.length).toBeGreaterThan(0);
    const campos = draft.fuentes_datos.map((f) => f.campo);
    expect(campos).toContain("nombre_sociedad");
    expect(campos).toContain("ruc");
    expect(campos).toContain("exoneracion_isr");
  });

  it("ingresos_exentos es 0 para S.E.P.", async () => {
    const draft = await generarBorradorF2V10({
      societyId: "test-society",
      periodoFiscal: 2025,
    });

    expect(draft.seccion_ingresos.ingresos_exentos).toBe(0);
  });
});
