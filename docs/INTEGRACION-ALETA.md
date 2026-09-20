# Integración con Aleta TMS — Asistente de ruta maestra

Este repositorio es un **prototipo de pantallas** (Angular 22, datos de mentira en memoria).
No reemplaza a aletadev: propone cómo debería verse y comportarse la creación de rutas
maestras. Este documento dice, cambio por cambio, **qué hace falta del lado de Aleta**
para llevarlo al sistema real.

Rama con el trabajo: `feat/asistente-ruta-maestra`.

---

## 1. Cómo correrlo

```bash
pnpm install
pnpm start          # http://localhost:4200
pnpm test           # 397 pruebas
pnpm build
```

Node 24. El asistente está en `/rutas-maestras/nueva` (botón "Nueva ruta maestra" en el
tablero). Todo el código vive en `src/app/features/master-routes/create/`.

Dónde mirar primero:

| Archivo | Qué es |
|---|---|
| `models/route-draft.model.ts` | El modelo completo del borrador, con comentarios que explican cada campo y su equivalente en Aleta. **Empezar aquí.** |
| `services/route-draft-engine.ts` | Toda la lógica pura (validaciones, tiempos, kilómetros, precios). Sin Angular: se puede leer como especificación. |
| `services/route-draft.store.ts` | El estado del asistente y los catálogos que consume. |
| `components/steps/` | Un archivo por paso de pantalla. |

---

## 2. Mapa: asistente → aletadev

| Paso del asistente | Pestaña en aletadev | Endpoints |
|---|---|---|
| 1 · Recorrido | Información general + Ciudades | `rutas-maestras`, `rm-ciudades` |
| 2 · Paradas y tiempos | Etapas | `rm-etapas` |
| 3 · Tramos (viajes que se venden) | Mapa y tramos | `rm-mapas-ruta`, `rm-mapa-pares-ciudad` |
| 4 · Operación y venta | Horarios y canales | `rm-horarios`, `rm-horario-canales` |
| 5 · Buses y tarifas | Tarifas + Configuraciones | `rm-tarjetas-tarifa`, `rm-tarifa-detalles`, `rm-configuraciones`, `rm-ciudades-omitidas-config` |
| 6 · Revisión y activación | (el estado ACTIVO de la ruta) | `rutas-maestras` |

Los catálogos (ciudades, vehículos, tipos de asiento, canales, categorías de tarifa)
salen de `/api/v1/parametric/*`. Nada de esto cambia de lugar: el asistente **reagrupa**
las mismas pestañas en un orden que sigue el trabajo real, no la estructura de la base.

---

## 3. Lo que se integra sin tocar el backend

Estos cambios son de pantalla. Usan los endpoints que ya existen, tal como están.

1. **Seis pasos en vez de pestañas sueltas.** Misma información, otro orden y otro
   momento de guardado.
2. **Tiempos relativos en las etapas.** Hoy el modal de etapa pide "hora de llegada" y
   "hora de embarque" absolutas, lo que contradice que la hora real la ponga el servicio.
   El asistente pide **cuánto se tarda** desde la parada anterior y **cuánto se espera**.
   Es el mismo `rm-etapas`: cambia lo que se le pide a la persona, y se calcula la hora
   al mostrarla.
3. **Lista de ciudades con buscador**, filtro por departamento, capital marcada y el
   motivo de lo que no se puede elegir ("ya es el origen"). Consume `parametric/ciudades`.
4. **Se quitó "Directo" de la ruta maestra.** `esTramoDirecto` se guarda siempre en
   `false`: que un servicio pare o no en las intermedias se decide **al crear el
   servicio**, no en la ruta. Ponerlo en la ruta obliga a duplicar rutas maestras.
5. **Se quitó "Uso de ruta" de la pantalla.** En aletadev, Regular / Estacional /
   Escolar no cambia precios, ventas ni servicios: es un campo que nadie sabe llenar.
   Se sigue enviando `usageTypeId = Regular` en cada tarjeta y configuración, así que la
   base no cambia. Si algún día el uso de ruta hace algo, se vuelve a mostrar.
6. **La configuración ya no se llena a mano.** En aletadev, "Configuraciones" vuelve a
   pedir mapa, horario, vehículo y uso, con nada preseleccionado, y acepta combinaciones
   que no existen (tarjeta Semicama con configuración Bus Cama). Aquí se arma sola: una
   configuración por tipo de bus de la ruta, con su mapa y horario ya elegidos.
