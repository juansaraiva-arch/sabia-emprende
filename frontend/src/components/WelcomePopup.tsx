"use client";
import React from "react";
import { BarChart3, FileText, Shield, ArrowRight, X } from "lucide-react";
import SabiaLogo from "@/components/SabiaLogo";

interface WelcomePopupProps {
  onDismiss: () => void;
  onStart: () => void;
}

export default function WelcomePopup({ onDismiss, onStart }: WelcomePopupProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors z-10"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        {/* Header gradient */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-8 text-center">
          <div className="flex items-center justify-center mx-auto mb-4">
            <SabiaLogo size={80} iconOnly />
          </div>
          <h2 className="text-2xl font-extrabold text-white font-heading mb-1">
            SABIA EMPRENDE
          </h2>
          <p className="text-sm text-amber-400 font-medium">Tu Aliado Estrategico</p>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Has dado el paso definitivo para transformar tu negocio. Ya no eres solo una emprendedora;
            hoy asumes el rol de <strong className="text-slate-800">Gerente de tu propia Empresa</strong>.
          </p>

          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Que encontraras aqui?
          </p>

          <div className="space-y-3 mb-6">
            <FeatureRow
              icon={<BarChart3 size={18} className="text-emerald-500" />}
              title="Mi Contabilidad"
              desc="Centro de mando para registrar ingresos y egresos con rigor ejecutivo."
            />
            <FeatureRow
              icon={<BarChart3 size={18} className="text-blue-500" />}
              title="Mi Director Financiero PTY"
              desc="Tablero de Business Intelligence para analizar tu cascada de rentabilidad."
            />
            <FeatureRow
              icon={<Shield size={18} className="text-violet-500" />}
              title="Mi Empresa — Doc Legales"
              desc="Escudo protector para mantener cumplimiento fiscal y auditorias al dia."
            />
          </div>

          <p className="text-xs text-slate-400 italic mb-5">
            Recuerda: cada numero cuenta una historia. Pasa el cursor sobre los terminos tecnicos
            si tienes dudas; nuestro glosario inteligente esta aqui para guiarte.
          </p>

          <button
            onClick={onStart}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all min-h-[48px]"
            style={{ backgroundColor: "#1B2838", boxShadow: "0 4px 14px rgba(27,40,56,0.3)" }}
          >
            Empezar mi Diagnostico Financiero
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-bold text-slate-700">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}
