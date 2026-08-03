# 10. Recomendaciones de mejora

Ordenadas por relación valor/esfuerzo. **Ninguna forma parte del alcance acordado** — son propuestas para que decidas qué incorporar.

---

## 🥇 Alto valor, bajo esfuerzo

### 1. Optimización del orden de paradas (+3 días)
Hoy el admin ordena manualmente. Un algoritmo de vecino más cercano con refinamiento 2-opt sobre la matriz de distancias reduce típicamente **15–25 % del recorrido**. Un botón "Optimizar orden" que **propone** y el admin acepta o ajusta — nunca decide por él.
> **La mejora con mayor retorno económico directo de toda esta lista:** menos kilómetros, menos combustible, más entregas por motorizado y día.

### 2. Ventanas horarias de entrega (+3 días)
Un campo `preferredWindow` en el pedido (mañana/tarde/franja específica) que la optimización respete. Reduce los intentos fallidos por "cliente ausente", que suelen ser la primera causa de fallo.

### 3. Calificación de la entrega por el cliente (+2 días)
Al entregar, la página de tracking muestra 1–5 estrellas y un comentario opcional. Alimenta el ranking de motorizados con una métrica de calidad, no sólo de velocidad. Es la métrica que falta en el conjunto que definiste: hoy mides *rapidez*, no *satisfacción*.

### 4. Notificación de proximidad (+1 día)
Cuando el motorizado está a menos de 5 minutos o es la siguiente parada, se envía un WhatsApp: *"Tu pedido llega en unos minutos"*. **Reduce drásticamente los intentos fallidos por cliente ausente** — el cliente baja a recibir. Alto impacto por muy poco código.

### 5. Reintento automático de reprogramados (+1 día)
Un pedido `REPROGRAMADO` con `rescheduledFor = hoy` aparece automáticamente en la bandeja de asignación del día. Evita que se pierdan pedidos en el limbo.

### 6. Alertas proactivas en el dashboard (+2 días)
Ya están los datos; falta la capa de detección: motorizado sin señal, ruta no iniciada a la hora esperada, pedido en riesgo de SLA, distrito con tiempo anómalo. Convierte un panel de consulta en una **herramienta de gestión activa**.

---

## 🥈 Alto valor, esfuerzo medio

### 7. App nativa con Capacitor (+2 semanas)
Resuelve definitivamente R-01 (GPS en segundo plano), añade notificaciones push nativas, escaneo de códigos de barras y cámara nativa. **Recomiendo dejar la arquitectura preparada desde el inicio** (puerto `GeolocationPort`) aunque se decida no hacerlo ahora.

### 8. Escaneo de código de barras / QR en la entrega (+4 días)
El motorizado escanea la etiqueta del paquete en vez de buscarlo en una lista. Elimina el error de entregar el paquete equivocado y acelera cada parada. Requiere que la etiqueta impresa lleve el número de pedido en código.

### 9. Prueba de entrega con OTP (+3 días)
Para pedidos de alto valor: el cliente recibe un código de 4 dígitos que debe dictar al motorizado. Elimina las disputas de "nunca me entregaron".

### 10. Panel de control del cliente por teléfono (+3 días)
Un solo enlace donde el cliente ve **todos** sus pedidos activos, no uno por enlace. Útil para clientes recurrentes.

### 11. Integración eventual con VTEX (+1–2 semanas)
Hoy importas manualmente por diseño. Cuando el volumen crezca, el webhook `order-created` de VTEX elimina el paso manual y actualiza el estado de vuelta en VTEX al entregar. **La arquitectura ya lo soporta:** sería un adaptador más que crea pedidos por el mismo caso de uso que usa la importación. No hay que rediseñar nada.

### 12. Cobro contra entrega (+1 semana)
Registro de método de pago (efectivo, Yape, Plin, POS), monto cobrado y cuadre de caja por motorizado al final de la ruta. Si tus entregas son contra entrega, **esto pasa de ser una mejora a ser un requisito**.

---

## 🥉 Estratégicas, mayor esfuerzo

