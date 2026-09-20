# Auditoría de la creación de ruta maestra

La ruta maestra del prototipo ya es mejor que aletadev en lo que más importa: obliga a revisar antes de activar, evita rutas duplicadas, arma sola la configuración que hoy se llena a mano, muestra en vivo lo que va a heredar cada servicio, y —sobre todo— dejó de pedir horas de reloj en la plantilla, que era la contradicción de fondo del sistema actual. Pero la auditoría, control por control, deja tres cosas en claro. **Primera: el eslabón que falta no está en ninguna pantalla, está entre pantallas.** El servicio no guarda de qué ruta maestra nació ni por qué camino va, y además calcula su hora de llegada con una fórmula propia (kilómetros ÷ 60 km/h) que ignora por completo los tiempos cargados en el paso 2. Es decir: hoy la ruta maestra le habla a un servicio que no la escucha. **Segunda: hay tres lugares donde el sistema guarda un número equivocado sin avisar** —los minutos de viaje que se recortan solos a 59, los kilómetros que quedan pegados a la ciudad equivocada al reordenar, y la lista de precios «predeterminada» que viaja a Aleta como «ninguna»—. Un dato faltante bloquea; un dato falso pasa en verde y se descubre en la ventanilla. **Tercera: el asistente solo sabe CREAR.** No sabe leer ni modificar una ruta que ya existe, y sin embargo ya tiene un botón («Agregar un tramo a RM-XX») que lleva a hacer exactamente eso. Eso es lo que hay que resolver antes de seguir agregando funciones.

---

## Cómo se ve desde un servicio

> **SERVICIO:** Nazco el lunes 22 de RM-0007. La Paz → Oruro → Cochabamba, Semicama. ¿A qué hora salgo?
>
> **RUTA MAESTRA:** Esa la eliges vos, y está bien que así sea. Yo guardo que Oruro está a +3 h 20 y Cochabamba a +7 h 05 de tu salida.
>
> **SERVICIO:** Perfecto, salgo 06:00. Pero mi pantalla dice que llego 13:45 y vos decís 13:05. ¿Cuál es?
>
> **RUTA MAESTRA:** La mía. La tuya sale de una cuenta a 60 km/h parejos que no mira mis tiempos. Cuarenta minutos de diferencia, dos pantallas del mismo sistema.
>
> **SERVICIO:** En Oruro bajan 12 pasajeros. ¿Vuelvo a vender esos asientos hasta Cochabamba?
>
> **RUTA MAESTRA:** El viaje Oruro → Cochabamba está habilitado y tiene precio. Que el asiento se libere cuando el pasajero baja no lo decido yo: eso es del inventario de asientos, y nadie comprobó todavía si existe.
>
> **SERVICIO:** ¿Con qué bus salgo y quién maneja?
>
> **RUTA MAESTRA:** Tengo tres semicama elegidos: 3049-LPZ, 3160-LPZ, 3271-LPZ. Elegí uno. Chofer no tengo, y está bien que no lo tenga… pero nadie te avisó que te toca a vos.
>
> **SERVICIO:** Última. Cuando me guarden, ¿cómo digo que nací de vos?
>
> **RUTA MAESTRA:** No podés. Solo te copian el texto «La Paz–Cochabamba». Por eso, cuando alguien apague esta ruta, el aviso «3 servicios afectados» va a contar cualquier cosa menos servicios.

---

## Paso por paso

### Paso 1 · Recorrido

**Está bien:** el selector de ciudades con buscador y motivos («origen», «ya está en el tramo»), el aviso de ruta ya existente, la idea de tramos dentro de una misma ruta, el interruptor de ruta de vuelta y que el código no se pregunte.

| Problema | Qué pasa hoy | Qué hacer |
|---|---|---|
| **Botón ⇄ (invertir origen y destino)** — no estaba ni auditado | Da vuelta la lista de ciudades y deja los km y minutos pegados a la ciudad equivocada. La Paz(0)→Oruro(200)→Cochabamba(180) queda con Cochabamba saliendo con 180 km encima. Nada lo detecta. | Usar el mismo cálculo que ya arma la ruta de vuelta, que sí reubica cada tramo. O mejor: guardar tiempos y km **por par de ciudades**, y el problema desaparece en los tres botones (invertir, subir/bajar, quitar) de una vez. |
| **Flechas ▲▼ y basurero de ciudad intermedia** | Mismo defecto. Al quitar Oruro, la ruta no queda con km de más: queda **más corta** (de 385 a 185 km) y pasa la revisión en verde. De ahí salen el precio sugerido y los informes. | No marcar «por revisar»: **vaciar** los km y minutos afectados. Un dato vacío ya bloquea la activación; un dato falso no. |
| **Cambiar el origen borra las paradas** | Al corregir la ciudad de origen se reemplaza la ciudad entera: se pierden nombre de parada, dirección, referencia, contacto y teléfono, sin una sola pregunta. | Avisar antes, o conservar las paradas cuando solo cambia la ciudad. |
| **Ruta de vuelta** | Se crea sin revisar si ya existe la ruta inversa: es el duplicado exacto que este paso promete evitar. Y copia los mismos días (una ruta que sale lunes de noche genera una vuelta el lunes, cuando en realidad vuelve el martes) y los mismos tiempos (bajada y subida no tardan igual). | Revisar el par invertido **en el momento de prender el interruptor**, no al guardar. Y que la vuelta nazca con un aviso: «los tiempos vienen copiados de RM-0042, revísalos». |
| **La alerta de duplicado es una pared** | Con duplicado no se puede abrir ningún paso **ni guardar el borrador**. Quien corrige el destino después de media hora de carga queda encerrado sin salida. | Bloquear solo al **activar**. Dejar navegar y guardar, con la alerta y el botón «Agregar un tramo a RM-XX» a la vista. Y no bloquear contra rutas archivadas ni de otro uso comercial. |
| **Nombre del tramo** | Nace «Tramo 2», numerado por cantidad: si quitás el 2 y agregás otro, vuelve a nacer «Tramo 3» y el paso 6 bloquea por nombres repetidos. | Numerar por el mayor usado. Y proponer «vía Oruro» como marca de agua cuando el tramo ya tiene intermedias, nunca escribiendo sobre lo que la persona puso. |

**Sobra:** el campo **Descripción** (se escribe, se manda y ninguna pantalla lo muestra) — con una salvedad, abajo. **«Es reversión de»** como campo manual: bien quitado.

