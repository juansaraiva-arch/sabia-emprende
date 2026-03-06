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
} from "lucide-react";
import MidfLogo from "@/components/MidfLogo";

const GOLD = "#C5A059";
const NAVY = "#1A242F";

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

interface SetupWizardProps {
  onComplete: (routeTo?: "fabrica_empresa") => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
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
  const totalSteps = profile === "C" ? 2 : 3;

  // ─── Final save ───
  const handleFinish = () => {
    setIsFinishing(true);

    // Save profile
    if (profile) localStorage.setItem("midf_user_profile", profile);

    // Save brand identity
    if (companyName.trim()) localStorage.setItem("midf_company_name", companyName.trim());
    if (companyLogo) localStorage.setItem("midf_company_logo", companyLogo);
    if (companyRubro) localStorage.setItem("midf_company_rubro", companyRubro);

    // Profile-specific saves
    if (profile === "A") {
      if (tipoActividad) localStorage.setItem("midf_tipo_actividad", tipoActividad);
      if (tieneEmpleados !== null) localStorage.setItem("midf_tiene_empleados", String(tieneEmpleados));
      if (facturaAlta !== null) localStorage.setItem("midf_factura_pac", String(facturaAlta));
      localStorage.setItem("midf_has_ruc", "true");
    }

    if (profile === "B") {
      if (isFormalized === true) localStorage.setItem("midf_has_ruc", "true");
    }

    if (profile === "D") {
      if (rucStatus) localStorage.setItem("midf_ruc_status", rucStatus);
      if (rucStatus === "si") localStorage.setItem("midf_has_ruc", "true");
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
              backgroundColor: s < step ? GOLD : s === step ? "rgba(197, 160, 89, 0.2)" : "rgba(148, 163, 184, 0.1)",
              color: s < step ? NAVY : s === step ? GOLD : "rgba(148, 163, 184, 0.4)",
              border: s <= step ? `2px solid ${GOLD}` : "2px solid rgba(148, 163, 184, 0.2)",
            }}
          >
            {s < step ? <Check size={14} /> : s}
          </div>
          {s < totalSteps && (
            <div
              className="w-12 h-0.5 transition-all duration-300"
              style={{ backgroundColor: s < step ? GOLD : "rgba(148, 163, 184, 0.2)" }}
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
        borderColor: selected ? GOLD : "rgba(197, 160, 89, 0.15)",
        backgroundColor: selected ? "rgba(197, 160, 89, 0.08)" : "rgba(197, 160, 89, 0.02)",
      }}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: GOLD }}>
          <Check size={12} style={{ color: NAVY }} />
        </div>
      )}
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: selected ? "rgba(197, 160, 89, 0.15)" : "rgba(148, 163, 184, 0.1)" }}>
        {icon}
      </div>
      <h3 className={`font-bold ${isSilver ? "text-base" : "text-sm"} mb-1`} style={{ color: selected ? GOLD : "rgba(197, 160, 89, 0.7)" }}>
        {title}
      </h3>
      <p className={`${textSmall} leading-relaxed`} style={{ color: "rgba(197, 160, 89, 0.45)" }}>
        {description}
      </p>
    </button>
  );

  // ─── Logo upload component ───
  const LogoUpload = () => (
    <div className="space-y-2">
      <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: "rgba(197, 160, 89, 0.7)" }}>
        {isSilver ? "Foto o logo de tu negocio" : "Logo de tu empresa"}
      </label>
      <div
        onClick={() => logoInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center py-8 hover:border-opacity-100"
        style={{
          borderColor: isDragging ? GOLD : companyLogo ? GOLD : "rgba(197, 160, 89, 0.3)",
          backgroundColor: isDragging ? "rgba(197, 160, 89, 0.08)" : "rgba(197, 160, 89, 0.03)",
        }}
      >
        {companyLogo ? (
          <div className="flex flex-col items-center gap-3">
            <img src={companyLogo} alt="Logo" className="w-20 h-20 object-contain rounded-lg" />
            <span className={textSmall} style={{ color: "rgba(197, 160, 89, 0.5)" }}>
              {isSilver ? "Toca para cambiar la foto" : "Click para cambiar"}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}>
              {isDragging ? <Upload size={20} style={{ color: GOLD }} /> : <ImageIcon size={20} style={{ color: "rgba(197, 160, 89, 0.5)" }} />}
            </div>
            <p className={`${textBase} font-medium`} style={{ color: "rgba(197, 160, 89, 0.6)" }}>
              {isDragging ? "Suelta tu logo aqui" : isSilver ? "Toca aqui para subir una foto" : "Arrastra tu logo o haz click"}
            </p>
            <p className={textSmall} style={{ color: "rgba(197, 160, 89, 0.35)" }}>
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
      <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: "rgba(197, 160, 89, 0.7)" }}>
        {isSilver ? "Nombre de tu negocio" : "Nombre de tu empresa"}
      </label>
      <input
        type="text"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder={isSilver ? "ej: Tienda de Don Carlos" : "ej: Mi Tienda Panama S.E."}
        className={`w-full px-4 ${btnPy} rounded-xl ${textBase} font-medium outline-none transition-all focus:ring-2`}
        style={{
          backgroundColor: "rgba(197, 160, 89, 0.06)",
          border: "1.5px solid rgba(197, 160, 89, 0.25)",
          color: GOLD,
          caretColor: GOLD,
        }}
        onFocus={(e) => (e.target.style.borderColor = GOLD)}
        onBlur={(e) => (e.target.style.borderColor = "rgba(197, 160, 89, 0.25)")}
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
        className={`w-full flex items-center justify-center gap-2 px-6 ${btnPy} rounded-xl font-bold ${textBase} transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110`}
        style={{ backgroundColor: nextDisabled ? "rgba(197, 160, 89, 0.3)" : GOLD, color: NAVY }}
      >
        {nextLabel || "Siguiente"}
        {!nextLabel?.includes("Entrar") && <ArrowRight size={16} />}
        {nextLabel?.includes("Entrar") && <Sparkles size={16} />}
      </button>
      {onBack && (
        <button onClick={onBack} className={`${textSmall} transition-colors hover:underline`} style={{ color: "rgba(197, 160, 89, 0.4)" }}>
          Volver
        </button>
      )}
      {showSkip && (
        <button onClick={handleSkip} className={`${textSmall} transition-colors hover:underline`} style={{ color: "rgba(197, 160, 89, 0.4)" }}>
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
        <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: "rgba(197, 160, 89, 0.15)" }} />
      </div>
      <p className={`${textBase} font-medium`} style={{ color: GOLD }}>
        {isSilver ? "Preparando tu resumen de dinero..." : "Preparando tu Director Financiero..."}
      </p>
      <div className="w-48 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}>
        <div className="h-full rounded-full animate-pulse" style={{ backgroundColor: GOLD, width: "100%", animation: "grow 1s ease-in-out forwards" }} />
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // STEP 0: PROFILE SELECTION
  // ════════════════════════════════════════════════════════════════

  const renderProfileSelection = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: GOLD }}>
          Bienvenido a Mi Director Financiero
        </h2>
        <p className="text-sm" style={{ color: "rgba(197, 160, 89, 0.6)" }}>
          Selecciona tu perfil para personalizar tu experiencia
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectionCard
          selected={profile === "A"}
          onClick={() => setProfile("A")}
          icon={<Briefcase size={20} style={{ color: profile === "A" ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
          title="Tengo un negocio activo"
          description="Soy dueno de una PYME o trabajo por cuenta propia"
        />
        <SelectionCard
          selected={profile === "B"}
          onClick={() => setProfile("B")}
          icon={<Sprout size={20} style={{ color: profile === "B" ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
          title="Estoy empezando"
          description="Aun no estoy formalizado o estoy en proceso"
        />
        <SelectionCard
          selected={profile === "C"}
          onClick={() => setProfile("C")}
          icon={<Heart size={20} style={{ color: profile === "C" ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
          title="Soy jubilado / pensionado"
          description="Tengo un pequeno negocio o quiero iniciar uno"
        />
        <SelectionCard
          selected={profile === "D"}
          onClick={() => setProfile("D")}
          icon={<Globe size={20} style={{ color: profile === "D" ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
          title="Soy migrante / en regularizacion"
          description="Mi empresa esta en proceso de regularizacion en Panama"
        />
      </div>

      <ActionButtons
        onNext={() => setStep(1)}
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
      // Step 1: Tipo de actividad + Brand identity
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: GOLD }}>Configura tu empresa</h2>
            <p className={textBase} style={{ color: "rgba(197, 160, 89, 0.6)" }}>
              Informacion basica de tu negocio
            </p>
          </div>

          <NameInput />
          <LogoUpload />

          {/* Tipo de actividad */}
          <div className="space-y-2">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: "rgba(197, 160, 89, 0.7)" }}>
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
                    borderColor: tipoActividad === t.key ? GOLD : "rgba(197, 160, 89, 0.15)",
                    backgroundColor: tipoActividad === t.key ? "rgba(197, 160, 89, 0.08)" : "rgba(197, 160, 89, 0.02)",
                    color: tipoActividad === t.key ? GOLD : "rgba(197, 160, 89, 0.5)",
                  }}
                >
                  {t.icon}
                  <span className="text-xs font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rubro */}
          <div className="space-y-2">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: "rgba(197, 160, 89, 0.7)" }}>
              Rubro o Industria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
              {RUBROS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setCompanyRubro(companyRubro === r.key ? "" : r.key)}
                  className="px-2.5 py-2 rounded-lg text-[11px] font-semibold text-left transition-all"
                  style={{
                    backgroundColor: companyRubro === r.key ? "rgba(197, 160, 89, 0.2)" : "rgba(197, 160, 89, 0.05)",
                    border: `1.5px solid ${companyRubro === r.key ? GOLD : "rgba(197, 160, 89, 0.15)"}`,
                    color: companyRubro === r.key ? GOLD : "rgba(197, 160, 89, 0.6)",
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
      // Step 2: Empleados + Facturacion
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: GOLD }}>Tu operacion</h2>
            <p className={textBase} style={{ color: "rgba(197, 160, 89, 0.6)" }}>
              Esto personaliza las herramientas que veras
            </p>
          </div>

          {/* Empleados */}
          <div className="space-y-3">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: "rgba(197, 160, 89, 0.7)" }}>
              ¿Tienes empleados?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <SelectionCard
                selected={tieneEmpleados === true}
                onClick={() => setTieneEmpleados(true)}
                icon={<Users size={20} style={{ color: tieneEmpleados === true ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
                title="Si, tengo equipo"
                description="Se activara el modulo de planilla"
              />
              <SelectionCard
                selected={tieneEmpleados === false}
                onClick={() => setTieneEmpleados(false)}
                icon={<Briefcase size={20} style={{ color: tieneEmpleados === false ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
                title="No, trabajo solo"
                description="Solopreneur o freelancer"
              />
            </div>
          </div>

          {/* Facturacion alta */}
          <div className="space-y-3">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: "rgba(197, 160, 89, 0.7)" }}>
              ¿Facturas mas de B/.36,000 al ano?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <SelectionCard
                selected={facturaAlta === true}
                onClick={() => setFacturaAlta(true)}
                icon={<DollarSign size={20} style={{ color: facturaAlta === true ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
                title="Si, mas de B/.36K"
                description="PAC / equipo fiscal obligatorio"
              />
              <SelectionCard
                selected={facturaAlta === false}
                onClick={() => setFacturaAlta(false)}
                icon={<FileText size={20} style={{ color: facturaAlta === false ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
                title="No, menos de eso"
                description="Sin equipo fiscal requerido"
              />
            </div>
          </div>

          {/* PAC alert */}
          {facturaAlta === true && (
            <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.2)" }}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "#eab308" }} />
              <span className="text-xs leading-relaxed" style={{ color: "rgba(234, 179, 8, 0.8)" }}>
                Si facturas mas de B/.36,000 anuales, la DGI te exige un Punto de Atencion al Contribuyente (PAC). Te ayudaremos a verificar esto.
              </span>
            </div>
          )}

          <ActionButtons onNext={() => setStep(3)} onBack={() => setStep(1)} nextDisabled={tieneEmpleados === null || facturaAlta === null} />
        </div>
      );
    }

    // Step 3: Summary
    return renderSummary();
  };

  // ════════════════════════════════════════════════════════════════
  // PROFILE B — Empezando / no formalizado
  // ════════════════════════════════════════════════════════════════

  const renderProfileB = () => {
    if (step === 1) {
      // Step 1: Costos reales de formalizacion
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: GOLD }}>Costos reales de formalizar</h2>
            <p className={textBase} style={{ color: "rgba(197, 160, 89, 0.6)" }}>
              Antes de registrar tu negocio, conoce los costos
            </p>
          </div>

          {/* Costos table */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(197, 160, 89, 0.12)" }}>
            {COSTOS_FORMALIZACION.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  backgroundColor: i % 2 === 0 ? "rgba(197, 160, 89, 0.03)" : "transparent",
                  borderBottom: i < COSTOS_FORMALIZACION.length - 1 ? "1px solid rgba(197, 160, 89, 0.08)" : "none",
                }}
              >
                <div className="flex-1 pr-3">
                  <p className="text-xs font-semibold" style={{ color: "rgba(197, 160, 89, 0.8)" }}>{item.concepto}</p>
                  <p className="text-[10px]" style={{ color: "rgba(197, 160, 89, 0.4)" }}>{item.nota}</p>
                </div>
                <span className="text-xs font-bold shrink-0" style={{ color: GOLD }}>{item.costo}</span>
              </div>
            ))}
          </div>

          {/* Info note */}
          <div className="flex items-start gap-3 p-3 rounded-lg text-xs leading-relaxed" style={{ backgroundColor: "rgba(197, 160, 89, 0.06)", color: "rgba(197, 160, 89, 0.6)", border: "1px solid rgba(197, 160, 89, 0.1)" }}>
            <Rocket size={16} className="shrink-0 mt-0.5" style={{ color: GOLD }} />
            <span>
              Puedes explorar todas las herramientas sin necesidad de estar formalizado. Cuando estes listo, te guiamos paso a paso.
            </span>
          </div>

          <ActionButtons onNext={() => setStep(2)} onBack={() => setStep(0)} />
        </div>
      );
    }

    if (step === 2) {
      // Step 2: Brand identity + formalization status
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: GOLD }}>Configura tu negocio</h2>
            <p className={textBase} style={{ color: "rgba(197, 160, 89, 0.6)" }}>
              Aunque no estes formalizado, personaliza tu espacio
            </p>
          </div>

          <NameInput />

          {/* Formalization question */}
          <div className="space-y-3">
            <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: "rgba(197, 160, 89, 0.7)" }}>
              ¿Ya tienes RUC?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <SelectionCard
                selected={isFormalized === true}
                onClick={() => setIsFormalized(true)}
                icon={<Shield size={20} style={{ color: isFormalized === true ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
                title="Si, ya tengo RUC"
                description="Tengo mi RUC activo en la DGI"
              />
              <SelectionCard
                selected={isFormalized === false}
                onClick={() => setIsFormalized(false)}
                icon={<Rocket size={20} style={{ color: isFormalized === false ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
                title="No, aun no"
                description="Quiero explorar sin compromiso"
              />
            </div>
          </div>

          {isFormalized === false && (
            <div className="flex items-start gap-3 p-3 rounded-lg text-xs leading-relaxed" style={{ backgroundColor: "rgba(197, 160, 89, 0.06)", color: "rgba(197, 160, 89, 0.6)", border: "1px solid rgba(197, 160, 89, 0.1)" }}>
              <Rocket size={16} className="shrink-0 mt-0.5" style={{ color: GOLD }} />
              <span>
                Te mostraremos la guia paso a paso para formalizar tu Sociedad de Emprendimiento (S.E.) cuando estes listo.
              </span>
            </div>
          )}

          <ActionButtons onNext={() => setStep(3)} onBack={() => setStep(1)} nextDisabled={isFormalized === null} />
        </div>
      );
    }

    // Step 3: Summary
    return renderSummary();
  };

  // ════════════════════════════════════════════════════════════════
  // PROFILE C — Jubilado / pensionado (Silver Economy)
  // ════════════════════════════════════════════════════════════════

  const renderProfileC = () => {
    if (step === 1) {
      // Step 1: Simple setup with large fonts
      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: GOLD }}>
              Configura tu negocio
            </h2>
            <p className="text-lg" style={{ color: "rgba(197, 160, 89, 0.6)" }}>
              Solo necesitamos tu nombre y lo que vendes
            </p>
          </div>

          <NameInput />

          {/* What do you sell - simplified */}
          <div className="space-y-3">
            <label className="text-base font-bold" style={{ color: "rgba(197, 160, 89, 0.7)" }}>
              ¿Que vendes o que servicio ofreces?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RUBROS.slice(0, 8).map((r) => (
                <button
                  key={r.key}
                  onClick={() => setCompanyRubro(companyRubro === r.key ? "" : r.key)}
                  className="px-3 py-3 rounded-lg text-sm font-semibold text-left transition-all"
                  style={{
                    backgroundColor: companyRubro === r.key ? "rgba(197, 160, 89, 0.2)" : "rgba(197, 160, 89, 0.05)",
                    border: `2px solid ${companyRubro === r.key ? GOLD : "rgba(197, 160, 89, 0.15)"}`,
                    color: companyRubro === r.key ? GOLD : "rgba(197, 160, 89, 0.6)",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <LogoUpload />

          <ActionButtons onNext={() => setStep(2)} onBack={() => setStep(0)} />
        </div>
      );
    }

    // Step 2: Summary (simplified for Silver Economy — no step 3)
    if (step === 2) {
      if (isFinishing) return <FinishingAnimation />;

      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: GOLD }}>
              ¡Ya esta todo listo!
            </h2>
            <p className="text-lg" style={{ color: "rgba(197, 160, 89, 0.6)" }}>
              Tu resumen de dinero esta preparado
            </p>
          </div>

          {/* Summary card */}
          <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: "rgba(197, 160, 89, 0.04)", border: "1px solid rgba(197, 160, 89, 0.12)" }}>
            <div className="flex items-center gap-4">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-16 h-16 object-contain rounded-lg" style={{ border: "1px solid rgba(197, 160, 89, 0.2)" }} />
              ) : (
                <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(197, 160, 89, 0.08)", border: "1px dashed rgba(197, 160, 89, 0.2)" }}>
                  <Building2 size={28} style={{ color: "rgba(197, 160, 89, 0.3)" }} />
                </div>
              )}
              <div>
                <p className="font-bold text-lg" style={{ color: GOLD }}>{companyName.trim() || "Mi Negocio"}</p>
                {companyRubro && (
                  <p className="text-sm mt-0.5 font-medium" style={{ color: "rgba(197, 160, 89, 0.5)" }}>
                    {RUBROS.find((r) => r.key === companyRubro)?.label || companyRubro}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* What you'll see — simplified explanation */}
          <div className="space-y-3">
            <p className="text-base font-semibold" style={{ color: "rgba(197, 160, 89, 0.7)" }}>Vas a poder:</p>
            {[
              { icon: <PenLine size={20} />, text: "Registrar lo que ganas y lo que gastas" },
              { icon: <DollarSign size={20} />, text: "Ver tu resumen de dinero" },
              { icon: <AlertTriangle size={20} />, text: "Saber que debes pagar y cuando" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(197, 160, 89, 0.04)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(197, 160, 89, 0.1)", color: GOLD }}>
                  {item.icon}
                </div>
                <p className="text-base font-medium" style={{ color: "rgba(197, 160, 89, 0.7)" }}>{item.text}</p>
              </div>
            ))}
          </div>

          {/* WhatsApp help */}
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
            <Phone size={22} style={{ color: "#22c55e" }} />
            <div>
              <p className="text-base font-semibold" style={{ color: "#22c55e" }}>¿Necesitas ayuda?</p>
              <p className="text-sm" style={{ color: "rgba(34, 197, 94, 0.7)" }}>Escribe por WhatsApp y te ayudamos</p>
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
      // Step 1: RUC status
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: GOLD }}>Estado de tu empresa en Panama</h2>
            <p className={textBase} style={{ color: "rgba(197, 160, 89, 0.6)" }}>
              ¿Ya tienes tu numero de contribuyente (RUC)?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <SelectionCard
              selected={rucStatus === "si"}
              onClick={() => setRucStatus("si")}
              icon={<Shield size={20} style={{ color: rucStatus === "si" ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
              title="Si, ya tengo RUC"
              description="Mi empresa tiene RUC activo en la DGI"
            />
            <SelectionCard
              selected={rucStatus === "en_tramite"}
              onClick={() => setRucStatus("en_tramite")}
              icon={<FileText size={20} style={{ color: rucStatus === "en_tramite" ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
              title="Esta en tramite"
              description="Ya inicie el proceso pero aun no tengo el RUC"
            />
            <SelectionCard
              selected={rucStatus === "no"}
              onClick={() => setRucStatus("no")}
              icon={<Rocket size={20} style={{ color: rucStatus === "no" ? GOLD : "rgba(148, 163, 184, 0.5)" }} />}
              title="No, aun no tengo RUC"
              description="Necesito conocer los pasos para obtenerlo"
            />
          </div>

          {/* Guide for foreigners */}
          {(rucStatus === "no" || rucStatus === "en_tramite") && (
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "rgba(197, 160, 89, 0.04)", border: "1px solid rgba(197, 160, 89, 0.12)" }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>
                Pasos para obtener RUC como extranjero
              </p>
              {[
                "Tener pasaporte vigente y permiso de residencia o trabajo",
                "Registrarse en e-Tax 2.0 (etax2.0.dgi.gob.pa) — gratis",
                "Solicitar Aviso de Operacion en el MICI (B/.15–B/.55)",
                "Inscribirse en la CSS si va a tener empleados — gratis",
              ].map((paso, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-bold shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(197, 160, 89, 0.15)", color: GOLD }}>
                    {i + 1}
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(197, 160, 89, 0.6)" }}>{paso}</p>
                </div>
              ))}
            </div>
          )}

          <ActionButtons onNext={() => setStep(2)} onBack={() => setStep(0)} nextDisabled={!rucStatus} />
        </div>
      );
    }

    if (step === 2) {
      // Step 2: Brand identity + Glossary
      return (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h2 className={`${textTitle} font-bold`} style={{ color: GOLD }}>Configura tu negocio</h2>
            <p className={textBase} style={{ color: "rgba(197, 160, 89, 0.6)" }}>
              Puedes usar todas las herramientas sin RUC activo
            </p>
          </div>

          <NameInput />

          {/* Basic glossary */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen size={14} style={{ color: GOLD }} />
              <label className={`${textSmall} font-bold uppercase tracking-wider`} style={{ color: "rgba(197, 160, 89, 0.7)" }}>
                Glosario basico
              </label>
            </div>
            <div className="rounded-xl overflow-hidden max-h-[200px] overflow-y-auto" style={{ border: "1px solid rgba(197, 160, 89, 0.12)" }}>
              {GLOSARIO_BASICO.map((item, i) => (
                <div
                  key={i}
                  className="px-4 py-2.5"
                  style={{
                    backgroundColor: i % 2 === 0 ? "rgba(197, 160, 89, 0.03)" : "transparent",
                    borderBottom: i < GLOSARIO_BASICO.length - 1 ? "1px solid rgba(197, 160, 89, 0.06)" : "none",
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: GOLD }}>{item.termino}:</span>{" "}
                  <span className="text-xs" style={{ color: "rgba(197, 160, 89, 0.55)" }}>{item.definicion}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px]" style={{ color: "rgba(197, 160, 89, 0.35)" }}>
              Encontraras este glosario siempre disponible en Mi Asistente
            </p>
          </div>

          <ActionButtons onNext={() => setStep(3)} onBack={() => setStep(1)} />
        </div>
      );
    }

    // Step 3: Summary
    return renderSummary();
  };

  // ════════════════════════════════════════════════════════════════
  // SHARED SUMMARY (Profiles A, B, D)
  // ════════════════════════════════════════════════════════════════

  const renderSummary = () => {
    if (isFinishing) return <FinishingAnimation />;

    // Build summary items based on profile
    const summaryItems: { label: string; value: string; color: string }[] = [];

    if (profile === "A") {
      if (tipoActividad) summaryItems.push({ label: "Actividad", value: tipoActividad.charAt(0).toUpperCase() + tipoActividad.slice(1), color: GOLD });
      if (tieneEmpleados !== null) summaryItems.push({ label: "Empleados", value: tieneEmpleados ? "Si — modulo planilla activo" : "No — solopreneur", color: tieneEmpleados ? "#22c55e" : "rgba(197, 160, 89, 0.6)" });
      if (facturaAlta !== null) summaryItems.push({ label: "Facturacion", value: facturaAlta ? "> B/.36,000/ano — PAC obligatorio" : "< B/.36,000/ano", color: facturaAlta ? "#eab308" : "rgba(197, 160, 89, 0.6)" });
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
          <h2 className={`${textTitle} font-bold`} style={{ color: GOLD }}>Todo listo</h2>
          <p className={textBase} style={{ color: "rgba(197, 160, 89, 0.6)" }}>
            Revisa tu configuracion antes de entrar
          </p>
        </div>

        {/* Summary card */}
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: "rgba(197, 160, 89, 0.04)", border: "1px solid rgba(197, 160, 89, 0.12)" }}>
          {/* Company info */}
          <div className="flex items-center gap-4">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-14 h-14 object-contain rounded-lg" style={{ border: "1px solid rgba(197, 160, 89, 0.2)" }} />
            ) : (
              <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(197, 160, 89, 0.08)", border: "1px dashed rgba(197, 160, 89, 0.2)" }}>
                <Building2 size={24} style={{ color: "rgba(197, 160, 89, 0.3)" }} />
              </div>
            )}
            <div>
              <p className="font-bold text-sm" style={{ color: GOLD }}>{companyName.trim() || "Mi Empresa"}</p>
              <p className="text-xs" style={{ color: "rgba(197, 160, 89, 0.5)" }}>
                {companyLogo ? "Logo configurado" : "Sin logo (puedes agregarlo despues)"}
              </p>
              {companyRubro && (
                <p className="text-[10px] mt-0.5 font-medium" style={{ color: "rgba(197, 160, 89, 0.4)" }}>
                  {RUBROS.find((r) => r.key === companyRubro)?.label || companyRubro}
                </p>
              )}
            </div>
          </div>

          {/* Profile badge */}
          <div className="h-px" style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }} />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(197, 160, 89, 0.15)", color: GOLD }}>
              Perfil {profile}
            </span>
            <span className="text-xs" style={{ color: "rgba(197, 160, 89, 0.5)" }}>
              {profile === "A" && "Negocio activo"}
              {profile === "B" && "Emprendedor en inicio"}
              {profile === "D" && "Migrante / en regularizacion"}
            </span>
          </div>

          {/* Profile-specific summary items */}
          {summaryItems.length > 0 && (
            <>
              <div className="h-px" style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }} />
              <div className="space-y-2">
                {summaryItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "rgba(197, 160, 89, 0.5)" }}>{item.label}</span>
                    <span className="text-xs font-semibold" style={{ color: item.color }}>{item.value}</span>
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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: `linear-gradient(to bottom, ${NAVY}, ${NAVY}, #0F171E)` }}
    >
      {/* Decorative top line */}
      <div className="fixed top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, opacity: 0.3 }} />

      {/* Content card */}
      <div className={`w-full ${isSilver ? "max-w-lg" : "max-w-md"}`}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <MidfLogo size={isSilver ? 64 : 56} iconOnly={false} />
        </div>

        {/* Step indicator (only after profile selection) */}
        {step > 0 && <StepIndicator />}

        {/* Step content */}
        {renderCurrentStep()}
      </div>

      {/* Decorative bottom line */}
      <div className="fixed bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, opacity: 0.15 }} />

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
