/**
 * Ola 21 · Estudio → Idiomas y libros (#/estudio/idiomas): el roadmap maestro v3. "Estás acá", "Hoy sos →
 * Vas a ser" y la escalera de los 6 años; subpáginas por idioma, la biblioteca de libros y el ascenso a C1.
 */
import { useState } from 'react';
import {
  IDIOMAS, alertasIdiomas, aniosIdiomas, calendarioIdiomas, eventosIdiomas, faseIdiomaEn, horasDeLaRutina, idiomaPorId, nivelesIdiomas, nombreIdioma,
} from '../data/idiomas';
import { BIBLIOTECA, ESTADO_LIBRO, estadoBiblioteca, libroDeBiblioteca, libroPorId } from '../data/libros';
import { horasDeBloque } from '../data/metas-plan';
import { estadoEn } from '../data/plan-vistas';
import { T0_PLAN } from '../data/plan';
import { addDays } from '../data/time';
import type { DayLog } from '../data/types';
import { lunesDe } from '../state/plan';
import { guardarEnlaceIdioma, useStore } from '../state/store';
import { toast } from '../ui/avisos';
import '../styles/estudio.css';
import '../styles/roadmap-estudio.css';

const COLOR = 'var(--idi)';
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const f = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(2, 4)}`;
const mesAnio = (ym: string) => `${MES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const h = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

function useT0() {
  return useStore((s) => s.settings?.startDate) || T0_PLAN;
}

/** La card de Estudio. */
export function CardIdiomas({ day }: { day: DayLog }) {
  const t0 = useT0();
  const fase = faseIdiomaEn(day.date, t0);
  const n = nivelesIdiomas(day.date, t0);
  const anios = aniosIdiomas(t0);
  return (
    <a className="re-card" href="#/estudio/idiomas" style={{ ['--c' as string]: COLOR }}>
      <span className="re-card-cab"><b>Idiomas y libros</b><span className="mono sub">año {fase.anio} de {anios.length}</span></span>
      <span className="re-tira" aria-hidden="true">{anios.map((a) => <i key={a.n} className={estadoEn(a, day.date) === 'hecho' ? 'cerrada' : estadoEn(a, day.date) === 'actual' ? 'actual' : ''} />)}</span>
      <span className="re-card-ahora"><small className="etiqueta">Estás acá</small><span>{nombreIdioma(fase.idioma)} · {fase.nombre} · semana {fase.semana} de {fase.semanas}</span></span>
      <span className="re-card-perfil">
        <span className="sub">Hoy sos <b>{n.sos.join(' · ')}</b></span>
        {n.vasASer && <span className="sub">→ vas a ser <b className="resaltado">{n.vasASer}</b></span>}
      </span>
      <span className="mono sub re-card-pie">Un idioma por año durante 6 años, con 2 libros por año</span>
    </a>
  );
}

/** #/estudio/idiomas, #/estudio/idiomas/<idioma>, #/estudio/idiomas/biblioteca y #/estudio/idiomas/ascenso */
export function IdiomasPlan({ day, param }: { day: DayLog; param: string }) {
  const sub = param.split('/')[1];
  if (sub === 'biblioteca') return <BibliotecaPantalla day={day} />;
  if (sub === 'ascenso') return <Ascenso />;
  if (sub && idiomaPorId(sub)) return <AnioPantalla day={day} idioma={sub} />;
  return <Roadmap day={day} />;
}

function Roadmap({ day }: { day: DayLog }) {
  const t0 = useT0();
  const days = useStore((s) => s.days);
  const fase = faseIdiomaEn(day.date, t0);
  const n = nivelesIdiomas(day.date, t0);
  const anios = aniosIdiomas(t0);
  const al = alertasIdiomas(day.date, t0);
  const rutina = horasDeLaRutina();
  const l = lunesDe(day.date);
  const estaSemana = horasDeBloque(days, 'ingles', l, addDays(l, 6));
  return (
    <main className="pantalla re" style={{ ['--c' as string]: COLOR }}>
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a><span className="mono sub">6 años · 6 idiomas</span></div>
      <div className="kicker">Roadmap maestro v3 · 16 nov 2026</div>
      <header><h1 className="titulo">Idiomas y libros</h1><p>Un idioma por año (inglés, francés, italiano, alemán, japonés y chino), cada año con su examen y 2 libros nuevos. Después, cada idioma sube a C1 y se leen los libros que quedan.</p></header>

      <section className="re-aca" aria-labelledby="id-aca">
        <span className="etiqueta" id="id-aca">Estás acá</span>
        <div className="re-perfiles">
          <span><small className="sub">Hoy sos</small><b>{n.sos.join(' · ')}</b></span>
          {n.vasASer && <><span className="re-flecha" aria-hidden="true">→</span><span><small className="sub">Vas a ser</small><b className="resaltado">{n.vasASer}</b></span></>}
        </div>
        <a className="re-aca-fase" href={`#/estudio/idiomas/${fase.idioma}`}>
          <span className="mono">Año {fase.anio} · {f(fase.inicio)} a {f(fase.fin)} · semana {fase.semana} de {fase.semanas}</span>
          <b>{nombreIdioma(fase.idioma)} · {fase.nombre}</b>
          <span className="sub">{fase.recurso}. Hito: {fase.hito}.</span>
        </a>
        <p className="mono sub re-quedan">El roadmap pide {h(IDIOMAS.horasSemana)} h por semana · la búsqueda intensiva le da {h(rutina)} h · esta semana van {h(estaSemana)} h</p>
      </section>

      {al.length > 0 && (
        <div className="et-alertas id-alertas">
          {al.map((a) => <a key={a.id} className="et-alerta idioma" href={a.href}><b>{a.titulo}</b><span className="sub">{a.texto}</span></a>)}
        </div>
      )}

      <span className="etiqueta">Fase A · un idioma por año</span>
      <ol className="re-tl">
        {anios.map((a) => {
          const est = estadoEn(a, day.date);
          return (
            <li key={a.n} className={est === 'hecho' ? 'cerrada' : est}>
              <a href={`#/estudio/idiomas/${a.idioma}`} aria-current={est === 'actual' ? 'step' : undefined}>
                <span className="re-nodo" aria-hidden="true">{est === 'hecho' ? '✓' : ''}</span>
                <span className="re-tl-cuerpo">
                  <span className="mono re-tl-et">Año {a.n} · {f(a.inicio)} a {f(a.fin)} · {a.semanas} sem{est === 'actual' ? ' · estás acá' : ''}</span>
                  <b>{nombreIdioma(a.idioma)}</b>
                  <span className="re-tl-perfil"><span className={est === 'actual' ? 'resaltado' : ''}>{a.examen}</span> · nivel {a.nivelFinal}</span>
                </span>
                <span className="re-tl-ir" aria-hidden="true">→</span>
              </a>
            </li>
          );
        })}
      </ol>

      <nav className="prog-subs" aria-label="Más de idiomas">
        <a className="btn-borde" href="#/estudio/idiomas/biblioteca">Biblioteca de libros</a>
        <a className="btn-borde" href="#/estudio/idiomas/ascenso">Ascenso a C1 (Fase B)</a>
      </nav>

      <details className="libro-como">
        <summary>Reglas</summary>
        <ol>{IDIOMAS.reglas.map((r) => <li key={r}>{r}</li>)}</ol>
      </details>
      <details className="libro-como">
        <summary>Alertas y sin verificar</summary>
        <ul>{IDIOMAS.alertas.map((r) => <li key={r}>{r}</li>)}</ul>
        <p className="sub">Sin verificar: {IDIOMAS.sinVerificar.join(' · ')}.</p>
      </details>
    </main>
  );
}

function AnioPantalla({ day, idioma }: { day: DayLog; idioma: string }) {
  const t0 = useT0();
  const study = useStore((s) => s.study);
  const a = aniosIdiomas(t0).find((x) => x.idioma === idioma)!;
  const fases = calendarioIdiomas(t0).filter((x) => x.anio === a.n);
  const ev = eventosIdiomas(t0).filter((e) => e.anio === a.n);
  const i = idiomaPorId(idioma)!;
  const c1 = IDIOMAS.faseB.hitos.find((x) => x.id.startsWith(idioma));
  const est = estadoEn(a, day.date);
  const anios = aniosIdiomas(t0);
  return (
    <main className="pantalla re re-fase" style={{ ['--c' as string]: COLOR }}>
      <div className="topbar"><a className="volver" href="#/estudio/idiomas">Idiomas</a><span className="mono sub">año {a.n} · {a.semanas} sem</span></div>
      <div className="kicker">{est === 'actual' ? 'Estás acá' : est === 'hecho' ? 'Terminado' : 'Todavía no'} · {f(a.inicio)} a {f(a.fin)}</div>
      <header><h1 className="titulo">{i.nombre}</h1><p>Año {a.n}: examen {a.examen}. Al cerrarlo, nivel {a.nivelFinal}{a.nivelInicial ? ` (arrancás en ${a.nivelInicial})` : ''}.</p></header>
      {a.pctC1 != null && <p className="sub">Con {h(IDIOMAS.horasSemana)} h por semana, el año da unas {a.horasInicial} h: el {a.pctC1} % de las {i.horasC1?.toLocaleString('es-AR')} h que lleva llegar a C1. Para C1 en un año harían falta unas {a.horasSemanaC1} h por semana.</p>}

      <span className="etiqueta">Fases</span>
      <ol className="id-fases">
        {fases.map((x) => {
          const e = estadoEn(x, day.date);
          return (
            <li key={x.clave} className={e}>
              <span className="mono sub">{f(x.inicio)} a {f(x.fin)} · {x.semanas} sem{e === 'actual' ? ' · ahora' : ''}</span>
              <b>{x.nombre}</b>
              <span>{x.recurso}</span>
              <span className="sub">Hito: {x.hito}</span>
              {e === 'actual' && <span className="sub">Hoy en el bloque: {x.tareas.join(' · ')}</span>}
              {x.libro && libroPorId(x.libro) && <a className="subrayado" href={`#/estudio/libro/${x.libro}`}>Abrir el libro</a>}
              {x.libros && (
                <ul className="id-libros">
                  {x.libros.map((id) => {
                    const lb = libroDeBiblioteca(id);
                    const st = estadoBiblioteca(study, id);
                    return <li key={id}>{st.conCapitulos ? <a className="subrayado" href={`#/estudio/libro/${id}`}>{lb?.titulo ?? id}</a> : <span>{lb?.titulo ?? id}</span>} <span className="mono sub">· {st.conCapitulos ? ESTADO_LIBRO[st.estado].toLowerCase() : 'capítulos sin cargar'}</span></li>;
                  })}
                </ul>
              )}
              {x.udemy && <EnlaceCurso clave={x.udemy} />}
            </li>
          );
        })}
      </ol>

      <span className="etiqueta">Trimestres, tesis anual y examen</span>
      <ul className="id-eventos">
        {ev.map((e) => <li key={e.id} className={e.fecha < day.date ? 'pasado' : ''}><span className="mono sub">{e.desde && e.tipo === 'examen' ? `${f(e.desde)} a ${f(e.fecha)}` : f(e.fecha)}</span><span>{e.texto}</span></li>)}
      </ul>
      <p className="sub">Fecha, sede y costo de los exámenes: sin verificar.</p>
      {c1 && <p className="re-al-cerrar">En la Fase B: <b className="resaltado">{c1.texto}</b> hacia {mesAnio(c1.fecha)} ({c1.cert}).</p>}

      <nav className="re-nav" aria-label="Otros años">
        {anios[a.n - 2] ? <a href={`#/estudio/idiomas/${anios[a.n - 2].idioma}`}>← {nombreIdioma(anios[a.n - 2].idioma)}</a> : <span />}
        {anios[a.n] ? <a href={`#/estudio/idiomas/${anios[a.n].idioma}`}>{nombreIdioma(anios[a.n].idioma)} →</a> : <span />}
      </nav>
    </main>
  );
}

/** El enlace del curso de Udemy: se carga en la app y queda en el teléfono (no va al repo). */
function EnlaceCurso({ clave }: { clave: string }) {
  const url = useStore((s) => s.idiomas.enlaces[clave]);
  const [edita, setEdita] = useState(false);
  const [txt, setTxt] = useState(url ?? '');
  if (url && !edita) {
    return <span className="id-enlace"><a className="subrayado" href={url} target="_blank" rel="noreferrer">Abrir el curso de Udemy</a> <button className="subrayado" onClick={() => setEdita(true)}>Cambiar</button></span>;
  }
  return (
    <form className="id-enlace-form" onSubmit={(e) => { e.preventDefault(); if (guardarEnlaceIdioma(clave, txt)) { setEdita(false); toast({ title: txt.trim() ? 'Enlace guardado' : 'Enlace borrado', sub: 'Queda solo en este teléfono', color: COLOR }, false); } else toast({ title: 'Ese enlace no sirve', sub: 'Tiene que empezar con https://', color: 'var(--rutina)' }, false); }}>
      <input className="campo-texto" inputMode="url" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="https://… (enlace del curso)" aria-label="Enlace del curso de Udemy" />
      <button className="btn-borde" type="submit">Guardar</button>
      <small className="sub">Queda solo en este teléfono.</small>
    </form>
  );
}

function BibliotecaPantalla({ day }: { day: DayLog }) {
  const study = useStore((s) => s.study);
  const t0 = useT0();
  const todos = BIBLIOTECA.bloques.flatMap((b) => b.libros);
  const terminados = todos.filter((l) => estadoBiblioteca(study, l.id).estado === 'terminado').length;
  const mwm = libroPorId('mwm');
  const anios = aniosIdiomas(t0);
  const fila = (l: { id: string; titulo: string; aval?: string; faseA?: number }) => {
    const st = estadoBiblioteca(study, l.id);
    return (
      <li key={l.id} className={st.estado}>
        <span className="id-bib-t">{st.conCapitulos ? <a className="subrayado" href={`#/estudio/libro/${l.id}`}>{l.titulo}</a> : <b>{l.titulo}</b>}{l.aval && <small className="sub"> · {l.aval}</small>}</span>
        <span className="mono sub">{l.faseA ? `año ${l.faseA} · ` : ''}{st.conCapitulos ? ESTADO_LIBRO[st.estado].toLowerCase() : 'sin capítulos'}</span>
      </li>
    );
  };
  return (
    <main className="pantalla re" style={{ ['--c' as string]: COLOR }}>
      <div className="topbar"><a className="volver" href="#/estudio/idiomas">Idiomas</a><span className="mono sub">{terminados} de {todos.length} terminados</span></div>
      <div className="kicker">Biblioteca · 42 núcleo + {BIBLIOTECA.opcionales.length} opcionales</div>
      <header><h1 className="titulo">Libros</h1><p>{BIBLIOTECA.criterio} Un libro cuenta como terminado con su test final, su tesis y su artefacto.</p></header>
      {mwm && <a className="fila-link" href="#/estudio/libro/mwm">Libro inicial: {mwm.titulo} <span aria-hidden="true">→</span></a>}
      <p className="sub">Para cargar los capítulos de un libro, pegá en <a className="subrayado" href="#/importar">Importar</a> un JSON con <code>"tipo": "libro"</code> y el id que figura acá (por ejemplo <code>make-it-stick</code>).</p>

      <span className="etiqueta">Fase A · 2 libros por año</span>
      <ol className="id-bib">{anios.flatMap((a) => todos.filter((l) => l.faseA === a.n)).map(fila)}</ol>

      {BIBLIOTECA.bloques.map((b) => (
        <section key={b.n} aria-label={b.nombre}>
          <span className="etiqueta">Bloque {b.n} · {b.nombre}</span>
          <ol className="id-bib">{b.libros.map(fila)}</ol>
        </section>
      ))}
      <span className="etiqueta">Opcionales · fuera del núcleo</span>
      <ol className="id-bib">{BIBLIOTECA.opcionales.map(fila)}</ol>
      <p className="sub">Los 30 que no son de la Fase A se leen en la Fase B (desde el año 7), en el orden de los bloques. Hoy: {day.date < anios[anios.length - 1].fin ? 'Fase A' : 'Fase B'}.</p>
    </main>
  );
}

function Ascenso() {
  return (
    <main className="pantalla re" style={{ ['--c' as string]: COLOR }}>
      <div className="topbar"><a className="volver" href="#/estudio/idiomas">Idiomas</a><span className="mono sub">desde el año 7</span></div>
      <div className="kicker">Fase B</div>
      <header><h1 className="titulo">Ascenso a C1</h1><p>{IDIOMAS.faseB.texto}</p></header>
      <ol className="re-tl">
        {IDIOMAS.faseB.hitos.map((x) => (
          <li key={x.id} className="proximo">
            <div className="id-hito">
              <span className="re-nodo" aria-hidden="true" />
              <span className="re-tl-cuerpo">
                <span className="mono re-tl-et">{mesAnio(x.fecha)} (aprox.)</span>
                <b>{x.texto}</b>
                {x.cert && <span className="sub">{x.cert}</span>}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <p className="sub">Fechas aproximadas: salen de 11,5 h por semana y de las horas a C1 de cada idioma (± 30 %).</p>
    </main>
  );
}
