"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart3,
  Download,
  Users,
  TrendingUp,
  Star,
  MessageSquare,
  Loader2,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// TIPOS
// ============================================================

interface SurveyStats {
  total_respuestas: number;
  avg_impresion_general: number | null;
  avg_claridad_hub: number | null;
  avg_atractivo_visual: number | null;
  avg_facilidad_diagnostico: number | null;
  avg_utilidad_rrhh: number | null;
  avg_inventario_claro: number | null;
  avg_cascada_util: number | null;
  avg_simulador_valor: number | null;
  avg_lab_precios: number | null;
  avg_vigilante_util: number | null;
  avg_boveda_confianza: number | null;
  avg_asistente_util: number | null;
  avg_asistente_respuestas: number | null;
  avg_velocidad: number | null;
  avg_mobile_experiencia: number | null;
  avg_nps: number | null;
  nps_promotores: number;
  nps_pasivos: number;
  nps_detractores: number;
  nps_score: number | null;
}

interface SurveyResponse {
  id: string;
  created_at: string;
  nombre: string | null;
  empresa: string | null;
  perfil: string | null;
  impresion_general: number | null;
  claridad_hub: number | null;
  atractivo_visual: number | null;
  facilidad_diagnostico: number | null;
  utilidad_rrhh: number | null;
  inventario_claro: number | null;
  espejo_dgi: string | null;
  cascada_util: number | null;
  simulador_valor: number | null;
  lab_precios: number | null;
  herramienta_mas_util: string | null;
  vigilante_util: number | null;
  boveda_confianza: number | null;
  ley186_relevante: string | null;
  asistente_util: number | null;
  asistente_respuestas: number | null;
  asistente_usaria: string | null;
  velocidad: number | null;
  mobile: string | null;
  mobile_experiencia: number | null;
  recomendaria: number | null;
  mejor_de_la_app: string | null;
  mejorar: string | null;
  problema_encontrado: string | null;
  tiempo_completado_seg: number | null;
  dispositivo: string | null;
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function KPICard({
  label,
  value,
  suffix,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color + "20" }}
        >
          {icon}
        </div>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">
        {value}
        {suffix && <span className="text-sm text-slate-500 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number | null;
  max: number;
  color?: string;
}) {
  const v = value ?? 0;
  const pct = Math.round((v / max) * 100);
  const barColor =
    color ?? (v >= max * 0.7 ? "#10B981" : v >= max * 0.5 ? "#F59E0B" : "#EF4444");

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-40 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-white/5 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-xs text-white font-semibold w-12 text-right">
        {v.toFixed(1)}/{max}
      </span>
    </div>
  );
}

