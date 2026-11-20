# Roadmap completo · Plan T+18 extendido (v7)

> Fuente de verdad que pasó Toti el 2026-11-20 (prompts v4, v6 y esta v7). Texto tal cual lo recibió Trazo. No se aplicó todavía: primero va el análisis de cambios y la confirmación (ver `docs/PLAN.md`).

★ = herramienta o demo estrella, dentro del alcance. † = propuesta a confirmar.
Las horas de PetrIA están medidas. Las de los demás proyectos llevan un factor provisional de 1,5 hasta calibrar con las horas reales de PetrIA 1.0 y 1.1.

**Cambios respecto de la v6:**
- Se saca el módulo de pagos. En su lugar entra la medición de uso y cuotas por empresa.
- PetrIA se hace a ~8 h por día para sostener las fechas.
- Hasta que llegue la PC se trabaja sin Codespaces.
- La AR de PetrIA 3.0 se hace con AR Quick Look.
- El ESP32 queda solo en Wokwi por ahora.
- Los módulos comunes viven en el repo `platform-kit`.

---

# BASES

## Decisión de fondo
- Cada proyecto se hace con el alcance completo y se publica por versiones.
- Si una versión se atrasa, se mueven fechas, no se recorta profundidad.

## Versiones (igual en todos los proyectos)
- **1.0 MVP:** el núcleo funcionando de punta a punta, desplegado, público y con README.
- **1.1 Producto:** el resto de las herramientas ★, las 8 capas y evals completos, autenticación, el paquete de frontend y los algorithm spots.
- **2.0 Plataforma:** notificaciones, voz, integraciones y capa física simulada o con el celular.
- **3.0 Producción:** escala con load-lab, estándar de operación, hardware real, Scale report, artículo y video.
- Cada versión sale con notas de versión, un video demo de 30 s y el README actualizado.

## Capacidad
- **PetrIA (20 nov 2026 – 5 ene 2027):** ~8 h por día de proyecto. Las 1,5–2 h extra salen de un bloque a definir, nunca del sueño ni del entrenamiento.
- **Con el trabajo nuevo (supuesto: 4 ene 2027):**
  - ≈ 29 h por semana de proyecto.
  - Ventanas de matemática a 43 h por semana.
  - Matemática diaria: 2 h, en pausa durante las ventanas.
- **Pausas de diciembre:** ninguna en 2026; una semana en 2027, 2028, 2029 y 2030.
- **Fin del plan:** ≈ 27 may 2031.

## Entorno
- **Hasta la PC (primera semana de dic 2026):**
  - iPad 8, sin Codespaces.
  - Claude Code corre el código en su propio entorno.
  - Revisás los PRs desde la app de GitHub.
  - Los datos se procesan en Colab.
  - Deploy en Render y base en Neon.
- **Con la PC:** se suma el desarrollo local y las pruebas pesadas (100 M de filas).
- **Repos:**
  - Un repo por servicio.
  - Los módulos comunes van en `platform-kit` (excepción documentada en un ADR).
  - `english.md` y `hours.md` van en el repo privado.

## Estándar de alto valor (12 puntos, todos los proyectos)
1. En producción, con demo pública (URL y video de 30 s).
2. Datos reales; lo simulado, marcado y explicado.
3. Métricas en el README: calidad, p95, costo y confiabilidad.
4. Documento de diseño de 1 página en inglés antes de codear.
5. Seguridad base: modelo de amenazas, permisos mínimos, secretos fuera del repo.
6. Si usa LLM, las 8 capas: prompt, RAG, herramientas/MCP, accesos, guardrails, caché, router, observabilidad con evals.
7. Paquete de escala: load-lab y Scale report.
8. Paquete de operación:
   - OpenTelemetry y Grafana.
   - SLO y presupuesto de errores.
   - Feature flags.
   - Migraciones expand/contract.
   - Estrategia de deploy.
   - Backup con simulacro.
   - Degradación controlada.
   - Rate limiting.
   - Runbooks y postmortem.
9. Frontend 10/10:
   - Sistema de diseño con Storybook.
   - Carga procedural.
   - Core Web Vitals.
   - WCAG AA con axe en el CI.
   - Playwright.
   - Español e inglés.
   - UX para IA: streaming, citas, feedback e incertidumbre visible.
10. Algorithm spots plantados.
11. Material de entrevista: artículo, explicación en 2 minutos y 3 preguntas de diseño de sistemas.
12. Open source: 1–2 PRs por mes.

## Reglas para que haga ruido
- Resuelve un dolor concreto de un puesto.
- Se entiende en 30 s.
- Es gratis y está online.
- Corre en una nube real.
- Lleva una publicación por herramienta, en español e inglés.

## Módulos comunes (`platform-kit`, nacen en PetrIA 2.0 y 3.0)
- **Calculadora de ahorro:** horas ahorradas × costo por hora + errores evitados × costo por error − costo de operación.
- **Medición de uso y cuotas por empresa:**
  - Consultas, tokens y costo por tenant.
  - Límites y aviso al acercarse a la cuota.
  - Sin cobro.
- **notification-service (Node + NestJS):**
  - Canales:
    - WhatsApp con Meta Cloud API.
    - Email con SES, con SPF, DKIM y DMARC.
    - Llamadas con ElevenLabs y Twilio.
  - Respaldo WhatsApp → llamada → email.
  - Idempotencia, también en los callbacks de WhatsApp y Twilio.
  - Topes de gasto.
- **voice-gateway:** asistente tipo Jarvis, con streaming, interrupción y confirmación antes de las acciones.
- **load-lab:**
  - k6 y bots con personajes.
  - LLM simulado: las pruebas nunca van contra la API real.
  - Datos de 10 mil, 1 M y 100 M de filas.
  - Caos y Grafana.
- **Sistema de diseño** con Storybook.
- **Pagos:** fuera del plan. Se integran solo si Eclipse o un SaaS propio necesita cobrar de verdad.

## Capa física
- Wokwi, y el ESP32 real con el mismo firmware cuando se compre.
- El celular como sensor: cámara, IMU, GPS, NFC, Face ID.
- 3D con Three.js.
- **AR en iPhone:**
  - Modelos 3D (el pozo, el tanque, los daños): AR Quick Look con USDZ desde la web, sin app ni cuenta paga.
  - AR con la cámara en vivo ("Apuntá al cielo") y apps en TestFlight: ViroReact con un development build. Sin Mac, eso requiere el Apple Developer Program (USD 99 por año) y EAS Build. Se paga antes del 19 feb 2027.

## IA por API vs ML propio
- **IA por API:** integración con un LLM. No entrenás nada.
- **ML propio:** un modelo que entrenás y validás vos.

---

# ETAPA 1 · NÚCLEO (19 nov 2026 – 14 jul 2028)

## P0 · Constelación
- **Horas:** la v1 la arman los agentes; la 2.0 y la 2.1 suman ≈ 75 h.
- **Fechas:** v1 en curso; 2.0 y 2.1 del 6 al 23 jul 2027.
- **Puesto:** Sr Full-stack → AI Engineer (RAG multifuente y agentes).
- **Qué hace:** portfolio como mapa 3D de proyectos; después, un agente que responde sobre todo tu trabajo por texto y voz.
- **Problema concreto:** los reclutadores no recorren cinco repos.
- **Valor:** convierte una visita en conversación y en entrevista.
- **Diferencial:** validador de referencias y ciclos, RAG multifuente con citas y evals, MCP público, plantilla open source.
- **Herramientas:** ★ modo reclutador; ★ plantilla open source; métricas en vivo desde el CI.
- **Capa física:** ★ CV o tarjeta en AR (AR Quick Look).
- **Impacto a medir:** visitas, conversaciones, emails respondidos, entrevistas.
- **Notificaciones:** ★ email de seguimiento al reclutador; WhatsApp para vos cuando alguien lo usa.
- **Voz:** ★ "Preguntale a Ignacio".
- **Escala:** pico viral ×50 en minutos.
- **Operación:** CDN, caché e invalidación.
- **Stack:**
  - Frontend: Next.js, TypeScript, Three.js.
  - Backend: Node + TypeScript.
  - IA por API: Python, FastAPI, LangGraph sobre Claude, MCP hacia cada proyecto.
  - ML propio: no aplica.
  - DB: JSON en la v1; Neon con pgvector en la 2.0.
  - Infra: Module Federation, `platform-kit`.
  - Cloud: Render o Vercel†, SES.
- **Versiones:**
  - **1.0 Base (en curso):** mapa 3D, Trazo como caso, validador, shell con Module Federation.
  - **2.0 Con IA (6–14 jul 2027):** RAG con citas y evals (READMEs, ADRs, código, `learning.md`), modo reclutador, MCP público.
  - **2.1 Completa (15–23 jul 2027):** voz, CV en AR, email y WhatsApp, métricas en vivo, plantilla open source, CDN y prueba de pico viral.
- **Entrevistas:** medio con la v1; alto desde la 2.0.

