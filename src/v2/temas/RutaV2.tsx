/**
 * Trazo 2.0 · los roadmaps de estudio (#/estudio/ruta…): la lista, un roadmap con su escalera de fases y cada fase con lo que
 * manda, los criterios para pasar y el resto del material en hojas. Mismos datos y mismas acciones que la 1.0: tildar un
 * criterio, cerrar la fase (en orden) y reabrir la última.
 */
import {
  dondeEstas, estadoFases, mesesRestantes, paraActivar, porRol, progresoVacio, roadmapPorId, STUDY_ROADMAPS,
  type Fase, type Material, type MotivoActivar, type RoadmapEstudio,
} from '../../data/study-roadmap';
import { cerrarFase, reabrirFase, toggleCriterio } from '../../state/estudio-ruta';
import { useStore } from '../../state/store';
import { play } from '../../ui/sound';
import { Metro, MetroVertical } from '../estudio/Metro';
import type { Estacion } from '../estudio/lineas';
import { aviso } from '../kit/capas';
import { Boton, Casilla } from '../kit/controles';
import { Barra, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { haptico } from '../movimiento/movimiento';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { areaV2, fch, pct } from './datos';
import '../proyecto/proyecto.css';
import '../estudio/estudio.css';
import './temas.css';

const meses = (f: Fase) => (f.meses[0] === f.meses[1] ? `${f.meses[0]} ${f.meses[0] === 1 ? 'mes' : 'meses'}` : `${f.meses[0]}–${f.meses[1]} meses`);
const nucleos = (f: Fase) => f.materiales.filter((m) => m.rol === 'nucleo');
const estacion = (e: ReturnType<typeof estadoFases>[number]): Estacion['estado'] => (e.estado === 'cerrada' ? 'hecha' : e.estado === 'actual' ? 'actual' : 'proxima');

/** El progreso guardado de un roadmap y el estado de sus fases. */
function useRoadmap(r: RoadmapEstudio) {
  const p = useStore((s) => s.estudioRuta[r.id]) ?? progresoVacio();
  const study = useStore((s) => s.study);
  return { p, fases: estadoFases(r, p, study), donde: dondeEstas(r, p) };
}

export default function RutaV2({ ruta, day }: PropsV2) {
  const [, id, faseId] = (ruta.param ?? '').split('/');
  const r = id ? roadmapPorId(id) : undefined;
  if (!r) return <ListaRoadmaps />;
  const f = faseId ? r.fases.find((x) => x.id === faseId) : undefined;
  return f ? <FaseV2 key={f.id} r={r} f={f} hoy={day.date} /> : <RoadmapV2 r={r} />;
}

// ——— La lista ———

function ListaRoadmaps() {
  return (
    <Marco className="tm" titulo="Roadmaps" volver={{ href: '#/estudio', nombre: 'Estudio' }} info={<p className="t-cuerpo">Elegí uno para ver sus fases: cada roadmap es una escalera, y la fase donde estás va marcada.</p>}>
      <div className="tm-rutas">{STUDY_ROADMAPS.map((r) => <TarjetaRuta key={r.id} r={r} />)}</div>
    </Marco>
  );
}

function TarjetaRuta({ r }: { r: RoadmapEstudio }) {
  const { fases, donde, p } = useRoadmap(r);
  const actual = fases.find((e) => e.estado === 'actual');
  const [a, b] = mesesRestantes(r, p);
  const area = areaV2(r.color);
  return (
    <a className="capa-1 es-linea tm-ruta" href={`#/estudio/ruta/${r.id}`} style={{ ['--area' as string]: area }}>
      <span className="es-linea-cab"><i className="area-punto" /><b className="t-encabezado">{r.nombre}</b><span className="t-dato">fase {Math.min(donde.cerradas + 1, donde.total)} de {donde.total}</span></span>
      <Metro linea={{ nombre: r.nombre, area, estaciones: fases.map((e) => ({ id: e.fase.id, nombre: e.fase.nombre, estado: estacion(e) })), hechas: donde.cerradas, unidad: 'fases' }} />
      <span className="t-nota es-linea-ahora">{actual ? <><b>{actual.fase.id} · {actual.fase.nombre}</b> · {actual.criterios.hechos} de {actual.criterios.total} criterios · quedan {a}–{b} meses</> : <b>Todas las fases cerradas</b>}</span>
      <span className="t-nota es-linea-ahora">{donde.perfil ? <>Hoy sos <b>{donde.perfil}</b></> : 'Recién empezás'}{donde.proximo && <> → <b>{donde.proximo}</b></>}</span>
    </a>
  );
}

// ——— Un roadmap ———

function RoadmapV2({ r }: { r: RoadmapEstudio }) {
  const { fases, donde, p } = useRoadmap(r);
  const actual = fases.find((e) => e.estado === 'actual');
  const [a, b] = mesesRestantes(r, p);
  const area = areaV2(r.color);
  // Cada fase va en el primer año que la nombra (M3 y M6 cruzan de un año al otro).
  const anioDe = new Map<string, number>();
  for (const x of r.anios) for (const id of x.fases) if (!anioDe.has(id)) anioDe.set(id, x.anio);
  const porAnio: { anio?: number; xs: typeof fases }[] = [];
  for (const e of fases) {
    const anio = anioDe.get(e.fase.id);
    const ultimo = porAnio[porAnio.length - 1];
    if (ultimo && ultimo.anio === anio) ultimo.xs.push(e); else porAnio.push({ anio, xs: [e] });
  }
  return (
    <Marco className="tm" titulo={r.nombre} volver={{ href: '#/estudio', nombre: 'Estudio' }} info={(
        <>
          <p className="t-cuerpo-l">{r.descripcion}</p>
          <p className="t-cuerpo">Cada fase se cierra a mano, en orden, cuando confirmás lo que pide para pasar. Tocá una fase para ver todo lo que tiene.</p>
          {r.anios.map((x) => <p key={x.anio} className="t-cuerpo"><b>Año {x.anio}.</b> {x.objetivo}</p>)}
          <p className="t-nota">{actual ? `Quedan ${a}–${b} meses estimados, contando la fase en curso.` : `Cerraste las ${donde.total} fases.`}</p>
        </>
      )}>
      <Tarjeta heroe area={area} className="tm-aca">
        <span className="t-rotulo">{actual ? 'Estás acá' : 'Terminaste'}</span>
        <b className="t-seccion">{actual ? actual.fase.nombre : `Las ${donde.total} fases`}</b>
        <div className="tm-perfiles">
          <span><small className="t-rotulo">Hoy sos</small><b className="t-cuerpo-l">{donde.perfil ?? 'Recién empezás'}</b></span>
          {donde.proximo && <><span className="es-flecha" aria-hidden="true">→</span><span><small className="t-rotulo">Vas a ser</small><b className="t-cuerpo-l es-resalta">{donde.proximo}</b></span></>}
        </div>
        {actual && (
          <div className="tm-avance">
            <Barra valor={actual.criterios.hechos} max={actual.criterios.total} nombre={`Criterios para pasar ${actual.fase.id}`} area={area} />
            <span className="t-nota t-dato">{actual.criterios.hechos} de {actual.criterios.total} criterios</span>
          </div>
        )}
        {actual && <Boton variante="primario" ancho href={`#/estudio/ruta/${r.id}/${actual.fase.id}`}>Abrir {actual.fase.id}</Boton>}
      </Tarjeta>

      {porAnio.map(({ anio, xs }) => {
        return (
          <Grupo key={anio ?? 'fases'} titulo={anio != null ? `Año ${anio}` : 'Fases'}>
            <div className="capa-1 es-metro-caja">
              <MetroVertical area={area}
                estaciones={xs.map((e) => ({ id: e.fase.id, nombre: `${e.fase.id} · ${e.fase.nombre}`, estado: estacion(e) }))}
                nota={(est) => {
                  const e = xs.find((y) => y.fase.id === est.id)!;
                  return (
                    <span className="tm-fase-nota">
                      <span>{e.estado === 'cerrada' ? `Cerrada ${fch(e.cerrada!)}` : e.estado === 'actual' ? meses(e.fase) : `${meses(e.fase)} · ${e.fase.perfil}`}</span>
                    </span>
                  );
                }}
                href={(est) => `#/estudio/ruta/${r.id}/${est.id}`} />
            </div>
          </Grupo>
        );
      })}

      <div className="capa-1 s-lista">
        <FilaHoja icono="info" titulo="Cómo se usa" tituloHoja="Cómo se usa este roadmap">
          <ComoSeUsa r={r} />
        </FilaHoja>
      </div>
    </Marco>
  );
}

/** La regla, el protocolo, los roles y el semáforo. */
function ComoSeUsa({ r }: { r: RoadmapEstudio }) {
  return (
    <div className="tm-como">
      <p className="t-cuerpo-l">{r.regla}</p>
      {r.lema && <p className="t-nota">{r.lema}</p>}
      <h3 className="t-rotulo">Cada tema, en este orden</h3>
      <ol className="capa-1 tm-pasos">{r.protocolo.map((x) => <li key={x.paso}><b className="t-dato">{x.paso}</b><span className="t-cuerpo">{x.detalle}</span></li>)}</ol>
      <h3 className="t-rotulo">Los cinco tipos de material</h3>
      <ul className="capa-1 tm-roles">{Object.entries(r.roles).map(([k, v]) => <li key={k}><b className="t-cuerpo">{v.nombre}</b><span className="t-nota">{v.uso}</span></li>)}</ul>
      <h3 className="t-rotulo">Cómo te fue en el test</h3>
      <Semaforo r={r} />
    </div>
  );
}

function Semaforo({ r }: { r: RoadmapEstudio }) {
  const s = r.semaforo;
  const filas = [
    ['verde', `${pct(s.verde)} o más`, s.textos.verde],
    ['amarillo', `${pct(s.amarillo)} a ${pct(s.verde - 0.01)}`, s.textos.amarillo],
    ['rojo', `Menos de ${pct(s.amarillo)}`, s.textos.rojo],
  ] as const;
  return (
    <ul className="capa-1 tm-semaforo">
      {filas.map(([k, t, txt]) => <li key={k} className={k}><i aria-hidden="true" /><span><b className="t-cuerpo">{t}</b><span className="t-nota">{txt}</span></span></li>)}
    </ul>
  );
}

// ——— Una fase ———

const MOTIVOS: [MotivoActivar, string][] = [
  ['concepto', 'Fallás por concepto'], ['tecnica', 'Fallás por técnica'], ['enunciado', 'No entendés el enunciado'],
  ['descuido', 'Fallás por descuido'], ['profundidad', 'Querés más profundidad'],
];

function Materiales({ ms }: { ms: Material[] }) {
  return (
    <ul className="capa-1 tm-mats">
      {ms.map((m) => (
        <li key={m.id}>
          <b className="t-cuerpo-l">{m.titulo}{m.parte ? <span className="t-nota"> · {m.parte}</span> : null}</b>
          {m.autor && <span className="t-nota">{m.autor}</span>}
          <span className="t-cuerpo">{m.uso}</span>
          {m.cuando && <span className="t-nota">Cuándo: {m.cuando}</span>}
        </li>
      ))}
    </ul>
  );
}

function FaseV2({ r, f, hoy }: { r: RoadmapEstudio; f: Fase; hoy: string }) {
  const { fases, p } = useRoadmap(r);
  const study = useStore((s) => s.study);
  const e = fases.find((x) => x.fase.id === f.id)!;
  const i = r.fases.indexOf(f);
  const prev = r.fases[i - 1];
  const next = r.fases[i + 1];
  const ultimaCerrada = [...fases].reverse().find((x) => x.estado === 'cerrada');
  const hechos = new Set(p.salida[f.id] ?? []);
  const editable = e.estado === 'actual';
  const area = areaV2(r.color);
  const titulo = (id: string) => f.materiales.find((m) => m.id === id)?.titulo ?? id;
  const falta = e.criterios.total - e.criterios.hechos;
  const cerrar = () => {
    if (!cerrarFase(r.id, f.id, hoy)) return;
    haptico('exito');
    play('sello');
    aviso({ titulo: `Fase ${f.id} cerrada`, sub: `Ahora sos ${f.perfil}${next ? `. Sigue ${next.id}: ${next.nombre}` : ''}`, tono: 'hecho' });
  };
  const reabrir = () => {
    // "Cerrar de nuevo" la deja cerrada en su fecha de antes, no hoy.
    const fecha = e.cerrada ?? hoy;
    reabrirFase(r.id);
    aviso({ titulo: `Fase ${f.id} reabierta`, tono: 'info', accion: { etiqueta: 'Cerrar de nuevo', run: () => { cerrarFase(r.id, f.id, fecha); } } });
  };
  const rolesExtra = porRol(f).filter(([rol]) => rol !== 'nucleo');
  const rotulo = e.estado === 'cerrada' ? `Cerrada ${fch(e.cerrada!)}` : `${e.estado === 'actual' ? 'Estás acá' : 'Todavía no'} · ${meses(f)}`;
  return (
    <Marco className="tm" titulo={`Fase ${f.id}`} rotulo={rotulo} volver={{ href: `#/estudio/ruta/${r.id}`, nombre: r.nombre }} info={<><p className="t-cuerpo-l">{f.objetivo}</p><p className="t-cuerpo">La fase se cierra a mano, cuando confirmás cada criterio de salida. Terminar páginas no alcanza.</p></>}>
      <Tarjeta heroe area={area} className="tm-aca">
        <b className="t-seccion">{f.nombre}</b>
        <p className="t-cuerpo">Al cerrarla sos <b className="es-resalta">{f.perfil}</b></p>
      </Tarjeta>

      <Grupo titulo="Para pasar" extremo={<span className="t-rotulo">{e.estado === 'cerrada' ? e.criterios.total : e.criterios.hechos} de {e.criterios.total}</span>}>
        <div className="capa-1 pt-check">
          {f.salida.map((c, k) => (
            <Casilla key={c} marcada={e.estado === 'cerrada' || hechos.has(k)} etiqueta={c} deshabilitada={!editable} onCambio={() => { if (editable) toggleCriterio(r.id, f.id, k); }} />
          ))}
        </div>
        {e.evidencia && e.estado !== 'cerrada' && <p className="t-nota pt-pie">{e.evidencia.hechos} de {e.evidencia.total} {study.activities.find((x) => x.id === f.actividad)?.units?.length ? 'capítulos aprobados' : `${study.activities.find((x) => x.id === f.actividad)?.unit ?? 'avances'} hechos`}.</p>}
        {e.estado === 'proxima' && <p className="t-nota pt-pie">Se habilita al cerrar las fases anteriores.</p>}
        {e.estado === 'actual' && <div className="pt-acciones"><Boton variante="primario" ancho deshabilitado={e.lista ? false : `Faltan ${falta} para cerrar ${f.id}`} onClick={cerrar}>Cerrar {f.id}</Boton></div>}
        {e.estado === 'cerrada' && ultimaCerrada?.fase.id === f.id && <div className="pt-acciones"><Boton variante="secundario" icono="deshacer" onClick={reabrir}>Reabrir {f.id}</Boton></div>}
      </Grupo>

      <Grupo titulo="Qué libro manda">
        <div className="capa-1 s-lista">
          {nucleos(f).map((m) => (
            <FilaHoja key={m.id} icono="documento" titulo={`${m.titulo}${m.parte ? ` · ${m.parte}` : ''}`} nota={m.autor} tituloHoja={m.titulo}>
              <p className="t-cuerpo-l">{m.uso}</p>
              {m.cuando && <p className="t-nota tm-uso">Cuándo: {m.cuando}</p>}
            </FilaHoja>
          ))}
        </div>
      </Grupo>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          {f.bloques?.length ? (
            <FilaHoja icono="documento" titulo="Bloques" valor={String(f.bloques.length)} tituloHoja={`Bloques de ${f.id}`}>
              <ol className="capa-1 tm-bloques">
                {f.bloques.map((b) => {
                  const base = titulo(b.nucleo);
                  const comp = b.complementos?.map(titulo).join(', ');
                  return (
                    <li key={b.titulo}>
                      <b className="t-cuerpo-l">{b.titulo}</b>
                      {(base !== b.titulo || comp) && <span className="t-nota">{base !== b.titulo ? base : 'Con'}{comp ? `${base !== b.titulo ? ' +' : ''} ${comp}` : ''}</span>}
                      {b.temas?.length ? <ul className="tm-temas">{b.temas.map((t) => <li key={t} className="t-nota">{t}</li>)}</ul> : <span className="t-nota">Los temas del capítulo en el libro núcleo.</span>}
                    </li>
                  );
                })}
              </ol>
            </FilaHoja>
          ) : null}
          <FilaHoja icono="alerta" titulo="Si un test sale mal" tituloHoja="Si un test sale mal">
            <Semaforo r={r} />
            <ul className="capa-1 tm-roles">
              {MOTIVOS.map(([k, t]) => {
                const ms = paraActivar(r, f, k);
                return <li key={k}><b className="t-cuerpo">{t}</b><span className="t-nota">{ms.length ? ms.map((m) => m.titulo).join(' · ') : r.activar[k].texto}</span></li>;
              })}
            </ul>
          </FilaHoja>
          {rolesExtra.map(([rol, ms]) => (
            <FilaHoja key={rol} icono="mas" titulo={r.roles[rol].nombre} valor={String(ms.length)}>
              <p className="t-nota tm-uso">{r.roles[rol].uso}</p>
              <Materiales ms={ms} />
            </FilaHoja>
          ))}
          {f.descartados?.length ? (
            <FilaHoja icono="cerrar" titulo="No entra" valor={String(f.descartados.length)}>
              <ul className="capa-1 tm-roles">{f.descartados.map((d) => <li key={d}><span className="t-cuerpo">{d}</span></li>)}</ul>
            </FilaHoja>
          ) : null}
          <FilaHoja icono="codigo" titulo="Proyecto" valor={`${f.proyecto.modulos.length} módulos`} tituloHoja={f.proyecto.nombre}>
            <p className="t-nota tm-uso">Se arma por módulos, a medida que dominás cada bloque.</p>
            <ol className="capa-1 tm-pasos">{f.proyecto.modulos.map((m, k) => <li key={m}><b className="t-dato">{k + 1}</b><span className="t-cuerpo">{m}</span></li>)}</ol>
          </FilaHoja>
        </div>
      </Grupo>

      <nav className="pt-vecinos" aria-label="Otras fases">
        {prev ? <Boton tamano="s" variante="fantasma" icono="atras" href={`#/estudio/ruta/${r.id}/${prev.id}`}>{prev.id}</Boton> : <span />}
        {next ? <Boton tamano="s" variante="fantasma" icono="siguiente" href={`#/estudio/ruta/${r.id}/${next.id}`}>{next.id}</Boton> : <span />}
      </nav>
    </Marco>
  );
}

