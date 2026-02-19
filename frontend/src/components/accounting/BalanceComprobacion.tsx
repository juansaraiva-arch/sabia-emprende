"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Scale, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { accountingApi } from "@/lib/api";
import SmartTooltip from "@/components/SmartTooltip";

interface BalanceComprobacionProps {
  societyId: string;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TYPE_COLORS: Record<string, string> = {
  activo: "text-blue-600",
  pasivo: "text-red-600",
  patrimonio: "text-purple-600",
  ingreso: "text-emerald-600",
  costo_gasto: "text-amber-600",
};

export default function BalanceComprobacion({ societyId }: BalanceComprobacionProps) {
  const [trialData, setTrialData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Period filter
  const now = new Date();
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);
  const [filterEnabled, setFilterEnabled] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<"4col" | "summary">("4col");

  const loadTrialBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await accountingApi.getTrialBalance(
        societyId,
        filterEnabled ? filterYear : undefined,
        filterEnabled ? filterMonth : undefined
      );
      setTrialData(res.data);
    } catch (e: any) {
      setError(e.message);
      setTrialData(null);
    } finally {
      setLoading(false);
    }
  }, [societyId, filterYear, filterMonth, filterEnabled]);

  useEffect(() => {
    loadTrialBalance();
  }, [loadTrialBalance]);

  const isBalanced = trialData ? Math.abs(trialData.total_saldo_debe - trialData.total_saldo_haber) < 0.01 : false;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-800">Balance de Comprobacion</h3>
          <SmartTooltip term="balance_comprobacion" size={16} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("4col")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "4col" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"
              }`}
            >
              4 Columnas
            </button>
            <button
              onClick={() => setViewMode("summary")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === "summary" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"
              }`}
            >
              Resumen
            </button>
          </div>
          <button
            onClick={loadTrialBalance}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            title="Refrescar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.checked)}
            className="rounded"
          />
          Filtrar por periodo
        </label>
        {filterEnabled && (
          <>
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
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-slate-400" size={24} />
          <span className="ml-2 text-sm text-slate-400">Calculando balance...</span>
        </div>
      ) : !trialData || !trialData.accounts?.length ? (
        <div className="text-center py-16">
          <Scale size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">
            No hay movimientos contables para generar el balance de comprobacion.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status badge */}
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
            isBalanced
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {isBalanced ? (
              <>
                <CheckCircle2 size={18} />
                Balance de Comprobacion cuadrado correctamente.
              </>
            ) : (
              <>
                <AlertCircle size={18} />
                El balance NO cuadra. Revisar los asientos del periodo.
              </>
            )}
          </div>

          {viewMode === "4col" ? (
            <FourColumnView data={trialData} />
          ) : (
            <SummaryView data={trialData} />
          )}
        </div>
      )}
    </div>
  );
}

