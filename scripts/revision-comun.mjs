/**
 * Lo que comparten la revisión (`v2-revision.mjs`) y la de accesibilidad (`a11y.mjs`): las rutas, los datos que se siembran y
 * cómo se abre la app (los dos nombres, el Buen día) y cada pantalla (esperar la carga, sembrar lo de esa pantalla y volver).
 */
export const BASE = process.env.BASE ?? 'http://127.0.0.1:4173/personal-tracker/';
export const FECHA = '2026-11-23T09:30:00-03:00';

/** Las pantallas que se revisan. `taller` marca lo que es documentación del sistema. */
export const PANTALLAS = [
  { id: 'hoy', hash: '#/hoy' },
  { id: 'estudio', hash: '#/estudio' },
  { id: 'plan', hash: '#/metas' },
  { id: 'plan-petria', hash: '#/metas/periodos/P1' },
  { id: 'plan-version', hash: '#/metas/periodos/P1%3Av1.0' },
  { id: 'plan-fase', hash: '#/metas/periodos/F1' },
  { id: 'plan-analisis', hash: '#/metas/analisis' },
  { id: 'plan-linea', hash: '#/metas/linea' },
  { id: 'plan-mapa', hash: '#/metas/constelacion' },
  { id: 'bloque-proyecto', hash: '#/metas/proyecto/P1' },
  { id: 'bloque-cert', hash: '#/metas/proyecto/CW1' },
  { id: 'bloque-ventana', hash: '#/metas/proyecto/W1' },
  { id: 'cert', hash: '#/metas/cert/claude-architect' },
  { id: 'ventana', hash: '#/metas/ventana/W1' },
  { id: 'fondo', hash: '#/metas/fondo' },
  { id: 'fondo-pista-sec', hash: '#/metas/pista/secundaria' },
  { id: 'fondo-pista-com', hash: '#/metas/pista/comercial' },
  { id: 'fondo-app', hash: '#/metas/fondo/handyx' },
  { id: 'fondo-showcase', hash: '#/metas/fondo/com-1' },
  { id: 'iman', hash: '#/metas/iman/handyx' },
  { id: 'open-source', hash: '#/metas/open-source' },
  { id: 'estudio-mate', hash: '#/estudio/mate' },
  { id: 'estudio-libro', hash: '#/estudio/mate/libro/conamat' },
  { id: 'repasar', hash: '#/repaso' },
  { id: 'puntos-debiles', hash: '#/flojo' },
  { id: 'puntos-analisis', hash: '#/flojo/analisis' },
  { id: 'tarjetas', hash: '#/tarjetas' },
  { id: 'como', hash: '#/como' },
  { id: 'entreno', hash: '#/entreno' },
  { id: 'entreno-sesion', hash: '#/entreno-sesion/pull-a', antes: 'EN_CURSO' },
  { id: 'entreno-resumen', hash: '#/entreno-resumen/rev-pull' },
  { id: 'entreno-peso', hash: '#/entreno-peso' },
  { id: 'entreno-motor', hash: '#/entreno-motor' },
  { id: 'perfil', hash: '#/perfil' },
  { id: 'avance', hash: '#/avance' },
  { id: 'avance-presentacion', hash: '#/avance/presentacion' },
  { id: 'cierre', hash: '#/cierre', antes: 'DIA_AVANZADO' },
  { id: 'sello-nuevo', hash: '#/logro/hombre-nuevo' },
  { id: 'ajustes', hash: '#/ajustes' },
  { id: 'ajustes-bimestres', hash: '#/ajustes/bimestres' },
  { id: 'ajustes-plan', hash: '#/ajustes/plan' },
  // Tanda 3.3: el resto de las pantallas, por familia.
  { id: 'ajustes-rutinas', hash: '#/ajustes-rutinas' },
  { id: 'ajustes-rutina-nueva', hash: '#/ajustes-rutinas/nueva' },
  { id: 'ajustes-rutina-hoy', hash: '#/ajustes-rutinas/hoy' },
  { id: 'ajustes-companera', hash: '#/ajustes-companera' },
  { id: 'ajustes-datos', hash: '#/ajustes-datos' },
  { id: 'sonidos', hash: '#/sonidos' },
  { id: 'entreno-semana', hash: '#/entreno-semana' },
  { id: 'entreno-rutina', hash: '#/entreno-rutina/push-a' },
  { id: 'entreno-rutina-nueva', hash: '#/entreno-rutina/nueva' },
  { id: 'elegir-foco', hash: '#/elegir/prog' },
  { id: 'foco', hash: '#/foco' },
  { id: 'pomodoros', hash: '#/pomodoros' },
  { id: 'json', hash: '#/json' },
  { id: 'importar', hash: '#/importar' },
  { id: 'sesion', hash: '#/sesion/make-it-stick' },
  { id: 'test', hash: '#/test/conamat/1' },
  { id: 'test-final', hash: '#/test/conamat/final' },
  { id: 'unidades', hash: '#/unidades' },
  { id: 'actividad', hash: '#/actividad' },
  { id: 'tarjeta-nueva', hash: '#/tarjeta-nueva' },
  { id: 'motor', hash: '#/motor' },
  { id: 'motor-importar', hash: '#/motor/importar' },
  { id: 'idiomas', hash: '#/estudio/idiomas' },
  { id: 'idiomas-ingles', hash: '#/estudio/idiomas/ingles' },
  { id: 'idiomas-biblioteca', hash: '#/estudio/idiomas/biblioteca' },
  { id: 'prog', hash: '#/estudio/prog' },
  { id: 'prog-bloque', hash: '#/estudio/prog/P1' },
  { id: 'prog-demanda', hash: '#/estudio/prog/demanda' },
  { id: 'prog-algoritmos', hash: '#/estudio/prog/algoritmos' },
  { id: 'libro', hash: '#/estudio/libro/mwm' },
  { id: 'ruta-estudio', hash: '#/estudio/ruta' },
  { id: 'ruta-mate', hash: '#/estudio/ruta/matematica' },
  { id: 'ruta-fase', hash: '#/estudio/ruta/matematica/M1' },
  { id: 'mate-tramo', hash: '#/estudio/mate/W1' },
  { id: 'mate-capitulo', hash: '#/estudio/mate/libro/conamat/1' },
  { id: 'flojo-examenes', hash: '#/flojo/examenes' },
  { id: 'flojo-simulacro', hash: '#/flojo/simulacro' },
  { id: 'flojo-tema', hash: '#/flojo/conamat%3A1' },
  { id: 'metas-ruta', hash: '#/metas/ruta' },
  { id: 'metas-semana', hash: '#/metas/semana' },
  { id: 'metas-mes', hash: '#/metas/mes' },
  { id: 'metas-bimestre', hash: '#/metas/bimestre' },
  { id: 'metas-anio', hash: '#/metas/anio' },
  { id: 'meta-nueva', hash: '#/meta-nueva/semana' },
  { id: 'metas-mapa', hash: '#/metas/mapa' },
  { id: 'metas-etapas', hash: '#/metas/etapas' },
  { id: 'metas-evolucion', hash: '#/metas/evolucion' },
  { id: 'metas-roadmap', hash: '#/metas/roadmap' },
  { id: 'trabajo', hash: '#/metas/trabajo' },
  { id: 'ingles', hash: '#/metas/ingles' },
  { id: 'handyx', hash: '#/metas/handyx' },
  { id: 'sprint', hash: '#/metas/sprint' },
  { id: 'impacto', hash: '#/metas/impacto' },
  { id: 'calibracion', hash: '#/metas/calibracion' },
  { id: 'diferencia', hash: '#/metas/diferencia' },
  { id: 'revision', hash: '#/metas/revision' },
  { id: 'compras', hash: '#/metas/compras' },
  { id: 'proyecto-curso', hash: '#/metas/proyecto' },
  { id: 'proyecto-p0', hash: '#/metas/proyecto/P0' },
  { id: 'clipping', hash: '#/metas/clipping' },
  { id: 'clipping-registro', hash: '#/metas/clipping/registro' },
  { id: 'clipping-campanas', hash: '#/metas/clipping/campanas' },
  { id: 'clipping-cuentas', hash: '#/metas/clipping/cuentas' },
  { id: 'clipping-retainers', hash: '#/metas/clipping/retainers' },
  { id: 'clipping-metricas', hash: '#/metas/clipping/metricas' },
  { id: 'clipping-plan', hash: '#/metas/clipping/plan' },
  { id: 'clipping-nichos', hash: '#/metas/clipping/nichos' },
  { id: 'clipping-riesgos', hash: '#/metas/clipping/riesgos' },
  { id: 'clipping-semana1', hash: '#/metas/clipping/semana1' },
  { id: 'taller-lenguaje', hash: '#/v2' },
  { id: 'taller-controles', hash: '#/v2/kit' },
  { id: 'taller-piezas', hash: '#/v2/piezas' },
  { id: 'taller-movimiento', hash: '#/v2/movimiento' },
];
/** `SOLO=id,id` mide solo esas pantallas: para volver a revisar una sin esperar a las otras cien. */
export const SOLO = (process.env.SOLO ?? '').split(',').map((x) => x.trim()).filter(Boolean);
export const ELEGIDAS = SOLO.length ? PANTALLAS.filter((p) => SOLO.includes(p.id)) : PANTALLAS;

