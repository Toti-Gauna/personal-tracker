import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultRoutines } from '../../data/train-catalog';
import type { TrainSession } from '../../data/train-types';
import { leerRuta } from '../../lib/routes';
import { getState, register, resetState, startDay } from '../../state/store';
import { addRun, addWeight, logSet, patchActive, startTraining } from '../../state/train';
import { limpiarCapas } from '../kit/capas';
import GlobalV2 from '../marco/Global';
import { PANTALLAS_V2 } from '../registro';
import { Cuerpo, enPalabras } from './Cuerpo';
import { TRAZOS } from './cuerpo-datos';
import { caminoSuave, pasoLindo } from './Curva';
import { ejerciciosDe, semanaDe, volumenSemana } from './datos';
import EntrenoV2 from './EntrenoV2';
import MotorV2, { EJEMPLO } from './MotorV2';
import { MUSCULOS, VISTA, calor, cargaDeRutinas, cargaDeSeries, indiceEjercicios, luzDeRutina, musculosDe, musculosDelTexto } from './musculos';
import PesoV2 from './PesoV2';
import ResumenV2 from './ResumenV2';
import SesionV2, { luzDeEjercicio } from './SesionV2';

// Miércoles: en el plan de fábrica toca Push; la primera semana del plan es la A.
const HOY = '2026-11-25';
const train = () => getState().train;
const activa = () => train().active!;
const rutina = (id: string) => train().routines.find((r) => r.id === id)!;
const global = <GlobalV2 activa="entreno" pendientes={0} conBarra={false} conMini={false} />;
const props = (hash: string) => ({ ruta: leerRuta(hash), day: getState().days[HOY], today: HOY });
const dialogo = () => { const d = screen.getAllByRole('dialog'); return d[d.length - 1]; };
const escribir = (grupo: string, valor: string) => { const i = within(screen.getByRole('group', { name: grupo })).getByRole('textbox'); fireEvent.change(i, { target: { value: valor } }); fireEvent.blur(i); };

/** Una sesión guardada con todas las series de una rutina (o las de sus primeros ejercicios). */
function sesion(id: string, date: string, hasta = 99, kg = 20): TrainSession {
  const r = rutina(id);
  const sets = r.exercises.slice(0, hasta).flatMap((e) => Array.from({ length: e.sets }, (_, k) => ({ ex: e.id, who: 'me' as const, i: k + 1, kg, reps: e.repMin })));
  return { id: `s-${id}-${date}`, date, routineId: id, routineName: r.name, minutes: 80, athletes: ['me'], sets, skipped: [], deload: false, note: '', records: [] };
}
const guardar = (...ss: TrainSession[]) => act(() => { const s = getState(); s.train.sessions.push(...ss); });

beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', HOY); startDay('completo', '04:00', HOY); location.hash = ''; });
afterEach(() => { act(() => limpiarCapas()); });

describe('Entreno 2.0 · qué cubre', () => {
  it('el centro, la sesión, el resumen, el peso y el motor son 2.0; cambiar la semana y editar una rutina siguen en 1.0', () => {
    for (const k of ['entreno', 'entreno-sesion', 'entreno-resumen', 'entreno-peso', 'entreno-motor'] as const) expect(PANTALLAS_V2[k], k).toBeTruthy();
    for (const k of ['entreno-semana', 'entreno-rutina'] as const) expect(PANTALLAS_V2[k], k).toBeUndefined();
  });

  it('la sesión, el resumen, el peso y el motor son parte de Entreno: en Ajustes se nombra solo "Entreno"', () => {
    for (const k of ['entreno-sesion', 'entreno-resumen', 'entreno-peso', 'entreno-motor'] as const) expect(PANTALLAS_V2[k]!.parte, k).toBe(true);
    expect(PANTALLAS_V2.entreno!.parte).toBeUndefined();
    const nombradas = Object.values(PANTALLAS_V2).filter((e) => !e!.taller && !e!.parte).map((e) => e!.nombre);
    expect(nombradas).toContain('Entreno');
    expect(nombradas.filter((n) => /entreno|Peso/i.test(n))).toEqual(['Entreno']);
  });
});

