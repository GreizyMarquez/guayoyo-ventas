# 6. Estructura de carpetas

Monorepo **pnpm workspaces + Turborepo**.

```
guayoyo-ventas/
├── apps/
│   ├── api/                          # NestJS 11
│   └── web/                          # Next.js 15
├── packages/
│   ├── shared/                       # Contratos compartidos front ↔ back
│   ├── ui/                           # Design system React
│   ├── eslint-config/
│   └── tsconfig/
├── docs/                             # Este diseño + ADRs + runbooks
├── legacy/
│   └── index.html                    # App "Guayoyo · Ventas" actual (preservada)
├── infra/
│   ├── docker/
│   └── github-actions/
├── docker-compose.yml
├── docker-compose.prod.yml
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
└── README.md
```

---

## 6.1 `apps/api` — NestJS

```
apps/api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                       # admin + motorizados demo + settings
├── src/
│   ├── main.ts                       # bootstrap: helmet, cors, pipes, swagger
│   ├── app.module.ts
│   ├── worker.ts                     # entrypoint del proceso worker
│   │
│   ├── config/
│   │   ├── env.schema.ts             # Zod — la app NO arranca si falta una variable
│   │   └── configuration.ts
│   │
│   ├── common/                       # Transversal, sin lógica de negocio
│   │   ├── decorators/               # @CurrentUser @Roles @Public @IdempotencyKey
│   │   ├── guards/                   # JwtAuthGuard RolesGuard OwnershipGuard ThrottlerGuard
│   │   ├── interceptors/             # Logging Transform Timeout AuditLog
│   │   ├── filters/                  # ProblemDetailsExceptionFilter
│   │   ├── pipes/                    # ZodValidationPipe
│   │   ├── errors/                   # DomainError y subclases
│   │   ├── pagination/               # CursorPaginator
│   │   └── context/                  # AsyncLocalStorage (correlationId, actor)
│   │
│   ├── infrastructure/               # Adaptadores compartidos entre módulos
│   │   ├── prisma/                   # PrismaService + extensión de soft-delete
│   │   ├── redis/
│   │   ├── queue/                    # BullMQ (registro de colas)
│   │   ├── storage/                  # CloudinaryAdapter → StoragePort
│   │   ├── messaging/                # WhatsAppAdapter, ResendAdapter → NotificationChannelPort
│   │   ├── maps/                     # GoogleMapsAdapter → GeocodingPort, DistanceMatrixPort
│   │   └── realtime/                 # SocketIoGateway + adaptador Redis
│   │
│   └── modules/
│       ├── auth/
│       │   ├── domain/               # Password (VO), TokenFamily
│       │   ├── application/
│       │   │   ├── ports/            # UserRepositoryPort, TokenRepositoryPort, HasherPort
│       │   │   └── use-cases/        # login, refresh-token, logout, reset-password…
│       │   └── infrastructure/
│       │       ├── auth.controller.ts
│       │       ├── strategies/       # jwt.strategy.ts
│       │       └── repositories/     # prisma-user.repository.ts
│       │
│       ├── users/
│       ├── drivers/
│       │
│       ├── imports/
│       │   ├── domain/
│       │   │   ├── column-mapping.vo.ts
│       │   │   ├── import-validator.ts        # ⟵ reglas puras, 100% testeable
│       │   │   └── phone-normalizer.ts        # ⟵ E.164 Perú
│       │   ├── application/use-cases/
│       │   │   ├── parse-file.use-case.ts
│       │   │   ├── confirm-import.use-case.ts
│       │   │   └── revert-import.use-case.ts
│       │   └── infrastructure/
│       │       ├── imports.controller.ts
│       │       └── parsers/          # xlsx.parser.ts · csv.parser.ts · encoding-detector.ts
│       │
│       ├── orders/
│       │   ├── domain/
│       │   │   ├── order.entity.ts
│       │   │   ├── order-state-machine.ts     # ⟵ corazón del dominio
│       │   │   ├── tracking-token.vo.ts
│       │   │   └── events/
│       │   ├── application/
│       │   │   ├── ports/
│       │   │   └── use-cases/        # list · get · update · cancel · deliver ·
│       │   │                         # register-attempt · reschedule · bulk-assign…
│       │   └── infrastructure/
│       │       ├── orders.controller.ts
│       │       ├── public-tracking.controller.ts
│       │       ├── orders.mapper.ts           # entidad → DTO (público y privado)
│       │       └── repositories/
│       │
│       ├── routes/
│       ├── tracking/                 # gateway WS + cálculo de ETA + posiciones
│       ├── notifications/
│       │   ├── domain/templates/     # plantillas con variables tipadas
│       │   ├── application/use-cases/
│       │   └── infrastructure/
│       │       ├── processors/       # consumidores BullMQ
│       │       └── whatsapp-webhook.controller.ts
│       ├── analytics/
│       │   ├── application/use-cases/
│       │   └── infrastructure/repositories/   # SQL optimizado sobre kpi_daily
│       ├── reports/
│       │   └── infrastructure/generators/     # xlsx · pdf · csv
│       ├── settings/
│       ├── audit/
│       └── health/
│
└── test/
    ├── unit/                         # dominio y casos de uso (sin BD)
    ├── integration/                  # controllers + Postgres en Testcontainers
    ├── e2e/                          # flujos completos
    └── fixtures/                     # excels VTEX de ejemplo, factories
```

**Regla de dependencia (verificada por ESLint `no-restricted-imports` y test de arquitectura):**
`domain` no importa nada · `application` importa sólo `domain` y sus puertos · `infrastructure` puede importar todo · **ningún módulo importa el `infrastructure` de otro módulo**.

---