**Falta:** decir cuál es el **tramo predeterminado** y por cuál va cada servicio; avisar que la parada «Terminal La Paz» **la inventó el sistema** y nadie la confirmó (y sale impresa en el boleto).

---

### Paso 2 · Paradas y tiempos

Es el paso con el diseño más acertado (tiempos relativos en vez de horas absolutas) y, a la vez, el que más datos guarda mal.

| Problema | Qué pasa hoy | Qué hacer |
|---|---|---|
| **El servicio no usa estos tiempos** | La pantalla de servicios calcula la llegada a 60 km/h parejos e ignora todo lo cargado aquí. Con 470 km: la ruta dice 7 h 05, el servicio dice 7 h 45. | **Lo primero de todo.** Que el servicio tome su hora de llegada de los tiempos de la ruta. Mientras esto siga así, todo lo demás de este paso es un número que ninguna pantalla de operación muestra. |
| **Minutos de viaje recortados a 59** | Quien escribe 90 ve quedar 59. Pierde media hora y la ruta anuncia una llegada falsa. | Convertir al salir del campo (90 → 1 h 30) con aviso, nunca recortar. Y poner tope a las horas, que hoy acepta 100. |
| **Embarque que viaja como espera** | El «embarque antes de salir» de la primera parada se manda a Aleta en el mismo campo que la espera de las intermedias, que **sí suma al viaje**. Con 20 min de embarque, toda ruta le queda 20 minutos corrida a Aleta respecto de lo que muestra la pantalla. | Campo propio para el embarque, o mandar 0 en la primera parada. Y poner en cero la espera de la última parada, que hoy se manda igual aunque el campo esté escondido. |
| **Un tiempo de 0 escrito a propósito** | Se guarda como «falta el dato» y traba la revisión para siempre (dos paradas en el mismo lugar, terminal y oficina de al lado). Lo mismo con los km. | Aceptar el 0 explícito como válido, distinto de vacío. |
| **La misma parada duplicada por tramo** | «Terminal La Paz» existe una vez en cada tramo. Se carga dirección, teléfono y enlace en una pestaña y en la otra queda vacío, sin aviso. Y a Aleta le llegan dos filas con datos distintos. | Partir la tarjeta en dos: **«El punto»** (dirección, referencia, mapa, contacto, teléfono — se llena una vez para todos los tramos) y **«En este tramo»** (km, minutos, espera). El paso 3 ya hace esto bien con las ciudades ocultas en web. |
| **No se pueden reordenar las paradas de una ciudad** | El orden define todo el cálculo y es intocable: la única salida es borrar y volver a crear, perdiendo dirección, contacto y tiempos. | Flechas arriba/abajo, vaciando los tiempos de las dos paradas que cambiaron de lugar. |
| **Parada principal sin explicación** | Con ella se miden los km y la hora de la ciudad, y en pantalla no se dice en ningún lado. Quien carga cree que es una etiqueta de vitrina. | Escribirlo en la misma fila. Y confirmar con Aleta que ellos midan igual: la regla «de parada principal a parada principal» la inventó el prototipo. |
| **Panel «Dirección, contacto y opciones»** | Cerrado y vacío se ve igual que cerrado y completo. Por eso nadie lo abre y los campos quedan en blanco para siempre. | Que el botón diga qué falta: «· sin dirección», o un punto de color. Es el arreglo más barato del paso. |

**Sobra:** **Código PIN** — se llena y se pierde al guardar (no se manda a Aleta). Antes de borrarlo, agregarlo al envío (una línea) para no perder datos y preguntar a Aleta si alguien lo usa. **«Llegada principal»** — nadie lo lee; esconderlo o fundirlo, pero **seguir mandándolo**, porque en Aleta esa columna ya existe y puede estar llena.

**Falta:** la **lista de paradas dentro del servicio**, con su hora ya calculada, y una columna «sube en» en el manifiesto. Es el agujero más grande: todo lo que se carga aquí se guarda y después no se ve en ninguna pantalla de la operación. El conductor no sabe a quién esperar en Patacamaya.

---

### Paso 3 · Viajes que se venden

**Está bien, y es de lo mejor del rediseño:** los viajes nacen solos del recorrido (se eliminó el «Crear mapa» de aletadev, el peor agujero del sistema actual), «Web» queda bloqueado cuando «Se vende» está apagado, y apagar un viaje no borra su precio.

| Problema | Qué pasa hoy | Qué hacer |
|---|---|---|
| **«0 km · 0 min» bajo cada viaje** | Cuando faltan tiempos del paso 2, parece un viaje de cero kilómetros. Y con 0 km el precio sugerido da el mínimo de Bs 5 para todo, callado. | «Faltan tiempos en Paradas», con enlace al paso 2. Dos mensajes distintos para km y para minutos: son campos distintos. |
| **Km con dos caminos** | El número sale siempre del **primer** camino donde existe el viaje. Peor: el precio por kilómetro mide con un camino y divide entre el total del camino principal. El precio sale mal y se ve razonable. | Un solo número, del camino más largo donde existe, diciendo de cuál es. Y corregir la división para que use el mismo camino. Es un error de plata. |
| **Nadie revisa la venta web** | El paso 6 no mira ni una vez si algún viaje tiene «Web», ni si alguna ciudad quedó oculta. Se activa una ruta que en el portal no vende nada. | Aviso en el paso 6 y conteo en el título: «12 de 15 se venden · 9 también en la web». Que el conteo mire también el canal web del paso 4, o mentirá. |
| **Tres llaves deciden la venta web y nadie dice cuál manda** | Canal web (paso 4) + interruptor «Web» del viaje + ficha de ciudad. Oruro→Cochabamba con «Web» prendido pero Oruro oculta: nadie sabe si se ve. | Definir la regla —**las tres tienen que decir que sí**— y aplicarla al guardar, no solo con el interruptor en gris. Dejarlo escrito en `docs/INTEGRACION-ALETA.md`. |
| **Apagar el recorrido completo** | El aviso del paso 6 es amarillo y **no bloquea**, mientras arriba dice «Todo listo». | Confirmación en la propia fila al apagarlo, con el texto de lo que se deja de vender. Dejarlo en amarillo (hay casos legítimos), pero con un botón «Habilitar ahora» en el aviso. |
| **Fichas de ciudad apagadas** | Una ficha gris sin texto se lee como «todavía no la elegí», no como «oculta en la web». | Agregar la palabra «oculta» o el ojo tachado. |

