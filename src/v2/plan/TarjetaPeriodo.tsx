/**
 * Trazo 2.0 · la tarjeta de un período (tanda 2.2). Una sola pieza para todo el plan, de la etapa al lote, en dos tamaños:
 * el héroe (anillo del trabajo, la barra de ritmo con la marca del tiempo, la frase de cómo va y sus datos) y la fila (un anillo
 * chico, o la casilla si se marca a mano, el nombre, las fechas y el estado). Reemplaza las dos barras finas de la 1.0.
 */
import type { CSSProperties, ReactNode } from 'react';
import { lanzamientoDe } from '../../data/fondo';
import { puedePublicar } from '../../data/iman';
import { accionDe, bloqueDe } from '../../data/periodos-plan';
import type { PeriodoMedido } from '../../data/periodos';
import { PLAN_EXT } from '../../data/plan-extendido';
import { fichaV7 } from '../../data/proyectos-v7';
import { marcarHito, publicarVersion } from '../../state/plan';
import { useStore } from '../../state/store';
import { hrefPeriodo } from '../../ui/PeriodoTarjeta';
import { Icono } from '../iconos';
import { aviso } from '../kit/capas';
import { Boton } from '../kit/controles';
import { Anillo, Estado, Ritmo, Tarjeta } from '../kit/superficies';
import { festejar, nombreTransicion } from '../movimiento/movimiento';
import { ESTADOS } from '../reglas';
import { datosDe, esNoticia, frase, partesNombre, rango } from './datos';

const AREA_TIPO: Record<string, string> = { proyecto: 'var(--a-ing)', cert: 'var(--a-ing)', ventana: 'var(--a-economia)', ingles: 'var(--a-idi)', busqueda: 'var(--a-rutina)', sumas: 'var(--a-ing)' };

/** El color del área de un período: el de su rama (o el de su pista, en lo de fondo); etapas y fases van en tinta. */
export function areaDe(p: Pick<PeriodoMedido, 'id' | 'nivel' | 'track'>): string {
  if (p.track === 'secundaria') return 'var(--a-handyx)';
  if (p.track === 'comercial') return 'var(--a-eclipse)';
  if (p.nivel === 'etapa' || p.nivel === 'fase') return 'var(--texto)';
  const tipo = PLAN_EXT.bloques.find((b) => b.id === bloqueDe(p.id))?.tipo;
  return (tipo && AREA_TIPO[tipo]) ?? 'var(--texto-2)';
}

/** Lo que se marca a mano en un período: las hojas (lotes, hitos, certs) y las versiones (publicada). Lo de fondo, no. */
export function useAccion(p: PeriodoMedido, hoy: string) {
  const plan = useStore((s) => s.plan);
  const accion = p.track && p.track !== 'principal' ? null : !p.hijos?.length || p.nivel === 'version' ? accionDe(p.id) : null;
  const hecho = p.estado === 'hecho';
  // v12.2: el lanzamiento no se marca publicado sin el Imán completo (las versiones de antes, sí).
  const gate = accion?.tipo === 'version' && !hecho
    ? puedePublicar({ version: accion.version, lanzamiento: lanzamientoDe(fichaV7(accion.proyecto)?.versiones ?? [], plan.fondo?.[accion.proyecto]?.lanzamiento), iman: plan.iman?.[accion.proyecto] })
    : null;
  const etiqueta = accion?.tipo === 'version' ? (hecho ? 'Publicada' : 'Marcar publicada') : hecho ? 'Hecho' : 'Marcar hecho';
  /** Marca o desmarca; devuelve false si el lanzamiento todavía no puede publicarse (falta el Imán). */
  const tildar = (el?: HTMLElement | null) => {
    if (!accion) return true;
    if (accion.tipo === 'version' && gate && !gate.ok) return false;
    if (!hecho) festejar(el ?? null);
    if (accion.tipo === 'version') publicarVersion(accion.proyecto, accion.version, hecho ? null : hoy);
    else marcarHito(accion.clave, hecho ? null : hoy);
    if (!hecho) {
      const deshacer = () => (accion.tipo === 'version' ? publicarVersion(accion.proyecto, accion.version, null) : marcarHito(accion.clave, null));
      aviso({ titulo: accion.tipo === 'version' ? `${p.nombre}: publicada` : `${p.nombre}: hecho`, tono: 'hecho', deshacer });
    }
    return true;
  };
  return { accion, hecho, gate, etiqueta, tildar, iman: accion?.tipo === 'version' ? `#/metas/iman/${accion.proyecto}` : undefined };
}

/** El estado en chico, para las filas: ícono y palabra en el color del texto (la forma grande es la píldora). */
function EstadoChico({ p }: { p: PeriodoMedido }) {
  const e = ESTADOS[p.estado];
  return <span className={`tp-estado ${e.tono}`}><Icono nombre={e.icono} lado={14} />{e.palabra}</span>;
}

/** La barra de ritmo en chico: el trabajo como barra y el tiempo como una raya. Decorativa: la fila se lee entera. */
function RitmoMini({ p }: { p: PeriodoMedido }) {
  return (
    <span className={`tp-mini${p.estado === 'hecho' ? ' completo' : ''}`} aria-hidden="true">
      <i className="tp-mini-hecho" style={{ width: `${p.trabajo * 100}%` }} />
      {p.estado !== 'proximo' && p.estado !== 'hecho' && <i className="tp-mini-tiempo" style={{ left: `${p.tiempo * 100}%` }} />}
    </span>
  );
}

