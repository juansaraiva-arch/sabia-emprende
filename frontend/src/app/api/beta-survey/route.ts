import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    // Detectar dispositivo desde user-agent
    const ua = req.headers.get("user-agent") || "";
    const dispositivo = /mobile|android|iphone|ipad/i.test(ua)
      ? "móvil"
      : /tablet/i.test(ua)
      ? "tablet"
      : "escritorio";

    const { error } = await supabase.from("beta_survey_responses").insert({
      // Datos personales
      nombre: body.nombre || null,
      empresa: body.empresa || null,

      // Bloque 1
      impresion_general: body.impresion_general || null,
      claridad_hub: body.claridad_hub || null,
      atractivo_visual: body.atractivo_visual || null,

      // Bloque 2
      facilidad_diagnostico: body.facilidad_diagnostico || null,
      utilidad_rrhh: body.utilidad_rrhh || null,
      inventario_claro: body.inventario_claro || null,
      espejo_dgi: body.espejo_dgi || null,

      // Bloque 3
      cascada_util: body.cascada_util || null,
      simulador_valor: body.simulador_valor || null,
      lab_precios: body.lab_precios || null,
      herramienta_mas_util: body.herramienta_mas_util || null,

      // Bloque 4
      vigilante_util: body.vigilante_util || null,
      boveda_confianza: body.boveda_confianza || null,
      ley186_relevante: body.ley186_relevante || null,

      // Bloque 5
      asistente_util: body.asistente_util || null,
      asistente_respuestas: body.asistente_respuestas || null,
      asistente_usaria: body.asistente_usaria || null,

      // Bloque 6
      velocidad: body.velocidad || null,
      mobile: body.mobile || null,
      mobile_experiencia: body.mobile_experiencia || null,
      recomendaria: body.recomendaria ?? null,

      // Bloque 7 (abiertos)
      mejor_de_la_app: body.mejor_de_la_app || null,
      mejorar: body.mejorar || null,
      problema_encontrado: body.problema_encontrado || null,
      perfil: body.perfil || null,

      // Metadatos
      tiempo_completado_seg: body.tiempo_completado_seg || null,
      dispositivo,
      version_app: "1.0.0",
      completado: true,
    });

    if (error) {
      console.error("[beta-survey] Supabase error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[beta-survey] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}
