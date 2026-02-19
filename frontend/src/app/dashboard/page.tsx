"use client";
import React, { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Building2,
  History,
  Zap,
  Skull,
  Shield,
  Wind,
  SlidersHorizontal,
  FlaskConical,
  Gem,
  Scale,
  FileText,
  BookOpen,
  FolderTree,
  BookMarked,
  CheckSquare,
  Lock,
} from "lucide-react";
import type { FinancialRecord } from "@/lib/calculations";
import SabiaLogo from "@/components/SabiaLogo";
import BottomNavBar from "@/components/BottomNavBar";
import DataEntryWizard from "@/components/DataEntryWizard";
import NaturalLanguageInput from "@/components/NaturalLanguageInput";
import AuditTimeline from "@/components/AuditTimeline";
import DiagnosticCard from "@/components/DiagnosticCard";
import WaterfallChart from "@/components/charts/WaterfallChart";
import BreakevenChart from "@/components/charts/BreakevenChart";
import RatioGauges from "@/components/charts/RatioGauges";
import MandibulasChart from "@/components/charts/MandibulasChart";
import PayrollEngine from "@/components/PayrollEngine";
import LegalVault from "@/components/LegalVault";
import WatchdogDashboard from "@/components/WatchdogDashboard";
import SimuladorEstrategico from "@/components/SimuladorEstrategico";
import OxigenoTab from "@/components/OxigenoTab";
import LabPrecios from "@/components/LabPrecios";
import ValoracionTab from "@/components/ValoracionTab";
import LegalSimplifierButton from "@/components/LegalSimplifierButton";
import SmartTooltip from "@/components/SmartTooltip";
import AlertsSidebar, { AlertBellButton } from "@/components/AlertsSidebar";
import WelcomePopup from "@/components/WelcomePopup";
import BalanceGeneralCard from "@/components/BalanceGeneralCard";
import ChartOfAccounts from "@/components/accounting/ChartOfAccounts";
import LibroDiario from "@/components/accounting/LibroDiario";
import LibroMayor from "@/components/accounting/LibroMayor";
import BalanceComprobacion from "@/components/accounting/BalanceComprobacion";
import PeriodClosingPanel from "@/components/accounting/PeriodClosingPanel";
import { computeAlerts, getTopAlert, countByPriority } from "@/lib/alerts";
import {
  MOCK_RECORD,
  MOCK_12_MONTHS,
  computeMockDiagnosis,
  computeMockBreakeven,
  computeMandibulasData,
} from "@/lib/mockData";

// ============================================
// TIPOS
// ============================================

type Section = "datos" | "negocio" | "legal";
type DatosMode = "flash" | "contabilidad";
type ContabilidadTab = "plan_cuentas" | "libro_diario" | "libro_mayor" | "balance_comprobacion" | "cierre_periodo";
type NegocioTab =
  | "cascada"
  | "mandibulas"
  | "semaforo"
  | "equilibrio"
  | "oxigeno"
  | "simulador"
  | "lab"
  | "valoracion"
  | "nomina";
type LegalTab = "boveda" | "vigilante" | "auditoria";

