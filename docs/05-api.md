# 5. Diseño de la API

**Base:** `https://api.midominio.com/api/v1`
**Formato:** JSON · `camelCase` · fechas ISO-8601 en UTC
**Autenticación:** `Authorization: Bearer <accessToken>` salvo en `/auth/*` y `/public/*`
**Documentación:** OpenAPI 3.1 autogenerada en `/api/docs` (Swagger UI), con esquemas derivados de Zod.

## 5.1 Convenciones

**Errores** — RFC 7807 (`application/problem+json`):
```jsonc
{
  "type": "https://api.midominio.com/errors/invalid-state-transition",
  "title": "Transición de estado no permitida",
  "status": 409,
  "detail": "El pedido 12345 está ENTREGADO y no admite más cambios",
  "instance": "/api/v1/orders/uuid/deliver",
  "correlationId": "01J...",
  "errors": [{ "field": "status", "code": "INVALID_TRANSITION" }]
}
```

**Paginación por cursor** (keyset — estable bajo escritura concurrente):
```jsonc
// GET /orders?limit=50&cursor=eyJpZCI6...
{ "data": [...], "meta": { "nextCursor": "eyJpZCI6...", "hasMore": true, "total": 1284 } }
```

**Idempotencia** — las mutaciones críticas (`confirm`, `assign`, `start`, `deliver`) aceptan `Idempotency-Key`; la respuesta se cachea 24 h en Redis.

**Rate limiting** — global 100 req/min/IP · login 5/15 min · `/public/*` 30 req/min/IP · uploads 20/min/usuario.

**Versionado** — por URI (`/v1`). Cambios rompedores ⟹ `/v2`, nunca mutación silenciosa de `/v1`.

---

## 5.2 Autenticación — `/auth`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | — | `{ email, password }` → `{ accessToken, user }` + cookie refresh |
| POST | `/auth/refresh` | cookie | Rota el par de tokens |
| POST | `/auth/logout` | auth | Revoca la familia de refresh |
| GET | `/auth/me` | auth | Perfil + permisos |
| POST | `/auth/forgot-password` | — | Envía email (respuesta siempre 202, anti-enumeración) |
| POST | `/auth/reset-password` | — | `{ token, newPassword }` |
| POST | `/auth/change-password` | auth | Revoca todas las sesiones |

## 5.3 Importación — `/imports`  *(ADMIN)*

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/imports/parse` | multipart. Analiza sin persistir pedidos → devuelve `batchId`, vista previa y mapeo sugerido |
| GET | `/imports/:id/preview` | Recupera la vista previa (paginada) |
| PATCH | `/imports/:id/mapping` | Reasigna columnas y revalida |
| POST | `/imports/:id/confirm` | Confirma la importación (transaccional) |
| DELETE | `/imports/:id` | Descarta un lote sin confirmar |
| GET | `/imports` | Historial de importaciones |
| GET | `/imports/:id/errors.csv` | Descarga las filas rechazadas |
| POST | `/imports/:id/revert` | Revierte un lote sin pedidos asignados |
| GET/POST/PATCH/DELETE | `/column-mappings` | CRUD de mapeos |

## 5.4 Pedidos — `/orders`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/orders` | ADMIN | Filtros: `status[]`, `dateFrom/To`, `district[]`, `driverId`, `batchId`, `q`, `hasPhone`, `slaRisk`, `sort` |
| GET | `/orders/:id` | ADMIN | Detalle + eventos + notificaciones + prueba |
| PATCH | `/orders/:id` | ADMIN | Edición parcial (auditada, con diff) |
| DELETE | `/orders/:id` | ADMIN | Borrado lógico |
| POST | `/orders/:id/cancel` | ADMIN | `{ reason }` |
| POST | `/orders/:id/comment` | AMBOS | Comentario interno |
| PATCH | `/orders/:id/location` | ADMIN | Ajuste manual de coordenadas |
| POST | `/orders/:id/resend-tracking` | ADMIN | Reenvía el enlace |
| GET | `/orders/:id/events` | AMBOS | Timeline |
| POST | `/orders/bulk/assign` | ADMIN | `{ orderIds[], driverId, scheduledDate, routeName? }` → crea ruta |
| POST | `/orders/bulk/cancel` | ADMIN | |
| GET | `/orders/export` | ADMIN | `?format=xlsx\|csv` |
| GET | `/orders/mine` | DRIVER | Sólo los asignados a él (ownership en repositorio) |
| POST | `/orders/:id/deliver` | DRIVER | Entrega exitosa |
| POST | `/orders/:id/attempt` | DRIVER | Intento fallido |
| POST | `/orders/:id/reschedule` | DRIVER | Reprogramación |