### 13. Predicción de ETA con datos propios (+2 semanas)
Tras 3–6 meses de operación tendrás miles de entregas reales con hora, distrito, día de la semana y motorizado. Un modelo de regresión sencillo entrenado con tus propios datos **supera a la estimación de tráfico genérica de Google** para tu operación específica, y reduce las llamadas a Distance Matrix.

### 14. Multi-almacén / multi-sede (+1 semana)
Si operas o vas a operar desde más de un punto de despacho: entidad `warehouse`, asignación de motorizados por sede y filtros por sede en todos los indicadores. **Es mucho más barato preverlo en el modelo de datos ahora que migrarlo después** — recomiendo incluir el campo `warehouseId` desde el inicio aunque sólo haya una sede.

### 15. Portal de conciliación con el courier (+1 semana)
Si además de motorizados propios usas couriers externos (Olva, Shalom), un rol adicional con visibilidad limitada y conciliación de guías.

### 16. Modo supervisor (+4 días)
Rol intermedio entre admin y motorizado: ve y gestiona sólo su zona o su equipo. Necesario a partir de ~20 motorizados.

---

## Recomendaciones técnicas transversales

| Recomendación | Motivo |
|---|---|
| **Feature flags** desde la Fase 0 | Permite desplegar código incompleto sin exponerlo y hacer despliegues progresivos |
| **`warehouseId` en el modelo desde el día 1** | Migrar a multi-sede después es caro; el campo vacío no cuesta nada |
| **Versionar las plantillas de mensajes** | Saber qué texto exacto recibió un cliente hace seis meses, ante un reclamo |
| **Exportar los datos crudos, no sólo los agregados** | Tu equipo hará análisis en Excel que no anticipamos; dales el CSV completo |
| **Un entorno de staging con datos anonimizados** | Probar una importación real sin tocar producción |
| **Backups con restauración probada mensualmente** | Un backup que nunca se restauró no es un backup |
| **Guía impresa de 1 página para el motorizado** | La adopción se gana en el primer día de uso, no en el manual |
| **Presupuesto y cuota diaria en Google Cloud** | Evita facturas sorpresa por un bucle accidental |
| **`prefers-color-scheme` respetado + conmutador manual** | El modo oscuro real reduce el consumo de batería en pantallas OLED — relevante para un motorizado con 8 h de jornada |

---

## Lo que deliberadamente **no** recomiendo

Como arquitecto, es tan importante señalar qué **no** construir:

| No recomendado | Motivo |
|---|---|
| Microservicios | Tu volumen no lo justifica. Añade latencia de red, complejidad de despliegue y transacciones distribuidas a cambio de nada |
| Kafka / RabbitMQ | BullMQ sobre Redis cubre de sobra este throughput con una fracción del costo operativo |
| GraphQL | La API tiene consumidores conocidos y consultas predecibles. REST + OpenAPI da mejor caché HTTP y menor complejidad |
| Event Sourcing completo | El log de eventos que sí implementamos da la auditoría que necesitas sin el costo de reconstruir estado en cada lectura |
| Kubernetes | Para 2 contenedores es sobredimensionado. Docker Compose o una PaaS gestionada es la elección correcta hasta ~10× este volumen |
| Aplicación móvil nativa separada (Swift/Kotlin) | Duplica el equipo y el mantenimiento. Capacitor da el 95 % del beneficio con el 10 % del costo |
| Chat en vivo cliente–motorizado | Suena bien, genera conflictos laborales y expone al motorizado. WhatsApp con el comercio como intermediario es más seguro |

---

## Qué haría yo primero, si el presupuesto fuera limitado

1. **Notificación de proximidad** (#4) — 1 día, impacto inmediato en la tasa de entrega.
2. **Optimización de rutas** (#1) — 3 días, ahorro económico directo y medible.
3. **Calificación del cliente** (#3) — 2 días, cierra el círculo de la medición de calidad.
4. **Alertas proactivas** (#6) — 2 días, convierte el dashboard en una herramienta de gestión.

Ocho días de desarrollo adicionales para el mayor retorno del conjunto.
