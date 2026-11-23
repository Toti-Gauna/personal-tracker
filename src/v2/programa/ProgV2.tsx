/**
 * Trazo 2.0 · el roadmap de programación por proyectos (#/estudio/prog): se aprende haciendo, un proyecto a la vez. Arriba, dónde
 * estás y quién vas a ser; la escalera de P0 a A7 por fases (la fase de ahora a la vista, las demás en hojas). Cada bloque tiene su
 * página (#/estudio/prog/<id>) y sus secciones: Stack, Metas, Evidencia, Pieza matemática y Entrega. La Demanda y los Algoritmos
 * son pantallas aparte (`DemandaV2`, `AlgoritmosV2`). Mismos datos y mismas funciones que la 1.0.
 */
import type { ReactNode } from 'react';
import { PLAN, tramoPorId, type Capa } from '../../data/plan';
import { EVIDENCIAS, proyectoVacio } from '../../data/plan-state';
import { fichaV7 } from '../../data/proyectos-v7';
import { PLAN_EXT, bloqueExtPorId } from '../../data/plan-extendido';
import { avanceSalida, calendarioCompleto, estadoEn, hoySos, salidaDe } from '../../data/plan-vistas';
import { estadoTemas } from '../../data/algoritmos';
import { avanceBloque } from '../../data/metas-bloque';
import { cierreProyecto } from '../../data/puertas';
import type { DayLog } from '../../data/types';
import { marcarCapa, tildarSalida, toggleEvidencia } from '../../state/plan';
import { useStore } from '../../state/store';
import { Boton } from '../kit/controles';
import { Estado, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { MetroVertical } from '../estudio/Metro';
import type { Estacion } from '../estudio/lineas';
import { MetasDelBloque } from '../proyecto/MetasBloque';
import { FichaTab } from '../proyecto/Pestanas';
import { FilaHoja, Lista } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { Aca, Perfil, fch, fp, mayuscula, plural, rango, useT0 } from './comun';

const AREA = 'var(--a-ing)';
const TIPO: Record<string, string> = { proyecto: 'proyecto', ventana: 'ventana de matemática', cert: 'certificación', colchon: 'colchón', cierre: 'cierre', descanso: 'descanso' };
const VOLVER_ESTUDIO = { href: '#/estudio', nombre: 'Estudio' };
const VOLVER_PROG = { href: '#/estudio/prog', nombre: 'Programación' };

export const SUBPAGINAS = [
  ['resumen', 'Resumen'], ['stack', 'Stack y tecnología nueva'], ['metas', 'Metas'], ['evidencia', 'Evidencia'], ['pieza', 'Pieza matemática'], ['entrega', 'Entrega'],
] as const;
type Sub = (typeof SUBPAGINAS)[number][0];
const TITULO_SUB: Record<Sub, string> = { resumen: 'Resumen', stack: 'Stack', metas: 'Metas', evidencia: 'Evidencia', pieza: 'Pieza matemática', entrega: 'Entrega' };

function useProg(day: DayLog) {
  const t0 = useT0();
  const plan = useStore((s) => s.plan);
  useStore((s) => s.plan.extrasApagados);
  const cal = calendarioCompleto(t0).filter((b) => b.semanas > 0);
  const actual = cal.find((b) => estadoEn(b, day.date) === 'actual') ?? cal.find((b) => estadoEn(b, day.date) === 'proximo') ?? cal[cal.length - 1];
  return { t0, plan, cal, actual, perfil: hoySos(day.date, plan, t0) };
}
type Prog = ReturnType<typeof useProg>;

/** #/estudio/prog, #/estudio/prog/<id> y #/estudio/prog/<id>/<sección> (la demanda y los algoritmos tienen su propia pantalla). */
export default function ProgV2({ ruta, day }: PropsV2) {
  const [, id, sub] = (ruta.param ?? 'prog').split('/');
  const p = useProg(day);
  const b = id ? p.cal.find((x) => x.id === id) : undefined;
  if (b) return <Bloque key={`${b.id}/${sub ?? ''}`} day={day} id={b.id} sub={(SUBPAGINAS.find(([k]) => k === sub)?.[0] ?? 'resumen') as Sub} p={p} />;
  return <Hub day={day} p={p} />;
}

// ——— La escalera ———

const INFO_HUB = (
  <>
    <p className="t-cuerpo-l">Se aprende haciendo: un proyecto a la vez, con una tecnología nueva como máximo.</p>
    <p className="t-cuerpo">Cada proyecto cierra con examen, evidencia y su entrega.</p>
    <p className="t-nota">Roadmap · Plan T+18 extendido.</p>
  </>
);

function Hub({ day, p }: { day: DayLog; p: Prog }) {
  const { plan, cal, actual, perfil } = p;
  const vacantes = useStore((s) => s.plan.vacantes) ?? [];
  const temas = estadoTemas(plan);
  const grupos = [
    { id: 'antes', titulo: 'Antes del plan', nota: 'P0 y PetrIA v0 (archivado)', xs: cal.filter((x) => !x.fase && !x.pausa && x.tipo !== 'descanso') },
    ...(PLAN_EXT.fases ?? []).map((fa) => ({ id: fa.id, titulo: `Fase ${fa.id.slice(1)}`, nota: fa.nombre, xs: cal.filter((x) => x.fase === fa.id && x.tipo !== 'descanso') })),
  ].filter((g) => g.xs.length);
  const hecho = (x: (typeof cal)[number]) => (x.tipo === 'proyecto' ? !!cierreProyecto(plan, x.id) : estadoEn(x, day.date) === 'hecho');
  const estaciones = (xs: typeof cal): Estacion[] => xs.map((x) => ({ id: x.id, nombre: `${x.id} · ${x.nombre}`, estado: x.id === actual.id ? 'actual' : (x.tipo === 'proyecto' ? !!cierreProyecto(plan, x.id) : estadoEn(x, day.date) === 'hecho') ? 'hecha' : 'proxima' }));
  const nota = (x: (typeof cal)[number]) => {
    const av = avanceBloque(plan.metasBloque?.[x.id]);
    const sal = x.tipo === 'ventana' ? avanceSalida(plan, x.id) : null;
    return [`${fch(x.inicio)} – ${fch(x.fin)}`, av.total ? `metas ${av.hechas}/${av.total}` : '', sal ? `salida ${sal.hechos}/${sal.total}` : ''].filter(Boolean).join(' · ');
  };
  const escalera = (xs: typeof cal) => (
    <MetroVertical area={AREA} estaciones={estaciones(xs)} nota={(e) => nota(xs.find((x) => x.id === e.id)!)} href={(e) => `#/estudio/prog/${e.id}`} />
  );
  const deAhora = grupos.find((g) => g.xs.some((x) => x.id === actual.id));
  const proyectos = cal.filter((x) => x.tipo === 'proyecto');
  return (
    <Marco className="pg" titulo="Programación" info={INFO_HUB} volver={VOLVER_ESTUDIO}>
      <Tarjeta heroe className="pg-hero" area={AREA}>
        <Perfil sos={perfil.sos?.perfil ?? 'Recién empezás'} vasASer={perfil.vasASer?.perfil} />
        <Aca href={`#/estudio/prog/${actual.id}`} titulo={`${actual.id} · ${actual.nombre}`} dato={`${rango(actual.inicio, actual.fin)} · ${TIPO[actual.tipo]}`} />
      </Tarjeta>

      <div className="capa-1 s-lista">
        <Fila icono="grafico" titulo="Demanda" valor={plural(vacantes.length, 'vacante', 'vacantes')} href="#/estudio/prog/demanda" />
        <Fila icono="codigo" titulo="Algoritmos" valor={`${temas.filter((t) => t.estado === 'hecho').length}/${temas.length}`} href="#/estudio/prog/algoritmos" />
      </div>

      {deAhora && (
        <Grupo titulo={`${deAhora.titulo} · ${deAhora.nota}`} extremo={<span className="t-rotulo">{`${deAhora.xs.filter(hecho).length}/${deAhora.xs.length}`}</span>}>
          <div className="capa-1 pg-caja">{escalera(deAhora.xs)}</div>
        </Grupo>
      )}

      <Grupo titulo="La escalera, de P0 a A7" extremo={<span className="t-rotulo">{plural(proyectos.length, 'proyecto', 'proyectos')}</span>}>
        <div className="capa-1 s-lista">
          {grupos.map((g) => (
            <FilaHoja key={g.id} icono="codigo" titulo={g.titulo} nota={`${g.nota} · ${g.xs.reduce((a, x) => a + x.semanas, 0)} sem`} valor={`${g.xs.filter(hecho).length}/${g.xs.length}`} tituloHoja={`${g.titulo} · ${g.nota}`}>
              <div className="capa-1 pg-caja">{escalera(g.xs)}</div>
            </FilaHoja>
          ))}
        </div>
      </Grupo>
    </Marco>
  );
}

// ——— Un bloque ———

const INFO_BLOQUE = (
  <>
    <p className="t-cuerpo-l">Cada bloque del plan tiene su resumen y sus secciones.</p>
    <p className="t-cuerpo">Stack, metas, evidencia, la pieza matemática y la entrega. Revisiones, tiempo y examen están en el Plan.</p>
  </>
);

const INFOS: Record<Sub, ReactNode> = {
  resumen: INFO_BLOQUE,
  stack: (
    <>
      <p className="t-cuerpo-l">Las tecnologías del proyecto, cada una con su marca: nueva, reusada o movida.</p>
      <p className="t-cuerpo">Una tecnología nueva por proyecto como máximo, y ninguna en bloques con certificación.</p>
    </>
  ),
  metas: <p className="t-cuerpo-l">Tus metas del bloque: se arman a mano, se tildan y se exportan como JSON.</p>,
  evidencia: <p className="t-cuerpo-l">Sin estas tres, además de tests y seguridad, el proyecto no cierra.</p>,
  pieza: (
    <>
      <p className="t-cuerpo-l">Se hace a mano y se contrasta con una referencia.</p>
      <p className="t-cuerpo">El nivel de salida de la ventana es la base de la pieza. Tildá cada criterio cuando lo puedas hacer sin ayuda; con todos, hacé el test de la puerta (85 %).</p>
    </>
  ),
  entrega: <p className="t-cuerpo-l">Un proyecto cierra con examen de 85 % o más, la entrevista técnica y la evidencia.</p>,
};

function Bloque({ day, id, sub, p }: { day: DayLog; id: string; sub: Sub; p: Prog }) {
  const { plan, cal, actual } = p;
  const i = cal.findIndex((x) => x.id === id);
  const b = cal[i];
  const est = b.tipo === 'proyecto' && cierreProyecto(plan, id) ? 'hecho' : estadoEn(b, day.date);
  const semana = est === 'actual' ? Math.floor((Date.parse(day.date) - Date.parse(b.inicio)) / (7 * 864e5)) + 1 : null;
  const ventana = b.dependeDe?.[0];
  const largo = b.nombre.trim().split(/\s+/).length > 3;
  const titulo = sub === 'resumen' ? (largo ? id : b.nombre) : TITULO_SUB[sub];
  const rotulo = sub === 'resumen' ? `${largo ? `${b.nombre} · ` : `${id} · `}${TIPO[b.tipo]}` : `${id} · ${b.nombre}`;
  const volver = sub === 'resumen' ? VOLVER_PROG : { href: `#/estudio/prog/${id}`, nombre: id };
  return (
    <Marco className="pg" titulo={titulo} info={INFOS[sub]} volver={volver} rotulo={rotulo}>
      {sub === 'resumen' && <Resumen id={id} b={b} p={p} est={est} semana={semana} ventana={ventana} aqui={id === actual.id} ant={cal.slice(0, i).reverse().find((x) => x.tipo !== 'descanso')} sig={cal.slice(i + 1).find((x) => x.tipo !== 'descanso')} />}
      {sub === 'stack' && <Stack id={id} />}
      {sub === 'metas' && <Metas id={id} hoy={day.date} />}
      {sub === 'evidencia' && <Evidencia id={id} b={b} />}
      {sub === 'pieza' && <Pieza id={id} b={b} ventana={ventana} />}
      {sub === 'entrega' && <Entrega id={id} />}
    </Marco>
  );
}

type Bl = Prog['cal'][number];

function Resumen({ id, b, p, est, semana, ventana, aqui, ant, sig }: { id: string; b: Bl; p: Prog; est: string; semana: number | null; ventana?: string; aqui: boolean; ant?: Bl; sig?: Bl }) {
  const { plan } = p;
  const t = tramoPorId(id);
  const av = avanceBloque(plan.metasBloque?.[id]);
  const pr = plan.proyectos[id] ?? proyectoVacio();
  const capas = PLAN.programacion.estandar;
  const subs = SUBPAGINAS.filter(([k]) => k !== 'resumen' && (b.tipo === 'proyecto' || k === 'metas' || (b.tipo === 'ventana' && k === 'pieza')));
  const salidaId = b.tipo === 'ventana' ? id : ventana;
  const sal = salidaId && salidaDe(salidaId).length ? avanceSalida(plan, salidaId) : null;
  const valor = (k: Sub): string | undefined => {
    if (k === 'metas') return av.total ? `${av.hechas}/${av.total}` : undefined;
    if (k === 'evidencia') return `${EVIDENCIAS.filter(([x]) => pr.evidencia?.[x]).length}/${EVIDENCIAS.length}`;
    if (k === 'entrega') return `${capas.filter((c) => pr.estandar[c.id as Capa]).length}/${capas.length}`;
    if (k === 'pieza') return sal ? `${sal.hechos}/${sal.total}` : undefined;
    return undefined;
  };
  const ICONO = { stack: 'paquete', metas: 'meta', evidencia: 'candado', pieza: 'matematica', entrega: 'medalla' } as const;
  const palabra = aqui ? 'Estás acá' : est === 'hecho' ? 'Cerrado' : est === 'actual' ? 'En curso' : 'Todavía no';
  return (
    <>
      <Tarjeta heroe className="pg-hero" area={AREA}>
        <div className="pg-hero-fila">
          <span className="t-rotulo">{palabra}</span>
          {est === 'hecho' && <Estado estado="hecho" texto="Cerrado" />}
        </div>
        <div>
          <b className="t-encabezado">{rango(b.inicio, b.fin)}</b>
          <p className="t-dato pg-vacio-nota">{plural(b.semanas, 'semana', 'semanas')}{semana ? ` · vas por la ${semana}` : ''}</p>
        </div>
        {b.ficha?.perfil && <Perfil sos={b.ficha.perfil} rotulos={['Al cerrarlo sos', '']} />}
      </Tarjeta>

      <Grupo titulo="Secciones">
        <div className="capa-1 s-lista">
          {subs.map(([k, n]) => <Fila key={k} icono={ICONO[k as keyof typeof ICONO]} titulo={n} valor={valor(k)} href={`#/estudio/prog/${id}/${k}`} />)}
          <Fila icono="plan" titulo="Revisiones, tiempo y examen" nota="En el Plan" href={`#/metas/proyecto/${id}`} />
        </div>
      </Grupo>

      {ventana && (
        <div className="capa-1 s-lista">
          <Fila icono="matematica" titulo={`Antes va la ventana ${ventana}`} nota={`Sin la puerta aprobada (85 %), ${id} no arranca.`} href={`#/estudio/prog/${ventana}`} />
        </div>
      )}

      {(t?.que || b.ficha?.feature || b.ficha?.visual) && (
        <Grupo titulo="Qué se construye">
          <dl className="capa-1 pt-ficha">
            {t?.que && <div className="pt-ficha-fila"><dt className="t-rotulo">Qué es</dt><dd><p className="t-cuerpo">{mayuscula(t.que)}.</p></dd></div>}
            {b.ficha?.feature && <div className="pt-ficha-fila"><dt className="t-rotulo">Feature diferencial</dt><dd><p className="t-cuerpo">{b.ficha.feature}</p></dd></div>}
            {b.ficha?.visual && <div className="pt-ficha-fila"><dt className="t-rotulo">Visual</dt><dd><p className="t-cuerpo">{b.ficha.visual}</p></dd></div>}
          </dl>
        </Grupo>
      )}

      {b.tipo !== 'proyecto' && <FichaTab id={id} />}

      {(ant || sig) && (
        <nav className="pg-vecinos" aria-label="Otros bloques">
          {ant ? <Boton tamano="s" variante="fantasma" icono="atras" href={`#/estudio/prog/${ant.id}`}>{ant.id}</Boton> : <span />}
          {sig ? <Boton tamano="s" variante="fantasma" icono="siguiente" href={`#/estudio/prog/${sig.id}`}>{sig.id}</Boton> : <span />}
        </nav>
      )}
    </>
  );
}

// ——— Las secciones ———

const MARCA_TXT = { nueva: 'Nueva', reusada: 'Reusada', movida: 'Movida' } as const;
const fh = (d: string) => `${Number(d.slice(8))}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** Las tecnologías de un proyecto con su marca (nueva, reusada o movida), sus entornos, lo que se recorta primero y su historial. */
function Stack({ id }: { id: string }) {
  const b = bloqueExtPorId(id);
  const tec = b?.tecnologias ?? [];
  if (!b || !tec.length) return <Vacio ilustracion="datos" titulo="Sin tecnología nueva" texto="Este bloque no suma tecnología nueva." accion={<Boton variante="secundario" href={`#/estudio/prog/${id}`}>Volver a {id}</Boton>} />;
  const marcadas = tec.filter((t) => t.marca);
  const trabajo = tec.filter((t) => !t.marca);
  const st = fichaV7(id)?.stack;
  return (
    <>
      {marcadas.length > 0 && (
        <Grupo titulo="Tecnología nueva">
          <div className="capa-1 s-lista">
            {marcadas.map((t) => <Fila key={t.nombre} titulo={t.nombre} nota={t.nota} valor={<span className={`pt-marca ${t.marca}`}>{MARCA_TXT[t.marca!]}{t.desde ? ` · de ${t.desde}` : ''}</span>} />)}
          </div>
        </Grupo>
      )}
      <Grupo titulo={st?.ambientes.length ? 'Tecnologías' : 'Parte del trabajo'} extremo={<span className="t-rotulo">{trabajo.length}</span>}>
        <div className="pt-chips">{trabajo.map((t) => <span key={t.nombre} className="pg-chip" title={t.ambiente}>{t.nombre}{t.opcional ? ' †' : ''}</span>)}</div>
        {(st?.ambientes.length || trabajo.some((t) => t.opcional)) ? <p className="t-nota pg-pie">† Propuesta a confirmar. Son las tecnologías que cuenta la tabla de demanda.</p> : null}
      </Grupo>
      <div className="capa-1 s-lista">
        {st?.ambientes.length ? (
          <FilaHoja icono="hardware" titulo="Entornos" valor={String(st.ambientes.length)}>
            <dl className="capa-1 pt-ficha">
              {st.ambientes.map((a) => <div key={a.ambiente} className="pt-ficha-fila"><dt className="t-rotulo">{a.ambiente}</dt><dd><p className="t-cuerpo">{a.texto}</p></dd></div>)}
            </dl>
            <p className="t-nota pg-pie">† Propuesta a confirmar.</p>
          </FilaHoja>
        ) : null}
        {b.historial?.length ? (
          <FilaHoja icono="documento" titulo="Historial de cambios" valor={plural(b.historial.length, 'cambio', 'cambios')}>
            <ol className="capa-1 pt-revs">{b.historial.map((h, i) => <li key={i}><span className="t-rotulo">{fh(h.fecha)}</span><span className="t-cuerpo">{h.cambio}</span><span className="t-nota">{h.motivo}</span></li>)}</ol>
          </FilaHoja>
        ) : null}
      </div>
      {b.recortarPrimero?.length ? <p className="t-nota pg-pie">Si {id} se pasa de horas, se recorta primero: {b.recortarPrimero.join(' y ')}.</p> : null}
    </>
  );
}

