/**
 * Trazo 2.0 · el héroe de Hoy: lo que toca ahora (con el tiempo que queda en un anillo), sus pasos para tildar ahí mismo,
 * el botón para entrar en foco y lo que viene después. Sin nada por delante, invita a cerrar el día.
 */
import { fmtDur } from '../../data/time';
import type { Block, DayLog } from '../../data/types';
import { Icono } from '../iconos';
import { Boton } from '../kit/controles';
import { Anillo, Tarjeta } from '../kit/superficies';
import { Numero } from '../movimiento/componentes';
import { momento, type Ahora as EstadoAhora, type Destino } from './datos';
import { Pasos } from './Pasos';

interface Props {
  day: DayLog;
  ahora: EstadoAhora;
  now: number;
  hechas: number;
  metas: number;
  mejora: number;
  titulo: (b: Block) => string;
  etiqueta: (b: Block) => string | null;
  color: (b: Block) => string;
  destino: (b: Block) => Destino | null;
  onAbrir: (clave: string) => void;
}

export function Ahora({ day, ahora, now, hechas, metas, mejora, titulo, etiqueta, color, destino, onAbrir }: Props) {
  if (ahora.tipo === 'cerrado' || ahora.tipo === 'fin') {
    const cerrado = ahora.tipo === 'cerrado';
    return (
      <Tarjeta heroe etiqueta={cerrado ? 'Día cerrado' : 'Fin del día'} className="hy-ahora">
        <span className="t-rotulo">{cerrado ? `Día cerrado · ${day.closed!.at}` : 'Terminaron las metas de hoy'}</span>
        <div className="hy-ahora-centro">
          <Anillo nombre="Metas de hoy" valor={metas ? hechas / metas : 0} tamano={116} etiqueta={<span className="hy-resta">{hechas}/{metas}</span>} sub="metas" />
          <div className="hy-ahora-texto">
            <b className="t-seccion">{cerrado ? <>+<Numero valor={day.closed!.xp} /> XP</> : <>+<Numero valor={mejora} decimales={2} /> %</>}</b>
            <span className="t-nota">{cerrado ? 'Mañana seguís desde acá.' : ahora.pendientes ? `${ahora.pendientes === 1 ? 'Quedó 1 meta' : `Quedaron ${ahora.pendientes} metas`} sin hacer.` : 'Todo hecho.'}</span>
          </div>
        </div>
        <Boton variante={cerrado ? 'secundario' : 'primario'} ancho icono="luna" href="#/cierre">{cerrado ? 'Ver el cierre' : 'Cerrar el día'}</Boton>
      </Tarjeta>
    );
  }

  const b = ahora.bloque;
  const enCurso = ahora.tipo === 'ahora';
  const d = destino(b);
  const tag = etiqueta(b);
  const nombre = titulo(b);
  return (
    <Tarjeta heroe area={color(b)} etiqueta={enCurso ? 'Ahora' : 'Lo próximo'} className="hy-ahora">
      <div className="hy-ahora-cabeza">
        <span className="t-rotulo">{enCurso ? `Ahora · ${momento(b, now).rango}` : `Lo próximo · ${b.start}`}</span>
        <Boton soloIcono tamano="s" variante="fantasma" icono="opciones" etiqueta={`Opciones de ${nombre}`} onClick={() => onAbrir(b.key)} />
      </div>
      <div className="hy-ahora-centro">
        <Anillo nombre={enCurso ? `Tiempo de ${nombre}` : `Falta para ${nombre}`} valor={ahora.avance} tamano={116} area={color(b)}
          etiqueta={<span className="hy-resta">{fmtDur(ahora.minutos)}</span>} sub={enCurso ? 'quedan' : 'faltan'} />
        <div className="hy-ahora-texto">
          <b className="t-seccion">{nombre}</b>
          {tag && <span className="t-nota hy-rama"><i className="area-punto" />{tag}</span>}
        </div>
      </div>
      {b.tasks.length > 0 && <Pasos date={day.date} block={b} max={3} onMas={() => onAbrir(b.key)} />}
      {d && <Boton variante="primario" ancho icono="play" href={`#/${d.ruta}`}>{d.etiqueta}</Boton>}
      {ahora.despues && (
        <button type="button" className="hy-despues" onClick={() => onAbrir(ahora.despues!.key)}>
          <span className="t-rotulo">Después</span>
          <span className="t-dato">{ahora.despues.start}</span>
          <span className="hy-despues-nombre">{titulo(ahora.despues)}</span>
          <Icono nombre="siguiente" lado={16} />
        </button>
      )}
    </Tarjeta>
  );
}
