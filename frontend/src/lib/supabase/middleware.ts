/**
 * Supabase Middleware Client — para Next.js Edge Middleware.
 * Refresca sesiones expiradas y protege rutas autenticadas.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rutas que no requieren autenticacion */
const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/callback", "/auth/confirm"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: No poner codigo entre createServerClient y getUser().
  // getUser() refresca sesiones expiradas automaticamente.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => request.nextUrl.pathname === route
  );

  // Demo mode bypass
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  if (!user && !isPublicRoute && !isDemoMode) {
    // Redirigir a login con returnTo
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
