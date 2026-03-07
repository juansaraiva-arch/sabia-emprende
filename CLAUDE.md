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
2. **Mi Director Financiero** — Oxigeno (CCC), Nomina Panama, Valoracion, Proyecciones Financieras
3. **Mi Empresa** — Legal vault, Formalizacion tracker, MUPA completo, Checklist DGI
4. **Contabilidad Formal** — Plan de Cuentas, Libro Diario/Mayor, Balance Comprobacion, Espejo DGI
5. **Mi Asistente** — Chat AI con GPT-4o como CFO virtual
6. **Nomina** — Payroll engine con ley laboral Panama (CSS 12.25%, RP 1.50%, SE 1.50%, Factor ~1.36x)
7. **Onboarding Diferenciado** — 4 perfiles (PYME, Emprendedor, Silver Economy, Migrante)
8. **Libro de Ventas** — 3 segmentos DGI (Res. 201-6299): manual, CSV DGI/SFEP, PAC Gosocket

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

### 2026-03-06 — GAP #1: Proyecciones Financieras

**Commit:** `6c710ea`

#### Simulador de Flujo de Caja a 90 dias
- Inputs: ingresos esperados (3 meses), gastos fijos, gastos variables (%), estacionalidad
- Output: curva ComposedChart con ingresos/gastos/saldo acumulado
- Semaforo liquidez: verde >20%, amarillo 10-20%, rojo <10%
- Alerta automatica: "Tu caja llega a cero en X dias"

#### Proyector de Escenarios (Optimista / Base / Pesimista)
- Variacion configurable via sliders (±5-50%)
- Recalcula: utilidad neta, punto equilibrio, meses runway, margen neto
- 3 cards comparativas + BarChart con 4 metricas

#### Proyeccion Fiscal Trimestral
- ITBMS 7% sobre ventas proyectadas
- ISR 25% PJ sobre utilidad gravable
- Alerta umbral B/.36,000 registro ITBMS
- Proximo vencimiento DGI trimestral

**Archivos creados:**
- `lib/proyecciones.ts` (~332 lineas) — logica pura de calculo
- `components/ProyeccionesFinancieras.tsx` (~530 lineas) — UI con 3 sub-tabs
**Archivos modificados:**
- `dashboard/page.tsx` — import, NegocioTab type, card grid, rendering
- `lib/alerts.ts` — fix: agregado "inventario" a AlertCategory
- `components/AlertsSidebar.tsx` — fix: cascading type errors

### 2026-03-06 — GAP #3: MUPA Completo

**Commit:** `bcae986`

#### Calculadora Impuesto Municipal Mensual
- 6 categorias actividad con tarifas diferenciadas (1% estandar, 0.75% manufactura, 1.5% financiero)
- Output: monto a pagar + fecha limite (ultimo dia mes siguiente)
- Persistencia localStorage (`midf_mupa_categoria_actividad`, `midf_mupa_impuesto_ingresos`)

#### Tracker DJ Anual Municipal
- Estados: pendiente → presentada → pagada (3-step tracker visual)
- Semaforo con alerta en enero si no marcada
- Multa $500.00 por incumplimiento
- Persistencia localStorage (`midf_mupa_dj_anual`)

#### Monitor de Rotulos y Avisos
- Formulario: descripcion, ancho, alto, fecha vencimiento
- Calculo: B/.5.00/m², minimo B/.20.00
- Semaforo individual: verde (vigente), amarillo (30 dias), rojo (vencido)
- CRUD completo + resumen global
- Persistencia localStorage (`midf_mupa_rotulos`)

**Archivos modificados:**
- `lib/mupaEngine.ts` — +250 lineas (types, funciones, persistencia)
- `components/MupaPanel.tsx` — reescrito 491→794 lineas (4 sub-tabs)

### 2026-03-06 — GAP #4: Onboarding Diferenciado por Perfil

**Commits:** `3f5266b`, `f0a1f03`

