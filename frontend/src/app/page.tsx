"use client";
import React from "react";
import {
  Scale,
  ChevronRight,
  BrainCircuit,
  BarChart3,
  BookOpen,
  Shield,
  Mic,
  Camera,
} from "lucide-react";
import Link from "next/link";
import SabiaLogo from "@/components/SabiaLogo";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1A242F] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1A242F] via-[#1A242F] to-[#0F171E] pointer-events-none" />

      {/* Decorative gold accent lines */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-40" />
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-40" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10 max-w-3xl">
          <div className="flex justify-center mb-6">
            <SabiaLogo size={110} iconOnly />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-heading mb-2"
            style={{ color: "#C5A059" }}>
            Mi Director Financiero
          </h1>
          <p className="text-2xl sm:text-3xl font-bold tracking-widest mb-4"
            style={{ color: "#C5A059", opacity: 0.85 }}>
            PTY
          </p>
          <p className="text-lg font-semibold mb-6" style={{ color: "#C5A059", opacity: 0.7 }}>
            Tu Aliado Estratégico
          </p>
          <p className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto">
            Constituye tu sociedad, entiende tus finanzas y toma decisiones con
            datos reales. Sin formulas complejas.
          </p>
        </div>

        {/* Slogan */}
        <div className="text-center mb-12 max-w-lg">
          <p className="text-sm italic tracking-wide" style={{ color: "#C5A059", opacity: 0.6 }}>
            &ldquo;Mi Legado es mi Moneda. Mi Experiencia es mi Nuevo Mercado.&rdquo;
          </p>
        </div>

        {/* CTAs principales */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16 w-full sm:w-auto">
          <Link
            href="/wizard"
            className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 font-bold text-lg rounded-2xl transition-all hover:-translate-y-1 border"
            style={{
              backgroundColor: "rgba(197, 160, 89, 0.1)",
              borderColor: "rgba(197, 160, 89, 0.3)",
              color: "#C5A059",
            }}
          >
            <Scale size={20} />
            Constituir Empresa
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 text-[#1A242F] font-bold text-lg rounded-2xl transition-all shadow-lg hover:-translate-y-1"
            style={{
              backgroundColor: "#C5A059",
              boxShadow: "0 4px 20px rgba(197, 160, 89, 0.3)",
            }}
          >
            <BarChart3 size={20} />
            Mi Director Financiero
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Feature cards — 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10">
          {/* Modulo Legal */}
          <div className="p-6 rounded-2xl border transition-all hover:-translate-y-1"
            style={{
              backgroundColor: "rgba(197, 160, 89, 0.05)",
              borderColor: "rgba(197, 160, 89, 0.15)",
            }}>
            <div className="p-3 rounded-xl w-fit mb-4"
              style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}>
              <Scale size={24} style={{ color: "#C5A059" }} />
            </div>
            <h3 className="font-bold mb-2" style={{ color: "#C5A059" }}>
              Mi Empresa
            </h3>
            <p className="text-sm text-slate-400">
              Constitucion inteligente (SA, SRL, SE), boveda KYC, vigilante
              legal y calendario fiscal Panama.
            </p>
          </div>

          {/* Modulo Contable */}
          <div className="p-6 rounded-2xl border transition-all hover:-translate-y-1"
            style={{
              backgroundColor: "rgba(197, 160, 89, 0.05)",
              borderColor: "rgba(197, 160, 89, 0.15)",
            }}>
            <div className="p-3 rounded-xl w-fit mb-4"
              style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}>
              <BookOpen size={24} style={{ color: "#C5A059" }} />
            </div>
            <h3 className="font-bold mb-2" style={{ color: "#C5A059" }}>
              Mi Contador
            </h3>
            <p className="text-sm text-slate-400">
              Registro por voz, escaneo de facturas, asientos automaticos,
              libro diario y mayor con partida doble.
            </p>
          </div>

          {/* Director Financiero */}
          <div className="p-6 rounded-2xl border transition-all hover:-translate-y-1"
            style={{
              backgroundColor: "rgba(197, 160, 89, 0.05)",
              borderColor: "rgba(197, 160, 89, 0.15)",
            }}>
            <div className="p-3 rounded-xl w-fit mb-4"
              style={{ backgroundColor: "rgba(197, 160, 89, 0.1)" }}>
              <BarChart3 size={24} style={{ color: "#C5A059" }} />
            </div>
            <h3 className="font-bold mb-2" style={{ color: "#C5A059" }}>
              Mis Finanzas
            </h3>
            <p className="text-sm text-slate-400">
              Cascada P&amp;L, punto de equilibrio, simulador, valoracion,
              nomina Panama y diagnostico automatico.
            </p>
          </div>
        </div>

        {/* Secondary features row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-12">
          <div className="flex items-center gap-3 p-4 rounded-xl"
            style={{ backgroundColor: "rgba(197, 160, 89, 0.05)" }}>
            <Mic size={18} style={{ color: "#C5A059" }} />
            <span className="text-sm text-slate-400">Dicta tus gastos por voz</span>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl"
            style={{ backgroundColor: "rgba(197, 160, 89, 0.05)" }}>
            <Camera size={18} style={{ color: "#C5A059" }} />
            <span className="text-sm text-slate-400">Escanea facturas con tu camara</span>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl"
            style={{ backgroundColor: "rgba(197, 160, 89, 0.05)" }}>
            <BrainCircuit size={18} style={{ color: "#C5A059" }} />
            <span className="text-sm text-slate-400">Habla en espanol plano</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-sm">
          Mi Director Financiero PTY v1.0 — Tu Aliado Estratégico para Panama
        </p>
      </div>
    </main>
  );
}
