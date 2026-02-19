"use client";
import React, { useState, useMemo } from "react";
import {
  Package,
  DollarSign,
  Plus,
  Trash2,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import SmartTooltip from "@/components/SmartTooltip";

// ============================================
// TIPOS
// ============================================

interface InventoryItem {
  id: string;
  accountCode: string;
  description: string;
  type: "activo" | "pasivo" | "patrimonio";
  openingBalance: number;
  closingBalance: number;
}

interface LibroInventariosProps {
  societyId: string;
}

// ============================================
// DATOS INICIALES (Plan de Cuentas simplificado)
// ============================================

const DEFAULT_ITEMS: InventoryItem[] = [
  // Activos
  { id: "1", accountCode: "1.1.1", description: "Caja y Bancos", type: "activo", openingBalance: 0, closingBalance: 0 },
  { id: "2", accountCode: "1.1.2", description: "Cuentas por Cobrar", type: "activo", openingBalance: 0, closingBalance: 0 },
  { id: "3", accountCode: "1.1.3", description: "Inventario de Mercancia", type: "activo", openingBalance: 0, closingBalance: 0 },
  { id: "4", accountCode: "1.2.1", description: "Mobiliario y Equipo", type: "activo", openingBalance: 0, closingBalance: 0 },
  { id: "5", accountCode: "1.2.4", description: "Depreciacion Acumulada", type: "activo", openingBalance: 0, closingBalance: 0 },
  // Pasivos
  { id: "6", accountCode: "2.1.1", description: "ITBMS por Pagar", type: "pasivo", openingBalance: 0, closingBalance: 0 },
  { id: "7", accountCode: "2.1.2", description: "Prestaciones Laborales por Pagar", type: "pasivo", openingBalance: 0, closingBalance: 0 },
  { id: "8", accountCode: "2.1.3", description: "Deudas Bancarias", type: "pasivo", openingBalance: 0, closingBalance: 0 },
  { id: "9", accountCode: "2.1.7", description: "Impuestos por Pagar", type: "pasivo", openingBalance: 0, closingBalance: 0 },
  // Patrimonio
  { id: "10", accountCode: "3.1.1", description: "Capital Social", type: "patrimonio", openingBalance: 0, closingBalance: 0 },
  { id: "11", accountCode: "3.2.1", description: "Utilidades Retenidas", type: "patrimonio", openingBalance: 0, closingBalance: 0 },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function LibroInventarios({ societyId }: LibroInventariosProps) {
  const [items, setItems] = useState<InventoryItem[]>(DEFAULT_ITEMS);
  const [fiscalYear, setFiscalYear] = useState(2026);

  const updateItem = (id: string, field: "openingBalance" | "closingBalance", value: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => {
    const newId = (items.length + 1).toString();
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        accountCode: "",
        description: "",
        type: "activo" as const,
        openingBalance: 0,
        closingBalance: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemField = (id: string, field: keyof InventoryItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Totales calculados
  const totals = useMemo(() => {
    const byType = (type: InventoryItem["type"]) => items.filter((i) => i.type === type);

    const totalActivosOpen = byType("activo").reduce((s, i) => s + i.openingBalance, 0);
    const totalActivosClose = byType("activo").reduce((s, i) => s + i.closingBalance, 0);
    const totalPasivosOpen = byType("pasivo").reduce((s, i) => s + i.openingBalance, 0);
    const totalPasivosClose = byType("pasivo").reduce((s, i) => s + i.closingBalance, 0);
    const totalPatrimonioOpen = byType("patrimonio").reduce((s, i) => s + i.openingBalance, 0);
    const totalPatrimonioClose = byType("patrimonio").reduce((s, i) => s + i.closingBalance, 0);

    return {
      activosOpen: totalActivosOpen,
      activosClose: totalActivosClose,
      pasivosOpen: totalPasivosOpen,
      pasivosClose: totalPasivosClose,
      patrimonioOpen: totalPatrimonioOpen,
      patrimonioClose: totalPatrimonioClose,
      balanceOpen: totalActivosOpen - totalPasivosOpen - totalPatrimonioOpen,
      balanceClose: totalActivosClose - totalPasivosClose - totalPatrimonioClose,
    };
  }, [items]);

  const fmt = (n: number) =>
    n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <Package size={20} className="text-blue-600" />
            Libro de Inventarios y Balances
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Registro de activos, pasivos y patrimonio al inicio y cierre del periodo fiscal (Codigo de Comercio Panama).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(parseInt(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {/* Tabla por tipo */}
      {(["activo", "pasivo", "patrimonio"] as const).map((tipo) => {
        const typeItems = items.filter((i) => i.type === tipo);
        const label = tipo === "activo" ? "Activos" : tipo === "pasivo" ? "Pasivos" : "Patrimonio";
        const color = tipo === "activo" ? "blue" : tipo === "pasivo" ? "amber" : "emerald";
        const totalOpen = tipo === "activo" ? totals.activosOpen : tipo === "pasivo" ? totals.pasivosOpen : totals.patrimonioOpen;
        const totalClose = tipo === "activo" ? totals.activosClose : tipo === "pasivo" ? totals.pasivosClose : totals.patrimonioClose;

        return (
          <div key={tipo} className="rounded-xl border border-slate-200 overflow-hidden">
            <div className={`px-4 py-2.5 bg-${color}-50 border-b border-slate-200`}>
              <h3 className={`text-sm font-bold text-${color}-800 flex items-center gap-2`}>
                {tipo === "activo" ? <TrendingUp size={14} /> : tipo === "pasivo" ? <TrendingDown size={14} /> : <BarChart3 size={14} />}
                {label}
              </h3>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <div className="col-span-2">Codigo</div>
              <div className="col-span-4">Descripcion</div>
              <div className="col-span-2 text-right">Saldo Inicial</div>
              <div className="col-span-2 text-right">Saldo Final</div>
              <div className="col-span-1 text-right">Variacion</div>
              <div className="col-span-1"></div>
            </div>

            {typeItems.map((item) => {
              const diff = item.closingBalance - item.openingBalance;
              return (
                <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-slate-100 items-center">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={item.accountCode}
                      onChange={(e) => updateItemField(item.id, "accountCode", e.target.value)}
                      className="w-full text-xs font-mono text-slate-600 border border-slate-200 rounded px-2 py-1"
                      placeholder="0.0.0"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItemField(item.id, "description", e.target.value)}
                      className="w-full text-xs text-slate-700 border border-slate-200 rounded px-2 py-1"
                      placeholder="Descripcion"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.openingBalance || ""}
                      onChange={(e) => updateItem(item.id, "openingBalance", parseFloat(e.target.value) || 0)}
                      className="w-full text-xs text-right font-medium border border-slate-200 rounded px-2 py-1"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.closingBalance || ""}
                      onChange={(e) => updateItem(item.id, "closingBalance", parseFloat(e.target.value) || 0)}
                      className="w-full text-xs text-right font-medium border border-slate-200 rounded px-2 py-1"
                      placeholder="0.00"
                    />
                  </div>
                  <div className={`col-span-1 text-xs text-right font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-slate-400"}`}>
                    {diff !== 0 ? `${diff > 0 ? "+" : ""}$${fmt(diff)}` : "—"}
                  </div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Total row */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 font-bold">
              <div className="col-span-6 text-xs text-slate-600">Total {label}</div>
              <div className="col-span-2 text-xs text-right text-slate-800">${fmt(totalOpen)}</div>
              <div className="col-span-2 text-xs text-right text-slate-800">${fmt(totalClose)}</div>
              <div className={`col-span-1 text-xs text-right ${totalClose - totalOpen > 0 ? "text-emerald-600" : totalClose - totalOpen < 0 ? "text-red-600" : "text-slate-400"}`}>
                {totalClose - totalOpen !== 0 ? `${totalClose - totalOpen > 0 ? "+" : ""}$${fmt(totalClose - totalOpen)}` : "—"}
              </div>
              <div className="col-span-1"></div>
            </div>
          </div>
        );
      })}

      {/* Agregar linea */}
      <button
        onClick={addItem}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
      >
        <Plus size={16} />
        Agregar Linea
      </button>

      {/* Ecuacion patrimonial */}
      <div className="p-4 rounded-xl bg-slate-900 text-white">
        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
          Ecuacion Patrimonial — Cierre Fiscal {fiscalYear}
        </h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Activos</p>
            <p className="text-lg font-extrabold text-blue-400">${fmt(totals.activosClose)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Pasivos + Patrimonio</p>
            <p className="text-lg font-extrabold text-amber-400">
              ${fmt(totals.pasivosClose + totals.patrimonioClose)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Diferencia</p>
            <p className={`text-lg font-extrabold ${Math.abs(totals.balanceClose) < 0.01 ? "text-emerald-400" : "text-red-400"}`}>
              ${fmt(totals.balanceClose)}
            </p>
          </div>
        </div>
        {Math.abs(totals.balanceClose) >= 0.01 && (
          <p className="text-[10px] text-red-300 text-center mt-2">
            La ecuacion no cuadra. Activos debe = Pasivos + Patrimonio.
          </p>
        )}
      </div>

      <p className="text-[10px] text-slate-400 italic">
        Libro de Inventarios y Balances conforme al Codigo de Comercio de Panama.
        Refleja la situacion patrimonial al inicio y cierre del periodo fiscal.
      </p>
    </div>
  );
}
