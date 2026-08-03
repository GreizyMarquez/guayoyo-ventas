# 9. Riesgos técnicos

Ordenados por **impacto × probabilidad**. Los tres primeros pueden hacer fracasar el proyecto y necesitan una decisión tuya antes de escribir código.

---

## 🔴 R-01 — El GPS en segundo plano **no funciona de forma fiable en un navegador móvil**

**El riesgo más serio de todo el proyecto, y el que suele descubrirse tarde.**

`navigator.geolocation.watchPosition` deja de emitir cuando el navegador pasa a segundo plano o la pantalla se bloquea. En **iOS Safari es una limitación absoluta del sistema operativo**: no existe API web que lo evite. En Android Chrome es parcial y depende del fabricante (Xiaomi, Huawei y Samsung matan agresivamente los procesos en segundo plano).

**Consecuencia real:** el motorizado guarda el teléfono en el bolsillo, la pantalla se apaga, y el cliente ve el marcador congelado. La funcionalidad estrella del producto deja de funcionar exactamente cuando se necesita.

**Mitigaciones, en orden de eficacia:**

| # | Mitigación | Efecto | Costo |
|---|---|---|---|
| 1 | **Screen Wake Lock API** + pantalla "ruta activa" que impide el bloqueo | Alto en Android, parcial en iOS | Bajo — incluido en Fase 4 |
| 2 | Soporte para el teléfono en el manillar (medida operativa, no técnica) | Alto | Costo físico mínimo |
| 3 | Buffer en IndexedDB: al volver a primer plano, envía las posiciones acumuladas | Recupera la traza histórica, **no** el tiempo real | Bajo — incluido |
| 4 | Interpolación en el cliente: si no llegan pings, extrapola con el último rumbo y velocidad durante ≤ 2 min y marca "actualizando…" | Mejora la percepción, no el dato | Bajo — incluido |
| 5 | **Envolver la PWA con Capacitor** y usar geolocalización nativa en segundo plano | **Resuelve el problema por completo** | +2 semanas, cuentas de desarrollador Apple (99 USD/año) y Google (25 USD) |

> **Recomendación de arquitecto:** construir la PWA con las mitigaciones 1–4 (ya presupuestadas) y **diseñar la capa de geolocalización detrás de un puerto** (`GeolocationPort`) para que sustituirla por el plugin nativo de Capacitor sea cambiar una implementación, no reescribir la app. Si en el piloto la fiabilidad no alcanza, se activa la opción 5 sin refactorizar nada.
>
> **Esta es una decisión que necesito de ti antes de la Fase 4.**

---

## 🔴 R-02 — WhatsApp Cloud API: plantillas, ventana de 24 h y costos

Meta **no permite enviar mensajes libres** a un usuario que no te escribió en las últimas 24 h. Los cuatro mensajes automáticos que pides son **mensajes iniciados por la empresa** y por tanto exigen **plantillas (HSM) preaprobadas por Meta**.

**Implicaciones concretas:**
- Cada plantilla se aprueba en 1–5 días hábiles y puede ser **rechazada** (motivos frecuentes: redacción promocional, variables al inicio o al final del texto, enlaces acortados).
- **El texto no se puede cambiar sobre la marcha:** modificar una plantilla exige reaprobación. El editor de plantillas de la app sólo cambia las **variables**, no la estructura.
- Se factura por **conversación iniciada por la empresa** (categoría *utility*). Con 250 pedidos/día y ~2 mensajes por pedido, estimar el costo mensual según la tarifa vigente de Perú y confirmarlo antes de comprometerse.
- Requiere: cuenta de WhatsApp Business verificada, Business Manager con verificación de empresa (documentos legales), y un número dedicado que **no** puede estar en uso en la app normal de WhatsApp.

