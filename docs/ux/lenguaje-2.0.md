# Trazo 2.0 · design language: "Instrumento"

Batch 1.2 of `docs/prompts/plan-ux-2.0.md`. This is the contract every 2.0 screen and component follows.
Live specimen: turn on 2.0 in Ajustes → Interfaz, then open `#/v2`.

Code: `src/v2/tokens.css` (tokens, dark + light) · `src/v2/base.css` (type roles, surfaces, the mark) ·
`src/v2/reglas.ts` (word budgets, status vocabulary, glossary) · `src/v2/tokens.test.ts` (contrast and system checks).

## 1. The idea

Trazo is a precision instrument with one hand-made gesture: the highlighter stroke of the logo.
The instrument part is calm: dark layered surfaces, mono labels, exact numbers. The stroke is the only loud thing,
and it means exactly two things: **you are here** and **this is done**. Finishing something draws the stroke.

Kept from 1.0: Archivo for titles, Geist + Geist Mono, the paper/ink feel, the dot grid, the bevelled highlighter.
Changed: depth instead of outlines, one meaning per color, three radii, eight type sizes, far fewer words.

## 2. Color

### Surfaces: depth is light, not borders
| Token | Role | Dark | Light |
|---|---|---|---|
| `--capa-0` | the table (page) | `#0c0d0e` | `#f3f2ec` |
| `--capa-1` | cards | `#141517` | `#faf9f5` |
| `--capa-2` | controls, nested cards | `#1c1e20` | `#ffffff` |
| `--capa-3` | what floats (sheets, toasts, menus) | `#26282b` | `#ffffff` + shadow |

Lines are hairlines (`--raya`), used to separate rows inside a card, not to draw boxes. `--raya-fuerte` only where a
boundary carries meaning (an outlined status pill, a focused field). Big hero surfaces get `--halo` (the area color
entering from a corner) and `--grano` (fine noise) so they don't look like flat plastic.

### Text
| Token | Use | Contrast on any layer |
|---|---|---|
| `--texto` | everything you read | ≥ 7:1 (AAA) |
| `--texto-2` | secondary: labels, notes, metadata | ≥ 4.5:1 (AA) |
| `--texto-3` | decorative or disabled only, never information | ≥ 3:1 |

### The mark
`--trazo` `#f1e34c` (the logo yellow). Fill only, with `--sobre-trazo` ink on top. As text use `--trazo-texto`.
Allowed uses: the active tab, "now" markers, the today marker, completed state, the one primary highlight of a hero.
Never: decoration, section labels, area marking, warnings.

### Areas: where something belongs, nothing else
`--a-ing` `--a-handyx` `--a-eclipse` `--a-salud` `--a-rutina` `--a-economia` `--a-idi`. Same notebook hues as 1.0,
equalised in lightness so none shouts. They appear as a small square dot (`.area-punto`), a thin accent, or the halo of
that area's hero. They never color a checkbox, a status, a link or a whole card.

### Status: form first, one signal color
A status is always **icon + word**, and its *shape* carries the tone (see `ESTADOS` in `reglas.ts`):

| Tone | Statuses | Shape |
|---|---|---|
| neutral | Próximo · En plan · Adelantado · En pausa | outlined pill, secondary text |
| attention | Atrasado | solid pill in the text color (no hue) |
| critical | Vencido | solid pill in `--e-critico`, the only red in the app |
| done | Hecho | the bevelled stroke in `--trazo` |

Rules: red is reserved for "Vencido" and destructive actions. "Today" is the mark, never red. Positive numbers are not
green (green is Salud): they use an arrow and the text color. With seven area hues there is no room for more signal
hues, so nothing may rely on color alone; the test checks that no two colors sit closer than 0.07 in OKLab.

## 3. Type: eight sizes, eight roles

| Class | Size | Face | Use |
|---|---|---|---|
| `.t-heroe` | 44 | Archivo 900, wide | the one number or word that is the hero of a screen |
| `.t-titulo` | 32 | Archivo 900, wide | screen title (1.0 used 44; collapses to 17 on scroll) |
| `.t-seccion` | 24 | Archivo 800 | card hero, section title |
| `.t-encabezado` | 20 | Geist 650 | row and card headings |
| `.t-cuerpo-l` | 17 | Geist 450 | primary reading text, list titles |
| `.t-cuerpo` | 15 | Geist 400 | default text |
| `.t-nota` | 13 | Geist 400, secondary | notes, metadata |
| `.t-rotulo` | 11 | Geist Mono 500, uppercase | labels; the smallest text allowed |

`.t-dato` makes numbers mono and tabular at the surrounding size. Nothing below 11 px; body text never below 13.
1.0 had 73 different sizes.

## 4. Space, shape, size

- **Space**: multiples of 4 — `--sp-1…9` = 4, 8, 12, 16, 20, 24, 32, 40, 56. Page margin `--margen` 20 (16 under 360 px).
- **Radii**: `--r-s` 8 (controls), `--r-m` 14 (cards, buttons), `--r-l` 22 (heroes, sheets), plus the pill. 1.0 had 10.
- **The bevel**: `--bisel`, the parallelogram of the highlighter. Reserved for the mark.
- **Touch**: every tappable thing is at least `--toque` 44 px tall.
- **Height**: a screen fits in 4 phone screens.

## 5. Motion (`src/v2/movimiento/`, demo at `#/v2/movimiento`)

- Durations: `--dur-1` 120 ms (press), `--dur-2` 200 ms (state), `--dur-3` 320 ms (enter, the stroke), `--dur-4` 520 ms (screen, hero).
- Curves: `--curva-salida` (things arriving), `--curva-ida-vuelta` (things moving), `--curva-resorte` (celebration only).
- Signature: the stroke wipes in from the left (`.trazo-marca.entra`).
- Reduced motion: movement becomes a 150 ms fade; nothing loops.
- Motion must explain something: where a screen came from, what just changed, what you just finished.
- The spring (`CURVA.resorte`) is a real spring (stiffness 170, damping 18) sampled as CSS `linear()`: 4.7 % overshoot.

**Screen transitions.** Every internal link inside a 2.0 screen navigates through `navegar()` (installed globally by
`CapasV2`), using the View Transitions API with a Web Animations fallback. Direction comes from the route shape
(`inferirTransicion`): deeper = slides in from the right, back = from the left, siblings and sections = fade. A link can
force one with `data-transicion` (`zoom-in` / `zoom-out` / `fundido`…) or opt out with `data-sin-transicion`. The bottom
bar keeps its own `view-transition-name`, so it never moves. Browser back still animates (hashchange fallback).

