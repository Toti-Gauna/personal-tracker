/**
 * Trazo 2.0 · Estudio (#/estudio): lo de hoy arriba (cuánto falta y un botón para entrar en foco), tus caminos como líneas de
 * metro (matemática, idiomas, programación y el libro en curso), lo que toca hoy paso por paso, la semana, y el repaso con su
 * pronóstico y los temas flojos. Lo demás (el detalle de cada camino) sigue en la 1.0 hasta su tanda.
 */
import { useState } from 'react';
import { AREAS } from '../../data/defaults';
import { BANDA_COLOR, banda, qFalla, ranking } from '../../data/debiles';
import { ESTADO_LIBRO, estadoLibro, libroPorId } from '../../data/libros';
import { KIND_LABEL, STEP_LABEL, forecast, weekday } from '../../data/study';
import { addDays, fmtDur } from '../../data/time';
import { ir } from '../../lib/routes';
import { useStore } from '../../state/store';
import { startStudy } from '../../ui/estudio-acciones';
import { useStudyPlan } from '../../ui/useStudy';
import { barras as barrasDe } from '../../ui/barras-estudio';
import { colorV2 } from '../hoy/datos';
import { Boton, Casilla, Chip } from '../kit/controles';
import { Anillo, Dato, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { tocarPaso } from './acciones';
import { Barras } from './Barras';
import { useLineas } from './lineas';
import { LibroV2, MateV2 } from './Matematica';
import { Metro } from './Metro';
import '../proyecto/proyecto.css';
import './estudio.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">Todo lo que estudiás, en un solo lugar.</p>
    <p className="t-cuerpo">Arriba, lo de hoy: cuánto falta y un botón para entrar en foco. Cada camino (matemática, idiomas, programación) es una línea de metro: lo recorrido va en amarillo y la estación grande es donde estás.</p>
    <p className="t-cuerpo">Más abajo, los pasos de hoy, la semana y el repaso: lo que vence y los temas en los que estás flojo.</p>
  </>
);
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIA_REPASO = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export default function EstudioV2({ ruta, day, today }: PropsV2) {
  const p = ruta.param ?? '';
  if (p === 'mate') return <MateV2 day={day} />;
  const libro = /^mate\/libro\/([^/]+)$/.exec(p);
  if (libro) return <LibroV2 key={libro[1]} day={day} id={decodeURIComponent(libro[1])} />;
  return <Hub day={day} hoy={today} />;
}

