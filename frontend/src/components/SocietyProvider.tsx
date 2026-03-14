"use client";
/**
 * SocietyProvider — Contexto React para la sociedad activa del usuario.
 * Carga las sociedades del usuario desde la API y expone la sociedad activa.
 * Si no hay sociedades, society = null (indica que necesita onboarding).
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import { societiesApi } from "@/lib/api";

export type Society = {
  id: string;
  user_id: string;
  entity_type: string;
  legal_name: string;
  trade_name?: string;
  tax_id?: string;
  industry?: string;
  fiscal_regime?: string;
  status: string;
  [key: string]: any;
};

type SocietyContextType = {
  society: Society | null;
  societies: Society[];
  loading: boolean;
  setSociety: (s: Society) => void;
  refreshSocieties: () => Promise<void>;
};

const SocietyContext = createContext<SocietyContextType>({
  society: null,
  societies: [],
  loading: true,
  setSociety: () => {},
  refreshSocieties: async () => {},
});

export function SocietyProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const [society, setSocietyState] = useState<Society | null>(null);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSocieties = useCallback(async () => {
    try {
      const res = await societiesApi.list();
      const list: Society[] = res?.data || [];
      setSocieties(list);

      if (list.length > 0) {
        // Si ya tenemos una sociedad seleccionada, mantenerla si sigue en la lista
        setSocietyState((prev) => {
          if (prev && list.some((s) => s.id === prev.id)) return prev;
          return list[0];
        });
      } else {
        setSocietyState(null);
      }
    } catch {
      // En modo demo o sin backend, mantener null
      setSocieties([]);
      setSocietyState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // No cargar hasta que auth termine
    if (authLoading) return;

    // Si no hay usuario y no es demo mode, no cargar
    if (!user && !isDemoMode) {
      setLoading(false);
      return;
    }

    fetchSocieties();
  }, [user, authLoading, isDemoMode, fetchSocieties]);

  const setSociety = (s: Society) => {
    setSocietyState(s);
  };

  return (
    <SocietyContext.Provider
      value={{
        society,
        societies,
        loading,
        setSociety,
        refreshSocieties: fetchSocieties,
      }}
    >
      {children}
    </SocietyContext.Provider>
  );
}

export const useSociety = () => useContext(SocietyContext);
