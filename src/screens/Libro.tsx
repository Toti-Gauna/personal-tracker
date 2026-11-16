import { useState } from 'react';
import { AREAS } from '../data/defaults';
import { ESTADO_LIBRO, TIPOS_ARTEFACTO, actIdDeLibro, capsTexto, claveMicro, estadoLibro, libroPorId, unidadesDe, type TipoArtefacto } from '../data/libros';
import { unitStatus } from '../data/study';
import { fmtFecha } from '../data/time';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { guardarArtefacto, marcarRecurso } from '../state/study';
import { Casilla } from '../ui/Casilla';
import { MicroTesis } from '../ui/MicroTesis';
import { toast } from '../ui/avisos';
import '../styles/estudio.css';

const dm = (d: string) => fmtFecha(d).split(' ').slice(1, 3).join(' ').toLowerCase();

/**
 * Ola 20 · un libro del sistema de libros (#/estudio/libro/<id>): dónde estás, las unidades de 2
 * capítulos con sus micro-tesis, la lectura de apoyo y el cierre (test final, tesis final y artefacto).
 */
export function LibroPantalla({ day, id }: { day: DayLog; id: string }) {
  const study = useStore((s) => s.study);
  const l = libroPorId(id);
  const actId = actIdDeLibro(id);
  const a = study.activities.find((x) => x.id === actId);
  const [abierta, setAbierta] = useState<number | null>(null);
  if (!l || !a) return <main className="pantalla"><a className="volver" href="#/estudio">Estudio</a><p>No encontré ese libro.</p></main>;
  const e = estadoLibro(study, l);
  const front = study.fronts.find((f) => f.id === a.front);
  const color = front ? AREAS[front.color].css : 'var(--handyx)';
  const us = unidadesDe(l);
  const actual = abierta ?? e.actual?.n ?? null;
  const fin = study.finales?.[actId];
  const tarjetas = study.cards.filter((c) => c.activityId === actId).length;

  return (
    <main className="pantalla libro" style={{ ['--c' as string]: color }}>
      <div className="topbar"><a className="volver" href="#/estudio">Estudio</a><span className="mono">{ESTADO_LIBRO[e.estado].toLowerCase()}</span></div>
      <div className="kicker">Libro{l.contexto ? ` · ${l.contexto}` : ''}</div>
      <h1 className="titulo">{l.titulo}</h1>
      {l.autor && <p className="sub">{l.autor} · {l.capitulos.length} capítulos en {us.length} unidades</p>}

      <section className="libro-aca" aria-label="Estás acá">
        <span className="etiqueta">Estás acá</span>
        <b>{e.actual ? `Unidad ${e.actual.n} de ${us.length} · ${capsTexto(e.actual.caps)}` : e.finalAprobado ? (e.tesisFinal ? ESTADO_LIBRO[e.estado] : 'Tesis final') : 'Test final'}</b>
        <span className="libro-barra" aria-hidden="true"><span style={{ width: `${(e.aprobadas / us.length) * 100}%` }} /></span>
        <div className="libro-nums">
          <span><b className="mono">{e.aprobadas}/{us.length}</b> unidades</span>
          <span><b className="mono">{e.micro}/{e.capitulos}</b> micro-tesis</span>
          <span><b className="mono">{tarjetas}</b> tarjetas</span>
        </div>
      </section>

      <details className="libro-como">
        <summary>Cómo se estudia un libro</summary>
        <ol>
          <li><b>Día 1 · leer la unidad</b> (2 capítulos) y escribir una <b>micro-tesis</b> por capítulo: la idea en una frase. Pueden quedar como tarjetas.</li>
          <li><b>Día 2 · cold recall y mini-test</b> de la unidad: {l.test?.preguntas ?? 8} preguntas, 85 % para pasar.</li>
          <li><b>Día 3 · la tesis de la unidad</b>; después, repasos a +8, +22 y +61.</li>
          <li><b>Al terminar:</b> test final, tesis final y el <b>artefacto</b> (framework, análisis, política o speech). Sin artefacto no cuenta como terminado.</li>
        </ol>
      </details>

      {(l.partes ?? [{ n: 0, titulo: '' }]).map((p) => {
        const dePrte = us.filter((u) => !p.n || l.capitulos.find((c) => c.n === u.caps[0])?.parte === p.n);
        if (!dePrte.length) return null;
        return (
          <section key={p.n} aria-label={p.titulo || 'Unidades'}>
            {p.titulo && <div className="fila-t"><span className="etiqueta">Parte {p.n} · {p.titulo}</span></div>}
            <ol className="libro-unid">
              {dePrte.map((u) => {
                const st = unitStatus(a, study, u.n, day.date);
                const abiertaEsta = actual === u.n;
                const micro = u.caps.filter((c) => study.microtesis?.[claveMicro(actId, c)]?.texto.trim()).length;
                return (
                  <li key={u.n} className={abiertaEsta ? 'abierta' : ''}>
                    <button className="libro-u-fila" aria-expanded={abiertaEsta} onClick={() => setAbierta(abiertaEsta ? -1 : u.n)}>
                      <span className="mono">{String(u.n).padStart(2, '0')}</span>
                      <span className="libro-u-t">
                        <b>{capsTexto(u.caps)[0].toUpperCase() + capsTexto(u.caps).slice(1)}</b>
                        <small>{u.caps.map((c) => l.capitulos.find((x) => x.n === c)?.titulo).join(' · ')}{u.recursos?.length ? ` · ${u.recursos.map((r) => l.recursos?.find((x) => x.id === r)?.titulo).join(' · ')}` : ''}</small>
                      </span>
                      <span className={`estado ${st.tone}`}>{st.label}</span>
                    </button>
                    {abiertaEsta && (
                      <div className="libro-u-det">
                        <MicroTesis key={`${u.n}-${micro}`} date={day.date} a={a} n={u.n} />
                        <a className="fila-link" href={`#/test/${actId}/${u.n}`}>Mini-test de la unidad <span aria-hidden="true">→</span></a>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      {!!l.recursos?.length && (
        <section aria-label="Lectura de apoyo">
          <div className="fila-t"><span className="etiqueta">Lectura de apoyo · sin test</span></div>
          <ul className="libro-rec">
            {l.recursos.map((r) => {
              const leido = study.recursosLeidos?.[`${actId}:${r.id}`];
              return (
                <li key={r.id}>
                  <Casilla id={`rec-${r.id}`} checked={!!leido} label={r.titulo} onChange={() => marcarRecurso(day.date, actId, r.id)} />
                  <label htmlFor={`rec-${r.id}`}><span className={`trazo${leido ? ' on' : ''}`}>{r.titulo}</span>{leido && <small className="mono sub"> · {dm(leido)}</small>}</label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="libro-cierre" aria-label="Cierre del libro">
        <div className="fila-t"><span className="etiqueta">Cierre del libro</span><span className="mono sub">{[e.finalAprobado, e.tesisFinal, e.artefacto].filter(Boolean).length} de 3</span></div>
        <ol>
          <li className={e.finalAprobado ? 'hecho' : ''}>
            <b>Test final</b>
            <small>{e.finalAprobado ? `Aprobado el ${dm(fin!.aprobadoOn!)}` : e.finalToca ? 'Toca: todas las unidades aprobadas' : `Se abre con las ${us.length} unidades aprobadas`}</small>
            {(e.finalToca || e.finalAprobado) && <a className="subrayado" href={`#/test/${actId}/final`}>{e.finalAprobado ? 'Ver' : 'Hacer el test final'}</a>}
          </li>
          <li className={e.tesisFinal ? 'hecho' : ''}>
            <b>Tesis final</b>
            <small>{e.tesisFinal ? 'Hecha' : e.finalAprobado ? 'Al día siguiente del test final' : 'Después del test final'}</small>
            {fin?.tesisItem && !e.tesisFinal && <a className="subrayado" href={`#/tesis/${fin.tesisItem}`}>Escribir la tesis final</a>}
          </li>
          <li className={e.artefacto ? 'hecho' : ''}>
            <b>Artefacto</b>
            <small>{fin?.artefacto ? `${TIPOS_ARTEFACTO.find((t) => t.id === fin.artefacto!.tipo)?.nombre} · ${fin.artefacto.titulo}` : l.artefacto?.cuando === 'despues' ? l.artefacto.nota ?? 'Se define al terminar el libro.' : l.artefacto?.desc ?? 'Framework, análisis, política o speech.'}</small>
          </li>
        </ol>
        {l.hito && <p className="sub">Hito del bloque: {l.hito}.</p>}
        <Artefacto date={day.date} actId={actId} />
      </section>
    </main>
  );
}

function Artefacto({ date, actId }: { date: string; actId: string }) {
  const art = useStore((s) => s.study.finales?.[actId]?.artefacto);
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoArtefacto>(art?.tipo ?? 'framework');
  const [titulo, setTitulo] = useState(art?.titulo ?? '');
  const [link, setLink] = useState(art?.link ?? '');
  if (!abierto) return <button className="btn-borde" onClick={() => setAbierto(true)}>{art ? 'Editar el artefacto' : 'Cargar el artefacto'}</button>;
  return (
    <form className="libro-art" onSubmit={(e) => { e.preventDefault(); if (!titulo.trim()) return; guardarArtefacto(date, actId, { tipo, titulo: titulo.trim(), ...(link.trim() ? { link: link.trim() } : {}) }); setAbierto(false); toast({ title: 'Artefacto guardado', sub: titulo.trim(), color: 'var(--salud)' }, false); }}>
      <div className="chips" role="radiogroup" aria-label="Tipo de artefacto">
        {TIPOS_ARTEFACTO.map((t) => <button type="button" key={t.id} role="radio" aria-checked={tipo === t.id} onClick={() => setTipo(t.id)}>{t.nombre}</button>)}
      </div>
      <input className="campo-texto" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Qué armaste (por ejemplo, mis OKR del trimestre)" aria-label="Título del artefacto" />
      <input className="campo-texto" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (opcional)" aria-label="Link del artefacto" inputMode="url" />
      <button className="btn-principal" type="submit" disabled={!titulo.trim()}>Guardar artefacto</button>
      {art && <button className="btn-borde" type="button" onClick={() => { guardarArtefacto(date, actId, null); setAbierto(false); }}>Sacar el artefacto</button>}
    </form>
  );
}

/** La card del libro en curso en Estudio (arriba, con los roadmaps). */
export function CardLibro() {
  const study = useStore((s) => s.study);
  const libros = study.activities.filter((a) => a.libro && !a.archivada).map((a) => libroPorId(a.libro!)).filter((x) => !!x);
  const l = libros.find((x) => estadoLibro(study, x).estado !== 'terminado') ?? libros[0];
  if (!l) return null;
  const e = estadoLibro(study, l);
  return (
    <a className="re-card otro" href={`#/estudio/libro/${l.id}`} style={{ ['--c' as string]: 'var(--handyx)' }}>
      <span className="re-card-cab"><b>Libros</b><span className="mono sub">{ESTADO_LIBRO[e.estado].toLowerCase()}</span></span>
      <span className="sub">{l.titulo}: {e.actual ? `unidad ${e.actual.n} de ${e.unidades} · ${capsTexto(e.actual.caps)}` : e.finalAprobado ? 'cierre del libro' : 'test final'}. {e.micro} de {e.capitulos} micro-tesis.</span>
      <span className="mono sub re-card-pie">ver el libro →</span>
    </a>
  );
}
