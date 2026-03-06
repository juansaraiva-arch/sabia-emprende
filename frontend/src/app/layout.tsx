import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AccessGate } from "@/components/AccessGate";
import AnalyticsProvider from "@/components/AnalyticsProvider";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mi Director Financiero PTY | Tu Aliado Estratégico",
  description:
    "Plataforma de Alta Dirección financiera y legal para emprendedores panameños. Tu Aliado Estratégico.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} ${playfair.variable} font-sans`}
        suppressHydrationWarning
      >
        <AccessGate>
          <AnalyticsProvider>
            <AuthProvider>{children}</AuthProvider>
          </AnalyticsProvider>
        </AccessGate>
      </body>
    </html>
  );
}
