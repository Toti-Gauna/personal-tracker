# Prompt v2: cargar el Plan T+18 extendido en Trazo (programación + matemática + plataformas + arquitectura)

Texto que pasó Toti el 2026-11-18. **Reemplaza a la versión anterior** (`plan-t18-extendido.md`, que queda como historia). Es la fuente de la **ola 24** (§6 septies de `docs/PLAN.md`). Lo que dice "sin verificar" se queda así hasta que Toti lo confirme.

Cambios de la v2 respecto de la anterior:
1. Cada proyecto suma una **plataforma extra** (mobile, escritorio, VR o AR) según la sección 3.8.
2. Se suma una capa de **arquitectura**: microservicios en P1, P5, P10, S1 y Q5, y microfrontends desde el shell de P0 hasta la plataforma de P10.
3. La **pausa de fin de año** ya no es un bloque fijo: el motor de fechas la inserta sola en cada diciembre.
4. P8 dura 2 semanas (en el prompt anterior figuraba 3 por error).
5. Se suma **calibración con horas reales** y escenarios de calendario.
6. Se suma una **alerta de versión de examen** (Security+).

## 0. Cómo trabajar

- Respondé en español rioplatense, directo, sin relleno.
- Primer paso, antes de escribir código: leé el repo y el formato JSON actual de sesiones, metas y estante. Devolveme en 10 líneas qué existe, qué cambia en el esquema, cómo migrás sin romper datos y qué asumís. Después implementá por pasos chicos, con tests y un commit por paso.
- No inventes datos actuales (precios, versiones, requisitos). Lo marcado "sin verificar" se queda así hasta que yo lo confirme.
- Al empezar cada conversación de uso del plan, preguntame en qué semana estamos y qué quedó pendiente, salvo que ya te lo diga.
- Datos de muestra, nunca datos personales reales.
- UI mínima y funcional con variables de estilo vacías: el diseño visual lo hago yo.

## 1. Contexto

- Soy Ignacio, Senior Full-stack en Argentina, apuntando a roles de IA Full-stack y, a largo plazo, quant trading y SaaS. No tengo título universitario y decidí seguir de forma autodidacta.
- Trazo es mi PWA de estudio y seguimiento: sesiones en JSON, tests por capítulo con puerta del 85 %, repasos espaciados a los días 2, 3, 8, 22 y 61.
- Rutina de matemática: 2 h por día a las 04:30, en libro y papel. La programación sigue las horas del plan (unas 25 h semanales en la etapa 1).
- El plan arranca el lunes 16 nov 2026 y tiene 4 etapas, 27 proyectos, 12 ventanas de matemática (W) y 7 certificaciones.

## 2. Reglas del plan que Trazo tiene que aplicar

1. **Regla de avance:** 85 % o más aprueba y pasa a la tesis (explicarlo con mis palabras); 65 a 84 % activa el libro de refuerzo según el tipo de error y retest; menos de 65 % vuelve al tema.
2. **Ventanas:** son semanas de matemática intensiva que van siempre antes del proyecto que las pide. Si la puerta no cierra, los bloques de programación siguen siendo matemática y se descuenta del colchón (2 semanas al final de la etapa 1). Las fechas siguientes se corren solas.
3. **Puerta de evidencia:** un proyecto no cierra sin (a) un número medido contra una referencia externa, (b) un tercero que lo valide (experto del rubro, PR aceptado o certificación) y (c) un informe público. Además tests y seguridad.
4. **Si falta tiempo:** se recorta alcance y la feature diferencial primero. Nunca tests, seguridad, revisiones, repasos, sueño ni entrenamiento.
5. **Como máximo una tecnología nueva y una plataforma extra por proyecto**, y ninguna de las dos en bloques con certificación.
6. **Capital real:** nada hasta cumplir una puerta escrita (12 semanas o más de paper trading con Tablero, resultados netos de costos con intervalo de confianza, kill-switch probado en simulación, límite de pérdida fijado antes). No es asesoramiento financiero. Antes de vender o gestionar dinero ajeno, consultar abogado o contador en Argentina.
7. **Hacking solo sobre lo propio** o con permiso escrito (laboratorios: TryHackMe, Hack The Box, PortSwigger Web Security Academy).
8. **Sectores regulados** (nuclear, aeroespacial, medicina, petróleo): modelos educativos y datos públicos o sintéticos. No se simulan plantas, naves ni pacientes reales. Ningún modelo controla hardware real.
9. **Entrega estándar por proyecto:** UX/UI cuidada, visual 3D que responde a datos (Three.js), tráiler, documentación, agente con trazas, servidor MCP publicado, documento de diseño de 2 páginas, set de 6 a 8 algoritmos, CI/CD con seguridad (SAST, secretos, SBOM, firmas). Reparto del tiempo: 55 % núcleo técnico, 30 % producto (UX y 3D), 15 % lanzamiento.
10. **Cada proyecto lleva** una feature diferencial para su industria, una pieza matemática hecha a mano y contrastada con una referencia, y una visual que comunique el aporte.
11. **Capa de plataformas:** monorepo en TypeScript con cliente de API, modelos y tokens de diseño compartidos; cada plataforma reusa eso. El 3D normal y la versión accesible siempre funcionan sin visor.
12. **Microservicios con criterio:** se divide cuando hay una razón (escala, equipos, aislamiento de seguridad); se mantiene monolito modular cuando no (P3 es a propósito un monolito en Rails). Todo servicio lleva contrato probado, trazas y mTLS.
13. **Calibración:** Trazo registra horas estimadas y reales por bloque; tras P3 se calcula el factor real/estimado y se aplica al resto (ver 3.9).

## 3. Roadmap de programación

### 3.1 Calendario (derivado)

Las fechas se calculan desde el inicio (16 nov 2026) sumando semanas en orden. "Sem. base" es la duración del plan original; "+ feature", "+ plataforma" y "+ arquitectura" son semanas extra editables por bloque (se pueden prender o apagar por separado). **La pausa de fin de año se inserta sola**: es la semana lunes a domingo cuyo lunes cae entre el 18 y el 24 de diciembre; si cae dentro de un bloque, lo parte y lo desplaza una semana. Con ese criterio, el calendario base reproduce exactamente el plan original.