## P1 · PetrIA
- **Horas:** antes 122 h; ahora ≈ 304 h (medido; −6 h por sacar pagos).
- **Fechas:** 19 nov 2026 – 5 ene 2027, a ~8 h por día.
- **Puesto:** Full-stack AI Engineer (energía).
- **Qué hace:**
  - Mapa mundial real con los pozos de Vaca Muerta y las zonas de mayor productividad esperada.
  - Valor y declinación de cada pozo, y lector de partes viejos.
  - Asistente por texto, voz, WhatsApp y teléfono que cita el dato oficial.
  - Uso y costo medidos por empresa.
- **Problema concreto:** partes a mano, valuación en Excel, ingeniero de campo sin manos libres.
- **Valor:** dónde perforar, cuánto vale cada pozo, papel convertido en datos.
- **Diferencial:** P10/P50/P90 en todo, validación espacial, abstención, 8 capas, costo por consulta y por empresa con cuotas, Scale report, notificaciones con respaldo.
- **Herramientas:**
  - ★ Sweet spots.
  - ★ Valor del pozo: ingresos en USD y ARS, regalías, costos, valor presente, repago, precio de equilibrio.
  - ★ Declinación con Arps en P10/P50/P90.
  - ★ Lector de partes: de PDF, Excel o foto a datos validados.
  - Extras: alertas, más cuencas, cumplimiento, yacimiento 3D.
- **Capa física:**
  - ★ Pozo en tu mesa (AR Quick Look con USDZ).
  - ★ Celular como escáner de partes.
  - Boca de pozo con presión y caudal en Wokwi por MQTT; la placa real, después.
  - GPS "pozos cerca de mí".
- **Ahorro a medir:** minutos por parte, errores de tipeo, horas de Excel por pozo.
- **Notificaciones:**
  - ★ WhatsApp: resumen, preguntas, alertas.
  - ★ Email: informe semanal en PDF y registro.
  - ★ Llamada: línea de campo.
  - Respaldo WhatsApp → llamada → email.
- **Voz:** ★ "PetrIA, mostrame los mejores pozos de Loma Campana", y el mapa se mueve.
- **Escala:** 500 usuarios concurrentes, 20 empresas, 1 M de filas, p95 < 300 ms; 100 M de filas con la PC.
- **Operación:** el estándar completo.
- **Stack:**
  - Frontend: Next.js, TypeScript, MapLibre GL, Three.js, sistema de diseño, carga procedural; AR Quick Look (USDZ).
  - Backend: Java + Spring Boot (OIDC, multiempresa, JPA†, Flyway†, OpenAPI, medición de uso y cuotas); Node + NestJS (notificaciones y voz).
  - IA por API: Python, FastAPI, LangGraph sobre Claude; pgvector, caché semántica, router, salida estructurada, batch, MCP, evals, trazas con costo; ElevenLabs y Twilio.
  - ML propio: LightGBM† con cuantiles, validación por bloques espaciales, H3†, Arps.
  - DB: Postgres con PostGIS y pgvector (Neon).
  - Infra: 6 servicios, gateway, RabbitMQ, Pact, idempotencia, MQTT, GitHub Actions, Render, `platform-kit`.
  - Cloud: AWS (S3, SQS, Lambda, SES).
- **Algorithm spots:**
  - Sin IA: hash map (índice de pozos), sliding window, binary search sobre series.
  - Con IA: k-d tree, LRU (caché semántica), stack (deshacer zonas), token bucket.
  - KNN como línea base del detector.
- **Hardware:** solo Wokwi por ahora.
- **Versiones:**
  - **1.0 MVP (19 nov – 1 dic, 74 h):** ingesta, detector P10/P50/P90 con validación espacial, mapa con pozos, mapa de calor y concesiones, asistente con citas y abstención, 20 evals, deploy y README.
  - **1.1 Producto (2–12 dic, 74 h):**
    - Herramientas: valor del pozo, declinación, lector de partes.
    - IA: 40–60 evals, tope de costo, router, caché.
    - Plataforma: Keycloak y multiempresa.
    - Frontend y pruebas: Pact, Playwright, accesibilidad, Lighthouse, español e inglés.
    - Operación y seguridad: OpenTelemetry con un escenario k6, MCP, modelo de amenazas.
  - **2.0 Plataforma (13–22 dic, ≈ 64 h):** notification-service, voice-gateway, medición de uso y cuotas por empresa, sistema de diseño con Storybook.
  - **3.0 Producción (23 dic – 5 ene, 92 h):** load-lab completo, caos, simulacro de backups, feature flags, Scale report, ingesta en AWS, pozo en AR Quick Look, celular como escáner, boca de pozo en Wokwi, GPS.
- **Por qué hace ruido:** "¿Cuánto vale cada pozo de Vaca Muerta?" y el video del pozo en AR.
- **Entrevistas:** muy alto.

## 🎓 Certificación 1 · Claude Certified Architect + GitHub Foundations
- **Fechas:** 6–12 ene 2027.
- **Preparación:** Anthropic Academy, 30 min por día hasta el 22 dic.
- **Requisito:** la de Claude exige la Claude Partner Network; sin acceso, GitHub Copilot.

## P2 · VitalIA
- **Horas:** antes 98 h; ahora ≈ 155 h.
- **Fechas:** 13 ene – 18 feb 2027.
- **Puesto:** AI Engineer en salud (.NET, Azure, seguridad).
- **Qué hace:** brechas de cuidado y problemas de medicación con evidencia; traductor de sistemas viejos a FHIR; monitoreo remoto; dictado a nota.
- **Problema concreto:** controles y medicación que se pierden, conciliación manual, sistemas que no se hablan, médicos escribiendo.
- **Valor:** previene complicaciones y moderniza sistemas hospitalarios.
- **Diferencial:**
  - Regla, fuente y evidencia en cada alerta.
  - Cero alertas inventadas.
  - Precisión con feedback médico.
  - "Quién accedió a este paciente".
  - Privacidad por diseño.
- **Herramientas:** ★ brechas de cuidado; ★ conciliación de medicación; ★ traductor de HL7 v2 o CSV a FHIR; extras: SBAR, tablero de población, CQL, banco de ataques.
- **Capa física:**
  - ★ Monitoreo remoto: oxímetro real, y glucómetro y tensiómetro en Wokwi.
  - ★ Escáner de cajas de medicación.
  - AR de interacciones.
- **Ahorro a medir:** minutos de conciliación, horas de migración, brechas cerradas, minutos de notas.
- **Notificaciones (sin datos clínicos):** ★ WhatsApp "tenés una novedad en tu portal"; email al médico; ★ llamada de recordatorio a pacientes simulados, con consentimiento.
- **Voz:** ★ escriba clínico; "¿qué tiene pendiente la cama 12?".
- **Escala:** 100 mil pacientes de Synthea; migración de 1 M de mensajes HL7.
- **Operación:** blue-green en Azure; retención con auditoría.
- **Stack:**
  - Frontend: Next.js + TypeScript, portal seguro.
  - Backend: C#, ASP.NET Core, Firely SDK†, EF Core†, YARP; desidentificador en Rust compilado a WebAssembly.
  - IA por API: Python con Azure OpenAI o Claude; explica, nunca decide.
  - ML propio: no aplica (reglas deterministas).
  - DB: SQL Server† y servidor FHIR.
  - Infra: SMART on FHIR, MQTT, `platform-kit`.
  - Cloud: Azure Health Data Services, Azure OpenAI, Entra ID.
- **Algorithm spots:** sorting + two pointers (sin IA); heap (sin IA).
- **Hardware:** MAX30102 (fase 1).
- **Versiones:**
  - **1.0 MVP (13–21 ene):** FHIR con Synthea, motor con 8–10 reglas, explicación con citas, panel con línea de tiempo, deploy en Azure.
  - **1.1 Producto (22–30 ene):** conciliación, HL7 a FHIR, evals, feedback médico, auditoría, SMART on FHIR, desidentificador en Rust, frontend.
  - **2.0 Plataforma (31 ene – 9 feb):** avisos por WhatsApp y email, llamada de recordatorio, escriba por voz, monitoreo en Wokwi, escáner de cajas.
  - **3.0 Producción (10–18 feb):** 100 mil pacientes, 1 M de mensajes, blue-green, retención, oxímetro real, Scale report.
- **Por qué hace ruido:** "Convertí un sistema hospitalario de 20 años a FHIR en una tarde".
- **Entrevistas:** muy alto.

## Semana multiplataforma
- **Horas:** ≈ 40 h.
- **Fechas:** 19–28 feb 2027.
- **Qué incluye:** ★ consola de campo de PetrIA en Electron, offline; ★ app Expo de VitalIA con push; AR offline del pozo.
- **Publicación:** TestFlight, que requiere el Apple Developer Program.

## W1 · Matemática
- **Horas:** 122 h. **Fechas:** 1–20 mar 2027.
- **Contenido:** probabilidad, estadística, regresión, álgebra lineal base, trigonometría.

