# 4. Diagramas de flujo

## 4.1 Máquina de estados del pedido

Toda transición está codificada en `domain/order-state-machine.ts`. Cualquier transición no listada lanza `InvalidStateTransitionError` — **no existe forma de saltarse un estado desde ninguna capa**.

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE : importación

    PENDIENTE --> ASIGNADO : asignar a ruta
    PENDIENTE --> CANCELADO : cancelar

    ASIGNADO --> PENDIENTE : quitar de ruta / cancelar ruta
    ASIGNADO --> EN_RUTA : motorizado inicia ruta
    ASIGNADO --> CANCELADO : cancelar

    EN_RUTA --> ENTREGADO : entrega exitosa
    EN_RUTA --> INTENTO_ENTREGA : intento fallido
    EN_RUTA --> REPROGRAMADO : reprogramar
    EN_RUTA --> CANCELADO : cancelar

    INTENTO_ENTREGA --> EN_RUTA : reintentar en la misma ruta
    INTENTO_ENTREGA --> REPROGRAMADO : reprogramar
    INTENTO_ENTREGA --> PENDIENTE : devolver a bandeja
    INTENTO_ENTREGA --> CANCELADO : cancelar

    REPROGRAMADO --> ASIGNADO : asignar a nueva ruta
    REPROGRAMADO --> CANCELADO : cancelar

    ENTREGADO --> [*]
    CANCELADO --> [*]
```

**Matriz de permisos por transición**

| Desde → Hacia | ADMIN | DRIVER | Requiere |
|---|:--:|:--:|---|
| PENDIENTE → ASIGNADO | ✅ | ❌ | motorizado + ruta |
| ASIGNADO → EN_RUTA | ✅ | ✅ | permiso GPS activo |
| EN_RUTA → ENTREGADO | ✅ | ✅ | ≥1 foto + GPS |
| EN_RUTA → INTENTO_ENTREGA | ✅ | ✅ | motivo tipificado |
| EN_RUTA → REPROGRAMADO | ✅ | ✅ | motivo + nueva fecha |
| * → CANCELADO | ✅ | ❌ | motivo |

---

## 4.2 Flujo operativo diario (extremo a extremo)

```mermaid
flowchart TD
    S(["08:00 · Admin descarga Excel de VTEX"]) --> A[Sube el archivo]
    A --> B{¿Encabezados reconocidos?}
    B -- No --> C[Configurar mapeo de columnas] --> D
    B -- Sí --> D[Validación fila a fila]
    D --> E[/Vista previa: válidas · advertencias · errores · duplicados/]
    E --> F{¿Confirmar?}
    F -- No --> A
    F -- Sí --> G[(Transacción: crear pedidos<br/>status=PENDIENTE · importedAt · trackingToken)]
    G --> H[[Job asíncrono: geocodificar direcciones]]

    G --> I[Admin filtra por distrito y selecciona pedidos]
    I --> J[Asigna a motorizado → crea ruta]
    J --> K[(status=ASIGNADO · assignedAt · route_stop con sequence)]

    K --> L([Motorizado abre la PWA y ve su ruta])
    L --> M{¿Concede permiso de GPS?}
    M -- No --> N[Pantalla explicativa · no puede iniciar] --> M
    M -- Sí --> O[Pulsa INICIAR RUTA]
    O --> P[(route=EN_PROGRESO · pedidos=EN_RUTA · dispatchedAt)]
    P --> Q[[Cola: WhatsApp con enlace de tracking a cada cliente]]
    P --> R[[GPS cada 10 s → Redis + WebSocket + lote a Postgres]]

    Q --> S1([Cliente abre el enlace])
    S1 --> T[Ve estado · mapa en vivo · ETA · entregas antes de la suya]
    R --> T

    P --> U[Motorizado llega a la parada]
    U --> V{¿Entrega exitosa?}
    V -- Sí --> W[Foto + firma + receptor + comentario]
    W --> X[(status=ENTREGADO · deliveredAt · delivery_proof)]
    X --> Y[[WhatsApp: pedido entregado]]
    V -- No --> Z{¿Reprogramar?}
    Z -- Sí --> AA[(REPROGRAMADO · rescheduledFor)] --> AB[[WhatsApp: reprogramado]]
    Z -- No --> AC[(INTENTO_ENTREGA · attempts++)] --> AD[[WhatsApp: intento de entrega]]

    X --> AE{¿Quedan paradas?}
    AA --> AE
    AC --> AE
    AE -- Sí --> U
    AE -- No --> AF[Finalizar ruta · detiene GPS]
    AF --> AG[(route=COMPLETADA)]
    AG --> AH[[Cron: recalcular kpi_daily]]
    AH --> AI([Dashboard e informes actualizados])
