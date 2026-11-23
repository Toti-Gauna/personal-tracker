/**
 * Trazo 2.0 · Idiomas y libros (#/estudio/idiomas): el roadmap maestro v3. Arriba, dónde estás y quién vas a ser; después los seis
 * años como una línea de estaciones (cada año abre su página, con sus fases en hojas), la biblioteca de libros y el ascenso a C1
 * (Fase B). Mismos datos y mismas funciones que la 1.0 (`data/idiomas`, `data/libros`, el enlace del curso en el teléfono).
 */
import { useState } from 'react';
import {
  IDIOMAS, alertasIdiomas, aniosIdiomas, calendarioIdiomas, eventosIdiomas, faseIdiomaEn, horasDeLaRutina, idiomaPorId, nivelesIdiomas, nombreIdioma, type FaseFechada,
} from '../../data/idiomas';
import { BIBLIOTECA, ESTADO_LIBRO, estadoBiblioteca, libroDeBiblioteca, libroPorId } from '../../data/libros';
import { horasDeBloque } from '../../data/metas-plan';
import { estadoEn } from '../../data/plan-vistas';
import { addDays } from '../../data/time';
import type { DayLog } from '../../data/types';
import { lunesDe } from '../../state/plan';
import { guardarEnlaceIdioma, useStore } from '../../state/store';
import { Icono } from '../iconos';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Dato, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { MetroVertical } from '../estudio/Metro';
import type { Estacion } from '../estudio/lineas';
import type { PropsV2 } from '../registro';
import { FilaHoja } from '../proyecto/piezas';
import { Aca, Paradas, Perfil, fch, fp, mesAnio, num, plural, rango, useT0, type Parada } from './comun';

const AREA = 'var(--a-idi)';
const VOLVER_ESTUDIO = { href: '#/estudio', nombre: 'Estudio' };
const VOLVER_IDIOMAS = { href: '#/estudio/idiomas', nombre: 'Idiomas' };
const deEstado = (e: string): Estacion['estado'] => (e === 'hecho' ? 'hecha' : e === 'actual' ? 'actual' : 'proxima');

/** #/estudio/idiomas, #/estudio/idiomas/<idioma>, #/estudio/idiomas/biblioteca y #/estudio/idiomas/ascenso */
export default function IdiomasV2({ ruta, day }: PropsV2) {
  const sub = (ruta.param ?? 'idiomas').split('/')[1];
  if (sub === 'biblioteca') return <Biblioteca day={day} />;
  if (sub === 'ascenso') return <Ascenso />;
  if (sub && idiomaPorId(sub)) return <Anio key={sub} day={day} idioma={sub} />;
  return <Roadmap day={day} />;
}

const INFO_ROADMAP = (
  <>
    <p className="t-cuerpo-l">Un idioma por año (inglés, francés, italiano, alemán, japonés y chino), cada año con su examen y 2 libros nuevos.</p>
    <p className="t-cuerpo">Después, cada idioma sube a C1 y se leen los libros que quedan.</p>
    <p className="t-nota">Roadmap maestro v3 · 16 nov 2026.</p>
  </>
);

