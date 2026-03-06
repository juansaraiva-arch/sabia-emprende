"use client";
/**
 * AnalyticsProvider — Inicializa PostHog + Delighted NPS.
 * Se monta una sola vez en el layout raiz.
 * Solo se activa si las env vars estan configuradas.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics, initDelighted, trackPageView } from "@/lib/analytics";

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Inicializar PostHog y Delighted una sola vez
  useEffect(() => {
    initAnalytics();
    initDelighted();
  }, []);

  // Track page views en cada cambio de ruta
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return <>{children}</>;
}
