/**
 * Trazo 2.0 · un período del plan (#/metas/periodos/<id>): el héroe con cómo va, lo que se marca a mano (el período, los
 * entregables de una versión, la salida de una fase), lo del bloque (ficha, certificaciones, Imán, herramientas), la sugerencia
 * de correr lo que sigue si se atrasó, y sus hijos como filas que crecen hasta su propia pantalla.
 */
import { useMemo, useState } from 'react';
import { fijasDeReservas } from '../../data/certs-v12';
import { herramientasDe } from '../../data/herramientas';
import { corrimientoDeFondo, finProyectado, type PeriodoMedido } from '../../data/periodos';
import { bloqueDe, secuenciaPlan } from '../../data/periodos-plan';
import { PLAN_EXT } from '../../data/plan-extendido';
import { sugerirCorrimiento } from '../../data/periodos';
import { V122 } from '../../data/v12-2';
import { confirmarCorrimiento, deshacerCorrimiento, marcarHito } from '../../state/plan';
import { useStore } from '../../state/store';
import { DetalleProyectoV2 } from '../proyecto/DetalleProyectoV2';
import { hrefPeriodo } from '../../ui/periodos';
import { usePeriodos } from '../../ui/usePeriodos';
import { aviso } from '../kit/capas';
import { Boton, Casilla } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { Escalonado } from '../movimiento/componentes';
import { camino, fecha, nombreCorto, partesNombre, plural } from './datos';
import { FilaPeriodo, HeroePeriodo, useAccion, usarNombres } from './TarjetaPeriodo';

const hechos = (p: PeriodoMedido) => p.hijos?.filter((h) => h.estado === 'hecho').length ?? 0;

const INFO = (
  <>
    <p className="t-cuerpo-l">Cada meta del plan es un período: tiene un inicio y un fin.</p>
    <p className="t-cuerpo">La barra es el trabajo hecho; la raya, cuánto tiempo pasó. Si la barra queda atrás de la raya, vas atrasado.</p>
    <p className="t-cuerpo">Un período con hijos (una fase, un bloque, una versión) avanza cuando avanzan ellos. Los lotes, los hitos y las versiones se marcan a mano.</p>
    <p className="t-cuerpo">Si un bloque se atrasa, Trazo sugiere correr lo que sigue. No cambia nada hasta que lo confirmes.</p>
  </>
);

export function Detalle({ id, hoy }: { id: string; hoy: string }) {
  const { arbol, cal, plan } = usePeriodos(hoy);
  const ruta = camino(arbol, id);
  const p = ruta[ruta.length - 1];
  const padre = ruta[ruta.length - 2];
  const vt = usarNombres();
  if (!p) {
    return (
      <Marco titulo="Plan" volver={{ href: '#/metas', nombre: 'Plan' }}>
        <Vacio ilustracion="buscar" titulo="No hay un período con ese nombre" texto="Puede que el plan haya cambiado." accion={<Boton variante="primario" href="#/metas">Ir al plan</Boton>} />
      </Marco>
    );
  }
  const corrido = p.nivel === 'bloque' ? plan.corrimientos?.[p.id] : undefined;
  return (
    <Marco className="pl" titulo={partesNombre(p).titulo} info={INFO}
      volver={{ href: padre ? hrefPeriodo(padre.id) : '#/metas', nombre: padre ? nombreCorto(padre) : 'Plan', transicion: 'zoom-out' }}
      // El padre ya está en "volver": el camino muestra lo de más arriba.
      migas={ruta.length > 2 ? ruta.slice(0, -2).map((x) => ({ nombre: nombreCorto(x), href: hrefPeriodo(x.id) })) : undefined}>
      <HeroePeriodo p={p} hoy={hoy} vt={vt(p.id)} conNombre={false} pie={<AccionHeroe p={p} hoy={hoy} />} />

      {p.nivel === 'bloque' && (p.estado === 'atrasado' || p.estado === 'vencido') && <Sugerencia p={p} hoy={hoy} cal={cal} plan={plan} />}
      {corrido && (
        <Tarjeta className="pl-corrido">
          <p className="t-cuerpo">Corrido al {fecha(corrido.inicio, hoy)} – {fecha(corrido.fin, hoy)}. Lo confirmaste el {fecha(corrido.confirmado, hoy)}.</p>
          <Boton tamano="s" variante="fantasma" icono="deshacer" onClick={() => deshacerCorrimiento([p.id])}>Volver a las fechas del plan</Boton>
        </Tarjeta>
      )}

      {p.checklist?.length ? <Entregables p={p} hoy={hoy} /> : null}
      {p.nivel === 'fase' && <Fase id={p.id} hoy={hoy} />}
      {p.hijos?.length ? (
        <Grupo titulo={plural(p.hijos[0].nivel, p.hijos.length)} extremo={hechos(p) ? <span className="t-rotulo">{hechos(p)} de {p.hijos.length} hechos</span> : undefined}>
          <Escalonado className="capa-1 pl-lista" clave={p.id}>
            {p.hijos.map((h) => <FilaPeriodo key={h.id} p={h} hoy={hoy} vt={vt(h.id)} />)}
          </Escalonado>
        </Grupo>
      ) : null}
      {p.nivel === 'bloque' && <DelBloque id={p.id} />}

    </Marco>
  );
}

