# data/

Los datos de Trazo, commiteados a mano desde la app.

- `days/AAAA-MM-DD.json`: el cierre de cada día. En la app: Hoy → **JSON del día** → Copiar, y se pega en un archivo con ese nombre.

Los demás archivos (`goals.json`, `cards.json`, `activities.json`, `routines.json`, `bimesters.json`) llegan con sus olas; ver `docs/PLAN.md` §5.
- `roadmap.json`: los 18 bimestres de la ruta (16-11-2026 a 15-11-2029) con producto, carriles, ítems por semana y compuertas. Es la fuente de `docs/ROADMAP.md`: editá el JSON y corré `npm run roadmap:md`.
- `bimesters.json`: nombre, fechas, producto, industria y perfil de cada uno de los 18 bimestres.
- `study-roadmaps.json`: los roadmaps de estudio por frente (hoy, matemática M0 a M10). Cada fase tiene libro núcleo, complementarios con su rol (complementario, banco de ejercicios, curso, referencia), bloques, proyecto y criterios de salida. Se valida al cargar (`src/data/study-roadmap.ts`) y los tests fallan si algo no cierra. Para sumar otro roadmap (programación, inglés…), se agrega un elemento a `roadmaps` con el mismo formato.
