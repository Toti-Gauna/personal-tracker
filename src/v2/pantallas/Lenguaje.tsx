/**
 * Trazo 2.0 · #/v2: el lenguaje visual en vivo (tanda 1.2). Muestra las capas, el texto, las áreas, los estados, los 8 roles
 * de tipografía, la forma, el movimiento y las reglas de escritura con los tokens reales, en el tema que esté puesto.
 * Los componentes de verdad llegan en las tandas 1.4 y 1.5; acá solo hay muestras.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { contraste } from '../color';
import { ESTADOS, GLOSARIO, PRESUPUESTO, contarPalabras, type EstadoVisual } from '../reglas';
import '../tokens.css';
import '../base.css';
import './lenguaje.css';

const AREAS: [string, string][] = [['ing', 'Ingeniería'], ['handyx', 'Handyx'], ['eclipse', 'Eclipse'], ['salud', 'Salud'], ['rutina', 'Rutina'], ['economia', 'Economía'], ['idi', 'Inglés']];

const ROLES: { clase: string; nombre: string; ficha: string; muestra: string }[] = [
  { clase: 't-heroe', nombre: 'Héroe', ficha: '44 · Archivo 900', muestra: '72 %' },
  { clase: 't-titulo', nombre: 'Título', ficha: '32 · Archivo 900', muestra: 'Hoy' },
  { clase: 't-seccion', nombre: 'Sección', ficha: '24 · Archivo 800', muestra: 'PetrIA v1.0' },
  { clase: 't-encabezado', nombre: 'Encabezado', ficha: '20 · Geist 650', muestra: 'Bloque 1 · foco' },
  { clase: 't-cuerpo-l', nombre: 'Cuerpo grande', ficha: '17 · Geist 450', muestra: 'Ahora toca programación.' },
  { clase: 't-cuerpo', nombre: 'Cuerpo', ficha: '15 · Geist 400', muestra: 'Tres lotes vencen hoy.' },
  { clase: 't-nota', nombre: 'Nota', ficha: '13 · Geist 400', muestra: 'Se guarda solo en este teléfono.' },
  { clase: 't-rotulo', nombre: 'Rótulo', ficha: '11 · Geist Mono 500', muestra: 'Semana 1 de 52' },
];

const ANTES = 'Cada meta es un período: la barra de tiempo dice cuánto pasó y la de trabajo cuánto está hecho. Si algo se atrasa, Trazo sugiere correr lo que sigue y no cambia nada hasta que lo confirmes.';
const AHORA = 'Tu plan, de la etapa al lote.';

/** Íconos de muestra (16 px, trazo de 1,75). El juego completo es la tanda 1.3. */
const ICONOS: Record<string, ReactNode> = {
  reloj: <><circle cx="8" cy="8" r="5.6" /><path d="M8 5v3.2l2 1.3" /></>,
  ritmo: <path d="M1.8 8h2.6l1.6-4 2.6 8 1.7-4h3.9" />,
  adelante: <path d="M3 4l4 4-4 4M9 4l4 4-4 4" />,
  pausa: <path d="M5.5 3.5v9M10.5 3.5v9" />,
  atencion: <><path d="M8 2.6l6 10.4H2z" /><path d="M8 6.8v2.8M8 11.4v.1" /></>,
  alerta: <><circle cx="8" cy="8" r="5.6" /><path d="M8 5v3.4M8 10.8v.1" /></>,
  tilde: <path d="M3 8.4l3.2 3.2L13 4.6" />,
};

