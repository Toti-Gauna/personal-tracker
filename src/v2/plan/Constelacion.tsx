/**
 * Trazo 2.0 · el mapa del plan (#/metas/constelacion): el plan entero como una espiral de estrellas. Cada vuelta es una
 * fase; cada estrella, un bloque. Primero se ve el mapa plano (SVG, al instante); cuando carga three.js aparece la escena
 * en 3D en el mismo encuadre y vuela hasta hoy. Sin WebGL queda el mapa plano. Abajo, las fases como lista, para entrar.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { PeriodoMedido } from '../../data/periodos';
import { usePeriodos } from '../../ui/usePeriodos';
import { Boton } from '../kit/controles';
import { Dato } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { reducido } from '../movimiento/movimiento';
import { HojaPeriodo, Lentes } from './Compartido';
import { caminoPlano, constelacion, leerColores, puntoEn, type Constelacion as Datos, type Estrella } from './constelacion-datos';
import type { Escena, Vista } from './constelacion-escena';
import { fecha } from './datos';
import { FilaPeriodo } from './TarjetaPeriodo';

const INFO = (
  <>
    <p className="t-cuerpo-l">El plan entero como una espiral que sale del centro. Es la línea de tiempo, enrollada.</p>
    <p className="t-cuerpo">Cada vuelta es una fase y empieza arriba, a las doce. Cada estrella es un bloque: el color es su área y el tamaño, sus horas.</p>
    <p className="t-cuerpo">El punto amarillo que late es hoy. Una estrella se vuelve amarilla cuando terminás el bloque.</p>
    <p className="t-cuerpo">Arrastrá para girar, pellizcá para acercar y tocá una estrella para ver cómo va.</p>
  </>
);

const LEYENDA: [string, string][] = [['var(--a-ing)', 'Proyectos y certs'], ['var(--a-economia)', 'Matemática'], ['var(--a-idi)', 'Inglés'], ['var(--a-rutina)', 'Búsqueda'], ['var(--texto-2)', 'Cierres'], ['var(--trazo)', 'Hecho']];

const hayWebGL = () => typeof window !== 'undefined' && typeof WebGL2RenderingContext !== 'undefined';

/** El tema que está puesto (cambia si lo cambiás en Ajustes o si el teléfono pasa de día a noche). */
function useTema() {
  const [tema, setTema] = useState(() => document.documentElement.dataset.theme ?? 'dark');
  useEffect(() => {
    const o = new MutationObserver(() => setTema(document.documentElement.dataset.theme ?? 'dark'));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => o.disconnect();
  }, []);
  return tema;
}

/** El mapa visto de arriba, en SVG: lo que se ve al instante, y lo que queda si no hay 3D. */
export function MapaPlano({ datos, onElegir }: { datos: Datos; onElegir: (e: Estrella) => void }) {
  const R = datos.radioMax + 0.9;
  const hoy = datos.enCurso || datos.hoy > 0 ? datos.hoy : -1;
  return (
    <svg className="cs-plano" viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g className="cs-cinta">
        {datos.estrellas.map((e) => {
          const corte = Math.max(e.desde, Math.min(e.hasta, hoy));
          const estilo = { ['--area' as string]: e.area } as CSSProperties;
          return (
            <g key={e.id} style={estilo}>
              {corte > e.desde && <path className="pasado" d={caminoPlano(e.desde, corte)} />}
              {corte < e.hasta && <path d={caminoPlano(corte, e.hasta)} />}
            </g>
          );
        })}
      </g>
      {datos.vueltas.map((v) => { const p = puntoEn(v.t - 0.012); return <text key={v.id} className="cs-fase" x={p.x - 0.22} y={p.z + 0.12} textAnchor="end" fontSize={0.4}>{v.corto}</text>; })}
      <circle className="cs-sol" r={0.2} />
      {datos.estrellas.map((e) => (
        <circle key={e.id} className={`cs-estrella ${e.estado === 'hecho' ? 'hecho' : e.ahora ? 'ahora' : e.trabajo > 0 ? 'curso' : ''}${e.estado === 'vencido' ? ' vencido' : ''}`} cx={e.x} cy={e.z} r={e.tam}
          style={{ ['--area' as string]: e.area } as CSSProperties} onClick={() => onElegir(e)} />
      ))}
      {datos.enCurso && (() => { const p = puntoEn(datos.hoy); return <g className="cs-hoy"><circle className="onda" cx={p.x} cy={p.z} r={0.3} /><circle cx={p.x} cy={p.z} r={0.1} /></g>; })()}
    </svg>
  );
}

