"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  FileText,
  Calendar,
  MapPin,
  Shield,
  Save,
  Check,
  Plus,
  Trash2,
  Settings,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

const ENTITY_TYPES = [
  { key: "SE", label: "Sociedad de Emprendimiento (Ley 186)", regime: "SEP_LEY_186" },
  { key: "SA", label: "Sociedad Anonima (S.A.)", regime: "REGIMEN_GENERAL" },
  { key: "SRL", label: "Sociedad de Responsabilidad Limitada (S.R.L.)", regime: "REGIMEN_GENERAL" },
  { key: "EU", label: "Empresa Unipersonal", regime: "REGIMEN_GENERAL" },
  { key: "OTRO", label: "Otro", regime: "REGIMEN_GENERAL" },
];

interface PatronalEntry {
  id: string;
  numero: string;
  etiqueta: string;
}

// ============================================
// COMPONENT
// ============================================

export default function CompanyConfig() {
  // Legal data
  const [ruc, setRuc] = useState("");
  const [dv, setDv] = useState("");
  const [entityType, setEntityType] = useState("");
  const [incorporationDate, setIncorporationDate] = useState("");
  const [fiscalAddress, setFiscalAddress] = useState("");

  // CSS data
  const [patronales, setPatronales] = useState<PatronalEntry[]>([]);
  const [tasaRiesgos, setTasaRiesgos] = useState(1.5);

  // UI state
  const [saved, setSaved] = useState(false);

  // Load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    setRuc(localStorage.getItem("midf_ruc") || "");
    setDv(localStorage.getItem("midf_dv") || "");
    setEntityType(localStorage.getItem("midf_entity_type") || "");
    setIncorporationDate(localStorage.getItem("midf_incorporation_date") || "");
    setFiscalAddress(localStorage.getItem("midf_fiscal_address") || "");
    setTasaRiesgos(parseFloat(localStorage.getItem("midf_tasa_riesgos_prof") || "1.5"));
    try {
      const raw = localStorage.getItem("midf_numero_patronal_css");
      if (raw) {
        const parsed = JSON.parse(raw);
        setPatronales(Array.isArray(parsed) ? parsed : [{ id: "1", numero: parsed, etiqueta: "Principal" }]);
      }
    } catch {
      // ignore
    }
  }, []);

  // Derive fiscal regime
  function deriveFiscalRegime(et: string): string {
    const found = ENTITY_TYPES.find((t) => t.key === et);
    return found?.regime || "REGIMEN_GENERAL";
  }

  // Save handler
  const handleSave = useCallback(() => {
    if (typeof window === "undefined") return;
    // Legal data
    if (ruc.trim()) localStorage.setItem("midf_ruc", ruc.trim());
    if (dv.trim()) localStorage.setItem("midf_dv", dv.trim());
    if (entityType) {
      localStorage.setItem("midf_entity_type", entityType);
      localStorage.setItem("midf_fiscal_regime", deriveFiscalRegime(entityType));
    }
    if (incorporationDate) localStorage.setItem("midf_incorporation_date", incorporationDate);
    if (fiscalAddress.trim()) localStorage.setItem("midf_fiscal_address", fiscalAddress.trim());

    // CSS data
    if (patronales.length > 0) {
      localStorage.setItem("midf_numero_patronal_css", JSON.stringify(patronales));
    }
    localStorage.setItem("midf_tasa_riesgos_prof", tasaRiesgos.toString());

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [ruc, dv, entityType, incorporationDate, fiscalAddress, patronales, tasaRiesgos]);

  // Patronal CRUD
  const addPatronal = () => {
    setPatronales((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), numero: "", etiqueta: "" },
    ]);
  };

  const removePatronal = (id: string) => {
    setPatronales((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePatronal = (id: string, field: "numero" | "etiqueta", value: string) => {
    setPatronales((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const entityLabel = ENTITY_TYPES.find((t) => t.key === entityType)?.label || "";
  const isSEP = entityType === "SE";

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ====== SECCION 1: DATOS LEGALES ====== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-blue-600" />
          <h3 className="font-bold text-slate-700">Datos Legales y Fiscales</h3>
        </div>
        <p className="text-xs text-slate-400">
          Estos datos alimentan automaticamente tus formularios DGI (Form 03, F2 V10, Form 430, Form 20)
        </p>

        {/* Entity Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de entidad</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Seleccionar...</option>
            {ENTITY_TYPES.map((et) => (
              <option key={et.key} value={et.key}>{et.label}</option>
            ))}
          </select>
          {entityType && (
            <p className="text-[10px] text-slate-400">
              Regimen fiscal: <span className="font-bold">{deriveFiscalRegime(entityType)}</span> (derivado automaticamente)
            </p>
          )}
        </div>

        {/* RUC + DV */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={12} />
            RUC y Digito Verificador
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              placeholder="ej: 155123456-2-2024"
              className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="text"
              value={dv}
              onChange={(e) => setDv(e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="DV"
              maxLength={2}
              className="w-16 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-bold text-center text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Incorporation Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={12} />
            Fecha de constitucion
          </label>
          <input
            type="date"
            value={incorporationDate}
            onChange={(e) => setIncorporationDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {isSEP && incorporationDate && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-700">
              <Shield size={12} className="shrink-0 mt-0.5" />
              <span>Tu S.E.P. tiene exoneracion de ISR por 24 meses desde constitucion (Ley 186 Art. 37)</span>
            </div>
          )}
        </div>

        {/* Fiscal Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={12} />
            Direccion fiscal
          </label>
          <textarea
            value={fiscalAddress}
            onChange={(e) => setFiscalAddress(e.target.value)}
            placeholder="ej: Calle 50, Edificio XYZ, Piso 3, Panama, Panama"
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
          />
        </div>
      </div>

      {/* ====== SECCION 2: DATOS CSS ====== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-violet-600" />
          <h3 className="font-bold text-slate-700">Datos CSS (Caja de Seguro Social)</h3>
        </div>
        <p className="text-xs text-slate-400">
          Necesarios para generar la Planilla CSS. Solo requerido si tienes empleados en planilla.
        </p>

        {/* Numeros Patronales */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Numero(s) Patronal CSS
            </label>
            <button
              onClick={addPatronal}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
            >
              <Plus size={10} />
              Agregar
            </button>
          </div>

          {patronales.length === 0 && (
            <div className="p-4 rounded-lg border border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-400">
                No hay numeros patronales registrados. Haz clic en "Agregar" si tienes empleados en planilla.
              </p>
            </div>
          )}

          {patronales.map((p) => (
            <div key={p.id} className="flex gap-2 items-center">
              <input
                type="text"
                value={p.numero}
                onChange={(e) => updatePatronal(p.id, "numero", e.target.value)}
                placeholder="Numero patronal"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <input
                type="text"
                value={p.etiqueta}
                onChange={(e) => updatePatronal(p.id, "etiqueta", e.target.value)}
                placeholder="Etiqueta (ej: Principal)"
                className="w-40 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <button
                onClick={() => removePatronal(p.id)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Tasa Riesgos Profesionales */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Settings size={12} />
            Tasa de Riesgos Profesionales
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={tasaRiesgos}
              onChange={(e) => setTasaRiesgos(parseFloat(e.target.value) || 0)}
              step={0.01}
              min={0}
              max={10}
              className="w-24 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-bold text-center text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <span className="text-sm text-slate-500 font-medium">%</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Default: 1.50%. Puede variar segun la actividad economica de tu empresa (Art. 256 Decreto 68 de la CSS).
          </p>
        </div>
      </div>

      {/* ====== SAVE BUTTON ====== */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all"
        >
          <Save size={14} />
          Guardar Configuracion
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold animate-pulse">
            <Check size={14} /> Guardado correctamente
          </span>
        )}
      </div>
    </div>
  );
}
