"use client";
import React from "react";
import { PenLine, BarChart3, Scale, Phone } from "lucide-react";

type Section = "datos" | "negocio" | "legal";

interface BottomNavBarProps {
  active: Section;
  onNavigate: (section: Section) => void;
  silverMode?: boolean;
}

const NAV_ITEMS: { key: Section; label: string; silverLabel: string; icon: React.ReactNode; color: string; activeBg: string; activeText: string }[] = [
  {
    key: "datos",
    label: "Mi Contabilidad",
    silverLabel: "Registrar",
    icon: <PenLine size={24} />,
    color: "text-slate-400",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  {
    key: "negocio",
    label: "Mi Director Financiero PTY",
    silverLabel: "Ver resumen",
    icon: <BarChart3 size={24} />,
    color: "text-slate-400",
    activeBg: "bg-[#1A242F]",
    activeText: "text-[#C5A059]",
  },
  {
    key: "legal",
    label: "Mi Empresa - Doc Legales",
    silverLabel: "Que debo pagar",
    icon: <Scale size={24} />,
    color: "text-slate-400",
    activeBg: "bg-violet-600",
    activeText: "text-white",
  },
];

export default function BottomNavBar({ active, onNavigate, silverMode }: BottomNavBarProps) {
  return (
    <>
      {/* Spacer para que el contenido no quede oculto debajo */}
      <div className={`${silverMode ? "h-24" : "h-20"} lg:hidden`} />

      {/* Barra fija en la parte inferior (solo mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg lg:hidden">
        <div className="flex items-center justify-around py-2 px-4">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[80px] ${
                  isActive
                    ? `${item.activeBg} ${item.activeText} scale-105`
                    : `${item.color} hover:bg-slate-50`
                }`}
              >
                {item.icon}
                <span className={`${silverMode ? "text-xs" : "text-[10px]"} font-bold leading-tight text-center ${isActive ? "" : "font-medium"}`}>
                  {silverMode ? item.silverLabel : item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Version desktop: Tabs horizontales grandes en la parte superior */}
      <div className="hidden lg:flex gap-2 bg-white rounded-2xl p-2 border border-slate-200 shadow-sm">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl ${silverMode ? "text-lg" : "text-base"} font-bold transition-all ${
                isActive
                  ? `${item.activeBg} ${item.activeText} shadow-sm`
                  : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              {item.icon}
              {silverMode ? item.silverLabel : item.label}
            </button>
          );
        })}
      </div>

      {/* WhatsApp floating button — solo Silver Economy */}
      {silverMode && (
        <a
          href="https://wa.me/50760000000"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
          style={{ backgroundColor: "#25D366", color: "white" }}
        >
          <Phone size={20} />
          <span className="text-sm font-bold">Ayuda</span>
        </a>
      )}
    </>
  );
}
