"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Key,
  Shield,
  TestTube,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  FileCheck,
  ChevronDown,
} from "lucide-react";
import type {
  ConfiguracionPAC,
  PACProviderType,
  PACEnvironment,
  PasoOnboarding,
  EstadoOnboardingPAC,
  ErrorPAC,
  FacturaOutputPAC,
} from "@/lib/pac/types";
import { createPACClient, savePACConfig, getPACConfig } from "@/lib/pac/pac-client";

// ============================================
// TYPES
// ============================================

interface OnboardingPACProps {
  societyId: string;
  onComplete?: () => void;
}

const ONBOARDING_KEY = "midf_pac_onboarding";

const PASOS: { key: PasoOnboarding; label: string; icon: React.ReactNode }[] = [
  { key: "checklist", label: "Requisitos", icon: <FileCheck size={16} /> },
  { key: "credenciales", label: "Credenciales", icon: <Key size={16} /> },
  { key: "verificacion", label: "Verificacion", icon: <Shield size={16} /> },
  { key: "prueba", label: "Prueba", icon: <TestTube size={16} /> },
];

const PROVEEDORES: { value: PACProviderType; label: string; url: string }[] = [
  { value: "GOSOCKET", label: "Gosocket", url: "https://gosocket.net" },
  { value: "EDICOM", label: "Edicom", url: "https://edicomgroup.com" },
  { value: "SOVOS", label: "Sovos", url: "https://sovos.com" },
];

const DEFAULT_URLS: Record<PACProviderType, Record<PACEnvironment, string>> = {
  GOSOCKET: {
    SANDBOX: "https://api-sandbox.gosocket.net/v1",
    PRODUCTION: "https://api.gosocket.net/v1",
  },
  EDICOM: {
    SANDBOX: "https://api-sandbox.edicomgroup.com/v1",
    PRODUCTION: "https://api.edicomgroup.com/v1",
  },
  SOVOS: {
    SANDBOX: "https://api-sandbox.sovos.com/v1",
    PRODUCTION: "https://api.sovos.com/v1",
  },
};

// ============================================
// HELPERS
// ============================================

