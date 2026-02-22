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
  ArrowLeftRight,
  Target,
  FileBarChart,
  Package,
  ClipboardList,
  Home,
  ArrowLeft,
  PenLine,
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
import LibroInventarios from "@/components/accounting/LibroInventarios";
import LibroActas from "@/components/accounting/LibroActas";
import PeriodSelector from "@/components/PeriodSelector";
import TrendsChart from "@/components/charts/TrendsChart";
import ForecastSection from "@/components/ForecastSection";
import ComparisonView from "@/components/charts/ComparisonView";
import BudgetChart from "@/components/charts/BudgetChart";
import BudgetEntryForm from "@/components/BudgetEntryForm";
import ReportGenerator from "@/components/ReportGenerator";
import MiAsistente from "@/components/MiAsistente";
import { computeAlerts, computeComplianceAlerts, getTopAlert, countByPriority } from "@/lib/alerts";
import { playAlertSound, isSoundEnabled } from "@/lib/sounds";
import { periodLabel, getPresetRange } from "@/lib/calculations";
import type { PeriodKey, PeriodPreset } from "@/lib/calculations";
import {
  computeMockDiagnosis,
  computeMockBreakeven,
  computeMandibulasData,
} from "@/lib/mockData";
import {
  MOCK_BUDGET_TARGETS,
  computeMockTrends,
  computeMockComparison,
  computeMockForecast,
  computeMockBudgetVsActual,
} from "@/lib/multiperiodMockData";

// ============================================
// TIPOS
// ============================================

type Section = "datos" | "negocio" | "legal";
type DatosMode = "flash" | "contabilidad";
type ContabilidadTab = "plan_cuentas" | "libro_diario" | "libro_mayor" | "balance_comprobacion" | "libro_inventarios" | "libro_actas" | "cierre_periodo";
type NegocioTab =
  | "cascada"
  | "mandibulas"
  | "semaforo"
  | "equilibrio"
  | "oxigeno"
  | "simulador"
  | "lab"
  | "valoracion"
  | "nomina"
  | "tendencias"
  | "comparativo"
  | "presupuesto"
  | "reportes";
type LegalTab = "boveda" | "vigilante" | "auditoria";

// View: "hub" = main dashboard with 3 module cards, "module" = inside a module
type DashboardView = "hub" | "module";

// ============================================
// HUB VIEW COMPONENT (Mockup Design)
// ============================================