```

---

## 4.3 Secuencia — Importación

```mermaid
sequenceDiagram
    autonumber
    actor Adm as Administrador
    participant Web as Next.js
    participant API as NestJS
    participant Q as BullMQ
    participant DB as PostgreSQL
    participant GEO as Google Geocoding

    Adm->>Web: Arrastra archivo .xlsx
    Web->>API: POST /imports/parse (multipart)
    API->>API: Detecta codificación y separador · lee encabezados
    API->>DB: Busca column_mapping por defecto
    API->>API: Valida fila a fila · normaliza teléfonos a E.164
    API->>DB: SELECT orderNumber IN (...) → detecta duplicados existentes
    API-->>Web: { batchId, preview[], resumen, mappingSugerido }
    Web-->>Adm: Vista previa editable con semáforo por fila

    Adm->>Web: Corrige celdas y confirma
    Web->>API: POST /imports/:batchId/confirm { correcciones, omitir[] }
    API->>DB: BEGIN
    API->>DB: INSERT order[] (PENDIENTE, importedAt, trackingToken)
    API->>DB: INSERT order_event[] (IMPORTADO)
    API->>DB: UPDATE import_batch (COMPLETADO, contadores)
    API->>DB: COMMIT
    API->>Q: encolar geocode-batch(batchId)
    API-->>Web: 201 { importados, omitidos, errores }

    Q->>GEO: Geocodifica direcciones (con caché y control de cuota)
    GEO-->>Q: lat/lng + precisión
    Q->>DB: UPDATE order SET lat,lng,geocodeStatus
```

---

## 4.4 Secuencia — Inicio de ruta y notificación al cliente

```mermaid
sequenceDiagram
    autonumber
    actor Mot as Motorizado
    participant PWA as PWA
    participant API as NestJS
    participant DB as PostgreSQL
    participant R as Redis
    participant Q as BullMQ
    participant WA as WhatsApp Cloud API
    actor Cli as Cliente

    Mot->>PWA: INICIAR RUTA
    PWA->>PWA: navigator.geolocation.getCurrentPosition()
    PWA->>API: POST /routes/:id/start { lat, lng }
    API->>API: Valida: ruta suya · ASIGNADA · sin otra en progreso
    API->>DB: BEGIN
    API->>DB: UPDATE route SET status=EN_PROGRESO, startedAt
    API->>DB: UPDATE order SET status=EN_RUTA, dispatchedAt WHERE routeId=:id
    API->>DB: INSERT order_event[] (RUTA_INICIADA)
    API->>DB: INSERT notification[] (PENDIENTE, plantilla pedido_en_ruta · idempotente por UNIQUE)
    API->>DB: COMMIT
    API->>Q: encolar send-notification × N
    API-->>PWA: 200 { route, stops }
    Note over PWA: Arranca watchPosition + Wake Lock

    Q->>WA: POST /messages (plantilla aprobada + enlace)
    WA-->>Q: { messages[0].id }
    Q->>DB: UPDATE notification SET status=ENVIADO, providerMessageId
    WA-->>Cli: 📱 "Tu pedido N° 12345 salió a reparto…"

    loop cada 10 s mientras la ruta esté en progreso
        PWA->>API: WS driver:position { lat, lng, accuracy, speed }
        API->>R: SET driver:{id}:position (TTL 5 min)
        API->>API: buffer → INSERT en lote cada 30 s
        API-->>Cli: WS order:{token} → position + ETA + paradas restantes
        API-->>Mot: (admin:live) actualización del mapa global
    end
