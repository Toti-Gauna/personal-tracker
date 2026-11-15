# Prompts por bloque · plata directa e indirecta

Un prompt por cada bloque que deja plata, para pegar en Claude. Lo que va entre `{{llaves}}` lo completa Trazo (o vos, hasta que exista la Ola 9). Cada prompt termina pidiendo un bloque JSON corto para importar a Trazo.

Meta: **sprint de 7 días** (16 al 22 nov: oferta, 100 llamadas, 5 reuniones, 2 propuestas, 1 anticipo) y **US$ 10.000 cobrados a 90 días** (al 13 feb 2027).

| Bloque | Hora | Qué deja | Prompts |
|---|---|---|---|
| Rutina de la mañana | 04:00 | ○ base | 1. Plan de plata del día |
| Matemática | 04:30 | ↗ sueldo ML en 2028 | 2. Tutor CONAMAT |
| Búsqueda laboral | 06:00 | $ sueldo remoto | 3. Postulación a medida · 4. Mensaje al que decide |
| Programación | 07:00 | ↗ la pieza que vendés | 5. Construir enseñándome |
| Trabajo actual, correr, entreno | — | ○ base | sin prompt |
| Clipping | 12:00 | $ por vistas verificadas | 6. Encontrar los momentos · 7. Variar sin repetir · 8. Qué clip pagó |
| Handyx | 13:30 | ↗ lanzamiento 14 feb | 9. La tarea que acerca el lanzamiento · 10. Sumar especialistas |
| Ventas | 15:00 | $ anticipos | 11. Abrir la llamada · 12. Roleplay · 13. Después de llamar · 14. Propuesta en una página |
| Programación / Eclipse | 16:30 | $ si hay reunión | 15. Demo en 90 minutos |
| Cerrar el día | 20:30 | ○ registra lo cobrado | 16. Cierre con plata |

---

## 1 · Plan de plata del día (04:00)

```
Sos mi jefe de operaciones. Tengo un día de bloques fijos y una meta: US$ 10.000 cobrados al 13 feb 2027. Hoy es {{fecha}}, día {{dia_90}} de 90 (día {{dia_sprint}} del sprint, si aplica).

Estado de hoy (export de Trazo):
{{json_del_dia}}

Embudo de ventas: {{llamadas}} llamadas, {{reuniones}} reuniones, {{propuestas}} propuestas, US$ {{cobrado}} cobrado, US$ {{comprometido}} comprometido.

Devolveme, en menos de 150 palabras:
1. Las 3 acciones de hoy que más acercan plata cobrada, cada una con el bloque donde va.
2. Una cosa que hoy NO tengo que hacer aunque parezca productiva.
3. Si algún bloque debería cambiar de contenido (por ejemplo, el de 16:30 pasa a demo).
No me motives; dame el orden.
```

## 2 · Tutor CONAMAT (04:30)

```
Sos mi tutor de matemática. Estoy en {{libro}} · {{capitulo}} · {{tema}}. No me des respuestas: preguntame, esperá mi intento y corregí.

1. Explicame la idea central en 5 líneas, con un ejemplo numérico.
2. Dame 5 ejercicios de dificultad creciente, de a uno.
3. Si fallo, decime si fue concepto, técnica o descuido, y dame uno parecido.
4. Al final, un test de 5 preguntas. Corte: 85 %.
5. Cerrá con JSON: {"tema":"…","puntaje":0,"errores":[{"tipo":"concepto|tecnica|descuido","tarjeta":{"frente":"…","dorso":"…"}}]}
```

## 3 · Postulación a medida (06:00)

```
Voy a postular a este puesto remoto. Objetivo: entrevista, no "mandé el CV".

Oferta:
{{texto_oferta}}

Mi perfil: full-stack semi-senior (React, Next.js, Node, Python, PostgreSQL, Docker, GitHub Actions, Azure, algo de AWS), construyo con IA (RAG, agentes). Proyectos: {{proyectos_portfolio}}. Inglés B1-B2.

Devolveme:
1. Match de 0 a 10 y si vale la pena (sé duro: si es 5 o menos, decime que no postule).
2. 3 bullets del CV reescritos para esta oferta, con números reales míos (si no tengo el número, marcá [completar]).
3. Respuesta a "why you?" en inglés, 60 palabras.
4. Las 3 preguntas técnicas más probables.
JSON final: {"empresa":"…","rol":"…","rango":"…","match":0,"estado":"Enviada"}
```