function FourColumnView({ data }: { data: any }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-1 px-4 py-2.5 bg-slate-100">
        <div className="col-span-1 text-[10px] font-bold text-slate-500 uppercase">Codigo</div>
        <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase">Cuenta</div>
        <div className="col-span-2 text-right text-[10px] font-bold text-slate-500 uppercase">Debe</div>
        <div className="col-span-2 text-right text-[10px] font-bold text-slate-500 uppercase">Haber</div>
        <div className="col-span-2 text-right text-[10px] font-bold text-slate-500 uppercase">Saldo Debe</div>
        <div className="col-span-2 text-right text-[10px] font-bold text-slate-500 uppercase">Saldo Haber</div>
      </div>

      {/* Account rows */}
      {data.accounts.map((acct: any, idx: number) => {
        const typeColor = TYPE_COLORS[acct.account_type] || "text-slate-600";
        return (
          <div
            key={idx}
            className="grid grid-cols-12 gap-1 px-4 py-2 border-t border-slate-100 text-xs hover:bg-slate-50 transition-colors"
          >
            <div className="col-span-1 font-mono text-slate-400">{acct.account_code}</div>
            <div className={`col-span-3 font-medium ${typeColor}`}>{acct.account_name}</div>
            <div className="col-span-2 text-right text-slate-600">
              {acct.total_debe > 0 ? `$${Number(acct.total_debe).toLocaleString("es-PA", { minimumFractionDigits: 2 })}` : "-"}
            </div>
            <div className="col-span-2 text-right text-slate-600">
              {acct.total_haber > 0 ? `$${Number(acct.total_haber).toLocaleString("es-PA", { minimumFractionDigits: 2 })}` : "-"}
            </div>
            <div className="col-span-2 text-right font-medium">
              {acct.saldo_debe > 0 ? (
                <span className="text-blue-600">${Number(acct.saldo_debe).toLocaleString("es-PA", { minimumFractionDigits: 2 })}</span>
              ) : "-"}
            </div>
            <div className="col-span-2 text-right font-medium">
              {acct.saldo_haber > 0 ? (
                <span className="text-red-600">${Number(acct.saldo_haber).toLocaleString("es-PA", { minimumFractionDigits: 2 })}</span>
              ) : "-"}
            </div>
          </div>
        );
      })}

      {/* Totals row */}
      <div className="grid grid-cols-12 gap-1 px-4 py-3 bg-slate-800 text-white text-xs font-bold">
        <div className="col-span-4">TOTALES</div>
        <div className="col-span-2 text-right">
          ${Number(data.total_debe).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
        </div>
        <div className="col-span-2 text-right">
          ${Number(data.total_haber).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
        </div>
        <div className="col-span-2 text-right text-emerald-400">
          ${Number(data.total_saldo_debe).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
        </div>
        <div className="col-span-2 text-right text-emerald-400">
          ${Number(data.total_saldo_haber).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

function SummaryView({ data }: { data: any }) {
  // Group by account type
  const grouped: Record<string, { accounts: any[]; totalDebe: number; totalHaber: number }> = {};
  for (const acct of data.accounts) {
    const type = acct.account_type;
    if (!grouped[type]) {
      grouped[type] = { accounts: [], totalDebe: 0, totalHaber: 0 };
    }
    grouped[type].accounts.push(acct);
    grouped[type].totalDebe += acct.saldo_debe || 0;
    grouped[type].totalHaber += acct.saldo_haber || 0;
  }

  const typeLabels: Record<string, string> = {
    activo: "Activos",
    pasivo: "Pasivos",
    patrimonio: "Patrimonio",
    ingreso: "Ingresos",
    costo_gasto: "Costos y Gastos",
  };

  const typeOrder = ["activo", "pasivo", "patrimonio", "ingreso", "costo_gasto"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {typeOrder.map((type) => {
        const group = grouped[type];
        if (!group || group.accounts.length === 0) return null;
        const bgColors: Record<string, string> = {
          activo: "border-blue-200 bg-blue-50/50",
          pasivo: "border-red-200 bg-red-50/50",
          patrimonio: "border-purple-200 bg-purple-50/50",
          ingreso: "border-emerald-200 bg-emerald-50/50",
          costo_gasto: "border-amber-200 bg-amber-50/50",
        };
        const headerColors: Record<string, string> = {
          activo: "text-blue-700",
          pasivo: "text-red-700",
          patrimonio: "text-purple-700",
          ingreso: "text-emerald-700",
          costo_gasto: "text-amber-700",
        };

        const netBalance = group.totalDebe - group.totalHaber;

        return (
          <div
            key={type}
            className={`border rounded-xl overflow-hidden ${bgColors[type] || "border-slate-200"}`}
          >
            <div className="px-4 py-3 border-b border-inherit">
              <h4 className={`text-sm font-bold ${headerColors[type] || "text-slate-700"}`}>
                {typeLabels[type] || type}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {group.accounts.length} cuenta{group.accounts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="px-4 py-2 space-y-1">
              {group.accounts.map((acct: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-slate-600 truncate mr-2">
                    {acct.account_code} {acct.account_name}
                  </span>
                  <span className="font-bold whitespace-nowrap">
                    {acct.saldo_debe > 0
                      ? `D $${Number(acct.saldo_debe).toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                      : acct.saldo_haber > 0
                      ? `H $${Number(acct.saldo_haber).toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                      : "$0.00"}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-inherit">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Saldo Neto:</span>
                <span className={netBalance >= 0 ? "text-blue-700" : "text-red-700"}>
                  ${Math.abs(netBalance).toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                  {netBalance >= 0 ? " (D)" : " (H)"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
