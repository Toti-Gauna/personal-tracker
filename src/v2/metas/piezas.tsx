/**
 * Trazo 2.0 · las piezas de las metas por horizonte: las pestañas (Ruta, Semana, Mes, Bimestre, Año), las ramas que se pliegan,
 * una fila por cada tipo de meta (del plan, propia, fija de bimestre o de año) con su hoja para editar, los hitos del período y el
 * mapa de proyectos del portfolio. Mismas acciones y mismos datos que la 1.0; lo que se borra se puede deshacer.
 */
import { useId, useState, type ReactNode } from 'react';
import { AREAS } from '../../data/defaults';
import { periodKey, valueOf } from '../../data/goals';
import type { Goal } from '../../data/goals-types';
import { hitosEntre } from '../../data/hitos';
import { accionMeta, avanceMeta, esTarea, PASOS_MAPA, pasoMeta, type CtxPlan } from '../../data/metas-plan';
import type { MetaGenerada } from '../../data/plan';
import { enPausa } from '../../data/plan-state';
import { RAMA_NOMBRE } from '../../data/ramas';
import { addDays } from '../../data/time';
import { runWeek } from '../../data/train';
import { aceptaSubs, addProgress, addSub, deleteGoal, removeSub, stepOf, toggleGoal, toggleMark, toggleSub } from '../../state/goals';
import { confirmarMetas, editarMeta, editarMetaFija, ensayarRespuesta, marcarHito, moverHito, sumarContador, sumarHandyx, sumarHechoMeta, togglePasoMapa } from '../../state/plan';
import { getState, useStore } from '../../state/store';
import { abrirCorrida } from '../../ui/checkins';
import { Icono } from '../iconos';
import { aviso } from '../kit/capas';
import { Boton, Casilla, CampoTexto, Contador } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Barra, Fila } from '../kit/superficies';
import { CampoAlSalir, FilaHoja, Lista, hechasDe } from '../proyecto/piezas';
import { colorArea, colorMeta, colorRama, devolverMeta, devolverPeriodo, dm, fmt, instantanea, ORIGEN, titular } from './datos';
import '../proyecto/proyecto.css';
import './metas.css';

// ——— Las pestañas ———

const PESTANAS = [['ruta', 'Ruta'], ['semana', 'Semana'], ['mes', 'Mes'], ['bimestre', 'Bimestre'], ['anio', 'Año']] as const;
export type Horizonte = (typeof PESTANAS)[number][0];
/** El horizonte de las metas propias que se crean desde cada pestaña. */
export const HORIZONTE_META = { ruta: 'semana', semana: 'semana', mes: 'mes', bimestre: 'bim', anio: 'anio' } as const;
export const NUEVA = { semana: 'Meta de la semana', mes: 'Meta del mes', bimestre: 'Meta del bimestre', anio: 'Meta del año' } as const;

/** Las cinco pestañas de Metas: cada una es su propia ruta. */
export function Pestanas({ actual }: { actual: Horizonte }) {
  return (
    <nav className="mt-pestanas" aria-label="Horizonte">
      {PESTANAS.map(([id, nombre]) => <a key={id} href={`#/metas/${id}`} aria-current={id === actual ? 'page' : undefined} data-transicion="fundido">{nombre}</a>)}
    </nav>
  );
}

// ——— Una rama que se pliega ———

/** Una tarjeta con su encabezado (nombre, cuántas van) que abre y cierra lo de adentro. */
export function Plegable({ titulo, nota, valor, area, abierta = false, intro, children }: { titulo: string; nota?: string; valor?: string; area?: string; abierta?: boolean; /** Una línea que abre el cuerpo (dónde estás en esa rama). */ intro?: string; children: ReactNode }) {
  const [abre, setAbre] = useState(abierta);
  const id = useId();
  return (
    <section className="capa-1 mt-plegable" aria-label={titulo} style={area ? { ['--area' as string]: area } : undefined}>
      <button type="button" className="mt-plegable-cab" aria-expanded={abre} aria-controls={id} onClick={() => setAbre((x) => !x)}>
        {area && <i className="area-punto" />}
        <span className="mt-plegable-texto"><b>{titulo}</b>{nota && <small>{nota}</small>}</span>
        {valor && <span className="t-dato mt-plegable-valor">{valor}</span>}
        <Icono nombre={abre ? 'arriba' : 'abajo'} lado={18} />
      </button>
      {abre && <div id={id} className="mt-plegable-cuerpo">{intro && <p className="t-nota mt-plegable-intro">{intro}</p>}{children}</div>}
    </section>
  );
}

