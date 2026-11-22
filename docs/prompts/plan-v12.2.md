# Trazo · Plan v12.2 (22 Nov 2026) — source of truth

> Prompt "TRAZO — FULL PLAN UPDATE v12.2 · COMPLETE ROADMAP + THREE TRACKS", received on 22 Nov 2026. It extends v12.1 (PR #47):
> same foreground dates and hours, every project in detail, and two background tracks (secondary apps + commercial showcases).
> `scripts/plan-v12.mjs` parses the DATA sections below (§10, §11, §12, §12b). Project detail text is Spanish (rioplatense) and is
> stored and shown exactly as written. Transcription notes: the commercial table dates and the secondary version dates are written
> with full years (ISO in the table) so they parse without guessing; the cert, English and math day plans of §10 are the same as
> v12.1 (already loaded) and are not repeated here.

## Answers (22 Nov 2026)

- A. On track = work % and time % within 10 points. Ahead = work more than 10 points above time. Behind = time more than 10 points above work. Late = end passed and not done.
- B. A suggested shift stops at the next delay absorber and shrinks it. Absorbers in order: Consolidation → stage closes → rests → final close. An absorber can't go below 3 days; if it would, the shift continues to the next one. Booked exam dates and the 20–26 Dec 2027 pause never move. Background periods inside a shrunk window shift with it. Always a suggestion; nothing moves without confirmation.
- C. Papers go in Block 1 of the first day of their block (study → test). The thesis is written in the close-out, in the learning.md slot, and becomes the draft of that week's Tue/Thu post. "Read tomorrow's lesson" stays for lessons.
- 1. Keep "roadmap v7 (archived, 20 Nov 2026)" as it is.
- 2. The secondary HandyX and Clip Studio are NEW items; the old Handyx area and the clipping data stay untouched and paused.
- 3. Work % is weighted by planned hours; where a version has no explicit hours, by days.
- 4. The Imán gate applies to the public launch: one version per item marked "launch" (default v3.0 for principal and secondary projects, the single release for commercial slots; editable per item). It requires all 8 points, with steps 1–3 of the post series (teaser, build, launch). "Deep dive" and "result" are follow-up tasks after launch. Earlier versions can be published without the gate.
- 5. Claude usage % is typed in the Sunday review. Default threshold 85 %, editable.

## Rules carried from the prompt (summary)

- Tracks: principal (foreground, v12.1 projects), secondary (background apps, one at a time, short overlap at handover), commercial (background showcases, one per non-principal window).
- Background never consumes focus hours nor counts toward the 72 h/week capacity; its time is logged apart as review time. Secondary: 1 h/week walkthrough per active app (Sunday review) + optional 1–2 h design review. Commercial review only in the daily close-out and the weekend session; warn if logged inside a cert or mock block.
- Foreground review required for versions touching money, personal data, security or smart contracts ("foreground review done" checkbox; can't be done without it).
- Claude credits: principal first. Sunday review: if usage % ≥ threshold, suggest pausing commercial first, then secondary. Never pause without confirmation.
- Fixed pauses for all background work: PNPT (28 Oct – 11 Nov 2027) and 20–26 Dec 2027 (paused, not late).
- Separate repo per app: `repo_url` on every secondary and commercial item.
- Imán: 1 hook · 2 wow in the first 3 s of a 30 s video · 3 public demo without signup · 4 one measured metric · 5 news tie-in · 6 README, ADRs, tests · 7 target companies · 8 post series teaser → build → launch → deep dive → result.
- Posts: Tuesday principal, Thursday secondary or showcase, every 2 weeks a story/portfolio video; same day as every milestone. Post entity: date, channels, track, linked item, Imán step, link.
- Showcase safety (every commercial item, before "published"): visible label "concepto no oficial, sin relación con la marca"; own design, no copied logos or crests; no login or payment flow imitating the brand; simulated data labeled as simulated; load tests never hit the real LLM API. Extra rules: crypto only on testnet; real payments only via Mercado Pago; voice agents disclose AI and recording, no voice cloning; Clip Studio uses official APIs only, no multi-account automation, no fake engagement, only content with permission.

## 10. COMPLETE ROADMAP DATA (v12.2)

### STAGE 1 · NÚCLEO (21 Nov 2026 – 19 Sep 2027)

PHASE 1 · AI Full-stack Engineer (21 Nov 2026 – 14 Jan 2027)
- PROJECT PetrIA · 21 Nov–9 Dec 2026 · 193.5 h (lim 245) · Full-stack AI Engineer (energy) · very high
  · BACKGROUND → secondary: HandyX v1.0 · commercial: —
  · Puesto: Full-stack AI Engineer (energía)
  · Descripción: Mapa mundial real con los pozos de Vaca Muerta y las zonas de mayor productividad esperada; Valor y declinación de cada pozo, y lector de partes viejos; Asistente por texto, voz, WhatsApp y teléfono que cita el dato oficial; Uso y costo medidos por empresa
  · Problema: partes cargados a mano, valuación en Excel, ingeniero de campo sin manos libres
  · Valor: dónde perforar, cuánto vale cada pozo y papel convertido en datos
  · Diferencial: P10/P50/P90 en todo, validación espacial y abstención; 8 capas; Costo por consulta y por empresa, con cuotas; Scale report y notificaciones con respaldo
  · Herramientas: Sweet spots; Valor del pozo: ingresos USD/ARS, regalías, costos, valor presente, repago y precio de equilibrio; Declinación con Arps (P10/P50/P90); Lector de partes: de PDF, Excel o foto a datos validados; Extras: alertas, más cuencas, cumplimiento, yacimiento 3D
  · Capa física: Pozo en tu mesa (AR Quick Look); El celular como escáner de partes; Boca de pozo en Wokwi por MQTT (la placa real, después); GPS "pozos cerca de mí"
  · Ahorro a medir: minutos por parte, errores de tipeo y horas de Excel por pozo
  · Voz: "PetrIA, mostrame los mejores pozos de Loma Campana"
  · Escala: 500 usuarios, 20 empresas, 1 M de filas, p95 < 300 ms. Los 100 M de filas, con la PC
  · Stack: Front: Next.js, TypeScript, MapLibre GL, Three.js, sistema de diseño, carga procedural y USDZ · Back: Java + Spring Boot: OIDC, multiempresa, JPA, Flyway, OpenAPI, medición de uso y cuotas; Node + NestJS: notificaciones y voz · IA por API: Python, FastAPI y LangGraph sobre Claude, con: pgvector, caché semántica y router; Salida estructurada y batch; MCP, evals y trazas con costo; ElevenLabs y Twilio · ML propio: LightGBM con cuantiles, validación por bloques espaciales, H3 y Arps · DB: Postgres + PostGIS + pgvector (Neon) · Infra: 6 servicios, gateway, RabbitMQ, Pact, idempotencia, MQTT, GitHub Actions, Render y `platform-kit` · Cloud: AWS (S3, SQS, Lambda, SES)
  · v1.0 · 21–25 nov (límite 1 dic): ingesta, detector P10/P50/P90 con validación espacial, mapa con pozos, mapa de calor y concesiones, asistente con citas y abstención, 20 evals, deploy y README
  · v1.1 · 26–30 nov (límite 12 dic): Herramientas: valor del pozo, declinación y lector de partes; IA: 40–60 evals, tope de costo, router y caché; Plataforma: Keycloak y multiempresa; Calidad y frontend: Pact, Playwright, accesibilidad, Lighthouse, ES/EN; Operación y seguridad: OpenTelemetry + k6, MCP, modelo de amenazas
  · v2.0 · 1–4 dic (límite 22 dic): notification-service, voice-gateway, medición de uso y cuotas, sistema de diseño con Storybook
  · v3.0 · 5–9 dic (límite 5 ene): Escala y operación: load-lab completo, caos, simulacro de backups, feature flags, Scale report; Nube: ingesta en AWS; Capa física: AR Quick Look, celular escáner, boca de pozo en Wokwi y GPS
  · Cambios v12.1: Lote 0.1 (3 h): Dockerfile por servicio + docker-compose con Postgres/PostGIS y RabbitMQ; Lote 2.4 (8.5 h): feedback 👎 → clasificás falla de retrieval, modelo o tool → nuevo caso de eval; Lote 2.6 (8 h): evals en CI en cada PR (falla si baja el score) y trazas por paso
  · Peso en entrevistas: muy alto
- CERT Window 1 · 10–13 Dec 2026 · 42 h
  · BACKGROUND → secondary: HandyX v1.0 · commercial: #1 Aquasol
- ENGLISH E#1 · 14–20 Dec 2026 · 72 h
  · BACKGROUND → secondary: HandyX v1.0, HandyX v2.0 · commercial: #1 Aquasol
- PROJECT VitalIA · 21–30 Dec 2026 · 100 h (lim 125)
  · BACKGROUND → secondary: HandyX v2.0 · commercial: —
  · Puesto: AI Engineer en salud (.NET, Azure, seguridad)
  · Descripción: brechas de cuidado y problemas de medicación con evidencia; traductor de sistemas viejos a FHIR; monitoreo remoto; dictado a nota
  · Problema: controles y medicación que se pierden, conciliación manual, sistemas que no se hablan y médicos escribiendo
  · Valor: previene complicaciones y moderniza sistemas hospitalarios
  · Diferencial: Regla, fuente y evidencia en cada alerta; Cero alertas inventadas; Precisión medida con feedback médico; Registro de quién accedió a cada paciente; Privacidad por diseño
  · Herramientas: Brechas de cuidado; Conciliación de medicación; HL7 v2 o CSV a FHIR; Extras: SBAR, tablero de población, CQL, banco de ataques
  · Capa física: Monitoreo remoto: oxímetro real, y glucómetro y tensiómetro en Wokwi; Escáner de cajas; AR de interacciones
  · Ahorro a medir: minutos de conciliación, horas de migración, brechas cerradas y minutos de notas
  · Voz: escriba clínico; "¿qué tiene pendiente la cama 12?"
  · Escala: 100 mil pacientes de Synthea; 1 M de mensajes HL7
  · Stack: Front: Next.js + TypeScript, portal seguro · Back: C#, ASP.NET Core, Firely SDK, EF Core, YARP; desidentificador en Rust compilado a WebAssembly · IA por API: Python con Azure OpenAI o Claude; explica, nunca decide · ML propio: no aplica · DB: SQL Server y FHIR · Infra: SMART on FHIR, MQTT, `platform-kit` · Cloud: Azure Health Data Services, Azure OpenAI, Entra ID
  · v1.0 · 21–22 dic: FHIR con Synthea, motor con 8–10 reglas, explicación con citas, panel con línea de tiempo, deploy en Azure
  · v1.1 · 23–25: conciliación, HL7 a FHIR, evals, feedback médico, auditoría, SMART on FHIR, desidentificador en Rust, frontend
  · v2.0 · 26–28: avisos por WhatsApp y email, llamada, escriba por voz, monitoreo en Wokwi, escáner de cajas
  · v3.0 · 29–30: 100 mil pacientes, 1 M de mensajes, blue-green, retención, oxímetro real, Scale report
  · Peso en entrevistas: muy alto
- CERT Window 2 · 31 Dec 2026–7 Jan 2027 · 82 h
  · BACKGROUND → secondary: HandyX v2.0 · commercial: #2 Cinemacenter
- ENGLISH E#2 · 8–14 Jan 2027 · 72 h
  · BACKGROUND → secondary: HandyX v2.0, HandyX v3.0 · commercial: #2 Cinemacenter

PHASE 2 · ML Engineer (15 Jan – 17 Mar 2027)
- MATH W1 · 15 Jan–3 Feb 2027 · 206 h
  · BACKGROUND → secondary: HandyX v3.0 · commercial: #3 miboletería
- CERT Window 3 · 4–11 Feb 2027 · 82 h
  · BACKGROUND → secondary: JulIA v1.0 · commercial: #4 McDonald's
- ENGLISH E#3 · 12–18 Feb 2027 · 72 h
  · BACKGROUND → secondary: JulIA v1.0 · commercial: #4 McDonald's
- PROJECT AgrIA · 19 Feb–2 Mar 2027 · 115 h (lim 130)
  · BACKGROUND → secondary: JulIA v1.0, JulIA v2.0 · commercial: —
  · Puesto: Applied ML Engineer (agro)
  · Descripción: rinde por departamento con rango de confianza, margen bruto con incertidumbre y atención por WhatsApp con audio
  · Problema: el productor decide sin ver el riesgo y no usa planillas
  · Valor: decisiones con la plata y el riesgo a la vista
  · Diferencial: predicción conforme con cobertura medida, datos reales de Estimaciones Agrícolas y batch con conciliación
  · Herramientas: Rinde por departamento; Margen P10–P90 en USD y ARS; Asistente por WhatsApp; Extras: riesgo climático (Open-Meteo) y simulador de fecha de siembra
  · Capa física: Cobertura del cultivo con una foto; Estación meteorológica y humedad de suelo (Wokwi y real); GPS del lote y AR
  · Ahorro a medir: diferencia de margen con la fecha recomendada y horas de cálculo
  · Voz: "AgrIA, ¿qué pasa si siembro 15 días después?"
  · Escala: recálculo idempotente de todos los departamentos y campañas
  · Stack: Front: Three.js, backoffice en Rails, Expo · Back: Rails como monolito modular; GraphQL opcional · IA por API: asistente con herramientas sobre Claude · ML propio: scikit-learn, gradient boosting, predicción conforme, MLflow, Dagster · DB: Postgres y BigQuery · Infra: batch con cola, k3s, Helm, MQTT · Cloud: GCP (BigQuery, Vertex AI)
  · v1.0 · 19–21 feb: ingesta, modelo de rinde con predicción conforme, mapa por departamento, deploy
  · v1.1 · 22–24: margen P10–P90, simulador, riesgo climático, backoffice, MLflow y Dagster, frontend
  · v2.0 · 25–27: WhatsApp con audio, email, línea telefónica, foto de cobertura, GPS, AR
  · v3.0 · 28 feb–2 mar: recálculo masivo, backfills, estación y humedad de suelo reales, Scale report
  · Peso en entrevistas: alto
- CERT Window 4 · 3–10 Mar 2027 · 82 h
  · BACKGROUND → secondary: JulIA v2.0 · commercial: #5 Supermarkets
- ENGLISH E#4 · 11–17 Mar 2027 · 72 h
  · BACKGROUND → secondary: JulIA v2.0 · commercial: #5 Supermarkets

PHASE 3 · Systems / Realtime (18 Mar – 17 Apr 2027)
- PROJECT Antena · 18 Mar–2 Apr · 160 h (lim 185)
  · BACKGROUND → secondary: JulIA v2.0, JulIA v3.0 · commercial: —
  · Puesto: Systems / Ground Software Engineer
  · Descripción: sigue satélites reales (incluidos los argentinos), decodifica telemetría, planifica pasadas y calcula enlaces
  · Problema: operar una estación terrena exige atención manual en cada pasada
  · Valor: sistemas en tiempo real con datos reales
  · Diferencial: decodificador en Rust compilado a WebAssembly con benchmark, estación real en SatNOGS y p99 medido
  · Herramientas: "Seguí a los satélites argentinos"; Decodificador en el navegador; Calculadora de enlace; Extras: copiloto y observaciones en SatNOGS
  · Capa física: "Apuntá al cielo" (AR con cámara, ViroReact); Estación real con SDR, Raspberry Pi y rotor con ESP32; Señal IQ sintética
  · Ahorro a medir: horas de operación manual automatizadas
  · Voz: "Antena, apuntá al próximo satélite"
  · Escala: 10 mil websockets y miles de mensajes por segundo
  · Stack: Front: Three.js, Expo con ViroReact · Back: Rust (SGP4, CCSDS), websockets · IA por API: copiloto con la telemetría como evidencia · ML propio: no aplica · DB: series de tiempo (a definir) · Infra: MQTT con mTLS, OTA · Cloud: AWS IoT, comparado con AWS Ground Station
  · v1.0 · 18–21 mar: SGP4, satélites argentinos, planificador de pasadas
  · v1.1 · 22–25: decodificador CCSDS en WebAssembly con benchmark, calculadora de enlace, copiloto, frontend
  · v2.0 · 26–29: AR, alertas por WhatsApp, voz, rotor en Wokwi
  · v3.0 · 30 mar–2 abr: estación real en SatNOGS, rotor real, 10 mil websockets, backpressure, Scale report
  · Peso en entrevistas: alto
- CERT Window 5 · 3–8 Apr · 62 h
  · BACKGROUND → secondary: JulIA v3.0 · commercial: #6 SportClub
- JOB SEARCH E#5 (short) · 9–12 Apr · 42 h
  · BACKGROUND → secondary: JulIA v3.0 · commercial: #6 SportClub
- PROJECT Constelación 2.0 + 2.1 · 13–17 Apr · 50 h (lim 60) · scope note: CDN = AWS CloudFront
  · BACKGROUND → secondary: JulIA v3.0, Clip Studio v1.0 · commercial: —
  · Puesto: Sr Full-stack → AI Engineer (RAG multifuente y agentes)
  · Descripción: portfolio como mapa 3D de proyectos. Después se vuelve un agente que responde sobre todo tu trabajo por texto y voz
  · Problema: los reclutadores no recorren cinco repos
  · Valor: convierte una visita en conversación y en entrevista
  · Diferencial: validador de referencias y ciclos, RAG multifuente con citas y evals, MCP público y plantilla open source
  · Herramientas: modo reclutador; plantilla open source; métricas en vivo desde el CI; las 16 certificaciones con sus insignias
  · Capa física: CV o tarjeta en AR (AR Quick Look)
  · Impacto a medir: visitas, conversaciones, emails respondidos, entrevistas
  · Voz: "Preguntale a Ignacio"
  · Escala: pico viral ×50 en minutos
  · Stack: Front: Next.js, TypeScript, Three.js · Back: Node + TypeScript · IA por API: Python, FastAPI, LangGraph sobre Claude, MCP hacia cada proyecto · ML propio: no aplica · DB: JSON en la v1; Neon con pgvector en la 2.0 · Infra: Module Federation, `platform-kit` · Cloud: Render o Vercel, SES
  · v1.0 · base ya hecha: mapa 3D, Trazo como caso, validador, shell con Module Federation
  · v2.0 · 13–14 abr: RAG con citas y evals sobre READMEs, ADRs, código y `learning.md`; modo reclutador; MCP público
  · v2.1 · 15–17 abr: voz, CV en AR, email y WhatsApp, métricas en vivo, plantilla open source, CDN, prueba de pico viral
  · Peso en entrevistas: medio con la v1; alto desde la 2.0

PHASE 4 · DevSecOps / Platform (18 Apr – 29 May 2027)
- PROJECT PetrIA Guard · 18–30 Apr · 130 h (lim 150) · scope note: 3.0 adds explicit Kubernetes Ingress load balancing + "kill a pod" test
  · BACKGROUND → secondary: Clip Studio v1.0 · commercial: —
  · Puesto: DevSecOps / OT Security Engineer
  · Descripción: gemelo digital de una batería de tanques en tiempo real. Detecta ataques al SCADA por física y pérdidas en ductos, y escala alarmas por todos los canales
  · Problema: rebalses, rondas manuales, pérdidas sin detectar y alarmas sin atender
  · Valor: operación y seguridad industrial juntas
  · Diferencial: balance de masa, tanque real con agua y reglas de MITRE ATT&CK for ICS probadas con su ataque
  · Herramientas: Gemelo de tanques: niveles, tiempo del x% al y%, rebalse y despacho; Detector de ataques; Balance de masa; Extras: copiloto y yacimiento 3D
  · Capa física: Tanque en la pared (AR); Tanque real con sensor, bomba, relé, ESP32 y Modbus por RS485; Ronda con NFC
  · Ahorro a medir: rebalses evitados, horas de ronda, m³ perdidos × precio del crudo
  · Voz: "¿Cuánto falta para que el tanque 3 llegue al 90%?"
  · Escala: 10 mil lecturas por segundo y tormenta de alarmas
  · Stack: Front: Next.js, Three.js, Expo con AR y NFC · Back: Go, Modbus, OPC UA · IA por API: copiloto con aprobación humana · ML propio: anomalías por balance de masa · DB: DuckDB, Parquet, series de tiempo · Infra: Kubernetes endurecido, GitOps, firmas, mTLS, Falco, SBOM, OPA · Cloud: AWS IoT Core, IoT SiteWise, Kinesis, GuardDuty
  · v1.0 · 18–20: gemelo con SCADA simulado por Modbus, niveles en vivo, tiempo del x% al y%
  · v1.1 · 21–23: detector de ataques, pérdidas en ductos, reglas ATT&CK, despacho, frontend
  · v2.0 · 24–27: WhatsApp con botones, llamada, email, copiloto, AR, NFC
  · v3.0 · 28–30 abr: tanque real por RS485, 10 mil lecturas por segundo, tormenta de alarmas, Kubernetes endurecido, Scale report
  · Peso en entrevistas: muy alto
- CERT Window 6 · 1–9 May · 94 h
  · BACKGROUND → secondary: Clip Studio v1.0, Clip Studio v2.0 · commercial: #7 Car dealerships
- CERT Window 7 · 10–17 May · 82 h
  · BACKGROUND → secondary: Clip Studio v2.0 · commercial: #8 Balnearios
- CERT Window 8 · 18–25 May · 82 h
  · BACKGROUND → secondary: Clip Studio v2.0 · commercial: #9 Theaters
- JOB SEARCH E#6 (short) · 26–29 May · 41 h
  · BACKGROUND → secondary: Clip Studio v2.0, Clip Studio v3.0 · commercial: #9 Theaters

PHASE 5 · Computer Vision / MLOps (30 May – 18 Jul 2027)
- MATH W2 · 30 May–18 Jun · 205 h
  · BACKGROUND → secondary: Clip Studio v3.0 · commercial: #10 Pharmacies
- PROJECT AeroScan · 19 Jun–2 Jul · 135 h (lim 155)
  · BACKGROUND → secondary: Roofy v1.0 · commercial: —
  · Puesto: ML Engineer (computer vision)
  · Descripción: inspecciona superficies de aviones, genera la orden de trabajo, consulta manuales y registra los daños en 3D por matrícula
  · Problema: inspecciones en papel, manos ocupadas y horas buscando en manuales
  · Valor: digitaliza el mantenimiento
  · Diferencial: cascada de modelos, aprendizaje activo, caída de sintético a real medida y autograd a mano
  · Herramientas: de la inspección a la orden de trabajo; manuales públicos de la FAA; libro de daños en 3D
  · Capa física: dron simulado en 3D; daños en AR con el celular; LiDAR si el celular lo tiene
  · Ahorro a medir: minutos por inspección, búsqueda en manuales, errores de transcripción
  · Voz: el inspector dicta mientras revisa
  · Escala: cola de imágenes con autoescalado en GPU; costo por imagen
  · Stack: Front: Three.js, Tauri, Expo con AR · Back: Python con inferencia con batching y SLO · IA por API: Claude con visión para casos dudosos; RAG de manuales · ML propio: PyTorch, Blender, aprendizaje activo · DB: Postgres, dataset versionado · Cloud: AWS SageMaker, SES
  · v1.0 · 19–22 jun: datos sintéticos, modelo PyTorch, inspección por foto, caída sintético→real
  · v1.1 · 23–25: orden de trabajo, RAG de manuales, cascada con Claude visión, aprendizaje activo, autograd, frontend
  · v2.0 · 26–28: daños en 3D, AR, dron simulado, dictado, email con PDF, WhatsApp
  · v3.0 · 29 jun–2 jul: GPU con autoescalado, batching, escalado a cero, costo por imagen, Scale report
  · Peso en entrevistas: alto
- PROJECT Multiplatform week · 3–5 Jul · 25 h
  · BACKGROUND → secondary: Roofy v1.0 · commercial: —
  · Descripción: Consola de campo de PetrIA en Electron, offline; app Expo de VitalIA con push; AR offline del pozo
  · Publicación: TestFlight o prueba interna de Google Play
- PROJECT AgrIA Sat · 6–15 Jul · 100 h (lim 115)
  · BACKGROUND → secondary: Roofy v1.0 · commercial: —
  · Puesto: ML / MLOps Engineer
  · Descripción: monitorea lotes con Sentinel-2, alerta estrés, genera la dosis variable y estima la pérdida en USD
  · Problema: fertilizante parejo en lotes que no son parejos
  · Valor: plata ahorrada en fertilizante
  · Diferencial: puertas de calidad en el CI, canary con rollback, drift inyectado vs detectado y reentrenamiento con aprobación
  · Herramientas: mapa de estrés; dosis variable (shapefile o ISOXML); pérdida en USD
  · Capa física: fertilizadora con ESP32 guiada por GPS; recorrida a campo offline; AR de zonas
  · Ahorro a medir: kg de fertilizante ahorrados × precio
  · Escala: despliegue en sombra con tráfico duplicado
  · Stack: Front: Next.js, Expo · Back: Python con serving en Kubernetes · IA por API: resúmenes para el productor · ML propio: drift, PCA, SVD, reentrenamiento · DB: PostGIS, STAC · Cloud: GCP (Vertex AI, Earth Engine)
  · v1.0 · 6–7: Sentinel-2, índices, mapa de estrés
  · v1.1 · 8–10: dosis variable, pérdida en USD, PCA y SVD, frontend
  · v2.0 · 11–13: WhatsApp con imagen, email con la prescripción, llamada, recorrida offline, fertilizadora en Wokwi
  · v3.0 · 14–15 jul: puertas de calidad, sombra y canary, rollback, drift, reentrenamiento con aprobación
  · Peso en entrevistas: muy alto
- JOB SEARCH short · 16–18 Jul · 32 h
  · BACKGROUND → secondary: Roofy v2.0 · commercial: #11 Airbnb v2

PHASE 6 · AI Security + Edge + SRE (19 Jul – 19 Sep 2027)
- MATH W3 · 19 Jul–1 Aug · 144 h (14 days)
  · BACKGROUND → secondary: Roofy v2.0 · commercial: #11 Airbnb v2
- PROJECT AdversarIA · 2–10 Aug · 85 h (lim 105)
  · BACKGROUND → secondary: Roofy v2.0 · commercial: —
  · Puesto: AI Security Engineer
  · Descripción: escanea agentes de chat y voz propios o autorizados, los ataca y compara defensas
  · Problema: agentes lanzados sin probar su seguridad
  · Valor: seguridad para IA
  · Diferencial: OWASP LLM Top 10, GitHub Action open source, defensa propia con LoRA y comparativa entre nubes
  · Herramientas: "Escaneá tu chatbot": nota de la A a la F, con verificación de propiedad; GitHub Action; Comparativa de guardrails: AWS, Azure y el propio
  · Capa física: prompt injection con un cartel frente a la cámara; inyección por audio
  · Ahorro a medir: horas de pentest manual y costo de un incidente evitado (hipótesis)
  · Voz: ataques por voz contra tus agentes telefónicos, y la defensa
  · Escala: muchos escaneos a la vez sin que un cliente tape a otro
  · Stack: Front: Next.js · Back: Python, garak, PyRIT · IA por API: Claude, Bedrock Guardrails, Azure AI Content Safety · ML propio: guardián con LoRA sobre vLLM · Cloud: AWS y Azure
  · v1.0 · 2–3 ago: ataques contra PetrIA y VitalIA, informe con OWASP LLM Top 10
  · v1.1 · 4–5: "Escaneá tu chatbot", GitHub Action y comparativa
  · v2.0 · 6–8: voz, cartel y audio, email, WhatsApp
  · v3.0 · 9–10: guardián con LoRA y adaptadores por cliente, colas justas, protección contra abuso, Scale report
  · Peso en entrevistas: muy alto
- PROJECT AeroScan Edge · 11–23 Aug · 125 h (lim 145) · scope note: sync service on DynamoDB (conditional writes for conflicts)
  · BACKGROUND → secondary: Roofy v3.0 · commercial: —
  · Puesto: Edge AI Engineer
  · Descripción: inspección offline en el hangar, walkaround guiado por voz y sincronización
  · Problema: sin señal ni manos libres en el hangar
  · Valor: inspección donde la nube no llega
  · Diferencial: medición en un teléfono real y modelos firmados distribuidos por OTA
  · Herramientas: app offline; walkaround guiado; sincronización
  · Capa física: walkaround en AR; ESP32-CAM real vs celular
  · Ahorro a medir: minutos por walkaround
  · Voz: comandos offline
  · Escala: 1.000 dispositivos sincronizando con conflictos
  · Stack: Front: Expo con ONNX Runtime Mobile · Back: servicio de sincronización · ML propio: cuantización y modelo de lenguaje chico en el dispositivo · DB: SQLite · Cloud: AWS IoT Greengrass
  · v1.0 · 11–13: modelo cuantizado con ONNX, app offline
  · v1.1 · 14–16: walkaround guiado, modelo chico, presupuesto de latencia, frontend
  · v2.0 · 17–20: AR, voz offline, sincronización con AeroScan
  · v3.0 · 21–23: OTA firmada, 1.000 dispositivos, ESP32-CAM vs celular, batería y latencia medidas
  · Peso en entrevistas: alto
- PROJECT Antena Ops · 24 Aug–6 Sep · 135 h (lim 170)
  · BACKGROUND → secondary: Roofy v3.0 · commercial: —
  · Puesto: Senior ML + DevSecOps + Cloud
  · Descripción: el centro de control de todos tus productos: anomalías en telemetría de la NASA, agente SRE, status page, costos en vivo y Jarvis central
  · Problema: caídas detectadas tarde y costos de nube sin control
  · Valor: confiabilidad y costos en un solo lugar
  · Diferencial: SLO públicos, chaos engineering, flota de 1.000 dispositivos y Face ID
  · Herramientas: centro de control; status page; FinOps
  · Capa física: flota simulada; aprobación con Face ID; mapa 3D
  · Ahorro a medir: ahorro en la factura de nube; tiempo de recuperación × costo de una caída (hipótesis)
  · Voz: Jarvis central con Face ID
  · Escala: caos en todos los productos y caída de una nube
  · Stack: Front: microfrontends sobre Constelación · Back: Java y Go · IA por API: agente SRE con runbooks · ML propio: autoencoders · Infra: Kafka, saga y outbox, mTLS, OpenTelemetry, Prometheus, Pact y chaos · Cloud: AWS (EKS, MSK) y Azure
  · v1.0 · 24–27 ago: autoencoders sobre telemetría de la NASA, triage explicado
  · v1.1 · 28–30: centro de control, status page, Kafka, saga y outbox
  · v2.0 · 31 ago–2 sep: agente SRE, Jarvis con Face ID, Slack, WhatsApp, llamada por SLO, postmortem por email
  · v3.0 · 3–6 sep: chaos, caída de una nube con failover, flota de 1.000 dispositivos, FinOps y plan de capacidad
  · Peso en entrevistas: muy alto
- JOB SEARCH short · 7–9 Sep · 31 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #12 Football clubs
- CONSOLIDATION · 10–19 Sep (10 days)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #12 Football clubs

### STAGE 2 · CIBERSEGURIDAD (20 Sep – 21 Nov 2027)
PHASE 7 · Security Engineer
- MATH W4 · 20–24 Sep · 50 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #13 Hotels and tourism
- PROJECT Bóveda · 25 Sep–3 Oct · 85 h (lim 100)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: Security Engineer (identidad y secretos)
  · Descripción: secretos, cifrado de sobre, rotación y credenciales efímeras para agentes de IA
  · Problema: rotar credenciales a mano es lento y riesgoso
  · Valor: menos secretos filtrados y rotación sin cortes
  · Diferencial: primitivas propias comparadas contra una librería auditada, aplicadas a tus productos
  · Herramientas: credenciales efímeras por agente y por herramienta; GitHub App "¿Filtraste tu API key?"; comparativa AWS vs Azure
  · Capa física: el celular como llave (passkeys); llave física; SoftHSM
  · Escala: rotar miles de secretos sin cortar el servicio
  · Stack: Front: Tauri · Back: Rust, Go · DB: Postgres · Infra: Vault, SPIFFE, mTLS, cosign, Terraform · Cloud: AWS KMS y Secrets Manager, Azure Key Vault
  · v1.0 · 25–26 sep: Vault y cifrado de sobre
  · v1.1 · 27–28: rotación automática y credenciales efímeras
  · v2.0 · 29 sep–1 oct: GitHub App, aprobación por WhatsApp, celular como llave, llave física, SoftHSM
  · v3.0 · 2–3 oct: rotación masiva sin cortes, SPIFFE, mTLS, comparativa
  · Peso en entrevistas: muy alto
- PROJECT Asedio · 4–14 Oct · 105 h (lim 130)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: AppSec / Offensive Security Engineer
  · Descripción: modelo de amenazas y pentest de tus productos (IA e IoT incluidos), con un bot que corrige
  · Problema: los hallazgos quedan en un PDF y nadie los arregla
  · Valor: cada hallazgo termina en un PR y una prueba
  · Diferencial: hallazgos que se vuelven a probar en el CI; CVE propio con divulgación responsable
  · Herramientas: bot que abre el PR con la corrección; caza de CVE; agente asistente de pentest
  · Capa física: pentest al ESP32 vulnerable
  · Escala: escaneo de muchos repos sin frenar el CI
  · Stack: Back: Python · Cloud: AWS Inspector, Security Hub
  · v1.0 · 4–6: STRIDE y pentest de PetrIA, informe CVSS
  · v1.1 · 7–9: pentest de IA y del ESP32, reprueba en el CI
  · v2.0 · 10–11: bot de PR, agente asistente, email semanal, Slack
  · v3.0 · 12–14 oct: muchos repos sin frenar el CI, caza de CVE
  · Peso en entrevistas: muy alto
- PROJECT Vigía · 15–27 Oct · 125 h (lim 155)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: Detection & Response / Cloud Security Engineer
  · Descripción: SOC en una caja para pymes, con agente investigador y llamada al dueño
  · Problema: una pyme no puede pagar un SOC tercerizado
  · Valor: detección y respuesta al alcance de una pyme
  · Diferencial: agente evaluado contra incidentes etiquetados; tiempos de detección y respuesta medidos
  · Herramientas: SOC con un comando; agente investigador; purple team
  · Capa física: lector RFID real cruzado con inicios de sesión
  · Ahorro a medir: costo de un SOC tercerizado vs tu caja
  · Escala: millones de eventos por día con costo de retención controlado
  · Stack: Front: Expo · Back: Python, Sigma, ATT&CK · DB: OpenSearch · Infra: osquery, OpenTelemetry · Cloud: comparativa con Sentinel y Security Lake
  · v1.0 · 15–17: OpenSearch, osquery y reglas Sigma sobre el colector de PetrIA Guard
  · v1.1 · 18–20: agente investigador evaluado, purple team, tiempos medidos
  · v2.0 · 21–24: SOC con un comando, llamada, WhatsApp, email, RFID en Wokwi
  · v3.0 · 25–27 oct: millones de eventos, costo de retención, RFID real, comparativa
  · Peso en entrevistas: muy alto
- CERT PNPT · 28 Oct–11 Nov · 154 h
  · BACKGROUND → PAUSED (PNPT)
- JOB SEARCH E#7 (short) · 12–15 Nov · 42 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #14 Restaurants and breweries
- STAGE CLOSE · 16–21 Nov
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #14 Restaurants and breweries

### STAGE 3 · QUANT (22 Nov 2027 – 15 Apr 2028)
PHASE 8 · Quant Developer
- MATH WQ1 · 22–29 Nov · 82 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #15 TO DEFINE
- PROJECT Alpha Lab · 30 Nov–12 Dec · 125 h (lim 145)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: Quant Developer
  · Descripción: backtester de eventos con costos, deslizamiento y walk-forward
  · Problema: la mayoría de las estrategias "ganadoras" son sobreajuste
  · Valor: separa la suerte de la señal
  · Diferencial: Sharpe deflactado, registro con hash y benchmark Rust vs Python
  · Herramientas: "¿Tu estrategia es suerte?"; asistente con freno al sobreajuste
  · Voz: consultas sobre resultados
  · Escala: miles de backtests en paralelo
  · Stack: Front: Tauri · Back: Rust con PyO3 · IA por API: Claude · DB: Parquet, DuckDB · Cloud: AWS
  · v1.0 · 30 nov–2 dic: backtester en Rust con costos y deslizamiento
  · v1.1 · 3–5: walk-forward, registro con hash, Sharpe deflactado, benchmark
  · v2.0 · 6–9: "¿Tu estrategia es suerte?" y asistente
  · v3.0 · 10–12 dic: backtests en paralelo e informes por email
  · Peso en entrevistas: alto
- PROJECT Paper Trail · 13–30 Dec (pause 20–26 Dec) · 105 h (lim 130)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: Junior Quant Researcher
  · Descripción: agente que lee papers de finanzas y replica sus estrategias con Alpha Lab
  · Problema: muchos papers no se replican
  · Valor: saber si un paper funciona antes de invertir tiempo en él
  · Diferencial: porcentaje de replicación medido y publicado
  · Herramientas: página "¿Funciona este paper?"
  · Escala: lotes de papers en paralelo
  · Stack: Back: Python, Quarto · IA por API: RAG sobre PDF con Claude
  · v1.0 · 13–15: un paper replicado
  · v1.1 · 16–18: agente que extrae la estrategia y 3 papers replicados
  · v2.0 · 19 + 27 dic: página pública, newsletter y WhatsApp
  · v3.0 · 28–30 dic: lotes en paralelo y porcentaje replicado
  · Peso en entrevistas: alto
- MATH WQ2 · 7–16 Jan 2028 · 104 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #16 TO DEFINE
- PROJECT Volta · 17–29 Jan · 130 h (lim 150)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: Quant Developer (valuación y riesgo)
  · Descripción: valuación de opciones con griegas y estrés, validada contra QuantLib
  · Problema: no hay herramientas simples para opciones argentinas como GGAL
  · Valor: riesgo visible por posición y por cartera
  · Diferencial: validación contra QuantLib y API con SLO
  · Herramientas: calculadora de opciones argentinas con griegas; estrés por cartera
  · Capa física: superficie de volatilidad en AR
  · Voz: podcast de riesgo
  · Escala: API con SLO y benchmark
  · Stack: Front: Next.js, Three.js · Back: C++ o Rust, con Python
  · v1.0 · 17–19: Black-Scholes, binomial y Monte Carlo contra QuantLib
  · v1.1 · 20–22: griegas, estrés y calculadora argentina
  · v2.0 · 23–26: superficie en AR, email matinal y podcast
  · v3.0 · 27–29 ene: API con SLO y benchmark
  · Peso en entrevistas: alto
- PROJECT Matchbook · 30 Jan–9 Feb · 105 h (lim 120)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: Trading Systems Engineer
  · Descripción: motor de matching con libro de órdenes, market maker simulado y FIX
  · Problema: entender la microestructura del mercado sin acceso a un exchange
  · Valor: latencia y corrección probadas
  · Diferencial: p99 en microsegundos, replay determinístico y fuzzing
  · Herramientas: simulador educativo del libro, en formato juego
  · Escala: p99 en microsegundos bajo carga
  · Stack: Front: web del simulador · Back: C++ o Rust, FIX
  · v1.0 · 30 ene–1 feb: matching por precio y tiempo
  · v1.1 · 2–4: market maker, FIX y costos de transacción
  · v2.0 · 5–6: simulador en formato juego
  · v3.0 · 7–9 feb: p99 bajo carga, replay y fuzzing
  · Peso en entrevistas: alto
- CERT CKS · 10–15 Feb · 62 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #17 TO DEFINE
- JOB SEARCH E#8 (short) · 16–19 Feb · 41 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #17 TO DEFINE
PHASE 9 · Quant Trading Engineer
- MATH WQ3 · 20–24 Feb · 51 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #17 TO DEFINE
- PROJECT Comando · 25 Feb–10 Mar · 150 h (lim 170)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: Quant Trading Engineer
  · Descripción: de señales a órdenes en paper trading con Alpaca, con riesgo previo, kill-switch y conciliación
  · Problema: órdenes duplicadas o perdidas cuando algo falla
  · Valor: un sistema de órdenes confiable
  · Diferencial: cada orden se ejecuta una sola vez, la conciliación aguanta fallas y lleva meses en vivo
  · Herramientas: tablero público; riesgo previo a cada orden
  · Capa física: Face ID para el kill-switch
  · Escala: cada orden una sola vez y conciliación ante fallas
  · Stack: Front: Expo · Back: .NET y Rust · DB: Postgres append-only · Infra: Kafka
  · v1.0 · 25–28 feb: de señales a órdenes en paper trading
  · v1.1 · 29 feb–3 mar: riesgo previo, kill-switch y conciliación
  · v2.0 · 4–6: WhatsApp, Face ID, email diario y tablero público
  · v3.0 · 7–10 mar: una sola ejecución por orden, conciliación ante fallas, Kafka y meses en vivo
  · Peso en entrevistas: muy alto (fintech)
- PROJECT Ticker · 11–22 Mar · 120 h (lim 140)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: AI Quant / Data Engineer
  · Descripción: ingesta de datos de mercado en tiempo real con control de calidad
  · Problema: datos de mercado sucios o con huecos
  · Valor: datos confiables para todo el stack quant
  · Diferencial: SLA de calidad, replay de un día y MCP
  · Herramientas: dólar MEP y CCL en vivo; MCP
  · Capa física: display LED (Wokwi y real)
  · Voz: consultas de cotizaciones
  · Escala: ingesta masiva de ticks y replay
  · Stack: Back: Python · IA por API: MCP · DB: ClickHouse
  · v1.0 · 11–13: ingesta en ClickHouse con control de calidad
  · v1.1 · 14–16: MEP y CCL en vivo, y MCP
  · v2.0 · 17–19: WhatsApp, voz y LED en Wokwi
  · v3.0 · 20–22 mar: ticks masivos, replay, SLA y LED real
  · Peso en entrevistas: muy alto
- CERT AWS Security Specialty · 23–30 Mar · 82 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #18 TO DEFINE
- JOB SEARCH E#9 (short) · 31 Mar–3 Apr · 42 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #18 TO DEFINE
- STAGE CLOSE · 4–15 Apr
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #18 TO DEFINE

### STAGE 4 · AEROESPACIAL (16 Apr – 27 Oct 2028)
PHASE 10 · Simulation / CAE
- MATH WA1 · 16–25 Apr · 103 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #19 TO DEFINE
- PROJECT Trayecta · 26 Apr–13 May · 185 h (lim 195)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: Flight Dynamics Engineer
  · Descripción: simulador de vuelo 6-DOF para cohetes amateur
  · Problema: los grupos amateur vuelan sin estimar la incertidumbre
  · Valor: vuelos más seguros y predecibles
  · Diferencial: validación analítica y contra OpenRocket, un millón de corridas y hardware-in-the-loop
  · Herramientas: simulador web; cono de incertidumbre con Monte Carlo
  · Capa física: computadora de vuelo real en HIL; trayectoria en VR
  · Voz: eventos del vuelo narrados
  · Escala: un millón de corridas en AWS Batch
  · Stack: Front: WebAssembly, WebXR · Back: Rust o C++, Julia · ML propio: modelo sustituto · Cloud: AWS Batch
  · v1.0 · 26–29 abr: 6-DOF validado
  · v1.1 · 30 abr–4 may: simulador web contra OpenRocket
  · v2.0 · 5–9: Monte Carlo, VR, voz y computadora de vuelo en Wokwi
  · v3.0 · 10–13 may: un millón de corridas, modelo sustituto y HIL real
  · Peso en entrevistas: alto
- MATH WA2 · 14–21 May · 83 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #20 TO DEFINE
- PROJECT Malla · 22 May–8 Jun · 175 h (lim 185)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: CAE Software Engineer
  · Descripción: solver de elementos finitos verificado contra CalculiX
  · Problema: el software estructural es caro y opaco para estudiantes
  · Valor: cálculo estructural gratis en el navegador
  · Diferencial: convergencia de malla demostrada y un experimento real que coincide
  · Herramientas: calculadora para estudiantes; reporte de margen
  · Capa física: regla real medida con la cámara
  · Escala: cálculo pesado en el navegador con WebAssembly
  · Stack: Front: Tauri, WebAssembly · Back: Rust o C++, Gmsh
  · v1.0 · 22–25 may: solver 1D contra CalculiX
  · v1.1 · 26–30: 2D, convergencia y margen
  · v2.0 · 31 may–4 jun: calculadora en el navegador
  · v3.0 · 5–8 jun: experimento real y usuarios en universidades
  · Peso en entrevistas: alto
- MATH WA3 · 16–25 Jun · 104 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #21 TO DEFINE
- PROJECT Viento · 26 Jun–10 Jul · 145 h (lim 150)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: CFD Software Engineer
  · Descripción: aerodinámica con paneles, vortex lattice y Euler 2D, comparada contra OpenFOAM o SU2
  · Problema: diseñar un perfil de dron exige herramientas complejas
  · Valor: perfiles optimizados sin supercomputador
  · Diferencial: comparación contra OpenFOAM y modelo sustituto con optimización bayesiana
  · Herramientas: optimizador de perfiles para drones
  · Capa física: flujo de aire en AR
  · Escala: corridas en lote
  · Stack: Back: Rust o C++, Python · ML propio: modelo sustituto, optimización bayesiana
  · v1.0 · 26–29 jun: método de paneles
  · v1.1 · 30 jun–3 jul: vortex lattice, Euler 2D y comparación
  · v2.0 · 4–6: optimizador y AR
  · v3.0 · 7–10 jul: lote y modelo sustituto
  · Peso en entrevistas: alto
- JOB SEARCH short · 11–13 Jul · 30 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #22 TO DEFINE
PHASE 11 · GNC / Mission Software
- MATH WA4 · 14–21 Jul · 82 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #22 TO DEFINE
- PROJECT Piloto · 22 Jul–9 Aug · 190 h (lim 200)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: GNC Software Engineer
  · Descripción: control de vuelo con PID, LQR y Kalman, más un banco de fallas
  · Problema: ajustar el PID de un dron es prueba y error
  · Valor: ajuste automático y modos seguros
  · Diferencial: RL con escudo de seguridad contra LQR y un dron real
  · Herramientas: ajuste automático de PID desde los logs
  · Capa física: Estación de tierra por voz; El celular como sensor, con Kalman en vivo; Dron real con Pixhawk 6C Mini (≈ USD 177), dentro de la normativa ANAC
  · Escala: lazos con tiempos deterministas
  · Stack: Front: Expo · Back: ROS 2, PX4, C++, Python
  · v1.0 · 22–26 jul: PID, LQR y Kalman en PX4 SITL
  · v1.1 · 27–31: banco de fallas, modos seguros y ajuste automático
  · v2.0 · 1–4 ago: estación de tierra por voz y el celular como sensor
  · v3.0 · 5–9 ago: dron real y RL con escudo vs LQR
  · Peso en entrevistas: alto
- CERT AWS SA Professional · 10–21 Aug · 124 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #23 TO DEFINE
- JOB SEARCH E#10 (short) · 22–25 Aug · 40 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #23 TO DEFINE
- MATH WA5 · 26–30 Aug · 52 h
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: #23 TO DEFINE
- PROJECT Órbita · 31 Aug–15 Sep · 155 h (lim 165)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: Mission Analysis Engineer
  · Descripción: propagador con J2 y arrastre, ventanas de comunicación y screening de conjunciones
  · Problema: el riesgo de colisión y los reingresos no tienen un aviso público y simple
  · Valor: alertas públicas y entendibles
  · Diferencial: el catálogo completo cada día, sin comparar todos contra todos
  · Herramientas: alertas de conjunción y reingresos sobre Argentina
  · Capa física: basura espacial en AR
  · Escala: servicio diario con usuarios suscriptos
  · Stack: Back: Java con Orekit, SGP4 en Rust · DB: Postgres
  · v1.0 · 31 ago–3 sep: propagador y ventanas de comunicación
  · v1.1 · 4–7: screening del catálogo completo
  · v2.0 · 8–11: WhatsApp, newsletter y AR
  · v3.0 · 12–15 sep: servicio diario y reingresos sobre Argentina
  · Peso en entrevistas: muy alto
- PROJECT Upstream · 16–25 Sep · 100 h (lim 105)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: Systems Engineer
  · Descripción: contribuciones a PX4, Orekit o F Prime
  · Valor: código tuyo aceptado en proyectos que usa la industria
  · Stack: Stack: el de cada proyecto
  · v1.0 · 16–18: primer PR aceptado
  · v2.0 · 19–22: PR de funcionalidad en un segundo proyecto
  · v3.0 · 23–25 sep: contribución de peso
  · Peso en entrevistas: alto
- PROJECT Horizonte · 26 Sep–15 Oct · 200 h (lim 230)
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —
  · Puesto: Aerospace Software Engineer
  · Descripción: misión de un cubesat ficticio con operador asistido por IA
  · Problema: operar una misión exige un equipo grande atento las 24 horas
  · Valor: operación de misión de punta a punta
  · Diferencial: computadora de a bordo real, comandos firmados y caso de seguridad documentado
  · Herramientas: sala de control con video en VR
  · Capa física: computadora de a bordo real en HIL, con Face ID
  · Voz: "Houston": el agente propone runbooks y vos aprobás
  · Escala: telemetría continua y comandos garantizados
  · Stack: Front: VR · Back: F Prime o cFS, Rust embebido o Ada/SPARK
  · v1.0 · 26–30 sep: gemelo digital del cubesat
  · v1.1 · 1–5 oct: sala de control en VR conectada a Antena Ops
  · v2.0 · 6–10: "Houston" por voz
  · v3.0 · 11–15 oct: HIL real, comandos firmados y caso de seguridad
  · Peso en entrevistas: muy alto
- CLOSE & RENEWALS · 16–27 Oct 2028
  · BACKGROUND → secondary: free (pick from "Ver a futuro") · commercial: —

## 11. SECONDARY DATA (4 apps, each up to v3.0)

1. HandyX · 26 Nov 2026 – 3 Feb 2027
   - Description: on-demand marketplace for trades: request by photo or voice, AI quote, match with the professional, protected payment.
   - Value: sellable as an on-demand app. Differentiator: photo diagnosis, voice agent that says it's AI, own ranking, escrow.
   - Role: AI Full-stack / Mobile + Backend for marketplaces · Interview weight: very high · Targets: Uber, PedidosYa, Rappi.
   - Stack dev: Turborepo, Docker compose (Postgres + Redis), Mercado Pago sandbox, Twilio test mode. Staging: Neon branch, NestJS on Render, Expo internal build. Prod: Next.js (Vercel), Expo, NestJS + Drizzle + BullMQ, .NET payments service on Azure, Neon.
   - v1.0 26 Nov – 17 Dec 2026: web + app, pro onboarding, request, chat, Mercado Pago escrow (sandbox). [foreground review: money]
   - v2.0 18 Dec 2026 – 12 Jan 2027: Claude vision diagnosis + quote, voice agent (ElevenLabs + Twilio), scheduling tools.
   - v3.0 13 Jan – 3 Feb 2027: LightGBM learning-to-rank, .NET payments service, USDC payouts on testnet, security hardening. [foreground review: money, security, smart contracts]
2. JulIA · 4 Feb – 17 Apr 2027
   - Description: platform to learn trades with courses, 3D simulations and an AI tutor.
   - Value: SaaS for academies and trade companies. Differentiator: own knowledge tracing (BKT vs neural), FSRS review, verifiable certificates.
   - Role: AI Engineer / EdTech Full-stack · Interview weight: high · Targets: Udemy, Platzi, Coursera.
   - Stack dev: Docker compose, local Remotion, testnet. Staging: Neon branch, FastAPI + NestJS on Render. Prod: Next.js + React Three Fiber, NestJS + FastAPI, Remotion, AWS S3 + CloudFront, EAS certificates on testnet.
   - v1.0 4 – 28 Feb 2027: courses, Remotion video lessons, Claude tutor over course content.
   - v2.0 1 – 25 Mar 2027: 3D trade simulations (R3F), BKT, FSRS reviews. [foreground review: personal data]
   - v3.0 26 Mar – 17 Apr 2027: neural vs BKT with a measured metric, EAS certificates, B2B panel. [foreground review: smart contracts]
3. Clip Studio · 13 Apr – 18 Jun 2027
   - Description: long video → vertical clips ready to publish.
   - Value: my own tool for clipping + product for creators. Differentiator: highlights from transcript + audio peaks + chat peaks, own retention model.
   - Role: AI Engineer / Media + ML · Interview weight: high · Targets: Opus Clip, Descript, CapCut, YouTube, Kick, Twitch.
   - Stack dev: local FFmpeg + Whisper, Docker compose. Staging: on-demand GPU, test S3 bucket. Prod: NestJS, GPU workers, FFmpeg, Whisper, Remotion, S3 + CloudFront, official publishing APIs.
   - v1.0 13 Apr – 5 May 2027: ingest, Whisper, highlights by transcript and audio, vertical cuts with FFmpeg.
   - v2.0 6 – 27 May 2027: auto-reframe, animated captions (Remotion, reused from JulIA), Claude hooks and titles, chat peaks.
   - v3.0 28 May – 18 Jun 2027: retention model (reuses HandyX ranking), trends by niche, scheduling via official APIs.
4. Roofy · 19 Jun – 6 Sep 2027
   - Description: 3D and AR property tours with an agent that books visits.
   - Value: SaaS with plans for real-estate agencies, starting in Mar del Plata. Differentiator: walk the property before going, book without calling.
   - Role: Full-stack 3D / PropTech · Interview weight: high · Targets: Zonaprop, Roomix.
   - Stack dev: Docker compose, test 3D models. Staging: Neon branch, Render. Prod: Next.js + Three.js/R3F, WebXR, NestJS, Claude agent with calendar tools.
   - v1.0 19 Jun – 15 Jul 2027: listings + 3D tour.
   - v2.0 16 Jul – 10 Aug 2027: WebXR AR + visit-booking agent (base for the Airbnb v2 showcase). [foreground review: personal data]
   - v3.0 11 Aug – 6 Sep 2027: plans for agencies, metrics panel, security hardening. [foreground review: money, security]

From 7 Sep 2027 the secondary track is free: "pick next secondary" in the Sunday review of 29 Aug 2027.
Backlog "Ver a futuro": Agentes para pymes ⭐ · Finanzas personales Argentina ⭐ · Copiloto de búsqueda laboral ⭐ · Trazo Pro · Consorcios/expensas · Coach de entrenamiento.

## 12. COMMERCIAL DATA (23 slots)

| # | Dates | Host window | Showcase | What gets built | Wow moment | Reuses |
|---|---|---|---|---|---|---|
| 1 | 2026-12-10 → 2026-12-20 | Cert V1 + English E#1 | Aquasol and water parks | New premium web, 3D park, live lines and weather (simulated), demo tickets, AR | Fly over the park | PetrIA Three.js |
| 2 | 2026-12-31 → 2027-01-14 | Cert V2 + English E#2 | Cinemacenter | Listings, 3D seat picker, Claude recommender | See the screen from your seat | PetrIA agent |
| 3 | 2027-01-15 → 2027-02-03 | Math W1 | miboletería | Ticketing with 3D stadium map, virtual queue, alerts | Queue survives a simulated spike (no real LLM) | HandyX BullMQ |
| 4 | 2027-02-04 → 2027-02-18 | Cert V3 + English E#3 | McDonald's | Voice ordering, 3D menu, Lucero-style games | Build the combo by talking | HandyX voice |
| 5 | 2027-03-03 → 2027-03-17 | Cert V4 + English E#4 | Supermarkets | Smart list with Claude, recipes from what you have, comparator with simulated prices | Fridge photo → list | HandyX vision |
| 6 | 2027-04-03 → 2027-04-12 | Cert V5 + Job search E#5 | SportClub and gyms | Member app, class booking, AI routine coach, occupancy per branch (simulated) | See which branch is empty now | Antena realtime |
| 7 | 2027-05-01 → 2027-05-09 | Cert V6 | Car dealerships | 3D configurator, test-drive agent, financing simulator | Spin the car and change its color | JulIA R3F |
| 8 | 2027-05-10 → 2027-05-17 | Cert V7 | Balnearios | Tent booking on a 3D beach map, weather and tides, season payment | Pick your tent on the map | Aquasol map |
| 9 | 2027-05-18 → 2027-05-29 | Cert V8 + Job search E#6 | Theaters / season | Season listings, 3D seats, play-recommending agent | Walk the room before buying | Cinemacenter seats |
| 10 | 2027-05-30 → 2027-06-18 | Math W2 | Pharmacies | Stock per branch (simulated), reminders, assistant that never diagnoses and refers | Find the medicine at the nearest branch | VitalIA rules |
| 11 | 2027-07-16 → 2027-08-01 | Job search + Math W3 | Airbnb v2 | Stays with 3D/AR tour, booking agent | Stand in the living room before booking | Roofy v2 AR |
| 12 | 2027-09-07 → 2027-09-19 | Job search + Consolidation | Football clubs | Member app, digital card, 3D stadium, clips, no real crests | Sunday's goal already cut vertical | Clip Studio |
| 13 | 2027-09-20 → 2027-09-24 | Math W4 | Hotels and tourism | Landing, 3D tour, multilingual AI concierge | Ask the hotel in your language | Airbnb v2 |
| 14 | 2027-11-12 → 2027-11-21 | Job search E#7 + stage close | Restaurants and breweries | 3D menu, QR + voice ordering, booking agent | Order the pint by talking | McDonald's voice |
| 15 | 2027-11-22 → 2027-11-29 | Math WQ1 | TO DEFINE | | | |
| 16 | 2028-01-07 → 2028-01-16 | Math WQ2 | TO DEFINE | | | |
| 17 | 2028-02-10 → 2028-02-24 | CKS + Job search E#8 + Math WQ3 | TO DEFINE | | | |
| 18 | 2028-03-23 → 2028-04-15 | AWS Security + Job search E#9 + stage close | TO DEFINE | | | |
| 19 | 2028-04-16 → 2028-04-25 | Math WA1 | TO DEFINE | | | |
| 20 | 2028-05-14 → 2028-05-21 | Math WA2 | TO DEFINE | | | |
| 21 | 2028-06-16 → 2028-06-25 | Math WA3 | TO DEFINE | | | |
| 22 | 2028-07-11 → 2028-07-21 | Job search + Math WA4 | TO DEFINE | | | |
| 23 | 2028-08-10 → 2028-08-30 | SA Pro + Job search E#10 + Math WA5 | TO DEFINE | | | |

No commercial slot during PNPT or inside a principal project block. "TO DEFINE" slots: empty period cards with "pick a brand"; reminder 14 days before each.

## 12b. One-off reminders (new in v12.2)
- 2026-11-26: Start HandyX v1.0 in the background (separate repo).
- 2026-12-03: Prepare the Aquasol brief for slot #1 (starts 10 Dec).
- 2027-02-01: Secondary handover: HandyX → JulIA. Check HandyX reached v3.0 or log what's left.
- 2027-04-10: Secondary handover: JulIA → Clip Studio. Check JulIA reached v3.0 or log what's left.
- 2027-06-15: Secondary handover: Clip Studio → Roofy. Check Clip Studio reached v3.0 or log what's left.
- 2027-08-29: Pick the next secondary from "Ver a futuro".
- 7 days before every commercial slot: prepare its brief (hook, wow moment, reuse).