**Falta:** **«Solo el recorrido completo»** (la función ya está escrita, nadie la llama) y poder apagar de un golpe todo lo que sale de una ciudad —el caso real «en Oruro no tengo boletería»—. Y un **mensaje de estado inicial** cuando todavía no hay viajes.

---

### Paso 4 · Días y venta

**Está bien:** los atajos de días, la agrupación de canales, que los canales aparezcan de entrada (en aletadev solo salen si guardás y volvés a entrar) y que «Mostrar el descuento» dependa de «Permite descuentos».

| Problema | Qué pasa hoy | Qué hacer |
|---|---|---|
| **Los días de la ruta no mandan sobre el servicio** | La pantalla de editar servicio ofrece los siete días, arranca con los siete marcados y no mira nunca la ruta. Se puede dejar un servicio corriendo domingos en una ruta de lunes a viernes. | Que el servicio ofrezca **solo** los días de la ruta. Es la única regla que este paso dice tener y no se cumple. |
| **«Opera ningún día» en gris** | Se lee igual que «Opera todos los días». El prototipo ya tiene estilos de alerta y de listo en los otros pasos; este es el único que avisa en gris. | Usar los mismos estilos. Lo mismo con «0 canales habilitados». |
| **Reservas y su plazo** | Se sigue mandando «reservar hasta 30 días antes» aunque las reservas estén apagadas. | Arreglarlo **en el envío**, no borrando el número que la persona escribió. |
| **Se puede cancelar: solo sí/no** | El cajero no tiene con qué responderle a don Mario a las 07:40 para el bus de las 08:00. | La política (horas antes, porcentaje o cambio de fecha) va en **Parámetros de la empresa**, no en cada ruta: son 40 lugares donde se desincroniza. En la ruta queda el sí/no. |
| **Bloqueo telefónico** | Promete guardar un asiento y no puede: no sabe cuántas horas ni qué hacer al vencer. El asiento queda bloqueado sin plazo y el bus sale con lugares vacíos que figuraban ocupados. | Ponerle plazo, topado por la salida («N horas, o 1 hora antes de salir, lo que pase primero»). Sin plazo, sacarlo. |
| **Comisión en el chip** | El «0 %» se esconde igual que el dato vacío: Portal Web (0 %) se ve idéntico a API/OTAs (sin cargar). Son cosas muy distintas. | Mostrar siempre: «0 %» y «sin comisión cargada». |

**Sobra:** **Días alternos** — no dice desde qué día arranca, no apaga los días marcados y nadie lo revisa. **Ojo:** no mandar «no» fijo, porque puede haber rutas en producción usándolo; devolver lo que llegó y esconder el control. **Descripción del horario**: fuera de la pantalla, pero seguir mandándola vacía.

**Falta:** la **hora de cierre de venta** («la venta cierra N minutos antes»), medida **contra la salida desde la ciudad donde sube el pasajero**, no desde el origen —si no, la venta para Oruro se cierra cuatro horas antes de que el bus llegue a Oruro—. Y **desde/hasta qué fecha opera la ruta**, con la pregunta resuelta de qué pasa con los servicios que quedan fuera.

---

### Paso 5 · Buses y tarifas

**Está bien, y es el mayor avance sobre aletadev:** la ruta guarda **qué buses** la hacen (no solo el tipo), los asientos salen del plano real en vez de los 5 fijos de aletadev, la configuración se arma sola (se acabaron las combinaciones imposibles tipo tarjeta Semicama con configuración Bus Cama), y el llenado de precios por distancia ahorra el trabajo más caro de toda la carga.

| Problema | Qué pasa hoy | Qué hacer |
|---|---|---|
| **La lista predeterminada viaja como «ninguna»** | El recuadro «¿Qué precios usa cada canal?» solo aparece cuando un tipo de bus tiene **más de una** lista, y la elección solo se guarda si alguien toca el desplegable. En el caso normal, a Aleta le llega «predeterminada: ninguna» aunque en pantalla se vea una lista seleccionada. La web se queda sin precio. | Corregirlo en el traductor: usar la lista predeterminada calculada, no el valor que solo existe si alguien tocó el control. **Es el defecto más caro de este paso.** |
| **Medio bus sin precio pasa en verde** | Un viaje se da por «con precio» si **un solo** tipo de asiento lo tiene. En un bus de dos pisos (Cama abajo, Semicama arriba), si se olvida la columna Cama, el paso 6 dice «todos los tramos con precio» y deja activar. | Exigir precio en **cada** tipo de asiento ofrecido, y nombrar la columna vacía: «Bus Ejecutivo: falta el precio Cama en La Paz → Oruro». |
| **Columnas que sobreviven al bus** | Al sacar un bus de la ruta, los asientos de las listas ya creadas no se limpian: la columna Cama sigue ahí con sus precios y se manda a Aleta, aunque ningún bus de la ruta tenga asientos Cama. | Limpiar los asientos de las listas al quitar un bus. |
| **«Boleto fijo»** | Está dentro del recuadro de **una** lista, pero aplana las matrices de **todas**, sin confirmar, y al apagarlo no devuelve nada: La Paz→Oruro queda al mismo precio que La Paz→Cochabamba. | Que no destruya: guardar el precio fijo aparte y dejar la matriz intacta debajo. Al apagarlo vuelve solo y no hace falta confirmar nada. Y que sea **por tipo de bus**, que es como lo guarda Aleta. |
| **Precios por día y «Copiar a toda la semana»** | Apagar «precios por día» se queda con el lunes y borra los otros seis sin preguntar, aunque estés mirando el viernes. Copiar pisa los siete días. | Quedarse con el día que se está viendo (lo que veo es lo que queda) y un «Deshacer» a la vista. Marcar con un punto los días que ya tienen precios propios, para ver qué se va a pisar antes de apretar. |
| **«Aplicar» del ajuste masivo** | Dice «todos los precios» y solo toca el día visible. No se puede deshacer. Y redondea a dos decimales (un +10% sobre Bs 35 deja Bs 38,50) mientras el llenado por distancia redondea a 5 Bs. | Que la etiqueta diga la verdad («Subir los precios del martes»), un «Deshacer», y un solo criterio de redondeo para toda la pantalla: la ventanilla no puede cobrar centavos. |
| **«Llenar tramos vacíos» apagado sin motivo** | Se apaga por dos razones distintas (falta el precio del viaje completo, o faltan los km) y no dice cuál. Y llena un asiento y un día por vez: con 3 asientos y precios por día, 21 pasadas del mismo botón. | Decir el motivo exacto, y llenar todos los asientos elegidos de una. |
| **Configuración sin nombre** | Nombre y descripción se mandan vacíos: en la lista de aletadev quedan filas sin nombre imposibles de distinguir. | Generarlo solo, **por cada fila**: «Bus Semicama · La Paz–Cochabamba». |
| **Configuración siempre activa** | Queda en «activo» fijo, así que una ruta en BORRADOR manda configuraciones activas. | Atarlo al estado real — pero solo después de que el guardado sepa **actualizar** la configuración al activar, o una ruta guardada como borrador y activada después queda muerta. |
| **«También en RUT-XXX»** | Solo mira los borradores del asistente: un bus tomado por una ruta que no nació aquí no aparece. | Que lea todas las rutas activas. Mantenerlo como aviso: compartir bus entre rutas es lo normal. |