/** Lo que se hace con el período mismo: marcarlo (o publicarlo), o ir al Imán si el lanzamiento todavía no se puede publicar. */
function AccionHeroe({ p, hoy }: { p: PeriodoMedido; hoy: string }) {
  const a = useAccion(p, hoy);
  if (!a.accion) return null;
  if (a.gate && !a.gate.ok) {
    return (
      <div className="pl-accion">
        <p className="t-nota">Es el lanzamiento: se publica con el Imán completo. {a.gate.faltan.length === 1 ? 'Falta 1 punto.' : `Faltan ${a.gate.faltan.length} puntos.`}</p>
        <Boton variante="primario" icono="iman" href={a.iman}>Completar el Imán</Boton>
      </div>
    );
  }
  return (
    <div className="pl-accion">
      {a.hecho
        ? <Boton variante="fantasma" icono="deshacer" onClick={() => a.tildar()}>{a.accion.tipo === 'version' ? 'Sacar de publicadas' : 'Marcar sin hacer'}</Boton>
        : <Boton variante="primario" icono="tilde" onClick={() => a.tildar(document.querySelector('.tp-heroe .s-anillo') as HTMLElement | null)}>{a.etiqueta}</Boton>}
    </div>
  );
}

/** Los entregables de una versión: cada uno se tilda y suma a su trabajo. */
function Entregables({ p, hoy }: { p: PeriodoMedido; hoy: string }) {
  const xs = p.checklist!;
  return (
    <Grupo titulo="Entregables" extremo={<span className="t-rotulo">{xs.filter((c) => c.hecho).length} de {xs.length}</span>}>
      <div className="capa-1 kt-lista pl-check">
        {xs.map((c) => <Casilla key={c.clave} marcada={c.hecho} etiqueta={c.texto} onCambio={() => marcarHito(c.clave, c.hecho ? null : hoy)} />)}
      </div>
    </Grupo>
  );
}

/** La fase: lo que la cierra, con qué salís al mercado y a qué roles apunta. */
function Fase({ id, hoy }: { id: string; hoy: string }) {
  const f = PLAN_EXT.fases?.find((x) => x.id === id);
  const hitos = useStore((s) => s.plan.hitos);
  if (!f) return null;
  const clave = (i: number) => `v12:${id}:salida:${i + 1}`;
  return (
    <>
      <Grupo titulo="Para cerrarla" extremo={<span className="t-rotulo">{f.salida.filter((_, i) => hitos[clave(i)]?.hecho).length} de {f.salida.length}</span>}>
        <div className="capa-1 kt-lista pl-check">
          {f.salida.map((s, i) => { const ok = !!hitos[clave(i)]?.hecho; return <Casilla key={s} marcada={ok} etiqueta={s} onCambio={() => marcarHito(clave(i), ok ? null : hoy)} />; })}
        </div>
      </Grupo>
      <Grupo titulo={f.mercadoAConfirmar ? 'Salís al mercado con · a confirmar' : 'Salís al mercado con'}>
        <div className="pl-chips">{f.mercado.map((m) => <span key={m} className="hy-chip">{m}</span>)}</div>
      </Grupo>
      {f.roles?.length ? (
        <Grupo titulo="Roles">
          <div className="pl-chips">{f.roles.map((r) => <span key={r} className="hy-chip">{r}</span>)}</div>
        </Grupo>
      ) : null}
    </>
  );
}

/** Lo que cuelga de un bloque: su ficha, la ventana de matemática, las certificaciones, el Imán y las herramientas. */
function DelBloque({ id }: { id: string }) {
  const b = PLAN_EXT.bloques.find((x) => x.id === id);
  const [detalle, setDetalle] = useState(false);
  if (!b) return null;
  const d = V122.detalle[id];
  const tools = herramientasDe(id);
  return (
    <Grupo titulo={`Más de ${b.nombre}`}>
      <div className="capa-1 s-lista">
        <Fila icono="documento" titulo="La ficha" nota="Qué se construye y cómo se prueba" href={`#/metas/proyecto/${id}`} />
        {b.tipo === 'ventana' && b.hitos?.length ? <Fila icono="matematica" titulo="Hitos de la ventana" nota="Y el cierre" href={`#/metas/ventana/${id}`} /> : null}
        {b.certs?.map((c) => <Fila key={c.id} icono="certificado" titulo={c.nombre} nota="Examen y simulacros" href={`#/metas/cert/${c.id}`} />)}
        {d && <Fila icono="iman" titulo="Repo, lanzamiento e Imán" href={`#/metas/fondo/${id}`} />}
        {tools.length > 0 && <Fila icono="paquete" titulo="Open source" nota={tools.map(({ h, v }) => `${h.nombre} ${v.id}`).join(' · ')} href="#/metas/open-source" />}
        {d && <Fila icono="info" titulo="Detalle del proyecto" nota={d.puesto} onClick={() => setDetalle(true)} />}
      </div>
      {d && <Hoja abierta={detalle} onCerrar={() => setDetalle(false)} titulo={b.nombre} alto="completa"><DetalleProyectoV2 id={id} /></Hoja>}
    </Grupo>
  );
}

