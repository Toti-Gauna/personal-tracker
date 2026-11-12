import { useCallback, useState } from 'react';
import { BottomBar } from './components/BottomBar';
import { FocoMini } from './components/FocoMini';
import { Splash } from './components/Splash';
import { dateKey } from './data/time';
import { useRuta } from './lib/routes';
import { DiaJson } from './screens/DiaJson';
import { Despertar } from './screens/Despertar';
import { ElegirFoco } from './screens/ElegirFoco';
import { Foco } from './screens/Foco';
import { Hoy } from './screens/Hoy';
import { Instalar } from './screens/Instalar';
import { EditarRutina } from './screens/EditarRutina';
import { Entreno } from './screens/Entreno';
import { EntrenoSemana } from './screens/EntrenoSemana';
import { Metas } from './screens/Metas';
import { MotorEntreno } from './screens/MotorEntreno';
import { Peso } from './screens/Peso';
import { ResumenEntreno } from './screens/ResumenEntreno';
import { SesionEntreno } from './screens/SesionEntreno';
import { NuevaMeta } from './screens/NuevaMeta';
import { Perfil } from './screens/Perfil';
import { Pomodoros } from './screens/Pomodoros';
import { Actividad } from './screens/Actividad';
import { ComoFunciona } from './screens/ComoFunciona';
import { Estudio } from './screens/Estudio';
import { SesionEstudio } from './screens/SesionEstudio';
import { TesisPantalla } from './screens/TesisPantalla';
import { Test } from './screens/Test';
import { Unidades } from './screens/Unidades';
import { ColdRecall } from './screens/ColdRecall';
import { Motor } from './screens/Motor';
import { NuevaTarjeta } from './screens/NuevaTarjeta';
import { Repaso } from './screens/Repaso';
import { Tarjetas } from './screens/Tarjetas';
import { usePendientes } from './ui/useStudy';
import { PantallaPendiente } from './screens/Seccion';
import { useStore } from './state/store';
import { Avisos } from './ui/avisos';
import { useFocusRunner } from './ui/useFocusRunner';
import { useNow } from './ui/useNow';

export function App() {
  const ruta = useRuta();
  const [cargando, setCargando] = useState(true);
  const fin = useCallback(() => setCargando(false), []);
  const today = dateKey(new Date(useNow(60000)));
  const settings = useStore((s) => s.settings);
  const day = useStore((s) => s.days[today]);
  const hayFoco = useStore((s) => !!s.focus);
  useFocusRunner();
  const pendientes = usePendientes(today);

  let contenido: React.ReactNode;
  let conBarra = true;
  if (!settings) {
    contenido = <Instalar />;
    conBarra = false;
  } else if (!day) {
    contenido = <Despertar date={today} />;
    conBarra = false;
  } else {
    switch (ruta.pantalla) {
      case 'hoy': contenido = <Hoy key={today} day={day} />; break;
      case 'elegir': contenido = <ElegirFoco key={ruta.param} day={day} blockKey={ruta.param} />; break;
      case 'foco': contenido = <Foco day={day} />; break;
      case 'pomodoros': contenido = <Pomodoros />; break;
      case 'json': contenido = <DiaJson day={day} />; break;
      case 'estudio': contenido = <Estudio day={day} />; break;
      case 'sesion': contenido = <SesionEstudio key={ruta.param} day={day} id={ruta.param} />; break;
      case 'como': contenido = <ComoFunciona />; break;
      case 'actividad': contenido = <Actividad key={ruta.param ?? 'nueva'} id={ruta.param || undefined} />; break;
      case 'test': contenido = <Test key={ruta.param} day={day} param={ruta.param} />; break;
      case 'tesis': contenido = <TesisPantalla key={ruta.param} day={day} itemId={ruta.param} />; break;
      case 'unidades': contenido = <Unidades day={day} />; break;
      case 'repaso': contenido = <Repaso day={day} />; break;
      case 'recall': contenido = <ColdRecall key={ruta.param} day={day} itemId={ruta.param} />; break;
      case 'tarjetas': contenido = <Tarjetas key={ruta.param ?? 'todas'} day={day} frontId={ruta.param || undefined} />; break;
      case 'tarjeta-nueva': contenido = <NuevaTarjeta day={day} />; break;
      case 'motor': contenido = <Motor day={day} seccion={ruta.param} />; break;
      case 'metas': contenido = <Metas day={day} tab={ruta.param} />; break;
      case 'meta-nueva': contenido = <NuevaMeta today={today} horizon={ruta.param} />; break;
      case 'entreno': contenido = <Entreno day={day} />; break;
      case 'entreno-semana': contenido = <EntrenoSemana day={day} />; break;
      case 'entreno-rutina': contenido = <EditarRutina key={ruta.param} id={ruta.param && ruta.param !== 'nueva' ? ruta.param : undefined} />; break;
      case 'entreno-sesion': contenido = <SesionEntreno />; break;
      case 'entreno-resumen': contenido = <ResumenEntreno day={day} id={ruta.param} />; break;
      case 'entreno-peso': contenido = <Peso day={day} />; break;
      case 'entreno-motor': contenido = <MotorEntreno day={day} />; break;
      case 'perfil': contenido = <Perfil />; break;
    }
  }

  return (
    <div className={`app${hayFoco && conBarra && ruta.pantalla !== 'foco' && ruta.pantalla !== 'sesion' ? ' con-mini' : ''}`}>
      {contenido}
      {conBarra && ruta.pantalla !== 'foco' && ruta.pantalla !== 'sesion' && <FocoMini />}
      {conBarra && <BottomBar activa={ruta.seccion} pendientes={pendientes} />}
      <Avisos />
      {cargando && <Splash onFin={fin} />}
    </div>
  );
}
