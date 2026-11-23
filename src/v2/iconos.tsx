/**
 * Trazo 2.0 · el juego de íconos, dibujado para Trazo (tanda 1.3). Grilla de 24, trazo de 1,75, puntas y uniones redondas,
 * sin relleno salvo el punto de un detalle o la marca. Una metáfora por significado: el engranaje es Ajustes, el sol es el
 * tema, la mancuerna es Entreno. Si un ícono no es universal, va con su palabra al lado (ver docs/ux/lenguaje-2.0.md §6).
 */
import type { ReactNode, SVGProps } from 'react';

const p = (d: string) => <path d={d} />;
const punto = (cx: number, cy: number, r = 1.1) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
const n = (x: number) => Math.round(x * 100) / 100;

/** El engranaje: 8 dientes calculados, para que sea un engranaje y no un sol. */
function engranaje() {
  const pts: string[] = [];
  const dientes = 8, rAfuera = 9.4, rAdentro = 7.1;
  for (let i = 0; i < dientes; i++) {
    const a = (i / dientes) * Math.PI * 2;
    const paso = Math.PI / dientes;
    for (const [da, r] of [[-paso * 0.42, rAdentro], [-paso * 0.28, rAfuera], [paso * 0.28, rAfuera], [paso * 0.42, rAdentro]] as const) pts.push(`${n(12 + Math.cos(a + da) * r)} ${n(12 + Math.sin(a + da) * r)}`);
  }
  return `M${pts.join('L')}z`;
}

/** Los rayos del sol: 8 rayos cortos, separados del disco. */
const rayos = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `M${n(12 + Math.cos(a) * 6.6)} ${n(12 + Math.sin(a) * 6.6)}L${n(12 + Math.cos(a) * 9)} ${n(12 + Math.sin(a) * 9)}`; }).join('');

