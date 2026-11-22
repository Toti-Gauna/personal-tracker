/**
 * v12.1 · #/metas/linea: la línea de tiempo (Gantt) del plan entero. Una fila por fase, cada bloque en sus fechas, la línea de hoy,
 * la pausa de diciembre rayada, y abajo las horas planificadas contra las reales de lo que ya empezó. Se desplaza de costado
 * dentro de su caja; la página no.
 */
import { useEffect, useRef } from 'react';
import { recorrer, type PeriodoMedido } from '../data/periodos';
import { PLAN_EXT } from '../data/plan-extendido';
import { RAMA_COLOR } from '../data/ramas';
import { addDays, daysBetween } from '../data/time';
import type { DayLog } from '../data/types';
import { ESTADO, fp, hrefPeriodo } from '../ui/PeriodoTarjeta';
import { usePeriodos } from '../ui/usePeriodos';
import '../styles/plan.css';
import '../styles/etapas.css';
import '../styles/periodos.css';

const PX = 2; // px por día
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const n1 = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',');

export function Linea({ day }: { day: DayLog }) {
  const hoy = day.date;
  const { arbol, cal } = usePeriodos(hoy);
  const fases = arbol.flatMap((e) => e.hijos ?? []);
  const ini = fases[0].inicio;
  const fin = fases[fases.length - 1].fin;
  const x = (d: string) => daysBetween(ini, d) * PX;
  const ancho = x(fin) + PX;
  const meses: string[] = [];
  for (let d = `${ini.slice(0, 7)}-01`; d <= fin; d = addDays(`${d.slice(0, 7)}-28`, 4).slice(0, 7) + '-01') if (d >= ini) meses.push(d);
  const pausas = [...cal.filter((b) => b.pausa), ...(PLAN_EXT.capacidad?.fijas ?? [])];
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => { if (caja.current) caja.current.scrollLeft = Math.max(0, x(hoy) - 60); }, [hoy]); // eslint-disable-line react-hooks/exhaustive-deps
  const empezados = [...recorrer(arbol)].filter((p): p is PeriodoMedido => p.nivel === 'bloque' && p.inicio <= hoy && p.horasPlan != null).slice(-8).reverse();
  return (
    <main className="pantalla et-pag pd-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href="#/metas/periodos">Períodos</a><span className="mono sub">{fp(ini)} – {fp(fin)}</span></div>
      <header><h1 className="titulo">Línea de tiempo</h1><p>Las 11 fases con sus bloques en sus fechas. La línea roja es hoy; lo rayado, la pausa del 20 al 26 de diciembre de 2027.</p></header>
      <div className="gantt-scroll" ref={caja} role="img" aria-label={`Plan del ${fp(ini)} al ${fp(fin)}, hoy ${fp(hoy)}`}>
        <div className="gantt" style={{ width: ancho }}>
          {meses.map((m) => <span key={m} className="gantt-mes" style={{ left: x(m) }}>{MES[Number(m.slice(5, 7)) - 1]}{m.slice(5, 7) === '01' ? ` ${m.slice(2, 4)}` : ''}</span>)}
          {pausas.map((p) => <span key={p.inicio} className="gantt-pausa" style={{ left: x(p.inicio), width: (daysBetween(p.inicio, p.fin) + 1) * PX }} />)}
          {hoy >= ini && hoy <= fin && <span className="gantt-hoy" style={{ left: x(hoy) }} />}
          {fases.map((f) => (
            <div key={f.id} className="gantt-fila">
              <span className="gantt-fase">{f.id}</span>
              {(f.hijos ?? []).map((b) => {
                const tipo = PLAN_EXT.bloques.find((y) => y.id === b.id)?.tipo ?? '';
                const w = (daysBetween(b.inicio, b.fin) + 1) * PX;
                return <a key={b.id} className={`gantt-b ${tipo} ${b.estado}`} href={hrefPeriodo(b.id)} style={{ left: x(b.inicio), width: Math.max(2, w - 1) }} title={`${b.id} · ${b.nombre} · ${fp(b.inicio)} – ${fp(b.fin)} · ${ESTADO[b.estado]}`}>{w >= 24 ? b.id : ''}</a>;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="et-ley mono" aria-hidden="true">
        {[['proyecto', 'proyecto'], ['cert', 'certificación'], ['ventana', 'matemática'], ['ingles', 'inglés y búsqueda']].map(([t, n]) => <span key={t}><i className={`gantt-b ${t}`} style={{ position: 'static', display: 'inline-block', width: 12, height: 8 }} />{n}</span>)}
      </div>
      <span className="etiqueta">Horas planificadas y reales · lo último que empezó</span>
      <ul className="pd-semana">
        {empezados.map((b) => (
          <li key={b.id}><b className="mono">{b.id}</b><span>{b.nombre}<small className="mono">plan {n1(b.horasPlan ?? 0)} h · real {n1(b.horasReal ?? 0)} h · {ESTADO[b.estado]}</small></span></li>
        ))}
        {!empezados.length && <li><span className="sub">Todavía no empezó ningún bloque.</span></li>}
      </ul>
    </main>
  );
}