```

---

## 4.5 Secuencia — Registro de entrega (con soporte offline)

```mermaid
sequenceDiagram
    autonumber
    actor Mot as Motorizado
    participant PWA as PWA
    participant IDB as IndexedDB
    participant CL as Cloudinary
    participant API as NestJS
    participant Q as BullMQ
    actor Cli as Cliente

    Mot->>PWA: Marcar ENTREGADO
    PWA->>PWA: Cámara → foto · canvas → firma · GPS
    alt Con conexión
        PWA->>API: POST /uploads/signature
        API-->>PWA: { signature, timestamp, folder }
        PWA->>CL: Upload directo (foto + firma)
        CL-->>PWA: { public_id, secure_url }
        PWA->>API: POST /orders/:id/deliver { fotos, firma, receptor, gps }
        API->>API: Valida transición EN_RUTA → ENTREGADO
        API->>API: TX: order + order_event + delivery_proof + route_stop + notification
        API->>Q: encolar notificación "entregado"
        API-->>PWA: 200
        Q-->>Cli: 📱 "Tu pedido fue entregado a las 14:32"
    else Sin conexión
        PWA->>IDB: Encola acción + blobs
        PWA-->>Mot: "Guardado · se sincronizará al recuperar señal"
        Note over PWA,IDB: Background Sync reintenta al reconectar
    end
```

---

## 4.6 Secuencia — Página pública de tracking

```mermaid
sequenceDiagram
    autonumber
    actor Cli as Cliente
    participant Web as Next.js (RSC)
    participant API as NestJS
    participant R as Redis
    participant DB as PostgreSQL

    Cli->>Web: GET /tracking/{token}
    Web->>API: GET /public/tracking/{token}
    API->>API: Rate-limit por IP · valida token y expiración
    API->>DB: order + route + stop + eventos (proyección mínima)
    API->>R: GET driver:{id}:position
    API->>API: Calcula ETA y paradas restantes antes de la suya
    API-->>Web: DTO público (sin teléfono, dirección enmascarada)
    Web-->>Cli: HTML renderizado en servidor (rápido en 4G)

    Cli->>API: WS connect → join room order:{token}
    loop mientras status = EN_RUTA
        API-->>Cli: position · eta · stopsAhead · statusChanged
    end

    alt WebSocket no disponible
        loop cada 10 s
            Cli->>API: GET /public/tracking/{token}
            API-->>Cli: mismo DTO
        end
    end
```

---

## 4.7 Flujo de notificaciones (con reintentos e idempotencia)

```mermaid
flowchart LR
    A[Cambio de estado] --> B[(INSERT notification<br/>UNIQUE orderId+plantilla+canal)]
    B -->|conflicto| B2[Ya existe → no reenvía] --> Z([Fin])
    B --> C[[Encolar en BullMQ]]
    C --> D{¿Teléfono E.164 válido?}
    D -- No --> E[status=DESCARTADO<br/>Alerta en dashboard] --> Z
    D -- Sí --> F[POST WhatsApp Cloud API]
    F --> G{¿Respuesta OK?}
    G -- Sí --> H[status=ENVIADO + providerMessageId]
    H --> I[[Webhook de Meta]] --> J[status=ENTREGADO / LEIDO] --> Z
    G -- "Error 4xx (nº inválido, plantilla no aprobada)" --> K[status=FALLIDO · sin reintento] --> L[Alerta al admin] --> Z
    G -- "Error 5xx / timeout / rate limit" --> M{¿intentos < 5?}
    M -- Sí --> N[Backoff exponencial 1m·5m·15m·1h·4h] --> F
    M -- No --> O[status=FALLIDO] --> P{¿Email disponible?}
    P -- Sí --> Q[Fallback vía Resend] --> Z
    P -- No --> L
```
