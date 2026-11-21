/**
 * Ola 32 · #/metas/compras: hardware y cuentas por fase, y los trámites (roadmap v7). Cada fase con su fecha límite y para qué
 * proyecto es; lo diferido (sensor de presión y caudalímetro) y lo opcional se ven pero no cuentan como pendiente.
 */
import { cuenta, estadoCompras } from '../data/compras';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { marcarCompra } from '../state/plan';
import { useStore } from '../state/store';
import { Casilla } from '../ui/Casilla';
import { Plegable } from '../ui/Plegable';
import '../styles/plan.css';
import '../styles/etapas.css';
import '../styles/revision.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fl = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

export function Compras({ day }: { day: DayLog }) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const fases = estadoCompras(plan, hoy);
  const pendientes = fases.reduce((s, f) => s + f.pendientes, 0);
  return (
    <main className="pantalla et-pag rev-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href="#/metas/etapas">Las 4 etapas</a><span className="mono sub">{pendientes} pendientes</span></div>
      <header><h1 className="titulo">Hardware y trámites</h1><p>Lo que hay que comprar o tramitar, por fase, con la fecha límite del roadmap y el proyecto que lo necesita.</p></header>
      {fases.map((f) => {
        const estado = f.antes == null ? (f.periodo ?? 'arrancar ya') : f.dias! < 0 && f.pendientes ? `venció el ${fl(f.antes)}` : `antes del ${fl(f.antes)}`;
        return (
          <Plegable key={f.id} id={`compras:${f.id}`} titulo={f.nombre} resumen={`${f.total - f.pendientes} de ${f.total} · ${estado}`} color={f.pendientes && f.dias != null && f.dias < 0 ? 'var(--rutina)' : RAMA_COLOR.programacion}>
            <p className="sub">Para {f.para}.</p>
            <ul className="pp-capas">
              {f.items.map((i) => (
                <li key={i.id} className={cuenta(i) ? '' : 'rev-fuera'}>
                  <Casilla checked={!!i.hecho} label={`${i.nombre}: marcar ${f.id === 'tramites' ? 'hecho' : 'comprado'}`} onChange={() => marcarCompra(i.id, i.hecho ? null : { fecha: hoy })} />
                  <div>
                    <b className={i.hecho ? 'resaltado' : ''}>{i.nombre}</b>
                    <p className="sub">{[i.costo, i.nota, i.propuesta ? 'propuesta a confirmar (†)' : null, i.opcional ? 'opcional' : null, i.hecho ? `${f.id === 'tramites' ? 'hecho' : 'comprado'} el ${fl(i.hecho.fecha)}` : null].filter(Boolean).join(' · ')}</p>
                    {i.diferido && <p className="sub">Diferido: {i.diferido}.</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Plegable>
        );
      })}
      <p className="sub">Las fechas son las del roadmap. Trazo avisa 30 días antes de cada una con lo que falta; los trámites, desde ya.</p>
    </main>
  );
}