// ——— Confirmar las metas que armó el plan ———

/** Confirmar las metas generadas de un período (o cuándo se confirmaron). */
export function Confirmar({ tipo, clave, metas, date, confirmado, que }: { tipo: 'meses' | 'semanas'; clave: string; metas: MetaGenerada[]; date: string; confirmado?: string; que: 'la semana' | 'el mes' }) {
  if (confirmado) return <p className="t-rotulo mt-confirmado"><Icono nombre="tilde" lado={14} />Confirmadas el {dm(confirmado)}</p>;
  if (!metas.length) return null;
  const confirmar = () => {
    const antes = instantanea(getState().plan, tipo, clave);
    confirmarMetas(tipo, clave, metas, date);
    aviso({ titulo: que === 'la semana' ? 'Semana confirmada' : 'Mes confirmado', sub: `${metas.length} ${metas.length === 1 ? 'meta guardada' : 'metas guardadas'}`, tono: 'hecho', deshacer: () => devolverPeriodo(tipo, clave, antes) });
  };
  return <Boton variante="primario" icono="tilde" onClick={confirmar}>Confirmar {que}</Boton>;
}

// ——— Una meta que armó el plan ———

const entero = (n: number) => Number.isInteger(n);

/** Una meta de semana o mes generada por el plan: avance, barra y + (o casilla si es una tarea). Tocarla abre su hoja: cambiar el número o borrarla. */
export function FilaMetaPlan({ m, tipo, clave, base, desde, hasta, date, ctx, conOrigen, sinNota }: {
  m: MetaGenerada; tipo: 'meses' | 'semanas'; clave: string; base: MetaGenerada[]; desde: string; hasta: string; date: string; ctx: CtxPlan; conOrigen?: boolean;
  /** La nota va solo en la hoja (en la semana se repite en cada fila). */ sinNota?: boolean;
}) {
  const [hoja, setHoja] = useState(false);
  const { v, auto } = avanceMeta(m, desde, hasta, ctx);
  const tarea = esTarea(m);
  const meta = m.meta ?? 1;
  const hecha = v >= meta;
  const accion = accionMeta(m);
  const color = colorMeta(m);
  const nota = sinNota ? undefined : [conOrigen ? m.rama ? RAMA_NOMBRE[m.rama] : m.area ? AREAS[m.area].name : '' : '', conOrigen ? ORIGEN[m.origen] : '', m.nota].filter(Boolean).join(' · ') || undefined;
  const mas = () => {
    const n = pasoMeta(m);
    if (accion === 'contador') sumarContador(date, m.clave!, n);
    else if (accion === 'kit') ensayarRespuesta(date);
    else if (accion === 'operaciones') sumarHandyx(date, { operaciones: 1 });
    else sumarHechoMeta(tipo, clave, m, n, base);
  };
  const borrar = () => {
    const antes = instantanea(getState().plan, tipo, clave);
    editarMeta(tipo, clave, m.id, null, base);
    setHoja(false);
    aviso({ titulo: 'Meta borrada', sub: m.texto, deshacer: () => devolverPeriodo(tipo, clave, antes) });
  };
  const paso = pasoMeta(m);
  const dec = entero(meta) && entero(paso) ? 0 : 1;
  return (
    <div className="mt-fila" style={color ? { ['--area' as string]: color } : undefined}>
      {tarea ? (
        <div className="mt-fila-tarea">
          <Casilla marcada={hecha} etiqueta={m.texto} nota={nota} area={color} onCambio={() => sumarHechoMeta(tipo, clave, m, hecha ? -1 : 1, base)} />
          <Boton soloIcono tamano="s" variante="fantasma" icono="opciones" etiqueta={`Opciones de ${m.texto}`} onClick={() => setHoja(true)} />
        </div>
      ) : (
        <div className="mt-fila-cuenta">
          <button type="button" className="mt-cuerpo" onClick={() => setHoja(true)} aria-label={`${m.texto}: ${fmt(v)} de ${fmt(meta)}${m.unidad ? ` ${m.unidad}` : ''}. Opciones`}>
            <span className="mt-titulo">{color && <i className="area-punto" />}{m.texto}</span>
            {nota && <small>{nota}</small>}
          </button>
          <span className="mt-valor t-dato" aria-hidden="true">{fmt(v)}/{fmt(meta)}{m.unidad === 'h' ? ' h' : ''}</span>
          {auto ? <span className="t-rotulo mt-auto" title="Se suma solo">auto</span>
            : <Boton soloIcono variante="secundario" icono="mas" etiqueta={`Sumar ${fmt(pasoMeta(m))} a ${m.texto}`} onClick={mas} />}
          <div className="mt-barra"><Barra valor={v} max={meta} nombre={`${m.texto}: ${fmt(v)} de ${fmt(meta)}`} area={color} /></div>
        </div>
      )}
      <Hoja abierta={hoja} onCerrar={() => setHoja(false)} titulo={m.texto}>
        <div className="mt-hoja">
          <p className="t-nota">{[m.rama ? RAMA_NOMBRE[m.rama] : m.area ? AREAS[m.area].name : null, ORIGEN[m.origen], m.nota].filter(Boolean).join(' · ')}</p>
          {!tarea && !auto && <p className="t-cuerpo">Llevás {fmt(v)} de {fmt(meta)}{m.unidad ? ` ${m.unidad}` : ''}.</p>}
          {!tarea && (
            <Contador etiqueta={`Llegar a${m.unidad ? ` (${m.unidad})` : ''}`} valor={meta} min={0.5} paso={paso} decimales={dec} unidad={m.unidad} onCambio={(n) => { if (n > 0 && n !== meta) editarMeta(tipo, clave, m.id, { meta: n }, base); }} />
          )}
          <Boton variante="peligro" icono="borrar" onClick={borrar}>Borrar la meta</Boton>
        </div>
      </Hoja>
    </div>
  );
}

