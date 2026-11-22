/**
 * Trazo 2.0 · la figura del cuerpo, de frente y de espalda. Cada músculo se enciende según `luz` (de 0 a 1): con el color del
 * área si es lo que toca ("plan") o con el trazo amarillo si ya está hecho. Los que están en `pulso` laten (el ejercicio que estás
 * haciendo). Se puede tocar un músculo; lo mismo tiene que poder hacerse desde una lista al lado, para teclado y lector de pantalla.
 */
import type { CSSProperties } from 'react';
import { ESPEJO, LIENZO, ROTULA, SILUETA, TRAZOS, type Vista } from './cuerpo-datos';
import { MUSCULOS, NOMBRE, type Carga, type Musculo } from './musculos';

interface Props {
  luz: Carga;
  tono?: 'plan' | 'hecho';
  vistas?: Vista[];
  /** Lo que dice la figura, en palabras. */
  nombre: string;
  pulso?: Musculo[];
  onTocar?: (m: Musculo) => void;
  alto?: number;
  /** El rótulo "Frente" / "Espalda" debajo de cada vista. */
  rotulos?: boolean;
  className?: string;
}

const ROTULO: Record<Vista, string> = { frente: 'Frente', espalda: 'Espalda' };

/** Una frase con lo que está encendido: "Pecho, hombros y tríceps." */
export function enPalabras(luz: Carga): string {
  const xs = MUSCULOS.filter((m) => (luz[m] ?? 0) > 0).map((m) => NOMBRE[m].toLowerCase());
  if (!xs.length) return 'nada';
  return xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

export function Cuerpo({ luz, tono = 'plan', vistas = ['frente', 'espalda'], nombre, pulso, onTocar, alto = 220, rotulos = true, className }: Props) {
  const mitad = (v: Vista) => (
    (Object.entries(TRAZOS[v]) as [Musculo, string[]][]).map(([m, ds], k) => {
      const p = Math.round(Math.max(0, Math.min(1, luz[m] ?? 0)) * 100);
      const clase = `cu-m${p > 0 ? ' on' : ''}${pulso?.includes(m) ? ' pulso' : ''}${onTocar ? ' toca' : ''}`;
      return ds.map((d, i) => <path key={`${m}${i}`} className={clase} data-m={m} d={d} style={{ ['--p' as string]: `${p}%`, ['--i' as string]: k } as CSSProperties} onClick={onTocar ? () => onTocar(m) : undefined} />);
    })
  );
  return (
    <div className={`cu cu-${tono}${className ? ` ${className}` : ''}`} role="img" aria-label={nombre} data-grafico style={{ ['--cu-alto' as string]: `${alto}px` } as CSSProperties}>
      {vistas.map((v) => (
        <figure key={v} className="cu-vista">
          <svg viewBox={LIENZO.ver} aria-hidden="true" focusable="false">
            <g className="cu-borde">{SILUETA.map((d, i) => <path key={i} d={d} />)}<g transform={ESPEJO}>{SILUETA.map((d, i) => <path key={i} d={d} />)}</g></g>
            <g className="cu-relleno">{SILUETA.map((d, i) => <path key={i} d={d} />)}<g transform={ESPEJO}>{SILUETA.map((d, i) => <path key={i} d={d} />)}</g></g>
            <g>{mitad(v)}</g>
            <g transform={ESPEJO}>{mitad(v)}</g>
            {v === 'frente' && <g className="cu-detalle"><path d={ROTULA} /><path d={ROTULA} transform={ESPEJO} /></g>}
          </svg>
          {rotulos && <figcaption className="t-rotulo">{ROTULO[v]}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
