"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import type { TooltipConfig } from "@/lib/onboarding-guide";

const GOLD = "#C5A059";
const NAVY = "#1A242F";

// Offset del tooltip respecto al elemento target (px)
const OFFSET = 12;

interface OnboardingTooltipProps {
  config: TooltipConfig;
  onDismiss: (id: string) => void;
}

interface Position {
  top: number;
  left: number;
  arrowStyle: React.CSSProperties;
}

function calcPosition(
  rect: DOMRect,
  posicion: TooltipConfig["posicion"],
  tooltipEl: HTMLDivElement | null
): Position {
  const tw = tooltipEl?.offsetWidth ?? 280;
  const th = tooltipEl?.offsetHeight ?? 100;
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  let top = 0;
  let left = 0;
  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    width: 12,
    height: 12,
    backgroundColor: "white",
    transform: "rotate(45deg)",
    borderColor: "rgba(197, 160, 89, 0.3)",
  };

  switch (posicion) {
    case "bottom":
      top = rect.bottom + scrollY + OFFSET;
      left = rect.left + scrollX + rect.width / 2 - tw / 2;
      arrowStyle.top = -6;
      arrowStyle.left = tw / 2 - 6;
      arrowStyle.borderTop = "1px solid";
      arrowStyle.borderLeft = "1px solid";
      break;
    case "top":
      top = rect.top + scrollY - th - OFFSET;
      left = rect.left + scrollX + rect.width / 2 - tw / 2;
      arrowStyle.bottom = -6;
      arrowStyle.left = tw / 2 - 6;
      arrowStyle.borderBottom = "1px solid";
      arrowStyle.borderRight = "1px solid";
      break;
    case "left":
      top = rect.top + scrollY + rect.height / 2 - th / 2;
      left = rect.left + scrollX - tw - OFFSET;
      arrowStyle.right = -6;
      arrowStyle.top = th / 2 - 6;
      arrowStyle.borderTop = "1px solid";
      arrowStyle.borderRight = "1px solid";
      break;
    case "right":
      top = rect.top + scrollY + rect.height / 2 - th / 2;
      left = rect.right + scrollX + OFFSET;
      arrowStyle.left = -6;
      arrowStyle.top = th / 2 - 6;
      arrowStyle.borderBottom = "1px solid";
      arrowStyle.borderLeft = "1px solid";
      break;
  }

  // Prevenir que se salga de la pantalla
  const vw = window.innerWidth;
  if (left < 8) left = 8;
  if (left + tw > vw - 8) left = vw - tw - 8;
  if (top < 8) top = 8;

  return { top, left, arrowStyle };
}

export default function OnboardingTooltip({ config, onDismiss }: OnboardingTooltipProps) {
  const [position, setPosition] = useState<Position | null>(null);
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Montar portal container
  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  // Calcular posicion basado en el elemento target
  const recalculate = useCallback(() => {
    const el = document.querySelector(config.elementSelector);
    if (!el) {
      setVisible(false);
      return;
    }
    const rect = el.getBoundingClientRect();
    const pos = calcPosition(rect, config.posicion, tooltipRef.current);
    setPosition(pos);
    setVisible(true);
  }, [config.elementSelector, config.posicion]);

  useEffect(() => {
    // Delay inicial para que el DOM se estabilice
    const timer = setTimeout(() => {
      recalculate();
    }, 300);

    // Recalcular en scroll y resize
    window.addEventListener("scroll", recalculate, true);
    window.addEventListener("resize", recalculate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", recalculate, true);
      window.removeEventListener("resize", recalculate);
    };
  }, [recalculate]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    // Delay para animacion de salida
    setTimeout(() => {
      onDismiss(config.id);
    }, 150);
  }, [onDismiss, config.id]);

  if (!portalContainer || !position || !visible) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[9990] transition-all duration-300"
      style={{
        top: position.top,
        left: position.left,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.95)",
        position: "absolute",
      }}
    >
      <div
        className="relative bg-white rounded-xl border shadow-lg p-4 max-w-[280px]"
        style={{ borderColor: "rgba(197, 160, 89, 0.3)" }}
      >
        {/* Flecha */}
        <div style={position.arrowStyle} />

        {/* Linea gold superior */}
        <div
          className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
          style={{ backgroundColor: GOLD }}
        />

        {/* Texto — grande para Silver Economy */}
        <p
          className="text-base leading-relaxed mt-1 mb-3"
          style={{ color: NAVY }}
        >
          {config.texto}
        </p>

        {/* Boton Entendi */}
        <button
          onClick={handleDismiss}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: "rgba(197, 160, 89, 0.15)", color: GOLD }}
        >
          <Check size={14} />
          Entendi
        </button>
      </div>
    </div>,
    portalContainer
  );
}