// ——— Una meta tuya ———

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Una meta propia: casilla si es una tarea, "+" si es un contador, los pasos que se tildan si tiene submetas y la tira L M X J V S D
 * si se marca día por día. Su hoja agrega o saca submetas y la borra (con "Deshacer").
 */
export function FilaMetaPropia({ g, date, nota, valorTexto }: { g: Goal; date: string; nota?: string; valorTexto?: string }) {
  const study = useStore((s) => s.study);
  const days = useStore((s) => s.days);
  const train = useStore((s) => s.train);
  const [hoja, setHoja] = useState(false);
  const [sub, setSub] = useState('');
  const v = valueOf(g, date, { study, days, train });
  const manual = !g.auto;
  const hecha = v >= g.target;
  const corr = g.auto?.kind === 'correr' ? runWeek(train.runs, date) : null;
  const texto = nota ?? (corr && corr.n ? `${corr.min} min${corr.km ? ` · ${fmt(corr.km)} km` : ''} esta semana` : undefined);
  const conSubs = !!g.subs?.length;
  const porDia = !!g.daily && manual;
  const hechas = new Set(g.subDone?.[periodKey(g.horizon, date)] ?? []);
  const lunes = periodKey('semana', date);
  const hoy = date;
  const color = colorArea(g.area);
  const unidad = g.unit === 'h' || g.unit === 'kg' ? ` ${g.unit}` : '';
  const valor = valorTexto ?? `${fmt(v)}/${g.target}${unidad}`;
  const nombreValor = `${fmt(v)} de ${g.target}${g.unit ? ` ${g.unit}` : ''}`;
  const posicion = () => getState().goals.goals.findIndex((x) => x.id === g.id);
  const borrar = () => {
    const antes = getState().goals.goals.find((x) => x.id === g.id);
    const pos = posicion();
    deleteGoal(g.id);
    setHoja(false);
    if (antes) aviso({ titulo: 'Meta borrada', sub: g.title, deshacer: () => devolverMeta(antes, pos) });
  };
  const quitarSub = (id: string, t: string) => {
    const antes = getState().goals.goals.find((x) => x.id === g.id);
    const pos = posicion();
    removeSub(g.id, date, id);
    if (antes) aviso({ titulo: 'Submeta quitada', sub: t, deshacer: () => devolverMeta(antes, pos) });
  };
  const agregarSub = () => { if (!sub.trim()) return; addSub(g.id, date, sub.trim()); setSub(''); };
  const cabeza = (
    <button type="button" className="mt-cuerpo" onClick={() => setHoja(true)} aria-label={`${g.title}: ${nombreValor}. Opciones`}>
      <span className="mt-titulo"><i className="area-punto" />{g.title}</span>
      {texto && <small>{texto}</small>}
    </button>
  );
  return (
    <div className="mt-fila" style={{ ['--area' as string]: color }}>
      {conSubs || porDia ? (
        <>
          <div className="mt-fila-cuenta sin-control">
            {cabeza}
            <span className="mt-valor t-dato" aria-hidden="true">{valor}</span>
            <div className="mt-barra"><Barra valor={v} max={g.target} nombre={`${g.title}: ${nombreValor}`} area={color} /></div>
          </div>
          {conSubs && (
            <div className="mt-subs" role="group" aria-label={`Submetas de ${g.title}`}>
              {g.subs!.map((x) => <Casilla key={x.id} marcada={hechas.has(x.id)} etiqueta={x.t} festejo={false} onCambio={() => toggleSub(g.id, date, x.id)} />)}
            </div>
          )}
          {porDia && (
            <div className="mt-dias" role="group" aria-label={`Días de ${g.title}`}>
              {DIAS.map((l, i) => {
                const d = addDays(lunes, i);
                const on = !!g.marks?.includes(d);
                return (
                  <button key={d} type="button" aria-pressed={on} disabled={d > hoy} className={`mt-dia${d === hoy ? ' hoy' : ''}`} aria-label={`${l} ${Number(d.slice(8))}: ${on ? 'hecho' : 'sin marcar'}`} onClick={() => toggleMark(g.id, d)}>
                    <span className="t-rotulo">{l}</span>
                    <i aria-hidden="true">{on && <Icono nombre="tilde" lado={16} />}</i>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : manual && g.type === 'tarea' ? (
        <div className="mt-fila-tarea">
          <Casilla marcada={hecha} etiqueta={g.title} nota={texto} area={color} onCambio={() => toggleGoal(g.id, date)} />
          <Boton soloIcono tamano="s" variante="fantasma" icono="opciones" etiqueta={`Opciones de ${g.title}`} onClick={() => setHoja(true)} />
        </div>
      ) : (
        <div className="mt-fila-cuenta">
          {cabeza}
          <span className="mt-valor t-dato" aria-hidden="true">{valor}</span>
          {manual ? <Boton soloIcono variante="secundario" icono="mas" etiqueta={`Sumar ${stepOf(g)} a ${g.title}`} onClick={() => addProgress(g.id, date, stepOf(g))} />
            : g.auto?.kind === 'correr' ? <Boton soloIcono variante="secundario" icono="mas" etiqueta="Registrar una corrida" onClick={() => abrirCorrida(date)} />
              : <span className="t-rotulo mt-auto" title="Se suma solo">auto</span>}
          <div className="mt-barra"><Barra valor={v} max={g.target} nombre={`${g.title}: ${nombreValor}`} area={color} /></div>
        </div>
      )}
      <Hoja abierta={hoja} onCerrar={() => setHoja(false)} titulo={g.title}>
        <div className="mt-hoja">
          <p className="t-nota">{[g.rama ? RAMA_NOMBRE[g.rama] : g.group ?? AREAS[g.area].name, g.auto ? 'se suma sola' : 'tuya'].join(' · ')}{g.note ? ` · ${g.note}` : ''}</p>
          {conSubs && (
            <div className="capa-1 pt-check">
              {g.subs!.map((x) => (
                <div key={x.id} className="pt-meta-fila">
                  <Casilla marcada={hechas.has(x.id)} etiqueta={x.t} festejo={false} onCambio={() => toggleSub(g.id, date, x.id)} />
                  <Boton soloIcono tamano="s" variante="fantasma" icono="borrar" etiqueta={`Quitar la submeta ${x.t}`} onClick={() => quitarSub(x.id, x.t)} />
                </div>
              ))}
            </div>
          )}
          {aceptaSubs(g) && (
            <>
              <CampoTexto etiqueta={conSubs ? 'Otra submeta' : 'Submeta'} valor={sub} onCambio={setSub} placeholder="Cocinar en casa" nota={conSubs ? undefined : 'Pasos más chicos que se tildan dentro de la meta.'} />
              <Boton variante="secundario" icono="mas" deshabilitado={!sub.trim()} onClick={agregarSub}>Agregar submeta</Boton>
            </>
          )}
          <Boton variante="peligro" icono="borrar" onClick={borrar}>Borrar la meta</Boton>
        </div>
      </Hoja>
    </div>
  );
}

// ——— Una meta fija del plan (bimestre y año) ———

/** Una meta por rama que viene del plan: se puede reescribir (vacío vuelve al texto del plan). Tocarla abre su hoja. */
export function FilaFija({ rama, clave, titulo, sub, lado, avance, de }: { rama: string; clave: string; titulo: string; sub?: string; lado: string; avance: number; de: 'bimestre' | 'año' }) {
  const [hoja, setHoja] = useState(false);
  const editada = useStore((s) => s.plan.editadas[clave]);
  const color = colorRama(rama as never);
  const nombre = RAMA_NOMBRE[rama as keyof typeof RAMA_NOMBRE] ?? rama;
  const volver = () => {
    const antes = editada;
    editarMetaFija(clave, '');
    if (antes) aviso({ titulo: 'Volvió el texto del plan', sub: nombre, deshacer: () => editarMetaFija(clave, antes) });
  };
  return (
    <div className="mt-fila" style={{ ['--area' as string]: color }}>
      <div className="mt-fila-cuenta sin-control">
        <button type="button" className="mt-cuerpo" onClick={() => setHoja(true)} aria-label={`${nombre}: ${titulo}. ${lado}. Cambiar`}>
          <span className="mt-titulo"><i className="area-punto" />{nombre}</span>
          <span className="mt-detalle t-cuerpo">{titular(titulo)}</span>
        </button>
        <span className="mt-valor t-dato" aria-hidden="true">{lado}</span>
        <div className="mt-barra"><Barra valor={avance} max={1} nombre={`${nombre}: ${Math.round(avance * 100)} %`} area={color} /></div>
      </div>
      <Hoja abierta={hoja} onCerrar={() => setHoja(false)} titulo={nombre}>
        <div className="mt-hoja">
          <p className="t-nota">{sub ?? `Meta del ${de}`} · {lado}</p>
          <CampoAlSalir etiqueta={`Meta del ${de}`} valor={titulo} guardar={(v) => editarMetaFija(clave, v)} nota="Si lo dejás vacío vuelve al texto del plan." multilinea />
          {editada && <Boton variante="secundario" icono="deshacer" onClick={volver}>Volver al texto del plan</Boton>}
        </div>
      </Hoja>
    </div>
  );
}

// ——— Hitos, mapa de proyectos, stand-by ———

/** Los hitos de las ramas que caen en el período, con su casilla de hecho. Con alguno vencido, la fila lo dice. */
export function HitosPeriodo({ desde, hasta, date }: { desde: string; hasta: string; date: string }) {
  const plan = useStore((s) => s.plan);
  const t0 = useStore((s) => s.settings?.startDate);
  const hs = hitosEntre(date, desde, hasta, plan.hitos ?? {}, t0);
  if (!hs.length) return null;
  const hechos = hs.filter((h) => h.estado === 'hecho').length;
  const vencidos = hs.filter((h) => h.estado === 'vencido').length;
  return (
    <FilaHoja icono="meta" titulo="Hitos del período" nota={vencidos ? `${vencidos} ${vencidos === 1 ? 'vencido' : 'vencidos'}` : undefined} valor={hechasDe(hechos, hs.length)} hecho={hechos === hs.length} tituloHoja="Hitos del período">
      <div className="capa-1 pt-check">
        {hs.map((h) => (
          <div key={h.id} className="mt-hito">
            <Casilla marcada={h.estado === 'hecho'} etiqueta={h.texto} area={h.rama === 'main' ? undefined : colorRama(h.rama)} festejo={false}
              nota={`${h.rama === 'main' ? 'Trazo' : RAMA_NOMBRE[h.rama as keyof typeof RAMA_NOMBRE] ?? h.rama} · ${dm(h.fecha)}${h.tipo === 'grande' ? ' · hito grande' : ''}${h.estado === 'vencido' ? ' · vencido' : ''}${h.rama !== 'main' && h.rama !== 'clipping' && enPausa(plan, h.rama, h.fecha) ? ' · stand-by' : ''}`}
              onCambio={() => marcarHito(h.id, h.estado === 'hecho' ? null : date)} />
            {h.propuesta && <Boton tamano="s" variante="fantasma" icono="calendario" onClick={() => moverHito(h.id, h.propuesta!)}>Mover al {dm(h.propuesta)}</Boton>}
          </div>
        ))}
      </div>
    </FilaHoja>
  );
}

/** La meta "Mapa de proyectos del portfolio": Trazo guarda la meta y sus 4 pasos; el diseño lo hacés vos. */
export function MapaPortfolio() {
  const pasos = useStore((s) => s.plan.mapaPortfolio) ?? {};
  const n = PASOS_MAPA.filter(([k]) => pasos[k]).length;
  return (
    <FilaHoja icono="mapa" titulo="Mapa de proyectos del portfolio" nota="Programación" valor={hechasDe(n, PASOS_MAPA.length)} hecho={n === PASOS_MAPA.length} tituloHoja="Mapa de proyectos">
      <Lista items={PASOS_MAPA.map(([k, t]) => ({ clave: k, etiqueta: t, marcada: !!pasos[k] }))} onCambio={togglePasoMapa} area={colorRama('programacion')} />
      <p className="t-nota pt-pie">Cada proyecto que cierra actualiza su nodo: estado, tecnologías y qué reutiliza.</p>
    </FilaHoja>
  );
}

/** "En stand-by desde el 12 nov: Handyx" debajo de los contadores, para que no parezca que se perdieron. */
export function EnStandBy({ date }: { date: string }) {
  const plan = useStore((s) => s.plan);
  const ps = (plan.pausas ?? []).filter((p) => p.desde <= date && (!p.hasta || p.hasta > date));
  if (!ps.length) return null;
  return <Fila icono="pausa" titulo={`En stand-by desde el ${dm(ps[0].desde)}`} nota={`${ps.map((p) => (p.objetivo === 'ventas' ? 'Ventas de Eclipse' : RAMA_NOMBRE[p.objetivo as keyof typeof RAMA_NOMBRE] ?? p.objetivo)).join(' y ')} · sus metas quedan guardadas`} href="#/metas/sprint" />;
}
