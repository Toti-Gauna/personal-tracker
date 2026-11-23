import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { dateKey } from './data/time';
import { useRuta } from './lib/routes';
import { useStore } from './state/store';
import { ensureDayRefs, ensureWeek } from './state/ruta';
import { useFocusRunner } from './ui/useFocusRunner';
import { useNow } from './ui/useNow';
import { useSealSync } from './ui/useSealSync';
import { usePendientes } from './ui/useStudy';
import { Callado, Cargando, LimiteV2, PantallaV2 } from './v2/Resolutor';

const GlobalV2 = lazy(() => import('./v2/marco/Global'));
const SplashV2 = lazy(() => import('./v2/marco/SplashV2'));
const DespertarV2 = lazy(() => import('./v2/pantallas/DespertarV2'));
const InstalarV2 = lazy(() => import('./v2/pantallas/InstalarV2'));

export function App() {
  const ruta = useRuta();
  const [cargando, setCargando] = useState(true);
  const fin = useCallback(() => setCargando(false), []);
  const today = dateKey(new Date(useNow(60000)));
  const settings = useStore((s) => s.settings);
  const day = useStore((s) => s.days[today]);
  const hayFoco = useStore((s) => !!s.focus);
  useFocusRunner();
  useSealSync(today, !!settings && !!day);
  // La ruta: las metas de hoy con su etiqueta y la propuesta de la semana guardada.
  useEffect(() => { if (settings && day) { ensureDayRefs(today); ensureWeek(today); } }, [settings, !!day, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const pendientes = usePendientes(today);

  const presentacion = ruta.pantalla === 'avance' && ruta.param === 'presentacion';
  // El foco y la sesión ya muestran el tiempo en grande: ahí no va la tarjeta del foco.
  const sinMini = ruta.pantalla === 'foco' || ruta.pantalla === 'sesion' || presentacion;
  const conBarra = !!settings && !!day && !presentacion;
  const conMini = hayFoco && !!day && !sinMini;

  const contenido = !settings ? <LimiteV2 key="instalar"><InstalarV2 /></LimiteV2>
    : !day ? <LimiteV2 key="despertar"><DespertarV2 date={today} /></LimiteV2>
    : <PantallaV2 ruta={ruta} day={day} today={today} />;

  return (
    <div className={`app${conMini ? ' con-mini' : ''}${presentacion ? ' presentacion' : ''}`}>
      <div className="envoltura"><Suspense fallback={<Cargando />}>{contenido}</Suspense></div>
      {/* En el teléfono, Avance cuelga de Perfil; la barra ancha lo trae como destino propio. */}
      {settings && <Callado><Suspense fallback={null}><GlobalV2 activa={ruta.seccion} pendientes={pendientes} conBarra={conBarra} conMini={conMini} /></Suspense></Callado>}
      {cargando && <Callado alFallar={fin}><Suspense fallback={<div className="sp2" />}><SplashV2 onFin={fin} /></Suspense></Callado>}
    </div>
  );
}
