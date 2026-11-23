/**
 * Trazo 2.0 · un tema flojo (#/flojo/<tema>): qué fuerza tiene y de dónde sale, cómo arreglarlo (con el botón que arma la sesión),
 * qué ideas se te olvidan, el recuerdo con los días, la línea de tiempo del capítulo y los errores del último test.
 * Mismos datos y mismo refuerzo que la 1.0.
 */
import { BANDA_COLOR, ERR_NOMBRE, banda, cardAttempts, fixPlan, lastTest, olvidadas, planMin, temaInfo } from '../../data/debiles';
import { unitState } from '../../data/study';
import { fmtFecha, parseDate } from '../../data/time';
import { getState, useStore } from '../../state/store';
import { startStudy } from '../../ui/estudio-acciones';
import { colorV2 } from '../hoy/datos';
import { caminoSuave } from '../entreno/Curva';
import { aviso } from '../kit/capas';
import { Boton } from '../kit/controles';
import { Anillo, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { areaV2, lista, tramosDeTema } from './datos';
import '../proyecto/proyecto.css';
import './temas.css';
import { cuantos } from '../reglas';

const dias = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5);
const NUM = ['ninguna idea', 'una idea', 'dos ideas', 'tres ideas', 'cuatro ideas', 'cinco ideas', 'seis ideas'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const banda$ = (v: number) => colorV2(BANDA_COLOR[banda(v)]);

function erroresTxt(e: Record<'descuido' | 'tecnica' | 'concepto' | 'enunciado', number>) {
  const n = (k: keyof typeof e, a: string, b: string) => (e[k] ? `${e[k]} ${e[k] === 1 ? a : b}` : '');
  return lista([n('concepto', 'error de concepto', 'errores de concepto'), n('tecnica', 'error de técnica', 'errores de técnica'), n('enunciado', 'error de enunciado', 'errores de enunciado'), n('descuido', 'descuido', 'descuidos')].filter(Boolean));
}

interface Evento { dia: string; t: string; sub: string; val: string; hueco?: boolean; o?: number }

export default function TemaV2({ ruta, day }: PropsV2) {
  const id = ruta.param ?? '';
  const st = useStore((s) => s.study);
  const t = temaInfo(st, id);
  if (!t) {
    return (
      <Marco className="tm" titulo="Tema" volver={{ href: '#/flojo', nombre: 'Puntos débiles' }}>
        <Vacio ilustracion="buscar" titulo="No encontré ese tema" accion={<Boton variante="secundario" href="#/flojo">Ver puntos débiles</Boton>} />
      </Marco>
    );
  }
  const front = st.fronts.find((f) => f.id === t.frontId);
  const area = areaV2(front?.color, 'var(--a-ing)');
  const ol = olvidadas(st, id);
  const s = t.activity && t.unit != null ? unitState(st, t.activity.id, t.unit) : null;
  const inicio = s?.learnedOn ?? st.attempts.find((a) => a.tema === id)?.date ?? day.date;
  const plan = fixPlan(st, id);
  const test = lastTest(st, id);
  const unidad = t.activity?.units?.find((u) => u.n === t.unit);

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
  const eventos: Evento[] = [];
  const diaDe = (d: string) => `día ${dias(inicio, d) + 1}`;
  for (const [i, x2] of (s?.tests ?? []).entries()) eventos.push({ dia: diaDe(x2.date), t: i ? `Re-test ${i}` : 'Test completo', sub: x2.approved ? (x2.score / x2.total < 0.9 ? `Pasó justo: ${erroresTxt(x2.errors)}.` : `Aprobado${erroresTxt(x2.errors) ? `: ${erroresTxt(x2.errors)}` : ''}.`) : `No llegó al 85 %: ${erroresTxt(x2.errors)}.`, val: `${x2.score}/${x2.total} · ${Math.round((x2.score / x2.total) * 100)} %` });
  for (const c of colds) eventos.push({ o: -1, dia: diaDe(c.date), t: 'Cold recall', sub: (c.ideas ?? []).some((i) => !i.ok) ? `Olvidaste ${lista((c.ideas ?? []).filter((i) => !i.ok).map((i) => i.idea.toLowerCase()))}.` : 'Lo recordaste todo.', val: `${Math.round(c.ok * 100)} %` });
  const tesis = st.reviews.find((r) => r.activityId === t.activity?.id && r.unit === t.unit && r.kind === 'tesis');
  if (tesis?.doneOn) {
    const nT = st.cards.filter((c) => c.activityId === t.activity?.id && c.unit === t.unit && c.source.startsWith(t.nombre)).length;
    eventos.push({ dia: diaDe(tesis.doneOn), t: 'Tesis', sub: nT ? `${cuantos(nT, 'tarjeta', 'tarjetas')}.` : 'Escrita con tus palabras.', val: 'hecha' });
  }
  for (const a of st.attempts.filter((a) => a.tema === id && a.kind === 'ejercicio')) eventos.push({ dia: diaDe(a.date), t: 'Ejercicios', sub: a.de && a.de[0] < a.de[1] ? `Fallaste ${a.de[1] - a.de[0]} de ${a.de[1]}.` : 'Todos bien.', val: a.de ? `${a.de[0]}/${a.de[1]} · ${Math.round(a.ok * 100)} %` : `${Math.round(a.ok * 100)} %` });
  if (cartas.length) {
    const okc = Math.round((cartas.filter((c) => c.ok).length / cartas.length) * 100);
    const fallas = new Map<string, number>();
    cartas.filter((c) => !c.ok).forEach((c) => fallas.set(c.idea, (fallas.get(c.idea) ?? 0) + 1));
    const peor = [...fallas.entries()].sort((a, b) => b[1] - a[1])[0];
    eventos.push({ dia: diaDe(cartas[cartas.length - 1].date), t: 'Tarjetas', sub: peor ? `${peor[1] === 1 ? 'Un fallo' : `${peor[1]} fallos`} en "${peor[0]}".` : 'Sin fallos.', val: `${okc} %` });
  }
  eventos.sort((a, b) => Number(a.dia.slice(4)) - Number(b.dia.slice(4)) || (a.o ?? 0) - (b.o ?? 0));
  const prox = st.reviews.filter((r) => r.activityId === t.activity?.id && r.unit === t.unit && !r.doneOn && r.kind !== 'cold').sort((a, b) => a.due.localeCompare(b.due))[0];
  if (prox) eventos.push({ dia: diaDe(prox.due), t: prox.label.split(' · ')[0], sub: prox.kind === 'tesis' ? 'Pendiente: explicalo con tus palabras, empezando por los errores.' : prox.kind === 'retest' ? 'Releé lo que falló antes.' : t.fuerza != null && t.fuerza < 85 ? 'Con lo que falló, vuelve antes.' : 'Lo próximo del capítulo.', val: prox.due < day.date ? 'atrasada' : `el ${fmtFecha(prox.due).split(' ').slice(1).join(' de ')}`, hueco: true });

  // Con el detalle de cada ejercicio fallado, uno por uno; si solo se cargó cuántos de cada tipo, una fila por tipo.
  const errs: { txt: string; nota?: string; valor?: string }[] = !test || test.total === test.score ? [] : test.wrong?.length
    ? test.wrong.map((w, i) => { const n = (test.perEx ?? []).map((e, k) => (e ? k + 1 : 0)).filter(Boolean)[i] ?? i + 1; return { txt: w.tema ?? w.q, nota: ERR_NOMBRE[w.type], valor: `Ej. ${n}` }; })
    : (['concepto', 'tecnica', 'enunciado', 'descuido'] as const).filter((k) => test.errors[k] > 0).map((k) => ({ txt: ERR_NOMBRE[k], valor: `×${test.errors[k]}` }));
  const hayHistoria = ideas.length > 0 || puntos.length > 0 || (!!t.activity && eventos.length > 0) || !!test;

  const arreglar = () => {
    const tramos = tramosDeTema(getState().study, id);
    if (!tramos.length) { aviso({ titulo: 'Nada para reforzar hoy', sub: 'No hay temas flojos', tono: 'hecho' }); return; }
    startStudy(day.date, 'refuerzo', 'math', tramos);
  };
  const fuentes = [t.fuentes.cold != null && `recall ${t.fuentes.cold} %`, t.fuentes.tarjetas != null && `tarjetas ${t.fuentes.tarjetas} %`, t.fuentes.test != null && `test ${t.fuentes.test} %`].filter(Boolean).join(' · ');
  const titulo = t.activity && t.unit != null ? `${t.activity.unitLabel ?? 'Cap.'} ${t.unit}` : t.nombre;
  const resumen = ol.length ? <>Flojo en <b>{NUM[ol.length] ?? `${ol.length} ideas`}</b>.</> : t.fuerza != null && t.fuerza < 85 ? <>Le falta para estar firme.</> : <>Lo tenés firme.</>;

  return (
    <Marco className="tm" titulo={titulo} rotulo={`${front?.name ?? ''}${t.activity ? ` · ${t.activity.title.split(' · ')[0]}` : ''}`} volver={{ href: '#/flojo', nombre: 'Puntos débiles' }}
      info={(
        <>
          <p className="t-cuerpo-l">La fuerza va de 0 a 100 y sale de tus cold recalls, tus tarjetas y tus tests.</p>
          <p className="t-cuerpo">En "Lo que olvidás", cada punto es un intento (cold recall, tarjetas y ejercicios): lleno, la recordaste; vacío, la olvidaste.</p>
          <p className="t-cuerpo">Por debajo de 70 el tema está flojo; de 85 para arriba, firme. El resto del tema lo tenés cuando no hay ideas olvidadas.</p>
          <p className="t-cuerpo">"Arreglar ahora" arma una sesión con los pasos de abajo. Si hoy no entra en el tope de {st.rules.cap} min, queda para mañana primero.</p>
        </>
      )}>
      <Tarjeta heroe area={area} className="tm-aca tm-tema">
        <div className="tm-hero-fila">
          <Anillo valor={(t.fuerza ?? 0) / 100} tamano={88} grosor={9} etiqueta={t.fuerza == null ? '—' : String(t.fuerza)} sub="fuerza" area={t.fuerza == null ? undefined : banda$(t.fuerza)} nombre="Fuerza del tema" />
          <div className="tm-hero-texto">
            {unidad && <b className="t-encabezado">{unidad.title}</b>}
            <p className="t-cuerpo">{resumen}</p>
            <p className="t-nota t-dato">{fuentes || 'Todavía sin datos.'}</p>
          </div>
        </div>
      </Tarjeta>

      <Grupo titulo="Cómo arreglarlo" extremo={<span className="t-rotulo">{planMin(plan)} min</span>}>
        <div className="capa-1 s-lista">
          <FilaHoja icono="documento" titulo="Los pasos" valor={`${plan.length} ${plan.length === 1 ? 'paso' : 'pasos'}`} tituloHoja="Cómo arreglarlo">
            <ol className="capa-1 tm-arreglo">
              {plan.map((p, i) => <li key={i}><span className="t-cuerpo">{p.texto}</span><span className="t-dato">{p.min} min</span></li>)}
            </ol>
            <p className="t-nota pt-pie">Si hoy no entra en el tope de {st.rules.cap} min, queda para mañana primero.</p>
          </FilaHoja>
        </div>
        <div className="pt-acciones"><Boton variante="primario" ancho icono="play" onClick={arreglar}>Arreglar ahora</Boton></div>
      </Grupo>

      {ideas.length > 0 && (
        <Grupo titulo="Lo que olvidás" extremo={<span className="t-rotulo">{ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'}</span>}>
          <div className="capa-1 tm-ideas">
            <ul>
              {ideas.map((i) => (
                <li key={i.idea} className={i.olvidada ? 'olvidada' : undefined}>
                  <span className="tm-idea-texto"><span className="t-cuerpo">{i.idea}</span>{i.olvidada && <small className="t-rotulo">Olvidada</small>}</span>
                  <span className="tm-puntitos" role="img" aria-label={`${i.idea}: ${i.intentos.map((z) => (z.ok ? 'recordada' : 'olvidada')).join(', ')}`}>
                    {[0, 1, 2, 3].map((k) => <i key={k} className={i.intentos[k] == null ? 'nada' : i.intentos[k].ok ? 'si' : 'no'} />)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Grupo>
      )}

      {puntos.length > 0 && (
        <Grupo titulo="Recuerdo con los días" extremo={<span className="t-rotulo">Tope {tope} %</span>}>
          <figure className="capa-1 tm-curva" role="img" data-grafico aria-label={`Recuerdo de ${t.nombre}: ${puntos.map(([k, v]) => `día ${k + 1} ${v} %`).join(', ')}; tope ${tope} %`}>
            <svg viewBox={`0 0 ${W} ${H + 16}`} aria-hidden="true" focusable="false">
              {hoyK < maxK && <rect x={x(hoyK)} y={T - 6} width={W - 6 - x(hoyK)} height={B - T + 6} className="tm-futuro" />}
              {[50, 70].map((g) => <g key={g}><line x1={6} x2={W - 6} y1={y(g)} y2={y(g)} className="tm-grilla" /><text x={W - 6} y={y(g) - 4} textAnchor="end" className="tm-eje">{g} %</text></g>)}
              <line x1={6} x2={W - 6} y1={y(tope)} y2={y(tope)} className="tm-tope" />
              <text x={W - 6} y={y(tope) - 5} textAnchor="end" className="tm-eje">tope {tope} %</text>
              <line x1={6} x2={W - 6} y1={B + 2} y2={B + 2} className="tm-base" />
              {pts.length > 1 && <path d={caminoSuave(pts)} className="tm-linea-curva" />}
              {pts.map(([cx, cy], i) => <circle key={puntos[i][0]} cx={cx} cy={cy} r={i === pts.length - 1 ? 5.5 : 4} className={i === pts.length - 1 ? 'tm-punto ultimo' : 'tm-punto'} />)}
              {marcas.map((k) => <text key={k} x={x(k)} y={H + 12} textAnchor={k === 0 ? 'start' : k === maxK ? 'end' : 'middle'} className="tm-eje">día {k + 1}</text>)}
            </svg>
          </figure>
        </Grupo>
      )}

      {t.activity && eventos.length > 0 && (
        <Grupo titulo="Cómo te fue" extremo={<span className="t-rotulo">Línea de tiempo</span>}>
          <ol className="capa-1 tm-linea">
            {eventos.map((e, i) => (
              <li key={i} className={e.hueco ? 'hueco' : undefined}>
                <span className="t-rotulo">{e.dia}</span>
                <i aria-hidden="true" />
                <div><div className="tm-linea-t"><b className="t-cuerpo">{e.t}</b><span className="t-dato">{e.val}</span></div><span className="t-nota">{e.sub}</span></div>
              </li>
            ))}
          </ol>
        </Grupo>
      )}

      {test && (
        <Grupo titulo="Errores del test" extremo={<span className="t-rotulo">{test.total - test.score} de {test.total}</span>}>
          <div className="capa-1 s-lista">
            {errs.length
              ? errs.map((e, i) => <Fila key={i} titulo={e.txt} nota={e.nota} valor={e.valor} />)
              : <Fila titulo="Sin errores" nota="Todos los ejercicios del último test salieron bien." />}
          </div>
        </Grupo>
      )}

      {!hayHistoria && (
        <Vacio ilustracion="repaso" titulo="Todavía sin historia" texto="Cada cold recall, tarjeta y test arma el detalle de este tema." accion={<Boton variante="secundario" href="#/repaso">Repasar hoy</Boton>} />
      )}
    </Marco>
  );
}