## 4 · Mensaje al que decide (06:00)

```
Escribime un mensaje directo de LinkedIn en inglés para {{nombre_persona}} ({{cargo}} en {{empresa}}), por el puesto {{rol}}.

- Máximo 300 caracteres.
- Primera línea: algo específico de su empresa o producto ({{dato_empresa}}), no un elogio genérico.
- Una prueba concreta mía relacionada ({{proyecto_relevante}}).
- Pedido chico: 15 minutos o a quién derivar.
Dame 2 versiones y decime cuál mandarías y por qué.
```

## 5 · Construir enseñándome (07:00)

```
Estoy en {{proyecto}} (semana {{semana}} de {{total}}). La tarea de hoy: {{tarea}}. Stack: {{stack}}. Tengo 90 minutos.

Trabajamos así: mostrame el código por partes, explicame el patrón que usás y por qué, y debatime las decisiones. Antes de escribir, definí:
1. Qué significa "listo" para esta tarea (criterio verificable).
2. Cómo se ve en una demo de 3 minutos para un cliente (esto es lo que después se vende).
3. El primer paso de 20 minutos.
Al final hacé code review de lo que escribí yo: qué está bien, qué cambiarías y por qué. Los errores, como JSON de tarjetas para Puntos débiles.
```

## 6 · Encontrar los momentos (12:00)

```
Soy clipper. Campaña: {{campana}}. Reglas de la campaña: {{reglas}}. Plataforma: {{plataforma}}.

Transcripción con tiempos:
{{transcripcion}}

Encontrá los 5 mejores momentos para clips de 20 a 45 segundos. Para cada uno:
- Inicio y fin exactos.
- Gancho de los primeros 3 segundos (texto en pantalla, máximo 8 palabras).
- Por qué alguien lo mira entero (tensión, dato, opinión fuerte, remate).
- Título y descripción según las reglas de la campaña.
Descartá lo que necesite contexto para entenderse. Respetá las reglas: si piden transformación (subtítulos, recorte, edición), decí cuál aplicar en cada clip.
```

## 7 · Variar sin repetir (12:00)

```
Este clip ya lo publiqué: {{clip}} con gancho "{{gancho}}". Dame 3 variantes que no sean duplicados: otro punto de inicio, otro gancho, otro texto en pantalla. Para cada una, en qué cuenta o plataforma la publicaría y a qué hora.
```

## 8 · Qué clip pagó (viernes, 12:00)

```
Registro de la semana (clip, campaña, gancho, duración, vistas verificadas, US$):
{{registro}}

1. Qué tienen en común los 3 que más pagaron.
2. Qué dejo de hacer.
3. Proyección honesta al 14 dic contra el corte de US$ {{corte}} cobrados: ¿llego? Si no, decilo.
JSON: {"semana":0,"usd_cobrados":0,"seguir":true}
```

## 9 · La tarea que acerca el lanzamiento (13:30)

```
Handyx es un marketplace de arreglos del hogar. Lanzamiento: 14 feb 2027. Hoy tengo 90 minutos.

Estado: {{estado_handyx}}
Backlog: {{backlog}}
Prestadores sumados: {{especialistas}} de 56. Usuarios: {{usuarios}} de 100.

Elegí UNA tarea que se pueda cerrar en 90 minutos y que más acerque el lanzamiento. Dame el criterio de "listo" y los pasos. Si lo más urgente no es código (por ejemplo, sumar prestadores), decilo.
```

## 10 · Sumar especialistas (13:30)

