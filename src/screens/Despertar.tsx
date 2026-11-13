import { useMemo, useState } from 'react';
import { dayNumber } from '../data/derive';
import { DAY_ROUTINES, WAKE, dayTypeOf, isMeta, planRoutine, wakeRange, type DayType } from '../data/routines';
import { fmtDur, fmtFecha, nowMin, toHHMM, toMin } from '../data/time';
import type { RoutineId } from '../data/types';
import { startDay, useStore } from '../state/store';
import { Marca } from '../ui/Marca';
import '../styles/hoy.css';

const STEP = 10;

const MODOS = [['completo', 'Día completo'], ['corto', 'Día corto']] as const;

function defaultChoice(now: number, t: DayType): { r: RoutineId; otra: number } {
  const { min, max } = wakeRange(t);
  const otra = toMin(WAKE.completo) + 40;
  if (now <= toMin(WAKE.completo) + 30) return { r: 'completo', otra };
  if (now <= toMin(WAKE.corto) + 30) return { r: 'corto', otra };
  const rounded = Math.floor(now / STEP) * STEP;
  return { r: 'otra', otra: Math.min(max, Math.max(min, rounded)) };
}

/**
 * 1.2 Buen día: la primera apertura de cada día pregunta a qué hora te levantaste. La rutina
 * (lunes a viernes o fin de semana) sale sola del día de la semana.
 */
export function Despertar({ date }: { date: string }) {
  const settings = useStore((s) => s.settings)!;
  const now = nowMin();
  const tipo = dayTypeOf(date);
  const rutina = DAY_ROUTINES[tipo];
  const init = useMemo(() => defaultChoice(now, tipo), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [choice, setChoice] = useState<RoutineId>(init.r);
  const [otra, setOtra] = useState(init.otra);
  const range = wakeRange(tipo);

  const wake = choice === 'otra' ? toHHMM(otra) : WAKE[choice];
  const plan = planRoutine(tipo, choice, wake);
  const firstFixed = plan.findIndex((p) => p.block.kind === 'fixed');
  const manana = plan.slice(0, firstFixed + 1);
  const metas = plan.filter((p) => isMeta(p.block)).length;
  const desc = (id: 'completo' | 'corto') => {
    const m = planRoutine(tipo, id).slice(0, firstFixed).filter((p) => isMeta(p.block));
    const txt = m.map((p) => `${p.block.short ?? p.block.label.toLowerCase()} ${fmtDur(p.min)}`).join(' y ');
    return txt[0].toUpperCase() + txt.slice(1);
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
            {MODOS.map(([id, name]) => (
              <button
                key={id}
                role="radio"
                aria-checked={choice === id}
                className="rutina-op"
                onClick={() => setChoice(id)}
              >
                <span className={`rutina-hora mono${choice === id ? ' resaltado' : ''}`} style={{ ['--c' as string]: 'var(--economia)' }}>{WAKE[id]}</span>
                <b>{name}</b>
                <span className="sub">{desc(id)}</span>
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

          <div className="etiqueta manana-t">Así queda tu mañana · {rutina.label.toLowerCase()}, {metas} metas</div>
          <ul className="manana">
            {manana.map((p) => (
              <li key={p.block.id}>
                <span className="mono">{p.start}</span>
                <span className="manana-n">{p.block.label}</span>
                <span className="mono sub">{p.block.kind === 'fixed' ? 'fijo' : fmtDur(p.min)}</span>
              </li>
            ))}
          </ul>

          <button className="btn-principal" onClick={() => startDay(choice, wake, date)}>Empezar el día</button>
          <p className="nota">Te lo pregunta una vez por día, la primera vez que abrís Trazo.<br />Hoy toca la de {rutina.label.toLowerCase()}; las dos se ven en Ajustes.</p>
        </section>
      </div>
    </div>
  );
}

