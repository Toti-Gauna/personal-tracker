import { leeches, recallDeLaSemana, temas } from '../data/debiles';
import type { DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import { Calibracion, ComoFallas, Mapa, Priorizar, Ranking, RecallSemanal, Sanguijuelas } from '../ui/Debiles';
import '../styles/estudio.css';
import '../styles/ruta.css';
import '../styles/debiles.css';

/** Los tres números de arriba: temas flojos, recall de la semana y sanguijuelas. */
export function useResumenFlojo(date: string) {
  const st = useStore((s) => s.study);
  const ts = temas(st);
  return {
    st,
    flojos: ts.filter((t) => t.fuerza != null && t.fuerza < 70).length,
    recall: recallDeLaSemana(st, date),
    sang: leeches(st.cards, st.log).length,
  };
}

export const FILTROS = [['', 'Todo'], ['recall', 'Recall'], ['examenes', 'Exámenes']] as const;

export function Filtro({ actual }: { actual: string }) {
  return (
    <div className="segmentado deb-filtro" role="radiogroup" aria-label="Qué mirar">
      {FILTROS.map(([id, n]) => <button key={id} role="radio" aria-checked={actual === id} onClick={() => ir(id ? `flojo/${id}` : 'flojo')}>{n}</button>)}
    </div>
  );
}

/** 8.1 Puntos débiles: lo que más se te olvida, según tus cold recalls, tus tarjetas y tus tests. */
export function PuntosDebiles({ day, filtro = '' }: { day: DayLog; filtro?: string }) {
  const { st, flojos, recall, sang } = useResumenFlojo(day.date);
  const conamat = st.activities.find((a) => a.id === 'conamat') ?? st.activities.find((a) => a.units?.length);
  const todo = filtro !== 'recall';
  return (
    <main className="pantalla debiles">
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a></div>
      <header>
        <h1 className="titulo">Puntos débiles</h1>
        <p>Lo que más se te olvida, según tus cold recalls, tus tarjetas y tus tests.</p>
      </header>
      <Filtro actual={filtro} />
      <div className="numeros deb-nums">
        <div><b className="mono" style={{ color: flojos ? 'var(--rutina)' : undefined }}>{flojos}</b><span>{flojos === 1 ? 'tema flojo' : 'temas flojos'}</span></div>
        <div><b className="mono" style={{ color: recall != null && recall < 85 ? 'var(--economia)' : undefined }}>{recall == null ? '—' : `${recall} %`}</b><span>recall de la semana</span></div>
        <div><b className="mono" style={{ color: sang ? 'var(--eclipse)' : undefined }}>{sang}</b><span>{sang === 1 ? 'tarjeta sanguijuela' : 'tarjetas sanguijuela'}</span></div>
      </div>
      <Ranking st={st} />
      <Mapa st={st} a={conamat} />
      {todo && <ComoFallas st={st} />}
      <RecallSemanal st={st} date={day.date} />
      <Calibracion st={st} />
      <Sanguijuelas st={st} date={day.date} />
      <Priorizar st={st} date={day.date} />
      <p className="sub deb-nota">Cómo se calcula: fuerza = {Math.round(st.rules.pesos.cold * 100)} % cold recall + {Math.round(st.rules.pesos.tarjetas * 100)} % tarjetas + {Math.round(st.rules.pesos.test * 100)} % test. Si falta una fuente, su peso se reparte entre las otras.</p>
    </main>
  );
}