| Id | Bloque | Tipo | Sem. base | + feature | + plataforma | + arquitectura | Fechas base | Fechas con extras |
|---|---|---|---|---|---|---|---|---|
| P0 | Consolidación | proyecto | 2 | +0 | +0 | +0 | 16 nov 2026 a 29 nov 2026 | 16 nov 2026 a 29 nov 2026 |
| P1 | Faro v1 · petróleo | proyecto | 3 | +2 | +1 | +0 | 30 nov 2026 a 20 dic 2026 | 30 nov 2026 a 17 ene 2027 (incluye pausa 21 dic 2026 a 27 dic 2026) |
| PAUSA | Pausa de fin de año | pausa | 1 | — | — | — | — | 21 dic 2026 a 27 dic 2026 |
| P2 | Escudo · medicina | proyecto | 3 | +1 | +1 | +0 | 28 dic 2026 a 17 ene 2027 | 18 ene 2027 a 21 feb 2027 |
| W1 | Ventana W1 · matemática | ventana | 3 | +0 | +0 | +0 | 18 ene 2027 a 7 feb 2027 | 22 feb 2027 a 14 mar 2027 |
| P3 | Surco v1 · agro | proyecto | 3 | +1 | +1 | +0 | 8 feb 2027 a 28 feb 2027 | 15 mar 2027 a 18 abr 2027 |
| C1 | AWS Solutions Architect Associate | cert | 2 | +0 | +0 | +0 | 1 mar 2027 a 14 mar 2027 | 19 abr 2027 a 2 may 2027 |
| P4 | Estación v1 · espacio | proyecto | 4 | +1 | +1 | +0 | 15 mar 2027 a 11 abr 2027 | 3 may 2027 a 13 jun 2027 |
| P5 | Faro v2 · petróleo | proyecto | 2 | +1 | +1 | +0 | 12 abr 2027 a 25 abr 2027 | 14 jun 2027 a 11 jul 2027 |
| C2 | CompTIA Security+ | cert | 3 | +0 | +0 | +0 | 26 abr 2027 a 16 may 2027 | 12 jul 2027 a 1 ago 2027 |
| W2 | Ventana W2 · matemática | ventana | 4 | +0 | +0 | +0 | 17 may 2027 a 13 jun 2027 | 2 ago 2027 a 29 ago 2027 |
| P6 | Lupa v1 · aeroespacial | proyecto | 4 | +1 | +1 | +0 | 14 jun 2027 a 11 jul 2027 | 30 ago 2027 a 10 oct 2027 |
| P7 | Surco v2 · agro | proyecto | 2 | +1 | +1 | +0 | 12 jul 2027 a 25 jul 2027 | 11 oct 2027 a 7 nov 2027 |
| C3 | AWS Machine Learning Engineer Associate | cert | 2 | +0 | +0 | +0 | 26 jul 2027 a 8 ago 2027 | 8 nov 2027 a 21 nov 2027 |
| W3 | Ventana W3 · matemática | ventana | 4 | +0 | +0 | +0 | 9 ago 2027 a 5 sep 2027 | 22 nov 2027 a 19 dic 2027 |
| PAUSA | Pausa de fin de año | pausa | 1 | — | — | — | — | 20 dic 2027 a 26 dic 2027 |
| P8 | Núcleo (o red teaming de agentes) | proyecto | 2 | +1 | +0 | +0 | 6 sep 2027 a 19 sep 2027 | 27 dic 2027 a 16 ene 2028 |
| P9 | Lupa v2 (o inferencia en CPU) | proyecto | 3 | +1 | +1 | +0 | 20 sep 2027 a 10 oct 2027 | 17 ene 2028 a 20 feb 2028 |
| P10 | Estación v2 · espacio | proyecto | 4 | +1 | +0 | +2 | 11 oct 2027 a 7 nov 2027 | 21 feb 2028 a 9 abr 2028 |
| COL | Colchón y salto senior | colchón | 2 | +0 | +0 | +0 | 8 nov 2027 a 21 nov 2027 | 10 abr 2028 a 23 abr 2028 |
| W4 | Ventana W4 · matemática discreta y cripto | ventana | 2 | +0 | +0 | +0 | 22 nov 2027 a 5 dic 2027 | 24 abr 2028 a 7 may 2028 |
| S1 | Cripta | proyecto | 2 | +1 | +1 | +0 | 6 dic 2027 a 19 dic 2027 | 8 may 2028 a 4 jun 2028 |
| S2 | Bastión | proyecto | 4 | +1 | +0 | +0 | 27 dic 2027 a 23 ene 2028 | 5 jun 2028 a 9 jul 2028 |
| C4 | PNPT | cert | 3 | +0 | +0 | +0 | 24 ene 2028 a 13 feb 2028 | 10 jul 2028 a 30 jul 2028 |
| C5 | CKA | cert | 2 | +0 | +0 | +0 | 14 feb 2028 a 27 feb 2028 | 31 jul 2028 a 13 ago 2028 |
| C6 | CKS | cert | 3 | +0 | +0 | +0 | 28 feb 2028 a 19 mar 2028 | 14 ago 2028 a 3 sep 2028 |
| S3 | Centinela | proyecto | 4 | +1 | +1 | +0 | 20 mar 2028 a 16 abr 2028 | 4 sep 2028 a 15 oct 2028 |
| C7 | AWS Security Specialty (SCS-C03) | cert | 3 | +0 | +0 | +0 | 17 abr 2028 a 7 may 2028 | 16 oct 2028 a 5 nov 2028 |
| CIE2 | Cierre de T+18 | cierre | 1 | +0 | +0 | +0 | 8 may 2028 a 14 may 2028 | 6 nov 2028 a 12 nov 2028 |
| WQ1 | Ventana WQ1 · estadística, series de tiempo, portafolios | ventana | 3 | +0 | +0 | +0 | 15 may 2028 a 4 jun 2028 | 13 nov 2028 a 3 dic 2028 |
| Q1 | Ábaco | proyecto | 4 | +1 | +1 | +0 | 5 jun 2028 a 2 jul 2028 | 4 dic 2028 a 21 ene 2029 (incluye pausa 18 dic 2028 a 24 dic 2028) |
| PAUSA | Pausa de fin de año | pausa | 1 | — | — | — | — | 18 dic 2028 a 24 dic 2028 |
| Q2 | Brújula (o réplica de papers) | proyecto | 4 | +1 | +0 | +0 | 3 jul 2028 a 30 jul 2028 | 22 ene 2029 a 25 feb 2029 |
| DES3 | Descanso | pausa | 1 | +0 | +0 | +0 | 31 jul 2028 a 6 ago 2028 | 26 feb 2029 a 4 mar 2029 |
| WQ2 | Ventana WQ2 · cálculo estocástico y derivados | ventana | 4 | +0 | +0 | +0 | 7 ago 2028 a 3 sep 2028 | 5 mar 2029 a 1 abr 2029 |
| Q3 | Prisma | proyecto | 4 | +1 | +1 | +0 | 4 sep 2028 a 1 oct 2028 | 2 abr 2029 a 13 may 2029 |
| Q4 | Libro | proyecto | 4 | +1 | +0 | +0 | 2 oct 2028 a 29 oct 2028 | 14 may 2029 a 17 jun 2029 |
| WQ3 | Ventana WQ3 · optimización convexa y ML financiero | ventana | 2 | +0 | +0 | +0 | 30 oct 2028 a 12 nov 2028 | 18 jun 2029 a 1 jul 2029 |
| Q5 | Tablero | proyecto | 5 | +1 | +1 | +0 | 13 nov 2028 a 17 dic 2028 | 2 jul 2029 a 19 ago 2029 |
| Q6 | Nexo (o pipeline de datos de mercado) | proyecto | 4 | +1 | +0 | +0 | 25 dic 2028 a 21 ene 2029 | 20 ago 2029 a 23 sep 2029 |
| CIE3 | Cierre y puerta de capital real | cierre | 2 | +0 | +0 | +0 | 22 ene 2029 a 4 feb 2029 | 24 sep 2029 a 7 oct 2029 |
| WA1 | Ventana WA1 · física y EDOs | ventana | 4 | +0 | +0 | +0 | 5 feb 2029 a 4 mar 2029 | 8 oct 2029 a 4 nov 2029 |
| A1 | Trayectoria | proyecto | 5 | +1 | +1 | +0 | 5 mar 2029 a 8 abr 2029 | 5 nov 2029 a 23 dic 2029 |
| PAUSA | Pausa de fin de año | pausa | 1 | — | — | — | — | 24 dic 2029 a 30 dic 2029 |
| WA2 | Ventana WA2 · estática, materiales, álgebra lineal numérica | ventana | 3 | +0 | +0 | +0 | 9 abr 2029 a 29 abr 2029 | 31 dic 2029 a 20 ene 2030 |
| A2 | Cuerda | proyecto | 5 | +1 | +1 | +0 | 30 abr 2029 a 3 jun 2029 | 21 ene 2030 a 10 mar 2030 |
| DES4 | Descanso | pausa | 1 | +0 | +0 | +0 | 4 jun 2029 a 10 jun 2029 | 11 mar 2030 a 17 mar 2030 |
| WA3 | Ventana WA3 · termodinámica, fluidos, PDEs | ventana | 4 | +0 | +0 | +0 | 11 jun 2029 a 8 jul 2029 | 18 mar 2030 a 14 abr 2030 |
| A3 | Túnel (recortable) | proyecto | 6 | +0 | +0 | +0 | 9 jul 2029 a 19 ago 2029 | 15 abr 2030 a 26 may 2030 |
| WA4 | Ventana WA4 · control y estimación | ventana | 3 | +0 | +0 | +0 | 20 ago 2029 a 9 sep 2029 | 27 may 2030 a 16 jun 2030 |
| A4 | Rumbo | proyecto | 5 | +1 | +1 | +0 | 10 sep 2029 a 14 oct 2029 | 17 jun 2030 a 4 ago 2030 |
| WA5 | Ventana WA5 · mecánica orbital y propulsión | ventana | 2 | +0 | +0 | +0 | 15 oct 2029 a 28 oct 2029 | 5 ago 2030 a 18 ago 2030 |
| A5 | Órbita | proyecto | 4 | +1 | +1 | +0 | 29 oct 2029 a 25 nov 2029 | 19 ago 2030 a 29 sep 2030 |
| A6 | Cohete (o contribuciones open source; recortable) | proyecto | 4 | +0 | +0 | +0 | 26 nov 2029 a 23 dic 2029 | 30 sep 2030 a 27 oct 2030 |
| A7 | Horizonte | proyecto | 6 | +1 | +1 | +0 | 31 dic 2029 a 10 feb 2030 | 28 oct 2030 a 22 dic 2030 |
| PAUSA | Pausa de fin de año | pausa | 1 | — | — | — | — | 23 dic 2030 a 29 dic 2030 |
| CIE4 | Cierre y decisión sobre el título | cierre | 2 | +0 | +0 | +0 | 11 feb 2030 a 24 feb 2030 | 30 dic 2030 a 12 ene 2031 |

