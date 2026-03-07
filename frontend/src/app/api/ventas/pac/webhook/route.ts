/**
 * API Route: /api/ventas/pac/webhook
 * POST — Webhook receptor del PAC
 *
 * Recibe notificaciones asincronas del PAC cuando
 * un documento cambia de estado (autorizado, rechazado, anulado).
 *
 * ⚠️ PENDING SANDBOX VERIFICATION
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Verificar firma HMAC del webhook (cuando se implemente)
 * PENDING: Implementar verificacion con secreto del webhook
 */
function verifyWebhookSignature(
  _body: string,
  _signature: string | null,
  _secret: string
): boolean {
  // TODO: Implementar cuando se tenga documentacion del PAC
  // const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  // return hmac === signature;
  return true; // Aceptar todo temporalmente en desarrollo
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const webhookSecret = process.env.PAC_WEBHOOK_SECRET || "";

    // Verificar firma (deshabilitado temporalmente)
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        { error: "Firma de webhook invalida" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    const { evento, cufe, detalle } = payload;

    if (!evento || !cufe) {
      return NextResponse.json(
        { error: "evento y cufe son requeridos" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      // Sin Supabase, solo confirmar recepcion
      console.log(`[PAC Webhook] ${evento} — CUFE: ${cufe}`);
      return NextResponse.json({ received: true });
    }

    // Mapear evento a estado
    let nuevoEstado: string;
    let anulada = false;

    switch (evento) {
      case "DOCUMENT_AUTHORIZED":
        nuevoEstado = "AUTORIZADA";
        break;
      case "DOCUMENT_REJECTED":
        nuevoEstado = "RECHAZADA";
        break;
      case "DOCUMENT_CANCELLED":
        nuevoEstado = "ANULADA";
        anulada = true;
        break;
      default:
        nuevoEstado = evento;
    }

    // Actualizar la venta correspondiente
    const updateData: Record<string, unknown> = {
      estado_pac: nuevoEstado,
      updated_at: new Date().toISOString(),
    };

    if (anulada) {
      updateData.anulada = true;
    }

    const { error } = await supabase
      .from("ventas")
      .update(updateData)
      .eq("cufe", cufe);

    if (error) {
      console.error(`[PAC Webhook] Error actualizando CUFE ${cufe}:`, error.message);
      return NextResponse.json(
        { error: "Error actualizando venta" },
        { status: 500 }
      );
    }

    // Log del evento
    console.log(`[PAC Webhook] ${evento} — CUFE: ${cufe} — Estado: ${nuevoEstado}`);

    return NextResponse.json({
      received: true,
      cufe,
      nuevoEstado,
      detalle,
    });
  } catch (err) {
    console.error("[PAC Webhook] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error procesando webhook" },
      { status: 500 }
    );
  }
}
