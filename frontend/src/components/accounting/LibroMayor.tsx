"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Loader2, BookMarked, RefreshCw, ArrowUpDown } from "lucide-react";
import { accountingApi } from "@/lib/api";
import { DEFAULT_PANAMA_CHART } from "@/components/accounting/ChartOfAccounts";
import SmartTooltip from "@/components/SmartTooltip";

interface LibroMayorProps {
  societyId: string;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function LibroMayor({ societyId }: LibroMayorProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>("");
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Period filter
  const now = new Date();
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);
  const [filterEnabled, setFilterEnabled] = useState(true);

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const res = await accountingApi.listChart(societyId, true);
      const allAccounts = Array.isArray(res.data) ? res.data : [];
      const detailAccounts = allAccounts.filter((a: any) => !a.is_header);
      if (detailAccounts.length > 0) {
        setAccounts(detailAccounts);
        if (!selectedAccountCode) {
          setSelectedAccountCode(detailAccounts[0].account_code);
        }
      } else {
        // Demo mode: usar plan de cuentas local
        const fallback = DEFAULT_PANAMA_CHART.filter((a) => !a.is_header);
        setAccounts(fallback);
        if (!selectedAccountCode && fallback.length > 0) {
          setSelectedAccountCode(fallback[0].account_code);
        }
      }
    } catch (e: any) {
      // Error de conexion: usar plan local
      const fallback = DEFAULT_PANAMA_CHART.filter((a) => !a.is_header);
      setAccounts(fallback);
      if (!selectedAccountCode && fallback.length > 0) {
        setSelectedAccountCode(fallback[0].account_code);
      }
    } finally {
      setLoadingAccounts(false);
    }
  }, [societyId]);

  const loadLedger = useCallback(async () => {
    if (!selectedAccountCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await accountingApi.getLedger(
        societyId,
        selectedAccountCode,
        filterEnabled ? filterYear : undefined,
        filterEnabled ? filterMonth : undefined
      );
      // Si data es un array vacio (demo mode), mostrar estructura vacia valida
      if (Array.isArray(res.data) && res.data.length === 0) {
        const acct = accounts.find((a) => a.account_code === selectedAccountCode);
        setLedgerData({
          account_code: selectedAccountCode,
          account_name: acct?.account_name || selectedAccountCode,
          movements: [],
          saldo_inicial: 0,
          saldo_final: 0,
          total_debe: 0,
          total_haber: 0,
        });
      } else {
        setLedgerData(res.data);
      }
    } catch (e: any) {
      setError(e.message);
      setLedgerData(null);
    } finally {
      setLoading(false);
    }
  }, [societyId, selectedAccountCode, filterYear, filterMonth, filterEnabled, accounts]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (selectedAccountCode) loadLedger();
  }, [loadLedger, selectedAccountCode]);

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-slate-400" size={24} />
        <span className="ml-2 text-sm text-slate-400">Cargando cuentas...</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-16">
        <BookMarked size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-400">
          Primero inicializa el Plan de Cuentas para consultar el Libro Mayor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold text-slate-800">Libro Mayor</h3>
        <SmartTooltip term="libro_mayor" size={16} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-500 font-medium mb-1 block">Cuenta</label>
          <select
            value={selectedAccountCode}
            onChange={(e) => setSelectedAccountCode(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            {accounts.map((a) => (
              <option key={a.account_code} value={a.account_code}>
                {a.account_code} - {a.account_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.checked)}
              className="rounded"
            />
            Filtrar por periodo
          </label>
        </div>

        {filterEnabled && (
          <>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">Mes</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="px-2 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">Ano</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="px-2 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          onClick={loadLedger}
          className="self-end p-2 text-slate-400 hover:text-slate-600 transition-colors"
          title="Consultar"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">{error}</div>
      )}

      {/* Ledger Result */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={24} />
          <span className="ml-2 text-sm text-slate-400">Consultando mayor...</span>
        </div>
      ) : ledgerData ? (
        <div className="space-y-3">
          {/* Account summary card */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4 rounded-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs text-slate-300">Cuenta {selectedAccountCode}</p>
                <p className="text-lg font-bold">
                  {ledgerData.account_name || ""}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tipo: {ledgerData.account_type || ""} | Saldo Normal: {ledgerData.normal_balance === "debe" ? "Debe" : "Haber"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-300">Saldo Final</p>
                <p className={`text-2xl font-extrabold ${
                  ledgerData.final_balance >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  ${Number(ledgerData.final_balance || 0).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-slate-600">
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Total Debe</p>
                <p className="text-sm font-bold">${Number(ledgerData.total_debe || 0).toLocaleString("es-PA", { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Total Haber</p>
                <p className="text-sm font-bold">${Number(ledgerData.total_haber || 0).toLocaleString("es-PA", { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Movimientos</p>
                <p className="text-sm font-bold">{ledgerData.lines?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Movements table */}
          {ledgerData.lines?.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-2">Fecha</div>
                <div className="col-span-1">No.</div>
                <div className="col-span-3">Descripcion</div>
                <div className="col-span-2 text-right">Debe</div>
                <div className="col-span-2 text-right">Haber</div>
                <div className="col-span-2 text-right">Saldo</div>
              </div>
              {ledgerData.lines.map((line: any, idx: number) => (
                <div key={idx} className="grid grid-cols-12 gap-1 px-4 py-2 border-t border-slate-100 text-xs hover:bg-slate-50 transition-colors">
                  <div className="col-span-2 text-slate-500">{line.entry_date}</div>
                  <div className="col-span-1 font-mono text-slate-400">#{line.entry_number}</div>
                  <div className="col-span-3 text-slate-600 truncate">
                    {line.description || line.reference || "-"}
                  </div>
                  <div className="col-span-2 text-right">
                    {line.debe > 0 ? (
                      <span className="text-blue-600 font-medium">${Number(line.debe).toLocaleString("es-PA", { minimumFractionDigits: 2 })}</span>
                    ) : (
                      ""
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    {line.haber > 0 ? (
                      <span className="text-red-500 font-medium">${Number(line.haber).toLocaleString("es-PA", { minimumFractionDigits: 2 })}</span>
                    ) : (
                      ""
                    )}
                  </div>
                  <div className="col-span-2 text-right font-bold">
                    <span className={line.running_balance >= 0 ? "text-slate-700" : "text-red-600"}>
                      ${Number(line.running_balance).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ArrowUpDown size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">
                No hay movimientos para esta cuenta en el periodo seleccionado.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