function Roadmap({ day }: { day: DayLog }) {
  const t0 = useT0();
  const days = useStore((s) => s.days);
  const study = useStore((s) => s.study);
  const fase = faseIdiomaEn(day.date, t0);
  const n = nivelesIdiomas(day.date, t0);
  const anios = aniosIdiomas(t0);
  const al = alertasIdiomas(day.date, t0);
  const rutina = horasDeLaRutina();
  const l = lunesDe(day.date);
  const estaSemana = horasDeBloque(days, 'ingles', l, addDays(l, 6));
  const todos = BIBLIOTECA.bloques.flatMap((b) => b.libros);
  const terminados = todos.filter((x) => estadoBiblioteca(study, x.id).estado === 'terminado').length;
  const estados = anios.map((a) => deEstado(estadoEn(a, day.date)));
  // Sin ningún año en curso, "estás acá" es el que sigue: ahí vas a arrancar.
  if (!estados.includes('actual')) { const i = estados.indexOf('proxima'); if (i >= 0) estados[i] = 'actual'; }
  const estaciones: Estacion[] = anios.map((a, i) => ({ id: a.idioma, nombre: nombreIdioma(a.idioma), estado: estados[i] }));
  return (
    <Marco className="pg" titulo="Idiomas y libros" info={INFO_ROADMAP} volver={VOLVER_ESTUDIO}>
      <Tarjeta heroe className="pg-hero" area={AREA}>
        <Perfil sos={n.sos.join(' · ')} vasASer={n.vasASer} />
        <Aca href={`#/estudio/idiomas/${fase.idioma}`} titulo={`${nombreIdioma(fase.idioma)} · ${fase.nombre}`} dato={`Año ${fase.anio} · semana ${fase.semana} de ${fase.semanas}`} />
      </Tarjeta>

      {al.length > 0 && (
        <Grupo titulo="Para tener en cuenta">
          <div className="capa-1 s-lista">
            {al.map((a) => <Fila key={a.id} icono="alerta" titulo={a.titulo} nota={a.texto} href={a.href} />)}
          </div>
        </Grupo>
      )}

      <Grupo titulo="Un idioma por año">
        <div className="capa-1 pg-caja">
          <MetroVertical area={AREA} estaciones={estaciones}
            nota={(e) => anios.find((x) => x.idioma === e.id)!.examen}
            href={(e) => `#/estudio/idiomas/${e.id}`} />
        </div>
      </Grupo>

      <Grupo titulo="Horas por semana">
        <div className="pg-datos">
          <Dato valor={num(IDIOMAS.horasSemana)} unidad="h" etiqueta="Del roadmap" />
          <Dato valor={num(rutina)} unidad="h" etiqueta="De búsqueda" />
          <Dato valor={num(estaSemana)} unidad="h" etiqueta="Esta semana" />
        </div>
      </Grupo>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <Fila icono="documento" titulo="Biblioteca de libros" valor={`${terminados} de ${todos.length}`} href="#/estudio/idiomas/biblioteca" />
          <Fila icono="cohete" titulo="Ascenso a C1 (Fase B)" valor="desde el año 7" href="#/estudio/idiomas/ascenso" />
          <FilaHoja icono="meta" titulo="Reglas" valor={String(IDIOMAS.reglas.length)}>
            <ol className="pg-detalle-lista">{IDIOMAS.reglas.map((r) => <li key={r} className="t-cuerpo">{r}</li>)}</ol>
          </FilaHoja>
          <FilaHoja icono="alerta" titulo="Alertas y sin verificar" tituloHoja="Alertas y sin verificar">
            <ul className="pg-detalle-lista">{IDIOMAS.alertas.map((r) => <li key={r} className="t-cuerpo">{r}</li>)}</ul>
            <p className="t-nota pg-pie">Sin verificar: {IDIOMAS.sinVerificar.join(' · ')}.</p>
          </FilaHoja>
        </div>
      </Grupo>
    </Marco>
  );
}

// ——— Un año ———

const INFO_ANIO = (
  <>
    <p className="t-cuerpo-l">Cada año tiene sus fases: un curso, los libros y el examen.</p>
    <p className="t-cuerpo">Tocá una fase para ver el recurso, el hito y lo que va en el bloque de hoy.</p>
    <p className="t-nota">Fecha, sede y costo de los exámenes: sin verificar.</p>
  </>
);

