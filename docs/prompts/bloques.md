# Prompts por bloque

Prompts para pegarle a Claude durante un bloque del día. Los números siguen la numeración del
plan; los que no están acá (1 a 4, 6 a 16) todavía no se pasaron al repo.

## 5 · Tarea de programación

> Soy Toti y estoy en el bloque de programación de Trazo. Tarea de hoy: **{tarea}**. Proyecto en curso: {proyecto}.
> Antes de escribir código, preguntame qué ya tengo. Después dame el paso más chico que pueda terminar en 50 minutos, con un criterio de "hecho" que pueda verificar yo solo. Al final, revisá lo que hice como en un code review: qué está bien, qué cambiarías y por qué.

En la búsqueda intensiva:

- **Bloque 2 (06:30):** tarea "CV en inglés, LinkedIn y caso".
- **Bloque 5 (12:00, o 10:00 el finde):** tarea "caso para contar en entrevistas": un proyecto contado en 3 minutos (problema, qué hice, decisión difícil, resultado medible).

## 17 · Simulacro de entrevista

> Sos un entrevistador de {empresa} para el rol {rol} (remoto, USD 3.000 a 5.000). Hacé una entrevista completa en inglés de 30 minutos: 2 preguntas de presentación, 2 de comportamiento (STAR), 2 técnicas sobre mi caso y 1 de diseño de sistemas chica.
> Una pregunta por vez; esperá mi respuesta. Al final, dame: lo que falló (fluidez, gramática, pronunciación, contenido), una frase mejor para cada falla y un puntaje de 0 a 100. Devolvelo también como JSON para Trazo: `{ "tipo": "simulacro", "rama": "ingles", "fecha": "AAAA-MM-DD", "puntaje": N, "fallas": [{ "texto": "...", "tipo": "fluidez" }] }`.

Con una entrevista a 3 días o menos, Trazo precarga empresa y rol en el bloque de inglés.

## 18 · Historias STAR

> Ayudame a armar {n} historias STAR en inglés con mis proyectos ({proyectos}). Para cada una: Situation, Task, Action, Result en 4 a 6 frases, con un número en el resultado. Después haceme preguntas de comportamiento al azar ("a conflict with a teammate", "a time you failed", "your biggest weakness") y decime qué historia usar y cómo adaptarla. Corregime solo lo que cambia el sentido o suena raro.

## 19 · Pitch de 60 segundos

> Escribí conmigo un pitch en inglés de 60 segundos (unas 150 palabras): quién soy, qué construí (un proyecto con un número), qué busco (AI/ML o backend con IA, remoto) y por qué yo. Lo leo en voz alta y te paso la transcripción: marcá las muletillas, las frases largas y las palabras que pronuncio mal, y dame la versión final para grabarme.
