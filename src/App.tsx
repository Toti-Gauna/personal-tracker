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
import { Perfil } from './screens/Perfil';
import { Pomodoros } from './screens/Pomodoros';
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
      case 'estudio': contenido = <PantallaPendiente titulo="Estudio" linea="Repasar, aprender y comprobar." ola="ola 2" />; break;
      case 'metas': contenido = <PantallaPendiente titulo="Metas" linea="De la semana al año." ola="ola 4" />; break;
      case 'entreno': contenido = <PantallaPendiente titulo="Entreno" linea="Rutinas en pareja y sobrecarga progresiva." ola="ola 5" />; break;
      case 'perfil': contenido = <Perfil />; break;
    }
  }

  return (
    <div className={`app${hayFoco && conBarra && ruta.pantalla !== 'foco' ? ' con-mini' : ''}`}>
      {contenido}
      {conBarra && ruta.pantalla !== 'foco' && <FocoMini />}
      {conBarra && <BottomBar activa={ruta.seccion} />}
      <Avisos />
      {cargando && <Splash onFin={fin} />}
    </div>
  );
}
