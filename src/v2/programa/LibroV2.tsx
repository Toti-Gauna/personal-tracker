/**
 * Trazo 2.0 · un libro del sistema de libros (#/estudio/libro/<id>): dónde estás, las unidades de 2 capítulos como un mapa de calor
 * (cada una abre su hoja con las micro-tesis y el mini-test), la lectura de apoyo, las metas del libro y el cierre (test final, tesis
 * final y artefacto). Mismos datos y mismas funciones que la 1.0.
 */
import { useState } from 'react';
import { AREAS } from '../../data/defaults';
import { ESTADO_LIBRO, TIPOS_ARTEFACTO, actIdDeLibro, capsTexto, claveMicro, estadoLibro, libroPorId, unidadesDe, type TipoArtefacto, type UnidadLibro } from '../../data/libros';
import { unitStatus } from '../../data/study';
import type { Activity } from '../../data/study-types';
import { empezarLibro } from '../../state/metas-bloque';
import { guardarArtefacto, guardarMicrotesis, marcarRecurso } from '../../state/study';
import { useStore } from '../../state/store';
import { colorV2 } from '../hoy/datos';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Interruptor, Segmentado } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Barra, Dato, Estado, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { MetasDelBloque } from '../proyecto/MetasBloque';
import { tituloCorto } from '../proyecto/datos';
import { FilaHoja, Lista, hechasDe } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { fp, mayuscula } from './comun';

const VOLVER = { href: '#/estudio', nombre: 'Estudio' };

/** #/estudio/libro/<id> */
export default function LibroV2({ ruta, day }: PropsV2) {
  const id = (ruta.param ?? '').slice('libro/'.length);
  return <Libro key={id} day={day} id={id} />;
}

type Grupo5 = 'pendiente' | 'estudiando' | 'prueba' | 'cerrado' | 'flojo';