Totales: 171 semanas base. Extras: feature +25, plataforma +18, arquitectura +2 (+45). Con extras son 217 semanas, incluidas 5 pausas de fin de año (una más que en la base porque el plan cruza diciembre de 2030), unos 50 meses. Fin de cada etapa: base 21 nov 2027, 14 may 2028, 4 feb 2029, 24 feb 2030; con extras 23 abr 2028, 12 nov 2028, 7 oct 2029, 12 ene 2031. Con extras, el cierre de la etapa 1 queda cerca de la fecha original de T+18 (14 may 2028) y la ciberseguridad cierra el 12 nov 2028.

### 3.2 Columna vertebral de tecnologías

- **Etapa 1:** TypeScript y Node (stack actual) → Java y Spring Boot → Python (FastAPI, RAG, evals, agentes) → Go → Rust → Kubernetes → PyTorch → MLOps → C++. Python no se reemplaza en ningún punto.
- **Etapa 2:** criptografía aplicada, AppSec y pentest, Kubernetes seguro, detección y respuesta, AWS Security.
- **Etapa 3:** Rust y C++ para el núcleo, Python para investigación y enlaces, .NET para sistemas de órdenes y riesgo.
- **Etapa 4:** Rust, C++, Julia, ROS 2, F Prime o cFS, RTOS.
- **Tecnologías nuevas propuestas** (criterio de mercado, sin verificar contra ofertas): .NET con FHIR en Escudo, Ruby on Rails en Surco v1, WebAssembly, eBPF, PostGIS, Kafka, ClickHouse, ROS 2, Vault y SPIFFE, OpenSearch, Polars, Orekit.
- **Plataformas:** TypeScript compartido en monorepo; Expo y React Native (mobile); Electron y luego Tauri (escritorio); WebXR sobre Three.js (VR y AR); AR de cielo con sensores del dispositivo.
- **Arquitectura:** microservicios (contratos, saga, outbox, mTLS, trazas) y microfrontends (Module Federation o single-spa).

### 3.3 Etapa 1 · Núcleo

**P0 Consolidación** (2 sem). Portfolio hub con mapa 3D de proyectos (`proyectos.json` con id, nombre, rubro, estado, fechas, tecnologías nuevas, depende_de, reutiliza, enlace; script que valida ids repetidos, referencias rotas y ciclos), Trazo como caso, RAG para negocios sobre Complia, 3 automatizaciones, portfolio-mcp v0. Matemática: ninguna, solo diagnóstico. Perfil: Sr Full-stack con IA aplicada. Referencia: RAG evaluado con 20 preguntas de respuesta conocida y tasa de abstención correcta.