```
Voy a llamar a {{oficio}} de {{zona}} para que se sumen a Handyx. Es mi práctica de llamada en frío antes de llamar a inmobiliarias.

Dame: apertura de 15 segundos en rioplatense, la pregunta que muestra el problema (trabajos que pierden, clientes que no pagan, horas muertas), qué gana sumándose, y respuestas cortas a "no tengo tiempo", "¿cuánto me cobran?" y "ya trabajo por recomendación".
```

## 11 · Abrir la llamada (15:00)

```
Sos mi socio de ventas. Voy a llamar en frío a una inmobiliaria para conseguir una reunión de 15 minutos, no para vender.

Datos:
- Inmobiliaria: {{nombre}}
- Zona: {{zona}}
- Lo que vi en su web y en portales: {{observaciones}}
- Mi oferta: {{oferta}}

Devolveme:
1. Dos observaciones concretas sobre su negocio que pueda decir en voz alta.
2. Una apertura de 20 segundos, en castellano rioplatense, sin sonar a guion.
3. Una sola pregunta sobre su problema.
4. El pedido de reunión con dos horarios.
5. Las 3 objeciones más probables y una respuesta corta para cada una.

Al final, un bloque JSON con {apertura, objeciones[]} para importar a Trazo.
```

## 12 · Roleplay (15:00, antes de la primera llamada)

```
Hacé de dueño de una inmobiliaria de {{zona}} con 15 años en el rubro, ocupado y escéptico con "los de sistemas". Yo te llamo en frío. No me la hagas fácil: cortame si soy genérico, poné las objeciones que pondría alguien real.

Cuando escriba FIN, salí del personaje y dame:
- Puntaje de 1 a 10 en apertura, pregunta, manejo de objeciones y pedido.
- La frase exacta que más me costó y cómo la diría mejor.
- Una objeción nueva para mis tarjetas, en JSON.
```

## 13 · Después de llamar (15:00 y domingo)

```
Notas de la llamada con {{nombre}} ({{zona}}): {{notas}}
Resultado: {{resultado}} (cortó / charla / reunión / pidió info).

Como una code review:
1. Qué funcionó y por qué.
2. Dónde se cortó o se enfrió, con la frase exacta.
3. Qué cambia en el guion (si cambia, numeralo como versión nueva).
4. Mensaje de seguimiento por WhatsApp de 3 líneas, si corresponde.
5. Próximo paso con fecha.
JSON: {"prospecto":"…","resultado":"…","proximo":{"accion":"…","fecha":"AAAA-MM-DD"},"objecion_nueva":{"frente":"…","dorso":"…"}}
```

## 14 · Propuesta en una página (después de la reunión)

```
Reunión con {{nombre}}. Notas: {{notas_reunion}}

Armame una propuesta de una página:
- Su problema con sus palabras.
- El resultado que les doy, medible (por ejemplo, tiempo de respuesta a consultas, consultas que no pasan por portales).
- Alcance: qué incluye y qué no.
- Plazo: {{plazo}}.
- Precio: implementación US$ {{precio}} con 50 % de anticipo; mantenimiento mensual opcional US$ {{mensual}}.
- Próximo paso: firmar y pagar el anticipo antes de {{fecha_limite}}.
Tono directo, sin jerga técnica. Después, dame 3 preguntas para cerrar si duda.
```

## 15 · Demo en 90 minutos (16:30, cuando hay reunión)

```
Mañana tengo reunión con {{nombre}} ({{zona}}). Tengo 90 minutos para armar una demo que muestre su caso, no uno genérico.

Material público suyo: {{propiedades_y_links}}
Lo que les duele: {{problema}}

Proponé la demo más chica que se vea real: por ejemplo, buscador con 5 de sus propiedades, formulario que cae en WhatsApp con respuesta automática, y un tour 3D de una propiedad con Three.js. Dame el orden de construcción en bloques de 20 minutos y el guion de 3 minutos para mostrarla. Enseñame el código mientras lo armamos.
```

## 16 · Cierre con plata (20:30)