export const ICONOS = {
  // ——— Navegación ———
  hoy: <>{p('M3 18h18M7 18a5 5 0 0 1 10 0M12 6.5V9M5.3 11.3l1.8 1.8M18.7 11.3l-1.8 1.8')}</>,
  estudio: <>{p('M12 6.5C10 5.2 7.4 4.7 4 5v13c3.4-.3 6 .2 8 1.5 2-1.3 4.6-1.8 8-1.5V5c-3.4-.3-6 .2-8 1.5zM12 6.5v13')}</>,
  plan: <>{p('M5 21V4M5 4.5h12.5l-2.7 4 2.7 4H5')}</>,
  entreno: <>{p('M6.5 6.5v11M3.5 9.5v5M17.5 6.5v11M20.5 9.5v5M6.5 12h11')}</>,
  perfil: <><circle cx="12" cy="8" r="3.6" />{p('M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5')}</>,
  fondo: <>{p('M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4')}</>,

  // ——— Acciones ———
  ajustes: <>{p(engranaje())}<circle cx="12" cy="12" r="2.9" /></>,
  mas: <>{p('M12 5v14M5 12h14')}</>,
  menos: <>{p('M5 12h14')}</>,
  cerrar: <>{p('M6 6l12 12M18 6L6 18')}</>,
  tilde: <>{p('M5 12.5l4.5 4.5L19 7.5')}</>,
  atras: <>{p('M14.5 5.5L8 12l6.5 6.5')}</>,
  siguiente: <>{p('M9.5 5.5L16 12l-6.5 6.5')}</>,
  abajo: <>{p('M5.5 9.5L12 16l6.5-6.5')}</>,
  arriba: <>{p('M5.5 14.5L12 8l6.5 6.5')}</>,
  opciones: <>{punto(5.5, 12, 1.5)}{punto(12, 12, 1.5)}{punto(18.5, 12, 1.5)}</>,
  editar: <>{p('M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5zM14.5 6l3.5 3.5')}</>,
  borrar: <>{p('M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5')}</>,
  buscar: <><circle cx="11" cy="11" r="6.2" />{p('M20 20l-4.5-4.5')}</>,
  exportar: <>{p('M12 14V4M7.5 8.5L12 4l4.5 4.5M5 16v3.5h14V16')}</>,
  importar: <>{p('M12 4v10M7.5 9.5L12 14l4.5-4.5M5 16v3.5h14V16')}</>,
  copiar: <><rect x="9" y="9" width="11" height="11" rx="2" />{p('M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3')}</>,
  enlace: <>{p('M10 5H5v14h14v-5M14 4h6v6M20 4l-9 9')}</>,
  info: <><circle cx="12" cy="12" r="9" />{p('M12 11v5.5')}{punto(12, 7.8)}</>,
  deshacer: <>{p('M8 5L4 9l4 4M4 9h10a5 5 0 0 1 0 10h-3')}</>,
  play: <>{p('M8 5.5v13l10.5-6.5z')}</>,
  ojo: <>{p('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z')}<circle cx="12" cy="12" r="3" /></>,

  // ——— Estados ———
  reloj: <><circle cx="12" cy="12" r="9" />{p('M12 7v5l3.2 2')}</>,
  ritmo: <>{p('M2.5 12h4l2.5-6 4 12 2.5-6h6')}</>,
  adelantado: <>{p('M5 6l6 6-6 6M13 6l6 6-6 6')}</>,
  pausa: <>{p('M8.5 5v14M15.5 5v14')}</>,
  atencion: <>{p('M12 3.8l9 15.7H3zM12 10v4.2')}{punto(12, 16.9)}</>,
  alerta: <><circle cx="12" cy="12" r="9" />{p('M12 7.5v5.5')}{punto(12, 16.2)}</>,
  candado: <><rect x="5" y="10.5" width="14" height="9.5" rx="2" />{p('M8 10.5V8a4 4 0 0 1 8 0v2.5')}</>,

  // ——— El plan y el tiempo ———
  calendario: <><rect x="4" y="5" width="16" height="15" rx="2" />{p('M4 10h16M8.5 3v4M15.5 3v4')}</>,
  linea: <>{p('M4 6h9M8 12h12M4 18h7')}</>,
  mapa: <>{p('M6.2 15.6l2.9-5.9M11.5 9.3l3.2 2.6M17.1 11.5l2.2-5')}<circle cx="5.2" cy="17.4" r="1.7" /><circle cx="10" cy="8" r="1.7" /><circle cx="16.2" cy="13.1" r="1.7" /><circle cx="20" cy="4.9" r="1.7" /></>,
  meta: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" />{punto(12, 12, 1.4)}</>,
  racha: <>{p('M12 3c.5 3 4.5 5 4.5 10a4.5 4.5 0 0 1-9 0c0-1.6.6-2.8 1.5-3.8.3 1.3 1 2 1.8 2.3C10.3 9 10.5 5.5 12 3z')}</>,
  medalla: <><circle cx="12" cy="9" r="5" />{p('M9 13.2L7.5 21l4.5-2.5 4.5 2.5-1.5-7.8')}</>,
  estrella: <>{p('M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z')}</>,
  cohete: <>{p('M12 3c3 2.2 4.5 5.5 4.5 9.5l-1.5 3.5H9L7.5 12.5C7.5 8.5 9 5.2 12 3zM9.5 16L8 20.5M14.5 16l1.5 4.5M12 16.5V21')}<circle cx="12" cy="10" r="1.7" /></>,
  certificado: <><rect x="3.5" y="4.5" width="17" height="11" rx="2" />{p('M7.5 8.5h9M7.5 11.5h4.5M14.5 15.5v5l2-1.3 2 1.3v-5')}</>,
  grafico: <>{p('M4 20h16M7 20v-6M12 20V8M17 20v-9')}</>,
  trabajo: <><rect x="3.5" y="7.5" width="17" height="12" rx="2" />{p('M9 7.5V5h6v2.5M3.5 13h17')}</>,
  dinero: <><circle cx="12" cy="12" r="9" />{p('M14.8 9.4c-.5-1-1.5-1.6-2.8-1.6-1.6 0-2.8.8-2.8 2.1 0 2.9 5.8 1.3 5.8 4.3 0 1.3-1.3 2.1-3 2.1-1.4 0-2.5-.6-3-1.6M12 6v1.8M12 16.3V18')}</>,

  // ——— Estudio ———
  tarjetas: <><rect x="7" y="4" width="13" height="10.5" rx="2" />{p('M4 9v9a2 2 0 0 0 2 2h10')}</>,
  repaso: <>{p('M19.5 12a7.5 7.5 0 1 1-2.4-5.5M19.5 4v4h-4')}</>,
  codigo: <>{p('M8.5 7l-5 5 5 5M15.5 7l5 5-5 5M13.5 5l-3 14')}</>,
  matematica: <>{p('M17.5 6.5V5h-11l6 7-6 7h11v-1.5')}</>,
  idioma: <>{p('M4 5h16v10.5h-8.5L7 19.5v-4H4z')}</>,
  documento: <>{p('M6 3.5h8l4 4v13H6zM14 3.5v4h4M9 12h6M9 16h6')}</>,
  json: <>{p('M9 4C7 4 6.5 5 6.5 6.5v3c0 1.2-.6 2-2 2.5 1.4.5 2 1.3 2 2.5v3C6.5 19 7 20 9 20M15 4c2 0 2.5 1 2.5 2.5v3c0 1.2.6 2 2 2.5-1.4.5-2 1.3-2 2.5v3c0 1.5-.5 2.5-2.5 2.5')}</>,
  pomodoro: <><circle cx="12" cy="13.5" r="7" />{p('M12 13.5V10M9.5 3h5M12 3v3.5')}</>,

  // ——— Cuerpo ———
  salud: <>{p('M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z')}</>,
  peso: <><rect x="4" y="4" width="16" height="16" rx="3" />{p('M7.5 11a5.2 5.2 0 0 1 9 0M12 11.5l2-3.2')}</>,
  companera: <><circle cx="9" cy="8" r="3.2" /><circle cx="16.8" cy="8.6" r="2.4" />{p('M3.5 19c.6-3 2.7-4.5 5.5-4.5s4.9 1.5 5.5 4.5M16.8 14c2.1.2 3.4 1.6 3.8 4.5')}</>,

  // ——— De fondo ———
  iman: <>{p('M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4zM6 8h4M14 8h4')}</>,
  paquete: <>{p('M12 3.5l8 4.2v8.6l-8 4.2-8-4.2V7.7zM4 7.7l8 4.3 8-4.3M12 12v8.5')}</>,
  hardware: <><rect x="7" y="7" width="10" height="10" rx="1.5" />{p('M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5')}</>,

  // ——— La app ———
  sol: <><circle cx="12" cy="12" r="3.8" />{p(rayos)}</>,
  luna: <>{p('M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z')}</>,
  sistema: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" /></>,
  campana: <>{p('M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.8a2.1 2.1 0 0 0 4 0')}</>,
  sonido: <>{p('M4 9.5v5h3.5l4.5 4v-13l-4.5 4zM15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11')}</>,
  /** La marca: los cuatro palotes y el trazo que los cruza. */
  trazo: <>{p('M7.2 6l-.9 12M10.7 5.6l-.9 12.8M14.2 5.8l-.9 12.4M17.7 5.5l-.9 12')}<path d="M3 16.6L19.4 6.2l1.6 2.3L4.8 19z" fill="var(--trazo)" stroke="none" opacity="0.92" /></>,
} satisfies Record<string, ReactNode>;