**P1 Faro v1 · petróleo** (3 + 2). Plataforma multiempresa en Spring Boot (Spring Security y OIDC, Postgres con pgvector) y servicio RAG en Python (FastAPI). Tecnología nueva: DuckDB y Parquet. Plataforma extra: escritorio con Electron (consola offline de analista con DuckDB local; Tauri llega después de aprender Rust en P4). Arquitectura: dos servicios con contrato OpenAPI, API gateway y pruebas de contrato. Feature "Faro Vaca Muerta": preguntas en lenguaje natural sobre pozos reales (datos públicos de la Secretaría de Energía: producción por pozo, Capítulo IV, y datos de fractura), con cita al dato; "pozo tipo" con percentiles P10/P50/P90; verificador de cumplimiento contra normativa; calendario de obligaciones de reporte (la Resolución 319/1993 pide entrega mensual de Capítulo IV antes del día 20; verificar vigencia). Visual: yacimiento 3D con pozos reales, rama horizontal, etapas de fractura y producción acumulada. Pieza a mano: percentiles y similitud coseno. Matemática previa: aritmética y álgebra. Perfil: Full-stack AI Engineer. Referencia: respuestas validadas contra el dato oficial. Validador: ingeniero de reservorios o de cumplimiento.

**P2 Escudo · medicina** (3 + 1). Gateway en Go para datos de pacientes: acceso por rol, auditoría, modelo local opcional y banco de ataques comparado contra herramientas existentes. Tecnologías nuevas: .NET con FHIR (interoperabilidad en salud), vLLM y LoRA para el modelo local. Feature: desidentificación de datos clínicos con enmascarado por rol y reporte "quién accedió a este paciente". Visual: recorrido del dato clínico y qué se enmascara. Pieza a mano: conteo y k-anonimato (la privacidad diferencial se ve después de W3). Perfil: AI Engineer con seguridad. Referencia: precisión y recall de la detección de datos sensibles en un set sintético; banco de ataques contra herramientas existentes.

**P3 Surco v1 · agro** (3 + 1, tras W1). Predicción de rinde por lote con rango de confianza (clima y suelo), pandas, scikit-learn, MLflow, Dagster, k3s y Helm. Tecnologías nuevas: Ruby on Rails para el backoffice de campañas y lotes, gradient boosting y predicción conforme. Feature: simulador de escenarios por fecha de siembra. Visual: terreno 3D con mapa de vegetación y zonas. Pieza a mano: cuantiles y predicción conforme. Perfil: Applied ML Engineer. Referencia: error contra una línea base simple y cobertura de los intervalos cercana a la nominal. Validador: agrónomo.

**P4 Estación v1 · espacio** (4 + 1). Ingesta y decodificación de telemetría de satélites en Rust, SGP4, MQTT con mTLS, OTA. Tecnologías nuevas: WebAssembly (el decodificador corre en el navegador) y estándares CCSDS. Feature: planificador de pasadas con estimación de calidad de enlace. Visual: pasadas y visibilidad en 3D. Pieza a mano: propagación de una pasada y comparación con la librería. Perfil: Systems / Ground Software Engineer. Referencia: error de posición en km contra la librería.

**P5 Faro v2 · petróleo** (2 + 1). Kubernetes endurecido con GitOps y artefactos firmados, mínimo privilegio, detección sobre logs con reglas MITRE ATT&CK, colector en Go. Tecnología nueva: eBPF con Falco. Plataforma extra: VR con WebXR (recorrido por el interior de la planta). Arquitectura: malla de servicios con mTLS (Linkerd o Istio). Feature: detección sobre tráfico industrial simulado (Modbus, OPC UA) mapeada a MITRE ATT&CK for ICS, mapa de cobertura con cada regla acompañada de su ataque simulado. Visual: interior de planta con el equipo afectado iluminado y el recorrido del ataque. Pieza a mano: ajuste de curvas de declinación con intervalos (movido desde P1) y tasa de falsos positivos de reglas. Perfil: DevSecOps / Cloud Security Engineer. Referencia: cobertura medida y CIS Kubernetes Benchmark.

**P6 Lupa v1 · aeroespacial** (4 + 1, tras W2). Inspección de superficies de aeronaves entrenada con imágenes sintéticas 3D, medición de cuánto cae con imágenes reales, autograd desde cero. PyTorch y GPU. Tecnología nueva: Blender con Python para datos sintéticos. Plataforma extra: escritorio con Tauri (herramienta de etiquetado y revisión). Feature: informe de inspección automático con defecto ubicado en el modelo 3D, severidad y cola de revisión humana. Visual: defectos sobre la aeronave. Pieza a mano: autograd y backpropagation (regla de la cadena). Perfil: ML Engineer (deep learning). Referencia: gradient check contra PyTorch y caída sintético→real medida.

**P7 Surco v2 · agro** (2 + 1). MLOps: imágenes Sentinel-2, reentrenamiento por campaña, detección de drift, serving en Kubernetes. Tecnologías nuevas: PostGIS y STAC. Feature: zonas de manejo por lote y alerta temprana de estrés de cultivo. Visual: mapa de estrés por lote. Pieza a mano: PCA y SVD (álgebra lineal). Perfil: ML / MLOps Engineer. Referencia: drift detectado contra drift inyectado.

**P8 Núcleo · nuclear** (2 + 1, tras W3). Original: gemelo digital de un reactor simplificado (cinética puntual) con detección de anomalías y red team de ataques que falsean sensores (modelo educativo). Propuesta de reemplazo (pendiente de confirmar): laboratorio de red teaming de agentes (inyección de prompts, abuso de herramientas) con reporte reproducible mapeado a OWASP LLM Top 10; herramientas garak y PyRIT. Pieza a mano: Bayes y tasa base para medir detección. Perfil: AI Security Engineer. Referencia: tasa de éxito de ataques por herramienta.

**P9 Lupa v2 · aeroespacial** (3 + 1). Original: el mismo modelo en el borde con C++ y Jetson, en un dron dentro de un simulador 3D. Propuesta: optimización de inferencia en CPU con ONNX Runtime y cuantización, con benchmarks reproducibles (sin hardware). Feature: modo sin conexión con cola de sincronización y presupuesto de latencia medido. Visual: latencia y energía en vivo. Pieza a mano: error de cuantización y su cota. Perfil: Edge AI Engineer. Referencia: latencia y pérdida de exactitud contra el modelo original.

