import { useCallback, useState } from 'react';
import { BottomBar } from './components/BottomBar';
import { Splash } from './components/Splash';
import { useSeccion } from './lib/routes';
import { PantallaPendiente } from './screens/Seccion';
import { Perfil } from './screens/Perfil';

export function App() {
  const seccion = useSeccion();
  const [cargando, setCargando] = useState(true);
  const fin = useCallback(() => setCargando(false), []);

  return (
    <div className="app">
      {seccion === 'hoy' && <PantallaPendiente titulo="Hoy" linea="Tu día en horas, con las metas numeradas." ola="ola 1" />}
      {seccion === 'estudio' && <PantallaPendiente titulo="Estudio" linea="Repasar, aprender y comprobar." ola="ola 2" />}
      {seccion === 'metas' && <PantallaPendiente titulo="Metas" linea="De la semana al año." ola="ola 4" />}
      {seccion === 'entreno' && <PantallaPendiente titulo="Entreno" linea="Rutinas en pareja y sobrecarga progresiva." ola="ola 5" />}
      {seccion === 'perfil' && <Perfil />}
      <BottomBar activa={seccion} />
      {cargando && <Splash onFin={fin} />}
    </div>
  );
}