**Shared-element zoom.** Give the card and the destination hero the same `viewTransitionName`
(`nombreTransicion(id)`): the card grows into the hero and shrinks back on return.

**Pieces.** `<Numero>` counts up from the previous value (screen readers get only the final value); `<Escalonado>` /
`escalonar()` brings children in 40 ms apart (capped at 8); `festejar(el)` fires stroke-yellow shards and a spring pulse
(used by `Casilla` when ticked; reduced motion = pulse only); `haptico()` gives a short vibration where supported.

## 6. Icons and illustrations (`src/v2/iconos.tsx`)

24 px grid, 1.75 stroke, round caps and joins, no fills except the mark. One metaphor per meaning, checked against
what people expect (a gear is settings, a sun is theme). An icon without a universal meaning carries a text label.
No emoji in the interface.

66 icons: `<Icono nombre="ajustes" />` (24 by default, 20 in dense rows, 16 inside a pill). Pass `titulo` only when the
icon stands alone; next to a word it is decorative. The gear is generated (8 teeth) so it can never read as a sun.

Empty-state illustrations: `<Ilustracion nombre="plan" />`, 120 × 96, thin line in the tertiary text color plus exactly
one yellow stroke. Always paired with one line and one action.

## 7. Writing

Spanish, rioplatense, voseo. Direct, warm, no guilt, no exclamation marks. The plan's own content stays as authored
(lot and version names in English); everything around it is Spanish.

**Budgets** (`PRESUPUESTO`, checked on every PR from batch 1.8):

| What | Limit |
|---|---|
| Screen title | 3 words, a noun, never a sentence |
| Line under the title | 12 words, or none |
| Visible before scrolling | 60 words |
| Button | 3 words: verb + object ("Guardar peso") |

**Rules**
1. Every screen answers, in order: where am I, how am I doing, what do I do next.
2. Show, don't explain. How a screen works lives in its ⓘ sheet, not under the title.
3. Every number has a label and a unit: "2 de 3 pasos", "193,5 h", "en 8 días".
4. Numbers: comma decimals, space before %, 24 h times ("04:00"), dates "23 nov", ranges "21 nov – 9 dic".
5. When Trazo has something to say, it is one line: "Vas 2 días atrás: hoy tocan 3 lotes."
6. Empty state = what this is + one action. Never just "Todavía no hay…".
7. A disabled button says why, right under it.
8. Errors: what happened + what to do. Data is safe unless said otherwise.
9. Singular and plural are real: "1 día", "2 días". Contractions too: "del", "al".
10. No jargon without the glossary: `GLOSARIO` maps each 1.0 term to its 2.0 wording and its ⓘ explanation
    (T+18 1/52 → "Semana 1 de 52", Día 00 → "Día 1", 0 seguidas → "Racha: 0", tiempo/trabajo → "Ritmo"…).

Example (Períodos): 37 words under the title in 1.0 → "Tu plan, de la etapa al lote." (7).

## 8. Structure (2.0 only; 1.0 routes stay)