**P10 Estación v2 · espacio** (4 + 1 feature + 2 arquitectura). Detección de anomalías en telemetría con datos públicos de la NASA (SMAP y MSL), plataforma multiempresa con SLO que reusa el núcleo en Go de Escudo y el backend Spring Boot de Faro v1. Tecnologías nuevas: Kafka y autoencoders. Arquitectura (capstone de microservicios): eventos en Kafka, saga y outbox, mTLS entre servicios, trazas distribuidas con OpenTelemetry, contratos probados (Pact), presupuesto de errores, pruebas de resiliencia y ADRs; microfrontends con Module Federation o single-spa (consolas de Faro, Escudo y Estación como módulos independientes sobre el shell de P0). Feature: triage de anomalías con explicación y priorización para reducir falsas alarmas. Se quitó la consola móvil de este proyecto para no sobrecargarlo. Pieza a mano: distribución de errores y probabilidad aplicada a SLO. Perfil: Senior ML + DevSecOps + Cloud con arquitectura de sistemas distribuidos. Referencia: métricas sobre SMAP y MSL contra una línea base publicada.

### 3.4 Etapa 2 · Ciberseguridad

Ocupa las 25 semanas de margen del plan original. Solo sobre lo propio o con permiso escrito.

**S1 Cripta** (2 + 1, tras W4). Cifrado de sobre y gestión de secretos en Go o Rust: claves con AWS KMS, rotación, mTLS interno, firma de artefactos; las primitivas se implementan solo en un laboratorio para entender fallos (reuso de nonce, padding oracle) y se comparan con una biblioteca auditada. Tecnologías nuevas: Vault y SPIFFE. Feature: inventario de secretos y escáner de secretos expuestos en repos. Pieza a mano: RSA y curvas elípticas. Perfil: Security Engineer (cripto y secretos).

**S2 Bastión** (4 + 1). Modelo de amenazas (STRIDE) y pentest de Faro, Escudo y Estación: OWASP Top 10, API y LLM, fuzzing, reglas Semgrep, SAST, DAST y SCA en pipeline, informe con CVSS. Tecnologías nuevas: Burp Suite y fuzzing guiado por cobertura. Feature: cada hallazgo se reprueba solo en CI. Perfil: Application Security Engineer.

**S3 Centinela** (4 + 1). Detección como código (Sigma y MITRE ATT&CK) sobre el colector de Faro v2, purple team contra un laboratorio propio, runbooks y forense básica en logs de AWS. Tecnologías nuevas: OpenSearch como SIEM y osquery. Feature: playbooks ejecutables con aprobación humana y medición de tiempo de detección y de respuesta. Pieza a mano: precisión, recall y costo de falsos positivos. Perfil: Detection & Response / Cloud Security Engineer.

### 3.5 Etapa 3 · Quant trading

Plan de estudio e ingeniería, no asesoramiento financiero ni promesa de rendimiento. Se vende infraestructura y herramientas, no señales. Referencia de nivel: plataformas internas de bancos como Athena de JP Morgan (plataforma de riesgo, valuación y gestión de operaciones); se construye un análogo educativo a partir de descripciones públicas, nunca con material propietario.

**Q1 Ábaco** (4 + 1, tras WQ1). Backtester de eventos en Rust con costos, deslizamiento y ajustes corporativos; validación walk-forward y purgada; Sharpe deflactado. Tecnologías nuevas: Polars y Arrow, enlaces PyO3. Feature: registro de experimentos reproducibles (hash de datos, código y parámetros). Visual: superficie parámetros × desempeño. Perfil: Quant Developer (infraestructura de investigación).

**Q2 Brújula** (4 + 1). Original: estrategias sistemáticas (momentum, reversión, pares), VaR, ES, registro de hipótesis. Propuesta: réplica de 3 papers académicos con el backtester y un informe con las diferencias contra el original. Tecnología nueva: Quarto. Perfil: Junior Quant Researcher.

**Q3 Prisma** (4 + 1, tras WQ2). Librería de valuación: Black–Scholes–Merton, binomial, Monte Carlo, diferencias finitas, griegas, volatilidad implícita; núcleo en C++ o Rust y enlaces a Python. Validar contra QuantLib. Feature: riesgo de cartera de opciones con griegas agregadas y escenarios de estrés. Visual: superficie de volatilidad. Perfil: Quant Developer (valuación y riesgo). Idea: grafo de dependencias para recalcular riesgo en tiempo real.

**Q4 Libro** (4 + 1). Simulador de libro de órdenes y motor de matching en C++ o Rust, market making Avellaneda–Stoikov, ejecución TWAP, VWAP y Almgren–Chriss, latencia p99. Tecnología nueva: protocolo FIX. Feature: análisis de costos de transacción (slippage contra VWAP y precio de llegada). Visual: libro de órdenes animado. Perfil: Trading Systems Engineer.

**Q5 Tablero** (5 + 1, tras WQ3). Plataforma de punta a punta: datos de mercado, señales, gestor de órdenes, riesgo previo a cada orden, conexión a un bróker **solo en paper trading**, kill-switch, auditoría inmutable, monitoreo y runbook, con los secretos, mTLS y firmas de la etapa 2. Tecnología nueva: .NET para el gestor de órdenes y riesgo. Feature: conciliación de posiciones y límites previos a cada orden. Perfil: Quant Trading Engineer. El paper trading corre 12 semanas o más, con 30 min diarios de monitoreo, durante el arranque de la etapa 4.

**Q6 Nexo** (4 + 1). Original: ML financiero con validación purgada y meta-etiquetado, más agente investigador con MCP. Propuesta: pipeline de datos de mercado (ingesta, normalización, almacenamiento columnar, replay) con el agente como extra chico. Tecnología nueva: ClickHouse. Feature: calidad de datos (huecos, outliers, ajustes corporativos, linaje). Perfil: ML Quant / AI Quant Researcher.

### 3.6 Etapa 4 · Ingeniería aeroespacial

Se estudian capítulos selectivos; el resto queda como profundidad opcional. Los agentes proponen y nunca ejecutan acciones irreversibles sin aprobación.

**A1 Trayectoria** (5 + 1, tras WA1). Simulador 6-DOF en Rust o C++ con cuaterniones, atmósfera estándar, RK4 y adaptativo, validado contra soluciones analíticas. Tecnología nueva: Julia para contrastar. Feature: dispersión Monte Carlo con cono de incertidumbre. Perfil: Simulation / Flight Dynamics Software Engineer.

**A2 Cuerda** (5 + 1, tras WA2). Solver de elementos finitos 1D y 2D (vigas, cerchas, placas) verificado contra ejemplos de Beer y Johnston, optimización de peso. Tecnologías nuevas: Gmsh y CalculiX para validar. Feature: verificación de convergencia de malla y reporte de margen. Perfil: Computational Mechanics / CAE Software Engineer.

**A3 Túnel** (6, tras WA3, recortable). Método de paneles 2D, vortex lattice y Euler 2D, comparados con OpenFOAM o SU2. Si falta tiempo se recorta Euler 2D. Perfil: Aerodynamics / CFD Software Engineer.

