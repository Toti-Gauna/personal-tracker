/**
 * Trazo 2.0 · Entreno (#/entreno): lo que toca hoy con la figura del cuerpo encendida en lo que trabaja esa sesión; la semana;
 * el volumen de la semana como calor sobre el cuerpo (series hechas contra las planeadas, músculo por músculo); correr; y las
 * otras rutinas. Editar una rutina y cambiar qué va cada día siguen en la 1.0 hasta su tanda.
 */
import { useEffect, useMemo, useState } from 'react';
import { T0_PLAN } from '../../data/plan';
import { debePreguntarPeso, fmtH, fmtKg, fmtPace, pasaDelLimite, plannedFor, restLabel, rirLabel, RUN_LABEL, runOn, runWeek, setsLabel, stepsMin, totalMin, trainingMin, volume, warmMin, weightAt, sessionsInWeek } from '../../data/train';
import { RULES } from '../../data/train-catalog';
import type { Routine, Run } from '../../data/train-types';
import { ir } from '../../lib/routes';
import { useStore } from '../../state/store';
import { addRun, cancelTraining, deleteRun, guardarEntrenoViejo, reabrirEntreno, startTraining } from '../../state/train';
import { abrirCorrida, abrirPeso } from '../../ui/checkins';
import { Barras } from '../estudio/Barras';
import { aviso, confirmar } from '../kit/capas';
import { Ilustracion } from '../iconos';
import { Boton, Chip } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Barra, Dato, Estado, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { Cuerpo, enPalabras } from './Cuerpo';
import { ejerciciosDe, fmtSeries, nombreCorto, semanaDe, volumenSemana } from './datos';
import { MUSCULOS, NOMBRE, calor, luzDeRutina, type Musculo } from './musculos';
import '../proyecto/proyecto.css';
import './entreno.css';
import { cuantos } from '../reglas';

