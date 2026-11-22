/**
 * Trazo 2.0 · los hábitos. Cada hábito es una meta de la rutina: está hecho el día en que esa meta quedó hecha. Acá se ve
 * la semana (un punto por día, con su letra arriba), la racha, y un botón de verdad para marcarlo: tilda todos sus pasos.
 */
import { estadoHabitos, type EstadoHabito } from '../../data/habitos';
import type { DayLog } from '../../data/types';
import { toggleTask, useStore } from '../../state/store';
import { marcarTarea } from '../../ui/acciones';
import { Icono } from '../iconos';
import { aviso } from '../kit/capas';
import { festejar } from '../movimiento/movimiento';
import { Grupo } from '../marco/Marco';
import { nombreHabito } from './datos';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Marca el hábito de hoy: tilda los pasos que faltan de su meta, con "Deshacer". */
export function marcarHabito(day: DayLog, id: string) {
  const b = day.blocks.find((x) => x.key === id);
  if (!b || b.salteado) return false;
  const faltan = b.tasks.filter((t) => !t.done).map((t) => t.id);
  if (!faltan.length) return false;
  for (const t of faltan) marcarTarea(day.date, b.key, t);
  aviso({ titulo: 'Hábito hecho', sub: nombreHabito(b.title), tono: 'hecho', deshacer: () => { for (const t of faltan) toggleTask(day.date, b.key, t); } });
  return true;
}

function Habito({ h, day, onAbrir }: { h: EstadoHabito; day: DayLog; onAbrir: (clave: string) => void }) {
  const bloque = day.blocks.find((b) => b.key === h.habito.id && !b.salteado);
  const nombre = nombreHabito(h.habito.nombre);
  const sePuede = h.hoy.toca && !h.hoy.hecho && !!bloque && bloque.tasks.some((t) => !t.done);
  const nota = h.hoy.hecho ? 'Hecho hoy' : !h.hoy.toca ? 'Hoy no toca' : bloque ? `Hoy · ${bloque.start}` : 'No está en la rutina de hoy';
  return (
    <li className={`hy-habito${h.hoy.hecho ? ' hecho' : ''}${h.hoy.toca ? '' : ' no-toca'}`}>
      {sePuede
        ? <button type="button" className="hy-habito-marca" aria-label={`Marcar hecho: ${nombre}`} onClick={(e) => { festejar(e.currentTarget); marcarHabito(day, h.habito.id); }} />
        : <span className="hy-habito-marca fija" aria-hidden="true">{h.hoy.hecho && <Icono nombre="tilde" lado={16} />}</span>}
      {bloque
        ? <button type="button" className="hy-habito-texto" onClick={() => onAbrir(bloque.key)} title={h.habito.nombre}><b>{nombre}</b><small>{nota} · Racha: {h.racha}</small></button>
        : <span className="hy-habito-texto" title={h.habito.nombre}><b>{nombre}</b><small>{nota} · Racha: {h.racha}</small></span>}
      <span className="hy-semana" role="img" aria-label={`Esta semana: ${h.semana.filter((d) => d.hecho).length} de ${h.semana.filter((d) => d.hecho != null).length}`}>
        {h.semana.map((d) => <i key={d.fecha} className={`${d.hecho == null ? 'no' : d.hecho ? 'si' : d.fecha < day.date ? 'falto' : 'viene'}${d.fecha === day.date ? ' hoy' : ''}`} />)}
      </span>
    </li>
  );
}

export function Habitos({ day, onAbrir }: { day: DayLog; onAbrir: (clave: string) => void }) {
  const days = useStore((s) => s.days);
  const habitos = estadoHabitos({ ...days, [day.date]: day }, day.date);
  if (!habitos.length) return null;
  return (
    <Grupo titulo="Hábitos" extremo={<span className="hy-semana letras" aria-hidden="true">{DIAS.map((d, i) => <i key={i}>{d}</i>)}</span>}>
      <ul className="capa-1 hy-habitos">
        {habitos.map((h) => <Habito key={h.habito.id} h={h} day={day} onAbrir={onAbrir} />)}
      </ul>
    </Grupo>
  );
}
