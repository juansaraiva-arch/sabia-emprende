"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  Receipt,
  ListOrdered,
  ChevronDown,
} from "lucide-react";
import type {
  FacturaInputPAC,
  FacturaOutputPAC,
  ItemFacturaPAC,
  ErrorPAC,
  ConfiguracionPAC,
} from "@/lib/pac/types";
import { createPACClient, getPACConfig } from "@/lib/pac/pac-client";
import type { EstadoFacturaPAC } from "@/lib/ventas-types";
import { ESTADO_PAC_LABELS } from "@/lib/ventas-types";
import { formatBalboas } from "@/lib/currency";

// ============================================
// TYPES
// ============================================

interface PanelPACProps {
  societyId: string;
}

type VistaPanel = "nueva" | "emitidas";

/** Registro de factura almacenado localmente */
interface FacturaLocal {
  id: string;
  cufe: string;
  fecha: string;
  receptorNombre: string;
  receptorRuc?: string;
  montoTotal: number;
  itbmsTotal: number;
  estado: EstadoFacturaPAC;
  items: ItemFacturaPAC[];
  notas?: string;
  createdAt: string;
}

type TipoReceptor = "CONSUMIDOR_FINAL" | "CONTRIBUYENTE";
type UnidadMedida = "UND" | "KG" | "LT" | "SRV" | "HR";
type TasaItbms = 0 | 7 | 10;

const UNIDADES: { value: UnidadMedida; label: string }[] = [
  { value: "UND", label: "Unidad" },
  { value: "KG", label: "Kilogramo" },
  { value: "LT", label: "Litro" },
  { value: "SRV", label: "Servicio" },
  { value: "HR", label: "Hora" },
];

const TASAS_ITBMS: { value: TasaItbms; label: string }[] = [
  { value: 0, label: "0%" },
  { value: 7, label: "7%" },
  { value: 10, label: "10%" },
];

const FACTURAS_KEY = "midf_pac_facturas";

