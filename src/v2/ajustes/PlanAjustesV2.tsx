/**
 * Trazo 2.0 · Plan y rutina (#/ajustes/plan): lo que antes era el bloque de controles de la 1.0 (Plan T+18). Cada ajuste es una fila
 * que dice su valor y, si hace falta más que un interruptor, abre su hoja con el detalle. Escribe con las mismas acciones de la 1.0.
 */
import { useState } from 'react';
import { ANIOS_PAUSA, HORAS_ANTES_TRABAJO, INICIO_TRABAJO_DIAS, SIN_TRABAJO_NUEVO, convertiblesIntensiva, horasRutinaIntensiva } from '../../data/capacidad';
import { BIMESTRES, PLAN, SEMANAS, T0_PLAN, TRAMOS, fechaCorta, fechaHito } from '../../data/plan';
import { PLAN_EXT } from '../../data/plan-extendido';
import { RAMAS, RAMA_COLOR, RAMA_NOMBRE } from '../../data/ramas';
import { HORARIO_TRABAJO, NOMBRE_PENDIENTE, OBJETIVOS_PENDIENTES, ajustarTrabajo, pendienteEncaja, planRoutine, type BloquePendiente, type ObjetivoPendiente } from '../../data/routines';
import { addDays } from '../../data/time';
import { activarIntensiva, desactivarIntensiva, setExtraBloque, setInicioPlan, setPausaFinDeAnio, setPlanSettings, setTodosExtra } from '../../state/plan';
import { getState, inicioTrabajo, planSettings, useStore } from '../../state/store';
import { colorV2 } from '../hoy/datos';
import { Icono } from '../iconos';
import { aviso, confirmar } from '../kit/capas';
import { Boton, CampoFecha, CampoHora, Contador, Interruptor, Selector, fechaLarga } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { CampoAlSalir, FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { Etiquetado } from './piezas';
import '../proyecto/proyecto.css';
import './ajustes.css';

const DIAS_LIBRE: [number | null, string][] = [[null, 'Ninguno'], [1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [7, 'Domingo']];
const DIAS_PENDIENTE: { valor: BloquePendiente['dias']; etiqueta: string }[] = [{ valor: 'lv', etiqueta: 'Lunes a viernes' }, { valor: 'finde', etiqueta: 'Fin de semana' }, { valor: 'todos', etiqueta: 'Todos los días' }];
const durTxt = (m: number) => `${Math.floor(m / 60) ? `${Math.floor(m / 60)} h` : ''}${m % 60 ? `${Math.floor(m / 60) ? ' ' : ''}${m % 60} min` : ''}`;
const n1 = (x: number) => String(x).replace('.', ',');

const INFO = (
  <>
    <p className="t-cuerpo-l">Cuándo arranca el plan, qué rutina rige y cuánto tiempo va a cada cosa.</p>
    <p className="t-cuerpo"><b>Modo intensivo:</b> rutinas de búsqueda todos los días, sin día libre; Handyx y ventas quedan en pausa sin borrar nada. Al apagarlo vuelve lo de antes.</p>
    <p className="t-cuerpo"><b>Inicio del trabajo:</b> desde esa fecha rige la rutina con trabajo (el modo intensivo termina el día anterior) y el calendario del plan se recalcula con las horas de esa rutina.</p>
    <p className="t-cuerpo"><b>Pausa de fin de año:</b> la semana cuyo lunes cae entre el 18 y el 24 de diciembre no se programa; si cae en un bloque, lo parte.{ANIOS_PAUSA ? ` Con el roadmap v7, solo en ${ANIOS_PAUSA.join(', ').replace(/, (\d+)$/, ' y $1')}.` : ''}</p>
    <p className="t-cuerpo"><b>Plataformas y arquitectura:</b> semanas extra de plataforma (mobile, escritorio, VR o AR) y las 2 semanas de microservicios y microfrontends de P10. Cada una se ajusta también en su proyecto.</p>
    <p className="t-cuerpo"><b>Día libre:</b> solo repasos de 20 min y entreno suave.</p>
    <p className="t-cuerpo"><b>Horas del plan:</b> con el roadmap v7 cada bloque trae sus horas (o sus días fijos): no hay semanas extra por feature que apagar.</p>
  </>
);

/** Una hoja de un ajuste con su propio estado: se abre desde una fila y se guarda con un botón. */
function Pendiente({ o }: { o: ObjetivoPendiente }) {
  const settings = useStore((s) => s.settings);
  const cfg = planSettings(settings);
  const actual = cfg.bloquesPendientes?.[o];
  const [abierta, setAbierta] = useState(false);
  const [start, setStart] = useState(actual?.start ?? '17:00');
  const [min, setMin] = useState(actual?.min ?? 90);
  const [dias, setDias] = useState<BloquePendiente['dias']>(actual?.dias ?? 'finde');
  const [error, setError] = useState('');
  const nombre = NOMBRE_PENDIENTE[o];
  const guardar = () => {
    const b: BloquePendiente = { start, min, dias };
    const e = pendienteEncaja(b);
    if (e) { setError(e); return; }
    setError('');
    setPlanSettings({ bloquesPendientes: { ...(cfg.bloquesPendientes ?? {}), [o]: b } });
    setAbierta(false);
    aviso({ titulo: `${nombre}: bloque asignado`, sub: `${start}, ${min} min`, tono: 'hecho' });
  };
  const quitar = () => {
    const previo = actual;
    const { [o]: _x, ...resto } = cfg.bloquesPendientes ?? {};
    setPlanSettings({ bloquesPendientes: resto });
    setError('');
    setAbierta(false);
    aviso({ titulo: `${nombre}: bloque quitado`, deshacer: () => previo && setPlanSettings({ bloquesPendientes: { ...resto, [o]: previo } }) });
  };
  return (
    <>
      <Fila titulo={nombre} valor={actual ? `${actual.start} · ${actual.min} min` : 'Sin asignar'} onClick={() => setAbierta(true)} />
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo={`Bloque de ${nombre}`}
        pie={<>{actual && <Boton variante="peligro" icono="borrar" onClick={quitar}>Quitar</Boton>}<Boton variante="primario" icono="tilde" onClick={guardar}>{actual ? 'Cambiar' : 'Asignar'}</Boton></>}>
        <p className="t-nota">{actual ? `Bloque asignado: ${actual.start}, ${actual.min} min.` : o === 'clipping' ? 'Pausado: sin bloque no hay alertas, fechas ni metas. Se reactiva al asignarle uno.' : 'Sin horario asignado no aparece en Hoy.'} Solo entra donde no pisa otra meta (el descanso del fin de semana cede su tiempo).</p>
        <CampoHora etiqueta="Empieza" valor={start} onCambio={(v) => { setStart(v); setError(''); }} />
        <Etiquetado etiqueta="Dura"><Contador etiqueta="Dura en minutos" valor={min} onCambio={(v) => { setMin(v); setError(''); }} min={5} max={600} paso={15} unidad="min" /></Etiquetado>
        <Selector etiqueta="Días" valor={dias} opciones={DIAS_PENDIENTE} onCambio={(v) => { setDias(v); setError(''); }} />
        {error && <p className="ax-alerta t-nota" role="alert"><Icono nombre="alerta" lado={16} />{error}</p>}
      </Hoja>
    </>
  );
}

export default function PlanAjustesV2({ today }: PropsV2) {
  const settings = useStore((s) => s.settings)!;
  const apagados = useStore((s) => s.plan.extrasApagados) ?? [];
  const pausa = useStore((s) => s.plan.pausaFinDeAnio) !== false;
  const cfg = planSettings(settings);
  const t0 = settings.startDate || T0_PLAN;
  const intensiva = cfg.modo === 'busqueda-intensiva';
  const inicio = inicioTrabajo(settings);
  const porDefecto = addDays(t0, INICIO_TRABAJO_DIAS);
  const h = cfg.horarioTrabajo ?? HORARIO_TRABAJO;
  const { tarde } = ajustarTrabajo(planRoutine('con-trabajo', 'completo'), h);
  const [libre, setLibre] = useState(false);
  const [colores, setColores] = useState(false);

  const decision = PLAN.hitos.find((x) => x.id === 'T+12')!;
  const fechaDecision = (() => { const d = new Date(t0 + 'T12:00'); d.setDate(d.getDate() + (decision.semana - 1) * 7); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

  // Lee el horario de ahora: una hora que salta de campo dispara dos cambios en el mismo toque.
  const guardarHorario = (x: Partial<typeof h>) => setPlanSettings({ horarioTrabajo: { ...(planSettings(getState().settings).horarioTrabajo ?? HORARIO_TRABAJO), ...x } });

  const alternar = async () => {
    if (intensiva) {
      if (await confirmar({ titulo: '¿Apagás la búsqueda intensiva?', texto: 'Vuelve la rutina anterior y el día libre; Handyx y ventas salen de la pausa.', accion: 'Apagarla' })) { desactivarIntensiva(today); aviso({ titulo: 'Búsqueda intensiva apagada', tono: 'hecho' }); }
    } else if (await confirmar({ titulo: '¿Activás la búsqueda intensiva?', texto: `Desde hoy. Handyx y ventas quedan en pausa (no se borra nada).`, accion: 'Activarla' })) {
      activarIntensiva(today);
      aviso({ titulo: 'Búsqueda intensiva activa', sub: 'Handyx y ventas en pausa', tono: 'hecho' });
    }
  };

  const cambiarInicio = (v: string) => {
    if (v === t0) return;
    const previo = t0;
    setInicioPlan(v);
    aviso({ titulo: 'Inicio del plan cambiado', sub: fechaLarga(v), tono: 'hecho', deshacer: () => setInicioPlan(previo) });
  };

  // Las semanas extra por feature y las capas de la v2 del plan.
  const ps = TRAMOS.filter((t) => t.tipo === 'proyecto' && (t.extraPosible ?? 0) > 0);
  const sumadas = ps.reduce((s, t) => s + (t.extra ?? 0), 0);
  const t18 = fechaHito(PLAN.hitos.find((x) => x.id === 'T+18')!, t0);
  const conPlat = PLAN_EXT.bloques.filter((b) => b.extraPlataforma > 0).map((b) => b.id);
  const conArq = PLAN_EXT.bloques.filter((b) => b.extraArquitectura > 0).map((b) => b.id);
  const prendidas = (ids: string[], k: string) => ids.filter((id) => !apagados.includes(`${id}:${k}`)).length;
  const plat = prendidas(conPlat, 'plataforma');
  const arq = prendidas(conArq, 'arquitectura');

  // Las horas extra de PetrIA (si el plan las deja a definir).
  const elegidos = cfg.extraProyecto ?? [];
  const hp = HORAS_ANTES_TRABAJO == null ? null : horasRutinaIntensiva(elegidos);
  const cambiarExtra = (id: string) => setPlanSettings({ extraProyecto: elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id] });

  const nombreLibre = DIAS_LIBRE.find(([v]) => v === (cfg.diaLibre ?? null))?.[1] ?? 'Ninguno';

  return (
    <Marco className="ax" titulo="Plan y rutina" volver={{ href: '#/ajustes', nombre: 'Ajustes' }} info={INFO}>
      <div className="capa-1 ax-interruptores">
        <Interruptor prendido={intensiva} onCambio={() => { void alternar(); }} etiqueta="Modo intensivo" nota={intensiva ? 'Handyx y ventas en pausa' : 'Búsqueda diaria'} />
      </div>

      <Grupo titulo="Fechas y horarios">
        <div className="capa-1 s-lista">
          <FilaHoja icono="calendario" titulo="Inicio del plan" tituloHoja="Inicio del plan" valor={fechaLarga(t0)}>
            <CampoFecha etiqueta="Inicio del plan" valor={t0} onCambio={cambiarInicio} hoy={today} />
            <p className="t-nota">Semana 1 · {SEMANAS} semanas · {BIMESTRES} bimestres.</p>
          </FilaHoja>
          <FilaHoja icono="trabajo" titulo="Inicio del trabajo" tituloHoja="Inicio del trabajo" valor={cfg.t2 ? fechaLarga(cfg.t2) : SIN_TRABAJO_NUEVO ? 'Sin fecha' : fechaLarga(inicio)}>
            <CampoFecha etiqueta="Inicio del trabajo" valor={cfg.t2 ?? (SIN_TRABAJO_NUEVO ? null : inicio)} onCambio={(v) => v && setPlanSettings({ t2: v })} hoy={today} />
            <p className="t-nota">{cfg.t2 ? `Cargado: ${fechaCorta(cfg.t2)}.` : SIN_TRABAJO_NUEVO ? 'El plan v12.1 no tiene trabajo nuevo: la rutina de 10 y 11 h sigue hasta el final. Si entra uno, cargá la fecha.' : `Por defecto, el supuesto del roadmap (${fechaCorta(porDefecto)}).`}</p>
            {cfg.t2 && <Boton variante="fantasma" icono="deshacer" onClick={() => setPlanSettings({ t2: undefined })}>Restaurar</Boton>}
          </FilaHoja>
          <FilaHoja icono="reloj" titulo="Horario del trabajo" tituloHoja="Horario del trabajo" valor={`${h.inicio}–${h.fin}`}>
            <div className="ax-dos">
              <CampoHora etiqueta="Entrada" valor={h.inicio} onCambio={(v) => guardarHorario({ inicio: v })} />
              <CampoHora etiqueta="Salida" valor={h.fin} onCambio={(v) => guardarHorario({ fin: v })} />
            </div>
            <p className="t-nota">{tarde.sinMatematica ? 'Con esta salida no entra la matemática de la tarde: queda como deuda de horas. ' : ''}La programación de la mañana no se toca; idiomas y entreno se acomodan después de la salida (entreno de {Math.floor(tarde.entrenoMin / 60)} h{tarde.entrenoMin % 60 ? ` ${tarde.entrenoMin % 60} min` : ''} con las caminatas).</p>
          </FilaHoja>
          <Fila icono="pausa" titulo="Día libre" valor={nombreLibre} onClick={() => setLibre(true)} />
        </div>
      </Grupo>

      <Grupo titulo="Horas del plan">
        <div className="capa-1 ax-interruptores">
          <Interruptor prendido={pausa} onCambio={setPausaFinDeAnio} etiqueta="Pausa de fin de año" nota={pausa ? 'Semana de Navidad' : 'Sin pausas'} />
          {conPlat.length > 0 && <Interruptor prendido={plat > 0} onCambio={(v) => setTodosExtra('plataforma', v, conPlat)} etiqueta="Plataformas extra" nota={`${plat} de ${conPlat.length} proyectos, +1 semana cada uno`} />}
          {conArq.length > 0 && <Interruptor prendido={arq > 0} onCambio={(v) => setTodosExtra('arquitectura', v, conArq)} etiqueta="Arquitectura" nota="2 semanas de microservicios en P10" />}
        </div>
        <div className="capa-1 s-lista">
          {ps.length === 0
            ? <Fila icono="grafico" titulo="Fin del plan (T+18)" valor={`${fechaCorta(t18)} ${t18.slice(0, 4)}`} />
            : (
              <FilaHoja icono="grafico" titulo="Semanas extra por feature" tituloHoja="Semanas extra" valor={`${sumadas} de ${ps.reduce((s, t) => s + (t.extraPosible ?? 0), 0)}`}>
                <p className="t-nota">T+18 el {fechaCorta(t18)} {t18.slice(0, 4)}. Apagar una acorta el proyecto y corre todo lo que sigue.</p>
                <div className="capa-1 ax-interruptores">
                  {ps.map((t) => <Interruptor key={t.id} prendido={(t.extra ?? 0) > 0} onCambio={(v) => setExtraBloque(t.id, v)} etiqueta={`${t.id} ${t.nombre}${t.version ? ` ${t.version}` : ''}`} nota={`+${t.extraPosible} sem`} />)}
                </div>
              </FilaHoja>
            )}
          {hp && (
            <FilaHoja icono="codigo" titulo="Horas extra de PetrIA" tituloHoja="Horas extra de PetrIA" valor={`${n1(hp.semana)} de ${hp.meta} h`}>
              <p className="t-nota">Hasta el trabajo nuevo PetrIA va a ~8 h por día ({hp.meta} h por semana). La rutina da {n1(hp.semana)} h{hp.falta > 0 ? `: faltan ${n1(hp.falta)} h por semana.` : ', así que alcanza.'} Elegí qué bloques pasan a proyecto; nunca salen del sueño, el entreno ni Abi.</p>
              <div className="capa-1 ax-interruptores">
                {convertiblesIntensiva().map((b) => <Interruptor key={b.id} prendido={elegidos.includes(b.id)} onCambio={() => cambiarExtra(b.id)} etiqueta={`${b.label} pasa a proyecto`} nota={`${b.dias} · ${durTxt(b.minSemana)} por semana`} />)}
              </div>
            </FilaHoja>
          )}
        </div>
      </Grupo>

      <Grupo titulo="Bloques pendientes">
        <div className="capa-1 s-lista">{OBJETIVOS_PENDIENTES.map((o) => <Pendiente key={o} o={o} />)}</div>
      </Grupo>

      <Grupo titulo="Handyx">
        <div className="capa-1 s-lista">
          <FilaHoja icono="meta" titulo="Umbrales para decidir" tituloHoja="Umbrales de Handyx" valor={cfg.umbralIngreso || cfg.horasMaximas ? 'Cargados' : 'Sin cargar'}>
            <p className="t-nota">Para decidir el {fechaCorta(fechaDecision)} {fechaDecision.slice(0, 4)}. Los escribís vos: Trazo no inventa números.</p>
            <CampoAlSalir etiqueta="Ingreso mínimo por mes" valor={cfg.umbralIngreso} placeholder="[tu umbral de ingreso]" guardar={(v) => setPlanSettings({ umbralIngreso: v })} />
            <CampoAlSalir etiqueta="Horas máximas por semana" valor={cfg.horasMaximas} placeholder="[horas máximas]" guardar={(v) => setPlanSettings({ horasMaximas: v })} />
          </FilaHoja>
        </div>
      </Grupo>

      <div className="capa-1 s-lista">
        <Fila titulo="Colores de las ramas" onClick={() => setColores(true)} extremo={<span className="ax-puntos" aria-hidden="true">{RAMAS.map((r) => <i key={r} className="area-punto" style={{ ['--area' as string]: colorV2(RAMA_COLOR[r]) }} />)}</span>} />
      </div>

      <Hoja abierta={libre} onCerrar={() => setLibre(false)} titulo="Día libre">
        {intensiva ? (
          <p className="t-cuerpo">Ninguno mientras dure la búsqueda intensiva; {(DIAS_LIBRE.find(([v]) => v === (cfg.previo?.diaLibre ?? null))?.[1] ?? 'Ninguno').toLowerCase()} queda guardado.</p>
        ) : (
          <div role="radiogroup" aria-label="Día libre">
            <p className="t-nota">Solo repasos de 20 min y entreno suave.</p>
            {DIAS_LIBRE.map(([v, n]) => (
              <button key={n} type="button" role="radio" aria-checked={(cfg.diaLibre ?? null) === v} className="k-opcion" onClick={() => { setPlanSettings({ diaLibre: v }); setLibre(false); }}>
                <span><b>{n}</b></span>{(cfg.diaLibre ?? null) === v && <Icono nombre="tilde" lado={20} />}
              </button>
            ))}
          </div>
        )}
      </Hoja>
      <Hoja abierta={colores} onCerrar={() => setColores(false)} titulo="Colores de las ramas">
        <ul className="capa-1 ax-ramas-lista">{RAMAS.map((r) => <li key={r} className="t-cuerpo"><i className="area-punto" style={{ ['--area' as string]: colorV2(RAMA_COLOR[r]) }} />{RAMA_NOMBRE[r]}</li>)}</ul>
        <p className="t-nota">Cada rama tiene su color en Hoy, Plan y el mapa; Trazo va en tinta.</p>
      </Hoja>
    </Marco>
  );
}