describe('Entreno 2.0 · los músculos de cada ejercicio', () => {
  it('todos los ejercicios de las rutinas de fábrica tienen un músculo principal que la figura sabe dibujar', () => {
    for (const r of defaultRoutines()) for (const e of r.exercises) {
      const partes = musculosDe(e);
      expect(partes.filter((p) => p.peso === 1), `${r.id} · ${e.name}`).toHaveLength(1);
      for (const p of partes) expect(MUSCULOS, `${e.name}: ${p.m}`).toContain(p.m);
      expect(new Set(partes.map((p) => p.m)).size).toBe(partes.length);
    }
  });

  it('el grupo del plan manda y el texto de músculos afina: espalda puede ser dorsales o trapecio; el woodchopper son oblicuos', () => {
    const de = (rid: string, eid: string) => musculosDe(defaultRoutines().find((r) => r.id === rid)!.exercises.find((e) => e.id === eid)!);
    expect(de('pull-a', 'dominada-neutra')).toEqual([{ m: 'dorsales', peso: 1 }, { m: 'biceps', peso: 0.5 }]);
    expect(de('pull-a', 'encogimiento')[0]).toEqual({ m: 'trapecio', peso: 1 });
    expect(de('push-a', 'woodchopper')[0]).toEqual({ m: 'oblicuos', peso: 1 });
    expect(de('push-a', 'press-horizontal-barra').map((p) => p.m)).toEqual(['pecho', 'triceps', 'hombros']);
    expect(de('legs-b', 'peso-muerto-rumano').map((p) => p.m)).toEqual(['isquios', 'gluteos', 'lumbares']);
  });

  it('sin grupo, lo saca del nombre: un jalón al pecho es espalda, no pecho', () => {
    const e = (name: string, kind: 'torso' | 'pierna' | 'aislamiento' = 'torso') => musculosDe({ name, kind }).map((p) => p.m);
    expect(e('Jalón al pecho')).toEqual(['dorsales', 'biceps']);
    expect(e('Press de banca')).toEqual(['pecho', 'triceps', 'hombros']);
    expect(e('Sentadilla', 'pierna')).toEqual(['cuadriceps', 'gluteos']);
    expect(e('Curl martillo', 'aislamiento')).toEqual(['biceps', 'antebrazos']);
    expect(e('Algo que no conozco', 'pierna')).toEqual(['cuadriceps', 'isquios', 'gluteos']);
    expect(e('Algo que no conozco')).toEqual([]);
    expect(musculosDelTexto('Pectoral mayor, deltoide anterior y tríceps')).toEqual(['pecho', 'hombros', 'triceps']);
  });

  it('las series por músculo: 1 por serie en el principal y media en los que acompañan; solo las tuyas', () => {
    const rs = defaultRoutines();
    const pull = rs.find((r) => r.id === 'pull-a')!;
    const plan = cargaDeRutinas([pull]);
    expect(plan.dorsales).toBe(9);
    expect(plan.antebrazos).toBe(7.5);
    const indice = indiceEjercicios(rs);
    const hecho = cargaDeSeries([
      { ex: 'dominada-neutra', who: 'me', i: 1, kg: 0, reps: 8 }, { ex: 'dominada-neutra', who: 'me', i: 2, kg: 0, reps: 7 },
      { ex: 'dominada-neutra', who: 'partner', i: 1, kg: 0, reps: 5 }, { ex: 'no-existe', who: 'me', i: 1, kg: 1, reps: 1 },
    ], indice);
    expect(hecho).toEqual({ dorsales: 2, biceps: 1 });
    expect(cargaDeSeries([{ ex: 'dominada-neutra', who: 'partner', i: 1, kg: 0, reps: 5 }], indice, 'partner')).toEqual({ dorsales: 1, biceps: 0.5 });
  });

  it('el calor va en cuatro pasos contra lo planeado, y la luz de una rutina separa principal de acompañante', () => {
    expect(calor({ pecho: 1, dorsales: 5, biceps: 9, gemelos: 30 }, { pecho: 12, dorsales: 9, biceps: 9, gemelos: 4 })).toEqual({ pecho: 0.25, dorsales: 0.75, biceps: 1, gemelos: 1 });
    expect(calor({ pecho: 0 }, { pecho: 12 })).toEqual({});
    expect(calor({ gluteos: 5 })).toEqual({ gluteos: 0.5 }); // sin plan para ese músculo: contra 10 series
    const luz = luzDeRutina(defaultRoutines().find((r) => r.id === 'push-a')!);
    expect(luz).toMatchObject({ pecho: 1, hombros: 1, triceps: 1, oblicuos: 1, abdominales: 0.5 });
    expect(luz.dorsales).toBeUndefined();
  });
});

