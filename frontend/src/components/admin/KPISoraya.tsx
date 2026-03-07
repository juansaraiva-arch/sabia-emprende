"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Activity,
  ArrowLeft,
  RefreshCw,
  ShieldAlert,
  Clock,
} from "lucide-react";
import {
  generateMockKPIs,
  type KPIsDashboard,
  type ChurnMetrics,
  type CohortData,
} from "@/lib/analytics/churn-detector";

// ============================================================
// TIPOS LOCALES
// ============================================================

interface KPICard {
  label: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function KPISoraya() {
  const [data, setData] = useState<KPIsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // En modo demo, usar datos mock
    // Cuando Supabase este conectado, reemplazar con fetch real
    const timer = setTimeout(() => {
      setData(generateMockKPIs());
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setData(generateMockKPIs());
      setLoading(false);
    }, 600);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#C5A059] animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-[family-name:var(--font-body)]">
            Cargando metricas...
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { churn, cohortes, modulos_mas_usados, usuarios_en_riesgo } = data;

  // KPI cards
  const kpis: KPICard[] = [
    {
      label: "Total Usuarios",
      value: churn.total_usuarios,
      subtitle: "registrados en la plataforma",
      icon: <Users className="w-5 h-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Activos 30d",
      value: churn.activos_30d,
      subtitle: `${Math.round((churn.activos_30d / Math.max(churn.total_usuarios, 1)) * 100)}% del total`,
      icon: <Activity className="w-5 h-5" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Churn Rate",
      value: `${churn.churn_rate_pct}%`,
      subtitle: churn.cumple_meta
        ? `Meta: <${churn.meta_churn}% - Cumple`
        : `Meta: <${churn.meta_churn}% - NO cumple`,
      icon: churn.cumple_meta ? (
        <TrendingDown className="w-5 h-5" />
      ) : (
        <TrendingUp className="w-5 h-5" />
      ),
      color: churn.cumple_meta ? "text-emerald-600" : "text-red-600",
      bgColor: churn.cumple_meta ? "bg-emerald-50" : "bg-red-50",
    },
    {
      label: "Retencion",
      value: `${churn.tasa_retencion_pct}%`,
      subtitle: `${churn.en_riesgo} usuario(s) en riesgo`,
      icon: <CheckCircle className="w-5 h-5" />,
      color: churn.tasa_retencion_pct >= 90 ? "text-emerald-600" : "text-amber-600",
      bgColor: churn.tasa_retencion_pct >= 90 ? "bg-emerald-50" : "bg-amber-50",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-body)]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#1A242F] font-[family-name:var(--font-heading)]">
                KPIs de Engagement
              </h1>
              <p className="text-sm text-slate-500">
                Churn Rate, Retencion y Cohortes
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Demo Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Modo Demo</p>
            <p className="text-xs text-amber-600">
              Mostrando datos de ejemplo. Cuando se conecte Supabase, los datos
              seran reales.
            </p>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {kpi.label}
                </span>
                <div className={`p-2 rounded-lg ${kpi.bgColor} ${kpi.color}`}>
                  {kpi.icon}
                </div>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-1">{kpi.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Cohort Retention Table */}
        <CohortTable cohortes={cohortes} />

        {/* Bottom row: Modules + At Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Most Used Modules */}
          <ModulosChart modulos={modulos_mas_usados} />

          {/* Users at Risk */}
          <UsuariosEnRiesgo usuarios={usuarios_en_riesgo} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTE: Tabla de Cohortes
// ============================================================

function CohortTable({ cohortes }: { cohortes: CohortData[] }) {
  if (cohortes.length === 0) return null;

  const maxMeses = Math.max(...cohortes.map((c) => c.retencion.length));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-[#C5A059]" />
        <h2 className="text-base font-bold text-[#1A242F] font-[family-name:var(--font-heading)]">
          Retencion por Cohorte
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-3 text-slate-500 font-medium">
                Cohorte
              </th>
              <th className="text-center py-2 px-3 text-slate-500 font-medium">
                Usuarios
              </th>
              {Array.from({ length: maxMeses }, (_, i) => (
                <th
                  key={i}
                  className="text-center py-2 px-3 text-slate-500 font-medium"
                >
                  Mes {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohortes.map((c) => (
              <tr key={c.cohorte_mes} className="border-b border-slate-100">
                <td className="py-2 px-3 font-medium text-[#1A242F]">
                  {c.cohorte_mes}
                </td>
                <td className="py-2 px-3 text-center text-slate-600">
                  {c.usuarios_cohorte}
                </td>
                {Array.from({ length: maxMeses }, (_, i) => {
                  const ret = c.retencion.find((r) => r.mes === i + 1);
                  const pct = ret?.pct ?? null;
                  const bg =
                    pct === null
                      ? "bg-slate-50"
                      : pct >= 80
                      ? "bg-emerald-100 text-emerald-700"
                      : pct >= 60
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700";
                  return (
                    <td key={i} className={`py-2 px-3 text-center rounded ${bg}`}>
                      {pct !== null ? `${pct}%` : "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTE: Modulos mas usados (barras CSS)
// ============================================================

function ModulosChart({
  modulos,
}: {
  modulos: { modulo: string; acciones: number }[];
}) {
  const maxAcciones = Math.max(...modulos.map((m) => m.acciones), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-[#C5A059]" />
        <h2 className="text-base font-bold text-[#1A242F] font-[family-name:var(--font-heading)]">
          Modulos mas usados
        </h2>
      </div>

      <div className="space-y-3">
        {modulos.map((m) => {
          const widthPct = Math.round((m.acciones / maxAcciones) * 100);
          return (
            <div key={m.modulo}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[#1A242F] font-medium">
                  {m.modulo}
                </span>
                <span className="text-xs text-slate-500">
                  {m.acciones} acciones
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#C5A059] to-[#d4b06a] rounded-full transition-all duration-700"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTE: Usuarios en riesgo de churn
// ============================================================

function UsuariosEnRiesgo({
  usuarios,
}: {
  usuarios: { email: string; dias_sin_actividad: number }[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h2 className="text-base font-bold text-[#1A242F] font-[family-name:var(--font-heading)]">
          En riesgo de churn
        </h2>
      </div>

      {usuarios.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            No hay usuarios en riesgo actualmente
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div
              key={u.email}
              className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl"
            >
              <div>
                <p className="text-sm font-medium text-[#1A242F]">{u.email}</p>
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {u.dias_sin_actividad} dias sin actividad
                </p>
              </div>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  u.dias_sin_actividad >= 30
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {u.dias_sin_actividad >= 30 ? "Alto" : "Medio"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
