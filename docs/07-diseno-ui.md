# 7. Diseño de pantallas (UX/UI)

## 7.1 Principios

1. **Una pantalla, una decisión.** El admin importa, asigna o monitorea — nunca las tres a la vez.
2. **El motorizado usa una sola mano, con guantes, bajo el sol.** Objetivos táctiles ≥ 56 px, contraste alto, cero menús anidados, la acción principal siempre abajo y fija.
3. **El cliente no lee, mira.** La página de tracking se entiende en 3 segundos sin leer una palabra: mapa, barra de progreso, número grande.
4. **El color comunica estado, nunca decora.**
5. **Nunca una pantalla en blanco:** todo estado tiene carga (skeleton), vacío (con acción) y error (con reintento).

---

## 7.2 Sistema de diseño

Partimos de la identidad de Guayoyo y la convertimos en un sistema con tokens semánticos y modo oscuro real (no una inversión de colores).

### Paleta

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--brand` | `#1B2ED4` | `#5B6BFF` | Azul Guayoyo — acción primaria, marca |
| `--accent` | `#E8341A` | `#FF5B42` | Rojo Guayoyo — énfasis, alertas críticas |
| `--bg` | `#F5F3EE` | `#0E0F13` | Fondo de página (arena Guayoyo aclarada) |
| `--surface` | `#FFFFFF` | `#191B22` | Tarjetas |
| `--surface-2` | `#F0EDE6` | `#22252F` | Sub-superficies |
| `--border` | `#DDD8CE` | `#2E323D` | |
| `--fg` | `#111111` | `#EDEDF0` | Texto principal |
| `--fg-muted` | `#6B6B64` | `#9A9AA5` | Texto secundario |

### Colores de estado (idénticos en toda la app: badge, punto del mapa, barra del gráfico)

| Estado | Color | Icono |
|---|---|---|
| Pendiente | `#8B8B94` gris | ⏳ |
| Asignado | `#1B2ED4` azul | 📋 |
| En ruta | `#F59E0B` ámbar | 🛵 |
| Intento de entrega | `#EA580C` naranja | ⚠️ |
| Reprogramado | `#7C3AED` violeta | 📅 |
| Entregado | `#16A34A` verde | ✅ |
| Cancelado | `#DC2626` rojo | ✖️ |

> Contraste verificado ≥ 4.5:1 (AA) en ambos temas. El estado **nunca** se comunica sólo por color: siempre color + icono + etiqueta (accesibilidad para daltonismo).

### Tipografía
**Syne** 700/800 para títulos y cifras grandes (identidad Guayoyo) · **Inter** 400–700 para interfaz y datos · variantes tabulares (`font-variant-numeric: tabular-nums`) en tablas y KPIs para que las cifras no bailen.

Escala: `display 40/44` · `h1 30/36` · `h2 24/30` · `h3 18/24` · `body 15/22` · `sm 13/18` · `xs 11/16`.

### Otros tokens
Espaciado base 4 px (4·8·12·16·24·32·48·64) · Radios `sm 8` `md 12` `lg 16` `xl 24` `full` · Sombras sutiles, elevación por superficie en modo oscuro · Movimiento 150 ms (micro) / 250 ms (transición), con respeto a `prefers-reduced-motion`.

### Breakpoints
`sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`. **El admin se diseña desktop-first; el motorizado y el tracking, mobile-first.**

---

## 7.3 Pantallas del Administrador

### A-01 · Login
Pantalla partida: 60 % panel de marca (azul Guayoyo, logo, patrón geométrico sutil) / 40 % formulario centrado sobre fondo arena. Email, contraseña con botón ver/ocultar, "recordarme", enlace de recuperación. Errores en línea, nunca en alerta modal. En móvil el panel de marca se reduce a una cabecera de 180 px.