function Metas({ id, hoy }: { id: string; hoy: string }) {
  return (
    <>
      {id === 'P0' && <p className="t-cuerpo">En P0 se arman las metas: cargalas a mano o pegá el JSON que te pase Claude.</p>}
      <MetasDelBloque bloque={id} hoy={hoy} titulo={`Metas de ${id}`} />
    </>
  );
}

function Evidencia({ id, b }: { id: string; b: Bl }) {
  const pr = useStore((s) => s.plan.proyectos[id]);
  const n = EVIDENCIAS.filter(([k]) => pr?.evidencia?.[k]).length;
  return (
    <>
      <Grupo titulo="Puerta de evidencia" extremo={<span className="t-rotulo">{`${n}/${EVIDENCIAS.length}`}</span>}>
        <Lista items={EVIDENCIAS.map(([k, nombre, texto]) => ({ clave: k, etiqueta: nombre, nota: texto, marcada: !!pr?.evidencia?.[k] }))} onCambio={(k) => toggleEvidencia(id, k as (typeof EVIDENCIAS)[number][0])} area={AREA} />
      </Grupo>
      {(b.ficha?.referencia || b.ficha?.validador) && (
        <div className="capa-1 s-lista">
          <FilaHoja icono="enlace" titulo="Referencia y validador" tituloHoja="Referencia y validador">
            <dl className="capa-1 pt-ficha">
              {b.ficha?.referencia && <div className="pt-ficha-fila"><dt className="t-rotulo">Referencia externa</dt><dd><p className="t-cuerpo">{b.ficha.referencia}</p></dd></div>}
              {b.ficha?.validador && <div className="pt-ficha-fila"><dt className="t-rotulo">Quién lo valida</dt><dd><p className="t-cuerpo">{b.ficha.validador}</p></dd></div>}
            </dl>
          </FilaHoja>
        </div>
      )}
    </>
  );
}