function readOnboardingState(societyId: string): EstadoOnboardingPAC {
  if (typeof window === "undefined") {
    return {
      pasoActual: "checklist",
      completados: [],
      conexionVerificada: false,
      facturaPruebaEmitida: false,
    };
  }
  try {
    const raw = localStorage.getItem(`${ONBOARDING_KEY}_${societyId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    pasoActual: "checklist",
    completados: [],
    conexionVerificada: false,
    facturaPruebaEmitida: false,
  };
}

function saveOnboardingState(societyId: string, state: EstadoOnboardingPAC): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${ONBOARDING_KEY}_${societyId}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function OnboardingPAC({ societyId, onComplete }: OnboardingPACProps) {
  const [estado, setEstado] = useState<EstadoOnboardingPAC>(() => readOnboardingState(societyId));

  // Checklist state
  const [checkRuc, setCheckRuc] = useState(false);
  const [checkCertificado, setCheckCertificado] = useState(false);
  const [checkCuentaPac, setCheckCuentaPac] = useState(false);
  const [checkDatosFiscales, setCheckDatosFiscales] = useState(false);

  // Credenciales state
  const [provider, setProvider] = useState<PACProviderType>("GOSOCKET");
  const [environment, setEnvironment] = useState<PACEnvironment>("SANDBOX");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [baseUrlOverride, setBaseUrlOverride] = useState("");

  // Verificacion state
  const [verificando, setVerificando] = useState(false);
  const [resultadoConexion, setResultadoConexion] = useState<{
    ok: boolean;
    latencyMs: number;
    mensaje?: string;
  } | null>(null);
  const [errorConexion, setErrorConexion] = useState<string | null>(null);

  // Prueba state
  const [emitiendo, setEmitiendo] = useState(false);
  const [resultadoPrueba, setResultadoPrueba] = useState<FacturaOutputPAC | null>(null);
  const [errorPrueba, setErrorPrueba] = useState<string | null>(null);

  // ============================================
  // INIT — Load existing config if available
  // ============================================

  useEffect(() => {
    const config = getPACConfig(societyId);
    if (config) {
      setProvider(config.provider);
      setEnvironment(config.environment);
      setApiKey(config.apiKey);
      setApiSecret(config.apiSecret);
      if (config.baseUrl !== DEFAULT_URLS[config.provider][config.environment]) {
        setBaseUrlOverride(config.baseUrl);
      }
    }
  }, [societyId]);

  // ============================================
  // STEP NAVIGATION
  // ============================================

  const pasoActualIdx = PASOS.findIndex((p) => p.key === estado.pasoActual);

  const isPasoCompleted = useCallback(
    (paso: PasoOnboarding) => estado.completados.includes(paso),
    [estado.completados]
  );

  const canAdvance = useCallback((): boolean => {
    switch (estado.pasoActual) {
      case "checklist":
        return checkRuc && checkCertificado && checkCuentaPac && checkDatosFiscales;
      case "credenciales":
        return apiKey.trim().length > 0 && apiSecret.trim().length > 0;
      case "verificacion":
        return estado.conexionVerificada;
      case "prueba":
        return estado.facturaPruebaEmitida;
      default:
        return false;
    }
  }, [
    estado.pasoActual,
    estado.conexionVerificada,
    estado.facturaPruebaEmitida,
    checkRuc,
    checkCertificado,
    checkCuentaPac,
    checkDatosFiscales,
    apiKey,
    apiSecret,
  ]);

  const goNext = useCallback(() => {
    const currentIdx = PASOS.findIndex((p) => p.key === estado.pasoActual);
    if (currentIdx >= PASOS.length - 1) return;

    const nuevoEstado: EstadoOnboardingPAC = {
      ...estado,
      pasoActual: PASOS[currentIdx + 1].key,
      completados: estado.completados.includes(estado.pasoActual)
        ? estado.completados
        : [...estado.completados, estado.pasoActual],
    };

    // Si estamos avanzando desde credenciales, guardar config
    if (estado.pasoActual === "credenciales") {
      const baseUrl =
        baseUrlOverride.trim() || DEFAULT_URLS[provider][environment];
      const config: ConfiguracionPAC = {
        societyId,
        provider,
        environment,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        baseUrl,
        isActive: false, // Activo solo tras verificacion exitosa
      };
      nuevoEstado.config = config;
      savePACConfig(config);
    }

    setEstado(nuevoEstado);
    saveOnboardingState(societyId, nuevoEstado);
  }, [estado, societyId, provider, environment, apiKey, apiSecret, baseUrlOverride]);

  const goBack = useCallback(() => {
    const currentIdx = PASOS.findIndex((p) => p.key === estado.pasoActual);
    if (currentIdx <= 0) return;

    const nuevoEstado: EstadoOnboardingPAC = {
      ...estado,
      pasoActual: PASOS[currentIdx - 1].key,
    };
    setEstado(nuevoEstado);
    saveOnboardingState(societyId, nuevoEstado);
  }, [estado, societyId]);

  // ============================================
  // VERIFICAR CONEXION
  // ============================================

  const handleVerificar = useCallback(async () => {
    setVerificando(true);
    setResultadoConexion(null);
    setErrorConexion(null);

    const config = getPACConfig(societyId);

    if (!config) {
      // Simulacion sin config real
      await new Promise((r) => setTimeout(r, 1500));
      const resultado = { ok: true, latencyMs: 245, mensaje: "Conexion simulada exitosa" };
      setResultadoConexion(resultado);

      const nuevoEstado: EstadoOnboardingPAC = { ...estado, conexionVerificada: true };
      setEstado(nuevoEstado);
      saveOnboardingState(societyId, nuevoEstado);
      setVerificando(false);
      return;
    }

    try {
      const client = await createPACClient(config);
      const resultado = await client.testConnection();
      setResultadoConexion(resultado);

      if (resultado.ok) {
        // Activar config y marcar verificado
        const configActiva: ConfiguracionPAC = { ...config, isActive: true };
        savePACConfig(configActiva);

        const nuevoEstado: EstadoOnboardingPAC = {
          ...estado,
          conexionVerificada: true,
          config: configActiva,
        };
        setEstado(nuevoEstado);
        saveOnboardingState(societyId, nuevoEstado);
      }
    } catch (err: unknown) {
      setErrorConexion(err instanceof Error ? err.message : "Error desconocido de conexion.");
    }

    setVerificando(false);
  }, [societyId, estado]);

  // ============================================
  // FACTURA DE PRUEBA
  // ============================================

  const handlePrueba = useCallback(async () => {
    setEmitiendo(true);
    setResultadoPrueba(null);
    setErrorPrueba(null);

    const config = getPACConfig(societyId);

    if (!config || !config.isActive) {
      // Simulacion local
      await new Promise((r) => setTimeout(r, 2000));
      const resultado: FacturaOutputPAC = {
        cufe: `TEST-${Date.now()}-SIM`,
        numeroDGI: `TEST-${Math.floor(Math.random() * 99999)}`,
        fechaAutorizacion: new Date().toISOString(),
        urlQR: "",
        xmlFirmado: "<xml>simulacion</xml>",
        estado: "AUTORIZADA",
        transaccionId: `txn-test-${Date.now()}`,
        montoTotal: 10.7,
        itbmsTotal: 0.7,
      };
      setResultadoPrueba(resultado);

      const nuevoEstado: EstadoOnboardingPAC = { ...estado, facturaPruebaEmitida: true };
      setEstado(nuevoEstado);
      saveOnboardingState(societyId, nuevoEstado);
      setEmitiendo(false);
      return;
    }

    try {
      const client = await createPACClient(config);
      const resultado = await client.emitirFactura({
        societyId,
        tipoDocumento: "01",
        receptor: {
          tipo: "CONSUMIDOR_FINAL",
          nombre: "Factura de Prueba — Mi Director Financiero",
        },
        items: [
          {
            descripcion: "Producto de prueba PAC",
            cantidad: 1,
            unidad: "UND",
            precioUnitario: 10.0,
            exentoItbms: false,
            tasaItbms: 7,
          },
        ],
        notas: "Factura de prueba generada durante onboarding PAC",
      });

      setResultadoPrueba(resultado);

      const nuevoEstado: EstadoOnboardingPAC = { ...estado, facturaPruebaEmitida: true };
      setEstado(nuevoEstado);
      saveOnboardingState(societyId, nuevoEstado);
    } catch (err: unknown) {
      setErrorPrueba(err instanceof Error ? err.message : "Error al emitir factura de prueba.");
    }

    setEmitiendo(false);
  }, [societyId, estado]);

  // ============================================
  // COMPLETAR ONBOARDING
  // ============================================

  const handleCompletar = useCallback(() => {
    const finalEstado: EstadoOnboardingPAC = {
      ...estado,
      completados: [...new Set([...estado.completados, "prueba"])] as PasoOnboarding[],
    };
    setEstado(finalEstado);
    saveOnboardingState(societyId, finalEstado);
    onComplete?.();
  }, [estado, societyId, onComplete]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-50">
            <Shield size={20} className="text-[#C5A059]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A242F] font-['Playfair_Display']">
              Configuracion PAC
            </h3>
            <p className="text-[10px] text-slate-400">
              Asistente de conexion con proveedor de facturacion electronica
            </p>
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          {PASOS.map((paso, idx) => {
            const isActive = paso.key === estado.pasoActual;
            const isCompleted = isPasoCompleted(paso.key);
            const isPast = idx < pasoActualIdx;

            return (
              <div key={paso.key} className="flex items-center flex-1 last:flex-none">
                {/* Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted || isPast
                        ? "bg-[#C5A059] text-white"
                        : isActive
                          ? "bg-[#C5A059] text-white ring-4 ring-amber-100"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted || isPast ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <span
                    className={`text-[9px] mt-1 font-medium ${
                      isActive ? "text-[#C5A059]" : isCompleted || isPast ? "text-[#1A242F]" : "text-slate-400"
                    }`}
                  >
                    {paso.label}
                  </span>
                </div>

                {/* Connecting line */}
                {idx < PASOS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-4 ${
                      isPast || isCompleted ? "bg-[#C5A059]" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="p-5">
        {estado.pasoActual === "checklist" && (
          <PasoChecklist
            checkRuc={checkRuc}
            checkCertificado={checkCertificado}
            checkCuentaPac={checkCuentaPac}
            checkDatosFiscales={checkDatosFiscales}
            onCheckRuc={setCheckRuc}
            onCheckCertificado={setCheckCertificado}
            onCheckCuentaPac={setCheckCuentaPac}
            onCheckDatosFiscales={setCheckDatosFiscales}
          />
        )}

        {estado.pasoActual === "credenciales" && (
          <PasoCredenciales
            provider={provider}
            environment={environment}
            apiKey={apiKey}
            apiSecret={apiSecret}
            baseUrlOverride={baseUrlOverride}
            onProviderChange={setProvider}
            onEnvironmentChange={setEnvironment}
            onApiKeyChange={setApiKey}
            onApiSecretChange={setApiSecret}
            onBaseUrlChange={setBaseUrlOverride}
          />
        )}

        {estado.pasoActual === "verificacion" && (
          <PasoVerificacion
            verificando={verificando}
            resultado={resultadoConexion}
            error={errorConexion}
            onVerificar={handleVerificar}
          />
        )}

        {estado.pasoActual === "prueba" && (
          <PasoPrueba
            emitiendo={emitiendo}
            resultado={resultadoPrueba}
            error={errorPrueba}
            onEmitir={handlePrueba}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={pasoActualIdx === 0}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
          Atras
        </button>

        {estado.pasoActual === "prueba" && estado.facturaPruebaEmitida ? (
          <button
            type="button"
            onClick={handleCompletar}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-sm"
          >
            <CheckCircle2 size={16} />
            Completar Configuracion
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance() || pasoActualIdx >= PASOS.length - 1}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#C5A059] hover:bg-amber-600 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            Siguiente
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// PASO 1: CHECKLIST
// ============================================

interface PasoChecklistProps {
  checkRuc: boolean;
  checkCertificado: boolean;
  checkCuentaPac: boolean;
  checkDatosFiscales: boolean;
  onCheckRuc: (v: boolean) => void;
  onCheckCertificado: (v: boolean) => void;
  onCheckCuentaPac: (v: boolean) => void;
  onCheckDatosFiscales: (v: boolean) => void;
}

function PasoChecklist({
  checkRuc,
  checkCertificado,
  checkCuentaPac,
  checkDatosFiscales,
  onCheckRuc,
  onCheckCertificado,
  onCheckCuentaPac,
  onCheckDatosFiscales,
}: PasoChecklistProps) {
  const requisitos = [
    {
      checked: checkRuc,
      onChange: onCheckRuc,
      label: "RUC vigente en la DGI",
      desc: "Su Registro Unico de Contribuyente debe estar activo y al dia.",
    },
    {
      checked: checkCertificado,
      onChange: onCheckCertificado,
      label: "Certificado de firma electronica",
      desc: "Emitido por una autoridad certificadora reconocida en Panama.",
    },
    {
      checked: checkCuentaPac,
      onChange: onCheckCuentaPac,
      label: "Cuenta con un Proveedor Autorizado Certificado (PAC)",
      desc: "Debe tener una cuenta activa con un PAC certificado por la DGI.",
      link: { url: "https://gosocket.net", label: "Visitar Gosocket" },
    },
    {
      checked: checkDatosFiscales,
      onChange: onCheckDatosFiscales,
      label: "Datos fiscales completos",
      desc: "Razon social, direccion fiscal y datos del representante legal verificados.",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-[#1A242F] mb-1">Requisitos Previos</h4>
        <p className="text-xs text-slate-500">
          Verifique que cumple con todos los requisitos antes de continuar con la configuracion.
        </p>
      </div>

      <div className="space-y-3">
        {requisitos.map((req, idx) => (
          <label
            key={idx}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              req.checked
                ? "border-[#C5A059] bg-amber-50/50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <input
              type="checkbox"
              checked={req.checked}
              onChange={(e) => req.onChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#C5A059] focus:ring-[#C5A059]"
            />
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  req.checked ? "text-[#1A242F]" : "text-slate-600"
                }`}
              >
                {req.label}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{req.desc}</p>
              {req.link && (
                <a
                  href={req.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#C5A059] hover:text-amber-700 mt-1 font-medium"
                >
                  <ExternalLink size={10} />
                  {req.link.label}
                </a>
              )}
            </div>
            {req.checked && <CheckCircle2 size={18} className="text-[#C5A059] mt-0.5 shrink-0" />}
          </label>
        ))}
      </div>
    </div>
  );
}