### A-02 · Dashboard
```
┌────────────────────────────────────────────────────────────────────┐
│ Panel de control            [Hoy ▾] [Todos los motorizados ▾] [⬇] │
├────────────────────────────────────────────────────────────────────┤
│ ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐      │
│ │IMPORTADOS││ASIGNADOS ││ EN RUTA  ││ENTREGADOS││PENDIENTES│      │
│ │   248    ││   210    ││    87    ││   118    ││    38    │      │
│ │ ▲12% ayer││          ││ 6 motoriz││ ▲8% ayer ││ ⚠ 4 SLA  │      │
│ └──────────┘└──────────┘└──────────┘└──────────┘└──────────┘      │
│ ┌──────────┐┌──────────┐┌──────────┐┌──────────┐                  │
│ │REPROGRAM.││T. PROMEDIO││MISMO DÍA││MOTORIZ.  │                  │
│ │    12    ││  3h 42m  ││   78 %   ││   6/8    │                  │
│ └──────────┘└──────────┘└──────────┘└──────────┘                  │
├──────────────────────────────┬─────────────────────────────────────┤
│  Entregas por día (30 d)     │  Tiempo promedio por etapa          │
│  ▁▃▅▇▆▄▅▇█▆▅▄▃▅▇  (barras)   │  ██████░░ Import→Asignación  0h 48m │
│                              │  ████░░░░ Asignación→Salida  1h 12m │
│                              │  ███████░ Salida→Entrega     1h 42m │
├──────────────────────────────┼─────────────────────────────────────┤
│  Entregas por hora           │  Ranking de motorizados             │
│  (área, pico 11h–13h)        │  1 🥇 C. Ramos  42 · 2h51 · 96 %    │
│                              │  2 🥈 L. Pérez  38 · 3h10 · 94 %    │
├──────────────────────────────┴─────────────────────────────────────┤
│  Tiempo promedio por distrito (barras horizontales ordenadas)      │
├────────────────────────────────────────────────────────────────────┤
│  🔴 Alertas    · Motorizado Juan D. sin señal hace 22 min          │
│                · 4 pedidos superan el SLA de 24 h                  │
└────────────────────────────────────────────────────────────────────┘
```
Grid 12 columnas → 2 columnas en tablet → 1 en móvil. Cada tarjeta enlaza a la lista filtrada correspondiente (un KPI que no es clicable es un KPI muerto). Actualización en vivo por WebSocket con un punto verde pulsante "en vivo".

### A-03 · Importar pedidos — asistente de 3 pasos

**Paso 1 · Cargar.** Zona de arrastre grande, formatos e instrucciones visibles, historial de las últimas 5 importaciones debajo (fecha, archivo, importados/errores, autor). Si el `fileHash` coincide con un lote previo, banner ámbar: *"Este archivo ya fue importado el 03/08 a las 08:14 (248 pedidos). ¿Continuar de todas formas?"*

**Paso 2 · Mapear columnas.** Sólo aparece si algún encabezado no se reconoce. Dos columnas: campo del dominio ↔ desplegable de encabezados detectados, con sugerencia automática y una vista previa de las 3 primeras filas bajo cada selección. Botón "Guardar este mapeo como predeterminado".

**Paso 3 · Vista previa y confirmación.**
```
┌───────────────────────────────────────────────────────────────────┐
│ 248 filas   ✅ 231 válidas   ⚠ 12 advertencias   🔴 5 errores      │
│ [Todas][Válidas][Advertencias][Errores][Duplicados]  [⬇ rechazadas]│
├───┬────────┬──────────────┬───────────┬────────────────┬──────────┤
│ ☑ │ Pedido │ Cliente      │ Teléfono  │ Dirección      │ Estado   │
│ ☑ │ 501234 │ María Quispe │ +51987... │ Av. Larco 1234 │ ✅       │
│ ☑ │ 501235 │ Juan Torres  │ ⚠ vacío   │ Jr. Unión 456  │ ⚠ sin tel│
│ ☐ │ 501236 │ Ana Ríos     │ +51912... │ 🔴 vacío       │ 🔴 error │
│ ☐ │ 501237 │ Luis Vega    │ +51955... │ Av. Brasil 88  │ ⚠ ya existe│
├───┴────────┴──────────────┴───────────┴────────────────┴──────────┤
│              [Cancelar]      [Importar 243 pedidos →]             │
└───────────────────────────────────────────────────────────────────┘
```
Celdas con advertencia **editables en línea** (doble clic). Las filas con error se excluyen automáticamente. El botón indica siempre el número exacto que se va a importar.

