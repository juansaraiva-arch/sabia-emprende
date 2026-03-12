import { NextRequest, NextResponse } from "next/server";

// ============================================================
// Traductor Legal — GAP-6 MDF PTY
// Traduce jerga legal panamena a lenguaje simple para MiPYMES
// Ahora llama al backend FastAPI (Claude) en vez de OpenAI directo.
// ============================================================

const MOCK_TRADUCCION = `EN SIMPLE:
Este texto legal describe obligaciones relacionadas con el tema mencionado.

PARA TU NEGOCIO:
Puede tener implicaciones en tus obligaciones fiscales o laborales.

ACCION REQUERIDA:
Consulta con un contador o abogado para verificar si aplica a tu situacion.

DATOS IMPORTANTES:
Revisa las fechas limite mencionadas en el texto original.`;

const backendUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const { texto } = await req.json();

    if (!texto || texto.trim().length < 10) {
      return NextResponse.json(
        { ok: false, error: "El texto es demasiado corto para analizar." },
        { status: 400 }
      );
    }

    if (texto.length > 5000) {
      return NextResponse.json(
        {
          ok: false,
          error: "El texto es demasiado largo. Maximo 5,000 caracteres por consulta.",
        },
        { status: 400 }
      );
    }

    // Forwarding auth header from the original request
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      // Modo demo: retornar traduccion mock
      return NextResponse.json({
        ok: true,
        traduccion: MOCK_TRADUCCION,
        demo: true,
      });
    }

    // Llamar al backend FastAPI (que ahora usa Claude)
    const response = await fetch(`${backendUrl}/api/ai-agents/simplify-legal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        text: texto,
        context: "texto legal panameno para MiPYMES",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const detail = errorData?.detail || "Error al procesar la traduccion";
      return NextResponse.json({ ok: false, error: detail }, { status: response.status });
    }

    const data = await response.json();

    // Transformar respuesta del backend al formato esperado por el frontend
    const resultado = data.data || {};
    const traduccion = [
      `EN SIMPLE:\n${resultado.simple || "No disponible"}`,
      `RIESGO: ${resultado.riesgo || "N/A"} ${resultado.emoji || ""}`,
      `CONSEJO:\n${resultado.tip || "Consulta con un profesional."}`,
    ].join("\n\n");

    return NextResponse.json({
      ok: true,
      traduccion,
    });
  } catch (err) {
    console.error("[traductor-legal]", err);

    // Fallback a mock si el backend no esta disponible
    return NextResponse.json({
      ok: true,
      traduccion: MOCK_TRADUCCION,
      demo: true,
    });
  }
}