## P3 · AgrIA
- **Horas:** antes 122 h; ahora ≈ 180 h.
- **Fechas:** 21 mar – 2 may 2027.
- **Puesto:** Applied ML Engineer (agro).
- **Qué hace:** rinde por departamento con rango de confianza, margen bruto con incertidumbre, atención por WhatsApp con audio.
- **Problema concreto:** el productor decide sin ver el riesgo y no usa planillas.
- **Valor:** decisiones con la plata y el riesgo a la vista.
- **Diferencial:** predicción conforme con cobertura medida, datos reales de Estimaciones Agrícolas, batch con conciliación.
- **Herramientas:** ★ rinde por departamento; ★ margen P10–P90 en USD y ARS; ★ asistente por WhatsApp; extras: riesgo climático (Open-Meteo†), simulador de fecha de siembra.
- **Capa física:** ★ cobertura del cultivo con una foto; ★ estación meteorológica y humedad de suelo (Wokwi y real); GPS del lote; AR.
- **Ahorro a medir:** diferencia de margen con la fecha recomendada; horas de cálculo.
- **Notificaciones:** ★ WhatsApp con audio; email de campaña; línea telefónica.
- **Voz:** "AgrIA, ¿qué pasa si siembro 15 días después?".
- **Escala:** recálculo idempotente de todos los departamentos y campañas.
- **Operación:** backfills y reprocesos seguros.
- **Stack:**
  - Frontend: Three.js, backoffice en Rails, Expo.
  - Backend: Rails como monolito modular; GraphQL opcional.
  - IA por API: asistente con herramientas sobre Claude.
  - ML propio: scikit-learn, gradient boosting, predicción conforme, MLflow, Dagster.
  - DB: Postgres y BigQuery.
  - Infra: batch con cola, k3s, Helm, MQTT.
  - Cloud: GCP (BigQuery, Vertex AI).
- **Algorithm spots:** programación dinámica, presupuesto de fertilizante (con IA).
- **Hardware:** fase 1.
- **Versiones:**
  - **1.0 MVP (21 mar – 1 abr):** ingesta, modelo de rinde con predicción conforme, mapa por departamento, deploy.
  - **1.1 Producto (2–12 abr):** margen P10–P90, simulador, riesgo climático, backoffice, MLflow y Dagster, frontend.
  - **2.0 Plataforma (13–22 abr):** WhatsApp con audio, email, línea telefónica, foto de cobertura, GPS, AR.
  - **3.0 Producción (23 abr – 2 may):** recálculo masivo, backfills, estación y humedad de suelo reales, Scale report.
- **Entrevistas:** alto.

## P4 · Antena
- **Horas:** antes 147 h; ahora ≈ 215 h.
- **Fechas:** 3 may – 23 jun 2027.
- **Puesto:** Systems / Ground Software Engineer.
- **Qué hace:** sigue satélites reales (incluidos los argentinos), decodifica telemetría, planifica pasadas, calcula enlaces.
- **Problema concreto:** operar una estación terrena exige atención manual en cada pasada.
- **Valor:** sistemas en tiempo real con datos reales.
- **Diferencial:** decodificador en Rust compilado a WebAssembly con benchmark; estación real en SatNOGS; p99 medido.
- **Herramientas:** ★ "Seguí a los satélites argentinos"; ★ decodificador en el navegador; ★ calculadora de enlace; extras: copiloto, observaciones en SatNOGS.
- **Capa física:** ★ "Apuntá al cielo" (AR con la cámara, ViroReact); ★ estación real con SDR, Raspberry Pi y rotor con ESP32; señal IQ sintética.
- **Ahorro a medir:** horas de operación manual automatizadas.
- **Notificaciones:** ★ WhatsApp "avisame cuando pase SAOCOM con cielo despejado".
- **Voz:** ★ "Antena, apuntá al próximo satélite", y el rotor se mueve.
- **Escala:** 10 mil websockets, miles de mensajes por segundo.
- **Operación:** backpressure y limitación de carga.
- **Stack:**
  - Frontend: Three.js, Expo con ViroReact.
  - Backend: Rust (SGP4, CCSDS), websockets.
  - IA por API: copiloto con la telemetría como evidencia.
  - ML propio: no aplica.
  - DB: series de tiempo (a definir).
  - Infra: MQTT con mTLS, OTA.
  - Cloud: AWS IoT, comparado con AWS Ground Station.
- **Algorithm spots:** backtracking vs programación dinámica, planificación de pasadas (con IA).
- **Hardware:** fase 2.
- **Versiones:**
  - **1.0 MVP (3–15 may):** SGP4, satélites argentinos, planificador de pasadas.
  - **1.1 Producto (16–28 may):** decodificador CCSDS en WebAssembly con benchmark, calculadora de enlace, copiloto, frontend.
  - **2.0 Plataforma (29 may – 10 jun):** AR, alertas por WhatsApp, voz, rotor en Wokwi.
  - **3.0 Producción (11–23 jun):** estación real en SatNOGS, rotor real, 10 mil websockets, backpressure, Scale report.
- **Entrevistas:** alto.

## 🎓 Certificación 2 · AWS Solutions Architect Associate
- **Fechas:** 24 jun – 5 jul 2027.

## P0 2.0 y 2.1 · Constelación con IA
- **Fechas:** 6–23 jul 2027 (detalle en P0).

## P5 · PetrIA Guard
- **Horas:** antes 98 h; ahora ≈ 170 h.
- **Fechas:** 24 jul – 2 sep 2027.
- **Puesto:** DevSecOps / OT Security Engineer.
- **Qué hace:** gemelo digital de una batería de tanques en tiempo real; detecta ataques al SCADA por física y pérdidas en ductos; escala alarmas por todos los canales.
- **Problema concreto:** rebalses, rondas manuales, pérdidas sin detectar, alarmas sin atender.
- **Valor:** operación y seguridad industrial juntas.
- **Diferencial:** balance de masa, tanque real con agua, reglas de MITRE ATT&CK for ICS probadas con su ataque.
- **Herramientas:** ★ gemelo de tanques (niveles, tiempo del x% al y%, rebalse, despacho); ★ detector de ataques; ★ balance de masa; extras: copiloto, yacimiento 3D.
- **Capa física:** ★ tanque en la pared (AR); ★ tanque real con sensor, bomba, relé, ESP32 y Modbus por RS485; ronda con NFC.
- **Ahorro a medir:** rebalses evitados, horas de ronda, m³ perdidos × precio del crudo.
- **Notificaciones:** ★ WhatsApp con botones; ★ llamada con escalamiento; email de registro.
- **Voz:** "¿Cuánto falta para que el tanque 3 llegue al 90%?".
- **Escala:** 10 mil lecturas por segundo, tormenta de alarmas.
- **Operación:** deduplicación de alertas, reducción de series de tiempo.
- **Stack:**
  - Frontend: Next.js, Three.js, Expo con AR y NFC.
  - Backend: Go, Modbus, OPC UA.
  - IA por API: copiloto con aprobación humana.
  - ML propio: anomalías por balance de masa.
  - DB: DuckDB, Parquet, series de tiempo.
  - Infra: Kubernetes endurecido, GitOps, firmas, mTLS, Falco, SBOM, OPA.
  - Cloud: AWS IoT Core, IoT SiteWise, Kinesis, GuardDuty.
- **Algorithm spots:** Dijkstra para el despacho (con IA); heap para la prioridad de alarmas (sin IA).
- **Hardware:** kit del tanque (fase 2).
- **Versiones:**
  - **1.0 MVP (24 jul – 2 ago):** gemelo con SCADA simulado por Modbus, niveles en vivo, tiempo del x% al y%.
  - **1.1 Producto (3–12 ago):** detector de ataques, pérdidas en ductos, reglas ATT&CK, despacho, frontend.
  - **2.0 Plataforma (13–23 ago):** WhatsApp con botones, llamada, email, copiloto, AR, NFC.
  - **3.0 Producción (24 ago – 2 sep):** tanque real por RS485, 10 mil lecturas por segundo, tormenta de alarmas, Kubernetes endurecido, Scale report.
- **Por qué hace ruido:** "Ataqué un tanque de crudo y lo detecté con física".
- **Entrevistas:** muy alto.

## 🎓 Certificación 3 · Security+
- **Fechas:** 3–20 sep 2027, con la versión nueva del examen.

## W2 · Matemática
- **Horas:** 147 h. **Fechas:** 21 sep – 14 oct 2027.
- **Contenido:** cálculo multivariable, gradientes, optimización.

