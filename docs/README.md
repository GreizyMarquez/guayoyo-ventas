# Diseño — Sistema de Control de Despacho

**Guayoyo · Despacho** — Aplicación para el control diario de la entrega de pedidos e-commerce a motorizados.

> **Estado: DISEÑO PENDIENTE DE APROBACIÓN.**
> No se ha escrito código de aplicación. El desarrollo comienza únicamente tras la aprobación de estos documentos y la respuesta a las 7 decisiones abiertas del documento 9.

---

## Índice

| # | Documento | Contenido |
|---|---|---|
| 1 | [Arquitectura](./01-arquitectura.md) | Dimensionamiento, diagrama C4, 8 ADRs, seguridad, escalabilidad, observabilidad, despliegue |
| 2 | [Modelo de datos](./02-modelo-datos.md) | ERD, 16 tablas, enums, índices, invariantes, retención |
| 3 | [Casos de uso](./03-casos-de-uso.md) | 70+ casos de uso por actor, con precondiciones y flujos alternos |
| 4 | [Diagramas de flujo](./04-flujos.md) | Máquina de estados, flujo diario, 5 diagramas de secuencia |
| 5 | [API](./05-api.md) | ~80 endpoints REST, contrato WebSocket, DTO público |
| 6 | [Estructura de carpetas](./06-estructura-carpetas.md) | Monorepo, capas por módulo, variables de entorno |
| 7 | [Diseño de pantallas](./07-diseno-ui.md) | Sistema de diseño, 22 pantallas, accesibilidad |
| 8 | [Plan de desarrollo](./08-plan-desarrollo.md) | 9 fases, cronograma Gantt, estrategia de pruebas |
| 9 | [Riesgos técnicos](./09-riesgos.md) | 13 riesgos con mitigaciones + decisiones que requieren tu respuesta |
| 10 | [Recomendaciones](./10-recomendaciones.md) | 16 mejoras propuestas + lo que deliberadamente no recomiendo |
| A1 | [Indicadores](./A1-indicadores.md) | Definición formal y fórmula de cada KPI |

---

## Resumen ejecutivo

**Qué es.** Un sistema de control de despacho de última milla. No se integra con VTEX: el administrador importa cada mañana el Excel/CSV de pedidos pendientes, los asigna a motorizados en rutas, y desde que el motorizado inicia su ruta el cliente recibe por WhatsApp un enlace de seguimiento en tiempo real. Cada instante del proceso queda registrado para alimentar los indicadores de desempeño.

**Cómo está construido.**

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS · PWA |
| Backend | NestJS 11 · Node.js 22 · monolito modular hexagonal |
| Base de datos | PostgreSQL 16 · Prisma |
| Tiempo real | Socket.IO + adaptador Redis |
| Colas | BullMQ sobre Redis |
| Autenticación | JWT access + refresh rotativo con detección de reuso |
| Mapas | Google Maps (JS, Geocoding, Distance Matrix) |
| Almacenamiento | Cloudinary (subida directa firmada) |
| Mensajería | WhatsApp Business Cloud API · Resend |
| Infraestructura | Docker · Turborepo · GitHub Actions |

**Tres decisiones que definen el sistema:**

1. **Monolito modular, no microservicios.** El volumen real (100–1.000 pedidos/día) no justifica la complejidad; los módulos están aislados por contrato para poder separarlos el día que haga falta.
2. **Los eventos son la verdad; los timestamps del pedido son un read-model.** Toda transición escribe un evento inmutable y actualiza los timestamps denormalizados en la misma transacción. Auditoría completa + consultas de KPI instantáneas.
3. **`packages/shared` como contrato único.** Enums, esquemas Zod y eventos WebSocket se definen una vez. Si el backend añade un estado, el frontend no compila hasta manejarlo.

**Duración estimada:** 11–13 semanas (1 desarrollador) · 7–8 semanas (2 en paralelo).

---

## Antes de empezar a desarrollar

**Bloqueantes externos** — iniciar ya, tardan días o semanas y no dependen del código:

- [ ] Verificación de empresa en Meta Business Manager
- [ ] Cuenta de WhatsApp Business + número dedicado
- [ ] Envío de las 4 plantillas de mensaje a aprobación de Meta *(1–5 días hábiles, pueden rechazarse)*
- [ ] Proyecto de Google Cloud con Maps JS, Geocoding y Distance Matrix habilitados, claves restringidas y **alertas de presupuesto**
- [ ] Cuenta de Cloudinary
- [ ] Cuenta de Resend con dominio verificado (SPF/DKIM)
- [ ] Dominio y subdominios (`app.` y `api.`)
- [ ] Revisión legal del aviso de privacidad y de la cláusula de geolocalización laboral (Ley N° 29733)

**Decisiones pendientes:** las 7 preguntas al final del [documento 9](./09-riesgos.md#resumen-de-decisiones-que-necesito-de-ti).

---

## Nota sobre la aplicación actual del repositorio

Este repositorio contiene hoy `index.html` — la aplicación **"Guayoyo · Ventas"** (punto de venta, con persistencia en localStorage y Google Apps Script). Es un producto distinto y no se ve afectada por este diseño.

El plan la preserva íntegra en `legacy/index.html`. **No se moverá ni modificará sin aprobación explícita**, y antes hay que confirmar si está desplegada desde la raíz del repositorio (ver riesgo R-12).

De ella se conserva la **identidad visual** — azul `#1B2ED4`, rojo `#E8341A`, arena `#E8E4DC`, tipografías Syne e Inter — formalizada como sistema de tokens con modo claro y oscuro en el [documento 7](./07-diseno-ui.md).
