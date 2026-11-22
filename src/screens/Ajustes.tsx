import { DAY_ROUTINES, DAY_TYPES, metasOf } from '../data/routines';
import { useEffect, useState } from 'react';
import { AREAS, areaDefaultName} from '../data/defaults';
import { BIMESTRES, PLAN, SEMANAS, T0_PLAN, TRAMOS, fechaCorta, fechaHito } from '../data/plan';
import { RAMA_COLOR, RAMAS } from '../data/ramas';
import { DEFAULT_ALARMS } from '../data/sounds';
import type { Area } from '../data/types';
import { INTERFACES, forzadaPorUrl, interfazActiva, type Interfaz } from '../lib/interfaz';
import { applyTheme, getThemePref, type ThemePref } from '../lib/theme';
import { PANTALLAS_V2 } from '../v2/registro';
import { planSettings, useStore } from '../state/store';
import { activarIntensiva, desactivarIntensiva, setExtraBloque, setInicioPlan, setPausaFinDeAnio, setPlanSettings, setTodosExtra } from '../state/plan';
import { PLAN_EXT } from '../data/plan-extendido';
import { ANIOS_PAUSA } from '../data/capacidad';
import { dateKey } from '../data/time';
import { renameBimester } from '../state/goals';
import { setAreaName, setInterfaz } from '../state/profile';
import { toast } from '../ui/avisos';
import { Plegable } from '../ui/Plegable';
import { BloquesPendientes, FilaExtraPetria, FilasTrabajo } from './AjustesTrabajo';
import '../styles/perfil.css';

const TEMAS: [ThemePref, string][] = [['dark', 'Oscuro'], ['light', 'Claro'], ['system', 'Sistema']];

interface BeforeInstall extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let diferido: BeforeInstall | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); diferido = e as BeforeInstall; });
}