**Sobra:** **Uso de ruta** (Regular/Estacional/Escolar) — no cambia precios ni ventas. Bien quitado de la pantalla; asegurar que el valor nunca salga vacío (hoy se elige buscando el texto «Regular» y puede no encontrarlo).

**Falta:** aviso de **precio incoherente** (un tramo corto más caro que el largo que lo contiene, o la suma de los tramos que no coincide con el viaje completo) — es el error de tipeo que más plata cuesta y se calcula con datos que ya están. Y avisar del **bus «(sin plano)»**, sin bloquear.

---

### Paso 6 · Revisión y activación

**Está bien, y es la respuesta directa al peor hallazgo de aletadev** (allá se activa una ruta sin validar nada): la lista de verificación, la casilla de aprobación manual y que activar sea un acto explícito.

| Problema | Qué pasa hoy | Qué hacer |
|---|---|---|
| **Se piden precios de viajes que el bus no puede hacer** | La revisión exige precio para **todos** los viajes habilitados sin mirar las omisiones. Si el Semicama no para en Oruro, igual te pide el precio Semicama de La Paz→Oruro, y una vez puesto se pone verde. Ese Bs 60 es el pasaje que deja al pasajero en la terminal. | Que la omisión apague esa celda («Semicama no para en Oruro») y que el rojo salte solo cuando **ningún** tipo de bus puede hacer ese viaje. Es la contradicción más grave del paso. |
| **«Todo listo para activar» con avisos pendientes** | El cartel solo mira los bloqueos: dice «Todo listo» aunque el viaje principal esté apagado y haya paradas omitidas. | «Listo para activar · 2 cosas por confirmar». |
| **Los problemas de paradas salen de a uno** | Sin parada, sin nombre y sin principal están encadenados: arreglás uno y recién aparece el siguiente. Con 12 paradas son tres viajes de ida y vuelta por tramo. | Mostrar los tres juntos. Es el arreglo más rentable del paso. |
| **«Corregir» lleva al inicio del paso** | Con 12 paradas hay que buscar a tanteo cuál falla, aunque cada punto ya tiene su identificador. | Que cada punto rojo lleve a su ciudad, parada o lista. |
| **Salir borra todo** | El enlace «← Rutas maestras» no pregunta nada, y el «atrás» del navegador tampoco. Y los borradores viven solo en memoria: un F5 o un corte de luz en la terminal los borra todos. | Preguntar al salir («Guardar · Salir sin guardar · Quedarme») **y** guardado automático. Lo segundo es lo que de verdad salva la media hora. |
| **«Guardar borrador» te saca del asistente** | Los dos botones guardan **y navegan** a la lista. Apretarlo en el paso 3 para no perder lo cargado te expulsa sin avisar. | Que guarde y se quede, con un aviso. Si hay que salir, que el botón lo diga: «Guardar y salir». Dejar los dos botones. |
| **Km solo en amarillo** | Un km faltante no bloquea, pero no queda vacío: **se suma como cero**, así que el total sale más corto y creíble. De ahí salen el precio sugerido y los informes. | Bloqueante para el km de cada **viaje habilitado**; amarillo para los tramos intermedios. Y no mostrar un total parcial: «km incompletos». |
| **Aviso doble de paradas omitidas** | Se muestran dos renglones ámbar con la misma etiqueta, y el segundo vuelve a contar las omisiones huérfanas que el primero ya contó. | Restar las huérfanas del conteo y dar a cada punto una etiqueta distinta. Y limpiar la omisión sola cuando se saca el último bus de ese tipo. |
| **La explicación se apaga para siempre** | El recuadro «Lo heredan los servicios» —que dice la frase clave para quien viene de aletadev— se cierra con «Entendido» y queda cerrado **en todas las rutas futuras**, en esa computadora. En la máquina compartida de la terminal, el primero que lo cierra se lo esconde a todos. | Que vuelva por lo menos en cada ruta nueva, y guardarlo por usuario, no por navegador. |

**Falta:** un botón **«Crear el primer servicio con esta ruta»** al terminar. Activar no vende nada: recién el servicio vende, y hoy el asistente te deja en la lista sin camino. Que no viva en un aviso de 7 segundos.

---

### Armazón y lista de rutas

| Problema | Qué hacer |
|---|---|
| **En celular y tablet el asistente se queda mudo.** Cuatro reglas de estilo esconden el resumen de una línea de cada paso, el motivo por el que «Siguiente» está apagado y hasta la palabra «Siguiente:». En la computadora del mostrador queda una tira con seis números y un botón gris. | Que ninguna explicación se esconda por falta de ancho: que envuelva en dos líneas. **Una sola tarea, alta prioridad.** |
| **El código RM-15 se calcula en el navegador.** Dos encargados que abran el asistente la misma tarde reciben el mismo número, y el segundo que guarda **pisa** la ruta del primero sin aviso. | Que el código lo dé el servidor al guardar. Mientras tanto: «el código se asigna al guardar». |
| **Botón «Editar» que a veces edita y a veces solo avisa «próxima entrega»**, viéndose idéntico. Y tras recargar la página, **todas** las rutas muestran el aviso. | «Continuar borrador» cuando hay borrador, «Editar» cuando no, apagado con el motivo cuando no se puede. Y sacar a la lista el botón «Agregar tramo», que ya funciona. |
| **Las cifras del origen no coinciden entre sí.** «Rutas» sale de un número escrito a mano; «Servicios» cuenta otra cosa (ver «Lo que sobra»). | Una sola fuente para las cuatro cifras, rotuladas como totales del origen, y el conteo filtrado arriba de las tarjetas: «Mostrando 2 de 4». |
| **El interruptor de la lista enciende rutas archivadas sin revisar nada**, y en el mismo clic escribe INACTIVO en un lado y BORRADOR en otro: la misma ruta con dos estados a la vez. Al apagar en la pestaña ACTIVAS, la tarjeta desaparece y el «Deshacer» de 5 segundos queda apuntando al vacío. | Cerrar la lista de estados (tres valores: ACTIVO / INACTIVO / BORRADOR), escribir uno solo, y que la tarjeta no se esfume. |
| **«Ver Detalle» crece 360 px** y empuja todas las tarjetas de abajo; además el catálogo viene con cinco abiertas. | Que solo una esté abierta por origen y que ninguna venga abierta. |

