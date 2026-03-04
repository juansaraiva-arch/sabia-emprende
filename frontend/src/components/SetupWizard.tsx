"use client";
import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  Building2,
  Shield,
  Rocket,
  ArrowRight,
  Check,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import MidfLogo from "@/components/MidfLogo";

const GOLD = "#C5A059";
const NAVY = "#1A242F";

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

interface SetupWizardProps {
  onComplete: (routeTo?: "fabrica_empresa") => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Brand identity
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

  // Step 2: Formalization
  const [isFormalized, setIsFormalized] = useState<boolean | null>(null);

  // Step 3: Finishing animation
  const [isFinishing, setIsFinishing] = useState(false);

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

  // ─── Final save ───

  const handleFinish = () => {
    setIsFinishing(true);
    // Persist all data
    if (companyName.trim()) {
      localStorage.setItem("midf_company_name", companyName.trim());
    }
    if (companyLogo) {
      localStorage.setItem("midf_company_logo", companyLogo);
    }
    if (companyRubro) {
      localStorage.setItem("midf_company_rubro", companyRubro);
    }
    if (isFormalized === true) {
      localStorage.setItem("midf_has_ruc", "true");
    }
    // Mark wizard as complete + suppress old WelcomePopup
    localStorage.setItem("midf_welcomed", "true");
    localStorage.setItem("midf_setup_complete", "true");

    setTimeout(() => onComplete(isFormalized === false ? "fabrica_empresa" : undefined), 1200);
  };

  const handleSkip = () => {
    localStorage.setItem("midf_welcomed", "true");
    localStorage.setItem("midf_setup_complete", "true");
    onComplete();
  };

  // ─── Step indicator ───

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <React.Fragment key={s}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
            style={{
              backgroundColor:
                s < step
                  ? GOLD
                  : s === step
                  ? "rgba(197, 160, 89, 0.2)"
                  : "rgba(148, 163, 184, 0.1)",
              color:
                s < step
                  ? NAVY
                  : s === step
                  ? GOLD
                  : "rgba(148, 163, 184, 0.4)",
              border:
                s === step
                  ? `2px solid ${GOLD}`
                  : s < step
                  ? `2px solid ${GOLD}`
                  : "2px solid rgba(148, 163, 184, 0.2)",
            }}
          >
            {s < step ? <Check size={14} /> : s}
          </div>
          {s < 3 && (
            <div
              className="w-12 h-0.5 transition-all duration-300"
              style={{
                backgroundColor:
                  s < step ? GOLD : "rgba(148, 163, 184, 0.2)",
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ─── Step 1: Brand Identity ───

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2
          className="text-xl sm:text-2xl font-bold"
          style={{ color: GOLD }}
        >
          Configura tu empresa
        </h2>
        <p className="text-sm" style={{ color: "rgba(197, 160, 89, 0.6)" }}>
          Personaliza tu Director Financiero con la identidad de tu negocio
        </p>
      </div>

      {/* Logo upload */}
      <div className="space-y-2">
        <label
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "rgba(197, 160, 89, 0.7)" }}
        >
          Logo de tu empresa
        </label>
        <div
          onClick={() => logoInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center py-8 hover:border-opacity-100"
          style={{
            borderColor: isDragging
              ? GOLD
              : companyLogo
              ? GOLD
              : "rgba(197, 160, 89, 0.3)",
            backgroundColor: isDragging
              ? "rgba(197, 160, 89, 0.08)"
              : "rgba(197, 160, 89, 0.03)",
          }}
        >
          {companyLogo ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={companyLogo}
                alt="Logo"
                className="w-20 h-20 object-contain rounded-lg"
              />
              <span
                className="text-xs"
                style={{ color: "rgba(197, 160, 89, 0.5)" }}
              >
                Click para cambiar
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}
              >
                {isDragging ? (
                  <Upload size={20} style={{ color: GOLD }} />
                ) : (
                  <ImageIcon
                    size={20}
                    style={{ color: "rgba(197, 160, 89, 0.5)" }}
                  />
                )}
              </div>
              <p
                className="text-sm font-medium"
                style={{ color: "rgba(197, 160, 89, 0.6)" }}
              >
                {isDragging
                  ? "Suelta tu logo aqui"
                  : "Arrastra tu logo o haz click"}
              </p>
              <p
                className="text-xs"
                style={{ color: "rgba(197, 160, 89, 0.35)" }}
              >
                PNG, JPG — max 500KB recomendado
              </p>
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Company name */}
      <div className="space-y-2">
        <label
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "rgba(197, 160, 89, 0.7)" }}
        >
          Nombre de tu empresa
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="ej: Mi Tienda Panama S.E."
          className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all focus:ring-2"
          style={{
            backgroundColor: "rgba(197, 160, 89, 0.06)",
            border: "1.5px solid rgba(197, 160, 89, 0.25)",
            color: GOLD,
            caretColor: GOLD,
          }}
          onFocus={(e) =>
            (e.target.style.borderColor = GOLD)
          }
          onBlur={(e) =>
            (e.target.style.borderColor = "rgba(197, 160, 89, 0.25)")
          }
        />
      </div>

