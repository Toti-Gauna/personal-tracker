/**
 * v12.1 · #/metas/periodos: las metas como períodos. Arriba lo activo ahora; después P0 (sus metas de siempre, en el formato viejo),
 * las 4 etapas con sus fases y la semana. #/metas/periodos/<id> baja un nivel: la tarjeta del período, lo de la fase (salida,
 * mercado y roles), la sugerencia de correr lo que sigue si va atrasado y las tarjetas de sus hijos.
 */
import { useMemo, useState } from 'react';
import { fijasDeReservas } from '../data/certs-v12';
import { HABITOS, tocaHabito } from '../data/habitos';
import { corrimientoDeFondo, finProyectado, recorrer, sugerirCorrimiento, type PeriodoMedido } from '../data/periodos';
import { bloqueDe, secuenciaPlan } from '../data/periodos-plan';
import { PLAN_EXT } from '../data/plan-extendido';
import { tramoActivo } from '../data/plan';
import { RAMA_COLOR } from '../data/ramas';
import { addDays } from '../data/time';
import type { DayLog } from '../data/types';
import { confirmarCorrimiento, deshacerCorrimiento } from '../state/plan';
import { AhoraPlan } from '../ui/AhoraPlan';
import { Casilla } from '../ui/Casilla';
import { PeriodoTarjeta, fp, hrefPeriodo } from '../ui/PeriodoTarjeta';
import { usePeriodos } from '../ui/usePeriodos';
import { medir } from '../data/periodos';
import { periodosComerciales, periodosSecundarias } from '../data/fondo';
import { V122 } from '../data/v12-2';
import { DetalleProyecto } from '../ui/DetalleProyecto';
import { Plegable } from '../ui/Plegable';
import { useStore } from '../state/store';
import '../styles/plan.css';
import '../styles/etapas.css';
import '../styles/periodos.css';

const DIA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

/** Los ancestros de un período (de la etapa para abajo) y el período. */
function camino(raices: PeriodoMedido[], id: string): PeriodoMedido[] {
  for (const r of raices) {
    if (r.id === id) return [r];
    const sub = r.hijos ? camino(r.hijos, id) : [];
    if (sub.length) return [r, ...sub];
  }
  return [];
}

export function Periodos({ day, id }: { day: DayLog; id?: string }) {
  const hoy = day.date;
  const { arbol, cal, plan } = usePeriodos(hoy);
  const ruta = id ? camino(arbol, id) : [];
  const p = ruta[ruta.length - 1];
  return (
    <main className="pantalla et-pag pd-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar">
        <a className="volver" href={ruta.length > 1 ? hrefPeriodo(ruta[ruta.length - 2].id) : id ? '#/metas/periodos' : '#/metas'}>{ruta.length > 1 ? ruta[ruta.length - 2].nombre : id ? 'Períodos' : 'Ruta'}</a>
        <a className="mono sub" href="#/metas/linea">Línea de tiempo →</a>
      </div>
      {!id && <Raiz hoy={hoy} arbol={arbol} day={day} />}
      {id && !p && <p className="sub">No hay un período con ese nombre.</p>}
      {p && (
        <>
          <nav className="mono sub" aria-label="Dónde estás">{ruta.map((x, i) => <span key={x.id}>{i ? ' › ' : ''}{i < ruta.length - 1 ? <a href={hrefPeriodo(x.id)}>{x.nombre}</a> : x.nombre}</span>)}</nav>
          <header><h1 className="titulo">{p.nombre}</h1></header>
          <PeriodoTarjeta p={p} hoy={hoy} enlace={false} />
          {p.nivel === 'fase' && <Fase id={p.id} />}
          {p.nivel === 'bloque' && <Enlaces id={p.id} />}
          {p.nivel === 'bloque' && V122.detalle[p.id] && (
            <>
              <a className="fila-link" href={`#/metas/fondo/${p.id}`}>Repo, lanzamiento e Imán <span aria-hidden="true">→</span></a>
              <Plegable id={`detalle:${p.id}`} titulo="Detalle del proyecto" resumen={V122.detalle[p.id].puesto ?? ''}><DetalleProyecto id={p.id} /></Plegable>
            </>
          )}
          {p.nivel === 'bloque' && (p.estado === 'atrasado' || p.estado === 'vencido') && <Sugerencia p={p} hoy={hoy} cal={cal} plan={plan} />}
          {p.nivel === 'bloque' && plan.corrimientos?.[p.id] && (
            <p className="sub">Corrido a {fp(plan.corrimientos[p.id].inicio)} – {fp(plan.corrimientos[p.id].fin)} (lo confirmaste el {fp(plan.corrimientos[p.id].confirmado)}). <button className="subrayado" onClick={() => deshacerCorrimiento([p.id])}>Volver a las fechas del plan</button></p>
          )}
          {p.hijos?.length ? (
            <>
              <span className="etiqueta">{p.hijos.length} {p.nivel === 'etapa' ? 'fases' : p.nivel === 'fase' ? 'bloques' : p.hijos[0].nivel === 'lote' ? 'lotes' : p.hijos[0].nivel === 'cert' ? 'certificaciones' : p.hijos[0].nivel === 'hito' ? 'hitos' : 'versiones'}</span>
              <ul className="pd-lista">{p.hijos.map((h) => <li key={h.id}><PeriodoTarjeta p={h} hoy={hoy} /></li>)}</ul>
            </>
          ) : null}
        </>
      )}
    </main>
  );
}