// ============================================
// PASO 2: CREDENCIALES
// ============================================

interface PasoCredencialesProps {
  provider: PACProviderType;
  environment: PACEnvironment;
  apiKey: string;
  apiSecret: string;
  baseUrlOverride: string;
  onProviderChange: (v: PACProviderType) => void;
  onEnvironmentChange: (v: PACEnvironment) => void;
  onApiKeyChange: (v: string) => void;
  onApiSecretChange: (v: string) => void;
  onBaseUrlChange: (v: string) => void;
}

function PasoCredenciales({
  provider,
  environment,
  apiKey,
  apiSecret,
  baseUrlOverride,
  onProviderChange,
  onEnvironmentChange,
  onApiKeyChange,
  onApiSecretChange,
  onBaseUrlChange,
}: PasoCredencialesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-[#1A242F] mb-1">Credenciales del PAC</h4>
        <p className="text-xs text-slate-500">
          Ingrese las credenciales proporcionadas por su proveedor PAC.
        </p>
      </div>

      {/* Provider select */}
      <div>
        <label className="block text-xs font-medium text-[#1A242F] mb-1">Proveedor PAC</label>
        <div className="relative">
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as PACProviderType)}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] bg-white appearance-none pr-8"
          >
            {PROVEEDORES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      {/* Environment toggle */}
      <div>
        <label className="block text-xs font-medium text-[#1A242F] mb-1">Ambiente</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEnvironmentChange("SANDBOX")}
            className={`flex-1 text-xs py-2.5 rounded-lg border transition-all font-medium ${
              environment === "SANDBOX"
                ? "border-[#C5A059] bg-amber-50 text-[#C5A059]"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            Sandbox (Pruebas)
          </button>
          <button
            type="button"
            onClick={() => onEnvironmentChange("PRODUCTION")}
            className={`flex-1 text-xs py-2.5 rounded-lg border transition-all font-medium ${
              environment === "PRODUCTION"
                ? "border-[#C5A059] bg-amber-50 text-[#C5A059]"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            Produccion
          </button>
        </div>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-xs font-medium text-[#1A242F] mb-1">API Key</label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Ingrese su API Key"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] placeholder:text-slate-400 font-mono"
        />
      </div>

      {/* API Secret */}
      <div>
        <label className="block text-xs font-medium text-[#1A242F] mb-1">API Secret</label>
        <input
          type="password"
          value={apiSecret}
          onChange={(e) => onApiSecretChange(e.target.value)}
          placeholder="Ingrese su API Secret"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] placeholder:text-slate-400 font-mono"
        />
      </div>

      {/* Base URL Override */}
      <div>
        <label className="block text-xs font-medium text-[#1A242F] mb-1">
          URL Base (opcional — solo si difiere del default)
        </label>
        <input
          type="text"
          value={baseUrlOverride}
          onChange={(e) => onBaseUrlChange(e.target.value)}
          placeholder={DEFAULT_URLS[provider][environment]}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] placeholder:text-slate-400 font-mono"
        />
        <p className="text-[9px] text-slate-400 mt-1">
          Default: {DEFAULT_URLS[provider][environment]}
        </p>
      </div>
    </div>
  );
}