function Libro({ day, id }: { day: PropsV2['day']; id: string }) {
  const study = useStore((s) => s.study);
  const l = libroPorId(id);
  const actId = actIdDeLibro(id);
  const a = study.activities.find((x) => x.id === actId);
  const [sel, setSel] = useState<number | null>(null);
  if (!l || !a) {
    return (
      <Marco titulo="Libro" volver={VOLVER}>
        <Vacio ilustracion="buscar" titulo="No encontré ese libro" texto="Puede que no esté cargado todavía." accion={<Boton variante="primario" href="#/estudio/idiomas/biblioteca">Ver la biblioteca</Boton>} />
      </Marco>
    );
  }
  const e = estadoLibro(study, l);
  const front = study.fronts.find((f) => f.id === a.front);
  const area = front ? colorV2(AREAS[front.color].css) : 'var(--a-handyx)';
  const us = unidadesDe(l);
  const fin = study.finales?.[actId];
  const tarjetas = study.cards.filter((c) => c.activityId === actId).length;
  const hoy = day.date;
  const grupoDe = (u: UnidadLibro): Grupo5 => {
    const s = study.units[actId]?.[u.n];
    if (s?.flojo) return 'flojo';
    if (s?.approvedOn) return 'cerrado';
    if (s?.learnedOn || s?.tests?.length) return 'prueba';
    return e.actual?.n === u.n ? 'estudiando' : 'pendiente';
  };
  const estaEn = e.actual ? `Unidad ${e.actual.n} de ${us.length} · ${capsTexto(e.actual.caps)}` : e.finalAprobado ? (e.tesisFinal ? ESTADO_LIBRO[e.estado] : 'Tesis final') : 'Test final';
  const partes = (l.partes ?? [{ n: 0, titulo: '' }]).map((p) => ({ p, xs: us.filter((u) => !p.n || l.capitulos.find((c) => c.n === u.caps[0])?.parte === p.n) })).filter((g) => g.xs.length);
  const unidad = us.find((u) => u.n === sel) ?? null;
  const cierres = [e.finalAprobado, e.tesisFinal, e.artefacto].filter(Boolean).length;
  const info = (
    <>
      <p className="t-cuerpo-l">{l.titulo}{l.autor ? `, de ${l.autor}` : ''}. {l.capitulos.length} capítulos en {us.length} unidades.</p>
      {l.contexto && <p className="t-nota">En el plan: {l.contexto}.</p>}
      <ol className="pg-detalle-lista t-cuerpo">
        <li><b>Día 1 · leer la unidad</b> (2 capítulos) y escribir una micro-tesis por capítulo: la idea en una frase. Pueden quedar como tarjetas.</li>
        <li><b>Día 2 · cold recall y mini-test</b> de la unidad: {l.test?.preguntas ?? 8} preguntas, 85 % para pasar.</li>
        <li><b>Día 3 · la tesis de la unidad</b>; después, repasos a +8, +22 y +61.</li>
        <li><b>Al terminar:</b> test final, tesis final y el artefacto (framework, análisis, política o speech). Sin artefacto no cuenta como terminado.</li>
      </ol>
      <p className="t-nota">Las metas del libro son leer, micro-tesis, mini-tests y el cierre; las tuyas se suman aparte.</p>
    </>
  );
  return (
    <Marco className="pg" titulo={tituloCorto(l.titulo)} info={info} volver={VOLVER} rotulo={e.estado === 'terminado' ? undefined : ESTADO_LIBRO[e.estado]}>
      {a.archivada && (
        <Tarjeta className="pg-hero">
          <p className="t-cuerpo">Está cargado, pero todavía no entra en tu día.</p>
          <Boton variante="primario" icono="play" onClick={() => { empezarLibro(id); aviso({ titulo: 'Libro empezado', sub: 'Desde hoy entra en tu día', tono: 'hecho', deshacer: () => empezarLibro(id, false) }); }}>Empezar este libro</Boton>
        </Tarjeta>
      )}

      <Tarjeta heroe className="pg-hero" area={area}>
        <div>
          <span className="t-rotulo">Estás acá</span>
          <p className="t-encabezado">{estaEn}</p>
        </div>
        <Barra valor={e.aprobadas} max={us.length} nombre="Unidades aprobadas" area={area} />
        <div className="pg-datos pg-datos-hero">
          <Dato valor={`${e.aprobadas}/${us.length}`} etiqueta="Unidades" />
          <Dato valor={`${e.micro}/${e.capitulos}`} etiqueta="Micro-tesis" />
          <Dato valor={tarjetas} etiqueta="Tarjetas" />
        </div>
        {!a.archivada && e.actual && <Boton variante="primario" icono="editar" onClick={() => setSel(e.actual!.n)}>Escribir micro-tesis</Boton>}
        {!a.archivada && !e.actual && e.finalToca && <Boton variante="primario" icono="certificado" href={`#/test/${actId}/final`}>Hacer el test final</Boton>}
        {e.estado === 'terminado' && <Estado estado="hecho" texto="Terminado" />}
      </Tarjeta>

      <Grupo titulo="Unidades" extremo={<span className="t-rotulo">{us.length}</span>}>
        <div className="capa-1 es-calor" style={{ ['--area' as string]: area }}>
          {partes.map(({ p, xs }) => (
            <div key={p.n} className="pg-parte">
              {p.titulo && <p className="t-rotulo pg-parte-titulo">Parte {p.n} · {p.titulo}</p>}
              <ol className="es-celdas" aria-label={p.titulo ? `Unidades de la parte ${p.n}` : 'Unidades del libro'}>
                {xs.map((u) => {
                  const st = unitStatus(a, study, u.n, hoy);
                  return (
                    <li key={u.n}>
                      <button type="button" className={`es-celda st-${grupoDe(u)}`} onClick={() => setSel(u.n)} aria-label={`Unidad ${u.n}, ${capsTexto(u.caps)}, ${st.label === '—' ? 'sin empezar' : st.label}`}>
                        <span className="t-dato">{u.n}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          <ul className="es-leyenda" aria-hidden="true">
            {([['cerrado', 'Aprobada'], ['estudiando', 'Ahora'], ['prueba', 'En prueba'], ['flojo', 'Floja'], ['pendiente', 'Pendiente']] as const).map(([k, t]) => <li key={k}><i className={`es-celda es-punto st-${k}`} />{t}</li>)}
          </ul>
        </div>
      </Grupo>

      {!!l.recursos?.length && <Apoyo a={a} l={l} hoy={hoy} />}

      <MetasDelBloque bloque={`libro:${id}`} hoy={hoy} titulo="Metas del libro" />

      <Grupo titulo="Cierre del libro" extremo={<span className="t-rotulo">{cierres}/3</span>}>
        <div className="capa-1 s-lista">
          <Fila icono="certificado" titulo="Test final" valor={e.finalAprobado ? 'Hecho' : undefined}
            nota={e.finalAprobado ? `Aprobado el ${fp(fin!.aprobadoOn!)}` : e.finalToca ? 'Toca: todas las unidades aprobadas' : `Se abre con las ${us.length} unidades aprobadas`}
            href={e.finalToca || e.finalAprobado ? `#/test/${actId}/final` : undefined} />
          <Fila icono="documento" titulo="Tesis final" valor={e.tesisFinal ? 'Hecha' : undefined}
            nota={e.tesisFinal ? 'Hecha' : e.finalAprobado ? 'Al día siguiente del test final' : 'Después del test final'}
            href={fin?.tesisItem && !e.tesisFinal ? `#/tesis/${fin.tesisItem}` : undefined} />
          <Artefacto hoy={hoy} actId={actId} l={l} />
        </div>
        {l.hito && <p className="t-nota pg-cierre-nota">Hito del bloque: {l.hito}.</p>}
      </Grupo>

      <HojaUnidad a={a} l={l} u={unidad} hoy={hoy} onCerrar={() => setSel(null)} />
    </Marco>
  );
}

// ——— La unidad ———

function HojaUnidad({ a, l, u, hoy, onCerrar }: { a: Activity; l: NonNullable<ReturnType<typeof libroPorId>>; u: UnidadLibro | null; hoy: string; onCerrar: () => void }) {
  const [ultima, setUltima] = useState<UnidadLibro | null>(null);
  const study = useStore((s) => s.study);
  if (u && u !== ultima) setUltima(u);
  const x = u ?? ultima;
  if (!x) return null;
  const st = unitStatus(a, study, x.n, hoy);
  const guardadas = x.caps.filter((c) => study.microtesis?.[claveMicro(a.id, c)]?.texto.trim()).length;
  const recursos = (x.recursos ?? []).map((r) => l.recursos?.find((y) => y.id === r)?.titulo).filter(Boolean);
  return (
    <Hoja abierta={!!u} onCerrar={onCerrar} titulo={`Unidad ${x.n}`} pie={<Boton variante="secundario" icono="siguiente" href={`#/test/${a.id}/${x.n}`}>Mini-test de la unidad</Boton>}>
      <div className="pg-detalle">
        <p className="t-cuerpo-l">{mayuscula(capsTexto(x.caps))}</p>
        <p className="t-dato">{st.label === '—' ? 'Sin empezar' : mayuscula(st.label)}</p>
        {recursos.length > 0 && <p className="t-nota">Con la lectura de apoyo: {recursos.join(' · ')}.</p>}
        <MicroTesis key={`${x.n}-${guardadas}`} hoy={hoy} a={a} l={l} u={x} />
      </div>
    </Hoja>
  );
}

/** Las micro-tesis de una unidad: una frase por capítulo, en tus palabras. Quedan como puntos de la unidad y, si querés, como tarjetas. */
function MicroTesis({ hoy, a, l, u }: { hoy: string; a: Activity; l: NonNullable<ReturnType<typeof libroPorId>>; u: UnidadLibro }) {
  const micro = useStore((s) => s.study.microtesis) ?? {};
  const [textos, setTextos] = useState<Record<number, string>>(() => Object.fromEntries(u.caps.map((c) => [c, micro[claveMicro(a.id, c)]?.texto ?? ''])));
  const [tarjeta, setTarjeta] = useState(true);
  const guardadas = u.caps.filter((c) => micro[claveMicro(a.id, c)]?.texto.trim()).length;
  const cambio = u.caps.some((c) => (textos[c] ?? '').trim() !== (micro[claveMicro(a.id, c)]?.texto ?? ''));
  const guardar = () => {
    for (const c of u.caps) if ((textos[c] ?? '').trim() !== (micro[claveMicro(a.id, c)]?.texto ?? '')) guardarMicrotesis(hoy, a.id, c, textos[c] ?? '', tarjeta);
    aviso({ titulo: 'Micro-tesis guardadas', sub: tarjeta ? 'Las nuevas también quedan como tarjetas' : 'Quedan para el cold recall de mañana', tono: 'hecho' });
  };
  return (
    <section className="pg-micro" aria-label={`Micro-tesis de la unidad ${u.n}`}>
      <div className="pg-hero-fila"><span className="t-rotulo">Micro-tesis · una por capítulo</span><span className="t-dato">{`${guardadas}/${u.caps.length}`}</span></div>
      {u.caps.map((c) => {
        const cap = l.capitulos.find((x) => x.n === c)!;
        return <CampoTexto key={c} multilinea etiqueta={`Cap. ${c} · ${cap.titulo}`} nota={cap.sub} placeholder="La idea del capítulo en una frase, con tus palabras" valor={textos[c] ?? ''} onCambio={(v) => setTextos((x) => ({ ...x, [c]: v }))} />;
      })}
      <div className="capa-1 pt-check"><Interruptor prendido={tarjeta} etiqueta="Hacer una tarjeta con cada micro-tesis nueva" onCambio={setTarjeta} /></div>
      <Boton variante="primario" deshabilitado={cambio ? false : guardadas === u.caps.length ? 'Ya están guardadas' : 'Escribí una frase para guardar'} onClick={guardar}>Guardar micro-tesis</Boton>
    </section>
  );
}

// ——— La lectura de apoyo ———

function Apoyo({ a, l, hoy }: { a: Activity; l: NonNullable<ReturnType<typeof libroPorId>>; hoy: string }) {
  const leidos = useStore((s) => s.study.recursosLeidos) ?? {};
  const recursos = l.recursos ?? [];
  const n = recursos.filter((r) => leidos[`${a.id}:${r.id}`]).length;
  return (
    <div className="capa-1 s-lista">
      <FilaHoja icono="documento" titulo="Lectura de apoyo" valor={hechasDe(n, recursos.length)} hecho={n === recursos.length}>
        <Lista items={recursos.map((r) => ({ clave: r.id, etiqueta: r.titulo, nota: leidos[`${a.id}:${r.id}`] ? `Leído el ${fp(leidos[`${a.id}:${r.id}`])}` : undefined, marcada: !!leidos[`${a.id}:${r.id}`] }))} onCambio={(k) => marcarRecurso(hoy, a.id, k)} />
        <p className="t-nota pg-pie">Sin test: se tilda al leerla.</p>
      </FilaHoja>
    </div>
  );
}

// ——— El artefacto ———

function Artefacto({ hoy, actId, l }: { hoy: string; actId: string; l: NonNullable<ReturnType<typeof libroPorId>> }) {
  const art = useStore((s) => s.study.finales?.[actId]?.artefacto);
  const [abierto, setAbierto] = useState(false);
  const nota = art ? `${TIPOS_ARTEFACTO.find((t) => t.id === art.tipo)?.nombre} · ${art.titulo}` : l.artefacto?.cuando === 'despues' ? l.artefacto.nota ?? 'Se define al terminar el libro.' : l.artefacto?.desc ?? 'Framework, análisis, política o speech.';
  return (
    <>
      <Fila icono="medalla" titulo="Artefacto" nota={nota} valor={art ? 'Hecho' : undefined} onClick={() => setAbierto(true)} />
      <Hoja abierta={abierto} onCerrar={() => setAbierto(false)} titulo="Artefacto del libro">
        <FormArtefacto hoy={hoy} actId={actId} art={art} onListo={() => setAbierto(false)} />
      </Hoja>
    </>
  );
}

type Art = { tipo: TipoArtefacto; titulo: string; link?: string; fecha: string };

function FormArtefacto({ hoy, actId, art, onListo }: { hoy: string; actId: string; art?: Art; onListo: () => void }) {
  const [tipo, setTipo] = useState<TipoArtefacto>(art?.tipo ?? 'framework');
  const [titulo, setTitulo] = useState(art?.titulo ?? '');
  const [link, setLink] = useState(art?.link ?? '');
  const guardar = () => {
    if (!titulo.trim()) return;
    guardarArtefacto(hoy, actId, { tipo, titulo: titulo.trim(), ...(link.trim() ? { link: link.trim() } : {}) });
    aviso({ titulo: 'Artefacto guardado', sub: titulo.trim(), tono: 'hecho' });
    onListo();
  };
  const sacar = () => {
    if (!art) return;
    guardarArtefacto(hoy, actId, null);
    onListo();
    aviso({ titulo: 'Artefacto sacado', sub: art.titulo, tono: 'info', deshacer: () => guardarArtefacto(art.fecha, actId, { tipo: art.tipo, titulo: art.titulo, ...(art.link ? { link: art.link } : {}) }) });
  };
  return (
    <div className="pg-aparte">
      <Segmentado etiqueta="Tipo de artefacto" opciones={TIPOS_ARTEFACTO.map((t) => [t.id, t.nombre] as [TipoArtefacto, string])} valor={tipo} onCambio={setTipo} />
      <CampoTexto etiqueta="Qué armaste" valor={titulo} onCambio={setTitulo} placeholder="Por ejemplo, mis OKR del trimestre" />
      <CampoTexto etiqueta="Link (opcional)" valor={link} onCambio={setLink} modo="url" />
      <div className="pg-acciones">
        <Boton variante="primario" deshabilitado={titulo.trim() ? false : 'Escribí qué armaste'} onClick={guardar}>Guardar artefacto</Boton>
        {art && <Boton variante="fantasma" icono="borrar" onClick={sacar}>Sacar el artefacto</Boton>}
      </div>
    </div>
  );
}
