# Trazo 2.0 · UX/UI plan (v2 of the plan)

Status: proposal, waiting for "go". Nothing here changes data or progress; P0 (Constelación v1) goals are untouched.

## 0. Why: the audit in numbers

Captured 100 screens at 390×844 (23 Nov 2026, 09:30 BA), plus light mode and 1440 desktop.

- **Too much text.** Median screen: 200 words, ~115 above the fold. The intro paragraph under the title has a median of
  20 words, and 19 of 90 screens open with 35+ words. Wordiest: `cierre` 848, `metas/periodos/P1` 811, `metas/roadmap` 674,
  `metas/mapa` 649, `metas/periodos` 586, `entreno-motor` 461, `metas/pista/comercial` 446. Above the fold: `metas/mapa` 411,
  `metas/open-source` 206, `ajustes-rutinas` 196, `metas/periodos` 191, `metas/clipping/plan` 188, `hoy` 179.
- **Confusing structure.** Nine views of the same plan (Ruta, Etapas, Mapa, Períodos, Roadmap, Línea, Impacto, Diferencia,
  Calibración), each with a different "back" label. The top-right slot is sometimes info, sometimes a link.
- **False affordances.** Settings icon looks like a sun (theme toggle); habit "○" looks tickable but isn't; disabled buttons
  look primary; tilted highlighter has no single meaning; bars in the timeline are links with no hint.
- **One color, two meanings.** Red = Inglés + late + today; green = Salud + success; purple = HandyX + background + "new card";
  blue = programming + links.
- **Inconsistency.** 73 font sizes, 10 radii, 4 button styles, browser-blue links, one emoji (🧲).
- **No motion.** 5 transitions and 5 keyframes in 3,325 lines of CSS. No screen transitions, skeletons or rewards.
- **Bugs.** Overlapping Unidades tabs; duplicated "Cert window 8. Cert window 8."; truncated date field; AM/PM time fields;
  "1 días"; "Día 00 de El despegue"; weight sheet follows you everywhere; theme ignores the system; black splash looks frozen.
- **Desktop/light** are afterthoughts (stretched phone column; light mode not applied from system).

Score today: ~5.5/10. Strengths to keep: Archivo + mono type, area colors, the tilted highlighter on the bottom bar,
Clipping's charts, Entreno motor bars, the "Buen día" modal, the depth of the data.

## 1. The v2 switch: build 2.0 while you keep using 1.0

- **Setting**: `settings.interfaz: 'v1' | 'v2'` (missing = `v1`, additive migration). In Ajustes: section **Interfaz** with
  a segmented control **1.0 · actual | 2.0 · en construcción**, and under it the list of screens already ready in 2.0.
- **Same data**: both versions read and write the same store. Switching never loses or duplicates anything; any new field
  is additive and optional.
- **Code**: everything new lives in `src/v2/` (screens, kit, styles scoped under `html[data-ui="v2"]`) and is lazy-loaded,
  so 1.0 doesn't download it.
- **Per-screen fallback**: in 2.0, routes with a v2 screen render it; the rest render the 1.0 screen inside the 2.0 shell,
  with a small "1.0" chip in the header so you know it's not converted yet.
- **Safety**: an error boundary drops a failing v2 screen back to its 1.0 version; `?ui=1` in the URL forces 1.0; the switch
  exists in both versions' Ajustes.
- **Tests/CI**: 1.0 tests stay as they are; v2 gets its own; screenshots capture both modes side by side.
- **End**: after Wave 3, 2.0 becomes the default (your call), 1.0 stays one cycle behind the switch, then it's removed (your call).

## 2. Principles (the definition of 10/10)

