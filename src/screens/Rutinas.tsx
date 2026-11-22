/**
 * Ola 34 · #/ajustes-rutinas: el motor de rutinas del día.
 *  - Inicio: tus rutinas (con a qué días se aplican), generar una nueva, adaptar hoy y las plantillas (v12.1 y archivadas).
 *  - #/ajustes-rutinas/nueva y #/ajustes-rutinas/<id>: el editor por restricciones (despertar, dormir, lo fijo y las horas que pide
 *    cada cosa), con la vista previa, lo que no entra y a qué días se aplica.
 *  - #/ajustes-rutinas/hoy: adaptar el día (otra hora, un compromiso nuevo, sacar un fijo) sin perder lo ya hecho.
 * Una rutina propia se usa tal cual: sin las reglas automáticas del plan.
 */
import { useMemo, useState } from 'react';
import { AREAS } from '../data/defaults';
import { PLANTILLAS, adaptarRutina, generarRutina, restriccionesDe, type AsignacionRutina, type Fijo, type Generada, type Necesidad, type Restricciones } from '../data/motor-rutinas';
import { blockMin, isMeta, type RoutineBlock } from '../data/routines';
import { fmtDur } from '../data/time';
import type { DayLog, RamaOMain } from '../data/types';
import { ir } from '../lib/routes';
import { adaptarDia, asignarRutina, borrarRutina, guardarRutina, quitarAsignacion, rutinaBase } from '../state/rutinas';
import { useStore } from '../state/store';
import { Casilla } from '../ui/Casilla';
import { Plegable } from '../ui/Plegable';
import '../styles/perfil.css';
import '../styles/plan.css';
import '../styles/periodos.css';

const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const RAMAS: [RamaOMain | '', string][] = [['', 'sin rama'], ['programacion', 'programación'], ['matematica', 'matemática'], ['ingles', 'inglés'], ['trabajo', 'trabajo'], ['salud', 'salud'], ['main', 'Trazo']];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fd = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
const horas = (m: number) => String(Math.round((m / 60) * 100) / 100).replace('.', ',');

export function Rutinas({ day, param }: { day: DayLog; param?: string }) {
  if (param === 'hoy') return <AdaptarHoy day={day} />;
  if (param) return <Editor key={param} day={day} id={param === 'nueva' ? undefined : param} />;
  return <Inicio day={day} />;
}

/** Cómo se lee una asignación. */
export const textoAsignacion = (a: AsignacionRutina) =>
  a.tipo === 'dia' ? `el ${fd(a.fecha!)}` : a.tipo === 'rango' ? `del ${fd(a.desde!)} al ${fd(a.hasta!)}` : `${a.dias!.map((d) => DIAS[d - 1]).join(', ')}${a.desde ? ` desde el ${fd(a.desde)}` : ''}`;

