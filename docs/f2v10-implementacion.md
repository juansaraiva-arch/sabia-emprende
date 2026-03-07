# F2 V10 — Documentacion de Implementacion

**Fecha:** 2026-02-28
**Version:** 1.0
**Estado:** Implementado y desplegado

---

## 1. Decisiones Tecnicas

### 1.1 Arquitectura de datos

**Persistencia primaria:** localStorage (patron probado en LabPrecios, PayrollEngine)
- Los datos del borrador se guardan en `midf_borrador_f2v10_[year]`
- Los socios se guardan en `midf_society_members`
- Las facturas manuales en `midf_electronic_invoices`

**Persistencia secundaria:** Supabase (tablas listas pero no bloqueantes)
- `borradores_declaracion` — historial de borradores
- `electronic_invoices` — facturas con trazabilidad PAC
- `society_members` — socios y directivos
- `pac_configuration` — config futura PAC

**Razon:** La app funciona en modo demo sin backend. Bloquear por DB impediria la experiencia.

### 1.2 Fuentes de datos (prioridad)

1. **Facturas electronicas** (via FacturacionService) — fuente mas confiable para ingresos
2. **Registros contables** (financial_records) — gastos desglosados
3. **Datos de empresa** (societies + localStorage) — RUC, nombre, fecha constitucion
4. **Nomina** (PayrollTotals via localStorage) — CSS patronal, planilla
5. **Entrada manual** — ultimo recurso, campo marcado como faltante

### 1.3 Motor DGI extendido

Se extendio `dgi-mappings.ts` con:
- `F2_V10_MAPPINGS` — mapeo declarativo de casillas a fuentes
- `FORM_F2_V10` — definicion de formulario compatible con `computeFormValues()`

El Form F2 V10 reutiliza las mismas casillas base del Form 03 pero agrega logica S.E.P.:
- ISR = 0 si en exoneracion (Ley 186 Art. 37)
- Tasa Unica = 0 siempre (Ley 186 Art. 35)
- FECI = 0 siempre (Ley 186 Art. 38)

### 1.4 Abstraccion PAC

Se implemento el patron Strategy/Adapter:
- `PACProvider` interface — contrato completo del SFEP
- `ManualEntryAdapter` — implementacion actual (localStorage)
- `PACFactory` — selecciona adaptador por env var
- `FacturacionService` — unico punto de entrada

**Criterio de aceptacion:** Activar un PAC real requiere:
1. Crear 1 archivo ([PAC]Adapter.ts)
2. Cambiar 2 lineas en PACFactory
3. Configurar 3 env vars

Ningun otro archivo del proyecto cambia.

---

## 2. Campos que quedaron como entrada manual

| Campo | Razon | Alternativa futura |
|-------|-------|-------------------|
| Representante Legal | No hay tabla de socios pre-existente | DB: society_members ya creada |
| Cedula del representante | Depende del anterior | Misma tabla |
| Direccion fiscal | No existia campo en societies | ALTER ya aplicado: fiscal_address |
| Utilidades distribuidas | Dato sensible, requiere confirmacion | Formulario inline |
| Facturas electronicas | No hay integracion PAC aun | Arquitectura PAC lista |
| Datos de socios | Modulo nuevo | SociosForm.tsx creado |

---

## 3. Instrucciones para QA

### 3.1 Flujo de prueba basico

1. Ir a Mi Director Financiero > Declaracion F2 V10
2. Verificar pantalla de verificacion previa (completitud, checks)
3. Continuar al borrador
4. Verificar secciones desplegables:
   - Identificacion (nombre, RUC, exoneracion)
   - Ingresos (con reconciliacion FE)
   - Gastos (categorias desglosadas)
   - Impuesto (ISR, tasa unica, FECI)
   - Distribucion utilidades (socios)
5. Verificar resumen final
6. Probar "Guardar Borrador"
7. Probar link a e-Tax 2.0

### 3.2 Casos de prueba criticos

