"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Info,
  X,
  Copy,
} from "lucide-react";
import { parseDGICSV, dgiRowToVentaInput } from "@/lib/parsers/dgi-csv-parser";
import type { DGICSVRow, DGIParseResult } from "@/lib/parsers/dgi-csv-parser";
import { importVentasBatch, readVentas } from "@/lib/ventas-storage";
import { formatBalboas } from "@/lib/currency";
import GuiaDGI from "./GuiaDGI";

// ============================================
// TIPOS
// ============================================

interface ImportadorDGIProps {
  societyId: string;
  onImportComplete: (count: number) => void;
}

type Step = 1 | 2 | 3 | 4;

interface ImportResult {
  imported: number;
  duplicates: number;
  errors: string[];
}

// ============================================
// STEPS INDICATOR
// ============================================

const STEP_LABELS = ["Subir", "Vista previa", "Confirmar", "Resultado"];

function StepsIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {STEP_LABELS.map((label, i) => {
        const stepNum = (i + 1) as Step;
        const isActive = stepNum === current;
        const isCompleted = stepNum < current;

        return (
          <React.Fragment key={stepNum}>
            {/* Linea conectora (antes de cada circulo excepto el primero) */}
            {i > 0 && (
              <div
                className={`h-0.5 w-8 sm:w-12 transition-colors ${
                  isCompleted || isActive ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
            {/* Circulo + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isActive
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-200"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle size={16} />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-emerald-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ImportadorDGI({ societyId, onImportComplete }: ImportadorDGIProps) {
  const [step, setStep] = useState<Step>(1);
  const [parseResult, setParseResult] = useState<DGIParseResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [showGuia, setShowGuia] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [duplicateNums, setDuplicateNums] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Detectar duplicados contra ventas existentes ----
  const checkDuplicates = useCallback(
    (rows: DGICSVRow[]): Set<string> => {
      const existingVentas = readVentas().filter(
        (v) => v.societyId === societyId && v.dgiNumFactura
      );
      const existingNums = new Set(existingVentas.map((v) => v.dgiNumFactura!));
      const dups = new Set<string>();
      for (const row of rows) {
        if (existingNums.has(row.numFactura)) {
          dups.add(row.numFactura);
        }
      }
      return dups;
    },
    [societyId]
  );

  // ---- Filas validas (no duplicadas, sin errores de parse) ----
  const validRows = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.rows.filter((r) => !duplicateNums.has(r.numFactura));
  }, [parseResult, duplicateNums]);

  // ---- Procesar archivo ----
  const processFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const result = parseDGICSV(text);
        setParseResult(result);
        const dups = checkDuplicates(result.rows);
        setDuplicateNums(dups);
        if (result.ok || result.rows.length > 0) {
          setStep(2);
        }
        // Si no hay filas validas, se queda en step 1 mostrando errores
      };
      reader.readAsText(file, "utf-8");
    },
    [checkDuplicates]
  );

  // ---- Drag & Drop ----
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // ---- Importar facturas ----
  const handleImport = useCallback(async () => {
    if (!parseResult || validRows.length === 0) return;

    setIsImporting(true);

    // Pequeno delay para que se vea el spinner
    await new Promise((r) => setTimeout(r, 400));

    const importacionId = `imp-${Date.now()}`;
    const ventaInputs = validRows.map((row) =>
      dgiRowToVentaInput(row, societyId)
    );

    const result = importVentasBatch(ventaInputs, importacionId);
    setImportResult(result);
    setIsImporting(false);
    setStep(4);
  }, [parseResult, validRows, societyId]);

  // ---- Reset completo ----
  const handleReset = useCallback(() => {
    setStep(1);
    setParseResult(null);
    setFileName("");
    setDuplicateNums(new Set());
    setImportResult(null);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ============================================
  // RENDER
  // ============================================

  // Si la guia esta visible, mostrarla encima
  if (showGuia) {
    return <GuiaDGI onClose={() => setShowGuia(false)} />;
  }

  return (
    <div className="space-y-4">
      <StepsIndicator current={step} />

      {/* ====== STEP 1: UPLOAD ====== */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="text-center mb-2">
            <h3 className="text-base font-bold text-slate-800">
              Importar Facturas del Facturador DGI
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sube el archivo CSV exportado desde el Sistema de Facturacion Gratuito (SFEP)
            </p>
          </div>

          {/* Zona drag & drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all min-h-[160px] ${
              isDragging
                ? "border-emerald-400 bg-emerald-50 scale-[1.02]"
                : "border-slate-300 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload
              size={36}
              className={isDragging ? "text-emerald-500" : "text-slate-400"}
            />
            <p className="text-sm font-bold text-slate-600">
              Arrastra tu archivo CSV aqui
            </p>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Seleccionar archivo CSV
            </button>
          </div>

          {/* Errores de parse (sin filas validas) */}
          {parseResult && !parseResult.ok && parseResult.errors.length > 0 && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-500" />
                <span className="text-sm font-bold text-red-700">
                  Error al leer el archivo
                </span>
              </div>
              {parseResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600">
                  Fila {err.row}: {err.message}
                </p>
              ))}
            </div>
          )}

          {/* Link a guia */}
          <button
            type="button"
            onClick={() => setShowGuia(true)}
            className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium mx-auto"
          >
            <Info size={14} />
            Como exportar el CSV desde la DGI
          </button>
        </div>
      )}

      {/* ====== STEP 2: PREVIEW ====== */}
      {step === 2 && parseResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          {/* Resumen */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">
              Vista previa del CSV
            </h3>
            <span className="text-xs text-slate-500">
              {fileName}
            </span>
          </div>

          {/* Estadisticas rapidas */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">
                {parseResult.rows.length} filas validas
              </span>
            </div>
            {duplicateNums.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                <Copy size={14} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-700">
                  {duplicateNums.size} duplicadas
                </span>
              </div>
            )}
            {parseResult.errors.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle size={14} className="text-red-600" />
                <span className="text-xs font-bold text-red-700">
                  {parseResult.errors.length} errores
                </span>
              </div>
            )}
          </div>

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-bold text-amber-700 mb-1">Advertencias:</p>
              {parseResult.warnings.slice(0, 5).map((w, i) => (
                <p key={i} className="text-xs text-amber-600">{w}</p>
              ))}
              {parseResult.warnings.length > 5 && (
                <p className="text-xs text-amber-500 mt-1">
                  ... y {parseResult.warnings.length - 5} mas
                </p>
              )}
            </div>
          )}

          {/* Errores de filas */}
          {parseResult.errors.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs font-bold text-red-700 mb-1">Filas con errores:</p>
              {parseResult.errors.slice(0, 5).map((err, i) => (
                <p key={i} className="text-xs text-red-600">
                  Fila {err.row}: {err.message}
                </p>
              ))}
              {parseResult.errors.length > 5 && (
                <p className="text-xs text-red-500 mt-1">
                  ... y {parseResult.errors.length - 5} mas
                </p>
              )}
            </div>
          )}

          {/* Tabla preview (primeras 20 filas) */}
          {parseResult.rows.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-bold text-slate-600 whitespace-nowrap">
                        Fecha
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600 whitespace-nowrap">
                        Factura
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600 whitespace-nowrap">
                        Cliente
                      </th>
                      <th className="px-3 py-2 text-right font-bold text-slate-600 whitespace-nowrap">
                        Total
                      </th>
                      <th className="px-3 py-2 text-center font-bold text-slate-600 whitespace-nowrap">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.rows.slice(0, 20).map((row, i) => {
                      const isDuplicate = duplicateNums.has(row.numFactura);
                      return (
                        <tr
                          key={i}
                          className={`border-t border-slate-100 ${
                            isDuplicate
                              ? "bg-amber-50/50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            {row.fecha}
                          </td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap font-mono">
                            {row.numFactura}
                          </td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[150px] truncate">
                            {row.nombreCliente || row.rucCliente || "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap text-right font-medium">
                            {formatBalboas(row.total)}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            {isDuplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                                <Copy size={10} />
                                Duplicada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                <CheckCircle size={10} />
                                Nueva
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parseResult.rows.length > 20 && (
                <div className="px-3 py-2 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
                  Mostrando 20 de {parseResult.rows.length} filas
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={validRows.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
            >
              Continuar
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ====== STEP 3: CONFIRM ====== */}
      {step === 3 && parseResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 text-center">
            Confirmar importacion
          </h3>

          {/* Resumen de la importacion */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle size={20} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-700">
                  {validRows.length} facturas nuevas
                </p>
                <p className="text-xs text-emerald-600">
                  Se importaran al Libro de Ventas
                </p>
              </div>
            </div>

            {duplicateNums.size > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <Copy size={20} className="text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-700">
                    {duplicateNums.size} duplicados
                  </p>
                  <p className="text-xs text-amber-600">
                    Ya existen en el sistema y seran omitidos
                  </p>
                </div>
              </div>
            )}

            {parseResult.errors.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertTriangle size={20} className="text-red-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-700">
                    {parseResult.errors.length} con errores
                  </p>
                  <p className="text-xs text-red-600">
                    Filas invalidas que no se importaran
                  </p>
                </div>
              </div>
            )}

            {/* Total monetario */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-xs text-slate-500">Total a importar</p>
              <p className="text-lg font-bold text-slate-800">
                {formatBalboas(
                  validRows.reduce((sum, r) => sum + r.total, 0)
                )}
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={isImporting}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 disabled:opacity-50 transition-all"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || validRows.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-md shadow-emerald-200"
            >
              {isImporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={18} />
                  Importar {validRows.length} Facturas
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ====== STEP 4: RESULT ====== */}
      {step === 4 && importResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          {/* Banner de exito */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center">
              Importacion completada
            </h3>
            <p className="text-sm text-emerald-700 font-medium text-center">
              Se importaron {importResult.imported} facturas del facturador DGI
            </p>
          </div>

          {/* Detalle */}
          <div className="space-y-2">
            {importResult.imported > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50">
                <CheckCircle size={14} className="text-emerald-600" />
                <span className="text-xs text-emerald-700 font-medium">
                  {importResult.imported} facturas importadas exitosamente
                </span>
              </div>
            )}
            {importResult.duplicates > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50">
                <Copy size={14} className="text-amber-600" />
                <span className="text-xs text-amber-700 font-medium">
                  {importResult.duplicates} facturas ya existian y fueron omitidas
                </span>
              </div>
            )}
            {importResult.errors.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-red-50 space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-600" />
                  <span className="text-xs text-red-700 font-medium">
                    {importResult.errors.length} errores durante la importacion
                  </span>
                </div>
                {importResult.errors.slice(0, 3).map((err, i) => (
                  <p key={i} className="text-[10px] text-red-500 ml-6">{err}</p>
                ))}
              </div>
            )}
          </div>

          {/* Boton para cerrar y refrescar */}
          <button
            type="button"
            onClick={() => {
              onImportComplete(importResult.imported);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-200"
          >
            <FileSpreadsheet size={18} />
            Ver en Tabla de Ventas
          </button>

          {/* Opcion de importar otro */}
          <button
            type="button"
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-all"
          >
            <Upload size={14} />
            Importar otro archivo
          </button>
        </div>
      )}
    </div>
  );
}