describe('Entreno 2.0 · la figura del cuerpo', () => {
  it('cada músculo tiene su dibujo en la vista que le toca', () => {
    for (const m of MUSCULOS) for (const v of VISTA[m]) expect(TRAZOS[v][m]?.length, `${m} · ${v}`).toBeGreaterThan(0);
    for (const v of ['frente', 'espalda'] as const) for (const m of Object.keys(TRAZOS[v])) expect(VISTA[m as 'pecho'], `${m} · ${v}`).toContain(v);
  });

  it('enciende lo que le pasan, de los dos lados, y dice en palabras lo que muestra', () => {
    const { container } = render(<Cuerpo luz={{ pecho: 1, triceps: 0.5 }} nombre="Push trabaja pecho y tríceps." />);
    expect(screen.getByRole('img', { name: 'Push trabaja pecho y tríceps.' })).toBeTruthy();
    const pecho = container.querySelectorAll<SVGPathElement>('[data-m="pecho"]');
    expect(pecho.length).toBe(TRAZOS.frente.pecho!.length * 2); // la mitad derecha y su espejo
    for (const p of pecho) { expect(p.classList.contains('on')).toBe(true); expect(p.style.getPropertyValue('--p')).toBe('100%'); }
    expect(container.querySelector<SVGPathElement>('[data-m="triceps"]')!.style.getPropertyValue('--p')).toBe('50%');
    expect(container.querySelector('[data-m="dorsales"]')!.classList.contains('on')).toBe(false);
    expect(container.querySelectorAll('figure')).toHaveLength(2);
    expect(enPalabras({ pecho: 1, hombros: 0.5, triceps: 0.5 })).toBe('pecho, hombros y tríceps');
    expect(enPalabras({})).toBe('nada');
  });

  it('una sola vista, músculos que laten y tocar un músculo', () => {
    const tocados: string[] = [];
    const { container } = render(<Cuerpo luz={{ dorsales: 1 }} pulso={['dorsales']} vistas={['espalda']} rotulos={false} tono="hecho" nombre="Espalda" onTocar={(m) => tocados.push(m)} />);
    expect(container.querySelectorAll('figure')).toHaveLength(1);
    expect(container.querySelector('figcaption')).toBeNull();
    expect(container.querySelector('.cu')!.classList.contains('cu-hecho')).toBe(true);
    expect(container.querySelector('[data-m="dorsales"]')!.classList.contains('pulso')).toBe(true);
    fireEvent.click(container.querySelector('[data-m="gluteos"]')!);
    expect(tocados).toEqual(['gluteos']);
  });

  it('cada ejercicio se muestra del lado en que se ve su músculo principal', () => {
    const de = (rid: string, eid: string) => luzDeEjercicio(rutina(rid).exercises.find((e) => e.id === eid)!);
    expect(de('push-a', 'press-inclinado-mancuernas')).toEqual({ luz: { pecho: 1, hombros: 0.5 }, vista: 'frente' });
    expect(de('pull-a', 'dominada-neutra').vista).toBe('espalda');
    expect(de('push-a', 'pressdown-barra').vista).toBe('espalda');
  });
});

describe('Entreno 2.0 · la semana y el volumen', () => {
  it('los siete días con lo que toca, lo hecho y cuál es hoy', () => {
    guardar(sesion('pull-a', '2026-11-23'));
    const dias = semanaDe(train(), HOY, HOY);
    expect(dias.map((d) => d.rutina?.id ?? (d.descanso ? 'descanso' : null))).toEqual(['pull-a', 'legs-a', 'push-a', 'upper', 'lower', null, null]);
    expect(dias.map((d) => d.hecho)).toEqual([true, false, false, false, false, false, false]);
    expect(dias.filter((d) => d.hoy).map((d) => d.fecha)).toEqual([HOY]);
  });

  it('el volumen suma lo guardado en la semana y lo del entreno en curso, contra lo planeado', () => {
    guardar(sesion('pull-a', '2026-11-23'), sesion('pull-a', '2026-11-16'));
    let v = volumenSemana(train(), HOY, HOY);
    expect(v.sesiones).toBe(1);
    expect(v.planeadas).toBe(5);
    expect(v.hecho.dorsales).toBe(9);
    expect(v.plan.dorsales).toBe(15); // Pull A (9) + Upper (6)
    expect(v.hecho.pecho).toBeUndefined();
    act(() => { startTraining('push-a', HOY, false); patchActive((a) => ({ ...a, draft: { me: { kg: 20, reps: 10 } } })); logSet(); });
    v = volumenSemana(train(), HOY, HOY);
    expect(v.hecho.pecho).toBe(1);
    expect(v.hecho.hombros).toBe(0.5);
  });

  it('los ejercicios que le dan series a un músculo, con el principal primero', () => {
    const xs = ejerciciosDe('biceps', [rutina('pull-a'), rutina('upper')]);
    expect(xs[0].principal).toBe(true);
    expect(xs.filter((x) => x.principal).map((x) => x.nombre)).toEqual(expect.arrayContaining(['Curl en banco Scott con barra Z']));
    expect(xs.some((x) => !x.principal && x.series === 1.5)).toBe(true);
    expect(ejerciciosDe('gemelos', [rutina('pull-a')])).toEqual([]);
  });
});