export type NombreIcono = keyof typeof ICONOS;
export const NOMBRES_ICONO = Object.keys(ICONOS) as NombreIcono[];

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  nombre: NombreIcono;
  /** Lado en px: 24 por defecto, 20 en filas densas, 16 dentro de una píldora. */
  lado?: number;
  /** Si el ícono va solo (sin palabra al lado), cómo se lee. Sin esto, es decorativo. */
  titulo?: string;
}

export function Icono({ nombre, lado = 24, titulo, ...resto }: Props) {
  return (
    <svg className="icono" viewBox="0 0 24 24" width={lado} height={lado} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true} data-icono={nombre} {...resto}>
      {ICONOS[nombre]}
    </svg>
  );
}

/** El único gesto en amarillo de cada ilustración: el trazo, inclinado, siempre del mismo tamaño. */
const trazo = (x: number, y: number) => <path className="il-trazo" d={`M${x} ${y}l34-12 3 7-34 12z`} />;

/**
 * Ilustraciones de los estados vacíos: línea fina del color del texto secundario y un solo gesto en amarillo, el trazo.
 * Siempre 120 × 96, siempre con una acción al lado (regla 6 de escritura). Cada una dibuja lo que todavía no está:
 * punteado, lo que falta; con línea llena, lo que ya tenés para empezar.
 */
