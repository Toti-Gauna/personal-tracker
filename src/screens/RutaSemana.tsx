import { useState } from 'react';
import { laneById } from '../data/ruta';
import { blockDone } from '../data/mejora';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { addWeekGoal, editWeekGoal, resetWeek } from '../state/ruta';
import { marcarTarea } from '../ui/acciones';
import { ChipRuta, Estado, chipDe } from '../ui/RutaBits';
import { useRutaVista } from '../ui/useRuta';
import '../styles/ruta.css';

const COLOR: Record<string, string> = { hilo: 'var(--eclipse)', manual: 'var(--sub)' };

/** 7.3 De la ruta a tu día: el bimestre se parte en semanas y la semana en días. */
export function RutaSemana({ day }: { day: DayLog }) {
  const date = day.date;
  const v = useRutaVista(date);
  const ruta = useStore((s) => s.ruta);
  const [editar, setEditar] = useState(false);
  const [nueva, setNueva] = useState('');
  const b = v.b;
  const conRuta = day.blocks.filter((x) => x.ref);
  const sinRuta = day.blocks.filter((x) => !x.ref).map((x) => x.short.replace(/^(la|el) /, ''));
  const lista = sinRuta.length ? `${sinRuta.slice(0, -1).join(', ')}${sinRuta.length > 1 ? ' y ' : ''}${sinRuta[sinRuta.length - 1]}` : 'El resto';

  /** Marcar desde acá cumple la meta entera (o la desmarca). */
  const tocar = (key: string) => {
    const bl = day.blocks.find((x) => x.key === key)!;
    if (blockDone(bl)) bl.tasks.forEach((t) => t.done && marcarTarea(date, key, t.id));
    else bl.tasks.filter((t) => !t.done).forEach((t) => marcarTarea(date, key, t.id));
  };

  return (
    <main className="pantalla r-pant">
      <div className="topbar"><a className="volver" href="#/metas/ruta">Ruta</a></div>
      <h1 className="titulo">De la ruta a tu día</h1>
      <p className="sub">El bimestre se parte en semanas y la semana en días. Cada meta lleva su etiqueta: al marcarla, avanza el carril de la ruta al que pertenece.</p>

      <div className="etiqueta">La cadena</div>
      <div className="cadena">
        <div><b>Bimestre</b><span>B{b.n} · {b.product.name}</span></div>
        <span aria-hidden="true">→</span>
        <div className="on"><b>Semana {v.week}</b><span>{v.semana.length} metas</span></div>
        <span aria-hidden="true">→</span>
        <div><b>Hoy</b><span>{day.blocks.length} metas</span></div>
      </div>

      <div className="fila-t"><span className="etiqueta">Semana {v.week} · la arma la ruta</span>
        <button className="subrayado sub" onClick={() => setEditar((x) => !x)} aria-pressed={editar}>{editar ? 'Listo' : 'editable'}</button>
      </div>
      <ol className="sem-ruta">
        {v.semana.map(({ g, value }, i) => {
          const color = g.lane in COLOR ? COLOR[g.lane] : laneById(g.lane as never).color;
          const nombre = g.lane === 'hilo' ? 'Hilo' : g.lane === 'manual' ? 'Tuya' : `B${b.n} · ${laneById(g.lane as never).name}`;
          return (
            <li key={g.id} style={{ ['--c' as string]: color }}>
              <span className="n">{i + 1}</span>
              <div>
                {editar
                  ? <input className="campo-linea" value={g.title} onChange={(e) => editWeekGoal(date, g.id, { title: e.target.value })} aria-label={`Meta ${i + 1}`} />
                  : <b>{g.title}</b>}
                <ChipRuta lane={(g.lane in COLOR ? 'producto' : g.lane) as never} texto={`${nombre}${g.carried ? ' · viene de antes' : ''}`} />
                <div className="barra"><i style={{ width: `${Math.min(1, value / g.target) * 100}%` }} /></div>
              </div>
              <div className="acc">
                {editar ? (
                  <button aria-label={`Quitar ${g.title}`} onClick={() => editWeekGoal(date, g.id, null)}>×</button>
                ) : (
                  <>
                    {!g.refs.length && <button aria-label={`Sumar 1 a ${g.title}`} onClick={() => editWeekGoal(date, g.id, { count: (g.count ?? 0) + 1 })}>+</button>}
                    <span className="val">{String(value).replace('.', ',')}/{g.target}</span>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {editar && (
        <form className="nueva-sem" onSubmit={(e) => { e.preventDefault(); if (nueva.trim()) addWeekGoal(date, nueva.trim()); setNueva(''); }}>
          <input className="campo-texto" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="+ Meta tuya para esta semana" aria-label="Meta nueva" />
          <button className="subrayado" type="button" onClick={() => { resetWeek(date); setEditar(false); }}>Volver a la propuesta de la ruta</button>
        </form>
      )}
      <p className="sub r-nota">Lo que no se termina pasa a la semana siguiente y la ruta recalcula el ritmo.</p>

      <div className="etiqueta r-sec">Hoy · las metas con su etiqueta</div>
      <ul className="hoy-ruta items-ruta">
        {conRuta.map((x) => {
          const c = chipDe(x.ref!, ruta, date);
          const hechas = x.tasks.filter((t) => t.done).length;
          return (
            <li key={x.key}>
              <span className="mono hora">{x.start}</span>
              <Estado value={blockDone(x) ? 1 : hechas ? 0.5 : 0} label={x.title} onClick={() => tocar(x.key)} />
              <div><span>{x.n} {x.title}</span>{c && <div><ChipRuta lane={c.lane} texto={c.texto} /></div>}</div>
            </li>
          );
        })}
      </ul>
      <p className="sub r-nota">{lista[0].toUpperCase() + lista.slice(1)} no llevan etiqueta de ruta: siguen contando para la mejora del día, pero no mueven el roadmap.</p>

      <div className="cuando">
        <div className="etiqueta">Cuando marcás una meta</div>
        <ol>
          <li>Se tacha en Hoy y suma a la mejora del día.</li>
          <li>Avanza su meta de la semana.</li>
          <li>Mueve su carril del bimestre y recalcula si vas adelantado o atrasado.</li>
          <li>Si cierra un hito, aparece el aviso y el bimestre se acerca a su cierre.</li>
        </ol>
      </div>
    </main>
  );
}