function countField(responses: SurveyResponse[], field: keyof SurveyResponse) {
  const counts: Record<string, number> = {};
  responses.forEach((r) => {
    const val = r[field];
    if (val && typeof val === "string") {
      counts[val] = (counts[val] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

function MiniRanking({
  title,
  data,
  color,
}: {
  title: string;
  data: { label: string; count: number }[];
  color: string;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
      <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-3">{title}</h4>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(d.count / maxCount) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="text-xs text-slate-300 w-48 truncate text-right" title={d.label}>
              {d.label}
            </span>
            <span className="text-xs font-bold text-white w-6 text-right">{d.count}</span>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-xs text-slate-600">Sin datos aún</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function BetaResultadosPage() {
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [respuestas, setRespuestas] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();

        // Fetch stats view
        const { data: statsData, error: statsErr } = await supabase
          .from("beta_survey_stats")
          .select("*")
          .single();

        if (statsErr) {
          console.error("Stats error:", statsErr);
          setError("No se pudieron cargar las estadísticas. ¿Ya ejecutaste la migración SQL?");
          setLoading(false);
          return;
        }

        // Fetch all individual responses
        const { data: respData, error: respErr } = await supabase
          .from("beta_survey_responses")
          .select("*")
          .order("created_at", { ascending: false });

        if (respErr) {
          console.error("Responses error:", respErr);
        }

        setStats(statsData as SurveyStats);
        setRespuestas((respData as SurveyResponse[]) || []);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Error de conexión con Supabase.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Distribución NPS
  const npsData = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Promotores (9-10)", value: stats.nps_promotores, color: "#10B981" },
      { label: "Pasivos (7-8)", value: stats.nps_pasivos, color: "#F59E0B" },
      { label: "Detractores (0-6)", value: stats.nps_detractores, color: "#EF4444" },
    ];
  }, [stats]);

  // Rankings de opciones múltiples
  const rankings = useMemo(() => {
    if (!respuestas.length) return null;
    return {
      herramienta: countField(respuestas, "herramienta_mas_util"),
      espejoDgi: countField(respuestas, "espejo_dgi"),
      asistenteUsaria: countField(respuestas, "asistente_usaria"),
      mobile: countField(respuestas, "mobile"),
      perfil: countField(respuestas, "perfil"),
      ley186: countField(respuestas, "ley186_relevante"),
    };
  }, [respuestas]);

  // Exportar CSV
  const exportCSV = () => {
    if (!respuestas.length) return;
    const headers = Object.keys(respuestas[0]);
    const csvContent = [
      headers.join(","),
      ...respuestas.map((r) =>
        headers
          .map((h) => {
            const v = (r as unknown as Record<string, unknown>)[h];
            if (v === null || v === undefined) return "";
            if (typeof v === "string") return `"${v.replace(/"/g, '""')}"`;
            return String(v);
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `beta_survey_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-red-400 text-sm">{error}</p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1 text-emerald-400 text-sm hover:underline"
          >
            <ArrowLeft size={14} /> Volver al dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const npsColor =
    (stats.nps_score ?? 0) >= 50
      ? "#10B981"
      : (stats.nps_score ?? 0) >= 0
      ? "#F59E0B"
      : "#EF4444";

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0D1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </a>
            <div>
              <h1 className="text-lg font-bold">
                Resultados Beta — Mi Director Financiero PTY
              </h1>
              <p className="text-xs text-slate-500">Dashboard de estadísticas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-500/20">
              {stats.total_respuestas} respuestas
            </span>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* ── SECCIÓN A: KPIs principales ── */}
        <section>
          <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 size={14} /> KPIs Principales
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Total Respuestas"
              value={stats.total_respuestas}
              color="#059669"
              icon={<Users size={16} className="text-emerald-400" />}
            />
            <KPICard
              label="NPS Score"
              value={stats.nps_score ?? "—"}
              color={npsColor}
              icon={<TrendingUp size={16} style={{ color: npsColor }} />}
            />
            <KPICard
              label="Impresión General"
              value={stats.avg_impresion_general?.toFixed(1) ?? "—"}
              suffix="/ 5 ⭐"
              color="#F59E0B"
              icon={<Star size={16} className="text-amber-400" />}
            />
            <KPICard
              label="Recomendaría (NPS avg)"
              value={stats.avg_nps?.toFixed(1) ?? "—"}
              suffix="/ 10"
              color="#0EA5E9"
              icon={<MessageSquare size={16} className="text-sky-400" />}
            />
          </div>
        </section>

        {/* ── SECCIÓN B: Promedios por módulo ── */}
        <section>
          <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-4">
            Promedios por Módulo
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Mi Contabilidad */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                📊 Mi Contabilidad
              </h3>
              <ProgressBar label="Diagnóstico Flash" value={stats.avg_facilidad_diagnostico} max={10} />
              <ProgressBar label="Utilidad RRHH" value={stats.avg_utilidad_rrhh} max={10} />
              <ProgressBar label="Inventario claro" value={stats.avg_inventario_claro} max={10} />
            </div>

            {/* Mis Finanzas */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                💰 Mis Finanzas
              </h3>
              <ProgressBar label="Cascada P&L" value={stats.avg_cascada_util} max={10} />
              <ProgressBar label="Simulador Estratégico" value={stats.avg_simulador_valor} max={10} />
              <ProgressBar label="Lab de Precios" value={stats.avg_lab_precios} max={5} />
            </div>

            {/* Doc Legales */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                ⚖️ Doc Legales
              </h3>
              <ProgressBar label="Vigilante Legal" value={stats.avg_vigilante_util} max={10} />
              <ProgressBar label="Bóveda Confianza" value={stats.avg_boveda_confianza} max={10} />
            </div>

            {/* Asistente IA + Experiencia */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                🤖 Asistente IA & Experiencia
              </h3>
              <ProgressBar label="Asistente útil" value={stats.avg_asistente_util} max={5} />
              <ProgressBar label="Respuestas IA" value={stats.avg_asistente_respuestas} max={10} />
              <ProgressBar label="Velocidad app" value={stats.avg_velocidad} max={10} />
              <ProgressBar label="Experiencia móvil" value={stats.avg_mobile_experiencia} max={10} />
            </div>
          </div>
        </section>

        {/* ── SECCIÓN C: NPS Detallado ── */}
        <section>
          <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-4">
            NPS Detallado
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {npsData.map((d) => (
              <div
                key={d.label}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-center"
              >
                <p className="text-3xl font-bold" style={{ color: d.color }}>
                  {d.value}
                </p>
                <p className="text-xs text-slate-400 mt-1">{d.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <p className="text-xs text-slate-400">
              <strong>NPS Score:</strong>{" "}
              <span style={{ color: npsColor }} className="font-bold text-lg">
                {stats.nps_score ?? "—"}
              </span>
              <span className="ml-2">
                = (%Promotores − %Detractores) × 100. Rango: -100 a +100.
                {(stats.nps_score ?? 0) >= 50 && " ¡Excelente!"}
                {(stats.nps_score ?? 0) >= 0 && (stats.nps_score ?? 0) < 50 && " Bueno, hay margen de mejora."}
                {(stats.nps_score ?? 0) < 0 && " Necesita atención urgente."}
              </span>
            </p>
          </div>
        </section>

        {/* ── SECCIÓN D: Rankings de opciones ── */}
        {rankings && (
          <section>
            <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-4">
              Distribución de Respuestas
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MiniRanking title="Herramienta más útil" data={rankings.herramienta} color="#C5A059" />
              <MiniRanking title="Espejo DGI" data={rankings.espejoDgi} color="#059669" />
              <MiniRanking title="Usaría asistente IA" data={rankings.asistenteUsaria} color="#0EA5E9" />
              <MiniRanking title="Dispositivo" data={rankings.mobile} color="#059669" />
              <MiniRanking title="Perfil del evaluador" data={rankings.perfil} color="#C5A059" />
              <MiniRanking title="Relevancia Ley 186" data={rankings.ley186} color="#7C3AED" />
            </div>
          </section>
        )}

        {/* ── SECCIÓN E: Respuestas abiertas ── */}
        <section>
          <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-4">
            Respuestas Abiertas
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-left">
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">Fecha</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">Empresa</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">Lo mejor</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">Qué mejorar</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">Problemas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {respuestas.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("es-PA", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {r.empresa || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300 max-w-48">
                      <span
                        className="block truncate"
                        title={r.mejor_de_la_app ?? ""}
                      >
                        {r.mejor_de_la_app
                          ? r.mejor_de_la_app.length > 120
                            ? r.mejor_de_la_app.slice(0, 120) + "..."
                            : r.mejor_de_la_app
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300 max-w-48">
                      <span className="block truncate" title={r.mejorar ?? ""}>
                        {r.mejorar
                          ? r.mejorar.length > 120
                            ? r.mejorar.slice(0, 120) + "..."
                            : r.mejorar
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300 max-w-48">
                      <span
                        className="block truncate"
                        title={r.problema_encontrado ?? ""}
                      >
                        {r.problema_encontrado
                          ? r.problema_encontrado.length > 120
                            ? r.problema_encontrado.slice(0, 120) + "..."
                            : r.problema_encontrado
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
                {respuestas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                      No hay respuestas aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