**Mitigaciones:**
- Iniciar el trámite de verificación y el envío de plantillas **en la Fase 2** (ver Gantt), no en la Fase 6.
- Redactar las plantillas con lenguaje transaccional puro, variables en medio de la frase y el enlace completo.
- Adaptador `NotificationChannelPort` con **respaldo automático a email (Resend)** y opción de SMS.
- **Alternativa de contingencia si la aprobación se atrasa:** enlace `wa.me` con mensaje precargado que el motorizado dispara con un toque desde su propio WhatsApp. No es automático, pero mantiene la operación en marcha y ya está contemplado en el CU-45.

---

## 🔴 R-03 — Calidad de las direcciones peruanas y costo de Google Maps

Las direcciones que exporta VTEX son texto libre escrito por el cliente. En Lima abundan `"Mz. B Lt. 14 AA.HH. Villa El Salvador"`, referencias en vez de direcciones, y distritos mal escritos. **La geocodificación automática fallará o devolverá resultados aproximados en un porcentaje relevante de los casos.**

Además, Google Maps se factura por uso: cada carga del mapa JS, cada geocodificación y cada consulta de Distance Matrix. La página de tracking es la de mayor tráfico del sistema.

**Mitigaciones:**
- Caché de geocodificación por dirección normalizada (la misma dirección nunca se geocodifica dos veces).
- `geocodeStatus` explícito + **cola de revisión manual**: el admin ve los pedidos mal geocodificados y arrastra el pin (CU-23). Las coordenadas corregidas se reutilizan para futuros pedidos de la misma dirección.
- El mapa de tracking se **carga una sola vez**; sólo se mueve el marcador. Nunca recargar el mapa en el intervalo de actualización.
- Restricción de claves: la clave de navegador por dominio HTTP referrer, la de servidor por IP.
- **Alertas de presupuesto y cuotas diarias en Google Cloud** desde el primer día — sin esto, un bucle accidental puede generar una factura de miles de dólares.
- Evaluar Mapbox o MapLibre + tiles de OpenStreetMap si el costo se dispara (el `MapPort` lo deja como cambio de adaptador).

---

## 🟡 R-04 — Conectividad móvil en ruta

Zonas sin cobertura, sótanos, edificios. Si la app requiere conexión para registrar una entrega, el motorizado se bloquea.

**Mitigación:** offline-first en la app del motorizado (Fase 4): cola en IndexedDB, Background Sync, `occurredAt` capturado en el dispositivo (no en el servidor) para que las métricas sean correctas al sincronizar, e indicador visible de acciones pendientes. Las fotos se comprimen a ≤ 1.200 px / ~200 KB antes de encolarse.

---

## 🟡 R-05 — Cambios en el formato de exportación de VTEX

VTEX puede renombrar columnas, añadirlas o cambiar el formato de fecha en cualquier actualización, sin previo aviso.

**Mitigación:** el mapeo es **por nombre de encabezado, no por posición** (reordenar columnas nunca rompe nada); mapeos versionados y guardables; detección de encabezados desconocidos con sugerencia automática; la importación nunca falla en silencio — siempre muestra vista previa antes de confirmar. Guardar el archivo original en Cloudinary permite reprocesar un lote con el mapeo corregido.

---

## 🟡 R-06 — Precisión de la hora estimada de llegada (ETA)

Una ETA optimista genera reclamos y llamadas. Una ETA con tráfico real de Google es cara si se consulta cada pocos segundos.

**Mitigación:** ETA híbrida — Distance Matrix con tráfico sólo **al llegar a cada parada** y cuando el motorizado se desvía > 500 m de lo previsto (no en cada ping), combinada con el promedio histórico por distrito. Se muestra un **rango** ("en unos 18 minutos") y un nivel de confianza; con confianza baja se degrada a "en camino" sin hora. Nunca se promete un minuto exacto.

---

## 🟡 R-07 — Privacidad, consentimiento y Ley N° 29733

Rastrear la ubicación de un trabajador y publicarla en un enlace accesible sin autenticación tiene implicaciones legales en Perú.

