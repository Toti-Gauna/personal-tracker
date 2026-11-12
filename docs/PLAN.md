# Trazo · plan de la app

Tracker personal de Toti: el día en horas, el estudio con su propio motor de repaso, las metas de la semana al año, el entreno en pareja con Abi y el peso. PWA instalable, publicada en GitHub Pages desde `Toti-Gauna/personal-tracker`.

- **Diseño:** [canvas de Trazo](https://claude.ai/artifact/6Cc2E6aW2ViU5ikovpsRTy)
- **Roadmap de estudio:** [ruta ML + DevSecOps](https://claude.ai/artifact/9PEokku7mBLZdCFJr1zqXP)
- **Pantallas:** presentación `Trazo-pantallas.pptx` y su ZIP de imágenes (44 pantallas, 8 flujos).
- **Estado:** ola 7 (Escritorio y tablet) en revisión. Este archivo es la fuente de verdad.

---

## 1. Principios

- Se ve como un cuaderno: papel con puntos, bordes de 1 px, sin sombras y sin degradés de adorno.
- Lo hecho se marca con resaltador: la tarea completada, la sección activa y el ícono usan la misma pasada.
- Cada sección arranca con un encabezado mínimo, solo título y una línea, y abajo va el contenido.
- Es mobile first y también funciona en escritorio y tablet, con la vista **Avance** para mostrar el progreso.
- Los datos son tuyos: se guardan local y al cierre del día exportás un JSON que se commitea en `data/`.
- La meta es ser 1 % mejor cada día; el cierre siempre te dice cuánto avanzaste comparado con ayer.

## 2. Sistema de diseño

**Colores**

| Token | Oscuro | Claro |
|---|---|---|
| papel | `#0E0F10` | `#F2F3EF` |
| tinta | `#EDEDE8` | `#141515` |
| secundario (`--sub`) | `#9A9D98` | `#585C59` |
| línea | `#2C2E2D` | `#C9CCC6` |
| campo | `#18191A` | `#E7E9E4` |

**Áreas**

| Área | Oscuro | Claro |
|---|---|---|
| Ingeniería | `#6CC4EE` | `#1C7FB0` |
| Handyx | `#B3A4FF` | `#5F4BCF` |
| Eclipse | `#FF9F62` | `#C2560F` |
| Salud | `#7FD69A` | `#24854A` |
| Rutina | `#FF8E8E` | `#C23A3A` |
| Economía | `#F0D45C` | `#8A6C00` |

**Resaltador:** el color del área al 38 % sobre fondo oscuro y al 60 % sobre claro, con las puntas en bisel.

**Tipografía**

| Fuente | Uso |
|---|---|
| Archivo, ancho 125 %, peso 900 | Títulos |
| Geist | Texto |
| Geist Mono | Números y etiquetas |

**Componentes**

- Casillas de cuaderno.
- Sellos girados para los logros.
- Botón principal relleno de tinta, con radio de 6 px.
- Filas con línea fina.
- Gráficos de barras con meta en línea punteada.

**Ícono "Palotes"**

- Cuatro rayas en tinta y la quinta las tacha con resaltador amarillo, como cuando contás días.
- El dibujo es SVG (`public/trazo.svg`) y está probado a 512, 180, 96, 32 y 16 px.
- Entra en la zona segura del 80 % para la versión maskable.
- Fondo `#0B0C0D` en ambos temas: el ícono no cambia.
- Archivos: `trazo.svg`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` (180). `npm run icons` los regenera.
- Al cargar, las rayas caen una a una y el resaltador cruza (GSAP, 600 ms).

**Barra inferior**

- Íconos de trazo fino (1,7 px) con la palabra debajo.
- La sección activa va resaltada, con `aria-current`.
- Estudio muestra un contador de tarjetas pendientes (desaparece al llegar a cero o al estar en esa sección).
- Mientras corre un pomodoro aparece arriba un mini reproductor para volver o pausar.
- Cada destino mide 60 px de alto y ocupa un quinto del ancho.
- En escritorio pasa a ser una barra lateral; en tablet, un riel de íconos.

**Movimiento:** GSAP. Los cambios de sección usan Flip en 280 ms. Con movimiento reducido, todo pasa a un fundido de 150 ms.

## 3. Pantallas por flujo

**1 · Empezar el día**

1. **Instalar.** Agregás Trazo a inicio y cargás tu nombre y el de Abi. Queda guardado y no se vuelve a pedir.
2. **Buen día.** La primera apertura de cada día pregunta a qué hora te levantaste:
   - 04:00 arma el día completo, con matemática 2 h y programación 2 h.
   - 05:00 arma el día corto, con matemática 1 h 30 y programación 1 h 40. Lo de Abi queda fijo.
   - Con "Otra hora" el día corre los bloques y acorta los flexibles.
3. **Hoy.** El encabezado, el avance del día (11 de 18) y la regla de horas con las metas numeradas del 1 al 8. **Entrar en foco** te lleva al motor de esa meta:
   - una meta de estudio abre su sesión de estudio;
   - la de entreno abre la sesión de entreno;
   - el resto va a elegir pomodoro.

   **Fila de meta (ver §3 bis):** checkbox en la línea de tiempo · número · título · hora · contador. La hora va a la derecha del título.
4. **Elegir pomodoro.** Al entrar en foco elegís cómo trabajar lo que queda del bloque. Con 1 h 30 las opciones son:
   - 50/10 + 30
   - 80/10
   - 25/5 × 3
   - 90 corrido

   La elegida se puede guardar como preset del bloque.
5. **Foco.** Tiempo, avance y tareas del bloque.
6. **Pomodoros a medida.** Para crear presets y asignarlos a cada bloque.

**2 · Estudiar (cualquier frente)**

La sesión de un contenido se hace de corrido, en este orden: **Repasar → Aprender → Comprobar → Cerrar** (ver §4 quater).

1. **Estudio (2.1).** Muestra los contenidos de hoy, cada uno con su categoría: Repaso, CONAMAT, Python, la lectura. Tocás uno y ves qué falta, paso por paso:
   - **Repasar:** solo lo que vence, con tope de 20 min (cold recall o tarjetas, diciendo de qué tema; la tesis aparece solo si vence ese día);
   - **Aprender:** el capítulo, con pomodoros;
   - **Comprobar:** el test completo del capítulo recién estudiado.

   Cada paso dice si va en la app o en papel. El botón **Entrar en foco** muestra el tiempo total de esos tres pasos. Al final, la semana y tres números.
2. **Sesión de estudio (2.2).** Es el timer propio de cada meta de estudio: los tramos en orden (repaso: cold recall, tarjetas y, si vence, tesis; aprender: capítulo con pomodoro y descanso; comprobar: test), con un aviso al terminar cada uno. **No hay tramo de tesis del capítulo nuevo.** La suma de los tramos es exactamente el tiempo del botón de foco.
3. **Cómo funciona (2.3).** Los pasos explicados con sus reglas y un ejemplo real: un capítulo completo se repasa en unos 50 minutos repartidos en dos meses. Explica que la tesis llega 3 días después y por qué: dejar pasar unos días hace que reconstruirla cueste un poco y eso la fija.
4. **Actividad de estudio (2.4).** Libro, curso, práctica, video u otra, con su frente, su ritmo, los días, el bloque y si pasa por el motor de repaso.
5. **Test en papel (2.5).** La app te da los ejercicios, los resolvés en el cuaderno y cargás solo los resultados. Si preferís, le mandás la foto a Claude y pegás su corrección. Es el cierre del aprendizaje.
6. **Registrar test (2.6).** Puntaje y tipo de error: descuido, técnica, concepto o enunciado. Es el cierre del aprendizaje.
7. **Tesis (2.7).** Se abre desde el repaso del día en que vence (+3 días del capítulo). Va en la app o en papel. En la app, las líneas con `::` o `[[ ]]` se vuelven tarjetas. En papel, sacás una foto y se la mandás a Claude, que te devuelve el texto y las tarjetas.
8. **CONAMAT · unidades y tests (2.8).** Las 11 unidades de Aritmética del B1, lo que incluye cada test y el examen final de 40 ejercicios al 85 %.

**3 · Motor de repaso**

1. **Repaso de hoy (3.1).** Tiene un tope de 20 minutos y solo trae lo que vence. La sección "Hoy no toca" muestra qué se salteó y cuándo vuelve. Incluye los minutos de repaso de los próximos 7 días. La tesis de un capítulo aparece el día que vence, a continuación del cold recall, con el capítulo en el texto ("Tesis · Cap. 2, Números enteros").
2. **Cold recall (3.2).** Escribís sin mirar lo que estudiaste ayer y lo comparás punto por punto con tu tesis.
3. **Tarjetas con active recall (3.3).** Elegís escribir, decirlo en voz alta o pensarlo antes de dar vuelta la tarjeta. Trazo marca lo que faltó y sugiere la calificación.
4. **Nueva tarjeta (3.4).** Hay cinco tipos: pregunta, completar, explicar, ejercicio e inversa. Cada tarjeta lleva mazo y fuente, se ve la vista previa y está el botón "Guardar y otra".
5. **Motor (3.5).** La escalera de repasos (0 → +1 → +3 → +7 → +21 → +60), las reglas ajustables, el estado de las tarjetas, la retención por mazo, la importación de Anki y la opción de pegar bloques.

**4 · Metas**

Hay cuatro pestañas:

- **Semana:** contadores y metas manuales.
- **Mes:** calendario de calor y metas del mes.
- **Bimestre:** con nombre propio, semanas y carriles.
- **Año:** los 6 bimestres del año 1, el promedio por mes y las metas grandes.

Desde **Nueva meta** se elige el horizonte (día, semana, mes, bimestre o año), el área y el tipo: tarea, contador o número.

**5 · Entrenar.** Las pantallas son:

- Rutinas, con encabezado y semana, peso y volumen.
- Semana de entrenamiento: plantillas PPL + UL, Full body ×3 o una propia.
- Editar rutina, con antes (caminata 30 y movilidad), ejercicios y después (estirar 10 y ducha).
- **Sesión en pareja.** Timer total del bloque, ejercicios numerados y el objetivo de cada serie para cada uno. El descanso puede ser compartido o uno por persona.
- **Motor de entreno (sobrecarga progresiva).**
  - Usa doble progresión: dentro del rango sumás repeticiones (+1 en la serie más baja) y, cuando todas llegan al tope, sube el peso y volvés al mínimo.
  - El peso sube +5 kg en piernas, +2,5 kg en torso y +1 kg en aislamiento.
  - Si te estancás dos sesiones, el peso se mantiene; a la tercera baja un 10 %.
  - Hay semana de descarga cada 6 semanas.
  - Cada uno tiene sus propios rangos, pesos y récords.
- **Se terminó el tiempo.** Este modal aparece aunque estés a mitad del entreno, con tres opciones: terminar y guardar, +10 min o seguir sin límite. Lo que quedó pasa a la próxima sesión y no frena la progresión.
- **Resumen.** Muestra los récords y qué levanta cada uno la próxima vez.
- **Peso.** Peso semanal con la curva y la meta.

**6 · Cerrar y perfil**

- **Cierre** del día: primero la mejora ("Hoy mejoraste +0,75 %: 0,13 más que ayer"), después áreas, pendientes y el JSON.
- **Logro** desbloqueado.
- **Perfil:** encabezado, XP, los próximos hitos con su progreso (pesar 90 kg, 100 × 8 en las 4 series, 7 días seguidos…), 24 sellos en 4 grupos (constancia, cuerpo, estudio y trabajo) e historial.
- **Ajustes:** tema, bimestres, áreas, rutinas del día, Abi y Anki.
- **Sonidos y alarmas:** las alarmas van al calendario del teléfono con un `.ics`.

**Escritorio y tablet**

- **Escritorio (1440):** barra lateral y Avance, con racha, semana, estudio, peso, gráfico semanal, metas del año, calendario, frentes, peso y sellos. Tiene modo presentación.
- **Tablet (834):** riel de íconos y el contenido en dos columnas.
- Si una vista de escritorio o tablet muestra la lista de metas del día, usa la misma fila de §3 bis (hora a la derecha del título).

**Avisos**

- **Toasts:** aparecen arriba, duran 4 s y suenan. Avisan el fin de un tramo o de un descanso, un récord, una meta cumplida o un sello.
- **Modales:** frenan en los límites del día: fin del entreno, fin de un bloque y fin de la sesión. Siempre tienen una alternativa.
- **Con la app cerrada:** los avisos llegan por la alarma del calendario.

## 3 bis. Fila de meta: la hora a la derecha del título

Aplica a Hoy y a cualquier vista que muestre la lista de metas del día (Escritorio y Tablet; Semana solo si la muestra: hoy muestra contadores semanales, así que se revisa en la ola 4).

- Antes: hora (columna izquierda) · checkbox en la línea de tiempo · número · título · contador.
- Ahora: **checkbox en la línea de tiempo · número · título · hora · contador**. Ejemplo: `4  Acompañar a Abi y correr  08:30   0/1`.
- Se mantienen: la línea de tiempo vertical, el checkbox cuadrado con el color del área y el número de la meta.
- La hora sale de la columna izquierda y va inmediatamente a la derecha del título: Geist Mono, color `--sub`, ≈ 12 px, separada del título por 10–12 px.
- El contador (0/1, 2/3) queda pegado al borde derecho.
- Al liberar la columna izquierda, checkbox y línea de tiempo se corren a la izquierda: se conserva el margen de 16 px y número y checkbox quedan alineados entre filas.
- En la meta activa la hora sigue en el mismo lugar y se mantiene la etiqueta `AHORA · 07:00 · QUEDAN 1 H 30`.
- Si el título es largo, se corta con elipsis: la hora nunca baja de línea ni tapa el contador. A 390 px de ancho no hay desborde.
- Se revisa en modo claro y oscuro.

## 4. Motor de repaso: reglas

| Regla | Valor inicial |
|---|---|
| Tope de repaso por día; si vence más, entran las más olvidadas | 20 min |
| Cold recall al día siguiente, solo de lo nuevo; si da 85 % o más, el tema no vuelve hasta +7 | si es nuevo |
| Ejercicios espaciados más cortos si el anterior salió perfecto | sí |
| Releer si el cold recall da menos de… o si una tarjeta falla 2 veces | 70 % |
| Retención buscada (FSRS) | 90 % |
| Tarjetas nuevas por día | 15 |
| Corte de aprobación de tests | 85 % |

**Escalera de estudio**

| Cuándo | Qué | Dónde aparece |
|---|---|---|
| 0 (día que aprendés) | Aprender + test completo | Sesión del día: Repasar → Aprender → Comprobar → Cerrar |
| +1 | Cold recall (5 min) | Repaso del día |
| +3 | **Tesis** (15 min) | Repaso de ese día, a continuación del cold recall |
| +7 | Ejercicios mixtos (10 min) | Repaso del día |
| +21 | Ejercicios mixtos (8 min) | Repaso del día |
| +60 | Examen corto (12 min) | Repaso del día |

En total, unos 50 min de repaso por capítulo repartidos en dos meses. Si el test no se aprueba, hay re-test a +2 y la tesis se agenda recién al aprobar.

La escalera no cambia (0 → +1 → +3 → +7 → +21 → +60); solo la tesis deja de ser un paso del día en que se aprende. Lo que olvidás en un cold recall vuelve al día siguiente como tarjeta y el motor agenda la relectura de esas páginas. Si no vence nada, ese día no hay repaso.

## 4 bis. Mejora diaria (1 % por día)

- Cada día podés mejorar hasta un 1 %, repartido en partes iguales entre las metas del día (los bloques, no las tareas de adentro). Con 8 metas, cada una vale 0,125 %.
- Hoy muestra la mejora en curso; el Cierre la muestra primero y siempre compara con ayer: "Hoy avanzaste 0,13 más que ayer".
- El acumulado se compone día a día (1,01 × 1,01 × …) y aparece en Cierre y en la vista Avance.
- En el JSON del día: `"mejora": { "hoy": 0.75, "ayer": 0.625, "acumulado": 2.27 }`.

## 4 ter. Matemática: CONAMAT completo

CONAMAT es el primer libro y se hace entero, sus 69 capítulos y en orden:

| Bimestre | Capítulos |
|---|---|
| B1 | Aritmética 1 a 11 |
| B2 | Álgebra 1 a 12 |
| B3 | Álgebra 13 a 17 y Geometría y trigonometría 1 a 10 |
| B4 | Geometría y trigonometría 11 a 17 y Geometría analítica 1 a 7 |
| B5 | Geometría analítica 8 a 13 y Cálculo diferencial 1 a 5 |
| B6 | Cálculo integral 1 a 6 y Strang 1 a 3 |

Después siguen Strang, Blitzstein, ISL y MML en inglés (B7 a B9). Stewart queda de consulta: no se descarta ningún libro.

## 4 quater. Sesión de estudio: test completo y tesis diferida

Orden de la sesión de un contenido, de corrido:

**Repasar** (solo lo que vence, tope 20 min) → **Aprender** (capítulo, con pomodoros) → **Comprobar** (test completo del capítulo) → **Cerrar**.

- Se quitó "Fijar · tesis" del día del capítulo nuevo. La tesis del capítulo nuevo se programa automáticamente para **+3 días** y entra en el repaso de ese día, a continuación del cold recall.
- En "Repasar" la tesis aparece solo cuando vence, con el capítulo en el texto (por ejemplo "Tesis · Cap. 2, Números enteros"), para no confundirla con el capítulo que se está estudiando.
- El test es uno solo, completo, del capítulo recién estudiado, en la app o en papel. Los errores se cargan con su tipo.
- El tiempo total del botón **Entrar en foco** es la suma de Repasar + Aprender + Comprobar.
- Pantallas afectadas: Estudio (2.1), Sesión de estudio (2.2), Cómo funciona (2.3), Tesis (2.7), Motor de repaso (3.5) y Hoy (textos y minutos que mencionaran la tesis del mismo día). Test (2.6) y Test en papel (2.5) no cambian de contenido.

## 5. Datos

```
data/
  days/AAAA-MM-DD.json   ← cierre de cada día (lo pegás y queda commiteado)
  goals.json             ← metas por horizonte
  cards.json             ← tarjetas + estado FSRS
  activities.json        ← frentes y actividades de estudio
  routines.json          ← rutinas de entreno y rutinas del día (04:00 / 05:00)
  bimesters.json         ← nombre, fechas, producto y perfil de los 18 bimestres (existe)
  roadmap.json           ← la ruta completa: ítems por semana, compuertas, certificaciones (existe)
```

`data/roadmap.json` es la fuente de `docs/ROADMAP.md` (`npm run roadmap:md`; el CI falla si está desactualizado). `goals.json`, `cards.json`, `activities.json` y `routines.json` todavía no se generan: hoy esos datos viven en el teléfono.

El repo es público y está bien así para estos datos.

## 5 bis. Roadmap v3: 18 bimestres

- **Ruta:** del 16-11-2026 al 15-11-2029, 18 bimestres de 2 meses (el B1 empieza el 16-11-2026). Antes eran 9; los **años 4 y 5 son opcionales**: física, ingeniería mecánica, termofluidos y aeroespacial (M7 a M10), y OSCP y CKA → CKS.
- **Perfiles:** año 1, AI Engineer con seguridad (B1 a B6); año 2, ML Engineer completo (B7 a B12); año 3, Secure AI Engineer (B13 a B18).
- **Cada bimestre:** semanas 1 a 4 de estudio y pieza desde cero, 5 a 8 de producto y 9 de cierre (métrica contra baseline, aporte abierto, tráiler, README y caso de estudio). El piloto sale de las cold calls de Eclipse.
- **Hilos:** algoritmos (3 por semana desde B7, NeetCode 150), diseño de sistemas desde B7 y el núcleo de Eclipse reutilizado en todos.
- **Matemática de B1 a B6:** un ítem por capítulo de CONAMAT (69, tabla "4 ter"), repartidos en las semanas 1 a 8, con las partes aprender y test.
- **Metas atadas al roadmap:** las metas del día (`Block`) y de la semana (`Goal`) pueden llevar `ref` (id del ítem) y `part` (learn, test, build o close).
- **Datos de los gráficos** (`src/data/roadmap-charts.ts`, sin pantallas): serie diaria de mejora con promedio móvil de 7 días, horas por mes y carril, avance ponderado por horas, ritmo esperado contra real (con tolerancia de 5 puntos) y puntaje de competencias por eje.
- Pendiente de cargar en `roadmap.json`: "qué existe" y "nuestro ángulo" de cada bimestre (los campos existen, están vacíos) y las horas de los ítems que no son certificaciones.
- Las pantallas siguen leyendo `src/data/bimesters.ts` (los 9 bimestres anteriores): no se tocaron. Pasarlas a los 18 es trabajo de una ola siguiente.

## 6. Olas de desarrollo (un PR por ola, un modelo por ola)

| Ola | Qué sale | Modelo · esfuerzo |
|---|---|---|
| 0 · Cimientos | Vite + React + TS, tokens, tipografías, barra inferior, PWA con el ícono Palotes, Actions (CI y deploy a Pages), docs/PLAN.md | Sonnet 5.5 · medio |
| 1 · Hoy y foco | Modelo de datos, modal de despertar, Hoy **con la hora a la derecha del título (§3 bis)**, elegir pomodoro, foco, mini reproductor, pomodoros a medida, JSON del día | Opus 5.5 · alto |
| 2 · Estudio | Frentes y actividades, plan de hoy **con el orden Repasar → Aprender → Comprobar → Cerrar (§4 quater)**, gráficos, unidades y tests del B1, registrar test, tesis (abierta desde el repaso del día que vence), Cómo funciona actualizado | Opus 5.5 · alto |
| 3 · Motor de repaso | FSRS, cola diaria **con la tesis programada a +3 días a continuación del cold recall**, cold recall, active recall, crear tarjetas, importar Anki, reglas | Opus 5.5 · alto |
| 4 · Metas | Semana, mes, bimestre y año, nueva meta, bimestres renombrables (revisar si Semana muestra la lista de metas del día: usar §3 bis) | Sonnet 5.5 · medio |
| 5 · Entreno | Rutinas, semana, editor, sesión en pareja, resumen, peso | Sonnet 5.5 · alto |
| 6 · Cierre y sellos | Cierre, XP, sellos, ajustes, sonidos y alarmas .ics | Sonnet 5.5 · medio |
| 7 · Escritorio y tablet | Barra lateral, riel, vista Avance, modo presentación, pulido GSAP, **lista de metas del día con la hora a la derecha del título (§3 bis)** | Sonnet 5.5 · medio |

En el día a día alcanza con **Haiku 5.5 · bajo**: pegás el JSON del cierre y queda commiteado en `data/days/`.

**Criterios de aceptación de los cambios transversales**

- La hora queda a la derecha del título en todas las filas de metas; número y checkbox no se mueven de lugar.
- En el estudio, ningún paso del día muestra la tesis del capítulo nuevo.
- Las duraciones de la sesión suman lo que dice el botón de foco.
- Modo claro y oscuro revisados; sin desbordes a 390 px.

**Cómo se trabaja cada ola**

1. Una rama por ola y un commit por cada punto de la ola.
2. Subo la rama y abro el PR. GitHub Actions corre tipos, tests y build en cada push.
3. Vos lo probás y das el OK. Si algo no va, sigo en la misma rama.
4. Al mergear a `main`, Actions publica en GitHub Pages y actualizo este archivo.
5. Al cerrar cada ola indico el modelo y el esfuerzo de la siguiente.

**Ola 1 · lo que quedó y decisiones**

- Modelo de datos en `src/data/` (bloques, rutinas, presets, foco, mejora, export) y estado local en `src/state/store.ts` (`localStorage`, clave `trazo.v1`).
- Instalar (nombre propio y de Abi, una sola vez), Buen día (04:00, 05:00 u otra hora entre 03:00 y 06:45, de a 10 min), Hoy, Elegir pomodoro, Foco, Pomodoros a medida, mini reproductor y JSON del día (copiar o descargar).
- Día corto: rutina 20 min, matemática 1 h 30 y programación 1 h 40, así programación termina justo a las 08:30 con Abi fijo.
- "Otra hora" parte del día completo y reparte el recorte entre rutina, matemática y programación según lo que cada uno puede ceder (mínimos: 15, 45 y 45 min).
- Las tareas por defecto de cada bloque son un punto de partida; se editan en Ajustes (ola 6). Suman 18, como en el diseño.
- El foco sobrevive a cerrar la app: guarda la hora de inicio y al volver pone al día los tramos vencidos.
- Al terminar el plan del bloque aparece el modal "Fin del bloque": pasar lo pendiente a mañana o hacerlo ahora (+10 min). Lo pasado a mañana se suma a ese bloque al empezar el día siguiente.
- Avisos: toasts arriba (4 s, campana sintetizada y vibración) al terminar un tramo o cumplir una meta; modales con alternativa.
- Hasta que existan las sesiones propias (estudio en la ola 2, entreno en la ola 5), **Entrar en foco** de cualquier meta lleva a Elegir pomodoro.
- Quedan para su ola: "Sumar a la semana" en Hoy (ola 4, contadores de Metas), el nivel junto a la racha (ola 6, XP) y la elección de sonido (ola 6).

**Ola 2 · lo que quedó y decisiones**

- Estudio (2.1), Sesión de estudio (2.2), Cómo funciona (2.3), Actividad (2.4), Test en la app y en papel (2.5 y 2.6), Tesis (2.7) y Unidades y tests (2.8).
- Modelo en `src/data/study*.ts` y acciones en `src/state/study.ts`. Los datos de la ola 1 se migran solos: si no hay estudio guardado, se cargan los frentes y actividades por defecto.
- Frentes: Matemática, Programación, Lectura e Inglés, y se pueden sumar más desde Actividad.
- Actividades por defecto:
  - CONAMAT · Aritmética: 11 capítulos con su test y el examen final, de L a S en el bloque de matemática, test en papel.
  - Python y FastAPI: las 7 unidades del B1 según la ruta (Python Tutorial, Fluent Python, FastAPI y AI Engineering), de L a S en el bloque de programación, test en la app.
  - Make It Stick: 20 págs, L, X y V en el bloque de cierre.
- Sesión de un contenido: Repasar (lo de esa actividad que vence hoy) → Aprender (el resto del bloque, con el pomodoro del bloque) → Comprobar (el test de la unidad). La suma de los tramos es el total del botón y, con unidades, la duración del bloque.
- Al terminar Aprender, la unidad queda aprendida y el cold recall se agenda para +1. Al guardar el test aprobado se agenda la tesis a +3 y los repasos a +7, +21 y +60. Si no se aprueba, re-test a +2.
- Aprobación: 85 % o más, o por debajo si todos los errores fueron de descuido (regla de la ruta).
- Repaso del día: tope de 20 min, en orden cold recall → tesis → ejercicios, con los más atrasados primero. Lo que no entra queda en "Hoy no toca" y vuelve mañana.
- La tesis se abre desde el paso de Repasar del día en que vence. Las líneas con `::` o `[[ ]]` se vuelven tarjetas, que se guardan en `cards` y se repasan desde la ola 3.
- Test en papel: la app da la consigna y la cantidad de ejercicios, y se cargan solo los resultados en una grilla. Los enunciados de cada ejercicio no están cargados: se usan los del libro.
- "Pegar la corrección de Claude" entiende `17/20` y una línea por error, como `4: descuido`.
- Hoy: la meta de matemática y la de programación abren su sesión de estudio.
- Gráfico de la semana: minutos por día apilados por frente, con la meta diaria punteada (24 h por semana: 4 h por día, 6 días). El orden de apilado es Ingeniería, Eclipse, Salud y Handyx, validado para que dos colores vecinos se distingan. Tiene leyenda, tooltip y tabla para lectores de pantalla.
- El contador de Estudio en la barra muestra los repasos pendientes de hoy; con la ola 3 pasa a contar tarjetas.
- El tercer número de Estudio muestra "tarjetas creadas" hasta que la ola 3 tenga retención ("tarjetas que recordás").

**Ola 3 · lo que quedó y decisiones**

- Repaso de hoy (3.1), Cold recall (3.2), Tarjetas con active recall (3.3), Nueva tarjeta (3.4) y Motor (3.5).
- FSRS-5 con los parámetros por defecto (`src/data/fsrs.ts`): "Otra vez" vuelve en 10 min y las demás calificaciones se programan para cuando la probabilidad de recordar baja a la retención buscada (90 %).
- Un solo tope diario (20 min) para todo el repaso. Se llena en este orden: cold recall → releer → tesis → ejercicios; las tarjetas usan lo que queda, las más olvidadas primero y hasta 15 nuevas por día (30 s cada una). Lo que no entra queda en "Hoy no toca" y pasa a mañana.
- Las tarjetas de un frente entran en el Repasar de la primera actividad del día de ese frente (por ejemplo, las de Matemática en CONAMAT), y todas juntas en el Repaso del día.
- **Cold recall.** Se compara contra tus puntos clave. Como la tesis ahora llega a +3, el cold recall de +1 todavía no tiene tesis. Los puntos salen, en orden:
  - de los ya guardados para esa unidad;
  - si no hay, de la tesis;
  - si no hay, de las tarjetas de la unidad;
  - si no hay ninguno, los anotás mirando el libro y quedan guardados.
- **Después del cold recall:**
  - con 85 % o más, no hay relectura ni tarjetas de lo olvidado;
  - por debajo, lo olvidado vuelve mañana como tarjeta;
  - con menos de 70 %, además se agenda "Releer" para mañana.
  - **La tesis sigue a +3 siempre:** la regla anterior de "el tema no vuelve hasta +7" se interpretó sin saltear la tesis, que es un paso fijo.
- Una tarjeta fallada 2 veces seguidas agenda "Releer" de su fuente para el día siguiente.
- Active recall: en modo Escribir, Trazo marca las palabras clave del dorso que no aparecieron y sugiere la calificación: "Otra vez" con menos de la mitad, "Difícil" si faltó algo y "Bien" si estuvo todo. En Decir y Pensar, calificás vos.
- Ejercicios espaciados: "Hecho" o "Perfecto". Con "Saltear lo que ya sabés", el próximo de esa unidad dura un 40 % menos.
- Importar de Anki: lee el .txt de "Notas en texto plano" (tab, HTML y cloze) y trae frente y dorso. El historial de repasos de Anki no viaja en ese formato, así que esas tarjetas arrancan como nuevas.
- Pegar un bloque: una tarjeta por línea con `::` o `[[ ]]`.
- Retención por mazo: tarjetas recordadas (todo menos "Otra vez") en los últimos 30 días. Estudio muestra "tarjetas que recordás" cuando ya hay repasos.
- El contador de Estudio en la barra cuenta tarjetas y repasos pendientes de hoy.

**Ola 4 · lo que quedó y decisiones**

- Metas con las cuatro pestañas (Semana, Mes, Bimestre, Año) en `#/metas/<pestaña>`, y Nueva meta (4.5) con horizonte (día, semana, mes, bimestre o año), área y tipo (tarea, contador o número).
- Modelo en `src/data/goals*.ts` y acciones en `src/state/goals.ts`. Cada meta guarda su avance por período (el lunes de la semana, el mes, el bimestre o el año). Las de día, semana y mes se repiten y arrancan de cero; las de bimestre y año cuentan solo para su período.
- Las metas de partida son las del diseño: Eclipse, Handyx, Salud y Trabajo nuevo en la semana, seis metas del mes, tres del bimestre y las cinco grandes del año. Se pueden borrar ("Borrar metas") y se suman otras desde Nueva meta.
- Lo que sale solo del estudio, y se marca "auto": tests aprobados del mes, horas de programación y las páginas de Make It Stick. Lo demás se suma a mano con el botón +. Entrenar, Correr y el peso se vinculan con el entreno en la ola 5.
- **Semana:** el porcentaje es el promedio de avance de las metas semanales, y la tira de días muestra qué porcentaje de las tareas de cada día se cumplió (el mejor día va resaltado). La semana no muestra la lista de metas del día, así que la regla de la hora a la derecha del título (§3 bis) no aplica ahí: se revisó y queda solo para Hoy, Escritorio y Tablet.
- **Mes:** calendario donde cada día se llena según las tareas cumplidas (resaltado desde 85 %).
- **Bimestre:** los 9 bimestres reales de la ruta (del 16 de un mes al 15 dos meses después), con su industria y su producto, la tira de 9 semanas (4 de estudio, 4 de producto y 1 de cierre), los carriles de matemática, programación y producto, y las metas del bimestre. **Los nombres se renombran con el lápiz** y el cambio se ve en Hoy, Unidades y el JSON del día. Vacío vuelve al nombre de fábrica.
- **Año:** los 6 bimestres del año 1, el promedio por mes (con el objetivo de 85 %) y las metas grandes.
- El bimestre y la semana de Hoy ahora salen de las fechas reales de la ruta, no de bloques de 63 días: el 11 de nov todavía es el B1, semana 1.
- Hoy suma el bloque "Sumar a la semana", con botones para las metas marcadas "Mostrar en Hoy": Entrené, CV enviados, Venta Foody y Usuario Handyx.
- Pendiente a propósito: el peso (88,4 kg) y la meta de bajar de peso se conectan con el entreno en la ola 5. Hasta entonces se suman a mano.

**Ola 5 · lo que quedó y decisiones**

- Entreno (5.1), Semana de entrenamiento (5.2), Editar rutina (5.3), Sesión en pareja (5.4), Motor de entreno (5.5), Se terminó el tiempo (5.6), Resumen (5.7) y Peso (5.8).
- Motor en `src/data/train*.ts` (doble progresión, descarga, récords) y acciones en `src/state/train.ts`.
- **Rutinas de partida:** Push, Pull, Piernas, Upper, Lower y Full body, cada una con caminata 30 + movilidad 5 antes y estirar 10 + ducha 15 después. Los ejercicios, series, rangos y descansos de Piernas son los del diseño; los de las otras rutinas los armé yo como punto de partida y se editan en Editar rutina.
- **Plantillas de la semana:** PPL + UL (L Push, M Pull, X Piernas, J Upper, V Lower, S Full opcional, D descanso activo), Full body ×3 (L, X y V) y Propia. Cualquier cambio manual pasa la plantilla a Propia.
- **Aviso de ajuste:** si pasó un día de entreno sin hacerse, ofrece pasar a Full body el primero y el último de los días que quedan (jueves y sábado en PPL + UL), para dejar descanso en el medio.
- **Doble progresión.** Cada uno tiene su rango, su peso y su historial:
  - la próxima vez se pide lo último con +1 repetición en la serie más baja, sin pasar el tope;
  - cuando todas las series llegan al tope, sube el peso (+5 kg piernas, +2,5 kg torso, +1 kg aislamiento) y vuelve al mínimo;
  - 2 sesiones iguales con el mismo peso: se mantiene; 3: baja un 10 % y vuelve a subir.
- **Semana de descarga** cada 6 semanas desde el primer entreno: mismo peso y la mitad de las series. No cuenta en el historial ni en los récords.
- **Lo que no se llegó a hacer** no cuenta como falla: pasa al principio de la próxima sesión de esa rutina y no cambia el cálculo.
- **Primera vez en un ejercicio:** no hay historial, así que se elige el peso en la primera serie; desde ahí el motor calcula.
- **Tiempo del bloque:** lo de los ejercicios redondeado a 5 min (70 min en Piernas, ~2 h 10 con antes y después). Al cumplirse aparece "Hora de ir a casa": terminar y guardar, +10 min o seguir sin límite.
- **Descanso:** compartido (arranca cuando los dos marcan la serie) o cada uno (arranca al marcar la propia), con +15 s y Saltar. Al terminar suena la campana y avisa quién sigue.
- **Récords:** más peso, o más repeticiones con el mismo peso, contra todo lo anterior de esa persona.
- **Conexiones:** terminar el entreno marca como hechas las tareas de la meta 7 de Hoy. Las metas "Entrenar" (semana), "Entrenamientos" (mes) y "Llegar a 95 kg" (año) pasan a salir solas del entreno y del peso; el botón "Entrené" de Hoy se reemplaza.
- **Peso:** un pesaje por día, con la curva, la meta (95 kg, editable), el ritmo por semana y las semanas que faltan al ritmo actual. Se recomienda pesarse los domingos, pero se puede cargar cualquier día.
- Los números del diseño (100 kg de sentadilla, 88,4 kg) eran un ejemplo: arrancás de cero.

**Ola 6 · lo que quedó y decisiones**

- Cierre (6.1), Logro (6.2), Perfil y logros (6.3), Ajustes (6.4) y Sonidos y alarmas (6.5), con subpantallas para rutinas del día, compañera y copia de seguridad.
- **Cierre del día** (`#/cierre`, con un acceso en Hoy): la mejora primero ("Hoy mejoraste +0,75 % de 1 % posible") y la comparación con ayer, las metas cumplidas, los últimos días, lo acumulado desde el día 0, tareas y XP, avance por área, lo que pasa a mañana (se elige tarea por tarea), la pequeña victoria, lo primero de mañana y el JSON. Cerrar copia el JSON y guarda el cierre; se puede reabrir. El JSON del día suma un bloque `cierre`.
- **XP:** 4 por cada tarea hecha y 10 por cada meta cumplida, más 50 por cada sello. Subir del nivel n al n+1 cuesta 300 XP más 100 por cada nivel (300, 400, 500…). El nivel aparece también arriba de Hoy.
- **24 sellos en 4 grupos de 6** (constancia, cuerpo, estudio y trabajo), cada uno con su condición. Se ganan solos, con aviso, cuando se cumplen; la pantalla de logro sale al cerrar el día. Dos sellos se marcan a mano desde su detalle: "MVP de Handyx" y "Trabajo nuevo". "CONAMAT completo" pide los 69 capítulos y se desbloquea a medida que lleguen los bimestres 2 a 6. "Madrugador" es levantarse a las 4:30 o antes 3 días seguidos.
- **Próximos hitos:** los sellos bloqueados con algún avance, el más cercano primero (por ejemplo, Madrugador 1/3 o Pesar 90 kg).
- **Historial:** un renglón por día cerrado, con el porcentaje de tareas y los sellos que ganó ese día.
- **Ajustes:** tema (oscuro, claro o sistema), nombres de los 9 bimestres, nombre de las áreas (se renombran; el color no), rutinas del día (hora de levantarse y duración de los bloques de la mañana), nombres tuyo y de tu compañera, importar de Anki, copia de seguridad (descargar y restaurar un archivo con todo) e instalar la app. No se pueden agregar áreas nuevas: llevan un color del cuaderno y el sistema trae seis.
- **Sonidos:** cinco sonidos sintetizados (campana de bronce, madera suave, 3 pitidos, trazo de marcador y sello de goma) para cinco avisos (pomodoro, descanso, descanso de entreno, marcar una tarea y sello nuevo), con volumen y vibración. Cada aviso suena con el que elegiste.
- **Alarmas:** cuatro alarmas por defecto (04:00, 04:30, 18:00 y 21:00), con hora editable. Una app web no puede sonar con el teléfono bloqueado, así que se descarga un archivo `.ics` con un evento diario por alarma y aviso a la hora exacta; al abrirlo, el teléfono las agrega al calendario.

**Ola 7 · lo que quedó y decisiones**

- **Tres tamaños, una sola app:** teléfono (menos de 720 px) con la barra inferior; **tablet** (720 a 1099 px) con un riel de íconos a la izquierda; **escritorio** (1100 px o más) con una barra lateral. El riel y la barra lateral son el mismo componente: Avance, Hoy, Estudio, Metas, Entreno y Perfil, con el resaltador que se desliza (Flip, 280 ms) y el contador de Estudio. El foco que corre aparece abajo del riel o de la barra lateral, y vuelve a la sesión al tocarlo; en el teléfono sigue siendo el mini reproductor sobre la barra.
- **Avance** (`#/avance`, también desde el teléfono vía Perfil): racha y nivel, mejora acumulada, estudio y peso; el gráfico de estudio con selector **Semana · Mes · Año** (días, semanas del mes o meses del año, con su meta punteada); las metas del año; el calendario del mes; los frentes de estudio; la curva de peso con la meta; y los sellos ganados. En tablet va a una o dos columnas; en escritorio, el gráfico ocupa dos tercios y abajo van de a tres.
- **Modo presentación** (`#/avance/presentacion`, o el botón): sin navegación, en pantalla completa, con todo más grande y **sin lo privado**: se esconden el peso y los montos (USD y kg de las metas del año). Se sale con Esc o con "Salir".
- **Hoy en escritorio:** dos columnas: a la izquierda el avance, la mejora, "Sumar a la semana" y el cierre; a la derecha la lista de metas del día.
- **Hora a la derecha del título (§3 bis), revisada a 390, 834 y 1440 px, en claro y oscuro:** en las 8 filas la hora queda en la misma línea, a 11 px del título y antes del contador; el checkbox y el número se alinean entre filas. Semana de Metas y Avance no listan las metas del día, así que no aplica ahí.
- **Pulido de movimiento (GSAP):** cada pantalla entra subiendo 8 px en 280 ms (fundido de 150 ms con movimiento reducido); las filas de Hoy aparecen escalonadas (0,035 s) y la regla de horas baja hasta su lugar en 0,7 s; la tarjeta gira en 3D al darla vuelta (0,5 s); y el recuadro del descanso de entreno late en los últimos 3 segundos (escala 1 a 1,03, 5 veces).

**Infraestructura (ola 0)**

- Vite + React + TypeScript; ruteo por hash (`#/hoy`, `#/estudio`…) para que Pages no dé 404 al recargar.
- Base `/personal-tracker/` (se puede cambiar con `TRAZO_BASE`).
- Tipografías self-hosted con `@fontsource`; GSAP con Flip.
- PWA con `vite-plugin-pwa` (service worker generado, manifest, íconos).
- CI: `typecheck`, `test` y `build` en cada push. Deploy: al mergear a `main` o a mano con "Run workflow".

## 7. Registro de cambios

**2026-11-11**

*Base*

- Diseño completo en el canvas.
- Nombre: Trazo.
- Rediseño sin sombras, con bordes finos y modo claro y oscuro.

*Empezar el día*

- Pomodoros a medida.
- Rutinas con caminata, estiramiento y ducha.
- Entreno en pareja.
- Sonidos y alarmas.
- Pantalla "Elegir pomodoro" al entrar en foco.
- Modal "¿A qué hora te levantaste?" con dos rutinas del día.
- Registro único al instalar.

*Estudio*

- Rehecho como panel general por frentes, con actividades libres (pantalla Actividad de estudio), gráficos y memoria.
- Motor de repaso propio, con cinco pantallas nuevas:
  - Repaso de hoy;
  - Cold recall;
  - Tarjetas con active recall;
  - Nueva tarjeta;
  - Motor.

*Ícono y navegación*

- Barra inferior nueva, con íconos, resaltador en la activa, contador y mini reproductor.
- Ícono: se exploraron cuatro conceptos en SVG y se eligió **Palotes**.

*Metas*

- Pestañas Semana, Mes, Bimestre y Año.
- Pantallas Mes y Año nuevas.
- Se sacó el trimestre.

*Encabezados*

- Encabezado mínimo (título y una línea) en Hoy, Estudio, Metas, Entreno y Perfil.

*Escritorio y tablet*

- Vistas de escritorio y tablet con la pantalla Avance.

*Desarrollo*

- Plan de olas: de 20 PRs a un PR por ola; ahora son 8 olas, con escritorio y tablet como ola 7.

**2026-11-11 · cierre del diseño**

- Mejora diaria de hasta 1 %, repartida entre las metas del día, en Hoy, Cierre y Avance. El cierre siempre compara con ayer.
- Estudio rehecho en tres pasos, con una tarjeta "Ahora" y la pantalla nueva "Cómo funciona".
- Repaso adaptativo: tope de 20 min, solo lo que vence, se saltea lo que ya sabés y "Hoy no toca" muestra cuándo vuelve cada cosa.
- Entreno: descanso compartido o uno por persona, corriendo a la vez.
- Matemática: CONAMAT completo como primer libro (B1 a B6), actualizado en el roadmap. El B1 ahora suma las unidades 9 y 10 completas.

**2026-11-11 · últimos detalles**

- Metas del día numeradas del 1 al 8 en Hoy.
- Entrar en foco va al motor de cada meta: sesión de estudio, sesión de entreno o pomodoros.
- Estudio con los contenidos de hoy seleccionables y categorizados, y la sesión de estudio con timer por tramo.
- Tesis, test y ejercicios en la app o en papel, con la opción de que corrija Claude.
- Motor de entreno con sobrecarga progresiva, objetivos por serie y por persona, y la próxima vez calculada.
- Avisos: toasts y modales, como el de "Hora de ir a casa".
- Perfil con 24 sellos en 4 grupos y próximos hitos con progreso.

**2026-11-11 · ajustes de revisión**

*Fila de meta*

- La hora pasa de la columna izquierda a la derecha del título (Geist Mono, `--sub`, ≈ 12 px). Línea de tiempo, checkbox y número se quedan y se corren a la izquierda con margen de 16 px. En Hoy, Escritorio y Tablet. Semana solo si muestra la lista de metas del día. Ver §3 bis.

*Estudio*

- Nuevo orden de la sesión: Repasar → Aprender → Comprobar → Cerrar. Se quitó "Fijar · tesis" del día del capítulo nuevo.
- La tesis del capítulo nuevo se programa para +3 días y entra en el repaso de ese día, a continuación del cold recall, con el capítulo en el texto.
- Un solo test, completo, del capítulo recién estudiado (app o papel).
- Actualizar en su ola: Estudio (2.1), Sesión de estudio (2.2), Cómo funciona (2.3), Tesis (2.7), Motor de repaso (3.5) y Hoy. La escalera no cambia.

**2026-11-11 · ola 1**

- Hoy con la fila de meta de §3 bis: checkbox en la línea de tiempo · número · título · hora (Geist Mono, `--sub`, 12 px, a 11 px del título) · contador. Revisado a 390 px en claro y oscuro.
- Buen día, Instalar, Elegir pomodoro, Foco, Pomodoros a medida, mini reproductor, avisos y JSON del día.
- Día corto ajustado a rutina 20 min para que entre justo antes de Abi.

**2026-11-11 · ola 2**

- Estudio con el nuevo orden: Repasar → Aprender → Comprobar → Cerrar. Ningún paso del día muestra la tesis del capítulo nuevo.
- Tesis diferida a +3 días, a continuación del cold recall, con el capítulo en el texto.
- Test completo del capítulo, en la app o en papel, con tipo de error y corrección de Claude pegada.
- Sesión de estudio con timer por tramo, cuyas duraciones suman lo que dice el botón de foco.
- CONAMAT B1 y la programación del B1 con sus unidades y tests, actividades libres y gráfico semanal.

**2026-11-11 · ola 3**

- Motor de repaso propio con FSRS, tope diario compartido, cold recall con puntos clave, active recall con sugerencia de calificación, nueva tarjeta en cinco tipos, reglas ajustables e importación de Anki o bloques.
- La tesis sigue fija a +3, después del cold recall.

**2026-11-11 · ola 4**

- Metas con Semana, Mes, Bimestre y Año, Nueva meta y bimestres renombrables.
- Hoy con "Sumar a la semana".
- Semana no lista las metas del día, así que no lleva la hora a la derecha del título.

**2026-11-11 · ola 5**

- Entreno con rutinas, semana, editor, sesión en pareja con descanso compartido o por persona, motor de sobrecarga progresiva, semana de descarga, resumen con récords y peso.
- Las metas de entreno y de peso salen solas del entreno.

**2026-11-11 · ola 6**

- Cierre del día, XP y niveles, 24 sellos con pantalla de logro, perfil con hitos e historial.
- Ajustes con tema, nombres de bimestres y áreas, rutinas del día, copia de seguridad e instalación.
- Sonidos configurables y alarmas al calendario con `.ics`.

**2026-11-11 · ola 7**

- Barra lateral en escritorio y riel de íconos en tablet, con el foco que corre abajo.
- Vista Avance con selector de período y modo presentación sin peso ni montos.
- Hoy en dos columnas en escritorio; la hora queda a la derecha del título en teléfono, tablet y escritorio.
- Pulido de movimiento: entrada de pantallas, filas escalonadas, regla de horas, giro de tarjeta y latido del descanso.

**2026-11-12 · roadmap v3**

- La ruta pasa de 9 a 18 bimestres (16-11-2026 a 15-11-2029), con años 4 y 5 opcionales.
- `data/roadmap.json` y `data/bimesters.json` con los 18 bimestres; `docs/ROADMAP.md` se genera desde el JSON y el CI lo verifica.
- Matemática de B1 a B6 en un ítem por capítulo de CONAMAT (69).
- `ref` y `part` opcionales en las metas del día y de la semana.
- Modelo de datos de los gráficos del roadmap, con funciones puras y tests. No se tocó ninguna pantalla.