### A-04 · Lista de pedidos
Cabecera con búsqueda global (nº, cliente, teléfono, dirección), chips de filtro rápido por estado con contador, y filtros avanzados en panel lateral (fecha, distrito, motorizado, lote, con/sin teléfono, riesgo de SLA). Tabla densa con columnas configurables y persistentes, orden por cualquier columna, selección múltiple con *shift+click* y "seleccionar los 248 filtrados".

**Barra de acción masiva flotante** al seleccionar: `12 seleccionados · [Asignar a motorizado] [Cancelar] [Exportar] [Limpiar]`.
En móvil la tabla se convierte en tarjetas apiladas con las acciones en un menú contextual.

### A-05 · Detalle del pedido
Tres columnas en desktop: **izquierda** datos del cliente y del pedido (editables en línea, con indicador de guardado); **centro** timeline vertical de eventos con icono, actor, hora y ubicación de cada uno, más la prueba de entrega (galería de fotos, firma, receptor); **derecha** mapa con el pin de la dirección (arrastrable para corregir), estado de las notificaciones enviadas y acciones (reenviar enlace, cancelar, eliminar).

### A-06 · Crear ruta / Asignación
Interfaz de dos paneles:
```
┌──────────── Pedidos sin asignar (86) ──────────┬─── Ruta en construcción ───┐
│ [Distrito ▾][Buscar…]     [Agrupar por distrito]│ Motorizado: [C. Ramos ▾]  │
│ ▾ MIRAFLORES (23)                               │ Fecha: [03/08/2026]       │
│   ☑ 501234 · María Quispe · Av. Larco 1234      │ ────────────────────────  │
│   ☑ 501235 · Juan Torres · Jr. Unión 456        │ 1 ⠿ 501234 Av. Larco      │
│ ▾ SAN ISIDRO (18)                               │ 2 ⠿ 501235 Jr. Unión      │
│   ☐ 501240 · Rosa Díaz · Av. Camino Real 90     │ 3 ⠿ 501241 Av. Arequipa   │
│                                                 │ ────────────────────────  │
│                                                 │ 3 paradas · ~12,4 km      │
│                                                 │ [Optimizar orden]         │
│                                                 │ [Guardar ruta]            │
└─────────────────────────────────────────────────┴───────────────────────────┘
                        Mapa con los pines de la ruta y la polilínea
```
Arrastrar para reordenar, contador de carga del motorizado ("6 rutas hoy · 34 paradas"), advertencia si se supera `maxStopsPerRoute`.

### A-07 · Monitoreo en vivo
Mapa a pantalla completa con panel lateral colapsable. Marcadores de motorizado con inicial y color por estado, animados entre posiciones (interpolación suave, **no** saltos), estela del recorrido del día. Al hacer clic en un motorizado: panel con su ruta, progreso (7/12), tiempo transcurrido, próxima parada y acciones (llamar, ver ruta, reasignar). Filtro por motorizado o distrito. Chip "última actualización hace 4 s".

### A-08 · Indicadores
Selector de rango (hoy, 7 d, 30 d, mes, personalizado) + comparación con período anterior. Secciones: tiempos de ciclo (las 4 métricas con su distribución p50/p90), cumplimiento SLA (donut: mismo día / ≤24 h / fuera de objetivo), por distrito (barras + mapa de calor), por motorizado (tabla ordenable + radar comparativo), series temporales. Cada gráfico exportable individualmente a PNG/CSV.

### A-09 · Reportes
Catálogo de plantillas en tarjetas (operativo diario, desempeño de motorizados, análisis por distrito, cumplimiento SLA, detalle de pedidos). Al elegir una: filtros, formato (Excel/PDF/CSV), y generación asíncrona con barra de progreso y notificación al terminar. Historial de reportes generados con enlaces de descarga.

