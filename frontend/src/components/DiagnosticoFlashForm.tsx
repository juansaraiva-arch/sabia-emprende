"use client";
import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Save,
  HelpCircle,
  DollarSign,
  ShoppingCart,
  Building2,
  Users,
  Zap,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Landmark,
  Package,
  CreditCard,
  Banknote,
  HandCoins,
  Calculator,
  Home,
} from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";
import SmartTooltip from "@/components/SmartTooltip";

// ============================================
// TIPOS
// ============================================

interface DiagnosticoFlashFormProps {
  onSave: (record: FinancialRecord) => void;
  onBackToMenu?: () => void;
}

interface FormData {
  revenue: number;
  cogs: number;
  opex_rent: number;
  opex_payroll: number;
  opex_other: number;
  depreciation: number;
  interest_expense: number;
  tax_expense: number;
  cash_balance: number;
  accounts_receivable: number;
  inventory: number;
  accounts_payable: number;
  bank_debt: number;
}

const INITIAL_DATA: FormData = {
  revenue: 0,
  cogs: 0,
  opex_rent: 0,
  opex_payroll: 0,
  opex_other: 0,
  depreciation: 0,
  interest_expense: 0,
  tax_expense: 0,
  cash_balance: 0,
  accounts_receivable: 0,
  inventory: 0,
  accounts_payable: 0,
  bank_debt: 0,
};

const STEP_LABELS = [
  "Ingresos Operativos",
  "Costos Fijos (OPEX)",
  "Partidas No Operativas",
  "Posicion Patrimonial (Balance)",
  "Reporting (Estados Financieros)",
];

// ============================================
// HELPER: TOOLTIP
// ============================================

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onBlur={() => setOpen(false)}
        className="text-slate-400 hover:text-violet-500 transition-colors"
        aria-label="Mas informacion"
      >
        <HelpCircle size={16} />
      </button>
      {open && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl shadow-lg z-30 leading-relaxed">
          {text}
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45 -mt-1" />
        </span>
      )}
    </span>
  );
}

// ============================================
// HELPER: CURRENCY INPUT
// ============================================

function CurrencyInput({
  label,
  tooltip,
  tooltipTerm,
  value,
  onChange,
  icon,
}: {
  label: string;
  tooltip?: string;
  tooltipTerm?: string;
  value: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
}) {
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? value.toString() : ""
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    setDisplayValue(raw);
    const num = parseFloat(raw);
    onChange(isNaN(num) ? 0 : num);
  };

  const handleBlur = () => {
    const num = parseFloat(displayValue);
    if (isNaN(num) || num === 0) {
      setDisplayValue("");
      onChange(0);
    } else {
      setDisplayValue(num.toString());
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center text-sm font-bold text-slate-700">
        {icon && <span className="mr-2 text-slate-400">{icon}</span>}
        {label}
        {tooltipTerm && <SmartTooltip term={tooltipTerm} size={14} />}
        {tooltip && !tooltipTerm && <Tooltip text={tooltip} />}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-emerald-500">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="0.00"
          className="w-full pl-10 pr-4 py-4 text-lg font-bold text-slate-800 bg-white border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all min-h-[56px] placeholder:text-slate-300"
        />
      </div>
    </div>
  );
}

// ============================================
// HELPER: FORMAT CURRENCY
// ============================================