#### Pantalla seleccion de perfil (Step 0)
- 4 cards: PYME, Emprendedor, Silver Economy, Migrante
- Persistencia: `midf_user_profile` ("A" | "B" | "C" | "D")

#### Perfil A — Negocio activo (PYME / Solopreneur)
- 3 pasos: (1) identidad + tipo actividad + rubro, (2) empleados + factura >B/.36K, (3) resumen
- Alerta PAC si factura >B/.36K
- Keys: `midf_tipo_actividad`, `midf_tiene_empleados`, `midf_factura_pac`

#### Perfil B — Empezando / no formalizado
- 3 pasos: (1) tabla costos formalizacion (RUC, MICI, CSS, S.E., PAC), (2) nombre + ¿RUC?, (3) resumen
- Smart routing: sin RUC → redirige a Fabrica Empresa

#### Perfil C — Jubilado / pensionado (Silver Economy)
- 2 pasos: (1) nombre + rubro simplificado + logo, (2) resumen con "Vas a poder..."
- Fuentes grandes (text-lg / text-2xl), cero anglicismos
- BottomNavBar con silverMode: "Registrar / Ver resumen / Que debo pagar"
- Boton WhatsApp flotante siempre visible

#### Perfil D — Migrante / en regularizacion
- 3 pasos: (1) ¿Tienes RUC? + guia para extranjeros, (2) nombre + glosario basico, (3) resumen
- Glosario: DGI, RUC, ITBMS, Aviso de Operacion, CSS, PAC
- Smart routing: sin RUC → redirige a Fabrica Empresa

#### Fix: Input focus loss
- Sub-componentes inline (NameInput, LogoUpload, etc.) causaban remontaje en cada keystroke
- Solucion: cambiar de `<Component />` a `{Component()}` (llamada directa)

**Archivos modificados:**
- `components/SetupWizard.tsx` — reescrito 773→1090 lineas
- `components/BottomNavBar.tsx` — +silverMode prop, silverLabels, WhatsApp FAB
- `dashboard/page.tsx` — +userProfile state, isSilverMode, props BottomNavBar

### 2026-03-06 — GAP #6: Ruta S.E. Ampliada

**Commit:** `88df725`

#### Tabla comparativa SA vs SRL vs EIRL vs SEP
- 4 cards resumen con costo, tiempo y si requiere abogado
- Tabla HTML con 6 columnas: socios, capital, costo, tiempo, abogado, responsabilidad
- Ventajas/desventajas (3 principales) por cada forma juridica
- Seccion "¿Cual te conviene?" con casos de uso recomendados

#### Detalle por tipo (sub-tab)
- Selector de pills para cambiar entre SA/SRL/EIRL/SEP
- Header card con estadisticas rapidas (socios, tiempo, abogado, capital)
- Lista expandible de pasos con costo individual y enlace a entidad
- Resumen de costo total min-max y tiempo total
- Ventajas/desventajas completas

#### Datos de cada forma juridica
- **S.E.P.** (Ley 186 de 2020): B/.0–150, 2-5 socios, sin abogado, 2-4 semanas
- **S.A.** (Ley 32 de 1927): B/.500–1,500, 2+ socios ilimitado, con abogado, 3-6 semanas
- **S.R.L.** (Codigo Comercio): B/.400–1,200, 2-20 socios, con abogado, 3-5 semanas
- **E.I.R.L.** (Ley 24 de 1966): B/.400–1,000, 1 socio, con abogado, 3-5 semanas

**Archivos creados:**
- `lib/rutaSE.ts` (~200 lineas) — datos, tipos y helpers comparativos
- `components/ComparativoSociedades.tsx` (~330 lineas) — UI con 2 sub-tabs

**Archivos modificados:**
- `dashboard/page.tsx` — import, LegalTab type, card grid, tab pill, rendering

### 2026-03-06 — Integraciones: PostHog Analytics + Delighted NPS