## 6.2 `apps/web` — Next.js 15 (App Router)

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # ThemeProvider · fuentes · providers
│   │   ├── (auth)/login/
│   │   │
│   │   ├── (admin)/                  # Layout con sidebar · middleware exige rol ADMIN
│   │   │   ├── dashboard/
│   │   │   ├── pedidos/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── importar/
│   │   │   ├── rutas/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── nueva/
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── monitoreo/            # mapa en vivo
│   │   │   ├── indicadores/
│   │   │   ├── reportes/
│   │   │   └── configuracion/
│   │   │       ├── usuarios/  motorizados/  plantillas/  columnas/  auditoria/
│   │   │
│   │   ├── (driver)/                 # Layout móvil · nav inferior · rol DRIVER
│   │   │   └── m/
│   │   │       ├── ruta/
│   │   │       ├── pedido/[id]/
│   │   │       │   ├── entregar/  intento/  reprogramar/
│   │   │       └── historial/
│   │   │
│   │   └── tracking/[token]/         # PÚBLICO · SSR · sin JS de auth
│   │       ├── page.tsx
│   │       └── opengraph-image.tsx
│   │
│   ├── features/                     # Vertical slices — un directorio por dominio
│   │   ├── auth/       ├── orders/     ├── imports/    ├── routes/
│   │   ├── tracking/   ├── analytics/  ├── reports/    └── settings/
│   │       ├── components/
│   │       ├── hooks/                 # useOrders, useOrderMutations…
│   │       ├── api/                   # cliente tipado desde @guayoyo/shared
│   │       └── schemas/               # formularios (Zod)
│   │
│   ├── components/
│   │   ├── ui/                       # re-export de @guayoyo/ui
│   │   ├── map/                       # GoogleMap · DriverMarker · RoutePolyline
│   │   ├── charts/                    # Recharts envuelto con tokens del tema
│   │   ├── data-table/                # TanStack Table: filtros · selección · export
│   │   └── layout/
│   │
│   ├── lib/
│   │   ├── api-client.ts             # fetch + refresh automático de token
│   │   ├── socket.ts                 # cliente Socket.IO con reconexión
│   │   ├── offline-queue.ts          # IndexedDB (Dexie) para el motorizado
│   │   ├── geolocation.ts            # watchPosition + Wake Lock
│   │   └── format.ts                 # fechas Lima · moneda · teléfono
│   │
│   ├── stores/                       # Zustand: sesión, tema, cola offline
│   ├── styles/globals.css            # tokens Tailwind v4 (@theme)
│   └── middleware.ts                 # protección de rutas por rol
│
├── public/
│   ├── manifest.json                 # PWA
│   ├── sw.js                         # Workbox: cache + Background Sync
│   └── icons/
└── e2e/                              # Playwright
```

**Estrategia de datos:** TanStack Query para servidor-estado (cache, revalidación, reintentos), Zustand sólo para estado de UI verdaderamente global. Server Components para el primer render de listados y de la página de tracking; Client Components sólo donde hay interactividad (mapa, formularios, tiempo real).

---

## 6.3 `packages/shared` — la clave del monorepo

```
packages/shared/src/
├── enums/           # OrderStatus, RouteStatus… (una sola definición)
├── schemas/         # Zod: order, route, import, auth, analytics
├── dtos/            # tipos derivados con z.infer
├── contracts/
│   ├── api.contract.ts        # rutas + request + response tipados
│   └── socket.contract.ts     # eventos WS tipados en ambos extremos
├── constants/       # DISTRITOS_LIMA, límites, claves de plantilla
└── utils/           # normalizePhone, maskAddress, calcCycleTimes (usado por front y back)
```

> Este paquete es lo que hace imposible que el front y el back se desincronicen: si el backend añade un estado al enum, el frontend **no compila** hasta manejarlo. Es la garantía estructural más valiosa de todo el diseño.

## 6.4 `packages/ui` — design system

```
packages/ui/src/
├── primitives/     # Button Input Select Checkbox Dialog Sheet Toast Tooltip Badge
├── patterns/       # StatCard StatusBadge EmptyState PageHeader ConfirmDialog
├── theme/          # tokens.css · ThemeProvider (claro/oscuro/sistema)
└── icons/
```
Base **shadcn/ui + Radix** (accesible, sin estilos impuestos), tematizado con los tokens de Guayoyo.

## 6.5 Variables de entorno

```bash
# ── Base ─────────────────────────────────────────────
NODE_ENV=development
API_PORT=3001
WEB_URL=http://localhost:3000
API_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000
TZ=America/Lima

# ── Datos ────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@localhost:5432/guayoyo_dispatch
REDIS_URL=redis://localhost:6379

# ── Auth ─────────────────────────────────────────────
JWT_ACCESS_SECRET=            # >= 32 chars
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# ── Google Maps ──────────────────────────────────────
GOOGLE_MAPS_SERVER_KEY=       # Geocoding + Distance Matrix (restringida por IP)
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=   # Maps JS (restringida por dominio HTTP referrer)

# ── Cloudinary ───────────────────────────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_FOLDER=guayoyo/dispatch

# ── WhatsApp Cloud API ───────────────────────────────
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=          # valida la firma X-Hub-Signature-256

# ── Email ────────────────────────────────────────────
RESEND_API_KEY=
EMAIL_FROM=despacho@midominio.com

# ── Negocio ──────────────────────────────────────────
TRACKING_BASE_URL=https://midominio.com/tracking
SLA_HOURS=24
GPS_PING_INTERVAL_MS=10000
TRACKING_LINK_TTL_HOURS=48

# ── Observabilidad ───────────────────────────────────
SENTRY_DSN=
LOG_LEVEL=info
```
Validadas con Zod al arrancar (`config/env.schema.ts`). **Fallo temprano y ruidoso** si falta cualquiera.