## P6 · AeroScan
- **Horas:** antes 147 h; ahora ≈ 205 h.
- **Fechas:** 15 oct – 2 dic 2027.
- **Puesto:** ML Engineer (computer vision).
- **Qué hace:** inspecciona superficies de aviones, genera la orden de trabajo, consulta manuales, registra daños en 3D por matrícula.
- **Problema concreto:** inspecciones en papel, manos ocupadas, horas buscando en manuales.
- **Valor:** digitaliza el mantenimiento.
- **Diferencial:** cascada de modelos, aprendizaje activo, caída de sintético a real medida, autograd a mano.
- **Herramientas:** ★ de la inspección a la orden de trabajo; ★ manuales públicos de la FAA; ★ libro de daños en 3D.
- **Capa física:** ★ dron simulado en 3D; ★ daños en AR con el celular; LiDAR si el celular lo tiene.
- **Ahorro a medir:** minutos por inspección, búsqueda en manuales, errores de transcripción.
- **Notificaciones:** ★ email con la orden en PDF; WhatsApp al jefe.
- **Voz:** ★ el inspector dicta mientras revisa.
- **Escala:** cola de imágenes con autoescalado en GPU; costo por imagen.
- **Operación:** batching dinámico, escalado a cero.
- **Stack:**
  - Frontend: Three.js, Tauri, Expo con AR.
  - Backend: Python, inferencia con batching y SLO.
  - IA por API: Claude con visión para casos dudosos; RAG de manuales.
  - ML propio: PyTorch, Blender, aprendizaje activo.
  - DB: Postgres, dataset versionado†.
  - Cloud: AWS SageMaker, SES.
- **Versiones:**
  - **1.0 MVP (15–26 oct):** datos sintéticos, modelo PyTorch, inspección por foto, caída sintético→real.
  - **1.1 Producto (27 oct – 7 nov):** orden de trabajo, RAG de manuales, cascada con Claude visión, aprendizaje activo, autograd, frontend.
  - **2.0 Plataforma (8–20 nov):** daños en 3D, AR, dron simulado, dictado, email con PDF, WhatsApp.
  - **3.0 Producción (21 nov – 2 dic):** GPU con autoescalado, batching, escalado a cero, costo por imagen, Scale report.
- **Entrevistas:** alto.

## P7 · AgrIA Sat
- **Horas:** antes 98 h; ahora ≈ 150 h.
- **Fechas:** 3 dic 2027 – 14 ene 2028 (pausa del 20 al 26 dic).
- **Puesto:** ML / MLOps Engineer.
- **Qué hace:** monitorea lotes con Sentinel-2, alerta estrés, genera dosis variable, estima pérdidas en USD.
- **Problema concreto:** fertilizante parejo en lotes que no son parejos.
- **Valor:** plata ahorrada en fertilizante.
- **Diferencial:** puertas de calidad en el CI, canary con rollback, drift inyectado vs detectado, reentrenamiento con aprobación.
- **Herramientas:** ★ mapa de estrés; ★ dosis variable (shapefile o ISOXML); ★ pérdida en USD.
- **Capa física:** ★ fertilizadora con ESP32 guiada por GPS; ★ recorrida a campo offline; AR de zonas.
- **Ahorro a medir:** ★ kg de fertilizante ahorrados × precio.
- **Notificaciones:** ★ WhatsApp con la imagen del lote; ★ email con la prescripción; llamada ante alerta severa.
- **Escala:** despliegue en sombra con tráfico duplicado.
- **Operación:** rollback automático de modelos.
- **Stack:**
  - Frontend: Next.js, Expo.
  - Backend: Python con serving en Kubernetes.
  - IA por API: resúmenes para el productor.
  - ML propio: drift, PCA, SVD, reentrenamiento.
  - DB: PostGIS, STAC.
  - Cloud: GCP (Vertex AI, Earth Engine†).
- **Versiones:**
  - **1.0 MVP (3–11 dic):** Sentinel-2, índices, mapa de estrés.
  - **1.1 Producto (12–19 dic):** dosis variable, pérdida en USD, PCA y SVD, frontend.
  - **2.0 Plataforma (27 dic – 5 ene):** WhatsApp con imagen, email con prescripción, llamada, recorrida offline, fertilizadora en Wokwi.
  - **3.0 Producción (6–14 ene):** puertas de calidad, sombra y canary, rollback, drift, reentrenamiento con aprobación.
- **Entrevistas:** muy alto.

## 🎓 Certificación 4 · AWS ML Engineer Associate
- **Fechas:** 15–26 ene 2028.

## W3 · Matemática
- **Horas:** 122 h. **Fechas:** 27 ene – 15 feb 2028.
- **Contenido:** álgebra lineal de bajo rango (LoRA), probabilidad, teoría de la información.

## P8 · AdversarIA
- **Horas:** antes 74 h; ahora ≈ 130 h.
- **Fechas:** 16 feb – 17 mar 2028.
- **Puesto:** AI Security Engineer.
- **Qué hace:** escanea agentes de chat y voz propios o autorizados, los ataca y compara defensas.
- **Problema concreto:** agentes lanzados sin probar su seguridad.
- **Valor:** seguridad para IA.
- **Diferencial:** OWASP LLM Top 10, GitHub Action open source, defensa propia con LoRA, comparativa entre nubes.
- **Herramientas:** ★ "Escaneá tu chatbot" (nota A–F, verificación de propiedad); ★ GitHub Action; ★ comparativa de guardrails (AWS, Azure, propio).
- **Capa física:** ★ prompt injection con un cartel frente a la cámara; inyección por audio.
- **Ahorro a medir:** horas de pentest manual; costo de incidente evitado (hipótesis).
- **Notificaciones:** ★ email con el informe; WhatsApp con la nota.
- **Voz:** ★ ataques por voz contra tus agentes telefónicos, y la defensa.
- **Escala:** muchos escaneos a la vez sin que un cliente tape a otro.
- **Operación:** colas justas, protección contra abuso.
- **Stack:**
  - Frontend: Next.js.
  - Backend: Python, garak, PyRIT.
  - IA por API: Claude, Bedrock Guardrails, Azure AI Content Safety.
  - ML propio: guardián con LoRA sobre vLLM.
  - Cloud: AWS y Azure.
- **Versiones:**
  - **1.0 MVP (16–23 feb):** ataques contra PetrIA y VitalIA, informe OWASP LLM Top 10.
  - **1.1 Producto (24 feb – 2 mar):** "Escaneá tu chatbot", GitHub Action, comparativa.
  - **2.0 Plataforma (3–10 mar):** voz, cartel y audio, email, WhatsApp.
  - **3.0 Producción (11–17 mar):** guardián con LoRA y adaptadores por cliente, colas justas, abuso, Scale report.
- **Entrevistas:** muy alto.

## P9 · AeroScan Edge
- **Horas:** antes 122 h; ahora ≈ 165 h.
- **Fechas:** 18 mar – 26 abr 2028.
- **Puesto:** Edge AI Engineer.
- **Qué hace:** inspección offline en el hangar, walkaround guiado por voz, sincronización.
- **Problema concreto:** sin señal ni manos libres en el hangar.
- **Valor:** inspección donde la nube no llega.
- **Diferencial:** medición en teléfono real, modelos firmados por OTA.
- **Herramientas:** ★ app offline; ★ walkaround guiado; sincronización.
- **Capa física:** ★ walkaround en AR; ★ ESP32-CAM real vs celular.
- **Ahorro a medir:** minutos por walkaround.
- **Notificaciones:** WhatsApp con resumen, en cola hasta que vuelve la señal.
- **Voz:** ★ comandos offline.
- **Escala:** 1.000 dispositivos sincronizando con conflictos.
- **Operación:** resolución de conflictos, reintentos escalonados.
- **Stack:**
  - Frontend: Expo con ONNX Runtime Mobile.
  - Backend: servicio de sincronización†.
  - ML propio: cuantización, modelo de lenguaje chico en el dispositivo.
  - DB: SQLite.
  - Cloud: AWS IoT Greengrass.
- **Hardware:** ESP32-CAM (fase 3).
- **Versiones:**
  - **1.0 MVP (18–27 mar):** modelo cuantizado con ONNX, app offline.
  - **1.1 Producto (28 mar – 6 abr):** walkaround guiado, modelo chico, presupuesto de latencia, frontend.
  - **2.0 Plataforma (7–16 abr):** AR, voz offline, sincronización con AeroScan.
  - **3.0 Producción (17–26 abr):** OTA firmada, 1.000 dispositivos, ESP32-CAM vs celular, batería y latencia medidas.
- **Entrevistas:** alto.

## 🎓 Certificación 5 · AWS Generative AI Developer – Professional
- **Fechas:** 27 abr – 14 may 2028.

