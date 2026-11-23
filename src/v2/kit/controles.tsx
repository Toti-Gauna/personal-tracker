/**
 * Trazo 2.0 · los controles (tanda 1.4). Todos siguen docs/ux/lenguaje-2.0.md: 44 px de toque, la marca amarilla solo para
 * "hecho" o "acá estás", deshabilitado siempre con su motivo, horas en 24 h y fechas "23 nov 2026".
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icono, type NombreIcono } from '../iconos';
import { festejar } from '../movimiento/movimiento';
import './kit.css';

const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

// ——— Botón ———

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro';

interface BotonProps {
  children?: ReactNode;
  variante?: VarianteBoton;
  icono?: NombreIcono;
  /** Solo el ícono: `etiqueta` pasa a ser su nombre para el lector de pantalla. */
  soloIcono?: boolean;
  etiqueta?: string;
  /** Mientras trabaja: no se puede volver a tocar y lo dice. */
  cargando?: boolean;
  /** `true` o el motivo. Con motivo, se muestra debajo y se lee con el botón. */
  deshabilitado?: boolean | string;
  tamano?: 'm' | 's';
  ancho?: boolean;
  href?: string;
  onClick?: () => void;
  tipo?: 'button' | 'submit';
}

export function Boton({ children, variante = 'secundario', icono, soloIcono, etiqueta, cargando, deshabilitado, tamano = 'm', ancho, href, onClick, tipo = 'button' }: BotonProps) {
  const id = useId();
  const motivo = typeof deshabilitado === 'string' ? deshabilitado : null;
  const apagado = !!deshabilitado || !!cargando;
  const clase = cx('k-boton', variante, tamano === 's' && 'chico', soloIcono && 'solo-icono', ancho && 'ancho', cargando && 'cargando');
  const contenido = (
    <>
      {cargando ? <span className="k-giro" aria-hidden="true" /> : icono && <Icono nombre={icono} lado={tamano === 's' ? 18 : 20} />}
      {!soloIcono && <span>{children}</span>}
    </>
  );
  const comunes = {
    className: clase,
    'aria-label': soloIcono ? etiqueta : undefined,
    'aria-disabled': apagado || undefined,
    'aria-busy': cargando || undefined,
    'aria-describedby': motivo ? id : undefined,
  };
  const boton = href && !apagado
    ? <a {...comunes} href={href}>{contenido}</a>
    : <button {...comunes} type={tipo} onClick={(e) => { if (apagado) { e.preventDefault(); return; } onClick?.(); }}>{contenido}</button>;
  if (!motivo) return boton;
  return <span className={cx('k-boton-con-motivo', ancho && 'ancho')}>{boton}<small id={id} className="k-motivo">{motivo}</small></span>;
}

// ——— Casilla ———

interface CasillaProps {
  marcada: boolean;
  onCambio: (v: boolean) => void;
  etiqueta: string;
  nota?: ReactNode;
  /** El color del área: solo un punto al lado, nunca el relleno. */
  area?: string;
  deshabilitada?: boolean;
  /** El festejo al marcar (astillas del trazo). Apagalo en listas largas que se marcan de a muchas. */
  festejo?: boolean;
}

/** Hecho = el trazo amarillo. La tilde se dibuja al marcar, y al marcar festeja. */
export function Casilla({ marcada, onCambio, etiqueta, nota, area, deshabilitada, festejo = true }: CasillaProps) {
  const caja = useRef<HTMLSpanElement>(null);
  return (
    <button type="button" role="checkbox" aria-checked={marcada} aria-disabled={deshabilitada || undefined} className={cx('k-casilla', marcada && 'marcada')}
      onClick={() => { if (deshabilitada) return; if (!marcada && festejo) festejar(caja.current); onCambio(!marcada); }} style={area ? { ['--area' as string]: area } : undefined}>
      <span className="k-caja" aria-hidden="true" ref={caja}>
        <svg viewBox="0 0 24 24"><path d="M5.5 12.5l4.2 4.2L18.5 7.5" /></svg>
      </span>
      <span className="k-texto">
        <span className="k-etiqueta">{area && <i className="area-punto" />}{etiqueta}</span>
        {nota && <small>{nota}</small>}
      </span>
    </button>
  );
}

// ——— Interruptor ———

export function Interruptor({ prendido, onCambio, etiqueta, nota }: { prendido: boolean; onCambio: (v: boolean) => void; etiqueta: string; nota?: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={prendido} className="k-interruptor" onClick={() => onCambio(!prendido)}>
      <span className="k-texto"><span className="k-etiqueta">{etiqueta}</span>{nota && <small>{nota}</small>}</span>
      <span className="k-riel" aria-hidden="true"><span className="k-perilla" /></span>
    </button>
  );
}

