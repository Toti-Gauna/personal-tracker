/**
 * Trazo 2.0 · el cierre del día (#/cierre) en tres tarjetas que se deslizan: lo que mejoraste hoy, lo que pasa a mañana y cerrar.
 * Guarda igual que la 1.0: copia el JSON del día, pasa a mañana lo elegido, suma el XP y, si ganaste un sello, lo muestra.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { mesClipEn, mesDe as mesClipDe } from '../../data/clipping';
import { ingresoMes, totales } from '../../data/clipping-metricas';
import { AREAS } from '../../data/defaults';
import { dayNumber, mejoraAcumulada, mejoraAyer, racha } from '../../data/derive';
import { dayJson } from '../../data/export';
import { blockDone, fmtPct, mejoraDia } from '../../data/mejora';
import { dayXp } from '../../data/profile';
import { cierreSugerido } from '../../data/study';
import { addDays, nowMin, toHHMM } from '../../data/time';
import type { Area } from '../../data/types';
import { ir } from '../../lib/routes';
import { getState, useStore } from '../../state/store';
import { closeDay, reopenDay } from '../../state/profile';
import { Barras } from '../estudio/Barras';
import { colorV2 } from '../hoy/datos';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto } from '../kit/controles';
import { Barra, Dato, Estado, Fila } from '../kit/superficies';
import { Marco } from '../marco/Marco';
import { Numero } from '../movimiento/componentes';
import { haptico, reducido } from '../movimiento/movimiento';
import { FilaHoja, Lista } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { ultimosDias } from './datos';
import '../proyecto/proyecto.css';
import './perfil.css';
import { cuantos } from '../reglas';

const PASOS = ['Hoy', 'Mañana', 'Cerrar'] as const;
const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const letraDe = (f: string) => DIAS[new Date(Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)))).getUTCDay()];

const INFO = (
  <>
    <p className="t-cuerpo-l">Cerrar el día en tres pasos.</p>
    <p className="t-cuerpo">Cada meta del día cumplida suma una parte de 1 %: con todas, mejoraste 1 % hoy. Lo que no hiciste puede pasar a mañana, tarea por tarea.</p>
    <p className="t-cuerpo">Al cerrar se copia el JSON del día, para pegárselo a Claude y que quede guardado en el repo. Un día cerrado se puede reabrir.</p>
  </>
);

export default function CierreV2({ day }: PropsV2) {
  const settings = useStore((s) => s.settings)!;
  const days = useStore((s) => s.days);
  const names = useStore((s) => s.goals.bimesterNames);
  const train = useStore((s) => s.train);
  const clipping = useStore((s) => s.clipping);
  const [paso, setPaso] = useState(0);
  const riel = useRef<HTMLDivElement>(null);
  const cerrado = !!day.closed;
  const mejora = mejoraDia(day);
  const diff = mejora - mejoraAyer(days, day.date);
  const tareas = day.blocks.flatMap((b) => b.tasks);
  const hechas = tareas.filter((t) => t.done).length;
  const score = tareas.length ? hechas / tareas.length : 0;
  const xp = cerrado ? day.closed!.xp : dayXp(day);
  const metas = day.blocks.filter(blockDone).length;
  const acum = mejoraAcumulada(days, day.date);
  const ultimos = ultimosDias(days, day.date, 3).filter((d) => d.cargado);
  // Lo de un bloque dado por hecho, salteado o sumado hoy no pasa a mañana (igual que la 1.0).
  const pendientes = day.blocks.filter((b) => !b.hecho && !b.salteado && !b.propia).flatMap((b) => b.tasks.filter((t) => !t.done).map((t) => ({ ...t, bloque: b.title })));
  const [pasar, setPasar] = useState<Set<string>>(() => new Set(pendientes.map((t) => t.id)));
  // Del estudio salen la victoria (un test aprobado hoy) y lo primero de mañana (lo que vence).
  const [sug] = useState(() => cierreSugerido(getState().study, day.date));
  const [victoria, setVictoria] = useState(day.closed?.victoria ?? sug.victoria);
  const [manana, setManana] = useState(day.closed?.manana ?? sug.manana);

  const porArea = useMemo(() => {
    const m = new Map<Area, { h: number; t: number }>();
    for (const b of day.blocks) {
      const c = m.get(b.area) ?? { h: 0, t: 0 };
      c.h += b.tasks.filter((t) => t.done).length;
      c.t += b.tasks.length;
      m.set(b.area, c);
    }
    return [...m.entries()].filter(([, v]) => v.t > 0);
  }, [day.blocks]);

  const json = useMemo(() => JSON.stringify(dayJson({ ...day, closed: day.closed ?? { at: toHHMM(nowMin()), xp, score, victoria, manana } }, settings, days, names, train, clipping), null, 2),
    [day, settings, days, names, train, xp, score, victoria, manana, clipping]);

  // A dónde está yendo el riel cuando lo mueve un botón: mientras viaja, el paso no sigue a las tarjetas que cruza.
  const destino = useRef<number | null>(null);
  /** Mueve el riel a una tarjeta (y deja el estado al día aunque no haya desplazamiento, como en los tests). */
  const irA = (k: number) => {
    const n = Math.max(0, Math.min(PASOS.length - 1, k));
    setPaso(n);
    const el = riel.current;
    const hijos = el ? ([...el.children] as HTMLElement[]) : [];
    // La tarjeta de antes queda inerte (el botón que tenía el foco también): el foco pasa a la nueva, para no caer en la página.
    window.setTimeout(() => { const t = hijos[n]; if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } }, 0);
    if (!el || !hijos[n] || !el.scrollTo) return;
    destino.current = n;
    window.setTimeout(() => { if (destino.current === n) destino.current = null; }, 900);
    el.scrollTo({ left: hijos[n].offsetLeft - hijos[0].offsetLeft, behavior: reducido() ? 'auto' : 'smooth' });
  };
  // Al deslizar con el dedo, el paso sigue a la tarjeta que quedó a la vista.
  useEffect(() => {
    const el = riel.current;
    if (!el) return;
    let cuadro = 0;
    const on = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const hijos = [...el.children] as HTMLElement[];
        if (!hijos.length) return;
        const cerca = hijos.map((h, k) => [Math.abs(h.offsetLeft - hijos[0].offsetLeft - el.scrollLeft), k]).sort((a, b) => a[0] - b[0])[0][1];
        if (destino.current != null) { if (cerca === destino.current) destino.current = null; return; }
        setPaso(cerca);
      });
    };
    el.addEventListener('scroll', on, { passive: true });
    return () => { el.removeEventListener('scroll', on); cancelAnimationFrame(cuadro); };
  }, []);

  const copiar = async (texto: string, titulo: string) => {
    try { await navigator.clipboard.writeText(`${texto}\n`); aviso({ titulo, sub: `Pegalo como data/days/${day.date}.json`, tono: 'hecho' }); }
    catch { aviso({ titulo: titulo.includes('cerrado') ? 'Día cerrado' : 'No se pudo copiar', sub: 'Descargalo desde "JSON del día", en Hoy', tono: 'atencion' }); }
  };
  const cerrar = async () => {
    haptico('exito');
    const nuevos = closeDay(day.date, { victoria, manana, carry: [...pasar], score });
    // El JSON se arma después de cerrar, con lo que pasó a mañana ya sacado del día.
    const s = getState();
    await copiar(JSON.stringify(dayJson(s.days[day.date], s.settings!, s.days, s.goals.bimesterNames, s.train, s.clipping), null, 2), 'JSON copiado · día cerrado');
    if (nuevos.length) ir(`logro/${nuevos[0]}`);
  };

  const clipMes = mesClipDe(day.date);
  const comparacion = !days[addDays(day.date, -1)] ? 'Es tu primer día registrado.' : Math.abs(diff) < 0.005 ? 'Igual que ayer.' : diff > 0 ? `${fmtPct(diff)} más que ayer.` : `${fmtPct(-diff)} menos que ayer.`;

  return (
    <Marco className="pf ci" titulo="Cierre" rotulo={`Día ${String(dayNumber(settings.startDate, day.date)).padStart(2, '0')} · ${day.closed?.at ?? toHHMM(nowMin())}`} volver={{ href: '#/hoy', nombre: 'Hoy' }} info={INFO}>
      <div className="ci-pasos" role="tablist" aria-label="Pasos del cierre">
        {PASOS.map((p, k) => (
          <button key={p} type="button" role="tab" id={`ci-tab-${k}`} aria-selected={paso === k} aria-controls={`ci-panel-${k}`} className={k < paso ? 'ci-pasado' : undefined} onClick={() => irA(k)}>
            <span className="t-dato" aria-hidden="true">{k + 1}</span>{p}
          </button>
        ))}
      </div>

      <div className="ci-riel" ref={riel}>
        <section className="capa-heroe s-tarjeta ci-tarjeta" role="tabpanel" id="ci-panel-0" aria-labelledby="ci-tab-0" inert={paso !== 0}>
          <span className="t-rotulo">Hoy mejoraste</span>
          <p className="ci-mejora"><b className="t-heroe">+<Numero valor={mejora} decimales={2} /></b><span className="t-cuerpo-l">% de 1 posible</span></p>
          <p className="t-cuerpo ci-comparacion">{comparacion}</p>
          <div className="ci-metas" role="img" aria-label={`${metas} de ${day.blocks.length} metas del día cumplidas`} data-grafico>
            {day.blocks.map((b, k) => <i key={b.key} className={blockDone(b) ? 'ci-on' : undefined} style={{ ['--i' as string]: k }} />)}
          </div>
          <div className="pf-numeros ci-numeros">
            <Dato valor={`${metas}/${day.blocks.length}`} etiqueta="Metas" />
            <Dato valor={`+${xp}`} unidad="XP" etiqueta={`Racha ${racha(days, day.date)}`} />
            <Dato valor={`+${fmtPct(acum, 1)}`} unidad="%" etiqueta="Acumulado" />
          </div>
          {ultimos.length > 1 && <Barras alto={56} meta={1} barras={ultimos.map((d) => ({ etiqueta: letraDe(d.fecha), valor: d.mejora, hoy: d.fecha === day.date, texto: fmtPct(d.mejora) }))} nombre={`Mejora de estos días: ${ultimos.map((d) => fmtPct(d.mejora)).join(', ')}.`} />}
          <ul className="ci-areas">
            {porArea.map(([a, v]) => (
              <li key={a}>
                <span className="t-nota">{settings.areaNames?.[a] ?? AREAS[a].name}</span>
                <Barra valor={v.h} max={v.t} nombre={`${AREAS[a].name}: ${v.h} de ${v.t} tareas`} area={colorV2(AREAS[a].css)} />
                <span className="t-dato">{Math.round((v.h / v.t) * 100)} %</span>
              </li>
            ))}
          </ul>
          <Boton variante="primario" ancho icono="siguiente" onClick={() => irA(1)}>Siguiente</Boton>
        </section>

        <section className="capa-1 s-tarjeta ci-tarjeta" role="tabpanel" id="ci-panel-1" aria-labelledby="ci-tab-1" inert={paso !== 1}>
          <span className="t-rotulo">Para mañana</span>
          {pendientes.length > 0 && !cerrado && (
            <div className="ci-pendientes">
              <p className="t-cuerpo">Lo tildado pasa a mañana.</p>
              <Lista festejo={false} items={pendientes.map((t) => ({ clave: t.id, etiqueta: t.t, nota: t.bloque, marcada: pasar.has(t.id) }))}
                onCambio={(id) => setPasar((p) => { const q = new Set(p); if (q.has(id)) q.delete(id); else q.add(id); return q; })} />
            </div>
          )}
          {pendientes.length === 0 && !cerrado && <p className="t-cuerpo">No quedó nada pendiente.</p>}
          {cerrado ? (
            <dl className="capa-2 pt-ficha">
              <div className="pt-ficha-fila"><dt className="t-rotulo">Pequeña victoria</dt><dd className="t-cuerpo">{day.closed!.victoria || 'Sin anotar'}</dd></div>
              <div className="pt-ficha-fila"><dt className="t-rotulo">Mañana, lo primero</dt><dd className="t-cuerpo">{day.closed!.manana || 'Sin anotar'}</dd></div>
            </dl>
          ) : (
            <>
              <CampoTexto etiqueta="Pequeña victoria" valor={victoria} onCambio={setVictoria} placeholder={sug.victoria || 'Aprobé el test del cap. 3'} />
              <CampoTexto etiqueta="Mañana, lo primero" valor={manana} onCambio={setManana} placeholder={sug.manana || 'Cold recall del cap. 3'} />
            </>
          )}
          <Boton variante="primario" ancho icono="siguiente" onClick={() => irA(2)}>Siguiente</Boton>
        </section>

        <section className="capa-1 s-tarjeta ci-tarjeta" role="tabpanel" id="ci-panel-2" aria-labelledby="ci-tab-2" inert={paso !== 2}>
          <div className="ci-fin-cab"><span className="t-rotulo">{cerrado ? `Cerrado a las ${day.closed!.at}` : 'Listo para cerrar'}</span>{cerrado && <Estado estado="hecho" texto="Cerrado" />}</div>
          <div className="pf-numeros ci-numeros">
            <Dato valor={`${hechas}/${tareas.length}`} etiqueta="Tareas" />
            <Dato valor={Math.round(score * 100)} unidad="%" etiqueta="Del día" />
            <Dato valor={`+${xp}`} unidad="XP" etiqueta="Suma" />
          </div>
          <div className="capa-2 s-lista">
            {clipMes >= 1 && clipMes <= 12 && (
              <Fila icono="dinero" titulo="Clipping" nota={`${cuantos(totales(clipping.registro.filter((f) => f.fecha === day.date)).clips, 'clip', 'clips')} hoy`} valor={`USD ${Math.round(ingresoMes(clipping, clipMes)).toLocaleString('es-AR')} de ${mesClipEn(day.date).meta.toLocaleString('es-AR')}`} href="#/metas/clipping" />
            )}
            <FilaHoja icono="json" titulo="JSON del día" valor={`${(new Blob([json]).size / 1024).toFixed(1).replace('.', ',')} KB`} tituloHoja={`${day.date}.json`}
              pie={<Boton variante="secundario" ancho icono="copiar" onClick={() => void copiar(json, 'JSON copiado')}>Copiar</Boton>}>
              <pre className="ci-json" tabIndex={0}>{json}</pre>
            </FilaHoja>
          </div>
          {cerrado ? (
            <div className="ci-acciones">
              <Boton variante="primario" ancho icono="copiar" onClick={() => void copiar(json, 'JSON copiado')}>Copiar el JSON otra vez</Boton>
              <Boton variante="fantasma" ancho icono="deshacer" onClick={() => reopenDay(day.date)}>Reabrir el día</Boton>
            </div>
          ) : (
            <div className="ci-acciones">
              <Boton variante="primario" ancho icono="luna" onClick={() => void cerrar()}>Copiar el JSON y cerrar</Boton>
              <p className="t-nota">Pegáselo a Claude y queda guardado en el repo.</p>
            </div>
          )}
        </section>
      </div>
    </Marco>
  );
}
