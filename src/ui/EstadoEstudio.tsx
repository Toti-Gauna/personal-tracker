/**
 * Ola 28 · "¿En qué estado estás?": la hoja que aparece al cerrar la meta de matemática o una sesión de estudio.
 * El capítulo no avanza por tiempo: lo marcás vos. Después el motor agenda solo el cold recall, el test, la tesis
 * y los repasos de los días 8, 22 y 61.
 */
import { useSyncExternalStore } from 'react';
import { AREAS } from '../data/defaults';
import { capitulosEnJuego, type InfoCap } from '../data/estado-capitulo';
import { actShort, librosMate } from '../data/study';
import type { Activity } from '../data/study-types';
import { ir } from '../lib/routes';
import { getState, useStore } from '../state/store';
import { seguirEstudiando, terminarEstudio, volverAEstudiar } from '../state/study';
import { toast } from './avisos';
import { Hoja } from './Hoja';

type Abierta = { date: string; actividades?: string[]; nota?: string } | null;
let abierta: Abierta = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };

/** Abre la hoja. Sin `actividades`, la de los libros de matemática en curso. */
export const abrirEstadoEstudio = (date: string, opciones: { actividades?: string[]; nota?: string } = {}) => {
  abierta = { date, ...opciones };
  emit();
};
const cerrar = () => { abierta = null; emit(); };
/** Solo para tests. */
export const estadoEstudioAbierto = () => abierta;
export const cerrarEstadoEstudio = cerrar;

/** ¿Hay algo que preguntar? (un libro con capítulos en juego). */
export function hayQuePreguntar(date: string, actividades?: string[]) {
  const st = getState().study;
  const libros = actividades ? st.activities.filter((a) => actividades.includes(a.id) && a.units?.length && !a.libro) : librosMate(st);
  return libros.some((a) => capitulosEnJuego(st, a, date).length > 0);
}

export function EstadoEstudio() {
  const a = useSyncExternalStore(subscribe, () => abierta);
  if (!a) return null;
  return <HojaEstado key={`${a.date}:${a.actividades?.join(',') ?? ''}`} {...a} />;
}

function HojaEstado({ date, actividades, nota }: { date: string; actividades?: string[]; nota?: string }) {
  const study = useStore((s) => s.study);
  const libros = actividades ? study.activities.filter((a) => actividades.includes(a.id) && a.units?.length) : librosMate(study);
  const front = study.fronts.find((f) => f.id === libros[0]?.front);
  const color = front ? AREAS[front.color].css : 'var(--ing)';
  return (
    <Hoja titulo="¿En qué estado estás?" kicker={libros.length ? libros.map(actShort).join(' y ') : 'Estudio'} color={color} onCerrar={cerrar}>
      <div className="ee">
        {nota && <p className="sub">{nota}</p>}
        <p className="sub">El capítulo no avanza solo: marcá dónde quedaste. El cold recall, el test, la tesis y los repasos se agendan después, solos.</p>
        {libros.map((l) => <Libro key={l.id} a={l} date={date} />)}
        <button className="btn-principal" onClick={cerrar}>Listo</button>
      </div>
    </Hoja>
  );
}

function Libro({ a, date }: { a: Activity; date: string }) {
  const study = useStore((s) => s.study);
  const caps = capitulosEnJuego(study, a, date);
  return (
    <section className="ee-libro" aria-label={actShort(a)}>
      <div className="fila-t"><span className="etiqueta">{actShort(a)}</span><a className="subrayado" href={`#/estudio/mate/libro/${a.id}`} onClick={cerrar}>Ver el libro</a></div>
      {caps.length === 0 ? <p className="sub">Nada en juego hoy.</p> : caps.map((c) => <Capitulo key={c.n} a={a} c={c} date={date} />)}
    </section>
  );
}

function Capitulo({ a, c, date }: { a: Activity; c: InfoCap; date: string }) {
  const nombre = `${a.unitLabel ?? 'Cap.'} ${c.n} · ${c.unit.title}`;
  const ok = (title: string, sub: string) => toast({ title, sub, color: 'var(--ing)' }, false);
  const done = (getState().days[date]?.studyDone ?? []).includes(`learn:${a.id}:${c.n}`);
  return (
    <div className="ee-cap">
      <div className="ee-cap-t"><b>{nombre}</b><span className="mono sub">{c.etiqueta}</span></div>
      <div className="ee-botones">
        {c.estado === 'estudiando' && (
          <>
            <button className="btn-borde" aria-pressed={done} onClick={() => { seguirEstudiando(date, a.id, c.n); ok('Sigue el mismo capítulo', `${nombre}: mañana continúa, sin test todavía`); }}>{done ? 'Sigo estudiándolo ✓' : 'Sigo estudiándolo'}</button>
            <button className="btn-borde" onClick={() => {
              const e = terminarEstudio(date, a.id, c.n);
              if (e) { toast({ title: e, sub: 'Una frase por capítulo, en el libro', color: 'var(--handyx)' }, false); return; }
              ok('Capítulo estudiado', 'Mañana: cold recall y test completo');
            }}>Lo terminé · test mañana</button>
          </>
        )}
        {(c.estado === 'test' || c.estado === 'retest') && (
          <>
            <button className="btn-borde" onClick={() => { cerrar(); ir(`test/${a.id}/${c.n}`); }}>Hice el test · cargar el resultado</button>
            {c.estado === 'test' && !c.tests.length && (
              <button className="btn-borde" onClick={() => { if (volverAEstudiar(a.id, c.n)) ok('Volvió a "estudiando"', `${nombre}: se sacaron el cold recall y el test`); }}>Todavía no lo terminé</button>
            )}
          </>
        )}
        {c.estado === 'tesis' && c.tesis && <button className="btn-borde" onClick={() => { cerrar(); ir(`tesis/${c.tesis!.id}`); }}>Escribir la tesis</button>}
      </div>
    </div>
  );
}
