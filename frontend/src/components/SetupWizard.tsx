"use client";
import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  Building2,
  Shield,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Check,
  ImageIcon,
  Sparkles,
  Briefcase,
  Sprout,
  Heart,
  Globe,
  Users,
  AlertTriangle,
  FileText,
  DollarSign,
  Phone,
  PenLine,
  BookOpen,
  Store,
  Wrench,
  ShoppingBag,
  Info,
  Landmark,
  BarChart3,
  Receipt,
  Package,
  CreditCard,
  BrainCircuit,
} from "lucide-react";
import MidfLogo from "@/components/MidfLogo";
import { trackOnboardingProfile, trackOnboardingCompleted } from "@/lib/analytics";
import { useAuth } from "@/components/AuthProvider";
import { useSociety } from "@/components/SocietyProvider";
import { societiesApi } from "@/lib/api";

// ─── Theme ───

const THEME = {
  heading: "#1A242F",
  label: "#374151",
  body: "#4B5563",
  muted: "#9CA3AF",
  accent: "#1D9E75",
  accentBg: "#E1F5EE",
  border: "#E5E7EB",
  cardBg: "#FFFFFF",
};

// ─── Types ───

export type UserProfile = "A" | "B" | "C" | "D";

type TipoActividad = "comercio" | "servicios" | "produccion" | "";
type RucStatus = "si" | "en_tramite" | "no" | "";

const RUBROS = [
  { key: "restaurante", label: "Restaurante / Alimentos" },
  { key: "comercio_minorista", label: "Comercio Minorista" },
  { key: "tecnologia", label: "Tecnologia / Software" },
  { key: "servicios_profesionales", label: "Servicios Profesionales" },
  { key: "construccion", label: "Construccion / Bienes Raices" },
  { key: "transporte", label: "Transporte / Logistica" },
  { key: "salud", label: "Salud / Clinica / Farmacia" },
  { key: "educacion", label: "Educacion / Academia" },
  { key: "turismo", label: "Turismo / Hoteleria" },
  { key: "manufactura", label: "Manufactura / Produccion" },
  { key: "agro", label: "Agropecuario / Agroindustria" },
  { key: "belleza", label: "Belleza / Estetica / Salon" },
  { key: "otro", label: "Otro" },
];

// Costos reales de formalizacion (Profile B info)
const COSTOS_FORMALIZACION = [
  { concepto: "Registro Unico de Contribuyente (RUC)", costo: "Gratis", nota: "En linea via e-Tax 2.0" },
  { concepto: "Aviso de Operacion (MICI)", costo: "B/.15 – B/.55", nota: "Segun capital" },
  { concepto: "Inscripcion CSS como empleador", costo: "Gratis", nota: "Obligatorio si tienes empleados" },
  { concepto: "Sociedad de Emprendimiento (Ley 186)", costo: "B/.0 – B/.50", nota: "Sin abogado requerido" },
  { concepto: "Equipo Fiscal (PAC)", costo: "B/.80 – B/.300", nota: "Solo si facturas > B/.36,000/ano" },
];

// Glosario basico (Profile D)
const GLOSARIO_BASICO = [
  { termino: "DGI", definicion: "Direccion General de Ingresos — la entidad de impuestos de Panama" },
  { termino: "RUC", definicion: "Registro Unico de Contribuyente — tu numero de identificacion fiscal" },
  { termino: "ITBMS", definicion: "Impuesto de Transferencia de Bienes Muebles y Servicios — equivalente al IVA (7%)" },
  { termino: "Aviso de Operacion", definicion: "Permiso del Ministerio de Comercio para operar tu negocio" },
  { termino: "CSS", definicion: "Caja de Seguro Social — seguro social obligatorio para empleados" },
  { termino: "PAC", definicion: "Punto de Atencion al Contribuyente — equipo fiscal para emitir facturas" },
];

// Profile A Step 3 — Datos fiscales
const ENTITY_TYPES_ONBOARDING = [
  { value: "SE", label: "Sociedad de Emprendimiento (Ley 50 de 2022)", desc: "Ideal para nuevos negocios y startups" },
  { value: "SA", label: "Sociedad Anonima (S.A.)", desc: "Libre compra-venta de acciones" },
  { value: "SRL", label: "Sociedad de Responsabilidad Limitada (S.R.L.)", desc: "Control sobre entrada de socios" },
  { value: "EIRL", label: "Empresa Individual de Resp. Limitada (E.I.R.L.)", desc: "Un solo propietario, responsabilidad limitada" },
  { value: "persona_natural", label: "Persona Natural con Negocio", desc: "Emprendedor individual sin sociedad" },
  { value: "fundacion", label: "Fundacion de Interes Privado", desc: "Estructura de proteccion patrimonial" },
];

const FISCAL_REGIMES = [
  { value: "renta_estimada", label: "Renta estimada" },
  { value: "renta_declarada", label: "Renta declarada" },
  { value: "regimen_especial", label: "Regimen especial" },
];

// Profile A Step 4 — Modulos
const MODULES_ONBOARDING = [
  { key: "contabilidad", label: "Contabilidad", desc: "P&L, Balance, Breakeven", icon: BarChart3, always: true },
  { key: "facturacion_etax", label: "Facturacion electronica ETAX", desc: "Facturacion con equipo fiscal", icon: Receipt, always: false },
  { key: "inventario", label: "Inventario", desc: "Control de productos y stock", icon: Package, always: false },
  { key: "planilla_css", label: "Planilla y CSS", desc: "Nomina con ley laboral Panama", icon: Users, always: false },
  { key: "conciliacion_bancaria", label: "Conciliacion bancaria", desc: "Cotejar movimientos de banco", icon: CreditCard, always: false },
  { key: "reportes_cfo_ia", label: "Reportes CFO con IA", desc: "Analisis inteligente con IA", icon: BrainCircuit, always: false },
];

