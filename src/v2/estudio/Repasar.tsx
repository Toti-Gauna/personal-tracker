/**
 * Trazo 2.0 · Repasar: el repaso de hoy (#/repaso) y los puntos débiles (#/flojo) como un solo lugar con dos pestañas. El repaso
 * muestra cuánto del tope se usa, las tarjetas, lo que hay que releer y repetir, lo que hoy no toca y el pronóstico de la
 * semana. Los puntos débiles, lo más flojo con qué falla y cuánto lleva arreglarlo.
 */
import { useState, type ReactNode } from 'react';
import { AREAS } from '../../data/defaults';
import { BANDA_COLOR, banda, leeches, ranking, recallDeLaSemana, refuerzo, temas } from '../../data/debiles';
import { forecast, unitShort, weekday } from '../../data/study';
import { fmtDur, fmtFecha } from '../../data/time';
import type { Tramo } from '../../data/study-types';
import type { StudyState } from '../../data/study-types';
import { getState, useStore } from '../../state/store';
import { completeExercises, setRules } from '../../state/study';
import { startStudy } from '../../ui/estudio-acciones';
import { useStudyPlan } from '../../ui/useStudy';
import { colorV2 } from '../hoy/datos';
import { aviso } from '../kit/capas';
import { Boton, Interruptor } from '../kit/controles';
import { Anillo, Barra, Dato, Fila, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { Barras } from './Barras';
import '../proyecto/proyecto.css';
import './estudio.css';

const DIA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export function Lentes({ actual }: { actual: 'hoy' | 'flojo' }) {
  return (
    <nav className="es-lentes" aria-label="Qué repasar">
      <a href="#/repaso" aria-current={actual === 'hoy' ? 'page' : undefined} data-transicion="fundido">Hoy</a>
      <a href="#/flojo" aria-current={actual === 'flojo' ? 'page' : undefined} data-transicion="fundido">Puntos débiles</a>
    </nav>
  );
}

const INFO_REPASO = (
  <>
    <p className="t-cuerpo-l">Solo lo que vence hoy. Lo que ya sabés quedó afuera.</p>
    <p className="t-cuerpo">El tope diario cuida que repasar no te coma el día: lo que no entra vuelve mañana, empezando por lo que menos sabés.</p>
    <p className="t-cuerpo">Con tarjetas respondés antes de darlas vuelta. En "Repetir" cargás cuántos ejercicios salieron bien de 5.</p>
  </>
);

export function RepasoV2({ day, hoy }: { day: PropsV2['day']; hoy: string }) {
  const study = useStore((s) => s.study);
  const plan = useStudyPlan(day);
  const { daily } = plan;
  const cap = study.rules.cap;
  const contenido = plan.contenidos.find((c) => c.id === 'repaso');
  const colorOf = (frontId?: string) => colorV2(AREAS[study.fronts.find((f) => f.id === frontId)?.color ?? 'ing'].css);
  const frontOfAct = (id: string) => study.activities.find((a) => a.id === id)?.front;
  const releer = daily.today.filter((r) => r.kind === 'releer');
  const ejercicios = daily.today.filter((r) => r.kind === 'ejercicios' || r.kind === 'examen');
  const cardsN = daily.groups.reduce((s, g) => s + g.cards.length, 0);
  const cardsMin = daily.groups.reduce((s, g) => s + g.min, 0);
  const done = (ref: string) => (day.studyDone ?? []).includes(ref);
  const fc = forecast(study, hoy);
  const proxEj = study.reviews.filter((r) => (r.kind === 'ejercicios' || r.kind === 'examen') && !r.doneOn && r.due > hoy).sort((a, b) => a.due.localeCompare(b.due))[0];
  const actOf = (id: string) => study.activities.find((a) => a.id === id);
  const corto = (r: { activityId: string; unit?: number; label: string }) => { const a = actOf(r.activityId); return a && r.unit != null ? unitShort(a, r.unit).toLowerCase() : r.label.replace(/^[^·]+ · /, ''); };
  const aparte = [...daily.cold.filter((r) => !r.doneOn && r.unit != null).map((r) => `el cold recall y el test del ${corto(r)}`), ...daily.tesis.filter((r) => !r.doneOn).map((r) => `la tesis del ${corto(r)}`)];

  return (
    <Marco className="es" titulo="Repasar" info={INFO_REPASO} volver={{ href: '#/estudio', nombre: 'Estudio' }}>
      <Lentes actual="hoy" />
      <div className="capa-2 es-tope">
        <Anillo valor={Math.min(1, daily.min / cap)} tamano={92} grosor={9} etiqueta={`${daily.min}`} sub="min" area="var(--a-economia)" nombre={`${daily.min} de ${cap} minutos del tope`} />
        <div className="es-tope-texto">
          <b className="t-titulo">{daily.min ? `${daily.min} min` : 'Nada hoy'}</b>
          <span className="t-nota">{daily.min ? `Tope de ${cap} min` : 'Hoy no vence nada'}</span>
        </div>
      </div>
      {contenido && contenido.falta > 0 && <Boton variante="primario" icono="play" ancho onClick={() => startStudy(hoy, 'repaso', contenido.blockKey, contenido.tramos)}>Empezar · {fmtDur(contenido.total)}</Boton>}
      {aparte.length > 0 && <p className="t-nota es-pie">{aparte.length > 3 ? `${aparte.slice(0, 2).join(', ')} y ${aparte.length - 2} más` : aparte.join(', ')} van en tu sesión, fuera del tope.</p>}

      {daily.groups.length > 0 && (
        <Grupo titulo="Tarjetas" extremo={<span className="t-rotulo">{cardsN} · {cardsMin} min</span>}>
          <div className="capa-1 s-lista">
            {daily.groups.map((g) => <Fila key={g.frontId} area={colorOf(g.frontId)} titulo={g.name} nota={g.pending.length === g.cards.length ? `${g.cards.length} tarjetas` : g.pending.length ? `${g.pending.length} de ${g.cards.length} tarjetas` : `${g.cards.length} hechas`} valor={`${g.min} min`} href={`#/tarjetas/${g.frontId}`} />)}
          </div>
        </Grupo>
      )}
      {releer.length > 0 && (
        <Grupo titulo="Releer" extremo={<span className="t-rotulo">{releer.reduce((s, r) => s + r.min, 0)} min</span>}>
          <div className="capa-1 s-lista">
            {releer.map((r) => {
              const hecho = done(`rev:${r.id}`);
              return <Fila key={r.id} area={colorOf(frontOfAct(r.activityId))} titulo={r.label.replace(/^[^·]+ · /, '')} nota={hecho ? 'Hecho' : r.label.split(' · ')[0]} extremo={hecho ? undefined : <Boton tamano="s" variante="secundario" icono="tilde" onClick={() => completeExercises(day.date, r.id, false)}>Hecho</Boton>} />;
            })}
          </div>
        </Grupo>
      )}
      {ejercicios.length > 0 && (
        <Grupo titulo="Repetir" extremo={<span className="t-rotulo">{ejercicios.reduce((s, r) => s + r.min, 0)} min</span>}>
          <div className="capa-1 pt-check">
            {ejercicios.map((r) => {
              const hecho = done(`rev:${r.id}`);
              return (
                <div key={r.id} className="es-repetir">
                  <div className="es-repetir-cab"><i className="area-punto" style={{ ['--area' as string]: colorOf(frontOfAct(r.activityId)) }} /><b className="t-encabezado">{r.label}</b></div>
                  {hecho ? <p className="t-nota">{r.perfect ? 'Perfecto' : 'Hecho'}</p> : (
                    <>
                      <p className="t-nota">{r.min} min · cuántos salieron bien</p>
                      <div className="es-bien" role="group" aria-label="Cuántos bien de 5">
                        {[0, 1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} bien de 5`} onClick={() => completeExercises(day.date, r.id, n === 5, [n, 5])}>{n}</button>)}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Grupo>
      )}

      <Grupo titulo="Los próximos días" extremo={<span className="t-rotulo">Tope {cap}</span>}>
        <div className="capa-1 es-grafico"><Barras barras={fc.map((f, i) => ({ etiqueta: i === 0 ? 'Hoy' : DIA[weekday(f.date) === 6 ? 0 : weekday(f.date) + 1], valor: f.min, hoy: i === 0, texto: f.min ? `${f.min}’` : '—' }))} meta={cap} nombre={`Minutos de repaso: ${fc.map((f, i) => `${i ? DIA[weekday(f.date) === 6 ? 0 : weekday(f.date) + 1] : 'Hoy'} ${f.min}`).join(', ')}; tope ${cap}`} /></div>
      </Grupo>

      {(daily.skipped.length > 0 || daily.skippedCards > 0 || !ejercicios.length) && (
        <Grupo titulo="Hoy no toca">
          <div className="capa-1 s-lista">
            {daily.skipped.map((r) => <Fila key={r.id} titulo={r.label} nota={`No entró en el tope de ${cap} min`} valor="mañana" />)}
            {daily.skippedCards > 0 && <Fila titulo={`${daily.skippedCards} tarjetas`} nota="Las menos olvidadas esperan" valor="mañana" />}
            {!ejercicios.length && <Fila titulo="Repetir" nota="Ningún capítulo cumple el día 8, 22 o 61" valor={proxEj ? `${corto(proxEj)} · ${fmtFecha(proxEj.due).split(' ')[0].toLowerCase()}` : '—'} />}
          </div>
        </Grupo>
      )}
      {daily.min === 0 && daily.groups.length === 0 && <Vacio ilustracion="repaso" titulo="Hoy no hay repaso" texto="Cuando algo venza, va a aparecer acá." />}
    </Marco>
  );
}

// ——— Puntos débiles ———

const INFO_FLOJO = (
  <>
    <p className="t-cuerpo-l">Lo que más se te olvida, según tus cold recalls, tus tarjetas y tus tests.</p>
    <p className="t-cuerpo">Cada tema tiene una fuerza de 0 a 100: rojo por debajo de 70, amarillo hasta 85, verde de ahí para arriba.</p>
    <p className="t-cuerpo">Con "Priorizar lo flojo", si vence más de lo que entra en el tope, entran primero los temas flojos.</p>
  </>
);

/** Los tramos del refuerzo de hoy, para la sesión de estudio (mismos que la 1.0). */
export function tramosRefuerzo(st: StudyState): Tramo[] {
  return refuerzo(st).pasos.map(({ tema, paso }, i) => ({
    step: 'repetir',
    kind: paso.kind === 'tarjetas' ? 'tarjetas' : paso.kind === 'releer' ? 'releer' : 'ejercicios',
    title: `${tema.corto[0].toUpperCase()}${tema.corto.slice(1)} · ${paso.texto[0].toLowerCase()}${paso.texto.slice(1)}`,
    sub: `Refuerzo · ${tema.nombre}`,
    min: paso.min,
    ref: paso.kind === 'tarjetas' ? `cards:${tema.frontId}` : `fix:${tema.id}:${i}`,
    activityId: tema.activity?.id ?? 'repaso',
  }));
}

const FUENTES = (f: { cold?: number | null; tarjetas?: number | null; test?: number | null }) => [f.cold != null && `recall ${f.cold} %`, f.tarjetas != null && `tarjetas ${f.tarjetas} %`, f.test != null && `test ${f.test} %`].filter(Boolean).join(' · ');

export function FlojoV2({ day, hoy, filtro }: { day: PropsV2['day']; hoy: string; filtro?: string }) {
  const st = useStore((s) => s.study);
  const ts = temas(st);
  const flojos = ts.filter((t) => t.fuerza != null && t.fuerza < 70).length;
  const recall = recallDeLaSemana(st, hoy);
  const sang = leeches(st.cards, st.log);
  const r = ranking(st, 6);
  const ref = refuerzo(st);
  void day;
  const cabeza: ReactNode = (
    <nav className="es-filtros" aria-label="Qué mirar">
      <a href="#/flojo" aria-current={!filtro ? 'page' : undefined}>Todo</a>
      <a href="#/flojo/recall" aria-current={filtro === 'recall' ? 'page' : undefined}>Recall</a>
      <a href="#/flojo/examenes">Exámenes</a>
    </nav>
  );
  return (
    <Marco className="es" titulo="Puntos débiles" info={INFO_FLOJO} volver={{ href: '#/estudio', nombre: 'Estudio' }}>
      <Lentes actual="flojo" />
      {cabeza}
      <div className="es-numeros es-numeros-arriba">
        <Dato valor={flojos} etiqueta={flojos === 1 ? 'Tema flojo' : 'Temas flojos'} />
        <Dato valor={recall == null ? '—' : `${recall} %`} etiqueta="Recall semanal" />
        <Dato valor={sang.length} etiqueta={sang.length === 1 ? 'Sanguijuela' : 'Sanguijuelas'} />
      </div>

      <Grupo titulo="Lo más flojo" extremo={<span className="t-rotulo">Fuerza 0 a 100</span>}>
        {r.length === 0
          ? <Vacio ilustracion="datos" titulo="Todavía no hay temas flojos" />
          : (
            <ol className="capa-1 es-rank">
              {r.map((t) => {
                const c = colorV2(BANDA_COLOR[banda(t.fuerza!)]);
                return (
                  <li key={t.id}>
                    <a href={`#/flojo/${encodeURIComponent(t.id)}`}>
                      <span className="es-rank-cab"><b className="t-encabezado">{t.nombre}</b><span className="t-dato" style={{ color: c }}>{t.fuerza}</span></span>
                      <Barra valor={t.fuerza!} max={100} nombre={`Fuerza ${t.fuerza} de 100`} area={c} />
                      <span className="t-nota">Falla: {t.falla}. Arreglarlo lleva {t.min} min.</span>
                      {FUENTES(t.fuentes) && <span className="t-nota es-rank-fuentes">{FUENTES(t.fuentes)}</span>}
                    </a>
                  </li>
                );
              })}
            </ol>
          )}
      </Grupo>

      <Grupo titulo="Refuerzo">
        <div className="capa-1 pt-check">
          <Interruptor prendido={st.rules.priorizarFlojo} etiqueta="Priorizar lo flojo" nota="Primero entran los de menos de 70 %" onCambio={(v) => setRules({ priorizarFlojo: v })} />
        </div>
        <div className="pt-acciones">
          <Boton variante="primario" icono="play" deshabilitado={!ref.min} onClick={() => { const t = tramosRefuerzo(getState().study); if (!t.length) return aviso({ titulo: 'Nada para reforzar hoy', sub: 'No hay temas flojos', tono: 'hecho' }); startStudy(hoy, 'refuerzo', 'math', t); }}>Refuerzo de hoy · {ref.min} min</Boton>
        </div>
      </Grupo>

      {sang.length > 0 && (
        <Grupo titulo="Tarjetas sanguijuela" extremo={<span className="t-rotulo">{sang.length}</span>}>
          <div className="capa-1 s-lista">
            {sang.slice(0, 5).map((x) => <Fila key={x.card.id} titulo={x.card.front} nota={`Fallaste ${x.fallos} veces`} />)}
          </div>
          <p className="t-nota es-pie">Reescribilas al repasarlas: en la tarjeta, "Editar".</p>
        </Grupo>
      )}

      <div className="capa-1 s-lista">
        <Fila icono="grafico" titulo="Mapa y análisis" nota="Por capítulo, cómo fallás, calibración" href="#/flojo/analisis" />
        <Fila icono="tarjetas" titulo="Exámenes y simulacro" href="#/flojo/examenes" />
      </div>
    </Marco>
  );
}
