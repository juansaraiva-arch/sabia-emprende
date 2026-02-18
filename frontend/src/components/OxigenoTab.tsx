"use client";
import React, { useMemo } from "react";
import {
  Wind,
  Droplets,
  Clock,
  Warehouse,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  ShieldCheck,
} from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";
import { computeOxigeno } from "@/lib/calculations";
import SmartTooltip from "@/components/SmartTooltip";

// ============================================
// TIPOS
// ============================================

interface OxigenoTabProps {
  record: FinancialRecord;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function OxigenoTab({ record }: OxigenoTabProps) {
  const ox = useMemo(() => computeOxigeno(record), [record]);

  // Estado general
  const isHealthy =
    ox.pruebaAcida >= 1.0 && ox.ccc < 45 && ox.coberturaBancaria >= 1.5;
  const isCritical =
    ox.pruebaAcida < 0.5 || ox.ccc > 90 || ox.coberturaBancaria < 1.0;

  return (
    <div className="space-y-6">
      {/* ====== HEADER ====== */}
      <div className="flex items-center gap-2">
        <Wind size={20} className="text-cyan-600" />
        <h3 className="text-lg font-extrabold text-slate-800">
          Oxigeno del Negocio
        </h3>
        <span
          className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${
            isHealthy
              ? "bg-emerald-100 text-emerald-700"
              : isCritical
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
          }`}
        >
          {isHealthy
            ? "Respira Bien"
            : isCritical
              ? "Asfixia"
              : "Cuidado"}
        </span>
      </div>

      {/* ====== PRUEBA ACIDA ====== */}
      <div
        className={`p-5 rounded-2xl border-2 ${
          ox.pruebaAcida >= 1.0
            ? "border-emerald-300 bg-emerald-50"
            : ox.pruebaAcida >= 0.5
              ? "border-amber-300 bg-amber-50"
              : "border-red-300 bg-red-50"
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Droplets
            size={18}
            className={
              ox.pruebaAcida >= 1.0
                ? "text-emerald-600"
                : ox.pruebaAcida >= 0.5
                  ? "text-amber-600"
                  : "text-red-600"
            }
          />
          <h4 className="text-sm font-extrabold text-slate-800 flex items-center">
            Prueba Acida
            <SmartTooltip term="prueba_acida" size={14} />
          </h4>
          <span className="text-xs text-slate-400">(Meta: ≥ 1.0)</span>
        </div>

        <div className="flex items-end gap-3 mb-3">
          <span
            className={`text-4xl font-extrabold ${
              ox.pruebaAcida >= 1.0
                ? "text-emerald-700"
                : ox.pruebaAcida >= 0.5
                  ? "text-amber-700"
                  : "text-red-700"
            }`}
          >
            {ox.pruebaAcida.toFixed(2)}
          </span>
          <span className="text-sm text-slate-500 mb-1">
            {ox.pruebaAcida >= 1.0
              ? "Por cada dolar que debes, tienes mas de un dolar disponible."
              : ox.pruebaAcida >= 0.5
                ? "Estas justo. Si un cliente se atrasa, te ahogarias."
                : "No tienes con que pagar tus deudas de corto plazo."}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white border border-slate-100">
            <p className="text-slate-400 mb-1">Liquido disponible</p>
            <p className="font-bold text-slate-700">
              ${ox.totalLiquido.toLocaleString("es-PA")}
            </p>
            <p className="text-[10px] text-slate-400">
              Efectivo + Cuentas x Cobrar
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-100">
            <p className="text-slate-400 mb-1">Debes a corto plazo</p>
            <p className="font-bold text-slate-700">
              ${ox.pasivoCorto.toLocaleString("es-PA")}
            </p>
            <p className="text-[10px] text-slate-400">
              Proveedores + Deuda bancaria
            </p>
          </div>
        </div>
      </div>

      {/* ====== CICLO DE CONVERSION DE CAJA (MEJORADO) ====== */}
      <div
        className={`p-6 rounded-2xl border-2 ${
          ox.ccc <= 30
            ? "border-emerald-200 bg-gradient-to-br from-white to-emerald-50"
            : ox.ccc <= 60
              ? "border-amber-200 bg-gradient-to-br from-white to-amber-50"
              : "border-red-200 bg-gradient-to-br from-white to-red-50"
        }`}
      >
        {/* Header con badge de estado */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${
              ox.ccc <= 30 ? "bg-emerald-100" : ox.ccc <= 60 ? "bg-amber-100" : "bg-red-100"
            }`}>
              <Clock size={22} className={
                ox.ccc <= 30 ? "text-emerald-600" : ox.ccc <= 60 ? "text-amber-600" : "text-red-600"
              } />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-800 flex items-center">
                Ciclo de Conversion de Caja
                <SmartTooltip term="ccc" size={14} />
              </h4>
              <p className="text-[11px] text-slate-400">Cuanto tarda tu dinero en completar un giro</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
            ox.ccc <= 30
              ? "bg-emerald-100 text-emerald-700"
              : ox.ccc <= 60
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
          }`}>
            {ox.ccc <= 30 ? "Rapido" : ox.ccc <= 60 ? "Lento" : "Critico"}
          </span>
        </div>

        {/* CCC Hero Number */}
        <div className="text-center mb-6">
          <p className={`text-6xl font-extrabold ${
            ox.ccc <= 30 ? "text-emerald-600" : ox.ccc <= 60 ? "text-amber-600" : "text-red-600"
          }`}>
            {ox.ccc.toFixed(0)}
          </p>
          <p className="text-sm font-bold text-slate-500 mt-1">DIAS PARA RECUPERAR TU DINERO</p>
        </div>

        {/* Visual Flow: Cobranza → Inventario → Proveedor = CCC */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <CccFlowCard
            icon={<CreditCard size={20} />}
            label="Dias Cobranza"
            sublabel="Cuanto tardan tus clientes en pagarte"
            days={ox.diasCalle}
            color="blue"
            operator="+"
          />
          <CccFlowCard
            icon={<Warehouse size={20} />}
            label="Dias Inventario"
            sublabel="Tiempo con mercancia sin vender"
            days={ox.diasInventario}
            color="amber"
            operator="-"
          />
          <CccFlowCard
            icon={<Banknote size={20} />}
            label="Dias Proveedor"
            sublabel="Plazo que te dan para pagar"
            days={ox.diasProveedor}
            color="emerald"
            operator=""
          />
        </div>

        {/* Formula visual */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-5 font-mono bg-white/60 rounded-xl p-3 border border-slate-100">
          <span className="font-bold text-blue-600">{ox.diasCalle.toFixed(0)}d</span>
          <span className="text-lg text-slate-300">+</span>
          <span className="font-bold text-amber-600">{ox.diasInventario.toFixed(0)}d</span>
          <span className="text-lg text-slate-300">−</span>
          <span className="font-bold text-emerald-600">{ox.diasProveedor.toFixed(0)}d</span>
          <span className="text-lg text-slate-300">=</span>
          <span className={`font-extrabold text-base ${
            ox.ccc <= 30 ? "text-emerald-700" : ox.ccc <= 60 ? "text-amber-700" : "text-red-700"
          }`}>{ox.ccc.toFixed(0)} dias</span>
        </div>

        {/* Barra de progreso visual */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>0 dias</span>
            <span className="text-emerald-500 font-bold">30d Ideal</span>
            <span className="text-amber-500 font-bold">60d Alerta</span>
            <span className="text-red-500 font-bold">90d+</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden relative">
            {/* Gradient background */}
            <div className="absolute inset-0 flex">
              <div className="w-1/3 bg-emerald-200" />
              <div className="w-1/3 bg-amber-200" />
              <div className="w-1/3 bg-red-200" />
            </div>
            {/* Marker */}
            <div
              className="absolute top-0 h-full w-1 bg-slate-800 rounded-full shadow-lg transition-all"
              style={{ left: `${Math.min((ox.ccc / 90) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Message */}
        <div className={`text-center p-3 rounded-xl ${
          ox.ccc <= 30
            ? "bg-emerald-100/50 text-emerald-700"
            : ox.ccc <= 60
              ? "bg-amber-100/50 text-amber-700"
              : "bg-red-100/50 text-red-700"
        }`}>
          <p className="text-xs font-bold">
            {ox.ccc <= 30
              ? "✅ Excelente — Tu dinero regresa rapido. Flujo de caja saludable."
              : ox.ccc <= 60
                ? "⚠️ Alerta — Tu dinero tarda demasiado en regresar. Revisa cobranzas e inventario."
                : "🚨 Critico — Tu caja esta atrapada mas de 2 meses. Necesitas un plan de rescate urgente."}
          </p>
        </div>
      </div>

      {/* ====== DINERO ATRAPADO ====== */}
      <div
        className={`p-5 rounded-2xl ${
          ox.dineroAtrapado > record.revenue * 0.5
            ? "bg-red-50 border border-red-200"
            : "bg-slate-50 border border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          {ox.dineroAtrapado > record.revenue * 0.5 ? (
            <AlertTriangle size={18} className="text-red-600" />
          ) : (
            <CheckCircle2 size={18} className="text-slate-500" />
          )}
          <h4 className="text-sm font-extrabold text-slate-800 flex items-center">
            Dinero Atrapado
            <SmartTooltip term="dinero_atrapado" size={14} />
          </h4>
        </div>

        <p className="text-2xl font-extrabold text-slate-800 mb-1">
          ${ox.dineroAtrapado.toLocaleString("es-PA")}
        </p>
        <p className="text-xs text-slate-500">
          Cuentas por cobrar (${record.accounts_receivable.toLocaleString("es-PA")}) +
          Inventario (${record.inventory.toLocaleString("es-PA")})
        </p>

        {ox.dineroAtrapado > record.revenue * 0.5 && (
          <div className="mt-3 p-3 rounded-xl bg-red-100 border border-red-200">
            <p className="text-xs font-bold text-red-700 mb-1">
              ⚠️ Mas de la mitad de tus ventas estan atrapadas
            </p>
            <p className="text-xs text-red-600">
              Cobrar mas rapido o reducir inventario puede liberar efectivo sin vender mas.
            </p>
          </div>
        )}
      </div>

      {/* ====== COBERTURA BANCARIA ====== */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck
            size={18}
            className={
              ox.coberturaBancaria >= 1.5
                ? "text-emerald-600"
                : "text-red-600"
            }
          />
          <h4 className="text-sm font-extrabold text-slate-800 flex items-center">
            Cobertura de Deuda
            <SmartTooltip term="cobertura_deuda" size={14} />
          </h4>
          <span className="text-xs text-slate-400">(Meta: ≥ 1.5x)</span>
        </div>

        <div className="flex items-end gap-2">
          <span
            className={`text-3xl font-extrabold ${
              ox.coberturaBancaria >= 1.5
                ? "text-emerald-700"
                : ox.coberturaBancaria >= 1.0
                  ? "text-amber-700"
                  : "text-red-700"
            }`}
          >
            {ox.coberturaBancaria >= 10
              ? "10+"
              : ox.coberturaBancaria.toFixed(1)}
            x
          </span>
          <span className="text-xs text-slate-500 mb-1">
            {ox.coberturaBancaria >= 1.5
              ? "Tu EBITDA cubre los intereses holgadamente."
              : ox.coberturaBancaria >= 1.0
                ? "Cubres los intereses justo. No contrates mas deuda."
                : "Tu EBITDA no cubre los intereses. Renegociar YA."}
          </span>
        </div>
      </div>

      {/* ====== PLAN DE RESCATE ====== */}
      {!isHealthy && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200">
          <h4 className="text-sm font-extrabold text-cyan-800 mb-3">
            🆘 Plan de Rescate de Caja
          </h4>
          <div className="space-y-2">
            {ox.diasCalle > 15 && (
              <RescueItem text="Cobra mas rapido: Reduce condiciones de credito a 15 dias o menos." />
            )}
            {ox.diasInventario > 20 && (
              <RescueItem text="Reduce inventario: Ofertas flash para mover mercancia estancada." />
            )}
            {ox.diasProveedor < 20 && (
              <RescueItem text="Negocia con proveedores: Pide 30 dias de plazo de pago." />
            )}
            {ox.pruebaAcida < 1.0 && (
              <RescueItem text="Emergencia de liquidez: Inyecta capital o vende activos no productivos." />
            )}
            {ox.coberturaBancaria < 1.5 && (
              <RescueItem text="Renegocia deuda: Busca tasas mas bajas o plazos mas largos." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function CccFlowCard({
  icon,
  label,
  sublabel,
  days,
  color,
  operator,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  days: number;
  color: string;
  operator: string;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", iconBg: "bg-blue-100" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", iconBg: "bg-amber-100" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", iconBg: "bg-emerald-100" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="relative">
      {operator && (
        <span className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-xl font-extrabold text-slate-300">
          {operator}
        </span>
      )}
      <div className={`p-4 rounded-xl border ${c.bg} ${c.border} text-center h-full`}>
        <div className={`inline-flex p-2 rounded-lg ${c.iconBg} mb-2`}>
          <span className={c.text}>{icon}</span>
        </div>
        <p className={`text-3xl font-extrabold ${c.text}`}>{days.toFixed(0)}</p>
        <p className="text-[11px] font-bold text-slate-700 mt-1">{label}</p>
        <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{sublabel}</p>
      </div>
    </div>
  );
}

function RescueItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-cyan-500 mt-0.5">•</span>
      <p className="text-xs text-cyan-700">{text}</p>
    </div>
  );
}
