"use client";
import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Eye,
} from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";

// ============================================
// TIPOS
// ============================================

interface CsvUploaderProps {
  onUpload: (records: FinancialRecord[]) => void;
}

interface ParsedRow extends FinancialRecord {
  mes: string;
}

const CSV_HEADERS = [
  "mes",
  "revenue",
  "cogs",
  "opex_rent",
  "opex_payroll",
  "opex_other",
  "depreciation",
  "interest_expense",
  "tax_expense",
  "cash_balance",
  "accounts_receivable",
  "inventory",
  "accounts_payable",
  "bank_debt",
];

const HEADER_LABELS: Record<string, string> = {
  mes: "Mes",
  revenue: "Ventas",
  cogs: "Costo Ventas",
  opex_rent: "Alquiler",
  opex_payroll: "Nomina",
  opex_other: "Otros Gastos",
  depreciation: "Depreciacion",
  interest_expense: "Intereses",
  tax_expense: "Impuestos",
  cash_balance: "Efectivo",
  accounts_receivable: "Cuentas x Cobrar",
  inventory: "Inventario",
  accounts_payable: "Cuentas x Pagar",
  bank_debt: "Deuda Bancaria",
};

// ============================================
// PLANTILLA CSV
// ============================================

function generateTemplate(): string {
  const header = CSV_HEADERS.join(",");
  const meses = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  const rows = meses.map(
    (m) => `${m},0,0,0,0,0,0,0,0,0,0,0,0,0`
  );
  return [header, ...rows].join("\n");
}

function downloadTemplate() {
  const csv = generateTemplate();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_midf_12_meses.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// PARSER
// ============================================

function parseCsv(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { rows: [], errors: ["El archivo debe tener al menos un encabezado y una fila de datos."] };
  }

  const headerLine = lines[0].toLowerCase().replace(/\s+/g, "_");
  const headers = headerLine.split(",").map((h) => h.trim());

  // Validate headers
  const missingHeaders = CSV_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [`Columnas faltantes: ${missingHeaders.map((h) => HEADER_LABELS[h] || h).join(", ")}`],
    };
  }

  const errors: string[] = [];
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length < CSV_HEADERS.length) {
      errors.push(`Fila ${i + 1}: Faltan columnas (${values.length} de ${CSV_HEADERS.length}).`);
      continue;
    }

    const row: Record<string, any> = {};
    let rowValid = true;

    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      if (key === "mes") {
        row[key] = values[j] || `Mes ${i}`;
      } else {
        const num = parseFloat(values[j]);
        if (isNaN(num)) {
          errors.push(`Fila ${i + 1}, columna "${HEADER_LABELS[key] || key}": "${values[j]}" no es un numero valido.`);
          rowValid = false;
          break;
        }
        row[key] = num;
      }
    }

    if (rowValid) {
      rows.push(row as ParsedRow);
    }
  }

  return { rows, errors };
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function CsvUploader({ onUpload }: CsvUploaderProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows, errors: parseErrors } = parseCsv(text);
      setParsedRows(rows);
      setErrors(parseErrors);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
        handleFile(file);
      } else {
        setErrors(["Solo se aceptan archivos .csv"]);
      }
    },
    [handleFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleSave = () => {
    if (parsedRows.length > 0) {
      // Strip "mes" field before passing to parent
      const records: FinancialRecord[] = parsedRows.map(({ mes, ...rest }) => rest);
      onUpload(records);
    }
  };

  const handleClear = () => {
    setParsedRows([]);
    setErrors([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* ====== DOWNLOAD TEMPLATE ====== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={downloadTemplate}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all min-h-[48px]"
        >
          <Download size={18} />
          Descargar Plantilla CSV
        </button>
        <p className="text-xs text-slate-400 self-center">
          Llena la plantilla con 12 meses de datos y subela aqui.
        </p>
      </div>

      {/* ====== DRAG & DROP ZONE ====== */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all min-h-[180px] ${
          isDragging
            ? "border-blue-400 bg-blue-50 scale-[1.02]"
            : fileName
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />

        {fileName ? (
          <>
            <FileSpreadsheet size={40} className="text-emerald-500" />
            <p className="text-sm font-bold text-emerald-700">{fileName}</p>
            <p className="text-xs text-emerald-500">
              {parsedRows.length} filas cargadas correctamente
            </p>
          </>
        ) : (
          <>
            <Upload
              size={40}
              className={isDragging ? "text-blue-500" : "text-slate-400"}
            />
            <p className="text-sm font-bold text-slate-600">
              Arrastra tu archivo CSV aqui
            </p>
            <p className="text-xs text-slate-400">
              o toca para seleccionar un archivo
            </p>
          </>
        )}
      </div>

      {/* ====== ERRORS ====== */}
      {errors.length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-sm font-bold text-red-700">
              Errores encontrados
            </span>
          </div>
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">
              • {err}
            </p>
          ))}
        </div>
      )}

      {/* ====== PREVIEW TABLE ====== */}
      {parsedRows.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-700">
                Vista previa
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {parsedRows.length} meses
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  {CSV_HEADERS.map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-bold text-slate-600 whitespace-nowrap"
                    >
                      {HEADER_LABELS[h] || h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    {CSV_HEADERS.map((h) => (
                      <td
                        key={h}
                        className="px-3 py-2 text-slate-700 whitespace-nowrap"
                      >
                        {h === "mes"
                          ? row.mes
                          : `$${(row[h as keyof ParsedRow] as number)?.toLocaleString("es-PA")}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====== ACTIONS ====== */}
      {parsedRows.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-emerald-600 text-white font-extrabold text-base hover:bg-emerald-700 active:scale-[0.98] transition-all min-h-[56px] shadow-md shadow-emerald-200"
          >
            <CheckCircle2 size={20} />
            Guardar {parsedRows.length} meses
          </button>
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all min-h-[56px]"
          >
            <Trash2 size={18} />
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}
