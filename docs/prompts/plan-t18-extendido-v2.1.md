# Plan T+18 · cambio v2.1: tecnologías de los proyectos

Pedido que pasó Toti el 2026-11-18, sobre el prompt v2 ya aplicado (`plan-t18-extendido-v2.md`). Es la fuente de la **ola 26** (§6 octies de `docs/PLAN.md`). **No cambia fechas ni duraciones: solo el contenido de los proyectos.**

## Cambios por proyecto

**P0 Portfolio hub**
- Añadir: caso de auditoría y refactor de una app generada con IA (informe de hallazgos y arreglos).
- Cambiar: el RAG para negocios pasa a usar otro dominio con datos de muestra, no CompliA.

**P1 Faro v1**
- Añadir: LangGraph (agente analista con herramientas), evals (set de preguntas de referencia y métrica de aciertos), cola asíncrona (RabbitMQ o SQS) para la ingesta, conector a una API de terceros en sandbox.
- Quitar: DuckDB y Parquet (pasan a P5). La consola Electron usa SQLite local.
- Tecnología nueva del proyecto: LangGraph. Las demás son parte del trabajo, no "nuevas".

**P2 Escudo**
- Añadir: despliegue en Azure con Azure OpenAI, publicación de la app mobile en versión de prueba (TestFlight o Play interno), revisión de accesibilidad.
- Mantener: .NET con FHIR (C# y ASP.NET Core) y el gateway en Go. La tecnología nueva del proyecto queda en .NET.
- Quitar: vLLM y LoRA (pasan a P8).

**P3 Surco v1**
- Añadir (opcional): GraphQL en el backoffice de Rails.
- El resto queda igual.

**P5 Faro v2**
- Añadir: DuckDB y Parquet (vienen de P1).

**P8 Red teaming de agentes**
- Añadir: vLLM y LoRA (vienen de P2): atacar un modelo propio y medir evals y guardrails.

**Sin cambios:** P4, P6, P7, P9, P10 y las etapas 2, 3 y 4.

**No agregar:** Django, Supabase, CRM/ERP y APIs de bolsa. Se registran como "descartado por ahora" con el motivo.

## Reglas para el modelo de datos

- Cada proyecto tiene una lista de tecnologías y una marca de cuáles son "nueva", "reusada" o "movida".
- Historial de cambios con fecha y motivo en cada proyecto afectado.
- Validador con tests: ninguna tecnología duplicada dentro de un proyecto, máximo una "nueva" por proyecto, y las tecnologías movidas aparecen solo en su destino.
- Recortes si P1 o P2 se pasan de horas: primero accesibilidad y el conector de terceros.

## Tabla de demanda (vista nueva)

- Columnas: tecnología, cuántas vacantes la piden, proyecto que la cubre y fecha estimada.
- Se pueden cargar vacantes nuevas con su stack (pegando texto o JSON) y la tabla se actualiza.
- No se inventan datos de mercado: solo se cuenta lo que se cargue.

## Decisiones (2026-11-18)

1. Los pares que la v2 trae como una sola tecnología nueva ("PostGIS y STAC", "Kafka y autoencoders"…) quedan como un único ítem nuevo. P3: Rails es la nueva; "gradient boosting y predicción conforme" queda sin marca.
2. Lo que no lleva marca es "parte del trabajo del proyecto"; "reusada" es lo que viene de un proyecto anterior.
3. Motivos de lo descartado (propuestos por Claude, aceptados): Django (el backend Python ya lo cubre FastAPI), Supabase (Postgres, auth y vectores ya están con Spring Security y pgvector), CRM/ERP (fuera de los rubros del plan), APIs de bolsa (la etapa 3 usa paper trading y datos propios; el capital real queda detrás de su puerta).
4. **"Complia Pro" también se saca del `roadmap.json` viejo** y de los bimestres: el producto del bimestre 1 pasa a ser el del P0, el Portfolio hub.