function Anio({ day, idioma }: { day: DayLog; idioma: string }) {
  const t0 = useT0();
  const a = aniosIdiomas(t0).find((x) => x.idioma === idioma)!;
  const fases = calendarioIdiomas(t0).filter((x) => x.anio === a.n);
  const ev = eventosIdiomas(t0).filter((e) => e.anio === a.n);
  const i = idiomaPorId(idioma)!;
  const c1 = IDIOMAS.faseB.hitos.find((x) => x.id.startsWith(idioma));
  const est = estadoEn(a, day.date);
  const anios = aniosIdiomas(t0);
  const [sel, setSel] = useState<string | null>(null);
  const paradas: Parada[] = fases.map((x) => ({ id: x.clave, nombre: x.nombre, nota: `${fch(x.inicio)} – ${fch(x.fin)}`, estado: deEstado(estadoEn(x, day.date)) }));
  const elegida = fases.find((x) => x.clave === sel) ?? null;
  const ant = anios[a.n - 2];
  const sig = anios[a.n];
  return (
    <Marco className="pg" titulo={i.nombre} info={INFO_ANIO} volver={VOLVER_IDIOMAS} rotulo={`Año ${a.n} · ${est === 'actual' ? 'estás acá' : est === 'hecho' ? 'terminado' : 'todavía no'} · ${a.semanas} sem`}>
      <Tarjeta heroe className="pg-hero" area={AREA}>
        <Perfil sos={a.nivelInicial} vasASer={a.nivelFinal} rotulos={['Arrancás en', 'Cerrás en']} />
        <div className="pg-aparte"><span className="t-rotulo">Examen</span><b className="t-encabezado">{a.examen}</b></div>
      </Tarjeta>

      {a.pctC1 != null && (
        <div className="capa-1 s-lista">
          <FilaHoja icono="grafico" titulo="Camino a C1" valor={`${a.pctC1} %`}>
            <p className="t-cuerpo">Con {num(IDIOMAS.horasSemana)} h por semana, el año da unas {a.horasInicial} h: el {a.pctC1} % de las {i.horasC1?.toLocaleString('es-AR')} h que lleva llegar a C1. Para C1 en un año harían falta unas {a.horasSemanaC1} h por semana.</p>
          </FilaHoja>
        </div>
      )}

      <Grupo titulo="Fases">
        <div className="capa-1 pg-caja"><Paradas area={AREA} paradas={paradas} onElegir={setSel} etiqueta={`Fases del año ${a.n}`} /></div>
      </Grupo>

      <div className="capa-1 s-lista">
        <FilaHoja icono="calendario" titulo="Trimestres, tesis y examen" valor={String(ev.length)}>
          <ol className="capa-1 pt-revs">
            {ev.map((e) => (
              <li key={e.id}>
                <span className="t-rotulo">{e.desde && e.tipo === 'examen' ? `${fp(e.desde)} – ${fp(e.fecha)}` : fp(e.fecha)}{e.fecha < day.date ? ' · pasó' : ''}</span>
                <span className="t-cuerpo">{e.texto}</span>
              </li>
            ))}
          </ol>
          <p className="t-nota pg-pie">Fecha, sede y costo de los exámenes: sin verificar.</p>
        </FilaHoja>
        {c1 && <Fila icono="cohete" titulo={`En la Fase B: ${c1.texto}`} nota={`Hacia ${mesAnio(c1.fecha)}${c1.cert ? ` · ${c1.cert}` : ''}`} href="#/estudio/idiomas/ascenso" />}
      </div>

      <nav className="pg-vecinos" aria-label="Otros años">
        {ant ? <Boton tamano="s" variante="fantasma" icono="atras" href={`#/estudio/idiomas/${ant.idioma}`}>{nombreIdioma(ant.idioma)}</Boton> : <span />}
        {sig ? <Boton tamano="s" variante="fantasma" icono="siguiente" href={`#/estudio/idiomas/${sig.idioma}`}>{nombreIdioma(sig.idioma)}</Boton> : <span />}
      </nav>

      <HojaFase x={elegida} hoy={day.date} onCerrar={() => setSel(null)} />
    </Marco>
  );
}

/** La hoja de una fase: el recurso, el hito, lo de hoy y sus libros y su curso. */
function HojaFase({ x, hoy, onCerrar }: { x: FaseFechada | null; hoy: string; onCerrar: () => void }) {
  const [ultima, setUltima] = useState<FaseFechada | null>(null);
  const study = useStore((s) => s.study);
  if (x && x !== ultima) setUltima(x);
  const f = x ?? ultima;
  if (!f) return null;
  const actual = estadoEn(f, hoy) === 'actual';
  return (
    <Hoja abierta={!!x} onCerrar={onCerrar} titulo={f.nombre}>
      <div className="pg-detalle">
        <p className="t-rotulo">{rango(f.inicio, f.fin)} · {f.semanas} sem{actual ? ' · ahora' : ''}</p>
        <p className="t-cuerpo-l">{f.recurso}</p>
        <p className="t-cuerpo">Hito: {f.hito}</p>
        {actual && <p className="t-nota">Hoy en el bloque: {f.tareas.join(' · ')}</p>}
        {f.libro && libroPorId(f.libro) && <div><Boton variante="secundario" icono="documento" href={`#/estudio/libro/${f.libro}`}>Abrir el libro</Boton></div>}
        {f.libros && (
          <div className="capa-1 s-lista">
            {f.libros.map((id) => {
              const lb = libroDeBiblioteca(id);
              const st = estadoBiblioteca(study, id);
              return <Fila key={id} icono="documento" titulo={lb?.titulo ?? id} valor={st.conCapitulos ? ESTADO_LIBRO[st.estado].toLowerCase() : 'sin capítulos'} href={st.conCapitulos ? `#/estudio/libro/${id}` : undefined} />;
            })}
          </div>
        )}
        {f.udemy && <EnlaceCurso clave={f.udemy} />}
      </div>
    </Hoja>
  );
}

