"use client";
/**
 * Pagina de Login — Magic Link via Supabase Auth.
 * El usuario ingresa su email y recibe un enlace magico.
 */
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MidfLogo from "@/components/MidfLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Ingresa tu correo electronico.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <MidfLogo size={64} />
          </div>
          <h1 className="font-heading text-3xl font-bold text-emerald-900">
            Mi Director Financiero PTY
          </h1>
          <p className="text-emerald-600 mt-1">Tu Aliado Estratégico</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-8">
          {sent ? (
            /* Mensaje de enlace enviado */
            <div className="text-center">
              <div className="text-5xl mb-4">&#9993;</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Revisa tu correo
              </h2>
              <p className="text-gray-600 mb-6">
                Enviamos un enlace magico a{" "}
                <span className="font-medium text-emerald-700">{email}</span>.
                <br />
                Haz clic en el enlace para iniciar sesion.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                Usar otro correo
              </button>
            </div>
          ) : (
            /* Formulario de login */
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1 text-center">
                Iniciar sesion
              </h2>
              <p className="text-gray-500 text-sm mb-6 text-center">
                Te enviaremos un enlace magico a tu correo
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Correo electronico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@empresa.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl
                             focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                             transition-colors text-gray-900 placeholder-gray-400"
                    autoFocus
                    disabled={loading}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white
                           font-medium py-3 px-4 rounded-xl transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Enviando..." : "Enviar enlace magico"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Plataforma de Alta Direccion financiera para emprendedores panamenos
        </p>
      </div>
    </div>
  );
}