function Pildora({ e }: { e: EstadoVisual }) {
  return (
    <span className={`mu-pildora ${e.tono}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true">{ICONOS[e.icono]}</svg>
      {e.palabra}
    </span>
  );
}

/** Lee los tokens ya resueltos del tema activo, para mostrar el contraste real. */
function useTokens(nombres: string[]) {
  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => {
    const leer = () => {
      const cs = getComputedStyle(document.documentElement);
      setV(Object.fromEntries(nombres.map((n) => [n, cs.getPropertyValue(n).trim()])));
    };
    leer();
    const obs = new MutationObserver(leer);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-ui'] });
    return () => obs.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

const razon = (a?: string, b?: string) => (a?.startsWith('#') && b?.startsWith('#') ? `${contraste(a, b).toFixed(1).replace('.', ',')} : 1` : '');

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="mu-seccion" aria-label={titulo}>
      <div className="mu-cabeza"><h2 className="t-rotulo">{titulo}</h2>{nota && <span className="t-rotulo">{nota}</span>}</div>
      {children}
    </section>
  );
}

export default function Lenguaje() {
  const t = useTokens(['--capa-1', '--texto', '--texto-2', '--texto-3']);
  const [vuelta, setVuelta] = useState(0);
  return (
    <main className="v2 v2-pantalla lenguaje">
      <nav className="mu-volver"><a href="#/ajustes">Ajustes</a></nav>
      <header className="mu-encabezado">
        <p className="t-rotulo">Trazo 2.0 · lenguaje</p>
        <h1 className="t-titulo">Instrumento</h1>
        <p className="t-cuerpo-l mu-intro">Las reglas visuales de la 2.0, en vivo.</p>
      </header>

      <div className="capa-heroe mu-heroe" key={`h${vuelta}`}>
        <svg className="mu-logo" viewBox="80 130 360 250" aria-hidden="true">
          <g fill="currentColor"><polygon points="168,158 202,158 186,354 152,354" /><polygon points="220,150 254,150 238,362 204,362" /><polygon points="272,152 306,152 290,358 256,358" /><polygon points="324,148 358,148 342,350 308,350" /></g>
          <polygon className="mu-logo-trazo" points="96,330 372,150 424,186 150,372" />
        </svg>
        <p className="t-seccion">Un trazo por cada cosa <span className="trazo-marca entra">hecha</span>.</p>
        <p className="t-nota">El amarillo dice dos cosas y nada más: acá estás, y esto está hecho.</p>
      </div>

      <Seccion titulo="Capas" nota="la profundidad es luz">
        <div className="mu-capas">
          <div className="mu-capa c0"><span className="t-rotulo">0 · mesa</span>
            <div className="mu-capa c1"><span className="t-rotulo">1 · tarjeta</span>
              <div className="mu-capa c2"><span className="t-rotulo">2 · control</span>
                <div className="mu-capa c3"><span className="t-rotulo">3 · flota</span></div>
              </div>
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Texto" nota="contraste sobre tarjeta">
        <ul className="mu-lista capa-1">
          <li><span className="t-cuerpo-l">Principal</span><span className="t-rotulo t-dato">{razon(t['--texto'], t['--capa-1'])}</span></li>
          <li><span className="t-cuerpo-l" style={{ color: 'var(--texto-2)' }}>Secundario</span><span className="t-rotulo t-dato">{razon(t['--texto-2'], t['--capa-1'])}</span></li>
          <li><span className="t-cuerpo-l" style={{ color: 'var(--texto-3)' }}>Tenue · solo decorativo</span><span className="t-rotulo t-dato">{razon(t['--texto-3'], t['--capa-1'])}</span></li>
        </ul>
      </Seccion>

      <Seccion titulo="Áreas" nota="un punto, nunca una alarma">
        <ul className="mu-areas">
          {AREAS.map(([id, n]) => <li key={id} style={{ ['--area' as string]: `var(--a-${id})` }}><i className="area-punto" />{n}</li>)}
        </ul>
        <div className="capa-1 mu-fila" style={{ ['--area' as string]: 'var(--a-idi)' }}>
          <i className="area-punto" />
          <span><b className="t-cuerpo-l">Inglés · modo entrevista</b><small className="t-nota">16:30 · 2 de 3 pasos</small></span>
          <Pildora e={ESTADOS['en-plan']} />
        </div>
      </Seccion>

      <Seccion titulo="Estados" nota="ícono + palabra">
        <div className="mu-estados">{Object.values(ESTADOS).map((e) => <Pildora key={e.palabra} e={e} />)}</div>
        <p className="t-nota">El rojo es uno solo y se reserva para lo vencido. Atrasado va lleno y sin tinte: pide atención sin gritar.</p>
      </Seccion>

      <Seccion titulo="Tipografía" nota="8 tamaños">
        <ul className="mu-tipos">
          {ROLES.map((r) => <li key={r.clase}><span className={r.clase}>{r.muestra}</span><span className="t-rotulo">{r.nombre} · {r.ficha}</span></li>)}
        </ul>
      </Seccion>

      <Seccion titulo="Forma" nota="3 radios · espacio de a 4">
        <div className="mu-radios">
          {[['s', '8', 'control'], ['m', '14', 'tarjeta'], ['l', '22', 'héroe'], ['pildora', '∞', 'píldora']].map(([r, px, n]) => <div key={r}><i style={{ borderRadius: `var(--r-${r})` }} /><span className="t-rotulo"><b>{px}</b>{n}</span></div>)}
        </div>
        <div className="mu-espacios" aria-hidden="true">{[4, 8, 12, 16, 20, 24, 32, 40, 56].map((n) => <i key={n} style={{ width: n }} data-n={n} />)}</div>
      </Seccion>

      <Seccion titulo="Movimiento" nota="4 duraciones · 3 curvas">
        <div className="capa-1 mu-mov" key={`m${vuelta}`}>
          {[['salida', 'Salida · lo que entra'], ['ida-vuelta', 'Ida y vuelta · lo que se mueve'], ['resorte', 'Resorte · lo que festeja']].map(([c, n]) => (
            <div key={c}><span className="t-rotulo">{n}</span><div className="mu-riel"><i style={{ animationTimingFunction: `var(--curva-${c})` }} /></div></div>
          ))}
          <button className="mu-boton" onClick={() => setVuelta((x) => x + 1)}>Probar de nuevo</button>
        </div>
      </Seccion>

      <Seccion titulo="Escritura" nota={`${PRESUPUESTO.titulo} · ${PRESUPUESTO.intro} · ${PRESUPUESTO.pliegue} palabras`}>
        <div className="mu-escritura">
          <div className="capa-1"><span className="t-rotulo">Antes · {contarPalabras(ANTES)} palabras</span><p className="t-nota">{ANTES}</p></div>
          <div className="capa-1 ahora"><span className="t-rotulo">Ahora · {contarPalabras(AHORA)} palabras</span><p className="t-cuerpo-l">{AHORA}</p></div>
        </div>
        <p className="t-nota">Título: hasta {PRESUPUESTO.titulo} palabras. Bajo el título: hasta {PRESUPUESTO.intro}. Antes de desplazar: hasta {PRESUPUESTO.pliegue}. La explicación larga vive en la ⓘ.</p>
      </Seccion>

      <Seccion titulo="Glosario" nota="la jerga, traducida">
        <ul className="mu-lista capa-1 mu-glosario">
          {GLOSARIO.slice(0, 6).map((g) => <li key={g.antes}><span className="t-nota t-dato">{g.antes}</span><span className="t-cuerpo">{g.ahora}</span></li>)}
        </ul>
      </Seccion>
    </main>
  );
}