// ——— Segmentado ———

export function Segmentado<T extends string>({ opciones, valor, onCambio, etiqueta }: { opciones: [T, string][]; valor: T; onCambio: (v: T) => void; etiqueta: string }) {
  const i = Math.max(0, opciones.findIndex(([v]) => v === valor));
  const mover = (d: number) => onCambio(opciones[(i + d + opciones.length) % opciones.length][0]);
  return (
    <div className="k-segmentado" role="radiogroup" aria-label={etiqueta} style={{ ['--n' as string]: opciones.length, ['--i' as string]: i }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); } }}>
      <span className="k-seg-indicador" aria-hidden="true" />
      {opciones.map(([v, n]) => <button key={v} type="button" role="radio" aria-checked={v === valor} tabIndex={v === valor ? 0 : -1} onClick={() => onCambio(v)}>{n}</button>)}
    </div>
  );
}

// ——— Chip ———

export function Chip({ activo, onCambio, children, icono, area }: { activo: boolean; onCambio: (v: boolean) => void; children: ReactNode; icono?: NombreIcono; area?: string }) {
  return (
    <button type="button" aria-pressed={activo} className={cx('k-chip', activo && 'activo')} onClick={() => onCambio(!activo)} style={area ? { ['--area' as string]: area } : undefined}>
      {activo ? <Icono nombre="tilde" lado={16} /> : area ? <i className="area-punto" /> : icono && <Icono nombre={icono} lado={16} />}
      {children}
    </button>
  );
}

// ——— Contador ———

const fmtNum = (n: number, dec: number) => n.toFixed(dec).replace('.', ',');

interface ContadorProps { valor: number | null; onCambio: (v: number) => void; etiqueta: string; min?: number; max?: number; paso?: number; unidad?: string; decimales?: number; inicial?: number }

export function Contador({ valor, onCambio, etiqueta, min = -Infinity, max = Infinity, paso = 1, unidad, decimales = 0, inicial }: ContadorProps) {
  const [texto, setTexto] = useState(valor == null ? '' : fmtNum(valor, decimales));
  useEffect(() => { setTexto(valor == null ? '' : fmtNum(valor, decimales)); }, [valor, decimales]);
  const fijar = (n: number) => onCambio(Math.round(Math.min(max, Math.max(min, n)) * 10 ** decimales) / 10 ** decimales);
  const base = valor ?? inicial ?? (Number.isFinite(min) ? min : 0);
  return (
    <div className="k-contador" role="group" aria-label={etiqueta}>
      <button type="button" className="k-boton secundario solo-icono" aria-label={`Restar ${fmtNum(paso, decimales)}`} aria-disabled={(valor != null && valor <= min) || undefined} onClick={() => !(valor != null && valor <= min) && fijar(valor == null ? base : base - paso)}><Icono nombre="menos" lado={20} /></button>
      <label className="k-contador-valor">
        <input className="t-dato" inputMode="decimal" aria-label={etiqueta} value={texto} placeholder={inicial != null ? fmtNum(inicial, decimales) : '—'}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => { const n = Number(texto.replace(',', '.')); if (texto.trim() && Number.isFinite(n)) fijar(n); else setTexto(valor == null ? '' : fmtNum(valor, decimales)); }}
          onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); fijar(base + paso); } if (e.key === 'ArrowDown') { e.preventDefault(); fijar(base - paso); } if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        {unidad && <span className="k-unidad">{unidad}</span>}
      </label>
      <button type="button" className="k-boton secundario solo-icono" aria-label={`Sumar ${fmtNum(paso, decimales)}`} aria-disabled={(valor != null && valor >= max) || undefined} onClick={() => !(valor != null && valor >= max) && fijar(valor == null ? base : base + paso)}><Icono nombre="mas" lado={20} /></button>
    </div>
  );
}

// ——— Campo de texto ———

interface CampoProps {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  nota?: string;
  error?: string;
  icono?: NombreIcono;
  placeholder?: string;
  multilinea?: boolean;
  maximo?: number;
  modo?: 'text' | 'numeric' | 'decimal' | 'email' | 'url';
}