function Pieza({ id, b, ventana }: { id: string; b: Bl; ventana?: string }) {
  const plan = useStore((s) => s.plan);
  const salidaId = b.tipo === 'ventana' ? id : ventana;
  const crit = salidaId ? salidaDe(salidaId) : [];
  const av = salidaId ? avanceSalida(plan, salidaId) : null;
  const hechos = new Set(salidaId ? plan.salida?.[salidaId] ?? [] : []);
  const examen = salidaId ? plan.proyectos[salidaId]?.examen : undefined;
  return (
    <>
      {b.ficha?.pieza && (
        <Grupo titulo="La pieza">
          <p className="capa-1 pt-perfil t-cuerpo-l">{b.ficha.pieza}</p>
        </Grupo>
      )}
      {salidaId && crit.length > 0 && av && (
        <Grupo titulo={b.tipo === 'ventana' ? `Nivel de salida · ${salidaId}` : `Sale de ${salidaId}`} extremo={<span className="t-rotulo">{`${av.hechos}/${av.total}`}</span>}>
          <Lista items={crit.map((c, k) => ({ clave: String(k), etiqueta: c, marcada: hechos.has(k) }))} onCambio={(k) => tildarSalida(salidaId, Number(k))} area="var(--a-economia)" />
          {(av.completo || (examen && examen.puntaje >= 85)) && (
            <p className="t-nota pg-pie">
              {av.completo ? 'Nivel de salida completo: listo para el test de la puerta.'
                : `Puerta aprobada por el test (${examen!.puntaje} %), pero te ${av.total - av.hechos === 1 ? 'falta 1 criterio' : `faltan ${av.total - av.hechos} criterios`} de salida: repasalos antes del proyecto.`}
            </p>
          )}
        </Grupo>
      )}
      {!b.ficha?.pieza && !(salidaId && crit.length > 0) && (
        <Vacio ilustracion="escribir" titulo="Sin pieza matemática" texto="Este bloque no tiene una pieza hecha a mano." accion={<Boton variante="secundario" href={`#/estudio/prog/${id}`}>Volver a {id}</Boton>} />
      )}
      {salidaId && (
        <div className="capa-1 s-lista"><Fila icono="matematica" titulo={`Refuerzo de ${salidaId}`} href={`#/estudio/mate/${salidaId}`} /></div>
      )}
    </>
  );
}

