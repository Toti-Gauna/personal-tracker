/**
 * Trazo 2.0 · Elegir foco (#/elegir/<bloque>): cómo trabajar lo que queda del bloque. Cada opción entra justa en los minutos que
 * quedan; la elegida muestra qué es y a qué hora cae cada tramo. "Usarlo siempre" la deja como el pomodoro de ese bloque.
 */
import { useMemo, useState } from 'react';
import { AREAS, BUILTIN_PRESETS } from '../../data/defaults';
import { tituloDeBloque } from '../../data/etiquetas';
import { startFocus } from '../../data/focus';
import { fitPreset, focusMinutes, planLabel } from '../../data/pomodoro';
import { blockEnd, remainingMin } from '../../data/schedule';
import { DEFAULT_SOUNDS, SOUNDS } from '../../data/sounds';
import { fmtDur, nowMin, toHHMM, toMin } from '../../data/time';
import type { Preset } from '../../data/types';
import { ir } from '../../lib/routes';
import { setBlockPreset, useStore } from '../../state/store';
import { empezarFoco } from '../../ui/foco';
import { colorV2 } from '../hoy/datos';
import { Boton, Interruptor } from '../kit/controles';
import { Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { Tramos } from './piezas';
import './ajustes.css';

interface Opcion { preset: Preset; segs: ReturnType<typeof fitPreset>; label: string; mine: boolean }

const INFO = (
  <>
    <p className="t-cuerpo-l">Cada opción entra justa en los minutos que quedan del bloque.</p>
    <p className="t-cuerpo">Lleno es concentración y rayado es descanso. Si la usás siempre en este bloque, pasa a ser su pomodoro: la próxima vez aparece primera.</p>
    <p className="t-cuerpo">Para armar uno a tu medida, mirá Pomodoros.</p>
  </>
);

export default function ElegirV2({ ruta, day }: PropsV2) {
  const settings = useStore((s) => s.settings)!;
  const block = day.blocks.find((b) => b.key === ruta.param);
  const now = nowMin();
  const minutes = block ? remainingMin(block, now) : 0;
  const startAt = block && now >= toMin(block.start) && now < blockEnd(block) ? now : block ? toMin(block.start) : now;

  const opciones = useMemo<Opcion[]>(() => {
    if (!block) return [];
    const mineId = settings.blockPresets[block.key];
    const mine = settings.presets.find((p) => p.id === mineId) ?? BUILTIN_PRESETS.find((p) => p.id === mineId);
    const seen = new Set<string>();
    return [...(mine ? [mine] : []), ...BUILTIN_PRESETS].flatMap((p) => {
      const segs = fitPreset(p, minutes);
      const label = planLabel(segs);
      if (!segs.length || seen.has(label)) return [];
      seen.add(label);
      return [{ preset: p, segs, label, mine: p === mine }];
    });
  }, [block, minutes, settings]);

  const [sel, setSel] = useState(0);
  const [siempre, setSiempre] = useState(false);

  if (!block || !opciones.length) {
    return (
      <Marco className="ax" titulo="Elegir foco" volver={{ href: '#/hoy', nombre: 'Hoy' }}>
        <Vacio ilustracion={block ? 'foco' : 'buscar'} titulo={block ? 'No queda tiempo en este bloque' : 'No encontré ese bloque'} texto={block ? 'Elegí otra meta en Hoy.' : 'No está en el día de hoy.'}
          accion={<Boton variante="primario" href="#/hoy">Ir a Hoy</Boton>} />
      </Marco>
    );
  }

  const area = AREAS[block.area];
  const color = colorV2(area.css);
  const nombre = block.title.split(' · ')[0];
  const elegida = opciones[Math.min(sel, opciones.length - 1)];
  const sonido = SOUNDS[(settings.sounds ?? DEFAULT_SOUNDS).events.pomodoro].name;

  const empezar = () => empezarFoco(startFocus(day.date, block.key, elegida.label, elegida.segs, Date.now()), () => {
    if (siempre) setBlockPreset(block.key, elegida.preset.id);
    ir('foco');
  });

  return (
    <Marco className="ax" titulo="Elegir foco" volver={{ href: '#/hoy', nombre: 'Hoy' }} info={INFO}>
      <Tarjeta heroe area={color} etiqueta="El bloque" className="ax-bloque">
        <span className="t-rotulo"><i className="area-punto" /> {area.name}</span>
        <b className="t-seccion">{tituloDeBloque(block, day.date, settings.startDate)}</b>
        <span className="t-dato">{toHHMM(startAt)} – {toHHMM(startAt + minutes)} · quedan {fmtDur(minutes)}</span>
      </Tarjeta>

      <Grupo titulo="Forma de trabajar">
        <div className="ax-opciones" role="radiogroup" aria-label="Forma de trabajar el bloque">
          {opciones.map((o, i) => {
            const activa = i === sel;
            return (
              <button key={o.label} type="button" role="radio" aria-checked={activa} className="ax-opcion" style={{ ['--area' as string]: color }} onClick={() => setSel(i)}>
                <span className="ax-radio" aria-hidden="true" />
                <span className="ax-opcion-t"><b>{o.label}</b>{o.mine && <span className="ax-mio">Tu preset</span>}</span>
                <span className="ax-opcion-min"><b className="t-dato">{focusMinutes(o.segs)}</b> min de foco</span>
                <span className="ax-opcion-plan">
                  <Tramos segs={o.segs} area={activa ? color : 'var(--texto-3)'} nombre={`Plan ${o.label}`} />
                  {activa && (
                    <>
                      {o.preset.desc && <small className="t-nota">{o.preset.desc}</small>}
                      <span className="ax-ejes t-dato" aria-hidden="true" data-grafico><span>{toHHMM(startAt)}</span><span>{o.segs.map((s) => s.min).join(' · ')}</span><span>{toHHMM(startAt + minutes)}</span></span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Grupo>

      <div className="capa-1 ax-siempre"><Interruptor prendido={siempre} onCambio={setSiempre} etiqueta={`Usarlo siempre en ${nombre}`} nota="Pasa a ser el pomodoro de este bloque" /></div>
      <Boton variante="primario" ancho icono="play" onClick={empezar}>Empezar · {elegida.label}</Boton>
      <div className="capa-1 s-lista">
        <Fila icono="mas" titulo="Armar uno a medida" href="#/pomodoros" />
        <Fila icono="sonido" titulo="Sonido de cada tramo" nota={sonido} href="#/sonidos" />
      </div>
    </Marco>
  );
}