export function CampoTexto({ etiqueta, valor, onCambio, nota, error, icono, placeholder, multilinea, maximo, modo = 'text' }: CampoProps) {
  const id = useId();
  const pie = error ?? nota;
  const comunes = { id, value: valor, placeholder, maxLength: maximo, 'aria-invalid': !!error || undefined, 'aria-describedby': pie ? `${id}-pie` : undefined };
  return (
    <div className={cx('k-campo', error && 'con-error')}>
      <label htmlFor={id} className="k-campo-etiqueta">{etiqueta}</label>
      <div className="k-campo-caja">
        {icono && <Icono nombre={icono} lado={20} />}
        {multilinea ? <textarea {...comunes} rows={3} onChange={(e) => onCambio(e.target.value)} /> : <input {...comunes} inputMode={modo === 'text' ? undefined : modo} onChange={(e) => onCambio(e.target.value)} />}
      </div>
      {(pie || maximo) && (
        <div className="k-campo-pie">
          {pie && <small id={`${id}-pie`} className={error ? 'error' : undefined}>{error && <Icono nombre="alerta" lado={16} />}{pie}</small>}
          {maximo && <small className="t-dato k-cuenta">{valor.length}/{maximo}</small>}
        </div>
      )}
    </div>
  );
}

// ——— Hora (24 h, siempre) ———

const dos = (n: number) => String(n).padStart(2, '0');

/** Hora en 24 h con dos casillas (hora y minuto): se escribe, se sube y baja con las flechas, y nunca muestra AM/PM. */
// Al salir de una casilla se lee lo que tiene escrito (no el estado): pasar el foco a los minutos al completar la hora dispara
// ese "salir" en el mismo instante, cuando el estado todavía guarda el dígito anterior (escribir "16" dejaba "01").
export function CampoHora({ etiqueta, valor, onCambio, pasoMin = 5 }: { etiqueta: string; valor: string; onCambio: (v: string) => void; pasoMin?: number }) {
  const [h, m] = (valor || '00:00').split(':').map(Number);
  const [th, setTh] = useState(dos(h));
  const [tm, setTm] = useState(dos(m));
  useEffect(() => { setTh(dos(h)); setTm(dos(m)); }, [h, m]);
  const minRef = useRef<HTMLInputElement>(null);
  const fijar = (hh: number, mm: number) => {
    const total = (((hh * 60 + mm) % 1440) + 1440) % 1440;
    onCambio(`${dos(Math.floor(total / 60))}:${dos(total % 60)}`);
  };
  const id = useId();
  return (
    <div className="k-campo">
      <span className="k-campo-etiqueta" id={id}>{etiqueta}</span>
      <div className="k-campo-caja k-hora" role="group" aria-labelledby={id}>
        <Icono nombre="reloj" lado={20} />
        <input className="t-dato" inputMode="numeric" aria-label={`${etiqueta}: hora`} value={th} maxLength={2}
          onFocus={(e) => e.target.select()}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setTh(v); if (v.length === 2) { fijar(Math.min(23, Number(v)), m); minRef.current?.focus(); } }}
          onBlur={(e) => fijar(Math.min(23, Number(e.target.value.replace(/\D/g, '')) || 0), m)}
          onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); fijar(h + 1, m); } if (e.key === 'ArrowDown') { e.preventDefault(); fijar(h - 1, m); } }} />
        <span aria-hidden="true">:</span>
        <input ref={minRef} className="t-dato" inputMode="numeric" aria-label={`${etiqueta}: minutos`} value={tm} maxLength={2}
          onFocus={(e) => e.target.select()}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setTm(v); if (v.length === 2) fijar(h, Math.min(59, Number(v))); }}
          onBlur={(e) => fijar(h, Math.min(59, Number(e.target.value.replace(/\D/g, '')) || 0))}
          onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); fijar(h, m + pasoMin); } if (e.key === 'ArrowDown') { e.preventDefault(); fijar(h, m - pasoMin); } }} />
      </div>
    </div>
  );
}

// ——— Fecha ———

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
/** "23 nov 2026": la forma de las fechas en la 2.0. */
export const fechaLarga = (f: string) => { const [y, mm, d] = f.split('-').map(Number); return `${d} ${MESES[mm - 1].slice(0, 3)} ${y}`; };
const clave = (y: number, m: number, d: number) => `${y}-${dos(m + 1)}-${dos(d)}`;

/** El mes como grilla de lunes a domingo: los días del mes y huecos antes. */
export function grillaMes(y: number, m: number): (string | null)[] {
  const primero = (new Date(y, m, 1).getDay() + 6) % 7;
  const dias = new Date(y, m + 1, 0).getDate();
  return [...Array(primero).fill(null), ...Array.from({ length: dias }, (_, i) => clave(y, m, i + 1))];
}

interface FechaProps { etiqueta: string; valor: string | null; onCambio: (v: string) => void; hoy: string; min?: string; max?: string; nota?: string }

