import { useMemo } from 'react';
import { BANDA_COLOR, FINAL_MIX, banda, examenes, finalReadiness, qFalla, simulacro, temaInfo } from '../data/debiles';
import { chapterExercises } from '../data/ejercicios';
import { fmtFecha } from '../data/time';
import type { StudyState } from '../data/study-types';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { Anillo } from '../ui/charts/charts';
import { ErroresPorTest, PuntajeTests, Repetidos, Simulacro } from '../ui/Debiles';
import { Filtro } from './PuntosDebiles';
import '../styles/estudio.css';
import '../styles/ruta.css';
import '../styles/debiles.css';

/** Fuerza de cada capítulo de la actividad con examen final. */
export function fuerzasDe(st: StudyState) {
  const a = st.activities.find((x) => x.id === 'conamat') ?? st.activities.find((x) => x.units?.length);
  const f: Record<number, number | null> = {};
  for (const u of a?.units ?? []) f[u.n] = temaInfo(st, `${a!.id}:${u.n}`)?.fuerza ?? null;
  return { a, f };
}

/** Cuán listo estás para el final y qué te falta. */
export function useListo(st: StudyState) {
  return useMemo(() => {
    const { a, f } = fuerzasDe(st);
    const listo = finalReadiness(f);
    const faltan = (a?.units ?? []).filter((u) => f[u.n] != null && f[u.n]! < 85).sort((x, y) => f[x.n]! - f[y.n]!).slice(0, 2).map((u) => u.corto ?? u.title);
    const sinEstudiar = (a?.units ?? []).filter((u) => f[u.n] == null).length;
    const flojos = (a?.units ?? []).filter((u) => f[u.n] != null && f[u.n]! < 70).length;
    // Recomendado: un capítulo por día lo que falta, más el test y la tesis del último, más un día por tema flojo.
    const dias = listo >= 85 ? 0 : sinEstudiar + (sinEstudiar ? 2 : 0) + flojos + (faltan.length ? 2 : 0);
    return { a, f, listo, faltan, sinEstudiar, dias };
  }, [st]);
}

const lista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0] ?? '');

export function ListoFinal({ st }: { st: StudyState }) {
  const { a, listo, faltan, sinEstudiar, dias } = useListo(st);
  if (!a?.final) return null;
  return (
    <section className="r-card listo-final">
      <Anillo value={listo / 100} label="listo" color={BANDA_COLOR[banda(listo)]} />
      <div>
        <b className="resaltado" style={{ ['--c' as string]: 'var(--economia)' }}>{a.final.title}</b>
        <p className="sub">40 ejercicios, 85 % para pasar.{faltan.length ? ` Te faltan ${lista(faltan).replace(/\.$/, '')}.` : ''}{sinEstudiar ? ` Quedan ${sinEstudiar} ${sinEstudiar === 1 ? 'capítulo' : 'capítulos'} por estudiar.` : ''}</p>
        <span className="mono">{dias ? `recomendado: en ${dias} días` : 'recomendado: cuando quieras'}</span>
      </div>
    </section>
  );
}

/** 8.3 Exámenes: cómo te va en los tests y qué te falta para el examen final. */
export function PuntosExamenes({ day }: { day: DayLog }) {
  const st = useStore((s) => s.study);
  const { a, f } = useListo(st);
  const ex = a ? examenes(st, a) : null;
  const retest = ex?.retests[0];
  const filaRe = retest && ex!.filas.find((x) => x.n === retest.unit);
  return (
    <main className="pantalla debiles examenes-deb">
      <div className="topbar"><a className="volver" href="#/flojo">Puntos débiles</a></div>
      <header>
        <h1 className="titulo">Exámenes</h1>
        <p>Cómo te va en los tests y qué te falta para el {a?.final?.title.toLowerCase() ?? 'examen final'}.</p>
      </header>
      <Filtro actual="examenes" />
      <ListoFinal st={st} />
      {ex && (
        <div className="numeros deb-nums">
          <div><b className="mono">{ex.prom == null ? '—' : `${ex.prom} %`}</b><span>promedio de tests</span></div>
          <div><b className="mono" style={{ color: ex.filas.length ? 'var(--salud)' : undefined }}>{ex.primero} de {ex.filas.length}</b><span>al primer intento</span></div>
          <div><b className="mono" style={{ color: ex.retests.length ? 'var(--rutina)' : undefined }}>{ex.retests.length}</b><span>{ex.retests.length === 1 ? 're-test pendiente' : 're-tests pendientes'}</span></div>
        </div>
      )}
      <PuntajeTests st={st} a={a} />
      <ErroresPorTest st={st} a={a} />
      <Repetidos st={st} />
      {retest && filaRe && (
        <section className="retest-pend">
          <b>Re-test pendiente · cap. {retest.unit}</b>
          <p className="sub">Sacaste {Math.round((filaRe.t.score / filaRe.t.total) * 100)} %. Releé {qFalla(st, `${a!.id}:${retest.unit}`)} y volvé a hacer el test {retest.due <= day.date ? 'hoy' : `el ${fmtFecha(retest.due).split(' ')[0].toLowerCase()}`}.</p>
        </section>
      )}
      <Simulacro st={st} a={a} fuerzas={f} />
    </main>
  );
}

/** Hoja del simulacro dirigido: los 40 ejercicios repartidos según lo flojo, para imprimir. */
export function HojaSimulacro() {
  const st = useStore((s) => s.study);
  const { a, f } = fuerzasDe(st);
  const hoja = useMemo(() => simulacro(f).flatMap((x) => chapterExercises(x.unit, x.n, `simulacro:${x.unit}:${st.log.length}`)), [f, st.log.length]);
  return (
    <main className="pantalla debiles hoja-sim">
      <div className="topbar"><a className="volver" href="#/flojo/examenes">Exámenes</a><span className="mono">90:00</span></div>
      <div className="kicker" style={{ color: 'var(--eclipse)' }}>Simulacro dirigido</div>
      <h1 className="titulo">{a?.final?.title ?? 'Simulacro'}</h1>
      <p className="sub">{hoja.length} ejercicios, más de lo flojo. Sin apuntes, 90 minutos. Aprobás con 85 %.</p>
      <ol className="ejercicios">
        {hoja.map((e, i) => <li key={i}><span className="mono">{i + 1}</span><span>{e.q}</span></li>)}
      </ol>
      <button className="btn-principal" onClick={() => window.print()}>Imprimir la hoja</button>
      <p className="sub nota">Las respuestas: {Object.values(FINAL_MIX).length ? 'pedíselas a Claude con la foto de la hoja, o corregí cada capítulo en su test.' : ''}</p>
    </main>
  );
}