const INFO = (
  <>
    <p className="t-cuerpo-l">Lo que toca hoy, y cómo viene la semana.</p>
    <p className="t-cuerpo">La figura muestra qué músculos trabaja la sesión de hoy: lleno, el principal de cada ejercicio; a media luz, los que acompañan. Cuando terminás, se pinta de amarillo.</p>
    <p className="t-cuerpo">El volumen de la semana cuenta series por músculo: una por serie en el principal y media en los que acompañan. Cada músculo se va encendiendo a medida que llegás a lo planeado.</p>
  </>
);
const fmtFechaCorta = (d: string) => `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;

export default function EntrenoV2({ day }: PropsV2) {
  const t = useStore((s) => s.train);
  const settings = useStore((s) => s.settings)!;
  const date = day.date;
  const t0 = settings.startDate || T0_PLAN;
  const [pareja, setPareja] = useState(true);
  const [musculo, setMusculo] = useState<Musculo | null>(null);
  const [todos, setTodos] = useState(false);
  const hoy = plannedFor(t, date, t0);
  const dias = useMemo(() => semanaDe(t, date, t0), [t, date, t0]);
  const vol = useMemo(() => volumenSemana(t, date, t0), [t, date, t0]);
  const rutinasSemana = dias.map((d) => d.rutina).filter((r): r is Routine => !!r);
  const sesionHoy = [...t.sessions].reverse().find((s) => s.date === date);
  const enCurso = t.active?.date === date ? t.active : null;
  // Un entreno que quedó abierto de otro día no se esconde ni se pisa: primero se guarda o se descarta.
  const abierto = t.active && t.active.date !== date ? t.active : null;
  const nombreAbierto = abierto ? t.routines.find((x) => x.id === abierto.routineId)?.name ?? 'El entreno' : '';
  const guardarAbierto = () => { const id = guardarEntrenoViejo(); if (id) ir(`entreno-resumen/${id}`); };
  const descartarAbierto = async () => {
    if (!abierto) return;
    const copia = abierto;
    if (!(await confirmar({ titulo: `¿Descartar ${nombreAbierto}?`, texto: `${cuantos(copia.sets.length, 'serie cargada', 'series cargadas')} del ${fmtFechaCorta(copia.date)} no se guardan.`, accion: 'Descartar', peligro: true }))) return;
    cancelTraining();
    aviso({ titulo: 'Entreno descartado', sub: `${nombreAbierto} del ${fmtFechaCorta(copia.date)}`, deshacer: () => reabrirEntreno(copia) });
  };
  const peso = weightAt(t.weights, date);
  const kgSemana = volume(sessionsInWeek(t, date).flatMap((s) => s.sets), 'me');
  const partner = settings.names.partner;
  const otras = t.routines.filter((r) => r.id !== hoy.routine?.id && !r.archivada);
  const corrHoy = runOn(t.runs, date);
  const corrSem = runWeek(t.runs, date);
  const ultimas = [...t.runs].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);

  // La primera vez que entrás a Entreno en el día, pregunta el peso (una sola vez; en la 2.0 es un aviso, no una hoja).
  useEffect(() => {
    if (debePreguntarPeso(t, date)) abrirPeso(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const filas = MUSCULOS.filter((m) => (vol.plan[m] ?? 0) > 0 || (vol.hecho[m] ?? 0) > 0).sort((a, b) => (vol.plan[b] ?? 0) - (vol.plan[a] ?? 0));
  const visibles = todos ? filas : filas.slice(0, 5);
  const r = hoy.routine;
  const borrarCorrida = (run: Run) => { deleteRun(run.date); aviso({ titulo: 'Corrida borrada', sub: `${fmtFechaCorta(run.date)} · ${run.min} min`, deshacer: () => addRun(run) }); };

  return (
    <Marco className="en" titulo="Entreno" info={INFO}>
      {abierto && (
        <div className="capa-1 en-abierto" role="status">
          <p className="t-cuerpo"><b>{nombreAbierto} quedó abierto</b> desde el {fmtFechaCorta(abierto.date)} · {cuantos(abierto.sets.length, 'serie', 'series')}.</p>
          <div className="en-abierto-acciones">
            <Boton variante="primario" tamano="s" icono="tilde" onClick={guardarAbierto}>Guardarlo</Boton>
            <Boton variante="secundario" tamano="s" href={`#/entreno-sesion/${abierto.routineId}`}>Seguirlo</Boton>
            <Boton variante="fantasma" tamano="s" onClick={() => { void descartarAbierto(); }}>Descartar</Boton>
          </div>
        </div>
      )}
      <Tarjeta heroe className="en-hoy" area="var(--a-salud)" etiqueta="Entreno de hoy">
        {r ? (
          <>
            <div className="en-hoy-cab">
              <span className="t-rotulo">{sesionHoy && !enCurso ? 'Hoy, hecho' : 'Hoy toca'}</span>
              {sesionHoy && !enCurso && <Estado estado="hecho" />}
            </div>
            <h2 className="t-titulo en-hoy-titulo">{r.name}</h2>
            {r.slot && r.desc && <p className="t-nota en-hoy-enfoque">{r.desc}</p>}
            <Cuerpo luz={luzDeRutina(r)} tono={sesionHoy && !enCurso ? 'hecho' : 'plan'} nombre={`${r.name} trabaja ${enPalabras(luzDeRutina(r))}.`} alto={216} />
            <p className="t-dato en-hoy-dato">{fmtH(totalMin(r))} · {cuantos(r.exercises.length, 'ejercicio', 'ejercicios')}</p>
            {pasaDelLimite(r) && <p className="t-nota" role="status">Lleva unos {fmtH(trainingMin(r))} y el bloque es de {fmtH(RULES.limiteMin)}: algo va a quedar para la próxima.</p>}
            {sesionHoy && !enCurso ? (
              <Boton variante="secundario" icono="siguiente" ancho href={`#/entreno-resumen/${sesionHoy.id}`}>Ver el resumen</Boton>
            ) : (
              <div className="en-hoy-acciones">
                {!enCurso && <Chip activo={pareja} onCambio={setPareja} icono="companera">{`Con ${partner}`}</Chip>}
                <Boton variante="primario" icono="play" ancho deshabilitado={abierto ? `Antes, guardá o descartá ${nombreAbierto} del ${fmtFechaCorta(abierto.date)}.` : false}
                  onClick={() => { if (!enCurso) startTraining(r.id, date, pareja); ir(`entreno-sesion/${r.id}`); }}>{enCurso ? `Volver a ${r.name}` : `Empezar ${r.name}`}</Boton>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="t-rotulo">Hoy</span>
            <div className="en-hoy-libre">
              <Ilustracion nombre={hoy.rest ? 'descanso' : 'entreno'} />
              <div>
                <h2 className="t-titulo en-hoy-titulo">{hoy.rest ? 'Descanso activo' : hoy.libre ? 'Día libre' : 'Sin entreno'}</h2>
                <p className="t-cuerpo">{hoy.rest ? 'Caminar 45 minutos. Hoy no se levanta.' : hoy.libre ? 'Hoy no toca entrenar.' : 'No hay entreno planeado para hoy.'}</p>
              </div>
            </div>
            {!hoy.rest && <Boton variante="secundario" icono="calendario" href="#/entreno-semana">Cambiar la semana</Boton>}
          </>
        )}
      </Tarjeta>
      {r && (
        <div className="capa-1 s-lista en-detalle">
          <FilaHoja icono="documento" titulo="La sesión, paso a paso" valor={`${r.exercises.length}`} tituloHoja={r.name}>
            <ol className="capa-1 pt-revs">
              <li><span className="t-rotulo">Antes · {stepsMin(r.before)} min</span><span className="t-cuerpo">{r.before.map((s) => s.name).join(' + ')}</span></li>
              {!!r.calentamiento?.length && <li><span className="t-rotulo">Calentamiento · {warmMin(r)} min</span><span className="t-cuerpo">{r.calentamiento.map((w) => w.name).join(' + ')}</span></li>}
              {r.exercises.map((e) => <li key={e.id}><span className="t-encabezado">{e.name}</span><span className="t-dato">{setsLabel(e)}{rirLabel(e) ? ` · ${rirLabel(e)}` : ''} · {restLabel(e.rest)}</span></li>)}
              <li><span className="t-rotulo">Después · {stepsMin(r.after)} min</span><span className="t-cuerpo">{r.after.map((s) => s.name).join(' + ')}</span></li>
            </ol>
            {r.estiramiento && <p className="t-nota pt-pie">Los estiramientos van de 21:00 a 22:00, con {r.estiramiento.musculos}.</p>}
          </FilaHoja>
        </div>
      )}

      <ol className="en-semana" aria-label="Semana de entreno" data-grafico>
        {dias.map((d) => (
          <li key={d.fecha} className={`${d.hoy ? 'es-hoy' : ''}${d.hecho ? ' hecho' : ''}`} aria-current={d.hoy ? 'date' : undefined} aria-label={`${d.letra}: ${d.rutina ? d.rutina.name : d.descanso ? 'descanso' : 'libre'}${d.hecho ? ', hecho' : ''}`}>
            <span className="t-rotulo">{d.letra}</span>
            <b>{d.rutina ? nombreCorto(d.rutina) : d.descanso ? 'Camina' : '—'}</b>
            <i />
          </li>
        ))}
      </ol>

      <Grupo titulo="Volumen de la semana" extremo={<span className="t-rotulo">{vol.sesiones} de {vol.planeadas} sesiones</span>}>
        <div className="capa-1 en-volumen">
          <Cuerpo luz={calor(vol.hecho, vol.plan)} tono="hecho" nombre={`Esta semana trabajaste ${enPalabras(vol.hecho)}.`} alto={176} onTocar={setMusculo} />
          <ul className="en-musculos">
            {visibles.map((m) => (
              <li key={m}>
                <button type="button" onClick={() => setMusculo(m)} aria-label={`${NOMBRE[m]}: ${fmtSeries(vol.hecho[m] ?? 0)} de ${fmtSeries(vol.plan[m] ?? 0)} series`}>
                  <span className="en-musculo-cab"><b className="t-cuerpo">{NOMBRE[m]}</b>{' '}<span className="t-dato">{fmtSeries(vol.hecho[m] ?? 0)} de {fmtSeries(vol.plan[m] ?? 0)}</span></span>
                  {/* Dentro del botón la barra es dibujo: la cifra de al lado ya lo dice. */}
                  <span aria-hidden="true"><Barra valor={vol.hecho[m] ?? 0} max={Math.max(vol.plan[m] ?? 0, vol.hecho[m] ?? 0, 1)} nombre={`${NOMBRE[m]}: series hechas`} area="var(--trazo)" /></span>
                </button>
              </li>
            ))}
          </ul>
          {filas.length > 5 && <Boton tamano="s" variante="fantasma" icono={todos ? 'arriba' : 'abajo'} onClick={() => setTodos(!todos)}>{todos ? 'Ver menos' : `Ver los ${filas.length}`}</Boton>}
        </div>
        <div className="en-numeros">
          <Dato valor={`${vol.sesiones}/${vol.planeadas}`} etiqueta="Sesiones" />
          <Dato valor={peso ? fmtKg(peso.kg) : '—'} unidad={peso ? 'kg' : undefined} etiqueta="Peso" />
          <Dato valor={fmtKg(Math.round(kgSemana / 100) / 10)} unidad="t" etiqueta="Movidas" />
        </div>
      </Grupo>

      <Grupo titulo="Correr" extremo={<span className="t-rotulo">{corrSem.n ? `${corrSem.n} esta semana · ${corrSem.min} min` : 'Ninguna esta semana'}</span>}>
        {ultimas.length > 0 && <div className="capa-1 en-grafico"><Barras alto={72} barras={ultimas.map((x) => ({ etiqueta: fmtFechaCorta(x.date), valor: x.min, hoy: x.date === date, texto: `${x.min}’` }))} nombre={`Minutos de las últimas ${ultimas.length} corridas: ${ultimas.map((x) => `${fmtFechaCorta(x.date)} ${x.min} min`).join(', ')}`} /></div>}
        <div className="pt-acciones">
          <Boton variante="secundario" icono="mas" onClick={() => abrirCorrida(date)}>{corrHoy ? 'Corregir la de hoy' : 'Registrar corrida'}</Boton>
        </div>
        {t.runs.length > 0 && (
          <div className="capa-1 s-lista en-detalle">
            <FilaHoja icono="calendario" titulo="Últimas corridas" valor={String(t.runs.length)}>
              <ul className="capa-1 pt-revs">
                {[...t.runs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((x) => (
                  <li key={x.date} className="en-corrida">
                    <span className="t-rotulo">{fmtFechaCorta(x.date)} · {RUN_LABEL[x.kind]} · {x.feel}/5</span>
                    <span className="t-cuerpo">{x.min} min{x.km ? ` · ${String(x.km).replace('.', ',')} km` : ''}{fmtPace(x.min, x.km) ? ` · ${fmtPace(x.min, x.km)} /km` : ''}</span>
                    <Boton tamano="s" variante="fantasma" icono="borrar" onClick={() => borrarCorrida(x)}>Borrar</Boton>
                  </li>
                ))}
              </ul>
            </FilaHoja>
          </div>
        )}
      </Grupo>

      <Grupo titulo="Rutinas">
        <div className="capa-1 s-lista">
          {otras.map((x) => <Fila key={x.id} titulo={x.name} nota={x.desc} valor={`${x.exercises.length} ej.`} href={`#/entreno-rutina/${x.id}`} />)}
        </div>
      </Grupo>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <Fila icono="calendario" titulo="Cambiar la semana" nota="Qué entreno va cada día" href="#/entreno-semana" />
          <Fila icono="peso" titulo="Peso" nota="La curva y la meta" href="#/entreno-peso" />
          <Fila icono="ritmo" titulo="Motor de entreno" nota="Cuánto levantar cada vez" href="#/entreno-motor" />
        </div>
      </Grupo>

      <HojaMusculo m={musculo} hecho={musculo ? vol.hecho[musculo] ?? 0 : 0} plan={musculo ? vol.plan[musculo] ?? 0 : 0} rutinas={rutinasSemana} onCerrar={() => setMusculo(null)} />
    </Marco>
  );
}

/** Un músculo: cuántas series lleva esta semana y qué ejercicios se las dan. */
function HojaMusculo({ m, hecho, plan, rutinas, onCerrar }: { m: Musculo | null; hecho: number; plan: number; rutinas: Routine[]; onCerrar: () => void }) {
  const [ultimo, setUltimo] = useState<{ m: Musculo; hecho: number; plan: number } | null>(null);
  if (m && (ultimo?.m !== m || ultimo.hecho !== hecho || ultimo.plan !== plan)) setUltimo({ m, hecho, plan });
  const x = m ? { m, hecho, plan } : ultimo;
  if (!x) return null;
  const ejercicios = ejerciciosDe(x.m, rutinas);
  return (
    <Hoja abierta={!!m} onCerrar={onCerrar} titulo={NOMBRE[x.m]}>
      <div className="pt-version">
        <p className="t-cuerpo-l">{fmtSeries(x.hecho)} de {fmtSeries(x.plan)} series esta semana.</p>
        <Barra valor={x.hecho} max={Math.max(x.plan, x.hecho, 1)} nombre={`${NOMBRE[x.m]}: series hechas de las planeadas`} area="var(--trazo)" />
        {ejercicios.length > 0 ? (
          <ul className="capa-1 pt-revs">
            {ejercicios.map((e) => <li key={e.id}><span className="t-rotulo">{e.rutina} · {e.principal ? 'principal' : 'acompaña'}</span><span className="t-cuerpo">{e.nombre}</span><span className="t-dato">{cuantos(e.series, 'serie', 'series')}</span></li>)}
          </ul>
        ) : <p className="t-nota">Esta semana no hay ejercicios planeados para este músculo.</p>}
        <p className="t-nota">Cada serie cuenta 1 en el músculo principal del ejercicio y media en los que acompañan.</p>
      </div>
    </Hoja>
  );
}
