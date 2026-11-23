# Trazo

Tracker personal: el día en horas, el estudio con su propio motor de repaso, las metas, el entreno en pareja y el peso. PWA instalable.

- Plan y fuente de verdad: [`docs/PLAN.md`](docs/PLAN.md)
- Interfaz y lenguaje de diseño: [`docs/ux/lenguaje-2.0.md`](docs/ux/lenguaje-2.0.md) (todo el código de pantallas vive en `src/v2/`)
- Roadmap de 18 bimestres (2026-2029): [`docs/ROADMAP.md`](docs/ROADMAP.md), generado desde `data/roadmap.json`
- Sitio: https://toti-gauna.github.io/personal-tracker/

```
npm install
npm run dev        # desarrollo
npm run typecheck  # tipos
npm test           # tests
npm run build      # build de producción
npm run peso       # presupuesto de peso del build (el CI lo verifica)
npm run icons      # regenera los PNG desde public/trazo.svg
npm run roadmap:md # regenera docs/ROADMAP.md desde data/roadmap.json (el CI lo verifica)
```

Con la app servida (`npx vite preview --port 4173`) y Playwright instalado:

```
npm run v2:revision  # cada pantalla en claro y oscuro: presupuesto de palabras y alto, capturas en revision-v2/
npm run a11y         # axe-core (WCAG 2.1 AA) en cada pantalla, en claro y oscuro
```
