/**
 * XML Builder — Factura Electronica DGI Panama
 * Mi Director Financiero PTY
 *
 * Genera el XML en formato FE-DGI para envio al PAC.
 * Este builder es para uso server-side (API routes).
 *
 * PENDING SANDBOX VERIFICATION
 * La estructura XML debe ser validada contra el esquema XSD oficial
 * de la DGI antes de enviar a produccion.
 */

import type { FacturaInputPAC, ItemFacturaPAC } from "./types";

// ============================================
// CONSTANTES
// ============================================

const XML_VERSION = '<?xml version="1.0" encoding="UTF-8"?>';
const NAMESPACE_FE = "http://dgi.mef.gob.pa/FE";
const SCHEMA_VERSION = "1.0";

// ============================================
// TIPOS INTERNOS
// ============================================

interface DatosEmisor {
  ruc: string;
  dv: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion: string;
  telefono?: string;
  email: string;
  tipoContribuyente: "1" | "2"; // 1=Natural, 2=Juridico
  actividadEconomica: string;
}

interface BuildXMLParams {
  factura: FacturaInputPAC;
  emisor: DatosEmisor;
  numeroInterno: string;
  fechaEmision?: string; // ISO date, default hoy
}

// ============================================
// BUILDER PRINCIPAL
// ============================================

/**
 * Construye el XML de factura electronica en formato FE-DGI.
 *
 * NOTA: Este XML es un borrador basado en la estructura general
 * de facturacion electronica de Panama. El esquema exacto debe
 * ser validado contra el XSD oficial de la DGI y el PAC especifico.
 *
 * @param params - Datos de la factura, emisor y numero interno
 * @returns string XML listo para firmar y enviar al PAC
 */
