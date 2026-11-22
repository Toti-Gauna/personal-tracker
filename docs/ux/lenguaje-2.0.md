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
  `#/ajustes/plan` are sub-pages (the plan one still hosts 1.0's controls inside the new frame).
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

Current result: no failures in the 2.0 frame. Pending: the plan page (`#/ajustes/plan`) still shows 1.0's controls (163
words above the fold), rebuilt in batch 3.3.

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
