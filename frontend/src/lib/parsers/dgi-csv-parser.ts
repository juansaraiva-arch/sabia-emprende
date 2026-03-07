/**
 * DGI CSV Parser — Sistema de Facturacion Electronica de Panama (SFEP)
 * Mi Director Financiero PTY
 *
 * Parser zero-dependency para archivos CSV exportados del facturador
 * gratuito de la DGI (Segmento 2 — Resolucion 201-6299).
 *
 * Soporta:
 * - Delimitador coma o punto-y-coma (auto-deteccion)
 * - BOM UTF-8
 * - Headers case-insensitive con variantes comunes
 * - Limpieza de prefijo "B/." y comas en numeros
 */

import type { VentaInput } from "../ventas-types";

// ============================================
// TIPOS EXPORTADOS
// ============================================

export interface DGICSVRow {
  numFactura: string;
  serie: string;
  fecha: string;           // ISO date "YYYY-MM-DD"
  rucCliente: string;
  nombreCliente: string;
  descripcion: string;
  subtotal: number;
  itbms: number;
  total: number;
  tipoDoc: string;         // "01" factura, "04" nota credito, etc.
}

export interface DGIParseResult {
  ok: boolean;
  rows: DGICSVRow[];
  totalRows: number;
  errors: { row: number; message: string }[];
  warnings: string[];
}

// ============================================
// MAPEO DE HEADERS
// ============================================

/** Variantes aceptadas para cada columna (case-insensitive, trimmed) */
const HEADER_MAP: Record<string, keyof DGICSVRow> = {
  numero_factura: "numFactura",
  num_factura: "numFactura",
  factura: "numFactura",
  serie: "serie",
  fecha: "fecha",
  fecha_emision: "fecha",
  ruc_cliente: "rucCliente",
  ruc: "rucCliente",
  nombre_cliente: "nombreCliente",
  cliente: "nombreCliente",
  descripcion: "descripcion",
  concepto: "descripcion",
  subtotal: "subtotal",
  monto_base: "subtotal",
  itbms: "itbms",
  impuesto: "itbms",
  total: "total",
  monto_total: "total",
  tipo_documento: "tipoDoc",
  tipo_doc: "tipoDoc",
  tipo: "tipoDoc",
};

/** Columnas requeridas para un parse exitoso */
const REQUIRED_FIELDS: (keyof DGICSVRow)[] = [
  "numFactura",
  "fecha",
  "subtotal",
  "total",
];

// ============================================
// HELPERS
// ============================================

/** Elimina BOM (Byte Order Mark) al inicio del texto */
function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

/** Auto-detecta delimitador: punto-y-coma si aparece mas veces que coma en la primera linea */
function detectDelimiter(firstLine: string): string {
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

/**
 * Limpia un valor numerico:
 * - Elimina prefijo "B/." o "B/ "
 * - Elimina comas de miles
 * - Elimina espacios
 * - Retorna 0 si no es parseable
 */
function parseNumber(raw: string): number {
  const cleaned = raw
    .replace(/B\/\.\s?/g, "")
    .replace(/B\/\s?/g, "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

/**
 * Intenta parsear una fecha en varios formatos comunes:
 * - "YYYY-MM-DD" (ISO)
 * - "DD/MM/YYYY"
 * - "DD-MM-YYYY"
 * - "MM/DD/YYYY" (fallback si el dia > 12)
 * Retorna ISO date string o vacio si no puede parsear.
 */
function parseDate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (slashMatch) {
    const a = parseInt(slashMatch[1], 10);
    const b = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);

    // Si a > 12, asumimos a=dia, b=mes (DD/MM/YYYY)
    // Si b > 12, asumimos a=mes, b=dia (MM/DD/YYYY)
    // Si ambos <= 12, asumimos DD/MM/YYYY (formato latino)
    let day: number;
    let month: number;

    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      // Ambos <= 12: formato DD/MM/YYYY (Panama)
      day = a;
      month = b;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  return "";
}

/**
 * Divide una linea CSV respetando comillas.
 * Maneja campos entre comillas dobles que pueden contener el delimitador.
 */
function splitCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Comilla doble escapada "" dentro de campo entrecomillado
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // saltar la segunda comilla
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }

  // Ultimo campo
  fields.push(current.trim());
  return fields;
}

// ============================================
// PARSER PRINCIPAL
// ============================================

/**
 * Parsea un archivo CSV exportado del facturador gratuito DGI (SFEP).
 *
 * @param csvText - Contenido del archivo CSV como string
 * @returns Resultado del parse con filas validas, errores y advertencias
 */
