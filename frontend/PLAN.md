# Plan: Monitor de Topes Ley 186 + Renombrar Espejo

## Parte A — Renombrar "Espejo de Declaracion de Renta" → "Espejo de Formularios"
✅ **YA COMPLETADO** — 4 archivos actualizados, 0 referencias pendientes.

---

## Parte B — Monitor de Topes Ley 186

### Arquitectura

El monitor se integra en el sistema de alertas existente (`alerts.ts` + `AlertsSidebar`).
Se crea un componente visual nuevo `MonitorTopesLey186.tsx` para el panel dentro del
modulo de alertas (Vigilante Legal en Mi Empresa), y se agregan alertas automaticas
al motor centralizado.

### Archivos a crear

1. **`src/components/alertas/MonitorTopesLey186.tsx`** (~350 lineas)
   - Componente visual con 3 secciones (A, B, C)
   - Seccion A: Barra progreso ingresos vs B/.75,000 con semaforo 4 colores
   - Seccion B: Cuenta regresiva 24 meses con barra temporal
   - Seccion C: Tope Facturador Gratuito (condicional, toggle)
   - Lee datos de localStorage: `midf_incorporation_date`, `midf_usa_facturador_gratuito`
   - Lee ingresos de: FacturacionService + financial records
   - Proyeccion lineal: promedio mensual → mes estimado de alcance del tope
   - Patron: mismo estilo visual que DiagnosticCard y WatchdogDashboard

### Archivos a modificar

2. **`src/lib/alerts.ts`** — Nueva funcion `computeLey186Alerts()`
   - 4 alertas de ingresos (60%, 80%, 90%, 100%+)
   - 3 alertas de vencimiento 24 meses (3 meses, 30 dias, vencido)
   - 2 alertas de facturador gratuito (80 docs, 80% ingresos)
   - Todas con category: `"dgi"`, prioridades apropiadas
   - Input: ingresos acumulados, fecha inscripcion, usa_facturador, docs_mes

3. **`src/app/dashboard/page.tsx`**
   - Integrar `computeLey186Alerts()` en el useMemo de `strategicAlerts`
   - Pasar datos de localStorage al motor de alertas

4. **`src/components/WatchdogDashboard.tsx`**
   - Agregar el `MonitorTopesLey186` como seccion destacada al inicio del panel
   - Visible cuando entity_type === "SE"

### Flujo de datos

```
localStorage (midf_incorporation_date, midf_entity_type, midf_usa_facturador_gratuito)
    ↓
computeLey186Alerts() ← ingresos de FacturacionService + financial records
    ↓
strategicAlerts[] → AlertsSidebar (campana) + MonitorTopesLey186 (visual)
```

### Campos de configuracion

Los campos ya existen parcialmente:
- `midf_entity_type` → ya existe ("SE" = Sociedad de Emprendimiento)
- `midf_incorporation_date` → ya existe (fecha ISO)
- `midf_usa_facturador_gratuito` → **NUEVO** — toggle boolean en localStorage

El toggle del facturador gratuito se agrega dentro del propio MonitorTopesLey186
(switch inline) sin necesidad de navegar a otra pantalla.

### Colores semaforo (Seccion A)

| Rango     | Color    | Tailwind         |
|-----------|----------|------------------|
| 0%–60%    | Verde    | bg-emerald-500   |
| 61%–80%   | Amarillo | bg-amber-500     |
| 81%–95%   | Naranja  | bg-orange-500    |
| 96%–100%+ | Rojo     | bg-red-500       |

### Alertas automaticas (9 total)

| ID | Condicion | Prioridad | Mensaje clave |
|----|-----------|-----------|---------------|
| ley186-ingresos-60 | ≥60% de B/.75k | yellow | "60% del tope. Te quedan B/.{x}" |
| ley186-ingresos-80 | ≥80% de B/.75k | orange | "80% del tope. Planifica facturacion" |
| ley186-ingresos-90 | ≥90% de B/.75k | red | "90% del tope. Multas B/.1k-10k si superas" |
| ley186-ingresos-100 | ≥100% de B/.75k | red | "TOPE SUPERADO. Exoneracion perdida" |
| ley186-vencimiento-3m | ≤3 meses | yellow | "Exoneracion vence en 3 meses" |
| ley186-vencimiento-30d | ≤30 dias | orange | "Exoneracion vence en 30 dias" |
| ley186-vencido | Vencido | red | "Exoneracion VENCIDA desde {fecha}" |
| facturador-docs-80 | ≥80 docs/mes | orange | "80/100 documentos mensuales" |
| facturador-ingresos-80 | ≥80% de B/.36k | orange | "Ingresos cerca del tope B/.36k" |

### Orden de implementacion

1. Agregar `computeLey186Alerts()` a `alerts.ts`
2. Crear `MonitorTopesLey186.tsx`
3. Integrar alertas en dashboard `strategicAlerts`
4. Montar MonitorTopesLey186 en WatchdogDashboard
5. Build + tests + deploy
