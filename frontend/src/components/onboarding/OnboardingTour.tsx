"use client";

import React, { useState, useCallback } from "react";
import { ArrowRight, X } from "lucide-react";
import { TOUR_PASOS, markTourCompleted, markPasoCompletado } from "@/lib/onboarding-guide";

const GOLD = "#C5A059";
const NAVY = "#1A242F";

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [pasoActual, setPasoActual] = useState(0);
  const [fadeClass, setFadeClass] = useState("animate-fadeIn");

  const paso = TOUR_PASOS[pasoActual];
  const esUltimo = pasoActual === TOUR_PASOS.length - 1;

  const transicionar = useCallback((siguiente: number) => {
    setFadeClass("animate-fadeOut");
    setTimeout(() => {
      markPasoCompletado(TOUR_PASOS[pasoActual].id);
      setPasoActual(siguiente);
      setFadeClass("animate-fadeIn");
    }, 200);
  }, [pasoActual]);

  const handleSiguiente = useCallback(() => {
    if (esUltimo) {
      markPasoCompletado(paso.id);
      markTourCompleted();
      onComplete();
    } else {
      transicionar(pasoActual + 1);
    }
  }, [esUltimo, paso.id, pasoActual, transicionar, onComplete]);

  const handleOmitir = useCallback(() => {
    markTourCompleted();
    onSkip();
  }, [onSkip]);

  return (
    <>
      {/* CSS animations inline */}
      <style jsx global>{`
        @keyframes onb-fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes onb-fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-12px); }
        }
        .animate-fadeIn  { animation: onb-fadeIn 0.3s ease-out forwards; }
        .animate-fadeOut { animation: onb-fadeOut 0.2s ease-in forwards; }
      `}</style>

      {/* Overlay */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Fondo semi-transparente */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(26, 36, 47, 0.75)" }}
        />

        {/* Card central */}
        <div
          className={`relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden ${fadeClass}`}
        >
          {/* Barra superior gold */}
          <div className="h-1.5 w-full" style={{ backgroundColor: GOLD }} />

          {/* Boton Omitir (esquina superior derecha) */}
          {!esUltimo && (
            <button
              onClick={handleOmitir}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Omitir tour"
            >
              <X size={18} />
            </button>
          )}

          {/* Contenido del paso */}
          <div className="px-8 pt-10 pb-6 text-center">
            {/* Emoji grande */}
            <div className="text-5xl mb-5">{paso.emoji}</div>

            {/* Titulo */}
            <h2
              className="text-xl font-bold font-heading mb-3"
              style={{ color: NAVY }}
            >
              {paso.titulo}
            </h2>

            {/* Descripcion — texto grande para Silver Economy */}
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              {paso.descripcion}
            </p>

            {/* Boton principal */}
            <button
              onClick={handleSiguiente}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-base font-bold transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: esUltimo ? "#059669" : GOLD,
                color: esUltimo ? "white" : NAVY,
              }}
            >
              {esUltimo ? "Ir a mi Dashboard" : "Siguiente"}
              <ArrowRight size={18} />
            </button>

            {/* Boton Omitir (texto debajo) */}
            {!esUltimo && (
              <button
                onClick={handleOmitir}
                className="block mx-auto mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Omitir tour
              </button>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 pb-6">
            {TOUR_PASOS.map((_, idx) => (
              <div
                key={idx}
                className="rounded-full transition-all duration-300"
                style={{
                  width: idx === pasoActual ? 24 : 8,
                  height: 8,
                  backgroundColor:
                    idx === pasoActual
                      ? GOLD
                      : idx < pasoActual
                      ? "rgba(197, 160, 89, 0.5)"
                      : "rgba(148, 163, 184, 0.3)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