export function parseDGICSV(csvText: string): DGIParseResult {
  const errors: { row: number; message: string }[] = [];
  const warnings: string[] = [];
  const rows: DGICSVRow[] = [];

  // Limpiar BOM y normalizar saltos de linea
  const clean = stripBOM(csvText).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.split("\n").map((l) => l.trim());

  // Eliminar lineas vacias al final
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  if (lines.length < 2) {
    return {
      ok: false,
      rows: [],
      totalRows: 0,
      errors: [{ row: 0, message: "El archivo debe tener al menos un encabezado y una fila de datos." }],
      warnings: [],
    };
  }

  // Detectar delimitador desde la primera linea
  const delimiter = detectDelimiter(lines[0]);

  // Parsear encabezados
  const rawHeaders = splitCSVLine(lines[0], delimiter);
  const headerMapping: { index: number; field: keyof DGICSVRow }[] = [];

  for (let i = 0; i < rawHeaders.length; i++) {
    const normalized = rawHeaders[i]
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/['"]/g, "");
    const mapped = HEADER_MAP[normalized];
    if (mapped) {
      headerMapping.push({ index: i, field: mapped });
    }
  }

  // Verificar columnas requeridas
  const mappedFields = new Set(headerMapping.map((h) => h.field));
  const missingFields = REQUIRED_FIELDS.filter((f) => !mappedFields.has(f));

  if (missingFields.length > 0) {
    return {
      ok: false,
      rows: [],
      totalRows: 0,
      errors: [{
        row: 0,
        message: `Columnas requeridas no encontradas: ${missingFields.join(", ")}. Columnas detectadas: ${rawHeaders.join(", ")}`,
      }],
      warnings: [],
    };
  }

  // Parsear filas de datos
  let totalDataRows = 0;

  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Saltar filas vacias
    if (!line || line.replace(new RegExp(delimiter, "g"), "").trim() === "") {
      continue;
    }

    totalDataRows++;
    const rowNumber = lineIdx + 1; // numero 1-indexed para mensajes de error
    const values = splitCSVLine(line, delimiter);

    // Extraer valores usando el mapeo de headers
    const raw: Record<string, string> = {};
    for (const { index, field } of headerMapping) {
      raw[field] = index < values.length ? values[index] : "";
    }

    // Validar numero de factura (requerido)
    const numFactura = raw.numFactura?.trim() || "";
    if (!numFactura) {
      errors.push({ row: rowNumber, message: "Numero de factura vacio o faltante." });
      continue;
    }

    // Parsear fecha
    const fecha = parseDate(raw.fecha || "");
    if (!fecha) {
      errors.push({ row: rowNumber, message: `Fecha invalida: "${raw.fecha || ""}"` });
      continue;
    }

    // Parsear montos
    const subtotal = parseNumber(raw.subtotal || "0");
    const itbms = parseNumber(raw.itbms || "0");
    const total = parseNumber(raw.total || "0");

    // Validar total > 0
    if (total <= 0) {
      errors.push({ row: rowNumber, message: `Total debe ser mayor a 0 (valor: ${total}).` });
      continue;
    }

    // Advertencia si total != subtotal + itbms (tolerancia 0.02)
    const expectedTotal = Math.round((subtotal + itbms) * 100) / 100;
    if (Math.abs(total - expectedTotal) > 0.02) {
      warnings.push(
        `Fila ${rowNumber}: Total (${total}) no coincide con subtotal (${subtotal}) + ITBMS (${itbms}) = ${expectedTotal}. Diferencia: ${Math.round((total - expectedTotal) * 100) / 100}`
      );
    }

    const row: DGICSVRow = {
      numFactura,
      serie: raw.serie?.trim() || "",
      fecha,
      rucCliente: raw.rucCliente?.trim() || "",
      nombreCliente: raw.nombreCliente?.trim() || "",
      descripcion: raw.descripcion?.trim() || "",
      subtotal,
      itbms,
      total,
      tipoDoc: raw.tipoDoc?.trim() || "01",
    };

    rows.push(row);
  }

  return {
    ok: rows.length > 0,
    rows,
    totalRows: totalDataRows,
    errors,
    warnings,
  };
}

// ============================================
// CONVERSOR DGI ROW -> VENTA INPUT
// ============================================

/**
 * Convierte una fila DGI CSV a un VentaInput listo para guardar.
 *
 * @param row - Fila parseada del CSV DGI
 * @param societyId - ID de la sociedad/empresa destino
 * @returns VentaInput compatible con saveVenta / importVentasBatch
 */
export function dgiRowToVentaInput(row: DGICSVRow, societyId: string): VentaInput {
  return {
    societyId,
    fecha: row.fecha,
    cliente: row.nombreCliente || row.rucCliente || "Sin cliente",
    concepto: row.descripcion || `Factura ${row.numFactura}`,
    montoBase: row.subtotal,
    aplicaItbms: false, // No auto-calcular; usamos el ITBMS del CSV
    metodoPago: "efectivo",
    origen: "importacion_dgi",
    dgiNumFactura: row.numFactura,
    dgiSerie: row.serie || undefined,
    dgiRucCliente: row.rucCliente || undefined,
    dgiTipoDoc: row.tipoDoc || "01",
    notas: row.itbms > 0
      ? `ITBMS importado: B/.${row.itbms.toFixed(2)}`
      : undefined,
  };
}
