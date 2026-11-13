import type { DayLog } from '../data/types';
import { examenes } from '../data/debiles';
import { Calibracion, ComoFallas, Mapa, Priorizar, PuntajeTests, Ranking, RecallSemanal, Sanguijuelas } from '../ui/Debiles';
import { Filtro, useResumenFlojo } from './PuntosDebiles';
import { useListo } from './PuntosExamenes';

/** 8.4 Puntos débiles en escritorio (1200 px o más): todo en una vista. */
export function PuntosEscritorio({ day, filtro }: { day: DayLog; filtro: string }) {
  const { st, flojos, recall } = useResumenFlojo(day.date);
  const { a, listo } = useListo(st);
  const ex = a ? examenes(st, a) : null;
  return (
    <div className="deb-esc">
      <header className="deb-esc-cab">
        <div>
          <div className="etiqueta">Estudio</div>
          <h1 className="titulo">Puntos débiles</h1>
        </div>
        <Filtro actual={filtro} />
        <div className="r-esc-stats deb-esc-stats">
          <div><b className="mono" style={{ color: flojos ? 'var(--rutina)' : undefined }}>{flojos}</b><span>{flojos === 1 ? 'tema flojo' : 'temas flojos'}</span></div>
          <div><b className="mono" style={{ color: recall != null && recall < 85 ? 'var(--economia)' : undefined }}>{recall == null ? '—' : `${recall} %`}</b><span>recall de la semana</span></div>
          <div><b className="mono">{ex?.prom == null ? '—' : `${ex.prom} %`}</b><span>promedio de tests</span></div>
          <div><b className="mono" style={{ color: listo < 85 ? 'var(--economia)' : 'var(--salud)' }}>{listo} %</b><span>listo para el final</span></div>
        </div>
      </header>
      <div className="deb-esc-grilla">
        <div className="col"><Mapa st={st} a={a} />{filtro !== 'recall' && <PuntajeTests st={st} a={a} />}</div>
        <div className="col"><section className="r-card"><Ranking st={st} compacto /></section></div>
        <div className="col"><RecallSemanal st={st} date={day.date} />{filtro !== 'recall' && <ComoFallas st={st} />}</div>
      </div>
      <div className="deb-esc-grilla abajo">
        <Calibracion st={st} />
        <Sanguijuelas st={st} date={day.date} />
        <section className="r-card"><Priorizar st={st} date={day.date} conLista /></section>
      </div>
    </div>
  );
}
