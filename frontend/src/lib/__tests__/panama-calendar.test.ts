/**
 * Tests unitarios para panama-calendar.ts
 * Calendario de Panama 2026 — feriados, dias laborables, eventos fiscales
 */
import { describe, it, expect } from "vitest";
import {
  FERIADOS_PANAMA_2026,
  esFeriado,
  esDomingo,
  diasLaborables,
  getProximosEventos,
  getFechasLimite2026,
} from "@/lib/panama-calendar";

// ============================================
// FERIADOS_PANAMA_2026
// ============================================

describe("FERIADOS_PANAMA_2026", () => {
  it("lista tiene al menos 15 feriados", () => {
    expect(FERIADOS_PANAMA_2026.length).toBeGreaterThanOrEqual(15);
  });

  it("incluye Ano Nuevo, Navidad y Separacion de Colombia", () => {
    const nombres = FERIADOS_PANAMA_2026.map((f) => f.nombre);
    expect(nombres).toContain("Ano Nuevo");
    expect(nombres).toContain("Navidad");
    expect(nombres).toContain("Separacion de Colombia");
  });
});

// ============================================
// esFeriado
// ============================================

describe("esFeriado", () => {
  it("1 enero 2026 -> Ano Nuevo", () => {
    const result = esFeriado(new Date(2026, 0, 1));
    expect(result).not.toBeNull();
    expect(result!.nombre).toBe("Ano Nuevo");
  });

  it("5 enero 2026 (dia normal) -> null", () => {
    expect(esFeriado(new Date(2026, 0, 5))).toBeNull();
  });

  it("25 diciembre 2026 -> Navidad", () => {
    const result = esFeriado(new Date(2026, 11, 25));
    expect(result).not.toBeNull();
    expect(result!.nombre).toBe("Navidad");
  });
});

// ============================================
// esDomingo
// ============================================

describe("esDomingo", () => {
  it("un domingo -> true", () => {
    // 4 enero 2026 es domingo
    expect(esDomingo(new Date(2026, 0, 4))).toBe(true);
  });

  it("un lunes -> false", () => {
    // 5 enero 2026 es lunes
    expect(esDomingo(new Date(2026, 0, 5))).toBe(false);
  });
});

// ============================================
// diasLaborables
// ============================================

describe("diasLaborables", () => {
  it("enero 2026 -> excluye domingos + feriados", () => {
    const dias = diasLaborables(0, 2026); // enero = mes 0
    // Enero 2026: 31 dias, 4 domingos (4,11,18,25), 2 feriados (1 ene, 9 ene)
    // 1 ene (jueves) y 9 ene (viernes) son entre semana
    // Total: 31 - 4 domingos - 2 feriados = 25
    expect(dias).toBe(25);
  });
});

// ============================================
// getProximosEventos
// ============================================

describe("getProximosEventos", () => {
  it("desde 1 enero, n=3 -> retorna 3 eventos", () => {
    const eventos = getProximosEventos(3, new Date(2026, 0, 1));
    expect(eventos.length).toBe(3);
  });

  it("desde 31 dic -> retorna 1 o menos eventos", () => {
    const eventos = getProximosEventos(5, new Date(2026, 11, 31));
    expect(eventos.length).toBeLessThanOrEqual(1);
  });
});

// ============================================
// getFechasLimite2026
// ============================================

describe("getFechasLimite2026", () => {
  it("retorna lista no vacia y ordenada", () => {
    const fechas = getFechasLimite2026();
    expect(fechas.length).toBeGreaterThan(0);
    for (let i = 1; i < fechas.length; i++) {
      expect(fechas[i].fecha.getTime()).toBeGreaterThanOrEqual(
        fechas[i - 1].fecha.getTime()
      );
    }
  });

  it("incluye categorias css, dgi, laboral, municipal", () => {
    const fechas = getFechasLimite2026();
    const categorias = new Set(fechas.map((f) => f.categoria));
    expect(categorias.has("css")).toBe(true);
    expect(categorias.has("dgi")).toBe(true);
    expect(categorias.has("laboral")).toBe(true);
    expect(categorias.has("municipal")).toBe(true);
  });
});
