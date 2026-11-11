import { LADDER, REVIEW_CAP } from '../data/study-catalog';
import { fmtDur } from '../data/time';
import '../styles/estudio.css';

const total = LADDER.cold.min + LADDER.tesis.min + LADDER.e7.min + LADDER.e21.min + LADDER.e60.min;

/** 2.3 Cómo funciona: los pasos con sus reglas y un ejemplo real. */
export function ComoFunciona() {
  return (
    <main className="pantalla como">
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a></div>
      <header>
        <h1 className="titulo">Cómo funciona</h1>
        <p>Cada sesión va de corrido: repasar, aprender, comprobar y cerrar. Y una sola regla: no repasás lo que ya sabés.</p>
      </header>

      <section className="paso-caja">
        <h2><span className="n">1</span>Repasar<small>máx. {REVIEW_CAP} min</small></h2>
        <p>Primero, lo que vence hoy. El motor arma la lista y nunca se pasa de tu tope.</p>
        <dl className="reglas">
          <div><dt>Cold recall</dt><dd>El día después de estudiar algo nuevo: escribís sin mirar, 2 a 5 min por tema.</dd></div>
          <div><dt>Tesis</dt><dd>Llega a los 3 días de aprobar el capítulo y va después del cold recall. Dice de qué capítulo es, así no se mezcla con el que estás estudiando.</dd></div>
          <div><dt>Ejercicios</dt><dd>Solo el día +7, +21 o +60 de cada capítulo: 3 a 5 ejercicios mixtos.</dd></div>
          <div><dt>Se saltea si</dt><dd>no vence nada, o si lo que vence no entra en el tope: queda en «Hoy no toca» y vuelve mañana. Hay días sin repaso.</dd></div>
        </dl>
      </section>

      <section className="paso-caja">
        <h2><span className="n">2</span>Aprender<small>lo que pida el día</small></h2>
        <p>Lo nuevo de cada frente: un capítulo de CONAMAT, el curso de programación, el libro que estés leyendo. Con pomodoros.</p>
        <dl className="reglas">
          <div><dt>Matemática</dt><dd>El capítulo de CONAMAT, con el tiempo que queda del bloque después de repasar y del test.</dd></div>
          <div><dt>Otros frentes</dt><dd>Avanzás a tu ritmo: páginas, secciones o minutos.</dd></div>
        </dl>
      </section>

      <section className="paso-caja">
        <h2><span className="n">3</span>Comprobar<small>20 a 25 min</small></h2>
        <p>El test completo del capítulo que acabás de estudiar, en la app o en papel. Cargás el puntaje y el tipo de cada error.</p>
        <dl className="reglas">
          <div><dt>Aprobado</dt><dd>Con 85 % pasás al siguiente capítulo. Si fallaste solo por descuido, también.</dd></div>
          <div><dt>No aprobado</dt><dd>Repasás lo que fallaste y hacés un re-test con preguntas nuevas en 2 días.</dd></div>
        </dl>
      </section>

      <section className="paso-caja">
        <h2><span className="n">4</span>Cerrar</h2>
        <p>La sesión termina con el resultado guardado. La tesis no va hoy: el motor la agenda sola para dentro de 3 días.</p>
        <dl className="reglas">
          <div><dt>¿Por qué +3?</dt><dd>Escribirla el mismo día es copiar lo que tenés fresco. A los 3 días ya empezaste a olvidar, y reconstruirlo con tus palabras es lo que más lo fija: la tesis funciona como tu primer repaso.</dd></div>
        </dl>
      </section>

      <div className="etiqueta" style={{ margin: '22px 0 6px' }}>Ejemplo: el capítulo 2</div>
      <ol className="escalera">
        <li><span className="dia">día 0</span><span>Estudiás el capítulo y hacés el test<small>88 %: aprobado</small></span><span className="mono sub">2 h</span></li>
        <li><span className="dia">+1</span><span>Cold recall<small>90 %: no hace falta releer</small></span><span className="mono sub">{LADDER.cold.min} min</span></li>
        <li><span className="dia">+3</span><span>Tesis y tarjetas<small>La explicás con tus palabras y salen tarjetas</small></span><span className="mono sub">{LADDER.tesis.min} min</span></li>
        <li><span className="dia">+7</span><span>Ejercicios mixtos<small>5 sin mirar</small></span><span className="mono sub">{LADDER.e7.min} min</span></li>
        <li><span className="dia">+21</span><span>Ejercicios mixtos<small>3, porque el +7 salió perfecto</small></span><span className="mono sub">{LADDER.e21.min} min</span></li>
        <li><span className="dia">+60</span><span>Examen corto<small>Si sale bien, el capítulo queda maduro</small></span><span className="mono sub">{LADDER.e60.min} min</span></li>
      </ol>
      <p className="sub">En todo el capítulo repasás unos {fmtDur(total)} repartidos en dos meses. Si algún día sale menos de 70 %, se agrega una relectura corta y el próximo repaso llega antes.</p>
      <p className="nota">Las reglas del motor (tope, retención y nuevas por día) se ajustan en la ola 3.</p>
    </main>
  );
}
