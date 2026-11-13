import { AREAS } from '../data/defaults';
import { BANDA_COLOR, ERR_COLOR, ERR_NOMBRE, banda, cardAttempts, fixPlan, lastTest, olvidadas, planMin, temaInfo } from '../data/debiles';
import { unitState } from '../data/study';
import { fmtFecha, parseDate } from '../data/time';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { Anillo } from '../ui/charts/charts';
import { Card, smooth, TablaSR, useDibujo } from '../ui/charts/core';
import { empezarRefuerzo, tramosDeTema, Vacio } from '../ui/Debiles';
import '../styles/estudio.css';
import '../styles/ruta.css';
import '../styles/debiles.css';

const dias = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5);
const NUM = ['ninguna idea', 'una idea', 'dos ideas', 'tres ideas', 'cuatro ideas', 'cinco ideas', 'seis ideas'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** 8.2 Un tema en detalle: qué ideas se te olvidan, cómo te fue y cómo arreglarlo. */
export function PuntoTema({ day, id }: { day: DayLog; id: string }) {
  const st = useStore((s) => s.study);
  const t = temaInfo(st, id);
  const ref = useDibujo<SVGSVGElement>([id]);
  if (!t) return <main className="pantalla"><a className="volver" href="#/flojo">Puntos débiles</a><p>No encontré ese tema.</p></main>;
  const front = st.fronts.find((f) => f.id === t.frontId);
  const color = front ? AREAS[front.color].css : 'var(--ing)';
  const ol = olvidadas(st, id);
  const s = t.activity && t.unit != null ? unitState(st, t.activity.id, t.unit) : null;
  const inicio = s?.learnedOn ?? st.attempts.find((a) => a.tema === id)?.date ?? day.date;
  const plan = fixPlan(st, id);
  const test = lastTest(st, id);

  // Ideas del capítulo con sus intentos: cold recalls y las tarjetas de esa idea, en orden.
  const colds = st.attempts.filter((a) => a.tema === id && a.kind === 'cold');
  const cartas = cardAttempts(st).filter((a) => a.tema === id);
  const ideas = [...new Set(colds.flatMap((c) => (c.ideas ?? []).map((i) => i.idea)))].map((idea) => {
    const intentos = [
      ...colds.flatMap((c) => (c.ideas ?? []).filter((i) => i.idea === idea).map((i) => ({ date: c.date, ok: i.ok }))),
      ...cartas.filter((c) => norm(c.idea).startsWith(norm(idea)) || norm(idea).startsWith(norm(c.idea))).map((c) => ({ date: c.date, ok: !!c.ok })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    return { idea, intentos: intentos.slice(-4), olvidada: ol.includes(idea) };
  });

  // Recuerdo con los días: cada intento, en días desde que lo estudiaste.
  const porDia = new Map<number, number[]>();
  const sumar = (d: string, v: number) => { const k = dias(inicio, d); porDia.set(k, [...(porDia.get(k) ?? []), v]); };
  colds.forEach((c) => sumar(c.date, c.ok));
  // Las tarjetas, una vez por semana (el promedio de esa semana), para no tapar el resto.
  const semanas = new Map<number, number[]>();
  cartas.forEach((c) => { const w = Math.floor(dias(inicio, c.date) / 7); semanas.set(w, [...(semanas.get(w) ?? []), c.ok]); });
  semanas.forEach((vs, w) => { const k = w * 7 + 6; porDia.set(k, [...(porDia.get(k) ?? []), vs.reduce((a, b) => a + b, 0) / vs.length]); });
  st.attempts.filter((a) => a.tema === id && a.kind === 'ejercicio').forEach((a) => sumar(a.date, a.ok));
  const puntos = [...porDia.entries()].sort((a, b) => a[0] - b[0]).map(([k, vs]) => [k, Math.round((vs.reduce((x, y) => x + y, 0) / vs.length) * 100)] as [number, number]);
  const hoyK = dias(inicio, day.date);
  const paso = Math.max(7, Math.ceil(Math.max(21, hoyK, ...puntos.map((p) => p[0])) / 3 / 7) * 7);
  const maxK = paso * 3;
  const marcas = [0, paso, paso * 2, paso * 3];
  const W = 320, H = 130, T = 10, B = 110;
  const x = (k: number) => 6 + (k / maxK) * (W - 12);
  const y = (v: number) => B - (Math.max(30, v) - 30) / 70 * (B - T);
  const pts: [number, number][] = puntos.map(([k, v]) => [x(k), y(v)]);
  const tope = Math.round(st.rules.retention * 100);

  // Cómo te fue: el capítulo en el tiempo, con los días del capítulo (día 1 = estudiar).
  const eventos: { dia: string; t: string; sub: string; val: string; color: string; hueco?: boolean; o?: number }[] = [];
  const diaDe = (d: string) => `día ${dias(inicio, d) + 1}`;
  for (const [i, x2] of (s?.tests ?? []).entries()) eventos.push({ dia: diaDe(x2.date), t: i ? `Re-test ${i}` : 'Test completo', sub: x2.approved ? (x2.score / x2.total < 0.9 ? `Pasó justo: ${erroresTxt(x2.errors)}.` : `Aprobado${erroresTxt(x2.errors) ? `: ${erroresTxt(x2.errors)}` : ''}.`) : `No llegó al 85 %: ${erroresTxt(x2.errors)}.`, val: `${x2.score}/${x2.total} · ${Math.round((x2.score / x2.total) * 100)} %`, color: BANDA_COLOR[banda((x2.score / x2.total) * 100)] });
  for (const c of colds) eventos.push({ o: -1, dia: diaDe(c.date), t: 'Cold recall', sub: (c.ideas ?? []).some((i) => !i.ok) ? `Olvidaste ${lista((c.ideas ?? []).filter((i) => !i.ok).map((i) => i.idea.toLowerCase()))}.` : 'Lo recordaste todo.', val: `${Math.round(c.ok * 100)} %`, color: BANDA_COLOR[banda(c.ok * 100)] });
  const tesis = st.reviews.find((r) => r.activityId === t.activity?.id && r.unit === t.unit && r.kind === 'tesis');
  if (tesis?.doneOn) {
    const nT = st.cards.filter((c) => c.activityId === t.activity?.id && c.unit === t.unit && c.source.startsWith(t.nombre)).length;
    eventos.push({ dia: diaDe(tesis.doneOn), t: 'Tesis', sub: nT ? `${nT} tarjetas.` : 'Escrita con tus palabras.', val: 'hecha', color: 'var(--handyx)' });
  }
  for (const a of st.attempts.filter((a) => a.tema === id && a.kind === 'ejercicio')) eventos.push({ dia: diaDe(a.date), t: 'Ejercicios', sub: a.de && a.de[0] < a.de[1] ? `Fallaste ${a.de[1] - a.de[0]} de ${a.de[1]}.` : 'Todos bien.', val: a.de ? `${a.de[0]}/${a.de[1]} · ${Math.round(a.ok * 100)} %` : `${Math.round(a.ok * 100)} %`, color: BANDA_COLOR[banda(a.ok * 100)] });
  if (cartas.length) {
    const okc = Math.round((cartas.filter((c) => c.ok).length / cartas.length) * 100);
    const fallas = new Map<string, number>();
    cartas.filter((c) => !c.ok).forEach((c) => fallas.set(c.idea, (fallas.get(c.idea) ?? 0) + 1));
    const peor = [...fallas.entries()].sort((a, b) => b[1] - a[1])[0];
    eventos.push({ dia: diaDe(cartas[cartas.length - 1].date), t: 'Tarjetas', sub: peor ? `${peor[1] === 1 ? 'Un fallo' : `${peor[1]} fallos`} en "${peor[0]}".` : 'Sin fallos.', val: `${okc} %`, color: BANDA_COLOR[banda(okc)] });
  }
  eventos.sort((a, b) => Number(a.dia.slice(4)) - Number(b.dia.slice(4)) || (a.o ?? 0) - (b.o ?? 0));
  const prox = st.reviews.filter((r) => r.activityId === t.activity?.id && r.unit === t.unit && !r.doneOn && r.kind !== 'cold').sort((a, b) => a.due.localeCompare(b.due))[0];
  if (prox) eventos.push({ dia: diaDe(prox.due), t: prox.label.split(' · ')[0], sub: prox.kind === 'tesis' ? 'Pendiente: explicalo con tus palabras, empezando por los errores.' : prox.kind === 'retest' ? 'Releé lo que falló antes.' : t.fuerza != null && t.fuerza < 85 ? 'Con lo que falló, vuelve antes.' : 'Lo próximo del capítulo.', val: prox.due < day.date ? 'atrasada' : `el ${fmtFecha(prox.due).split(' ').slice(1).join(' de ')}`, color: 'var(--sub)', hueco: true });

  return (
    <main className="pantalla debiles tema-deb" style={{ ['--c' as string]: color }}>
      <div className="topbar"><a className="volver" href="#/flojo">Puntos débiles</a></div>
      <div className="etiqueta">{front?.name}{t.activity ? ` · ${t.activity.title.split(' · ')[0]}` : ''}</div>
      <h1 className="titulo">{t.nombre}</h1>
      <div className="tema-cab">
        <Anillo value={(t.fuerza ?? 0) / 100} label="fuerza" texto={t.fuerza == null ? '—' : String(t.fuerza)} color={t.fuerza == null ? 'var(--linea)' : BANDA_COLOR[banda(t.fuerza)]} />
        <div>
          <p>{ol.length ? <>Flojo en <b>{NUM[ol.length] ?? `${ol.length} ideas`}</b>. El resto {t.activity ? 'del capítulo' : 'del mazo'} lo tenés.</> : t.fuerza != null && t.fuerza < 85 ? <>Le falta para estar firme: <b>{t.fuerza}</b> de 100.</> : <>Lo tenés firme.</>}</p>
          <small className="sub">{[t.fuentes.cold != null && `recall ${t.fuentes.cold}\u00a0%`, t.fuentes.tarjetas != null && `tarjetas ${t.fuentes.tarjetas}\u00a0%`, t.fuentes.test != null && `test ${t.fuentes.test}\u00a0%`].filter(Boolean).join(' · ') || 'Todavía sin datos.'}</small>
        </div>
      </div>

      <Card title="Lo que olvidás" aside={ideas.length ? `${ideas.length} ideas ${t.activity ? 'del capítulo' : ''}` : undefined}>
        {!ideas.length ? <Vacio>Aparece con tu primer cold recall de este tema.</Vacio> : (
          <>
            <div className="ideas-cab mono sub" aria-hidden="true"><span /><span>1</span><span>2</span><span>3</span><span>4</span></div>
            <ul className="ideas">
              {ideas.map((i) => (
                <li key={i.idea}>
                  <span className={i.olvidada ? 'resaltado' : ''} style={{ ['--c' as string]: 'var(--rutina)' }}>{i.idea}</span>
                  <span className="puntitos" role="img" aria-label={`${i.idea}: ${i.intentos.map((x) => (x.ok ? 'recordada' : 'olvidada')).join(', ')}`}>
                    {[0, 1, 2, 3].map((k) => <i key={k} className={i.intentos[k] == null ? 'nada' : i.intentos[k].ok ? 'si' : 'no'} />)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="sub deb-nota">Cada punto es un intento: cold recall, tarjetas y ejercicios, en orden. Verde: lo recordaste. Aro rojo: lo olvidaste.</p>
          </>
        )}
      </Card>

      <Card title="Recuerdo con los días" aside={t.corto}>
        {!puntos.length ? <Vacio>Aparece con tus primeros intentos.</Vacio> : (
          <>
            <svg ref={ref} className="ch" viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label={`Recuerdo de ${t.nombre}: ${puntos.map(([k, v]) => `día ${k + 1} ${v} %`).join(', ')}; tope ${tope} %`}>
              {hoyK < maxK && <rect x={x(hoyK)} y={T - 6} width={W - 6 - x(hoyK)} height={B - T + 6} className="ch-futuro" />}
              {[50, 70].map((g) => <line key={g} x1={6} x2={W - 6} y1={y(g)} y2={y(g)} className="ch-grid" />)}
              <line x1={6} x2={W - 6} y1={y(tope)} y2={y(tope)} className="ch-meta" />
              <text x={W - 6} y={y(tope) - 5} textAnchor="end" className="ch-txt mono sub-txt">tope {tope} %</text>
              <line x1={6} x2={W - 6} y1={B + 2} y2={B + 2} className="ch-base" />
              <path d={smooth(pts)} className="ch-linea dibujo" style={{ ['--c' as string]: 'var(--economia)' }} />
              {puntos.map(([k, v]) => <circle key={k} cx={x(k)} cy={y(v)} r={4.5} className="ch-aro" style={{ stroke: BANDA_COLOR[banda(v)] }} />)}
              {marcas.map((k) => <text key={k} x={x(k)} y={H + 12} textAnchor={k === 0 ? 'start' : k === maxK ? 'end' : 'middle'} className="ch-txt mono sub-txt">día {k + 1}</text>)}
            </svg>
            <TablaSR caption={`Recuerdo de ${t.nombre} por día`} head={['Día', 'Recuerdo']} rows={puntos.map(([k, v]) => [`día ${k + 1}`, `${v} %`])} />
          </>
        )}
      </Card>

      {t.activity && (
        <Card title="Cómo te fue" aside="línea de tiempo">
          {!eventos.length ? <Vacio>Todavía no hay nada de este capítulo.</Vacio> : (
            <ol className="linea-tiempo">
              {eventos.map((e, i) => (
                <li key={i}>
                  <span className="mono sub">{e.dia}</span>
                  <i className={e.hueco ? 'hueco' : ''} style={{ ['--c' as string]: e.color }} />
                  <div><div className="lt-t"><b>{e.t}</b><span className="mono" style={{ color: e.hueco ? 'var(--sub)' : e.color }}>{e.val}</span></div><small className="sub">{e.sub}</small></div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {test && (
        <Card title="Errores del test" aside={`${test.total - test.score} de ${test.total}`}>
          {test.total === test.score ? <p className="sub">Sin errores.</p> : (
            <ul className="err-lista">
              {(test.wrong?.length ? test.wrong.map((w, i) => ({ n: (test.perEx ?? []).map((e, k) => (e ? k + 1 : 0)).filter(Boolean)[i] ?? i + 1, txt: w.tema ?? w.q, type: w.type }))
                : (['descuido', 'tecnica', 'concepto', 'enunciado'] as const).flatMap((k) => Array.from({ length: test.errors[k] }, (_, j) => ({ n: 0, txt: `${ERR_NOMBRE[k]} ${j + 1}`, type: k })))).map((e, i) => (
                <li key={i}><span className="mono">✗ {e.n || ''}</span><span>{e.txt}</span><span className="chip-err" style={{ ['--c' as string]: ERR_COLOR[e.type] }}>{ERR_NOMBRE[e.type].toLowerCase()}</span></li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <section className="deb-prio arreglo" aria-labelledby="arr-t">
        <div className="deb-cab"><h2 id="arr-t">Cómo arreglarlo</h2><span className="sub">{planMin(plan)} min</span></div>
        <ol className="arreglo-lista">
          {plan.map((p, i) => <li key={i}><span className="mono sub">{i + 1}</span><span>{p.texto}</span><span className="mono sub">{p.min} min</span></li>)}
        </ol>
        <button className="btn-principal" onClick={() => empezarRefuerzo(day.date, tramosDeTema(st, id))}>Arreglar ahora · {planMin(plan)} min</button>
        <p className="sub nota">Si hoy no entra en el tope de {st.rules.cap} min, queda para mañana primero.</p>
      </section>
    </main>
  );
}

const lista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0] ?? '');
function erroresTxt(e: Record<'descuido' | 'tecnica' | 'concepto' | 'enunciado', number>) {
  const n = (k: keyof typeof e, a: string, b: string) => (e[k] ? `${e[k]} ${e[k] === 1 ? a : b}` : '');
  return lista([n('concepto', 'error de concepto', 'errores de concepto'), n('tecnica', 'error de técnica', 'errores de técnica'), n('enunciado', 'error de enunciado', 'errores de enunciado'), n('descuido', 'descuido', 'descuidos')].filter(Boolean));
}