function Entrega({ id }: { id: string }) {
  const plan = useStore((s) => s.plan);
  const pr = plan.proyectos[id] ?? proyectoVacio();
  const capas = PLAN.programacion.estandar;
  const n = capas.filter((c) => pr.estandar[c.id as Capa]).length;
  const cerrado = !!cierreProyecto(plan, id);
  return (
    <>
      <Grupo titulo="Estándar de alto valor" extremo={<span className="t-rotulo">{`${n}/${capas.length}`}</span>}>
        <Lista items={capas.map((c) => ({ clave: c.id, etiqueta: c.nombre, marcada: !!pr.estandar[c.id as Capa] }))} onCambio={(k) => marcarCapa(id, k as Capa)} area={AREA} festejo={false} />
      </Grupo>
      <div className="capa-1 s-lista">
        <FilaHoja icono="info" titulo="Qué pide cada una" tituloHoja="Estándar de alto valor">
          <dl className="capa-1 pt-ficha">
            {capas.map((c) => (
              <div key={c.id} className="pt-ficha-fila">
                <dt className="t-rotulo">{c.nombre}</dt>
                <dd><p className="t-cuerpo">{c.texto}</p>{c.detalle?.length ? <p className="t-nota">{c.detalle.join(' · ')}</p> : null}</dd>
              </div>
            ))}
          </dl>
        </FilaHoja>
      </div>
      <p className="t-cuerpo pg-pie">{pr.examen ? `Examen: ${pr.examen.puntaje} % el ${fp(pr.examen.fecha)}.` : 'Todavía sin examen.'}</p>
      {cerrado && <div className="pg-aparte"><Estado estado="hecho" texto="Proyecto cerrado" /></div>}
    </>
  );
}