## P10 · Antena Ops
- **Horas:** antes 172 h; ahora ≈ 205 h.
- **Fechas:** 15 may – 2 jul 2028.
- **Puesto:** Senior ML + DevSecOps + Cloud.
- **Qué hace:** centro de control de todos tus productos: anomalías en telemetría de la NASA, agente SRE, status page, costos en vivo, Jarvis central.
- **Problema concreto:** caídas detectadas tarde, costos de nube sin control.
- **Valor:** confiabilidad y costos en un solo lugar.
- **Diferencial:** SLO públicos, chaos engineering, flota de 1.000 dispositivos, Face ID.
- **Herramientas:** ★ centro de control; ★ status page; ★ FinOps.
- **Capa física:** ★ flota simulada; ★ aprobación con Face ID; mapa 3D.
- **Ahorro a medir:** ★ ahorro en la factura de nube; tiempo de recuperación × costo de caída (hipótesis).
- **Notificaciones:** ★ Slack y WhatsApp en el incidente; ★ llamada si se rompe un SLO; email con el postmortem.
- **Voz:** ★ Jarvis central con Face ID.
- **Escala:** caos en todos los productos, caída de una nube.
- **Operación:** failover entre nubes, plan de capacidad, FinOps.
- **Stack:**
  - Frontend: microfrontends sobre Constelación.
  - Backend: Java y Go.
  - IA por API: agente SRE con runbooks.
  - ML propio: autoencoders.
  - Infra: Kafka, saga y outbox, mTLS, OpenTelemetry, Pact, chaos.
  - Cloud: AWS (EKS, MSK) y Azure.
- **Algorithm spots:** BFS, DFS y orden topológico (sin IA).
- **Versiones:**
  - **1.0 MVP (15–26 may):** autoencoders sobre telemetría de la NASA, triage explicado.
  - **1.1 Producto (27 may – 7 jun):** centro de control, status page, Kafka, saga, outbox.
  - **2.0 Plataforma (8–20 jun):** agente SRE, Jarvis con Face ID, Slack, WhatsApp, llamada por SLO, postmortem por email.
  - **3.0 Producción (21 jun – 2 jul):** chaos, caída de una nube con failover, flota de 1.000 dispositivos, FinOps, plan de capacidad.
- **Entrevistas:** muy alto.

## Consolidación
- **Fechas:** 3–14 jul 2028.

---

# ETAPA 2 · CIBERSEGURIDAD (15 jul – 30 dic 2028)

## W4 · Matemática
- **Horas:** ≈ 49 h. **Fechas:** 15–22 jul 2028.
- **Contenido:** aritmética modular, teoría de números.

## S1 · Bóveda
- **Horas:** antes 98 h; ahora ≈ 130 h.
- **Fechas:** 23 jul – 22 ago 2028.
- **Puesto:** Security Engineer (identidad y secretos).
- **Qué hace:** secretos, cifrado de sobre, rotación, credenciales efímeras para agentes de IA.
- **Problema concreto:** rotar credenciales a mano es lento y riesgoso.
- **Valor:** menos secretos filtrados, rotación sin cortes.
- **Diferencial:** primitivas propias vs librería auditada, aplicadas a tus productos.
- **Herramientas:** ★ credenciales efímeras por agente y herramienta; ★ GitHub App "¿Filtraste tu API key?"; comparativa AWS vs Azure.
- **Capa física:** ★ el celular como llave (passkeys); llave física; SoftHSM.
- **Notificaciones:** WhatsApp para aprobar rotaciones; email con el informe mensual.
- **Escala:** rotar miles de secretos sin cortar el servicio.
- **Stack:**
  - Frontend: Tauri.
  - Backend: Rust, Go.
  - DB: Postgres†.
  - Infra: Vault, SPIFFE, mTLS, cosign†.
  - Cloud: AWS KMS y Secrets Manager, Azure Key Vault.
- **Hardware:** llave física (fase 4).
- **Versiones:**
  - **1.0 MVP (23–30 jul):** Vault, cifrado de sobre.
  - **1.1 Producto (31 jul – 7 ago):** rotación automática, credenciales efímeras.
  - **2.0 Plataforma (8–15 ago):** GitHub App, aprobación por WhatsApp, celular como llave, llave física, SoftHSM.
  - **3.0 Producción (16–22 ago):** rotación masiva sin cortes, SPIFFE, mTLS, comparativa.
- **Entrevistas:** muy alto.

## 🎓 Certificación 6 · Azure AI-103
- **Fechas:** 23 ago – 3 sep 2028 (reemplazo de AI-102).

## S2 · Asedio
- **Horas:** antes 122 h; ahora ≈ 165 h.
- **Fechas:** 4 sep – 13 oct 2028.
- **Puesto:** AppSec / Offensive Security Engineer.
- **Qué hace:** modelo de amenazas y pentest de tus productos (IA e IoT incluidos), con un bot que corrige.
- **Problema concreto:** los hallazgos quedan en un PDF y nadie los arregla.
- **Valor:** cada hallazgo termina en un PR y una prueba.
- **Diferencial:** hallazgos reprobados en el CI; CVE propio con divulgación responsable.
- **Herramientas:** ★ bot que abre el PR con la corrección; ★ caza de CVE; agente asistente de pentest.
- **Capa física:** ★ pentest al ESP32 vulnerable.
- **Notificaciones:** ★ email con informe semanal (CVSS); Slack para críticos.
- **Escala:** escaneo de muchos repos sin frenar el CI.
- **Stack:**
  - Backend: Python.
  - Herramientas: Burp, ZAP†, fuzzing, Semgrep, SAST, DAST, SCA.
  - Cloud: AWS Inspector, Security Hub.
- **Versiones:**
  - **1.0 MVP (4–13 sep):** STRIDE y pentest de PetrIA, informe CVSS.
  - **1.1 Producto (14–23 sep):** pentest de IA y del ESP32, reprueba en el CI.
  - **2.0 Plataforma (24 sep – 3 oct):** bot de PR, agente asistente, email semanal, Slack.
  - **3.0 Producción (4–13 oct):** muchos repos sin frenar el CI, caza de CVE.
- **Entrevistas:** muy alto.

## S3 · Vigía
- **Horas:** antes 147 h; ahora ≈ 195 h.
- **Fechas:** 14 oct – 29 nov 2028.
- **Puesto:** Detection & Response / Cloud Security Engineer.
- **Qué hace:** SOC en una caja para pymes, con agente investigador y llamada al dueño.
- **Problema concreto:** una pyme no puede pagar un SOC tercerizado.
- **Valor:** detección y respuesta al alcance de una pyme.
- **Diferencial:** agente evaluado contra incidentes etiquetados; tiempos de detección y respuesta medidos.
- **Herramientas:** ★ SOC con un comando; ★ agente investigador; purple team.
- **Capa física:** ★ lector RFID real cruzado con inicios de sesión.
- **Ahorro a medir:** ★ costo de un SOC tercerizado vs tu caja.
- **Notificaciones:** ★ llamada al dueño que responde por voz; WhatsApp con botones; email con constancia.
- **Escala:** millones de eventos por día con costo de retención controlado.
- **Stack:**
  - Frontend: Expo.
  - Backend: Python, Sigma, ATT&CK.
  - DB: OpenSearch.
  - Infra: osquery.
  - Cloud: comparativa con Sentinel y Security Lake.
- **Hardware:** RFID (fase 4).
- **Versiones:**
  - **1.0 MVP (14–25 oct):** OpenSearch, osquery, reglas Sigma sobre el colector de PetrIA Guard.
  - **1.1 Producto (26 oct – 6 nov):** agente investigador evaluado, purple team, tiempos medidos.
  - **2.0 Plataforma (7–18 nov):** SOC con un comando, llamada, WhatsApp, email, RFID en Wokwi.
  - **3.0 Producción (19–29 nov):** millones de eventos, costo de retención, RFID real, comparativa.
- **Entrevistas:** muy alto.

## 🎓 Certificación 7 · PNPT
- **Fechas:** 30 nov – 17 dic 2028.
- **Pausa:** 18–24 dic 2028.
- **Cierre de etapa:** 25–30 dic 2028.

---

# ETAPA 3 · QUANT (31 dic 2028 – 19 ene 2030)
Herramientas educativas y de análisis; no son recomendaciones de inversión.

## WQ1 · Matemática
- **Horas:** ≈ 74 h. **Fechas:** 31 dic 2028 – 11 ene 2029.
- **Contenido:** procesos estocásticos, series de tiempo.

## Q1 · Alpha Lab
- **Horas:** antes 147 h; ahora ≈ 195 h.
- **Fechas:** 12 ene – 27 feb 2029.
- **Puesto:** Quant Developer.
- **Qué hace:** backtester de eventos con costos, deslizamiento y walk-forward.
- **Problema concreto:** la mayoría de las estrategias "ganadoras" son sobreajuste.
- **Valor:** separa la suerte de la señal.
- **Diferencial:** Sharpe deflactado, registro con hash, benchmark Rust vs Python.
- **Herramientas:** ★ "¿Tu estrategia es suerte?"; ★ asistente con freno al sobreajuste.
- **Notificaciones:** email con el informe.
- **Voz:** consultas sobre resultados.
- **Escala:** miles de backtests en paralelo.
- **Stack:**
  - Frontend: Tauri.
  - Backend: Rust con PyO3.
  - IA por API: Claude.
  - DB: Parquet, DuckDB†.
  - Cloud: AWS.
