/**
 * Supabase Browser Client — para Client Components ("use client")
 * Usa @supabase/ssr para manejo correcto de cookies en Next.js 15.
 * Si las credenciales no están configuradas, crea un cliente con URL dummy
 * que no se conectará pero tampoco crasheará.
 */
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder";

/** Verifica si Supabase está realmente configurado (no placeholder) */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return !!(
    url &&
    key &&
    !url.includes("tu-proyecto") &&
    !url.includes("placeholder") &&
    !key.includes("placeholder")
  );
}

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