/** Campo de fecha que abre un calendario debajo. Hoy lleva un anillo; la elegida, el trazo. */
export function CampoFecha({ etiqueta, valor, onCambio, hoy, min, max, nota }: FechaProps) {
  const [abierto, setAbierto] = useState(false);
  const base = valor ?? hoy;
  const [mes, setMes] = useState<[number, number]>([Number(base.slice(0, 4)), Number(base.slice(5, 7)) - 1]);
  const id = useId();
  const [y, m] = mes;
  const mover = (d: number) => setMes(([yy, mm]) => { const t = yy * 12 + mm + d; return [Math.floor(t / 12), t % 12]; });
  return (
    <div className="k-campo">
      <span className="k-campo-etiqueta" id={id}>{etiqueta}</span>
      <button type="button" className="k-campo-caja k-fecha-boton" aria-labelledby={id} aria-expanded={abierto} aria-describedby={nota ? `${id}-n` : undefined} onClick={() => setAbierto((x) => !x)}>
        <Icono nombre="calendario" lado={20} />
        <span className={valor ? undefined : 'k-vacio'}>{valor ? fechaLarga(valor) : 'Elegir fecha'}</span>
        <Icono nombre={abierto ? 'arriba' : 'abajo'} lado={18} />
      </button>
      {nota && <div className="k-campo-pie"><small id={`${id}-n`}>{nota}</small></div>}
      {abierto && (
        <div className="k-calendario" role="dialog" aria-label={`${etiqueta}: calendario`}>
          <div className="k-cal-cabeza">
            <button type="button" className="k-boton fantasma solo-icono chico" aria-label="Mes anterior" onClick={() => mover(-1)}><Icono nombre="atras" lado={18} /></button>
            <b>{MESES[m]} {y}</b>
            <button type="button" className="k-boton fantasma solo-icono chico" aria-label="Mes siguiente" onClick={() => mover(1)}><Icono nombre="siguiente" lado={18} /></button>
          </div>
          <div className="k-cal-grilla" role="grid">
            {DIAS.map((d) => <span key={d} className="t-rotulo" role="columnheader">{d}</span>)}
            {grillaMes(y, m).map((f, i) => f ? (
              <button key={f} type="button" role="gridcell" disabled={(min && f < min) || (max && f > max) || undefined}
                aria-selected={f === valor} aria-current={f === hoy ? 'date' : undefined} aria-label={fechaLarga(f)}
                className={cx(f === valor && 'elegida', f === hoy && 'hoy')}
                onClick={() => { onCambio(f); setAbierto(false); }}>{Number(f.slice(8))}</button>
            ) : <span key={`v${i}`} />)}
          </div>
          <div className="k-cal-pie">
            <Boton variante="fantasma" tamano="s" onClick={() => { onCambio(hoy); setAbierto(false); }}>Hoy</Boton>
          </div>
        </div>
      )}
    </div>
  );
}

// ——— Selector ———

export interface OpcionSelector<T extends string> { valor: T; etiqueta: string; nota?: string }

/** Un campo que abre la lista de opciones desde abajo (la hoja de verdad llega en 1.5). */
export function Selector<T extends string>({ etiqueta, valor, opciones, onCambio, placeholder = 'Elegir' }: { etiqueta: string; valor: T | null; opciones: OpcionSelector<T>[]; onCambio: (v: T) => void; placeholder?: string }) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();
  const actual = opciones.find((o) => o.valor === valor);
  const lista = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    (lista.current?.querySelector('[aria-checked="true"]') as HTMLElement | null ?? lista.current?.querySelector('button'))?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [abierto]);
  return (
    <div className="k-campo">
      <span className="k-campo-etiqueta" id={id}>{etiqueta}</span>
      <button type="button" className="k-campo-caja k-fecha-boton" aria-labelledby={id} aria-haspopup="dialog" aria-expanded={abierto} onClick={() => setAbierto(true)}>
        <span className={actual ? undefined : 'k-vacio'}>{actual?.etiqueta ?? placeholder}</span>
        <Icono nombre="abajo" lado={18} />
      </button>
      {abierto && (
        <div className="k-velo" onClick={() => setAbierto(false)}>
          <div className="k-lista-hoja capa-3" role="dialog" aria-modal="true" aria-label={etiqueta} ref={lista} onClick={(e) => e.stopPropagation()}>
            <div className="k-hoja-asa" aria-hidden="true" />
            <p className="t-rotulo">{etiqueta}</p>
            <div role="radiogroup" aria-label={etiqueta}>
              {opciones.map((o) => (
                <button key={o.valor} type="button" role="radio" aria-checked={o.valor === valor} className="k-opcion" onClick={() => { onCambio(o.valor); setAbierto(false); }}>
                  <span><b>{o.etiqueta}</b>{o.nota && <small>{o.nota}</small>}</span>
                  {o.valor === valor && <Icono nombre="tilde" lado={20} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