const PISTAS = [['todas', 'Todas'], ['principal', 'Principal'], ['secundaria', 'Secundaria'], ['comercial', 'Comercial']] as const;

function Raiz({ hoy, arbol, day }: { hoy: string; arbol: PeriodoMedido[]; day: DayLog }) {
  const actual = arbol.find((e) => e.inicio <= hoy && hoy <= e.fin) ?? arbol[0];
  const plan = useStore((s) => s.plan);
  const [pista, setPista] = useState<(typeof PISTAS)[number][0]>('todas');
  const fondo = useMemo(() => ({ sec: periodosSecundarias(plan).map((p) => medir(p, hoy)), com: periodosComerciales(plan).map((p) => medir(p, hoy)) }), [plan, hoy]);
  // Los comerciales: el que corre, los próximos 3 y los ya pasados sin publicar.
  const comVisibles = fondo.com.filter((c) => (c.inicio <= hoy && hoy <= c.fin) || (c.fin < hoy && c.estado !== 'hecho') || c.inicio > hoy).slice(0, pista === 'comercial' ? 23 : 4);
  return (
    <>
      <header>
        <h1 className="titulo">Períodos</h1>
        <p>Cada meta es un período: la barra de tiempo dice cuánto pasó y la de trabajo cuánto está hecho. Si algo se atrasa, Trazo sugiere correr lo que sigue y no cambia nada hasta que lo confirmes.</p>
      </header>
      <AhoraPlan hoy={hoy} arbol={arbol} day={day} />
      <a className="fila-link" href="#/metas/proyecto/P0">P0 · Constelación v1: tus metas de siempre <span aria-hidden="true">→</span></a>
      <a className="fila-link" href="#/metas/roadmap">El plan entero, con lo de fondo <span aria-hidden="true">→</span></a>
      <div className="pd-chips" role="radiogroup" aria-label="Pista">
        {PISTAS.map(([k, n]) => <button key={k} role="radio" aria-checked={pista === k} className="chip" onClick={() => setPista(k)}>{n}</button>)}
      </div>
      {(pista === 'todas' || pista === 'secundaria') && (
        <section aria-label="Pista secundaria">
          <span className="etiqueta">Secundaria · de fondo</span>
          <ul className="pd-lista">{fondo.sec.map((p) => <li key={p.id}><PeriodoTarjeta p={p} hoy={hoy} enlace={false} compacta /><a className="fila-link" href={`#/metas/fondo/${p.id}`}>{p.nombre} <span aria-hidden="true">→</span></a></li>)}</ul>
          <a className="fila-link" href="#/metas/pista/secundaria">La pista secundaria <span aria-hidden="true">→</span></a>
        </section>
      )}
      {(pista === 'todas' || pista === 'comercial') && (
        <section aria-label="Pista comercial">
          <span className="etiqueta">Comercial · de fondo</span>
          <ul className="pd-lista">{comVisibles.map((p) => <li key={p.id}><PeriodoTarjeta p={p} hoy={hoy} enlace={false} compacta /><a className="fila-link" href={`#/metas/fondo/${p.id}`}>{p.nombre} <span aria-hidden="true">→</span></a></li>)}</ul>
          <a className="fila-link" href="#/metas/pista/comercial">El pipeline de los 23 slots <span aria-hidden="true">→</span></a>
        </section>
      )}
      {(pista === 'todas' || pista === 'principal') && <>
      <span className="etiqueta">Las 4 etapas</span>
      <ul className="pd-lista">
        {arbol.map((e) => (
          <li key={e.id}>
            <PeriodoTarjeta p={e} hoy={hoy} />
            {e === actual && (
              <ul className="pd-lista" style={{ marginTop: 8, paddingLeft: 12 }}>
                {e.hijos!.map((f) => <li key={f.id}><PeriodoTarjeta p={f} hoy={hoy} compacta /></li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
      </>}
      <Semana hoy={hoy} arbol={arbol} />
    </>
  );
}

/** La semana de lunes a domingo: el bloque activo de cada día, lo que vence y los hábitos que tocan. */
function Semana({ hoy, arbol }: { hoy: string; arbol: PeriodoMedido[] }) {
  const lunes = addDays(hoy, -((new Date(`${hoy}T12:00:00`).getDay() + 6) % 7));
  const todos = useMemo(() => [...recorrer(arbol)].filter((p) => p.nivel !== 'etapa' && p.nivel !== 'fase'), [arbol]);
  return (
    <section aria-labelledby="pd-sem">
      <span className="etiqueta" id="pd-sem">Esta semana</span>
      <ul className="pd-semana">
        {Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).map((d, i) => {
          const vence = todos.filter((p) => p.estado !== 'hecho' && (p.fin === d || p.deadline === d));
          const t = tramoActivo(d);
          return (
            <li key={d} className={d === hoy ? 'hoy' : ''}>
              <b className="mono">{DIA[i]} {Number(d.slice(8))}</b>
              <span>
                {t.nombre}
                {vence.length > 0 && <small>Vence: {vence.map((p) => p.nombre).join(' · ')}</small>}
                <small>{HABITOS.filter((h) => tocaHabito(h, d)).map((h) => h.nombre.split(' (')[0]).join(' · ')}</small>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Fase({ id }: { id: string }) {
  const f = PLAN_EXT.fases?.find((x) => x.id === id);
  if (!f) return null;
  return (
    <section className="pd-fase" aria-label="La fase">
      <span className="etiqueta">Para cerrarla</span>
      <ul>{f.salida.map((s) => <li key={s}>{s}</li>)}</ul>
      <span className="etiqueta">Salís al mercado con{f.mercadoAConfirmar ? ' · a confirmar' : ''}</span>
      <p className="sub">{f.mercado.join(' · ')}</p>
      {f.roles?.length ? <><span className="etiqueta">Roles</span><p className="sub">{f.roles.join(' · ')}</p></> : null}
    </section>
  );
}

function Enlaces({ id }: { id: string }) {
  const b = PLAN_EXT.bloques.find((x) => x.id === id);
  if (!b) return null;
  return (
    <>
      <a className="fila-link" href={`#/metas/proyecto/${id}`}>La ficha de {b.nombre} <span aria-hidden="true">→</span></a>
      {b.tipo === 'ventana' && b.hitos?.length ? <a className="fila-link" href={`#/metas/ventana/${id}`}>Hitos de la ventana y cierre <span aria-hidden="true">→</span></a> : null}
      {b.certs?.map((c) => <a key={c.id} className="fila-link" href={`#/metas/cert/${c.id}`}>{c.nombre} <span aria-hidden="true">→</span></a>)}
    </>
  );
}

/** Correr lo que sigue: la sugerencia con fechas nuevas; elegís qué y lo confirmás. Las fechas fijas no se mueven. */
function Sugerencia({ p, hoy, cal, plan }: { p: PeriodoMedido; hoy: string; cal: ReturnType<typeof usePeriodos>['cal']; plan: ReturnType<typeof usePeriodos>['plan'] }) {
  const { sug, fondo } = useMemo(() => {
    const reservas = fijasDeReservas(plan);
    // v12.2: la secuencia con los absorbedores (consolidación, cierres, descansos) y las certs con examen reservado como fijas.
    const seq = secuenciaPlan(cal, reservas);
    const s = sugerirCorrimiento(seq, bloqueDe(p.id), finProyectado(p, hoy), [...(PLAN_EXT.capacidad?.fijas ?? []), ...reservas]);
    // Lo de fondo dentro de las ventanas corridas se corre con ellas.
    const items = [...V122.comerciales.map((c) => ({ id: c.id, nombre: `#${c.n} ${c.marca ?? 'a definir'}`, inicio: c.inicio, fin: c.fin })), ...V122.secundarias.flatMap((a) => a.versiones.map((v) => ({ id: `${a.id}:v${v.id}`, nombre: `${a.nombre} v${v.id}`, inicio: v.inicio, fin: v.fin })))];
    return { sug: s, fondo: corrimientoDeFondo(items, seq, s) };
  }, [cal, plan, p, hoy]);
  const [fuera, setFuera] = useState<string[]>([]);
  const [todos, setTodos] = useState(false);
  if (!sug.length) return null;
  const elegidos = sug.filter((c) => !fuera.includes(c.id));
  const ultimo = sug[sug.length - 1];
  const vistos = todos ? sug : sug.slice(0, 6);
  return (
    <section className="pd-sug" aria-labelledby="pd-sug-t">
      <b id="pd-sug-t">Va atrasado: al ritmo del plan termina el {fp(sug[0].nuevoFin)} ({sug[0].dias} días más)</b>
      <p className="sub">Sugerencia: correr lo que sigue{sug.length > 1 ? ` (${sug.length - 1} ${sug.length === 2 ? 'bloque' : 'bloques'}, hasta ${ultimo.nombre ?? ultimo.id} que termina el ${fp(ultimo.nuevoFin)})` : ''}. La pausa de diciembre y los exámenes reservados no se mueven. Nada cambia hasta que confirmes.</p>
      <ul>
        {vistos.map((c) => (
          <li key={c.id}>
            <Casilla checked={!fuera.includes(c.id)} label={`Correr ${c.nombre ?? c.id}`} onChange={() => setFuera((x) => (x.includes(c.id) ? x.filter((y) => y !== c.id) : [...x, c.id]))} />
            <span><b>{c.nombre ?? c.id}</b> · {fp(c.inicio)} – {fp(c.fin)} → <b>{fp(c.nuevoInicio)} – {fp(c.nuevoFin)}</b></span>
          </li>
        ))}
      </ul>
      {sug.length > vistos.length && <button className="subrayado" onClick={() => setTodos(true)}>Ver los {sug.length - vistos.length} siguientes</button>}
      {fondo.length > 0 && <p className="sub">De fondo se corre con su ventana: {fondo.map((c) => `${c.nombre} → ${fp(c.nuevoInicio)} – ${fp(c.nuevoFin)}`).join(' · ')}.</p>}
      <button className="btn-borde" disabled={!elegidos.length} onClick={() => confirmarCorrimiento([...elegidos, ...fondo], hoy)}>Confirmar {elegidos.length} {elegidos.length === 1 ? 'cambio' : 'cambios'}</button>
    </section>
  );
}
