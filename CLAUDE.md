# Mi Director Financiero PTY

Plataforma de Alta Direccion financiera y legal para emprendedores panamenos.

## Repositorio canonico

**Carpeta activa:** `C:\Users\FranciscoSaraiva\sabia-emprende`

> La carpeta en OneDrive (`...\Apps\savia-emprende`) es una version demo antigua. NO trabajar ahi.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** FastAPI (Python) + Supabase (PostgreSQL + Auth)
- **Deploy:** Vercel (frontend) + Railway (backend)
- **AI:** GPT-4o via OpenAI API (Mi Asistente, NLP, Traductor Legal)

## Estructura

```
frontend/
  src/
    app/           → Pages (dashboard, auth, wizard, formalizacion)
    components/    → UI components (60+ archivos)
    lib/           → Utilities, API client, calculations, Supabase clients

backend/
  app/
    engines/       → Business logic (financial, payroll, NLP, PDF, etc.)
    routers/       → API endpoints (financial, nlp, ai_agents, payroll, etc.)
    auth.py        → JWT auth via Supabase GoTrue
    database.py    → Supabase client
  main.py          → FastAPI app entry point

supabase/
  schema.sql       → Database schema with RLS

demo/
  app.py           → Streamlit demo (standalone)
```

## Convenciones

- Idioma de UI y comentarios: Espanol (sin tildes en codigo)
- Tema visual: Navy (#1A242F) + Gold (#C5A059)
- Fuentes: Montserrat (body) + Playfair Display (headings)
- Logo component: `MidfLogo.tsx`
- localStorage keys usan prefijo `midf_`
- Backend en modo demo: `DEMO_MODE=true` retorna datos mock
- Moneda: Balboa (B/.) — `formatBalboas()` en `lib/currency.ts`

## Modulos principales

1. **Mi Contabilidad** — Cascada P&L, Semaforo, Breakeven, Balance General
2. **Mi Director Financiero** — Oxigeno (CCC), Nomina Panama, Valoracion
3. **Mi Empresa** — Legal vault, Formalizacion tracker, MUPA, Checklist DGI
4. **Contabilidad Formal** — Plan de Cuentas, Libro Diario/Mayor, Balance Comprobacion, Espejo DGI
5. **Mi Asistente** — Chat AI con GPT-4o como CFO virtual
6. **Nomina** — Payroll engine con ley laboral Panama (CSS 13.25%, Factor 1.36x)
