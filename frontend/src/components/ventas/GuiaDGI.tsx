"use client";

import React from "react";
import {
  ExternalLink,
  Monitor,
  Calendar,
  Download,
  Upload,
  X,
  Info,
  Menu,
} from "lucide-react";

// ============================================
// TIPOS
// ============================================

interface GuiaDGIProps {
  onClose?: () => void;
}

// ============================================
// PASOS DE LA GUIA
// ============================================

interface PasoGuia {
  numero: number;
  icon: React.ReactNode;
  titulo: string;
  descripcion: string;
  link?: { url: string; label: string };
}

const PASOS: PasoGuia[] = [
  {
    numero: 1,
    icon: <Monitor size={18} />,
    titulo: "Ingresa a e-Tax 2.0",
    descripcion:
      "Accede al portal tributario de la DGI con tu RUC y contrasena.",
    link: {
      url: "https://etax2.mef.gob.pa",
      label: "etax2.mef.gob.pa",
    },
  },
  {
    numero: 2,
    icon: <Menu size={18} />,
    titulo: "Navega al modulo SFEP",
    descripcion:
      "En el menu lateral, selecciona Facturacion Electronica y luego Sistema de Facturacion Gratuito.",
  },
  {
    numero: 3,
    icon: <Calendar size={18} />,
    titulo: "Selecciona el periodo",
    descripcion:
      "Elige el mes y ano que deseas exportar. Puedes exportar un mes a la vez.",
  },
  {
    numero: 4,
    icon: <Download size={18} />,
    titulo: "Haz clic en 'Exportar CSV'",
    descripcion:
      "Busca el boton de descarga en la esquina superior derecha de la tabla de facturas.",
  },
  {
    numero: 5,
    icon: <Upload size={18} />,
    titulo: "Importa el archivo aqui",
    descripcion:
      "Arrastra o selecciona el archivo CSV descargado en el importador de Mi Director Financiero.",
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function GuiaDGI({ onClose }: GuiaDGIProps) {
  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-5 relative">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Como exportar el CSV desde la DGI
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Guia paso a paso para descargar tus facturas del Sistema de Facturacion Gratuito
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Cerrar guia"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Pasos */}
      <div className="space-y-3">
        {PASOS.map((paso) => (
          <div
            key={paso.numero}
            className="flex gap-3 items-start"
          >
            {/* Circulo numerado */}
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
              {paso.numero}
            </div>

            {/* Contenido */}
            <div className="flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">{paso.icon}</span>
                <p className="text-sm font-bold text-slate-800">
                  {paso.titulo}
                </p>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 ml-[26px]">
                {paso.descripcion}
              </p>
              {paso.link && (
                <a
                  href={`https://${paso.link.url.replace(/^https?:\/\//, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-[26px] mt-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                >
                  <ExternalLink size={12} />
                  {paso.link.label}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Nota informativa */}
      <div className="flex gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-700">Nota</p>
          <p className="text-xs text-amber-600 mt-0.5">
            El facturador gratuito DGI es para contribuyentes con ingresos
            &lt;= B/.36,000/ano y &lt;= 100 documentos/mes. Si superas estos
            limites, debes migrar a un Proveedor Autorizado Calificado (PAC)
            del Segmento 3.
          </p>
        </div>
      </div>

      {/* Link a DGI */}
      <div className="text-center">
        <a
          href="https://dgi.mef.gob.pa"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 font-medium transition-colors"
        >
          <ExternalLink size={12} />
          Visitar sitio web de la DGI
        </a>
      </div>
    </div>
  );
}
