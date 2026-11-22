import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { BottomBar } from './components/BottomBar';
import { SideNav } from './components/SideNav';
import { FocoMini } from './components/FocoMini';
import { Splash } from './components/Splash';
import { dateKey } from './data/time';
import { interfazActiva } from './lib/interfaz';
import { useRuta } from './lib/routes';
import { PantallaV2 } from './v2/Resolutor';
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
import { PlanImportar } from './screens/PlanImportar';
import { MotorEntreno } from './screens/MotorEntreno';
import { Peso } from './screens/Peso';
import { ResumenEntreno } from './screens/ResumenEntreno';
import { SesionEntreno } from './screens/SesionEntreno';
import { NuevaMeta } from './screens/NuevaMeta';
import { Ajustes } from './screens/Ajustes';
import { Avance } from './screens/Avance';
import { AjustesCompanera, AjustesDatos } from './screens/AjustesExtra';
import { Rutinas } from './screens/Rutinas';
import { Cierre } from './screens/Cierre';
import { Logro } from './screens/Logro';
import { Perfil } from './screens/Perfil';
import { Sonidos } from './screens/Sonidos';
import { Pomodoros } from './screens/Pomodoros';
import { Actividad } from './screens/Actividad';
import { ComoFunciona } from './screens/ComoFunciona';
import { Estudio } from './screens/Estudio';
import { RoadmapPantalla } from './screens/RoadmapEstudio';
import { LibroPantalla } from './screens/Libro';
import { ProgPlan } from './screens/ProgPlan';
import { IdiomasPlan } from './screens/Idiomas';
import { MatePlan } from './screens/MatePlan';
import { SesionEstudio } from './screens/SesionEstudio';
import { TesisPantalla } from './screens/TesisPantalla';
import { Test } from './screens/Test';
import { Unidades } from './screens/Unidades';
import { ColdRecall } from './screens/ColdRecall';
import { Motor } from './screens/Motor';
import { NuevaTarjeta } from './screens/NuevaTarjeta';
import { PuntosDebiles } from './screens/PuntosDebiles';
import { PuntoTema } from './screens/PuntoTema';
import { HojaSimulacro, PuntosExamenes } from './screens/PuntosExamenes';
import { Repaso } from './screens/Repaso';
import { Tarjetas } from './screens/Tarjetas';
import { usePendientes } from './ui/useStudy';
import { PantallaPendiente } from './screens/Seccion';
import { useStore } from './state/store';
import { Avisos } from './ui/avisos';
import { Checkins } from './ui/checkins';
import { EstadoEstudio } from './ui/EstadoEstudio';
import { useFocusRunner } from './ui/useFocusRunner';
import { useSealSync } from './ui/useSealSync';
import { ensureDayRefs, ensureWeek } from './state/ruta';
import { useNow } from './ui/useNow';
import { useEntrada } from './ui/useEntrada';

const CapasV2 = lazy(() => import('./v2/kit/capas'));

export function App() {
  const ruta = useRuta();
  const [cargando, setCargando] = useState(true);
  const fin = useCallback(() => setCargando(false), []);
  const today = dateKey(new Date(useNow(60000)));
  const settings = useStore((s) => s.settings);
  const day = useStore((s) => s.days[today]);
  const hayFoco = useStore((s) => !!s.focus);
  useFocusRunner();
  // En la 2.0 las pantallas entran con su propio sistema de movimiento (src/v2/movimiento).
  const entrada = useEntrada(`${ruta.pantalla}/${ruta.param ?? ''}`, !cargando && settings?.interfaz !== 'v2');
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
      case 'importar': contenido = <PlanImportar day={day} />; break;
      case 'estudio': contenido = ruta.param === 'idiomas' || ruta.param?.startsWith('idiomas/') ? <IdiomasPlan key={ruta.param} day={day} param={ruta.param} /> : ruta.param === 'prog' || ruta.param?.startsWith('prog/') ? <ProgPlan key={ruta.param} day={day} param={ruta.param} /> : ruta.param?.startsWith('libro/') ? <LibroPantalla key={ruta.param} day={day} id={ruta.param.slice(6)} /> : ruta.param?.startsWith('ruta') ? <RoadmapPantalla key={ruta.param} day={day} param={ruta.param} /> : ruta.param?.startsWith('mate') ? <MatePlan key={ruta.param} day={day} param={ruta.param} /> : <Estudio day={day} />; break;
      case 'sesion': contenido = <SesionEstudio key={ruta.param} day={day} id={ruta.param} />; break;
      case 'como': contenido = <ComoFunciona />; break;
      case 'actividad': contenido = <Actividad key={ruta.param ?? 'nueva'} id={ruta.param || undefined} />; break;
      case 'test': contenido = <Test key={ruta.param} day={day} param={ruta.param} />; break;
      case 'tesis': contenido = <TesisPantalla key={ruta.param} day={day} itemId={ruta.param} />; break;
      case 'unidades': contenido = <Unidades day={day} />; break;
      case 'repaso': contenido = <Repaso day={day} />; break;
      case 'flojo':
        contenido = !ruta.param || ruta.param === 'recall' ? <PuntosDebiles key={ruta.param ?? ''} day={day} filtro={ruta.param ?? ''} />
          : ruta.param === 'examenes' ? <PuntosExamenes day={day} />
          : ruta.param === 'simulacro' ? <HojaSimulacro />
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
      case 'ajustes-rutinas': contenido = <Rutinas key={ruta.param ?? ''} day={day} param={ruta.param} />; break;
      case 'ajustes-companera': contenido = <AjustesCompanera />; break;
      case 'ajustes-datos': contenido = <AjustesDatos today={today} />; break;
      case 'v2': contenido = <main className="pantalla"><div className="topbar"><a className="volver" href="#/ajustes">Ajustes</a></div><h1 className="titulo">Trazo 2.0</h1><p className="sub">Esto es parte de la 2.0. Prendela en Ajustes → Interfaz para verlo.</p></main>; break;
      case 'sonidos': contenido = <Sonidos today={today} />; break;
    }
  }

  // UX 2.0: con la 2.0 prendida, cada ruta usa su pantalla nueva si ya existe (y si no, la 1.0 con una marca).
  const interfaz = interfazActiva(settings?.interfaz);
  useEffect(() => {
    document.documentElement.dataset.ui = interfaz;
    return () => { delete document.documentElement.dataset.ui; };
  }, [interfaz]);
  if (conBarra && day) contenido = <PantallaV2 interfaz={interfaz} ruta={ruta} day={day} today={today} v1={contenido} />;

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
      {settings && interfaz === 'v2' && <Suspense fallback={null}><CapasV2 /></Suspense>}
      {settings && <Checkins />}
      {settings && <EstadoEstudio />}
      {cargando && <Splash onFin={fin} />}
    </div>
  );
}
