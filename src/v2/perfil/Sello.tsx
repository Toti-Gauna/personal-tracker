/**
 * Trazo 2.0 · el sello: una pieza acuñada con la silueta de su grupo (moneda, hexágono, escudo o rosetón). El canto es metal del color
 * de su área; la cara, esmalte profundo de ese mismo color con rayos grabados; la marca, metal claro en relieve; y un brillo que la cruza. Bloqueado es la silueta vacía, con un anillo que se llena a
 * medida que te acercás. La versión grande (`SelloInclinable`) sigue al dedo o al mouse como una pieza que se inclina en la mano.
 * Es un dibujo: el nombre lo dice quien lo usa.
 */
import { useId, useRef, type CSSProperties, type PointerEvent } from 'react';
import type { SealDef, SealGroup } from '../../data/profile';
import { reducido } from '../movimiento/movimiento';
import { CONTORNO, ESCALA_CARA, FORMA_DE_GRUPO, type Forma } from './formas';
import { colorDeSello } from './datos';
import './perfil.css';

export interface PropsSello {
  marca: string;
  color: string;
  grupo?: SealGroup;
  ganado: boolean;
  lado?: number;
  nombre?: string;
  /** Orden de aparición: el brillo pasa escalonado. */
  i?: number;
  /** De 0 a 1, para el sello bloqueado: cuánto del camino llevás. */
  progreso?: number;
  className?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Los rayos grabados en el esmalte: veinte cuñas que salen del centro, una sí y una no. */
const RAYOS = Array.from({ length: 20 }, (_, k) => {
  const a = ((k * 18 - 90) * Math.PI) / 180;
  const b = ((k * 18 - 81) * Math.PI) / 180;
  return `M40 40L${r2(40 + 48 * Math.cos(a))} ${r2(40 + 48 * Math.sin(a))}L${r2(40 + 48 * Math.cos(b))} ${r2(40 + 48 * Math.sin(b))}Z`;
}).join('');

export function SelloV2({ marca, color, grupo = 'constancia', ganado, lado = 72, nombre, i = 0, progreso, className }: PropsSello) {
  const id = useId();
  const forma: Forma = FORMA_DE_GRUPO[grupo];
  const contorno = CONTORNO[forma];
  const k = ESCALA_CARA[forma];
  const cara = `translate(40 40) scale(${k}) translate(-40 -40)`;
  const largo = marca.length > 3 ? 14 : marca.length > 2 ? 17 : 22;
  const avance = !ganado && progreso != null ? Math.max(0, Math.min(1, progreso)) : 0;
  return (
    <svg className={`sl sl-${forma}${ganado ? ' sl-ganado' : ' sl-bloqueado'}${className ? ` ${className}` : ''}`} width={lado} height={lado} viewBox="0 0 80 80"
      role={nombre ? 'img' : undefined} aria-label={nombre ? `${nombre}${ganado ? '' : ' (bloqueado)'}` : undefined} aria-hidden={nombre ? undefined : true} focusable="false" data-forma={forma}
      style={{ ['--sl-c' as string]: colorDeSello(color), ['--i' as string]: i } as CSSProperties}>
      {ganado ? (
        <>
          <defs>
            {/* El canto: metal con bandas de luz y sombra, como se ve una pieza acuñada. */}
            <linearGradient id={`${id}r`} x1="0.08" y1="0" x2="0.92" y2="1"><stop offset="0" className="sl-m0" /><stop offset="0.28" className="sl-m1" /><stop offset="0.5" className="sl-m2" /><stop offset="0.66" className="sl-m0" /><stop offset="1" className="sl-m2" /></linearGradient>
            {/* La cara: esmalte profundo del color del área, más claro arriba. */}
            <linearGradient id={`${id}e`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="sl-e0" /><stop offset="1" className="sl-e1" /></linearGradient>
            <radialGradient id={`${id}v`} cx="50%" cy="40%" r="58%"><stop offset="0" className="sl-v0" /><stop offset="1" className="sl-v1" /></radialGradient>
            {/* La marca: metal claro, en relieve. */}
            <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="sl-t0" /><stop offset="0.6" className="sl-t1" /><stop offset="1" className="sl-t2" /></linearGradient>
            <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="white" stopOpacity="0" /><stop offset="0.5" stopColor="white" stopOpacity="0.9" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
            <linearGradient id={`${id}h`} x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stopColor="white" stopOpacity="0.42" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
            <clipPath id={`${id}c`}><path d={contorno} /></clipPath>
          </defs>
          <path className="sl-canto" d={contorno} fill={`url(#${id}r)`} />
          {forma === 'moneda' && <circle className="sl-estrias" cx="40" cy="40" r="35.4" />}
          <g transform={cara}>
            <path className="sl-cara" d={contorno} fill={`url(#${id}e)`} />
            <g clipPath={`url(#${id}c)`}>
              <path className="sl-rayos" d={RAYOS} />
              <circle cx="40" cy="40" r="44" fill={`url(#${id}v)`} />
            </g>
            <path className="sl-aro" d={contorno} transform="translate(40 40) scale(0.9) translate(-40 -40)" />
          </g>
          <text className="sl-marca sl-marca-sombra" x="40.6" y="42.3" textAnchor="middle" dominantBaseline="central" fontSize={largo}>{marca}</text>
          <text className="sl-marca" x="40" y="41" textAnchor="middle" dominantBaseline="central" fontSize={largo} style={{ fill: `url(#${id}t)` }}>{marca}</text>
          <g clipPath={`url(#${id}c)`}>
            <ellipse className="sl-reflejo" cx="27" cy="19" rx="24" ry="10" transform="rotate(-28 27 19)" fill={`url(#${id}h)`} />
            <rect className="sl-brillo" x="-34" y="-10" width="26" height="100" fill={`url(#${id}b)`} />
          </g>
        </>
      ) : (
        <>
          <path className="sl-hueco" d={contorno} />
          <text className="sl-marca" x="40" y="41" textAnchor="middle" dominantBaseline="central" fontSize={largo}>{marca}</text>
          {avance > 0 && (
            <>
              <path className="sl-pista" d={contorno} />
              <path className="sl-avance" d={contorno} pathLength={1} style={{ strokeDasharray: '1 1', strokeDashoffset: 1 - avance }} />
            </>
          )}
        </>
      )}
    </svg>
  );
}

/** El sello de una definición (`SEALS`): toma de ella la marca, el color y el grupo. */
export function SelloDe({ def, ...resto }: { def: SealDef } & Omit<PropsSello, 'marca' | 'color' | 'grupo'>) {
  return <SelloV2 marca={def.mark} color={def.color} grupo={def.group} {...resto} />;
}

/** Un sello grande que se inclina hacia donde lo llevás (mouse encima o dedo arrastrando de lado) y deja pasar el brillo. */
export function SelloInclinable(props: PropsSello) {
  const caja = useRef<HTMLDivElement>(null);
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    const el = caja.current;
    if (!el || reducido()) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
    const y = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
    el.classList.add('sl-vivo');
    el.style.setProperty('--ry', `${(x * 34).toFixed(1)}deg`);
    el.style.setProperty('--rx', `${(-y * 34).toFixed(1)}deg`);
    el.style.setProperty('--fx', `${Math.round((x + 0.5) * 150)}`);
  };
  const soltar = () => {
    const el = caja.current;
    if (!el) return;
    el.classList.remove('sl-vivo');
    for (const v of ['--rx', '--ry', '--fx']) el.style.removeProperty(v);
  };
  return (
    <div ref={caja} className="sl-inclinable" onPointerMove={mover} onPointerLeave={soltar} onPointerCancel={soltar} onPointerUp={(e) => { if (e.pointerType !== 'mouse') soltar(); }}>
      <SelloV2 {...props} />
    </div>
  );
}
