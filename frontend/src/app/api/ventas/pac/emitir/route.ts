/**
 * API Route: /api/ventas/pac/emitir
 * POST — Emitir factura electronica via PAC (Segmento 3)
 *
 * ⚠️ PENDING SANDBOX VERIFICATION
 * Este endpoint requiere configuracion PAC valida.
 * Contacto: gosocket.net para cuenta sandbox.
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
  try {
    const body = await req.json();
    const { society_id, factura } = body;

    if (!society_id || !factura) {
      return NextResponse.json(
        { error: "society_id y factura son requeridos" },
        { status: 400 }
      );
    }

    // Verificar configuracion PAC en la base de datos
    const supabase = getSupabase();
    let pacConfig = null;

    if (supabase) {
      const { data } = await supabase
        .from("pac_configuration")
        .select("*")
        .eq("society_id", society_id)
        .eq("is_active", true)
        .single();

      pacConfig = data;
    }

    if (!pacConfig) {
      // Modo simulacion — guardar localmente sin PAC real
      const simulatedCufe = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Calcular totales
      let totalMonto = 0;
      let totalItbms = 0;
      if (factura.items && Array.isArray(factura.items)) {
        for (const item of factura.items) {
          const subtotal = (item.cantidad || 1) * (item.precioUnitario || 0);
          const desc = item.descuento || 0;
          const base = subtotal - desc;
          const itbms = item.exentoItbms ? 0 : Math.round(base * ((item.tasaItbms || 7) / 100) * 100) / 100;
          totalMonto += base + itbms;
          totalItbms += itbms;
        }
      }

      // Si hay Supabase, guardar como venta con origen PAC
      if (supabase) {
        await supabase.from("ventas").insert({
          society_id,
          fecha: new Date().toISOString().split("T")[0],
          hora: new Date().toISOString().split("T")[1]?.split(".")[0],
          cliente: factura.receptor?.nombre || "Consumidor Final",
          concepto: factura.items?.[0]?.descripcion || "Factura electronica",
          monto_base: Math.round((totalMonto - totalItbms) * 100) / 100,
          itbms: totalItbms,
          metodo_pago: "efectivo",
          origen: "pac",
          cufe: simulatedCufe,
          estado_pac: "PENDIENTE",
          notas: "Emision simulada — PAC sandbox pendiente",
        });
      }

      return NextResponse.json({
        resultado: {
          cufe: simulatedCufe,
          numeroDGI: "",
          fechaAutorizacion: new Date().toISOString(),
          urlQR: "",
          xmlFirmado: "",
          pdfUrl: null,
          estado: "PENDIENTE",
          transaccionId: simulatedCufe,
          montoTotal: Math.round(totalMonto * 100) / 100,
          itbmsTotal: totalItbms,
        },
        simulado: true,
        mensaje: "Factura registrada en modo simulacion. Configure PAC para emision real.",
      });
    }

    // ── Emision real via PAC ──────────────────────────────
    // PENDING SANDBOX VERIFICATION
    // Cuando el PAC este configurado, importar createPACClient
    // y llamar emitirFactura() con la configuracion real.

    return NextResponse.json(
      {
        error: "Emision PAC real pendiente de implementacion sandbox.",
        pac_provider: pacConfig.pac_provider,
      },
      { status: 501 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}
