import { useMemo, useState } from 'react';
import { dayNumber } from '../data/derive';
import { tituloDeBloque } from '../data/etiquetas';
import { DAY_ROUTINES, TARDE, isMeta, wakeDe, planRoutine, routineFor, wakeRange, type DayType } from '../data/routines';
import { fmtDur, fmtFecha, nowMin, toHHMM, toMin } from '../data/time';
import type { RoutineId } from '../data/types';
import { planSettings, startDay, useStore } from '../state/store';
import { Marca } from '../ui/Marca';
import '../styles/hoy.css';

const STEP = 10;

const MODOS = [['completo', 'Día completo'], ['corto', 'Día corto'], ['tarde', 'Día tarde']] as const;

function defaultChoice(now: number, t: DayType): { r: RoutineId; otra: number } {
  const { min, max } = wakeRange(t);
  const w = wakeDe(t);
  const otra = toMin(w.completo) + 40;
  if (now <= toMin(w.completo) + 30) return { r: 'completo', otra };
  if (now <= toMin(w.corto) + 30) return { r: 'corto', otra };
  // Ola 17: si abrís Trazo desde las 07:30 en adelante, propone la rutina de las 08:00.
  if (t !== 'libre' && now >= toMin(TARDE.wake) - 30) return { r: 'tarde', otra };
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
  const tipo = routineFor(date, planSettings(settings));
  const rutina = DAY_ROUTINES[tipo];
  const init = useMemo(() => defaultChoice(now, tipo), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [choice, setChoice] = useState<RoutineId>(init.r);
  const [otra, setOtra] = useState(init.otra);
  const range = wakeRange(tipo);

  const WAKE = wakeDe(tipo);
  const horaDe = (id: 'completo' | 'corto' | 'tarde') => (id === 'tarde' ? TARDE.wake : WAKE[id]);
  const wake = choice === 'otra' ? toHHMM(otra) : horaDe(choice);
  const plan = planRoutine(tipo, choice, wake);
  const firstFixed = plan.findIndex((p) => p.block.kind === 'fixed');
  const manana = choice === 'tarde' ? plan.filter((p) => p.block.id !== 'sueno') : plan.slice(0, firstFixed + 1);
  const metas = plan.filter((p) => isMeta(p.block)).length;
  const desc = (id: 'completo' | 'corto' | 'tarde') => {
    if (id === 'tarde') return 'Abi y trabajo a la mañana; el estudio, a la tarde';
    const pr = planRoutine(tipo, id);
    const m = pr.slice(0, pr.findIndex((p) => p.block.kind === 'fixed')).filter((p) => isMeta(p.block));
    const txt = m.map((p) => `${p.block.short ?? p.block.label.toLowerCase()} ${fmtDur(p.min)}`).join(' y ');
    return txt[0].toUpperCase() + txt.slice(1);
  };
  const n = dayNumber(settings.startDate, date);

  return (
    <main className="pantalla despertar-pantalla" aria-labelledby="desp-t">
      <div className="despertar-cab">
        <Marca date={date} />
        <div className="etiqueta">{fmtFecha(date)} · día {String(n).padStart(2, '0')}</div>
      </div>
      <div className="despertar-cuerpo">
          <div className="etiqueta">Buen día, {settings.names.me} · {toHHMM(now)}</div>
          <h1 id="desp-t" className="titulo desp-t">¿A qué hora te levantaste?</h1>

          <div className="rutinas" role="radiogroup" aria-label="Rutina del día">
            {MODOS.filter(([id]) => id !== 'tarde' || tipo !== 'libre').map(([id, name]) => (
              <button
                key={id}
                role="radio"
                aria-checked={choice === id}
                className="rutina-op"
                onClick={() => setChoice(id)}
              >
                <span className={`rutina-hora mono${choice === id ? ' resaltado' : ''}`} style={{ ['--c' as string]: 'var(--economia)' }}>{horaDe(id)}</span>
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

          <div className="etiqueta manana-t">{choice === 'tarde' ? `Así queda tu día · ${TARDE.label.toLowerCase()}, ${metas} metas` : `Así queda tu mañana · ${rutina.label.toLowerCase()}, ${metas} metas`}</div>
          <ul className="manana">
            {manana.map((p) => (
              <li key={p.block.id}>
                <span className="mono">{p.start}</span>
                <span className="manana-n">{tituloDeBloque({ rama: p.block.rama, key: p.block.id, title: p.block.label }, date, settings.startDate)}</span>
                <span className="mono sub">{p.block.kind === 'fixed' ? 'fijo' : fmtDur(p.min)}</span>
              </li>
            ))}
          </ul>

          <p className="nota">Te lo pregunta una vez por día, la primera vez que abrís Trazo.<br />Hoy toca la de {rutina.label.toLowerCase()}; las dos se ven en Ajustes.</p>
      </div>
      <div className="despertar-pie">
        <button className="btn-principal" onClick={() => startDay(choice, wake, date)}>Empezar el día · {wake}</button>
      </div>
    </main>
  );
}

