/**
 * Supabase Middleware Client — para Next.js Edge Middleware.
 * Refresca sesiones expiradas y protege rutas autenticadas.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rutas que no requieren autenticacion */
const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/callback", "/auth/confirm"];

export async function updateSession(request: NextRequest) {
  // Demo mode bypass — skip auth entirely
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (isDemoMode) {
    return NextResponse.next({ request });
  }

  // If Supabase env vars are missing or placeholder, skip auth (allow all)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes("tu-proyecto") ||
    supabaseKey.startsWith("eyJ...")
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // IMPORTANTE: No poner codigo entre createServerClient y getUser().
    // getUser() refresca sesiones expiradas automaticamente.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) => request.nextUrl.pathname === route
    );

    if (!user && !isPublicRoute) {
      // Redirigir a login con returnTo
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  } catch {
    // If Supabase auth fails, allow request through (graceful degradation)
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}