export const SEMBRAR = () => {
  const s = JSON.parse(localStorage.getItem('trazo.v1'));
  // Entreno con algo de historia: un Pull A de la semana pasada (para el resumen y el motor) y tres pesajes (para la curva).
  const r = s.train.routines.find((x) => x.id === 'pull-a');
  const sets = r.exercises.flatMap((e) => Array.from({ length: e.sets }, (_, k) => ({ ex: e.id, who: 'me', i: k + 1, kg: 20, reps: e.repMin + (k === 0 ? 1 : 0) })));
  s.train.sessions.push({ id: 'rev-pull', date: '2026-11-16', routineId: r.id, routineName: r.name, minutes: 84, athletes: ['me'], sets, skipped: [], deload: false, note: '', records: [] });
  s.train.weights.push({ date: '2026-11-08', kg: 82.1 }, { date: '2026-11-15', kg: 82.4 }, { date: '2026-11-22', kg: 82.8 });
  s.train.pesoPreguntado.push('2026-11-23');
  // Perfil con un sello ganado (para la pantalla del sello nuevo).
  s.profile.seals['hombre-nuevo'] = '2026-11-23';
  localStorage.setItem('trazo.v1', JSON.stringify(s));
};

/** Estados que solo valen para una pantalla: se siembran antes de medirla y después se vuelve a lo anterior. */
export const ANTES = {
  /** El día de hoy con tres metas cumplidas: el cierre con algo que mostrar (y pendientes para pasar a mañana). */
  DIA_AVANZADO: () => {
    const s = JSON.parse(localStorage.getItem('trazo.v1'));
    s.days['2026-11-23'].blocks.slice(0, 3).forEach((b) => b.tasks.forEach((t) => { t.done = true; }));
    localStorage.setItem('trazo.v1', JSON.stringify(s));
  },
  /** Un entreno en curso de a dos, con una serie hecha y un descanso corriendo: la sesión en su caso más cargado. */
  EN_CURSO: () => {
    const s = JSON.parse(localStorage.getItem('trazo.v1'));
    const r = s.train.routines.find((x) => x.id === 'pull-a');
    const e = r.exercises[0];
    const ahora = Date.parse('2026-11-23T09:30:00-03:00');
    s.train.active = {
      routineId: r.id, date: '2026-11-23', startedAt: ahora - 14 * 60000, athletes: ['me', 'partner'], order: r.exercises.map((x) => x.id), idx: 0,
      sets: [{ ex: e.id, who: 'me', i: 1, kg: 10, reps: e.repMin }], draft: { me: { kg: 10, reps: e.repMin }, partner: { kg: 5, reps: e.repMin } }, who: 'partner',
      warmDone: [], restMode: 'each', rest: { me: { endsAt: ahora + 80000, total: e.rest * 1000 } }, limitMin: 120, noLimit: false, deload: false,
    };
    localStorage.setItem('trazo.v1', JSON.stringify(s));
  },
};

