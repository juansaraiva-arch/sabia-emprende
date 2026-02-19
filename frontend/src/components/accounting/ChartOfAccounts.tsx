"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit3,
  Check,
  X,
  FolderTree,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { accountingApi } from "@/lib/api";
import SmartTooltip from "@/components/SmartTooltip";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  parent_code: string | null;
  level: number;
  is_header: boolean;
  normal_balance: string;
  is_active: boolean;
}

interface ChartOfAccountsProps {
  societyId: string;
}

const ACCOUNT_TYPES = [
  { value: "activo", label: "Activo" },
  { value: "pasivo", label: "Pasivo" },
  { value: "patrimonio", label: "Patrimonio" },
  { value: "ingreso", label: "Ingreso" },
  { value: "costo_gasto", label: "Costo / Gasto" },
];

const TYPE_COLORS: Record<string, string> = {
  activo: "bg-blue-100 text-blue-700",
  pasivo: "bg-red-100 text-red-700",
  patrimonio: "bg-purple-100 text-purple-700",
  ingreso: "bg-emerald-100 text-emerald-700",
  costo_gasto: "bg-amber-100 text-amber-700",
};

export default function ChartOfAccounts({ societyId }: ChartOfAccountsProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  // New account form
  const [newAccount, setNewAccount] = useState({
    account_code: "",
    account_name: "",
    account_type: "activo",
    parent_code: "",
    level: 1,
    is_header: false,
    normal_balance: "debe",
  });

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await accountingApi.listChart(societyId, false);
      setAccounts(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [societyId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleInitialize = async () => {
    setLoading(true);
    try {
      await accountingApi.initializeChart(societyId);
      await loadAccounts();
      // Expand level-1 codes by default
      setExpandedCodes(new Set(["1.0", "2.0", "3.0", "4.0", "5.0"]));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      await accountingApi.createAccount({
        ...newAccount,
        society_id: societyId,
        parent_code: newAccount.parent_code || null,
      });
      setShowNewForm(false);
      setNewAccount({
        account_code: "",
        account_name: "",
        account_type: "activo",
        parent_code: "",
        level: 1,
        is_header: false,
        normal_balance: "debe",
      });
      await loadAccounts();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleToggleActive = async (acct: Account) => {
    try {
      await accountingApi.updateAccount(societyId, acct.account_code, {
        is_active: !acct.is_active,
      });
      await loadAccounts();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCodes(new Set(accounts.filter((a) => a.is_header).map((a) => a.account_code)));
  };

  const collapseAll = () => setExpandedCodes(new Set());

  // Build tree structure
  const rootAccounts = accounts.filter((a) => a.level === 1);
  const childrenOf = (parentCode: string) =>
    accounts.filter((a) => a.parent_code === parentCode);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-slate-400" size={24} />
        <span className="ml-2 text-sm text-slate-400">Cargando plan de cuentas...</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-16">
        <FolderTree size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-600 mb-2">Plan de Cuentas</h3>
        <p className="text-sm text-slate-400 mb-6">
          Tu sociedad aun no tiene un plan de cuentas configurado.
          Inicializa el plan predeterminado para Panama con ~50 cuentas.
        </p>
        <button
          onClick={handleInitialize}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors"
        >
          <FolderTree size={16} />
          Inicializar Plan de Cuentas
        </button>
        {error && <p className="text-red-500 text-xs mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-800">Plan de Cuentas</h3>
          <SmartTooltip term="plan_cuentas" size={16} />
          <span className="text-xs text-slate-400">({accounts.length} cuentas)</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={expandAll} className="text-xs text-blue-600 hover:underline">
            Expandir
          </button>
          <span className="text-slate-300">|</span>
          <button onClick={collapseAll} className="text-xs text-blue-600 hover:underline">
            Colapsar
          </button>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={14} />
            Nueva Cuenta
          </button>
          <button
            onClick={loadAccounts}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            title="Refrescar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* New Account Form */}
      {showNewForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-blue-800">Nueva Cuenta</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600 font-medium">Codigo</label>
              <input
                type="text"
                value={newAccount.account_code}
                onChange={(e) => setNewAccount({ ...newAccount, account_code: e.target.value })}
                placeholder="ej: 1.1.3"
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium">Nombre</label>
              <input
                type="text"
                value={newAccount.account_name}
                onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
                placeholder="ej: Inventario"
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium">Tipo</label>
              <select
                value={newAccount.account_type}
                onChange={(e) => {
                  const type = e.target.value;
                  const nb = ["activo", "costo_gasto"].includes(type) ? "debe" : "haber";
                  setNewAccount({ ...newAccount, account_type: type, normal_balance: nb });
                }}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600 font-medium">Cuenta Padre (codigo)</label>
              <input
                type="text"
                value={newAccount.parent_code}
                onChange={(e) => setNewAccount({ ...newAccount, parent_code: e.target.value })}
                placeholder="ej: 1.1"
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium">Nivel</label>
              <input
                type="number"
                value={newAccount.level}
                onChange={(e) => setNewAccount({ ...newAccount, level: parseInt(e.target.value) || 1 })}
                min={1}
                max={4}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={newAccount.is_header}
                  onChange={(e) => setNewAccount({ ...newAccount, is_header: e.target.checked })}
                  className="rounded"
                />
                Es encabezado
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateAccount}
              disabled={!newAccount.account_code || !newAccount.account_name}
              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={14} />
              Guardar
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

      {/* Accounts Tree */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <div className="col-span-1">Codigo</div>
          <div className="col-span-5">Nombre</div>
          <div className="col-span-2">Tipo</div>
          <div className="col-span-2">Saldo Normal</div>
          <div className="col-span-2 text-right">Estado</div>
        </div>
        {/* Tree rows */}
        {rootAccounts.map((rootAcct) => (
          <AccountRow
            key={rootAcct.account_code}
            account={rootAcct}
            children={childrenOf}
            expandedCodes={expandedCodes}
            onToggle={toggleExpand}
            onToggleActive={handleToggleActive}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

function AccountRow({
  account,
  children,
  expandedCodes,
  onToggle,
  onToggleActive,
  depth,
}: {
  account: Account;
  children: (parentCode: string) => Account[];
  expandedCodes: Set<string>;
  onToggle: (code: string) => void;
  onToggleActive: (acct: Account) => void;
  depth: number;
}) {
  const childAccounts = children(account.account_code);
  const hasChildren = childAccounts.length > 0;
  const isExpanded = expandedCodes.has(account.account_code);
  const typeColor = TYPE_COLORS[account.account_type] || "bg-slate-100 text-slate-700";

  return (
    <>
      <div
        className={`grid grid-cols-12 gap-2 px-4 py-2.5 text-sm border-t border-slate-100 hover:bg-slate-50 transition-colors ${
          account.is_header ? "font-bold" : ""
        } ${!account.is_active ? "opacity-50" : ""}`}
      >
        <div className="col-span-1 text-slate-500 font-mono text-xs flex items-center">
          {account.account_code}
        </div>
        <div className="col-span-5 flex items-center gap-1" style={{ paddingLeft: `${depth * 16}px` }}>
          {hasChildren ? (
            <button
              onClick={() => onToggle(account.account_code)}
              className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <span className={`text-slate-700 ${account.is_header ? "font-bold" : ""}`}>
            {account.account_name}
          </span>
        </div>
        <div className="col-span-2 flex items-center">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeColor}`}>
            {account.account_type}
          </span>
        </div>
        <div className="col-span-2 flex items-center text-xs text-slate-500">
          {account.normal_balance === "debe" ? "Debe (D)" : "Haber (H)"}
        </div>
        <div className="col-span-2 flex items-center justify-end gap-2">
          {!account.is_header && (
            <button
              onClick={() => onToggleActive(account)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                account.is_active
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-slate-200 text-slate-500 hover:bg-slate-300"
              }`}
            >
              {account.is_active ? "Activa" : "Inactiva"}
            </button>
          )}
        </div>
      </div>
      {isExpanded &&
        childAccounts.map((child) => (
          <AccountRow
            key={child.account_code}
            account={child}
            children={children}
            expandedCodes={expandedCodes}
            onToggle={onToggle}
            onToggleActive={onToggleActive}
            depth={depth + 1}
          />
        ))}
    </>
  );
}
