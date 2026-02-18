"use client";
import React from "react";
import { PenLine, BarChart3, Scale } from "lucide-react";

type Section = "datos" | "negocio" | "legal";

interface BottomNavBarProps {
  active: Section;
  onNavigate: (section: Section) => void;
}

const NAV_ITEMS: { key: Section; label: string; icon: React.ReactNode; color: string; activeBg: string; activeText: string }[] = [
  {
    key: "datos",
    label: "Mi Contabilidad",
    icon: <PenLine size={24} />,
    color: "text-slate-400",
    activeBg: "bg-emerald-100",
    activeText: "text-emerald-700",
  },
  {
    key: "negocio",
    label: "Mi Director Financiero PTY",
    icon: <BarChart3 size={24} />,
    color: "text-slate-400",
    activeBg: "bg-blue-100",
    activeText: "text-blue-700",
  },
  {
    key: "legal",
    label: "Mi Empresa - Doc Legales",
    icon: <Scale size={24} />,
    color: "text-slate-400",
    activeBg: "bg-violet-100",
    activeText: "text-violet-700",
  },
];

export default function BottomNavBar({ active, onNavigate }: BottomNavBarProps) {
  return (
    <>
      {/* Spacer para que el contenido no quede oculto debajo */}
      <div className="h-20 lg:hidden" />

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
                <span className={`text-[10px] font-bold leading-tight text-center ${isActive ? "" : "font-medium"}`}>
                  {item.label}
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
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-bold transition-all ${
                isActive
                  ? `${item.activeBg} ${item.activeText} shadow-sm`
                  : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
