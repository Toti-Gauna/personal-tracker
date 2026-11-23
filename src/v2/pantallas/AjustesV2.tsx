/**
 * Trazo 2.0 · Ajustes. Una lista corta de grupos: apariencia, áreas, plan y datos. Lo largo (nombres de bimestres, el
 * plan T+18) vive en su propia página; renombrar se hace en una hoja. Las subpáginas que todavía son 1.0 se abren igual.
 */
import { Suspense, lazy, useEffect, useState } from 'react';
import { AREAS, areaDefaultName } from '../../data/defaults';
import { BIMESTRES, PLAN } from '../../data/plan';
import { DAY_TYPES } from '../../data/routines';
import { DEFAULT_ALARMS } from '../../data/sounds';
import type { Area } from '../../data/types';
import { INTERFACES, forzadaPorUrl, interfazActiva, type Interfaz } from '../../lib/interfaz';
import type { ThemePref } from '../../lib/theme';
import { pedirInstalacion } from '../../screens/Ajustes';
import { renameBimester } from '../../state/goals';
import { setAreaName, setInterfaz } from '../../state/profile';
import { planSettings, useStore } from '../../state/store';
import { Icono } from '../iconos';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Segmentado, fechaLarga } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { aplicarTemaV2, temaV2 } from '../marco/tema';
import { PANTALLAS_V2, type PropsV2 } from '../registro';

const TEMAS: [ThemePref, string][] = [['system', 'Sistema'], ['dark', 'Oscuro'], ['light', 'Claro']];
const NOMBRE_TEMA: Record<ThemePref, string> = { system: 'sigue al teléfono', dark: 'oscuro', light: 'claro' };

/** Renombrar algo: una hoja con un campo y Guardar. Vacío vuelve al nombre de fábrica. */
function HojaNombre({ abierta, titulo, etiqueta, inicial, fabrica, maximo, onGuardar, onCerrar }: { abierta: boolean; titulo: string; etiqueta: string; inicial: string; fabrica: string; maximo: number; onGuardar: (v: string) => void; onCerrar: () => void }) {
  const [v, setV] = useState(inicial);
  useEffect(() => { if (abierta) setV(inicial); }, [abierta, inicial]);
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={titulo}
      pie={<><Boton onClick={onCerrar}>Cancelar</Boton><Boton variante="primario" onClick={() => { onGuardar(v); onCerrar(); }}>Guardar</Boton></>}>
      <CampoTexto etiqueta={etiqueta} valor={v} onCambio={setV} maximo={maximo} placeholder={fabrica} nota={`Vacío vuelve a "${fabrica}".`} />
    </Hoja>
  );
}

function Bimestres() {
  const nombres = useStore((s) => s.goals.bimesterNames);
  const [edita, setEdita] = useState<number | null>(null);
  const lista = Array.from({ length: BIMESTRES }, (_, i) => ({ n: i + 1, fabrica: PLAN.nombresBimestre[i] ?? `B${i + 1}` }));
  const actual = lista.find((b) => b.n === edita);
  return (
    <Marco titulo="Bimestres" volver={{ href: '#/ajustes', nombre: 'Ajustes' }} intro="Ponele tu nombre a cada bimestre.">
      <div className="capa-1 s-lista">
        {lista.map((b) => {
          const propio = nombres[b.n]?.trim();
          return <Fila key={b.n} titulo={propio || b.fabrica} nota={propio ? `Antes: ${b.fabrica}` : undefined} valor={String(b.n).padStart(2, '0')} onClick={() => setEdita(b.n)} extremo={<Icono nombre="editar" lado={18} className="icono s-chevron" />} />;
        })}
      </div>
      <HojaNombre abierta={!!actual} titulo={`Bimestre ${actual?.n ?? ''}`} etiqueta="Nombre" inicial={actual ? nombres[actual.n]?.trim() ?? '' : ''} fabrica={actual?.fabrica ?? ''} maximo={30}
        onGuardar={(v) => actual && renameBimester(actual.n, v)} onCerrar={() => setEdita(null)} />
    </Marco>
  );
}

/** El plan T+18 es una página 2.0 aparte (tanda 3.3): su propio chunk, que solo baja quien entra a #/ajustes/plan. */
const PlanAjustes = lazy(() => import('../ajustes/PlanAjustesV2'));