| # | Caso | Resultado esperado |
|---|------|-------------------|
| 1 | Sin datos de empresa | Borrador parcial, campos faltantes listados |
| 2 | Con nombre y RUC | Seccion identificacion verde |
| 3 | Sin fecha constitucion | Advertencia error, exoneracion indeterminada |
| 4 | Fecha constitucion < 24 meses | Badge "EN EXONERACION", ISR = 0 |
| 5 | Fecha constitucion > 24 meses | Badge "FUERA DE EXONERACION", ISR calculado |
| 6 | Ingresos > B/.135,000 | Alerta de umbral de categoria |
| 7 | Ingresos > B/.150,000 | Alerta "pequena empresa" |
| 8 | Sin socios | Seccion roja, campo faltante |
| 9 | Con socios que suman != 100% | Advertencia en SociosForm |
| 10 | Reconciliacion FE = 0 vs contable > 0 | Discrepancia visible |

### 3.3 Tests automatizados

```bash
cd frontend
npx jest --testPathPattern=f2v10
```

Tests cubren:
- `calcularEstadoExoneracion` — 8 casos (mes 1, 12, 23, 24, 36, null, invalido, borde)
- `verificarUmbralesCategoria` — 6 casos (0, 50k, 135k, 150k, 150k+1, 1M+1)
- `PACFactory` — 6 casos (MANUAL, EDICOM, GOSOCKET, SOVOS, env, desconocido)
- `ManualEntryAdapter` — 4 casos (connection, summary, cert, webhook)
- `generarBorradorF2V10` — 5 casos (sin datos, tasa unica, FECI, faltantes, fuentes)

---

## 4. Checklist de validacion antes de produccion

- [x] F2V10DraftService genera borrador sin crash con datos vacios
- [x] F2V10DraftService genera borrador con datos parciales
- [x] Calculo de exoneracion ISR correcto en todos los casos borde
- [x] Tasa Unica = 0 para S.E.P.
- [x] FECI = 0 para S.E.P.
- [x] Reconciliacion de ingresos funcional (con y sin discrepancia)
- [x] Alertas de umbral de categoria activadas correctamente
- [x] PACFactory selecciona ManualEntryAdapter por defecto
- [x] PACFactory lanza error descriptivo para PACs no implementados
- [x] FacturacionService funciona en modo manual
- [x] F2V10BorradorScreen renderiza sin errores
- [x] SociosForm guarda en localStorage
- [x] Build exitoso (0 errores TypeScript)
- [x] Integrado en navegacion del dashboard
- [x] Tests unitarios pasan
- [x] Documentacion PAC completa (docs/integracion-pac/README.md)

---

## 5. Archivos creados/modificados

### Nuevos archivos (14):

| Archivo | Proposito |
|---------|-----------|
| `supabase/migrations/20260228_f2v10_tables.sql` | 7 tablas/ALTER para F2 V10 |
| `frontend/src/services/facturacion/pac/PACProvider.interface.ts` | Contrato PAC |
| `frontend/src/services/facturacion/pac/ManualEntryAdapter.ts` | Implementacion manual |
| `frontend/src/services/facturacion/pac/PACFactory.ts` | Factory de adaptadores |
| `frontend/src/services/facturacion/FacturacionService.ts` | Punto de entrada |
| `frontend/src/services/declaraciones/f2v10Draft.service.ts` | Generador de borrador |
| `frontend/src/components/declaraciones/F2V10BorradorScreen.tsx` | Pantalla principal |
| `frontend/src/components/declaraciones/ReconciliacionIngresosF2.tsx` | Reconciliacion FE |
| `frontend/src/components/empresa/SociosForm.tsx` | Formulario de socios |
| `frontend/src/lib/__tests__/f2v10.test.ts` | Tests obligatorios |
| `docs/auditoria-f2v10-2026-02-28.md` | Reporte de auditoria Fase 1 |
| `docs/integracion-pac/README.md` | Guia de integracion PAC |
| `docs/f2v10-implementacion.md` | Esta documentacion |

### Archivos modificados (2):

| Archivo | Cambio |
|---------|--------|
| `frontend/src/lib/dgi-mappings.ts` | +F2_V10_MAPPINGS, +FORM_F2_V10 |
| `frontend/src/app/dashboard/page.tsx` | +tabs f2v10/socios, +imports, +rendering |
