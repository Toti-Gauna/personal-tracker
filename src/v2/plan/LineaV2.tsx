/**
 * Trazo 2.0 · la línea de tiempo (#/metas/linea). El plan entero en un eje: arriba las etapas y las fases como tramos;
 * abajo, un carril por tipo (proyectos, certificaciones, matemática, inglés y búsqueda, cierres) y los dos de fondo. Hoy es
 * la raya amarilla. Se acerca y se aleja con los botones, pellizcando o con Ctrl + rueda; cada barra se toca y abre su hoja.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { periodosComerciales, periodosSecundarias } from '../../data/fondo';
import { HERRAMIENTAS, fechasVersion } from '../../data/herramientas';
import { medir, type PeriodoMedido } from '../../data/periodos';
import { PLAN_EXT } from '../../data/plan-extendido';
import { PAUSAS_FONDO } from '../../data/v12-2';
import { useStore } from '../../state/store';
import { usePeriodos } from '../../ui/usePeriodos';
import { Boton, Segmentado } from '../kit/controles';
import { Barra } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { reducido } from '../movimiento/movimiento';
import { ESTADOS, nombreConRotulo } from '../reglas';
import { HojaPeriodo, Lentes } from './Compartido';
import { fecha, partesNombre, rango } from './datos';
import { ZOOMS, acotar, anchoDe, carriles, empezados, escalaDe, limitesPpd, marcasEje, ppdDe, scrollAlEscalar, xDe, zoomCercano, type Escala, type Zoom } from './linea-datos';
import { areaDe } from './TarjetaPeriodo';

const INFO = (
  <>
    <p className="t-cuerpo-l">El plan entero sobre un eje de tiempo. La raya amarilla es hoy.</p>
    <p className="t-cuerpo">Arriba van las etapas y las fases. Abajo, un carril por tipo de bloque, y los dos de fondo. Lo rayado es una pausa: ahí no se trabaja.</p>
    <p className="t-cuerpo">Cada barra se llena con el trabajo hecho y se vuelve amarilla cuando termina. Tocala para ver cómo va.</p>
    <p className="t-cuerpo">Para acercar o alejar: los botones, pellizcar con dos dedos, o Ctrl + rueda.</p>
  </>
);

/** El aire a cada lado del plan, para que el primer día y el último no queden pegados al borde. */
const MARGEN = 20;

const n1 = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',');
/** Lo que se lee en una barra según cuánto mide: el nombre, su código o nada. */
function rotuloBarra(p: PeriodoMedido, ancho: number) {
  const corto = p.track === 'comercial' ? p.nombre.split(' · ')[0] : p.track === 'secundaria' ? p.nombre : p.id;
  const largo = p.track === 'comercial' ? p.nombre.split(' · ').slice(1).join(' · ') || p.nombre : p.nombre;
  if (ancho >= Math.max(64, largo.length * 6.4 + 14)) return largo;
  if (ancho >= corto.length * 7.5 + 10) return corto;
  return '';
}
function rotuloTramo(p: PeriodoMedido, ancho: number) {
  const { prefijo } = partesNombre(p);
  if (ancho >= p.nombre.length * 6.2 + 16) return p.nombre;
  if (ancho >= prefijo.length * 6.6 + 12) return prefijo;
  return ancho >= 18 ? prefijo.replace(/^\D+/, '') : '';
}

/** v12.4 · las herramientas open source como marcas sobre el carril de proyectos: una por versión, el día en que sale (el cierre de su origen). */
const MARCAS_HERRAMIENTAS = HERRAMIENTAS.flatMap((h) => h.versiones.filter((v) => v.donde !== 'recurrente').flatMap((v) => {
  const f = fechasVersion(v);
  return f ? [{ id: `${h.id}:${v.id}`, nombre: `${h.nombre} ${/^\d/.test(v.id) ? `v${v.id}` : v.id}`, fecha: f.fin }] : [];
}));