/**
 * Correr lo que sigue: si el bloque va atrasado, Trazo calcula las fechas nuevas (la pausa de diciembre y los exámenes reservados
 * no se mueven; lo de fondo se corre con su ventana). Elegís qué y lo confirmás; se puede deshacer.
 */
function Sugerencia({ p, hoy, cal, plan }: { p: PeriodoMedido; hoy: string; cal: ReturnType<typeof usePeriodos>['cal']; plan: ReturnType<typeof usePeriodos>['plan'] }) {
  const { sug, fondo } = useMemo(() => {
    const reservas = fijasDeReservas(plan);
    const seq = secuenciaPlan(cal, reservas);
    const s = sugerirCorrimiento(seq, bloqueDe(p.id), finProyectado(p, hoy), [...(PLAN_EXT.capacidad?.fijas ?? []), ...reservas]);
    const items = [...V122.comerciales.map((c) => ({ id: c.id, nombre: `#${c.n} ${c.marca ?? 'a definir'}`, inicio: c.inicio, fin: c.fin })), ...V122.secundarias.flatMap((a) => a.versiones.map((v) => ({ id: `${a.id}:v${v.id}`, nombre: `${a.nombre} v${v.id}`, inicio: v.inicio, fin: v.fin })))];
    return { sug: s, fondo: corrimientoDeFondo(items, seq, s) };
  }, [cal, plan, p, hoy]);
  const [fuera, setFuera] = useState<string[]>([]);
  const [todos, setTodos] = useState(false);
  // Antes del return temprano: al confirmar, la lista se vacía y el componente tiene que llamar a los mismos hooks en cada render.
  const [abierta, setAbierta] = useState(false);
  if (!sug.length) return null;
  const elegidos = sug.filter((c) => !fuera.includes(c.id));
  const vistos = todos ? sug : sug.slice(0, 4);
  const confirmar = () => {
    const cs = [...elegidos, ...fondo];
    confirmarCorrimiento(cs, hoy);
    aviso({ titulo: elegidos.length === 1 ? 'Fecha corrida' : `${elegidos.length} fechas corridas`, sub: `${p.nombre} termina el ${fecha(sug[0].nuevoFin, hoy)}`, tono: 'hecho', deshacer: () => deshacerCorrimiento(cs.map((c) => c.id)) });
  };
  return (
    <>
      <div className="capa-1 s-lista pl-sug-fila">
        <Fila icono="calendario" titulo="Correr lo que sigue" nota={sug.length === 1 ? '1 cambio' : `${sug.length} cambios`} onClick={() => setAbierta(true)} />
      </div>
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Correr lo que sigue"
        pie={<Boton variante="primario" icono="calendario" deshabilitado={elegidos.length ? false : 'Elegí al menos uno.'} onClick={() => { confirmar(); setAbierta(false); }}>
          {elegidos.length === 1 ? 'Confirmar 1 cambio' : `Confirmar ${elegidos.length} cambios`}
        </Boton>}>
        <p className="t-cuerpo-l">A este ritmo, {p.nombre} termina el {fecha(sug[0].nuevoFin, hoy)} ({sug[0].dias === 1 ? '1 día' : `${sug[0].dias} días`} más).</p>
        <p className="t-nota">La pausa de diciembre y los exámenes reservados no se mueven. Nada cambia hasta que confirmes.</p>
        <div className="capa-2 kt-lista pl-sug-lista">
          {vistos.map((c) => (
            <Casilla key={c.id} festejo={false} marcada={!fuera.includes(c.id)} onCambio={() => setFuera((x) => (x.includes(c.id) ? x.filter((y) => y !== c.id) : [...x, c.id]))}
              etiqueta={c.nombre ?? c.id} nota={<span className="t-dato">{fecha(c.inicio, hoy)} – {fecha(c.fin, hoy)} → {fecha(c.nuevoInicio, hoy)} – {fecha(c.nuevoFin, hoy)}{c.absorbe ? ' · se achica' : ''}</span>} />
          ))}
        </div>
        {sug.length > vistos.length && <Boton tamano="s" variante="fantasma" icono="abajo" onClick={() => setTodos(true)}>Ver {sug.length - vistos.length} más</Boton>}
        {fondo.length > 0 && <p className="t-nota">De fondo se corre con su ventana: {fondo.map((c) => `${c.nombre} → ${fecha(c.nuevoInicio, hoy)}`).join(' · ')}.</p>}
      </Hoja>
    </>
  );
}
