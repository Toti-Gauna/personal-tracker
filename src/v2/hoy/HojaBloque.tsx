/**
 * Trazo 2.0 · la hoja de una meta del día: sus pasos y todo lo que se le puede hacer (entrar en foco, darla por hecha,
 * cambiarle el horario, saltearla). Las acciones con formulario se abren dentro de la misma hoja, con su "volver".
 */
import { useEffect, useRef, useState } from 'react';
import type { Modo } from '../../data/editar-dia';
import { blockDone, fmtPct, mejoraDia, valorMeta } from '../../data/mejora';
import { toHHMM, toMin } from '../../data/time';
import type { Block, DayLog } from '../../data/types';
import { cambiarHorario, darPorHecho, deshacerHecho, quitarMetaPropia, saltear } from '../../state/dia';
import { getState, updateDay } from '../../state/store';
import { preguntarSiEsMate } from '../../ui/acciones';
import { aviso, confirmar } from '../kit/capas';
import { Boton, CampoHora, CampoTexto, Contador, Segmentado } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Estado, Fila } from '../kit/superficies';
import { momento, textoPasos, pasosDe, type Destino } from './datos';
import { Pasos } from './Pasos';

type Vista = 'pasos' | 'hecho' | 'horario';
const MODOS: [Modo, string][] = [['correr', 'Correr lo que sigue'], ['acortar', 'Acortar lo que sigue']];
const NOTA_MODO: Record<Modo, string> = {
  correr: 'Lo que sigue empieza más tarde si se pisa. Nada pasa de la hora de dormir.',
  acortar: 'Lo que sigue se achica (mínimo 15 min) para terminar a la misma hora.',
};

interface Props {
  day: DayLog;
  /** La meta abierta (su `key`), o null. */
  clave: string | null;
  now: number;
  titulo: (b: Block) => string;
  etiqueta: (b: Block) => string | null;
  color: (b: Block) => string;
  destino: (b: Block) => Destino | null;
  onCerrar: () => void;
  onClips: () => void;
}