```
Cierre del día {{fecha}}. Esto pasó hoy: {{resumen_del_dia}}

1. ¿Entró plata? Fuente, monto, bloque que la trajo.
2. Embudo actualizado.
3. Lo que mañana más mueve la aguja (una sola cosa).
4. Avance real al 10.000 (cobrado y comprometido, sin redondear para arriba).
JSON para importar: {"fecha":"…","cobros":[{"fuente":"eclipse|trabajo|clipping|handyx","usd":0,"bloque":0}],"ventas":{"llamadas":0,"charlas":0,"reuniones":0,"propuestas":0},"clipping":{"clips":0,"vistas":0,"usd":0}}
```

---

# Modo búsqueda intensiva (desde el 16 nov)

Mientras dure, Handyx y ventas están en pausa (los prompts 9 a 15 quedan guardados). Así se usan los demás:

| Bloque | Lunes a viernes | Fin de semana | Prompts |
|---|---|---|---|
| Matemática | 04:30 | 04:30 | 2 |
| Programación · CV y portfolio | 06:30 | 06:30 | 5 (tarea: CV en inglés, LinkedIn, caso) |
| Programación · caso para entrevistas | 12:00 | 10:00 | 5 (tarea: el proyecto que contás) |
| Inglés · modo entrevista | 13:30 | 12:00 | 17, 18, 19 |
| Búsqueda laboral | 15:00 | 14:00 | 3, 4 |
| Clipping | 16:30 | 15:30 | 6, 7, 8 |
| Descansar · cierre | 20:00 | 20:00 | 16 |

## 17 · Simulacro de entrevista (inglés)

```
You are a hiring manager at {{empresa}} interviewing me for {{rol}} (remote, US$ {{rango}}). Job post: {{texto_oferta}}

Run a 25-minute interview in English: 2 behavioral questions, 2 technical questions about my stack, 1 about a project of mine ({{proyecto}}), and "do you have questions for us?". One question at a time; wait for my answer. Push back like a real interviewer if my answer is vague.

When I type END, switch to Spanish and give me:
- Score 1 to 10 on clarity, technical depth, English fluency, and structure.
- My 3 weakest sentences, rewritten the way a strong candidate would say them.
- Words or structures I repeat too much.
- The question I should practice again tomorrow.
JSON: {"empresa":"…","puntajes":{"claridad":0,"tecnica":0,"ingles":0,"estructura":0},"tarjetas":[{"frente":"…","dorso":"…"}]}
```

## 18 · Historias STAR (inglés)

```
Help me build 6 STAR stories in English from my real experience. I'll describe each situation in Spanish; you ask me questions until you have concrete numbers and my specific actions (not the team's).

Cover: a hard bug, a conflict or disagreement, a deadline under pressure, something I built end to end, a mistake I made, and learning a new technology fast.

For each one: a 90-second spoken version, the 2 follow-up questions an interviewer would ask, and a one-line flashcard (front: the question; back: the 3 key beats of my answer).
Never invent facts: if a number is missing, write [ask me].
```

## 19 · Pitch de 60 segundos (inglés)

```
Write my "tell me about yourself" for remote {{rol}} roles, 60 seconds spoken (about 140 words), in natural English a B2 speaker can say without sounding memorized.

Facts: semi-senior full-stack (React, Next.js, Node, Python, PostgreSQL, Docker, GitHub Actions, Azure, some AWS), building AI products (RAG, agents), React Native, Three.js. Projects: {{proyectos}}. What I'm looking for: {{lo_que_busco}}.

Give me 2 versions (product-focused and AI-focused), mark where to pause and which words to stress, and the 5 words I'm most likely to mispronounce with a simple phonetic hint.
```

## 20 · Set de algoritmos del proyecto (3 sesiones por semana)

```
Proyecto: {{proyecto}} · lenguaje: {{lenguaje}} · semana {{n}} de {{total}}.
Estructuras que el producto usa de verdad: {{estructuras}} (ej.: ventana deslizante en el chunking de documentos).

Armame 6 a 8 ejercicios de entrevista, en orden de dificultad, cada uno atado a un lugar real del código del proyecto. Para cada ejercicio: enunciado corto, un caso de borde que se suele olvidar, la complejidad esperada y dónde se usa en el producto.
En la sesión: me das UN ejercicio, no me das pistas hasta que lo pida, y me pedís que explique la complejidad antes de correr los tests. Si me trabo 10 minutos, una pista por vez.
Al terminar: mis tests en {{lenguaje}}, la complejidad escrita con mis palabras y una tarjeta (frente: el patrón; dorso: cuándo se usa y el error típico).
JSON: {"ejercicios":[{"titulo":"…","patron":"…","complejidad":"…","hecho":false}],"tarjetas":[{"frente":"…","dorso":"…"}]}
```