7. **La matriz de precios solo muestra los asientos que el bus tiene.** Hoy salen 7 días
   × 5 tipos de asiento aunque el vehículo no los tenga. Se filtra con los buses del
   paso 5.
8. **Revisión antes de activar.** Aletadev activa rutas sin validar nada. El asistente
   no deja pasar a ACTIVO si falta algo obligatorio, y lista qué falta y en qué paso.
   Es una validación de cliente; conviene repetirla en el servidor.

---

## 4. Lo que necesita cambios en el backend

Cada uno está marcado con **★ Nuevo** en la pantalla, para que se note al probar.

### 4.1 Buses de la ruta (prioridad alta)

**Hoy:** la ruta solo guarda `idTipoVehiculo` dentro de la configuración. No sabe qué
buses la hacen, así que al crear un servicio hay que elegir el bus a mano entre toda la
flota.

**Propuesta:** una relación **ruta maestra ↔ vehículo**.

```
POST /api/v1/route-master/rm-vehiculos   { idRutaMaestra, idVehiculo }
GET  /api/v1/route-master/rm-vehiculos?idRutaMaestra=
DELETE /api/v1/route-master/rm-vehiculos/{id}
```

Con eso: el tipo de vehículo y los tipos de asiento **se deducen** de los buses (ya no se
eligen a mano), se permiten tipos mezclados en una ruta, un bus puede estar en varias
rutas, y al crear un servicio la lista de buses viene filtrada.

Ver `components/steps/bus-picker.component.ts` y `DraftBus` en el modelo.

### 4.2 Tramos: varios caminos en una sola ruta (prioridad alta)

**Hoy:** La Paz → Tarija "por arriba" y "por abajo" obliga a crear **dos rutas maestras**
con el mismo origen y destino. Se duplican precios, días, canales y buses; si sube la
tarifa hay que tocar las dos.

**Propuesta:** una ruta, varios **tramos** (caminos). Comparten origen, destino, días,
buses y precios; cambian solo en ciudades y paradas.

- Lo más parecido que ya existe es `rm-mapas-ruta` (varios mapas con nombre por ruta).
- **Falta lo importante:** `rm-etapas` es **una sola lista por ruta**, así que dos caminos
  no pueden tener tiempos ni kilómetros distintos. Hace falta que la etapa cuelgue del
  **mapa**, no de la ruta: agregar `idMapaRuta` a `rm-etapas` (o una tabla de etapas por
  mapa).
- El servicio debe guardar **por qué tramo va**: agregar `idMapaRuta` a `servicios`.
- Un tramo nuevo agregado a una ruta ya ACTIVA nace en BORRADOR y se aprueba aparte
  (campo `estado` en el mapa).

Además, el asistente **bloquea crear una ruta con el mismo origen y destino** que otra
existente, y ofrece abrir la ruta que ya existe para agregarle el tramo. Aletadev hoy lo
permite. Conviene validarlo también en el servidor.

Ver `DraftPath` en el modelo y `components/steps/step-route.component.ts`.

### 4.3 Precio por tipo de pasajero (prioridad media)

Las categorías de tarifa de `parametric` mezclan tres cosas distintas: canal de venta
(WEB, Agente, Predeterminado), tipo de bus (VIP, Premium, Ejecutivo) y tipo de pasajero
(Normal, Estudiante). El asistente deja en "¿Para quién es este precio?" **solo tipos de
pasajero**, porque el canal ya se elige en la configuración y el tipo de bus sale del
vehículo.

**Falta en el catálogo:** `Niño` y `Tercera edad`. Son descuentos de ley en Bolivia y hoy
no existen. Agregarlos a las categorías de tarifa.

### 4.4 Ciudades omitidas por tipo de bus (prioridad media)

