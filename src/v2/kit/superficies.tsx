/**
 * Trazo 2.0 · superficies y lectura (tanda 1.5): tarjeta, fila, dato, estado, anillo, ritmo, barra, esqueletos, vacío y pista.
 * Reglas: todo número con su rótulo, todo estado con ícono y palabra, el amarillo solo para "acá estás" y "hecho".
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { EstadoPeriodo } from '../../data/periodos';
import { Icono, Ilustracion, type NombreIcono, type NombreIlustracion } from '../iconos';
import { ESTADOS } from '../reglas';
import './superficies.css';

const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');
const pct = (x: number) => `${Math.round(Math.max(0, Math.min(1, x)) * 100)} %`;

// ——— Tarjeta ———

interface TarjetaProps { children: ReactNode; capa?: 1 | 2; heroe?: boolean; area?: string; href?: string; etiqueta?: string; className?: string }

/** Una tarjeta. `heroe`: la principal de la pantalla, con el halo del área. Con `href`, toda la tarjeta es un link. */
export function Tarjeta({ children, capa = 1, heroe, area, href, etiqueta, className }: TarjetaProps) {
  const clase = cx('s-tarjeta', heroe ? 'capa-heroe' : `capa-${capa}`, href && 's-tocable', className);
  const estilo = area ? { ['--area' as string]: area } : undefined;
  return href
    ? <a className={clase} href={href} style={estilo} aria-label={etiqueta}>{children}</a>
    : <section className={clase} style={estilo} aria-label={etiqueta}>{children}</section>;
}

// ——— Fila ———

interface FilaProps { titulo: ReactNode; nota?: ReactNode; icono?: NombreIcono; area?: string; valor?: ReactNode; href?: string; onClick?: () => void; extremo?: ReactNode }

/** Una fila de lista que se toca entera. Link o botón; el chevron dice que lleva a otro lado. */
export function Fila({ titulo, nota, icono, area, valor, href, onClick, extremo }: FilaProps) {
  const dentro = (
    <>
      {icono ? <span className="s-fila-icono"><Icono nombre={icono} lado={20} /></span> : area && <i className="area-punto" style={{ ['--area' as string]: area }} />}
      <span className="s-fila-texto"><b>{titulo}</b>{nota && <small>{nota}</small>}</span>
      {valor != null && <span className="s-fila-valor t-dato">{valor}</span>}
      {extremo ?? ((href || onClick) && <Icono nombre="siguiente" lado={18} className="icono s-chevron" />)}
    </>
  );
  if (href) return <a className="s-fila s-tocable" href={href}>{dentro}</a>;
  if (onClick) return <button type="button" className="s-fila s-tocable" onClick={onClick}>{dentro}</button>;
  return <div className="s-fila">{dentro}</div>;
}

// ——— Dato ———

interface DatoProps { valor: ReactNode; etiqueta: string; unidad?: string; delta?: { valor: string; sentido: 'sube' | 'baja' | 'igual'; nota?: string }; grande?: boolean }

/** Un número con su rótulo, siempre. El cambio va con flecha, no con verde o rojo. */
export function Dato({ valor, etiqueta, unidad, delta, grande }: DatoProps) {
  return (
    <div className={cx('s-dato', grande && 'grande')}>
      <span className="s-dato-valor"><b className={grande ? 't-heroe' : 't-dato'}>{valor}</b>{unidad && <span className="s-dato-unidad">{unidad}</span>}</span>
      <span className="t-rotulo">{etiqueta}</span>
      {delta && (
        <span className="s-delta">
          <Icono nombre={delta.sentido === 'sube' ? 'arriba' : delta.sentido === 'baja' ? 'abajo' : 'menos'} lado={14} />
          <span className="t-dato">{delta.valor}</span>{delta.nota && <span> {delta.nota}</span>}
        </span>
      )}
    </div>
  );
}

// ——— Estado ———