---

## Lo que sobra

| Control | Por qué sobra | Qué hacer |
|---|---|---|
| **Descripción** (paso 1) | Se escribe, se manda y ninguna pantalla la muestra: ni la lista, ni el servicio, ni el manifiesto, ni el boleto. | Sacarla del paso 1 y seguir mandándola vacía. **Antes:** mirar qué escribieron en aletadev. Si ahí está el número de autorización de la ATT o «por la carretera antigua», no sobra: está mal ubicada y debe volver como «Nota de la ruta», visible en la tarjeta y en la revisión. |
| **«Es reversión de»** (campo manual) | Se elige a mano y se llena mal. El dato correcto lo pone solo el interruptor de ruta de vuelta. | Confirmar que no vuelva. **Ojo:** hoy se manda el **código** («RM-0007»), no el id; si la columna de Aleta es una llave, el guardado falla. |
| **Código PIN** (paso 2) | No se explica para qué sirve, no entra en ningún cálculo y **se pierde al guardar**. | Primero agregarlo al envío (una línea, para no perder datos), esconderlo, y preguntar a Aleta. Si nadie lo usa, se va. |
| **«Llegada principal»** (paso 2) | Nadie lo lee: no cambia ningún cálculo ni aparece en el servicio. | Esconderlo en «opciones avanzadas» con texto claro, pero **seguir mandándolo**: la columna ya existe en Aleta y puede estar llena en producción. |
| **Días alternos** (paso 4) | No dice desde qué día arranca, no apaga los días marcados, nadie lo revisa. Hoy no hace nada. | Esconderlo, pero **devolver el valor tal como llegó**, no mandar «no» fijo: hay rutas que pueden estar usándolo. |
| **Descripción del horario** (paso 4) | Texto libre que nadie lee ni consulta; se llenaba con lo mismo que el nombre. | Fuera de la pantalla, seguir mandando vacío. |
| **Uso de ruta** (paso 5) | No cambia precios, ventas ni servicios. Etiqueta que hay que acertar en dos lados. | Ya está bien quitado. Asegurar que el valor no salga vacío y no pedirle a Aleta que cambie el endpoint. |
| **«Crear mapa» y nombre del mapa** (paso 3) | En aletadev es el paso obligatorio del que nadie se entera, y por eso se activan rutas que no venden nada. | Confirmar que se queda afuera. **Pero** arreglar el guardado, que hoy no emite los viajes por cada camino (ver «Para los desarrolladores»). |
| **«Limpiar búsqueda»** y la **mini línea de tres puntos** del pie de la tarjeta | La primera duplica la X; la segunda dibuja siempre tres puntos tenga la ruta 2 o 13 paradas. | De la línea, dejar solo los dos puntos de las puntas, que sí llevan el color del departamento. Del enlace: si se quita uno, quitar la X y dejar el que tiene palabras. |
| **«SERVICIOS CREADOS» en la tarjeta** | **No son servicios.** El campo del que salen se llama «duplicados evitados» y contiene **pares de ciudad** (viajes vendibles), no salidas. Y el contador «Servicios» del origen suma eso mismo. | Separar en dos rótulos: «Viajes que vende» (lo que hay hoy) y «Salidas programadas» (lo que hay que traer de verdad). Hoy la única cifra que conecta plantilla con operación está contando otra cosa. |
| **«Guardar borrador» duplicado** y **«★ Nuevo» repetidas** | Se propuso quitarlos. **No se quitan:** los dos botones hacen lo mismo y esconder uno en el paso 6 es peor; y las estrellas repetidas nunca se ven juntas (son condiciones opuestas). | Dejar todo como está. Lo que sí hay que arreglar: que el botón guarde sin expulsar, y unificar el texto de las estrellas. |

---

## Lo que falta