`rm-ciudades-omitidas-config` ya existe dentro de la configuración, que es por tipo de
vehículo, así que **el modelo lo aguanta**. Lo que cambia es el uso: la pantalla solo
ofrece omisiones cuando la ruta tiene **dos o más tipos de bus** ("el bus cama no para en
El Alto"). Con un solo tipo, omitir una ciudad es lo mismo que apagar el viaje en el paso
3, y tener las dos formas confunde.

### 4.5 Solicitud de pueblos que faltan (prioridad baja)

El catálogo de ciudades debería traer **todos los centros poblados de Bolivia** (fuente
recomendada: INE / GeoBolivia, Censo 2012). Esa carga masiva resuelve el 95% del problema
y es lo primero que conviene hacer.

Para lo que igual falte, el prototipo incluye un flujo de solicitud: quien crea la ruta
pide el pueblo, la solicitud queda **pendiente** (no se puede usar todavía), y si es
urgente escribe a soporte por WhatsApp con el número de solicitud.

```
POST  /api/v1/parametric/solicitudes-ciudad   { nombre, departamento, municipio, referencia }
GET   /api/v1/parametric/solicitudes-ciudad?estado=PENDIENTE
PATCH /api/v1/parametric/solicitudes-ciudad/{id}   { estado: APROBADA | RECHAZADA, idCiudadDestino? }
```

Falta también la pantalla de administración (Paramétricas → Ciudades → Solicitudes) para
aprobar, rechazar o unir con una ciudad que ya existe.

El servicio del prototipo es `src/app/features/parametric/services/city-requests.service.ts`.
**Pendiente:** poner el número real de WhatsApp de soporte en `SUPPORT_WHATSAPP`.

### 4.6 Validación al activar (prioridad media)

El asistente no deja activar una ruta incompleta. Para que sirva de verdad, el servidor
debería rechazar el paso a ACTIVO si falta lo obligatorio; si no, se activa igual desde
la lista. La lista de comprobaciones está en `Engine.checks()` y `blockingChecks()`.

---

## 5. Resumen de cambios en la base

| Qué | Dónde | Tipo |
|---|---|---|
| Relación ruta ↔ vehículo | tabla nueva `rm-vehiculos` | nuevo |
| Etapas por mapa (tramo) | `idMapaRuta` en `rm-etapas` | campo nuevo |
| Tramo del servicio | `idMapaRuta` en `servicios` | campo nuevo |
| Estado del mapa (borrador/activo) | `estado` en `rm-mapas-ruta` | campo nuevo |
| Categorías Niño y Tercera edad | `parametric` categorías de tarifa | datos |
| Todas las ciudades de Bolivia | `parametric` ciudades | datos |
| Solicitudes de ciudad | tabla + endpoints nuevos | nuevo |
| Bloqueo de origen+destino repetido | validación en `rutas-maestras` | regla |
| Validación al activar | validación en `rutas-maestras` | regla |

Nada de esto rompe lo que ya existe: son campos y tablas que se agregan.

---

## 6. Lo que este prototipo todavía no hace

Para que nadie lo busque en vano:

- **No guarda nada.** Todo vive en memoria; al recargar la página se pierde.
- **Los datos son de mentira** (`features/parametric/data/parametric.mock.ts`): pocas
  ciudades, pocos buses.
- **No crea servicios.** El asistente termina en la ruta maestra; el paso siguiente
  ("Crear servicio" alimentado por la ruta: tramo, viaje, bus, hora de salida) está
  pensado pero no construido.
- **Falta el botón de precios ATT.** La idea aprobada: un botón que muestre la banda de
  precios que publica la ATT para ese destino y clase, como ayuda para llenar la tarifa;
  la empresa decide si lo deja o lo cambia. La ATT no tiene API, así que habría que
  cargar el tarifario a mano en Paramétricas.
- **Falta la pantalla de solicitudes de ciudad** (4.5).

---

## 7. Orden sugerido de trabajo

1. Cargar todas las ciudades de Bolivia y agregar Niño y Tercera edad. Es lo más barato
   y se nota de inmediato.
2. Relación ruta ↔ vehículo (4.1). Desbloquea que los asientos y el tipo de bus salgan
   solos, y que crear un servicio sea elegir de una lista corta.
3. Etapas por mapa y tramo en el servicio (4.2). Es el cambio más grande y el que evita
   la duplicación de rutas.
4. Validaciones al activar y al crear duplicadas (4.6, 4.2).
5. Solicitudes de ciudad y su pantalla de administración (4.5).

---

## 8. Convención de la marca ★ Nuevo

Todo lo que aparece en el prototipo y **no existe en aletadev** lleva una pastilla
naranja "★ Nuevo". Al pasar el mouse explica qué hace falta. Así se puede recorrer el
asistente y ver de un vistazo qué es trabajo de backend y qué es solo pantalla.

Componente: `components/new-badge.component.ts`.
