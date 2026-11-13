import { useState } from 'react';
import { AREAS } from '../data/defaults';
import { approves, parseCorrection, unitName } from '../data/study';
import { PASS } from '../data/study-catalog';
import { ERR_TYPES, type ErrType } from '../data/study-types';
import { addDays, fmtFecha } from '../data/time';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { saveTest } from '../state/study';
import { toast } from '../ui/avisos';
import { LADDER } from '../data/study-catalog';
import '../styles/estudio.css';

const ERR: Record<ErrType, [string, string]> = {
  concepto: ['Concepto', 'No entendí la idea'],
  tecnica: ['Técnica', 'Sé la idea, fallé el procedimiento'],
  descuido: ['Descuido', 'Signo, cuenta o apuro'],
  enunciado: ['Enunciado', 'Leí mal lo que pedía'],
};
const zero = (): Record<ErrType, number> => ({ concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 });

/** 2.5 y 2.6 · Comprobar: el test completo del capítulo recién estudiado, en la app o en papel. */
export function Test({ day, param }: { day: DayLog; param?: string }) {
  const [actId, nStr] = (param ?? '').split('/');
  const study = useStore((s) => s.study);
  const a = study.activities.find((x) => x.id === actId);
  const unit = a?.units?.find((u) => u.n === Number(nStr));
  const [modo, setModo] = useState<'app' | 'papel'>(a?.testMode ?? 'app');
  const total = unit?.test.count ?? 0;
  const [score, setScore] = useState(total);
  const [errors, setErrors] = useState(zero);
  const [perEx, setPerEx] = useState<(ErrType | null)[]>(() => Array.from({ length: total }, () => null));
  const [pegar, setPegar] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<boolean | null>(null);

  if (!a || !unit) {
    return <main className="pantalla"><a className="volver" href="#/estudio">Estudio</a><p>No encontré ese test.</p></main>;
  }
  const front = study.fronts.find((f) => f.id === a.front);
  const color = front ? AREAS[front.color].css : 'var(--ing)';

  // En papel, el puntaje y los errores salen de la grilla.
  const papelErr = zero();
  perEx.forEach((e) => e && papelErr[e]++);
  const sc = modo === 'papel' ? total - perEx.filter(Boolean).length : score;
  const er = modo === 'papel' ? papelErr : errors;
  const pct = total ? Math.round((sc / total) * 100) : 0;
  const ok = approves(sc, total);
  const fallados = total - sc;
  const cargados = ERR_TYPES.reduce((s, k) => s + er[k], 0);
  const tesis = fmtFecha(addDays(day.date, LADDER.tesis.days));
  const reTest = fmtFecha(addDays(day.date, LADDER.retest.days));
  const prev = study.units[a.id]?.[unit.n]?.tests.length ?? 0;

  const guardar = () => {
    const r = saveTest(day.date, a.id, unit.n, { score: sc, total, errors: er, mode: modo, perEx: modo === 'papel' ? perEx : undefined });
    setGuardado(r);
    toast({ title: r ? `Aprobado · ${pct} %` : `${pct} % · re-test el ${reTest.toLowerCase()}`, sub: r ? `La tesis queda para el ${tesis.toLowerCase()} (+3)` : 'Repasá lo que fallaste antes del re-test', color }, false);
  };

  // Bien → descuido → técnica → concepto → enunciado → bien.
  const CICLO: (ErrType | null)[] = [null, 'descuido', 'tecnica', 'concepto', 'enunciado'];
  const ciclo = (i: number) =>
    setPerEx((p) => p.map((e, j) => (j !== i ? e : CICLO[(CICLO.indexOf(e) + 1) % CICLO.length])));

  return (
    <main className="pantalla test" style={{ ['--c' as string]: color }}>
      <div className="topbar">
        <a className="volver" href="#/estudio">Estudio</a>
        <span className="mono">{unit.test.min}:00</span>
      </div>
      <div className="kicker">Comprobar · {front?.name} · día 0{prev ? ` · intento ${prev + 1}` : ''}</div>
      <h1 className="titulo">{unitName(a, unit)}</h1>
      <p className="sub">{unit.test.desc} Sin apuntes, {unit.test.min} minutos. Aprobás con {Math.round(PASS * 100)} %. Es el cierre de lo que aprendiste hoy.</p>

      <div className="segmentado" role="radiogroup" aria-label="Dónde lo hacés">
        <button role="radio" aria-checked={modo === 'app'} onClick={() => setModo('app')}>En la app</button>
        <button role="radio" aria-checked={modo === 'papel'} onClick={() => setModo('papel')}>En papel</button>
      </div>

      {modo === 'app' ? (
        <>
          <div className="etiqueta bloque-t">Ejercicios bien resueltos</div>
          <div className="puntaje">
            <button className="btn-cuadro" aria-label="Uno menos" onClick={() => setScore((v) => Math.max(0, v - 1))}>−</button>
            <output className="mono" aria-live="polite"><b>{score}</b> <span>/ {total}</span></output>
            <button className="btn-cuadro" aria-label="Uno más" onClick={() => setScore((v) => Math.min(total, v + 1))}>+</button>
          </div>
          <div className="pct">
            <span className="mono">{pct} %</span>
            <span className={`trazo on ${ok ? '' : 'mal'}`} style={{ ['--c' as string]: ok ? 'var(--salud)' : 'var(--rutina)' }}>
              {ok ? 'Aprobado' : 'No aprobado'} · el corte es {Math.round(PASS * 100)} %
            </span>
          </div>
          {fallados > 0 && (
            <>
              <div className="etiqueta bloque-t">¿Por qué fallaste {fallados === 1 ? 'el que fallaste' : `los ${fallados}`}?</div>
              {ERR_TYPES.map((k) => (
                <div className="paso err" key={k}>
                  <span><b>{ERR[k][0]}</b><small>{ERR[k][1]}</small></span>
                  <div className="stepper">
                    <button aria-label={`Menos ${ERR[k][0]}`} onClick={() => setErrors((e) => ({ ...e, [k]: Math.max(0, e[k] - 1) }))}>−</button>
                    <output aria-label={ERR[k][0]}>{errors[k]}</output>
                    <button aria-label={`Más ${ERR[k][0]}`} onClick={() => setErrors((e) => ({ ...e, [k]: Math.min(fallados, e[k] + 1) }))}>+</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <>
          <div className="fila-t bloque-t"><span className="etiqueta">1 · Resolvé en tu cuaderno</span><span className="mono sub">{unit.test.min} min</span></div>
          <p>{unit.test.desc} Usá los ejercicios del libro que no hiciste.</p>
          <div className="fila-t bloque-t"><span className="etiqueta">2 · Cargá solo los resultados</span><span className="mono"><b>{sc} de {total} · {pct} %</b></span></div>
          <p className="sub nota-izq">Tocá un ejercicio que fallaste para marcar el tipo de error (descuido, concepto, técnica o enunciado).</p>
          <div className="grilla">
            {perEx.map((e, i) => (
              <button key={i} className={`celda${e ? ' mal' : ''}`} onClick={() => ciclo(i)} aria-label={`Ejercicio ${i + 1}: ${e ? ERR[e][0] : 'bien'}`}>
                <span className="mono">{i + 1}</span>
                <b>{e ? ERR[e][0] : '✓'}</b>
              </button>
            ))}
          </div>
          <div className="claude">
            <b>¿Preferís que lo corrija Claude?</b>
            <p className="sub">Le mandás la foto de la hoja en el chat. Te devuelve el puntaje y el tipo de cada error, por ejemplo «17/20» y una línea por error como «4: descuido».</p>
            {pegar == null ? (
              <button className="btn-borde" onClick={() => setPegar('')}>Pegar la corrección de Claude</button>
            ) : (
              <>
                <textarea className="campo-texto" rows={5} value={pegar} onChange={(e) => setPegar(e.target.value)} aria-label="Corrección de Claude" placeholder={'17/20\n4: descuido\n11: técnica\n17: descuido'} />
                <button className="btn-borde" onClick={() => { const r = parseCorrection(pegar, total); setPerEx(r.perEx); setPegar(null); }}>Aplicar corrección</button>
              </>
            )}
          </div>
        </>
      )}

      <p className="resumen">
        {ok
          ? <>Aprobado: avanzás. La tesis de este capítulo queda para el <b>{tesis.toLowerCase()}</b> (+3) y entra en el repaso de ese día{cargados ? '; los errores quedan anotados' : ''}.</>
          : <>Con menos de {Math.round(PASS * 100)} % (y errores que no son solo de descuido) repasás lo que fallaste y hacés un re-test el <b>{reTest.toLowerCase()}</b>.</>}
      </p>
      {guardado == null ? (
        <button className="btn-principal" onClick={guardar}>Guardar resultado</button>
      ) : (
        <a className="btn-principal enlace" href="#/estudio">Volver a Estudio</a>
      )}
    </main>
  );
}