export function Constelacion({ hoy }: { hoy: string }) {
  const { arbol } = usePeriodos(hoy);
  const datos = useMemo(() => constelacion(arbol, hoy), [arbol, hoy]);
  const tema = useTema();
  const [idElegido, setIdElegido] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [plano, setPlano] = useState(() => !hayWebGL());
  const caja = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const capa = useRef<HTMLDivElement>(null);
  const escena = useRef<Escena | null>(null);
  const ultimo = useRef(datos);
  ultimo.current = datos;

  const colores = () => leerColores(caja.current!, [...new Set(ultimo.current.estrellas.map((e) => e.area))]);

  // La escena se crea una vez; three.js viaja aparte y solo acá.
  useEffect(() => {
    if (plano) return;
    let vivo = true;
    import('./constelacion-escena')
      .then(({ crearEscena }) => {
        if (!vivo || !caja.current || !lienzo.current || !capa.current) return;
        escena.current = crearEscena({
          lienzo: lienzo.current, caja: caja.current, capa: capa.current,
          datos: ultimo.current, colores: colores(), vista: 'ahora', quieto: reducido(),
          onElegir: (e) => setIdElegido(e.id),
          onListo: () => { if (vivo) setListo(true); },
          onPerdida: () => { if (vivo) setPlano(true); },
        });
      })
      .catch(() => { if (vivo) setPlano(true); });
    return () => { vivo = false; escena.current?.destruir(); escena.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano]);

  // Si cambia el plan (marcaste algo, corriste fechas) o el tema, se vuelve a pintar.
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    escena.current?.poner(datos, colores());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, tema]);

  const ver = (v: Vista) => escena.current?.ver(v);
  const elegido: PeriodoMedido | null = datos.estrellas.find((e) => e.id === idElegido)?.p ?? null;
  const fases = datos.vueltas;
  const faseHoy = datos.ahora ? datos.ahora.fase + 1 : datos.hoy >= datos.total ? datos.total : 0;
  const fin = arbol[arbol.length - 1]?.fin;
  const en3d = !plano && listo;

  return (
    <Marco className="pl cs" titulo="Plan" info={INFO}>
      <Lentes actual="mapa" />
      <div className={`cs-escena${en3d ? ' en-3d' : ''}`}>
        <div className="cs-gestos" ref={caja} data-grafico tabIndex={0} role="group"
          aria-label={`Mapa del plan: ${datos.estrellas.length} bloques en ${fases.length} fases, ${datos.hechas} hechos.${datos.ahora ? ` Ahora: ${datos.ahora.nombre}.` : ''} Las fases están en la lista de abajo.`}>
          <MapaPlano datos={datos} onElegir={(e) => setIdElegido(e.id)} />
          {!plano && <canvas ref={lienzo} className="cs-lienzo" aria-hidden="true" />}
          <div ref={capa} className="cs-rotulos" aria-hidden="true" />
        </div>
        {en3d && (
          <div className="cs-vistas">
            <Boton tamano="s" variante="secundario" icono="hoy" onClick={() => ver('ahora')}>Hoy</Boton>
            <Boton tamano="s" variante="secundario" icono="mapa" onClick={() => ver('todo')}>Todo</Boton>
          </div>
        )}
      </div>
      <ul className="cs-leyenda" aria-label="Colores">
        {LEYENDA.map(([area, nombre]) => <li key={nombre}><i className="area-punto" style={{ ['--area' as string]: area } as CSSProperties} />{nombre}</li>)}
      </ul>

      <div className="cs-datos">
        <Dato valor={datos.hechas} unidad={`de ${datos.estrellas.length}`} etiqueta="Bloques hechos" />
        <Dato valor={faseHoy || '—'} unidad={`de ${fases.length}`} etiqueta="Fase" />
        {fin && <Dato valor={fin.slice(0, 4)} etiqueta={`Llegada · ${fecha(fin)}`} />}
      </div>

      <Grupo titulo="Fases">
        <div className="capa-1 pl-lista">{fases.map((v) => <FilaPeriodo key={v.id} p={v.p} hoy={hoy} />)}</div>
      </Grupo>

      <HojaPeriodo p={elegido} hoy={hoy} onCerrar={() => setIdElegido(null)} />
    </Marco>
  );
}