| Qué | Por qué importa | Dónde va |
|---|---|---|
| **Que el servicio use los tiempos de la ruta** | Hoy calcula su llegada a 60 km/h parejos: 40 minutos de diferencia con lo que dice la ruta. Dos pantallas del mismo sistema, dos respuestas. | En el servicio. **Primero que todo lo demás de este informe.** |
| **El vínculo servicio ↔ ruta maestra (y tramo)** | El servicio no guarda de qué ruta nació: se empareja por nombre de ciudad. De ahí cuelgan cuatro cosas que hoy son mentira: el contador «Servicios», el aviso «3 servicios afectados», «47 pasajes dependen de este recorrido» y cualquier informe por ruta. | En el servicio (`idRutaMaestra` + `idMapaRuta`). Muy probablemente el primero **ya existe** en Aleta: confirmarlo antes de pedirlo. |
| **Horas de salida habituales de la ruta** | Es la primera pregunta del diálogo y la ruta no la contesta. Hoy los servicios se crean de a uno: 3 salidas diarias × 7 días = 21 formularios a mano, cada uno una oportunidad de equivocarse. | **No en la ruta maestra**, que es donde reaparecería la contradicción de aletadev: en una pantalla **«Programar salidas»** que reciba ruta, horas, días y rango de fechas, muestre la grilla de las 21 salidas antes de crear, y deje desmarcar. |
| **Qué se vende y qué no en cada salida (el «directo»)** | Se sacó de la ruta con el argumento de que se decide en el servicio, y el servicio no tiene ese control. Hoy **nadie puede crear una salida directa** sin duplicar la ruta entera, que es la costumbre de aletadev. | En el servicio: cada ciudad intermedia con tres estados — «para», «solo baja» (el directo nocturno real: deja gente y no recoge) y «no para» — apagando los pasajes correspondientes y recalculando la llegada. |
| **Bus y chofer de cada salida, con su capacidad real** | El tablero muestra placas y nombres inventados, y una ocupación «32 / 36» que no corresponde a ningún bus. Sin chofer no sale el bus. | En el servicio. Depende de la tabla nueva ruta ↔ vehículo; el chofer es un pedido aparte que hoy no está documentado. |
| **Qué pasa con los servicios ya creados cuando la ruta cambia** | Si se agrega Oruro a una ruta con servicios andando, o se sube el precio de Bs 60 a 70, nadie sabe si toca a los que ya tienen pasajes vendidos ni desde cuándo rige. | Al guardar cambios de una ruta activa: decir cuántos servicios dependen y **desde qué fecha** rige. Los pasajes emitidos conservan su precio. |
| **Cierre de venta antes de la salida** | Se vende a las 07:58 un asiento del bus de las 08:00 que ya está saliendo. Queja diaria. | Paso 4, medido contra la salida **desde la ciudad donde sube el pasajero**. Con excepción para el mostrador de terminal. |
| **Desde / hasta qué fecha opera la ruta, y las excepciones** | No se puede representar una ruta de temporada (escolar, Alasita, refuerzo de Carnaval): queda activa para siempre. Y **no existe el concepto de feriado**: cualquier generación masiva va a crear salidas para el Día del Peatón. | Paso 4 (vigencia) + una lista de fechas excluidas antes de construir la generación masiva. |
| **Aviso de precio incoherente** | Un tramo corto más caro que el largo que lo contiene, o la suma de los tramos que no cuadra con el viaje completo. Es el error de tipeo que más plata cuesta. | Paso 5 / revisión, en amarillo. Se calcula con datos que ya están. |
| **Bandeja de solicitudes de ciudad** | Hoy la solicitud vive en la memoria del navegador, se pierde al recargar, el número SOL-0001 se reinicia para cada persona y **no hay ninguna pantalla donde alguien la apruebe**. Y el número de WhatsApp de soporte está vacío: el único camino que funciona, tampoco funciona. | **Antes de construir nada:** cargar todos los centros poblados del INE, que borra casi todo el problema. Y preguntar primero «¿ahí se venden pasajes, o el bus solo recoge al paso?» — si solo recoge, **ya se puede** cargar como una parada más de la ciudad cercana, sin esperar a nadie. Para lo que quede: crear la ciudad como «Sugerida» en la pantalla de Ciudades que ya existe, y llenar el número de soporte. |
| **Andén o plataforma de salida** | Es lo primero que pregunta el pasajero, y hoy el despachador lo anota en una pizarra. | Paso 2, por parada; el servicio lo puede cambiar. |
| **Cupo de asientos por viaje** | 40 pasajes a Bs 60 hasta Oruro llenan el bus y matan la venta de Bs 120 a Cochabamba. **No** va en la ruta maestra: el control real es por tiempo («los tramos cortos se abren 4 horas antes») y depende del inventario de asientos numerados. | Decisión aparte, sobre la **salida**, no sobre la plantilla. |

---

## Lo que evaluamos y descartamos

Estas propuestas fueron refutadas por dos o más revisiones independientes. **No entran en las recomendaciones.**

