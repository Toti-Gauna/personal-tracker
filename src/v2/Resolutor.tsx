/**
 * UX 2.0 · decide qué se ve en cada ruta. En la 1.0, la pantalla de siempre. En la 2.0, la pantalla nueva si ya existe;
 * si no existe, la 1.0 con una marca; y si la nueva falla, la 1.0 también (con un aviso), nunca una pantalla rota.
 */
import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import type { Interfaz } from '../lib/interfaz';
import type { Ruta } from '../lib/routes';
import type { DayLog } from '../data/types';
import { toast } from '../ui/avisos';
import { PANTALLAS_V2, type RegistroV2 } from './registro';
import './v2.css';

/** La marca de las pantallas que todavía son 1.0 dentro de la 2.0. */
export function MarcaV1({ error }: { error?: boolean }) {
  return (
    <div className="v2-marca-fila">
      <span id="v2-marca-accion" />
      <span className="v2-marca" title={error ? 'La pantalla 2.0 falló: te mostramos la 1.0' : 'Esta pantalla todavía es la 1.0'}>{error ? '1.0 · falló la 2.0' : '1.0'}</span>
    </div>
  );
}

interface LimiteProps { fallback: ReactNode; children: ReactNode }
/** Atrapa el error de una pantalla 2.0 y muestra su 1.0. Se reinicia al cambiar de pantalla (por la `key`). */
export class LimiteV2 extends Component<LimiteProps, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() { return { fallo: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Trazo 2.0: falló una pantalla, se muestra la 1.0.', error, info.componentStack);
    toast({ title: 'Falló la pantalla 2.0', sub: 'Te mostramos la 1.0. Tus datos están bien.', color: 'var(--ing)' }, false);
  }
  render() { return this.state.fallo ? this.props.fallback : this.props.children; }
}

interface Props {
  interfaz: Interfaz;
  ruta: Ruta;
  day: DayLog;
  today: string;
  /** La pantalla 1.0 de esta ruta. */
  v1: ReactNode;
  registro?: RegistroV2;
}

export function PantallaV2({ interfaz, ruta, day, today, v1, registro = PANTALLAS_V2 }: Props) {
  if (interfaz !== 'v2') return <>{v1}</>;
  const entrada = registro[ruta.pantalla];
  if (!entrada) return <><MarcaV1 />{v1}</>;
  const { Componente } = entrada;
  return (
    <LimiteV2 key={`${ruta.pantalla}/${ruta.param ?? ''}`} fallback={<><MarcaV1 error />{v1}</>}>
      <Suspense fallback={<main className="pantalla v2-carga" aria-busy="true" aria-label="Cargando" />}>
        <Componente ruta={ruta} day={day} today={today} />
      </Suspense>
    </LimiteV2>
  );
}
