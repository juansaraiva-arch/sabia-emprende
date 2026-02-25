/**
 * Supabase Server Client — para Server Components, Route Handlers, Server Actions.
 * Usa @supabase/ssr con cookies de next/headers.
 * Si las credenciales no están configuradas, retorna un mock seguro.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function isConfigured(): boolean {
  return !!(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("tu-proyecto") &&
    !supabaseKey.startsWith("eyJ...")
  );
}

export async function createClient() {
  if (!isConfigured()) {
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
      },
    } as any;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll llamado desde Server Component — ignorar.
          // El middleware se encarga de refrescar la sesion.
        }
      },
    },
  });
}
