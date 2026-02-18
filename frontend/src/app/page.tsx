"use client";
import React from "react";
import {
  Scale,
  ChevronRight,
  BrainCircuit,
  BarChart3,
  Leaf,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-6">
          <Leaf size={16} />
          Tu Aliado Estrategico
        </div>
        <h1 className="text-5xl font-extrabold text-slate-800 mb-4 tracking-tight font-heading">
          SABIA EMPRENDE
        </h1>
        <p className="text-emerald-600 text-lg font-semibold mb-4">
          Tu Aliado Estrategico
        </p>
        <p className="text-slate-500 text-xl leading-relaxed">
          Constituye tu sociedad, entiende tus finanzas y toma decisiones con
          datos reales. Sin formulas complejas.
        </p>
      </div>

      {/* CTAs principales */}
      <div className="flex flex-col sm:flex-row gap-4 mb-16">
        <Link
          href="/wizard"
          className="group relative inline-flex items-center gap-3 px-10 py-5 bg-white text-slate-800 font-bold text-lg rounded-2xl hover:bg-slate-50 transition-all shadow-lg border border-slate-200 hover:-translate-y-1"
        >
          <Scale size={20} className="text-emerald-600" />
          Constituir Empresa
          <ChevronRight className="group-hover:translate-x-1 transition-transform text-emerald-600" />
        </Link>
        <Link
          href="/dashboard"
          className="group relative inline-flex items-center gap-3 px-10 py-5 bg-emerald-600 text-white font-bold text-lg rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:-translate-y-1"
        >
          <BarChart3 size={20} />
          Mi Director Financiero
          <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-50 transition-all">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-4">
            <Scale size={24} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">
            Constitucion Inteligente
          </h3>
          <p className="text-sm text-slate-500">
            SA, SRL o Sociedad de Emprendimiento. El wizard te guia segun tu
            caso.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 transition-all">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-4">
            <BarChart3 size={24} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">
            Motor de Verdad Financiera
          </h3>
          <p className="text-sm text-slate-500">
            Cascada P&amp;L, punto de equilibrio, nomina Panama y diagnostico
            automatico.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-50 transition-all">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit mb-4">
            <BrainCircuit size={24} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">
            Habla en Espanol Plano
          </h3>
          <p className="text-sm text-slate-500">
            Escribe &quot;Mis ventas fueron 50 mil&quot; y el sistema entiende. Sin
            formulas.
          </p>
        </div>
      </div>

      <p className="mt-12 text-slate-400 text-sm">
        SABIA EMPRENDE v1.0 — Tu Aliado Estrategico para Panama
      </p>
    </main>
  );
}
