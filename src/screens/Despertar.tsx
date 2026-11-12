import { useMemo, useState } from 'react';
import { ROUTINES } from '../data/defaults';
import { dayNumber } from '../data/derive';
import { planDay, wakeRange } from '../data/schedule';
import { fmtDur, fmtFecha, nowMin, toHHMM, toMin } from '../data/time';
import type { RoutineId } from '../data/types';
import { startDay, useStore } from '../state/store';
import { Marca } from '../ui/Marca';
import '../styles/hoy.css';

const STEP = 10;

function defaultChoice(now: number): { r: RoutineId; otra: number } {
  const { min, max } = wakeRange();
  if (now <= toMin('04:30')) return { r: 'completo', otra: toMin('04:40') };
  if (now <= toMin('05:30')) return { r: 'corto', otra: toMin('04:40') };
  const rounded = Math.floor(now / STEP) * STEP;
  return { r: 'otra', otra: Math.min(max, Math.max(min, rounded)) };
}

/** 1.2 Buen día: la primera apertura de cada día pregunta a qué hora te levantaste. */
export function Despertar({ date }: { date: string }) {
  const settings = useStore((s) => s.settings)!;
  const now = nowMin();
  const init = useMemo(() => defaultChoice(now), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [choice, setChoice] = useState<RoutineId>(init.r);
  const [otra, setOtra] = useState(init.otra);
  const range = wakeRange();

  const wake = choice === 'otra' ? toHHMM(otra) : ROUTINES.find((r) => r.id === choice)!.wake;
  const plan = planDay(choice, wake);
  const firstFixed = plan.findIndex((p) => p.tpl.fixed);
  const manana = plan.slice(0, firstFixed + 1);
  const desc = (id: 'completo' | 'corto') => {
    const d = ROUTINES.find((r) => r.id === id)!.durations;
    return `Matemática ${fmtDur(d.math)} y programación ${fmtDur(d.prog)}`;
  };
  const n = dayNumber(settings.startDate, date);

  return (
    <div className="despertar">
      <div className="pantalla despertar-fondo" aria-hidden="true">
        <Marca date={date} />
        <div className="etiqueta">{fmtFecha(date)}</div>
        <div className="titulo dia-n">Día {String(n).padStart(2, '0')}</div>
      </div>
      <div className="hoja-fondo">
        <section className="hoja" role="dialog" aria-modal="true" aria-labelledby="desp-t">
          <div className="hoja-asa" />
          <div className="etiqueta">Buen día, {settings.names.me} · {toHHMM(now)}</div>
          <h1 id="desp-t" className="titulo desp-t">¿A qué hora te levantaste?</h1>

          <div className="rutinas" role="radiogroup" aria-label="Rutina del día">
            {ROUTINES.map((r) => (
              <button
                key={r.id}
                role="radio"
                aria-checked={choice === r.id}
                className="rutina-op"
                onClick={() => setChoice(r.id)}
              >
                <span className={`rutina-hora mono${choice === r.id ? ' resaltado' : ''}`} style={{ ['--c' as string]: 'var(--economia)' }}>{r.wake}</span>
                <b>{r.name}</b>
                <span className="sub">{desc(r.id)}</span>
              </button>
            ))}
          </div>

          <div className={`otra${choice === 'otra' ? ' activa' : ''}`}>
            <button className="otra-t" role="radio" aria-checked={choice === 'otra'} onClick={() => setChoice('otra')}>
              <span>Otra hora</span>
              <small>Corre los bloques y acorta los flexibles</small>
            </button>
            <div className="stepper">
              <button aria-label="10 minutos antes" onClick={() => { setChoice('otra'); setOtra((v) => Math.max(range.min, v - STEP)); }}>−</button>
              <output aria-live="polite">{toHHMM(otra)}</output>
              <button aria-label="10 minutos después" onClick={() => { setChoice('otra'); setOtra((v) => Math.min(range.max, v + STEP)); }}>+</button>
            </div>
          </div>

          <div className="etiqueta manana-t">Así queda tu mañana</div>
          <ul className="manana">
            {manana.map((p) => (
              <li key={p.tpl.key}>
                <span className="mono">{p.start}</span>
                <span className="manana-n">{p.tpl.title}</span>
                <span className="mono sub">{p.tpl.fixed ? 'fijo' : fmtDur(p.min)}</span>
              </li>
            ))}
          </ul>

          <button className="btn-principal" onClick={() => startDay(choice, wake, date)}>Empezar el día</button>
          <p className="nota">Te lo pregunta una vez por día, la primera vez que abrís Trazo.<br />Las dos rutinas se editan en Ajustes.</p>
        </section>
      </div>
    </div>
  );
}