### A-10 · Configuración
Navegación por pestañas: Usuarios · Motorizados · Plantillas de mensajes (editor con variables `{{orderNumber}}` y vista previa tipo burbuja de WhatsApp) · Mapeos de columnas · Parámetros (SLA, intervalo GPS, horario, TTL del enlace) · Auditoría · Estado del sistema.

---

## 7.4 Pantallas del Motorizado (PWA móvil)

Layout fijo: cabecera compacta (44 px) con nombre y estado de conexión · contenido con scroll · **barra de acción principal fija abajo (72 px)**. Sin sidebar, sin menús anidados.

### M-01 · Login
Formulario a pantalla completa, campos de 56 px, teclado numérico si el usuario ingresa con documento. Sesión persistente de 30 días — el motorizado **no** debe iniciar sesión cada mañana.

### M-02 · Mi ruta de hoy
```
┌─────────────────────────────────┐
│ 👤 Carlos Ramos        🟢 En línea│
├─────────────────────────────────┤
│  RUTA RUT-20260803-01           │
│  12 paradas · Miraflores        │
│  ▓▓▓▓▓▓▓░░░░░  7 de 12          │
│  Iniciada 09:12 · 3h 20m        │
├─────────────────────────────────┤
│ ▸ SIGUIENTE PARADA              │
│ ┌─────────────────────────────┐ │
│ │ 8 · Pedido 501241           │ │
│ │ Rosa Díaz                   │ │
│ │ Av. Arequipa 1234, Dpto 502 │ │
│ │ 📝 "Tocar el timbre 2 veces"│ │
│ │ [🗺 Ir] [📞 Llamar] [💬 WA]  │ │
│ └─────────────────────────────┘ │
│                                 │
│ 9 · 501242 · Miguel Ríos    ⏳  │
│ 10 · 501243 · Carmen Loo    ⏳  │
│ ── Completadas (7) ──────────▾  │
│ 7 · 501240 · Rosa Paz       ✅  │
├─────────────────────────────────┤
│      [ REGISTRAR ENTREGA ]      │  ← fija
└─────────────────────────────────┘
```
Antes de iniciar la ruta, el bloque superior se reemplaza por un botón único a todo lo ancho: **`INICIAR RUTA`**, precedido por la pantalla de permiso de GPS.

### M-03 · Permiso de ubicación
Pantalla explicativa antes de solicitar el permiso del navegador (nunca pedirlo "en frío", eso dispara el rechazo): ilustración, *"Necesitamos tu ubicación mientras estés en ruta para que los clientes puedan seguir su pedido. Se deja de compartir automáticamente al finalizar."*, botón "Permitir ubicación", enlace "¿Por qué?". Si el usuario lo deniega, instrucciones específicas por navegador para reactivarlo.

### M-04 · Detalle de la parada
Datos del cliente, dirección y referencia, observaciones destacadas, mini-mapa, y tres botones grandes: **Ir** (deep link a Google Maps) · **Llamar** · **WhatsApp**. Abajo, tres acciones de resolución: `Entregado` (verde, primaria) · `Intento fallido` (ámbar) · `Reprogramar` (violeta).

### M-05 · Registrar entrega
Flujo de un solo scroll, sin pasos: **1)** cámara — botón grande, hasta 3 fotos, miniaturas con opción de rehacer; **2)** firma — canvas a pantalla completa en horizontal con botón "Borrar"; **3)** receptor — nombre y DNI (opcional, con teclado numérico); **4)** comentario (opcional); **5)** confirmación con GPS y hora ya capturados automáticamente y mostrados en gris. Botón final `CONFIRMAR ENTREGA` fijo abajo, deshabilitado hasta cumplir los requisitos, con feedback háptico al éxito y animación de check.