| 2.0 home | Holds (1.0 routes) |
|---|---|
| **Hoy** | hoy, cierre; tools sheet "⋯": pomodoros, json, importar, ajustes-rutinas/hoy |
| **Plan** · Ahora | metas/periodos (+ drill-down), metas/ruta, metas/etapas, metas/proyecto, metas/cert, metas/ventana; week/month/bimester/year as zoom |
| **Plan** · Línea | metas/linea |
| **Plan** · Mapa | metas/mapa, metas/roadmap (3D constellation) |
| **Plan** · Análisis | metas/calibracion, metas/diferencia, metas/impacto, metas/evolucion, metas/revision |
| **De fondo** | metas/pista/*, metas/fondo/*, metas/open-source, metas/iman/*, metas/clipping/* |
| **Estudio** | estudio/*, unidades, como; "Repasar": repaso, flojo, tarjetas, motor |
| **Entreno** | entreno* |
| **Perfil** | perfil, avance, logro, ajustes* |

Navigation rules: "back" always goes to the parent in this table; the top-right corner holds actions only (never
metadata); one floating action per screen at most; the breadcrumb is a compact path, not underlined links.

## 9. Do / don't

| Do | Don't |
|---|---|
| One hero per screen | A title, a paragraph and a list on every screen |
| Layers to group | Boxes inside boxes with outlines |
| Area as a dot | Area color on checkboxes or whole cards |
| Status as icon + word + shape | Status by color alone; red for "today" |
| The stroke for here/done | The stroke as decoration |
| ⓘ for explanations | Manuals under the title |
| Buttons that look like buttons | Underlined words inside sentences as actions |

## 10. Controls (`src/v2/kit/controles.tsx`, gallery at `#/v2/kit`)

| Control | Notes |
|---|---|
| `Boton` | primario (one per screen) · secundario · fantasma · peligro; `tamano="s"`; `soloIcono` + `etiqueta`; `cargando`; `deshabilitado="motivo"` shows the reason under it and keeps the button focusable (`aria-disabled`) |
| `Casilla` | whole-row checkbox; done fills with the stroke yellow and draws the tick; area is a dot, never the fill |
| `Interruptor` | whole-row switch, for settings only (not for "done") |
| `Segmentado` | radio group with a sliding indicator; arrow keys move |
| `Chip` | toggle (`aria-pressed`); active = solid text color with a tick |
| `Contador` | − value +, editable, comma decimals, min/max, `inicial` when empty |
| `CampoTexto` | label above, note or error below (error replaces the note), optional icon and counter |
| `CampoHora` | always 24 h: hour and minute boxes, typing jumps to minutes, arrows wrap the day |
| `CampoFecha` | "23 nov 2026"; month grid Monday-first; today ringed, chosen gets the stroke; min/max |
| `Selector` | opens a list from the bottom (the real sheet arrives in 1.5); Escape or the veil closes |

## 11. Feedback and surfaces (`src/v2/kit/`, gallery at `#/v2/piezas`)

| Piece | Notes |
|---|---|
| `aviso()` | toast from anywhere; stacks up to 3 above the bottom bar; 4 s (6 s with `deshacer`); pauses on hover/press; swipe sideways to dismiss; tones info · hecho (stroke) · atencion · error (`role="alert"`) |
| `confirmar()` | promise-based alert dialog; with `peligro` the focus starts on Cancelar and the action is solid red; Escape or the veil = no |
| `Hoja` | bottom sheet in a portal; drag the handle down to close (120 px or a flick), up to expand; Escape; focus trapped and restored; page scroll locked |
| `Info` / `Termino` | the ⓘ button that opens a sheet with the explanation; `Termino` pulls it from the glossary |
| `Pista` | tooltip on hover/focus, long-press on touch |
| `Tarjeta` | layer 1/2, or `heroe` with the area halo; with `href` the whole card is a link |
| `Fila` | whole-row link or button with icon or area dot, value, chevron only when it goes somewhere |
| `Dato` | number + unit + label, always; change shown with an arrow, never green/red |
| `Estado` | status pill from `ESTADOS` (icon + word + tone shape) |
| `Anillo` | progress ring that draws in; full = the stroke yellow |
| `Ritmo` | replaces 1.0's two hairline bars: work as the bar, elapsed time as a dashed ghost marker, plus one sentence |
| `Barra` | thin progress bar (`role="progressbar"`) |
| `Esqueleto`, `EsqueletoTarjeta`, `EsqueletoLista`, `ConCarga` | shimmer placeholders while loading, then a fade-in; container is `aria-busy` |
| `Vacio` | illustration + title + note + one action |

`CapasV2` (toasts + confirm host) is lazy-loaded by App only when 2.0 is on.

## 12. The frame (`src/v2/marco/`)

- **`GlobalV2`**: one lazy chunk App mounts only with 2.0 on: navigation, toasts + confirm, screen transitions,
  theme, check-ins. 1.0 downloads none of it.
- **`BarraV2`**: on the phone, a floating glass bar; the yellow stroke slides (spring) to the active section. Tablet
  (720+): a rail. Desktop (1100+): a sidebar with names and Avance. Labels: Hoy · Estudio · Plan · Entreno · Perfil
  ("Metas" is called **Plan** in 2.0; the route is still `#/metas`).
- **`Marco`**: the frame of every 2.0 screen: back link with the parent's name, actions top-right (buttons only),
  kicker or breadcrumb (`migas`), the large title that collapses into the sticky top bar on scroll, the ⓘ (`info`),
  an optional intro (12 words at most). In development it warns when a title or intro goes over budget. `Grupo` is a
  labelled section inside it.
- **Theme**: 2.0 keeps its own preference (`trazo.theme.v2`), default **Sistema** (follows the phone). 1.0 always
  writes "dark" on launch, so its key can't tell a choice from a default; a 1.0 choice of Claro/Sistema carries over.
  Switching back to 1.0 restores 1.0's theme untouched.
- **Splash** (`SplashV2`): tallies drop, the stroke crosses, and a progress line moves, so it never looks frozen.
- **Buen día** (`DespertarV2`): three big options + "Otra hora" + one button; the morning preview lives in a sheet.
  Shows "día 1" on the first day (glossary), not "día 00". The first-run registration stays 1.0 until 2.0 is the
  default (there are no settings yet where 2.0 could be chosen).
- **Ajustes 2.0**: groups of rows; renaming (areas, bimesters) happens in a sheet; `#/ajustes/bimestres` and
  `#/ajustes/plan` are sub-pages (the plan one was rebuilt in batch 3.3, see §21).
- **What 2.0 fixes from outside on screens that are still 1.0**: on Perfil the sun-like settings icon is hidden and
  a labelled **Ajustes** button with the gear sits next to the "1.0" mark; the weight check is a toast with "Cargar"
  (asked once, never a sheet that follows you); toasts jump to the top while a sheet is open.

## 13. Checks (batch 1.8)

- **Token lint** (`src/v2/calidad.test.ts`, runs in `npm test`): no raw colors outside `tokens.css`; no font size
  outside the scale (`--t-*`, or `--t-campo` for fields, which stay at 16 px so iOS does not zoom); no bare element
  selectors that would reach the 1.0 screens. Every 2.0 stylesheet must scope to `html[data-ui='v2']`, `.v2`, or a
  2.0 class.
- **Revision** (`npm run v2:revision`, needs the app served and Playwright): renders every 2.0 screen in light and
  dark at 390 × 844, saves the captures under `revision-v2/` (git-ignored), and writes `informe.md`. It gates the
  2.0 frame (`.m-marco`): title ≤ 3 words, intro ≤ 12, ≤ 60 words above the fold, ≤ 4 screens tall, no sideways
  overflow, no page errors. The taller specimen pages are measured but not gated. Known pending items are listed with
  their reason and don't fail the run.
  Text inside a chart (`data-grafico`: the timeline, the map) is not counted: bar names and axis months are data
  labels, not prose.
- **Dev warnings**: `Marco` logs in development when a title or intro goes over budget.
- **Gallery**: `#/v2/kit`, `#/v2/piezas` and `#/v2/movimiento` are the component gallery; the revision covers all three.

Current result: no failures and no pending items. Since batch 3.3 the revision also fails if any route still shows the 1.0
screen (the "1.0" mark) inside 2.0.

## 14. Hoy 2.0 (`src/v2/hoy/`, batch 2.1)

The first hero screen. It answers the three questions above the fold in 59 words (1.0: 179) and is 2.9 screens tall.

| Where | What |
|---|---|
| Top bar | date and day number on the left; on the right the streak chip (links to Perfil), the bell with the count of alerts, and "⋯" (tools) |
| **Ahora** (hero) | what is running now: a ring with the time left, the goal's name and branch, its steps to tick right there (up to 3), **Entrar en foco**, and "Después" with what follows. If the current goal is done it shows the next one ("Lo próximo"); with nothing ahead it invites to close the day; closed, it shows the XP |
| **Tu día** | ring of goals done, "2 de 14 Metas", and the day's improvement counting up |
| **El día** | the timeline: one row per goal on a rail, the node is a progress ring that becomes the yellow tick when done, the running one has its time highlighted; if the time falls in a gap, a "now" marker sits there. A row shows only the duration (steps appear when half-way); read aloud it says everything |
| Goal sheet | tap any row: steps (tick, edit in place, delete with undo, add), **Dar por hecho** with a note, **Cambiar horario** (24 h, push or shorten what follows; says why when it can't), **Saltear hoy / Volver a hoy**, **Quitar de hoy** for goals added today (asks first) |
| **Plan** | three rows instead of a text box: what is active now, what is due today (opens a list) and the next deadline; background work as chips |
| Bell | every alert in one sheet (cross-branch alerts, exams to book, hardware and paperwork, background reminders), each with "Ver" and its action |
| **Hábitos** | each habit is a goal of the routine: a real button marks it (ticks that goal's steps, with undo), the week as labelled dots, and "Racha: n" |
| **Esta semana** | the weekly counters with a progress bar and a named "+1" |
| "⋯" | Meta para hoy, Adaptar el día, Pomodoros, JSON del día, Importar |
| Desktop | two columns: Ahora, Tu día and Plan on the left; the day on the right |

Behaviour is 1.0's, untouched: the same store actions run (ticking a step, marking done, rescheduling, skipping, adding a
goal, counters), so toasts, sounds, the route sync and the "how did the chapter go?" question still fire. Two additive
hooks in `ui/PlanBits.tsx` (`useAvisosRamas`, `useItemsSemana`) expose 1.0's logic as data. With 2.0 on, 1.0's toasts are
shown as 2.0 toasts through a small bridge (`ponerPuenteAvisos`).

Still 1.0 inside this screen: the clip-logging sheet and the chapter-state dialog (rebuilt with their own screens), and
the destinations of the links (focus, Cierre, Pomodoros, JSON, Importar).

## 15. Plan 2.0 (`src/v2/plan/`, batch 2.2)

"Metas" is **Plan** in 2.0. The hub replaces 1.0's Ruta and Períodos as the entry; the other plan screens stay reachable
from it (and stay 1.0 until their batch). The registry now takes `cubre(ruta)`: Plan covers `#/metas`,
`#/metas/periodos`, `#/metas/periodos/<id>` and `#/metas/analisis`; every other `#/metas/…` shows its 1.0 screen with the mark.

**The goal card** (`TarjetaPeriodo.tsx`) is one piece for every period, stage to batch:
- *Hero*: kicker with the level and dates ("Fase 1 · 21 nov – 14 ene 2027"), status pill, a ring of the work done, the
  deadline and hours when they say something new, the pace bar (work as the bar, elapsed time as the tick) and one calm
  sentence: "Vas en plan: termina el 9 dic.", "Vas 2 días atrás: termina el 11 dic.", "Empieza el 10 dic (en 17 días).",
  "Pasó el estimado (20 nov). El límite es el 5 ene 2027.", "Venció el 20 nov.".
- *Row*: a small ring (or a round check when it is marked by hand: batches, milestones, versions), name, compact dates
  ("21 – 25 nov"), a thin pace bar, and the status only when it is news (not "Próximo" or "En plan").
- Area color comes from the block type (projects and certs blue, math gold, English pink, job search red; background
  tracks violet and orange; stages and phases in ink).

**Hub** (`#/metas`): the running block as hero (tap: it grows into its page), what is running inside it, "Lo que viene"
with a zoom (Semana day by day with what is due; Mes = versions and exams; Bimestre = blocks; Año = phases; 6 shown,
"Ver N más"), the 4 stages, background (current secondary app and showcase, tracks, open source), your own goals
(P0 and week/month/bimester/year), and the rest of the plan (Análisis, whole roadmap, branches, stages and paperwork).
Lenses: Ahora (here) · Línea · Mapa (section 16).

**A period** (`#/metas/periodos/<id>`): back to the parent by its short name ("Fase 1"), the path above it, the hero,
then by level: version deliverables to tick, "Marcar publicada" (the launch version sends you to complete the Imán
first), phase exit checklist, market and roles; children as rows that zoom in; a block's extras (card, math window,
certs, repo/launch/Imán, open-source tools, project detail in a sheet). A late block offers **Correr lo que sigue**: a
sheet with the proposed dates (fixed dates do not move, background shifts with its window), confirm, and undo from the
toast or from the block ("Volver a las fechas del plan"). Titles drop the level prefix ("Fase 1 · AI Full-stack
Engineer" → "AI Full-stack Engineer", with "Fase 1" in the kicker).

**Análisis** (`#/metas/analisis`): Calibración, Diferencia, Impacto, Evolución, Revisión semanal, Búsqueda, Sprint,
Compras (still 1.0).

Budgets: hub 53 words above the fold (1.0 Períodos: 191), PetrIA 59, a version 58, a phase 60, Análisis 55.

## 16. Línea and Mapa (`src/v2/plan/`, batch 2.3)

The three lenses of the plan share one tab row (`Lentes` in `Compartido.tsx`): **Ahora** (the hub), **Línea**
(`#/metas/linea`) and **Mapa** (`#/metas/constelacion`). In both new views, tapping a block opens the same sheet
(`HojaPeriodo`): the goal card as hero and "Abrir" to enter (background items open their background page). 1.0's map
by branches (`#/metas/mapa`) stays as it was, linked from the hub ("El mapa por ramas").

**Línea** (`LineaV2.tsx`, data in `linea-datos.ts`): the whole plan on a time axis.
- Top: stages and phases as spans with sticky labels. Below, one lane per block type (Proyectos, Certificaciones,
  Matemática, Inglés y búsqueda, Cierres y descansos) plus the two background tracks; lane names stay in view while
  you scroll sideways.
- A bar fills with the work done, turns yellow when finished, gets an outline while it runs and a red underline when
  overdue. Hatched bands are fixed pauses. The glowing yellow line is today.
- Zoom: Todo · Año · Trimestre · Mes, pinch with two fingers, or Ctrl + wheel (from the whole plan down to two weeks).
  The day under your fingers stays put; the buttons zoom around today when it is on screen. "Hoy" scrolls back to it.
- It opens on a quarter with today a quarter in from the left. Below: hours done of planned for the blocks already started.

**Mapa** (`Constelacion.tsx`): the plan as a spiral of stars, the timeline rolled up.
- Layout (`constelacion-datos.ts`, pure and tested): one turn per phase, all starting at twelve o'clock; one star per
  block on its stretch of the turn. Half of each turn is spread by dates and half evenly, so short blocks do not pile up.
  Star size = planned hours, color = area. The spiral opens outward and rises slightly, which gives depth when it turns.
- Reading it: the stretch already lived is drawn stronger; a finished block turns yellow; the running block has a thin
  ring and its name; an overdue one, a red ring. Today is a yellow target with a pulse and the label "hoy" (a target, so
  it is not mistaken for a finished star). Phase labels (F1…F11) sit where each turn starts; the blocks of the current
  phase show their names when you are close. Labels never overlap: the more important one stays.
- 3D (`constelacion-escena.ts`, three.js): loaded only on this screen, as its own chunk (about 136 KB gzipped). The flat
  SVG map shows at once; the scene fades in over the same framing and flies to today. Drag sideways to turn (the page
  still scrolls up and down), pinch or Ctrl + wheel to zoom, arrows and +/− on the keyboard, mouse drag also tilts. "Hoy"
  and "Todo" fly to each view. It turns very slowly on its own, pauses off screen and in background tabs, and draws at
  30 fps when idle.
- Dark draws light (halos add up); light draws ink on paper (solid discs, finished ones outlined). It repaints when the
  theme or the plan changes, without moving the camera.
- Without WebGL (or if the context is lost) the flat map stays, and its stars are tappable. With reduced motion the
  scene opens already on today and stays still until you touch it.
- Below the map: a color legend, three numbers (blocks done, phase, arrival) and the 11 phases as rows to enter. The
  map itself is one labelled group for screen readers; the list is the accessible way in.

Budgets: Línea 9 words of prose above the fold, Mapa 21; 1.2 and 2.2 screens tall.

## 17. Block pages and De fondo (`src/v2/proyecto/`, batch 2.4)

The block pages and everything that runs in the background moved into one lazy chunk (`proyecto/Rutas.tsx`, loaded when the
route needs it). The registry's `cubreMetas(param)` says which `#/metas/…` paths are 2.0: `proyecto/<id>`, `cert/<id>`,
`ventana/<id>`, `pista/<tipo>`, `fondo`, `fondo/<id>`, `iman/<id>` and `open-source`. **`proyecto/P0` stays 1.0** (those are
your own goals; they are not touched until 3.3), and so does the bare `proyecto` ("En curso").

**Cover** (`Portada`, `portada-datos.ts`): a generated SVG drawing per block. It is always the same for the same id and
different between blocks: four motifs (orbits, mesh, waves, isobands) picked by the id's hash; certifications get the mesh,
math windows the isobands, English and job search the waves. Drawn with the area color; the strokes draw themselves in
one by one on entering (static with reduced motion).

**A block** (`#/metas/proyecto/<id>`, `ProyectoV2`): back goes to the period ("Período"). Cover with the kicker ("Proyecto 1
de 27 · petróleo"), the status pill and the dates; the first sentence of what it is; three numbers (done, versions,
closes). Then three tabs:
- *Resumen*: **versions as a step-by-step** (1.0 MVP → 3.0 Producción: a node per version, yellow line up to where you got;
  tap one for its sheet: Trazo's dates against the roadmap's, hours, scope, notes/video/README, publish; the launch version
  asks for the Imán), the block's own **goals** (add, tick, sub-goals, edit, delete with confirm, JSON), and **Para cerrar**: one
  row per thing you load, each with its progress on the right and its own sheet (standard of 12 layers, evidence gate,
  architecture, technical interview, agentic portfolio, real time against 55/30/15, reviews, exam, hours and dates with the extra
  weeks as switches). Same data and functions as 1.0; the page went from 811 words to 60 above the fold.
- *Ficha*: what the plan says, in three groups (what it is, how it is built, what it tells the market).
- *Stack*: profile, environments, technologies with their mark (new / reused / moved), history, tools.
A certification block lists its exams with a countdown; a math window shows its milestones, exit level and the gate.

**Certification** (`#/metas/cert/<id>`): the cover carries the **countdown** ("19 días", with "Reservado" if you booked it);
the exam date appears once (before it was three times). "Estás listo cuando": a ring against the score that certification asks
for (the best of your last two mocks), the mocks as chips, a field to load one. "Fecha del examen": the date field and
"Reservé para esa fecha" (a booked date is fixed: nothing moves it), undo. Then the result with renewal, and the prep (the
day-by-day plan, resources, mini project) in sheets. Titles are short ("Claude Certified Architect"); the full name goes below.

**Math window** (`#/metas/ventana/<id>`): milestones to tick with their day range; what you have to be able to do (with the
book chapters) lives below; the window closes only with every milestone ticked ("Faltan 2 hitos" on the button).

**De fondo** (`#/metas/fondo`): what runs now (current secondary app and showcase), the two tracks as numbers, the Imán of what
is about to launch (as small rings), open source and clipping (still 1.0).
- *Pista secundaria*: one card per app with its own cover, status, dates and Imán. "Ver a futuro" is a sheet.
- *Pista comercial*: five states as chips with counts; the slots in that state, four at a time ("Ver los 23").
- *Item* (`fondo/<id>`): cover with the Imán ring as a link; the app's versions as steps (primary-focus review and publish in
  the sheet); a showcase's state, security checklist (a sheet) and leads; repo, demo and launch version. Fields save on leaving the field
  (and when the sheet closes with the field still focused), so a comma-separated list is not split while you type.
- **Imán** (`iman/<id>`): **8-segment ring** that lights up with each point (animated in), and the 8 points as rows; each opens
  its sheet with what to load. Same gate as 1.0: the launch is not marked published without the 8.
- **Open source** (`open-source`): one **package card** per tool (name, package and registry, latest published version, downloads);
  the sheet has the versions with their extraction checklist, publishing, link, downloads and Thursday's post.

Budgets (words above the fold, 60 max; height in screens, 4 max): block 60 (2.1 screens), certification block 50, window
block 58, certification 40, window 57, De fondo 58, secondary track 39, commercial track 53, item 51, showcase 58, Imán 57,
open source 44 (3.98 screens: 22 package cards, the closest to the limit).

## 18. Estudio (`src/v2/estudio/`, batch 2.5)

Which `#/estudio…` routes are 2.0 (`cubreEstudio`): the hub, `mate` and each book `mate/libro/<id>`. Plus the whole
`#/repaso`, `#/tarjetas` and `#/como`, and `#/flojo` (root, `recall` and `analisis`). Still 1.0 with its mark: the chapter
(`mate/libro/<id>/<n>`), each stretch (`mate/<id>`), Idiomas, Programación, the old roadmap pages (`ruta/…`), the tests,
the thesis, the focus session, the plan of the bimester, add-to-today and the engine settings.

**Subway map** (`lineas.ts`, `Metro.tsx`): the three paths (Matemática, Idiomas, Programación) are lines with one station per
stretch, year or project. The travelled part and finished stations are the yellow stroke; the current station is bigger and
pulses; the next ones are rings in the area's color. If no station is running today, the next one is "you are here" (it is where you
will start). The same line stands up (`MetroVertical`) on Matemática, cut by stages, each station a link to its stretch.

**Hub** (`#/estudio`): the ring of today's steps with "Falta 50 min" and one button to enter focus (or go back to the session);
the lines, each with "where you are → who you will be"; today's steps by content with the same check behavior as 1.0 (a chapter
is not marked studied without its micro-thesis; cards, thesis, cold recall and tests navigate); the week (bars against the daily
goal); the review (forecast of the next 7 days against the cap, and the 3 weakest topics); and the links. 121 words above the
fold in 1.0, 49 now.

**Book** (`Matematica.tsx`): tabs between books (Aritmética | Álgebra, they fit and do not overlap), three numbers, where you are,
and a **chapter heat map**: one square per chapter, yellow = closed, ring = studying, mid tone = in test / re-test / thesis, reddish =
weak, empty = pending. Tap one for its sheet and "Abrir el capítulo". Test of the book, history (sheet) and reset (confirm + undo).

**Repasar** (`Repasar.tsx`): one place with two tabs, Hoy and Puntos débiles. Hoy: a ring of the minutes against the cap, the
button to start, cards by front, "Releer" and "Repetir" (how many of 5 came out right, as 6 big buttons), what does not touch today,
and the 7-day forecast. Puntos débiles: three numbers, the weakest topics with their strength bar, what fails and how long it takes
to fix, the prioritize switch and today's reinforcement, leech cards. The map / how you fail / weekly recall / calibration live
in `#/flojo/analisis` as the 1.0 charts inside the 2.0 frame (so nothing is lost) until 3.3.

**Cards that flip** (`Tarjetas.tsx`): a real 3D flip (a face with the question and your answer, the other with the answer and what
you missed highlighted). Same queue, modes (write, say, think), spaced-repetition engine and grades as 1.0; each grade button says when
the card comes back. With reduced motion it is a cross-fade. Haptics on flip and grade.

**Cómo funciona** (`Como.tsx`): the four steps (study, test, thesis, repeat) as a line, each with a drawn illustration (book and
pomodoro, sheet and score ring, speech bubble and pen, spaced dots on a curve), one sentence and its rules in a sheet; "a day" and
"a chapter in two months" are sheets too. The numbers come from the engine's catalog.

Budgets (words above the fold, 60 max; height in screens, 4 max): hub 49 (2.5 screens), Matemática 55, book 47, Repasar 42,
Puntos débiles 55, cards 29, Cómo funciona 51 (2.0 screens). The analysis page is a known pending item (1.0 charts).


## 19. Entreno (`src/v2/entreno/`, batch 3.1)

2.0 screens: the hub `#/entreno`, the session player `#/entreno-sesion`, the summary `#/entreno-resumen/<id>`, weight
`#/entreno-peso` and the engine `#/entreno-motor`. Still 1.0 with its mark until 3.3: `#/entreno-semana` (what goes each day) and
`#/entreno-rutina/<id>` (edit a routine). Every screen writes through the same store actions as 1.0, so sessions, sets, records,
weights and runs are the same data in both interfaces.

**Muscle model** (`musculos.ts`): 15 regions (chest, shoulders, biceps, triceps, forearms, abs, obliques, traps, lats, lower back,
glutes, quads, hamstrings, adductors, calves). `musculosDe(exercise)` gives one primary muscle (weight 1) and the ones that help
(0.5): the plan's `grupo` decides the primary, the `musculos` text refines it (Espalda → lats or traps; the woodchopper → obliques)
and names the helpers; an exercise without a group (a routine you wrote) is read from its name. Pulls are matched before chest, so
"Jalón al pecho" is back. A test walks every exercise of the factory routines and fails if one has no primary muscle or names a
region the figure cannot draw.

**Body figure** (`Cuerpo.tsx`, `cuerpo-datos.ts`): one custom SVG, front and back, drawn as half a body and mirrored. Each region
is a path whose fill is `color-mix(lit color, --p)`: `--p` is how lit it is (0–100 %). Two tones only: **green (the area color) =
planned**, **yellow (the stroke) = done**. Muscles light up in a stagger when the figure appears; `pulso` makes the current
exercise's primary muscle breathe. The figure is `role="img"` with a sentence ("Push A trabaja pecho, hombros y tríceps") and is
never the only way to read or tap the data: the muscle list next to it says the same and is what keyboard and screen reader use.
Class names are prefixed (`cu-`, `en-`): the 1.0 global `.plan` class leaked a border onto the first version.

**Hub**: the hero is today's routine with the figure lit by what it trains (primary full, helpers half), the partner chip and one
button (start / go back to the session / see the summary when done); the full step list is a sheet. Then the week strip, and
**Volumen de la semana**: the figure as a heat map of sets done against sets planned per muscle (four steps; the session in progress
counts), with the top five muscles as "9 de 15" bars (the rest behind "Ver los N") and a sheet per muscle listing the exercises that
feed it. Runs reuse the `Barras` chart (its CSS moved to `estudio/barras.css` so both areas share it); deleting a run can be undone.

**Session player** (`SesionV2.tsx`): one exercise at a time. Header: elapsed time against the block as a thin bar; the exercises as
a scrolling tab strip (number → check when done). The exercise card: a small figure showing the side where the primary muscle is,
pulsing; name, sets, rest and tempo in one line; "Cómo se hace" in a sheet. **Sets are bars**: height = reps (scaled between the
lowest and highest value so one rep of difference is visible), dashed line = today's target, filled yellow = done, yellow outline
pulsing = the one you are on, "+1" when you beat the target. **Rest is a ring** that empties, with +15 s and Saltar; with a partner
there is one ring each, or one shared. Kilos and reps are the kit steppers (typeable), RIR is five chips, and the main button says
which set it logs and why it is disabled. Warm-up is a checklist sheet (shown on top until you start lifting, then under "Más").
Discarding asks first. When the block's time is up a sheet offers finish, +10 min or no limit; closing the sheet counts as +10 min.
The end-of-rest notice goes through the 1.0 `toast` bridge so it keeps its sound.

**Summary**: the figure in yellow with what you actually trained (only exercises with logged sets), three numbers, records, what was
left for next time, the next targets (the ones that change first) and the note, which saves when you leave the field.

**Weight** (`PesoV2.tsx`, `Curva.tsx`): last weigh-in as the big number with the change since the previous one, then a smooth curve
(monotone cubic: it never overshoots between two points) on a real time axis, soft area fill, last point = yellow "you are here".
The goal is a dashed line; if it is far from the data it does not squash the curve: it sits on the edge with an arrow. Three numbers
(change, kg to goal, weeks at this pace). Today's weigh-in is a stepper + button (replacing today's can be undone); measures, goal
and the list of weigh-ins are sheets, and every delete has Undo.

**Engine** (`MotorV2.tsx`): the 461 words of 1.0 became one graphic: five sessions of bars (reps per set) under a dashed "tope"
line, and above them the weight as a line that takes a step up exactly after the session where all three bars reach the top. Under
it, the three numbers that matter (+1 rep each session, +1 to 5 kg at the top, −10 % if it stalls); the seven full rules, with
1.0's wording, are one sheet away. Next session's targets are per person (switch) and come from the same `nextFor` as 1.0.

**Two small system changes.** A registry entry can be `parte: true` (a screen that lives inside another area: session, summary,
weight and engine are all "Entreno"), so the sentence in Ajustes that lists what is already 2.0 names areas, not every page. And
the revision no longer counts text that sits off to the side in a horizontal scroller (the exercise tabs): it is not being read.
The revision also seeds a little training history (a past session, three weigh-ins) and, only for the session player, a session in
progress with a partner, so those screens are measured with content.

Budgets (words above the fold, 60 max; height in screens, 4 max): hub 25 (2.95 screens), session player 57 measured in its heaviest
case (two people, a set done, a rest running; 2.2 screens), summary 43 (1.65), weight 45 (1.29), engine 53 (1.82).

Demo: `docs/demo/ux-2.0/entreno-centro.png` (today's routine on the figure), `entreno-volumen.png` (weekly heat),
`entreno-sesion.png` and `entreno-sesion-dos.png` (player, alone and with a partner), `entreno-resumen.png`, `entreno-peso.png`
(light), `entreno-motor.png`, `entreno-claro.png` and `entreno-escritorio.png`.

## 20. Perfil, Avance and Cierre (`src/v2/perfil/`, batch 3.2)

2.0 screens: `#/perfil`, `#/avance` (and its presentation, `#/avance/presentacion`), `#/cierre` and `#/logro/<id>`. The close-day
screen and the new-seal screen are `parte: true` in the registry (they belong to Hoy and Perfil). Same store actions as 1.0:
`closeDay`, `reopenDay`, `claimSeal`, `unclaimSeal`, `markSealSeen`. XP, levels, seals and their rules come from `data/profile`
untouched. The word stays **Sellos** (it is what the history text and the 24 definitions say); what changes is how they look.

**The seal** (`Sello.tsx`, `formas.ts`): a minted piece with the **silhouette of its group**, so the wall reads before the names do:
Constancia = coin (milled edge), Cuerpo = hexagon (a weight plate), Estudio = shield, Trabajo = rosette (a wax stamp). Material:
a **metal rim** in the area color (bands of light and shadow), a **deep enamel face** of that same color (dark, lighter on top,
with a sunburst of engraved rays and a soft glow in the middle), a hairline inner ring, and the **mark in bright metal, embossed**
(a dark copy offset under it). The first version filled the face with a pastel radial gradient and read as a plastic button;
the color now lives in the rim, the glow and the mark, not in a flat fill. A soft gloss and a **sheen** cross it once on appearing
(staggered across a row) and again on hover or focus. **Locked** is the empty silhouette with a **progress ring drawn along its outline** (the seal's own
`progress()` rule: 18 of 30 days = 60 % of the ring), so the wall tells you how close each one is; seals with no measurable rule
(manual or one-off) show no ring. In the light theme the enamel is the area color itself (those are dark there), the rim is lighter and the mark almost white. It is a drawing:
the name is given by whoever uses it; the wall buttons say "100 días: bloqueado, 36 %".
**Big seal** (`SelloInclinable`): follows the mouse, or a sideways drag, tilting up to 17° in 3D with the sheen moving with the light;
it settles back on release. Off with reduced motion. Used in the detail sheet and in the new-seal screen.
**Vitrina** ("Lo último" in Perfil): the last three seals you earned as a podium under a spotlight of the newest one's area color
(newest in the middle and bigger). Seals sit on the shelf with a contact shadow.

**The year** (`Calor.tsx`, `datos.ts`): one row per month, one cell per day (12 × 31), which fits a phone at a readable size where a
53-week grid does not. Five levels with the same thresholds as the 1.0 calendar (no data, nothing done, something, half or more,
85 % or more), today with a ring, future days as outlines. The year starts the month you started and moves on with you after 12
months. The numbers (days loaded, average) sit next to it, not inside.

**Perfil**: the identity card (level ring with XP inside the level, name, XP, how much is left) and four numbers; the year; the
three closest milestones with a bar (tap = the seal's sheet); the 24 seals in their four groups; and "Más": Avance (on a phone
Avance hangs from Perfil), the history (sheet) and the agentic portfolio. A seal's sheet says how it is earned and either when you
earned it or how far you are; the two manual seals are claimed and removed there, with Undo. The Ajustes gear is in the header:
the temporary patch that added it on top of the 1.0 Perfil is gone.

**Avance**: four numbers; study by week, month or year (bars against the goal); the year's goals and the study fronts as bars; the
month as a calendar with the same heat levels; runs; the weight curve (the same `Curva` as Entreno); and the seals earned. On a
desktop the groups go in two columns. "Presentar" opens the presentation.

**Presentation** (`Presentacion.tsx`): eight full-screen slides, one idea and one big number each (day and streak, days loaded with
the year map, accumulated improvement with the last 14 days, hours of study by front, the year's goals, training with the body
figure, seals, a closing line). A progress strip on top; it advances by itself every 7 seconds and can be paused; tap the right
70 % to go on and the left 30 % to go back; arrows, space (pause) and Esc (exit) on a keyboard. With reduced motion it starts
paused. Nothing private: no body weight and no money (the goals in USD or kg show their name with the value covered), as in 1.0.

**Cierre** (`CierreV2.tsx`): three cards in a horizontal rail with scroll-snap (swipe, or the three numbered steps on top, or
"Siguiente"). 1 · *Hoy*: the improvement as the big number, against yesterday, one segment per goal, three numbers, the last days
and the areas. 2 · *Mañana*: what is left, ticked = it moves to tomorrow, and the two notes. 3 · *Cerrar*: the totals, the JSON
(in a sheet) and the one button that copies the JSON and closes the day. Only the card in view is reachable (`inert` on the others).
A closed day shows what was written, lets you copy again and reopen. If closing earns a seal, the new-seal screen opens.

**New seal**: the seal drops in with a spring, a burst and its sound, with its line and "+50 XP". If more than one was earned they
are shown one after another ("Siguiente sello"), which 1.0 did not do.

**System changes.** `GlobalV2` no longer injects an Ajustes button over the 1.0 Perfil (dead code now). The revision measures the
close-day screen with three goals done (seeded only for that route, so Hoy is measured as before) and labels the presentation as
"2.0 (pantalla completa)": it has no frame, so the title and fold budgets do not apply to it.

Budgets (words above the fold, 60 max; height in screens, 4 max): Perfil 37 (2.85 screens), Avance 35 (2.49), Cierre 39 (2.18),
new seal 23 (1). 1.0's Cierre had 848 words on one page.

Demo: `docs/demo/ux-2.0/perfil-centro.png`, `perfil-sellos.png`, `perfil-claro.png`, `avance.png`, `avance-escritorio.png`,
`presentacion.png` (the eight slides), `presentacion-mejora.png`, `presentacion-cuerpo.png`, `cierre-1.png`, `cierre-2.png`,
`cierre-3.png` and `sello-nuevo.png`.

## 21. The sweep: every remaining screen (batch 3.3)

After this batch **no route shows a 1.0 screen inside 2.0**. The only 1.0 screen left is the very first sign-up (`Instalar`), which
runs before there are settings where 2.0 could be chosen. The revision fails if the "1.0" mark appears anywhere.

**How a screen gets several 2.0 entries.** `registro.ts` keeps one main entry per screen (the hubs of batches 2.x–3.2).
`extras.ts` adds more: each family declares its own in `src/v2/<familia>/entradas.ts` as `{ pantalla, entrada }`, where the entry's
`cubre(ruta)` says exactly which sub-routes it takes. `entradaDe()` in the resolver tries the main entry first and, if it does not
cover the route, the first extra that does; anything uncovered still falls back to 1.0 with its mark. One lazy chunk per screen.
Immersive screens that do not use the frame carry `main.v2.v2-completa` and bring their own exit.

**The seven families** (each with its own directory, CSS prefix, tests and entries; all write through the 1.0 store actions):

| Family | Routes | What changed in how it reads |
|---|---|---|
| `ajustes/` (`ax-`) | ajustes/plan, ajustes-rutinas (+ nueva, hoy, id), ajustes-companera, ajustes-datos, sonidos, entreno-semana, entreno-rutina, elegir, foco, pomodoros, json, importar | Plan T+18 is rows with their value and sheets for the long parts (157 → 55 words). Routines use the 24 h time field. Focus is a full-screen ring with pause and stop. Restore asks with the confirm dialog; an invalid file touches nothing. |
| `sesiones/` (`se-`) | sesion, test (+ final), tesis, recall, unidades, actividad, tarjeta-nueva, motor (+ importar) | Session, test, cold recall and thesis are focus screens: one thing at a time, exit ×, the main button at the bottom. Cold recall is three steps (write, mark, result). |
| `programa/` (`pg-`) | estudio/idiomas…, estudio/prog… (+ demanda, algoritmos), estudio/libro/<id> | The current phase in view, the rest in sheets. The book uses the same unit heat map as Matemática. Demand table became rows. |
| `temas/` (`tm-`) | estudio/ruta…, estudio/mate/<tramo>, the chapter (mate/libro/<id>/<n>), flojo/examenes, flojo/simulacro, flojo/<tema> | Phase criteria are checkboxes with one "Cerrar" button. The error chart became a number grid (it relied on color alone). The mock exam has print rules. |
| `metas/` (`mt-`) | metas/ruta, semana, mes, bimestre (+ n), anio, mapa, etapas, evolucion, roadmap, meta-nueva | No global "Editar metas" switch: tap a goal to open its sheet (target, subgoals, rewrite, delete with undo). The radar became one bar per axis. |
| `trabajo/` (`tr-`) | metas/trabajo, ingles, handyx, sprint, impacto, calibracion, diferencia, revision, compras, proyecto, proyecto/P0 | P0 keeps its goals and data untouched; only its presentation changed. Checklists and long reviews moved into sheets. |
| `clipping/` (`cl-`) | metas/clipping and its nine sections | Hub with the month's income as a ring against the goal and one "Registrar clips". The registry has its own sheet. Same export and import format. |

**Behavior that differs from 1.0 on purpose** (each can be reverted):
- Stopping a focus session or a study session midway, and discarding things with no undo, **ask first**. Everything that can be
  undone deletes at once and offers Undo (routines, pomodoros, alarms, activities, clipping rows, goals…).
- Clipping money fields read "1.234,5", "1,09" and "1.09" correctly. 1.0 stripped every dot, so "12.50" became 1250.
- In Algoritmos the interview question of a topic not yet planted is saved together with "Lo planté hoy", not on leaving the field.
- Re-tests list every pending one, not only the first. A chapter-less activity no longer says "0 de 313 capítulos".
- Back from the analysis-type screens (calibración, diferencia, impacto, evolución, revisión…) goes to Plan · Análisis, their parent
  in the structure table (§8), not to the hub.

**Fixes to shared code found by the sweep**: the time field lost a digit when typed with focus ("16" → "01"); the dashed goal line
of `Barras` ignored its position and its bars were keyed by label (repeated month letters); `Barras` is now marked as a chart.

## 22. Empty states, illustrations and copy (batch 3.4)

**Illustrations** (`ILUSTRACIONES` in `iconos.tsx`, all on the workshop page): 19, one per subject, so an empty state shows *what* is
missing: plan, datos, repaso, entreno, descanso, peso, correr, sello, historial, buscar, estudio, metas, avisos, listo, trabajo,
clip, foco, escribir, importar. Rules, checked by a test: 120 × 96, thin line in the secondary text color, dotted for what is not
there yet, and exactly one yellow stroke, always the same shape and size.

**Empty states**: `Vacio` always carries an action (rule 6). New `compacto` variant: the drawing small on one side, title, one line
and the action on the other, for an empty state inside a card or next to others. Day 0 was walked screen by screen: Avance offers to
register a run, load a weight and close the day; Perfil's empty history offers to close today; a rest or free day in Entreno has its
drawing and "Cambiar la semana"; "not found" pages use the magnifier and a way back; the weak-points analysis is one invitation
instead of four empty charts. A screen with nothing due says so once ("Estás al día"), not twice.

**Copy**: `cuantos(n, uno, varios)` in `reglas.ts` is the one way to write a count, so nothing reads "1 días", "1 tarjetas" or
"1 series". The weak-points analysis (`estudio/Analisis.tsx`) was the last page hosting 1.0 charts: now a strength map where the
band is a shape (weak = inverted cell, strong = the yellow stroke) and every cell has its number, error types as bars with their
advice, weekly recall as lines against the cap, and calibration as two bars per front.