/** La píldora de estado: ícono + palabra, y la forma dice el tono (lenguaje §2). */
export function Estado({ estado, texto }: { estado: EstadoPeriodo; texto?: string }) {
  const e = ESTADOS[estado];
  return <span className={cx('s-estado', e.tono)}><Icono nombre={e.icono} lado={16} />{texto ?? e.palabra}</span>;
}

// ——— Anillo ———

interface AnilloProps { valor: number; tamano?: number; grosor?: number; etiqueta?: ReactNode; sub?: string; area?: string; nombre: string }

/** Avance como anillo. Completo, se vuelve el trazo amarillo. Se dibuja al aparecer. */
export function Anillo({ valor, tamano = 120, grosor = 10, etiqueta, sub, area, nombre }: AnilloProps) {
  const v = Math.max(0, Math.min(1, valor));
  const r = (tamano - grosor) / 2;
  const largo = 2 * Math.PI * r;
  const [dibujado, setDibujado] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setDibujado(v)); return () => cancelAnimationFrame(id); }, [v]);
  return (
    <div className={cx('s-anillo', v >= 1 && 'completo')} style={{ width: tamano, height: tamano, ['--area' as string]: area }} role="img" aria-label={`${nombre}: ${pct(v)}`}>
      <svg viewBox={`0 0 ${tamano} ${tamano}`} aria-hidden="true">
        <circle className="s-anillo-fondo" cx={tamano / 2} cy={tamano / 2} r={r} strokeWidth={grosor} />
        <circle className="s-anillo-valor" cx={tamano / 2} cy={tamano / 2} r={r} strokeWidth={grosor} strokeDasharray={largo} strokeDashoffset={largo * (1 - dibujado)} transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`} />
      </svg>
      <span className="s-anillo-centro" aria-hidden="true">
        <b className="t-dato" style={{ fontSize: Math.round(tamano * 0.22) }}>{etiqueta ?? pct(v)}</b>
        {sub && <small>{sub}</small>}
      </span>
    </div>
  );
}

// ——— Ritmo: tiempo contra trabajo ———

interface RitmoProps { tiempo: number; trabajo: number; nombre: string; frase?: string; area?: string; /** `tiempo`: solo la marca del tiempo (cuando un anillo al lado ya dice el trabajo). */ pie?: 'completo' | 'tiempo' }

/**
 * La barra de ritmo: el trabajo hecho es la barra; el tiempo transcurrido es la marca fantasma de "dónde deberías estar".
 * Reemplaza las dos barras finas de la 1.0. La frase la escribe la pantalla ("Vas 2 días atrás").
 */
export function Ritmo({ tiempo, trabajo, nombre, frase, area, pie = 'completo' }: RitmoProps) {
  const t = Math.max(0, Math.min(1, tiempo));
  const w = Math.max(0, Math.min(1, trabajo));
  const atras = w + 0.1 < t;
  return (
    <div className={cx('s-ritmo', atras && 'atras', w >= 1 && 'completo')} style={{ ['--area' as string]: area }}>
      <div className="s-ritmo-riel" role="img" aria-label={`${nombre}: trabajo ${pct(w)}, tiempo ${pct(t)}`}>
        <span className="s-ritmo-hecho" style={{ width: `${w * 100}%` }} />
        <span className="s-ritmo-fantasma" style={{ left: `${t * 100}%` }} />
      </div>
      <div className="s-ritmo-pie">
        {pie === 'completo' && <span><b className="t-dato">{pct(w)}</b> hecho</span>}
        <span className="s-ritmo-tiempo"><i aria-hidden="true" /><span className="t-dato">{pct(t)}</span> del tiempo</span>
      </div>
      {frase && <p className="t-nota s-ritmo-frase">{frase}</p>}
    </div>
  );
}

// ——— Barra ———

export function Barra({ valor, max = 1, nombre, area }: { valor: number; max?: number; nombre: string; area?: string }) {
  const v = max > 0 ? Math.max(0, Math.min(1, valor / max)) : 0;
  return (
    <div className={cx('s-barra', v >= 1 && 'completo')} role="progressbar" aria-label={nombre} aria-valuemin={0} aria-valuemax={max} aria-valuenow={valor} style={{ ['--area' as string]: area }}>
      <span style={{ width: `${v * 100}%` }} />
    </div>
  );
}

// ——— Esqueletos ———

/** Un bloque gris que respira mientras carga. Decorativo: quien lo contiene lleva aria-busy. */
export function Esqueleto({ ancho = '100%', alto = 14, redondo }: { ancho?: number | string; alto?: number; redondo?: boolean }) {
  return <span className={cx('s-esqueleto', redondo && 'redondo')} style={{ width: ancho, height: alto }} aria-hidden="true" />;
}

/** El esqueleto de una tarjeta con anillo y tres líneas. */
export function EsqueletoTarjeta() {
  return (
    <div className="s-tarjeta capa-1 s-esq-tarjeta" aria-hidden="true">
      <Esqueleto ancho={64} alto={64} redondo />
      <div><Esqueleto ancho="70%" alto={18} /><Esqueleto ancho="45%" /><Esqueleto ancho="85%" alto={10} /></div>
    </div>
  );
}

export function EsqueletoLista({ filas = 4 }: { filas?: number }) {
  return (
    <div className="s-tarjeta capa-1 s-esq-lista" aria-hidden="true">
      {Array.from({ length: filas }, (_, i) => <div key={i}><Esqueleto ancho={20} alto={20} /><div><Esqueleto ancho={`${70 - i * 8}%`} alto={15} /><Esqueleto ancho="35%" alto={11} /></div></div>)}
    </div>
  );
}

/** Mientras `cargando`, el esqueleto; después, el contenido con un fundido. */
export function ConCarga({ cargando, esqueleto, children, nombre }: { cargando: boolean; esqueleto: ReactNode; children: ReactNode; nombre: string }) {
  return <div className="s-con-carga" aria-busy={cargando} aria-label={cargando ? `Cargando ${nombre}` : undefined}>{cargando ? esqueleto : <div className="s-aparece">{children}</div>}</div>;
}

// ——— Vacío ———

/**
 * Estado vacío: qué es esto + una acción. Nunca solo "Todavía no hay…" (regla 6). `compacto`: en una sola fila (el dibujo chico a la
 * izquierda), para un vacío dentro de una tarjeta o al lado de otros.
 */
export function Vacio({ ilustracion, titulo, texto, accion, compacto }: { ilustracion: NombreIlustracion; titulo: string; texto?: string; accion?: ReactNode; compacto?: boolean }) {
  return (
    <div className={cx('s-vacio', compacto && 'compacto')}>
      <Ilustracion nombre={ilustracion} />
      {compacto ? (
        <div className="s-vacio-texto">
          <b className="t-encabezado">{titulo}</b>
          {texto && <p className="t-nota">{texto}</p>}
          {accion}
        </div>
      ) : (
        <>
          <b className="t-encabezado">{titulo}</b>
          {texto && <p className="t-nota">{texto}</p>}
          {accion}
        </>
      )}
    </div>
  );
}

// ——— Pista (tooltip) ———

/** Un globo corto sobre lo que tocás o enfocás: con el mouse, al pasar; en el teléfono, manteniendo apretado. */
export function Pista({ texto, children }: { texto: string; children: ReactNode }) {
  const [ver, setVer] = useState(false);
  const id = useId();
  const reloj = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(reloj.current), []);
  return (
    <span className="s-pista" aria-describedby={id}
      onMouseEnter={() => setVer(true)} onMouseLeave={() => setVer(false)}
      onFocus={() => setVer(true)} onBlur={() => setVer(false)}
      onPointerDown={(e) => { if (e.pointerType !== 'mouse') reloj.current = window.setTimeout(() => setVer(true), 450); }}
      onPointerUp={() => { window.clearTimeout(reloj.current); reloj.current = window.setTimeout(() => setVer(false), 1500); }}>
      {children}
      <span role="tooltip" id={id} className={cx('s-globo', ver && 'ver')}>{texto}</span>
    </span>
  );
}
