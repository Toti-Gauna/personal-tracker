/**
 * Trazo 2.0 · piezas que comparten las pantallas de estudio de a una cosa por vez (sesión, test, cold recall y tesis): la
 * cáscara a pantalla completa con su salida, su ⓘ y el botón principal abajo, y el color del área de un frente.
 */
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { AREAS } from '../../data/defaults';
import type { StudyState } from '../../data/study-types';
import { colorV2 } from '../hoy/datos';
import { Boton } from '../kit/controles';
import { Info } from '../kit/hoja';
import '../tokens.css';
import '../base.css';
import '../kit/kit.css';
import '../kit/superficies.css';
import '../proyecto/proyecto.css';
import './sesiones.css';

/** El color de área (2.0) de un frente; sin frente, el de ingeniería. */
export function areaDeFrente(study: StudyState, frontId?: string) {
  const f = study.fronts.find((x) => x.id === frontId);
  return f ? colorV2(AREAS[f.color].css) : 'var(--a-ing)';
}

interface InmersivaProps {
  /** El h1: una etiqueta corta de dónde estás ("Test", "Cold recall"). */
  titulo: string;
  area?: string;
  salir: { href: string; nombre: string };
  /** El contenido de la ⓘ. */
  info?: ReactNode;
  /** Una barra de avance justo bajo el encabezado. */
  progreso?: ReactNode;
  /** Lo de abajo, pegado al borde: el botón principal. */
  pie?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Una pantalla de pantalla completa tapa la barra de navegación y la tarjeta del foco: mientras está, se sacan (no solo se tapan),
 * así no se llega a ellas con Tab ni las lee el lector de pantalla.
 */
export function useInmersiva() {
  useEffect(() => {
    document.documentElement.dataset.inmersiva = '1';
    return () => { delete document.documentElement.dataset.inmersiva; };
  }, []);
}

/**
 * Una pantalla de foco: sin barra de navegación, con su propia salida (la ×), su ⓘ y, abajo, la acción principal al alcance
 * del pulgar. Un solo hilo de lectura, angosto, aun en pantallas grandes.
 */
export function Inmersiva({ titulo, area, salir, info, progreso, pie, children, className }: InmersivaProps) {
  useInmersiva();
  return (
    <main className={`v2 v2-completa se-completa ${className ?? ''}`} style={area ? ({ ['--area' as string]: area } as CSSProperties) : undefined}>
      <header className="se-cima">
        <Boton soloIcono variante="fantasma" icono="cerrar" etiqueta={`Salir a ${salir.nombre}`} href={salir.href} />
        <h1 className="t-rotulo se-h1">{titulo}</h1>
        {info ? <Info titulo={titulo}>{info}</Info> : <span />}
      </header>
      {progreso}
      <div className="se-cuerpo">{children}</div>
      {pie && <footer className="se-pie">{pie}</footer>}
    </main>
  );
}

/** "1 ejercicio", "3 ejercicios". */
/** El número con su palabra, en singular cuando es uno: la misma función de todo el 2.0 (`cuantos`, en reglas.ts). */
export { cuantos as plural } from '../reglas';
