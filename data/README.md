# data/

Los datos de Trazo, commiteados a mano desde la app.

- `days/AAAA-MM-DD.json`: el cierre de cada día. En la app: Hoy → **JSON del día** → Copiar, y se pega en un archivo con ese nombre.

Los demás archivos (`goals.json`, `cards.json`, `activities.json`, `routines.json`, `bimesters.json`) llegan con sus olas; ver `docs/PLAN.md` §5.
- `roadmap.json`: los 18 bimestres de la ruta (16-11-2026 a 15-11-2029) con producto, carriles, ítems por semana y compuertas. Es la fuente de `docs/ROADMAP.md`: editá el JSON y corré `npm run roadmap:md`.
- `bimesters.json`: nombre, fechas, producto, industria y perfil de cada uno de los 18 bimestres.
