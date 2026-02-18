"use client";
import React from "react";

interface DiagnosticCardProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  description: string;
  status: "ok" | "warning" | "danger" | "critical";
}

const STATUS_STYLES: Record<string, string> = {
  ok: "bg-emerald-50 border-emerald-500 text-emerald-800",
  warning: "bg-amber-50 border-amber-500 text-amber-800",
  danger: "bg-red-50 border-red-500 text-red-800",
  critical: "bg-red-50 border-red-600 text-red-900 animate-pulse",
};

const VALUE_COLORS: Record<string, string> = {
  ok: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
  critical: "text-red-800",
};

export default function DiagnosticCard({
  title,
  icon,
  value,
  description,
  status,
}: DiagnosticCardProps) {
  return (
    <div
      className={`p-5 rounded-xl border-l-4 ${STATUS_STYLES[status]} transition-all`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="opacity-70">{icon}</div>
        <h4 className="font-bold text-sm uppercase tracking-wide">{title}</h4>
      </div>
      <p className={`text-2xl font-extrabold mb-1 ${VALUE_COLORS[status]}`}>
        {value}
      </p>
      <p className="text-sm opacity-80">{description}</p>
    </div>
  );
}