describe('Entreno 2.0 · el centro', () => {
  const abrir = () => render(<><EntrenoV2 {...props('#/entreno')} />{global}</>);

  it('lo que toca hoy con la figura encendida, y la semana', () => {
    abrir();
    expect(screen.getByRole('heading', { level: 1, name: /Entreno/ })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Push A' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Push A trabaja pecho, hombros, tríceps/ })).toBeTruthy();
    const semana = screen.getByRole('list', { name: 'Semana de entreno' });
    expect(within(semana).getAllByRole('listitem')).toHaveLength(7);
    expect(within(semana).getByLabelText('X: Push A').getAttribute('aria-current')).toBe('date');
  });

  it('empezar arma la sesión (con o sin compañera) y lleva al reproductor', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Con Abi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Empezar Push A' }));
    expect(activa().routineId).toBe('push-a');
    expect(activa().athletes).toEqual(['me']);
    expect(location.hash).toBe('#/entreno-sesion/push-a');
  });

  it('con un entreno en curso, el botón vuelve a la sesión sin empezar otra', () => {
    act(() => startTraining('push-a', HOY, true));
    const empezo = activa().startedAt;
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Push A' }));
    expect(activa().startedAt).toBe(empezo);
    expect(activa().athletes).toEqual(['me', 'partner']);
    expect(location.hash).toBe('#/entreno-sesion/push-a');
  });

  it('la sesión paso a paso se abre en una hoja', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /La sesión, paso a paso/ }));
    const d = dialogo();
    for (const e of rutina('push-a').exercises) expect(within(d).getByText(e.name)).toBeTruthy();
  });

  it('el volumen de la semana: series hechas contra las planeadas, músculo por músculo, y el detalle de cada uno', () => {
    guardar(sesion('pull-a', '2026-11-23'));
    abrir();
    const grupo = screen.getByRole('region', { name: 'Volumen de la semana' });
    expect(within(grupo).getByText('1 de 5 sesiones')).toBeTruthy();
    expect(within(grupo).getByRole('img', { name: /^Esta semana trabajaste/ })).toBeTruthy();
    fireEvent.click(within(grupo).getByRole('button', { name: 'Dorsales: 9 de 15 series' }));
    const d = dialogo();
    expect(within(d).getByText('9 de 15 series esta semana.')).toBeTruthy();
    expect(within(d).getByText('Dominada con agarre neutro')).toBeTruthy();
    expect(within(grupo).queryByRole('button', { name: /^Gemelos/ })).toBeNull();
    fireEvent.click(within(grupo).getByRole('button', { name: /^Ver los/ }));
    expect(within(grupo).getByRole('button', { name: /^Gemelos: 0 de/ })).toBeTruthy();
  });

  it('con el día hecho, la tarjeta lleva al resumen', () => {
    guardar(sesion('push-a', HOY));
    abrir();
    expect(screen.getByText('Hoy, hecho')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver el resumen' }).getAttribute('href')).toBe(`#/entreno-resumen/s-push-a-${HOY}`);
    expect(screen.queryByRole('button', { name: /Empezar/ })).toBeNull();
  });

  it('las corridas: el gráfico, y borrar una se puede deshacer', () => {
    act(() => { addRun({ date: '2026-11-22', min: 45, km: 6.9, kind: 'fondo', feel: 5 }); addRun({ date: '2026-11-19', min: 22, kind: 'series', feel: 3 }); });
    abrir();
    expect(screen.getByRole('img', { name: /^Minutos de las últimas 2 corridas/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Últimas corridas/ }));
    fireEvent.click(within(dialogo()).getAllByRole('button', { name: 'Borrar' })[0]);
    expect(train().runs.map((r) => r.date)).toEqual(['2026-11-19']);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(train().runs.map((r) => r.date)).toEqual(['2026-11-19', '2026-11-22']);
  });

  it('las otras rutinas, cambiar la semana, el peso y el motor quedan a un toque', () => {
    abrir();
    expect(screen.getByRole('link', { name: /Pull A/ }).getAttribute('href')).toBe('#/entreno-rutina/pull-a');
    expect(screen.queryByRole('link', { name: /^Push A/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Cambiar la semana/ }).getAttribute('href')).toBe('#/entreno-semana');
    expect(screen.getByRole('link', { name: /^Peso/ }).getAttribute('href')).toBe('#/entreno-peso');
    expect(screen.getByRole('link', { name: /Motor de entreno/ }).getAttribute('href')).toBe('#/entreno-motor');
  });
});

