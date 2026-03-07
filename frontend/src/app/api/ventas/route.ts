/**
 * API Route: /api/ventas
 * GET — Listar ventas de una sociedad
 * POST — Crear nueva venta
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase no configurado. Usando localStorage." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const societyId = searchParams.get("society_id");

  if (!societyId) {
    return NextResponse.json(
      { error: "society_id es requerido" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("ventas")
    .select("*")
    .eq("society_id", societyId)
    .order("fecha", { ascending: false });

  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const origen = searchParams.get("origen");

  if (desde) query = query.gte("fecha", desde);
  if (hasta) query = query.lte("fecha", hasta);
  if (origen) query = query.eq("origen", origen);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ventas: data });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase no configurado. Usando localStorage." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();

    const { society_id, user_id, fecha, hora, cliente, concepto, monto_base, itbms, metodo_pago, origen, notas, dgi_num_factura, dgi_serie, dgi_ruc_cliente, dgi_tipo_doc, importacion_id, cufe } = body;

    if (!society_id || !concepto || monto_base === undefined) {
      return NextResponse.json(
        { error: "society_id, concepto y monto_base son requeridos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ventas")
      .insert({
        society_id,
        user_id: user_id || null,
        fecha: fecha || new Date().toISOString().split("T")[0],
        hora: hora || null,
        cliente: cliente || "Consumidor Final",
        concepto,
        monto_base,
        itbms: itbms || 0,
        metodo_pago: metodo_pago || "efectivo",
        origen: origen || "manual",
        notas,
        dgi_num_factura,
        dgi_serie,
        dgi_ruc_cliente,
        dgi_tipo_doc,
        importacion_id,
        cufe,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ venta: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}
