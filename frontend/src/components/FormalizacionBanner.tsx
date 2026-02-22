"use client";
import React from "react";
import Link from "next/link";
import { Rocket, ArrowRight } from "lucide-react";
import { hasRuc } from "@/lib/formalizacion";

const GOLD = "#C5A059";

export default function FormalizacionBanner() {
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    setShowBanner(!hasRuc());
  }, []);

  if (!showBanner) return null;

  return (
    <Link
      href="/formalizacion"
      className="block w-full max-w-md mx-auto rounded-2xl border-2 p-4 lg:p-5 transition-all hover:scale-[1.02] hover:border-opacity-60"
      style={{
        backgroundColor: "rgba(197, 160, 89, 0.1)",
        borderColor: "rgba(197, 160, 89, 0.35)",
      }}
    >
      <div className="flex items-center gap-3 lg:gap-4">
        <div
          className="p-2.5 lg:p-3 rounded-xl shrink-0"
          style={{ backgroundColor: "rgba(197, 160, 89, 0.2)" }}
        >
          <Rocket size={22} style={{ color: GOLD }} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs lg:text-sm font-bold leading-tight"
            style={{ color: GOLD }}
          >
            Convierte tu idea en una Sociedad de Emprendimiento hoy!
          </p>
          <p
            className="text-[10px] lg:text-xs mt-0.5"
            style={{ color: "rgba(197, 160, 89, 0.55)" }}
          >
            Inicia aqui tu ruta legal paso a paso
          </p>
        </div>
        <ArrowRight size={18} className="shrink-0" style={{ color: GOLD, opacity: 0.6 }} />
      </div>
    </Link>
  );
}