- **Versiones:**
  - **1.0 MVP (12–23 ene):** backtester en Rust con costos y deslizamiento.
  - **1.1 Producto (24 ene – 4 feb):** walk-forward, registro con hash, Sharpe deflactado, benchmark.
  - **2.0 Plataforma (5–16 feb):** "¿Tu estrategia es suerte?", asistente.
  - **3.0 Producción (17–27 feb):** backtests en paralelo, informes por email.
- **Entrevistas:** alto.

## Q2 · Paper Trail
- **Horas:** antes 122 h; ahora ≈ 165 h.
- **Fechas:** 28 feb – 8 abr 2029.
- **Puesto:** Junior Quant Researcher.
- **Qué hace:** agente que lee papers de finanzas y replica sus estrategias con Alpha Lab.
- **Problema concreto:** muchos papers no se replican.
- **Valor:** saber si un paper funciona antes de invertir tiempo.
- **Diferencial:** porcentaje de replicación medido y publicado.
- **Herramientas:** ★ página "¿Funciona este paper?".
- **Notificaciones:** newsletter por email; WhatsApp.
- **Escala:** lotes de papers en paralelo.
- **Stack:**
  - Backend: Python, Quarto.
  - IA por API: RAG sobre PDF con Claude.
  - Base: Alpha Lab.
- **Versiones:**
  - **1.0 MVP (28 feb – 9 mar):** un paper replicado.
  - **1.1 Producto (10–19 mar):** agente que extrae la estrategia, 3 papers replicados.
  - **2.0 Plataforma (20–29 mar):** página pública, newsletter, WhatsApp.
  - **3.0 Producción (30 mar – 8 abr):** lotes en paralelo, porcentaje replicado.
- **Entrevistas:** alto.

## 🎓 Certificación 8 · CKA
- **Fechas:** 9–24 abr 2029.
- **Descanso:** 25 abr – 1 may.

## WQ2 · Matemática
- **Horas:** ≈ 98 h. **Fechas:** 2–17 may 2029.
- **Contenido:** cálculo estocástico, Black-Scholes.

## Q3 · Volta
- **Horas:** antes 147 h; ahora ≈ 200 h.
- **Fechas:** 18 may – 4 jul 2029.
- **Puesto:** Quant Developer (valuación y riesgo).
- **Qué hace:** valuación de opciones con griegas y estrés, validada contra QuantLib.
- **Problema concreto:** no hay herramientas simples para opciones argentinas (GGAL).
- **Valor:** riesgo visible por posición y por cartera.
- **Diferencial:** validación contra QuantLib, API con SLO.
- **Herramientas:** ★ calculadora de opciones argentinas con griegas; estrés por cartera.
- **Capa física:** ★ superficie de volatilidad en AR.
- **Notificaciones:** email matinal.
- **Voz:** podcast de riesgo.
- **Escala:** API con SLO y benchmark.
- **Stack:**
  - Frontend: Next.js, Three.js.
  - Backend: C++ o Rust con Python.
- **Versiones:**
  - **1.0 MVP (18–29 may):** Black-Scholes, binomial y Monte Carlo contra QuantLib.
  - **1.1 Producto (30 may – 10 jun):** griegas, estrés, calculadora argentina.
  - **2.0 Plataforma (11–22 jun):** superficie en AR, email matinal, podcast.
  - **3.0 Producción (23 jun – 4 jul):** API con SLO, benchmark.
- **Entrevistas:** alto.

## Q4 · Matchbook
- **Horas:** antes 122 h; ahora ≈ 160 h.
- **Fechas:** 5 jul – 12 ago 2029.
- **Puesto:** Trading Systems Engineer.
- **Qué hace:** motor de matching con libro de órdenes, market maker simulado y FIX.
- **Problema concreto:** entender la microestructura sin acceso a un exchange.
- **Valor:** latencia y corrección probadas.
- **Diferencial:** p99 en microsegundos, replay determinístico, fuzzing.
- **Herramientas:** ★ simulador educativo del libro, en formato juego.
- **Escala:** p99 en microsegundos bajo carga.
- **Stack:**
  - Backend: C++ o Rust, FIX.
  - Frontend: web del simulador.
- **Algorithm spots:** heap (sin IA).
- **Versiones:**
  - **1.0 MVP (5–14 jul):** matching por precio y tiempo.
  - **1.1 Producto (15–24 jul):** market maker, FIX, costos de transacción.
  - **2.0 Plataforma (25 jul – 2 ago):** simulador en formato juego.
  - **3.0 Producción (3–12 ago):** p99 bajo carga, replay, fuzzing.
- **Entrevistas:** alto.

## 🎓 Certificación 9 · CKS
- **Fechas:** 13–26 ago 2029.

## WQ3 · Matemática
- **Horas:** ≈ 49 h. **Fechas:** 27 ago – 3 sep 2029.
- **Contenido:** optimización de carteras.

## Q5 · Comando
- **Horas:** antes 172 h; ahora ≈ 230 h.
- **Fechas:** 4 sep – 29 oct 2029.
- **Puesto:** Quant Trading Engineer.
- **Qué hace:** de señales a órdenes en paper trading con Alpaca, con riesgo previo, kill-switch y conciliación.
- **Problema concreto:** órdenes duplicadas o perdidas cuando algo falla.
- **Valor:** un sistema de órdenes confiable.
- **Diferencial:** cada orden una sola vez, conciliación ante fallas, meses en vivo.
- **Herramientas:** ★ tablero público; riesgo previo a cada orden.
- **Capa física:** ★ Face ID para el kill-switch.
- **Notificaciones:** ★ WhatsApp con órdenes y kill-switch; email diario.
- **Escala:** cada orden una sola vez, conciliación ante fallas.
- **Stack:**
  - Frontend: Expo.
  - Backend: .NET y Rust.
  - DB: Postgres append-only.
  - Infra: Kafka.
- **Versiones:**
  - **1.0 MVP (4–17 sep):** señales a órdenes en paper trading.
  - **1.1 Producto (18 sep – 1 oct):** riesgo previo, kill-switch, conciliación.
  - **2.0 Plataforma (2–15 oct):** WhatsApp, Face ID, email diario, tablero público.
  - **3.0 Producción (16–29 oct):** una sola ejecución por orden, conciliación ante fallas, Kafka, meses en vivo.
- **Entrevistas:** muy alto (fintech).

## Q6 · Ticker
- **Horas:** antes 122 h; ahora ≈ 185 h.
- **Fechas:** 30 oct – 13 dic 2029.
- **Puesto:** AI Quant / Data Engineer.
- **Qué hace:** ingesta de datos de mercado en tiempo real con control de calidad.
- **Problema concreto:** datos de mercado sucios o con huecos.
- **Valor:** datos confiables para todo el stack quant.
- **Diferencial:** SLA de calidad, replay de un día, MCP.
- **Herramientas:** ★ dólar MEP y CCL en vivo; ★ MCP.
- **Capa física:** display LED (Wokwi y real).
- **Notificaciones:** ★ WhatsApp "avisame si el MEP pasa X".
- **Voz:** consultas de cotizaciones.
- **Escala:** ingesta masiva de ticks y replay.
- **Stack:**
  - Backend: Python.
  - DB: ClickHouse.
  - IA por API: MCP.
- **Hardware:** display LED (fase 5).
- **Versiones:**
  - **1.0 MVP (30 oct – 10 nov):** ingesta en ClickHouse con calidad.
  - **1.1 Producto (11–21 nov):** MEP y CCL en vivo, MCP.
  - **2.0 Plataforma (22 nov – 2 dic):** WhatsApp, voz, LED en Wokwi.
  - **3.0 Producción (3–13 dic):** ticks masivos, replay, SLA, LED real.
- **Entrevistas:** muy alto.

## 🎓 Certificación 10 · AWS Security Specialty
- **Fechas:** 14 dic 2029 – 7 ene 2030 (pausa del 24 al 30 dic).
- **Cierre de etapa:** 8–19 ene 2030.

---

# ETAPA 4 · AEROESPACIAL (20 ene 2030 – 27 may 2031)

## WA1 · Matemática
- **Horas:** ≈ 98 h. **Fechas:** 20 ene – 4 feb 2030.
- **Contenido:** ecuaciones diferenciales, cuerpo rígido.

## A1 · Trayecta
- **Horas:** antes 172 h; ahora ≈ 245 h.
- **Fechas:** 5 feb – 4 abr 2030.
- **Puesto:** Flight Dynamics Engineer.
- **Qué hace:** simulador de vuelo 6-DOF para cohetes amateur.
- **Problema concreto:** los grupos amateur vuelan sin estimar la incertidumbre.
- **Valor:** vuelos más seguros y predecibles.
- **Diferencial:** validación analítica y contra OpenRocket, un millón de corridas, hardware-in-the-loop.
- **Herramientas:** ★ simulador web; cono de incertidumbre con Monte Carlo.
- **Capa física:** ★ computadora de vuelo real en HIL; trayectoria en VR.
- **Voz:** eventos del vuelo narrados.
- **Escala:** un millón de corridas en AWS Batch.
- **Stack:**
  - Frontend: WebAssembly, WebXR.
  - Backend: Rust o C++, Julia.
  - ML propio: modelo sustituto.
  - Cloud: AWS Batch.