export const ILUSTRACIONES = {
  /** Todavía no hay plan o metas: una bandera esperando en el horizonte. */
  plan: <><path d="M14 78h92" strokeDasharray="2 6" /><path d="M52 78V26M52 28h30l-7 10 7 10H52" />{trazo(22, 70)}</>,
  /** Todavía no hay datos: los ejes de un gráfico y la primera barra por venir. */
  datos: <><path d="M26 22v56h72" /><path d="M42 78V62M58 78V50M74 78V58" strokeDasharray="2 5" />{trazo(34, 54)}</>,
  /** Nada para repasar: una pila de tarjetas al día. */
  repaso: <><rect x="34" y="30" width="56" height="38" rx="6" /><path d="M28 40v30a6 6 0 0 0 6 6h46" /><path d="M48 44h28M48 54h16" strokeDasharray="2 5" />{trazo(70, 62)}</>,
  /** Sin entreno en curso: la mancuerna apoyada, esperando. */
  entreno: <><rect x="22" y="28" width="11" height="36" rx="4" /><rect x="33" y="35" width="8" height="22" rx="3" /><path d="M41 46h38" /><rect x="79" y="35" width="8" height="22" rx="3" /><rect x="87" y="28" width="11" height="36" rx="4" /><path d="M14 76h92" strokeDasharray="2 6" />{trazo(43, 84)}</>,
  /** Día de descanso: un camino que va hasta un árbol. Hoy se camina. */
  descanso: <><path d="M16 78c18 0 16-18 32-18s14-16 30-16" strokeDasharray="2 6" /><circle cx="88" cy="32" r="13" /><path d="M88 45v20M82 65h12" />{trazo(14, 86)}</>,
  /** Todavía no hay pesajes: la balanza con la aguja en cero. */
  peso: <><rect x="32" y="20" width="56" height="58" rx="12" /><path d="M44 46a16 16 0 0 1 32 0z" /><path d="M60 46l7-9" /><path d="M48 64h24" strokeDasharray="2 5" />{trazo(66, 86)}</>,
  /** Todavía no hay corridas: la zapatilla lista y la pista por delante. */
  correr: <><path d="M30 66V52c0-3 2-5 5-5 4 0 6-3 8-7l3-6c1-2 4-3 6-1l5 6c6 7 13 10 24 12 6 1 9 4 9 9v6z" /><path d="M52 42l5 4M57 37l5 5" /><path d="M10 78h100" strokeDasharray="2 6" /><path d="M12 50h10M8 58h12" />{trazo(54, 90)}</>,
  /** Todavía no ganaste sellos: el lugar del primero, con sus cintas. */
  sello: <><circle cx="60" cy="38" r="22" strokeDasharray="3 5" /><path d="M48 58l-7 22 13-7M72 58l7 22-13-7" /><path d="M60 28v20M50 38h20" strokeDasharray="1 4" />{trazo(72, 30)}</>,
  /** Todavía no hay días cerrados: el calendario con el primer día por tachar. */
  historial: <><rect x="28" y="22" width="64" height="56" rx="10" /><path d="M28 38h64M44 14v14M76 14v14" /><path d="M40 50h8M56 50h8M72 50h8M40 64h8M56 64h8" strokeDasharray="2 5" />{trazo(62, 72)}</>,
  /** No encontré eso: la lupa sobre un lugar vacío. */
  buscar: <><circle cx="54" cy="42" r="20" /><path d="M68 57l18 19" /><path d="M46 42h16" strokeDasharray="2 5" />{trazo(16, 84)}</>,
  /** Todavía no hay nada para estudiar: el libro abierto en la primera página. */
  estudio: <><path d="M60 32c-9-6-20-7-32-3v44c12-4 23-3 32 3 9-6 20-7 32-3V29c-12-4-23-3-32 3z" /><path d="M60 32v44" /><path d="M38 44h12M38 54h12M70 44h12" strokeDasharray="2 5" />{trazo(64, 62)}</>,
  /** Todavía no hay metas en este horizonte: el blanco, sin flecha. */
  metas: <><circle cx="54" cy="48" r="26" /><circle cx="54" cy="48" r="15" strokeDasharray="2 5" /><circle cx="54" cy="48" r="4" /><path d="M76 26l16-12M92 14v10M92 14h-10" />{trazo(60, 86)}</>,
  /** Sin avisos: la campana quieta. */
  avisos: <><path d="M42 62V46a18 18 0 0 1 36 0v16l7 9H35z" /><path d="M53 77a7 7 0 0 0 14 0" /><path d="M60 22v6" /><path d="M90 30h10l-10 10h10" strokeDasharray="1 4" />{trazo(14, 52)}</>,
  /** Todo hecho por hoy: el tilde, con sus rayos. */
  listo: <><circle cx="60" cy="46" r="22" /><path d="M49 46l8 8 15-17" /><path d="M60 12v6M26 46h6M88 46h6M36 22l4 4M84 22l-4 4" strokeDasharray="1 4" />{trazo(42, 90)}</>,
  /** Todavía no hay postulaciones ni ventas: el maletín cerrado. */
  trabajo: <><rect x="26" y="34" width="68" height="42" rx="9" /><path d="M46 34v-6a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5v6" /><path d="M26 54h28M66 54h28" /><rect x="54" y="49" width="12" height="10" rx="3" />{trazo(70, 88)}</>,
  /** Todavía no hay clips: el cuadro de video esperando el primero. */
  clip: <><rect x="24" y="26" width="72" height="48" rx="10" /><path d="M54 40v20l17-10z" /><path d="M34 26v-8M50 26v-8M66 26v-8M82 26v-8" strokeDasharray="1 4" />{trazo(16, 88)}</>,
  /** Sin sesión de foco: el cronómetro en cero. */
  foco: <><circle cx="60" cy="52" r="26" /><path d="M52 18h16M60 18v8M82 30l5-5" /><path d="M60 52V36" /><path d="M60 68v4M44 52h-4M76 52h4" strokeDasharray="1 4" />{trazo(14, 88)}</>,
  /** Todavía no escribiste nada: la hoja en blanco y el primer renglón. */
  escribir: <><path d="M34 18h36l16 16v44H34z" /><path d="M70 18v16h16" /><path d="M44 46h30M44 56h30" strokeDasharray="2 5" />{trazo(44, 74)}</>,
  /** Nada importado todavía: la bandeja con la flecha que entra. */
  importar: <><path d="M24 54l10-24h52l10 24v22H24z" /><path d="M24 54h22a14 14 0 0 0 28 0h22" /><path d="M60 8v26M52 27l8 8 8-8" strokeDasharray="2 5" />{trazo(70, 92)}</>,
} satisfies Record<string, ReactNode>;

export type NombreIlustracion = keyof typeof ILUSTRACIONES;
export const NOMBRES_ILUSTRACION = Object.keys(ILUSTRACIONES) as NombreIlustracion[];

export function Ilustracion({ nombre, titulo }: { nombre: NombreIlustracion; titulo?: string }) {
  return (
    <svg className="ilustracion" viewBox="0 0 120 96" width={120} height={96} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      {ILUSTRACIONES[nombre]}
    </svg>
  );
}
