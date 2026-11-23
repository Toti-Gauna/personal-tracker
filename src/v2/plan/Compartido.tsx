/**
 * Trazo 2.0 · lo que comparten las tres vistas del Plan (Ahora, Línea y Mapa): las pestañas para pasar de una a otra y la
 * hoja de un período, que es la misma tarjeta de siempre con un botón para entrar.
 */
import { useRef } from 'react';
import type { PeriodoMedido } from '../../data/periodos';
import { hrefPeriodo } from '../../ui/periodos';
import { Icono } from '../iconos';
import { Boton } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { HeroePeriodo } from './TarjetaPeriodo';

export type Lente = 'ahora' | 'linea' | 'mapa';

export function Lentes({ actual }: { actual: Lente }) {
  const a = (l: Lente) => (l === actual ? ('page' as const) : undefined);
  return (
    <nav className="pl-lentes" aria-label="Cómo ver el plan">
      <a href="#/metas" aria-current={a('ahora')} data-transicion="fundido"><Icono nombre="plan" lado={18} />Ahora</a>
      <a href="#/metas/linea" aria-current={a('linea')} data-transicion="fundido"><Icono nombre="linea" lado={18} />Línea</a>
      <a href="#/metas/constelacion" aria-current={a('mapa')} data-transicion="fundido"><Icono nombre="mapa" lado={18} />Mapa</a>
    </nav>
  );
}

/** A dónde lleva un período: a su pantalla del plan, o a su página de fondo si es una app secundaria o un showcase. */
export const destinoDe = (p: Pick<PeriodoMedido, 'id' | 'track'>) => (p.track && p.track !== 'principal' ? `#/metas/fondo/${p.id.split(':')[0]}` : hrefPeriodo(p.id));

/** La hoja de un período: cómo va, en la misma tarjeta que en el resto del plan, y "Abrir" para entrar. */
export function HojaPeriodo({ p, hoy, onCerrar }: { p: PeriodoMedido | null; hoy: string; onCerrar: () => void }) {
  const ultimo = useRef<PeriodoMedido | null>(null);
  if (p) ultimo.current = p;
  const x = p ?? ultimo.current; // mientras se cierra, sigue mostrando el último
  if (!x) return null;
  return (
    <Hoja abierta={!!p} onCerrar={onCerrar} titulo={x.nombre} pie={<Boton variante="primario" icono="siguiente" href={destinoDe(x)}>Abrir</Boton>}>
      <HeroePeriodo p={x} hoy={hoy} conNombre={false} />
    </Hoja>
  );
}
