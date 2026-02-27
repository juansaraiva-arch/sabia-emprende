"use client";
import React from "react";
import { Landmark, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";
import SmartTooltip from "@/components/SmartTooltip";
import type { FinancialRecord } from "@/lib/calculations";

interface BalanceGeneralCardProps {
  record: FinancialRecord;
}

export default function BalanceGeneralCard({ record }: BalanceGeneralCardProps) {
  const activos = [
    { label: "Efectivo en Banco", value: record.cash_balance, term: "cash_balance" },
    { label: "Cuentas por Cobrar", value: record.accounts_receivable, term: "accounts_receivable" },
    { label: "Inventario", value: record.inventory, term: "inventory" },
  ];

  const pasivos = [
    { label: "Cuentas por Pagar", value: record.accounts_payable, term: "accounts_payable" },
    { label: "Deuda Bancaria", value: record.bank_debt, term: "bank_debt" },
  ];

  const totalActivos = activos.reduce((sum, a) => sum + (a.value || 0), 0);
  const totalPasivos = pasivos.reduce((sum, p) => sum + (p.value || 0), 0);
  const patrimonio = totalActivos - totalPasivos;

  const maxBar = Math.max(totalActivos, totalPasivos, 1);

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Landmark size={20} className="text-blue-600" />
        <h3 className="text-base font-bold text-slate-800">Balance General</h3>
        <SmartTooltip term="balance_general" size={15} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Activos */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpRight size={16} className="text-blue-600" />
            <h4 className="text-sm font-bold text-blue-800">Activos</h4>
          </div>
          <div className="space-y-2">
            {activos.map((a) => (
              <div key={a.term} className="flex items-center justify-between">
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  {a.label} <SmartTooltip term={a.term} size={12} />
                </span>
                <span className="text-xs font-bold text-blue-700">
                  ${(a.value || 0).toLocaleString("es-PA")}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-blue-200 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">Total Activos</span>
              <span className="text-sm font-extrabold text-blue-700">
                ${totalActivos.toLocaleString("es-PA")}
              </span>
            </div>
          </div>
        </div>

        {/* Pasivos */}
        <div className="p-4 rounded-xl bg-red-50 border border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownRight size={16} className="text-red-600" />
            <h4 className="text-sm font-bold text-red-800">Pasivos</h4>
          </div>
          <div className="space-y-2">
            {pasivos.map((p) => (
              <div key={p.term} className="flex items-center justify-between">
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  {p.label} <SmartTooltip term={p.term} size={12} />
                </span>
                <span className="text-xs font-bold text-red-700">
                  ${(p.value || 0).toLocaleString("es-PA")}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-red-200 flex items-center justify-between">
              <span className="text-xs font-bold text-red-900">Total Pasivos</span>
              <span className="text-sm font-extrabold text-red-700">
                ${totalPasivos.toLocaleString("es-PA")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual bar comparison */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-16">Activos</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(totalActivos / maxBar) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-16">Pasivos</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${(totalPasivos / maxBar) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Patrimonio */}
      <div className={`p-4 rounded-xl border ${
        patrimonio >= 0
          ? "bg-emerald-50 border-emerald-200"
          : "bg-red-50 border-red-200"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale size={16} className={patrimonio >= 0 ? "text-emerald-600" : "text-red-600"} />
            <span className="text-sm font-bold text-slate-700">Patrimonio Neto</span>
            <SmartTooltip text="Activos menos Pasivos. Es tu riqueza real: lo que queda despues de pagar todas las deudas." size={13} />
          </div>
          <span className={`text-lg font-extrabold ${
            patrimonio >= 0 ? "text-emerald-700" : "text-red-700"
          }`}>
            ${patrimonio.toLocaleString("es-PA")}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {patrimonio > totalActivos * 0.5
            ? "Tu empresa tiene una posicion patrimonial solida."
            : patrimonio >= 0
            ? "Patrimonio positivo pero cargado de deuda. Prioriza reducir pasivos."
            : "Patrimonio negativo: tus deudas superan tus activos. Necesitas un plan de rescate."}
        </p>
      </div>
    </div>
  );
}
