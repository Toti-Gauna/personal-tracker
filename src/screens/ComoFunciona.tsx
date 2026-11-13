import { DIA, LADDER, MAX_TRIES, PASS, REST_TEST, REVIEW_CAP, TEST_MIN, TEST_PREV } from '../data/study-catalog';
import { shorter } from '../state/study';
import '../styles/estudio.css';

const pct = Math.round(PASS * 100);
/** Lo que repetís después del test: la tesis y los tres espaciados (el del día 22, más corto). */
const repetir = LADDER.tesis.min + LADDER.e8.min + shorter(LADDER.e22.min) + LADDER.e61.min;

const FASES: [string, string, string][] = [
  [`día ${DIA.estudiar}`, 'Estudiar', 'var(--ing)'],
  [`día ${DIA.test}`, 'Test', 'var(--eclipse)'],
  [`día ${DIA.tesis}`, 'Tesis', 'var(--handyx)'],
  [`${DIA.e8} → ${DIA.e61}`, 'Repetir', 'var(--salud)'],
];

/** Un capítulo de punta a punta. */
const EJEMPLO: [string, string, string, number][] = [
  [`día ${DIA.estudiar}`, 'Estudiás el capítulo de corrido', 'Un solo bloque, sin ejercicios en el medio', 50],
  [`día ${DIA.test}`, 'Cold recall y test completo', `${LADDER.cold.min} min sin mirar y 88 %: aprobado, 2 errores de técnica`, LADDER.cold.min + TEST_MIN],
  [`día ${DIA.tesis}`, 'Tesis y tarjetas', 'Empezás por los 2 errores; salen 6 tarjetas', LADDER.tesis.min],
  [`día ${DIA.e8}`, 'Estudio + ejercicios', 'Releés lo flojo y hacés 5 sin mirar', LADDER.e8.min],
  [`día ${DIA.e22}`, 'Ejercicios mixtos', `3, porque el día ${DIA.e8} salió perfecto`, shorter(LADDER.e22.min)],
  [`día ${DIA.e61}`, 'Examen corto', 'Si sale bien, el capítulo queda maduro', LADDER.e61.min],
];

/** Un día cualquiera: cada fase con un capítulo distinto, en el orden de la sesión. */
const DIA_TIPO: [string, string, string, number][] = [
  ['Test', 'Cold recall · cap. 2', 'Lo que estudiaste ayer, sin mirar', LADDER.cold.min],
  ['Repetir', 'Tarjetas', 'Solo las que vencen hoy', 4],
  ['Test', 'Test completo · cap. 2', 'El capítulo de ayer', TEST_MIN],
  ['', 'Descanso', 'Pararse, agua, nada de pantalla', REST_TEST],
  ['Tesis', 'Tesis · cap. 1', 'El de antes de ayer, aprobado ayer', LADDER.tesis.min],
  ['Estudiar', 'Cap. 3 · capítulo nuevo', 'De corrido, pomodoro 50/10', 50],
];

