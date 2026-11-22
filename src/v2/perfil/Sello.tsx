/**
 * Trazo 2.0 · el sello: una pieza de metal acuñada con el color de su área, la marca en relieve y un brillo que la cruza al
 * aparecer (y cuando la tocás). Bloqueado es solo el contorno punteado. El nombre lo dice quien lo usa: acá es un dibujo.
 */
import { useId, type CSSProperties } from 'react';
import { colorDeSello } from './datos';
import './perfil.css';

interface Props { marca: string; color: string; ganado: boolean; lado?: number; nombre?: string; /** Orden de aparición: el brillo pasa escalonado. */ i?: number; className?: string }

export function SelloV2({ marca, color, ganado, lado = 72, nombre, i = 0, className }: Props) {
  const id = useId();
  const largo = marca.length > 2;
  return (
    <svg className={`sl${ganado ? ' sl-ganado' : ' sl-bloqueado'}${className ? ` ${className}` : ''}`} width={lado} height={lado} viewBox="0 0 80 80"
      role={nombre ? 'img' : undefined} aria-label={nombre ? `${nombre}${ganado ? '' : ' (bloqueado)'}` : undefined} aria-hidden={nombre ? undefined : true} focusable="false"
      style={{ ['--sl-c' as string]: colorDeSello(color), ['--i' as string]: i } as CSSProperties}>
      {ganado ? (
        <>
          <defs>
            <radialGradient id={`${id}m`} cx="34%" cy="26%" r="78%"><stop offset="0" className="sl-g0" /><stop offset="0.55" className="sl-g1" /><stop offset="1" className="sl-g2" /></radialGradient>
            <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="white" stopOpacity="0" /><stop offset="0.5" stopColor="white" stopOpacity="0.85" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
            <clipPath id={`${id}c`}><circle cx="40" cy="40" r="36" /></clipPath>
          </defs>
          <circle className="sl-canto" cx="40" cy="40" r="38" />
          <circle cx="40" cy="40" r="36" fill={`url(#${id}m)`} />
          <circle className="sl-aro" cx="40" cy="40" r="30" />
          <text className="sl-marca" x="40" y="41" textAnchor="middle" dominantBaseline="central" fontSize={largo ? 17 : 22}>{marca}</text>
          <g clipPath={`url(#${id}c)`}><rect className="sl-brillo" x="-34" y="-10" width="26" height="100" fill={`url(#${id}b)`} /></g>
        </>
      ) : (
        <>
          <circle className="sl-hueco" cx="40" cy="40" r="36" />
          <text className="sl-marca" x="40" y="41" textAnchor="middle" dominantBaseline="central" fontSize={largo ? 17 : 22}>{marca}</text>
        </>
      )}
    </svg>
  );
}
