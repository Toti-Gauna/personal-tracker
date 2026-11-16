import { useState } from 'react';
import { AREAS } from '../data/defaults';
import { libroPorId } from '../data/libros';
import { approves } from '../data/study';
import { PASS } from '../data/study-catalog';
import { ERR_TYPES, type ErrType } from '../data/study-types';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { guardarTestFinal } from '../state/study';
import { toast } from '../ui/avisos';
import '../styles/estudio.css';

const ERR: Record<ErrType, string> = { concepto: 'Concepto', tecnica: 'Técnica', descuido: 'Descuido', enunciado: 'Enunciado' };
const zero = (): Record<ErrType, number> => ({ concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 });

/** Ola 20 · test final de un libro: todo el libro, sin el libro. Con 85 % o más, mañana la tesis final. */
export function TestFinal({ day, actId }: { day: DayLog; actId: string }) {
  const study = useStore((s) => s.study);
  const a = study.activities.find((x) => x.id === actId);
  const l = a?.libro ? libroPorId(a.libro) : undefined;
  const total = l?.final?.preguntas ?? 20;
  const [score, setScore] = useState(total);
  const [errors, setErrors] = useState(zero);
  const [hecho, setHecho] = useState<boolean | null>(null);
  if (!a || !a.final) return <main className="pantalla"><a className="volver" href="#/estudio">Estudio</a><p>No encontré ese test final.</p></main>;
  const front = study.fronts.find((f) => f.id === a.front);
  const color = front ? AREAS[front.color].css : 'var(--ing)';
  const fin = study.finales?.[a.id];
  const pct = Math.round((score / total) * 100);
  const ok = approves(score, total);
  const fallados = total - score;
  const guardar = () => {
    const r = guardarTestFinal(day.date, a.id, { score, total, errors, mode: 'app' });
    setHecho(r.approved);
    toast({ title: r.approved ? `Test final aprobado · ${pct} %` : `${pct} % · se repite`, sub: r.approved ? 'Mañana, la tesis final' : 'Repasá lo que falló y repetilo', color }, false);
  };
  return (
    <main className="pantalla test" style={{ ['--c' as string]: color }}>
      <div className="topbar">
        <a className="volver" href={l ? `#/estudio/libro/${l.id}` : '#/estudio'}>{l ? 'Libro' : 'Estudio'}</a>
        <span className="mono">{l?.final?.min ?? 40}:00</span>
      </div>
      <div className="kicker">Test final · {fin?.tests.length ? `intento ${fin.tests.length + 1}` : 'todo el libro'}</div>
      <h1 className="titulo">{a.final.title}</h1>
      <p className="sub">{a.final.desc}</p>
      {fin?.aprobadoOn ? (
        <p className="resumen">Ya lo aprobaste. Sigue la tesis final y, después, el artefacto.</p>
      ) : (
        <>
          <p className="sub bloque-t">Preguntas bien respondidas</p>
          <div className="puntaje">
            <button className="btn-cuadro" aria-label="Una menos" onClick={() => setScore((v) => Math.max(0, v - 1))}>−</button>
            <output className="mono" aria-live="polite"><b>{score}</b> <span>/ {total}</span></output>
            <button className="btn-cuadro" aria-label="Una más" onClick={() => setScore((v) => Math.min(total, v + 1))}>+</button>
          </div>
          <div className="pct">
            <span className="mono">{pct}%</span>
            <span className={`trazo on ${ok ? '' : 'mal'}`} style={{ ['--c' as string]: ok ? 'var(--salud)' : 'var(--rutina)' }}>{ok ? 'Aprobado' : 'No aprobado'} · el corte es {Math.round(PASS * 100)}%</span>
          </div>
          {fallados > 0 && ERR_TYPES.map((k) => (
            <div className="paso err" key={k}>
              <span><b>{ERR[k]}</b></span>
              <div className="stepper cajas">
                <button aria-label={`Menos ${ERR[k]}`} onClick={() => setErrors((e) => ({ ...e, [k]: Math.max(0, e[k] - 1) }))}>−</button>
                <output aria-label={ERR[k]}>{errors[k]}</output>
                <button aria-label={`Más ${ERR[k]}`} onClick={() => setErrors((e) => ({ ...e, [k]: Math.min(fallados, e[k] + 1) }))}>+</button>
              </div>
            </div>
          ))}
          {hecho == null ? (
            <button className="btn-principal guardar-test" onClick={guardar}>Guardar resultado</button>
          ) : (
            <a className="btn-principal enlace" href={l ? `#/estudio/libro/${l.id}` : '#/estudio'}>Volver al libro</a>
          )}
        </>
      )}
    </main>
  );
}