**Commit:** `53e91aa`

#### PostHog Analytics (SDK posthog-js)
- Instalacion `posthog-js` como dependencia
- `lib/analytics.ts` (~170 lineas): wrapper con funciones tipadas para todos los eventos
- `components/AnalyticsProvider.tsx`: inicializa PostHog + Delighted en mount, track pageviews en cambio de ruta
- Eventos capturados: login, modulo_abierto, tab_cambiado, dato_guardado, formulario_completado, onboarding_perfil_seleccionado, onboarding_completado, setup_completado, proyeccion_ejecutada, mupa_accion, comparativo_sociedades_visto, asistente_mensaje_enviado
- Graceful degradation: si `NEXT_PUBLIC_POSTHOG_KEY` no esta configurado, analytics desactivado silenciosamente
- Respeta Do Not Track del navegador

#### Delighted NPS — ⚠️ PENDIENTE DE ACTIVAR
- Codigo listo: carga snippet JS oficial de Delighted dinamicamente
- Disparo condicional: primera encuesta a los 7 dias de uso, despues cada 30 dias
- Persistencia via `midf_first_use_date` y `midf_last_nps_shown`
- Graceful degradation: si `NEXT_PUBLIC_DELIGHTED_KEY` no esta configurado, NPS desactivado
- **PENDIENTE:** delighted.com esta en mantenimiento (2026-03-06). Crear cuenta y obtener key cuando vuelva online. Luego agregar `NEXT_PUBLIC_DELIGHTED_KEY` en Vercel env vars y re-deploy

#### Integracion en la app
- `layout.tsx` — AnalyticsProvider envuelve AuthProvider
- `dashboard/page.tsx` — trackModuleOpened, trackDataSaved, trackSetupCompleted
- `SetupWizard.tsx` — trackOnboardingProfile, trackOnboardingCompleted
- `.env.example` — documentadas las 3 nuevas env vars

#### Para activar
1. Crear cuenta PostHog → copiar Project API Key → `NEXT_PUBLIC_POSTHOG_KEY`
2. Crear cuenta Delighted → copiar Key → `NEXT_PUBLIC_DELIGHTED_KEY`
3. Agregar env vars en Vercel (Settings → Environment Variables)
4. Re-deploy: `cd frontend && npx vercel --prod`

### 2026-03-06 — Expansion Mi RRHH: Paridad con Practisoft

**Commit:** `7aad04e`

#### Fase 0: MiRRHH montado en dashboard
- MiRRHH.tsx (2,220 lineas) montado como tab "rrhh" en dashboard junto a PayrollEngine "nomina"
- 8 sub-tabs: Registro, Planilla, Freelancers, Horas Extras, Bonos, Prestamos, Contratos, Asistencia

#### Expansion #1: Frecuencias de planilla
- FormaPago: mensual, quincenal, bisemanal, semanal
- `FREQUENCY_CONFIGS` con periodsPerYear, divisor, ISR exempt limits
- `calcularISRMensual()` acepta `periodsPerYear` (default 12) — anualiza y de-anualiza correctamente

#### Expansion #2: Horas extras (Ley 44 de 1995)
- 5 tipos: diurna +25%, nocturna +50%, descanso +50%, nocturna descanso +75%, feriado +150%
- Tarifa base = salario/240, auto-calculo de montos
- Alerta legal: maximo 3h/dia, 9h/semana (~36/mes)

#### Expansion #3: Bonificaciones
- Gravables (productividad, antiguedad, representacion, comisiones, navidad) se suman al devengado bruto
- No gravables (transporte, alimentacion) se suman al neto
- Nota legal: transporte/alimentacion no gravable hasta B/.100/mes

#### Expansion #4: Prestamos a empleados
- CRUD prestamos con monto, cuotas, fecha desembolso
- Cuota mensual = monto/cuotas (descuento automatico del neto)
- Estados: activo, congelado, pagado — con barra de progreso
- Historial de pagos (nomina o manual)

