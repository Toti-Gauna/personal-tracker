/**
 * Trazo 2.0 · Hoy. Tres preguntas, en orden: dónde estoy (la fecha y el día), cómo voy (el anillo de metas y la mejora) y
 * qué hago ahora (el héroe, con sus pasos y el foco). Después, la línea del día; y más abajo el plan, los hábitos, la
 * semana y el cierre. Lo que la 1.0 explicaba con texto vive en la ⓘ; las herramientas, en "⋯".
 */
import { useState } from 'react';
import { bimester, dayNumber, mejoraAyer, racha } from '../../data/derive';
import { colorDeBloque, etiquetaDeBloque, tituloDeBloque } from '../../data/etiquetas';
import { fmtPct, mejoraDia } from '../../data/mejora';
import { addDays, dateKey, fmtFecha, nowMin } from '../../data/time';
import type { Block } from '../../data/types';
import { useStore } from '../../state/store';
import { HojaFila } from '../clipping/HojaFila';
import { useNow } from '../../ui/useNow';
import { Icono } from '../iconos';
import { Boton } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Anillo, Dato, Fila } from '../kit/superficies';
import { Marco } from '../marco/Marco';
import { Numero } from '../movimiento/componentes';
import type { PropsV2 } from '../registro';
import { Ahora } from './Ahora';
import { ahoraDe, colorV2, destinoDe, etiquetaLinda, resumenDia, sinPuntoSuelto } from './datos';
import { Habitos } from './Habitos';
import { HojaBloque } from './HojaBloque';
import { HojaMeta } from './HojaMeta';
import { Linea } from './Linea';
import { HojaAvisos, PlanHoy, usePlanHoy } from './planHoy';
import { Semana } from './Semana';
import './hoy.css';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function HoyV2({ day }: PropsV2) {
  const settings = useStore((s) => s.settings)!;
  const days = useStore((s) => s.days);
  const focus = useStore((s) => s.focus);
  const study = useStore((s) => s.study);
  const train = useStore((s) => s.train);
  const plan = useStore((s) => s.plan);
  const nombres = useStore((s) => s.goals.bimesterNames);
  const reloj = useNow(30000);
  // Pasada la medianoche, la app cambia de día en menos de un minuto; mientras tanto, el día de ayer se muestra terminado (sin
  // "lo próximo · 04:00" ni la marca de ahora al principio).
  const now = day.date < dateKey(new Date(reloj)) ? 24 * 60 - 1 : nowMin(new Date(reloj));
  const [abierta, setAbierta] = useState<string | null>(null);
  const [hoja, setHoja] = useState<'meta' | 'avisos' | 'mas' | null>(null);
  const [clips, setClips] = useState(false);
  // Una clave nueva en cada apertura: el formulario de los clips empieza de cero.
  const [claveClips, setClaveClips] = useState(0);
  const abrirClips = () => { setClaveClips((k) => k + 1); setClips(true); };

  const t0 = settings.startDate;
  const titulo = (b: Block) => sinPuntoSuelto(tituloDeBloque(b, day.date, t0));
  const etiqueta = (b: Block) => etiquetaLinda(etiquetaDeBloque(b, { day, t0, plan, study }));
  const color = (b: Block) => colorV2(colorDeBloque(b, !!day.dayType));
  const destino = (b: Block) => destinoDe(b, day, { focus, study, train });

  const ahora = ahoraDe(day, now);
  const r = resumenDia(day);
  const mejora = mejoraDia(day);
  const bim = bimester(t0, day.date, nombres);
  const rachaHoy = racha(days, day.date);
  const tieneAyer = !!days[addDays(day.date, -1)];
  const p = usePlanHoy(day);

  return (
    <Marco className="hy" titulo="Hoy" rotulo={`${cap(fmtFecha(day.date))} · día ${dayNumber(t0, day.date) + 1}`}
      acciones={<>
        <a className="hy-racha" href="#/perfil" aria-label={`Racha: ${rachaHoy} ${rachaHoy === 1 ? 'día' : 'días'}`}><Icono nombre="racha" lado={16} /><span className="t-dato">{rachaHoy}</span></a>
        {p.avisos.length > 0 && <span className="hy-campana"><Boton soloIcono variante="fantasma" icono="campana" etiqueta={`Avisos: ${p.avisos.length}`} onClick={() => setHoja('avisos')} /><i aria-hidden="true">{p.avisos.length}</i></span>}
        <Boton soloIcono variante="fantasma" icono="opciones" etiqueta="Más opciones" onClick={() => setHoja('mas')} />
      </>}
      info={<>
        <p className="t-cuerpo-l">Cada meta cumplida suma a la mejora del día: hasta 1 % si las hacés todas.</p>
        <p className="t-cuerpo">Una meta se cumple cuando tildás todos sus pasos, o cuando la das por hecha. Las salteadas no cuentan.</p>
        <p className="t-cuerpo">Arriba está lo que toca ahora; abajo, el día entero. Tocá cualquier meta para ver sus pasos, cambiarle el horario o saltearla.</p>
      </>}>
      <div className="hy-cols">
        <div className="hy-col-a">
          <Ahora day={day} ahora={ahora} now={now} hechas={r.hechas} metas={r.metas} mejora={mejora} titulo={titulo} etiqueta={etiqueta} color={color} destino={destino} onAbrir={setAbierta} />
          <section className="capa-1 hy-dia" aria-label="Tu día">
            <Anillo nombre="Metas de hoy" valor={r.metas ? r.hechas / r.metas : 0} tamano={56} grosor={6} etiqueta=" " />
            <Dato valor={`${r.hechas} de ${r.metas}`} etiqueta="Metas" />
            <Dato valor={<Numero valor={mejora} decimales={2} prefijo="+" sufijo=" %" />} etiqueta="Mejora" />
            {tieneAyer && <p className="t-nota hy-dia-pie">Ayer cerraste +{fmtPct(mejoraAyer(days, day.date))} %</p>}
          </section>
        </div>

        <section className="hy-col-b" aria-label="El día">
          <div className="m-grupo-cabeza"><h2 className="t-rotulo">El día</h2></div>
          <Linea day={day} now={now} titulo={titulo} color={color} onAbrir={setAbierta} />
          <Boton variante="fantasma" icono="mas" onClick={() => setHoja('meta')}>Meta para hoy</Boton>
        </section>

        <div className="hy-col-c">
          <PlanHoy p={p} bimestre={`${bim.name} · semana ${bim.week} de ${bim.weeks}`} />
          <Habitos day={day} onAbrir={setAbierta} />
          <Semana date={day.date} onClips={abrirClips} />
          <a className={`capa-1 s-tocable hy-cierre${day.closed ? ' cerrado' : ''}`} href="#/cierre">
            <span className="s-fila-icono"><Icono nombre="luna" lado={20} /></span>
            <span className="s-fila-texto"><b>{day.closed ? 'Día cerrado' : 'Cerrar el día'}</b><small>{day.closed ? `${day.closed.at} · +${day.closed.xp} XP` : 'Mejora, pendientes y el JSON'}</small></span>
            <Icono nombre="siguiente" lado={18} className="icono s-chevron" />
          </a>
        </div>
      </div>

      <HojaBloque day={day} clave={abierta} now={now} titulo={titulo} etiqueta={etiqueta} color={color} destino={destino} onCerrar={() => setAbierta(null)} onClips={abrirClips} />
      <HojaMeta date={day.date} abierta={hoja === 'meta'} onCerrar={() => setHoja(null)} />
      <HojaAvisos avisos={p.avisos} abierta={hoja === 'avisos'} onCerrar={() => setHoja(null)} />
      <Hoja abierta={hoja === 'mas'} onCerrar={() => setHoja(null)} titulo="Hoy">
        <div className="capa-2 s-lista">
          <Fila icono="mas" titulo="Meta para hoy" nota="Surgió algo nuevo" onClick={() => setHoja('meta')} />
          <Fila icono="calendario" titulo="Adaptar el día" nota={day.rutinaPropia ? `Rutina: ${day.rutinaPropia}` : 'Mover lo flexible'} href="#/ajustes-rutinas/hoy" />
          <Fila icono="pomodoro" titulo="Pomodoros" nota="Tus formatos de foco" href="#/pomodoros" />
          <Fila icono="json" titulo="JSON del día" nota="Para el repo" href="#/json" />
          <Fila icono="importar" titulo="Importar" nota="Lo que te devuelve Claude" href="#/importar" />
        </div>
      </Hoja>
      <HojaFila abierta={clips} onCerrar={() => setClips(false)} hoy={day.date} clave={claveClips} />
    </Marco>
  );
}