export default function AjustesV2({ ruta, day, today }: PropsV2) {
  const settings = useStore((s) => s.settings)!;
  const propiosB = useStore((s) => Object.values(s.goals.bimesterNames).filter((x) => x?.trim()).length);
  const [tema, setTema] = useState<ThemePref>(temaV2);
  const [area, setArea] = useState<Area | null>(null);
  const [instalada, setInstalada] = useState(false);
  useEffect(() => { setInstalada(window.matchMedia?.('(display-mode: standalone)').matches ?? false); }, []);
  if (ruta.param === 'bimestres') return <Bimestres />;
  if (ruta.param === 'plan') return <Suspense fallback={<main className="pantalla v2-carga" aria-busy="true" aria-label="Cargando" />}><PlanAjustes ruta={ruta} day={day} today={today} /></Suspense>;

  const activa = interfazActiva(settings.interfaz);
  const forzada = forzadaPorUrl();
  const listas = Object.values(PANTALLAS_V2).filter((e) => !e!.taller && !e!.parte).map((e) => e!.nombre);
  const alarmas = (settings.alarms ?? DEFAULT_ALARMS).filter((a) => a.on).length;
  const cfg = planSettings(settings);
  const instalar = async () => {
    if (instalada) { aviso({ titulo: 'Ya está instalada', sub: 'Estás usando Trazo como app.', tono: 'hecho' }); return; }
    if (!(await pedirInstalacion())) aviso({ titulo: 'Agregar a inicio', sub: 'Safari: Compartir → Agregar a inicio. Chrome: menú ⋮ → Instalar app.', duracion: 8000 });
  };

  return (
    <Marco titulo="Ajustes" volver={{ href: '#/perfil', nombre: 'Perfil' }}>
      <Grupo titulo="Apariencia">
        <Segmentado etiqueta="Tema" valor={tema} opciones={TEMAS} onCambio={(t) => { setTema(t); aplicarTemaV2(t); }} />
        <Segmentado etiqueta="Interfaz" valor={activa} opciones={INTERFACES.map(([id, n]) => [id, n.replace(' · en construcción', ' · nueva').replace(' · actual', ' · clásica')] as [Interfaz, string])} onCambio={setInterfaz} />
        <p className="t-nota">
          {forzada ? `La dirección fuerza la ${forzada === 'v1' ? '1.0' : '2.0'}: sacá ?ui para usar lo que elegiste. ` : ''}
          Mismos datos en las dos. {listas.length ? `Ya en 2.0: ${listas.join(', ')}.` : ''} Lo demás se ve en 1.0, con su marca.
        </p>
        <div className="capa-1 s-lista"><Fila icono="trazo" titulo="Taller 2.0" nota="Lenguaje, controles, piezas y movimiento" href="#/v2" /></div>
      </Grupo>

      <Grupo titulo="Áreas">
        <div className="capa-1 s-lista">
          {(Object.keys(AREAS) as Area[]).map((a) => (
            <Fila key={a} area={AREAS[a].css.replace(/^var\(--(\w+)\)$/, 'var(--a-$1)')} titulo={AREAS[a].name} nota={AREAS[a].name !== areaDefaultName(a) ? `Antes: ${areaDefaultName(a)}` : undefined}
              onClick={() => setArea(a)} extremo={<Icono nombre="editar" lado={18} className="icono s-chevron" />} />
          ))}
        </div>
      </Grupo>

      <Grupo titulo="Plan">
        <div className="capa-1 s-lista">
          <Fila icono="plan" titulo="Plan y rutina" nota={`Modo ${(cfg.modo ?? 'normal').replace(/-/g, ' ')} · desde el ${fechaLarga(settings.startDate)}`} href="#/ajustes/plan" />
          <Fila icono="calendario" titulo="Bimestres" nota={propiosB ? `${propiosB} con tu nombre` : 'Con los nombres del plan'} href="#/ajustes/bimestres" />
          <Fila icono="reloj" titulo="Rutinas del día" nota={`${DAY_TYPES.length} rutinas · generar, adaptar y plantillas`} href="#/ajustes-rutinas" />
        </div>
      </Grupo>

      <Grupo titulo="Datos y app">
        <div className="capa-1 s-lista">
          <Fila icono="campana" titulo="Sonidos y alarmas" nota={`${alarmas} ${alarmas === 1 ? 'alarma' : 'alarmas'} en el calendario`} href="#/sonidos" />
          <Fila icono="companera" titulo="Compañera de entreno" nota={settings.names.partner} href="#/ajustes-companera" />
          <Fila icono="tarjetas" titulo="Importar mazo de Anki" href="#/motor/importar" />
          <Fila icono="exportar" titulo="Copia de seguridad" nota={settings.lastBackup ? `Última: ${settings.lastBackup}` : 'Todavía sin copias'} href="#/ajustes-datos" />
          <Fila icono="importar" titulo="Instalar Trazo" nota={instalada ? 'Ya la usás como app' : 'En la pantalla de inicio'} onClick={instalar} extremo={<span />} />
        </div>
      </Grupo>

      <p className="t-nota aj2-tema">Tema: {NOMBRE_TEMA[tema]}.</p>
      <HojaNombre abierta={!!area} titulo="Renombrar área" etiqueta="Nombre" inicial={area ? AREAS[area].name : ''} fabrica={area ? areaDefaultName(area) : ''} maximo={20}
        onGuardar={(v) => area && setAreaName(area, v)} onCerrar={() => setArea(null)} />
    </Marco>
  );
}
