# Anexo A1 — Definición formal de los indicadores

Toda métrica se define aquí una sola vez. Frontend, backend y reportes consumen **la misma definición**, implementada en `packages/shared/utils/calcCycleTimes.ts` y en las vistas SQL de `analytics`.

## A1.1 Tiempos de ciclo

Se calculan como diferencias entre los timestamps denormalizados de `order` (ADR-004). Se expresan en segundos y se presentan como `Xh Ym`.

| Indicador | Fórmula | Se cuenta cuando |
|---|---|---|
| **T1 · Importación → Asignación** | `assignedAt − importedAt` | `assignedAt IS NOT NULL` |
| **T2 · Asignación → Salida a reparto** | `dispatchedAt − assignedAt` | `dispatchedAt IS NOT NULL` |
| **T3 · Salida → Entrega** | `deliveredAt − dispatchedAt` | `status = ENTREGADO` |
| **T4 · Total: Importación → Entrega** | `deliveredAt − importedAt` | `status = ENTREGADO` |
| **T5 · Salida → Primer intento** | `firstAttemptAt − dispatchedAt` | `firstAttemptAt IS NOT NULL` |

**Regla de agregación:** se reporta la **mediana (p50)** junto al promedio, y también p90. El promedio simple es engañoso en logística — un pedido con 3 días de retraso distorsiona la media de 200 entregas. El dashboard muestra el promedio (lo que pediste) con la mediana al lado como referencia.

**Exclusiones:** los pedidos `CANCELADO` no entran en ningún promedio de tiempo. Los `REPROGRAMADO` cuentan su tiempo total acumulado hasta la entrega final, no reiniciado.

## A1.2 Promedios por dimensión

| Indicador | Agrupación | Fuente |
|---|---|---|
| Tiempo promedio diario | `date_trunc('day', deliveredAt AT TIME ZONE 'America/Lima')` | `kpi_daily` |
| Tiempo promedio semanal | `date_trunc('week', …)` | agregación de `kpi_daily` |
| Tiempo promedio mensual | `date_trunc('month', …)` | agregación de `kpi_daily` |
| Tiempo promedio por distrito | `GROUP BY district` | `kpi_daily(district)` |
| Tiempo promedio por motorizado | `GROUP BY assignedDriverId` | `kpi_daily(driverId)` |

> Toda agregación por día usa `AT TIME ZONE 'America/Lima'`. Una entrega a las 20:30 de Lima es UTC del día siguiente; agrupar en UTC contaría mal el cierre del día (R-10).

## A1.3 Conteos operativos

| Indicador | Definición |
|---|---|
| Pedidos entregados | `COUNT(*) WHERE status = ENTREGADO` |
| Pedidos pendientes | `COUNT(*) WHERE status IN (PENDIENTE, ASIGNADO, EN_RUTA, INTENTO_ENTREGA)` |
| Pedidos reprogramados | `COUNT(*) WHERE status = REPROGRAMADO` |
| Intentos de entrega | `SUM(deliveryAttempts)` — cuenta intentos, no pedidos |
| Pedidos cancelados | `COUNT(*) WHERE status = CANCELADO` |
| Pedidos importados hoy | `COUNT(*) WHERE importedAt::date = hoy (Lima)` |
| Motorizados activos | `COUNT(DISTINCT driverId) WHERE route.status = EN_PROGRESO` |

## A1.4 Cumplimiento

| Indicador | Fórmula |
|---|---|
| **% entregas el mismo día** | `entregados con deliveredAt::date = orderDate::date (Lima) ÷ total entregados` |
| **% entregas dentro de 24 h** | `entregados con (deliveredAt − orderDate) ≤ 24 h ÷ total entregados` |
| **% fuera del tiempo objetivo** | `entregados con deliveredAt > slaDueAt ÷ total entregados` |
| **Tasa de éxito en primer intento** | `entregados con deliveryAttempts ≤ 1 ÷ total entregados` |
| **Tasa de fallo** | `(reprogramados + cancelados) ÷ total del período` |

`slaDueAt = orderDate + SLA_HOURS` (configurable, por defecto 24 h).

## A1.5 Ranking de motorizados

Tres ordenaciones independientes (nunca un índice compuesto opaco — el usuario debe entender por qué alguien es primero):

| Criterio | Métrica |
|---|---|
| **Por cantidad** | entregas completadas en el período |
| **Por rapidez** | mediana de T3 (salida → entrega), sólo con ≥ 10 entregas en el período |
| **Por cumplimiento** | `% entregas dentro del SLA` |

**Salvaguarda estadística:** un motorizado con menos de 10 entregas en el período no aparece en el ranking de rapidez ni de cumplimiento (se muestra aparte como "muestra insuficiente"). Sin esto, quien hizo 2 entregas fáciles siempre gana, el ranking pierde credibilidad y el equipo deja de confiar en él.

**Nota de diseño organizacional:** recomiendo mostrar el ranking de rapidez **junto** al de cumplimiento y, si se implementa la mejora #3, junto a la calificación del cliente. Un ranking basado sólo en velocidad incentiva conducir rápido, y eso es un riesgo real para tu equipo.

## A1.6 Frescura de los datos

| Vista | Origen | Latencia |
|---|---|---|
| Tarjetas del dashboard (hoy) | consulta directa + caché Redis 60 s | ≤ 60 s |
| Contadores en vivo (en ruta, motorizados activos) | WebSocket | tiempo real |
| Gráficos históricos | `kpi_daily` | día anterior cerrado + día en curso refrescado cada 15 min |
| Reportes exportados | consulta directa, sin caché | exacto al momento de generación |

Cada pantalla de indicadores muestra su marca de "actualizado hace X" — el usuario siempre sabe qué tan fresco es lo que está mirando.