interface Props {
  p: PeriodoMedido;
  hoy: string;
  /** El nombre de la transición compartida (para que la tarjeta crezca hasta su pantalla). Vacío: sin nombre. */
  vt?: string;
  /** A dónde lleva. Por defecto, a su pantalla si tiene hijos. */
  href?: string | null;
  /** Solo en el héroe: mostrar el nombre (en la pantalla del período, el nombre ya es el título). */
  conNombre?: boolean;
  /** Solo en el héroe: lo de abajo (acciones). */
  pie?: ReactNode;
  /** Solo en el héroe: el límite y las horas (en el centro del Plan no van: están en su pantalla). */
  conDatos?: boolean;
}

/** El héroe: la tarjeta grande de un período. */
export function HeroePeriodo({ p, hoy, vt, href, conNombre = true, pie, conDatos = true }: Props) {
  const area = areaDe(p);
  const pct = Math.round(p.trabajo * 100);
  const estilo = { viewTransitionName: vt || undefined } as CSSProperties;
  const cuerpo = (
    <>
      <div className="tp-cabeza">
        <span className="t-rotulo">{partesNombre(p).prefijo} · {rango(p.inicio, p.fin, hoy)}{p.aConfirmar ? ' · a confirmar' : ''}</span>
        <Estado estado={p.estado} />
      </div>
      <div className="tp-centro">
        <Anillo nombre={`${p.nombre}: trabajo hecho`} valor={p.trabajo} tamano={104} area={area} etiqueta={`${pct} %`} sub="hecho" />
        <div className="tp-centro-texto">
          {conNombre && <b className="t-seccion">{p.nombre}</b>}
          {conDatos && <dl className="tp-datos">{datosDe(p, hoy).map((d) => <div key={d.etiqueta}><dt className="t-rotulo">{d.etiqueta}</dt><dd className="t-dato">{d.valor}</dd></div>)}</dl>}
        </div>
      </div>
      <Ritmo nombre={`Ritmo de ${p.nombre}`} tiempo={p.tiempo} trabajo={p.trabajo} area={area} frase={frase(p, hoy)} pie="tiempo" />
    </>
  );
  return (
    <div className="tp-heroe" style={estilo}>
      {href ? <Tarjeta heroe area={area} href={href} etiqueta={p.nombre} className="tp-heroe-tarjeta">{cuerpo}</Tarjeta>
        : <Tarjeta heroe area={area} etiqueta={p.nombre} className="tp-heroe-tarjeta">{cuerpo}{pie}</Tarjeta>}
      {href && pie}
    </div>
  );
}

/** La fila: un período en una lista. Con casilla si se marca a mano; con anillo chico si es la suma de sus hijos. */
export function FilaPeriodo({ p, hoy, vt, href }: Props) {
  const a = useAccion(p, hoy);
  const destino = href === undefined ? (p.hijos?.length ? hrefPeriodo(p.id) : null) : href;
  const area = areaDe(p);
  const estilo = { ['--area' as string]: area, viewTransitionName: vt || undefined } as CSSProperties;
  const texto = (
    <>
      <span className="tp-fila-texto">
        <b>{p.nombre}</b>
        <small><span className="t-dato">{rango(p.inicio, p.fin, hoy)}</span>{esNoticia(p.estado) && <EstadoChico p={p} />}</small>
        <RitmoMini p={p} />
      </span>
      {destino && <Icono nombre="siguiente" lado={18} className="icono s-chevron" />}
    </>
  );
  const marca = a.accion ? (
    <button type="button" role="checkbox" aria-checked={a.hecho} className={`tp-casilla${a.hecho ? ' hecha' : ''}`}
      aria-label={`${p.nombre}: ${a.hecho ? (a.accion.tipo === 'version' ? 'publicada' : 'hecho') : a.etiqueta.toLowerCase()}`}
      onClick={(e) => { if (!a.tildar(e.currentTarget)) aviso({ titulo: 'Falta el Imán', sub: `Para publicar el lanzamiento faltan ${a.gate!.faltan.length} puntos.`, tono: 'atencion', accion: { etiqueta: 'Ver', run: () => { location.hash = a.iman!; } } }); }}>
      <Icono nombre="tilde" lado={16} />
    </button>
  ) : <span className="tp-anillo"><Anillo nombre={`${p.nombre}: trabajo hecho`} valor={p.trabajo} tamano={40} grosor={5} area={area} etiqueta={<span className="tp-anillo-n">{Math.round(p.trabajo * 100)}</span>} /></span>;
  return (
    <div className={`tp-fila ${p.estado}`} style={estilo}>
      {marca}
      {destino ? <a className="tp-fila-link" href={destino} data-transicion="zoom-in">{texto}</a> : <div className="tp-fila-link">{texto}</div>}
    </div>
  );
}

/** Un nombre de transición por período, una sola vez por pantalla (si dos elementos lo comparten, el navegador no anima). */
export function usarNombres() {
  const vistos = new Set<string>();
  return (id: string) => {
    if (vistos.has(id)) return '';
    vistos.add(id);
    return nombreTransicion(id);
  };
}