**A4 Rumbo** (5 + 1, tras WA4). Lazo cerrado con PID, LQR y filtro de Kalman, fusión de IMU y GPS, controlador de dron en PX4 o ArduPilot (simulación). Tecnologías nuevas: ROS 2 y aprendizaje por refuerzo comparado contra LQR, solo en simulación. Feature: banco de fallas de sensor y GPS con evaluación de modos seguros. Perfil: GNC Software Engineer.

**A5 Órbita** (4 + 1, tras WA5). Propagador con J2 y arrastre, Lambert, Hohmann y bi-elípticas, ventanas de lanzamiento y cobertura, reusando SGP4 de Estación v1 y comparando con GMAT u Orekit. Tecnología nueva: Orekit (Java). Feature: ventanas de comunicación y screening de conjunciones con TLE públicos. Perfil: Mission Analysis / Astrodynamics Software Engineer.

**A6 Cohete** (4, recortable). Original: diseño preliminar de lanzador con optimización multidisciplinaria y Monte Carlo. Propuesta: contribuciones a open source (PX4, Orekit o F Prime). Perfil: Systems / MDO Engineer.

**A7 Horizonte** (6 + 1). Gemelo digital de misión sobre F Prime o cFS, telemetría hacia Estación v2, simulación con A1 a A5, comandos firmados y detección de anomalías. Tecnologías nuevas: RTOS con Rust embebido o Ada/SPARK para un módulo crítico. Feature: operador asistido (el agente propone el runbook y el operador aprueba). Perfil: Aerospace Software Engineer.

### 3.7 Validadores por rubro (3 ítems de evidencia)

Petróleo: ingeniero de reservorios o de cumplimiento. Medicina: persona de salud digital. Agro: agrónomo. Espacio: operador de estación terrena o radioaficionado. Aeroespacial: ingeniero del rubro. Seguridad: pentester o analista SOC. Quant: trader o quant. Con una llamada de 30 minutos y un comentario escrito alcanza.

### 3.8 Capa de plataformas y arquitectura (por proyecto)

| Id | Plataforma extra | Arquitectura |
|---|---|---|
| P0 | PWA instalable y base del monorepo | shell de microfrontends (Module Federation) |
| P1 | Escritorio (Electron) | 2 servicios con contrato OpenAPI, gateway, pruebas de contrato |
| P2 | Mobile (Expo y React Native) | gateway en el borde |
| P3 | Mobile (Expo) | monolito modular en Rails, a propósito |
| P4 | AR del cielo con sensores del dispositivo | — |
| P5 | VR (WebXR) | malla de servicios con mTLS |
| P6 | Escritorio (Tauri) | — |
| P7 | AR (zonas de manejo sobre el lote) | pipeline de reentrenamiento orquestado |
| P8 | — | — |
| P9 | Mobile (ONNX Runtime Mobile) y AR | — |
| P10 | — (se quitó la consola móvil) | microservicios completos y microfrontends |
| S1 | Escritorio (Tauri) | identidad de servicios con SPIFFE |
| S2 | — | — |
| S3 | Mobile (alertas y aprobación de playbooks) | — |
| Q1 | Escritorio (Tauri) | — |
| Q2 | — | — |
| Q3 | VR (superficie de volatilidad) | — |
| Q4 | — | — |
| Q5 | Mobile (aprobación de órdenes y kill-switch con doble factor) | componentes en servicios separados: datos, señales, órdenes, riesgo |
| Q6 | — | — |
| A1 | VR (trayectoria en 3D) | — |
| A2 | Escritorio (Tauri) | — |
| A3 | — | — |
| A4 | Mobile (estación de control en simulación) | — |
| A5 | AR de órbitas | — |
| A6 | — | — |
| A7 | VR (sala de control del operador) | — |

Resumen: mobile en 6 proyectos, escritorio en 5, VR en 4 y AR en 4 (P9 usa mobile y AR con una sola semana extra).

Reglas de esta capa:
- Monorepo en TypeScript con cliente de API, modelos y tokens de diseño compartidos; cada plataforma nueva reusa eso, así que cuesta menos que la anterior.
- Electron hasta aprender Rust en P4; Tauri desde P6.
- VR y AR con WebXR sobre Three.js. El soporte de AR con WebXR en iPhone es limitado: verificarlo antes de comprometer cada feature. El AR de cielo (P4) usa sensores del dispositivo y no depende de WebXR.
- Necesitan dispositivo para probar. Sin visor propio se usan emuladores de WebXR en el navegador, que no reemplazan una prueba real.
- Una plataforma extra por proyecto, ninguna en bloques con certificación, y el modo normal accesible siempre funciona.
- Microservicios: entregables obligatorios en P1, P5, P10, S1 y Q5 (contrato probado, trazas distribuidas, mTLS, ADR que justifique la división). Microfrontends: shell en P0 y módulos independientes en P10.
- La demanda de mercado de microservicios, microfrontends, mobile, VR y AR es criterio mío y no está verificada contra ofertas actuales: contrastarlo en las revisiones de mercado.

### 3.9 Calibración y escenarios

Trazo registra horas estimadas y reales por bloque. Tras cerrar P3 se calcula el factor real/estimado y se aplica a los bloques siguientes; se revisa al cerrar cada etapa. Regla: si el factor es menor a 0,85, se comprimen las extras de los proyectos que reusan trabajo anterior (P5, P7, P9, P10, S2, S3, Q3 a Q6, A5, A7); si es mayor a 1,15, se recortan primero A3, A6, Q2, Q6 y las plataformas opcionales.

Escenarios para el calendario completo (supuestos míos, a recalibrar con datos reales):
- **Optimista:** 203 semanas, hasta 8 oct 2030. Reutilización fuerte (25 % del núcleo técnico en proyectos que reusan, 10 % en el resto) y sin trabajo de jornada completa.
- **Intermedio:** 236 semanas, hasta 25 may 2031. Reutilización moderada (15 % y 5 %) y etapas 2 a 4 un 20 % más largas.
- **Pesimista:** 273 semanas, hasta 5 feb 2032. Sin compresión y etapas 2 a 4 un 40 % más largas.
- Las ventanas, las certificaciones y las pausas no se comprimen.

## 4. Roadmap de matemática

Principio: la matemática va antes del proyecto que la pide, se aplica dentro de él con una pieza hecha a mano y los errores vuelven a Trazo como repasos. El libro principal manda; el refuerzo se abre por tema y tipo de error (concepto → intuición, técnica → banco de ejercicios, profundidad → libro duro). Un solo curso externo a la vez y nunca en lugar del libro. Spivak es opcional y nunca dentro de una ventana.