/** El enlace del curso de Udemy: se carga en la app y queda en el teléfono (no va al repo). */
function EnlaceCurso({ clave }: { clave: string }) {
  const url = useStore((s) => s.idiomas.enlaces[clave]);
  const [edita, setEdita] = useState(false);
  const [txt, setTxt] = useState(url ?? '');
  const [error, setError] = useState('');
  if (url && !edita) {
    return (
      <div className="pg-enlace-curso">
        <a className="k-boton secundario" href={url} target="_blank" rel="noreferrer"><Icono nombre="enlace" lado={20} /><span>Abrir el curso de Udemy</span></a>
        <Boton variante="fantasma" onClick={() => { setTxt(url); setEdita(true); }}>Cambiar el enlace</Boton>
      </div>
    );
  }
  const guardar = () => {
    if (guardarEnlaceIdioma(clave, txt)) {
      setEdita(false);
      setError('');
      aviso({ titulo: txt.trim() ? 'Enlace guardado' : 'Enlace borrado', sub: 'Queda solo en este teléfono', tono: 'hecho' });
    } else setError('Ese enlace no sirve: tiene que empezar con https://');
  };
  return (
    <div className="pg-aparte">
      <CampoTexto etiqueta="Enlace del curso de Udemy" valor={txt} onCambio={(v) => { setTxt(v); setError(''); }} placeholder="https://…" modo="url" nota="Queda solo en este teléfono." error={error || undefined} />
      <div className="pg-acciones">
        <Boton variante="secundario" onClick={guardar}>Guardar el enlace</Boton>
        {url && <Boton variante="fantasma" onClick={() => { setEdita(false); setError(''); }}>Cancelar</Boton>}
      </div>
    </div>
  );
}

// ——— La biblioteca ———

const INFO_BIBLIOTECA = (
  <>
    <p className="t-cuerpo-l">{BIBLIOTECA.criterio}</p>
    <p className="t-cuerpo">Un libro cuenta como terminado con su test final, su tesis y su artefacto.</p>
    <p className="t-cuerpo">Para cargar los capítulos de un libro, pegá en <a className="pt-enlace" href="#/importar">Importar</a> un JSON con <code>"tipo": "libro"</code> y el id que figura acá (por ejemplo <code>make-it-stick</code>).</p>
  </>
);

type LibroBib = { id: string; titulo: string; aval?: string; faseA?: number };

