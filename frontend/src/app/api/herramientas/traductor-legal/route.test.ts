/**
 * Tests para traductor-legal route — ahora llama al backend (Claude) en vez de OpenAI
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de fetch global
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock de NextRequest/NextResponse
vi.mock("next/server", () => ({
  NextRequest: class {
    constructor(
      public url: string,
      public init?: RequestInit
    ) {}
    json() {
      return JSON.parse(this.init?.body as string);
    }
    headers = new Map([["authorization", "Bearer test-token"]]);
  },
  NextResponse: {
    json(data: unknown, init?: { status?: number }) {
      return { data, status: init?.status || 200 };
    },
  },
}));

describe("traductor-legal route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects text shorter than 10 chars", async () => {
    const { POST } = await import("./route");
    const req = {
      json: () => Promise.resolve({ texto: "corto" }),
      headers: { get: () => "Bearer token" },
    };

    const res = await POST(req as any);
    expect((res as any).data?.ok).toBe(false);
  });

  it("rejects text longer than 5000 chars", async () => {
    const { POST } = await import("./route");
    const req = {
      json: () => Promise.resolve({ texto: "a".repeat(5001) }),
      headers: { get: () => "Bearer token" },
    };

    const res = await POST(req as any);
    expect((res as any).data?.ok).toBe(false);
  });

  it("returns mock in demo mode (no auth header)", async () => {
    const { POST } = await import("./route");
    const req = {
      json: () => Promise.resolve({ texto: "Articulo 39 del Codigo de Comercio de Panama" }),
      headers: { get: () => null },
    };

    const res = await POST(req as any);
    expect((res as any).data?.ok).toBe(true);
    expect((res as any).data?.demo).toBe(true);
  });

  it("calls backend simplify-legal endpoint when auth present", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "ok",
          data: {
            simple: "Esto significa que debes registrar tu empresa.",
            riesgo: "medio",
            emoji: "⚖️",
            tip: "Consulta un abogado corporativo.",
          },
        }),
    });

    const { POST } = await import("./route");
    const req = {
      json: () => Promise.resolve({ texto: "Articulo 39 del Codigo de Comercio de Panama establece..." }),
      headers: { get: (h: string) => (h === "authorization" ? "Bearer test-token" : null) },
    };

    const res = await POST(req as any);
    expect((res as any).data?.ok).toBe(true);
    expect((res as any).data?.traduccion).toContain("EN SIMPLE");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