function fmt(n: number): string {
  return n.toLocaleString("es-PA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function DiagnosticoFlashForm({
  onSave,
  onBackToMenu,
}: DiagnosticoFlashFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>({ ...INITIAL_DATA });
  const [step3Open, setStep3Open] = useState(false);
  const [step4Open, setStep4Open] = useState(false);

  // --- Setter helper ---
  const set = (field: keyof FormData) => (value: number) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // --- Calculated values ---
  const grossProfit = useMemo(() => data.revenue - data.cogs, [data.revenue, data.cogs]);
  const totalOpex = useMemo(
    () => data.opex_rent + data.opex_payroll + data.opex_other,
    [data.opex_rent, data.opex_payroll, data.opex_other]
  );
  const ebitda = useMemo(() => grossProfit - totalOpex, [grossProfit, totalOpex]);
  const ebit = useMemo(() => ebitda - data.depreciation, [ebitda, data.depreciation]);
  const ebt = useMemo(() => ebit - data.interest_expense, [ebit, data.interest_expense]);
  const netIncome = useMemo(
    () => ebt - data.tax_expense,
    [ebt, data.tax_expense]
  );

  // --- Navigation ---
  const canNext = step < 4;
  const canPrev = step > 0;

  const goNext = () => {
    if (canNext) setStep((s) => s + 1);
  };
  const goPrev = () => {
    if (canPrev) setStep((s) => s - 1);
  };

  // --- Save ---
  const handleSave = () => {
    const record: FinancialRecord = { ...data };
    onSave(record);
  };

  return (
    <div className="space-y-6">
      {/* ====== BACK TO MENU BUTTON ====== */}
      {onBackToMenu && (
        <button
          onClick={onBackToMenu}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors"
        >
          <Home size={16} />
          Volver a elegir modo
        </button>
      )}

      {/* ====== PROGRESS BAR ====== */}
      <div className="flex items-center justify-between px-2">
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={label}>
            {/* Circle */}
            <button
              onClick={() => setStep(i)}
              className="flex flex-col items-center gap-1 group"
              aria-label={`Paso ${i + 1}: ${label}`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold text-sm transition-all ${
                  i < step
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : i === step
                      ? "bg-violet-500 border-violet-500 text-white scale-110 shadow-md shadow-violet-500/30"
                      : "bg-white border-slate-200 text-slate-400 group-hover:border-slate-400"
                }`}
              >
                {i < step ? <CheckCircle2 size={18} /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${
                  i === step ? "text-violet-600" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </button>

            {/* Line between circles */}
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 rounded-full transition-colors ${
                  i < step ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ====== STEP TITLE ====== */}
      <div className="text-center">
        <h3 className="text-xl font-extrabold text-slate-800 font-heading">
          {STEP_LABELS[step]}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Paso {step + 1} de {STEP_LABELS.length}
        </p>
      </div>

      {/* ====== STEP CONTENT ====== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        {/* --- STEP 1: Ingresos Operativos --- */}
        {step === 0 && (
          <>
            <CurrencyInput
              label="Cuanto vendiste este mes?"
              tooltipTerm="revenue"
              value={data.revenue}
              onChange={set("revenue")}
              icon={<DollarSign size={18} />}
            />
            <CurrencyInput
              label="Cuanto te costo lo que vendiste?"
              tooltipTerm="cogs"
              value={data.cogs}
              onChange={set("cogs")}
              icon={<ShoppingCart size={18} />}
            />

            {/* Calculated: Utilidad Bruta */}
            {(data.revenue > 0 || data.cogs > 0) && (
              <div
                className={`p-4 rounded-xl border-2 ${
                  grossProfit >= 0
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
                  Utilidad Bruta
                  <SmartTooltip term="gross_profit" size={14} />
                </p>
                <p
                  className={`text-2xl font-extrabold ${
                    grossProfit >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  ${fmt(grossProfit)}
                </p>
                {data.revenue > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Margen bruto:{" "}
                    <span className="font-bold text-slate-700">
                      {((grossProfit / data.revenue) * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* --- STEP 2: Costos Fijos (OPEX) --- */}
        {step === 1 && (
          <>
            <CurrencyInput
              label="Alquiler del local"
              tooltipTerm="opex_rent"
              value={data.opex_rent}
              onChange={set("opex_rent")}
              icon={<Building2 size={18} />}
            />
            <CurrencyInput
              label="Nomina total (sueldos)"
              tooltipTerm="opex_payroll"
              value={data.opex_payroll}
              onChange={set("opex_payroll")}
              icon={<Users size={18} />}
            />
            <CurrencyInput
              label="Otros gastos (luz, agua, internet, publicidad)"
              tooltipTerm="opex"
              value={data.opex_other}
              onChange={set("opex_other")}
              icon={<Zap size={18} />}
            />

            {/* Calculated: EBITDA */}
            {(grossProfit !== 0 || totalOpex > 0) && (
              <div
                className={`p-4 rounded-xl border-2 ${
                  ebitda >= 0
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
                  EBITDA (lo que te queda)
                  <SmartTooltip term="ebitda" size={14} />
                </p>
                <p
                  className={`text-2xl font-extrabold ${
                    ebitda >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  ${fmt(ebitda)}
                </p>
                {data.revenue > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Margen EBITDA:{" "}
                    <span className="font-bold text-slate-700">
                      {((ebitda / data.revenue) * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* --- STEP 3: Partidas No Operativas (Opcional) --- */}
        {step === 2 && (
          <>
            <div className="text-center space-y-2 py-2">
              <p className="text-sm text-slate-500">
                Estos datos son opcionales. Si no los tienes, puedes saltar al
                siguiente paso.
              </p>
            </div>

            <button
              onClick={() => setStep3Open(!step3Open)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border-2 border-violet-200 rounded-xl transition-colors min-h-[48px]"
            >
              {step3Open ? (
                <>
                  <ChevronUp size={18} />
                  Ocultar detalles
                </>
              ) : (
                <>
                  <ChevronDown size={18} />
                  Quiero agregar mas detalles
                </>
              )}
            </button>

            {step3Open && (
              <div className="space-y-5 pt-2">
                <CurrencyInput
                  label="Depreciacion"
                  tooltipTerm="depreciation"
                  value={data.depreciation}
                  onChange={set("depreciation")}
                  icon={<TrendingUp size={18} />}
                />
                <CurrencyInput
                  label="Intereses de prestamos"
                  tooltipTerm="interest_expense"
                  value={data.interest_expense}
                  onChange={set("interest_expense")}
                  icon={<CreditCard size={18} />}
                />
                <CurrencyInput
                  label="Impuestos estimados"
                  tooltipTerm="tax_expense"
                  value={data.tax_expense}
                  onChange={set("tax_expense")}
                  icon={<Landmark size={18} />}
                />
              </div>
            )}
          </>
        )}

        {/* --- STEP 4: Posicion Patrimonial (Balance) (Opcional) --- */}
        {step === 3 && (
          <>
            <div className="text-center space-y-2 py-2">
              <p className="text-sm text-slate-500">
                Datos de tu balance actual. Son opcionales pero ayudan a darte
                un diagnostico mas completo.
              </p>
            </div>

            <button
              onClick={() => setStep4Open(!step4Open)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl transition-colors min-h-[48px]"
            >
              {step4Open ? (
                <>
                  <ChevronUp size={18} />
                  Ocultar detalles
                </>
              ) : (
                <>
                  <ChevronDown size={18} />
                  Quiero agregar datos de mi caja
                </>
              )}
            </button>

            {step4Open && (
              <div className="space-y-5 pt-2">
                <CurrencyInput
                  label="Efectivo en banco"
                  tooltipTerm="cash_balance"
                  value={data.cash_balance}
                  onChange={set("cash_balance")}
                  icon={<Banknote size={18} />}
                />
                <CurrencyInput
                  label="Clientes que te deben"
                  tooltipTerm="accounts_receivable"
                  value={data.accounts_receivable}
                  onChange={set("accounts_receivable")}
                  icon={<HandCoins size={18} />}
                />
                <CurrencyInput
                  label="Inventario (mercancia en bodega)"
                  tooltipTerm="inventory"
                  value={data.inventory}
                  onChange={set("inventory")}
                  icon={<Package size={18} />}
                />
                <CurrencyInput
                  label="Tu le debes a proveedores"
                  tooltipTerm="accounts_payable"
                  value={data.accounts_payable}
                  onChange={set("accounts_payable")}
                  icon={<ShoppingCart size={18} />}
                />
                <CurrencyInput
                  label="Deuda bancaria total"
                  tooltipTerm="bank_debt"
                  value={data.bank_debt}
                  onChange={set("bank_debt")}
                  icon={<CreditCard size={18} />}
                />
              </div>
            )}
          </>
        )}

        {/* --- STEP 5: Reporting (Estados Financieros) --- */}
        {step === 4 && (
          <div className="space-y-5">
            {/* Mini P&L Waterfall */}
            <div className="space-y-2">
              <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Calculator size={16} className="text-violet-500" />
                Estado de Resultados
              </h4>

              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden">
                <SummaryRow
                  label="Ventas"
                  value={data.revenue}
                  color="text-slate-800"
                  bold
                />
                <SummaryRow
                  label="(-) Costo de Ventas"
                  value={data.cogs}
                  color="text-red-600"
                  negative
                />
                <SummaryRow
                  label="= Utilidad Bruta"
                  value={grossProfit}
                  color={grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}
                  bold
                  highlight
                />
                <SummaryRow
                  label="(-) Alquiler"
                  value={data.opex_rent}
                  color="text-red-600"
                  negative
                />
                <SummaryRow
                  label="(-) Nomina"
                  value={data.opex_payroll}
                  color="text-red-600"
                  negative
                />
                <SummaryRow
                  label="(-) Otros gastos"
                  value={data.opex_other}
                  color="text-red-600"
                  negative
                />
                <SummaryRow
                  label="= EBITDA"
                  value={ebitda}
                  color={ebitda >= 0 ? "text-emerald-600" : "text-red-600"}
                  bold
                  highlight
                />
                {(data.depreciation > 0 ||
                  data.interest_expense > 0 ||
                  data.tax_expense > 0) && (
                  <>
                    <SummaryRow
                      label="(-) Depreciacion"
                      value={data.depreciation}
                      color="text-red-600"
                      negative
                    />
                    <SummaryRow
                      label="= EBIT"
                      value={ebit}
                      color={ebit >= 0 ? "text-emerald-600" : "text-red-600"}
                      bold
                      highlight
                    />
                    <SummaryRow
                      label="(-) Intereses"
                      value={data.interest_expense}
                      color="text-red-600"
                      negative
                    />
                    <SummaryRow
                      label="= EBT"
                      value={ebt}
                      color={ebt >= 0 ? "text-emerald-600" : "text-red-600"}
                      bold
                      highlight
                    />
                    <SummaryRow
                      label="(-) Impuestos"
                      value={data.tax_expense}
                      color="text-red-600"
                      negative
                    />
                  </>
                )}
                <SummaryRow
                  label="= Utilidad Neta"
                  value={netIncome}
                  color={netIncome >= 0 ? "text-emerald-600" : "text-red-600"}
                  bold
                  highlight
                  large
                />
              </div>
            </div>

            {/* Balance Sheet summary (if any values) */}
            {(data.cash_balance > 0 ||
              data.accounts_receivable > 0 ||
              data.inventory > 0 ||
              data.accounts_payable > 0 ||
              data.bank_debt > 0) && (
              <div className="space-y-2">
                <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Banknote size={16} className="text-blue-500" />
                  Datos de Balance
                </h4>
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden">
                  <SummaryRow
                    label="Efectivo en banco"
                    value={data.cash_balance}
                    color="text-blue-600"
                  />
                  <SummaryRow
                    label="Clientes que te deben"
                    value={data.accounts_receivable}
                    color="text-blue-600"
                  />
                  <SummaryRow
                    label="Inventario"
                    value={data.inventory}
                    color="text-blue-600"
                  />
                  <SummaryRow
                    label="Deuda a proveedores"
                    value={data.accounts_payable}
                    color="text-amber-600"
                  />
                  <SummaryRow
                    label="Deuda bancaria"
                    value={data.bank_debt}
                    color="text-amber-600"
                  />
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] transition-all min-h-[56px]"
            >
              <Save size={22} />
              Guardar Diagnostico
            </button>
          </div>
        )}
      </div>

      {/* ====== NAVIGATION BUTTONS ====== */}
      {step < 4 && (
        <div className="flex gap-3">
          {canPrev && (
            <button
              onClick={goPrev}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors min-h-[48px]"
            >
              <ChevronLeft size={18} />
              Anterior
            </button>
          )}
          <button
            onClick={goNext}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-colors min-h-[48px]"
          >
            Siguiente
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 4 && step > 0 && (
        <button
          onClick={goPrev}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors min-h-[48px]"
        >
          <ChevronLeft size={18} />
          Anterior
        </button>
      )}
    </div>
  );
}

// ============================================
// HELPER: SUMMARY ROW
// ============================================

function SummaryRow({
  label,
  value,
  color,
  bold = false,
  negative = false,
  highlight = false,
  large = false,
}: {
  label: string;
  value: number;
  color: string;
  bold?: boolean;
  negative?: boolean;
  highlight?: boolean;
  large?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${
        highlight ? "bg-slate-50" : "bg-white"
      }`}
    >
      <span
        className={`${large ? "text-sm" : "text-xs"} ${
          bold ? "font-extrabold" : "font-medium"
        } text-slate-500`}
      >
        {label}
      </span>
      <span
        className={`${large ? "text-lg" : "text-sm"} ${
          bold ? "font-extrabold" : "font-bold"
        } ${color} tabular-nums`}
      >
        {negative && value > 0 && "-"}${fmt(Math.abs(value))}
      </span>
    </div>
  );
}
