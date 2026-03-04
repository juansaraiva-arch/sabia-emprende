# Mi Director Financiero PTY

Plataforma de Alta Direccion financiera y legal para emprendedores panamenos.

## Protocolo de inicio de sesion

**ANTES de comenzar cualquier trabajo, ejecutar estos pasos:**

```bash
# 1. Verificar que estamos en el repositorio correcto
cd C:\Users\FranciscoSaraiva\sabia-emprende

# 2. Sincronizar con el remoto
git fetch origin
git status

# 3. Si hay cambios remotos, actualizar
git pull origin main

# 4. Verificar que el ultimo commit local coincide con origin/main
git log --oneline -1
git log --oneline origin/main -1

# 5. Si difieren, resolver antes de trabajar
```

> **REGLA:** No hacer cambios hasta confirmar que local y origin/main estan sincronizados.

## Protocolo de deploy

```bash
# 1. Commit y push a origin/main
git add <archivos> && git commit -m "mensaje" && git push origin main

# 2. Deploy manual (auto-deploy NO esta activo)
cd frontend && npx vercel --prod

# 3. Verificar build exitoso en la salida del CLI
# 4. Verificar en https://midirectorfinancieropty.vercel.app
```

> **IMPORTANTE:** Vercel NO tiene auto-deploy conectado al GitHub. Siempre usar `npx vercel --prod` desde `frontend/` para desplegar.

## Repositorio canonico

**Carpeta activa:** `C:\Users\FranciscoSaraiva\sabia-emprende`
**GitHub:** `https://github.com/juansaraiva-arch/sabia-emprende.git`
**Produccion:** `https://midirectorfinancieropty.vercel.app`

> La carpeta en OneDrive (`...\Apps\savia-emprende`) es una version demo antigua. NO trabajar ahi.

## Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend:** FastAPI (Python) + Supabase (PostgreSQL + Auth)
- **Deploy:** Vercel (frontend, deploy manual) + Railway (backend)
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
- Tema visual: Hub light palette (slate-50/white) + Gold (#C5A059) + Navy (#1A242F) para textos
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
6. **Nomina** — Payroll engine con ley laboral Panama (CSS 12.25%, RP 1.50%, SE 1.50%, Factor ~1.36x)

---

## Registro de Modificaciones

### 2026-03-04 — Auditoria critica + UI dashboard

**Commits:** `5388748`, `1cd6cda`, `5791e68`

#### Bug #1: CSS Patronal doble conteo (Ley 462 de 2025)
- **Problema:** Se usaba 13.25% como CSS Patronal base, sumando RP 1.50% + SE 1.50% = 16.25% total (1% de mas)
- **Correccion:** CSS Patronal = 12.25% + RP 1.50% + SE 1.50% = 15.25% total
- **Archivos:** `panama_payroll.py`, `PayrollEngine.tsx`, `SmartTooltip.tsx`, `TaxReferenceTable.tsx`, `NaturalLanguageInput.tsx`, `mockData.ts`, `demo/app.py`, tests

#### Bug #2: ISR retencion mensual incorrecta
- **Problema:** Se aplicaban tramos mensuales sobre salario bruto
- **Correccion:** Deducir 11% (CSS 9.75% + SE 1.25%), anualizar x12, tabla anual DGI (0-11K→0%, 11K-50K→15%, >50K→25%), dividir /12
- **Verificacion:** B/.1,500 salario → B/.62.75/mes retencion
- **Archivos:** `panama_payroll.py` (`calcular_isr_mensual()`), `PayrollEngine.tsx` (`calcularISR()`), tests

#### Bug #3: Codigos DGI Form 430/03 rotos
- **Problema:** Codigos nivel-2 (4.1, 5.1.01) usados como cuentas contables, deben ser nivel-3
- **Correccion:** 4.1→4.1.1, 4.2→4.2.1, 4.3→4.3.1, 4.4→4.4.1, 4.5→4.5.1, 5.1.01→5.1.1, 5.1.02→5.1.2
- **Archivos:** `dgi-mappings.ts`, `ChartOfAccounts.tsx`

#### UI: Card NIVEL 0 del organigrama
- **Cambio:** Logo maximizado (w-2/3 aspect-square), company name agrandado (text-lg/text-xl), badge rubro y "Toca para editar" en texto mas pequeno (text-[9px])
- **Archivos:** `dashboard/page.tsx`

#### Fix: Build de Vercel roto
- **Problema:** Merge conflict resuelto con `--ours` elimino `financialRecordToBalances` de `dgi-mappings.ts`, rompiendo el build de Vercel por 3 dias
- **Correccion:** Restaurada la funcion con codigos nivel-3 corregidos
- **Archivos:** `dgi-mappings.ts`

#### Lecciones aprendidas
- **NUNCA** usar `git checkout --ours` en merge conflicts sin revisar que se pierde
- **SIEMPRE** verificar build de Vercel despues de push (`npx vercel --prod`)
- Vercel NO tiene auto-deploy — requiere deploy manual via CLI
