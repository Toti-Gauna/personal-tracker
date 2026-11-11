# Trazo · plan de la app

Tracker personal de Toti: el día en horas, el estudio con su propio motor de repaso, las metas de la semana al año, el entreno en pareja con Abi y el peso. PWA instalable, publicada en GitHub Pages desde `Toti-Gauna/personal-tracker`.

- **Diseño:** [canvas de Trazo](https://claude.ai/artifact/6Cc2E6aW2ViU5ikovpsRTy)
- **Roadmap de estudio:** [ruta ML + DevSecOps](https://claude.ai/artifact/9PEokku7mBLZdCFJr1zqXP)
- **Pantallas:** presentación `Trazo-pantallas.pptx` y su ZIP de imágenes (44 pantallas, 8 flujos).
- **Estado:** ola 2 (Estudio) en revisión. Este archivo es la fuente de verdad.

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
  bimesters.json         ← nombres y fechas de los 9 bimestres
```

El repo es público y está bien así para estos datos.

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