| Tramo | Fechas base | Principal | Refuerzo | Habilita |
|---|---|---|---|---|
| T+0 a T+2 (diario) | 16 nov 2026 a 17 ene 2027 | CONAMAT Aritmética y Álgebra | Baldor, The Humongous Book of Basic Math and Pre-Algebra Problems, Lang *Basic Mathematics* | todo lo demás |
| **W1** (3 sem) | 18 ene a 7 feb 2027 | CONAMAT Álgebra (funciones, desigualdades) y estadística básica | Stewart, Redlin y Watson *Precalculus*, Gelfand *Functions and Graphs*, OpenIntro Statistics | P3 |
| T+3 a T+6 (diario) | 8 feb a 16 may | CONAMAT Geometría y trigonometría, Geometría analítica | Gelfand *Trigonometry*, Stewart *Precalculus*, Sullivan *Precalculus* | P4, P9 |
| **W2** (4 sem) | 17 may a 13 jun | CONAMAT Cálculo diferencial; vectores y matrices básicos | Stewart *Calculus*, 3Blue1Brown, MIT 18.01SC, Strang cap. 1 a 3, Parr y Howard *Matrix Calculus* | P6 |
| T+7 a T+8 (diario) | 14 jun a 8 ago | CONAMAT Cálculo integral; Strang *Introduction to Linear Algebra* | MIT 18.06, Stewart (integrales) | P7 |
| **W3** (4 sem) | 9 ago a 5 sep | Blitzstein y Hwang *Introduction to Probability*; EDOs y optimización | Harvard Stat 110, ISL, Simmons *Differential Equations* cap. 1 a 3 con MIT 18.03SC, Chapra y Canale (Euler, RK2, RK4), Boyd y Vandenberghe cap. 1 a 4 | P8 (y base de quant y aero) |
| T+9 a T+18 (diario) | 6 sep 2027 a 14 may 2028 | Deisenroth *Mathematics for Machine Learning*; cálculo multivariable | Stewart, MIT 18.02SC, Schey *Div, Grad, Curl*, Wasserman *All of Statistics* | perfil senior en ML; base de la etapa 3 |
| **W4** (2 sem) | 22 nov a 5 dic 2027 | Matemática discreta y criptografía: Lehman, Leighton y Meyer *Mathematics for Computer Science* | Paar y Pelzl *Understanding Cryptography*, Boneh y Shoup *A Graduate Course in Applied Cryptography* | S1 |
| **WQ1** (3 sem) | 15 may a 4 jun 2028 | Estadística, series de tiempo, portafolios: Wasserman *All of Statistics*, Hyndman y Athanasopoulos *Forecasting*, Tsay *Analysis of Financial Time Series* | Bodie, Kane y Marcus *Investments*, Hull (cap. introductorios) | Q1, Q2 |
| **WQ2** (4 sem) | 7 ago a 3 sep | Cálculo estocástico y derivados: Shreve *Stochastic Calculus for Finance I y II*, Hull | Wilmott, Joshi, Glasserman (selectivo), Gatheral *The Volatility Surface* | Q3, Q4 |
| **WQ3** (2 sem) | 30 oct a 12 nov | Optimización convexa y ML financiero: Boyd y Vandenberghe cap. 5 a 8 | Grinold y Kahn *Active Portfolio Management*, López de Prado *Advances in Financial Machine Learning* | Q5, Q6 |
| **WA1** (4 sem) | 5 feb a 4 mar 2029 | Young y Freedman *University Physics* (mecánica); Simmons *Differential Equations* | Taylor *Classical Mechanics*, Serway, MIT 8.01SC y 18.03SC, Stevens y Lewis | A1 |
| **WA2** (3 sem) | 9 a 29 abr | Hibbeler *Statics* y *Dynamics*; Beer y Johnston *Mechanics of Materials* | Callister (selectivo), Trefethen y Bau (selectivo), Megson (al final), Beer *Vector Mechanics* | A2 |
| **WA3** (4 sem) | 11 jun a 8 jul | Çengel y Boles *Thermodynamics*; White *Fluid Mechanics*; Anderson *Introduction to Flight* | Anderson *Fundamentals of Aerodynamics* y *Modern Compressible Flow*, Munson, Incropera (selectivo) | A3 |
| **WA4** (3 sem) | 20 ago a 9 sep | Nise *Control Systems Engineering*; Simon *Optimal State Estimation* | Ogata (consulta), Labbe *Kalman and Bayesian Filters in Python*, Onramps de MATLAB, Simulink y Control Design | A4 |
| **WA5** (2 sem) | 15 a 28 oct | Curtis *Orbital Mechanics for Engineering Students*; Sutton *Rocket Propulsion Elements* (por capítulos) | Vallado (consulta), Wertz *Space Mission Engineering*, Fortescue *Spacecraft Systems Engineering* | A5, A6 |

(Las fechas de esta tabla son las base; con extras de feature se recalculan desde el calendario.)

Entrevistas técnicas: 3 sesiones de 45 min por semana dentro de cada proyecto, documento de diseño de 2 páginas y set de algoritmos; referencia selectiva de Cormen *Introduction to Algorithms*. Para quant: Zhou *A Practical Guide to Quantitative Finance Interviews* y Crack *Heard on the Street*; microestructura: Harris, Cartea, Jaimungal y Penalva, Chan; C++: Meyers y Williams.

Primer control real: el cierre de W1 (7 feb 2027 en las fechas base). La duración real de W2 y W3 se ajusta con los tests, no antes.

### Pieza matemática hecha a mano, por proyecto

P1 percentiles y similitud coseno · P2 conteo y k-anonimato · P3 cuantiles y predicción conforme · P4 propagación SGP4 de una pasada · P5 ajuste de declinación con intervalos y falsos positivos · P6 autograd y backpropagation · P7 PCA y SVD · P8 Bayes y tasa base · P9 error de cuantización · P10 distribución de errores y SLO · S1 RSA y curvas elípticas · S2 lógica y análisis de programas · S3 precisión, recall y costo de falsos positivos · Q1 Sharpe deflactado y validación purgada · Q2 inferencia y corrección por comparaciones múltiples · Q3 Black–Scholes derivado y Monte Carlo · Q4 Avellaneda–Stoikov y Almgren–Chriss · Q5 optimización convexa de portafolio · Q6 series de tiempo y controles de calidad · A1 EDOs, RK4 y cuaterniones · A2 matriz de rigidez de una viga · A3 discretización de una PDE · A4 LQR y Kalman · A5 Kepler, Lambert y Hohmann.

## 5. Certificaciones

Precios y versiones verificados el 15 nov 2026; cambian, reconfirmar al reservar cada examen.

