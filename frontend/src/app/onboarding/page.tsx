"use client";
/**
 * Onboarding page — DEPRECATED.
 * Redirige al dashboard donde SetupWizard maneja todo el onboarding.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500 text-sm">Redirigiendo...</p>
    </div>
  );
}
