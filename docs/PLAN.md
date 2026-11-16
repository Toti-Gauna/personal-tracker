# Trazo · plan de la app

Tracker personal de Toti: el día en horas, el estudio con su propio motor de repaso, las metas de la semana al año, el entreno en pareja con Abi y el peso. PWA instalable, publicada en GitHub Pages desde `Toti-Gauna/personal-tracker`.

- **Diseño:** [canvas de Trazo](https://claude.ai/artifact/6Cc2E6aW2ViU5ikovpsRTy)
- **Roadmap de estudio:** [ruta ML + DevSecOps](https://claude.ai/artifact/9PEokku7mBLZdCFJr1zqXP)
- **Pantallas:** presentación `Trazo-pantallas.pptx` y su ZIP de imágenes (44 pantallas, 8 flujos).
- **Estado:** olas 0 a 12b hechas y en `main`. Olas 0 a 16c hechas (la 15 quedó absorbida por la 16c). Olas 0 a 18 hechas. Las olas 19 a 23 (entreno, programación y metas por bloque, idiomas y libros, orden de pantallas y clipping) están planificadas en §6 sexies. Este archivo es la fuente de verdad.

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
| Inglés (`--idi`, rama del plan T+18) | `#F49AC2` | `#B4316F` |

**Ramas del plan T+18:** main = Trazo, en tinta. Cada rama toma el color de un área: programación `--ing`, matemática `--economia` (el resaltador), trabajo `--rutina`, inglés `--idi` (nuevo), Handyx `--handyx` y salud `--salud`.

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
2. **Buen día.** La primera apertura de cada día pregunta a qué hora te levantaste. La rutina se elige sola por el día de la semana (hora de Buenos Aires): de lunes a viernes, "weekday" (10 metas); sábado y domingo, "weekend" (6 metas). Desde T+2, "con trabajo" reemplaza a la de lunes a viernes, y el día libre (martes por defecto) deja solo repasos y entreno suave; se eligen en Ajustes → Plan T+18 (§5 quater).
   - 04:00 arma el día completo de la rutina que corresponda.
   - 05:00 arma el día corto: las metas flexibles de la mañana se acortan (de lunes a viernes, matemática 1 h 30 y programación 1 h 30; el finde, matemática 3 h). Los bloques fijos no se tocan.
   - Con "Otra hora" el día corre los bloques y acorta los flexibles, nunca a menos de 15 min.
   - **Fijos** (no se acortan ni se mueven): correr y acompañar a Abi (08:30–10:00), trabajo, entrenamiento y sueño. **Flexibles:** matemática, programación, Handyx, Eclipse y búsqueda laboral. Solo se acortan los flexibles de antes del primer fijo; los de la tarde quedan en su hora.
   - La ducha va adentro de correr, del almuerzo y del estudio; no es un bloque aparte. Despertar, comidas, descanso, desconexión y sueño no cuentan como meta.
3. **Hoy.** El encabezado, el avance del día y la regla de horas con las metas numeradas (del 1 al 10 de lunes a viernes, del 1 al 6 el finde; mismo diseño). **Entrar en foco** te lleva al motor de esa meta:
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

Cada capítulo hace el mismo camino: **día 1 Estudiar → día 2 Test → día 3 Tesis → días 8, 22 y 61 Repetir** (ver §4 quater). Cada día toca algo distinto: repetir, el test del capítulo de ayer, la tesis del de antes de ayer y estudiar el capítulo nuevo.

1. **Estudio (2.1).** Los contenidos de hoy con su categoría (Repaso, CONAMAT, Python, la lectura) y cuánto falta. Tocás uno y ves:
   - las cuatro fases con el capítulo que toca hoy en cada una (Estudiar cap. 3 · Test cap. 2 · Tesis cap. 1 · Repetir), marcada la del primer paso que falta;
   - los pasos de hoy en el orden de la sesión, con su fase y sus minutos, y si van en papel;
   - **Entrar en foco** con el tiempo que falta. Al final, la semana, tres números y los accesos a Cómo funciona y Plan del bimestre.
2. **Sesión de estudio (2.2).** El timer propio de cada meta de estudio, con los tramos en este orden: cold recall, tarjetas (y lo que vence para repetir), test, descanso, tesis y capítulo nuevo en pomodoros 50/10. Avisa al terminar cada tramo. Entra en el bloque en pomodoros enteros. El pomodoro del capítulo se cambia desde la sesión.
3. **Cómo funciona (2.3).** Las cuatro fases con sus reglas, un día cualquiera (cada fase, un capítulo distinto) y un capítulo en dos meses.
4. **Actividad de estudio (2.4).** Libro, curso, práctica, video u otra, con su frente, su ritmo, los días, el bloque y si pasa por el motor de repaso.
5. **Test en papel (2.5).** El día 2, después del cold recall. La app te da los ejercicios (15 del capítulo y 5 de los anteriores), los resolvés en el cuaderno y cargás solo los resultados: la app los corrige y marcás el tipo de cada error. Si preferís, le mandás la foto a Claude y pegás su corrección.
6. **Registrar test (2.6).** Puntaje y tipo de error: descuido, técnica, concepto o enunciado. Dice qué sigue: la tesis mañana, o releer y re-test (intento 2 o 3 de 3).
7. **Tesis (2.7).** El día 3, al día siguiente de aprobar el test, y arranca mostrando sus errores. Va en la app o en papel. En la app, las líneas con `::` o `[[ ]]` se vuelven tarjetas. En papel, sacás una foto y se la mandás a Claude, que te devuelve el texto y las tarjetas.
8. **CONAMAT · unidades y tests (2.8).** Las 11 unidades de Aritmética del B1, qué incluye cada test, qué toca hoy en cada una (estudio, cold recall y test, releer, re-test, tesis, repetir), cuáles quedaron flojas y el examen final de 40 ejercicios al 85 %.

**3 · Motor de repaso**

1. **Repaso de hoy (3.1).** Tope de 20 minutos y solo lo que vence: tarjetas, releer lo que falló y los repasos de los días 8, 22 y 61. El cold recall y el test, y la tesis, van en la sesión de su contenido, fuera del tope. "Hoy no toca" muestra qué se salteó y cuándo vuelve, y abajo los minutos de los próximos 7 días.
2. **Cold recall (3.2).** El día 2, antes del test: escribís sin mirar lo que estudiaste ayer y lo comparás punto por punto con el capítulo.
3. **Tarjetas con active recall (3.3).** Elegís escribir, decirlo en voz alta o pensarlo antes de dar vuelta la tarjeta. Trazo marca lo que faltó y sugiere la calificación.
4. **Nueva tarjeta (3.4).** Hay cinco tipos: pregunta, completar, explicar, ejercicio e inversa. Cada tarjeta lleva mazo y fuente, se ve la vista previa y está el botón "Guardar y otra".
5. **Motor (3.5).** La escalera en días del capítulo (1 Estudiar → 2 Cold recall + test → 3 Tesis → 8 Repetir → 22 Repetir → 61 Examen), las reglas ajustables, el estado de las tarjetas, la retención por mazo, la importación de Anki y la opción de pegar bloques.

**8 · Puntos débiles** (se entra desde Estudio, el Recall y el Repaso)

1. **Puntos débiles (8.1).** Filtro Todo, Recall o Exámenes. Temas flojos, recall de la semana y tarjetas sanguijuela. Lo más flojo ahora (qué falla y minutos para arreglarlo), el mapa de fortaleza por capítulo (cold recall, tarjetas, test y día 8, en rojo, amarillo y verde), cómo fallás con el consejo de cada tipo de error, tu recall semana a semana contra el 85 %, creías contra recordaste y las tarjetas sanguijuela (Reescribir, Dividir en dos, Releer la fuente). Al final, "Priorizar lo flojo" y el Refuerzo de hoy.
2. **Un tema en detalle (8.2).** Fuerza, lo que olvidás idea por idea con sus intentos, el recuerdo con los días, cómo te fue (línea de tiempo del capítulo), los errores del test y cómo arreglarlo, con minutos.
3. **Exámenes (8.3).** Cuán listo estás para el final, promedio, aprobados al primer intento, re-test pendientes, puntaje de cada test contra el corte, errores por test, lo que fallás seguido y el simulacro dirigido.
4. **Escritorio (8.4).** Desde 1200 px, todo en una vista.

Con pocos datos, cada bloque muestra lo que hay y dice que se completa con el uso.

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
| Tope de repaso por día (tarjetas, releer y días 8, 22 y 61); si vence más, entran las más olvidadas | 20 min |
| Cold recall antes del test, contra el capítulo | día 2, 5 min |
| Intentos del test antes de marcar el tema como flojo | 3 |
| Ejercicios espaciados más cortos si el anterior salió perfecto | sí |
| Releer si el cold recall da menos de… o si una tarjeta falla 2 veces | 70 % |
| Retención buscada (FSRS) | 90 % |
| Tarjetas nuevas por día | 15 |
| Corte de aprobación de tests | 85 % |

**Escalera de estudio** (en días del capítulo)

| Día | Qué | Dónde aparece |
|---|---|---|
| 1 | Estudiar de corrido (pomodoro 50/10) | Al final de la sesión del día |
| 2 | Cold recall (5 min, contra el capítulo) y test completo (25 min) | En la sesión, después de las tarjetas |
| 3 | **Tesis** (20 min), al día siguiente de aprobar | En la sesión, después del test; fuera del tope |
| 8 | Estudio de lo flojo + ejercicios mixtos (15 min) | Repaso del día (tope 20 min) |
| 22 | Ejercicios mixtos (15 min; 10 si el día 8 salió perfecto) | Repaso del día |
| 61 | Examen corto (15 min) | Repaso del día |

Más las tarjetas que vencen, dentro del mismo tope de 20 min. Los días 8, 22 y 61 se cuentan desde el día 1; si el test se atrasó, ningún repaso cae antes del día después de la tesis.

- **Test completo:** 15 ejercicios del capítulo y, desde el cap. 2, 5 de los anteriores; 25 min, sin apuntes. El corte es 85 %.
- **Con 85 % o más:** la tesis al día siguiente.
- **Con menos de 85 %:** al día siguiente releés lo que falló y al otro hacés el re-test, con ejercicios nuevos. La tesis llega el día después de aprobar.
- **A la tercera vez sin aprobar,** el tema queda marcado como flojo y sigue igual a la tesis y los repasos.
- Los ejercicios que fallaste en el test en papel vuelven al día siguiente como tarjetas. Lo que olvidás en el cold recall también; con menos de 70 % se agenda releer. Si no vence nada, ese día no hay repaso.

## 4 bis. Mejora diaria (1 % por día)

- Cada día podés mejorar hasta un 1 %, repartido en partes iguales entre las metas del día (los bloques, no las tareas de adentro). Con 8 metas (lunes a viernes), cada una vale 0,125 %; con 5 (fin de semana), 0,2 %.
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

## 4 quater. Sistema de estudio: un capítulo por día, cuatro fases en paralelo

Cada capítulo recorre:

1. **Día 1 · Estudiar de corrido.** El capítulo entero en pomodoros 50/10, sin ejercicios en el medio: anotás lo que no entendés y seguís. Entra en el bloque en pomodoros enteros; lo que sobra no se usa.
2. **Día 2 · Test.** Primero 5 min de cold recall (contra el capítulo) para calentar y después el test completo: 15 + 5 de capítulos anteriores, 25 min, corte 85 %. Errores por tipo: descuido, técnica, concepto o enunciado.
3. **Día 3 · Tesis.** Al día siguiente de aprobar, 20 min, arrancando por los errores del test. Fuera del tope de repaso. Si reprobaste: releer al día siguiente, re-test al otro, y la tesis el día después de aprobar; a la tercera vez sin aprobar, el tema queda flojo y sigue a la tesis.
4. **Días 8, 22 y 61 · Repetir.** Estudio de lo flojo y 3 a 5 ejercicios mixtos, más tarjetas, con tope de 20 min.

**Cada día toca algo distinto:** repetir, el test del capítulo de ayer, la tesis del de antes de ayer y estudiar el capítulo nuevo. **Orden de la sesión:** cold recall, tarjetas, test, descanso, tesis y capítulo nuevo. El botón **Entrar en foco** muestra lo que falta.

Pantallas: Estudio (2.1), Sesión (2.2), Cómo funciona (2.3), Test en papel (2.5), Registrar test (2.6), Tesis (2.7), Plan del bimestre (2.8), Repaso (3.1), Cold recall (3.2), Motor (3.5) y Cierre (6.1). Los bloques de Puntos débiles de Estudio, Recall y Repaso van en otro PR.

## 4 quinquies. Puntos débiles: cálculos

- **Fuerza de un tema** (0 a 100) = 40 % cold recall + 30 % tarjetas + 30 % test. Si falta una fuente, su peso se reparte entre las otras. Los pesos se ajustan en el Motor. El cold recall y las tarjetas son el promedio de sus intentos; el test, el último.
- **Tema:** un capítulo ("conamat:2") o, para tarjetas sin capítulo, su mazo ("mazo:ingles").
- **Tema flojo:** fuerza menor a 70. Bandas: rojo menos de 70, amarillo de 70 a 84, verde desde 85.
- **Tarjeta sanguijuela:** 4 fallos o más ("Otra vez").
- **Calibración por frente:** lo que creías recordar menos lo que recordaste, en los cold recalls. Positivo: te sobreestimás.
- **Listo para el final:** promedio de la fuerza de cada capítulo ponderado por sus ejercicios en el examen (40). Lo no estudiado cuenta 0.
- **Simulacro dirigido:** los 40 ejercicios con más peso en lo flojo: ejercicios del examen × lo que le falta para 100 / 20 (al menos 0,3); lo no estudiado pesa 1.
- **Cómo arreglarlo:** releer lo olvidado (3 min por idea, hasta 9), las tarjetas nuevas y las falladas, y 5 ejercicios de lo que falló en el test (8 min).
- **Priorizar lo flojo** (encendido de fábrica): si vence más de lo que entra en el tope de 20 min, entran primero los temas flojos y sus tarjetas.

## 5. Datos

```
data/
  days/AAAA-MM-DD.json   ← cierre de cada día (lo pegás y queda commiteado)
  goals.json             ← metas por horizonte
  cards.json             ← tarjetas + estado FSRS
  activities.json        ← frentes y actividades de estudio
  routines.json          ← rutinas del día: "dayRoutines" weekday y weekend, zona horaria y horas de 04:00 / 05:00 (existe)
  reviews.json           ← cada intento: tema, tipo (cold recall, tarjeta o ejercicio), resultado, fecha y cuánto creías recordar
  tests.json             ← cada test: capítulo, puntaje y el tipo de cada error
  bimesters.json         ← nombre, fechas, producto y perfil de los 18 bimestres (existe)
  study-roadmaps.json    ← roadmaps de estudio por frente: fases, materiales con su rol, criterios de salida (existe, ola 12a)
  roadmap.json           ← la ruta completa: ítems por semana, compuertas, certificaciones (existe)
```

`data/roadmap.json` es la fuente de `docs/ROADMAP.md` (`npm run roadmap:md`; el CI falla si está desactualizado). `data/routines.json` es la fuente de verdad de las rutinas del día: cada bloque lleva id, label, start, end, area, kind ("fixed" o "flex") y focus, más meta (false si no cuenta) y tasks. Se valida al cargar; Ajustes las muestra y se cambian en el JSON. `goals.json`, `cards.json` y `activities.json` todavía no se generan: hoy esos datos viven en el teléfono. `reviews.json` y `tests.json` se descargan desde Copia de seguridad.

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

## 5 ter. Ruta del roadmap en la app (ola 4 · ruta)

- **Metas abre en Ruta**, con las sub-pestañas Ruta · Semana · Mes · Bim. · Año. Pantallas: Ruta (7.1), Bimestre (`#/metas/bim/N`, 7.2), De la ruta a tu día (`#/metas/semana-ruta`, 7.3), El mapa (`#/metas/mapa`, 7.4), Tu evolución (`#/metas/evolucion`, 7.5) y Ruta en escritorio (1200 px o más, 7.6). Referencias en `docs/design/ruta/` y comparación en `docs/design/ruta/comparacion/`.
- **Carriles en pantalla:** Matemática (`ing`), Programación (`salud`), Desde cero (`handyx`, la pieza), Producto (`eclipse`), Piloto (`economia`) y Certificación (`rutina`).
- **Avance por ítem** (`src/data/ruta.ts`, puro): un registro de avances (`ruta.log`) del que sale todo. Aprender y comprobar valen la mitad de un ítem; construir (pieza y producto) se reparte en 3 sesiones por semana de su tramo; el cierre son 5 casillas a mano (métrica, aporte, tráiler, README y caso de estudio).
- **De la ruta a tu día:** al empezar el día, matemática lleva el próximo capítulo pendiente (`ref` y `part`), programación el próximo tema (semanas 1 a 4: estudio y pieza; 5 a 8: producto) y Eclipse el piloto. Al cumplir la meta en Hoy se registra el paso (y se deshace si se desmarca). Aprender o aprobar un capítulo de CONAMAT en Estudio también lo registra. Una llamada por meta de Eclipse cumplida; el embudo (interesados, demo, piloto) se ajusta a mano.
- **Propuesta semanal:** por carril, los ítems que empiezan hasta esa semana y no están completos (lo pendiente pasa solo a la semana siguiente), 10 llamadas para el piloto y los hilos (núcleo de Eclipse; desde B7, algoritmos y diseño de sistemas). Se guarda sola la primera vez que se abre la semana y se puede editar.
- **Ritmo:** `paceVsPlan` con tolerancia de 5 puntos; los carriles comparan ítems hechos contra los que el plan esperaba a la fecha.
- **Competencias:** cada ítem suma a un eje (Matemática; Seguridad, Cloud y Hardware por palabras clave; Producto; el resto, ML), ponderado por horas. La meta del año 1 es todo hecho hasta el B6; la del año 3, hasta el B18.
- **Constancia:** el martes sin registro no cuenta como falta. Los gráficos con pocos días muestran el tramo que hay y avisan que se completan con el uso.

## 5 quater. Plan T+18 (ola 8)

Seis ramas que salen de main (Trazo) el lunes de T0 y vuelven a juntarse 78 semanas después, en mayo de 2028, con perfil senior en ML, DevSecOps y cloud. Fuente: `data/plan.json`, tipado en `src/data/plan.ts`. **Todo se cuenta en semanas desde T0** (`settings.startDate`; si no hay, el T0 del plan, 2026-11-16): no hay fechas sueltas en pantallas.

- **Tiempo:** 78 semanas, 9 bimestres de 9 semanas (B9 tiene 6). No hay trimestres. Hitos: T+0 (semana 1), T+2 (semana 9, trabajo remoto), T+12 (semana 53, decisión de Handyx) y T+18 (fin de la semana 78).
- **Ramas y colores:** programacion (`--ing`), matematica (`--economia`), trabajo (`--rutina`), ingles (`--idi`, nuevo), handyx (`--handyx`), salud (`--salud`); main es `--tinta`. Eclipse sigue siendo un área, no una rama.
- **Programación:** P0 a P10, certificaciones C1 a C3, ventanas W1 a W3, la pausa de fin de año y el colchón. Cada proyecto tiene industria, versión (v1 → v2 en los pares P1/P5, P3/P7, P4/P10, P6/P9), stack, perfil al cerrar y un estándar de entrega de 6 capas (UX/UI, 3D útil, animación y tráiler, documentación, venta, ingeniería). Tiempo: 55 % núcleo, 30 % producto, 15 % lanzamiento; si no alcanza, se recorta producto, nunca tests ni seguridad.
- **Rutinas** (`data/routines.json`): lunes a viernes buscando trabajo (10 metas), fin de semana (6), **con trabajo** (9, reemplaza a la de lunes a viernes desde que se marca T+2) y **día libre** (por defecto el martes: repaso de 20 min y entreno suave). En una ventana W los bloques de programación pasan a matemática; con una entrevista a 3 días o menos, la búsqueda se parte en búsqueda y "Inglés · modo entrevista".
- **Cada bloque lleva su rama**; Hoy muestra la línea `↳ programacion · P1 · semana 3 de 4` bajo el título (la hora sigue a la derecha, §3 bis). El JSON del día suma `rama` por bloque y `plan: { semana, bimestre, ramas }`.
- **Avisos entre ramas** (arriba de la lista de Hoy): entrevista a 3 días o menos (trabajo → inglés), proyecto que cierra en 14 días con capas sin marcar (programación → trabajo), ventana W en 7 días (matemática → programación) y T+2 marcado con la rutina de búsqueda (pide confirmar el cambio a con trabajo).
- **Metas por horizonte:** año y bimestre son fijos (vienen del plan y se editan); mes y semana se generan desde el plan para cualquier fecha y se confirman, cambian o borran. El mes de T0 trae las metas del mes 1 y la semana 1, sus tareas. El mes suma lo que cierra (entrega, examen, capítulos, corte de Handyx, ventana), los chequeos mensuales (laboratorios, medidas; simulacros del C1 desde la semana 61) y la búsqueda prorrateada (5 postulaciones y 5 mensajes por día). Las metas personales (95 kg, Foody, Roofy, demos, Handyx 100 usuarios y 56 especialistas, Make It Stick, meditar, deudas) siguen; con rama, aparecen dentro de esa rama.
- **Pantallas:** Ruta (`#/metas`, 7.1), el mapa en ramas (`#/metas/mapa`, 7.2, un SVG tipo `git log --graph`), Proyecto (`#/metas/proyecto/P1`, 7.3), Búsqueda (`#/metas/trabajo`, 7.4), Inglés (`#/metas/ingles`, 7.5), Handyx (`#/metas/handyx`, 7.6), Importar (`#/importar`, 7.7) y Tu evolución (`#/metas/evolucion`, 7.8). Las pantallas del flujo 7 anterior (bimestre, de la ruta a tu día y la ruta de escritorio) se fueron. Referencias en `docs/diseno/plan-t18/`.
- **Importar JSON:** campos comunes `tipo`, `rama` y `fecha`; tipos `sesion`, `revision`, `examen`, `entrevista`, `simulacro`, `postulaciones` y `semana`. Validación a mano (sin dependencias) que marca la línea que falla; "Qué cambia" antes de guardar; cada importación queda como commit de su rama en el mapa.
- **Migración:** la clave sigue siendo `trazo.v1`. Los días guardados no cambian; el plan arranca vacío; las semillas que el plan reemplaza con sus contadores (CV, mensajes a RRHH, horas, tests, entrenos) se van solo si no tienen avance.

## 5 quinquies. Búsqueda intensiva (ola 8b)

Desde el lunes 16 nov 2026 la prioridad es un trabajo remoto de USD 3.000 a 5.000 por mes. **Esta sección reemplaza las "Rutinas del día" de la ola 8** mientras el modo esté activo.

- **Modo `busqueda-intensiva`** (Ajustes → Plan T+18): rutinas `busqueda-intensiva` (lunes a viernes, 10 metas) y `busqueda-intensiva-finde` (8 metas), arrancan a las 04:30 (día corto 05:30; la cadena de la mañana es matemática y programación). Sin día libre: queda en "ninguno" y el anterior se guarda. Horas por semana: matemática 14, programación 25,5, inglés 11,5, búsqueda 10,5, clipping 10,5, entrenamiento 15 (desde la ola 17, 3 h por día). Desactivarlo vuelve exactamente a la rutina y al día libre de antes.
- **Sprint de 14 días** (`#/metas/sprint`, 10.2): si el día 14 no hay oferta, el sprint se renueva; la búsqueda no se cierra. Metas del embudo editables (supuestos). Qué cambia en la ruta (`#/metas/impacto`, 10.3).
- **Pausa (stand-by)**, concepto genérico (`Pausa` en `plan-state.ts`): una rama o área en pausa no aparece en Hoy ni genera avisos, metas ni contadores; nada se borra (`guardado` es una foto). En el mapa va punteada y tenue desde la pausa; sus cortes se corren +N días con la fecha original tachada; Handyx abre en modo lectura con "Retomar". Pausas iniciales: Handyx y ventas desde T0.
- **Clipping**: bloque sin rama, con el color de Eclipse; en el mapa tiene su propia columna.
- **Hitos por rama** (`src/data/hitos.ts`, 10.4): commit, hito grande (rombo) o de main, con flecha desde la rama que entrega. Se guardan como días desde T0. Marcar uno como hecho lo pasa a trazo lleno y mueve HEAD; los de búsqueda que pasan sin cumplirse quedan vencidos con fecha nueva propuesta. Pestaña Trimestre del mapa; también en Semana, Mes y Bimestre.
- **Entrevista a 3 días o menos:** el bloque de inglés pasa a simulacro de esa entrevista. **Bloque que se pasa de hora:** Hoy avisa y el siguiente se acorta; no se corre el día.
- **Calendario comprimido (5 ter):** programación pasa de 78 a 53 semanas (19 tramos con meta y tope = meta + 1; cierra el 21 nov 2027). Matemática, inglés y salud siguen hasta T+18; de la semana 54 a la 78 queda "Margen". Si un proyecto pasa la meta usa la semana de tope; si pasa el tope, se recorta alcance, no calendario.
- **Semanas ganadas** (Ruta): parte de 25 (78 − 53), suma lo que cada proyecto cierra antes de su meta y resta la semana de tope y los atrasos de las puertas.
- **Puertas de matemática:** W1, W2 y W3 se aprueban con su test (85 %). Sin aprobar, P3, P6 o P8 no arrancan: la programación del día pasa a matemática pura y cada semana extra sale del colchón.
- **Entrevista técnica dentro de cada proyecto:** documento de diseño de 2 páginas, 6 a 8 ejercicios con tests y defensa simulada de 45 min (3 sesiones de 45 min por semana). Sin los tres, el proyecto no se cierra.
- **Portfolio agéntico:** un MCP y un agente con trazas por proyecto; Perfil muestra MCP publicados, agentes con trazas y defensas aprobadas, de 11. Meta "Mapa de proyectos del portfolio" con 4 pasos (Trazo guarda la meta; el diseño es del usuario).
- **Revisión de mercado** (Búsqueda): ~30 ofertas la semana del 16 nov; el 22 nov se decide el orden de lo movible (Escudo, Faro v2, Estación v1 y certificaciones): 40 % o más sube, menos de 10 % baja.
- Prompts de los bloques: `docs/prompts/bloques.md` (1 a 23; en búsqueda intensiva, 2, 3, 4, 5, 6 a 8, 16, 17 a 19, y 20 a 23 en programación).

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
| 8b · Búsqueda intensiva | Modo con dos rutinas y sin día libre, pausas (stand-by), hitos por rama, mapa con stand-by y Trimestre, sprint de 14 días y qué cambia en la ruta (§5 quinquies) | Opus 5.5 · alto |
| 8 · Plan T+18 | Seis ramas desde T0, rutinas con trabajo y día libre, rama en cada bloque, avisos entre ramas, Ruta y mapa en ramas, Metas generadas desde el plan, Proyecto, Búsqueda, Inglés, Handyx, Importar JSON y Ajustes del plan (§5 quater) | Opus 5.5 · alto |
| 9 · Pulido de Hoy | Buen día a pantalla completa, modales como hoja inferior, meta abierta sin salto, mini reproductor nuevo (§6 bis) | Sonnet 5.5 · medio |
| 10 · Metas: submetas y marcar por día | Nueva meta con **+ Agregar** y hoja de submetas; en Semana, casilla, `+1` o tira de días según la meta, y cómo se suma explicado (§6 bis) | Sonnet 5.5 · alto |
| 11 · Mapa de hitos | El mapa no se reordena al seleccionar; leyenda, filtro por rama y detalle del hito (§6 bis) | Sonnet 5.5 · medio |
| 12a · Estudio: datos del roadmap | `data/study-roadmap.json` con las fases M0 a M10, roles de materiales, protocolo y semáforo, y cálculo de "en qué fase estás" (§6 bis) | Opus 5.5 · alto |
| 12b · Estudio: pantallas | Estudio como cards de roadmap, timeline de fases con "Estás acá" y perfil por fase (§6 bis) | Opus 5.5 · alto |
| 13 · Check-ins de salud | Peso al entrar a Entreno la primera vez del día, registro de corridas (minutos, km, sensación) y medidas mensuales (§6 ter) | Sonnet 5.5 · alto |
| 14 · Arreglos de Hoy | Aviso de bloque pasado que cuenta mal, títulos de meta cortados, toast que tapa el título y marcadores del mapa sin atenuar (§6 ter) | Sonnet 5.5 · medio |
| 15 · Un solo roadmap de matemática | *Absorbida por la 16c* (decisión del 2026-11-16): la matemática del Plan T+18 extendido (ventanas basadas en CONAMAT) pasa a ser el roadmap único (§6 ter) | — |
| 16a · Plan T+18 extendido: datos | `data/plan-extendido.json` (56 bloques en 4 etapas), validador y fechas derivadas con extras por bloque y atrasos que consume el colchón; sin tocar pantallas (§6 quater) | Opus 5.5 · alto |
| 16b · Plan T+18 extendido: calendario vivo | La app lee el calendario derivado en vez de las 78 semanas fijas, con migración sin romper `trazo.v1` (§6 quater) | Opus 5.5 · alto · *hecha* |
| 16c · Plan T+18 extendido: matemática y vistas | Ventanas y puertas 85/65, línea de tiempo por etapas, panel "hoy sos", alertas y fichas de proyecto. **Absorbe la ola 15:** un solo roadmap de matemática (§6 quater) | Opus 5.5 · alto · *hecha* |
| 17 · Rutina de las 08:00 y dormir a las 22:00 | Tercera opción en Buen día (levantarse a las 08:00) con su propio día; en la de las 04:00, entreno de 3 h (18:00 a 21:00), descanso de 21:00 a 22:00 y dormir siempre a las 22:00 (§6 quinquies) | Sonnet 5.5 · medio · *hecha* |
| 18 · Arreglos y calendario | *Hecha.* Submetas en la meta principal, sin zoom al escribir, sin modo entrevista y calendario sin pausas (§6 sexies, pasos 1 y 2) | Sonnet 5.5 · medio |
| 19 · Entreno | Tus rutinas (PPL + Upper/Lower, lunes a viernes), el horario de 18:00 a 22:00 y las Upper/Lower propias (§6 sexies, pasos 3 y 4) | Sonnet 5.5 · alto |
| 20 · Programación y metas por bloque | Unidades por área y sistema de libros (con tarjetas, test y tesis; carga *Measure What Matters* con sus 21 capítulos), metas por bloque con JSON y el roadmap de programación por proyectos (§6 sexies, pasos 5 a 7) | Opus 5.5 · alto |
| 21 · Idiomas y libros | Roadmap maestro v3: un idioma por año durante 6 años (inglés, francés, italiano, alemán, japonés y chino), 12 libros de consolidación, la biblioteca de 42 libros y el ascenso a C1, dentro de Estudio (§6 sexies, paso 8) | Opus 5.5 · alto |
| 22 · Orden de pantallas | Pasada de UX en Metas, Estudio y Hoy: pantallas livianas con subpáginas y botones, también en los roadmaps de matemática, programación e idiomas (§6 sexies, paso 9) | Sonnet 5.5 · medio |
| 23 · Clipping | Roadmap Clipper de 12 meses (de 0 a USD 10k/mes) con su propio apartado en Metas: plan, registro, cuentas, campañas, retainers, métricas y gráficos, y una UX/UI premium; se integra con Hoy, el mapa y las alertas (§6 sexies, pasos 10 a 12) | Opus 5.5 · alto |

## 6 bis. Olas 9 a 12: mejoras de uso

Salen de usar la app en el teléfono. Una rama y un PR por ola; se mergea a `main` cuando el CI está en verde.

**Ola 9 · Pulido de Hoy** (Sonnet 5.5 · medio) — *hecha*

- **Buen día:** pantalla completa, con el contenido que fluye y "Empezar el día" fijo abajo. Ya no es una hoja sobre un fondo, que se rompía con contenido largo. *Hecho.*
- **Meta abierta:** al abrirla no cambia de ancho ni de peso: la abierta o activa se subraya con el color del área. *Hecho.*
- **Modales:** hoja inferior (sube desde abajo, con asa, borde del color del área y botones grandes), en teléfono y en escritorio. *Hecho.* El componente reusable para la hoja de submetas se crea en la ola 10.
- **Mini reproductor:** tarjeta con el estado (Concentración, Descanso o En pausa), el bloque, el tiempo grande, el plan ("50/10 · 1 de 2"), play/pausa y barra de avance. *Hecho.* El bloque azul enorme era un choque de clases: usaba `.avance`, que también es la pantalla Avance; ahora usa clases `mini-*`.
- **Aceptación:** a 390 px sin desbordes, en claro y oscuro, y con movimiento reducido.

**Ola 10 · Metas: submetas y marcar por día** (Sonnet 5.5 · alto) — *hecha*

- **Modelo:** `Goal` suma `subs` (submetas), `subDone` (hechas por período) y `marks` (días marcados). El avance sigue guardándose por período, así que los gráficos no cambian. Migración de lo guardado y tests.
- **Nueva meta:** sección Submetas con **+ Agregar**, que abre una hoja para escribirla. Se listan y se quitan. Con submetas, la meta pasa a contar cuántas hiciste.
- **Semana:** cada meta se suma según su tipo: casilla en las tareas, `+1` grande en los contadores y una tira L M X J V S D donde se toca el día en las metas diarias ("comer mejor"). Las automáticas dicen "auto". Una línea arriba explica cómo se suma.
- **Aceptación:** una meta diaria se marca desde Semana en un toque y las submetas se marcan dentro de la fila.
- **Decisiones:** una meta con submetas es un contador de "pasos" y su avance se reinicia cada período. "Marcar día por día" solo existe en metas de la semana sin submetas; las futuras no se pueden marcar. Las metas con submetas o por día no ofrecen "Mostrar en Hoy", porque el `+1` rápido rompería su cuenta.
- **Arreglo aparte:** Nueva meta arrancaba en el área Eclipse, que está en stand-by, y la meta se guardaba pero no se veía en Semana. Ahora arranca en Salud y avisa si elegís un área en pausa.

**Ola 11 · Mapa de hitos** (Sonnet 5.5 · medio) — *hecha*

- **Diagnóstico primero:** hoy, al seleccionar un hito, otro se mueve de lugar. El mapa es de hitos y el orden solo tiene que depender de la fecha.
- **Claridad:** leyenda de símbolos (commit, hito grande, hito de `main`), filtro por rama, "hoy" marcado, hito seleccionado resaltado con su detalle debajo.
- **Aceptación:** test de que el orden no cambia al seleccionar. *Hecho.*
- **Causa:** `filasMapa` calculaba HEAD como "el último hito marcado como hecho si se adelantó". Tocar un hito futuro lo marcaba y HEAD saltaba a su fecha, reacomodando todo. Ahora HEAD es siempre hoy y marcar un hito solo lo pasa a trazo lleno.
- **Decisiones:** tocar un hito lo selecciona y abre un detalle fijo abajo (rama, fecha, estado y fecha planeada); marcar hecho, desmarcar o mover es un botón explícito del detalle, ya no un toque accidental. El filtro por rama atenúa las demás filas en vez de quitarlas, para que nada cambie de lugar. La leyenda explica commit, rombo, hitos de main, trazo lleno y punteado.

**Ola 12a · Estudio: datos del roadmap** (Opus 5.5 · alto) — *hecha*

- **Fuente:** `data/study-roadmap.json`, con las fases M0 a M10 del roadmap de matemáticas. Cada fase lleva libro núcleo, complementarios con su rol, cuándo activarlos, proyecto, salida de fase y duración.
- **Roles de material:** libro núcleo, complementario imprescindible, banco de ejercicios, curso de apoyo y referencia avanzada.
- **Protocolo por tema:** teoría del núcleo → ejercicios → corrección → mini test → complementario solo si hace falta → proyecto.
- **Semáforo:** verde desde 80 % (avanzar), amarillo de 65 a 79 % (activar complementario según el tipo de error), rojo bajo 65 % (volver al tema).
- **Libros que se dividen:** Stewart aparece en M3 (Cálculo I) y en M5 (Cálculo II y multivariable) con partes distintas.
- **En qué fase estás:** se calcula desde lo que ya registra Estudio (capítulos aprendidos y tests aprobados). Las salidas de fase son criterios a confirmar a mano.
- **Se valida al cargar y lleva tests.** Mismo patrón que `roadmap.json`. *Hecho.*
- **Lo que quedó:** `data/study-roadmaps.json` (matemática, 11 fases y 65 materiales), `src/data/study-roadmap.ts` (tipos, validación, semáforo, qué activar según el error, evidencia y en qué fase estás) y `src/state/estudio-ruta.ts` (tildar criterios, cerrar y reabrir fases). El estado suma `estudioRuta` y los guardados viejos arrancan sin progreso.
- **En qué fase estás:** las fases se cierran en orden y a mano, cuando tildás todos sus criterios de salida (terminar páginas no alcanza, como dice el roadmap). Los capítulos aprobados de la actividad de la fase se muestran como evidencia, no cierran la fase solos.
- **Qué activar:** concepto → complementario y después curso; técnica y enunciado → banco de ejercicios; descuido → nada, retest; profundidad → referencia y complementario. Nunca propone el núcleo.
- **Perfiles por fase** (derivados del roadmap, se cambian en el JSON): Estudiante con método (M0), Aritmético, Precalculista, Calculista, Probabilista para IA, Matemático de ingeniería, Numérico, Físico general, Mecánico, Termofluidista y Pre-aeroespacial (M10).
- **A confirmar:** (1) este roadmap no coincide con la ruta de `roadmap.json`, donde CONAMAT cubre los 69 capítulos de B1 a B6 hasta cálculo; acá M1 es CONAMAT y Serge Lang, y M2 es Stewart Precalculus. Hoy conviven: Estudio lee este archivo y la Ruta sigue leyendo `roadmap.json`. (2) Sumando las duraciones de cada fase da 45 a 57 meses; el cronograma por años del texto habla de 33. (3) M0 no tiene duración en el texto: quedó en 1 mes.

**Ola 12b · Estudio: pantallas** (Opus 5.5 · alto) — *hecha*

- **Estudio:** cards seleccionables por roadmap (Matemática primero). Lo de hoy (Repasar → Aprender → Comprobar) queda arriba, como acceso.
- **Detalle del roadmap:** timeline de fases con "Estás acá", el perfil de cada fase (por ejemplo "Aritmético") y el resto hasta el último.
- **Detalle de la fase:** qué libro manda, qué complementario activar y cuándo, el proyecto y qué tenés que poder hacer para pasar.
- **Aceptación:** se entiende en qué fase estás sin leer nada más, y sin desbordes a 390 px. *Hecho* (revisado a 390 px en claro y oscuro, de M0 a M10).
- **Rutas:** `#/estudio/ruta/matematica` (el roadmap) y `#/estudio/ruta/matematica/M1` (una fase). Pantalla en `src/screens/RoadmapEstudio.tsx`.
- **Estudio:** arriba "Tus roadmaps" (la card de matemática con la tira de fases, "Estás acá", el perfil que tenés y al que vas) y una card de Programación que lleva a Metas → Ruta, donde ya está su línea de tiempo. Abajo, "Lo de hoy", sin cambios.
- **Roadmap:** "Estás acá" con "Hoy sos → Vas a ser", la fase actual, sus criterios y la evidencia; la escalera de fases agrupada por año (cerradas con ✓, la actual con halo); "Cómo se usa" plegado con la regla, el protocolo, los cinco tipos de material y el semáforo.
- **Fase:** qué libro manda, bloques con sus temas, qué activar según cómo falla un test, los demás materiales por rol, lo que no entra, el proyecto y los criterios de salida. Solo la fase actual se tilda; con todos tildados se cierra y suena el sello. La última cerrada se puede reabrir.

**Decisiones abiertas:** nombres de los perfiles de cada fase (se derivan de la fase si no hay otros), y de dónde salen los roadmaps que no son de matemática. Si no hay más fuentes, la 12b arranca solo con matemática y deja la estructura lista.

## 6 ter. Olas 13 a 15: lo que falta mejorar de lo que ya existe

Mismo flujo: una rama y un PR por ola; se mergea a `main` con el CI en verde.

**Ola 13 · Check-ins de salud** (Sonnet 5.5 · alto) — *hecha*

- **Hoy:** el peso se carga a mano en Peso y nada lo pide; correr es un contador semanal `+1` sin tiempo ni distancia; el plan tiene hitos de "Control de peso y medidas", pero la app no guarda medidas.
- **Peso al entrar a Entreno:** la primera vez de cada día se abre una hoja inferior, "¿Te pesaste hoy?", con el último peso precargado, `−`/`+` de a 0,1 kg, "Guardar" y "Hoy no". Aparece una sola vez por día, aunque la saltees. *A confirmar: todos los días (por defecto) o solo los domingos, con la opción en Ajustes.*
- **Correr:** al tildar "Acompañar a Abi y correr" en Hoy o tocar `+1 Correr` se abre una hoja con minutos, km (opcional, con el ritmo calculado), tipo (suave, fondo o series) y cómo te sentiste (1 a 5). La meta semanal "Correr" pasa a sumarse sola con lo registrado y muestra los minutos de la semana. *A confirmar: si alcanzan esos datos.*
- **Medidas:** cintura, pecho y brazo, opcionales en la hoja del peso, una vez por mes y alineadas con los hitos del plan.
- **Datos:** `TrainState` suma `runs` y `medidas`; migración de lo guardado y tests. El JSON del día suma peso, corrida y medidas. Curva de corridas en Entreno y en Avance.
- **Aceptación:** al entrar a Entreno por primera vez en el día aparece la hoja del peso y no vuelve a aparecer ese día; una corrida registrada suma a la meta semanal sin tocar `+1`. *Hecho.*
- **Lo que quedó:**
  - **Peso:** la hoja "¿Te pesaste hoy?" se abre al entrar a Entreno, con el último peso precargado, `−`/`+` de a 0,1 kg (también se escribe), "Guardar peso" y "Hoy no". Se pregunta una sola vez por día (`pesoPreguntado`), aunque la saltees, y no durante una sesión de entreno. Sin un peso anterior, el primer `+` arranca en la meta menos 5 kg.
  - **Medidas:** cintura, pecho y brazo en cm, opcionales, dentro de la misma hoja cuando pasaron 28 días o más desde las últimas. También se cargan y borran en la pantalla Peso.
  - **Corrida:** la hoja "¿Cuánto corriste?" pide minutos (de a 5), km opcional con el ritmo calculado, tipo (suave, fondo o series) y sensación de 1 a 5. Se abre al tildar "Correr" en Hoy (si todavía no cargaste la de hoy), con el `+` de la meta semanal y con "Registrar corrida" en Entreno. Una corrida por día: otra el mismo día la reemplaza.
  - **Meta "Correr":** pasa a sumarse sola (cuenta corridas de la semana) y muestra los minutos y km; las guardadas antes se migran. Ya no tiene botón `+1` rápido en Hoy.
  - **Gráficos:** barras de minutos de las últimas 8 corridas en Entreno y en Avance, con descripción para lectores de pantalla.
  - **JSON del día:** suma `salud: { peso, corrida, medidas }` (null lo que no se cargó).
  - **Datos:** `TrainState` suma `runs`, `medidas` y `pesoPreguntado`; los guardados viejos arrancan vacíos. 16 tests nuevos.
- **Pendiente a propósito:** pedir el peso solo los domingos en Ajustes (hoy es todos los días, salteable); minutos de otras actividades de cardio distintas de correr.

**Ola 14 · Arreglos de Hoy** (Sonnet 5.5 · medio) — *hecha*

- **Aviso de bloque pasado:** si entrás en foco en un bloque que ya terminó, Hoy dice "Matemática se pasó 644 min" y acorta el siguiente a 0. Tiene que contar desde que empezó el foco, no desde el fin del bloque (`avisoPasado` en `src/data/avisos.ts`), con test.
- **Títulos de meta cortados** ("Matemática · CON…"): el rango "07:55-08:10" ocupa mucho. En la fila va solo la hora de inicio (§3 bis) y el rango completo al abrirla.
- **Toast inicial:** el "Sello nuevo" tapa el título al entrar; baja de la zona del título o espera a que termine la entrada.
- **Mapa (pendiente de la ola 11):** el filtro por rama también atenúa los marcadores del dibujo, no solo las filas.
- **Aceptación:** a 390 px los títulos de las 10 metas de Hoy se leen enteros o casi, sin desbordes, en claro y oscuro. *Hecho:* sin desbordes y los títulos medianos se leen enteros; los muy largos ("Programación · Consolidación", "Acompañar a Abi y correr") siguen cortándose con elipsis, como pide §3 bis.
- **Lo que quedó:**
  - **Aviso de bloque pasado:** el foco guarda cuándo empezó (`startedAt`; los guardados antes se estiman desde el tramo actual) y `avisoPasado` no avisa si el foco arrancó cuando el bloque ya había terminado: eso es llegar tarde, no pasarse. Con foco que empezó a tiempo y siguió después del fin, avisa igual.
  - **Fila de meta:** lleva solo la hora de inicio (Geist Mono, `--sub`, a la derecha del título). El rango completo ("04:30–06:30") va en la línea de arriba al abrir la meta.
  - **Toasts:** pasan abajo, encima de la barra o del mini reproductor, con un máximo de 3 a la vez, y nunca tapan el título. En escritorio salen abajo a la derecha del riel. Quedan por debajo de los modales y las hojas.
  - **Mapa:** el filtro por rama atenúa también los marcadores, las líneas de las otras ramas, las entregas y las flechas.
  - 8 tests nuevos.

**Ola 15 · Un solo roadmap de matemática** — *absorbida por la 16c* (decisión del 2026-11-16). Lo de abajo queda como contexto; se resuelve dentro de la 16c.

- **Hoy conviven dos:** Estudio usa el roadmap M0 a M10 (`data/study-roadmaps.json`); la Ruta y el plan siguen con CONAMAT de B1 a B6 (`data/roadmap.json`, `data/plan.json`).
- **A decidir:** cuál manda, y las duraciones (las fases suman 45 a 57 meses; el cronograma del texto habla de 33).
- **Qué sale:** la Ruta, Hoy (el capítulo del día) y el mapa leen el mismo roadmap; actividades de Estudio para M2 en adelante (Stewart, Strang, Blitzstein…), así esas fases también tienen evidencia; tests de que los dos lados coinciden.

## 6 quater. Ola 16: Plan T+18 extendido

**Opus 5.5 · alto.** Es la ola más grande, así que se parte en tres PRs que se pueden mergear solos:
- **16a · datos** (*hecha*): el calendario como datos, validado, con fechas derivadas. No cambia ninguna pantalla.
- **16b · calendario vivo** (*hecha*): la app deja de leer las 78 semanas fijas y lee el calendario derivado; migración.
- **16c · matemática y vistas** (*hecha*): ventanas y puertas con semáforo 85/65, línea de tiempo por etapas, panel "hoy sos", alertas y fichas de proyecto. Absorbe la ola 15.

**Decisiones tomadas (2026-11-16):** las semanas extra de feature vienen **prendidas por defecto** (calendario de 196 semanas); se apagan por bloque. La ola se parte como arriba. El prompt completo se guardó en `docs/prompts/plan-t18-extendido.md`.

**Fuente de verdad:** el prompt "Plan T+18 extendido (programación + matemática)", con los dos roadmaps completos. Se adjunta al arrancar la ola y se guarda en `docs/prompts/plan-t18-extendido.md`.

**Qué es**
- **Cuatro etapas desde el 16 nov 2026:** núcleo (53 semanas base), ciberseguridad (25), quant (38) y aeroespacial (55). Total: 171 semanas base y 196 con las semanas extra por feature diferencial, unos 45 meses.
- **Contenido:** 27 proyectos, 12 ventanas de matemática (W1 a W4, WQ1 a WQ3, WA1 a WA5) y 7 certificaciones (C1 a C7).
- **Matemática por ventanas:** cada ventana va antes del proyecto que la pide, con libro principal, refuerzo según el tipo de error, tests por capítulo y una pieza matemática hecha a mano dentro de cada proyecto.

**Reglas que la app tiene que aplicar**
1. 85 % o más aprueba y pasa a la tesis; 65 a 84 % activa el refuerzo según el error y retest; menos de 65 % vuelve al tema.
2. Una ventana siempre va antes de su proyecto. Si la puerta no cierra, la programación pasa a matemática y se descuenta del colchón (2 semanas al final de la etapa 1). Las fechas siguientes se corren solas.
3. Un proyecto no cierra sin: un número medido contra una referencia externa, un tercero que lo valide y un informe público; además, tests y seguridad.
4. Si falta tiempo se recorta alcance y la feature diferencial. Nunca tests, seguridad, revisiones, repasos, sueño ni entrenamiento.
5. Una tecnología nueva por proyecto como máximo y ninguna en bloques con certificación.
6. Capital real: nada hasta cumplir una puerta escrita (12 semanas o más de paper trading, resultados netos de costos con intervalo de confianza, kill-switch probado y límite de pérdida fijado antes). No es asesoramiento financiero.
7. Hacking solo sobre lo propio o con permiso escrito; sectores regulados solo con modelos educativos y datos públicos o sintéticos.

**Pasos** (un commit por paso, con tests; los pasos 1 a 3 son la 16a, el 4 la 16b y del 5 al 7 la 16c)
1. **Diagnóstico y esquema:** qué existe, qué cambia, cómo se migra y qué se asume (se devuelve antes de escribir código).
2. **Datos:** `data/plan-extendido.json` con etapas y bloques (id, etapa, tipo, semanas base, semanas extra, depende de, estado) y un validador. Tests: ids únicos, referencias rotas, ciclos, fechas coherentes y sumas por etapa (53, 25, 38 y 55 en base).
3. **Fechas derivadas:** inicio más la suma de semanas en orden. Cambiar una duración recalcula todo lo que sigue, y la feature extra se prende o apaga por bloque.
4. **Migración:** el calendario deja de tener 78 semanas fijas, sin romper `trazo.v1` ni las sesiones guardadas.
5. **Matemática:** ventanas y puertas con semáforo 85 / 65, libro de refuerzo por tipo de error y retest.
6. **Vistas:** línea de tiempo a escala con la etapa actual, panel "hoy sos" con el último perfil desbloqueado y el siguiente, y alertas de vencimiento de certificaciones y cierre de ventanas.
7. **Proyecto:** ficha con checklist de evidencia, pieza matemática y perfil al terminar.

**Ola 16a · lo que quedó y decisiones**
- **Archivos:** `data/plan-extendido.json` (56 bloques: 27 proyectos, 12 ventanas, 7 certificaciones, pausas, colchón y cierres, en 4 etapas), `src/data/plan-extendido.ts` (tipos, validador y calendario derivado) y `src/data/plan-extendido.test.ts`. El JSON se generó leyendo la tabla del prompt, no a mano.
- **Fechas derivadas:** no están en el JSON. `calendario()` suma semanas desde T0 en orden. Opciones: `extras` (`true` por defecto, `false`, o un mapa por bloque) y `atrasos` por bloque.
- **Atrasos y colchón:** un atraso en una ventana o proyecto corre las fechas siguientes, pero el colchón de la etapa se lo come hasta sus 2 semanas; solo lo que sobra corre la etapa siguiente. Un colchón consumido del todo dura 0 semanas.
- **Validador:** ids únicos, referencias rotas, una ventana siempre antes del proyecto que la pide y que sea una ventana, ciclos, etapas en orden, extras solo en proyectos, `t0` lunes y sumas por etapa (53, 25, 38 y 55 en base; 11, 3, 6 y 5 de extras). Corre al cargar, como `roadmap.json`.
- **Prueba clave:** el test lee la tabla de `docs/prompts/plan-t18-extendido.md` y compara las fechas derivadas de los 56 bloques, sin extras y con extras, más el fin de cada etapa. Coinciden todas.
- **Contra lo que ya está:** todos los proyectos y certificaciones de `plan.json` están con la misma duración base; las etapas 1 y 2 suman sus 78 semanas. Lo que cambia (W1 de 2 a 3 semanas, W2 de 3 a 4, W3 de 2 a 4 y el colchón de 6 a 2) está cubierto por un test, para que la 16b lo tenga presente.
- **Todavía no se usa:** ninguna pantalla ni `plan.ts` lee el archivo nuevo. Eso es la 16b.
- **Pendiente para las fichas de proyecto (16c):** feature diferencial, tecnología nueva, pieza matemática, validador y evidencia de cada proyecto, que hoy están solo en el prompt.

**Ola 16b · lo que quedó y decisiones**
- **T+18 = cierre de la etapa 2, derivado.** `SEMANAS` deja de ser 78 fijo: con las semanas extra de feature son **92** (T+18 el 20 ago 2028); sin ningún extra vuelven a ser 78 (14 may 2028). T+0, T+2 y T+12 son fechas de calendario y no se mueven.
- **Calendario vivo:** `src/data/plan.ts` arma `TRAMOS` con las etapas 1 y 2 del calendario derivado (29 tramos) y conserva el detalle de `plan.json` (qué, stack, perfil, industria). Los ids que cambiaron se mapean: `pausa` → `PAU1` y `colchon` → `COL`. Las etapas 3 y 4 quedan para la línea de tiempo de la 16c.
- **Recalcular:** `aplicarCalendario(apagados)` recalcula todo (tramos, semanas, bimestres, T+18, matemática y bimestres). Corre al cargar y cada vez que cambia `plan.extrasApagados`. Los valores exportados son `let`, así que todas las pantallas ven el calendario nuevo sin cambiar cómo los leen.
- **Extras por proyecto:** Ajustes → Plan T+18 → "Semanas extra por feature", con un interruptor por proyecto (P1 a P10 y S1 a S3) y la fecha de T+18 que resulta. Se guarda en `plan.extrasApagados` y sobrevive a recargar.
- **Matemática:** las ventanas (W1 a W4) salen del calendario y los tramos diarios llenan los huecos. W1 ahora dura 3 semanas, W2 4 y W3 4, y se suma W4 (habilita S1). Los libros siguen siendo los de `plan.json`; alinearlos con el prompt es la 16c.
- **Bimestres:** pasan a ser 11 (el último de 2 semanas). B1 conserva "El despegue"; los demás nombres y la meta de programación de cada bimestre salen de lo que cae en él ("Escudo y Surco v1", "P2 Escudo, W1 y P3 Surco v1"), porque los de antes describían el calendario comprimido. Las metas de las otras ramas siguen las del plan; en B10 y B11 repiten las de B9. Los nombres que renombraste a mano se respetan.
- **Hitos anclados:** los de programación y la ventana W1 siguen a su tramo (P1 cierra el 3 ene 2027, P2 el 7 feb, W1 el 28 feb y Surco v1 arranca el 1 mar y cierra el 28 mar). En la pestaña Trimestre quedan 27 de los 30 hitos iniciales; los otros 3 pasan al segundo trimestre.
- **Colchón en vez de semanas ganadas:** como la etapa 2 ocupa el margen viejo, la tarjeta de la Ruta muestra el colchón (2 semanas al final de la etapa 1), más lo que adelantan los proyectos y menos lo que atrasan las puertas de matemática.
- **Portfolio agéntico:** los contadores de Perfil cuentan 14 proyectos (P0 a P10 y S1 a S3).
- **Textos:** "vuelven en mayo de 2028" pasa a salir de la fecha de T+18 ("agosto de 2028"); la tira de semanas de la Ruta y la grilla de bimestres se adaptan a la cantidad.
- **Migración:** la clave sigue siendo `trazo.v1`. El avance guardado por proyecto, ventana e hito usa los mismos ids; lo único nuevo es `plan.extrasApagados`, opcional.
- **Tests:** 25 tests tenían las fechas del calendario comprimido; se reescribieron contra el calendario nuevo (las fechas salen de la tabla del prompt). Se sumaron tests del recálculo al apagar extras, de los tramos de matemática y de los bimestres.

**Ola 16c · lo que quedó y decisiones**
- **Datos** (`data/plan-extendido.json`, validados): ficha de los 27 proyectos (rubro, feature, tecnología nueva, visual, pieza matemática, referencia externa, validador y perfil), matemática de las 12 ventanas y de los tramos diarios (libro principal, refuerzo con su rol, qué habilita y perfil), las 7 certificaciones (costo tal cual el prompt y si está verificado; C1, C3 y C5 quedan "sin verificar"), los perfiles por hito y las decisiones abiertas como flags.
- **Un solo roadmap de matemática (absorbe la ola 15):** Estudio → Matemática muestra los 17 tramos del plan (diarios y ventanas, de T+0 a WA5) por etapa, con "Estás acá", "Hoy sos → Vas a ser" y el detalle de cada tramo: qué libro manda, qué habilita, la puerta y qué refuerzo abrir según el error (concepto → intuición o curso, técnica y enunciado → banco, profundidad → libro duro). Los perfiles salen de M0 a M10 donde aplica (Aritmético, Precalculista, Calculista…) y se suman los nuevos (Criptógrafo aplicado, Quant…). M0 a M10 queda como "Material de refuerzo" enlazado desde cada tramo. Los libros del calendario vivo (Hoy, la Ruta) pasan a ser los del prompt.
- **Semáforo 85/65 en todo:** la regla del plan (85 % aprueba y pasa a la tesis) reemplaza al 80 % que traía M0 a M10.
- **Puertas:** salen de las dependencias del plan; se suma W4 → S1.
- **Las 4 etapas** (`#/metas/etapas`, desde la Ruta): barras a escala de cada etapa con la actual marcada, el perfil al cerrarla y la lista de bloques; el panel "hoy sos" (último proyecto cerrado o hito pasado, y el que sigue); alertas de certificaciones en 8 semanas o menos (con costo y si falta verificar), de ventanas que cierran en 7 días sin la puerta aprobada y de decisiones con fecha en 14 días (Security+ el 22 nov); y las decisiones abiertas.
- **Ficha de proyecto:** cada proyecto, certificación y ventana muestra su ficha. Los bloques de las etapas 3 y 4 tienen una ficha propia con sus fechas y los recordatorios (no es asesoramiento financiero; sin hardware real).
- **Puerta de evidencia:** número medido contra una referencia externa, un tercero que lo valida y un informe público. Sin las tres, el proyecto no cierra (también P0).
- 14 tests nuevos (fichas, validador, roadmap de matemática, refuerzo por error, perfiles, etapas, alertas y evidencia); se actualizaron 2.

**Cómo encaja con lo que ya está**
- **Etapas 1 y 2 = 78 semanas base, igual que hoy.** Hoy el plan tiene 78 semanas: 53 de programación (19 tramos) y 25 de "Margen". La etapa 2 de ciberseguridad ocupa justo ese margen, y el hito T+18 es el cierre de la etapa 2.
- **Cambia en la etapa 1:** W1 pasa de 2 a 3 semanas, W2 de 3 a 4, W3 de 2 a 4 y el colchón de 6 a 2. Cada proyecto con feature suma 1 o 2 semanas.
- **Con extras, T+18 se mueve** de mayo de 2028 al 20 de agosto de 2028 (+14 semanas), y la app lo dice en muchos textos.
- **Impacto en el código:** 13 archivos leen `SEMANAS`, `TRAMOS` o `FIN_PROGRAMACION`, y el mapa, la Ruta, Hoy y los hitos dependen de eso.
- **Matemática:** es un tercer roadmap, de ventanas y basado en CONAMAT como el de `plan.json`. **La 16c absorbe la ola 15** (decidido el 2026-11-16): el roadmap de matemática de este plan pasa a ser el único, Estudio y la Ruta lo leen, y M0 a M10 (`data/study-roadmaps.json`) queda como material de refuerzo por tipo de error.

**Aceptación**
- Validador de JSON con tests, y tests del recálculo de fechas y de la regla 85 / 65.
- Funciona offline como PWA y todo gráfico tiene una lista alternativa.
- Migración reversible, sin perder sesiones existentes.
- UI mínima y funcional: el diseño visual lo definís vos.

**Decisiones abiertas (flags editables, no se resuelven en la ola)**
- Security+ SY0-801 o SY0-701 (se decide el 22 nov 2026).
- Precios sin verificar: AWS SAA, CKA y AWS MLA; OSCP+ solo con un fragmento.
- Confirmar los reemplazos propuestos: P8 (red teaming de agentes), P9 (inferencia en CPU), Q2 (réplica de papers), Q6 (datos de mercado) y A6 (open source).
- Revisión de mercado de abril de 2028: seguir o achicar quant y aeroespacial.
- Marco legal e impositivo de trading desde Argentina antes de capital real.
- Alinear las páginas del canvas visual de Trazo con este calendario.
- Si una carrera universitaria entra al plan: hoy no, camino autodidacta.

## 6 quinquies. Ola 17: rutina de las 08:00 y dormir a las 22:00

**Sonnet 5.5 · medio.** Pedido del 2026-11-16. *Hecha.*

**Hoy** (búsqueda intensiva, lunes a viernes): rutina 04:00, matemática 04:30, programación 06:30, Abi 08:30, trabajo 10:00, caso 12:00, inglés 13:30, búsqueda 15:00, clipping 16:30, entreno 18:00 a 20:00, cierre 20:00 a 21:00 y dormir a las 21:00.

**Qué cambia**
- **Levantarse a las 04:00:** queda igual, salvo el final del día. El entreno pasa de 2 h a 3 h (18:00 a 21:00), "Descansar y preparar mañana" va de 21:00 a 22:00 y se duerme a las 22:00.
- **Levantarse a las 08:00** (tercera opción en Buen día, junto a 04:00 y 05:00):

| Hora | Bloque |
|---|---|
| 08:00 – 08:30 | Rutina de la mañana |
| 08:30 – 10:00 | Acompañar a Abi y correr |
| 10:00 – 12:00 | Trabajo |
| 12:00 – 13:30 | Programación |
| 13:30 – 15:00 | Búsqueda laboral |
| 15:00 – 16:30 | Matemática |
| 16:30 – 18:00 | Inglés |
| 18:00 – 21:00 | Entrenamiento |
| 21:00 – 22:00 | Descansar y preparar mañana |
| 22:00 | Dormir |

- **Dormir a las 22:00 siempre:** el check de dormir de Hoy pasa a las 22:00.
- **Lo que sale en la de las 08:00:** clipping y el caso para entrevistas no entran (la programación del mediodía queda como un solo bloque). La matemática pasa a la tarde, así que su etiqueta de Hoy y la sesión de estudio la siguen igual.
- **Datos:** `data/routines.json` (la variante de las 08:00 y los horarios nuevos), validación y tests; los días ya guardados no cambian.

**Decidido (2026-11-16)**
1. Es **08:00**, y solo cuando te levantás a esa hora: las opciones de 04:00 y 05:00 siguen en pie.
2. La de las 08:00 vale también el **fin de semana** (el día libre sigue igual).
3. **Dormir a las 22:00 en todas las rutinas**, por ahora.

**Lo que quedó**
- `data/routines.json` suma `tarde` (wake 08:00 y los 10 bloques de la tabla). Reusa los ids de siempre (`math`, `prog`, `ingles`, `entreno`…), así la sesión de estudio, las puertas, el entreno y las etiquetas funcionan igual. Se valida al cargar.
- **Buen día:** tres opciones (04:00, 05:00 y 08:00) más "Otra hora". Si abrís Trazo desde las 07:30, propone la de las 08:00, y muestra el día completo en vez de solo la mañana.
- **Búsqueda intensiva a las 04:00 y 05:00:** entreno de 18:00 a 21:00 (3 h), "Descansar y preparar mañana" de 21:00 a 22:00 y "Dormir a las 22:00". El fin de semana el descanso se estira hasta las 22:00.
- **Otras rutinas:** lunes a viernes y con trabajo: desconexión de 20:00 a 21:00 y "Cerrar y preparar mañana" de 21:00 a 22:00. Fin de semana: la desconexión llega a las 22:00. Día libre: se duerme a las 22:00.
- **Horas por semana de la intensiva:** el entrenamiento pasa de 10 a 15 h.
- 5 tests nuevos y 3 actualizados.

## 6 sexies. Olas 18 a 23: lo pendiente, en seis olas

Pedido del 2026-11-16: juntar las nueve olas que había planeado en pocas, pero no en una sola. Quedan **seis olas** (la 21 se sumó con el roadmap de idiomas y la 23 con el de clipping) que siguen el orden en que se necesitan unas a otras, con **un PR por ola** y **un commit por paso** (con sus tests). Cada paso deja la app funcionando.

| Ola | Pasos | Modelo · esfuerzo |
|---|---|---|
| 18 · Arreglos y calendario | 1 y 2 | Sonnet 5.5 · medio |
| 19 · Entreno | 3 y 4 | Sonnet 5.5 · alto |
| 20 · Programación y metas por bloque | 5, 6 y 7 | Opus 5.5 · alto |
| 21 · Idiomas y libros | 8 | Opus 5.5 · alto |
| 22 · Orden de pantallas | 9 | Sonnet 5.5 · medio |
| 23 · Clipping | 10, 11 y 12 | Opus 5.5 · alto |

La 20 va antes que la 21 porque el roadmap de idiomas usa el sistema de libros y las metas por bloque que se construyen en la 20. La 22 va última porque ordena las pantallas de los tres roadmaps. La 19 no depende de ninguna otra. **Orden elegido (2026-11-16): 18 → 20 → 19 → 21 → 22 → 23**, así *Measure What Matters*, que ya corre desde hoy, usa el motor de libros lo antes posible. La 23 va **última por pedido**; se arma con los criterios de la 22 (pantallas livianas con subpáginas) desde el principio.

**Decidido (2026-11-16)**
1. **Corte de 85 % en todo**: tests, puertas, semáforo, **idiomas y libros**. El 90 % de los textos de estudio no se usa. Los simulacros de Cambridge se miden contra su propia escala (sobre 180).
2. **Se conserva el sistema de estudio actual** (día 1 estudiar, día 2 test, día 3 tesis, repasos a +8, +22 y +61, tarjetas FSRS y tope de 20 min de repaso). Solo se suman las unidades por área y el sistema de libros, **que usa ese mismo motor**: tarjetas (los "ankis"), test y tesis.
3. **Las pausas no existen:** se sacan del calendario. Los stand-by de Handyx y ventas son otra cosa y se quedan.
4. **Sin modo entrevista:** si hay una entrevista, se practica el día anterior con el pitch armado en el bloque de búsqueda laboral; si es en inglés, en ese mismo bloque.
5. **"Meta padre"** es la meta principal con sus submetas: las metas numeradas de Hoy y las de Metas.
6. **Entreno:** la semana es **PPL + Upper/Lower de lunes a viernes**; **sábado y domingo son libres**. Upper el jueves y Lower el viernes. Los estiramientos van de 21:00 a 22:00. "Abi" en el texto era una anotación, no un RIR. Se corrigen los dos detalles (dominada con agarre neutro y "Wrist extension" con extensores del antebrazo).
7. **Idiomas:** el roadmap se adapta **solo a la rutina de búsqueda intensiva** (lunes a viernes y fin de semana) y mantiene las **11,5 h por semana**. La rutina "con trabajo" se arma más adelante, cuando haya trabajo, **y también va a conservar las 11,5 h**; hasta entonces no se toca.
8. **El año 2 (francés) arranca el 27 de diciembre de 2027**, como dice el roadmap, aunque sea unos 8 meses antes de T+18.
9. **Ensayo y examen trimestral** cada 13 semanas desde el inicio de cada año, y la **tesis anual** en la última semana del año.
10. **Capítulos:** pasaste el índice de *Measure What Matters* (ya está en `docs/prompts/measure-what-matters-indice.md`: 21 capítulos y 5 recursos). Los demás libros se cargan con el JSON del paso 6.
11. **Seis olas** (18 a 23), no una sola ni nueve. La última es **Clipping**.
12. **Orden de las olas:** 18 → 20 → 19 → 21 → 22 → 23 ("como vos digas": la recomendación se adopta).
13. **A y B del entreno alternan por semana** (una semana A, la otra B).
14. **Artefacto de *Measure What Matters*:** por ahora no. Primero se lee el libro y después se aplica; el hito del bloque queda en la tesis final y los 3 min hablados, y el artefacto se define al terminarlo.
15. **Los dos "Descanso"** de noviembre de 2028 y 2029 se quedan. **Security+:** la versión la decidís vos el 22 de noviembre.

**A y B** (confirmado): como Pull, Legs y Push tienen versión A y versión B y hay un solo día de cada una, se alternan por semana (semanas impares del plan con las A, pares con las B). Upper y Lower son iguales todas las semanas.

---

### Ola 18 · Arreglos y calendario (Sonnet 5.5 · medio) · *Hecha*

**Lo que quedó:** 352 tests pasando (11 nuevos y los de fechas reescritos).
- **Submetas:** `addSub` y `removeSub` en `src/state/goals.ts` (solo metas manuales y sin tira diaria); hoja compartida `HojaSubmeta` (Nueva meta, Metas y Hoy). En Hoy la submeta es una tarea más de la meta numerada (`addTask`).
- **Sin zoom:** regla base `input, textarea, select { font-size: 16px }`, `.campo-texto`, `.celda input` y el editor de JSON a 16 px; `src/styles/zoom.test.ts` falla si algún campo baja de 16 px o si el viewport bloquea el pellizco. `useTeclado` deja la hoja sobre el teclado (`--teclado`).
- **Entrevista:** `ajustarDia` ya no reemplaza ni parte nada; `entrevistaCerca` mira solo el día siguiente y marca si es en inglés (por la modalidad). El aviso entre ramas lleva a `#/metas/trabajo`. El bloque de inglés de la intensiva conserva su texto hasta la ola 21.
- **Calendario:** se sacaron PAU1 a PAU4 y el tipo de tramo `pausa` pasó a `descanso` (DES3 y DES4). 90 semanas con extras, 76 sin ninguno; `docs/prompts/plan-t18-extendido.md` regenerado (52 bloques, 167 semanas base y 192 con extras).

**Paso 1 · Arreglos de uso**

- **Submetas en la meta principal.** Cada meta abierta en Hoy suma **+ Agregar submeta** (con la hoja de la ola 10) y cada meta de Metas suma **+ Submeta**. Mismos datos que hoy (`submetas` de la meta); la meta padre muestra "2 de 5" y se completa sola cuando están todas.
- **Sin zoom al escribir en el teléfono.** Todos los campos pasan a **16 px o más** (el zoom de iOS se dispara por debajo de eso) y la hoja se acomoda sobre el teclado sin cortarse. El zoom de accesibilidad con pellizco se conserva: **no** se bloquea con `maximum-scale` ni `user-scalable=no`.
- **Entrevista sin modo propio.** Se saca el reemplazo "Inglés · modo entrevista" y la partición de la búsqueda (`ajustarDia` en `routines.ts`). El día anterior a una entrevista, el bloque de búsqueda laboral suma "Practicar la entrevista de mañana con el pitch armado" y, si es en inglés, "Practicarla en inglés" en ese mismo bloque. El aviso entre ramas pasa a decir lo mismo. (El bloque de inglés de la intensiva queda con su texto actual hasta la ola 21.)
- *Tests:* submetas en Hoy y Metas, tamaño de campos (no hay `font-size` < 16 px en inputs, textareas y selects), la hoja con el teclado, y el día anterior a una entrevista con y sin inglés.

**Paso 2 · Calendario sin pausas**

- Se sacan las 4 pausas de fin de año (PAU1 a PAU4) de `data/plan-extendido.json` y el alias `PAU1: 'pausa'` de `plan.ts`. Los bimestres, los hitos anclados y los textos que decían "pausa de fin de año" se actualizan.
- **Fechas nuevas:** T+18 pasa del 20 al **6 de agosto de 2028** (90 semanas) y el plan termina el **21 de julio de 2030**; W1 pasa a ser del 1 al 21 de febrero de 2027 y Surco v1 arranca el 22 de febrero. Los dos "Descanso" se quedan. **Security+ (C2)** pasa al 31 de mayo a 20 de junio de 2027 y sigue terminando después del 11 de junio: depende de la versión que elijas el 22 de noviembre, y la alerta de decisión lo avisa.
- Las extras apagables y el colchón siguen igual. Se actualiza la tabla de `docs/prompts/plan-t18-extendido.md` y los tests que comparan fechas.
- *Tests:* fechas derivadas de las 90 semanas, hitos y bimestres sin pausa, alertas, y "la app arranca con lo guardado" (un estado guardado con las pausas encendidas o apagadas no rompe).

---

### Ola 19 · Entreno (Sonnet 5.5 · alto)

**Paso 3 · Entreno con tus rutinas.** Reemplazan a las de partida de la ola 5.

- **Seis rutinas tuyas:** Pull A, Legs A, Push A, Pull B, Legs B y Push B. El texto completo que pasaste se guarda en `docs/prompts/rutinas-entrenamiento.md` al arrancar.
- **Semana:** lunes Pull, martes Legs, miércoles Push, jueves Upper, viernes Lower; **sábado y domingo libres**, también en la rutina de las 08:00. A y B alternan por semana.
- **Más datos por ejercicio** (`src/data/train-types.ts`): tempo con su descripción, RIR objetivo por serie, guía de posicionamiento, guía de RIR, parciales, dropset, consejos, músculos, objetivo y grupo. Los pesos de arranque entre paréntesis (40 kg en la dominada, 10 kg en el curl y el encogimiento) pasan a ser el **peso inicial** y salen del nombre.
- **Sesión:** cada serie muestra su RIR y el tempo; **"Cómo se hace"** abre una hoja con la guía, los consejos y los músculos; el calentamiento es una lista que se tilda; se puede anotar el **RIR que te quedó** (opcional). La doble progresión sigue igual.
- **El horario:** de 18:00 a 21:00 son 30 min de caminata de ida, **2 h de entreno** y 30 min de vuelta; cada rutina estima su tiempo y **avisa si pasa de las 2 h**. De **21:00 a 22:00:** "Bañarse, estirar, comer y escribir" (el estiramiento con los músculos del día) y de ahí a dormir a las 22:00.
- **Lo guardado no se pierde:** las sesiones, los récords y los pesos siguen; las rutinas viejas se archivan; `migrate()` convierte lo que haga falta.
- *Tests:* validación de las 6 rutinas, el calendario A/B, semana con sábado y domingo libres, estimación de tiempo y aviso de más de 2 h, migración del estado viejo y la hoja "Cómo se hace".

**Paso 4 · Upper y Lower propias.** Las diseño con tu estilo (tempo 2-1-2, RIR 2, 1 y 0, 8 a 12 repeticiones) y tus ejercicios, con **otros ángulos** que el Push, Pull y Legs de la misma semana, para que cada músculo se entrene dos veces por semana con un volumen parecido. Entran en una plantilla **"PPL + Upper/Lower"** que pasa a ser la de fábrica. Una prueba cuenta las series por músculo y por semana para que no quede ninguno por debajo del resto.

---

### Ola 20 · Programación y metas por bloque (Opus 5.5 · alto)

**Paso 5 · Unidades por área y sistema de libros** (dentro del motor actual, 85 %)

| Área | Una unidad es |
|---|---|
| Matemática | 1 capítulo |
| Programación, IA y DevSecOps | 1 bloque del curso (unas 4 partes) |
| Lenguajes | 1 capítulo, unidad o bloque |
| **Libros** | **2 capítulos** |

- **Sistema de libros.** Cada libro (`data/libros.json`) tiene capítulos y recursos. Por unidad de 2 capítulos: lectura con una **micro-tesis por capítulo** (una frase en tus palabras), **tarjetas** (los "ankis") que salen de las micro-tesis y de lo que marques, un **mini-test** de la unidad y la **tesis de la unidad** a los 3 días. Al terminar el libro: **test final**, **tesis final** y el **artefacto** (framework, análisis, política o speech): sin artefacto no cuenta como terminado, como la evidencia de un proyecto (**excepto *Measure What Matters***: primero se lee y el artefacto se define al terminarlo). Repasos a +8, +22 y +61 y tope de 20 min de repaso, como siempre.
- **El primer libro es *Measure What Matters*** (el que ya estás leyendo desde hoy): 21 capítulos y 5 recursos del índice que pasaste, en 11 unidades (7 en la parte 1 y 4 en la parte 2; ver `docs/prompts/measure-what-matters-indice.md`). Los demás libros entran sin capítulos, con el estado "capítulos sin cargar", y se llenan con el JSON del paso 6.
- Vale para las demás áreas con la misma regla de unidad: el plan de hoy en Estudio dice "Unidad 3 de 11 · caps. 5 y 6".
- *Tests:* reparto de las 11 unidades dentro de las 6 semanas, unidad impar (cap. 21 con el Resource 1), corte de 85 % en el mini-test y el final, micro-tesis que generan tarjetas, libro sin artefacto no cuenta como terminado, y las otras áreas conservan lo que ya tienen.

**Paso 6 · Metas por bloque e importar JSON**

- Cada proyecto, ventana, libro o unidad tiene **sus metas propias** (con submetas): se arman a mano, se tildan, editan y borran.
- **Importar con un JSON:** formato documentado con ejemplo en `docs/`; Trazo valida **línea por línea**, muestra **"Qué cambia"** antes de guardar y conserva el avance. También sirve para cargar **los capítulos de un libro**, y se **exportan** las tuyas. Reusa el importador de la ola 8.
- *Tests:* validación con errores por línea, "Qué cambia" (agrega, cambia, saca), importación repetida (no duplica) y exportar → importar da lo mismo.

**Paso 7 · Roadmap de programación por proyectos**

- La card "Programación" de Estudio deja de mandar a leer el Tutorial de Python y pasa a ser un **roadmap por proyectos**, con la estructura del de matemática: "Estás acá", "Hoy sos → Vas a ser" y la escalera de P0 a A7. La meta de programación de Hoy sale de las metas del proyecto en curso (paso 6). Se saca la actividad `prog-b1` ("Python y FastAPI") de `study-catalog.ts` sin perder lo ya estudiado.
- Cada proyecto tiene **subpáginas** con botones: **Resumen, Stack y tecnología nueva, Metas, Evidencia, Pieza matemática y Entrega**. En P0 se arman las metas.
- Las **12 ventanas de matemática** suman su **nivel de salida** como lista de criterios que se tilda (por ejemplo, W1: resolver ecuaciones y desigualdades sin ayuda, graficar funciones y calcular varianza, percentiles y cuantiles).
- *Tests:* "Estás acá" por fecha, criterios tildables que alimentan la puerta de la ventana, y las subpáginas por ruta (`#/estudio/prog/P0/metas`).

---

### Ola 21 · Idiomas y libros (Opus 5.5 · alto)

**Paso 8 · El roadmap maestro v3.** Reemplaza al "roadmap de inglés" que tenía previsto: el inglés es el año 1 de un roadmap de **un idioma por año durante 6 años**. El texto completo se guarda en `docs/prompts/roadmap-idiomas-libros.md` al arrancar la ola. Datos en `data/idiomas.json` y `data/libros.json`, módulo `src/data/idiomas.ts` (tipos, validación, fechas derivadas de las semanas, como `calendario()` de programación).

- **Estudio → Idiomas**, con la estructura de Matemática y Programación: "Estás acá", "Hoy sos → Vas a ser" (el nivel de cada idioma) y la escalera de los 6 años. Subpáginas: cada año, cada idioma, la biblioteca de libros y el ascenso a C1.
- **Año 1 · Inglés (58 semanas, del 16 nov 2026 al 26 dic 2027):**

| Fase | Semanas | Fechas | Hito |
|---|---|---|---|
| *Measure What Matters* | 6 | 16 nov – 27 dic | Tesis final y 3 min hablados sin leer |
| Pronunciación (curso de Udemy) y aplicada | 6 | 28 dic – 7 feb | Grabación de control (85 %) |
| *English Made Simple* y *English Grammar in Use* | 7 | 8 feb – 28 mar | Test y simulacro diagnóstico |
| Preparación de Cambridge C1 Advanced (más *Advanced Grammar in Use*) | 20 | 29 mar – 15 ago | Simulacros sobre 180 |
| Colchón y examen real | 7 | 16 ago – 3 oct | Examen (fecha a confirmar) |
| Consolidación con *Make It Stick* y *Getting to Yes* | 12 | 4 oct – 26 dic | Tesis anual |

- **Años 2 a 6** (francés, italiano, alemán, japonés y chino; el año 2 arranca el 27 dic 2027 y el 6 termina el 19 dic 2032): etapa inicial de **40 semanas** igual para todos (libro "Made Simple" o "Demystified" 5 sem, libro de gramática 11, curso de pronunciación de Udemy 3, pronunciación aplicada 5, y preparación y examen del nivel del año 16) más **12 semanas de consolidación** con 2 libros. Exámenes: DELF B1, CILS o PLIDA B1, Goethe A2, JLPT N4 y HSK 2 a 3. Cada idioma se estudia con material en el anterior.
- **Los 12 libros de la Fase A**, 2 por año: *Make It Stick* y *Getting to Yes*; *How to Read a Book* y *Thinking, Fast and Slow*; *Influence* y *Basic Economics*; *The Effective Executive* y *The Intelligent Investor*; *High Output Management* y *Good Strategy Bad Strategy*; *Rhetoric* y *Disciplined Entrepreneurship*.
- **Biblioteca de 42 libros núcleo** en 6 bloques de 7 (pensar y negociar, comunicación y ventas, economía e inversión, poder y política, gestión y estrategia, fundar y construir riqueza), con su estado (pendiente, leyendo o terminado) y los **13 opcionales** aparte. Los 30 que no son de la Fase A se leen en la Fase B, en el orden de los bloques. *Measure What Matters* es el libro 0 del año 1 y ya llega cargado con sus capítulos desde la ola 20.
- **Fase B (desde el año 7):** el ascenso a C1 de cada idioma, con 40 % de las horas para libros y 60 % para el ascenso: italiano C1 en nov 2033, francés C1 en abr 2035, alemán C1 en ago 2037, los 42 libros en jun 2040, japonés N1 en oct 2041 y chino HSK 6 en feb 2045. Se muestran como hitos con su certificación.
- **Cada libro** usa el sistema de libros del paso 5 y suma un **artefacto** (en *Measure What Matters* se define después de leerlo). **Cada trimestre** (cada 13 semanas desde el inicio del año) hay un **ensayo integrador** y un **examen trimestral**, y **en la última semana del año** una **tesis anual**. Aparecen en el calendario y en las alertas.
- **Integración con el plan T+18:** la rama de inglés del plan (hoy "modo entrevista", "bloque diario de 45 min" y "examen C1" en `data/plan.json`) pasa a leer este roadmap: las fases del año 1 reemplazan a esas, el bloque de inglés de Hoy dice lo que toca esa semana (lectura, pronunciación, gramática o preparación de Cambridge), el hito T+18 **ya no dice "examen C1"** porque el examen cae en 2027, y los exámenes entran a las alertas como las certificaciones.
- **Horas y rutina (solo búsqueda intensiva):** el roadmap supone **11,5 h por semana** (5 × 1 h 30 y 2 × 2 h). Coincide con el bloque de inglés de la intensiva: 1 h 30 de lunes a viernes (13:30 a 15:00 si te levantás a las 04:00 o 05:00, 16:30 a 18:00 si es a las 08:00) y 2 h el sábado y el domingo (12:00 a 14:00). Ese bloque deja de llamarse "modo entrevista" y pasa a "Inglés · *lo que toca esta semana*" con sus tareas. Las horas planificadas se muestran contra las del bloque. **La rutina "con trabajo" no se toca**; se arma después, con las 11,5 h, cuando haya trabajo.
- **Sin verificar (se queda así hasta que lo confirmes):** el curso de Udemy de inglés, los capítulos de *English Made Simple*, la disponibilidad actual de los recursos de cada idioma, los niveles estimados por año y los avales académicos de los libros. El **enlace del curso de Udemy se carga desde la app y queda en el teléfono, no se commitea** (el repo es público). Costos y fechas de los exámenes: sin verificar.
- *Tests:* las fechas del año 1 (58 semanas) y de los años 2 a 6, el 19 dic 2032, el reparto de las 11,5 h, trimestres cada 13 semanas, hito T+18 sin "examen C1", alertas de exámenes, libro sin artefacto, y la biblioteca (42 + 13).

---

### Ola 22 · Orden de pantallas (Sonnet 5.5 · medio)

**Paso 9 · Orden de pantallas.** Una pasada de UX sobre Metas, Estudio y Hoy: lo que ocupa una pantalla larga pasa a una **pantalla liviana con botones a subpáginas**, con el mismo criterio en los tres roadmaps (matemática, programación e idiomas). **Ninguna pantalla pasa de unas 3 pantallas de scroll** en el teléfono: una prueba de Playwright a 390 px lo mide. Se arregla también lo pendiente de §3 bis (títulos largos de meta con puntos suspensivos y "Mejora de hoy" en dos líneas).

---

### Ola 23 · Clipping (Opus 5.5 · alto)

Pedido del 2026-11-16: integrar el **Roadmap Clipper de 12 meses (de 0 a USD 10k/mes)** y darle **su propio apartado en Metas**, con la estructura de los roadmaps de matemática y programación, **métricas, gráficos** y una **UX/UI pulida, fluida y premium**. Va **última**. El texto completo se guarda en `docs/prompts/roadmap-clipping.md` (ya está). Un PR, **tres pasos** y un commit por paso.

**Qué es y qué no es en Trazo.** Trazo es **la planilla y el tablero**: registrás lo que publicás y cobrás, y la app calcula, grafica y avisa. **No** automatiza ni publica nada, no entra a las plataformas ni a las cuentas, y el pipeline y el dashboard de views del roadmap (Next.js, Node, TypeScript) son **tus apps aparte**. Lo que se registra acá es, tal cual dice el roadmap, "el esquema de datos del dashboard": se exporta en JSON para sembrarlo cuando lo armes (mes 2). Las tarifas, plataformas y proyecciones salen del texto: se muestran con su fecha ("datos a julio–noviembre 2026") y la etiqueta **sin verificar**. Tampoco hay nada de apuestas, bots ni views compradas: el roadmap los deja afuera y la app no los registra.

**Paso 10 · Datos y motor**

- **`data/clipping.json`** (validado al cargar, como el plan extendido): los 12 meses con su meta en USD (150, 350, 700, 1.200, 1.900, 2.800, 3.800, 4.800, 5.800, 6.800, 8.000 y 9.000), cuentas y clips por día de cada mes, las 3 fases con su objetivo y **criterios de paso**, los hitos (retainers, editores, dashboard v1 y v2, pipeline v1 a v3, revisión del mes 6), la tabla de plataformas, nichos y derechos, riesgos con plan B, rutina semanal, la lista de la semana 1 con fechas (GTA 6 el jueves 19 de noviembre de 2026) y las fuentes.
- **Calendario derivado:** el mes *n* arranca el **16** (mes 1: 16 nov a 15 dic de 2026; mes 12: 16 oct a 15 nov de 2027), como el plan extendido. "Estás acá" sale de la fecha.
- **Estado nuevo** (`src/state/clipping.ts`, con `migrate()`): **cuentas** (alias, plataforma, nicho, estado: calentando, activa, pausada o baneada), **campañas** (nombre, plataforma, nicho, tarifa listada, tope por clip, fuente permitida, estado), **registro** de clips o de totales por día (fecha, cuenta, campaña, clips publicados, views, views verificadas, aprobados, pago estimado, pago cobrado), **retainers** y **prospección** (mensajes enviados, pruebas, activos, USD por mes). Todo acepta **fechas pasadas**: así se carga lo que hiciste antes de que llegue la ola. Se exporta e importa con JSON (reusa el importador de la ola 8 y la validación línea por línea de la ola 20).
- **Métricas puras** (`src/data/clipping-metricas.ts`, con tests):
  - **Pago real por 1.000 views** global y por campaña, contra la tarifa listada (la brecha).
  - **Tasa de aprobación** por campaña.
  - **% de clips con más de 1.000 views** y **views promedio por clip** (contra las 3.500 que pide el mes 12).
  - **USD por hora trabajada**, con las horas del bloque de clipping que ya mide Trazo.
  - **USD del mes contra la meta**, acumulado y ritmo.
  - **Concentración:** ninguna campaña ni plataforma por encima del **30 %** del ingreso.
  - **Cuentas activas y clips por día contra el plan.**
  - **Proyección a 12 meses** (se cuentan 12, no 14): cuánto vas a cobrar en el mes 12 con tu ritmo real y cuánto falta para USD 10k, con las **tres curvas** (base, optimista y conservadora).
  - **Compuertas:** fase 1 a fase 2 si el pago real es de **USD 0,80** o más por 1.000 views y al menos el **40 %** de los clips pasa las 1.000 views; en el mes 6, si el pago real baja de **USD 0,70**, aviso de cambiar de campañas antes de escalar. Mismo semáforo que las puertas de matemática (verde, amarillo, rojo).

**Paso 11 · El apartado "Clipping" en Metas** (`#/metas/clipping`, con subpáginas `#/metas/clipping/<sub>`). Entra con una card en la pestaña Ruta, al lado de las demás, y usa el área Eclipse como color. Cada pantalla es liviana (criterio de la ola 22: ninguna pasa de unas 3 pantallas de scroll) y las demás van **detrás de botones**.

| Subpágina | Qué muestra |
|---|---|
| **Resumen** (la portada) | "Estás acá" (mes y fase) y **"Hoy sos → Vas a ser"** (lo cobrado este mes contra la meta y el USD 10k). Número grande de lo cobrado con anillo de progreso, cuatro indicadores con su mini gráfico (pago real por 1.000 views, aprobación, clips por día y cuentas), el semáforo de la compuerta de la fase y los botones al resto. |
| **Plan** | La escalera de 12 meses con la meta de cada uno, las 3 fases con su objetivo y sus criterios de paso, y los hitos. El mes actual abierto, los demás plegados. |
| **Registro** | La planilla: cargar clips, views y pagos, ver y editar lo cargado, filtrar por cuenta, campaña y mes. |
| **Métricas** | Todos los gráficos de abajo, con selector de período (30 días, 90 días o todo). |
| **Cuentas** | La granja: una tarjeta por cuenta (identidad, nicho, estilo, estado, su ritmo) y el crecimiento contra el plan (3, 5, 8, 12, 15, 20, 25, 32 y 40). Con las reglas de identidad y de no repetir archivos como recordatorio. |
| **Campañas** | Campañas y plataformas: tarifa listada contra pago real, tope por clip, fuente permitida, estado, y la tabla de plataformas de la semana 1 (con "sin verificar"). Ranking de lo que conviene seguir y de lo que hay que dejar. |
| **Retainers** | El embudo de prospección (20 mensajes a streamers y podcasters medianos en el mes 3, pruebas, retainers activos) y el "fijo" mensual de cada uno. |
| **Nichos y derechos** | La tabla de nichos con su semáforo de riesgo (streamers y podcasts bajo, videojuegos medio, películas y series alto) y cómo encararlo. |
| **Riesgos y rutina** | Los riesgos con su plan B y la **rutina semanal** (lunes revisar, martes a jueves producir, viernes decidir qué escalar, fin de semana pipeline y prospección) que se tilda. |
| **Semana 1** | La lista de 7 días con fechas, con el aviso de GTA 6 (19 de noviembre) y la advertencia de strike. Se oculta sola después del mes 1. |

**Gráficos** (SVG propios sobre `src/ui/charts`, con tabla accesible para lector de pantalla y animación de dibujo):
1. **Ingreso mensual:** barras de lo cobrado contra la meta, con las tres curvas del roadmap por encima y la línea de USD 10k; mes actual resaltado.
2. **Camino a USD 10k:** anillo con el avance y la proyección del mes 12 (cuánto falta para USD 10k).
3. **Pago real por 1.000 views:** una barra por campaña, la tarifa listada como punto y las líneas del piso de USD 0,80 y 0,70.
4. **Embudo:** clips publicados, aprobados, con más de 1.000 views y pagados.
5. **Cuentas activas y clips por día contra el plan** (escalera).
6. **Concentración por campaña, plataforma y nicho,** con la línea del 30 %.
7. **Calendario de actividad:** clips por día (mapa de calor, el mismo de la ola 3).
8. **USD por hora trabajada** por semana.
9. **Views por clip:** distribución, contra las 3.500 de objetivo.
10. **Mini gráficos** en cada indicador.

**UX/UI premium** (reglas del sistema de diseño de §2: sin sombras, bordes finos, claro y oscuro):
- **Portada tipo tablero:** número grande con cuenta animada (GSAP; respeta "reducir movimiento"), anillo de progreso y cifras con números tabulares; el color del área Eclipse como acento y el resto neutro.
- **Cargar en 3 toques:** el botón "Registrar" abre una hoja (la de la ola 10) que recuerda la última cuenta y campaña, con teclado numérico, campos de 16 px o más y "Deshacer" en el aviso.
- **Fluida:** transiciones entre subpáginas con Flip, las listas se reordenan animadas, los gráficos se dibujan al entrar y los datos pesados se calculan una sola vez por cambio.
- **Estados vacíos que guían:** sin datos, cada pantalla muestra la primera acción ("Cargá tu primera campaña") y el gráfico con la curva del plan en gris.
- **Escritorio:** dos columnas (portada y gráficos) con el riel de las pantallas anchas; en el teléfono, una columna a 390 px sin desbordes.
- **Accesible:** contraste en claro y oscuro, tablas para cada gráfico y tamaños táctiles de 44 px.

**Paso 12 · Integración con el resto de Trazo**

- **Hoy:** el bloque "Clipping" muestra el mes y la tarea que toca ("Mes 1 · 5 clips a mano, 3 cuentas") y un botón **Registrar** que abre la hoja; las metas del día salen del plan del mes.
- **Metas semanales generadas:** "Horas de clipping" y "Clips publicados" (hoy 10,5 h y 25 por semana, fijos) pasan a salir del mes del roadmap (clips por día × días) y de las horas del bloque.
- **Mapa de la ruta:** los hitos viejos del ramal de clipping (50 clips el día 13, primer pago el 20 y "¿US$ 100 cobrados?" el 28) se reemplazan por los del roadmap con fechas propias: GTA 6, USD 150, 350 y 700, primer retainer, dashboard v1, revisión del mes 6 y los demás.
- **Alertas:** campañas para revisar cada lunes, "pago real por 1.000 views" cada viernes, fin de fase, revisión del mes 6, concentración por encima del 30 % y compuerta en rojo. Entran al mismo panel que las de las certificaciones.
- **Avance:** una línea con lo cobrado del mes en la vista de avance y el resumen del cierre.
- **Datos:** `data/clipping.json` y el estado nuevo entran en el JSON de exportación y en "Datos" de Ajustes; la app arranca con lo ya guardado.
- *Tests:* validación del plan, calendario de los 12 meses (16 de cada mes), todas las métricas con casos de borde (sin views, sin cobros, una sola campaña), compuertas 0,80 y 0,70, concentración del 30 %, proyección del mes 10 a 14, registro con fechas pasadas, importar y exportar, migración del estado viejo, hitos nuevos en el mapa, alertas y las pantallas a 390 px en claro y oscuro.

**Decidido para la 23 (2026-11-16)**
1. **Horas:** **1 h 30 de clipping por día de lunes a viernes y 2 h el sábado y el domingo** (hoy son 1 h 30 los dos días; el fin de semana pasa a 2 h con pipeline y prospección). La rutina de las 08:00 no tiene hueco y queda sin clipping por ahora.
2. **Clips por día:** se usa la opción más recomendable para llegar a la meta de cada mes: **la tabla de la granja** (cuentas × 2 clips por día: 5, 8, 16, 24, 30, 40, 50, 64 y 80 clips por día según el mes), no el "de 5 a 20" de la fase 2.
3. **Escenarios** (confirmado): **base** = las metas del texto (USD 9.000 en el mes 12); **optimista** = hasta 1,5 veces el base hacia el mes 10, así cruza USD 10k en el mes 10; **conservador** = 60 % del base desde el mes 3 (USD 5.400 en el mes 12). Son supuestos míos y se ajustan con tu planilla real desde el mes 2.
4. **12 meses, no 14:** la app muestra y proyecta los 12 meses del roadmap (el caso base cierra en USD 9.000).
5. **GTA 6 (jueves 19) y el mes 1** pasan antes de que esta ola esté lista: el registro acepta fechas pasadas (confirmado).
6. **Impuestos:** queda como recordatorio de consultar a un contador en "Riesgos" y no calcula nada fiscal (confirmado).

---

**Aceptación general:** typecheck, tests y build en verde en cada ola; cada paso probado en el navegador a 390 px, en claro y oscuro, sin desbordes; la app arranca con lo ya guardado.

**Más adelante (sin ola todavía)**
- **Rutina "con trabajo":** se arma cuando haya trabajo, conservando las 11,5 h de idiomas.
- **Capítulos de los otros 41 libros:** se cargan con el JSON del paso 6 a medida que los empieces.

En el día a día alcanza con **Haiku 5.5 · bajo**: pegás el JSON del cierre y queda commiteado en `data/days/`.

**Criterios de aceptación de los cambios transversales**

- La hora queda a la derecha del título en todas las filas de metas (solo la de inicio; el rango va al abrir la meta); número y checkbox no se mueven de lugar.
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

**Ola 8 · lo que quedó y decisiones**

- La rutina de lunes a viernes del plan (10 metas, con rutina de la mañana y cierre) reemplaza a la de la ola de rutinas (8 metas). El cierre va de 20:30 a 21:00 como en la tabla del plan (la captura decía 21:00).
- Con trabajo: trabajo de 10:00 a 17:00 y Handyx de 17:00 a 18:30 (el plan no da las horas exactas).
- El "libre" del fin de semana no es meta. En una ventana W el bloque de programación conserva su id (`prog`) para no romper el vínculo con Estudio.
- "Sumar a la semana" en Hoy muestra solo los contadores del plan; las metas rápidas personales siguen en Metas.
- Riesgo en la Ruta: un test de matemática sin aprobar bajo 85 % marca programación en riesgo.
- Los capítulos de matemática después de Aritmética cuentan cuando el catálogo de Estudio los tenga (`TODO(ola 9)`).

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

**2026-11-13 · ruta del roadmap**

- Metas abre en Ruta: bimestre con anillo y real contra plan, carriles con tendencia, tu evolución, compuertas y los 18 bimestres.
- Bimestre en detalle, de la ruta a tu día (propuesta semanal editable y metas de Hoy con su etiqueta), el mapa, tu evolución con seis gráficos y la versión de escritorio.
- Marcar una meta con ruta suma a la mejora, avanza la meta semanal, mueve el carril y recalcula el ritmo.

**2026-11-13 · sistema de estudio nuevo**

- Cada capítulo: estudiar de corrido (50/10) → test completo (15 + 5, 25 min, 85 %) → tesis a +3 (20 min, fuera del tope) → repetir (+1, tarjetas, +7, +21, +60).
- Orden del día: lo que vence, el capítulo nuevo y el test. La tesis arranca por los errores del test y nunca va el mismo día.
- Test en papel con ejercicios de verdad de cada capítulo de Aritmética: la app corrige lo que cargás y lo fallado vuelve como tarjeta.
- Cold recall contra el capítulo y el test. Rehechas Estudio, Sesión, Cómo funciona, Test, Tesis, Plan del bimestre, Repaso, Recall, Motor y Cierre.

**2026-11-13 · corrección del sistema de estudio**

- Día 1 estudiar, día 2 cold recall y test, día 3 tesis (al día siguiente de aprobar), días 8, 22 y 61 repetir. La escalera pasa a 1 → 2 → 3 → 8 → 22 → 61.
- Ya no hay cold recall suelto a +1: es el calentamiento del test y compara contra el capítulo.
- Reprobado: releer al día siguiente y re-test al otro; a la tercera vez, el tema queda flojo.
- Cada día, un capítulo distinto en cada fase. Orden de la sesión: cold recall, tarjetas, test, descanso, tesis, capítulo nuevo.

**2026-11-13 · puntos débiles**

- Puntos débiles, un tema en detalle, exámenes y la vista de escritorio.
- Fuerza por tema (40 % cold recall, 30 % tarjetas, 30 % test), temas flojos, sanguijuelas, calibración y cuán listo estás para el final.
- "Dónde estás flojo" en Estudio, creías contra recordaste en el Recall y "Lo más flojo va primero" en el Repaso.
- Priorizar lo flojo cambia el motor cuando no entra todo en 20 min.

**2026-11-13 · rutinas del día por día de la semana**

- data/routines.json con "dayRoutines": lunes a viernes (8 metas) y fin de semana (5 metas), validado al cargar. Nada de horarios en el código.
- Buen día y Hoy usan la rutina del día de la semana (hora de Buenos Aires); 04:00, 05:00 y "Otra hora" se mantienen. Fijos que no se mueven y flexibles que se acortan.
- Ajustes → Rutinas del día muestra las dos rutinas con sus bloques (ya no se editan en la app).

**2026-11-15 · ola 8 · Plan T+18**

- Token `--idi` (inglés) y un color por rama; `data/plan.json` con tramos, fases, cortes, metas de bimestre y año, y la etapa actual; tests de fechas para 2026-11-16, 2026-12-14, 2027-02-01, 2027-11-15 y 2028-05-14.
- Rutinas buscando trabajo, fin de semana, con trabajo y día libre; rama en cada bloque; ventanas W y modo entrevista; migración sin tocar los días guardados.
- Hoy con la línea de rama, avisos entre ramas y los contadores del plan; el JSON del día suma la rama y el plan.
- Metas abre en Ruta (semana N de 78, seis ramas, lo que viene) con el mapa en ramas; Semana, Mes, Bimestre y Año salen del plan; Nueva meta con rama.
- Proyecto, Búsqueda, Inglés y Handyx; Importar JSON con validación y "Qué cambia".
- Ajustes del plan (inicio, rutina, T+2, día libre, umbrales de Handyx, colores) y nombres sugeridos de B2 a B9; "Programación · Faro v1" en Buen día, Elegir pomodoro, Foco, Estudio y Avance.

**2026-11-15 · ola 8b · búsqueda intensiva**

- Modo búsqueda intensiva activo desde T0: rutinas de lunes a viernes y de finde, sin día libre, con Handyx y ventas en stand-by; se apaga en Ajustes y vuelve todo como estaba.
- Pausas genéricas: fuera de Hoy, avisos, metas y contadores; mapa punteado; cortes de Handyx corridos; Handyx en modo lectura con Retomar.
- Hitos por rama (26 iniciales), rama clipping y pestaña Trimestre del mapa; hitos hechos, vencidos y movidos.
- Sprint de búsqueda de 14 días y "Qué cambia en la ruta"; prompts 17 a 19 para el bloque de inglés.
- Calendario de programación comprimido a 53 semanas, 30 hitos hasta el 21 feb, puertas de matemática, entrevista técnica por proyecto, portfolio agéntico (MCP, agentes, defensas), semanas ganadas, mapa de proyectos y revisión de mercado; prompts 20 a 23.