export function HojaBloque({ day, clave, now, titulo, etiqueta, color, destino, onCerrar, onClips }: Props) {
  const vivo = clave ? day.blocks.find((x) => x.key === clave) : undefined;
  const ultimo = useRef<Block | undefined>(undefined);
  if (vivo) ultimo.current = vivo;
  const b = vivo ?? ultimo.current; // mientras la hoja se cierra, sigue mostrando la última
  const [vista, setVista] = useState<Vista>('pasos');
  const [nota, setNota] = useState('');
  const [start, setStart] = useState('00:00');
  const [min, setMin] = useState<number | null>(60);
  const [modo, setModo] = useState<Modo>('correr');
  const [error, setError] = useState('');
  useEffect(() => { if (clave) { setVista('pasos'); setNota(''); setError(''); } }, [clave]);
  if (!b) return null;

  const date = day.date;
  const nombre = titulo(b);
  const m = momento(b, now);
  const tag = etiqueta(b);
  const d = destino(b);
  const hecha = blockDone(b);
  const { hechos, total } = pasosDe(b);
  const pendientes = total - hechos;

  const abrirHorario = () => { setStart(b.start); setMin(b.min); setModo('correr'); setError(''); setVista('horario'); };
  const darHecho = () => {
    darPorHecho(date, b.key, nota);
    preguntarSiEsMate(date, b);
    const dia = getState().days[date];
    if (dia && !hecha) aviso({ titulo: `Meta ${b.n} cumplida · +${fmtPct(valorMeta(dia), 3)} %`, sub: `Hoy llevás +${fmtPct(mejoraDia(dia))} % de mejora`, tono: 'hecho' });
    onCerrar();
  };
  const guardarHorario = () => {
    if (min == null || min < 5) { setError('La duración mínima es de 5 minutos.'); return; }
    // Acortar o correr toca también las metas que siguen: Deshacer vuelve el día entero a como estaba.
    const antes = getState().days[date]?.blocks;
    const r = cambiarHorario(date, b.key, start, min, modo);
    if (!r.ok) { setError(r.error); return; }
    aviso({ titulo: 'Horario cambiado', sub: `${nombre}: ${start} a ${toHHMM((toMin(start) + min) % (24 * 60))}`, deshacer: antes ? () => updateDay(date, (d) => ({ ...d, blocks: antes })) : undefined });
    setVista('pasos');
  };
  const quitar = async () => {
    if (!(await confirmar({ titulo: `¿Quitar "${nombre}" de hoy?`, texto: 'Es una meta que sumaste hoy. Se borra con sus pasos.', accion: 'Quitar', peligro: true }))) return;
    onCerrar();
    quitarMetaPropia(date, b.key);
  };

  const volver = <Boton onClick={() => setVista('pasos')}>Volver</Boton>;
  return (
    <Hoja abierta={!!vivo} onCerrar={onCerrar} titulo={vista === 'pasos' ? nombre : vista === 'hecho' ? 'Dar por hecho' : 'Cambiar horario'}
      pie={vista === 'hecho' ? <>{volver}<Boton variante="primario" icono="tilde" onClick={darHecho}>Dar por hecho</Boton></>
        : vista === 'horario' ? <>{volver}<Boton variante="primario" onClick={guardarHorario}>Guardar</Boton></>
        : d ? <Boton variante="primario" icono="play" href={`#/${d.ruta}`}>{d.etiqueta}</Boton> : undefined}>
      {vista === 'pasos' && (
        <>
          <div className="hb-cabeza" style={{ ['--area' as string]: color(b) }}>
            <span className="t-rotulo">{m.texto}</span>
            {b.salteado ? <Estado estado="pausado" texto="Salteada" /> : hecha ? <Estado estado="hecho" /> : <span className="t-rotulo t-dato">{m.rango}</span>}
          </div>
          {tag && <p className="t-nota hb-rama" style={{ ['--area' as string]: color(b) }}><i className="area-punto" />{tag}</p>}
          <Pasos date={date} block={b} editable />
          {b.hecho && (
            <div className="hb-hecho">
              <p className="t-nota">Dada por hecha a las {b.hecho.at}{b.hecho.nota ? `: ${b.hecho.nota}` : ''}.</p>
              <Boton tamano="s" variante="fantasma" icono="deshacer" onClick={() => deshacerHecho(date, b.key)}>Deshacer</Boton>
            </div>
          )}
          <div className="capa-2 s-lista">
            {!b.hecho && !b.salteado && !hecha && <Fila icono="tilde" titulo="Dar por hecho" nota={pendientes ? `Aunque queden ${textoPasos(pendientes, pendientes).replace(/^\d+ de /, '')}` : undefined} onClick={() => setVista('hecho')} />}
            {b.key !== 'sueno' && <Fila icono="reloj" titulo="Cambiar horario" nota="Solo por hoy" onClick={abrirHorario} />}
            {b.propia
              ? <Fila icono="borrar" titulo="Quitar de hoy" onClick={() => { void quitar(); }} extremo={<span />} />
              : <Fila icono={b.salteado ? 'deshacer' : 'adelantado'} titulo={b.salteado ? 'Volver a hoy' : 'Saltear hoy'} nota={b.salteado ? undefined : 'No cuenta en la mejora'} onClick={() => saltear(date, b.key, !b.salteado)} extremo={<span />} />}
            {b.key === 'clipping' && <Fila icono="grafico" titulo="Registrar clips" onClick={() => { onCerrar(); onClips(); }} />}
          </div>
        </>
      )}
      {vista === 'hecho' && (
        <>
          <p className="t-cuerpo">{pendientes ? `${pendientes === 1 ? 'Queda 1 paso' : `Quedan ${pendientes} pasos`} sin tildar: no ${pendientes === 1 ? 'pasa' : 'pasan'} a mañana.` : 'La meta cuenta como hecha.'} Suma a la mejora del día.</p>
          <CampoTexto etiqueta="¿En qué lo usaste? (opcional)" valor={nota} onCambio={setNota} placeholder="La reunión no se dio: avancé con otra tarea" />
        </>
      )}
      {vista === 'horario' && (
        <>
          <div className="hb-dos">
            <CampoHora etiqueta="Empieza" valor={start} onCambio={(v) => { setStart(v); setError(''); }} />
            <div className="k-campo"><span className="k-campo-etiqueta">Dura</span><Contador etiqueta="Duración en minutos" valor={min} onCambio={(v) => { setMin(v); setError(''); }} paso={5} min={5} max={720} unidad="min" /></div>
          </div>
          <p className="t-nota t-dato">Termina a las {min ? toHHMM((toMin(start) + min) % (24 * 60)) : '—'}</p>
          <Segmentado etiqueta="Lo que sigue" valor={modo} opciones={MODOS} onCambio={(x) => { setModo(x); setError(''); }} />
          <p className="t-nota">{NOTA_MODO[modo]} La rutina no cambia: solo hoy.</p>
          {error && <p className="hb-error" role="alert">{error}</p>}
        </>
      )}
    </Hoja>
  );
}