**Mitigación:** consentimiento explícito y registrado del motorizado (`gpsConsentAt`); GPS activo **sólo** durante la ruta y detenido automáticamente al finalizar; retención de 90 días; DTO público minimizado (sin teléfono, dirección enmascarada, sólo nombre de pila); enlace expirable; posición del motorizado presentada como *aproximada*. **Recomiendo revisión legal del aviso de privacidad y de la cláusula laboral antes del piloto** — es un riesgo de negocio, no técnico, y no puedo resolverlo desde el código.

---

## 🟡 R-08 — Concurrencia en la asignación

Dos administradores asignando pedidos a la vez pueden duplicar una asignación o pisarse mutuamente.

**Mitigación:** transacción con bloqueo (`SELECT … FOR UPDATE` sobre los pedidos seleccionados), control optimista con `updatedAt`, constraint `UNIQUE` en `route_stop.orderId` como última línea de defensa, y mensaje de error específico que enumera los pedidos en conflicto en vez de un fallo genérico.

---

## 🟢 R-09 — Volumen de pings de GPS

50 motorizados × 8 h × 1 ping/10 s ≈ 144.000 filas al día, 4,3 millones al mes.
**Mitigación:** tabla particionada por mes, escritura en lote, retención de 90 días con `DETACH`+`DROP` (instantáneo, sin `DELETE` masivo), lectura en caliente desde Redis. Ya dimensionado en el documento 1.

## 🟢 R-10 — Zona horaria
Perú es UTC-5 sin horario de verano, pero un servidor en UTC y un navegador en local producen errores de "un día de diferencia" en los reportes.
**Mitigación:** almacenar siempre en `timestamptz` UTC; convertir a `America/Lima` sólo en la capa de presentación y en las agregaciones SQL (`AT TIME ZONE 'America/Lima'`); `TZ=America/Lima` en los contenedores; tests unitarios específicos de límites de día.

## 🟢 R-11 — Bloqueo del hilo por generación de reportes
Un PDF de 30 días con gráficos bloquearía el event loop de Node.
**Mitigación:** generación en el proceso worker, job asíncrono con `jobId`, notificación al terminar y descarga por URL firmada. Ya contemplado en el documento 5, §5.8.

## 🟢 R-12 — Coexistencia con la app actual (`index.html`)
El repositorio contiene la app "Guayoyo · Ventas" en uso.
**Mitigación:** se preserva intacta en `legacy/index.html` y se documenta. **No la toco sin tu aprobación explícita.** Si sigue desplegada desde la raíz del repositorio, hay que ajustar la configuración de hosting antes de mover el archivo — señalar dónde está desplegada actualmente.

## 🟢 R-13 — Adopción por parte de los motorizados
El mejor sistema fracasa si el equipo prefiere el cuaderno.
**Mitigación:** flujo de entrega en menos de 30 segundos y 4 toques; guía imprimible de una página; estadísticas personales visibles para el motorizado; piloto de una semana en paralelo al proceso actual antes del corte.

---

## Resumen de decisiones que necesito de ti

| # | Decisión | Impacto si se posterga |
|---|---|---|
| 1 | ¿PWA con mitigaciones, o PWA + Capacitor nativo desde el inicio? (R-01) | Determina el alcance y +2 semanas |
| 2 | ¿Tienes ya cuenta de WhatsApp Business verificada y Business Manager? (R-02) | Bloquea la Fase 6; hay que iniciar el trámite ya |
| 3 | ¿Presupuesto mensual aceptable para Google Maps y WhatsApp? (R-02, R-03) | Puede cambiar el proveedor de mapas |
| 4 | ¿La app `index.html` sigue en producción desde la raíz del repositorio? (R-12) | Riesgo de romper una app en uso |
| 5 | ¿Cuántos pedidos y motorizados al día, realmente? | Confirma el dimensionamiento del documento 1 |
| 6 | ¿La firma digital es obligatoria u opcional en la entrega? | Cambia el flujo del CU-47 |
| 7 | ¿Objetivo de SLA? (asumido: 24 h) | Afecta a todos los indicadores de cumplimiento |