| Propuesta | Por qué se descarta |
|---|---|
| **Selector «aquí se sube / aquí se baja / las dos cosas» en cada parada** (paso 2) | Era el pedido número uno del análisis inicial. No libera ni un asiento: que el asiento del que baja en Oruro se vuelva a vender es trabajo del inventario de asientos de la venta, no de un campo en la parada. Además el selector es por parada y los viajes se venden por ciudad: una ciudad con terminal y tranca daría dos respuestas contradictorias. Y congela en la plantilla algo que en Bolivia cambia por servicio y por día. **Antes de pedir el campo, preguntar a Aleta si la venta ya libera el asiento en las ciudades intermedias.** |
| **Avisar en el paso 1 que un viaje intermedio ya se vende en otra ruta** | En Bolivia todo lo que baja del altiplano pasa por Oruro: el aviso saltaría en casi todas las rutas y nunca impediría nada. Un aviso que salta siempre se cierra sin leer. **Lo útil de la idea se conserva en otro lado:** al escribir el precio de La Paz→Oruro, mostrar al lado «RM-03 lo vende a Bs 30» — el problema real no es que dos rutas vendan el mismo viaje, es que lo vendan a dos precios sin que nadie lo decida. |
| **Aviso «faltan km y minutos» en cada ciudad del paso 1** | Ya lo dice el panel de la derecha, y una marca por ciudad estaría encendida en el 100% de las rutas nuevas (así nacen). Una pantalla roja desde el primer clic enseña a ignorar el rojo. **Sí se conserva:** una sola línea al pie de la lista, y cambiar el «0 km» del panel por «—». |
| **Texto «se venderán 3 viajes» debajo de la lista de ciudades** | El panel de la derecha ya muestra el conteo y la lista en vivo, y el riel también. Sería el mismo dato tres veces, y con 6 ciudades son 15 renglones ilegibles. **Sí se conserva:** una línea corta al agregar la ciudad, nombrando el costo verdadero («3 viajes vendibles · 1 tiempo por cargar»). |
| **Mostrar km y duración en las pestañas de tramo** | En el paso 1 esos números todavía no existen: las pestañas dirían «vía Oruro · 0 km · 0 h» para los dos caminos, o sea exactamente el cero mentiroso que la auditoría denuncia. **Sí se conserva:** mostrarlos cuando existan y, mientras tanto, «faltan tiempos». Marcar el tramo predeterminado va aparte y sí corresponde. |
| **Cambiar el contador del encabezado de departamento** en el selector de ciudades | Ese número no es decoración: es el resultado de la búsqueda, y dice si vale la pena bajar por ese grupo. Cambiarlo por «cuántas ya están en la ruta» pone un dato que casi siempre será 0 o 1 y que la fila ya muestra apagada con su motivo. El encabezado ya queda fijo al desplazarse. |
| **Sacar el enlace de WhatsApp del selector de ciudades** | En Bolivia el soporte **es** el WhatsApp, y el único momento en que hace falta es justo ese: estás armando la ruta, te falta un pueblo, no podés seguir. Llevarlo al pie de la aplicación es garantizar que nadie lo encuentre. Y el mensaje sale con el número de solicitud ya escrito: fuera de ahí, no. **Sí se conserva:** mostrarlo solo si el número está configurado — y llenarlo. |
| **Interruptor para apagar las marcas «★ Nuevo» en demos** | El cliente no ve ningún aviso interno: lo interno está en el texto escondido, no en la pastilla. Un interruptor global agrega un modo que alguien va a dejar apagado, y entonces el desarrollador de Aleta mira la pantalla y presupuesta de menos: el error que se quería evitar, por el otro lado. **Sí se conserva:** que el detalle se pueda leer tocando, porque hoy vive en un texto al pasar el mouse y en celular no se lee nunca. |
| **Cerrar las ayudas ⓘ al tocar afuera / una sola abierta a la vez** | La ayuda es un bloque que se abre debajo del campo, y lo primero que hace la persona después de leerla es hacer clic **en** el campo: se cerraría justo cuando la iba a usar. Y «una sola» hace saltar el formulario solo. **Sí se conserva:** cerrar con Escape y con un segundo clic en el mismo ⓘ. |
| **Subir a rojo el aviso de «viaje completo deshabilitado»** | Rojo significa «no se puede activar», y hay casos legítimos: autorizaciones de la ATT separadas por tramo, o rutas alimentadoras que solo mueven gente hasta el empalme. Quedarían imposibles de guardar. **Sí se conserva:** confirmación en la propia fila al apagarlo. |
| **Punto en la lista de verificación: «ya existe RM-0031»** | No se puede llegar al paso 6 con una ruta duplicada: el asistente bloquea desde el paso 1. Sería un cartel que nunca se enciende. **Sí se conserva** la otra mitad: que el **servidor** rechace el par repetido, porque dos personas pueden guardar al mismo tiempo. |
| **Punto en la lista: «esta ruta cruza la medianoche»** | La ruta maestra **no puede saberlo**: depende de la hora de salida, que pone el servicio. Afirmarlo obligaría a inventar una hora en la plantilla — el error de aletadev. **Sí se conserva:** decir el umbral («cualquier salida después de las 15:30 llega al día siguiente») y que el servicio guarde el «+1 día» junto a su hora de llegada, que hoy es un texto suelto sin fecha. |
| **Poner el precio y un servicio de ejemplo completo en el panel lateral** | La lista de verificación ya bloquea la activación si falta un precio, un bus o un día: sería un segundo lugar diciendo lo mismo, con riesgo de contradecirse. Y «el precio del viaje completo» no es un número: hay uno por asiento, por lista y por canal. **Sí se conserva:** mostrar en el panel los buses elegidos y los días —que hoy no están— y, en lugar de montos, «2 viajes sin precio». |
| **Exigir el «kilometraje total» para activar** | No existe ese campo: el total es la suma, y un tramo vacío cuenta como cero, así que se cumpliría con un número corto y creíble. **Sí se conserva, corregido:** bloquear por el km de cada **viaje habilitado**, y no mostrar totales parciales. |
| **No dejar marcar un bus «(sin plano)»** | Con el backend real **todos** los buses van a salir sin plano: no se podría crear ninguna ruta. **Sí se conserva:** avisarlo, mostrar de dónde salen los asientos asumidos, y pedir a Aleta el plano por vehículo. |
| **Poner la política de anulación y el bloqueo telefónico en cada ruta** | Es política de empresa (y en parte regulada por la ATT): en 40 rutas son 80 números que mantener y la primera que quede desfasada es un reclamo en ventanilla. **Sí se conserva:** que exista la política, en Parámetros de la empresa, y que la ruta la muestre. |
| **Un segundo plazo «hasta cuántos días antes se puede comprar»** | No se puede vender un asiento de un servicio que no existe: el horizonte de venta **es** el de generación. La propia propuesta necesitaba un aviso en el paso 6 para reconciliar la contradicción que ella misma creaba. **Sí se conserva:** mostrar «hay servicios creados hasta el 30 de noviembre» con el botón para extender. |
| **Guardar el «Entendido» en el perfil de Aleta** | Sería un servicio nuevo para recordar una preferencia de adorno. **Sí se conserva:** que se guarde por usuario y no por navegador (hoy, en la máquina compartida de la terminal, el primero que lo cierra se lo esconde a todos), y que vuelva en cada ruta nueva. |
| **Pedir los kilómetros en la solicitud de pueblo nuevo** | Los km no son del pueblo: son de cada ruta, medidos desde la parada anterior, y cambian según por dónde venga el bus. Quien pide el pueblo desde la ventanilla no los tiene y va a inventar uno. |
| **Quitar la barra de progreso** y **volver editable la hora de la simulación** | La barra es el único indicador que sobrevive en pantallas chicas (el resumen del riel está oculto ahí). Y la lista de horas del panel es una **simulación**: un campo donde uno escribe se lee como un campo que se guarda, justo la confusión que el rediseño vino a matar. **Sí se conserva:** arreglar el contador que la alimenta, y ampliar la lista de horas de ejemplo (05:00, 16:00, 23:00) para cubrir el cruce de medianoche. |

---

## Qué haría primero

1. **Que el servicio tome su hora de llegada de los tiempos de la ruta.** Hoy la calcula a 60 km/h parejos y da 40 minutos de diferencia con lo que dice la ruta maestra. Mientras esto siga así, todo lo que se carga en el paso 2 es un número que ninguna pantalla de operación muestra, y discutir si la espera de Patacamaya son 10 minutos o cero es discutir en el aire.

2. **Guardado automático y código asignado por el servidor.** Hoy nada sobrevive a recargar la página —ni el borrador en curso ni los ya guardados— y dos personas que abran el asistente la misma tarde reciben el mismo RM-15, con el segundo pisando al primero sin aviso. Esto es el piso: cuatro propuestas más («Continuar borrador», preguntar al salir, retomar, editar) se apoyan en algo que todavía no existe.

3. **Separar crear de editar.** El asistente solo sabe crear, y ya tiene un botón que lleva a tocar una ruta en producción («Agregar un tramo a RM-XX»): por ese camino se puede duplicar una ruta entera o dejarla vacía y activa. Antes de cualquier función nueva, decidir con los desarrolladores de Aleta cómo se lee una ruta existente y qué se actualiza y qué se borra al guardarla.

4. **Los tres datos que se guardan mal y en silencio.** Los minutos que se recortan a 59; los km y minutos que quedan pegados a la ciudad equivocada al reordenar, invertir o quitar una ciudad (arreglo de raíz: guardarlos por **par de ciudades**); y la lista de precios predeterminada que viaja a Aleta como «ninguna». Un dato faltante bloquea y se ve; un dato falso pasa en verde y llega a la ventanilla.

5. **Cerrar las dos mentiras del paso 6.** Que no se pida el precio de un viaje que ningún bus puede hacer (y que eso pase a rojo cuando no queda ningún bus), y que un viaje no se dé por «con precio» porque un solo tipo de asiento lo tiene. Es la pantalla que reemplazó al «activar sin validar nada» de aletadev: si miente una vez, deja de servir.