| # | Certificación | Cuándo (base) | Costo US$ | Notas |
|---|---|---|---|---|
| C1 | AWS Solutions Architect Associate | 1 a 14 mar 2027 | sin verificar | confirmar precio y versión |
| C2 | CompTIA Security+ | 26 abr a 16 may 2027 | 439 (579 con reintento) | SY0-801 sale cerca del 17 nov 2026; SY0-701 se retira el 11 jun 2027 (inglés) y el 13 ago 2027 (español). Con extras, C2 cae 12 jul–1 ago 2027: SY0-701 en inglés ya está retirado (11 jun 2027) y en español sigue hasta el 13 ago 2027. O se rinde SY0-801 o 701 en español antes del 13 ago. **Decisión el domingo 22 nov 2026.** |
| C3 | AWS Machine Learning Engineer Associate (MLA-C01) | 26 jul a 8 ago 2027 | 150 según la mayoría de las fuentes; una fuente dice 300 | confirmar en AWS |
| C4 | PNPT (TCM Security) | 24 ene a 13 feb 2028 | 499 | 12 meses de entrenamiento y 1 reintento; examen de 5 días más 2 para el informe; no vence |
| C5 | CKA | 14 a 27 feb 2028 | sin verificar | requisito de CKS |
| C6 | CKS | 28 feb a 19 mar 2028 | 445 | incluye 1 reintento; exige haber aprobado CKA; vale 2 años |
| C7 | AWS Security Specialty (SCS-C03) | 17 abr a 7 may 2028 | 300 | 65 preguntas, 170 min, aprobación 750/1000 |

Opcionales fuera del calendario: OSCP+ (cerca de US$1.749, solo vi un fragmento de búsqueda; sin verificar) y AZ-500; se deciden con la revisión de mercado de abril de 2028. Quant: CQF (US$23.995 antes del 3 dic 2026 y US$24.995 después) queda fuera por costo; WorldQuant MScFE descartada por pedir título universitario.

## 6. Perfiles

Por proyecto: ver cada ficha. Por hito:
- **Cierre de etapa 1:** Senior ML + DevSecOps + Cloud con arquitectura de sistemas distribuidos (con C1 a C3).
- **Cierre de etapa 2 (cierre de T+18):** Senior con foco en seguridad (con C4 a C7).
- **Cierre de Q4:** Trading Systems Engineer. **Cierre de etapa 3:** Quant Trading Engineer / ML Quant.
- **Cierre de A5:** Mission Analysis y GNC. **Cierre de etapa 4:** Aerospace Software Engineer.

Cada etapa deja un perfil vendible: cortar en cualquier cierre no pierde lo anterior. Competitividad estimada: alta en cloud, seguridad e IA para roles senior remotos; media en quant de empresas medianas, fintech y cripto; baja en quant de primer nivel y en aeroespacial como empleo directo (muchos puestos piden título, nacionalidad o habilitación). Revisión de mercado: abril de 2028 y al cerrar cada etapa; si no hay señal, se achica (quant: Q1, Q3, Q4, Q5; aero: A1, A4, A7).

## 7. Implementación en Trazo

### Modelo de datos (propuesta; ajustala al esquema real)
- **Bloque:** id, etapa, tipo (proyecto, ventana, cert, pausa, colchón, cierre), nombre, semanas_base, semanas_extra, estado, depende_de, notas.
- **Fechas derivadas:** inicio 2026-11-16 más la suma de semanas en orden. Cambiar una duración recalcula todo lo siguiente. Se puede prender o apagar el extra de feature por bloque.
- **Proyecto:** rubro, tecnología nueva, feature diferencial, visual, pieza matemática, reutiliza, perfil al terminar, referencia externa, validador, informe público, tres ítems de evidencia, recortable (sí o no), propuesta de reemplazo (original y alternativa).
- **Ventana o tramo:** libros (principal y refuerzo), tests por capítulo, puerta 85 %, habilita.
- **Cert:** fecha objetivo, costo (verificado o "sin verificar"), vencimiento, estado.
- **Perfil:** uno por proyecto y uno por hito.

### Vistas
1. Línea de tiempo a escala (etapas, ventanas, certificaciones, hitos) con la etapa actual marcada.
2. Hoy y esta semana: bloque actual, test pendiente, repasos que vencen.
3. Proyecto: checklist de evidencia, pieza matemática y perfil.
4. Ventana: tests con semáforo (85, 65 y menos) y libro de refuerzo sugerido.
5. Panel "hoy sos": el último perfil desbloqueado y el siguiente.
6. Alertas de vencimiento de certificaciones y de cierre de ventanas.

### Cambios de la v2 para Trazo
- Campos nuevos en bloque: semanas_feature, semanas_plataforma, semanas_arquitectura, plataforma_extra, arquitectura, horas_estimadas, horas_reales.
- Motor de fechas: la pausa de fin de año se inserta sola (semana lun-dom cuyo lunes cae entre el 18 y el 24 de dic).
- Alerta de versión de examen: cada cert guarda versiones con fecha de retiro (Security+: SY0-701 se retira el 11 jun 2027 en inglés y el 13 ago 2027 en español; SY0-801 sale cerca del 17 nov 2026). Si la fecha del examen cae después del retiro de la versión elegida, mostrar alerta.
- Factor de calibración (real/estimado) calculado tras P3, con vista de escenarios.
- Checklist de entregables de arquitectura por proyecto (contrato probado, trazas, mTLS, ADR).

### Criterios de aceptación
- Validador de JSON con tests: ids únicos, referencias rotas, ciclos, fechas coherentes y sumas de semanas por etapa (53, 25, 38 y 55 en base). Test clave: el calendario base debe terminar las etapas el 21 nov 2027, 14 may 2028, 4 feb 2029 y 24 feb 2030.
- Tests del recálculo de fechas y de la regla 85 / 65.
- Funciona offline como PWA y es accesible (lista alternativa a cualquier vista gráfica).
- Migración reversible y sin perder sesiones existentes.

## 8. Decisiones abiertas (flags editables, no las resuelvas)

- Security+ SY0-801 o SY0-701 (22 nov 2026).
- Precios sin verificar: AWS SAA, CKA, AWS MLA; OSCP+ solo fragmento.
- Confirmar los reemplazos propuestos: P8 (red teaming), P9 (inferencia en CPU), Q2 (réplica de papers), Q6 (datos de mercado), A6 (open source).
- Revisión de mercado de abril de 2028: seguir o achicar quant y aeroespacial.
- Marco legal e impositivo de trading desde Argentina antes de capital real.
- Alinear las páginas del canvas visual de Trazo con este calendario.
- Si una carrera universitaria entra o no al plan: hoy no, camino autodidacta.
- Confirmar la capa de plataformas (mobile, escritorio, VR, AR) y si se aligera la etapa 1.
- Confirmar microservicios y microfrontends como entregables de P1, P5, P10, S1 y Q5.
- Qué dispositivo de VR y AR vas a usar para probar.
- Verificar la demanda de mercado de las tecnologías nuevas contra ofertas reales.
