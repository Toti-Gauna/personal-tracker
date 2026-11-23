/**
 * Trazo 2.0 · Cómo funciona (#/como): cada capítulo hace el mismo camino de cuatro pasos (estudiar, test, tesis y repetir). Cada
 * paso tiene su ilustración, una línea que lo explica y sus reglas en una hoja; "un día cualquiera" y "un capítulo, dos meses"
 * también. Los números salen del mismo catálogo que usa el motor: si cambian las reglas, cambia esta pantalla.
 */
import type { ReactNode } from 'react';
import { DIA, LADDER, MAX_TRIES, PASS, REST_TEST, REVIEW_CAP, TEST_MIN, TEST_PREV } from '../../data/study-catalog';
import { shorter } from '../../state/study';
import { Fila } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import '../proyecto/proyecto.css';
import './estudio.css';

const pct = Math.round(PASS * 100);
/** Lo que repetís después del test: la tesis y los tres espaciados (el del día 22, más corto). */
const repetir = LADDER.tesis.min + LADDER.e8.min + shorter(LADDER.e22.min) + LADDER.e61.min;

const Marcos = ({ children }: { children: ReactNode }) => (
  <svg className="es-ilus" viewBox="0 0 120 88" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
);

/** Un libro abierto y un reloj de pomodoro: estudiar de corrido. */
const IlusEstudiar = () => (
  <Marcos>
    <path d="M12 24c14-6 30-5 40 3v46c-10-8-26-9-40-3z" />
    <path d="M68 27c10-8 26-9 40-3v46c-14-6-30-5-40 3z" />
    <path d="M52 27v46M68 27v46" opacity="0.5" />
    <path d="M20 36c8-2 18-2 26 2M20 46c8-2 18-2 26 2M20 56c8-2 18-2 26 2" opacity="0.6" />
    <circle cx="94" cy="20" r="11" className="es-ilus-acento" />
    <path d="M94 14v6l4 3" className="es-ilus-acento" />
  </Marcos>
);
/** Una hoja con tildes y un anillo de puntaje. */
const IlusTest = () => (
  <Marcos>
    <rect x="14" y="10" width="58" height="68" rx="6" />
    <path d="M24 28l5 5 9-10M24 48l5 5 9-10" className="es-ilus-acento" />
    <path d="M46 29h16M46 49h16M24 66h38" opacity="0.5" />
    <circle cx="92" cy="44" r="18" opacity="0.35" />
    <path d="M92 26a18 18 0 1 1-17 24" className="es-ilus-acento" />
    <path d="M86 44l5 5 9-11" />
  </Marcos>
);
/** Una burbuja que explica y una pluma: la tesis con tus palabras. */
const IlusTesis = () => (
  <Marcos>
    <path d="M14 14h66a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H44l-14 12V56H20a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z" />
    <path d="M26 28h42M26 38h30" opacity="0.55" />
    <path d="M98 30l6 6-28 28-9 3 3-9z" className="es-ilus-acento" />
    <path d="M92 36l6 6" />
  </Marcos>
);
/** Puntos cada vez más separados sobre una curva que se aplana: repetir espaciado. */
const IlusRepetir = () => (
  <Marcos>
    <path d="M10 70h100" opacity="0.4" />
    <path d="M10 22c10 0 12 30 22 30 8 0 8-26 24-26 14 0 12 20 30 20 12 0 14-12 24-12" opacity="0.5" />
    <circle cx="22" cy="70" r="4" className="es-ilus-acento" />
    <circle cx="38" cy="70" r="4" className="es-ilus-acento" />
    <circle cx="62" cy="70" r="4" className="es-ilus-acento" />
    <circle cx="102" cy="70" r="4" className="es-ilus-acento" />
    <path d="M22 62v-6M38 62v-6M62 62v-6M102 62v-6" opacity="0.6" />
  </Marcos>
);

interface Paso { n: number; dia: string; titulo: string; linea: string; area: string; ilus: ReactNode; reglas: [string, string][] }