1. **Three questions per screen**: Where am I? How am I doing? What do I do next? Answered above the fold, in that order.
2. **Text diet** (enforced by a script in CI for v2 screens):
   - Intro under the title: max 12 words, or none.
   - Max 60 words above the fold (Today: 60; today it's 179).
   - Explanations move to an **ⓘ sheet** ("Cómo funciona esta pantalla"); rules and long fichas go into tabs or folds.
   - Numbers over sentences; every number has a label; when Trazo has something to say, it's one line of insight.
3. **One hero per screen**: the number or object that matters, big and alive.
4. **Goals as objects**: ring for % done, pace track for time vs work (you vs a ghost marker), forecast date, calm status.
5. **One meaning per color**: area colors ≠ status colors; status always = icon + word, never color alone.
6. **Honest affordances**: if it looks tappable it is; if it's tappable it looks it. Icons are labelled unless universal.
7. **Motion with meaning**: zoom between plan levels, count-up numbers, completion bursts, skeletons, respects reduced motion.
8. **One system**: 8-step type scale, 4 pt spacing, 3 radii, 4 surface depths, one icon set, 3 button variants.

## 3. New structure (2.0 only; 1.0 routes stay)

- **Hoy**: Now card → day timeline → habits → close the day. Tools (Pomodoros, JSON, Importar, Adaptar) in one "⋯" sheet.
- **Plan** (replaces the 9 plan views): one hub with three lenses — **Ahora** (the active period cards, zoom
  Etapa → Fase → Bloque → Versión → Lote), **Línea** (timeline), **Mapa** (3D constellation). **Análisis** sub-page holds
  Calibración, Diferencia and Impacto. Semana / Mes / Bimestre / Año become a zoom control, not separate tabs.
- **De fondo** hub: Pistas (secundaria, comercial), Open source, Imán, Clipping.
- **Estudio**: roadmaps → book → chapter; Repaso and Puntos débiles as one "Repasar" area.
- **Entreno**, **Perfil** (Avance, logros, Ajustes as a labelled row and button).
- Breadcrumb is a compact path; "back" always goes to the parent in the hub.

## 4. Decisions (answered 22 Nov 2026)

1. Screen-height budget for v2 screens: **~4 screens** (1.0 keeps 3.2).
2. **three.js** for the constellation (lazy, only on that screen). **Custom SVG icons** drawn for Trazo (no icon library).
3. Theme: **dark is the signature; light is a full second theme**, both follow the phone by default.
4. **No fixes in 1.0.** Every clarity fix (gear, tabs, cert texts, 24 h, wording, weight check, theme, splash) lands in 2.0 only.
5. Components and animations get their own batches: every control, toast, sheet and transition is rebuilt.

## 5. Roadmap: three waves

**Model rule**: Fable 5.2 for visual craft (art direction, icons, hero screens, 3D, anatomy, illustrations); Opus 5.5 for hard
engineering (gestures, motion choreography, the Plan hub) and the final review; Sonnet 5.5 for plumbing and applying the kit;
Haiku 5.5 for scripts. Totals: Fable 8 · Opus 4 · Sonnet 6 · Haiku 1.

Each wave = one PR with before/after screenshots (both modes), small commits, tests green, 2.0 off by default until you flip it.

### Wave 1 · Foundations, components, motion and the switch

| Batch | What | Model | Effort |
|---|---|---|---|
| 1.1 | ✅ **The 2.0 switch & architecture**: `settings.interfaz` + additive migration, Ajustes "Interfaz", `src/v2/` lazy bundle, route resolver with per-screen fallback and "1.0" chip, error boundary, `?ui=1`, tests | Sonnet 5.5 | medium |
| 1.2 | ✅ **Design language + writing rules**: art direction, tokens (8-step type scale, 4 pt spacing, 3 radii, 4 surface depths, grain/glow), area colors ≠ status colors, dark + light themes, copy guide + glossary, word budgets, the new structure | Fable 5.2 | high |
| 1.3 | ✅ **Custom SVG icon set** (~50, one stroke grid, each checked against what people expect: a real gear for settings, a dumbbell for Entreno…) + the illustration style for empty states | Fable 5.2 | medium |
| 1.4 | ✅ **Controls**: Button (primary / secondary / ghost / destructive, icon button, loading + disabled with reason), check button with drawn tick, switch, segmented, chips, stepper, text field, 24 h time picker, date picker, select sheet | Opus 5.5 | medium |
| 1.5 | ✅ **Feedback & surfaces**: Toast (stacked, undo, swipe away, success/warning/error), bottom sheet (drag, snap points), confirm dialog, ⓘ InfoSheet, tooltip, skeleton loaders per layout, empty state, Ring, PaceTrack, progress bar, StatusPill, Stat (always labelled), Card/Surface, list row | Opus 5.5 | high |
| 1.6 | ✅ **Motion system**: duration/easing tokens, screen transitions (View Transitions + GSAP fallback), zoom between plan levels, staggered fades, count-up numbers, press feedback, completion burst, toast/sheet springs, skeleton shimmer, reduced motion | Opus 5.5 | high |
| 1.7 | ✅ **2.0 shell**: glass bottom bar with sliding indicator, large title that collapses on scroll, breadcrumb, ⓘ entry, Ajustes 2.0 (gear + labelled row), theme follows the phone, new splash + onboarding, weight check as a Today card (no sheet chasing you), desktop 2-column layout | Fable 5.2 | high |
| 1.8 | ✅ **QA harness**: capture script for both modes + contact sheets, word-budget script, ~4-screen height budget, token lint (no raw hex/px in v2), component gallery page `#/v2/kit` | Haiku 5.5 | medium |

Demo: flip to 2.0 in Ajustes → new shell, Ajustes, splash and the component gallery; other screens show their 1.0 version with the "1.0" chip.

### Wave 2 · The daily core: Hoy, Plan, Estudio

| Batch | What | Model | Effort |
|---|---|---|---|
| 2.1 | ✅ **Hoy 2.0**: Now card with live countdown ring and what's next; day ring; timeline with a "now" line and labelled sub-goal rings; habits with real check buttons and 7-day dots; background work as chips; tools in one "⋯" sheet; "Cerrar el día" as a ritual. ≤60 words above the fold (now 179) | Fable 5.2 | xhigh |
| 2.2 | ✅ **Plan hub + GoalCard**: one card for every period (ring + pace track + forecast + calm status), zoom Etapa → Lote with shared-element transitions, Semana/Mes/Bim/Año as zoom, Análisis page. Replaces 9 views | Opus 5.5 | xhigh |
| 2.3 | ✅ **Línea 2.0 + 3D constellation**: pinch-zoom, sticky lanes, tappable bars with hints, glowing today; three.js constellation (the plan as a spiral: one turn per phase, blocks as stars that light up), loaded only there, with a flat SVG map as instant placeholder and fallback | Fable 5.2 | xhigh |
| 2.4 | ✅ **Project, cert and version pages + De fondo hub**: cover hero per project (generated SVG art), tabs Resumen / Ficha / Stack (P1: 811 words today), versions as a stepper, cert countdown (fixed date field, no duplicated subtitle), Open source as package cards, Imán as an 8-segment ring, Pistas as cards | Sonnet 5.5 | high |
| 2.5 | **Estudio 2.0**: roadmaps as a subway map, book tabs that fit (no overlap), chapter heatmap, review cards that flip, review forecast, illustrated 4-step "Cómo funciona", Repasar area | Sonnet 5.5 | high |

### Wave 3 · Body, self, everything else, launch

| Batch | What | Model | Effort |
|---|---|---|---|
| 3.1 | **Entreno 2.0 with anatomy**: custom SVG body front/back lighting the muscles each session trains + weekly volume heat; session player (sets as bars, rest-timer ring); weight curve; the motor explained by the graphic (now 461 words) | Fable 5.2 | xhigh |
| 3.2 | **Perfil, Avance, Cierre**: identity card with level ring, medals with sheen, year heat map; Cierre (848 words) as 3 swipeable cards; Presentation mode as a "Wrapped"-style recap | Fable 5.2 | high |
| 3.3 | **Sweep of the remaining ~45 screens** onto the kit: Clipping (10), Ajustes sub-pages, Rutinas (24 h pickers), JSON/Importar, Pomodoros, Revisión, Compras, Calibración… one floating action per screen | Sonnet 5.5 | medium |
| 3.4 | **Empty states + illustrations + final copy pass**: ~15 custom line illustrations, day-0 states that invite action, every screen within the word budget, wording bugs ("1 días", "de El") | Fable 5.2 | medium |
| 3.5 | **Performance, accessibility, launch**: Lighthouse ≥ 95, bundle budget, AA contrast in both themes, reduced motion, before/after gallery, docs; then you decide when 2.0 becomes the default | Sonnet 5.5 | high |
| 3.6 | **Final review** of the whole 2.0 diff (correctness, accessibility, motion, both themes) before it becomes the default | Opus 5.5 | high |