      {/* Rubro / Industria */}
      <div className="space-y-2">
        <label
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "rgba(197, 160, 89, 0.7)" }}
        >
          Rubro o Industria
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
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
        <p className="text-[10px]" style={{ color: "rgba(197, 160, 89, 0.35)" }}>
          Opcional — ayuda a personalizar tu experiencia
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={() => setStep(2)}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:brightness-110"
          style={{ backgroundColor: GOLD, color: NAVY }}
        >
          Siguiente
          <ArrowRight size={16} />
        </button>
        <button
          onClick={handleSkip}
          className="text-xs transition-colors hover:underline"
          style={{ color: "rgba(197, 160, 89, 0.4)" }}
        >
          Saltar por ahora
        </button>
      </div>
    </div>
  );

  // ─── Step 2: Compliance Filter ───

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2
          className="text-xl sm:text-2xl font-bold"
          style={{ color: GOLD }}
        >
          Estado de formalizacion
        </h2>
        <p className="text-sm" style={{ color: "rgba(197, 160, 89, 0.6)" }}>
          Esto nos ayuda a personalizar tu experiencia
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card: Ya formalizada */}
        <button
          onClick={() => setIsFormalized(true)}
          className="relative p-6 rounded-xl border-2 transition-all duration-200 text-left group hover:scale-[1.02]"
          style={{
            borderColor:
              isFormalized === true ? GOLD : "rgba(197, 160, 89, 0.15)",
            backgroundColor:
              isFormalized === true
                ? "rgba(197, 160, 89, 0.08)"
                : "rgba(197, 160, 89, 0.02)",
          }}
        >
          {isFormalized === true && (
            <div
              className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: GOLD }}
            >
              <Check size={12} style={{ color: NAVY }} />
            </div>
          )}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{
              backgroundColor:
                isFormalized === true
                  ? "rgba(197, 160, 89, 0.15)"
                  : "rgba(148, 163, 184, 0.1)",
            }}
          >
            <Shield
              size={20}
              style={{
                color:
                  isFormalized === true
                    ? GOLD
                    : "rgba(148, 163, 184, 0.5)",
              }}
            />
          </div>
          <h3
            className="font-bold text-sm mb-1"
            style={{
              color:
                isFormalized === true
                  ? GOLD
                  : "rgba(197, 160, 89, 0.7)",
            }}
          >
            Si, ya tengo RUC
          </h3>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "rgba(197, 160, 89, 0.45)" }}
          >
            Mi empresa esta inscrita en la DGI y tiene su RUC activo
          </p>
        </button>

        {/* Card: No formalizada */}
        <button
          onClick={() => setIsFormalized(false)}
          className="relative p-6 rounded-xl border-2 transition-all duration-200 text-left group hover:scale-[1.02]"
          style={{
            borderColor:
              isFormalized === false ? GOLD : "rgba(197, 160, 89, 0.15)",
            backgroundColor:
              isFormalized === false
                ? "rgba(197, 160, 89, 0.08)"
                : "rgba(197, 160, 89, 0.02)",
          }}
        >
          {isFormalized === false && (
            <div
              className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: GOLD }}
            >
              <Check size={12} style={{ color: NAVY }} />
            </div>
          )}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{
              backgroundColor:
                isFormalized === false
                  ? "rgba(197, 160, 89, 0.15)"
                  : "rgba(148, 163, 184, 0.1)",
            }}
          >
            <Rocket
              size={20}
              style={{
                color:
                  isFormalized === false
                    ? GOLD
                    : "rgba(148, 163, 184, 0.5)",
              }}
            />
          </div>
          <h3
            className="font-bold text-sm mb-1"
            style={{
              color:
                isFormalized === false
                  ? GOLD
                  : "rgba(197, 160, 89, 0.7)",
            }}
          >
            No, aun no
          </h3>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "rgba(197, 160, 89, 0.45)" }}
          >
            Estoy en proceso o aun no he iniciado la formalizacion
          </p>
        </button>
      </div>

      {/* Info note */}
      {isFormalized === false && (
        <div
          className="flex items-start gap-3 p-3 rounded-lg text-xs leading-relaxed"
          style={{
            backgroundColor: "rgba(197, 160, 89, 0.06)",
            color: "rgba(197, 160, 89, 0.6)",
            border: "1px solid rgba(197, 160, 89, 0.1)",
          }}
        >
          <Rocket
            size={16}
            className="shrink-0 mt-0.5"
            style={{ color: GOLD }}
          />
          <span>
            Te mostraremos una guia paso a paso para formalizar tu Sociedad de
            Emprendimiento en Panama. Incluye enlaces directos a cada entidad
            del gobierno.
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={() => setStep(3)}
          disabled={isFormalized === null}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
          style={{
            backgroundColor:
              isFormalized !== null ? GOLD : "rgba(197, 160, 89, 0.3)",
            color: NAVY,
          }}
        >
          Siguiente
          <ArrowRight size={16} />
        </button>
        <button
          onClick={() => setStep(1)}
          className="text-xs transition-colors hover:underline"
          style={{ color: "rgba(197, 160, 89, 0.4)" }}
        >
          Volver
        </button>
      </div>
    </div>
  );

  // ─── Step 3: Summary + Enter ───

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isFinishing ? (
        // Finishing animation
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <MidfLogo size={64} iconOnly />
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{
                backgroundColor: "rgba(197, 160, 89, 0.15)",
              }}
            />
          </div>
          <p className="text-sm font-medium" style={{ color: GOLD }}>
            Preparando tu Director Financiero...
          </p>
          <div
            className="w-48 h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}
          >
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                backgroundColor: GOLD,
                width: "100%",
                animation: "grow 1s ease-in-out forwards",
              }}
            />
          </div>
        </div>
      ) : (
        // Summary
        <>
          <div className="text-center space-y-2">
            <h2
              className="text-xl sm:text-2xl font-bold"
              style={{ color: GOLD }}
            >
              Todo listo
            </h2>
            <p
              className="text-sm"
              style={{ color: "rgba(197, 160, 89, 0.6)" }}
            >
              Revisa tu configuracion antes de entrar
            </p>
          </div>

          {/* Summary card */}
          <div
            className="rounded-xl p-5 space-y-4"
            style={{
              backgroundColor: "rgba(197, 160, 89, 0.04)",
              border: "1px solid rgba(197, 160, 89, 0.12)",
            }}
          >
            {/* Company info row */}
            <div className="flex items-center gap-4">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt="Logo"
                  className="w-14 h-14 object-contain rounded-lg"
                  style={{
                    border: "1px solid rgba(197, 160, 89, 0.2)",
                  }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(197, 160, 89, 0.08)",
                    border: "1px dashed rgba(197, 160, 89, 0.2)",
                  }}
                >
                  <Building2
                    size={24}
                    style={{ color: "rgba(197, 160, 89, 0.3)" }}
                  />
                </div>
              )}
              <div>
                <p
                  className="font-bold text-sm"
                  style={{ color: GOLD }}
                >
                  {companyName.trim() || "Mi Empresa"}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "rgba(197, 160, 89, 0.5)" }}
                >
                  {companyLogo ? "Logo configurado" : "Sin logo (puedes agregarlo despues)"}
                </p>
                {companyRubro && (
                  <p className="text-[10px] mt-0.5 font-medium" style={{ color: "rgba(197, 160, 89, 0.4)" }}>
                    {RUBROS.find((r) => r.key === companyRubro)?.label || companyRubro}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div
              className="h-px"
              style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}
            />

            {/* Formalization status */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: isFormalized
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(234, 179, 8, 0.1)",
                }}
              >
                {isFormalized ? (
                  <Shield
                    size={16}
                    style={{ color: "#22c55e" }}
                  />
                ) : (
                  <Rocket
                    size={16}
                    style={{ color: "#eab308" }}
                  />
                )}
              </div>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "rgba(197, 160, 89, 0.8)" }}
                >
                  {isFormalized
                    ? "Empresa formalizada con RUC"
                    : "Pendiente de formalizacion"}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "rgba(197, 160, 89, 0.4)" }}
                >
                  {isFormalized
                    ? "Acceso completo a todas las herramientas"
                    : "Te guiaremos paso a paso para formalizar tu S.E."}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              onClick={handleFinish}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all hover:brightness-110 hover:scale-[1.01]"
              style={{ backgroundColor: GOLD, color: NAVY }}
            >
              <Sparkles size={16} />
              Entrar al Dashboard
            </button>
            <button
              onClick={() => setStep(2)}
              className="text-xs transition-colors hover:underline"
              style={{ color: "rgba(197, 160, 89, 0.4)" }}
            >
              Volver
            </button>
          </div>
        </>
      )}
    </div>
  );

  // ─── Main render ───

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{
        background: `linear-gradient(to bottom, ${NAVY}, ${NAVY}, #0F171E)`,
      }}
    >
      {/* Decorative top line */}
      <div
        className="fixed top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          opacity: 0.3,
        }}
      />

      {/* Content card */}
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <MidfLogo size={56} iconOnly={false} />
        </div>

        {/* Step indicator */}
        <StepIndicator />

        {/* Step content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Decorative bottom line */}
      <div
        className="fixed bottom-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          opacity: 0.15,
        }}
      />

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes grow {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