function HubView({ onSelectModule }: { onSelectModule: (section: Section) => void }) {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "#F0F2F5" }}>
      {/* Subtle geometric pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(30deg, #1A242F 12%, transparent 12.5%, transparent 87%, #1A242F 87.5%, #1A242F),
            linear-gradient(150deg, #1A242F 12%, transparent 12.5%, transparent 87%, #1A242F 87.5%, #1A242F),
            linear-gradient(30deg, #1A242F 12%, transparent 12.5%, transparent 87%, #1A242F 87.5%, #1A242F),
            linear-gradient(150deg, #1A242F 12%, transparent 12.5%, transparent 87%, #1A242F 87.5%, #1A242F),
            linear-gradient(60deg, #C5A059 25%, transparent 25.5%, transparent 75%, #C5A059 75%, #C5A059),
            linear-gradient(60deg, #C5A059 25%, transparent 25.5%, transparent 75%, #C5A059 75%, #C5A059)
          `,
          backgroundSize: "80px 140px",
          backgroundPosition: "0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px",
        }}
      />

      {/* Top header bar — User company info */}
      <header className="relative z-10 w-full border-b" style={{ backgroundColor: "#1A242F", borderColor: "rgba(197, 160, 89, 0.2)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(197, 160, 89, 0.15)", border: "1px solid rgba(197, 160, 89, 0.3)" }}>
            <Building2 size={20} style={{ color: "#C5A059" }} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "rgba(197, 160, 89, 0.6)" }}>EMPRESA</p>
            <p className="text-sm font-bold" style={{ color: "#C5A059" }}>Nombre de su Empresa</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-10 pb-20 lg:pt-16 lg:pb-24">
        {/* Logo and branding centered */}
        <div className="flex flex-col items-center mb-12 lg:mb-16">
          <div className="mb-4">
            <SabiaLogo size={100} iconOnly />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-heading text-center"
            style={{ color: "#1A242F" }}>
            Mi Director Financiero
          </h1>
          <p className="text-xl sm:text-2xl font-bold tracking-widest mt-1"
            style={{ color: "#C5A059" }}>
            PTY
          </p>
          <p className="text-sm mt-2 font-semibold tracking-wide"
            style={{ color: "#C5A059", opacity: 0.7 }}>
            Tu Aliado Estrat&eacute;gico
          </p>
        </div>

        {/* Connection lines (decorative) — Desktop only */}
        <div className="hidden lg:block relative w-full max-w-4xl h-16 mb-4">
          {/* Center vertical line */}
          <div className="absolute left-1/2 top-0 w-[2px] h-8 -translate-x-1/2" style={{ backgroundColor: "#3B82F6" }} />
          {/* Horizontal line */}
          <div className="absolute left-[16.66%] top-8 right-[16.66%] h-[2px]" style={{ backgroundColor: "#3B82F6" }} />
          {/* Left vertical */}
          <div className="absolute left-[16.66%] top-8 w-[2px] h-8" style={{ backgroundColor: "#3B82F6" }} />
          {/* Center vertical (continue) */}
          <div className="absolute left-1/2 top-8 w-[2px] h-8 -translate-x-1/2" style={{ backgroundColor: "#3B82F6" }} />
          {/* Right vertical */}
          <div className="absolute right-[16.66%] top-8 w-[2px] h-8" style={{ backgroundColor: "#3B82F6" }} />
        </div>

        {/* Three module cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full max-w-5xl">
          {/* Mi Contador */}
          <button
            onClick={() => onSelectModule("datos")}
            className="group relative bg-white rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 p-6 lg:p-8 text-left overflow-hidden"
            style={{ borderColor: "rgba(197, 160, 89, 0.2)" }}
          >
            {/* Gold accent top border */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: "#C5A059" }} />

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}>
                <BookOpen size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800">Mi Contador</h3>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckSquare size={14} className="text-emerald-500" />
                <span>Impuestos al d&iacute;a</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <BookOpen size={14} className="text-blue-500" />
                <span>Libro Diario & Mayor</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <PenLine size={14} className="text-violet-500" />
                <span>Registro por voz y foto</span>
              </div>
            </div>

            {/* Preview mini chart */}
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Estado Contable</span>
                <span className="text-emerald-600 font-bold">Al d&iacute;a</span>
              </div>
              <div className="flex gap-1 h-6">
                {[40, 55, 45, 65, 50, 70, 60].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm transition-all group-hover:opacity-90"
                    style={{ height: `${h}%`, backgroundColor: i < 5 ? "#10B981" : "#C5A059", marginTop: `${100 - h}%` }} />
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:gap-2 transition-all">
              <span>Abrir</span>
              <ArrowLeft size={14} className="rotate-180" />
            </div>
          </button>

          {/* Mis Finanzas */}
          <button
            onClick={() => onSelectModule("negocio")}
            className="group relative bg-white rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 p-6 lg:p-8 text-left overflow-hidden"
            style={{ borderColor: "rgba(197, 160, 89, 0.2)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: "#C5A059" }} />

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
                <BarChart3 size={28} className="text-blue-600" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800">Mis Finanzas</h3>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <TrendingUp size={14} className="text-blue-500" />
                <span>Cascada de Rentabilidad</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <BarChart3 size={14} className="text-amber-500" />
                <span>Punto de Equilibrio</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Gem size={14} className="text-violet-500" />
                <span>Valoraci&oacute;n de Empresa</span>
              </div>
            </div>

            {/* Preview cash flow mini chart */}
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Cash Flow</span>
                <span className="text-blue-600 font-bold">+12%</span>
              </div>
              <svg viewBox="0 0 120 40" className="w-full h-8">
                <polyline
                  points="0,35 20,28 40,30 60,20 80,22 100,12 120,8"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="0,35 20,28 40,30 60,20 80,22 100,12 120,8"
                  fill="url(#blueGrad)"
                  stroke="none"
                  opacity="0.15"
                />
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:gap-2 transition-all">
              <span>Abrir</span>
              <ArrowLeft size={14} className="rotate-180" />
            </div>
          </button>

          {/* Mi Empresa (Doc. Legales) */}
          <button
            onClick={() => onSelectModule("legal")}
            className="group relative bg-white rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 p-6 lg:p-8 text-left overflow-hidden"
            style={{ borderColor: "rgba(197, 160, 89, 0.2)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: "#C5A059" }} />

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}>
                <Shield size={28} className="text-violet-600" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800">Mi Empresa</h3>
            </div>
            <p className="text-xs text-slate-400 -mt-3 mb-4">Doc. Legales</p>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Shield size={14} className="text-violet-500" />
                <span>B&oacute;veda KYC</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Scale size={14} className="text-amber-500" />
                <span>Vigilante Legal</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <FileText size={14} className="text-blue-500" />
                <span>Traductor Legal</span>
              </div>
            </div>

            {/* Preview document list */}
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Documentos</span>
                <span className="text-violet-600 font-bold">3 pendientes</span>
              </div>
              {["Acta Constitutiva", "Aviso Operaciones", "Registro DGI"].map((doc, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                  <FileText size={10} className="text-slate-300" />
                  <span>{doc}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-violet-600 group-hover:gap-2 transition-all">
              <span>Abrir</span>
              <ArrowLeft size={14} className="rotate-180" />
            </div>
          </button>
        </div>

        {/* Footer tagline */}
        <p className="mt-12 text-xs text-slate-400 text-center">
          Mi Director Financiero PTY v1.0 &mdash; Plataforma de Alta Direcci&oacute;n para PYMEs paname&ntilde;as
        </p>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD
// ============================================

export default function Dashboard() {
  const [dashboardView, setDashboardView] = useState<DashboardView>("hub");
  const [activeSection, setActiveSection] = useState<Section>("datos");
  const [datosMode, setDatosMode] = useState<DatosMode>("flash");
  const [activeContabilidadTab, setActiveContabilidadTab] = useState<ContabilidadTab>("libro_diario");
  const [activeNegocioTab, setActiveNegocioTab] = useState<NegocioTab>("cascada");
  const [activeLegalTab, setActiveLegalTab] = useState<LegalTab>("boveda");

  const [currentRecord, setCurrentRecord] = useState<FinancialRecord | null>(null);
  const [bulkRecords, setBulkRecords] = useState<FinancialRecord[]>([]);
  const [hasBulkData, setHasBulkData] = useState(false);

  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [breakeven, setBreakeven] = useState<any>(null);
  const hasData = currentRecord !== null;

  // Multi-periodo state (Fase 10)
  const [trendRange, setTrendRange] = useState<{ from: PeriodKey; to: PeriodKey }>({
    from: { year: 2026, month: 1 },
    to: { year: 2026, month: 12 },
  });
  const [comparePeriodA, setComparePeriodA] = useState<PeriodKey>({ year: 2026, month: 1 });
  const [comparePeriodB, setComparePeriodB] = useState<PeriodKey>({ year: 2026, month: 6 });
  const [budgetPeriod, setBudgetPeriod] = useState<PeriodKey>({ year: 2026, month: 6 });
  const [budgetSaving, setBudgetSaving] = useState(false);

  const societyId = "demo-society-001";

  const handleSelectModule = (section: Section) => {
    setActiveSection(section);
    setDashboardView("module");
  };

  const handleBackToHub = () => {
    setDashboardView("hub");
  };

  const handleNLPResult = (result: any) => {
    if (result.data) {
      if (result.action === "query_diagnosis") setDiagnosis(result.data);
      if (result.action === "query_breakeven") setBreakeven(result.data);
    }
  };

  const handleRecordSaved = (record: FinancialRecord, autoJournal?: boolean) => {
    setCurrentRecord(record);
    setDiagnosis(computeMockDiagnosis(record));
    setBreakeven(computeMockBreakeven(record));
    setActiveSection("negocio");
    if (autoJournal) {
      console.log("[MiDF] Auto-journal solicitado — se generaran asientos al conectar con backend");
    }
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
    setDashboardView("hub");
  };

  // Alertas estrategicas (financieras + compliance DGI/CSS)
  const [alertsSidebarOpen, setAlertsSidebarOpen] = useState(false);
  const soundPlayedRef = React.useRef(false);
  const strategicAlerts = useMemo(() => {
    if (!currentRecord) return computeComplianceAlerts();
    const financial = computeAlerts(currentRecord);
    const compliance = computeComplianceAlerts();
    const all = [...financial, ...compliance];
    const priorityOrder: Record<string, number> = { red: 0, orange: 1, yellow: 2, green: 3 };
    all.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
    return all;
  }, [currentRecord]);
  const topAlert = useMemo(() => getTopAlert(strategicAlerts), [strategicAlerts]);
  const alertCounts = useMemo(() => countByPriority(strategicAlerts), [strategicAlerts]);
  const nonGreenAlerts = strategicAlerts.filter((a) => a.priority !== "green");

  const prevRedCountRef = React.useRef(0);
  React.useEffect(() => {
    if (alertCounts.red > 0 && isSoundEnabled()) {
      if (!soundPlayedRef.current) {
        playAlertSound("danger");
        soundPlayedRef.current = true;
      } else if (alertCounts.red > prevRedCountRef.current) {
        playAlertSound("danger");
      }
    }
    prevRedCountRef.current = alertCounts.red;
  }, [alertCounts.red, alertCounts.orange]);

  const handleOpenAlertsSidebar = () => {
    setAlertsSidebarOpen(true);
    if (alertCounts.red > 0 && isSoundEnabled()) {
      playAlertSound("warning");
    }
  };

  const ebitdaMargin = diagnosis?.ratios?.margins?.ebitda_margin_pct ?? 0;
  const totalCosts = (diagnosis?.cascada?.cogs ?? 0) + (diagnosis?.cascada?.total_opex ?? 0);
  const revenue = diagnosis?.cascada?.revenue ?? 0;
  const isMordida = totalCosts > revenue && revenue > 0;

  const mandibulasData = useMemo(
    () => bulkRecords.length > 0 ? computeMandibulasData(bulkRecords as any) : null,
    [bulkRecords]
  );

  const trendsData = useMemo(() => {
    if (bulkRecords.length === 0) return null;
    const fromIdx = trendRange.from.month - 1;
    const toIdx = trendRange.to.month;
    const sliced = bulkRecords.slice(fromIdx, toIdx);
    return sliced.length > 0 ? computeMockTrends(sliced as any, trendRange.from.year) : null;
  }, [bulkRecords, trendRange]);

  const forecastData = useMemo(() => {
    if (bulkRecords.length === 0) return null;
    return computeMockForecast(bulkRecords as any, 6, 2026);
  }, [bulkRecords]);

  const comparisonData = useMemo(() => {
    if (bulkRecords.length === 0) return null;
    const idxA = comparePeriodA.month - 1;
    const idxB = comparePeriodB.month - 1;
    if (idxA >= 0 && idxA < bulkRecords.length && idxB >= 0 && idxB < bulkRecords.length) {
      return computeMockComparison(bulkRecords[idxA] as any, bulkRecords[idxB] as any);
    }
    return null;
  }, [bulkRecords, comparePeriodA, comparePeriodB]);

  const budgetVsActualData = useMemo(() => {
    if (bulkRecords.length === 0) return null;
    const idx = budgetPeriod.month - 1;
    const budget = MOCK_BUDGET_TARGETS.find(
      (b) => b.period_year === budgetPeriod.year && b.period_month === budgetPeriod.month
    );
    if (idx >= 0 && idx < bulkRecords.length && budget) {
      return computeMockBudgetVsActual(bulkRecords[idx] as any, budget);
    }
    return null;
  }, [bulkRecords, budgetPeriod]);

  const handlePreset = (preset: PeriodPreset) => {
    const range = getPresetRange(preset, 2026, 12);
    setTrendRange(range);
  };

  const handleBudgetSave = (data: any) => {
    setBudgetSaving(true);
    setTimeout(() => {
      setBudgetSaving(false);
    }, 500);
  };

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
    { key: "tendencias", label: "Tendencias", icon: <TrendingUp size={14} /> },
    { key: "comparativo", label: "Comparativo", icon: <ArrowLeftRight size={14} /> },
    { key: "presupuesto", label: "Presupuesto", icon: <Target size={14} /> },
    { key: "reportes", label: "Reportes", icon: <FileBarChart size={14} /> },
  ];

  const legalTabs: { key: LegalTab; label: string; icon: React.ReactNode }[] = [
    { key: "boveda", label: "Boveda KYC", icon: <Shield size={14} /> },
    { key: "vigilante", label: "Vigilante Legal", icon: <Scale size={14} /> },
    { key: "auditoria", label: "Auditoria", icon: <History size={14} /> },
  ];

  // ===== HUB VIEW =====
  if (dashboardView === "hub") {
    return (
      <>
        <HubView onSelectModule={handleSelectModule} />
        {/* Mi Asistente always available */}
        <MiAsistente
          societyId={societyId}
          onResult={(result) => {
            if (result?.action === "journal_entry_created") {
              // Refrescar datos si se creo un asiento
            }
          }}
        />
      </>
    );
  }

  // ===== MODULE VIEW (Full Dashboard) =====
  return (
    <main className="min-h-screen bg-slate-50">
      {/* ====== TOP BAR ====== */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 lg:px-6 lg:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back to Hub button */}
            <button
              onClick={handleBackToHub}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-[#C5A059] bg-slate-100 hover:bg-amber-50 rounded-full transition-colors"
              title="Volver al Inicio"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Inicio</span>
            </button>
            <button onClick={handleLogoClick} className="flex items-center gap-2 lg:gap-3 hover:opacity-90 transition-opacity">
              <SabiaLogo size={36} iconOnly className="lg:hidden" />
              <SabiaLogo size={44} iconOnly className="hidden lg:block" />
              <div className="text-left">
                <h1 className="text-sm lg:text-base font-extrabold text-slate-800">
                  Mi Director Financiero PTY
                </h1>
                <p className="text-[10px] lg:text-xs text-slate-400">
                  Tu Aliado Estrat&eacute;gico
                </p>
              </div>
            </button>
          </div>

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
              onClick={handleOpenAlertsSidebar}
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

            {datosMode === "flash" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6">
                <DataEntryWizard onRecordSaved={handleRecordSaved} onBulkRecordsSaved={handleBulkRecordsSaved} onNavigateHome={handleBackToHub} />
              </div>
            )}

            {datosMode === "contabilidad" && (
              <div className="space-y-4">
                <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 overflow-x-auto">
                  {([
                    { key: "plan_cuentas" as ContabilidadTab, label: "Plan de Cuentas", icon: <FolderTree size={14} /> },
                    { key: "libro_diario" as ContabilidadTab, label: "Libro Diario", icon: <BookOpen size={14} /> },
                    { key: "libro_mayor" as ContabilidadTab, label: "Libro Mayor", icon: <BookMarked size={14} /> },
                    { key: "balance_comprobacion" as ContabilidadTab, label: "Balance Comprobacion", icon: <CheckSquare size={14} /> },
                    { key: "libro_inventarios" as ContabilidadTab, label: "Inventarios y Balances", icon: <Package size={14} /> },
                    { key: "libro_actas" as ContabilidadTab, label: "Libro de Actas", icon: <ClipboardList size={14} /> },
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
                <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6 min-h-[400px]">
                  {activeContabilidadTab === "plan_cuentas" && <ChartOfAccounts societyId={societyId} />}
                  {activeContabilidadTab === "libro_diario" && <LibroDiario societyId={societyId} />}
                  {activeContabilidadTab === "libro_mayor" && <LibroMayor societyId={societyId} />}
                  {activeContabilidadTab === "balance_comprobacion" && <BalanceComprobacion societyId={societyId} />}
                  {activeContabilidadTab === "libro_inventarios" && <LibroInventarios societyId={societyId} />}
                  {activeContabilidadTab === "libro_actas" && <LibroActas societyId={societyId} />}
                  {activeContabilidadTab === "cierre_periodo" && <PeriodClosingPanel societyId={societyId} />}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECCION 2: MIS FINANZAS */}
        {activeSection === "negocio" && (
          <div className="space-y-4">
            {!hasData && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 mx-auto">
                  <BarChart3 size={24} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Aun no hay datos financieros</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Ve a <button onClick={() => setActiveSection("datos")} className="text-emerald-600 font-semibold underline">Mi Contabilidad</button> e ingresa los datos de tu negocio para generar tu diagnostico financiero completo.
                </p>
              </div>
            )}
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
                      {currentRecord && <BalanceGeneralCard record={currentRecord} />}
                    </div>
                  ) : (<EmptyState text="Carga datos en 'Mi Contabilidad' para ver la cascada." />)}
                </div>
              )}
              {activeNegocioTab === "mandibulas" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-6">Mandibulas: Ventas vs Costos</h2>{mandibulasData ? <MandibulasChart data={mandibulasData} /> : <EmptyState text="Ingresa datos de multiples meses en 'Mi Contabilidad' para ver el grafico de Mandibulas." />}</div>)}
              {activeNegocioTab === "semaforo" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-6">Semaforo Integral</h2>{diagnosis?.ratios ? <RatioGauges ratios={diagnosis.ratios} /> : <EmptyState text="Carga datos para ver el semaforo." />}</div>)}
              {activeNegocioTab === "equilibrio" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-6">Mapa de Supervivencia</h2>{breakeven ? <BreakevenChart breakevenMonthly={breakeven.breakeven_monthly} currentSales={breakeven.current_sales} marginOfSafety={breakeven.margin_of_safety} zone={breakeven.zone} contributionMarginPct={breakeven.contribution_margin_pct} targetSales={breakeven.target_sales} /> : <EmptyState text="Carga datos para ver el punto de equilibrio." />}</div>)}
              {activeNegocioTab === "oxigeno" && (hasData ? <OxigenoTab record={currentRecord!} /> : <EmptyState text="Ingresa datos en 'Mi Contabilidad' para ver el analisis de Oxigeno." />)}
              {activeNegocioTab === "simulador" && (hasData ? <SimuladorEstrategico record={currentRecord!} /> : <EmptyState text="Ingresa datos en 'Mi Contabilidad' para usar el Simulador." />)}
              {activeNegocioTab === "lab" && <LabPrecios />}
              {activeNegocioTab === "valoracion" && (hasData ? <ValoracionTab record={currentRecord!} /> : <EmptyState text="Ingresa datos en 'Mi Contabilidad' para ver la Valoracion de tu Negocio." />)}
              {activeNegocioTab === "nomina" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-4">Costo Real de Personal — Panama 2026</h2><PayrollEngine societyId={societyId} /></div>)}

              {activeNegocioTab === "tendencias" && (
                <div className="space-y-4">
                  <h2 className="text-lg lg:text-xl font-bold text-slate-800">Tendencias Multi-Periodo</h2>
                  {trendsData && forecastData ? (
                    <>
                      <PeriodSelector
                        mode="range"
                        from={trendRange.from}
                        to={trendRange.to}
                        onChangeFrom={(p) => setTrendRange((prev) => ({ ...prev, from: p }))}
                        onChangeTo={(p) => setTrendRange((prev) => ({ ...prev, to: p }))}
                        onPreset={handlePreset}
                      />
                      <TrendsChart
                        points={trendsData.points}
                        growthRates={trendsData.growth_rates}
                        movingAverages={trendsData.moving_averages}
                      />
                      <div className="border-t border-slate-200 pt-4 mt-4">
                        <ForecastSection
                          historical={forecastData.historical}
                          projected={forecastData.projected}
                          method={forecastData.method}
                        />
                      </div>
                    </>
                  ) : (
                    <EmptyState text="Ingresa datos de multiples meses en 'Mi Contabilidad' para ver tendencias y proyecciones." />
                  )}
                </div>
              )}

              {activeNegocioTab === "comparativo" && (
                <div className="space-y-4">
                  <h2 className="text-lg lg:text-xl font-bold text-slate-800">Comparativo de Periodos</h2>
                  <PeriodSelector
                    mode="compare"
                    periodA={comparePeriodA}
                    periodB={comparePeriodB}
                    onChangePeriodA={setComparePeriodA}
                    onChangePeriodB={setComparePeriodB}
                  />
                  {comparisonData ? (
                    <ComparisonView
                      data={comparisonData}
                      labelA={periodLabel(comparePeriodA.year, comparePeriodA.month)}
                      labelB={periodLabel(comparePeriodB.year, comparePeriodB.month)}
                    />
                  ) : (
                    <EmptyState text="Selecciona dos periodos validos para comparar." />
                  )}
                </div>
              )}

              {activeNegocioTab === "presupuesto" && (
                <div className="space-y-6">
                  <h2 className="text-lg lg:text-xl font-bold text-slate-800">Presupuesto vs Real</h2>
                  <PeriodSelector
                    mode="single"
                    value={budgetPeriod}
                    onChange={setBudgetPeriod}
                    label="Periodo"
                  />
                  {budgetVsActualData ? (
                    <BudgetChart
                      items={budgetVsActualData.items}
                      overallScore={budgetVsActualData.overall_score}
                    />
                  ) : (
                    <EmptyState text="No hay presupuesto configurado para este periodo." />
                  )}
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Target size={14} className="text-emerald-500" />
                      Configurar Presupuesto
                    </h3>
                    <BudgetEntryForm
                      period={budgetPeriod}
                      initialData={MOCK_BUDGET_TARGETS.find(
                        (b) => b.period_year === budgetPeriod.year && b.period_month === budgetPeriod.month
                      )}
                      onSave={handleBudgetSave}
                      saving={budgetSaving}
                    />
                  </div>
                </div>
              )}

              {activeNegocioTab === "reportes" && (
                <div className="space-y-4">
                  <h2 className="text-lg lg:text-xl font-bold text-slate-800">Reportes Ejecutivos</h2>
                  <ReportGenerator societyId={societyId} />
                </div>
              )}
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
          onStart={() => { handleWelcomeDismiss(); setActiveSection("datos"); setDashboardView("module"); }}
        />
      )}

      {/* Mi Asistente — Chatbot IA Flotante */}
      <MiAsistente
        societyId={societyId}
        onResult={(result) => {
          if (result?.action === "journal_entry_created") {
            // Refrescar datos si se creo un asiento
          }
        }}
      />
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