/** 6.4 Ajustes: tema, bimestres, áreas, plan T+18, rutinas del día, Abi y datos. */
export function Ajustes() {
  const settings = useStore((s) => s.settings)!;
  const names = useStore((s) => s.goals.bimesterNames);
  const alarmas = (settings.alarms ?? DEFAULT_ALARMS).filter((a) => a.on).length;
  const [tema, setTema] = useState<ThemePref>(getThemePref);
  const [editB, setEditB] = useState<number | null>(null);
  const [txtB, setTxtB] = useState('');
  const [editA, setEditA] = useState<Area | null>(null);
  const [txtA, setTxtA] = useState('');
  const [instalada, setInstalada] = useState(false);
  useEffect(() => { setInstalada(window.matchMedia?.('(display-mode: standalone)').matches ?? false); }, []);

  const instalar = async () => {
    if (diferido) {
      await diferido.prompt();
      diferido = null;
    } else {
      toast({ title: instalada ? 'Ya está instalada' : 'Agregar a inicio', sub: instalada ? 'Estás usando Trazo como app.' : 'En Safari: Compartir → Agregar a inicio. En Chrome: menú ⋮ → Instalar app.', color: 'var(--economia)' }, false);
    }
  };

  const guardarB = () => {
    if (editB != null) renameBimester(editB, txtB);
    setEditB(null);
  };

  return (
    <main className="pantalla ajustes">
      <div className="topbar"><a className="volver" href="#/perfil">Perfil</a></div>
      <h1 className="titulo">Ajustes</h1>

      <div className="etiqueta aj-t">Tema</div>
      <div className="segmentado" role="radiogroup" aria-label="Tema">
        {TEMAS.map(([id, n]) => <button key={id} role="radio" aria-checked={tema === id} onClick={() => { setTema(id); applyTheme(id); }}>{n}</button>)}
      </div>

      <InterfazAjuste />

      <Plegable id="aj:bimestres" titulo="Nombres de los bimestres" resumen={`${Object.values(names).filter((x) => x?.trim()).length} propios`}>
      <ol className="bim-lista">
        {Array.from({ length: BIMESTRES }, (_, i) => ({ n: i + 1, name: PLAN.nombresBimestre[i] ?? `B${i + 1}` })).map((b) => {
          const propio = names[b.n]?.trim();
          return (
            <li key={b.n} className={propio ? 'propio' : ''}>
              <span className="mono sub">{String(b.n).padStart(2, '0')}</span>
              {editB === b.n ? (
                <form onSubmit={(e) => { e.preventDefault(); guardarB(); }}>
                  <input className="campo-linea" autoFocus value={txtB} onChange={(e) => setTxtB(e.target.value)} onBlur={guardarB} aria-label={`Nombre del bimestre ${b.n}`} maxLength={30} placeholder={b.name} />
                </form>
              ) : (
                <>
                  <span className={propio ? 'nombre' : 'sub'}>{propio || b.name}</span>
                  <button className="subrayado" onClick={() => { setEditB(b.n); setTxtB(propio ?? ''); }} aria-label={`Nombrar el bimestre ${b.n}`}>{propio ? 'Cambiar' : 'Nombrar'}</button>
                </>
              )}
            </li>
          );
        })}
      </ol>
      </Plegable>

      <div className="etiqueta aj-t">Áreas</div>
      <div className="chips">
        {(Object.keys(AREAS) as Area[]).map((a) => (
          editA === a ? (
            <form key={a} onSubmit={(e) => { e.preventDefault(); setAreaName(a, txtA); setEditA(null); }}>
              <input className="campo-texto" autoFocus value={txtA} onChange={(e) => setTxtA(e.target.value)} onBlur={() => { setAreaName(a, txtA); setEditA(null); }} aria-label={`Nombre del área ${areaDefaultName(a)}`} maxLength={20} />
            </form>
          ) : (
            <button key={a} aria-label={`Renombrar el área ${AREAS[a].name}`} onClick={() => { setEditA(a); setTxtA(AREAS[a].name); }}><i style={{ background: AREAS[a].css }} />{AREAS[a].name}</button>
          )
        ))}
      </div>
      <p className="sub nota-izq">Tocá un área para cambiarle el nombre. El color es el del cuaderno.</p>

      <PlanT18 />

      <div className="etiqueta aj-t">Datos y app</div>
      <ul className="aj-filas">
        <li><a href="#/ajustes-rutinas"><span><b>Rutinas del día</b><small>{DAY_TYPES.map((t) => `${DAY_ROUTINES[t].label}: ${metasOf(t).length} metas`).join(' · ')}</small></span><span aria-hidden="true">→</span></a></li>
        <li><a href="#/sonidos"><span><b>Sonidos y alarmas</b><small>{settings.sounds ? 'Sonidos a tu gusto' : 'Campana de bronce'} · {alarmas} {alarmas === 1 ? 'alarma' : 'alarmas'} en el calendario</small></span><span aria-hidden="true">→</span></a></li>
        <li><a href="#/ajustes-companera"><span><b>Compañera de entrenamiento</b><small>{settings.names.partner} · pesos y récords propios</small></span><span aria-hidden="true">→</span></a></li>
        <li><a href="#/motor/importar"><span><b>Importar mazo de Anki</b><small>Archivo de texto exportado desde Anki</small></span><span aria-hidden="true">→</span></a></li>
        <li><a href="#/ajustes-datos"><span><b>Copia de seguridad</b><small>{settings.lastBackup ? `Última copia: ${settings.lastBackup}` : 'Todavía no hiciste ninguna'} · restaurar</small></span><span aria-hidden="true">→</span></a></li>
        <li><button onClick={instalar}><span><b>Instalar Trazo</b><small>{instalada ? 'Ya la estás usando como app' : 'Agregar a la pantalla de inicio'}</small></span><span aria-hidden="true">→</span></button></li>
      </ul>
    </main>
  );
}

/** UX 2.0 · el cambio de interfaz: los mismos datos, dos pieles. La 1.0 sigue hasta que la 2.0 esté lista. */
function InterfazAjuste() {
  const guardada = useStore((s) => s.settings?.interfaz);
  const activa = interfazActiva(guardada);
  const forzada = forzadaPorUrl();
  const listas = Object.values(PANTALLAS_V2).map((e) => e!.nombre);
  return (
    <section aria-label="Interfaz">
      <div className="etiqueta aj-t">Interfaz</div>
      <div className="segmentado" role="radiogroup" aria-label="Interfaz">
        {INTERFACES.map(([id, n]) => <button key={id} role="radio" aria-checked={activa === id} onClick={() => setInterfaz(id as Interfaz)}>{n}</button>)}
      </div>
      <p className="sub nota-izq">
        {forzada ? `La dirección fuerza la ${forzada === 'v1' ? '1.0' : '2.0'} (?ui=${forzada === 'v1' ? 1 : 2}). Sacá ?ui de la dirección para usar lo que elegiste. ` : ''}
        Mismos datos en las dos: cambiar no borra nada. {listas.length ? `Ya en 2.0: ${listas.join(', ')}.` : 'Todavía no hay pantallas 2.0: el resto se ve como siempre.'}
      </p>
    </section>
  );
}