## 21 · Documento de diseño y defensa de 45 minutos

```
Proyecto: {{proyecto}}. Pregunta clásica que cubre: {{pregunta}} (ej.: diseñar un rate limiter y API gateway).

Día 1 y 2: ayudame a escribir un documento de diseño de 2 páginas con estas secciones: requisitos funcionales y no funcionales, estimación de carga (con cuentas a la vista), diagrama de componentes, API y modelo de datos, trade-offs (dos alternativas descartadas y por qué), qué pasa cuando algo falla, costos y seguridad. Preguntame antes de asumir un número.
Al cerrar el proyecto: sos el entrevistador. 45 minutos: 5 de requisitos, 15 de diseño, 15 de profundización en un componente que elijas vos, 10 de fallas y escala. Interrumpí como un entrevistador real y pedí números.
Al final: rúbrica de 1 a 5 en requisitos, estimación, trade-offs, fallas, comunicación; las 3 respuestas más flojas reescritas; y qué corregir en el documento.
JSON: {"rubrica":{"requisitos":0,"estimacion":0,"tradeoffs":0,"fallas":0,"comunicacion":0},"cambios_al_documento":["…"],"aprobado":false}
```

## 22 · Servidor MCP del proyecto

```
Proyecto: {{proyecto}} · lenguaje: {{lenguaje}}. Capacidades del producto que se exponen: {{herramientas}}.

Diseñá un servidor MCP con esas herramientas: nombre, descripción pensada para que un modelo la elija bien, esquema de entrada y de salida tipados, y qué error devuelve cuando algo falla. Las herramientas nunca tocan la base ni el sistema sin permisos; las irreversibles piden aprobación humana.
Después: el esqueleto en {{lenguaje}}, 5 tests, un set de 10 evals (pregunta, herramienta esperada, resultado esperado), el README con instalación en una línea para Claude Desktop y Claude Code, y una traza de ejemplo con tokens, latencia y costo.
Regla: si una descripción de herramienta es ambigua, reescribila antes de seguir.
JSON: {"herramientas":[{"nombre":"…","irreversible":false}],"evals":10,"readme":true}
```

## 23 · Mapa de proyectos del portfolio

```
Estoy armando la sección "Hacia dónde voy" de mi portfolio: un mapa de proyectos conectados. El diseño visual lo hago yo; quiero la estructura, los datos y una escena base.
Proyectos y rubros: {{proyectos}} (ej.: RAG para negocios hoy; petróleo, agro, espacio, aeroespacial, medicina y nuclear después). Centro del mapa: la base escalable que todos reutilizan: {{base}}.

Paso 1: proponé el esquema de proyectos.json (id, nombre, rubro, estado: hecho / en curso / próximo, fechas, tecnologías nuevas, depende_de, reutiliza, enlace al caso) y un script que lo valide: ids repetidos, referencias a ids que no existen y ciclos en depende_de.
Paso 2: escena base con Three.js: nodos agrupados por rubro alrededor de la base, líneas de depende_de y reutiliza, clic en un nodo muestra su ficha. Explicame cada decisión (distribución de nodos, cámara, rendimiento en celular) y yo la discuto antes de seguir.
Paso 3: versión de lista accesible para celular y lectores de pantalla, generada del mismo JSON, y regla de reducir movimiento si el sistema lo pide.
Paso 4: que portfolio-mcp lea el mismo proyectos.json y responda "qué reutiliza Surco de Faro".
No toques colores, tipografía ni estilo: dejá variables para que yo los defina.
JSON: {"esquema":true,"validador":true,"escena":true,"lista_accesible":true,"mcp_lee_json":true}
```