- **Hardware:** IMU y barómetro (fase 5).
- **Versiones:**
  - **1.0 MVP (5–19 feb):** 6-DOF validado.
  - **1.1 Producto (20 feb – 6 mar):** simulador web contra OpenRocket.
  - **2.0 Plataforma (7–20 mar):** Monte Carlo, VR, voz, computadora de vuelo en Wokwi.
  - **3.0 Producción (21 mar – 4 abr):** un millón de corridas, modelo sustituto, HIL real.
- **Entrevistas:** alto.

## WA2 · Matemática
- **Horas:** ≈ 74 h. **Fechas:** 5–16 abr 2030.
- **Contenido:** EDP, elementos finitos.

## A2 · Malla
- **Horas:** antes 172 h; ahora ≈ 235 h.
- **Fechas:** 17 abr – 12 jun 2030.
- **Puesto:** CAE Software Engineer.
- **Qué hace:** solver de elementos finitos verificado contra CalculiX.
- **Problema concreto:** el software estructural es caro y opaco para estudiantes.
- **Valor:** cálculo estructural gratis en el navegador.
- **Diferencial:** convergencia de malla demostrada, experimento real que coincide.
- **Herramientas:** ★ calculadora para estudiantes; reporte de margen.
- **Capa física:** ★ regla real medida con la cámara.
- **Escala:** cálculo pesado en el navegador con WebAssembly.
- **Stack:**
  - Backend: Rust o C++, Gmsh.
  - Frontend: Tauri, WebAssembly.
- **Versiones:**
  - **1.0 MVP (17 abr – 1 may):** solver 1D contra CalculiX.
  - **1.1 Producto (2–15 may):** 2D, convergencia, margen.
  - **2.0 Plataforma (16–29 may):** calculadora en el navegador.
  - **3.0 Producción (30 may – 12 jun):** experimento real, usuarios en universidades.
- **Entrevistas:** alto.

## 🎓 Certificación 11 · GitHub Actions + GitHub Copilot
- **Fechas:** 13–24 jun 2030.
- **Descanso:** 25 jun – 1 jul.

## WA3 · Matemática
- **Horas:** ≈ 98 h. **Fechas:** 2–17 jul 2030.
- **Contenido:** mecánica de fluidos.

## A3 · Viento
- **Horas:** antes 147 h; ahora ≈ 195 h.
- **Fechas:** 18 jul – 2 sep 2030.
- **Puesto:** CFD Software Engineer.
- **Qué hace:** aerodinámica con paneles, vortex lattice y Euler 2D, comparada contra OpenFOAM o SU2.
- **Problema concreto:** diseñar un perfil de dron exige herramientas complejas.
- **Valor:** perfiles optimizados sin supercomputador.
- **Diferencial:** comparación contra OpenFOAM, modelo sustituto con optimización bayesiana.
- **Herramientas:** ★ optimizador de perfiles para drones.
- **Capa física:** ★ flujo de aire en AR.
- **Escala:** corridas en lote.
- **Stack:**
  - Backend: Rust o C++, Python.
  - ML propio: modelo sustituto, optimización bayesiana.
- **Versiones:**
  - **1.0 MVP (18–29 jul):** método de paneles.
  - **1.1 Producto (30 jul – 10 ago):** vortex lattice, Euler 2D, comparación.
  - **2.0 Plataforma (11–22 ago):** optimizador, AR.
  - **3.0 Producción (23 ago – 2 sep):** lote, modelo sustituto.
- **Entrevistas:** alto.

## WA4 · Matemática
- **Horas:** ≈ 74 h. **Fechas:** 3–14 sep 2030.
- **Contenido:** control y estimación.

## A4 · Piloto
- **Horas:** antes 172 h; ahora ≈ 250 h.
- **Fechas:** 15 sep – 13 nov 2030.
- **Puesto:** GNC Software Engineer.
- **Qué hace:** control de vuelo con PID, LQR y Kalman, y banco de fallas.
- **Problema concreto:** ajustar el PID de un dron es prueba y error.
- **Valor:** ajuste automático y modos seguros.
- **Diferencial:** RL con escudo de seguridad contra LQR; dron real.
- **Herramientas:** ★ ajuste automático de PID desde los logs.
- **Capa física:**
  - ★ Estación de tierra por voz.
  - El celular como sensor, con Kalman en vivo.
  - Dron real con Pixhawk 6C Mini (≈ USD 177), dentro de la normativa ANAC.
- **Escala:** lazos con tiempos deterministas.
- **Stack:**
  - Frontend: Expo.
  - Backend: ROS 2, PX4, C++, Python.
- **Hardware:** Pixhawk con frame (fase 5).
- **Versiones:**
  - **1.0 MVP (15–29 sep):** PID, LQR y Kalman en PX4 SITL.
  - **1.1 Producto (30 sep – 14 oct):** banco de fallas, modos seguros, ajuste automático.
  - **2.0 Plataforma (15–29 oct):** estación de tierra por voz, celular como sensor.
  - **3.0 Producción (30 oct – 13 nov):** dron real, RL con escudo vs LQR.
- **Entrevistas:** alto.

## 🎓 Certificación 12 · AWS Solutions Architect Professional
- **Fechas:** 14 nov – 1 dic 2030.

## WA5 · Matemática
- **Horas:** ≈ 49 h. **Fechas:** 2–9 dic 2030.
- **Contenido:** mecánica orbital.

## A5 · Órbita
- **Horas:** antes 147 h; ahora ≈ 205 h.
- **Fechas:** 10 dic 2030 – 3 feb 2031 (pausa del 23 al 29 dic).
- **Puesto:** Mission Analysis Engineer.
- **Qué hace:** propagador con J2 y arrastre, ventanas de comunicación, screening de conjunciones.
- **Problema concreto:** el riesgo de colisión y los reingresos no tienen un aviso público y simple.
- **Valor:** alertas públicas y entendibles.
- **Diferencial:** catálogo completo cada día sin comparar todos contra todos.
- **Herramientas:** ★ alertas de conjunción y reingresos sobre Argentina.
- **Capa física:** ★ basura espacial en AR.
- **Notificaciones:** ★ WhatsApp y newsletter por email.
- **Escala:** servicio diario con usuarios suscriptos.
- **Stack:**
  - Backend: Java con Orekit, SGP4 en Rust.
  - DB: Postgres.
- **Versiones:**
  - **1.0 MVP (10–22 dic):** propagador, ventanas de comunicación.
  - **1.1 Producto (30 dic – 12 ene):** screening del catálogo completo.
  - **2.0 Plataforma (13–23 ene):** WhatsApp, newsletter, AR.
  - **3.0 Producción (24 ene – 3 feb):** servicio diario, reingresos sobre Argentina.
- **Entrevistas:** muy alto.

## A6 · Upstream
- **Horas:** antes 98 h; ahora ≈ 120 h.
- **Fechas:** 4 feb – 4 mar 2031.
- **Puesto:** Systems Engineer.
- **Qué hace:** contribuciones a PX4, Orekit o F Prime.
- **Valor:** código tuyo aceptado en proyectos que usa la industria.
- **Stack:** el de cada proyecto.
- **Versiones:**
  - **1.0 (4–13 feb):** primer PR aceptado.
  - **2.0 (14–23 feb):** PR de funcionalidad en un segundo proyecto.
  - **3.0 (24 feb – 4 mar):** contribución de peso.
- **Entrevistas:** alto.

## 🎓 Certificación 13 · GitHub Advanced Security
- **Fechas:** 5–12 mar 2031.

## A7 · Horizonte
- **Horas:** antes 196 h; ahora ≈ 265 h.
- **Fechas:** 13 mar – 15 may 2031.
- **Puesto:** Aerospace Software Engineer.
- **Qué hace:** misión de un cubesat ficticio con operador asistido por IA.
- **Problema concreto:** operar una misión exige un equipo grande atento 24 horas.
- **Valor:** operación de misión de punta a punta.
- **Diferencial:** computadora de a bordo real, comandos firmados, caso de seguridad documentado.
- **Herramientas:** ★ sala de control con video en VR.
- **Capa física:** ★ computadora de a bordo real en HIL con Face ID.
- **Notificaciones:** Slack y email.
- **Voz:** ★ "Houston": el agente propone runbooks y vos aprobás.
- **Escala:** telemetría continua, comandos garantizados.
- **Stack:**
  - Backend: F Prime o cFS, Rust embebido o Ada/SPARK.
  - Herramientas: Python.
  - Frontend: VR.
- **Hardware:** placa del cubesat (fase 5).
- **Versiones:**
  - **1.0 MVP (13–28 mar):** gemelo digital del cubesat.
  - **1.1 Producto (29 mar – 13 abr):** sala de control en VR conectada a Antena Ops.
  - **2.0 Plataforma (14–29 abr):** "Houston" por voz.
  - **3.0 Producción (30 abr – 15 may):** HIL real, comandos firmados, caso de seguridad.