export function LineaV2({ hoy }: { hoy: string }) {
  const { arbol } = usePeriodos(hoy);
  const plan = useStore((s) => s.plan);
  const fondo = useMemo(() => ({ sec: periodosSecundarias(plan).map((p) => medir(p, hoy)), com: periodosComerciales(plan).map((p) => medir(p, hoy)) }), [plan, hoy]);
  const lanes = useMemo(() => carriles(arbol, fondo), [arbol, fondo]);
  const fases = arbol.flatMap((e) => e.hijos ?? []);
  const inicio = arbol[0].inicio;
  const fin = arbol[arbol.length - 1].fin;

  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(350);
  const [ppd, setPpd] = useState<number | null>(null);
  const [elegido, setElegido] = useState<PeriodoMedido | null>(null);
  /** El día (con decimales) que tiene que quedar a `x` px del borde visible después de cambiar la escala. */
  const ancla = useRef<{ dia: number; x: number } | null>(null);
  const escala: Escala = escalaDe(inicio, fin, ppd ?? ppdDe('trimestre', ancho, 1));
  const dias = escala.dias;
  const lim = limitesPpd(ancho, dias);

  // El ancho visible, y la primera escala: un trimestre, con hoy a un cuarto del borde.
  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medirAncho = () => setAncho(el.clientWidth || 350);
    medirAncho();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(medirAncho);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (ppd != null) return;
    const p0 = acotar(ppdDe('trimestre', ancho, dias), limitesPpd(ancho, dias));
    ancla.current = { dia: xDe(escalaDe(inicio, fin, 1), hoy), x: ancho * 0.25 };
    setPpd(p0);
  }, [ancho]); // eslint-disable-line react-hooks/exhaustive-deps
  // Después de cada cambio de escala, el día del ancla vuelve a su lugar.
  useLayoutEffect(() => {
    const el = caja.current;
    if (!el || ppd == null || !ancla.current) return;
    el.scrollLeft = Math.max(0, MARGEN + ancla.current.dia * ppd - ancla.current.x);
    ancla.current = null;
  }, [ppd]);

  const escalar = (nuevo: number, foco: number) => {
    const el = caja.current;
    if (!el || ppd == null) return;
    const p = acotar(nuevo, lim);
    if (Math.abs(p - ppd) < 1e-6) return;
    ancla.current = { dia: (el.scrollLeft + foco - MARGEN) / ppd, x: foco };
    setPpd(p);
  };

  // Pellizcar con dos dedos y Ctrl + rueda. Con un dedo, el desplazamiento es el del navegador.
  useEffect(() => {
    const el = caja.current;
    if (!el || ppd == null) return;
    let gesto: { d0: number; ppd0: number; dia: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const medio = (t: TouchList) => (t[0].clientX + t[1].clientX) / 2 - el.getBoundingClientRect().left;
    const empieza = (e: TouchEvent) => { if (e.touches.length === 2) gesto = { d0: dist(e.touches), ppd0: ppd, dia: (el.scrollLeft + medio(e.touches) - MARGEN) / ppd }; };
    const mueve = (e: TouchEvent) => {
      if (!gesto || e.touches.length !== 2) return;
      e.preventDefault();
      const p = acotar(gesto.ppd0 * (dist(e.touches) / gesto.d0), lim);
      ancla.current = { dia: gesto.dia, x: medio(e.touches) };
      setPpd(p);
    };
    const termina = (e: TouchEvent) => { if (e.touches.length < 2) gesto = null; };
    const rueda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      escalar(ppd * Math.exp(-e.deltaY * 0.01), e.clientX - el.getBoundingClientRect().left);
    };
    el.addEventListener('touchstart', empieza, { passive: true });
    el.addEventListener('touchmove', mueve, { passive: false });
    el.addEventListener('touchend', termina, { passive: true });
    el.addEventListener('touchcancel', termina, { passive: true });
    el.addEventListener('wheel', rueda, { passive: false });
    return () => { el.removeEventListener('touchstart', empieza); el.removeEventListener('touchmove', mueve); el.removeEventListener('touchend', termina); el.removeEventListener('touchcancel', termina); el.removeEventListener('wheel', rueda); };
  }, [ppd, lim.min, lim.max]); // eslint-disable-line react-hooks/exhaustive-deps

  const enPlan = hoy >= inicio && hoy <= fin;
  /** Los botones acercan sobre hoy si hoy está a la vista; si no, sobre el centro. */
  const focoBotones = () => {
    const x = MARGEN + xDe(escala, hoy) + escala.ppd / 2 - (caja.current?.scrollLeft ?? 0);
    return enPlan && x >= 0 && x <= ancho ? x : ancho / 2;
  };
  const irAHoy = () => caja.current?.scrollTo({ left: Math.max(0, MARGEN + xDe(escala, hoy) - ancho * 0.25), behavior: reducido() ? 'auto' : 'smooth' });
  const zoom: Zoom = zoomCercano(escala.ppd, ancho, dias);
  const pausas = PLAN_EXT.capacidad?.fijas ?? [];
  const lista = empezados(arbol, hoy);

  const barra = (p: PeriodoMedido) => {
    const w = Math.max(3, anchoDe(escala, p.inicio, p.fin) - 1);
    const texto = rotuloBarra(p, w);
    const estilo = { left: xDe(escala, p.inicio), width: w, ['--area' as string]: areaDe(p) } as CSSProperties;
    const ahora = p.inicio <= hoy && hoy <= p.fin && p.estado !== 'hecho';
    return (
      <button key={p.id} type="button" className={`ln-barra ${p.estado}${ahora ? ' ahora' : ''}`} style={estilo} onClick={() => setElegido(p)}
        aria-label={nombreConRotulo(texto, `${p.nombre}, ${rango(p.inicio, p.fin, hoy)}, ${ESTADOS[p.estado].palabra.toLowerCase()}`)}>
        <i style={{ width: `${p.trabajo * 100}%` }} />
        {texto && <span>{texto}</span>}
      </button>
    );
  };
  const tramo = (p: PeriodoMedido) => {
    const w = Math.max(3, anchoDe(escala, p.inicio, p.fin) - 1);
    const texto = rotuloTramo(p, w);
    return (
      <button key={p.id} type="button" className={`ln-tramo ${p.estado}`} style={{ left: xDe(escala, p.inicio), width: w }} onClick={() => setElegido(p)}
        aria-label={nombreConRotulo(texto, `${p.nombre}, ${rango(p.inicio, p.fin, hoy)}, ${ESTADOS[p.estado].palabra.toLowerCase()}`)}>
        <span>{texto}</span>
      </button>
    );
  };

  return (
    <Marco className="pl ln" titulo="Plan" info={INFO}>
      <Lentes actual="linea" />
      <div className="ln-controles">
        <Segmentado etiqueta="Cuánto se ve" valor={zoom} opciones={ZOOMS} onCambio={(z) => escalar(ppdDe(z, ancho, dias), focoBotones())} />
        {enPlan && <Boton tamano="s" icono="hoy" onClick={irAHoy}>Hoy</Boton>}
      </div>

      <div className="capa-1 ln-caja" ref={caja} data-grafico role="group" tabIndex={0} aria-label={`Línea de tiempo del plan, del ${fecha(inicio)} al ${fecha(fin)}`}>
        <div className="ln-lienzo" style={{ width: Math.max(ancho, dias * escala.ppd + MARGEN * 2) }}>
         <div className="ln-dentro" style={{ width: dias * escala.ppd }}>
          <div className="ln-fondo" aria-hidden="true">
            {marcasEje(escala).map((m) => <i key={m.fecha} className={`ln-grilla${m.fuerte ? ' fuerte' : ''}`} style={{ left: xDe(escala, m.fecha) }} />)}
            {pausas.map((x) => <i key={x.inicio} className="ln-pausa" style={{ left: xDe(escala, x.inicio), width: anchoDe(escala, x.inicio, x.fin) }} />)}
            {enPlan && <i className="ln-hoy" style={{ left: xDe(escala, hoy) + escala.ppd / 2 }} />}
          </div>
          <div className="ln-eje" aria-hidden="true">
            {marcasEje(escala).map((m) => <span key={m.fecha} className={m.fuerte ? 'fuerte' : undefined} style={{ left: xDe(escala, m.fecha) }}>{m.texto}</span>)}
            {enPlan && <b className="trazo-marca" style={{ left: xDe(escala, hoy) + escala.ppd / 2 }}>hoy</b>}
          </div>
          <div className="ln-tramos" role="group" aria-label="Etapas">{arbol.map(tramo)}</div>
          <div className="ln-tramos fases" role="group" aria-label="Fases">{fases.map(tramo)}</div>
          {lanes.map((c) => (
            <div key={c.id} className="ln-carril" role="group" aria-label={c.nombre} style={{ ['--area' as string]: c.area }}>
              <span className="ln-carril-nombre"><i className="area-punto" />{c.nombre}</span>
              {c.id === 'proyectos' && (
                <div className="ln-herramientas" role="group" aria-label="Herramientas open source">
                  {MARCAS_HERRAMIENTAS.map((m) => <a key={m.id} className="ln-herr" href="#/metas/open-source" style={{ left: xDe(escala, m.fecha) + escala.ppd / 2 }} aria-label={`${m.nombre}, ${fecha(m.fecha)}`} title={`${m.nombre} · ${fecha(m.fecha)}`} />)}
                </div>
              )}
              <div className="ln-pista">
                {c.fondo && PAUSAS_FONDO.filter((x) => !pausas.some((f) => f.inicio === x.inicio)).map((x) => <i key={x.id} className="ln-pausa" aria-hidden="true" style={{ left: xDe(escala, x.inicio), width: anchoDe(escala, x.inicio, x.fin) }} />)}
                {c.barras.map(barra)}
              </div>
            </div>
          ))}
         </div>
        </div>
      </div>
      <p className="t-nota ln-pista-texto">Tocá un bloque para ver cómo va. Pellizcá para acercar.</p>

      {lista.length > 0 && (
        <Grupo titulo="Horas" extremo={<span className="t-rotulo">reales de planificadas</span>}>
          <ul className="capa-1 hy-contadores">
            {lista.map((b) => (
              <li key={b.id} style={{ ['--area' as string]: areaDe(b) }}>
                <span className="hy-contador-texto">
                  <b><i className="area-punto" />{b.nombre}</b>
                  <small className="t-dato">{n1(b.horasReal ?? 0)} de {n1(b.horasPlan ?? 0)} h</small>
                  <Barra nombre={`Horas de ${b.nombre}`} valor={b.horasReal ?? 0} max={b.horasPlan ?? 1} area="var(--area)" />
                </span>
              </li>
            ))}
          </ul>
        </Grupo>
      )}
      <HojaPeriodo p={elegido} hoy={hoy} onCerrar={() => setElegido(null)} />
    </Marco>
  );
}