// ============================================
// PASO 3: VERIFICACION
// ============================================

interface PasoVerificacionProps {
  verificando: boolean;
  resultado: { ok: boolean; latencyMs: number; mensaje?: string } | null;
  error: string | null;
  onVerificar: () => void;
}

function PasoVerificacion({ verificando, resultado, error, onVerificar }: PasoVerificacionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-[#1A242F] mb-1">Verificar Conexion</h4>
        <p className="text-xs text-slate-500">
          Pruebe la conexion con su proveedor PAC para confirmar que las credenciales son correctas.
        </p>
      </div>

      {/* Test button */}
      <div className="flex flex-col items-center py-6 space-y-4">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            resultado?.ok
              ? "bg-emerald-100"
              : resultado && !resultado.ok
                ? "bg-red-100"
                : error
                  ? "bg-red-100"
                  : "bg-slate-100"
          }`}
        >
          {verificando ? (
            <Loader2 size={32} className="animate-spin text-[#C5A059]" />
          ) : resultado?.ok ? (
            <Wifi size={32} className="text-emerald-600" />
          ) : resultado || error ? (
            <WifiOff size={32} className="text-red-600" />
          ) : (
            <Wifi size={32} className="text-slate-400" />
          )}
        </div>

        {resultado && (
          <div
            className={`text-center ${resultado.ok ? "text-emerald-700" : "text-red-700"}`}
          >
            <p className="text-sm font-semibold">
              {resultado.ok ? "Conexion exitosa" : "Conexion fallida"}
            </p>
            <p className="text-xs mt-0.5">Latencia: {resultado.latencyMs}ms</p>
            {resultado.mensaje && (
              <p className="text-[10px] mt-0.5 text-slate-500">{resultado.mensaje}</p>
            )}
          </div>
        )}

        {error && (
          <div className="text-center text-red-700">
            <p className="text-sm font-semibold">Error de conexion</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        )}

        {!resultado && !error && !verificando && (
          <p className="text-xs text-slate-400">
            Presione el boton para verificar la conexion con el PAC.
          </p>
        )}

        <button
          type="button"
          onClick={onVerificar}
          disabled={verificando}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#C5A059] hover:bg-amber-600 text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {verificando ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <Shield size={16} />
              {resultado ? "Reintentar" : "Verificar Conexion"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================
// PASO 4: FACTURA DE PRUEBA
// ============================================

interface PasoPruebaProps {
  emitiendo: boolean;
  resultado: FacturaOutputPAC | null;
  error: string | null;
  onEmitir: () => void;
}

function PasoPrueba({ emitiendo, resultado, error, onEmitir }: PasoPruebaProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-[#1A242F] mb-1">Factura de Prueba</h4>
        <p className="text-xs text-slate-500">
          Emita una factura de prueba para confirmar que todo funciona correctamente. Se emitira un
          documento de prueba por B/.10.00 + ITBMS.
        </p>
      </div>

      {/* Result */}
      {resultado && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">Factura de prueba emitida</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500">CUFE:</span>
              <p className="font-mono text-[10px] text-emerald-700 truncate">{resultado.cufe}</p>
            </div>
            <div>
              <span className="text-slate-500">Numero DGI:</span>
              <p className="font-mono text-[10px] text-emerald-700">{resultado.numeroDGI}</p>
            </div>
            <div>
              <span className="text-slate-500">Estado:</span>
              <p className="font-semibold text-emerald-700">{resultado.estado}</p>
            </div>
            <div>
              <span className="text-slate-500">Total:</span>
              <p className="font-semibold text-emerald-700">
                B/.{resultado.montoTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <p className="text-sm font-semibold text-red-800">Error al emitir</p>
          </div>
          <p className="text-xs text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Emit button */}
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={onEmitir}
          disabled={emitiendo || !!resultado}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#C5A059] hover:bg-amber-600 text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {emitiendo ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Emitiendo prueba...
            </>
          ) : resultado ? (
            <>
              <CheckCircle2 size={16} />
              Prueba completada
            </>
          ) : (
            <>
              <TestTube size={16} />
              Emitir Factura de Prueba
            </>
          )}
        </button>
      </div>
    </div>
  );
}
