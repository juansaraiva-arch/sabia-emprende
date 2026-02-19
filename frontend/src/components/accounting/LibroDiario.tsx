"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Lock,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  BookOpen,
  RefreshCw,
  Search,
  Check,
  X,
} from "lucide-react";
import { accountingApi } from "@/lib/api";
import SmartTooltip from "@/components/SmartTooltip";

interface LibroDiarioProps {
  societyId: string;
}

interface JournalLine {
  account_code: string;
  description: string;
  debe: number;
  haber: number;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function LibroDiario({ societyId }: LibroDiarioProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Period filter
  const now = new Date();
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);

  // Accounts cache for the form
  const [chartAccounts, setChartAccounts] = useState<any[]>([]);

  // New entry form
  const [newEntry, setNewEntry] = useState({
    entry_date: now.toISOString().split("T")[0],
    description: "",
    reference: "",
    source: "manual",
    attachment_url: "",
  });
  const [newLines, setNewLines] = useState<JournalLine[]>([
    { account_code: "", description: "", debe: 0, haber: 0 },
    { account_code: "", description: "", debe: 0, haber: 0 },
  ]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await accountingApi.listJournalEntries(
        societyId,
        filterYear,
        filterMonth,
        100
      );
      setEntries(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [societyId, filterYear, filterMonth]);

  const loadChart = useCallback(async () => {
    try {
      const res = await accountingApi.listChart(societyId, true);
      setChartAccounts(res.data.filter((a: any) => !a.is_header));
    } catch {
      // Silently ignore — chart may not be initialized
    }
  }, [societyId]);

  useEffect(() => {
    loadEntries();
    loadChart();
  }, [loadEntries, loadChart]);

  const handleAddLine = () => {
    setNewLines([...newLines, { account_code: "", description: "", debe: 0, haber: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (newLines.length <= 2) return;
    setNewLines(newLines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: keyof JournalLine, value: any) => {
    const updated = [...newLines];
    updated[idx] = { ...updated[idx], [field]: value };
    // Enforce: if setting debe > 0, clear haber and vice versa
    if (field === "debe" && Number(value) > 0) {
      updated[idx].haber = 0;
    } else if (field === "haber" && Number(value) > 0) {
      updated[idx].debe = 0;
    }
    setNewLines(updated);
  };

  const totalDebe = newLines.reduce((s, l) => s + (Number(l.debe) || 0), 0);
  const totalHaber = newLines.reduce((s, l) => s + (Number(l.haber) || 0), 0);
  const isBalanced = Math.abs(totalDebe - totalHaber) < 0.01 && totalDebe > 0;

  const handleCreateEntry = async () => {
    if (!isBalanced) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        society_id: societyId,
        entry_date: newEntry.entry_date,
        description: newEntry.description,
        reference: newEntry.reference || null,
        source: newEntry.source,
        attachment_url: newEntry.attachment_url || null,
        lines: newLines
          .filter((l) => l.account_code)
          .map((l) => ({
            account_code: l.account_code,
            description: l.description,
            debe: Number(l.debe) || 0,
            haber: Number(l.haber) || 0,
          })),
      };
      await accountingApi.createJournalEntry(body);
      setShowNewForm(false);
      setNewEntry({
        entry_date: now.toISOString().split("T")[0],
        description: "",
        reference: "",
        source: "manual",
        attachment_url: "",
      });
      setNewLines([
        { account_code: "", description: "", debe: 0, haber: 0 },
        { account_code: "", description: "", debe: 0, haber: 0 },
      ]);
      await loadEntries();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    // Fase 7: Mostrar cuentas afectadas en la confirmacion
    const entry = entries.find((e) => e.id === entryId);
    const affectedLines = entry?.journal_lines || [];
    const affectedAccounts = affectedLines
      .map((l: any) => `${l.account_code} (${l.debe > 0 ? `D $${l.debe}` : `H $${l.haber}`})`)
      .join(", ");

    if (!confirm(
      `Seguro que deseas eliminar el asiento #${entry?.entry_number || ""}?\n\n` +
      `Cuentas afectadas: ${affectedAccounts}\n\n` +
      `Esta accion recalculara los saldos del periodo.`
    )) return;
    try {
      await accountingApi.deleteJournalEntry(societyId, entryId);
      await loadEntries();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.description?.toLowerCase().includes(term) ||
      e.reference?.toLowerCase().includes(term) ||
      String(e.entry_number).includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-800">Libro Diario</h3>
          <SmartTooltip term="libro_diario" size={16} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowNewForm(!showNewForm); if (!showNewForm) loadChart(); }}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={14} />
            Nuevo Asiento
          </button>
          <button onClick={loadEntries} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors" title="Refrescar">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Periodo:</label>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar asiento..."
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">{error}</div>
      )}

      {/* New Entry Form */}
      {showNewForm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-4">
          <h4 className="text-sm font-bold text-emerald-800">Nuevo Asiento Contable</h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-600 font-medium">Fecha</label>
              <input
                type="date"
                value={newEntry.entry_date}
                onChange={(e) => setNewEntry({ ...newEntry, entry_date: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-600 font-medium">Descripcion</label>
              <input
                type="text"
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                placeholder="ej: Pago alquiler oficina enero"
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium">Referencia</label>
              <input
                type="text"
                value={newEntry.reference}
                onChange={(e) => setNewEntry({ ...newEntry, reference: e.target.value })}
                placeholder="ej: FAC-001"
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium">Comprobante (foto/PDF)</label>
              <input
                type="text"
                value={newEntry.attachment_url}
                onChange={(e) => setNewEntry({ ...newEntry, attachment_url: e.target.value })}
                placeholder="URL del comprobante o factura adjunta"
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Sube tu factura/recibo a la Boveda KYC y pega la URL aqui para vincular permanentemente.
              </p>
            </div>
          </div>

          {/* Lines table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-bold text-slate-600 flex items-center gap-1">
                Lineas del Asiento
                <SmartTooltip term="partida_doble" size={14} />
              </h5>
              <button onClick={handleAddLine} className="text-xs text-emerald-600 font-bold hover:underline">
                + Agregar Linea
              </button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-1 px-3 py-1.5 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                <div className="col-span-3">Cuenta</div>
                <div className="col-span-4">Descripcion</div>
                <div className="col-span-2 text-right">Debe</div>
                <div className="col-span-2 text-right">Haber</div>
                <div className="col-span-1" />
              </div>
              {newLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1 px-3 py-1.5 border-t border-slate-100 items-center">
                  <div className="col-span-3">
                    <select
                      value={line.account_code}
                      onChange={(e) => handleLineChange(idx, "account_code", e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      {chartAccounts.map((a) => (
                        <option key={a.account_code} value={a.account_code}>
                          {a.account_code} - {a.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                      placeholder="Detalle..."
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={line.debe || ""}
                      onChange={(e) => handleLineChange(idx, "debe", e.target.value)}
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs text-right focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={line.haber || ""}
                      onChange={(e) => handleLineChange(idx, "haber", e.target.value)}
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs text-right focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {newLines.length > 2 && (
                      <button onClick={() => handleRemoveLine(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {/* Totals row */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-slate-50 border-t border-slate-200 font-bold text-xs">
                <div className="col-span-7 text-right text-slate-600">TOTALES:</div>
                <div className={`col-span-2 text-right ${isBalanced ? "text-emerald-600" : "text-red-600"}`}>
                  ${totalDebe.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </div>
                <div className={`col-span-2 text-right ${isBalanced ? "text-emerald-600" : "text-red-600"}`}>
                  ${totalHaber.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </div>
                <div className="col-span-1" />
              </div>
            </div>
            {!isBalanced && totalDebe > 0 && (
              <p className="text-red-500 text-xs mt-1">
                El asiento no cuadra. Debe ({totalDebe.toFixed(2)}) != Haber ({totalHaber.toFixed(2)}).
                Diferencia: ${Math.abs(totalDebe - totalHaber).toFixed(2)}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateEntry}
              disabled={!isBalanced || !newEntry.description || submitting}
              className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Guardar Asiento
            </button>
            <button
              onClick={() => setShowNewForm(false)}
              className="inline-flex items-center gap-1 px-4 py-2 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300 transition-colors"
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Entries List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={24} />
          <span className="ml-2 text-sm text-slate-400">Cargando asientos...</span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">
            No hay asientos registrados para {MONTHS[filterMonth - 1]} {filterYear}.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              isExpanded={expandedEntryId === entry.id}
              onToggle={() =>
                setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)
              }
              onDelete={() => handleDeleteEntry(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryCard({
  entry,
  isExpanded,
  onToggle,
  onDelete,
}: {
  entry: any;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const lines = entry.journal_lines || [];
  const totalDebe = lines.reduce((s: number, l: any) => s + (l.debe || 0), 0);
  const totalHaber = lines.reduce((s: number, l: any) => s + (l.haber || 0), 0);

  // Fase 7: Marcar como "Pendiente de Sustento Legal" si no tiene referencia ni adjunto
  const hasLegalSupport = entry.reference || entry.attachment_url;

  return (
    <div className={`border rounded-xl overflow-hidden hover:border-slate-300 transition-colors ${
      !hasLegalSupport ? "border-amber-200" : "border-slate-200"
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {entry.is_locked && <Lock size={14} className="text-amber-500" />}
          <span className="text-xs font-mono text-slate-400">#{entry.entry_number}</span>
          <span className="text-xs text-slate-400">{entry.entry_date}</span>
          <span className="text-sm font-medium text-slate-700 text-left">
            {entry.description}
          </span>
          {entry.reference && (
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
              {entry.reference}
            </span>
          )}
          {entry.source !== "manual" && (
            <span className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-600 rounded-full">
              {entry.source}
            </span>
          )}
          {!hasLegalSupport && (
            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">
              Pendiente
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-emerald-600">
            ${totalDebe.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
          </span>
          {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
            <div className="grid grid-cols-12 gap-1 px-3 py-1.5 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
              <div className="col-span-2">Cuenta</div>
              <div className="col-span-5">Descripcion</div>
              <div className="col-span-2 text-right">Debe</div>
              <div className="col-span-2 text-right">Haber</div>
            </div>
            {lines
              .sort((a: any, b: any) => (a.line_order || 0) - (b.line_order || 0))
              .map((line: any, idx: number) => (
                <div key={idx} className="grid grid-cols-12 gap-1 px-3 py-1.5 border-t border-slate-100 text-xs">
                  <div className="col-span-2 font-mono text-slate-500">{line.account_code}</div>
                  <div className="col-span-5 text-slate-600">{line.description || "-"}</div>
                  <div className="col-span-2 text-right">
                    {line.debe > 0 ? `$${Number(line.debe).toLocaleString("es-PA", { minimumFractionDigits: 2 })}` : ""}
                  </div>
                  <div className="col-span-2 text-right">
                    {line.haber > 0 ? `$${Number(line.haber).toLocaleString("es-PA", { minimumFractionDigits: 2 })}` : ""}
                  </div>
                </div>
              ))}
            <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-slate-100 border-t border-slate-200 font-bold text-xs">
              <div className="col-span-7 text-right">TOTAL:</div>
              <div className="col-span-2 text-right text-emerald-600">
                ${totalDebe.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </div>
              <div className="col-span-2 text-right text-emerald-600">
                ${totalHaber.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {!entry.is_locked && (
            <div className="flex justify-end">
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-red-500 text-xs font-medium hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={12} />
                Eliminar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
