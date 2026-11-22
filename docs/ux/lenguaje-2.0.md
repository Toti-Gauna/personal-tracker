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

## 5. Motion (tokens here; the system is batch 1.6)

- Durations: `--dur-1` 120 ms (press), `--dur-2` 200 ms (state), `--dur-3` 320 ms (enter, the stroke), `--dur-4` 520 ms (screen, hero).
- Curves: `--curva-salida` (things arriving), `--curva-ida-vuelta` (things moving), `--curva-resorte` (celebration only).
- Signature: the stroke wipes in from the left (`.trazo-marca.entra`).
- Reduced motion: movement becomes a 150 ms fade; nothing loops.
- Motion must explain something: where a screen came from, what just changed, what you just finished.

## 6. Icons (drawn in batch 1.3)

24 px grid, 1.75 stroke, round caps and joins, no fills except the mark. One metaphor per meaning, checked against
what people expect (a gear is settings, a sun is theme). An icon without a universal meaning carries a text label.
No emoji in the interface.

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