#### Expansion #5: Control de asistencia
- Calendario mensual interactivo con 8 tipos de asistencia
- Colores por tipo: P (presente), T (tardanza), FI/FJ (faltas), IC, V, PE, FE
- Llenado rapido ("Llenar Presente" para todos los dias laborables)
- Exportacion CSV por empleado/mes

#### Expansion #6: Contratos digitales
- 4 tipos: indefinido, temporal, por obra, prueba
- Semaforo automatico: vigente (verde), por vencer 30d (amarillo), vencido (rojo), terminado (gris)
- `computeEstadoContrato()` recalcula estado en tiempo real
- Alertas globales de contratos por vencer

**Archivos creados:**
- `components/rrhh/HorasExtrasTab.tsx` (~314 lineas)
- `components/rrhh/BonificacionesTab.tsx` (~227 lineas)
- `components/rrhh/PrestamosTab.tsx` (~399 lineas)
- `components/rrhh/ContratosTab.tsx` (~375 lineas)
- `components/rrhh/AsistenciaTab.tsx` (~366 lineas)
- `lib/rrhh-types.ts` (~730 lineas) — tipos + CRUD para todas las expansiones

**Archivos modificados:**
- `components/rrhh/MiRRHH.tsx` — +5 imports, TabKey expandido, 5 render cases
- `dashboard/page.tsx` — +import MiRRHH, +Users icon, +"rrhh" tab

---

## Estado del Roadmap (actualizado 2026-03-07)

| GAP | Modulo | Estado | Commit |
|-----|--------|--------|--------|
| #1 | Proyecciones Financieras | ✅ Completo | `6c710ea` |
| #3 | MUPA Completo | ✅ Completo | `bcae986` |
| #4 | Onboarding Diferenciado | ✅ Completo | `3f5266b` |
| #6 | Ruta S.E. Ampliada | ✅ Completo | `88df725` |
| — | NPS (Delighted) | ⚠️ Codigo listo, cuenta pendiente (sitio en mantenimiento) | `53e91aa` |
| — | Analytics (PostHog) | ✅ Integrado | `53e91aa` |
| — | RRHH Expansion (6 modulos) | ✅ Completo — Paridad Practisoft | `7aad04e` |
| — | Libro de Ventas (3 segmentos) | ✅ Build OK — Segmento 3 PAC sandbox pendiente | (pending commit) |
| GAP-2 | CB Insights 6 Causas de Fracaso | ✅ Completo — Detector + Dashboard Hub | (pending commit) |
| GAP-3 | Widget Beta NPS | ✅ Completo — Copiar link + ver resultados | (pending commit) |
| GAP-3B | Simulador Nomina Desglose | ✅ Completo — Empleador + Empleado + ISR | (pending commit) |
| GAP-4 | Forecast P&L 12 Meses | ✅ Completo — Regresion lineal + supuestos editables | (pending commit) |
| GAP-5 | Churn Rate y Retencion | ✅ Completo — KPIs admin + cohortes | (pending commit) |
| GAP-6 | Traductor de Jerga Legal | ✅ Completo — GPT-4o con fallback demo | (pending commit) |
| GAP-7 | Branding Mandibulas→Brecha | ✅ Completo — Renombrado en UI | (pending commit) |
| GAP-8 | Cierre Mensual y Reportes | ✅ Completo — Generacion + cierre periodo | (pending commit) |
| GAP-9 | Onboarding Guiado | ✅ Completo — Tour 5 pasos + tooltips | (pending commit) |

### 2026-03-07 — Libro de Ventas (Opcion C — Modelo Hibrido)

**Build:** Verificado (22.8s, 0 errores)