// ============================================
// DASHBOARD
// ============================================

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<Section>("datos");
  const [datosMode, setDatosMode] = useState<DatosMode>("flash");
  const [activeContabilidadTab, setActiveContabilidadTab] = useState<ContabilidadTab>("libro_diario");
  const [activeNegocioTab, setActiveNegocioTab] = useState<NegocioTab>("cascada");
  const [activeLegalTab, setActiveLegalTab] = useState<LegalTab>("boveda");

  const [currentRecord, setCurrentRecord] = useState<FinancialRecord>(MOCK_RECORD as FinancialRecord);
  const [bulkRecords, setBulkRecords] = useState<FinancialRecord[]>(MOCK_12_MONTHS as FinancialRecord[]);
  const [hasBulkData, setHasBulkData] = useState(false);

  const [diagnosis, setDiagnosis] = useState<any>(() => computeMockDiagnosis(MOCK_RECORD));
  const [breakeven, setBreakeven] = useState<any>(() => computeMockBreakeven(MOCK_RECORD));

  const societyId = "demo-society-001";

  const handleNLPResult = (result: any) => {
    if (result.data) {
      if (result.action === "query_diagnosis") setDiagnosis(result.data);
      if (result.action === "query_breakeven") setBreakeven(result.data);
    }
  };

  const handleRecordSaved = (record: FinancialRecord) => {
    setCurrentRecord(record);
    setDiagnosis(computeMockDiagnosis(record));
    setBreakeven(computeMockBreakeven(record));
    setActiveSection("negocio");
  };

  const handleBulkRecordsSaved = (records: FinancialRecord[]) => {
    setBulkRecords(records);
    setHasBulkData(true);
    if (records.length > 0) {
      const last = records[records.length - 1];
      setCurrentRecord(last);
      setDiagnosis(computeMockDiagnosis(last));
      setBreakeven(computeMockBreakeven(last));
    }
    setActiveSection("negocio");
    setActiveNegocioTab("mandibulas");
  };

  // Welcome popup (primera vez)
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("sabia_welcomed");
    }
    return false;
  });

  const handleWelcomeDismiss = () => {
    localStorage.setItem("sabia_welcomed", "true");
    setShowWelcome(false);
  };

  const handleLogoClick = () => {
    setActiveSection("datos");
    setActiveNegocioTab("cascada");
    setActiveLegalTab("boveda");
  };

  // Alertas estrategicas
  const [alertsSidebarOpen, setAlertsSidebarOpen] = useState(false);
  const strategicAlerts = useMemo(
    () => computeAlerts(currentRecord),
    [currentRecord]
  );
  const topAlert = useMemo(() => getTopAlert(strategicAlerts), [strategicAlerts]);
  const alertCounts = useMemo(() => countByPriority(strategicAlerts), [strategicAlerts]);
  const nonGreenAlerts = strategicAlerts.filter((a) => a.priority !== "green");

  const ebitdaMargin = diagnosis?.ratios?.margins?.ebitda_margin_pct ?? 0;
  const totalCosts = (diagnosis?.cascada?.cogs ?? 0) + (diagnosis?.cascada?.total_opex ?? 0);
  const revenue = diagnosis?.cascada?.revenue ?? 0;
  const isMordida = totalCosts > revenue && revenue > 0;

  const mandibulasData = useMemo(
    () => computeMandibulasData(hasBulkData ? bulkRecords as any : MOCK_12_MONTHS),
    [hasBulkData, bulkRecords]
  );

  const negocioTabs: { key: NegocioTab; label: string; icon: React.ReactNode }[] = [
    { key: "cascada", label: "Cascada", icon: <BarChart3 size={14} /> },
    { key: "mandibulas", label: "Mandibulas", icon: <Skull size={14} /> },
    { key: "semaforo", label: "Semaforo", icon: <AlertTriangle size={14} /> },
    { key: "equilibrio", label: "Supervivencia", icon: <TrendingUp size={14} /> },
    { key: "oxigeno", label: "Oxigeno", icon: <Wind size={14} /> },
    { key: "simulador", label: "Simulador", icon: <SlidersHorizontal size={14} /> },
    { key: "lab", label: "Estrategia de Precios", icon: <FlaskConical size={14} /> },
    { key: "valoracion", label: "Valor del Negocio", icon: <Gem size={14} /> },
    { key: "nomina", label: "Costo Real de Personal", icon: <DollarSign size={14} /> },
  ];

  const legalTabs: { key: LegalTab; label: string; icon: React.ReactNode }[] = [
    { key: "boveda", label: "Boveda KYC", icon: <Shield size={14} /> },
    { key: "vigilante", label: "Vigilante Legal", icon: <Scale size={14} /> },
    { key: "auditoria", label: "Auditoria", icon: <History size={14} /> },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ====== TOP BAR ====== */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 lg:px-6 lg:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={handleLogoClick} className="flex items-center gap-2 lg:gap-3 hover:opacity-90 transition-opacity">
            <SabiaLogo size={36} iconOnly className="lg:hidden" />
            <SabiaLogo size={44} iconOnly className="hidden lg:block" />
            <div className="text-left">
              <h1 className="text-sm lg:text-base font-extrabold text-slate-800">
                SABIA EMPRENDE
              </h1>
              <p className="text-[10px] lg:text-xs text-slate-400">
                Tu Aliado Estrategico
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {diagnosis && (
              <div className={`px-3 py-1.5 rounded-full text-[10px] lg:text-xs font-bold ${
                diagnosis.severity === "ok" ? "bg-emerald-100 text-emerald-700"
                  : diagnosis.severity === "warning" ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
              }`}>
                {diagnosis.verdict}
              </div>
            )}
            <AlertBellButton
              alertCount={nonGreenAlerts.length}
              hasRed={alertCounts.red > 0}
              onClick={() => setAlertsSidebarOpen(true)}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
        <BottomNavBar active={activeSection} onNavigate={setActiveSection} />

        {/* SECCION 1: MI CONTABILIDAD */}
        {activeSection === "datos" && (
          <div className="space-y-4">
            <details className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <summary className="px-5 py-4 cursor-pointer flex items-center gap-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                <Zap size={16} className="text-violet-500" />
                Asistente IA (pregunta lo que quieras)
              </summary>
              <div className="px-5 pb-4">
                <NaturalLanguageInput societyId={societyId} onResult={handleNLPResult} topAlert={topAlert} />
              </div>
            </details>

            {/* Mode switcher: Diagnostico Flash vs Contabilidad Formal */}
            <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200">
              <button
                onClick={() => setDatosMode("flash")}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap min-h-[44px] ${
                  datosMode === "flash"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Zap size={14} />
                Diagnostico Flash
              </button>
              <button
                onClick={() => setDatosMode("contabilidad")}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap min-h-[44px] ${
                  datosMode === "contabilidad"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <BookOpen size={14} />
                Contabilidad Formal
              </button>
            </div>

            {/* Diagnostico Flash mode (original) */}
            {datosMode === "flash" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6">
                <DataEntryWizard onRecordSaved={handleRecordSaved} onBulkRecordsSaved={handleBulkRecordsSaved} onNavigateHome={handleLogoClick} />
              </div>
            )}

            {/* Contabilidad Formal mode (new) */}
            {datosMode === "contabilidad" && (
              <div className="space-y-4">
                {/* Sub-tabs */}
                <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 overflow-x-auto">
                  {([
                    { key: "plan_cuentas" as ContabilidadTab, label: "Plan de Cuentas", icon: <FolderTree size={14} /> },
                    { key: "libro_diario" as ContabilidadTab, label: "Libro Diario", icon: <BookOpen size={14} /> },
                    { key: "libro_mayor" as ContabilidadTab, label: "Libro Mayor", icon: <BookMarked size={14} /> },
                    { key: "balance_comprobacion" as ContabilidadTab, label: "Balance Comprobacion", icon: <CheckSquare size={14} /> },
                    { key: "cierre_periodo" as ContabilidadTab, label: "Cierre y Reportes", icon: <Lock size={14} /> },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveContabilidadTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 lg:px-4 py-2.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap min-h-[44px] ${
                        activeContabilidadTab === tab.key
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6 min-h-[400px]">
                  {activeContabilidadTab === "plan_cuentas" && <ChartOfAccounts societyId={societyId} />}
                  {activeContabilidadTab === "libro_diario" && <LibroDiario societyId={societyId} />}
                  {activeContabilidadTab === "libro_mayor" && <LibroMayor societyId={societyId} />}
                  {activeContabilidadTab === "balance_comprobacion" && <BalanceComprobacion societyId={societyId} />}
                  {activeContabilidadTab === "cierre_periodo" && <PeriodClosingPanel societyId={societyId} />}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECCION 2: MI DIRECTOR FINANCIERO PTY */}
        {activeSection === "negocio" && (
          <div className="space-y-4">
            {diagnosis && (
              <div className="bg-slate-800 text-white p-4 lg:p-6 rounded-2xl shadow-lg border-l-8 border-amber-400">
                <h3 className="text-base lg:text-lg font-bold mb-1">Veredicto: {diagnosis.verdict}</h3>
                <p className="text-sm text-slate-300">{diagnosis.detail}</p>
                <p className="text-xs text-slate-400 mt-1">Motor: {diagnosis.motor?.description}</p>
                {diagnosis.action_plan?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-bold text-amber-400">Plan de Choque:</p>
                    {diagnosis.action_plan.map((action: string, i: number) => (
                      <p key={i} className="text-xs text-slate-300">{action}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 overflow-x-auto">
              {negocioTabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveNegocioTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 lg:px-4 py-2.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap min-h-[44px] ${
                    activeNegocioTab === tab.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                  }`}>
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6 min-h-[400px]">
              {activeNegocioTab === "cascada" && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <h2 className="text-lg lg:text-xl font-bold text-slate-800">Cascada de Rentabilidad</h2>
                    <SmartTooltip term="ebitda" size={16} />
                  </div>
                  {diagnosis?.cascada ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2"><WaterfallChart steps={diagnosis.cascada.waterfall_steps} /></div>
                        <div className="space-y-4">
                          <DiagnosticCard title="Potencia (EBITDA)" icon={<Zap size={20} />} value={`${ebitdaMargin.toFixed(1)}%`}
                            description={ebitdaMargin < 10 ? "Motor Debil. Margen operativo muy bajo." : ebitdaMargin < 15 ? "Motor Estable. Flujo positivo." : "Motor Potente. Capacidad de reinversion."}
                            status={ebitdaMargin < 10 ? "danger" : ebitdaMargin < 15 ? "warning" : "ok"} />
                          <DiagnosticCard title="Mandibula" icon={<Skull size={20} />} value={isMordida ? "ZONA DE MORDIDA" : "Zona Segura"}
                            description={isMordida ? "Cada dolar que vendes te cuesta mas. Ve al Lab de Precios." : "Tus ventas cubren costos. Manten la vigilancia."}
                            status={isMordida ? "critical" : "ok"} />
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                            <h4 className="text-sm font-bold text-slate-600">Estado de Resultados</h4>
                            <SummaryRow label="Ventas" value={diagnosis.cascada.revenue} color="text-blue-600" />
                            <SummaryRow label="(-) COGS" value={diagnosis.cascada.cogs} color="text-red-500" />
                            <SummaryRow label="= U.B." value={diagnosis.cascada.gross_profit} color={diagnosis.cascada.gross_profit >= 0 ? "text-emerald-600" : "text-red-600"} />
                            <SummaryRow label="(-) OPEX" value={diagnosis.cascada.total_opex} color="text-red-500" />
                            <SummaryRow label="= EBITDA" value={diagnosis.cascada.ebitda} color={diagnosis.cascada.ebitda >= 0 ? "text-emerald-600" : "text-red-600"} />
                            <SummaryRow label="= EBIT" value={diagnosis.cascada.ebit} color={diagnosis.cascada.ebit >= 0 ? "text-emerald-600" : "text-red-600"} />
                            <SummaryRow label="= EBT" value={diagnosis.cascada.ebt} color={diagnosis.cascada.ebt >= 0 ? "text-emerald-600" : "text-red-600"} />
                            <div className="pt-1 border-t border-slate-300">
                              <SummaryRow label="= U.N." value={diagnosis.cascada.net_income} color={diagnosis.cascada.net_income >= 0 ? "text-emerald-600" : "text-red-600"} />
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Tarjeta B: Balance General */}
                      <BalanceGeneralCard record={currentRecord} />
                    </div>
                  ) : (<EmptyState text="Carga datos en 'Mi Contabilidad' para ver la cascada." />)}
                </div>
              )}
              {activeNegocioTab === "mandibulas" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-6">Mandibulas: Ventas vs Costos</h2><MandibulasChart data={mandibulasData} /></div>)}
              {activeNegocioTab === "semaforo" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-6">Semaforo Integral</h2>{diagnosis?.ratios ? <RatioGauges ratios={diagnosis.ratios} /> : <EmptyState text="Carga datos para ver el semaforo." />}</div>)}
              {activeNegocioTab === "equilibrio" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-6">Mapa de Supervivencia</h2>{breakeven ? <BreakevenChart breakevenMonthly={breakeven.breakeven_monthly} currentSales={breakeven.current_sales} marginOfSafety={breakeven.margin_of_safety} zone={breakeven.zone} contributionMarginPct={breakeven.contribution_margin_pct} targetSales={breakeven.target_sales} /> : <EmptyState text="Carga datos para ver el punto de equilibrio." />}</div>)}
              {activeNegocioTab === "oxigeno" && <OxigenoTab record={currentRecord} />}
              {activeNegocioTab === "simulador" && <SimuladorEstrategico record={currentRecord} />}
              {activeNegocioTab === "lab" && <LabPrecios />}
              {activeNegocioTab === "valoracion" && <ValoracionTab record={currentRecord} />}
              {activeNegocioTab === "nomina" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-4">Costo Real de Personal — Panama 2026</h2><PayrollEngine societyId={societyId} /></div>)}
            </div>
          </div>
        )}

        {/* SECCION 3: MI EMPRESA - DOC LEGALES */}
        {activeSection === "legal" && (
          <div className="space-y-4">
            <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 overflow-x-auto">
              {legalTabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveLegalTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap min-h-[44px] ${
                    activeLegalTab === tab.key ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                  }`}>
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6 min-h-[400px]">
              {activeLegalTab === "boveda" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-4">Boveda KYC — Debida Diligencia</h2><LegalVault /></div>)}
              {activeLegalTab === "vigilante" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-4">Vigilante Legal: Alertas de Cumplimiento</h2><WatchdogDashboard /></div>)}
              {activeLegalTab === "auditoria" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-4">Historial de Cambios</h2><AuditTimeline limit={30} /></div>)}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6">
              <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                <FileText size={16} className="text-violet-500" />
                Traductor Legal
              </h3>
              <p className="text-xs text-slate-400 mb-3">Pega cualquier clausula legal y te la explicamos en espanol sencillo.</p>
              <LegalSimplifierButton />
            </div>
          </div>
        )}
      </div>

      <BottomNavBar active={activeSection} onNavigate={setActiveSection} />

      {/* Panel de Alertas Estrategicas (sidebar derecho) */}
      <AlertsSidebar
        alerts={strategicAlerts}
        isOpen={alertsSidebarOpen}
        onClose={() => setAlertsSidebarOpen(false)}
      />

      {/* Welcome Popup (primera vez) */}
      {showWelcome && (
        <WelcomePopup
          onDismiss={handleWelcomeDismiss}
          onStart={() => { handleWelcomeDismiss(); setActiveSection("datos"); }}
        />
      )}
    </main>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-bold ${color}`}>${value?.toLocaleString("es-PA")}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-slate-400 text-center py-12 text-sm">{text}</p>;
}
