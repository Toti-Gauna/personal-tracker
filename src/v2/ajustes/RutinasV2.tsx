/**
 * Trazo 2.0 · Rutinas del día (#/ajustes-rutinas): el motor de rutinas. Inicio: tus rutinas, generar una, adaptar hoy y las plantillas.
 * #/ajustes-rutinas/nueva y /<id>: el editor por restricciones (despertar, dormir, lo fijo y lo que pide horas) con la vista previa y a
 * qué días se aplica. #/ajustes-rutinas/hoy: adaptar el día sin perder lo ya hecho. Una rutina propia se usa tal cual.
 */
import { useMemo, useState } from 'react';
import { AREAS } from '../../data/defaults';
import { PLANTILLAS, adaptarRutina, generarRutina, restriccionesDe, type AsignacionRutina, type Fijo, type Generada, type Necesidad, type Restricciones } from '../../data/motor-rutinas';
import { RAMA_NOMBRE } from '../../data/ramas';
import { blockMin, isMeta, type RoutineBlock } from '../../data/routines';
import { fmtDur } from '../../data/time';
import type { DayLog, RamaOMain } from '../../data/types';
import { ir } from '../../lib/routes';
import { adaptarDia, asignarRutina, borrarRutina, guardarRutina, quitarAsignacion, rutinaBase } from '../../state/rutinas';
import { getState, setState, useStore } from '../../state/store';
import { colorV2 } from '../hoy/datos';
import { Icono } from '../iconos';
import { aviso } from '../kit/capas';
import { Boton, CampoFecha, CampoHora, CampoTexto, Chip, Contador, Segmentado, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { reducido } from '../movimiento/movimiento';
import { FilaHoja, Lista } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { Etiquetado, diaMes, horasDe } from './piezas';
import '../proyecto/proyecto.css';
import './ajustes.css';

const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const RAMAS: [RamaOMain | '', string][] = [['', 'Sin rama'], ['programacion', 'Programación'], ['matematica', 'Matemática'], ['ingles', 'Inglés'], ['trabajo', 'Trabajo'], ['salud', 'Salud'], ['main', 'Trazo']];

export default function RutinasV2({ ruta, day }: PropsV2) {
  if (ruta.param === 'hoy') return <AdaptarHoy day={day} />;
  if (ruta.param) return <Editor day={day} id={ruta.param === 'nueva' ? undefined : ruta.param} />;
  return <Inicio day={day} />;
}

/** Cómo se lee una asignación: "el 23 nov", "del 23 nov al 30 nov", "lun, mar desde el 23 nov". */
export const textoAsignacion = (a: AsignacionRutina) =>
  a.tipo === 'dia' ? `el ${diaMes(a.fecha!)}` : a.tipo === 'rango' ? `del ${diaMes(a.desde!)} al ${diaMes(a.hasta!)}` : `${a.dias!.map((d) => DIAS[d - 1]).join(', ')}${a.desde ? ` desde el ${diaMes(a.desde)}` : ''}`;

const INFO_INICIO = (
  <>
    <p className="t-cuerpo-l">Generá una rutina con tus horarios, adaptala a un día, a días de la semana o a unas fechas, o arrancá de una plantilla.</p>
    <p className="t-cuerpo">Una rutina tuya se usa tal cual: sin las reglas automáticas del plan. Un día manda sobre unas fechas, y unas fechas sobre los días de la semana.</p>
  </>
);

function Inicio({ day }: { day: DayLog }) {
  const rutinas = useStore((s) => s.plan.rutinasPropias) ?? [];
  const asig = useStore((s) => s.plan.asignacionesRutina) ?? [];
  const [plantilla, setPlantilla] = useState<(typeof PLANTILLAS)[number] | null>(null);
  const desdePlantilla = (p: (typeof PLANTILLAS)[number]) => ir(`ajustes-rutinas/${guardarRutina({ nombre: `${p.nombre} (copia)`, origen: p.id, creada: day.date, bloques: p.bloques })}`);

  const borrar = (id: string) => {
    const r = rutinas.find((x) => x.id === id);
    if (!r) return;
    const indice = rutinas.indexOf(r);
    const suyas = asig.filter((a) => a.rutina === id);
    borrarRutina(id);
    aviso({ titulo: 'Rutina borrada', sub: r.nombre, deshacer: () => setState((s) => {
      const otras = (s.plan.rutinasPropias ?? []).filter((x) => x.id !== id);
      return { ...s, plan: { ...s.plan, rutinasPropias: [...otras.slice(0, indice), r, ...otras.slice(indice)], asignacionesRutina: [...(s.plan.asignacionesRutina ?? []), ...suyas] } };
    }) });
  };

  return (
    <Marco className="ax" titulo="Rutinas del día" volver={{ href: '#/ajustes', nombre: 'Ajustes' }} info={INFO_INICIO}>
      <div className="ax-pila">
        <Boton variante="primario" ancho icono="mas" href="#/ajustes-rutinas/nueva">Generar una rutina</Boton>
        <Boton ancho icono="reloj" href="#/ajustes-rutinas/hoy">Adaptar hoy</Boton>
      </div>

      <Grupo titulo="Tus rutinas">
        {rutinas.length === 0 ? (
          <Vacio ilustracion="historial" titulo="Rige la rutina del plan" texto="Generá una con tus horarios o partí de una plantilla."
            accion={<Boton onClick={() => document.getElementById('ax-plantillas')?.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth' })}>Ver las plantillas</Boton>} />
        ) : (
          <ul className="capa-1 ax-rutinas">
            {rutinas.map((r) => {
              const suyas = asig.filter((a) => a.rutina === r.id);
              return (
                <li key={r.id}>
                  <Fila titulo={r.nombre} nota={`${r.bloques.filter(isMeta).length} metas · ${suyas.length ? suyas.map(textoAsignacion).join(' · ') : 'sin asignar'}`} href={`#/ajustes-rutinas/${r.id}`} />
                  <Boton soloIcono variante="fantasma" icono="borrar" etiqueta={`Borrar ${r.nombre}`} onClick={() => borrar(r.id)} />
                </li>
              );
            })}
          </ul>
        )}
      </Grupo>

      <span id="ax-plantillas" />
      {(['v12', 'archivada'] as const).map((g) => (
        <Grupo key={g} titulo={g === 'v12' ? 'Plantillas del plan' : 'Plantillas archivadas'}>
          <div className="capa-1 s-lista">
            {PLANTILLAS.filter((p) => p.grupo === g).map((p) => <Fila key={p.id} titulo={p.nombre} valor={`${p.bloques.filter(isMeta).length} metas`} onClick={() => setPlantilla(p)} />)}
          </div>
        </Grupo>
      ))}

      <Hoja abierta={!!plantilla} onCerrar={() => setPlantilla(null)} titulo={plantilla?.nombre ?? 'Plantilla'} alto="completa"
        pie={<><Boton onClick={() => setPlantilla(null)}>Cerrar</Boton><Boton variante="primario" icono="copiar" onClick={() => plantilla && desdePlantilla(plantilla)}>Usar como base</Boton></>}>
        {plantilla && <ListaBloques bloques={plantilla.bloques} />}
      </Hoja>
    </Marco>
  );
}

function ListaBloques({ bloques }: { bloques: RoutineBlock[] }) {
  return (
    <ol className="capa-1 ax-bloques">
      {bloques.map((b) => (
        <li key={b.id + b.start} style={{ ['--area' as string]: colorV2(AREAS[b.area]?.css ?? 'var(--tinta)') }}>
          <span className="t-dato ax-hora">{b.start}–{b.end}</span>
          <span className="ax-bloque-t"><b><i className="area-punto" /> {b.label}</b><small>{fmtDur(blockMin(b))}{b.kind === 'fixed' && <><Icono nombre="candado" lado={13} /><span className="v2-oculto"> fijo</span></>}{isMeta(b) ? '' : ' · sin meta'}</small></span>
        </li>
      ))}
    </ol>
  );
}

/** Así queda: lo que no entra y los problemas, con ícono y palabra, y la rutina bloque por bloque. */
function Previa({ g }: { g: Generada }) {
  return (
    <Grupo titulo="Así queda" extremo={<span className="t-dato t-nota">Libre: {horasDe(g.libre)} h</span>}>
      {g.errores.map((e) => <p key={e} className="ax-alerta t-nota" role="alert"><Icono nombre="alerta" lado={16} />{e}</p>)}
      {g.faltan.length > 0 && <p className="ax-alerta t-nota" role="alert"><Icono nombre="atencion" lado={16} />No entra: {g.faltan.map((f) => `${f.label} (${horasDe(f.min)} h)`).join(' · ')}</p>}
      <ListaBloques bloques={g.bloques} />
    </Grupo>
  );
}

const FIJO_VACIO: Fijo = { label: '', start: '13:00', end: '14:00' };

/** Lo fijo (o los compromisos de hoy): una fila cada uno que se edita en una hoja; sacar se puede deshacer. */
/** `set` recibe una función del estado anterior: una hora que salta de campo dispara dos cambios en el mismo toque y el segundo no puede pisar al primero. */
function EditorFijos({ fijos, set, agregar }: { fijos: Fijo[]; set: (f: (prev: Fijo[]) => Fijo[]) => void; agregar: string }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const f = abierta != null ? fijos[abierta] : undefined;
  const cambiar = (i: number, x: Partial<Fijo>) => set((fs) => fs.map((y, j) => (j === i ? { ...y, ...x } : y)));
  const sacar = (i: number) => {
    const quitado = fijos[i];
    set((fs) => fs.filter((_, j) => j !== i));
    setAbierta(null);
    aviso({ titulo: 'Fijo sacado', sub: quitado.label || 'Sin nombre', deshacer: () => set((fs) => [...fs.slice(0, i), quitado, ...fs.slice(i)]) });
  };
  return (
    <>
      {fijos.length > 0 && (
        <div className="capa-1 s-lista">
          {fijos.map((x, i) => <Fila key={i} titulo={x.label || 'Sin nombre'} valor={`${x.start}–${x.end}`} onClick={() => setAbierta(i)} />)}
        </div>
      )}
      <Boton ancho icono="mas" onClick={() => { set((fs) => [...fs, { ...FIJO_VACIO }]); setAbierta(fijos.length); }}>{agregar}</Boton>
      <Hoja abierta={!!f} onCerrar={() => setAbierta(null)} titulo={f?.label || 'Algo fijo'}
        pie={<><Boton variante="peligro" icono="borrar" onClick={() => abierta != null && sacar(abierta)}>Sacar</Boton><Boton variante="primario" icono="tilde" onClick={() => setAbierta(null)}>Listo</Boton></>}>
        {f && abierta != null && (
          <div className="ax-editar">
            <CampoTexto etiqueta="Nombre" valor={f.label} placeholder="Abi + correr" onCambio={(v) => cambiar(abierta, { label: v })} />
            <div className="ax-dos">
              <CampoHora etiqueta="Desde" valor={f.start} onCambio={(v) => cambiar(abierta, { start: v })} />
              <CampoHora etiqueta="Hasta" valor={f.end} onCambio={(v) => cambiar(abierta, { end: v })} />
            </div>
          </div>
        )}
      </Hoja>
    </>
  );
}

/** Lo que pide horas, en orden de prioridad: cuántas, y de qué rama. */
function EditorNecesidades({ ns, set }: { ns: Necesidad[]; set: (n: (prev: Necesidad[]) => Necesidad[]) => void }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const n = abierta != null ? ns[abierta] : undefined;
  const cambiar = (i: number, x: Partial<Necesidad>) => set((xs) => xs.map((y, j) => (j === i ? { ...y, ...x } : y)));
  const sacar = (i: number) => {
    const quitada = ns[i];
    set((xs) => xs.filter((_, j) => j !== i));
    setAbierta(null);
    aviso({ titulo: 'Quitado', sub: quitada.label || 'Sin nombre', deshacer: () => set((xs) => [...xs.slice(0, i), quitada, ...xs.slice(i)]) });
  };
  return (
    <>
      {ns.length > 0 && (
        <div className="capa-1 s-lista">
          {ns.map((x, i) => <Fila key={i} titulo={x.label || 'Sin nombre'} nota={x.rama ? RAMA_NOMBRE[x.rama] : undefined} valor={`${horasDe(x.min)} h`} onClick={() => setAbierta(i)} />)}
        </div>
      )}
      <Boton ancho icono="mas" onClick={() => { set((xs) => [...xs, { label: '', min: 60 }]); setAbierta(ns.length); }}>Algo que pide horas</Boton>
      <Hoja abierta={!!n} onCerrar={() => setAbierta(null)} titulo={n?.label || 'Algo que pide horas'}
        pie={<><Boton variante="peligro" icono="borrar" onClick={() => abierta != null && sacar(abierta)}>Sacar</Boton><Boton variante="primario" icono="tilde" onClick={() => setAbierta(null)}>Listo</Boton></>}>
        {n && abierta != null && (
          <div className="ax-editar">
            <CampoTexto etiqueta="Nombre" valor={n.label} placeholder="Foco" onCambio={(v) => cambiar(abierta, { label: v })} />
            <Etiquetado etiqueta="Cuánto pide"><Contador etiqueta="Minutos que pide" valor={n.min} onCambio={(v) => cambiar(abierta, { min: v })} min={5} max={1200} paso={15} unidad="min" /></Etiquetado>
            <p className="t-nota">Son {horasDe(n.min)} h.</p>
            <Selector etiqueta="Rama" valor={n.rama ?? ''} opciones={RAMAS.map(([v, t]) => ({ valor: v, etiqueta: t }))} onCambio={(v) => cambiar(abierta, { rama: (v || undefined) as RamaOMain | undefined })} />
          </div>
        )}
      </Hoja>
    </>
  );
}

const INFO_EDITOR = (
  <>
    <p className="t-cuerpo-l">Decí a qué hora te levantás y te acostás, lo que no se mueve y las horas que pide cada cosa.</p>
    <p className="t-cuerpo">Trazo acomoda lo flexible en los huecos entre lo fijo, en el orden en que lo anotes: lo primero tiene prioridad. Lo que no entra se avisa.</p>
    <p className="t-cuerpo">Después elegí cuándo se usa: un día, días de la semana desde una fecha, o unas fechas. Los días que ya empezaron no cambian: para hoy, usá Adaptar hoy.</p>
    <p className="t-cuerpo">En la vista previa, el candado marca lo fijo; lo demás es flexible.</p>
  </>
);

/** El editor por restricciones: nueva (de cero) o una rutina tuya. */
function Editor({ day, id }: { day: DayLog; id?: string }) {
  const rutinas = useStore((s) => s.plan.rutinasPropias) ?? [];
  const asig = (useStore((s) => s.plan.asignacionesRutina) ?? []).filter((a) => a.rutina === id);
  const base = rutinas.find((r) => r.id === id);
  const [nombre, setNombre] = useState(base?.nombre ?? 'Mi rutina');
  const [r, setR] = useState<Restricciones>(() => (base ? restriccionesDe(base.bloques) : { despertar: '04:00', dormir: '21:00', manana: 30, fijos: [{ label: 'Abi + correr', start: '08:30', end: '10:00', area: 'salud', rama: 'salud' }], necesidades: [{ label: 'Foco', min: 600, rama: 'programacion' }] }));
  const g = useMemo(() => generarRutina({ ...r, fijos: r.fijos.filter((f) => f.label.trim()), necesidades: r.necesidades.filter((n) => n.label.trim() && n.min > 0) }), [r]);
  if (id && !base) {
    return (
      <Marco className="ax" titulo="Rutina" volver={{ href: '#/ajustes-rutinas', nombre: 'Rutinas' }}>
        <Vacio ilustracion="buscar" titulo="No hay una rutina con ese id" texto="Quizás la borraste." accion={<Boton variante="primario" href="#/ajustes-rutinas">Ver mis rutinas</Boton>} />
      </Marco>
    );
  }
  const guardar = () => {
    const nuevo = guardarRutina({ ...(id ? { id } : {}), nombre: nombre.trim() || 'Mi rutina', origen: base?.origen, creada: base?.creada ?? day.date, bloques: g.bloques });
    if (!id) ir(`ajustes-rutinas/${nuevo}`);
    else aviso({ titulo: 'Cambios guardados', sub: nombre.trim() || 'Mi rutina', tono: 'hecho' });
  };
  return (
    <Marco className="ax" titulo={id ? 'Editar rutina' : 'Generar rutina'} volver={{ href: '#/ajustes-rutinas', nombre: 'Rutinas' }} info={INFO_EDITOR}>
      <div className="capa-1 ax-form">
        <CampoTexto etiqueta="Nombre de la rutina" valor={nombre} onCambio={setNombre} />
        <div className="ax-dos">
          <CampoHora etiqueta="Me levanto" valor={r.despertar} onCambio={(v) => setR((x) => ({ ...x, despertar: v }))} />
          <CampoHora etiqueta="Me acuesto" valor={r.dormir} onCambio={(v) => setR((x) => ({ ...x, dormir: v }))} />
        </div>
      </div>
      <Grupo titulo="Lo fijo (no se mueve)"><EditorFijos fijos={r.fijos} set={(fn) => setR((x) => ({ ...x, fijos: fn(x.fijos) }))} agregar="Algo fijo" /></Grupo>
      <Grupo titulo="Lo que pide horas"><EditorNecesidades ns={r.necesidades} set={(fn) => setR((x) => ({ ...x, necesidades: fn(x.necesidades) }))} /></Grupo>
      <Previa g={g} />
      <Boton variante="primario" ancho icono="tilde" deshabilitado={g.errores.length > 0 ? 'Revisá lo fijo: hay horarios que se pisan.' : false} onClick={guardar}>{id ? 'Guardar cambios' : 'Guardar la rutina'}</Boton>
      {id && <Asignar id={id} actuales={asig} hoy={day.date} />}
    </Marco>
  );
}

/** A qué días se aplica: un día, días de la semana desde una fecha o un rango. */
function Asignar({ id, actuales, hoy }: { id: string; actuales: AsignacionRutina[]; hoy: string }) {
  const [tipo, setTipo] = useState<AsignacionRutina['tipo']>('semana');
  const [fecha, setFecha] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const valida = tipo !== 'semana' || dias.length > 0;
  const asignar = () => {
    const antes = getState().plan.asignacionesRutina;
    const nueva = tipo === 'dia' ? { rutina: id, tipo, fecha } : tipo === 'rango' ? { rutina: id, tipo, desde: fecha, hasta: hasta < fecha ? fecha : hasta } : { rutina: id, tipo, dias, desde: fecha };
    const aid = asignarRutina(nueva);
    aviso({ titulo: 'Rutina asignada', sub: textoAsignacion({ ...nueva, id: aid }), tono: 'hecho', deshacer: () => setState((s) => ({ ...s, plan: { ...s.plan, asignacionesRutina: antes } })) });
  };
  const quitar = (a: AsignacionRutina) => {
    quitarAsignacion(a.id);
    aviso({ titulo: 'Asignación quitada', sub: textoAsignacion(a), deshacer: () => setState((s) => ({ ...s, plan: { ...s.plan, asignacionesRutina: [...(s.plan.asignacionesRutina ?? []), a] } })) });
  };
  return (
    <Grupo titulo="Cuándo se usa">
      {actuales.length > 0 && (
        <ul className="capa-1 ax-asig">
          {actuales.map((a) => (
            <li key={a.id}><span className="t-cuerpo">{textoAsignacion(a)}</span><Boton soloIcono variante="fantasma" icono="cerrar" etiqueta={`Quitar: ${textoAsignacion(a)}`} onClick={() => quitar(a)} /></li>
          ))}
        </ul>
      )}
      <div className="capa-1 ax-form">
        <Segmentado etiqueta="Cuándo" valor={tipo} opciones={[['dia', 'Un día'], ['semana', 'Días de la semana'], ['rango', 'Unas fechas']]} onCambio={setTipo} />
        {tipo === 'semana' && (
          <div className="ax-chips" role="group" aria-label="Días">
            {DIAS.map((d, i) => <Chip key={d} activo={dias.includes(i + 1)} onCambio={() => setDias((x) => (x.includes(i + 1) ? x.filter((y) => y !== i + 1) : [...x, i + 1].sort()))}>{d}</Chip>)}
          </div>
        )}
        <CampoFecha etiqueta={tipo === 'dia' ? 'Fecha' : 'Desde'} valor={fecha} onCambio={setFecha} hoy={hoy} />
        {tipo === 'rango' && <CampoFecha etiqueta="Hasta" valor={hasta} onCambio={setHasta} hoy={hoy} min={fecha} />}
        <Boton ancho icono="calendario" deshabilitado={valida ? false : 'Elegí al menos un día.'} onClick={asignar}>Usarla {tipo === 'dia' ? 'ese día' : tipo === 'rango' ? 'en esas fechas' : 'esos días'}</Boton>
      </div>
    </Grupo>
  );
}

const INFO_HOY = (
  <>
    <p className="t-cuerpo-l">Lo fijo queda en su lugar y lo flexible se acomoda alrededor.</p>
    <p className="t-cuerpo">Un compromiso nuevo manda sobre lo fijo que pisa. Lo que ya hiciste hoy no se toca.</p>
    <p className="t-cuerpo">En la vista previa, el candado marca lo fijo; lo demás es flexible.</p>
  </>
);

/** Adaptar hoy: otra hora, un compromiso nuevo o sacar un fijo; lo que ya hiciste queda. */
function AdaptarHoy({ day }: { day: DayLog }) {
  const base = useMemo(() => rutinaBase(day.date, day.dayType), [day.date, day.dayType]);
  const r0 = useMemo(() => restriccionesDe(base), [base]);
  const [despertar, setDespertar] = useState(r0.despertar);
  const [dormir, setDormir] = useState(r0.dormir);
  const [nuevos, setNuevos] = useState<Fijo[]>([]);
  const [quitar, setQuitar] = useState<string[]>([]);
  const [hecho, setHecho] = useState(false);
  const cambio = { despertar, dormir, fijos: nuevos.filter((f) => f.label.trim()), quitar };
  // La misma cuenta que hace adaptarDia, para la vista previa.
  const g = useMemo(() => adaptarRutina(base, cambio), [base, despertar, dormir, nuevos, quitar]); // eslint-disable-line react-hooks/exhaustive-deps
  const usar = () => {
    adaptarDia(day.date, cambio);
    setHecho(true);
    aviso({ titulo: 'Hoy adaptado', sub: 'Lo que ya hiciste queda como estaba', tono: 'hecho' });
  };
  return (
    <Marco className="ax" titulo="Adaptar hoy" volver={{ href: '#/hoy', nombre: 'Hoy' }} info={INFO_HOY}
      acciones={<Boton tamano="s" variante="fantasma" icono="siguiente" href="#/ajustes-rutinas">Rutinas</Boton>}>
      <div className="capa-1 ax-form ax-dos">
        <CampoHora etiqueta="Me levanté" valor={despertar} onCambio={setDespertar} />
        <CampoHora etiqueta="Me acuesto" valor={dormir} onCambio={setDormir} />
      </div>
      <Grupo titulo="Compromisos"><EditorFijos fijos={nuevos} set={setNuevos} agregar="Compromiso" /></Grupo>
      {r0.fijos.length > 0 && (
        <div className="capa-1 s-lista">
          <FilaHoja icono="calendario" titulo="Hoy no va" tituloHoja="Hoy no va" valor={quitar.length ? `${quitar.length} fuera` : `${r0.fijos.length} fijos`}>
            <Lista festejo={false} items={r0.fijos.map((f) => ({ clave: f.id!, etiqueta: f.label, nota: <span className="t-dato">{f.start}–{f.end}</span>, marcada: quitar.includes(f.id!) }))}
              onCambio={(k) => setQuitar((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))} />
          </FilaHoja>
        </div>
      )}
      <Previa g={g} />
      {hecho ? (
        <Tarjeta capa={2} etiqueta="Listo" className="ax-hecho"><b className="t-encabezado">Hoy usa la rutina adaptada</b><Boton variante="primario" ancho icono="hoy" href="#/hoy">Ir a Hoy</Boton></Tarjeta>
      ) : (
        <Boton variante="primario" ancho icono="tilde" deshabilitado={g.errores.length > 0 ? 'Revisá lo fijo: hay horarios que se pisan.' : false} onClick={usar}>Usar hoy</Boton>
      )}
    </Marco>
  );
}