function Inicio({ day }: { day: DayLog }) {
  const rutinas = useStore((s) => s.plan.rutinasPropias) ?? [];
  const asig = useStore((s) => s.plan.asignacionesRutina) ?? [];
  const desdePlantilla = (p: (typeof PLANTILLAS)[number]) => ir(`ajustes-rutinas/${guardarRutina({ nombre: `${p.nombre} (copia)`, origen: p.id, creada: day.date, bloques: p.bloques })}`);
  return (
    <main className="pantalla ajustes">
      <div className="topbar"><a className="volver" href="#/ajustes">Ajustes</a></div>
      <h1 className="titulo">Rutinas del día</h1>
      <p className="sub">Generá una rutina con tus horarios, adaptala a un día, a días de la semana o a unas fechas, o arrancá de una plantilla. Una rutina tuya se usa tal cual: sin las reglas automáticas del plan.</p>
      <a className="fila-link" href="#/ajustes-rutinas/nueva">Generar una rutina <span aria-hidden="true">→</span></a>
      <a className="fila-link" href="#/ajustes-rutinas/hoy">Adaptar hoy <span aria-hidden="true">→</span></a>

      <span className="etiqueta">Tus rutinas</span>
      {rutinas.length === 0 ? <p className="sub">Todavía no tenés: rige la rutina del plan.</p> : (
        <ul className="pd-lista">
          {rutinas.map((r) => {
            const suyas = asig.filter((a) => a.rutina === r.id);
            return (
              <li key={r.id} className="pd-card compacta">
                <div className="pd-cab">
                  <a className="pd-tit" href={`#/ajustes-rutinas/${r.id}`}><b className="pd-nombre">{r.nombre}</b><span className="pd-kicker mono">{r.bloques.filter(isMeta).length} metas · {suyas.length ? suyas.map(textoAsignacion).join(' · ') : 'sin asignar'}</span></a>
                  <button className="subrayado" onClick={() => borrarRutina(r.id)} aria-label={`Borrar ${r.nombre}`}>Borrar</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(['v12', 'archivada'] as const).map((g) => (
        <section key={g} aria-label={g === 'v12' ? 'Plantillas del plan v12.1' : 'Plantillas archivadas'}>
          <span className="etiqueta">{g === 'v12' ? 'Plantillas · plan v12.1' : 'Plantillas · archivadas'}</span>
          {PLANTILLAS.filter((p) => p.grupo === g).map((p) => (
            <Plegable key={p.id} id={`rutina:${p.id}`} titulo={p.nombre} resumen={`${p.bloques.filter(isMeta).length} metas`}>
              <ListaBloques bloques={p.bloques} />
              <button className="btn-borde" onClick={() => desdePlantilla(p)}>Usar como base</button>
            </Plegable>
          ))}
        </section>
      ))}
    </main>
  );
}

function ListaBloques({ bloques }: { bloques: RoutineBlock[] }) {
  return (
    <ol className="rd-bloques">
      {bloques.map((b) => (
        <li key={b.id + b.start} className={isMeta(b) ? '' : 'no-meta'} style={{ ['--c' as string]: AREAS[b.area]?.css }}>
          <span className="mono">{b.start}–{b.end}</span>
          <span className="rd-t"><b>{b.label}</b><small className="sub">{fmtDur(blockMin(b))} · {b.kind === 'fixed' ? 'fijo' : 'flexible'}{isMeta(b) ? '' : ' · no es meta'}</small></span>
        </li>
      ))}
    </ol>
  );
}

function Resultado({ g }: { g: Generada }) {
  return (
    <section aria-label="Vista previa">
      <span className="etiqueta">Así queda</span>
      {g.errores.map((e) => <p key={e} className="pd-aviso" role="alert">{e}</p>)}
      {g.faltan.length > 0 && <p className="pd-aviso" role="alert">No entra: {g.faltan.map((f) => `${f.label} (${horas(f.min)} h)`).join(' · ')}</p>}
      <ListaBloques bloques={g.bloques} />
      <p className="sub mono">Libre: {horas(g.libre)} h</p>
    </section>
  );
}

const FIJO_VACIO: Fijo = { label: '', start: '13:00', end: '14:00' };

function EditorFijos({ fijos, set }: { fijos: Fijo[]; set: (f: Fijo[]) => void }) {
  const cambiar = (i: number, x: Partial<Fijo>) => set(fijos.map((f, j) => (j === i ? { ...f, ...x } : f)));
  return (
    <ul className="cp-lista">
      {fijos.map((f, i) => (
        <li key={i} className="cp-mocks">
          <input className="campo-texto" aria-label={`Fijo ${i + 1}: nombre`} value={f.label} placeholder="Abi + correr" onChange={(e) => cambiar(i, { label: e.target.value })} />
          <input className="campo-texto mono" type="time" aria-label={`Fijo ${i + 1}: desde`} value={f.start} onChange={(e) => cambiar(i, { start: e.target.value })} />
          <input className="campo-texto mono" type="time" aria-label={`Fijo ${i + 1}: hasta`} value={f.end} onChange={(e) => cambiar(i, { end: e.target.value })} />
          <button className="subrayado" onClick={() => set(fijos.filter((_, j) => j !== i))}>Sacar</button>
        </li>
      ))}
      <li><button className="subrayado" onClick={() => set([...fijos, { ...FIJO_VACIO }])}>+ Algo fijo</button></li>
    </ul>
  );
}

function EditorNecesidades({ ns, set }: { ns: Necesidad[]; set: (n: Necesidad[]) => void }) {
  const cambiar = (i: number, x: Partial<Necesidad>) => set(ns.map((n, j) => (j === i ? { ...n, ...x } : n)));
  return (
    <ul className="cp-lista">
      {ns.map((n, i) => (
        <li key={i} className="cp-mocks">
          <input className="campo-texto" aria-label={`Necesidad ${i + 1}: nombre`} value={n.label} placeholder="Foco" onChange={(e) => cambiar(i, { label: e.target.value })} />
          <input className="campo-texto mono" inputMode="decimal" aria-label={`Necesidad ${i + 1}: horas`} value={horas(n.min)} onChange={(e) => { const h = Number(e.target.value.replace(',', '.')); if (h >= 0 && h <= 20) cambiar(i, { min: Math.round(h * 60) }); }} />
          <select className="select-plano" aria-label={`Necesidad ${i + 1}: rama`} value={n.rama ?? ''} onChange={(e) => cambiar(i, { rama: (e.target.value || undefined) as RamaOMain | undefined })}>
            {RAMAS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <button className="subrayado" onClick={() => set(ns.filter((_, j) => j !== i))}>Sacar</button>
        </li>
      ))}
      <li><button className="subrayado" onClick={() => set([...ns, { label: '', min: 60 }])}>+ Algo que pide horas</button></li>
    </ul>
  );
}

/** El editor por restricciones: nueva (de cero) o una rutina tuya. */
function Editor({ day, id }: { day: DayLog; id?: string }) {
  const rutinas = useStore((s) => s.plan.rutinasPropias) ?? [];
  const asig = (useStore((s) => s.plan.asignacionesRutina) ?? []).filter((a) => a.rutina === id);
  const base = rutinas.find((r) => r.id === id);
  const [nombre, setNombre] = useState(base?.nombre ?? 'Mi rutina');
  const [r, setR] = useState<Restricciones>(() => (base ? restriccionesDe(base.bloques) : { despertar: '04:00', dormir: '21:00', manana: 30, fijos: [{ label: 'Abi + correr', start: '08:30', end: '10:00', area: 'salud', rama: 'salud' }], necesidades: [{ label: 'Foco', min: 600, rama: 'programacion' }] }));
  const g = useMemo(() => generarRutina({ ...r, fijos: r.fijos.filter((f) => f.label.trim()), necesidades: r.necesidades.filter((n) => n.label.trim() && n.min > 0) }), [r]);
  if (id && !base) return <main className="pantalla ajustes"><div className="topbar"><a className="volver" href="#/ajustes-rutinas">Rutinas del día</a></div><p className="sub">No hay una rutina con ese id.</p></main>;
  const guardar = () => {
    const nuevo = guardarRutina({ ...(id ? { id } : {}), nombre: nombre.trim() || 'Mi rutina', origen: base?.origen, creada: base?.creada ?? day.date, bloques: g.bloques });
    if (!id) ir(`ajustes-rutinas/${nuevo}`);
  };
  return (
    <main className="pantalla ajustes">
      <div className="topbar"><a className="volver" href="#/ajustes-rutinas">Rutinas del día</a></div>
      <h1 className="titulo">{id ? 'Editar rutina' : 'Generar una rutina'}</h1>
      <label className="cp-mocks"><span className="sub">Nombre</span><input className="campo-texto" aria-label="Nombre de la rutina" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
      <div className="cp-mocks">
        <label><span className="sub">Me levanto</span> <input className="campo-texto mono" type="time" aria-label="Hora de levantarse" value={r.despertar} onChange={(e) => setR({ ...r, despertar: e.target.value })} /></label>
        <label><span className="sub">Me acuesto</span> <input className="campo-texto mono" type="time" aria-label="Hora de dormir" value={r.dormir} onChange={(e) => setR({ ...r, dormir: e.target.value })} /></label>
      </div>
      <span className="etiqueta">Lo fijo (no se mueve)</span>
      <EditorFijos fijos={r.fijos} set={(fijos) => setR({ ...r, fijos })} />
      <span className="etiqueta">Lo que pide horas (en orden de prioridad)</span>
      <EditorNecesidades ns={r.necesidades} set={(necesidades) => setR({ ...r, necesidades })} />
      <Resultado g={g} />
      <button className="btn-principal" disabled={g.errores.length > 0} onClick={guardar}>{id ? 'Guardar cambios' : 'Guardar la rutina'}</button>
      {id && <Asignar id={id} actuales={asig} hoy={day.date} />}
    </main>
  );
}

/** A qué días se aplica: un día, días de la semana desde una fecha o un rango. */
function Asignar({ id, actuales, hoy }: { id: string; actuales: AsignacionRutina[]; hoy: string }) {
  const [tipo, setTipo] = useState<AsignacionRutina['tipo']>('semana');
  const [fecha, setFecha] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const valida = tipo !== 'semana' || dias.length > 0;
  const asignar = () => asignarRutina(tipo === 'dia' ? { rutina: id, tipo, fecha } : tipo === 'rango' ? { rutina: id, tipo, desde: fecha, hasta: hasta < fecha ? fecha : hasta } : { rutina: id, tipo, dias, desde: fecha });
  return (
    <section aria-labelledby="ru-as">
      <span className="etiqueta" id="ru-as">Cuándo se usa</span>
      {actuales.length > 0 && <ul className="cp-lista">{actuales.map((a) => <li key={a.id}>{textoAsignacion(a)} · <button className="subrayado" onClick={() => quitarAsignacion(a.id)}>Quitar</button></li>)}</ul>}
      <div className="chips" role="radiogroup" aria-label="Cuándo">
        {([['dia', 'Un día'], ['semana', 'Días de la semana'], ['rango', 'Unas fechas']] as const).map(([t, n]) => <button key={t} role="radio" aria-checked={tipo === t} className="chip" onClick={() => setTipo(t)}>{n}</button>)}
      </div>
      {tipo === 'semana' && (
        <div className="cp-mocks" aria-label="Días">
          {DIAS.map((d, i) => <label key={d} className="cp-mocks"><Casilla checked={dias.includes(i + 1)} label={d} onChange={() => setDias((x) => (x.includes(i + 1) ? x.filter((y) => y !== i + 1) : [...x, i + 1].sort()))} />{d}</label>)}
        </div>
      )}
      <div className="cp-mocks">
        <label><span className="sub">{tipo === 'dia' ? 'Fecha' : 'Desde'}</span> <input className="campo-texto mono" type="date" aria-label={tipo === 'dia' ? 'Fecha' : 'Desde'} value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        {tipo === 'rango' && <label><span className="sub">Hasta</span> <input className="campo-texto mono" type="date" aria-label="Hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>}
      </div>
      <button className="btn-borde" disabled={!valida} onClick={asignar}>Usarla {tipo === 'dia' ? 'ese día' : tipo === 'rango' ? 'en esas fechas' : 'esos días'}</button>
      <p className="sub">Un día manda sobre unas fechas, y unas fechas sobre los días de la semana. Los días que ya empezaron no cambian (para hoy, usá Adaptar hoy).</p>
    </section>
  );
}

/** Adaptar hoy: otra hora, un compromiso nuevo o sacar un fijo; lo que ya hiciste queda. */
function AdaptarHoy({ day }: { day: DayLog }) {
  const base = useMemo(() => rutinaBase(day.date, day.dayType), [day.date, day.dayType]);
  const r0 = useMemo(() => restriccionesDe(base), [base]);
  const [despertar, setDespertar] = useState(r0.despertar);
  const [dormir, setDormir] = useState(r0.dormir);
  const [nuevos, setNuevos] = useState<Fijo[]>([]);
  const [quitar, setQuitar] = useState<string[]>([]);
  const [hecho, setHecho] = useState<ReturnType<typeof adaptarDia> | null>(null);
  const cambio = { despertar, dormir, fijos: nuevos.filter((f) => f.label.trim()), quitar };
  // La misma cuenta que hace adaptarDia, para la vista previa.
  const g = useMemo(() => adaptarRutina(base, cambio), [base, despertar, dormir, nuevos, quitar]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <main className="pantalla ajustes">
      <div className="topbar"><a className="volver" href="#/hoy">Hoy</a><a className="mono sub" href="#/ajustes-rutinas">Rutinas →</a></div>
      <h1 className="titulo">Adaptar hoy</h1>
      <p className="sub">Lo fijo queda en su lugar y lo flexible se acomoda alrededor; un compromiso nuevo manda sobre lo fijo que pisa. Lo que ya hiciste hoy no se toca.</p>
      <div className="cp-mocks">
        <label><span className="sub">Me levanté</span> <input className="campo-texto mono" type="time" aria-label="Hora de levantarse" value={despertar} onChange={(e) => setDespertar(e.target.value)} /></label>
        <label><span className="sub">Me acuesto</span> <input className="campo-texto mono" type="time" aria-label="Hora de dormir" value={dormir} onChange={(e) => setDormir(e.target.value)} /></label>
      </div>
      <span className="etiqueta">Compromisos de hoy</span>
      <EditorFijos fijos={nuevos} set={setNuevos} />
      {r0.fijos.length > 0 && (
        <>
          <span className="etiqueta">Hoy no va</span>
          <ul className="cp-lista">{r0.fijos.map((f) => <li key={f.id} className="cp-mocks"><Casilla checked={quitar.includes(f.id!)} label={`Hoy no va: ${f.label}`} onChange={() => setQuitar((x) => (x.includes(f.id!) ? x.filter((y) => y !== f.id) : [...x, f.id!]))} />{f.label} <span className="mono sub">{f.start}–{f.end}</span></li>)}</ul>
        </>
      )}
      <Resultado g={g} />
      <button className="btn-principal" disabled={g.errores.length > 0} onClick={() => setHecho(adaptarDia(day.date, cambio))}>Usar hoy</button>
      {hecho && <p role="status">Listo: hoy usa la rutina adaptada. <a href="#/hoy">Ir a Hoy</a></p>}
    </main>
  );
}