function Caja({ n, titulo, nota, intro, reglas }: { n: number; titulo: string; nota: string; intro: string; reglas: [string, string][] }) {
  return (
    <section className="paso-caja">
      <h2><span className="n">{n}</span>{titulo}<small>{nota}</small></h2>
      <p>{intro}</p>
      <dl className="reglas">
        {reglas.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
      </dl>
    </section>
  );
}

/** 2.3 Cómo funciona: las cuatro fases de cada capítulo, un día cualquiera y un capítulo en dos meses. */
export function ComoFunciona() {
  return (
    <main className="pantalla como">
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a></div>
      <header>
        <h1 className="titulo">Cómo funciona</h1>
        <p>Cada capítulo hace el mismo camino: el día 1 lo estudiás de corrido, el día 2 hacés el test, el día 3 escribís la tesis y después lo repetís espaciado. Una sola regla: no repasás lo que ya sabés.</p>
      </header>

      <ol className="fases-como">
        {FASES.map(([d, t, c]) => <li key={t} style={{ ['--c' as string]: c }}><small>{d}</small><b>{t}</b></li>)}
      </ol>

      <Caja n={1} titulo="Estudiar" nota={`día ${DIA.estudiar} · de corrido`} intro="Un capítulo entero, sin parar a hacer ejercicios en el medio. Anotás lo que no entendés y seguís."
        reglas={[
          ['Matemática', 'Un capítulo de CONAMAT por día, con pomodoros 50/10.'],
          ['Otros frentes', 'El curso, el libro o la práctica, a tu ritmo: páginas, secciones o minutos.'],
          ['Regla', 'Nada de ejercicios hasta el test: para eso está el día 2.'],
        ]} />
      <Caja n={2} titulo="Test" nota={`día ${DIA.test} · ${pct} %`} intro={`Al día siguiente, ${LADDER.cold.min} min de cold recall para calentar y después un solo test con todo el capítulo. Sin apuntes, ${TEST_MIN} minutos.`}
        reglas={[
          ['Cold recall', 'Escribís sin mirar lo que estudiaste ayer y lo comparás con el capítulo.'],
          ['Qué trae', `15 ejercicios del capítulo y ${TEST_PREV} de los anteriores.`],
          [`Con ${pct} % o más`, 'La tesis queda para el día siguiente.'],
          ['Con menos', 'Al día siguiente releés lo que falló y al otro hacés el re-test, con ejercicios nuevos.'],
          [`${MAX_TRIES} veces`, `A la ${MAX_TRIES === 3 ? 'tercera' : `${MAX_TRIES}.ª`} vez sin aprobar, el tema queda marcado como flojo y sigue a la tesis.`],
          ['Errores', 'Cada uno se marca como descuido, técnica, concepto o enunciado y alimenta tus puntos débiles.'],
        ]} />
      <Caja n={3} titulo="Tesis" nota={`día ${DIA.tesis} · ${LADDER.tesis.min} min`} intro="Al día siguiente de aprobar, lo explicás con tus palabras, empezando por lo que fallaste en el test."
        reglas={[
          ['Dónde', 'En la app o en papel; en papel, la foto se la mandás a Claude.'],
          ['Qué sale', 'Tarjetas con las líneas que tienen :: o [[ ]].'],
          ['Tope', `Va fuera de los ${REVIEW_CAP} min de repaso.`],
        ]} />
      <Caja n={4} titulo="Repetir" nota={`días ${DIA.e8} · ${DIA.e22} · ${DIA.e61}`} intro={`Desde ahí el tema vuelve solo, con tarjetas y un tope de ${REVIEW_CAP} minutos por día.`}
        reglas={[
          ['Tarjetas', 'Solo las que vencen hoy; las fáciles se alejan cada vez más.'],
          [`Días ${DIA.e8} · ${DIA.e22} · ${DIA.e61}`, 'Estudiás lo flojo y hacés 3 a 5 ejercicios mixtos.'],
          ['Se saltea si', 'no vence nada. Hay días sin repaso.'],
        ]} />

      <div className="etiqueta como-t">Un día cualquiera: cada fase, un capítulo distinto</div>
      <ol className="escalera dia-tipo">
        {DIA_TIPO.map(([f, t, s2, m], i) => (
          <li key={i}><span className="dia">{f || '·'}</span><span>{t}<small>{s2}</small></span><span className="mono sub">{m} min</span></li>
        ))}
      </ol>

      <div className="etiqueta como-t">Ejemplo: un capítulo, dos meses</div>
      <ol className="escalera">
        {EJEMPLO.map(([d, t, s2, m], i) => (
          <li key={i} className={i < 2 ? 'cero' : ''}><span className="dia">{d}</span><span>{t}<small>{s2}</small></span><span className="mono sub">{m} min</span></li>
        ))}
      </ol>
      <p className="sub">Después del test, repetís unos {repetir} minutos repartidos en dos meses. Si algún día sale menos de 70 %, se agrega una relectura corta y el próximo repaso llega antes.</p>
      <a className="caja-link" href="#/motor">Ajustar el motor: tope, retención, nuevas por día <span aria-hidden="true">→</span></a>
    </main>
  );
}