### M-06 · Intento fallido
Motivo obligatorio como lista de botones grandes (cliente ausente, dirección incorrecta, cliente rechaza, zona peligrosa, sin acceso, fuera de horario, otro), foto opcional, comentario. Muestra el número de intento (`Intento 2 de 3`).

### M-07 · Reprogramar
Motivo + selector de fecha (accesos rápidos: mañana, pasado mañana, elegir) + franja horaria opcional + comentario.

### M-08 · Historial
Rutas y entregas anteriores, con estadísticas personales (entregas del mes, tiempo promedio, % cumplimiento) — el motorizado ve su propio desempeño, lo que incentiva la mejora.

### M-09 · Estado offline
Banner ámbar permanente: *"Sin conexión · 3 acciones pendientes de sincronizar"*, con detalle expandible y reintento manual. Nunca se pierde una entrega registrada.

---

## 7.5 Pantalla del Cliente

### C-01 · Seguimiento público — la pantalla más importante del producto
```
┌───────────────────────────────────┐
│   [logo Guayoyo]                  │
│   Pedido N° 501241                │
├───────────────────────────────────┤
│                                   │
│        🛵  EN CAMINO              │
│     Llega aprox. 8:15 p. m.       │
│        en unos 18 minutos         │
│                                   │
│  ●━━━━━━●━━━━━━●━━━━━━○           │
│  Recibido Asignado En camino Entregado│
├───────────────────────────────────┤
│ ┌───────────────────────────────┐ │
│ │                               │ │
│ │        [MAPA EN VIVO]         │ │
│ │      🛵 ─ ─ ─ ─→ 📍           │ │
│ │                               │ │
│ └───────────────────────────────┘ │
│  Actualizado hace 4 s  🟢         │
├───────────────────────────────────┤
│ 👤 Carlos  ·  Tu repartidor  🛵   │
│ 📦 Hay 2 entregas antes de la tuya│
├───────────────────────────────────┤
│ Dirección                         │
│ Av. Arequipa 1***, Miraflores     │
├───────────────────────────────────┤
│ Historial                         │
│ ✅ 18:42  En camino               │
│ ✅ 08:30  Asignado a un repartidor│
│ ✅ 08:05  Pedido recibido         │
├───────────────────────────────────┤
│      [💬 Contactar por WhatsApp]  │
└───────────────────────────────────┘
```

**Decisiones de UX deliberadas:**
- **Renderizado en servidor.** El cliente abre el enlace en la calle, con 3G. El contenido aparece antes de que cargue el JavaScript del mapa; el mapa se hidrata después.
- **El mapa no se recarga.** Sólo se mueve el marcador, con interpolación suave entre posiciones. Recargar el mapa cada 3 s multiplicaría por 20 la factura de Google Maps y parpadearía.
- **ETA con honestidad.** Se muestra un rango ("en unos 18 minutos"), no una hora exacta que generará reclamos. Con baja confianza se degrada a "en camino".
- **"2 entregas antes de la tuya"** es la información que más reduce las llamadas al call center: gestiona la expectativa mejor que cualquier ETA.
- **Privacidad:** dirección enmascarada, sólo el nombre de pila del motorizado, nada del resto de la ruta.
- **Estados especiales:** aún no despachado → sin mapa, mensaje "Tu pedido está siendo preparado"; entregado → mapa reemplazado por confirmación verde con hora exacta y botón de calificación; enlace expirado → página neutra.
- Compartible: `opengraph-image` dinámico para que al reenviarlo por WhatsApp se vea una tarjeta con el estado.

---

## 7.6 Accesibilidad (objetivo WCAG 2.1 AA)

Contraste ≥ 4.5:1 verificado en ambos temas · navegación completa por teclado con foco visible · HTML semántico y landmarks · `aria-live="polite"` para las actualizaciones de estado en tiempo real · etiquetas asociadas en todos los campos · errores anunciados a lectores de pantalla · `prefers-reduced-motion` respetado · objetivos táctiles ≥ 44 px (≥ 56 px en la app del motorizado) · estado nunca comunicado sólo por color · textos en español de Perú, con arquitectura preparada para i18n.
