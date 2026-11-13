import { useCallback, useEffect, useState } from 'react';
import { BottomBar } from './components/BottomBar';
import { SideNav } from './components/SideNav';
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
import { Ajustes } from './screens/Ajustes';
import { Avance } from './screens/Avance';
import { AjustesCompanera, AjustesDatos, AjustesRutinas } from './screens/AjustesExtra';
import { Cierre } from './screens/Cierre';
import { Logro } from './screens/Logro';
import { Perfil } from './screens/Perfil';
import { Sonidos } from './screens/Sonidos';
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
import { PuntosDebiles } from './screens/PuntosDebiles';
import { PuntoTema } from './screens/PuntoTema';
import { Repaso } from './screens/Repaso';
import { Tarjetas } from './screens/Tarjetas';
import { usePendientes } from './ui/useStudy';
import { PantallaPendiente } from './screens/Seccion';
import { useStore } from './state/store';
import { Avisos } from './ui/avisos';
import { useFocusRunner } from './ui/useFocusRunner';
import { useSealSync } from './ui/useSealSync';
import { ensureDayRefs, ensureWeek } from './state/ruta';
import { useNow } from './ui/useNow';
import { useEntrada } from './ui/useEntrada';

export function App() {
  const ruta = useRuta();
  const [cargando, setCargando] = useState(true);
  const fin = useCallback(() => setCargando(false), []);
  const today = dateKey(new Date(useNow(60000)));
  const settings = useStore((s) => s.settings);
  const day = useStore((s) => s.days[today]);
  const hayFoco = useStore((s) => !!s.focus);
  useFocusRunner();
  const entrada = useEntrada(`${ruta.pantalla}/${ruta.param ?? ''}`, !cargando);
  useSealSync(today, !!settings && !!day);
  // La ruta: las metas de hoy con su etiqueta y la propuesta de la semana guardada.
  useEffect(() => { if (settings && day) { ensureDayRefs(today); ensureWeek(today); } }, [settings, !!day, today]); // eslint-disable-line react-hooks/exhaustive-deps
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
      case 'flojo':
        contenido = !ruta.param || ruta.param === 'recall' ? <PuntosDebiles key={ruta.param ?? ''} day={day} filtro={ruta.param ?? ''} />
          : <PuntoTema key={ruta.param} day={day} id={ruta.param} />;
        break;
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
      case 'avance': contenido = <Avance day={day} presentacion={ruta.param === 'presentacion'} />; break;
      case 'perfil': contenido = <Perfil day={day} />; break;
      case 'cierre': contenido = <Cierre day={day} />; break;
      case 'logro': contenido = <Logro id={ruta.param} />; break;
      case 'ajustes': contenido = <Ajustes />; break;
      case 'ajustes-rutinas': contenido = <AjustesRutinas />; break;
      case 'ajustes-companera': contenido = <AjustesCompanera />; break;
      case 'ajustes-datos': contenido = <AjustesDatos today={today} />; break;
      case 'sonidos': contenido = <Sonidos today={today} />; break;
    }
  }

  const presentacion = ruta.pantalla === 'avance' && ruta.param === 'presentacion';
  const sinMini = ruta.pantalla === 'foco' || ruta.pantalla === 'sesion' || presentacion;
  // En el teléfono, Avance se cuelga de Perfil; la barra ancha lo trae como destino propio.
  const activaBarra = ruta.seccion === 'avance' ? 'perfil' : ruta.seccion;

  return (
    <div className={`app${hayFoco && conBarra && !sinMini ? ' con-mini' : ''}${presentacion ? ' presentacion' : ''}${ruta.pantalla === 'avance' ? ' ancha' : ''}`}>
      <div className="envoltura" ref={entrada}>{contenido}</div>
      {conBarra && !sinMini && <FocoMini />}
      {conBarra && !presentacion && <SideNav activa={ruta.seccion} pendientes={pendientes} />}
      {conBarra && !presentacion && <BottomBar activa={activaBarra} pendientes={pendientes} />}
      <Avisos />
      {cargando && <Splash onFin={fin} />}
    </div>
  );
}
