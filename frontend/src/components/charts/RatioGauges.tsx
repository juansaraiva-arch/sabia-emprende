"use client";
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import SmartTooltip from "@/components/SmartTooltip";

interface RatioGaugesProps {
  ratios: {
    margins: { gross_margin_pct: number; ebitda_margin_pct: number };
    efficiency: {
      rent_ratio_pct: number;
      payroll_ratio_pct: number;
      rent_status: string;
      payroll_status: string;
    };
    solvency: {
      acid_test: number;
      debt_coverage: number;
      acid_status: string;
      debt_status: string;
    };
    oxygen: {
      days_receivable: number;
      days_inventory: number;
      days_payable: number;
      ccc_days: number;
      trapped_cash: number;
    };
    fiscal: { annual_revenue_projected: number; itbms_status: string };
  };
}

const STATUS_COLORS: Record<string, string> = {
  ok: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const BG_TRACK = "#E2E8F0";

function getStatus(
  value: number,
  thresholds: { danger: number; warning: number },
  inverted = false
): string {
  if (inverted) {
    // Higher is worse (rent, payroll)
    if (value > thresholds.danger) return "danger";
    if (value > thresholds.warning) return "warning";
    return "ok";
  }
  // Higher is better (margins, acid test)
  if (value < thresholds.danger) return "danger";
  if (value < thresholds.warning) return "warning";
  return "ok";
}

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  status: string;
  subtitle?: string;
  tooltipTerm?: string;
}

function GaugeChart({ value, max, label, unit, status, subtitle, tooltipTerm }: GaugeProps) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const color = STATUS_COLORS[status] || STATUS_COLORS.ok;

  const data = [
    { name: "value", value: pct * 100 },
    { name: "empty", value: (1 - pct) * 100 },
  ];

  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-200">
      <div className="w-full" style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius="65%"
              outerRadius="95%"
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill={BG_TRACK} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center -mt-4">
        <p className="text-2xl font-extrabold" style={{ color }}>
          {value.toFixed(1)}
          {unit}
        </p>
        <p className="text-sm font-bold text-slate-700 mt-1 flex items-center justify-center">
          {label}
          {tooltipTerm && <SmartTooltip term={tooltipTerm} size={13} />}
        </p>
        {subtitle && (
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default function RatioGauges({ ratios }: RatioGaugesProps) {
  const ebitdaStatus = getStatus(
    ratios.margins.ebitda_margin_pct,
    { danger: 10, warning: 15 },
    false
  );
  const rentStatus = getStatus(
    ratios.efficiency.rent_ratio_pct,
    { danger: 15, warning: 10 },
    true
  );
  const payrollStatus = getStatus(
    ratios.efficiency.payroll_ratio_pct,
    { danger: 45, warning: 35 },
    true
  );
  const acidStatus = getStatus(
    ratios.solvency.acid_test,
    { danger: 0.8, warning: 1.0 },
    false
  );

  return (
    <div className="space-y-6">
      {/* Gauges grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GaugeChart
          value={ratios.margins.ebitda_margin_pct}
          max={30}
          label="Margen EBITDA"
          unit="%"
          status={ebitdaStatus}
          subtitle="Meta: >15%"
          tooltipTerm="margen_ebitda"
        />
        <GaugeChart
          value={ratios.efficiency.rent_ratio_pct}
          max={25}
          label="Alquiler / Ventas"
          unit="%"
          status={rentStatus}
          subtitle="Meta: <10%"
          tooltipTerm="rent_ratio"
        />
        <GaugeChart
          value={ratios.efficiency.payroll_ratio_pct}
          max={60}
          label="Nomina Real / Ut. Bruta"
          unit="%"
          status={payrollStatus}
          subtitle="Meta: <35% (Factor 1.36x)"
          tooltipTerm="payroll_ratio"
        />
        <GaugeChart
          value={ratios.solvency.acid_test}
          max={3}
          label="Prueba Acida"
          unit="x"
          status={acidStatus}
          subtitle="Meta: >1.0x"
          tooltipTerm="prueba_acida"
        />
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Oxigeno (CCC) */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center">
            Oxigeno (Ciclo Caja)
            <SmartTooltip term="ccc" size={13} />
          </h4>
          <div className="space-y-2">
            <DetailRow
              label="Dias Cobro"
              value={`${ratios.oxygen.days_receivable} dias`}
            />
            <DetailRow
              label="Dias Inventario"
              value={`${ratios.oxygen.days_inventory} dias`}
            />
            <DetailRow
              label="Dias Proveedor"
              value={`${ratios.oxygen.days_payable} dias`}
            />
            <div className="pt-2 border-t border-slate-100">
              <DetailRow
                label="Ciclo Total (CCC)"
                value={`${ratios.oxygen.ccc_days} dias`}
                bold
                status={ratios.oxygen.ccc_days > 60 ? "danger" : "ok"}
              />
            </div>
            <DetailRow
              label="Dinero Atrapado"
              value={`$${ratios.oxygen.trapped_cash.toLocaleString("es-PA")}`}
            />
          </div>
        </div>

        {/* Solvencia */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center">
            Solvencia
            <SmartTooltip term="cobertura_deuda" size={13} />
          </h4>
          <div className="space-y-2">
            <DetailRow
              label="Prueba Acida"
              value={`${ratios.solvency.acid_test}x`}
              status={ratios.solvency.acid_status}
              bold
            />
            <DetailRow
              label="Cobertura Deuda"
              value={`${ratios.solvency.debt_coverage}x`}
              status={ratios.solvency.debt_status}
              bold
            />
            <p className="text-[10px] text-slate-400 mt-2">
              Acida Meta: &gt;1.0x | Cobertura Meta: &gt;1.5x
            </p>
          </div>
        </div>

        {/* Fiscal */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center">
            Radar Fiscal (ITBMS)
            <SmartTooltip term="itbms" size={13} />
          </h4>
          <div className="space-y-2">
            <DetailRow
              label="Venta Anual Proy."
              value={`$${ratios.fiscal.annual_revenue_projected.toLocaleString("es-PA")}`}
            />
            <div className="mt-2">
              <ITBMSBadge status={ratios.fiscal.itbms_status} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold = false,
  status,
}: {
  label: string;
  value: string;
  bold?: boolean;
  status?: string;
}) {
  const statusColors: Record<string, string> = {
    ok: "text-emerald-700 bg-emerald-50 border-emerald-200",
    warning: "text-amber-700 bg-amber-50 border-amber-200",
    danger: "text-red-700 bg-red-50 border-red-200",
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      {status ? (
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded border ${statusColors[status] || ""}`}
        >
          {value}
        </span>
      ) : (
        <span
          className={`text-sm text-slate-700 ${bold ? "font-bold" : ""}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function ITBMSBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string; desc: string }> = {
    libre: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
      label: "LIBRE",
      desc: "Regimen Simplificado. No cobras ITBMS.",
    },
    precaucion: {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      label: "PRECAUCION",
      desc: "Cerca del limite de $36k anuales.",
    },
    obligatorio: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-700",
      label: "OBLIGATORIO",
      desc: "Debes cobrar 7% de ITBMS.",
    },
  };
  const s = styles[status] || styles.libre;

  return (
    <div className={`p-3 rounded-lg border ${s.bg}`}>
      <span className={`text-sm font-extrabold ${s.text}`}>{s.label}</span>
      <p className={`text-[10px] mt-1 ${s.text} opacity-80`}>{s.desc}</p>
    </div>
  );
}
