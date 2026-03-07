/**
 * API Route: /api/ventas/importar-dgi
 * POST — Importar lote de ventas desde CSV DGI (Segmento 2)
 *
 * Recibe un array de ventas parseadas del CSV DGI.
 * Deduplicacion por dgi_num_factura.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase no configurado. Usar importacion local." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { society_id, ventas, importacion_id } = body;

    if (!society_id || !Array.isArray(ventas) || ventas.length === 0) {
      return NextResponse.json(
        { error: "society_id y ventas[] son requeridos" },
        { status: 400 }
      );
    }

    const batchId = importacion_id || `imp-${Date.now()}`;

    // Obtener facturas existentes para deduplicacion
    const { data: existing } = await supabase
      .from("ventas")
      .select("dgi_num_factura")
      .eq("society_id", society_id)
      .not("dgi_num_factura", "is", null);

    const existingNums = new Set(
      (existing || []).map((e: { dgi_num_factura: string }) => e.dgi_num_factura)
    );

    let imported = 0;
    let duplicates = 0;
    const errors: string[] = [];

    // Procesar en lotes de 50
    const batch: Record<string, unknown>[] = [];

    for (let i = 0; i < ventas.length; i++) {
      const v = ventas[i];

      if (!v.concepto || !v.monto_base || v.monto_base <= 0) {
        errors.push(`Fila ${i + 1}: datos incompletos`);
        continue;
      }

      if (v.dgi_num_factura && existingNums.has(v.dgi_num_factura)) {
        duplicates++;
        continue;
      }

      if (v.dgi_num_factura) {
        existingNums.add(v.dgi_num_factura);
      }

      batch.push({
        society_id,
        user_id: v.user_id || null,
        fecha: v.fecha || new Date().toISOString().split("T")[0],
        hora: v.hora || null,
        cliente: v.cliente || "Consumidor Final",
        concepto: v.concepto,
        monto_base: v.monto_base,
        itbms: v.itbms || 0,
        metodo_pago: v.metodo_pago || "efectivo",
        origen: "importacion_dgi",
        dgi_num_factura: v.dgi_num_factura,
        dgi_serie: v.dgi_serie,
        dgi_ruc_cliente: v.dgi_ruc_cliente,
        dgi_tipo_doc: v.dgi_tipo_doc,
        importacion_id: batchId,
        notas: v.notas,
      });
    }

    if (batch.length > 0) {
      // Insertar en lotes de 50
      for (let i = 0; i < batch.length; i += 50) {
        const chunk = batch.slice(i, i + 50);
        const { error } = await supabase.from("ventas").insert(chunk);
        if (error) {
          errors.push(`Error insertando lote ${Math.floor(i / 50) + 1}: ${error.message}`);
        } else {
          imported += chunk.length;
        }
      }
    }

    return NextResponse.json({
      imported,
      duplicates,
      errors,
      importacion_id: batchId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}