function Biblioteca({ day }: { day: DayLog }) {
  const study = useStore((s) => s.study);
  const t0 = useT0();
  const todos = BIBLIOTECA.bloques.flatMap((b) => b.libros);
  const hecho = (l: LibroBib) => estadoBiblioteca(study, l.id).estado === 'terminado';
  const mwm = libroPorId('mwm');
  const anios = aniosIdiomas(t0);
  const faseA = anios.map((a) => ({ a, libros: todos.filter((l) => l.faseA === a.n) }));
  const fila = (l: LibroBib) => {
    const st = estadoBiblioteca(study, l.id);
    const estado = st.conCapitulos ? ESTADO_LIBRO[st.estado].toLowerCase() : 'sin capítulos';
    return <Fila key={l.id} icono="documento" titulo={l.titulo} nota={[l.aval, l.faseA ? `año ${l.faseA}` : '', estado].filter(Boolean).join(' · ')} href={st.conCapitulos ? `#/estudio/libro/${l.id}` : undefined} />;
  };
  const hoyEs = day.date < anios[anios.length - 1].fin ? 'Fase A' : 'Fase B';
  return (
    <Marco className="pg" titulo="Libros" info={INFO_BIBLIOTECA} volver={VOLVER_IDIOMAS}>
      <div className="pg-datos pg-datos-solo">
        <Dato valor={`${todos.filter(hecho).length}/${todos.length}`} etiqueta="Terminados" />
        <Dato valor={hoyEs} etiqueta="Hoy" />
      </div>
      {mwm && (
        <div className="capa-1 s-lista"><Fila icono="estudio" titulo="Libro inicial" nota={mwm.titulo} href="#/estudio/libro/mwm" /></div>
      )}
      <Grupo titulo="Fase A · 2 libros por año" extremo={<span className="t-rotulo">{`${faseA.flatMap((x) => x.libros).filter(hecho).length}/${faseA.flatMap((x) => x.libros).length}`}</span>}>
        <div className="capa-1 s-lista">
          {faseA.map(({ a, libros }) => (
            <FilaHoja key={a.n} icono="documento" titulo={`Año ${a.n} · ${nombreIdioma(a.idioma)}`} valor={`${libros.filter(hecho).length}/${libros.length}`} tituloHoja={`Año ${a.n} · libros`}>
              <div className="capa-1 s-lista">{libros.map(fila)}</div>
            </FilaHoja>
          ))}
        </div>
      </Grupo>
      <Grupo titulo="Fase B · el resto">
        <div className="capa-1 s-lista">
          {BIBLIOTECA.bloques.map((b) => (
            <FilaHoja key={b.n} icono="documento" titulo={`Bloque ${b.n} · ${b.nombre}`} valor={`${b.libros.filter(hecho).length}/${b.libros.length}`} tituloHoja={`Bloque ${b.n}`}>
              <div className="capa-1 s-lista">{b.libros.map(fila)}</div>
            </FilaHoja>
          ))}
          <FilaHoja icono="documento" titulo="Opcionales" nota="Fuera del núcleo" valor={plural(BIBLIOTECA.opcionales.length, 'libro', 'libros')}>
            <div className="capa-1 s-lista">{BIBLIOTECA.opcionales.map(fila)}</div>
          </FilaHoja>
        </div>
        <p className="t-nota pg-pie">Los 30 que no son de la Fase A se leen en la Fase B (desde el año 7), en el orden de los bloques.</p>
      </Grupo>
      <div className="pt-acciones"><Boton tamano="s" variante="fantasma" icono="importar" href="#/importar">Importar un libro</Boton></div>
    </Marco>
  );
}

// ——— El ascenso a C1 ———

const INFO_ASCENSO = (
  <>
    <p className="t-cuerpo-l">{IDIOMAS.faseB.texto}</p>
    <p className="t-nota">Fechas aproximadas: salen de 11,5 h por semana y de las horas a C1 de cada idioma (± 30 %).</p>
  </>
);

function Ascenso() {
  const [sel, setSel] = useState<string | null>(null);
  const hitos = IDIOMAS.faseB.hitos;
  const elegido = hitos.find((x) => x.id === sel) ?? null;
  const [ultimo, setUltimo] = useState<(typeof hitos)[number] | null>(null);
  if (elegido && elegido !== ultimo) setUltimo(elegido);
  const h = elegido ?? ultimo;
  return (
    <Marco className="pg" titulo="Ascenso a C1" info={INFO_ASCENSO} volver={VOLVER_IDIOMAS} rotulo="Fase B · desde el año 7">
      <div className="capa-1 pg-caja">
        <Paradas area={AREA} etiqueta="Hitos del ascenso a C1" onElegir={setSel} paradas={hitos.map((x) => ({ id: x.id, nombre: x.texto, nota: mesAnio(x.fecha), estado: 'proxima' }))} />
      </div>
      {h && (
        <Hoja abierta={!!elegido} onCerrar={() => setSel(null)} titulo={h.texto}>
          <div className="pg-detalle">
            <p className="t-rotulo">{mesAnio(h.fecha)} (aprox.)</p>
            {h.cert && <p className="t-cuerpo-l">{h.cert}</p>}
            <p className="t-nota">Fecha aproximada: sale de 11,5 h por semana y de las horas a C1 de cada idioma (± 30 %).</p>
          </div>
        </Hoja>
      )}
    </Marco>
  );
}
