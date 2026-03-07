# Como conectar un PAC real a MDF PTY

## Lo que ya esta listo

- `PACProvider` interface completa (todos los metodos del SFEP)
- `ManualEntryAdapter` funcionando como implementacion actual
- `PACFactory` para seleccionar el proveedor via env var
- Tablas en DB: `electronic_invoices`, `pac_configuration`, `pac_sync_log`
- FacturacionService como unico punto de entrada
- F2V10DraftService consume FacturacionService (no la DB directamente)

## Arquitectura

```
                    +------------------+
                    | F2V10DraftService|
                    +--------+---------+
                             |
                    +--------v---------+
                    |FacturacionService|  <-- Unico punto de entrada
                    +--------+---------+
                             |
                    +--------v---------+
                    |   PACFactory     |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
    +---------v---+ +--------v----+ +-------v------+
    |ManualEntry  | |EDICOMAdapter| |GoSocketAdapt.|
    |Adapter      | |(por crear)  | |(por crear)   |
    +-------------+ +-------------+ +--------------+
```

## Para activar un PAC real — 4 pasos unicos

### Paso 1 — Crear el adaptador

Crear: `frontend/src/services/facturacion/pac/[NombrePAC]Adapter.ts`

Implementar la interface `PACProvider` completa. Todos los metodos deben funcionar.
Ver `ManualEntryAdapter.ts` como guia.

### Paso 2 — Registrar en PACFactory

En `PACFactory.ts`, agregar el case:

```typescript
case 'EDICOM': return new EDICOMAdapter(config);
```

### Paso 3 — Configurar variables de entorno

```env
PAC_PROVIDER=EDICOM
PAC_ENVIRONMENT=SANDBOX
PAC_API_KEY=[clave del PAC]
PAC_API_SECRET=[secreto del PAC]
PAC_BASE_URL=[URL base de la API del PAC]
```

### Paso 4 — Activar para la empresa

```sql
UPDATE pac_configuration SET is_active = true WHERE society_id = '[id]';
```

### Prueba de fuego

Ejecutar: `FacturacionService.getIntegrationStatus()`
Debe devolver: `{ mode: 'PAC_ACTIVE', connected: true }`

## Ningun otro archivo cambia. Garantizado.

El criterio de aceptacion de la arquitectura es este:
**activar EDICOM requiere crear 1 archivo + cambiar 2 lineas + 3 env vars.**
Si se necesita tocar mas, hay un problema de abstraccion.

## PACs certificados DGI disponibles en Panama

| PAC       | Resolucion DGI    | API   | Sandbox | Contacto          |
|-----------|-------------------|-------|---------|-------------------|
| EDICOM    | N. 201-7569       | REST  | Si      | edicomgroup.com   |
| GoSocket  | (verificar DGI)   | REST  | Si      | gosocket.net      |
| Sovos     | (verificar DGI)   | REST  | Si      | sovos.com         |
| Infile    | (verificar DGI)   | REST  | Consultar| infile.com       |

Verificar resoluciones vigentes en: dgi.mef.gob.pa antes de contratar.

## Checklist antes de ir a produccion con un PAC

- [ ] Adaptador completo con todos los metodos de PACProvider
- [ ] Pruebas en ambiente SANDBOX con documentos de prueba
- [ ] Certificado de firma electronica del usuario configurado
- [ ] getPeriodSummary() reconcilia correctamente con F2 V10
- [ ] Sincronizacion inicial de historicos ejecutada
- [ ] Plan de rollback documentado (volver a MANUAL si falla)
- [ ] Rate limits del PAC identificados y manejados

## Estructura de archivos

```
frontend/src/services/facturacion/
├── pac/
│   ├── PACProvider.interface.ts    # Contrato (no tocar)
│   ├── ManualEntryAdapter.ts       # Implementacion actual
│   ├── PACFactory.ts               # Selector de adaptador
│   └── [NuevoPAC]Adapter.ts        # Crear para cada PAC
├── FacturacionService.ts           # Punto de entrada (no tocar)
└── ...

frontend/src/services/declaraciones/
├── f2v10Draft.service.ts           # Generador del borrador (no tocar)
└── ...
```