const PASOS: Paso[] = [
  { n: 1, dia: `Día ${DIA.estudiar}`, titulo: 'Estudiar', area: 'var(--a-ing)', ilus: <IlusEstudiar />, linea: 'Un capítulo entero, de corrido. Anotás lo que no entendés y seguís.',
    reglas: [['Matemática', 'Un capítulo de CONAMAT por día, con pomodoros 50/10.'], ['Otros frentes', 'El curso, el libro o la práctica, a tu ritmo: páginas, secciones o minutos.'], ['Regla', 'Nada de ejercicios hasta el test: para eso está el día 2.']] },
  { n: 2, dia: `Día ${DIA.test}`, titulo: 'Test', area: 'var(--a-eclipse)', ilus: <IlusTest />, linea: `Cold recall y un test del capítulo: sin apuntes, ${TEST_MIN} minutos. Aprueba con ${pct} %.`,
    reglas: [
      ['Cold recall', `${LADDER.cold.min} min: escribís sin mirar lo que estudiaste ayer y lo comparás con el capítulo.`],
      ['Qué trae', `15 ejercicios del capítulo y ${TEST_PREV} de los anteriores.`],
      [`Con ${pct} % o más`, 'La tesis queda para el día siguiente.'],
      ['Con menos', 'Al día siguiente releés lo que falló y al otro hacés el re-test, con ejercicios nuevos.'],
      [`${MAX_TRIES} veces`, `A la ${MAX_TRIES === 3 ? 'tercera' : `${MAX_TRIES}.ª`} vez sin aprobar, el tema queda marcado como flojo y sigue a la tesis.`],
      ['Errores', 'Cada uno se marca como descuido, técnica, concepto o enunciado y alimenta tus puntos débiles.'],
    ] },
  { n: 3, dia: `Día ${DIA.tesis}`, titulo: 'Tesis', area: 'var(--a-handyx)', ilus: <IlusTesis />, linea: `Lo explicás con tus palabras, empezando por lo que fallaste. ${LADDER.tesis.min} minutos.`,
    reglas: [['Dónde', 'En la app o en papel; en papel, la foto se la mandás a Claude.'], ['Qué sale', 'Tarjetas con las líneas que tienen :: o [[ ]].'], ['Tope', `Va fuera de los ${REVIEW_CAP} min de repaso.`]] },
  { n: 4, dia: `Días ${DIA.e8} · ${DIA.e22} · ${DIA.e61}`, titulo: 'Repetir', area: 'var(--a-salud)', ilus: <IlusRepetir />, linea: `El tema vuelve solo, con tarjetas y un tope de ${REVIEW_CAP} minutos por día.`,
    reglas: [['Tarjetas', 'Solo las que vencen hoy; las fáciles se alejan cada vez más.'], [`Días ${DIA.e8} · ${DIA.e22} · ${DIA.e61}`, 'Estudiás lo flojo y hacés 3 a 5 ejercicios mixtos.'], ['Se saltea si', 'no vence nada. Hay días sin repaso.']] },
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
/** Un capítulo de punta a punta. */
const EJEMPLO: [string, string, string, number][] = [
  [`día ${DIA.estudiar}`, 'Estudiás el capítulo de corrido', 'Un solo bloque, sin ejercicios en el medio', 50],
  [`día ${DIA.test}`, 'Cold recall y test completo', `${LADDER.cold.min} min sin mirar y 88 %: aprobado, 2 errores de técnica`, LADDER.cold.min + TEST_MIN],
  [`día ${DIA.tesis}`, 'Tesis y tarjetas', 'Empezás por los 2 errores; salen 6 tarjetas', LADDER.tesis.min],
  [`día ${DIA.e8}`, 'Estudio + ejercicios', 'Releés lo flojo y hacés 5 sin mirar', LADDER.e8.min],
  [`día ${DIA.e22}`, 'Ejercicios mixtos', `3, porque el día ${DIA.e8} salió perfecto`, shorter(LADDER.e22.min)],
  [`día ${DIA.e61}`, 'Examen corto', 'Si sale bien, el capítulo queda maduro', LADDER.e61.min],
];

const INFO = (
  <>
    <p className="t-cuerpo-l">Cada capítulo hace el mismo camino.</p>
    <p className="t-cuerpo">El día 1 lo estudiás de corrido, el día 2 hacés el test, el día 3 escribís la tesis y después lo repetís espaciado.</p>
    <p className="t-cuerpo">Una sola regla: no repasás lo que ya sabés.</p>
  </>
);

export function ComoV2() {
  return (
    <Marco className="es" titulo="Cómo funciona" info={INFO} volver={{ href: '#/estudio', nombre: 'Estudio' }}>
      <ol className="es-fases" aria-label="Los cuatro pasos de cada capítulo">
        {PASOS.map((p) => <li key={p.n} style={{ ['--area' as string]: p.area }}><span className="es-fase-n t-dato">{p.n}</span><b className="t-encabezado">{p.titulo}</b></li>)}
      </ol>

      <div className="es-pasos-como">
        {PASOS.map((p) => (
          <section key={p.n} className="capa-1 es-paso-como" style={{ ['--area' as string]: p.area }} aria-label={`${p.n}. ${p.titulo}`}>
            <div className="es-ilus-caja">{p.ilus}</div>
            <div className="es-paso-texto">
              <span className="t-rotulo">{p.n} · {p.dia}</span>
              <h2 className="t-seccion">{p.titulo}</h2>
              <p className="t-cuerpo">{p.linea}</p>
            </div>
            <div className="es-paso-reglas s-lista">
              <FilaHoja icono="info" titulo="Las reglas" valor={String(p.reglas.length)} tituloHoja={`${p.n} · ${p.titulo}`}>
                <dl className="capa-1 pt-ficha">{p.reglas.map(([t, d]) => <div key={t} className="pt-ficha-fila"><dt className="t-rotulo">{t}</dt><dd><p className="t-cuerpo">{d}</p></dd></div>)}</dl>
              </FilaHoja>
            </div>
          </section>
        ))}
      </div>

      <Grupo titulo="Ejemplos">
        <div className="capa-1 s-lista">
          <FilaHoja icono="calendario" titulo="Un día cualquiera" nota="Cada fase, un capítulo distinto" tituloHoja="Un día cualquiera">
            <ol className="capa-1 pt-revs">{DIA_TIPO.map(([f, t, s, m], i) => <li key={i}><span className="t-rotulo">{f || '·'} · {m} min</span><span className="t-encabezado">{t}</span><span className="t-nota">{s}</span></li>)}</ol>
          </FilaHoja>
          <FilaHoja icono="reloj" titulo="Un capítulo, dos meses" nota={`Unos ${repetir} min de repaso`} tituloHoja="Un capítulo, dos meses">
            <ol className="capa-1 pt-revs">{EJEMPLO.map(([d, t, s, m], i) => <li key={i}><span className="t-rotulo">{d} · {m} min</span><span className="t-encabezado">{t}</span><span className="t-nota">{s}</span></li>)}</ol>
            <p className="t-nota pt-pie">Después del test, repetís unos {repetir} minutos repartidos en dos meses. Si algún día sale menos de 70 %, se agrega una relectura corta y el próximo repaso llega antes.</p>
          </FilaHoja>
          <Fila icono="opciones" titulo="Ajustar el motor" nota="Tope, retención, nuevas por día" href="#/motor" />
        </div>
      </Grupo>
    </Marco>
  );
}