#### Arquitectura: 3 Segmentos segun Resolucion DGI 201-6299
- **Segmento 1 (Manual):** Boton de venta rapida ($) flotante + formulario modal con auto-calculo ITBMS 7%
- **Segmento 2 (CSV DGI):** Importacion de facturas desde facturador gratuito SFEP con parser tolerante + deduplicacion
- **Segmento 3 (PAC):** Integracion Gosocket para facturacion electronica obligatoria (>B/.36K o >100 facturas/mes)

#### Umbrales de segmentacion
- `LIMITE_INGRESOS = 36,000` (B/. anuales)
- `LIMITE_FACTURAS = 100` (mensuales)
- `UMBRAL_ALERTA_PCT = 80%` (alerta temprana)
- Deteccion automatica via `detectarSegmentoLocal()` sobre datos en localStorage

#### Archivos creados (24 nuevos)
**Foundation:**
- `lib/ventas-types.ts` — Tipos: Venta, VentaInput, SegmentoFacturacion, OrigenVenta, MetodoPagoVenta, EstadoFacturaPAC
- `lib/ventas-storage.ts` — CRUD localStorage (`midf_ventas`), ITBMS_RATE=0.07, batch import con deduplicacion
- `lib/ventas-segmento.ts` — `detectarSegmentoLocal()`, `ResultadoSegmento`
- `supabase/migrations/20260302_libro_ventas.sql` — Tabla `ventas` con monto_total GENERATED, 8 indices, RLS, vistas
- `supabase/migrations/20260303_configuracion_pac.sql` — `society_segmento_historial`, funcion `calcular_segmento_society()`

**Segmento 1 — Venta Manual:**
- `components/ventas/BotonVentaRapida.tsx` — FAB dorado fixed bottom-24 right-4
- `components/ventas/FormVentaRapida.tsx` — Modal 7 campos + toggle ITBMS + overlay exito
- `components/ventas/TablaVentas.tsx` — Tabla con badges origen (Manual=gray, DGI=blue, PAC=green), two-tap anular
- `components/ventas/ResumenVentas.tsx` — 3 KPIs + desglose por origen y metodo pago

**Segmento 2 — CSV DGI:**
- `lib/parsers/dgi-csv-parser.ts` — Parser zero-dependency, BOM, auto-delimitador, 20+ variantes header
- `components/ventas/ImportadorDGI.tsx` — Flujo 4 pasos con highlight duplicados
- `components/ventas/GuiaDGI.tsx` — 5 pasos descarga CSV desde SFEP

**Segmento 3 — PAC (sandbox pendiente):**
- `lib/pac/types.ts` — ConfiguracionPAC, FacturaElectronica, RespuestaPAC, ErrorPAC
- `lib/pac/pac-client.ts` — Clase abstracta PACClient + createPACClient() factory
- `lib/pac/gosocket.ts` — GosocketClient extends PACClient (⚠️ PENDING SANDBOX VERIFICATION)
- `lib/pac/xml-builder.ts` — buildXMLFactura() + buildXMLAnulacion() para FE-DGI
- `components/ventas/PanelPAC.tsx` — Dashboard PAC con test conexion, emision, historial
- `components/ventas/OnboardingPAC.tsx` — Wizard 4 pasos configuracion PAC
- `components/ventas/AlertaMigracionPAC.tsx` — Banner obligatorio cuando se superan umbrales

**API Routes:**
- `app/api/ventas/route.ts` — GET/POST ventas (Supabase bridge)
- `app/api/ventas/importar-dgi/route.ts` — POST batch import con deduplicacion
- `app/api/ventas/pac/emitir/route.ts` — POST emision factura electronica (⚠️ simulacion hasta sandbox)
- `app/api/ventas/pac/webhook/route.ts` — POST receptor webhook PAC

**Container + Dashboard:**
- `components/ventas/LibroVentas.tsx` — Container con tabs: Registro, Importar DGI, PAC, Resumen
- `dashboard/page.tsx` — DatosMode +"ventas", pill "Libro de Ventas" (amber-600), import LibroVentas

