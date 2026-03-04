"use client";
import React from "react";

// ============================================
// TIPOS
// ============================================

export interface ModuleCard {
  key: string;
  label: string;
  icon: React.ReactNode;
  tooltip?: string;
  color: string; // Tailwind bg class: "bg-blue-600", "bg-red-600", etc.
}

export interface CardGridSection {
  title: string;
  cards: ModuleCard[];
}

interface ModuleCardGridProps {
  sections: CardGridSection[];
  onSelect: (key: string) => void;
}

// ============================================
// COMPONENTE
// ============================================

export default function ModuleCardGrid({ sections, onSelect }: ModuleCardGridProps) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          {/* Section title */}
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
            {section.title}
          </h3>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {section.cards.map((card) => (
              <button
                key={card.key}
                onClick={() => onSelect(card.key)}
                className={`group relative p-5 rounded-2xl text-white transition-all
                  hover:scale-[1.03] hover:shadow-xl cursor-pointer text-left
                  active:scale-[0.98] ${card.color}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-xl flex-shrink-0">
                    {card.icon}
                  </div>
                  <h4 className="text-sm font-bold leading-tight">{card.label}</h4>
                </div>
                {card.tooltip && (
                  <p className="text-xs text-white/70 leading-relaxed">{card.tooltip}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
