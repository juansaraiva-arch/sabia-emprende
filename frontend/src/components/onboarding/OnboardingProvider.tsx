"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import OnboardingTour from "./OnboardingTour";
import OnboardingTooltip from "./OnboardingTooltip";
import {
  getOnboardingState,
  shouldShowTour,
  shouldShowTooltip,
  dismissTooltip as dismissTooltipStorage,
  markTourCompleted,
  TOOLTIPS_ONBOARDING,
  type OnboardingState,
  type TooltipConfig,
} from "@/lib/onboarding-guide";

// ─── Context ───

interface OnboardingContextValue {
  state: OnboardingState;
  dismissTooltip: (id: string) => void;
  tourActive: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  state: {
    tourCompletado: true,
    tooltipsDismissed: [],
    primerUso: new Date().toISOString(),
    pasosCompletados: [],
  },
  dismissTooltip: () => {},
  tourActive: false,
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

// ─── Provider ───

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export default function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [state, setState] = useState<OnboardingState>(() => getOnboardingState());
  const [tourActive, setTourActive] = useState(false);
  const [tourDone, setTourDone] = useState(false);
  const [activeTooltips, setActiveTooltips] = useState<TooltipConfig[]>([]);
  const [mounted, setMounted] = useState(false);

  // Verificar tour al montar
  useEffect(() => {
    setMounted(true);
    const show = shouldShowTour();
    setTourActive(show);
    if (!show) {
      setTourDone(true);
    }
  }, []);

  // Escanear tooltips visibles despues del tour
  useEffect(() => {
    if (!mounted || !tourDone) return;

    // Delay para permitir que el DOM renderice
    const timer = setTimeout(() => {
      const visibles = TOOLTIPS_ONBOARDING.filter((t) => shouldShowTooltip(t));
      // Mostrar maximo 1 tooltip a la vez para no abrumar al usuario
      setActiveTooltips(visibles.slice(0, 1));
    }, 800);

    return () => clearTimeout(timer);
  }, [mounted, tourDone, state.tooltipsDismissed]);

  // Re-escanear tooltips cuando cambia la navegacion (MutationObserver)
  useEffect(() => {
    if (!mounted || !tourDone) return;

    const observer = new MutationObserver(() => {
      const visibles = TOOLTIPS_ONBOARDING.filter((t) => shouldShowTooltip(t));
      setActiveTooltips(visibles.slice(0, 1));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-tooltip"],
    });

    return () => observer.disconnect();
  }, [mounted, tourDone, state.tooltipsDismissed]);

  const handleTourComplete = useCallback(() => {
    setTourActive(false);
    setTourDone(true);
    setState(getOnboardingState());
  }, []);

  const handleTourSkip = useCallback(() => {
    markTourCompleted();
    setTourActive(false);
    setTourDone(true);
    setState(getOnboardingState());
  }, []);

  const handleDismissTooltip = useCallback((id: string) => {
    dismissTooltipStorage(id);
    setState(getOnboardingState());
  }, []);

  const contextValue = useMemo<OnboardingContextValue>(
    () => ({
      state,
      dismissTooltip: handleDismissTooltip,
      tourActive,
    }),
    [state, handleDismissTooltip, tourActive]
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}

      {/* Tour modal — bloquea todo lo demas */}
      {tourActive && (
        <OnboardingTour
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
        />
      )}

      {/* Tooltips contextuales — despues del tour */}
      {!tourActive &&
        tourDone &&
        activeTooltips.map((tooltip) => (
          <OnboardingTooltip
            key={tooltip.id}
            config={tooltip}
            onDismiss={handleDismissTooltip}
          />
        ))}
    </OnboardingContext.Provider>
  );
}
