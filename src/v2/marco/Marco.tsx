/**
 * Trazo 2.0 · el marco de cada pantalla: arriba, volver y las acciones; después el título grande, que al desplazar se
 * achica dentro de la barra de arriba. La explicación va en la ⓘ, no bajo el título (lenguaje §7).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icono } from '../iconos';
import { Info } from '../kit/hoja';
import { PRESUPUESTO, contarPalabras } from '../reglas';
import '../tokens.css';
import '../base.css';
import '../kit/kit.css';
import '../kit/superficies.css';
import './marco.css';

export interface Miga { nombre: string; href?: string }

interface Props {
  titulo: string;
  /** La línea chica de arriba del título: dónde estás ("Fase 1 · bloque P1"). */
  rotulo?: ReactNode;
  /** Hasta 12 palabras, o nada. */
  intro?: string;
  volver?: { href: string; nombre: string };
  /** El camino hasta acá, de afuera hacia adentro. Reemplaza a `rotulo`. */
  migas?: Miga[];
  /** Arriba a la derecha: solo acciones (botones), nunca datos. */
  acciones?: ReactNode;
  /** El contenido de la ⓘ: cómo funciona esta pantalla. */
  info?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Marco({ titulo, rotulo, intro, volver, migas, acciones, info, children, className }: Props) {
  const h1 = useRef<HTMLHeadingElement>(null);
  const [compacta, setCompacta] = useState(false);
  useEffect(() => {
    if (!h1.current || typeof IntersectionObserver === 'undefined') return;
    const o = new IntersectionObserver(([e]) => setCompacta(!e.isIntersecting), { rootMargin: '-52px 0px 0px 0px' });
    o.observe(h1.current);
    return () => o.disconnect();
  }, []);
  // En las pantallas raíz (sin "volver") el rótulo ocupa el lugar libre de la barra de arriba.
  const enBarra = !volver && !migas?.length && !!rotulo;
  if (import.meta.env.DEV) {
    if (contarPalabras(titulo) > PRESUPUESTO.titulo) console.warn(`Trazo 2.0: el título "${titulo}" pasa las ${PRESUPUESTO.titulo} palabras.`);
    if (intro && contarPalabras(intro) > PRESUPUESTO.intro) console.warn(`Trazo 2.0: la intro de "${titulo}" pasa las ${PRESUPUESTO.intro} palabras.`);
  }
  return (
    <main className={`v2 v2-pantalla m-marco ${className ?? ''}`}>
      <div className={`m-barra${compacta ? ' compacta' : ''}`}>
        {volver ? <a className="m-volver" href={volver.href} data-transicion="atras"><Icono nombre="atras" lado={20} /><span>{volver.nombre}</span></a>
          : enBarra ? <p className="t-rotulo m-rotulo-barra">{rotulo}</p> : <span />}
        <span className="m-titulo-chico" aria-hidden="true">{titulo}</span>
        <div className="m-acciones">{acciones}</div>
      </div>
      <header className="m-cabeza">
        {migas?.length ? (
          <nav className="m-migas" aria-label="Camino">
            {migas.map((m, i) => <span key={m.nombre + i}>{m.href ? <a href={m.href} data-transicion="atras">{m.nombre}</a> : <span aria-current="page">{m.nombre}</span>}{i < migas.length - 1 && <Icono nombre="siguiente" lado={12} />}</span>)}
          </nav>
        ) : rotulo && !enBarra && <p className="t-rotulo">{rotulo}</p>}
        <h1 className="t-titulo" ref={h1}>{titulo}{info && <Info titulo={titulo}>{info}</Info>}</h1>
        {intro && <p className="t-cuerpo-l m-intro">{intro}</p>}
      </header>
      {children}
    </main>
  );
}

/** Un grupo de la pantalla: su rótulo y, a la derecha, una acción o una nota corta. */
export function Grupo({ titulo, extremo, children }: { titulo: string; extremo?: ReactNode; children: ReactNode }) {
  return (
    <section className="m-grupo" aria-label={titulo}>
      <div className="m-grupo-cabeza"><h2 className="t-rotulo">{titulo}</h2>{extremo}</div>
      {children}
    </section>
  );
}
