import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// ============================================================
// Traductor Legal — GAP-6 MDF PTY
// Traduce jerga legal panameña a lenguaje simple para MiPYMES
// ============================================================

const SYSTEM_PROMPT = `Eres un asesor legal panameno especializado en derecho comercial,
laboral y tributario de Panama. Tu funcion es traducir textos legales complejos a
lenguaje simple y directo para duenos de MiPYMES.

Al traducir, debes:
1. Explicar que dice el texto en maximo 3 oraciones simples
2. Indicar QUE SIGNIFICA ESTO PARA EL NEGOCIO (impacto practico)
3. Indicar SI HAY ALGO QUE EL EMPRESARIO DEBE HACER y en que plazo
4. Si el texto menciona montos, fechas o porcentajes, destacarlos claramente
5. Si el texto hace referencia a leyes o articulos, mencionar el nombre completo

Leyes que conoces de Panama: Codigo de Trabajo, Ley 186 de S.E.P., Ley 462 de 2025 (CSS),
Codigo Fiscal, resoluciones DGI, ITBMS (7%), ISR Art. 700.

Responde SIEMPRE en espanol. Se claro, directo y nunca uses tecnicismos sin explicarlos.
Usa formato con secciones: EN SIMPLE, PARA TU NEGOCIO, ACCION REQUERIDA, DATOS IMPORTANTES.
Si el texto no es legal o esta vacio, indicalo amablemente.`;

const MOCK_TRADUCCION = `EN SIMPLE:
Este texto legal describe obligaciones relacionadas con el tema mencionado.

PARA TU NEGOCIO:
Puede tener implicaciones en tus obligaciones fiscales o laborales.

ACCION REQUERIDA:
Consulta con un contador o abogado para verificar si aplica a tu situacion.

DATOS IMPORTANTES:
Revisa las fechas limite mencionadas en el texto original.`;

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

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Modo demo: retornar traduccion mock
      return NextResponse.json({
        ok: true,
        traduccion: MOCK_TRADUCCION,
        demo: true,
      });
    }

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Traduce este texto legal:\n\n${texto}` },
      ],
    });

    return NextResponse.json({
      ok: true,
      traduccion: completion.choices[0].message.content ?? "",
    });
  } catch (err) {
    console.error("[traductor-legal]", err);
    return NextResponse.json(
      { ok: false, error: "Error al procesar la traduccion" },
      { status: 500 }
    );
  }
}