const PLAN_CUENTAS = [
  { value: "niif_panama", label: "Plan NIIF Panama (recomendado)", tooltip: "Normas Internacionales de Informacion Financiera, exigido por la Superintendencia de Valores de Panama." },
  { value: "pyme_simplificado", label: "Plan PYME simplificado", tooltip: "Version simplificada con las cuentas esenciales para pequenas empresas. Ideal si no necesitas reportar a la Superintendencia." },
];

interface SetupWizardProps {
  onComplete: (routeTo?: "fabrica_empresa") => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const { user, isDemoMode } = useAuth();
  const { refreshSocieties } = useSociety();

  // ─── Shared state ───
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [step, setStep] = useState(0); // 0 = profile selection
  const [isFinishing, setIsFinishing] = useState(false);

  // Brand identity (shared across profiles)
  const [companyName, setCompanyName] = useState(() => {
    if (typeof window !== "undefined")
      return localStorage.getItem("midf_company_name") || "";
    return "";
  });
  const [companyLogo, setCompanyLogo] = useState(() => {
    if (typeof window !== "undefined")
      return localStorage.getItem("midf_company_logo") || "";
    return "";
  });
  const [companyRubro, setCompanyRubro] = useState(() => {
    if (typeof window !== "undefined")
      return localStorage.getItem("midf_company_rubro") || "";
    return "";
  });
  const [isDragging, setIsDragging] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Profile A specific
  const [tipoActividad, setTipoActividad] = useState<TipoActividad>("");
  const [tieneEmpleados, setTieneEmpleados] = useState<boolean | null>(null);
  const [facturaAlta, setFacturaAlta] = useState<boolean | null>(null);

  // Profile A new fiscal/modules state
  const [entityType, setEntityType] = useState("");
  const [rucNumber, setRucNumber] = useState("");
  const [fiscalRegime, setFiscalRegime] = useState("");
  const [dgiAlDia, setDgiAlDia] = useState<boolean | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>(["contabilidad"]);
  const [planCuentas, setPlanCuentas] = useState("");
  const [tooltipOpen, setTooltipOpen] = useState("");

  // Profile B specific
  const [isFormalized, setIsFormalized] = useState<boolean | null>(null);

  // Profile D specific
  const [rucStatus, setRucStatus] = useState<RucStatus>("");

  // ─── Logo handlers ───
  const processLogoFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCompanyLogo(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processLogoFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processLogoFile(file);
  };

  // ─── Total steps per profile ───
  const totalSteps = profile === "C" ? 2 : profile === "A" ? 5 : 3;

  // ─── Final save ───
  const handleFinish = async () => {
    setIsFinishing(true);

    // Save profile
    if (profile) localStorage.setItem("midf_user_profile", profile);

    // Save brand identity
    if (companyName.trim()) localStorage.setItem("midf_company_name", companyName.trim());
    if (companyLogo) localStorage.setItem("midf_company_logo", companyLogo);
    if (companyRubro) localStorage.setItem("midf_company_rubro", companyRubro);

    // Profile-specific localStorage saves
    if (profile === "A") {
      if (tipoActividad) localStorage.setItem("midf_tipo_actividad", tipoActividad);
      if (tieneEmpleados !== null) localStorage.setItem("midf_tiene_empleados", String(tieneEmpleados));
      if (facturaAlta !== null) localStorage.setItem("midf_factura_pac", String(facturaAlta));
      localStorage.setItem("midf_has_ruc", "true");
      if (entityType) localStorage.setItem("midf_entity_type", entityType);
      if (rucNumber) localStorage.setItem("midf_ruc_number", rucNumber);
      if (fiscalRegime) localStorage.setItem("midf_fiscal_regime", fiscalRegime);
      if (dgiAlDia !== null) localStorage.setItem("midf_dgi_al_dia", String(dgiAlDia));
      if (selectedModules.length > 0) localStorage.setItem("midf_active_modules", JSON.stringify(selectedModules));
      if (planCuentas) localStorage.setItem("midf_plan_cuentas", planCuentas);
    }

    if (profile === "B") {
      if (isFormalized === true) localStorage.setItem("midf_has_ruc", "true");
    }

    if (profile === "D") {
      if (rucStatus) localStorage.setItem("midf_ruc_status", rucStatus);
      if (rucStatus === "si") localStorage.setItem("midf_has_ruc", "true");
    }

    // Track onboarding completion
    if (profile) trackOnboardingCompleted(profile);

    // Save to Supabase (all profiles, only if authenticated)
    if (user && !isDemoMode) {
      try {
        const societyData: Record<string, any> = {
          legal_name: companyName.trim() || "Mi Empresa",
        };

        if (profile === "A") {
          societyData.entity_type = entityType || "SE";
          societyData.tax_id = rucNumber.trim() || undefined;
          societyData.fiscal_regime = fiscalRegime || "renta_estimada";
          societyData.industry = companyRubro || undefined;
          societyData.trade_name = companyName.trim() || undefined;
        } else {
          societyData.entity_type = "persona_natural";
        }

        if (profile === "B") societyData.onboarding_flag = "en_formalizacion";
        if (profile === "D") societyData.onboarding_flag = "en_regularizacion";

        await societiesApi.create(societyData);
        await refreshSocieties();
      } catch (err: any) {
        console.warn("[MiDF] Error Supabase:", err.message);
      }
    }

    // Mark wizard complete
    localStorage.setItem("midf_welcomed", "true");
    localStorage.setItem("midf_setup_complete", "true");

    // Route logic
    let routeTo: "fabrica_empresa" | undefined;
    if (profile === "B" && isFormalized === false) routeTo = "fabrica_empresa";
    if (profile === "D" && rucStatus !== "si") routeTo = "fabrica_empresa";

    setTimeout(() => onComplete(routeTo), 1200);
  };

  const handleSkip = () => {
    localStorage.setItem("midf_welcomed", "true");
    localStorage.setItem("midf_setup_complete", "true");
    onComplete();
  };