describe('Entreno 2.0 · la sesión', () => {
  const abrir = () => render(<><SesionV2 />{global}</>);
  const hecha = (n: number) => screen.getByRole('button', { name: `Serie ${n} hecha` });

  it('sin entreno en curso, manda a Entreno', () => {
    abrir();
    expect(screen.getByText('No hay un entreno en curso')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir a Entreno' }).getAttribute('href')).toBe('#/entreno');
  });

  it('muestra el ejercicio, sus series como barras y la figura con lo que trabaja', () => {
    act(() => startTraining('push-a', HOY, false));
    abrir();
    expect(screen.getByRole('heading', { level: 1, name: /Push A/ })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Press inclinado con mancuernas' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Trabaja pecho y hombros.' })).toBeTruthy();
    const series = within(screen.getByRole('list', { name: 'Series de Toti' })).getAllByRole('listitem');
    expect(series).toHaveLength(3);
    expect(series[0].getAttribute('aria-current')).toBe('step');
    expect(series[0].getAttribute('aria-label')).toMatch(/^Serie 1: objetivo \d+, es la que sigue$/);
    expect(screen.getByRole('timer', { name: /^Tiempo de entreno: 0:0\d de 120:00$/ })).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(6);
  });

  it('cargar una serie: pide el peso, la guarda, llena la barra y arranca el descanso', () => {
    act(() => startTraining('push-a', HOY, false));
    abrir();
    expect(hecha(1).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Elegí con cuánto peso hacés esta serie.')).toBeTruthy();
    fireEvent.click(hecha(1));
    expect(activa().sets).toHaveLength(0);
    escribir('Kilos', '26');
    fireEvent.click(within(screen.getByRole('group', { name: 'Repeticiones' })).getByRole('button', { name: 'Sumar 1' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'RIR que te quedó (opcional)' })).getByRole('button', { name: '2' }));
    const reps = activa().draft.me!.reps;
    fireEvent.click(hecha(1));
    expect(activa().sets).toEqual([{ ex: 'press-inclinado-mancuernas', who: 'me', i: 1, kg: 26, reps, rir: 2 }]);
    const series = within(screen.getByRole('list', { name: 'Series de Toti' })).getAllByRole('listitem');
    expect(series[0].getAttribute('aria-label')).toContain(`Serie 1: 26 kg por ${reps}, hecha`);
    expect(series[1].getAttribute('aria-current')).toBe('step');
    expect(screen.getByRole('timer', { name: /^Descanso: quedan \d:\d\d$/ })).toBeTruthy();
    expect(hecha(2)).toBeTruthy();
  });

  it('el descanso se alarga 15 segundos o se salta', () => {
    act(() => { startTraining('push-a', HOY, false); patchActive((a) => ({ ...a, draft: { me: { kg: 26, reps: 10 } } })); logSet(); });
    abrir();
    const fin = activa().rest.me!.endsAt;
    fireEvent.click(screen.getByRole('button', { name: '+15 s' }));
    expect(activa().rest.me!.endsAt).toBe(fin + 15000);
    fireEvent.click(screen.getByRole('button', { name: 'Saltar' }));
    expect(screen.queryByRole('timer', { name: /^Descanso/ })).toBeNull();
  });

  it('deshacer la última serie, pasar al siguiente ejercicio y saltar a otro desde la tira', () => {
    act(() => { startTraining('push-a', HOY, false); patchActive((a) => ({ ...a, draft: { me: { kg: 26, reps: 10 } } })); });
    abrir();
    fireEvent.click(hecha(1));
    fireEvent.click(screen.getByRole('button', { name: /Deshacer la última serie/ }));
    expect(activa().sets).toHaveLength(0);
    for (const n of [1, 2, 3]) fireEvent.click(hecha(n));
    expect(activa().sets).toHaveLength(3);
    expect(screen.queryByRole('group', { name: 'Kilos' })).toBeNull();
    expect(screen.getByRole('tab', { name: /Press inclinado con mancuernas, hecho/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: Press horizontal con barra' }));
    expect(activa().idx).toBe(1);
    expect(screen.getByRole('heading', { level: 2, name: 'Press horizontal con barra' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Woodchopper/ }));
    expect(activa().idx).toBe(5);
    expect(screen.getByRole('tab', { name: /Woodchopper/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('el calentamiento se tilda en su hoja y "Cómo se hace" abre la ficha del ejercicio', () => {
    act(() => startTraining('push-a', HOY, false));
    abrir();
    const pasos = rutina('push-a').calentamiento!;
    fireEvent.click(screen.getByRole('button', { name: /^Calentamiento/ }));
    fireEvent.click(within(dialogo()).getByRole('checkbox', { name: new RegExp(pasos[0].name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }));
    expect(activa().warmDone).toEqual([pasos[0].id]);
    fireEvent.click(screen.getByRole('button', { name: 'Cómo se hace' }));
    expect(within(dialogo()).getByText('Tempo')).toBeTruthy();
  });

  it('de a dos: cada uno carga lo suyo y el descanso puede ser compartido', () => {
    act(() => { startTraining('push-a', HOY, true); patchActive((a) => ({ ...a, draft: { me: { kg: 26, reps: 10 }, partner: { kg: 10, reps: 9 } } })); });
    abrir();
    expect(screen.getByRole('list', { name: 'Series de Toti' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Series de Abi' })).toBeTruthy();
    fireEvent.click(screen.getByRole('switch', { name: /Descanso compartido/ }));
    expect(activa().restMode).toBe('shared');
    fireEvent.click(screen.getByRole('button', { name: 'Serie 1 de Toti hecha' }));
    expect(activa().who).toBe('partner');
    expect(screen.queryByRole('timer', { name: /^Descanso/ })).toBeNull(); // compartido: arranca cuando los dos marcaron
    fireEvent.click(screen.getByRole('button', { name: 'Serie 1 de Abi hecha' }));
    expect(activa().sets.map((s) => `${s.who}:${s.kg}×${s.reps}`)).toEqual(['me:26×10', 'partner:10×9']);
    expect(screen.getByRole('timer', { name: /^Descanso: quedan/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /^Toti/ }));
    expect(activa().who).toBe('me');
  });

  it('terminar guarda la sesión y abre el resumen', () => {
    act(() => { startTraining('push-a', HOY, false); patchActive((a) => ({ ...a, draft: { me: { kg: 26, reps: 10 } } })); logSet(); });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /^Terminar entreno/ }));
    expect(train().active).toBeNull();
    expect(train().sessions).toHaveLength(1);
    expect(train().sessions[0].sets).toHaveLength(1);
    expect(train().sessions[0].skipped).toHaveLength(5);
    expect(location.hash).toBe(`#/entreno-resumen/${train().sessions[0].id}`);
  });

  it('descartar pregunta antes y no guarda nada', async () => {
    act(() => { startTraining('push-a', HOY, false); patchActive((a) => ({ ...a, draft: { me: { kg: 26, reps: 10 } } })); logSet(); });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Descartar el entreno' }));
    const d = await screen.findByRole('alertdialog');
    expect(train().active).not.toBeNull();
    fireEvent.click(within(d).getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(train().active).toBeNull());
    expect(train().sessions).toHaveLength(0);
    expect(location.hash).toBe('#/entreno');
  });

  it('cuando se termina el tiempo del bloque avisa, y se puede seguir 10 minutos o sin límite', () => {
    act(() => { startTraining('push-a', HOY, false); patchActive((a) => ({ ...a, startedAt: Date.now() - (a.limitMin * 60 + 5) * 1000, draft: { me: { kg: 26, reps: 10 } } })); logSet(); });
    abrir();
    const d = screen.getByRole('dialog', { name: 'Hora de ir a casa' });
    expect(within(d).getByText('Pasaron los 120 minutos del bloque.')).toBeTruthy();
    expect(within(d).getByText(/^Quedaron: Press horizontal con barra/)).toBeTruthy();
    fireEvent.click(within(d).getByRole('button', { name: '10 min' }));
    expect(activa().limitMin).toBe(130);
    act(() => patchActive((a) => ({ ...a, startedAt: Date.now() - (a.limitMin * 60 + 5) * 1000 })));
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Seguir sin límite' }));
    expect(activa().noLimit).toBe(true);
  });
});

describe('Entreno 2.0 · el resumen', () => {
  it('la figura con lo que trabajaste, los números, los récords y la próxima', () => {
    const previa = sesion('push-a', '2026-11-18', 99, 20);
    const hoy: TrainSession = { ...sesion('push-a', HOY, 5, 22.5), id: 'hoy', minutes: 96, skipped: ['woodchopper'], records: [{ who: 'me', ex: 'press-horizontal-barra', name: 'Press horizontal con barra', kg: 22.5, reps: 8, text: '+2,5 kg contra la mejor marca' }] };
    guardar(previa, hoy);
    render(<><ResumenV2 {...props('#/entreno-resumen/hoy')} />{global}</>);
    expect(screen.getByRole('heading', { level: 1, name: 'Push A' })).toBeTruthy();
    const figura = screen.getByRole('img', { name: /^Trabajaste pecho, hombros y tríceps\.$/ });
    expect(figura.classList.contains('cu-hecho')).toBe(true);
    expect(screen.getByText('96')).toBeTruthy();
    expect(screen.getByText('1/5')).toBeTruthy();
    const records = screen.getByRole('region', { name: 'Récords' });
    expect(within(records).getByText('Press horizontal con barra')).toBeTruthy();
    expect(within(records).getByText('22,5 kg × 8')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Quedaron' })).getByText('Woodchopper.')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'La próxima' })).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Volver a Hoy' }).getAttribute('href')).toBe('#/hoy');
  });

  it('la nota se guarda al salir del campo', () => {
    guardar({ ...sesion('push-a', HOY), id: 'hoy' });
    render(<><ResumenV2 {...props('#/entreno-resumen/hoy')} />{global}</>);
    const campo = screen.getByRole('textbox', { name: 'Nota de la sesión' });
    fireEvent.change(campo, { target: { value: 'Hombro bien.' } });
    expect(train().sessions[0].note).toBe('');
    fireEvent.blur(campo);
    expect(train().sessions[0].note).toBe('Hombro bien.');
  });

  it('un resumen que no existe lo dice y vuelve a Entreno', () => {
    render(<><ResumenV2 {...props('#/entreno-resumen/nada')} />{global}</>);
    expect(screen.getByText('No encontré ese entreno')).toBeTruthy();
  });
});

describe('Entreno 2.0 · el peso', () => {
  const abrir = () => render(<><PesoV2 {...props('#/entreno-peso')} />{global}</>);

  it('sin pesajes explica qué hacer; cargar el de hoy lo guarda y se puede deshacer', () => {
    abrir();
    expect(screen.getByText('Todavía no hay pesajes')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registrar' }).getAttribute('aria-disabled')).toBe('true');
    escribir('Peso en kilos', '82,8');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(train().weights).toEqual([{ date: HOY, kg: 82.8 }]);
    expect(screen.getByRole('img', { name: /^Curva de peso: 25 nov 82,8 kg\. Meta: 95 kg\.$/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(train().weights).toEqual([]);
  });

  it('con pesajes: el último en grande, la curva, el cambio y cuánto falta', () => {
    act(() => { addWeight('2026-10-25', 81); addWeight('2026-11-08', 82); addWeight('2026-11-22', 83); });
    abrir();
    const tarjeta = screen.getByRole('region', { name: 'Último pesaje' });
    expect(within(tarjeta).getByText('Domingo 22 nov')).toBeTruthy();
    expect(within(tarjeta).getByText('1 kg')).toBeTruthy(); // subió 1 kg desde el anterior
    expect(within(tarjeta).getByText('+2')).toBeTruthy(); // en 4 semanas
    expect(within(tarjeta).getByText('12')).toBeTruthy(); // para la meta
    expect(within(tarjeta).getByText('~24')).toBeTruthy(); // semanas al ritmo (0,5 kg por semana)
    expect(tarjeta.querySelectorAll('.en-curva-punto')).toHaveLength(2);
    expect(tarjeta.querySelectorAll('.en-curva-hoy')).toHaveLength(1);
  });

  it('corregir el de hoy reemplaza, y deshacer vuelve al anterior', () => {
    act(() => addWeight(HOY, 82));
    abrir();
    expect(screen.getByRole('region', { name: 'Corregir el de hoy' })).toBeTruthy();
    escribir('Peso en kilos', '82,4');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(train().weights).toEqual([{ date: HOY, kg: 82.4 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(train().weights).toEqual([{ date: HOY, kg: 82 }]);
  });

  it('la meta, las medidas y borrar un pesaje (con deshacer) van cada uno en su hoja', () => {
    act(() => { addWeight('2026-11-15', 82); addWeight('2026-11-22', 83); });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: /^Meta/ }));
    escribir('Meta de peso en kilos', '90');
    expect(train().goalKg).toBe(90);

    fireEvent.click(screen.getByRole('button', { name: /^Medidas/ }));
    expect(within(dialogo()).getByRole('button', { name: 'Guardar medidas' }).getAttribute('aria-disabled')).toBe('true');
    escribir('Cintura en centímetros', '84,5');
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Guardar medidas' }));
    expect(train().medidas).toEqual([{ date: HOY, cintura: 84.5, pecho: undefined, brazo: undefined }]);

    fireEvent.click(screen.getByRole('button', { name: /^Pesajes/ }));
    fireEvent.click(within(dialogo()).getAllByRole('button', { name: 'Borrar' })[0]);
    expect(train().weights).toEqual([{ date: '2026-11-15', kg: 82 }]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Deshacer' }).pop()!);
    expect(train().weights).toEqual([{ date: '2026-11-15', kg: 82 }, { date: '2026-11-22', kg: 83 }]);
  });

  it('la curva pasa por todos los puntos sin pasarse de largo, y el eje usa pasos redondos', () => {
    const d = caminoSuave([[0, 10], [10, 30], [20, 30], [30, 5]]);
    expect(d.startsWith('M0 10C')).toBe(true);
    expect(d.endsWith(' 30 5')).toBe(true);
    const ys = [...d.matchAll(/[\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(30);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(5);
    expect(caminoSuave([[4, 8]])).toBe('M4 8');
    expect(caminoSuave([])).toBe('');
    expect([pasoLindo(2), pasoLindo(7), pasoLindo(14), pasoLindo(0.9)]).toEqual([0.5, 2, 5, 0.5]);
  });
});

describe('Entreno 2.0 · el motor', () => {
  it('el gráfico cuenta la doble progresión y las reglas van en una línea', () => {
    render(<><MotorV2 {...props('#/entreno-motor')} />{global}</>);
    expect(screen.getByRole('heading', { level: 1, name: 'Motor de entreno' })).toBeTruthy();
    const grafico = screen.getByRole('img', { name: /^Cinco sesiones de press de banca/ });
    expect(grafico.querySelectorAll('.en-motor-barra')).toHaveLength(EJEMPLO.length * 3);
    expect(grafico.querySelectorAll('.en-al-tope')).toHaveLength(5); // dos series en la tercera sesión y las tres en la cuarta
    expect(screen.getByText('+1 a 5')).toBeTruthy(); // lo que sube al llegar al tope, del aislamiento a las piernas
    expect(screen.getByText('Si se estanca')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Todas las reglas/ }));
    const reglas = dialogo();
    expect(within(reglas).getByText('Cuánto sube · +5 · +2,5 · +1 kg')).toBeTruthy();
    expect(within(reglas).getByText('Toti y Abi tienen rangos, pesos y récords separados.')).toBeTruthy();
    expect(within(reglas).getAllByRole('term')).toHaveLength(7);
    expect(screen.getByRole('link', { name: 'Entreno' }).getAttribute('href')).toBe('#/entreno');
  });

  it('lo que toca la próxima vez, por persona, calculado con el historial', () => {
    const s = sesion('push-a', '2026-11-18');
    guardar({ ...s, athletes: ['me', 'partner'], sets: [...s.sets, ...s.sets.map((x) => ({ ...x, who: 'partner' as const, kg: 10 }))] });
    render(<><MotorV2 {...props('#/entreno-motor')} />{global}</>);
    const prox = screen.getByRole('region', { name: 'Próxima Push A' });
    const e = rutina('push-a').exercises[0];
    expect(within(prox).getAllByRole('listitem')).toHaveLength(6);
    expect(within(prox).getAllByRole('listitem')[0].textContent).toContain(`20 kg × ${e.repMin + 1}`);
    fireEvent.click(within(prox).getByRole('radio', { name: 'Abi' }));
    expect(within(prox).getAllByRole('listitem')[0].textContent).toContain(`10 kg × ${e.repMin + 1}`);
  });

  it('con una sesión en curso, vuelve a la sesión', () => {
    act(() => startTraining('push-a', HOY, false));
    render(<><MotorV2 {...props('#/entreno-motor')} />{global}</>);
    expect(screen.getByRole('link', { name: 'Sesión' }).getAttribute('href')).toBe('#/entreno-sesion/push-a');
  });
});