**Alertas:**
- `lib/alerts.ts` — AlertCategory +"facturacion", `computeFacturacionAlerts()` con 4 alertas
- `components/AlertsSidebar.tsx` — Icono Receipt + label "Facturacion"
- `components/WatchdogDashboard.tsx` — AlertType +"facturacion_electronica"

#### Integracion con arquitectura PAC existente
- Los archivos en `lib/pac/` son especificos del Libro de Ventas
- La arquitectura PACProvider en `services/facturacion/pac/` (ManualEntryAdapter, PACFactory) sigue intacta
- Futuro: GosocketClient puede registrarse en PACFactory para unificar ambos sistemas

#### ⚠️ Pendiente: Gosocket Sandbox
- Codigo de Segmento 3 completo pero marcado `PENDING SANDBOX VERIFICATION`
- Requiere cuenta sandbox en gosocket.net
- Endpoints sandbox asumidos: `https://sandbox-api.gosocket.net/v1/`
- Una vez verificado: remover flags de simulacion, activar emision real

### 2026-03-07 — GAP Analysis: 8 Mejoras en 3 Fases

**Build:** Verificado (0 errores, 19 rutas)

#### 🔴 FASE 1 — GAP-2: CB Insights 6 Causas de Fracaso
- Detector client-side que evalua 6 causas desde FinancialRecord
- Causas: Sin mercado, Sin caja, Equipo incorrecto, Competencia, Precios, Modelo no escalable
- Scoring: 16pts en_orden, 8pts precaucion, 0pts critico, 10pts sin_datos (max 96→normalizado 100)
- Widget SVG donut en Hub con indicadores por causa + slide-over drawer

**Archivos creados:**
- `lib/analytics/cb-insights-detector.ts` — Detector con 6 evaluaciones
- `components/dashboard/Widget6CausasCB.tsx` — Widget Hub con donut chart
- `components/dashboard/CausaCard.tsx` — Card individual por causa
- `components/dashboard/CausaDetalle.tsx` — Drawer lateral con detalle

#### 🔴 FASE 1 — GAP-3: Widget Beta NPS en Hub
- Boton "Copiar link encuesta" con clipboard API
- Boton "Ver resultados" → /admin/beta-resultados

**Archivos creados:**
- `components/dashboard/WidgetBetaNPS.tsx` — Widget con 2 acciones

#### 🔴 FASE 1 — GAP-3B: Simulador Nomina con Desglose Completo
- Motor de calculo con tasas corregidas: CSS_PATRONAL=12.25% (NO 13.25%)
- Vista individual: desglose empleador (14 lineas) + empleado (ISR paso a paso)
- Vista consolidada: tabla multi-empleado + salida real de caja vs provisiones
- ISR verificado: B/.1,500 bruto → B/.62.75/mes retencion

**Archivos creados:**
- `lib/rrhh/nomina-types.ts` — EmpleadoInput, ResultadoNomina, etc.
- `lib/rrhh/nomina-calculator.ts` — TASAS_NOMINA, calcularNominaEmpleado(), calcularISR()
- `components/rrhh/SimuladorNomina.tsx` — UI individual + consolidada
- `components/rrhh/DesglosePagoEmpleador.tsx` — Tabla costos patronales
- `components/rrhh/DesglosePagoEmpleado.tsx` — Tabla deducciones + ISR
- `components/rrhh/ResumenNominaTotal.tsx` — Resumen multi-empleado

**Archivos modificados:**
- `components/rrhh/MiRRHH.tsx` — +"simulador" tab, Calculator icon, SimuladorNomina render

#### 🟡 FASE 2 — GAP-4: Forecasting Financiero 12 Meses
- Motor de regresion lineal client-side para proyectar ingresos/gastos
- 4 supuestos editables: crecimiento ingresos, crecimiento gastos, ITBMS, ISR
- Tabla P&L con celdas click-to-edit para Revenue
- Recharts LineChart con 4 lineas (ingresos, gastos, EBITDA, utilidad neta)
- 4 KPI cards: revenue anual, EBITDA, margen neto, meses runway

