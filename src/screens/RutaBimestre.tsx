import { BIMS, ROADMAP, laneById, laneItems, pilotOf, progressMap, weekOf, type LaneId } from '../data/ruta';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { addPilot, setCheck, toggleItemManual } from '../state/ruta';
import { Estado, corto } from '../ui/RutaBits';
import '../styles/ruta.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dm = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
const sem = (w: [number, number]) => (w[0] === w[1] ? `S${w[0]}` : `S${w[0]}–S${w[1]}`);
const COLOR_SEMANA = (w: number) => (w <= 4 ? 'var(--salud)' : w <= 8 ? 'var(--eclipse)' : 'var(--tinta)');

/** 7.2 Bimestre en detalle: la tira de 9 semanas, cada carril con sus ítems y el embudo del piloto. */
export function RutaBimestre({ day, n }: { day: DayLog; n?: number }) {
  const ruta = useStore((s) => s.ruta);
  const b = BIMS[Math.min(17, Math.max(0, (n ?? 1) - 1))];
  const date = day.date;
  const p = progressMap(ruta.log);
  const enCurso = date >= b.start && date <= b.end;
  const semana = date < b.start ? 0 : date > b.end ? 10 : weekOf(b, date);
  const perfil = ROADMAP.route.years[b.year - 1].profile;
  const pil = pilotOf(ruta, b);
  const carriles: { id: LaneId; titulo: string; unidad: string }[] = [
    { id: 'math', titulo: `Matemática · ${b.summary.math}`, unidad: '' },
    { id: 'prog', titulo: 'Programación · estudio', unidad: '' },
    { id: 'cero', titulo: 'Desde cero', unidad: '' },
    { id: 'producto', titulo: `Producto · ${b.product.name}`, unidad: '' },
    ...(b.cert ? [{ id: 'cert' as LaneId, titulo: `Certificación · ${b.cert.name}`, unidad: '' }] : []),
  ];
  const cierreK = (i: number) => `b${b.n}:close:${i}`;
  const cierreHechas = ROADMAP.cycle.closeParts.filter((_, i) => ruta.checks[cierreK(i)]).length;

  return (
    <main className="pantalla r-pant">
      <div className="topbar">
        <a className="volver" href="#/metas/ruta">Ruta</a>
        <span className="mono">{dm(b.start)} — {dm(b.end)}</span>
      </div>
      <div className="etiqueta">Año {b.year} · bimestre {b.n} de 18</div>
      <h1 className="titulo">{b.product.name}</h1>
      <p className="sub">{b.product.industry[0].toUpperCase() + b.product.industry.slice(1)}{b.product.pitch ? `: ${b.product.pitch}` : ''}. Te postulás como {perfil}.</p>

      <div className="tira9" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => <span key={i} className={i + 1 === semana ? 'on' : ''} style={{ ['--c' as string]: COLOR_SEMANA(i + 1) }} />)}
      </div>
      <div className="tira9-ejes" role="img" aria-label={`Semanas 1 a 4 de estudio, 5 a 8 de producto y 9 de cierre${enCurso ? `; vas por la semana ${semana}` : ''}`}>
        {Array.from({ length: 9 }, (_, i) => <span key={i} className={i + 1 === semana ? 'on' : ''}>S{i + 1}</span>)}
      </div>
      <div className="ch-leyenda" aria-hidden="true">
        <span><i className="ley-area" style={{ ['--c' as string]: 'var(--salud)' }} />estudio</span>
        <span><i className="ley-area" style={{ ['--c' as string]: 'var(--eclipse)' }} />producto</span>
        <span><i className="ley-area" style={{ ['--c' as string]: 'var(--tinta)' }} />cierre</span>
      </div>

      {carriles.map((c) => {
        const items = laneItems(b, c.id);
        const hechos = items.filter((i) => (p[i.id] ?? 0) >= 1).length;
        return (
          <section key={c.id} className="lane-sec" style={{ ['--c' as string]: laneById(c.id).color }} aria-label={c.titulo}>
            <div className="lane-cab"><b><i />{c.titulo}</b><span className="mono">{hechos} / {items.length}{c.unidad}</span></div>
            <ul className="items-ruta">
              {items.map((i) => {
                const v = p[i.id] ?? 0;
                const t = corto(i, b);
                return (
                  <li key={i.id} className={v >= 1 ? 'hecho' : ''}>
                    <Estado value={v} label={t} onClick={() => toggleItemManual(date, i.id)} />
                    <span className="it-t">{t}{i.hours ? <span className="sub"> · ~{i.hours} h</span> : null}</span>
                    <span className="mono">{sem(i.weeks)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className="lane-sec" style={{ ['--c' as string]: 'var(--tinta)' }} aria-label="Cierre">
        <div className="lane-cab"><b><i />Cierre</b><span className="mono">{cierreHechas} / {ROADMAP.cycle.closeParts.length}</span></div>
        <ul className="items-ruta">
          {ROADMAP.cycle.closeParts.map((t, i) => (
            <li key={t} className={ruta.checks[cierreK(i)] ? 'hecho' : ''}>
              <Estado value={ruta.checks[cierreK(i)] ? 1 : 0} label={t} onClick={() => setCheck(cierreK(i), !ruta.checks[cierreK(i)])} />
              <span className="it-t">{t}</span>
              <span className="mono">S9</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="etiqueta r-sec">Piloto · desde las cold calls de Eclipse</div>
      <div className="embudo">
        {([['calls', 'llamadas', pil.calls], ['interested', 'interesados', pil.interested], ['demo', 'demo', pil.demo], ['pilot', 'piloto', pil.pilot]] as const).map(([k, l, val]) => (
          <div key={k}>
            <b>{val}</b>
            <span>{l}</span>
            <span className="paso-btns">
              <button aria-label={`Una menos: ${l}`} onClick={() => addPilot(date, b.n, k, -1)} disabled={!val}>−</button>
              <button aria-label={`Una más: ${l}`} onClick={() => addPilot(date, b.n, k, 1)}>+</button>
            </span>
          </div>
        ))}
      </div>
      <p className="sub r-nota">Meta: un estudio o una empresa con el piloto firmado antes de la semana 5. Las llamadas también suman desde Hoy, al cumplir la meta de Eclipse.</p>
    </main>
  );
}
