"use client";
/**
 * AccessGate — Pantalla de acceso con clave compartida.
 * Si ACCESS_PASSWORD no esta configurado, deja pasar sin pedir clave.
 * La clave se guarda en sessionStorage para no pedirla cada vez.
 */
import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

const ACCESS_PASSWORD = process.env.NEXT_PUBLIC_ACCESS_PASSWORD || "";
const STORAGE_KEY = "midf_access_granted";

export function AccessGate({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Si no hay password configurado, dejar pasar
    if (!ACCESS_PASSWORD) {
      setGranted(true);
      setChecking(false);
      return;
    }
    // Si ya se autenticó en esta sesión
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setGranted(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === ACCESS_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setGranted(true);
      setError("");
    } else {
      setError("Clave incorrecta. Intenta de nuevo.");
      setInput("");
    }
  };

  if (checking) return null;
  if (granted) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 mb-4">
            <Lock className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading">
            Mi Director Financiero PTY
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Acceso restringido — Ingresa la clave del equipo
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
        >
          <label
            htmlFor="access-password"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Clave de acceso
          </label>
          <div className="relative mb-4">
            <input
              id="access-password"
              type={showPassword ? "text" : "password"}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
              }}
              placeholder="Ingresa la clave..."
              autoFocus
              className="w-full px-4 py-3 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-3 flex items-center gap-1">
              <span>⚠</span> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!input.trim()}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold flex items-center justify-center gap-2 transition-all"
          >
            Entrar
            <ArrowRight size={16} />
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">
          &copy; {new Date().getFullYear()} Mi Director Financiero PTY — Plataforma de Alta
          Direcci&oacute;n
        </p>
      </div>
    </div>
  );
}