/** Abre la app en un teléfono de 390 × 844 con ese tema: la primera vez (los dos nombres), el Buen día y los datos sembrados. */
export async function abrirApp(browser, tema) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'America/Argentina/Buenos_Aires', colorScheme: tema });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.clock.setSystemTime(new Date(FECHA));
  await page.goto(BASE);
  await page.waitForSelector('input');
  await page.locator('input').first().fill('Toti');
  await page.locator('input').nth(1).fill('Abi');
  await page.getByRole('button', { name: /^Empezar/ }).click();
  await page.waitForTimeout(600);
  // El Buen día: se empieza el día con la hora que propone.
  await page.getByRole('button', { name: /^Empezar ·/ }).click();
  await page.waitForTimeout(1200);
  await page.evaluate(SEMBRAR);
  return { ctx, page, errores };
}

/** Va a una pantalla con lo que ella siembra antes. Devuelve el estado de antes para `volver`. */
export async function visitar(page, p) {
  const previo = p.antes ? await page.evaluate(() => localStorage.getItem('trazo.v1')) : null;
  if (p.antes) await page.evaluate(ANTES[p.antes]);
  await page.goto(BASE + p.hash);
  await page.reload();
  // La carga (.sp2) tapa la pantalla unos 1,2 s: se espera a que termine.
  await page.waitForSelector('.sp2', { state: 'detached', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => { document.querySelectorAll('.h-velo, .sp2').forEach((e) => e.remove()); });
  return previo;
}

/** Deja el estado como estaba antes de `visitar` (se recarga enseguida: la app en memoria lo volvería a escribir). */
export async function volver(page, previo) {
  if (previo) { await page.evaluate((v) => localStorage.setItem('trazo.v1', v), previo); await page.reload(); }
}