6. **Que el servicio sepa de qué ruta nació y por qué camino va.** Es el eslabón del que cuelgan cuatro cifras que hoy son inventadas. Y de paso, que el servicio herede origen, destino y kilómetros de la ruta en vez de pedirlos escritos a mano — pero **los días solo se limitan, no se congelan**, porque un servicio puede salir solo los viernes dentro de una ruta que opera toda la semana.

7. **La pantalla «Programar salidas».** Elegir ruta, camino, horas, días y rango de fechas; ver la grilla de las 21 salidas con su bus sugerido; desmarcar lo que no va; crear. Es el mayor ahorro de toda la auditoría y el destino natural del botón que falta al final del asistente. **No** meter las horas en la ruta maestra: ahí reaparece la contradicción que este rediseño vino a cerrar.

8. **Que el asistente no esconda ninguna explicación por falta de ancho.** En la computadora de la terminal desaparecen el resumen de cada paso, el motivo por el que «Siguiente» está apagado y hasta la palabra «Siguiente:». Todo lo que hace bueno a este asistente frente a aletadev es texto explicativo, y ese texto se apaga justo en las pantallas del mostrador. Es una sola corrección.

---

## Para los desarrolladores de Aleta

**Confirmar antes de programar nada (son lecturas, no código):**

1. **¿`rm-etapas` guarda tiempos relativos o horas absolutas?** El asistente manda `minutosViaje` y `minutosEspera`, pero el modal de aletadev pide «Hora de llegada» y «Hora de embarque». Si son horas, harían falta dos columnas nuevas o migrar las filas existentes — y eso **no** está en el resumen de cambios de la guía, que hoy promete que nada de lo propuesto rompe lo existente. Esta sola respuesta decide si ocho propuestas son «no toca el backend» o «no se puede hacer todavía».
2. **¿`servicios` ya tiene `idRutaMaestra`?** Es muy probable que sí (el endpoint cuelga de la ruta). Confirmarlo evita pedir un campo que ya existe.
3. **¿Qué valores acepta `rutas-maestras.estado`?** El asistente conoce dos, la lista maneja cuatro, y el traductor lo manda marcado «confirmar». Puede ni siquiera ser texto.
4. **¿Qué número de día usa Aleta?** El traductor manda lunes = 1. Si Aleta cuenta domingo = 1, toda ruta se guarda **corrida un día** — y la misma tabla se usa para el precio por día: el precio del sábado se cobraría el viernes.
5. **¿`rm-mapa-pares-ciudad` tiene campo «activo»?** Si no lo tiene, apagar un viaje en una ruta ya activa borra la fila y con ella el precio histórico.
6. **¿La venta libera el asiento cuando el pasajero baja en una ciudad intermedia?** De esta respuesta depende si hace falta algo nuevo en la ruta maestra o el trabajo está en ventas.

**Defectos del prototipo que hay que corregir antes de entregar el mapa de integración:**

- **La ciudad se guarda como nombre, no como id.** `CityOption` no lleva el id del catálogo; el traductor manda un id inventado en el navegador (`cty-…`) como `idCiudad`, y nombres de ciudad donde la API espera ids (en los viajes y en los precios). Con la API real, el alta se rechaza en el primer POST. Y la lista colapsa homónimas: de dos pueblos con el mismo nombre en departamentos distintos sobrevive uno solo — justo cuando se carguen los centros poblados del INE, que están llenos de homónimos.
- **El plan de guardado manda dos pasos vacíos.** «Viajes que se venden» y «Ciudades que no se atienden» se arman con un diccionario vacío y devuelven listas en blanco. Quien siga la guía crea la ruta, las ciudades, los mapas y las etapas… y **cero viajes vendibles**, sin ningún error. Es el agujero de aletadev reproducido dentro de nuestra propia guía.
- **Con dos tramos, la configuración apunta a un solo mapa.** `rm-configuraciones` recibe un único `idMapaRuta`, así que el segundo camino queda con paradas y sin configuración: existe, se ve, y no vende nada. La función estrella del rediseño no llega a funcionar aunque se construya todo lo demás.
- **Los ids locales no se traducen a los de Aleta.** La configuración apunta a las tarjetas de tarifa con el id inventado por el navegador; el POST devuelve otro y nadie lo reemplaza. Hace falta una tabla de equivalencias dentro del plan de guardado.
- **No hay transacción.** Son unos 12 POST en fila y un PATCH final. Si falla el octavo, queda media ruta creada y el asistente tendría que deshacer a mano. **Pedir un endpoint que reciba la ruta completa y la guarde de una** es el pedido más valioso de esta lista.
- **El plan no contempla la ruta de vuelta**, aunque el paso 6 ya se la promete al usuario. Y `esReversionDe` viaja con el **código** («RM-0007»), no con el id.
- **El orden de las ciudades sale mal con dos tramos:** se numera en el orden en que fueron apareciendo, así que los pueblos del segundo camino quedan amontonados al final.
- **El tipo de bus se resuelve comparando texto.** Si un bus dice «BUS CAMA» y el catálogo «Bus Cama», ese bus se queda sin tipo, sin asientos y sin precios, sin ningún aviso en pantalla.
- **La lista de categorías de tarifa está clavada a cuatro nombres exactos.** Cualquier categoría que la empresa cree en Paramétricas no aparecerá, y si el catálogo real las escribe distinto, la lista sale vacía y no se puede crear ningún precio.
- **Niño y Tercera edad no existen en el catálogo de Aleta.** Hoy se pueden elegir, armar los precios y activar la ruta; el POST falla después. Hace falta un bloqueo en la revisión, y que la novedad la marque el catálogo, no una lista escrita a mano.

**Cambios nuevos que hay que agregar al resumen de la guía** (hoy no figuran): la relación ruta ↔ vehículo con sus placas; `idMapaRuta` en `rm-etapas` y en `servicios`; el campo de estado en `rm-mapas-ruta`; el campo propio para los minutos de embarque; la regla de las tres llaves de la venta web; el conductor del servicio (no lo cubre la tabla de vehículos); la consulta de rutas por par origen-destino y la de servicios por ruta y por vehículo; el plano de asientos por bus. Y una decisión que ninguna pantalla puede tomar sola: **qué pasa con los pasajes ya vendidos cuando se cambia una parada, un precio o un día de una ruta activa.** Sin esa respuesta, la integración de esta pantalla no se puede cerrar.