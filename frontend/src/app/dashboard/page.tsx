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
  Bot,
  Upload,
  Pencil,
  ImageIcon,
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
import SetupWizard from "@/components/SetupWizard";
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
import EspejoDGI from "@/components/EspejoDGI";
import FormalizacionBanner from "@/components/FormalizacionBanner";
import { DOC_CATEGORY_TO_STEP, updateStepStatus } from "@/lib/formalizacion";
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
type ContabilidadTab = "plan_cuentas" | "libro_diario" | "libro_mayor" | "balance_comprobacion" | "libro_inventarios" | "cierre_periodo" | "espejo_dgi";
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
type LegalTab = "boveda" | "vigilante" | "auditoria" | "libro_actas";

// View: "hub" = main dashboard with 3 module cards, "module" = inside a module
type DashboardView = "hub" | "module";

// ============================================
// HUB VIEW — Organigrama Empresarial (Dark Theme)
// ============================================

function HubView({ onSelectModule, onOpenAsistente }: { onSelectModule: (section: Section) => void; onOpenAsistente: () => void }) {
  // Company info (localStorage temporal, luego Supabase)
  const [companyName, setCompanyName] = React.useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("midf_company_name") || "";
    return "";
  });
  const [companyLogo, setCompanyLogo] = React.useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("midf_company_logo") || "";
    return "";
  });
  const [companyRubro, setCompanyRubro] = React.useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("midf_company_rubro") || "";
    return "";
  });
  const [editingCompany, setEditingCompany] = React.useState(false);
  const [tempName, setTempName] = React.useState(companyName);
  const [tempRubro, setTempRubro] = React.useState(companyRubro);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const RUBROS_MAP: Record<string, string> = {
    restaurante: "Restaurante / Alimentos",
    comercio_minorista: "Comercio Minorista",
    tecnologia: "Tecnologia / Software",
    servicios_profesionales: "Servicios Profesionales",
    construccion: "Construccion / Bienes Raices",
    transporte: "Transporte / Logistica",
    salud: "Salud / Clinica / Farmacia",
    educacion: "Educacion / Academia",
    turismo: "Turismo / Hoteleria",
    manufactura: "Manufactura / Produccion",
    agro: "Agropecuario / Agroindustria",
    belleza: "Belleza / Estetica / Salon",
    otro: "Otro",
  };

  const handleSaveCompany = () => {
    localStorage.setItem("midf_company_name", tempName);
    localStorage.setItem("midf_company_rubro", tempRubro);
    setCompanyName(tempName);
    setCompanyRubro(tempRubro);
    setEditingCompany(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      localStorage.setItem("midf_company_logo", dataUrl);
      setCompanyLogo(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const GOLD = "#C5A059";
  const NAVY = "#1A242F";

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1A242F] via-[#1A242F] to-[#0F171E]">
      {/* Decorative gold accent lines */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-40" />
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-40" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-8 pb-20 lg:pt-12 lg:pb-24 max-w-5xl mx-auto">

        {/* ===== NIVEL 0: EMPRESA DEL USUARIO (Nodo editable) ===== */}
        <div
          className="relative rounded-2xl border-2 p-3 lg:p-4 w-full max-w-sm text-center cursor-pointer transition-all hover:border-opacity-60 flex flex-col items-center"
          style={{
            backgroundColor: "rgba(197, 160, 89, 0.08)",
            borderColor: "rgba(197, 160, 89, 0.3)",
          }}
          onClick={() => { if (!editingCompany) { setTempName(companyName); setTempRubro(companyRubro); setEditingCompany(true); } }}
        >
          {/* Logo area — 2/3 del card, pegado al tope */}
          <div className="w-2/3 aspect-square flex items-center justify-center mb-2">
            {companyLogo ? (
              <div className="relative group w-full h-full">
                <img
                  src={companyLogo}
                  alt="Logo empresa"
                  className="w-full h-full rounded-xl object-contain"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: GOLD }}
                >
                  <Pencil size={10} style={{ color: NAVY }} />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }}
                className="w-full h-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all hover:border-opacity-60"
                style={{ borderColor: "rgba(197, 160, 89, 0.4)" }}
              >
                <Upload size={24} style={{ color: GOLD, opacity: 0.6 }} />
                <span className="text-[10px] font-medium" style={{ color: GOLD, opacity: 0.5 }}>Logo</span>
              </button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>

          {/* Company name */}
          {editingCompany ? (
            <div className="space-y-2 w-full" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Nombre de su Empresa"
                autoFocus
                className="w-full text-center text-sm font-bold bg-transparent border-b-2 py-1 outline-none placeholder-opacity-40"
                style={{ color: GOLD, borderColor: "rgba(197, 160, 89, 0.4)", caretColor: GOLD }}
                onKeyDown={(e) => e.key === "Enter" && handleSaveCompany()}
              />
              <select
                value={tempRubro}
                onChange={(e) => setTempRubro(e.target.value)}
                className="w-full text-center text-xs bg-transparent border-b-2 py-1 outline-none"
                style={{ color: GOLD, borderColor: "rgba(197, 160, 89, 0.4)" }}
              >
                <option value="">Selecciona tu rubro</option>
                {Object.entries(RUBROS_MAP).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button
                onClick={handleSaveCompany}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                Guardar
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: "rgba(197, 160, 89, 0.5)" }}>
                MI EMPRESA
              </p>
              <p className="text-lg lg:text-xl font-bold mt-0.5" style={{ color: GOLD }}>
                {companyName || "Nombre de su Empresa"}
              </p>
              {companyRubro && (
                <span
                  className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide"
                  style={{ backgroundColor: "rgba(197, 160, 89, 0.15)", color: "rgba(197, 160, 89, 0.7)" }}
                >
                  {RUBROS_MAP[companyRubro] || companyRubro}
                </span>
              )}
              {!companyName && !companyRubro && (
                <p className="text-[9px] mt-1" style={{ color: "rgba(197, 160, 89, 0.4)" }}>
                  Toca para editar
                </p>
              )}
            </div>
          )}
        </div>

        {/* Banner de Formalizacion S.E. (si no tiene RUC) */}
        <div className="my-3 w-full flex justify-center">
          <FormalizacionBanner />
        </div>

        {/* Linea vertical: Empresa → Director */}
        <div className="w-[2px] h-6 lg:h-10" style={{ backgroundColor: "rgba(197, 160, 89, 0.4)" }} />

        {/* ===== NIVEL 1: MI DIRECTOR FINANCIERO PTY ===== */}
        <div
          className="relative rounded-2xl border-2 p-6 lg:p-8 w-full max-w-md text-center"
          style={{
            backgroundColor: "rgba(197, 160, 89, 0.06)",
            borderColor: "rgba(197, 160, 89, 0.25)",
          }}
        >
          <div className="flex justify-center mb-3">
            <SabiaLogo size={80} iconOnly />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-heading"
            style={{ color: GOLD }}>
            Mi Director Financiero
          </h1>
          <p className="text-lg sm:text-xl font-bold tracking-widest mt-1"
            style={{ color: GOLD, opacity: 0.85 }}>
            PTY
          </p>
          <p className="text-xs sm:text-sm mt-2 font-semibold tracking-wide"
            style={{ color: GOLD, opacity: 0.6 }}>
            Tu Aliado Estrat&eacute;gico
          </p>
        </div>

        {/* ===== ZONA DE CONEXION: Director → Asistente (lateral) + 3 verticales ===== */}

        {/* Desktop layout */}
        <div className="hidden lg:block relative w-full" style={{ height: "160px" }}>
          {/* Vertical line from Director down to horizontal T */}
          <div className="absolute left-1/2 top-0 w-[2px] h-[90px] -translate-x-1/2" style={{ backgroundColor: "rgba(197, 160, 89, 0.4)" }} />

          {/* Mi Asistente: horizontal line + box — positioned at midpoint of vertical stem */}
          <div
            className="absolute top-[20px] flex items-center"
            style={{ left: "50%", height: "50px" }}
          >
            {/* Horizontal line from center stem to box */}
            <div className="h-[2px] shrink-0" style={{ width: "100px", backgroundColor: "rgba(197, 160, 89, 0.4)" }} />
            {/* Mi Asistente node — sits right after the line, no overlap */}
            <button
              onClick={onOpenAsistente}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all hover:scale-105 group shrink-0"
              style={{
                backgroundColor: "rgba(197, 160, 89, 0.08)",
                borderColor: "rgba(197, 160, 89, 0.3)",
              }}
            >
              <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(197, 160, 89, 0.15)" }}>
                <Bot size={22} style={{ color: GOLD }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: GOLD }}>Mi Asistente</p>
                <p className="text-[10px]" style={{ color: "rgba(197, 160, 89, 0.5)" }}>IA Chatbot</p>
              </div>
            </button>
          </div>

          {/* Horizontal T-bar spanning 3 columns — at y=90px */}
          <div className="absolute top-[90px] h-[2px]" style={{ left: "16.66%", right: "16.66%", backgroundColor: "rgba(197, 160, 89, 0.4)" }} />

          {/* 3 vertical drops from T-bar to cards */}
          <div className="absolute top-[90px] w-[2px] h-[70px]" style={{ left: "16.66%", backgroundColor: "rgba(197, 160, 89, 0.4)" }} />
          <div className="absolute left-1/2 top-[90px] w-[2px] h-[70px] -translate-x-1/2" style={{ backgroundColor: "rgba(197, 160, 89, 0.4)" }} />
          <div className="absolute top-[90px] w-[2px] h-[70px]" style={{ right: "16.66%", backgroundColor: "rgba(197, 160, 89, 0.4)" }} />
        </div>

        {/* Mobile layout — simplified lines */}
        <div className="lg:hidden flex flex-col items-center">
          <div className="w-[2px] h-5" style={{ backgroundColor: "rgba(197, 160, 89, 0.4)" }} />

          {/* Mi Asistente node (mobile — centered) */}
          <button
            onClick={onOpenAsistente}
            className="flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all hover:scale-105"
            style={{
              backgroundColor: "rgba(197, 160, 89, 0.08)",
              borderColor: "rgba(197, 160, 89, 0.3)",
            }}
          >
            <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(197, 160, 89, 0.15)" }}>
              <Bot size={22} style={{ color: GOLD }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold" style={{ color: GOLD }}>Mi Asistente</p>
              <p className="text-[10px]" style={{ color: "rgba(197, 160, 89, 0.5)" }}>IA Chatbot</p>
            </div>
          </button>

          <div className="w-[2px] h-5" style={{ backgroundColor: "rgba(197, 160, 89, 0.4)" }} />
        </div>

        {/* ===== NIVEL 2: TRES VERTICALES (Tarjetas de Modulo) ===== */}
        {/* Desktop: 3 columns grid / Mobile: horizontal scroll */}
        <div className="hidden md:grid md:grid-cols-3 gap-5 lg:gap-6 w-full">
          {/* Mi Contador */}
          <button
            onClick={() => onSelectModule("datos")}
            className="group relative rounded-2xl border-2 p-5 lg:p-6 text-left overflow-hidden transition-all hover:-translate-y-1 hover:border-opacity-60"
            style={{
              backgroundColor: "rgba(197, 160, 89, 0.05)",
              borderColor: "rgba(197, 160, 89, 0.15)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: GOLD }} />

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}>
                <BookOpen size={24} style={{ color: GOLD }} />
              </div>
              <h3 className="text-base lg:text-lg font-bold" style={{ color: GOLD }}>Mi Contador</h3>
            </div>

            <div className="space-y-2.5 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckSquare size={13} style={{ color: GOLD, opacity: 0.6 }} />
                <span>Impuestos al d&iacute;a</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <BookOpen size={13} style={{ color: GOLD, opacity: 0.6 }} />
                <span>Libro Diario &amp; Mayor</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <PenLine size={13} style={{ color: GOLD, opacity: 0.6 }} />
                <span>Registro por voz y foto</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-lg border" style={{ backgroundColor: "rgba(197, 160, 89, 0.03)", borderColor: "rgba(197, 160, 89, 0.1)" }}>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-500">Estado Contable</span>
                <span className="font-bold" style={{ color: GOLD }}>Al d&iacute;a</span>
              </div>
              <div className="flex gap-1 h-5">
                {[40, 55, 45, 65, 50, 70, 60].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm"
                    style={{ height: `${h}%`, backgroundColor: GOLD, opacity: i < 5 ? 0.5 : 0.8, marginTop: `${100 - h}%` }} />
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all" style={{ color: GOLD }}>
              <span>Abrir</span>
              <ArrowLeft size={14} className="rotate-180" />
            </div>
          </button>

          {/* Mis Finanzas */}
          <button
            onClick={() => onSelectModule("negocio")}
            className="group relative rounded-2xl border-2 p-5 lg:p-6 text-left overflow-hidden transition-all hover:-translate-y-1 hover:border-opacity-60"
            style={{
              backgroundColor: "rgba(197, 160, 89, 0.05)",
              borderColor: "rgba(197, 160, 89, 0.15)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: GOLD }} />

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}>
                <BarChart3 size={24} style={{ color: GOLD }} />
              </div>
              <h3 className="text-base lg:text-lg font-bold" style={{ color: GOLD }}>Mis Finanzas</h3>
            </div>

            <div className="space-y-2.5 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <TrendingUp size={13} style={{ color: GOLD, opacity: 0.6 }} />
                <span>Cascada de Rentabilidad</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <BarChart3 size={13} style={{ color: GOLD, opacity: 0.6 }} />
                <span>Punto de Equilibrio</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Gem size={13} style={{ color: GOLD, opacity: 0.6 }} />
                <span>Valoraci&oacute;n de Empresa</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-lg border" style={{ backgroundColor: "rgba(197, 160, 89, 0.03)", borderColor: "rgba(197, 160, 89, 0.1)" }}>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-500">Cash Flow</span>
                <span className="font-bold" style={{ color: GOLD }}>+12%</span>
              </div>
              <svg viewBox="0 0 120 40" className="w-full h-7">
                <polyline points="0,35 20,28 40,30 60,20 80,22 100,12 120,8" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="0,35 20,28 40,30 60,20 80,22 100,12 120,8 120,40 0,40" fill={GOLD} stroke="none" opacity="0.1" />
              </svg>
            </div>

            <div className="mt-4 flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all" style={{ color: GOLD }}>
              <span>Abrir</span>
              <ArrowLeft size={14} className="rotate-180" />
            </div>
          </button>

          {/* Mi Empresa (Doc. Legales) */}
          <button
            onClick={() => onSelectModule("legal")}
            className="group relative rounded-2xl border-2 p-5 lg:p-6 text-left overflow-hidden transition-all hover:-translate-y-1 hover:border-opacity-60"
            style={{
              backgroundColor: "rgba(197, 160, 89, 0.05)",
              borderColor: "rgba(197, 160, 89, 0.15)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: GOLD }} />

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}>
                <Shield size={24} style={{ color: GOLD }} />
              </div>
              <div>
                <h3 className="text-base lg:text-lg font-bold" style={{ color: GOLD }}>Mi Empresa</h3>
                <p className="text-[10px] text-slate-500">Doc. Legales</p>
              </div>
            </div>

            <div className="space-y-2.5 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Shield size={13} style={{ color: GOLD, opacity: 0.6 }} />
                <span>B&oacute;veda KYC</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Scale size={13} style={{ color: GOLD, opacity: 0.6 }} />
                <span>Vigilante Legal</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <FileText size={13} style={{ color: GOLD, opacity: 0.6 }} />
                <span>Traductor Legal</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-lg border space-y-1.5" style={{ backgroundColor: "rgba(197, 160, 89, 0.03)", borderColor: "rgba(197, 160, 89, 0.1)" }}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Documentos</span>
                <span className="font-bold" style={{ color: GOLD }}>3 pendientes</span>
              </div>
              {["Acta Constitutiva", "Aviso Operaciones", "Registro DGI"].map((doc, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <FileText size={9} style={{ color: GOLD, opacity: 0.4 }} />
                  <span>{doc}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all" style={{ color: GOLD }}>
              <span>Abrir</span>
              <ArrowLeft size={14} className="rotate-180" />
            </div>
          </button>
        </div>

        {/* Mobile: horizontal scroll cards */}
        <div className="md:hidden w-full overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-4" style={{ minWidth: "max-content" }}>
            {/* Mi Contador — mobile */}
            <button
              onClick={() => onSelectModule("datos")}
              className="group relative rounded-2xl border-2 p-4 text-left overflow-hidden transition-all active:scale-[0.98] shrink-0"
              style={{
                width: "260px",
                backgroundColor: "rgba(197, 160, 89, 0.05)",
                borderColor: "rgba(197, 160, 89, 0.15)",
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: GOLD }} />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}>
                  <BookOpen size={20} style={{ color: GOLD }} />
                </div>
                <h3 className="text-sm font-bold" style={{ color: GOLD }}>Mi Contador</h3>
              </div>
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckSquare size={11} style={{ color: GOLD, opacity: 0.6 }} />
                  <span>Impuestos al d&iacute;a</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <BookOpen size={11} style={{ color: GOLD, opacity: 0.6 }} />
                  <span>Libro Diario &amp; Mayor</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <PenLine size={11} style={{ color: GOLD, opacity: 0.6 }} />
                  <span>Registro por voz y foto</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: GOLD }}>
                <span>Abrir</span>
                <ArrowLeft size={12} className="rotate-180" />
              </div>
            </button>

            {/* Mis Finanzas — mobile */}
            <button
              onClick={() => onSelectModule("negocio")}
              className="group relative rounded-2xl border-2 p-4 text-left overflow-hidden transition-all active:scale-[0.98] shrink-0"
              style={{
                width: "260px",
                backgroundColor: "rgba(197, 160, 89, 0.05)",
                borderColor: "rgba(197, 160, 89, 0.15)",
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: GOLD }} />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}>
                  <BarChart3 size={20} style={{ color: GOLD }} />
                </div>
                <h3 className="text-sm font-bold" style={{ color: GOLD }}>Mis Finanzas</h3>
              </div>
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <TrendingUp size={11} style={{ color: GOLD, opacity: 0.6 }} />
                  <span>Cascada de Rentabilidad</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <BarChart3 size={11} style={{ color: GOLD, opacity: 0.6 }} />
                  <span>Punto de Equilibrio</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Gem size={11} style={{ color: GOLD, opacity: 0.6 }} />
                  <span>Valoraci&oacute;n de Empresa</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: GOLD }}>
                <span>Abrir</span>
                <ArrowLeft size={12} className="rotate-180" />
              </div>
            </button>

            {/* Mi Empresa — mobile */}
            <button
              onClick={() => onSelectModule("legal")}
              className="group relative rounded-2xl border-2 p-4 text-left overflow-hidden transition-all active:scale-[0.98] shrink-0"
              style={{
                width: "260px",
                backgroundColor: "rgba(197, 160, 89, 0.05)",
                borderColor: "rgba(197, 160, 89, 0.15)",
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: GOLD }} />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}>
                  <Shield size={20} style={{ color: GOLD }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: GOLD }}>Mi Empresa</h3>
                  <p className="text-[9px] text-slate-500">Doc. Legales</p>
                </div>
              </div>
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Shield size={11} style={{ color: GOLD, opacity: 0.6 }} />
                  <span>B&oacute;veda KYC</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Scale size={11} style={{ color: GOLD, opacity: 0.6 }} />
                  <span>Vigilante Legal</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FileText size={11} style={{ color: GOLD, opacity: 0.6 }} />
                  <span>Traductor Legal</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: GOLD }}>
                <span>Abrir</span>
                <ArrowLeft size={12} className="rotate-180" />
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-10 text-xs text-center" style={{ color: "rgba(197, 160, 89, 0.35)" }}>
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

  // Auto-complete formalizacion tracker cuando se sube un documento relevante
  const handleDocumentUploaded = (category: string) => {
    const stepId = DOC_CATEGORY_TO_STEP[category];
    if (stepId) {
      updateStepStatus(stepId, "completado");
    }
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

  // Setup wizard (primera vez — onboarding)
  const [setupComplete, setSetupComplete] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("midf_setup_complete") === "true";
    }
    return true; // SSR: assume complete to avoid flash
  });

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
    { key: "libro_actas", label: "Libro de Actas", icon: <ClipboardList size={14} /> },
  ];

  // Mi Asistente open state (for hub org chart node)
  const [asistenteOpen, setAsistenteOpen] = React.useState(false);

  // ===== SETUP WIZARD (primera vez) =====
  if (!setupComplete) {
    return <SetupWizard onComplete={() => setSetupComplete(true)} />;
  }

  // ===== HUB VIEW =====
  if (dashboardView === "hub") {
    return (
      <>
        <HubView onSelectModule={handleSelectModule} onOpenAsistente={() => setAsistenteOpen(true)} />
        {/* Mi Asistente — opens via org chart node click */}
        <MiAsistente
          societyId={societyId}
          forceOpen={asistenteOpen}
          onClose={() => setAsistenteOpen(false)}
          hideButton
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
                    { key: "cierre_periodo" as ContabilidadTab, label: "Cierre y Reportes", icon: <Lock size={14} /> },
                    { key: "espejo_dgi" as ContabilidadTab, label: "Espejo DGI", icon: <Shield size={14} /> },
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
                  {activeContabilidadTab === "cierre_periodo" && <PeriodClosingPanel societyId={societyId} />}
                  {activeContabilidadTab === "espejo_dgi" && <EspejoDGI societyId={societyId} />}
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
              {activeLegalTab === "boveda" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-4">Boveda KYC — Debida Diligencia</h2><LegalVault onDocumentUploaded={handleDocumentUploaded} /></div>)}
              {activeLegalTab === "vigilante" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-4">Vigilante Legal: Alertas de Cumplimiento</h2><WatchdogDashboard /></div>)}
              {activeLegalTab === "auditoria" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-4">Historial de Cambios</h2><AuditTimeline limit={30} /></div>)}
              {activeLegalTab === "libro_actas" && (<div><h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-4">Libro de Actas</h2><LibroActas societyId={societyId} /></div>)}
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