**Archivos creados:**
- `lib/analytics/forecast-engine.ts` — Regresion lineal + buildHistorialFromVentas()
- `components/forecast/ForecastPL.tsx` — Tabla + chart + KPIs
- `components/forecast/ForecastSupuestos.tsx` — 4 sliders de supuestos
- `supabase/migrations/20260304_forecast.sql` — forecast_proyecciones + forecast_supuestos

**Archivos modificados:**
- `dashboard/page.tsx` — DatosMode +"forecast", pill "Forecast 12M" (emerald-600)

#### 🟡 FASE 2 — GAP-5: Churn Rate y Retencion de Usuarios
- Dashboard admin en /admin/metricas (protegido)
- KPIs: MAU, churn rate, DAU/MAU ratio, avg session
- Tabla cohortes con retencion M1-M6
- Grafico barras uso por modulo
- Lista usuarios at-risk (>14d sin actividad)
- Definicion: Activo = login 30d + 1 accion. Churned = registrado >60d, sin actividad 60d

**Archivos creados:**
- `supabase/migrations/20260305_engagement_tracking.sql` — user_sessions + user_acciones
- `lib/analytics/churn-detector.ts` — generateMockKPIs(), calcularChurnMetrics()
- `components/admin/KPISoraya.tsx` — Dashboard admin con 4 KPIs + cohortes
- `app/admin/metricas/page.tsx` — Page wrapper

#### 🟡 FASE 2 — GAP-6: Traductor de Jerga Legal (GPT-4o)
- API route con GPT-4o system prompt especializado en derecho panameno
- Fallback demo si OPENAI_API_KEY no configurado (demo de alta calidad)
- UI: textarea + contador caracteres + 4 secciones resultado
- Secciones: EN SIMPLE, PARA TU NEGOCIO, ACCION REQUERIDA, DATOS IMPORTANTES

**Archivos creados:**
- `app/api/herramientas/traductor-legal/route.ts` — POST GPT-4o con fallback
- `components/herramientas/TraductorLegal.tsx` — UI completa

**Archivos modificados:**
- `dashboard/page.tsx` — LegalTab +"traductor", pill + TraductorLegal render

#### 🟢 FASE 3 — GAP-7: Correccion Branding "Mandibulas"
- Renombrado todas las apariciones user-facing de "Mandibulas"
- Pill tab: "Mandibulas" → "Brecha"
- Card titulo: → "Brecha de Rentabilidad"
- Heading seccion: → "Brecha de Rentabilidad: Ventas vs Costos"
- Grafico: → "Grafica de Tijeras"
- Tooltips actualizados con nueva terminologia

**Archivos modificados:**
- `dashboard/page.tsx` — Tab label, card label, heading
- `components/charts/MandibulasChart.tsx` — Empty state, status badges
- `components/SmartTooltip.tsx` — Titulo y explicaciones

#### 🟢 FASE 3 — GAP-8: Cierre Mensual y Reportes
- Generador de reportes mensuales con snapshots de 5 secciones
- Secciones: KPIs financieros, cascada P&L, ventas, alertas, estado cierre
- Cierre de periodo con proteccion contra re-apertura (trigger SQL)
- UI: lista de reportes + selector periodo + crear/ver/eliminar borrador
- Nuevo DatosMode "reportes" con pill "Cierre Mensual" (indigo-600)

**Archivos creados:**
- `supabase/migrations/20260306_reportes_cierres.sql` — reportes_cierres + trigger
- `lib/reportes/reporte-engine.ts` — generarReporteMensual(), CRUD localStorage
- `components/reportes/ReporteMensual.tsx` — Vista reporte completo (6 KPIs + tabla)
- `components/reportes/CierreMensual.tsx` — Dialogo confirmacion cierre
- `components/reportes/ListaReportes.tsx` — Lista + creacion + eliminacion

