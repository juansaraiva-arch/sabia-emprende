import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Evaluación Beta — Mi Director Financiero PTY",
  description:
    "Ayúdanos a mejorar la app evaluando tu experiencia como usuario beta.",
};

/**
 * Layout especial para /beta-evaluacion — NO incluye AccessGate ni AuthProvider.
 * Es una pagina publica para que cualquier beta tester pueda acceder sin clave.
 */
export default function BetaEvaluacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
