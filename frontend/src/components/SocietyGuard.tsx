"use client";
/**
 * SocietyGuard — Redirige a /onboarding si el usuario no tiene sociedad.
 * Envuelve paginas protegidas (dashboard, etc.) para forzar onboarding.
 */
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSociety } from "./SocietyProvider";
import { useAuth } from "./AuthProvider";

const GUARD_EXEMPT_ROUTES = ["/onboarding", "/auth/login", "/auth/callback", "/auth/confirm", "/", "/dashboard"];

export function SocietyGuard({ children }: { children: React.ReactNode }) {
  const { society, loading: societyLoading } = useSociety();
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Esperar a que ambos contextos carguen
    if (authLoading || societyLoading) return;

    // No aplicar guard en modo demo
    if (isDemoMode) return;

    // No aplicar guard en rutas exentas
    if (GUARD_EXEMPT_ROUTES.some((route) => pathname === route)) return;

    // Si hay usuario autenticado pero sin sociedad, redirigir a dashboard (SetupWizard se muestra ahi)
    if (user && !society) {
      router.replace("/dashboard");
    }
  }, [authLoading, societyLoading, user, society, isDemoMode, pathname, router]);

  // Mientras carga, mostrar spinner
  if (authLoading || societyLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // En modo demo o si ya tiene sociedad, mostrar contenido
  if (isDemoMode || society || GUARD_EXEMPT_ROUTES.some((r) => pathname === r)) {
    return <>{children}</>;
  }

  // Si no tiene sociedad y no es ruta exenta, mostrar spinner mientras redirige
  if (user && !society) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Preparando tu cuenta...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