// ============================================
// HELPERS
// ============================================

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateCUFELocal(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let cufe = "SIM-";
  for (let i = 0; i < 20; i++) {
    cufe += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return cufe;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readFacturas(societyId: string): FacturaLocal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FACTURAS_KEY);
    if (!raw) return [];
    const all: FacturaLocal[] = JSON.parse(raw);
    return all
      .filter((f) => f.id.startsWith(societyId) || f.receptorNombre)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function readAllFacturas(): FacturaLocal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FACTURAS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFacturaLocal(factura: FacturaLocal): void {
  if (typeof window === "undefined") return;
  try {
    const all = readAllFacturas();
    all.push(factura);
    localStorage.setItem(FACTURAS_KEY, JSON.stringify(all));
  } catch {
    // localStorage lleno
  }
}

function calcularTotalesItems(items: ItemFacturaPAC[]) {
  let subtotalGravado = 0;
  let subtotalExento = 0;
  let totalItbms = 0;

  for (const item of items) {
    const subtotal = item.cantidad * item.precioUnitario;
    if (item.exentoItbms) {
      subtotalExento += subtotal;
    } else {
      subtotalGravado += subtotal;
      totalItbms += Math.round(subtotal * (item.tasaItbms / 100) * 100) / 100;
    }
  }

  return {
    subtotalGravado: Math.round(subtotalGravado * 100) / 100,
    subtotalExento: Math.round(subtotalExento * 100) / 100,
    totalItbms: Math.round(totalItbms * 100) / 100,
    totalDocumento: Math.round((subtotalGravado + subtotalExento + totalItbms) * 100) / 100,
  };
}

// ============================================
// STATUS BADGE
// ============================================

function EstadoBadge({ estado }: { estado: EstadoFacturaPAC }) {
  const estilos: Record<EstadoFacturaPAC, string> = {
    AUTORIZADA: "bg-emerald-100 text-emerald-700",
    PENDIENTE: "bg-amber-100 text-amber-700",
    RECHAZADA: "bg-red-100 text-red-700",
    ERROR: "bg-red-100 text-red-700",
    ANULADA: "bg-gray-100 text-gray-500",
  };

  const iconos: Record<EstadoFacturaPAC, React.ReactNode> = {
    AUTORIZADA: <CheckCircle2 size={12} />,
    PENDIENTE: <Clock size={12} />,
    RECHAZADA: <XCircle size={12} />,
    ERROR: <AlertCircle size={12} />,
    ANULADA: <Ban size={12} />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${estilos[estado]}`}
    >
      {iconos[estado]}
      {ESTADO_PAC_LABELS[estado]}
    </span>
  );
}

// ============================================
// EMPTY ITEM FACTORY
// ============================================

function crearItemVacio(): ItemFacturaPAC {
  return {
    descripcion: "",
    cantidad: 1,
    unidad: "UND",
    precioUnitario: 0,
    exentoItbms: false,
    tasaItbms: 7,
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PanelPAC({ societyId }: PanelPACProps) {
  const [vista, setVista] = useState<VistaPanel>("nueva");
  const [pacConfig, setPacConfig] = useState<ConfiguracionPAC | null>(null);
  const [configChecked, setConfigChecked] = useState(false);

  // Form state — Receptor
  const [tipoReceptor, setTipoReceptor] = useState<TipoReceptor>("CONSUMIDOR_FINAL");
  const [receptorNombre, setReceptorNombre] = useState("");
  const [receptorRuc, setReceptorRuc] = useState("");
  const [receptorEmail, setReceptorEmail] = useState("");
  const [notas, setNotas] = useState("");

  // Form state — Items
  const [items, setItems] = useState<ItemFacturaPAC[]>([crearItemVacio()]);

  // Emission state
  const [emitiendo, setEmitiendo] = useState(false);
  const [errorEmision, setErrorEmision] = useState<ErrorPAC | null>(null);
  const [ultimaFactura, setUltimaFactura] = useState<FacturaOutputPAC | null>(null);

  // List state
  const [facturas, setFacturas] = useState<FacturaLocal[]>([]);

  // ============================================
  // INIT
  // ============================================

  useEffect(() => {
    const config = getPACConfig(societyId);
    setPacConfig(config);
    setConfigChecked(true);
  }, [societyId]);

  useEffect(() => {
    setFacturas(readFacturas(societyId));
  }, [societyId]);

  // ============================================
  // TOTALES EN TIEMPO REAL
  // ============================================

  const totales = useMemo(() => calcularTotalesItems(items), [items]);

  // ============================================
  // ITEM MANAGEMENT
  // ============================================

  const updateItem = useCallback(
    (index: number, field: keyof ItemFacturaPAC, value: string | number | boolean) => {
      setItems((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        // Si se marca exento, forzar tasa a 0
        if (field === "exentoItbms" && value === true) {
          next[index].tasaItbms = 0;
        }
        return next;
      });
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, crearItemVacio()]);
  }, []);

  const removeItem = useCallback(
    (index: number) => {
      if (items.length <= 1) return;
      setItems((prev) => prev.filter((_, i) => i !== index));
    },
    [items.length]
  );

  // ============================================
  // EMITIR FACTURA
  // ============================================

  const handleEmitir = useCallback(async () => {
    setErrorEmision(null);
    setUltimaFactura(null);

    // Validacion basica
    if (!receptorNombre.trim()) {
      setErrorEmision({
        categoria: "VALIDACION",
        codigo: "V001",
        mensaje: "El nombre del receptor es obligatorio.",
        reintentable: false,
      });
      return;
    }

    const itemsValidos = items.filter(
      (it) => it.descripcion.trim() && it.cantidad > 0 && it.precioUnitario > 0
    );
    if (itemsValidos.length === 0) {
      setErrorEmision({
        categoria: "VALIDACION",
        codigo: "V002",
        mensaje: "Debe agregar al menos un item con descripcion, cantidad y precio.",
        reintentable: false,
      });
      return;
    }

    setEmitiendo(true);

    const input: FacturaInputPAC = {
      societyId,
      tipoDocumento: "01",
      receptor: {
        tipo: tipoReceptor,
        nombre: receptorNombre.trim(),
        ruc: receptorRuc.trim() || undefined,
        email: receptorEmail.trim() || undefined,
      },
      items: itemsValidos,
      notas: notas.trim() || undefined,
    };

    // Intentar emision real si hay config PAC activa
    if (pacConfig && pacConfig.isActive) {
      try {
        const client = await createPACClient(pacConfig);
        const resultado = await client.emitirFactura(input);
        setUltimaFactura(resultado);

        // Guardar localmente
        const facturaLocal: FacturaLocal = {
          id: generateId(),
          cufe: resultado.cufe,
          fecha: todayISO(),
          receptorNombre: receptorNombre.trim(),
          receptorRuc: receptorRuc.trim() || undefined,
          montoTotal: resultado.montoTotal,
          itbmsTotal: resultado.itbmsTotal,
          estado: resultado.estado as EstadoFacturaPAC,
          items: itemsValidos,
          notas: notas.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        saveFacturaLocal(facturaLocal);
        setFacturas(readFacturas(societyId));
        resetFormulario();
      } catch (err: unknown) {
        const errorPac: ErrorPAC = {
          categoria: "CONEXION",
          codigo: "E500",
          mensaje: err instanceof Error ? err.message : "Error desconocido al emitir factura.",
          reintentable: true,
        };
        setErrorEmision(errorPac);
      }
    } else {
      // Simulacion local (sin PAC configurado)
      await new Promise((r) => setTimeout(r, 1200));

      const tots = calcularTotalesItems(itemsValidos);
      const facturaLocal: FacturaLocal = {
        id: generateId(),
        cufe: generateCUFELocal(),
        fecha: todayISO(),
        receptorNombre: receptorNombre.trim(),
        receptorRuc: receptorRuc.trim() || undefined,
        montoTotal: tots.totalDocumento,
        itbmsTotal: tots.totalItbms,
        estado: "AUTORIZADA",
        items: itemsValidos,
        notas: notas.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      saveFacturaLocal(facturaLocal);
      setFacturas(readFacturas(societyId));
      setUltimaFactura({
        cufe: facturaLocal.cufe,
        numeroDGI: `SIM-${Date.now()}`,
        fechaAutorizacion: new Date().toISOString(),
        urlQR: "",
        xmlFirmado: "",
        estado: "AUTORIZADA",
        transaccionId: facturaLocal.id,
        montoTotal: tots.totalDocumento,
        itbmsTotal: tots.totalItbms,
      });
      resetFormulario();
    }

    setEmitiendo(false);
  }, [
    societyId,
    pacConfig,
    receptorNombre,
    receptorRuc,
    receptorEmail,
    tipoReceptor,
    notas,
    items,
  ]);

  const resetFormulario = useCallback(() => {
    setReceptorNombre("");
    setReceptorRuc("");
    setReceptorEmail("");
    setNotas("");
    setItems([crearItemVacio()]);
    setTipoReceptor("CONSUMIDOR_FINAL");
  }, []);

  // ============================================
  // RENDER
  // ============================================

  if (!configChecked) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={24} className="animate-spin text-[#C5A059]" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-amber-50">
            <FileText size={20} className="text-[#C5A059]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A242F] font-['Playfair_Display']">
              Facturacion Electronica PAC
            </h3>
            <p className="text-[10px] text-slate-400">
              {pacConfig?.isActive
                ? `Conectado a ${pacConfig.provider} (${pacConfig.environment})`
                : "Modo simulacion — sin PAC configurado"}
            </p>
          </div>
        </div>

        {/* No-config notice */}
        {!pacConfig && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-amber-800">
              <AlertCircle size={12} className="inline mr-1 -mt-0.5" />
              PAC no configurado. Complete el proceso de Onboarding PAC para conectar con su
              proveedor. Las facturas se guardaran localmente como simulacion.
            </p>
          </div>
        )}

        {/* Tab toggle */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setVista("nueva")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition-all ${
              vista === "nueva"
                ? "bg-white text-[#1A242F] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Receipt size={14} />
            Nueva Factura
          </button>
          <button
            onClick={() => setVista("emitidas")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition-all ${
              vista === "emitidas"
                ? "bg-white text-[#1A242F] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ListOrdered size={14} />
            Facturas Emitidas
            {facturas.length > 0 && (
              <span className="bg-[#C5A059] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {facturas.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {vista === "nueva" ? (
          <NuevaFacturaForm
            items={items}
            tipoReceptor={tipoReceptor}
            receptorNombre={receptorNombre}
            receptorRuc={receptorRuc}
            receptorEmail={receptorEmail}
            notas={notas}
            totales={totales}
            emitiendo={emitiendo}
            errorEmision={errorEmision}
            ultimaFactura={ultimaFactura}
            onTipoReceptorChange={setTipoReceptor}
            onReceptorNombreChange={setReceptorNombre}
            onReceptorRucChange={setReceptorRuc}
            onReceptorEmailChange={setReceptorEmail}
            onNotasChange={setNotas}
            onUpdateItem={updateItem}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onEmitir={handleEmitir}
            onDismissError={() => setErrorEmision(null)}
            onDismissExito={() => setUltimaFactura(null)}
          />
        ) : (
          <ListaFacturas facturas={facturas} />
        )}
      </div>
    </div>
  );
}

// ============================================
// SUBCOMPONENTE: FORMULARIO NUEVA FACTURA
// ============================================

interface NuevaFacturaFormProps {
  items: ItemFacturaPAC[];
  tipoReceptor: TipoReceptor;
  receptorNombre: string;
  receptorRuc: string;
  receptorEmail: string;
  notas: string;
  totales: ReturnType<typeof calcularTotalesItems>;
  emitiendo: boolean;
  errorEmision: ErrorPAC | null;
  ultimaFactura: FacturaOutputPAC | null;
  onTipoReceptorChange: (v: TipoReceptor) => void;
  onReceptorNombreChange: (v: string) => void;
  onReceptorRucChange: (v: string) => void;
  onReceptorEmailChange: (v: string) => void;
  onNotasChange: (v: string) => void;
  onUpdateItem: (i: number, field: keyof ItemFacturaPAC, value: string | number | boolean) => void;
  onAddItem: () => void;
  onRemoveItem: (i: number) => void;
  onEmitir: () => void;
  onDismissError: () => void;
  onDismissExito: () => void;
}

function NuevaFacturaForm({
  items,
  tipoReceptor,
  receptorNombre,
  receptorRuc,
  receptorEmail,
  notas,
  totales,
  emitiendo,
  errorEmision,
  ultimaFactura,
  onTipoReceptorChange,
  onReceptorNombreChange,
  onReceptorRucChange,
  onReceptorEmailChange,
  onNotasChange,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onEmitir,
  onDismissError,
  onDismissExito,
}: NuevaFacturaFormProps) {
  return (
    <div className="space-y-5">
      {/* Resultado exitoso */}
      {ultimaFactura && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Factura emitida</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  CUFE: <span className="font-mono">{ultimaFactura.cufe}</span>
                </p>
                <p className="text-xs text-emerald-600">
                  Total: {formatBalboas(ultimaFactura.montoTotal)} | ITBMS:{" "}
                  {formatBalboas(ultimaFactura.itbmsTotal)}
                </p>
              </div>
            </div>
            <button
              onClick={onDismissExito}
              className="text-emerald-400 hover:text-emerald-600 transition-colors"
            >
              <XCircle size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Error de emision */}
      {errorEmision && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Error al emitir ({errorEmision.categoria})
                </p>
                <p className="text-xs text-red-700 mt-0.5">{errorEmision.mensaje}</p>
                {errorEmision.detalle && (
                  <p className="text-[10px] text-red-500 mt-0.5">{errorEmision.detalle}</p>
                )}
                {errorEmision.reintentable && (
                  <p className="text-[10px] text-red-400 mt-1">Este error es reintentable.</p>
                )}
              </div>
            </div>
            <button
              onClick={onDismissError}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <XCircle size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Receptor */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-[#1A242F] mb-1">Datos del Receptor</legend>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onTipoReceptorChange("CONSUMIDOR_FINAL")}
            className={`flex-1 text-xs py-2 rounded-lg border transition-all font-medium ${
              tipoReceptor === "CONSUMIDOR_FINAL"
                ? "border-[#C5A059] bg-amber-50 text-[#C5A059]"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            Consumidor Final
          </button>
          <button
            type="button"
            onClick={() => onTipoReceptorChange("CONTRIBUYENTE")}
            className={`flex-1 text-xs py-2 rounded-lg border transition-all font-medium ${
              tipoReceptor === "CONTRIBUYENTE"
                ? "border-[#C5A059] bg-amber-50 text-[#C5A059]"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            Contribuyente
          </button>
        </div>

        <input
          type="text"
          placeholder="Nombre del receptor *"
          value={receptorNombre}
          onChange={(e) => onReceptorNombreChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] placeholder:text-slate-400"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder={tipoReceptor === "CONTRIBUYENTE" ? "RUC *" : "RUC (opcional)"}
            value={receptorRuc}
            onChange={(e) => onReceptorRucChange(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] placeholder:text-slate-400"
          />
          <input
            type="email"
            placeholder="Email (opcional)"
            value={receptorEmail}
            onChange={(e) => onReceptorEmailChange(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] placeholder:text-slate-400"
          />
        </div>
      </fieldset>

      {/* Items */}
      <fieldset className="space-y-3">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-bold text-[#1A242F]">Items de la Factura</legend>
          <button
            type="button"
            onClick={onAddItem}
            className="flex items-center gap-1 text-[11px] font-medium text-[#C5A059] hover:text-amber-700 transition-colors"
          >
            <Plus size={14} />
            Agregar item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  Item {idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem(idx)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Descripcion del bien o servicio"
                value={item.descripcion}
                onChange={(e) => onUpdateItem(idx, "descripcion", e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] placeholder:text-slate-400 bg-white"
              />

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-400 mb-0.5">Cantidad</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.cantidad || ""}
                    onChange={(e) => onUpdateItem(idx, "cantidad", parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-slate-400 mb-0.5">Unidad</label>
                  <div className="relative">
                    <select
                      value={item.unidad}
                      onChange={(e) => onUpdateItem(idx, "unidad", e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] bg-white appearance-none pr-6"
                    >
                      {UNIDADES.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.value}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-slate-400 mb-0.5">Precio Unit.</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.precioUnitario || ""}
                    onChange={(e) =>
                      onUpdateItem(idx, "precioUnitario", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-slate-400 mb-0.5">ITBMS</label>
                  <div className="relative">
                    <select
                      value={item.tasaItbms}
                      disabled={item.exentoItbms}
                      onChange={(e) =>
                        onUpdateItem(idx, "tasaItbms", parseInt(e.target.value, 10) as TasaItbms)
                      }
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] bg-white appearance-none pr-6 disabled:opacity-50"
                    >
                      {TASAS_ITBMS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.exentoItbms}
                    onChange={(e) => onUpdateItem(idx, "exentoItbms", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#C5A059] focus:ring-[#C5A059]"
                  />
                  <span className="text-[10px] text-slate-500">Exento de ITBMS</span>
                </label>

                <span className="text-xs font-semibold text-[#1A242F]">
                  {formatBalboas(item.cantidad * item.precioUnitario)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {/* Notas */}
      <div>
        <label className="block text-sm font-bold text-[#1A242F] mb-1">Notas (opcional)</label>
        <textarea
          placeholder="Observaciones para la factura..."
          value={notas}
          onChange={(e) => onNotasChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-[#1A242F] placeholder:text-slate-400 resize-none"
        />
      </div>

      {/* Totales */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-1.5 border border-slate-100">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Subtotal Gravado</span>
          <span className="font-medium">{formatBalboas(totales.subtotalGravado)}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>Subtotal Exento</span>
          <span className="font-medium">{formatBalboas(totales.subtotalExento)}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>ITBMS</span>
          <span className="font-medium">{formatBalboas(totales.totalItbms)}</span>
        </div>
        <div className="border-t border-slate-200 pt-1.5 flex justify-between text-sm font-bold text-[#1A242F]">
          <span>Total Documento</span>
          <span>{formatBalboas(totales.totalDocumento)}</span>
        </div>
      </div>

      {/* Boton emitir */}
      <button
        type="button"
        onClick={onEmitir}
        disabled={emitiendo}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#C5A059] hover:bg-amber-600 text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
      >
        {emitiendo ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Emitiendo factura...
          </>
        ) : (
          <>
            <Send size={16} />
            Emitir Factura
          </>
        )}
      </button>
    </div>
  );
}

// ============================================
// SUBCOMPONENTE: LISTA DE FACTURAS EMITIDAS
// ============================================

function ListaFacturas({ facturas }: { facturas: FacturaLocal[] }) {
  if (facturas.length === 0) {
    return (
      <div className="text-center py-10">
        <FileText size={32} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">No hay facturas emitidas</p>
        <p className="text-[10px] text-slate-400 mt-1">
          Las facturas emitidas apareceran aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {facturas.map((f) => (
        <div
          key={f.id}
          className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors bg-white"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#1A242F] truncate">
                {f.receptorNombre}
              </p>
              <EstadoBadge estado={f.estado} />
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
              CUFE: {f.cufe}
            </p>
            <p className="text-[10px] text-slate-400">
              {f.fecha}
              {f.receptorRuc && ` | RUC: ${f.receptorRuc}`}
            </p>
          </div>
          <div className="text-right ml-3 shrink-0">
            <p className="text-sm font-bold text-[#1A242F]">{formatBalboas(f.montoTotal)}</p>
            <p className="text-[10px] text-slate-400">ITBMS: {formatBalboas(f.itbmsTotal)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