**`POST /orders/:id/deliver`**
```jsonc
// Request
{
  "photos": ["guayoyo/proofs/abc123", "guayoyo/proofs/def456"], // public_id de Cloudinary
  "signature": "guayoyo/signatures/ghi789",
  "receivedByName": "María Quispe",
  "receivedByDocument": "45678912",
  "comment": "Entregado en portería",
  "location": { "lat": -12.0464, "lng": -77.0428, "accuracy": 12 },
  "occurredAt": "2026-08-03T19:32:11.000Z"   // hora del dispositivo → soporta sync offline
}
// 200
{ "order": { "id": "...", "status": "ENTREGADO", "deliveredAt": "..." },
  "proof": { "id": "..." }, "route": { "completedStops": 7, "plannedStops": 12 } }
```

## 5.5 Rutas — `/routes`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/routes` | ADMIN | `?date=&driverId=&status=` |
| POST | `/routes` | ADMIN | Crear ruta con paradas |
| GET | `/routes/:id` | AMBOS | Detalle + paradas + progreso |
| PATCH | `/routes/:id` | ADMIN | Cambiar motorizado, fecha, notas |
| DELETE | `/routes/:id` | ADMIN | Cancelar ruta |
| PATCH | `/routes/:id/stops/reorder` | ADMIN | `{ orderedStopIds[] }` |
| POST | `/routes/:id/stops` | ADMIN | Añadir pedidos |
| DELETE | `/routes/:id/stops/:stopId` | ADMIN | Quitar parada |
| **POST** | **`/routes/:id/start`** | DRIVER | Inicia ruta · dispara notificaciones · activa GPS |
| POST | `/routes/:id/complete` | DRIVER | Finaliza ruta |
| PATCH | `/routes/:id/stops/:stopId/en-route` | DRIVER | Marca "en camino" |
| GET | `/routes/mine/today` | DRIVER | Ruta del día |
| GET | `/routes/:id/track` | ADMIN | Traza histórica de pings (para reproducción) |
| GET | `/routes/:id/sheet.pdf` | ADMIN | Hoja de ruta imprimible |

## 5.6 Ubicación — `/locations`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/locations/ping` | DRIVER | Fallback HTTP si el WS está caído |
| POST | `/locations/batch` | DRIVER | Sincroniza el buffer offline |
| GET | `/locations/live` | ADMIN | Posición actual de todos los motorizados en ruta |

## 5.7 Indicadores — `/analytics`  *(ADMIN)*

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/analytics/dashboard` | Todas las tarjetas del panel en una sola llamada (cache 60 s) |
| GET | `/analytics/cycle-times` | Promedios: importación→asignación, asignación→despacho, despacho→entrega, total |
| GET | `/analytics/timeseries` | `?metric=deliveries\|avgTime&granularity=hour\|day\|week\|month` |
| GET | `/analytics/by-district` | Volumen y tiempo promedio por distrito |
| GET | `/analytics/by-driver` | Volumen, tiempo promedio y cumplimiento por motorizado |
| GET | `/analytics/driver-ranking` | `?sortBy=deliveries\|avgTime\|compliance` |
| GET | `/analytics/sla` | % mismo día, % ≤24 h, % fuera de objetivo |
| GET | `/analytics/status-breakdown` | Conteo por estado |
| GET | `/analytics/compare` | Comparativa entre dos períodos |

**Todos aceptan** `?from=&to=&driverId=&district=&timezone=America/Lima`.

## 5.8 Reportes — `/reports`  *(ADMIN)*

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/reports/generate` | `{ type, format: xlsx\|pdf\|csv, filters }` → job asíncrono, devuelve `jobId` |
| GET | `/reports/:jobId` | Estado del job |
| GET | `/reports/:jobId/download` | URL firmada, expira en 15 min |
| GET | `/reports/templates` | Tipos disponibles: operativo diario, desempeño de motorizados, análisis por distrito, cumplimiento SLA, detalle de pedidos |

