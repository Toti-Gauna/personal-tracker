import { LADDER, PASS, REVIEW_CAP, TEST_MIN, TEST_PREV } from '../data/study-catalog';
import { shorter } from '../state/study';
import '../styles/estudio.css';

const pct = Math.round(PASS * 100);
/** Lo que repetís después del test: cold recall, tesis y los tres espaciados (el +21 más corto). */
const repetir = LADDER.cold.min + LADDER.tesis.min + LADDER.e7.min + shorter(LADDER.e21.min) + LADDER.e60.min;

const FASES: [string, string, string][] = [
  ['día 0', 'Estudiar', 'var(--ing)'],
  ['día 0', 'Test', 'var(--eclipse)'],
  [`día +${LADDER.tesis.days}`, 'Tesis', 'var(--handyx)'],
  [`+${LADDER.cold.days} → +${LADDER.e60.days}`, 'Repetir', 'var(--salud)'],
];

const EJEMPLO: [string, string, string, number][] = [
  ['día 0', 'Estudiás el capítulo de corrido', 'Un solo bloque, sin ejercicios en el medio', 50],
  ['día 0', 'Test completo', '88 %: aprobado, 2 errores de técnica', TEST_MIN],
  [`+${LADDER.cold.days}`, 'Cold recall', '90 %: no hace falta releer', LADDER.cold.min],
  [`+${LADDER.tesis.days}`, 'Tesis y tarjetas', 'Empezás por los 2 errores; salen 6 tarjetas', LADDER.tesis.min],
  [`+${LADDER.e7.days}`, 'Estudio + ejercicios', 'Releés lo flojo y hacés 5 sin mirar', LADDER.e7.min],
  [`+${LADDER.e21.days}`, 'Ejercicios mixtos', '3, porque el +7 salió perfecto', shorter(LADDER.e21.min)],
  [`+${LADDER.e60.days}`, 'Examen corto', 'Si sale bien, el capítulo queda maduro', LADDER.e60.min],
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

/** 2.3 Cómo funciona: las cuatro fases de cada tema, con sus reglas y un ejemplo real. */
export function ComoFunciona() {
  return (
    <main className="pantalla como">
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a></div>
      <header>
        <h1 className="titulo">Cómo funciona</h1>
        <p>Cada tema hace el mismo camino: estudiás de corrido, hacés un test completo, escribís la tesis y después lo repetís espaciado. Una sola regla: no repasás lo que ya sabés.</p>
      </header>

      <ol className="fases-como">
        {FASES.map(([d, t, c]) => <li key={t} style={{ ['--c' as string]: c }}><small>{d}</small><b>{t}</b></li>)}
      </ol>

      <Caja n={1} titulo="Estudiar" nota="de corrido" intro="Un capítulo entero, sin parar a hacer ejercicios en el medio. Anotás lo que no entendés y seguís."
        reglas={[
          ['Matemática', 'Un capítulo de CONAMAT por bloque, con pomodoros 50/10.'],
          ['Otros frentes', 'El curso, el libro o la práctica, a tu ritmo: páginas, secciones o minutos.'],
          ['Regla', 'Nada de ejercicios hasta terminar: para eso está el test.'],
        ]} />
      <Caja n={2} titulo="Test" nota={`completo · ${pct} %`} intro={`Apenas terminás, un solo test con todo el capítulo. Sin apuntes, ${TEST_MIN} minutos.`}
        reglas={[
          ['Qué trae', `15 ejercicios nuevos del capítulo y ${TEST_PREV} de los anteriores.`],
          [`Con ${pct} % o más`, `Pasás al capítulo siguiente y la tesis queda agendada a los ${LADDER.tesis.days} días.`],
          ['Con menos', `Releés solo lo que falló y repetís el test a los ${LADDER.retest.days} días.`],
          ['Errores', 'Cada uno se marca como descuido, técnica, concepto o enunciado y alimenta tus puntos débiles.'],
        ]} />
      <Caja n={3} titulo="Tesis" nota={`día +${LADDER.tesis.days} · ${LADDER.tesis.min} min`} intro="Pasaron tres días: lo explicás con tus palabras, empezando por lo que fallaste en el test."
        reglas={[
          ['Dónde', 'En la app o en papel; en papel, la foto se la mandás a Claude.'],
          ['Qué sale', 'Tarjetas con las líneas que tienen :: o [[ ]].'],
          [`Por qué +${LADDER.tesis.days}`, 'Ya olvidaste un poco: explicarlo cuesta y por eso fija.'],
        ]} />
      <Caja n={4} titulo="Repetir" nota="estudio + espaciado" intro={`Desde ahí el tema vuelve solo, con un tope de ${REVIEW_CAP} minutos por día.`}
        reglas={[
          [`+${LADDER.cold.days} · Cold recall`, 'Escribís sin mirar lo de ayer y lo comparás con el capítulo y el test. De 2 a 5 min.'],
          ['Tarjetas', 'Solo las que vencen hoy; las fáciles se alejan cada vez más.'],
          [`+${LADDER.e7.days} · +${LADDER.e21.days} · +${LADDER.e60.days}`, 'Releés solo lo flojo y hacés 3 a 5 ejercicios mixtos.'],
          ['Se saltea si', `el cold recall dio ${pct} % o más, o si no vence nada. Hay días sin repaso.`],
        ]} />

      <div className="etiqueta como-t">Ejemplo: un capítulo, dos meses</div>
      <ol className="escalera">
        {EJEMPLO.map(([d, t, s, m], i) => (
          <li key={i} className={d === 'día 0' ? 'cero' : ''}><span className="dia">{d}</span><span>{t}<small>{s}</small></span><span className="mono sub">{m} min</span></li>
        ))}
      </ol>
      <p className="sub">Después del test, repetís unos {repetir} minutos repartidos en dos meses. Si algún día sale menos de 70 %, se agrega una relectura corta y el próximo repaso llega antes.</p>
      <a className="caja-link" href="#/motor">Ajustar el motor: tope, retención, nuevas por día <span aria-hidden="true">→</span></a>
    </main>
  );
}