function Hub({ day, hoy }: { day: PropsV2['day']; hoy: string }) {
  const plan = useStudyPlan(day);
  const study = useStore((s) => s.study);
  const days = useStore((s) => s.days);
  const focus = useStore((s) => s.focus);
  const lineas = useLineas(hoy);
  const [sel, setSel] = useState<string | null>(null);
  const actual = plan.contenidos.find((c) => c.id === sel) ?? plan.contenidos.find((c) => c.falta > 0 && c.id !== 'repaso') ?? plan.contenidos.find((c) => c.falta > 0) ?? plan.contenidos[0];
  const aEntrar = plan.contenidos.find((c) => c.falta > 0 && c.id !== 'repaso') ?? plan.contenidos.find((c) => c.falta > 0);
  const enSesion = !!aEntrar && focus?.activityId === aEntrar.id && focus.date === day.date;

  const semana = barrasDe('semana', hoy);
  const porDia = semana.items.map((b, i) => ({ etiqueta: DIAS[i], valor: Object.entries(days).filter(([k]) => k >= b.desde && k <= b.hasta).flatMap(([, d]) => d.study ?? []).reduce((s, l) => s + l.min, 0), hoy: b.actual }));
  const totalSemana = porDia.reduce((s, b) => s + b.valor, 0);
  const fc = forecast(study, hoy);
  const cap = study.rules.cap;
  const flojos = ranking(study, 3);
  const libros = study.activities.filter((a) => a.libro && !a.archivada).map((a) => libroPorId(a.libro!)).filter((x) => !!x);
  const libro = libros.find((x) => estadoLibro(study, x).estado !== 'terminado') ?? libros[0];
  const conamat = study.activities.find((a) => a.id === 'conamat');
  const aprobados = conamat?.units?.filter((u) => study.units.conamat?.[u.n]?.approvedOn).length ?? 0;
  const tests = Object.values(study.units).flatMap((u) => Object.values(u).flatMap((x) => x.tests));
  const prom = tests.length ? Math.round((tests.reduce((s, t) => s + t.score / t.total, 0) / tests.length) * 100) : null;
  const log30 = study.log.filter((l) => l.date >= addDays(hoy, -30));
  const recordas = log30.length ? Math.round((log30.filter((l) => l.grade > 1).length / log30.length) * 100) : null;

  return (
    <Marco className="es" titulo="Estudio" info={INFO}>
      <Tarjeta heroe className="es-hoy" etiqueta="Estudio de hoy">
        <div className="es-hoy-fila">
          <Anillo valor={plan.stepsTotal ? plan.stepsDone / plan.stepsTotal : 0} tamano={88} grosor={9} etiqueta={`${plan.stepsDone}`} sub={`de ${plan.stepsTotal}`} area="var(--a-ing)" nombre={`${plan.stepsDone} de ${plan.stepsTotal} pasos de estudio hechos`} />
          <div className="es-hoy-texto">
            <span className="t-rotulo">Hoy</span>
            <b className="t-titulo">{plan.contenidos.length === 0 ? 'Nada programado' : plan.falta ? `Falta ${fmtDur(plan.falta)}` : 'Listo por hoy'}</b>
            {plan.contenidos.length > 0 && <span className="t-nota">{plan.contenidos.length} {plan.contenidos.length === 1 ? 'contenido' : 'contenidos'}</span>}
          </div>
        </div>
        {aEntrar && <Boton variante="primario" icono="play" ancho onClick={() => (enSesion ? ir(`sesion/${aEntrar.id}`) : startStudy(day.date, aEntrar.id, aEntrar.blockKey, aEntrar.pendientes))}>{enSesion ? 'Volver a la sesión' : `Entrar en foco · ${fmtDur(aEntrar.falta)}`}</Boton>}
      </Tarjeta>

      <Grupo titulo="Tus caminos">
        <div className="es-lineas">
          {lineas.map((l) => (
            <a key={l.id} className="capa-1 es-linea" href={l.href} style={{ ['--area' as string]: l.area }}>
              <span className="es-linea-cab"><i className="area-punto" /><b className="t-encabezado">{l.nombre}</b>{' '}<span className="t-dato">{l.hechas} de {l.estaciones.length}{' '}<span className="v2-oculto">{l.unidad} hechos.</span></span></span>{' '}
              <Metro linea={l} />
              <span className="t-nota es-linea-ahora"><b>{l.ahora}</b>{l.vasASer ? <> → {l.vasASer}</> : null}</span>
            </a>
          ))}
          {libro && (() => {
            const e = estadoLibro(study, libro);
            return <a className="capa-1 es-linea es-libro" href={`#/estudio/libro/${libro.id}`} style={{ ['--area' as string]: 'var(--a-handyx)' }}><span className="es-linea-cab"><i className="area-punto" /><b className="t-encabezado">{libro.titulo}</b><span className="t-dato">{ESTADO_LIBRO[e.estado].toLowerCase()}</span></span></a>;
          })()}
        </div>
      </Grupo>

      {plan.contenidos.length > 0 && actual && (
        <Grupo titulo="Lo de hoy" extremo={<span className="t-rotulo">{plan.stepsDone} de {plan.stepsTotal} hechos</span>}>
          <div className="es-chips" role="group" aria-label="Contenidos de hoy">
            {plan.contenidos.map((c) => <Chip key={c.id} activo={actual.id === c.id} onCambio={() => setSel(c.id)} area={colorV2(AREAS[c.color as keyof typeof AREAS].css)}>{c.title}</Chip>)}
          </div>
          <div className="capa-1 es-pasos">
            {actual.steps.map((s) => {
              const done = actual.done(s);
              return <Casilla key={s.ref} marcada={done} etiqueta={`${STEP_LABEL[s.step]}: ${s.title}`} nota={`${KIND_LABEL[s.kind]} · ${fmtDur(s.ver)}${s.paper != null ? ` · ${s.paper ? 'en papel' : 'en la app'}` : ''}`} area={colorV2(AREAS[actual.color as keyof typeof AREAS].css)} onCambio={() => tocarPaso(day.date, s, done)} />;
            })}
          </div>
          {actual.id === 'repaso' && plan.skipped.length > 0 && <p className="t-nota es-pie">Hoy no toca, por el tope de {cap} min: {plan.skipped.map((r) => r.label).join(', ')}. Vuelve mañana.</p>}
        </Grupo>
      )}

      <Grupo titulo="Esta semana" extremo={<span className="t-rotulo">{fmtDur(totalSemana)} de {fmtDur(semana.metaTotal)}</span>}>
        <div className="capa-1 es-grafico"><Barras barras={porDia.map((b) => ({ ...b, texto: b.valor ? fmtDur(b.valor).replace(' ', '') : '—' }))} meta={semana.metaMin} nombre={`Minutos de estudio por día: ${porDia.map((b) => `${b.etiqueta} ${b.valor}`).join(', ')}`} /></div>
        <div className="es-numeros">
          <Dato valor={`${aprobados}/${conamat?.units?.length ?? 11}`} etiqueta="Capítulos aprobados" />
          <Dato valor={prom == null ? '—' : `${prom} %`} etiqueta="Promedio de tests" />
          <Dato valor={recordas == null ? study.cards.length : `${recordas} %`} etiqueta={recordas == null ? 'Tarjetas' : 'Recordás'} />
        </div>
      </Grupo>

      <Grupo titulo="Repasar" extremo={<Boton tamano="s" variante="fantasma" icono="repaso" href="#/repaso">Repaso de hoy</Boton>}>
        <div className="capa-1 es-grafico"><Barras barras={fc.map((f, i) => ({ etiqueta: i === 0 ? 'Hoy' : DIA_REPASO[(weekday(f.date) + 1) % 7], valor: f.min, hoy: i === 0, texto: f.min ? `${f.min}’` : '—' }))} meta={cap} nombre={`Minutos de repaso que vienen: ${fc.map((f, i) => `${i ? DIA_REPASO[(weekday(f.date) + 1) % 7] : 'Hoy'} ${f.min}`).join(', ')}; tope ${cap}`} /></div>
        {flojos.length > 0 && (
          <div className="capa-1 s-lista es-flojos">
            {flojos.map((t) => <Fila key={t.id} titulo={t.unit != null ? `Cap. ${t.unit}` : t.nombre} nota={qFalla(study, t.id)} valor={<span style={{ color: colorV2(BANDA_COLOR[banda(t.fuerza!)]) }}>{t.fuerza} %</span>} href={`#/flojo/${encodeURIComponent(t.id)}`} />)}
          </div>
        )}
        <div className="pt-acciones"><Boton tamano="s" variante="fantasma" icono="alerta" href="#/flojo">Puntos débiles</Boton></div>
      </Grupo>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <Fila icono="info" titulo="Cómo funciona" nota="Los cuatro pasos de cada capítulo" href="#/como" />
          <Fila icono="calendario" titulo="Plan del bimestre" href="#/unidades" />
          <Fila icono="mas" titulo="Sumar algo de estudio a hoy" href="#/actividad" />
          <Fila icono="opciones" titulo="Ajustar el motor" nota="Tope, retención, nuevas por día" href="#/motor" />
        </div>
      </Grupo>
    </Marco>
  );
}