**Archivos modificados:**
- `dashboard/page.tsx` — DatosMode +"reportes", pill "Cierre Mensual", ListaReportes render

#### 🟢 FASE 3 — GAP-9: Onboarding Guiado
- Tour modal de 5 pasos con texto grande (Silver Economy friendly)
- Tooltips flotantes via createPortal posicionados con getBoundingClientRect
- Provider con MutationObserver para detectar nuevos elementos tooltipeables
- Pasos: Mi Negocio, Datos Financieros, Mis Finanzas, Alertas, Mi Asistente
- Auto-skip si `midf_setup_complete` = true

**Archivos creados:**
- `supabase/migrations/20260307_onboarding_progress.sql` — onboarding_progress table
- `lib/onboarding-guide.ts` — 5 tooltip configs + 5 tour steps + CRUD
- `components/onboarding/OnboardingTour.tsx` — Modal 5 pasos
- `components/onboarding/OnboardingTooltip.tsx` — Floating tooltip via Portal
- `components/onboarding/OnboardingProvider.tsx` — Context provider + MutationObserver

**Archivos modificados:**
- `dashboard/page.tsx` — OnboardingProvider wrapping, data-tooltip attributes
- `components/ModuleCardGrid.tsx` — +dataTooltipId prop

### localStorage keys (registro completo)

| Key | Tipo | Modulo |
|-----|------|--------|
| `midf_company_name` | string | Setup |
| `midf_company_logo` | base64 | Setup |
| `midf_company_rubro` | string | Setup |
| `midf_setup_complete` | "true" | Setup |
| `midf_welcomed` | "true" | Setup |
| `midf_user_profile` | "A"/"B"/"C"/"D" | GAP #4 |
| `midf_tipo_actividad` | "comercio"/"servicios"/"produccion" | GAP #4 Perfil A |
| `midf_tiene_empleados` | "true"/"false" | GAP #4 Perfil A |
| `midf_factura_pac` | "true"/"false" | GAP #4 Perfil A |
| `midf_has_ruc` | "true" | Setup / GAP #4 |
| `midf_ruc_status` | "si"/"en_tramite"/"no" | GAP #4 Perfil D |
| `midf_proyecciones_flujo` | JSON | GAP #1 |
| `midf_mupa_dj_anual` | JSON | GAP #3 |
| `midf_mupa_rotulos` | JSON | GAP #3 |
| `midf_mupa_categoria_actividad` | string | GAP #3 |
| `midf_mupa_impuesto_ingresos` | number | GAP #3 |
| `midf_first_use_date` | ISO date | NPS Delighted |
| `midf_last_nps_shown` | ISO date | NPS Delighted |
| `midf_rrhh_personal` | JSON | RRHH — Registro de personal |
| `midf_rrhh_planillas` | JSON | RRHH — Planillas mensuales |
| `midf_rrhh_pagos_freelancers` | JSON | RRHH — Pagos a freelancers |
| `midf_rrhh_horas_extras` | JSON | RRHH — Horas extras |
| `midf_rrhh_bonificaciones` | JSON | RRHH — Bonificaciones |
| `midf_rrhh_prestamos` | JSON | RRHH — Prestamos a empleados |
| `midf_rrhh_contratos` | JSON | RRHH — Contratos laborales |
| `midf_rrhh_asistencia` | JSON | RRHH — Control de asistencia |
| `midf_ventas` | JSON | Libro de Ventas — Registro de ventas |
| `midf_onboarding_pac_{societyId}` | JSON | Libro de Ventas — Estado onboarding PAC |
| `midf_forecast_edits` | JSON | GAP-4 — Ediciones manuales al forecast |
| `midf_reportes_cierres` | JSON | GAP-8 — Reportes mensuales y cierres |
| `midf_onboarding_tour_done` | "true" | GAP-9 — Tour completado |
| `midf_onboarding_tooltips_seen` | JSON | GAP-9 — Tooltips vistos |