- **Entrevistas:** muy alto.

## Cierre y renovaciones
- **Fechas:** 16–27 may 2031.

---

# MATEMÁTICA

**Diaria:** 1 h por día hasta el trabajo nuevo; 2 h después. Se pausa en las ventanas.

| Tramo | Horas | Termina ≈ |
|---|---|---|
| T+0 a T+2 | 126 h | 11 feb 2027 |
| T+3 a T+6 | 196 h | 9 jun 2027 |
| T+7 a T+8 | 112 h | 4 ago 2027 |
| T+9 a T+18 | 504 h | 2 jun 2028 |

**Ventanas intensivas:**

| Ventana | Fechas | Antes de |
|---|---|---|
| W1 | 1–20 mar 2027 | AgrIA |
| W2 | 21 sep – 14 oct 2027 | AeroScan |
| W3 | 27 ene – 15 feb 2028 | AdversarIA |
| W4 | 15–22 jul 2028 | Bóveda |
| WQ1 | 31 dic 2028 – 11 ene 2029 | Alpha Lab |
| WQ2 | 2–17 may 2029 | Volta |
| WQ3 | 27 ago – 3 sep 2029 | Comando |
| WA1 | 20 ene – 4 feb 2030 | Trayecta |
| WA2 | 5–16 abr 2030 | Malla |
| WA3 | 2–17 jul 2030 | Viento |
| WA4 | 3–14 sep 2030 | Piloto |
| WA5 | 2–9 dic 2030 | Órbita |

---

# ALGORITMOS PLANTADOS

| Tema | Proyecto | Modo |
|---|---|---|
| Hash maps | PetrIA | sin IA |
| Sliding window | PetrIA | sin IA |
| Binary search | PetrIA | sin IA |
| k-d tree (árboles y recursión) | PetrIA | con IA |
| LRU (hash map + lista doble) | PetrIA | con IA |
| Stack | PetrIA | con IA |
| Queue (token bucket) | PetrIA | con IA |
| Sorting + two pointers | VitalIA | sin IA |
| Heap | VitalIA, PetrIA Guard, Matchbook | sin IA |
| Programación dinámica | AgrIA | con IA |
| Backtracking | Antena | con IA |
| Dijkstra | PetrIA Guard | con IA |
| BFS, DFS, orden topológico | Antena Ops | sin IA |

- **Con IA:** Claude propone; vos validás en voz alta la complejidad, los casos borde y los cambios.
- **Sin IA:** recibís el problema, la complejidad esperada y 2–3 tests; lo escribís vos y Claude revisa.
- Cada spot se registra en `docs/learning.md`, con la pregunta de entrevista que responde.
- **Sprint sin IA:** 2 semanas, 30 min por día, antes de cada ciclo de entrevistas técnicas.

---

# CERTIFICACIONES

| # | Certificación | Fechas |
|---|---|---|
| 1 | Claude Certified Architect + GitHub Foundations | 6–12 ene 2027 |
| 2 | AWS Solutions Architect Associate | 24 jun – 5 jul 2027 |
| 3 | Security+ | 3–20 sep 2027 |
| 4 | AWS ML Engineer Associate | 15–26 ene 2028 |
| 5 | AWS GenAI Developer Professional | 27 abr – 14 may 2028 |
| 6 | Azure AI-103 | 23 ago – 3 sep 2028 |
| 7 | PNPT | 30 nov – 17 dic 2028 |
| 8 | CKA | 9–24 abr 2029 |
| 9 | CKS | 13–26 ago 2029 |
| 10 | AWS Security Specialty | 14 dic 2029 – 7 ene 2030 |
| 11 | GitHub Actions + Copilot | 13–24 jun 2030 |
| 12 | AWS SA Professional | 14 nov – 1 dic 2030 |
| 13 | GitHub Advanced Security | 5–12 mar 2031 |
| 14 | Renovaciones | may 2031 |

**En el CV de una hoja:**
- Primera línea: IA y AWS.
- Segunda línea: seguridad y Kubernetes.
- Al final: las de GitHub agrupadas.

En LinkedIn van todas.

---

# RUTINA

**Lunes a viernes**

| Horario | Bloque |
|---|---|
| 4:00 | Despertar |
| 4:30–5:30 | Matemática |
| 5:30–8:00 | Proyecto (5:30–6:00 algoritmos sin IA, solo en un sprint) |
| 8:00–9:30 | Correr, ducha, Abi |
| 9:30–11:30 | Trabajo |
| 11:30–15:30 | Proyecto |
| 15:30–16:00 | Anthropic Academy (desde el 23 dic, proyecto) |
| 16:00–16:30 | Inglés |
| 16:30–17:00 | Inglés hablado: explicás lo que construiste y te grabás |
| 17:00–17:40 | Postulaciones y mensajes |
| 17:40–18:00 | Publicaciones |
| 18:00–20:00 | Entrenamiento |
| 20:00–21:00 | Descanso |
| 21:00 | Dormir |

- **Hasta el 5 ene 2027:** +1,5–2 h por día de proyecto (~8 h por día), en un bloque a definir. Nunca sale del sueño ni del entrenamiento.
- **Sábado:**
  - Mañana: 4:00 despertar · 4:30 matemática · 5:30–9:00 proyecto · 9:00 pausa · 9:30–13:00 proyecto.
  - Tarde: 13:00 demo · 14:00 entrevista simulada · 15:00 inglés · 16:00 libre.
- **Domingo:**
  - Mañana: 4:00 despertar · 4:30 matemática · 5:30–9:00 proyecto · 9:00 pausa · 9:30–14:00 proyecto con PRs de open source.
  - Tarde: 14:00 revisión semanal (Trazo, `learning.md`, `english.md`, `hours.md` en el repo privado, plan) · 15:00 inglés · 16:00 libre.
- **Con el trabajo nuevo:** la misma estructura, con ≈ 29 h por semana de proyecto y 2 h por día de matemática.
- **Lo que no se toca:** 7 h de sueño, entrenamiento, Abi.

---

# HARDWARE Y CUENTAS POR FASE

- **Fase 1 (antes del 1 feb 2027, para VitalIA 3.0 y AgrIA):**
  - Kit ESP32 con 37 sensores (≈ $41.300).
  - ESP32 extra (≈ $19.000 cada uno).
  - Sensor de presión y caudalímetro (para la boca de pozo real de PetrIA).
  - MAX30102.
  - Sensores de suelo y clima.
- **Apple Developer Program (USD 99 por año, antes del 19 feb 2027):** para TestFlight y para AR con ViroReact sin Mac.
- **Fase 2 (antes de mayo 2027):**
  - RTL-SDR V4 con antenas (≈ USD 45).
  - Raspberry Pi†.
  - Kit del tanque: recipiente, sensor de nivel, bomba de 5–12 V, relé, RS485.
- **Fase 3 (antes de marzo 2028):** ESP32-CAM; impresora 3D opcional†.
- **Fase 4 (antes de julio 2028):** llave de seguridad física, lector RFID.
- **Fase 5 (2029–2031):** display LED, IMU y barómetro, Pixhawk con frame, placa del cubesat.

---

# TRÁMITES (arrancar ya)

- Verificación de WhatsApp Business en Meta.
- Acceso a producción de Amazon SES.
- Registros SPF, DKIM y DMARC en el dominio de Hostinger.

---

# NOTAS

- **Perfil a fines de 2027:**
  - Proyectos: PetrIA completo, VitalIA, AgrIA, Antena, Constelación 2.1, PetrIA Guard y AeroScan; AgrIA Sat en curso.
  - Certificaciones: Claude, GitHub Foundations, AWS SAA y Security+.
  - La AWS GenAI Professional se puede adelantar si la querés antes del cambio de trabajo.
- **Calibración:** al cerrar PetrIA 1.0 y 1.1 se reemplaza el factor 1,5 por el real y se recalcula todo.
- **Costos por uso:**
  - Topes en ElevenLabs, Twilio, WhatsApp, SES y las APIs de IA.
  - PetrIA: USD 50 por mes en servicios de terceros; el crédito de Anthropic va aparte.
- **Datos de Capítulo IV:** licencia no especificada en el portal. Se cita la fuente, se marcan los datos, se usan como demo no comercial y queda registrado en un ADR.
- **Cuidados:**
  - Datos simulados marcados; sin marcas ni logos ajenos.
  - Avisos de "no es para uso clínico" y "no es recomendación de inversión".
  - Ningún dato clínico por WhatsApp ni email.
  - AdversarIA y Asedio solo sobre endpoints propios o autorizados.
  - Los agentes de voz avisan que son IA y que graban; nunca se clona una voz sin consentimiento.
  - LiPo con cuidado, nada de pirotecnia casera, nunca 220 V cerca del agua.
