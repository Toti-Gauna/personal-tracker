import { useState } from 'react';
import { AREAS } from '../data/defaults';
import { approves, parseCorrection, testOf, unitName, unitShort } from '../data/study';
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
const y = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0] ?? '');
/** "Caps. 1 y 2", "cap. 1". */
const anteriores = (n: number) => (n === 2 ? 'del cap. 1' : `de los caps. ${y(Array.from({ length: n - 1 }, (_, i) => String(i + 1)))}`);
const fecha = (d: string) => fmtFecha(d).split(' ').slice(0, 2).join(' ').toLowerCase();

/** 2.5 y 2.6 · Comprobar: el test completo del capítulo recién estudiado, en la app o en papel. */
export function Test({ day, param }: { day: DayLog; param?: string }) {
  const [actId, nStr] = (param ?? '').split('/');
  const study = useStore((s) => s.study);
  const a = study.activities.find((x) => x.id === actId);
  const unit = a?.units?.find((u) => u.n === Number(nStr));
  const [modo, setModo] = useState<'app' | 'papel'>(a?.testMode ?? 'app');
  const t = unit ? testOf(unit) : null;
  const total = t?.total ?? 0;
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
  const tesis = fecha(addDays(day.date, LADDER.tesis.days));
  const reTest = fecha(addDays(day.date, LADDER.retest.days));
  const prev = study.units[a.id]?.[unit.n]?.tests.length ?? 0;
  const cap = unitShort(a, unit.n).toLowerCase();
  const que = `${t!.nuevos} ${t!.nuevos === 1 ? 'ejercicio nuevo' : 'ejercicios nuevos'} del ${cap}${t!.prev ? ` y ${t!.prev} ${anteriores(unit.n)}` : ''}`;
  const graves = (['tecnica', 'concepto', 'enunciado'] as ErrType[]).filter((k) => er[k] > 0);
  const nGraves = graves.reduce((s2, k) => s2 + er[k], 0);
  const tipos = (['descuido', 'tecnica', 'concepto', 'enunciado'] as ErrType[]).filter((k) => er[k] > 0).map((k) => (k === 'descuido' ? (er[k] > 1 ? 'descuidos' : 'un descuido') : ERR[k][0].toLowerCase()));

  const guardar = () => {
    const r = saveTest(day.date, a.id, unit.n, { score: sc, total, errors: er, mode: modo, perEx: modo === 'papel' ? perEx : undefined });
    setGuardado(r);
    toast({ title: r ? `Aprobado · ${pct} %` : `${pct} % · re-test el ${reTest}`, sub: r ? `La tesis queda para el ${tesis} (+3)` : 'Releé lo que falló antes del re-test', color }, false);
  };

  // Bien → descuido → técnica → concepto → enunciado → bien.
  const CICLO: (ErrType | null)[] = [null, 'descuido', 'tecnica', 'concepto', 'enunciado'];
  const ciclo = (i: number) =>
    setPerEx((p) => p.map((e, j) => (j !== i ? e : CICLO[(CICLO.indexOf(e) + 1) % CICLO.length])));

  return (
    <main className="pantalla test" style={{ ['--c' as string]: color }}>
      <div className="topbar">
        <a className="volver" href="#/estudio">Estudio</a>
      </div>
      <div className="kicker">{prev ? `Re-test · intento ${prev + 1} · ejercicios nuevos` : 'Test · día 0 · al terminar el capítulo'}</div>
      <h1 className="titulo">{unitName(a, unit)}</h1>
      <p className="sub">Un solo test completo: {que}. Sin apuntes, {t!.min} minutos.</p>

      <div className="segmentado" role="radiogroup" aria-label="Dónde lo hacés">
        <button role="radio" aria-checked={modo === 'app'} onClick={() => setModo('app')}>En la app</button>
        <button role="radio" aria-checked={modo === 'papel'} onClick={() => setModo('papel')}>En papel</button>
      </div>

      {modo === 'app' ? (
        <>
          <p className="sub bloque-t">Ejercicios bien resueltos</p>
          <div className="puntaje">
            <button className="btn-cuadro" aria-label="Uno menos" onClick={() => setScore((v) => Math.max(0, v - 1))}>−</button>
            <output className="mono" aria-live="polite"><b>{score}</b> <span>/ {total}</span></output>
            <button className="btn-cuadro" aria-label="Uno más" onClick={() => setScore((v) => Math.min(total, v + 1))}>+</button>
          </div>
          <div className="pct">
            <span className="mono">{pct}%</span>
            <span className={`trazo on ${ok ? '' : 'mal'}`} style={{ ['--c' as string]: ok ? 'var(--salud)' : 'var(--rutina)' }}>
              {ok ? 'Aprobado' : 'No aprobado'} · el corte es {Math.round(PASS * 100)}%
            </span>
          </div>
          {fallados > 0 && (
            <>
              <div className="etiqueta bloque-t">¿Por qué fallaste {fallados === 1 ? 'el que fallaste' : `los ${fallados}`}?</div>
              {ERR_TYPES.map((k) => (
                <div className="paso err" key={k}>
                  <span><b>{ERR[k][0]}</b><small>{ERR[k][1]}</small></span>
                  <div className="stepper cajas">
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
          ? <>{cargados ? `${!er.concepto && !er.enunciado ? 'Solo ' : 'Con '}${y(tipos)}` : 'Sin errores'}: avanzás. La tesis queda agendada para el <b>{tesis}</b>{nGraves ? ` y ${nGraves === 1 ? 'el error' : 'los errores'} de ${y(graves.map((k) => ERR[k][0].toLowerCase()))} ${nGraves === 1 ? 'entra' : 'entran'} en tus próximos repasos` : ''}.</>
          : <>Con menos de {Math.round(PASS * 100)} %: releés solo lo que falló y repetís el test el <b>{reTest}</b>, con ejercicios nuevos.</>}
      </p>
      {guardado == null ? (
        <button className="btn-principal" onClick={guardar}>Guardar resultado</button>
      ) : (
        <a className="btn-principal enlace" href="#/estudio">Volver a Estudio</a>
      )}
    </main>
  );
}