> Los reportes se generan **en el worker**, no en el hilo HTTP: un PDF con gráficos de 30 días puede tardar segundos y bloquearía el event loop.

## 5.9 Administración — `/users`, `/drivers`, `/settings`

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PATCH/DELETE | `/users` | CRUD (ADMIN) |
| GET | `/drivers` | Lista con disponibilidad y carga actual |
| GET | `/drivers/:id/stats` | Métricas individuales |
| PATCH | `/drivers/:id/availability` | Activar/desactivar |
| GET/PATCH | `/settings` | Configuración global |
| GET/PATCH | `/settings/templates` | Plantillas de mensajes |
| GET | `/audit-logs` | Auditoría filtrable |
| GET | `/system/health` | Colas, notificaciones fallidas, salud de dependencias |

## 5.10 Público — `/public`  *(sin autenticación)*

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/public/tracking/:token` | Estado del pedido — **DTO minimizado** |
| GET | `/public/tracking/:token/events` | Historial de estados |
| POST | `/public/tracking/:token/rating` | Calificación de la entrega |

**DTO público** — lo único que sale al exterior:
```jsonc
{
  "orderNumber": "12345",
  "status": "EN_RUTA",
  "statusLabel": "En camino",
  "customerFirstName": "María",
  "addressMasked": "Av. Larco 1***, Miraflores",
  "district": "Miraflores",
  "driver": { "firstName": "Carlos", "photoUrl": "...", "vehicleType": "MOTO" },
  "position": { "lat": -12.0464, "lng": -77.0428, "updatedAt": "..." },
  "eta": { "at": "2026-08-03T20:15:00Z", "minutesRemaining": 18, "confidence": "MEDIA" },
  "stopsAhead": 2,
  "timeline": [
    { "status": "PENDIENTE", "at": "...", "label": "Pedido recibido" },
    { "status": "ASIGNADO",  "at": "...", "label": "Asignado a un repartidor" },
    { "status": "EN_RUTA",   "at": "...", "label": "En camino" }
  ],
  "deliveredAt": null,
  "contactWhatsapp": "+51999888777",
  "lastUpdate": "2026-08-03T19:58:42Z"
}
```
❌ **Nunca** se expone: teléfono del cliente, dirección completa, apellido del cliente, DNI, IDs internos, otros pedidos de la ruta.

## 5.11 WebSocket — Socket.IO

**Namespaces:** `/driver` (JWT), `/admin` (JWT + rol), `/public` (token de tracking).

**Cliente → Servidor**
| Evento | Namespace | Payload |
|---|---|---|
| `driver:position` | /driver | `{ routeId, lat, lng, accuracy, speed, heading, batteryPct, recordedAt }` |
| `driver:heartbeat` | /driver | `{ routeId }` cada 30 s |
| `admin:subscribe` | /admin | `{ scope: 'live' \| 'route', routeId? }` |
| `public:subscribe` | /public | `{ token }` |

**Servidor → Cliente**
| Evento | Destino | Payload |
|---|---|---|
| `position:update` | sala ruta / pedido | `{ driverId, lat, lng, heading, recordedAt }` |
| `order:status` | admin + cliente | `{ orderId, status, at }` |
| `route:progress` | admin | `{ routeId, completed, planned, failed }` |
| `eta:update` | cliente | `{ minutesRemaining, stopsAhead, at }` |
| `alert:raised` | admin | `{ type, severity, entityId, message }` |
| `connection:degraded` | todos | señal para activar el fallback a polling |

**Reglas de sala:** un cliente público sólo puede unirse a `order:{suToken}`; la validación se hace en el servidor contra la BD, nunca se confía en el payload. Autenticación en el *handshake*, no en el primer mensaje.
