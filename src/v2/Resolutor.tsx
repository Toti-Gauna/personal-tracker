/**
 * Trazo · decide qué se ve en cada ruta: la pantalla de su registro (o la primera extra que la cubre). Una ruta que nadie cubre
 * muestra "No encontré esa pantalla"; una pantalla que falla muestra un aviso con salida, nunca una pantalla rota.
 */
import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import type { Ruta } from '../lib/routes';
import type { DayLog } from '../data/types';
import { Boton } from './kit/controles';
import { Vacio } from './kit/superficies';
import { Marco } from './marco/Marco';
import { EXTRAS_V2, type ExtrasV2 } from './extras';
import { PANTALLAS_V2, type EntradaV2, type RegistroV2 } from './registro';
import './v2.css';

/** Una ruta que ninguna pantalla cubre (un enlace viejo, una dirección escrita a mano). */
export function NoEncontrada() {
  return (
    <Marco titulo="No está">
      <Vacio ilustracion="buscar" titulo="No encontré esa pantalla" texto="Puede ser un enlace viejo." accion={<Boton variante="primario" icono="hoy" href="#/hoy">Ir a Hoy</Boton>} />
    </Marco>
  );
}

/** Lo que se ve cuando una pantalla falla: tus datos no se tocan. */
export function PantallaFallida({ reintentar }: { reintentar: () => void }) {
  return (
    <Marco titulo="Algo falló">
      <Vacio ilustracion="avisos" titulo="Esta pantalla no cargó" texto="Tus datos están bien."
        accion={<div className="v2-fallo-acciones"><Boton variante="primario" icono="deshacer" onClick={reintentar}>Probar de nuevo</Boton><Boton variante="fantasma" href="#/hoy">Ir a Hoy</Boton></div>} />
    </Marco>
  );
}

interface LimiteProps { children: ReactNode }
/** Atrapa el error de una pantalla. Se reinicia al cambiar de pantalla (por la `key`) o con "Probar de nuevo". */
export class LimiteV2 extends Component<LimiteProps, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() { return { fallo: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Trazo: falló una pantalla.', error, info.componentStack); }
  render() { return this.state.fallo ? <PantallaFallida reintentar={() => this.setState({ fallo: false })} /> : this.props.children; }
}

interface Props {
  ruta: Ruta;
  day: DayLog;
  today: string;
  registro?: RegistroV2;
  /** Las entradas que se suman a las de `registro` (por defecto, las de las familias de la 3.3). */
  extras?: ExtrasV2;
}

/** La entrada que cubre esta ruta: la principal de la pantalla o, si no la cubre, la primera extra que sí. */
export function entradaDe(ruta: Ruta, registro: RegistroV2, extras: ExtrasV2): EntradaV2 | undefined {
  const principal = registro[ruta.pantalla];
  if (principal && (!principal.cubre || principal.cubre(ruta))) return principal;
  return extras[ruta.pantalla]?.find((e) => !e.cubre || e.cubre(ruta));
}

/** La pantalla mientras baja su pedazo. */
export const Cargando = () => <main className="v2 v2-pantalla v2-carga" aria-busy="true" aria-label="Cargando" />;

export function PantallaV2({ ruta, day, today, registro = PANTALLAS_V2, extras = EXTRAS_V2 }: Props) {
  const entrada = entradaDe(ruta, registro, extras);
  if (!entrada) return <NoEncontrada />;
  const { Componente } = entrada;
  return (
    <LimiteV2 key={`${ruta.pantalla}/${ruta.param ?? ''}`}>
      <Suspense fallback={<Cargando />}>
        <Componente ruta={ruta} day={day} today={today} />
      </Suspense>
    </LimiteV2>
  );
}