  // ─── Helpers ───
  const isSilver = profile === "C";
  const textBase = isSilver ? "text-lg" : "text-sm";
  const textSmall = isSilver ? "text-base" : "text-xs";
  const textTitle = isSilver ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl";
  const btnPy = isSilver ? "py-4" : "py-3";

  // ─── Step indicator ───
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
        <React.Fragment key={s}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
            style={{
              backgroundColor: s < step ? THEME.accent : s === step ? THEME.accentBg : "rgba(148, 163, 184, 0.1)",
              color: s < step ? "#fff" : s === step ? THEME.accent : THEME.muted,
              border: s <= step ? `2px solid ${THEME.accent}` : `2px solid ${THEME.border}`,
            }}
          >
            {s < step ? <Check size={14} /> : s}
          </div>
          {s < totalSteps && (
            <div
              className="w-12 h-0.5 transition-all duration-300"
              style={{ backgroundColor: s < step ? THEME.accent : THEME.border }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ─── Reusable card button ───
  const SelectionCard = ({
    selected,
    onClick,
    icon,
    title,
    description,
    large,
  }: {
    selected: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    description: string;
    large?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`relative ${large ? "p-5 sm:p-6" : "p-4 sm:p-5"} rounded-xl border-2 transition-all duration-200 text-left group hover:scale-[1.02] w-full`}
      style={{
        borderColor: selected ? THEME.accent : THEME.border,
        backgroundColor: selected ? THEME.accentBg : THEME.cardBg,
      }}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: THEME.accent }}>
          <Check size={12} className="text-white" />
        </div>
      )}
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: selected ? THEME.accentBg : "rgba(148, 163, 184, 0.1)" }}>
        {icon}
      </div>
      <h3 className={`font-bold ${isSilver ? "text-base" : "text-sm"} mb-1`} style={{ color: selected ? THEME.accent : THEME.heading }}>
        {title}
      </h3>
      <p className={`${textSmall} leading-relaxed`} style={{ color: THEME.muted }}>
        {description}
      </p>
    </button>
  );

  // ─── Logo upload component ───
  const LogoUpload = () => (
    <div className="space-y-2">
      <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
        {isSilver ? "Foto o logo de tu negocio" : "Logo de tu empresa"}
      </label>
      <div
        onClick={() => logoInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center py-8 hover:border-opacity-100"
        style={{
          borderColor: isDragging ? THEME.accent : companyLogo ? THEME.accent : THEME.border,
          backgroundColor: isDragging ? THEME.accentBg : THEME.cardBg,
        }}
      >
        {companyLogo ? (
          <div className="flex flex-col items-center gap-3">
            <img src={companyLogo} alt="Logo" className="w-20 h-20 object-contain rounded-lg" />
            <span className={textSmall} style={{ color: THEME.muted }}>
              {isSilver ? "Toca para cambiar la foto" : "Click para cambiar"}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: THEME.accentBg }}>
              {isDragging ? <Upload size={20} style={{ color: THEME.accent }} /> : <ImageIcon size={20} style={{ color: THEME.muted }} />}
            </div>
            <p className={`${textBase} font-medium`} style={{ color: THEME.body }}>
              {isDragging ? "Suelta tu logo aqui" : isSilver ? "Toca aqui para subir una foto" : "Arrastra tu logo o haz click"}
            </p>
            <p className={textSmall} style={{ color: THEME.muted }}>
              PNG, JPG — max 500KB recomendado
            </p>
          </div>
        )}
        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
      </div>
    </div>
  );

  // ─── Name input component ───
  const NameInput = () => (
    <div className="space-y-2">
      <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
        {isSilver ? "Nombre de tu negocio" : "Nombre de tu empresa"}
      </label>
      <input
        type="text"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder={isSilver ? "ej: Tienda de Don Carlos" : "ej: Mi Tienda Panama S.E."}
        className={`w-full px-4 ${btnPy} rounded-xl ${textBase} font-medium outline-none transition-all focus:ring-2 focus:ring-[${THEME.accent}]`}
        style={{
          backgroundColor: "#f8fafc",
          border: `1.5px solid ${THEME.border}`,
          color: THEME.heading,
          caretColor: THEME.accent,
        }}
        onFocus={(e) => (e.target.style.borderColor = THEME.accent)}
        onBlur={(e) => (e.target.style.borderColor = THEME.border)}
      />
    </div>
  );

  // ─── Action buttons ───
  const ActionButtons = ({
    onNext,
    onBack,
    nextLabel,
    nextDisabled,
    showSkip,
  }: {
    onNext: () => void;
    onBack?: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
    showSkip?: boolean;
  }) => (
    <div className="flex flex-col items-center gap-3 pt-2">
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={`w-full flex items-center justify-center gap-2 px-6 ${btnPy} rounded-xl font-bold ${textBase} transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 text-white`}
        style={{ backgroundColor: nextDisabled ? THEME.muted : THEME.accent }}
      >
        {nextLabel || "Siguiente"}
        {!nextLabel?.includes("Entrar") && <ArrowRight size={16} />}
        {nextLabel?.includes("Entrar") && <Sparkles size={16} />}
      </button>
      {onBack && (
        <button onClick={onBack} className={`${textSmall} transition-colors hover:underline`} style={{ color: THEME.muted }}>
          Volver
        </button>
      )}
      {showSkip && (
        <button onClick={handleSkip} className={`${textSmall} transition-colors hover:underline`} style={{ color: THEME.muted }}>
          Saltar por ahora
        </button>
      )}
    </div>
  );

  // ─── Finishing animation ───
  const FinishingAnimation = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="relative">
        <MidfLogo size={64} iconOnly />
        <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: THEME.accentBg }} />
      </div>
      <p className={`${textBase} font-medium`} style={{ color: THEME.accent }}>
        {isSilver ? "Preparando tu resumen de dinero..." : "Preparando tu Director Financiero..."}
      </p>
      <div className="w-48 h-1 rounded-full overflow-hidden" style={{ backgroundColor: THEME.border }}>
        <div className="h-full rounded-full" style={{ backgroundColor: THEME.accent, width: "100%", animation: "grow 1s ease-in-out forwards" }} />
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // STEP 0: PROFILE SELECTION
  // ════════════════════════════════════════════════════════════════

  const renderProfileSelection = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: THEME.heading }}>
          Bienvenido a Mi Director Financiero
        </h2>
        <p className="text-sm" style={{ color: THEME.body }}>
          Selecciona tu perfil para personalizar tu experiencia
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectionCard
          selected={profile === "A"}
          onClick={() => setProfile("A")}
          icon={<Briefcase size={20} style={{ color: profile === "A" ? THEME.accent : THEME.muted }} />}
          title="Tengo un negocio activo"
          description="Soy dueno de una PYME o trabajo por cuenta propia"
        />
        <SelectionCard
          selected={profile === "B"}
          onClick={() => setProfile("B")}
          icon={<Sprout size={20} style={{ color: profile === "B" ? THEME.accent : THEME.muted }} />}
          title="Estoy empezando"
          description="Aun no estoy formalizado o estoy en proceso"
        />
        <SelectionCard
          selected={profile === "C"}
          onClick={() => setProfile("C")}
          icon={<Heart size={20} style={{ color: profile === "C" ? THEME.accent : THEME.muted }} />}
          title="Soy jubilado / pensionado"
          description="Tengo un pequeno negocio o quiero iniciar uno"
        />
        <SelectionCard
          selected={profile === "D"}
          onClick={() => setProfile("D")}
          icon={<Globe size={20} style={{ color: profile === "D" ? THEME.accent : THEME.muted }} />}
          title="Soy migrante / en regularizacion"
          description="Mi empresa esta en proceso de regularizacion en Panama"
        />
      </div>

      <ActionButtons
        onNext={() => { if (profile) trackOnboardingProfile(profile); setStep(1); }}
        nextDisabled={!profile}
        nextLabel="Comenzar"
        showSkip
      />
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // PROFILE A — Negocio activo (PYME / Solopreneur)
  // ════════════════════════════════════════════════════════════════

  const renderProfileA = () => {
    if (step === 1) {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: THEME.heading }}>Configura tu empresa</h2>
            <p className={textBase} style={{ color: THEME.body }}>
              Informacion basica de tu negocio
            </p>
          </div>

          {NameInput()}
          {LogoUpload()}

          <div className="space-y-2">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
              Tipo de actividad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "comercio" as TipoActividad, label: "Comercio", icon: <ShoppingBag size={18} /> },
                { key: "servicios" as TipoActividad, label: "Servicios", icon: <Wrench size={18} /> },
                { key: "produccion" as TipoActividad, label: "Produccion", icon: <Store size={18} /> },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTipoActividad(tipoActividad === t.key ? "" : t.key)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: tipoActividad === t.key ? THEME.accent : THEME.border,
                    backgroundColor: tipoActividad === t.key ? THEME.accentBg : THEME.cardBg,
                    color: tipoActividad === t.key ? THEME.accent : THEME.muted,
                  }}
                >
                  {t.icon}
                  <span className="text-xs font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
              Rubro o Industria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
              {RUBROS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setCompanyRubro(companyRubro === r.key ? "" : r.key)}
                  className="px-2.5 py-2 rounded-lg text-[11px] font-semibold text-left transition-all"
                  style={{
                    backgroundColor: companyRubro === r.key ? THEME.accentBg : "#f8fafc",
                    border: `1.5px solid ${companyRubro === r.key ? THEME.accent : THEME.border}`,
                    color: companyRubro === r.key ? THEME.accent : THEME.body,
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <ActionButtons onNext={() => setStep(2)} onBack={() => { setStep(0); }} />
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: THEME.heading }}>Tu operacion</h2>
            <p className={textBase} style={{ color: THEME.body }}>
              Esto personaliza las herramientas que veras
            </p>
          </div>

          <div className="space-y-3">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
              ¿Tienes empleados?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <SelectionCard
                selected={tieneEmpleados === true}
                onClick={() => setTieneEmpleados(true)}
                icon={<Users size={20} style={{ color: tieneEmpleados === true ? THEME.accent : THEME.muted }} />}
                title="Si, tengo equipo"
                description="Se activara el modulo de planilla"
              />
              <SelectionCard
                selected={tieneEmpleados === false}
                onClick={() => setTieneEmpleados(false)}
                icon={<Briefcase size={20} style={{ color: tieneEmpleados === false ? THEME.accent : THEME.muted }} />}
                title="No, trabajo solo"
                description="Solopreneur o freelancer"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
              ¿Facturas mas de B/.36,000 al ano?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <SelectionCard
                selected={facturaAlta === true}
                onClick={() => setFacturaAlta(true)}
                icon={<DollarSign size={20} style={{ color: facturaAlta === true ? THEME.accent : THEME.muted }} />}
                title="Si, mas de B/.36K"
                description="PAC / equipo fiscal obligatorio"
              />
              <SelectionCard
                selected={facturaAlta === false}
                onClick={() => setFacturaAlta(false)}
                icon={<FileText size={20} style={{ color: facturaAlta === false ? THEME.accent : THEME.muted }} />}
                title="No, menos de eso"
                description="Sin equipo fiscal requerido"
              />
            </div>
          </div>

          {facturaAlta === true && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <span className="text-xs leading-relaxed text-amber-700">
                Si facturas mas de B/.36,000 anuales, la DGI te exige un Punto de Atencion al Contribuyente (PAC). Te ayudaremos a verificar esto.
              </span>
            </div>
          )}

          <ActionButtons onNext={() => setStep(3)} onBack={() => setStep(1)} nextDisabled={tieneEmpleados === null || facturaAlta === null} />
        </div>
      );
    }

    // ── Step 3: Datos fiscales y societarios ──
    if (step === 3) {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: THEME.heading }}>Datos fiscales y societarios</h2>
            <p className={textBase} style={{ color: THEME.body }}>
              Esto configura tu contabilidad correctamente
            </p>
          </div>

          {/* Tipo de sociedad */}
          <div className="space-y-2">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
              Tipo de sociedad
            </label>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {ENTITY_TYPES_ONBOARDING.map((et) => (
                <button
                  key={et.value}
                  onClick={() => setEntityType(entityType === et.value ? "" : et.value)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left"
                  style={{
                    borderColor: entityType === et.value ? THEME.accent : THEME.border,
                    backgroundColor: entityType === et.value ? THEME.accentBg : THEME.cardBg,
                  }}
                >
                  <Landmark size={18} className="shrink-0 mt-0.5" style={{ color: entityType === et.value ? THEME.accent : THEME.muted }} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: entityType === et.value ? THEME.accent : THEME.heading }}>{et.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: THEME.muted }}>{et.desc}</p>
                  </div>
                  {entityType === et.value && (
                    <Check size={16} className="shrink-0 ml-auto mt-0.5" style={{ color: THEME.accent }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* SE info banner */}
          {entityType === "SE" && (
            <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: THEME.accentBg, border: `1px solid ${THEME.accent}33` }}>
              <Info size={16} className="shrink-0 mt-0.5" style={{ color: THEME.accent }} />
              <span className="text-xs leading-relaxed" style={{ color: THEME.heading }}>
                Creada por la Ley 50 de 2022 · Capital minimo $500 · Tramite simplificado en el MICI · Regimen fiscal especial
              </span>
            </div>
          )}

          {/* Numero de RUC */}
          <div className="space-y-2">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
              Numero de RUC
            </label>
            <input
              type="text"
              value={rucNumber}
              onChange={(e) => setRucNumber(e.target.value)}
              placeholder="Ej: 155123456-2-2025"
              className={`w-full px-4 ${btnPy} rounded-xl ${textBase} font-medium outline-none transition-all`}
              style={{
                backgroundColor: "#f8fafc",
                border: `1.5px solid ${THEME.border}`,
                color: THEME.heading,
                caretColor: THEME.accent,
              }}
              onFocus={(e) => (e.target.style.borderColor = THEME.accent)}
              onBlur={(e) => (e.target.style.borderColor = THEME.border)}
            />
          </div>

          {/* Regimen fiscal DGI */}
          <div className="space-y-2">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
              Regimen fiscal DGI
            </label>
            <div className="grid grid-cols-1 gap-2">
              {FISCAL_REGIMES.map((fr) => (
                <button
                  key={fr.value}
                  onClick={() => setFiscalRegime(fiscalRegime === fr.value ? "" : fr.value)}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
                  style={{
                    borderColor: fiscalRegime === fr.value ? THEME.accent : THEME.border,
                    backgroundColor: fiscalRegime === fr.value ? THEME.accentBg : THEME.cardBg,
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: fiscalRegime === fr.value ? THEME.accent : THEME.heading }}>
                    {fr.label}
                  </span>
                  {fiscalRegime === fr.value && <Check size={14} className="ml-auto" style={{ color: THEME.accent }} />}
                </button>
              ))}
            </div>
          </div>

          {/* DGI al dia */}
          <div className="space-y-3">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
              ¿Esta al dia con la DGI?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <SelectionCard
                selected={dgiAlDia === true}
                onClick={() => setDgiAlDia(true)}
                icon={<Shield size={20} style={{ color: dgiAlDia === true ? THEME.accent : THEME.muted }} />}
                title="Si"
                description="Declaraciones y pagos al dia"
              />
              <SelectionCard
                selected={dgiAlDia === false}
                onClick={() => setDgiAlDia(false)}
                icon={<AlertTriangle size={20} style={{ color: dgiAlDia === false ? "#eab308" : THEME.muted }} />}
                title="No"
                description="Tengo pendientes con la DGI"
              />
            </div>
          </div>

          {dgiAlDia === false && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <span className="text-xs leading-relaxed text-amber-700">
                Te ayudaremos a identificar tus pendientes con la DGI y crear un plan para ponerte al dia.
              </span>
            </div>
          )}

          <ActionButtons onNext={() => setStep(4)} onBack={() => setStep(2)} />
        </div>
      );
    }

    // ── Step 4: Modulos y configuracion contable ──
    if (step === 4) {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: THEME.heading }}>Modulos y configuracion</h2>
            <p className={textBase} style={{ color: THEME.body }}>
              Elige que herramientas activar. Siempre puedes cambiar despues.
            </p>
          </div>

          {/* Module multi-select cards */}
          <div className="space-y-2">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
              Modulos a activar
            </label>
            <div className="space-y-2">
              {MODULES_ONBOARDING.map((mod) => {
                const isSelected = selectedModules.includes(mod.key);
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.key}
                    onClick={() => {
                      if (mod.always) return;
                      setSelectedModules((prev) =>
                        prev.includes(mod.key) ? prev.filter((k) => k !== mod.key) : [...prev, mod.key]
                      );
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${mod.always ? "cursor-default" : ""}`}
                    style={{
                      borderColor: isSelected ? THEME.accent : THEME.border,
                      backgroundColor: isSelected ? THEME.accentBg : THEME.cardBg,
                    }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: isSelected ? `${THEME.accent}22` : "#f1f5f9" }}>
                      <Icon size={18} style={{ color: isSelected ? THEME.accent : THEME.muted }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: isSelected ? THEME.accent : THEME.heading }}>{mod.label}</p>
                      <p className="text-[10px]" style={{ color: THEME.muted }}>{mod.desc}</p>
                    </div>
                    {mod.always ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: THEME.accentBg, color: THEME.accent }}>
                        Incluido
                      </span>
                    ) : (
                      <div
                        className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: isSelected ? THEME.accent : THEME.border,
                          backgroundColor: isSelected ? THEME.accent : "transparent",
                        }}
                      >
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plan de cuentas */}
          <div className="space-y-2">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
              Plan de cuentas
            </label>
            <div className="space-y-2">
              {PLAN_CUENTAS.map((pc) => (
                <div key={pc.value} className="relative">
                  <button
                    onClick={() => setPlanCuentas(planCuentas === pc.value ? "" : pc.value)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
                    style={{
                      borderColor: planCuentas === pc.value ? THEME.accent : THEME.border,
                      backgroundColor: planCuentas === pc.value ? THEME.accentBg : THEME.cardBg,
                    }}
                  >
                    <span className="text-xs font-bold flex-1" style={{ color: planCuentas === pc.value ? THEME.accent : THEME.heading }}>
                      {pc.label}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setTooltipOpen(tooltipOpen === pc.value ? "" : pc.value); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setTooltipOpen(tooltipOpen === pc.value ? "" : pc.value); } }}
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 hover:bg-slate-100 cursor-pointer"
                      style={{ color: THEME.muted }}
                    >
                      <Info size={14} />
                    </span>
                    {planCuentas === pc.value && <Check size={14} className="shrink-0" style={{ color: THEME.accent }} />}
                  </button>
                  {tooltipOpen === pc.value && (
                    <div className="mt-1 p-3 rounded-lg text-xs leading-relaxed border" style={{ backgroundColor: "#f8fafc", borderColor: THEME.border, color: THEME.body }}>
                      {pc.tooltip}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <ActionButtons onNext={() => setStep(5)} onBack={() => setStep(3)} />
        </div>
      );
    }

    // Step 5: Summary
    return renderSummary();
  };

  // ════════════════════════════════════════════════════════════════
  // PROFILE B — Empezando / no formalizado
  // ════════════════════════════════════════════════════════════════

  const renderProfileB = () => {
    if (step === 1) {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: THEME.heading }}>Costos reales de formalizar</h2>
            <p className={textBase} style={{ color: THEME.body }}>
              Antes de registrar tu negocio, conoce los costos
            </p>
          </div>

          <div className="rounded-xl overflow-hidden border" style={{ borderColor: THEME.border }}>
            {COSTOS_FORMALIZACION.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  backgroundColor: i % 2 === 0 ? "#f8fafc" : THEME.cardBg,
                  borderBottom: i < COSTOS_FORMALIZACION.length - 1 ? `1px solid ${THEME.border}` : "none",
                }}
              >
                <div className="flex-1 pr-3">
                  <p className="text-xs font-semibold" style={{ color: THEME.heading }}>{item.concepto}</p>
                  <p className="text-[10px]" style={{ color: THEME.muted }}>{item.nota}</p>
                </div>
                <span className="text-xs font-bold shrink-0" style={{ color: THEME.accent }}>{item.costo}</span>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg text-xs leading-relaxed" style={{ backgroundColor: THEME.accentBg, color: THEME.body, border: `1px solid ${THEME.accent}33` }}>
            <Rocket size={16} className="shrink-0 mt-0.5" style={{ color: THEME.accent }} />
            <span>
              Puedes explorar todas las herramientas sin necesidad de estar formalizado. Cuando estes listo, te guiamos paso a paso.
            </span>
          </div>

          <ActionButtons onNext={() => setStep(2)} onBack={() => setStep(0)} />
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: THEME.heading }}>Configura tu negocio</h2>
            <p className={textBase} style={{ color: THEME.body }}>
              Aunque no estes formalizado, personaliza tu espacio
            </p>
          </div>

          {NameInput()}

          <div className="space-y-3">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
              ¿Ya tienes RUC?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <SelectionCard
                selected={isFormalized === true}
                onClick={() => setIsFormalized(true)}
                icon={<Shield size={20} style={{ color: isFormalized === true ? THEME.accent : THEME.muted }} />}
                title="Si, ya tengo RUC"
                description="Tengo mi RUC activo en la DGI"
              />
              <SelectionCard
                selected={isFormalized === false}
                onClick={() => setIsFormalized(false)}
                icon={<Rocket size={20} style={{ color: isFormalized === false ? THEME.accent : THEME.muted }} />}
                title="No, aun no"
                description="Quiero explorar sin compromiso"
              />
            </div>
          </div>

          {isFormalized === false && (
            <div className="flex items-start gap-3 p-3 rounded-lg text-xs leading-relaxed" style={{ backgroundColor: THEME.accentBg, color: THEME.body, border: `1px solid ${THEME.accent}33` }}>
              <Rocket size={16} className="shrink-0 mt-0.5" style={{ color: THEME.accent }} />
              <span>
                Te mostraremos la guia paso a paso para formalizar tu Sociedad de Emprendimiento (S.E.) cuando estes listo.
              </span>
            </div>
          )}

          <ActionButtons onNext={() => setStep(3)} onBack={() => setStep(1)} nextDisabled={isFormalized === null} />
        </div>
      );
    }

    return renderSummary();
  };

  // ════════════════════════════════════════════════════════════════
  // PROFILE C — Jubilado / pensionado (Silver Economy)
  // ════════════════════════════════════════════════════════════════

  const renderProfileC = () => {
    if (step === 1) {
      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: THEME.heading }}>
              Configura tu negocio
            </h2>
            <p className="text-lg" style={{ color: THEME.body }}>
              Solo necesitamos tu nombre y lo que vendes
            </p>
          </div>

          {NameInput()}

          <div className="space-y-3">
            <label className="text-base font-bold" style={{ color: THEME.label }}>
              ¿Que vendes o que servicio ofreces?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RUBROS.slice(0, 8).map((r) => (
                <button
                  key={r.key}
                  onClick={() => setCompanyRubro(companyRubro === r.key ? "" : r.key)}
                  className="px-3 py-3 rounded-lg text-sm font-semibold text-left transition-all"
                  style={{
                    backgroundColor: companyRubro === r.key ? THEME.accentBg : "#f8fafc",
                    border: `2px solid ${companyRubro === r.key ? THEME.accent : THEME.border}`,
                    color: companyRubro === r.key ? THEME.accent : THEME.body,
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {LogoUpload()}

          <ActionButtons onNext={() => setStep(2)} onBack={() => setStep(0)} />
        </div>
      );
    }

    if (step === 2) {
      if (isFinishing) return FinishingAnimation();

      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: THEME.heading }}>
              ¡Ya esta todo listo!
            </h2>
            <p className="text-lg" style={{ color: THEME.body }}>
              Tu resumen de dinero esta preparado
            </p>
          </div>

          <div className="rounded-xl p-5 space-y-4 border" style={{ backgroundColor: "#f8fafc", borderColor: THEME.border }}>
            <div className="flex items-center gap-4">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-16 h-16 object-contain rounded-lg border" style={{ borderColor: THEME.border }} />
              ) : (
                <div className="w-16 h-16 rounded-lg flex items-center justify-center border border-dashed" style={{ borderColor: THEME.border, backgroundColor: "#f8fafc" }}>
                  <Building2 size={28} style={{ color: THEME.muted }} />
                </div>
              )}
              <div>
                <p className="font-bold text-lg" style={{ color: THEME.heading }}>{companyName.trim() || "Mi Negocio"}</p>
                {companyRubro && (
                  <p className="text-sm mt-0.5 font-medium" style={{ color: THEME.muted }}>
                    {RUBROS.find((r) => r.key === companyRubro)?.label || companyRubro}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-base font-semibold" style={{ color: THEME.label }}>Vas a poder:</p>
            {[
              { icon: <PenLine size={20} />, text: "Registrar lo que ganas y lo que gastas" },
              { icon: <DollarSign size={20} />, text: "Ver tu resumen de dinero" },
              { icon: <AlertTriangle size={20} />, text: "Saber que debes pagar y cuando" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "#f8fafc" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: THEME.accentBg, color: THEME.accent }}>
                  {item.icon}
                </div>
                <p className="text-base font-medium" style={{ color: THEME.heading }}>{item.text}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <Phone size={22} className="text-emerald-500" />
            <div>
              <p className="text-base font-semibold text-emerald-600">¿Necesitas ayuda?</p>
              <p className="text-sm text-emerald-500">Escribe por WhatsApp y te ayudamos</p>
            </div>
          </div>

          <ActionButtons
            onNext={handleFinish}
            onBack={() => setStep(1)}
            nextLabel="Entrar a mi resumen"
          />
        </div>
      );
    }

    return null;
  };

  // ════════════════════════════════════════════════════════════════
  // PROFILE D — Migrante / en regularizacion
  // ════════════════════════════════════════════════════════════════

  const renderProfileD = () => {
    if (step === 1) {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: THEME.heading }}>Estado de tu empresa en Panama</h2>
            <p className={textBase} style={{ color: THEME.body }}>
              ¿Ya tienes tu numero de contribuyente (RUC)?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <SelectionCard
              selected={rucStatus === "si"}
              onClick={() => setRucStatus("si")}
              icon={<Shield size={20} style={{ color: rucStatus === "si" ? THEME.accent : THEME.muted }} />}
              title="Si, ya tengo RUC"
              description="Mi empresa tiene RUC activo en la DGI"
            />
            <SelectionCard
              selected={rucStatus === "en_tramite"}
              onClick={() => setRucStatus("en_tramite")}
              icon={<FileText size={20} style={{ color: rucStatus === "en_tramite" ? THEME.accent : THEME.muted }} />}
              title="Esta en tramite"
              description="Ya inicie el proceso pero aun no tengo el RUC"
            />
            <SelectionCard
              selected={rucStatus === "no"}
              onClick={() => setRucStatus("no")}
              icon={<Rocket size={20} style={{ color: rucStatus === "no" ? THEME.accent : THEME.muted }} />}
              title="No, aun no tengo RUC"
              description="Necesito conocer los pasos para obtenerlo"
            />
          </div>

          {(rucStatus === "no" || rucStatus === "en_tramite") && (
            <div className="rounded-xl p-4 space-y-3 border" style={{ backgroundColor: "#f8fafc", borderColor: THEME.border }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: THEME.accent }}>
                Pasos para obtener RUC como extranjero
              </p>
              {[
                "Tener pasaporte vigente y permiso de residencia o trabajo",
                "Registrarse en e-Tax 2.0 (etax2.0.dgi.gob.pa) — gratis",
                "Solicitar Aviso de Operacion en el MICI (B/.15–B/.55)",
                "Inscribirse en la CSS si va a tener empleados — gratis",
              ].map((paso, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-bold shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: THEME.accentBg, color: THEME.accent }}>
                    {i + 1}
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: THEME.body }}>{paso}</p>
                </div>
              ))}
            </div>
          )}

          <ActionButtons onNext={() => setStep(2)} onBack={() => setStep(0)} nextDisabled={!rucStatus} />
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: THEME.heading }}>Configura tu negocio</h2>
            <p className={textBase} style={{ color: THEME.body }}>
              Puedes usar todas las herramientas sin RUC activo
            </p>
          </div>

          {NameInput()}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen size={14} style={{ color: THEME.accent }} />
              <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: THEME.label }}>
                Glosario basico
              </label>
            </div>
            <div className="rounded-xl overflow-hidden max-h-[200px] overflow-y-auto border" style={{ borderColor: THEME.border }}>
              {GLOSARIO_BASICO.map((item, i) => (
                <div
                  key={i}
                  className="px-4 py-2.5"
                  style={{
                    backgroundColor: i % 2 === 0 ? "#f8fafc" : THEME.cardBg,
                    borderBottom: i < GLOSARIO_BASICO.length - 1 ? `1px solid ${THEME.border}` : "none",
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: THEME.accent }}>{item.termino}:</span>{" "}
                  <span className="text-xs" style={{ color: THEME.body }}>{item.definicion}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px]" style={{ color: THEME.muted }}>
              Encontraras este glosario siempre disponible en Mi Asistente
            </p>
          </div>

          <ActionButtons onNext={() => setStep(3)} onBack={() => setStep(1)} />
        </div>
      );
    }

    return renderSummary();
  };

  // ════════════════════════════════════════════════════════════════
  // SHARED SUMMARY (Profiles A, B, D)
  // ════════════════════════════════════════════════════════════════

  const renderSummary = () => {
    if (isFinishing) return FinishingAnimation();

    const summaryItems: { label: string; value: string; color: string }[] = [];

    if (profile === "A") {
      if (tipoActividad) summaryItems.push({ label: "Actividad", value: tipoActividad.charAt(0).toUpperCase() + tipoActividad.slice(1), color: THEME.accent });
      if (tieneEmpleados !== null) summaryItems.push({ label: "Empleados", value: tieneEmpleados ? "Si — modulo planilla activo" : "No — solopreneur", color: tieneEmpleados ? "#22c55e" : THEME.muted });
      if (facturaAlta !== null) summaryItems.push({ label: "Facturacion", value: facturaAlta ? "> B/.36,000/ano — PAC obligatorio" : "< B/.36,000/ano", color: facturaAlta ? "#eab308" : THEME.muted });
      if (entityType) {
        const etLabel = ENTITY_TYPES_ONBOARDING.find((e) => e.value === entityType)?.label || entityType;
        summaryItems.push({ label: "Tipo sociedad", value: etLabel, color: THEME.accent });
      }
      if (rucNumber) summaryItems.push({ label: "RUC", value: rucNumber, color: THEME.accent });
      if (fiscalRegime) {
        const frLabel = FISCAL_REGIMES.find((f) => f.value === fiscalRegime)?.label || fiscalRegime;
        summaryItems.push({ label: "Regimen fiscal", value: frLabel, color: THEME.accent });
      }
      if (dgiAlDia !== null) summaryItems.push({ label: "DGI al dia", value: dgiAlDia ? "Si" : "No - pendiente", color: dgiAlDia ? "#22c55e" : "#eab308" });
      if (selectedModules.length > 0) summaryItems.push({ label: "Modulos", value: `${selectedModules.length} activos`, color: THEME.accent });
      if (planCuentas) {
        const pcLabel = PLAN_CUENTAS.find((p) => p.value === planCuentas)?.label || planCuentas;
        summaryItems.push({ label: "Plan de cuentas", value: pcLabel, color: THEME.accent });
      }
    }

    if (profile === "B") {
      summaryItems.push({
        label: "Estado",
        value: isFormalized ? "Formalizado con RUC" : "Explorando — sin compromiso",
        color: isFormalized ? "#22c55e" : "#eab308",
      });
    }

    if (profile === "D") {
      const rucLabels: Record<string, string> = {
        si: "RUC activo",
        en_tramite: "RUC en tramite",
        no: "Sin RUC — te guiaremos",
      };
      summaryItems.push({
        label: "RUC",
        value: rucLabels[rucStatus] || "",
        color: rucStatus === "si" ? "#22c55e" : "#eab308",
      });
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="text-center space-y-2">
          <h2 className={`${textTitle} font-bold`} style={{ color: THEME.heading }}>Todo listo</h2>
          <p className={textBase} style={{ color: THEME.body }}>
            Revisa tu configuracion antes de entrar
          </p>
        </div>

        <div className="rounded-xl p-5 space-y-4 border" style={{ backgroundColor: "#f8fafc", borderColor: THEME.border }}>
          <div className="flex items-center gap-4">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-14 h-14 object-contain rounded-lg border" style={{ borderColor: THEME.border }} />
            ) : (
              <div className="w-14 h-14 rounded-lg flex items-center justify-center border border-dashed" style={{ borderColor: THEME.border, backgroundColor: THEME.cardBg }}>
                <Building2 size={24} style={{ color: THEME.muted }} />
              </div>
            )}
            <div>
              <p className="font-bold text-sm" style={{ color: THEME.heading }}>{companyName.trim() || "Mi Empresa"}</p>
              <p className="text-xs" style={{ color: THEME.muted }}>
                {companyLogo ? "Logo configurado" : "Sin logo (puedes agregarlo despues)"}
              </p>
              {companyRubro && (
                <p className="text-[10px] mt-0.5 font-medium" style={{ color: THEME.muted }}>
                  {RUBROS.find((r) => r.key === companyRubro)?.label || companyRubro}
                </p>
              )}
            </div>
          </div>

          <div className="h-px" style={{ backgroundColor: THEME.border }} />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: THEME.accentBg, color: THEME.accent }}>
              Perfil {profile}
            </span>
            <span className="text-xs" style={{ color: THEME.muted }}>
              {profile === "A" && "Negocio activo"}
              {profile === "B" && "Emprendedor en inicio"}
              {profile === "D" && "Migrante / en regularizacion"}
            </span>
          </div>

          {summaryItems.length > 0 && (
            <>
              <div className="h-px" style={{ backgroundColor: THEME.border }} />
              <div className="space-y-2">
                {summaryItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: THEME.muted }}>{item.label}</span>
                    <span className="text-xs font-semibold text-right max-w-[60%]" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <ActionButtons
          onNext={handleFinish}
          onBack={() => setStep(totalSteps - 1)}
          nextLabel="Entrar al Dashboard"
        />
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════

  const renderCurrentStep = () => {
    if (step === 0) return renderProfileSelection();

    switch (profile) {
      case "A": return renderProfileA();
      case "B": return renderProfileB();
      case "C": return renderProfileC();
      case "D": return renderProfileD();
      default: return renderProfileSelection();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Decorative top line */}
      <div className="fixed top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${THEME.accent}, transparent)`, opacity: 0.3 }} />

      {/* Content card */}
      <div className={`w-full ${isSilver ? "max-w-lg" : "max-w-md"}`}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <MidfLogo size={isSilver ? 64 : 56} iconOnly={false} />
        </div>

        {/* Step indicator (only after profile selection) */}
        {step > 0 && StepIndicator()}

        {/* Step content */}
        {renderCurrentStep()}
      </div>

      {/* Decorative bottom line */}
      <div className="fixed bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${THEME.accent}, transparent)`, opacity: 0.15 }} />

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes grow {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
