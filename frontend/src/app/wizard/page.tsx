"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HelpCircle,
  BrainCircuit,
  Gavel,
  FileCheck,
  Loader2,
  Home,
} from "lucide-react";

export default function SelectorWizard() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [finalPath, setFinalPath] = useState("");
  const router = useRouter();

  const analysisMessages = [
    "Analizando legislacion de la Republica de Panama...",
    "Verificando incentivos fiscales de la Ley 186...",
    "Evaluando requisitos de Agente Residente...",
    "Generando recomendacion personalizada...",
  ];

  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setAnalysisStep((prev) => {
          if (prev < analysisMessages.length - 1) return prev + 1;
          clearInterval(interval);
          setTimeout(() => router.push(finalPath), 800);
          return prev;
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing, finalPath, router, analysisMessages.length]);

  const triggerAnalysis = (path: string) => {
    setFinalPath(path);
    setIsAnalyzing(true);
  };

  const handleStep1 = (type: "intl" | "local") => {
    type === "intl"
      ? triggerAnalysis("/society/new?type=SA")
      : setStep(2);
  };

  const handleStep2 = (isStartup: boolean) => {
    isStartup
      ? triggerAnalysis("/society/new?type=SE")
      : setStep(3);
  };

  const handleStep3 = (isFree: boolean) => {
    isFree
      ? triggerAnalysis("/society/new?type=SA")
      : triggerAnalysis("/society/new?type=SRL");
  };

  if (isAnalyzing) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="relative flex justify-center">
            <Loader2 size={80} className="text-emerald-600 animate-spin" />
            <BrainCircuit size={40} className="absolute top-5 text-emerald-500/70" />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-800 font-heading">
              Cerebro Legal SABIA
            </h2>
            <div className="flex items-center justify-center gap-3 text-emerald-600 font-medium">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" />
              {analysisMessages[analysisStep]}
            </div>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-500 ease-out"
              style={{
                width: `${((analysisStep + 1) / analysisMessages.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
        {/* Volver al Inicio */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors mb-6"
        >
          <Home size={16} />
          Volver al Inicio
        </Link>

        {/* Paso 1: Alcance */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <HelpCircle />
              </div>
              <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">
                Paso 1 de 3
              </span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 font-heading leading-tight">
              Cual es el alcance geografico de su negocio?
            </h2>
            <div className="grid gap-4">
              <button
                onClick={() => handleStep1("intl")}
                className="p-6 text-left border-2 border-slate-100 hover:border-emerald-400 rounded-2xl transition-all group hover:bg-emerald-50"
              >
                <div className="font-bold text-lg text-slate-800 group-hover:text-emerald-600">
                  Inversion Internacional / Offshore
                </div>
                <div className="text-slate-500">
                  Uso de la estructura para activos o servicios fuera de Panama.
                </div>
              </button>
              <button
                onClick={() => handleStep1("local")}
                className="p-6 text-left border-2 border-slate-100 hover:border-emerald-400 rounded-2xl transition-all group hover:bg-emerald-50"
              >
                <div className="font-bold text-lg text-slate-800 group-hover:text-emerald-600">
                  Operacion Local en Panama
                </div>
                <div className="text-slate-500">
                  Negocios con presencia fisica o ventas dentro del territorio
                  nacional.
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Startup */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <FileCheck />
              </div>
              <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">
                Paso 2 de 3
              </span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 font-heading leading-tight">
              Su proyecto califica como emprendimiento o innovacion?
            </h2>
            <p className="text-slate-500">
              Clave para aplicar a beneficios de la Ley 186 (exoneraciones
              fiscales por 2 anos).
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleStep2(true)}
                className="p-8 border-2 border-slate-100 hover:border-blue-400 rounded-2xl font-bold text-slate-800 hover:bg-blue-50 text-center"
              >
                Si, es una Startup
              </button>
              <button
                onClick={() => handleStep2(false)}
                className="p-8 border-2 border-slate-100 hover:border-slate-300 rounded-2xl font-bold text-slate-800 hover:bg-slate-50 text-center"
              >
                No, negocio tradicional
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Flexibilidad Societaria */}
        {step === 3 && (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
                <Gavel />
              </div>
              <span className="text-sm font-bold text-violet-600 uppercase tracking-wider">
                Paso 3 de 3
              </span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 font-heading leading-tight">
              Como desea manejar la entrada de nuevos socios?
            </h2>
            <div className="grid gap-4">
              <button
                onClick={() => handleStep3(true)}
                className="p-6 text-left border-2 border-slate-100 hover:border-violet-400 rounded-2xl transition-all group hover:bg-violet-50"
              >
                <div className="font-bold text-lg text-slate-800">
                  Libre entrada (Sociedad Anonima)
                </div>
                <div className="text-slate-500 italic">
                  Ideal para levantar capital y vender acciones facilmente.
                </div>
              </button>
              <button
                onClick={() => handleStep3(false)}
                className="p-6 text-left border-2 border-slate-100 hover:border-violet-400 rounded-2xl transition-all group hover:bg-violet-50"
              >
                <div className="font-bold text-lg text-slate-800">
                  Restringida (Sociedad de R.L.)
                </div>
                <div className="text-slate-500 italic">
                  Mayor control sobre quien entra; requiere aprobacion de
                  socios.
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
