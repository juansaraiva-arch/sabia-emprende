/**
 * Next.js Edge Middleware — proteccion de rutas autenticadas.
 * Refresca sesiones de Supabase y redirige a login si no autenticado.
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match todas las rutas excepto:
     * - _next/static (archivos estaticos)
     * - _next/image (optimizacion de imagenes)
     * - favicon.ico, sitemap.xml, robots.txt
     * - /api/* (manejado por auth del backend)
     * - Archivos publicos (imagenes, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|api/).*)",
  ],
};