export function buildXMLFactura(params: BuildXMLParams): string {
  const { factura, emisor, numeroInterno, fechaEmision } = params;
  const fecha = fechaEmision || new Date().toISOString().split("T")[0];
  const hora = new Date().toISOString().split("T")[1]?.split(".")[0] || "00:00:00";

  // Calcular totales
  const totales = calcularTotalesXML(factura.items);

  const lines: string[] = [];

  lines.push(XML_VERSION);
  lines.push(`<rFE xmlns="${NAMESPACE_FE}" version="${SCHEMA_VERSION}">`);

  // -- Datos del documento ----------------------------------------------
  lines.push("  <dVerForm>1.00</dVerForm>");
  lines.push(`  <dId-Idc>${numeroInterno}</dId-Idc>`);

  // -- Generales del Documento ------------------------------------------
  lines.push("  <gDGen>");
  lines.push(`    <iDoc>${factura.tipoDocumento}</iDoc>`);
  lines.push("    <dNroDF>1</dNroDF>");
  lines.push("    <dPtoFacDF>001</dPtoFacDF>");
  lines.push(`    <dFechaEm>${fecha}</dFechaEm>`);
  lines.push(`    <dHoraEm>${hora}</dHoraEm>`);

  // Tipo de operacion
  lines.push("    <iNatOp>01</iNatOp>"); // 01 = Venta
  lines.push("    <iTipoTranVenta>1</iTipoTranVenta>"); // 1 = Venta de giro

  // Forma de pago
  lines.push("    <iFormaPago>01</iFormaPago>"); // 01 = Contado

  // Emisor
  lines.push("    <gEmis>");
  lines.push(`      <dRuc>${escapeXML(emisor.ruc)}</dRuc>`);
  lines.push(`      <dDV>${escapeXML(emisor.dv)}</dDV>`);
  lines.push(`      <dNombEm>${escapeXML(emisor.razonSocial)}</dNombEm>`);
  if (emisor.nombreComercial) {
    lines.push(`      <dNombCom>${escapeXML(emisor.nombreComercial)}</dNombCom>`);
  }
  lines.push(`      <dDirecEm>${escapeXML(emisor.direccion)}</dDirecEm>`);
  if (emisor.telefono) {
    lines.push(`      <dTelEm>${escapeXML(emisor.telefono)}</dTelEm>`);
  }
  lines.push(`      <dCorElecEm>${escapeXML(emisor.email)}</dCorElecEm>`);
  lines.push(`      <iTipoContr>${emisor.tipoContribuyente}</iTipoContr>`);
  lines.push(`      <dCodAct>${escapeXML(emisor.actividadEconomica)}</dCodAct>`);
  lines.push("    </gEmis>");

  // Receptor
  lines.push("    <gRec>");
  const tipoRec = factura.receptor.tipo === "CONTRIBUYENTE" ? "01" : "02";
  lines.push(`      <iTipoRec>${tipoRec}</iTipoRec>`);
  if (factura.receptor.ruc) {
    lines.push(`      <dRucRec>${escapeXML(factura.receptor.ruc)}</dRucRec>`);
  }
  lines.push(`      <dNombRec>${escapeXML(factura.receptor.nombre)}</dNombRec>`);
  if (factura.receptor.email) {
    lines.push(`      <dCorElecRec>${escapeXML(factura.receptor.email)}</dCorElecRec>`);
  }
  if (factura.receptor.direccion) {
    lines.push(`      <dDirecRec>${escapeXML(factura.receptor.direccion)}</dDirecRec>`);
  }
  lines.push("    </gRec>");

  lines.push("  </gDGen>");

  // -- Items ------------------------------------------------------------
  factura.items.forEach((item, idx) => {
    lines.push("  <gItem>");
    lines.push(`    <dSecItem>${idx + 1}</dSecItem>`);
    lines.push(`    <dDescProd>${escapeXML(item.descripcion)}</dDescProd>`);
    lines.push(`    <dCantCom>${item.cantidad}</dCantCom>`);
    lines.push(`    <dUniMed>${escapeXML(item.unidad)}</dUniMed>`);
    lines.push(`    <dPrUnit>${item.precioUnitario.toFixed(2)}</dPrUnit>`);
    if (item.descuento && item.descuento > 0) {
      lines.push(`    <dDescItem>${item.descuento.toFixed(2)}</dDescItem>`);
    }

    const subtotal = item.cantidad * item.precioUnitario - (item.descuento ?? 0);
    lines.push(`    <dValTotItem>${subtotal.toFixed(2)}</dValTotItem>`);

    // ITBMS por item
    if (!item.exentoItbms && item.tasaItbms > 0) {
      const itbmsItem = Math.round(subtotal * (item.tasaItbms / 100) * 100) / 100;
      lines.push("    <gITBMS>");
      lines.push(`      <dTasaITBMS>${item.tasaItbms}</dTasaITBMS>`);
      lines.push(`      <dValITBMS>${itbmsItem.toFixed(2)}</dValITBMS>`);
      lines.push("    </gITBMS>");
    }

    lines.push("  </gItem>");
  });

  // -- Totales ----------------------------------------------------------
  lines.push("  <gTotal>");
  lines.push(`    <dTotGravado>${totales.subtotalGravado.toFixed(2)}</dTotGravado>`);
  lines.push(`    <dTotExento>${totales.subtotalExento.toFixed(2)}</dTotExento>`);
  lines.push(`    <dTotDesc>${totales.totalDescuentos.toFixed(2)}</dTotDesc>`);
  lines.push(`    <dTotITBMS>${totales.totalItbms.toFixed(2)}</dTotITBMS>`);
  lines.push(`    <dTotNeto>${totales.totalDocumento.toFixed(2)}</dTotNeto>`);
  lines.push("  </gTotal>");

  // -- Notas ------------------------------------------------------------
  if (factura.notas) {
    lines.push(`  <dInfoAd>${escapeXML(factura.notas)}</dInfoAd>`);
  }

  // -- Referencia (para NC/ND) ------------------------------------------
  if (factura.referenciaOriginal) {
    lines.push("  <gDocRef>");
    lines.push(`    <dCUFEref>${escapeXML(factura.referenciaOriginal)}</dCUFEref>`);
    lines.push("  </gDocRef>");
  }

  lines.push("</rFE>");

  return lines.join("\n");
}

// ============================================
// HELPERS INTERNOS
// ============================================

function calcularTotalesXML(items: ItemFacturaPAC[]): {
  subtotalGravado: number;
  subtotalExento: number;
  totalDescuentos: number;
  totalItbms: number;
  totalDocumento: number;
} {
  let subtotalGravado = 0;
  let subtotalExento = 0;
  let totalDescuentos = 0;
  let totalItbms = 0;

  for (const item of items) {
    const subtotal = item.cantidad * item.precioUnitario;
    const descuento = item.descuento ?? 0;
    const base = subtotal - descuento;

    totalDescuentos += descuento;

    if (item.exentoItbms) {
      subtotalExento += base;
    } else {
      subtotalGravado += base;
      totalItbms += Math.round(base * (item.tasaItbms / 100) * 100) / 100;
    }
  }

  return {
    subtotalGravado: Math.round(subtotalGravado * 100) / 100,
    subtotalExento: Math.round(subtotalExento * 100) / 100,
    totalDescuentos: Math.round(totalDescuentos * 100) / 100,
    totalItbms: Math.round(totalItbms * 100) / 100,
    totalDocumento: Math.round((subtotalGravado + subtotalExento + totalItbms) * 100) / 100,
  };
}

/** Escapar caracteres especiales XML */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