const DIAS_LIBRE: [number | null, string][] = [[null, 'Ninguno'], [1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [7, 'Domingo']];

/** Ajustes → Plan T+18: inicio, rutina activa, T+2, día libre, umbrales de Handyx y colores de las ramas. */
function PlanT18() {
  const settings = useStore((s) => s.settings)!;
  const cfg = planSettings(settings);
  const t0 = settings.startDate || T0_PLAN;
    const intensiva = cfg.modo === 'busqueda-intensiva';
  const decision = PLAN.hitos.find((h) => h.id === 'T+12')!;
  const fechaDecision = (() => { const d = new Date(t0 + 'T12:00'); d.setDate(d.getDate() + (decision.semana - 1) * 7); return dateKey(d); })();
  return (
    <Plegable id="aj:plan" titulo="Plan T+18" resumen={intensiva ? 'modo intensivo' : 'rutina con trabajo'}>
      <ul className="aj-plan">
        <li>
          <span><b>Modo intensivo</b><small>{intensiva ? `Activa · Handyx y ventas en stand-by. Al apagarla vuelve la rutina ${cfg.previo?.rutina === 'con-trabajo' ? 'con trabajo' : 'buscando trabajo'} y el día libre.` : 'Rutinas de búsqueda todos los días, sin día libre; Handyx y ventas en pausa sin borrar nada.'}</small></span>
          <button role="switch" className="switch" aria-checked={intensiva} aria-label="Modo intensivo" onClick={() => {
            if (intensiva) {
              if (window.confirm('¿Apagás la búsqueda intensiva? Vuelve la rutina anterior, el día libre y Handyx y ventas salen de la pausa.')) desactivarIntensiva(dateKey());
            } else if (window.confirm('¿Activás la búsqueda intensiva desde hoy? Handyx y ventas quedan en pausa (no se borra nada).')) activarIntensiva(dateKey());
          }} />
        </li>
        <li>
          <span><b>Inicio del plan</b><small>Semana 1 · {SEMANAS} semanas · {BIMESTRES} bimestres</small></span>
          <input className="campo-texto mono" type="date" value={t0} onChange={(e) => e.target.value && setInicioPlan(e.target.value)} aria-label="Inicio del plan" />
        </li>
        <ExtrasFeature t0={t0} />
        <CapasV2 />
        <FilasTrabajo />
        <FilaExtraPetria />
        <li>
          <span><b>Día libre</b><small>{intensiva ? `Ninguno mientras dure la búsqueda intensiva; ${DIAS_LIBRE.find(([v]) => v === (cfg.previo?.diaLibre ?? null))?.[1].toLowerCase()} queda guardado` : 'Solo repasos de 20 min y entreno suave'}</small></span>
          <select className="campo-texto" disabled={intensiva} value={cfg.diaLibre ?? ''} onChange={(e) => setPlanSettings({ diaLibre: e.target.value ? Number(e.target.value) : null })} aria-label="Día libre">
            {DIAS_LIBRE.map(([v, n]) => <option key={n} value={v ?? ''}>{n}</option>)}
          </select>
        </li>
        <BloquesPendientes />
        <li className="aj-columna">
          <span><b>Umbrales de Handyx</b><small>Para decidir el {fechaCorta(fechaDecision)} {fechaDecision.slice(0, 4)}. Los escribís vos: Trazo no inventa números.</small></span>
          <div className="dos-campos">
            <label>Ingreso mínimo por mes<input className="campo-texto" defaultValue={cfg.umbralIngreso} placeholder="[tu umbral de ingreso]" onBlur={(e) => setPlanSettings({ umbralIngreso: e.target.value.trim() })} /></label>
            <label>Horas máximas por semana<input className="campo-texto" defaultValue={cfg.horasMaximas} placeholder="[horas máximas]" onBlur={(e) => setPlanSettings({ horasMaximas: e.target.value.trim() })} /></label>
          </div>
        </li>
      </ul>
      <div className="chips aj-ramas" aria-label="Colores de las ramas">
        {RAMAS.map((r) => <span key={r} className="mono"><i style={{ background: RAMA_COLOR[r] }} />{r}</span>)}
      </div>
      <p className="sub nota-izq">Cada rama tiene su color en Hoy, Metas y el mapa; main es Trazo.</p>
    </Plegable>
  );
}

/** Ola 24 (plan v2): la pausa de fin de año y las capas de plataforma y arquitectura, con un switch cada una. */
function CapasV2() {
  const apagados = useStore((s) => s.plan.extrasApagados) ?? [];
  const pausa = useStore((s) => s.plan.pausaFinDeAnio) !== false;
  const conPlat = PLAN_EXT.bloques.filter((b) => b.extraPlataforma > 0).map((b) => b.id);
  const conArq = PLAN_EXT.bloques.filter((b) => b.extraArquitectura > 0).map((b) => b.id);
  const prendidas = (ids: string[], k: string) => ids.filter((id) => !apagados.includes(`${id}:${k}`)).length;
  const plat = prendidas(conPlat, 'plataforma');
  const arq = prendidas(conArq, 'arquitectura');
  return (
    <>
      <li>
        <span><b>Pausa de fin de año</b><small>{pausa ? `Prendida: la semana cuyo lunes cae entre el 18 y el 24 de diciembre no se programa; si cae en un bloque, lo parte.${ANIOS_PAUSA ? ` Con el roadmap v7, solo en ${ANIOS_PAUSA.join(', ').replace(/, (\d+)$/, ' y $1')}.` : ''}` : 'Apagada: el calendario sin pausas.'}</small></span>
        <button role="switch" className="switch" aria-checked={pausa} aria-label="Pausa de fin de año" onClick={() => setPausaFinDeAnio(!pausa)} />
      </li>
      {conPlat.length > 0 && <li>
        <span><b>Plataformas extra</b><small>{plat} de {conPlat.length} proyectos, +1 semana cada uno (mobile, escritorio, VR o AR). Se ajustan una por una en cada proyecto.</small></span>
        <button role="switch" className="switch" aria-checked={plat > 0} aria-label="Plataformas extra" onClick={() => setTodosExtra('plataforma', plat === 0, conPlat)} />
      </li>}
      {conArq.length > 0 && <li>
        <span><b>Arquitectura</b><small>{arq ? 'Prendida' : 'Apagada'}: las 2 semanas de microservicios y microfrontends de P10.</small></span>
        <button role="switch" className="switch" aria-checked={arq > 0} aria-label="Arquitectura" onClick={() => setTodosExtra('arquitectura', arq === 0, conArq)} />
      </li>}
    </>
  );
}

/** Ola 16b: las semanas extra por feature diferencial, prendidas por defecto y por proyecto. */
function ExtrasFeature({ t0 }: { t0: string }) {
  useStore((s) => s.plan.extrasApagados);
  useStore((s) => s.plan.pausaFinDeAnio);
  const ps = TRAMOS.filter((t) => t.tipo === 'proyecto' && (t.extraPosible ?? 0) > 0);
  const t18 = fechaHito(PLAN.hitos.find((h) => h.id === 'T+18')!, t0);
  const sumadas = ps.reduce((s, t) => s + (t.extra ?? 0), 0);
  // v7: cada bloque trae sus horas y no hay semanas extra que prender o apagar.
  if (!ps.length) return <li><span><b>Horas del plan</b><small>Con el roadmap v7 cada bloque trae sus horas (o sus días fijos): no hay semanas extra que apagar. T+18 el {fechaCorta(t18)} {t18.slice(0, 4)}.</small></span></li>;
  return (
    <li className="aj-columna">
      <span><b>Semanas extra por feature</b><small>{sumadas} de {ps.reduce((s, t) => s + (t.extraPosible ?? 0), 0)} sumadas · T+18 el {fechaCorta(t18)} {t18.slice(0, 4)}. Apagar una acorta el proyecto y corre todo lo que sigue.</small></span>
      <ul className="aj-extras">
        {ps.map((t) => (
          <li key={t.id}>
            <span><b className="mono">{t.id}</b> {t.nombre}{t.version ? ` ${t.version}` : ''}<small className="sub"> · +{t.extraPosible} sem</small></span>
            <button role="switch" className="switch" aria-checked={(t.extra ?? 0) > 0} aria-label={`Semanas extra de ${t.id}`} onClick={() => setExtraBloque(t.id, !((t.extra ?? 0) > 0))} />
          </li>
        ))}
      </ul>
    </li>
  );
}

