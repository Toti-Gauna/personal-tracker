/**
 * Trazo 2.0 · "¿En qué estado estás?": la hoja que aparece al cerrar la meta de matemática o una sesión de estudio. El capítulo
 * no avanza por tiempo: lo marcás vos, y después el motor agenda solo el cold recall, el test, la tesis y los repasos. Qué hoja
 * está abierta vive en `ui/estado-estudio`; esto es solo cómo se ve.
 */
import { capitulosEnJuego, type InfoCap } from '../../data/estado-capitulo';
import { actShort, librosMate } from '../../data/study';
import type { Activity } from '../../data/study-types';
import { ir } from '../../lib/routes';
import { getState, useStore } from '../../state/store';
import { seguirEstudiando, terminarEstudio, volverAEstudiar } from '../../state/study';
import { cerrarEstadoEstudio, useEstadoEstudio } from '../../ui/estado-estudio';
import { aviso } from '../kit/capas';
import { Boton } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import './estudio.css';

export default function EstadoEstudioV2() {
  const a = useEstadoEstudio();
  return (
    <Hoja abierta={!!a} onCerrar={cerrarEstadoEstudio} titulo="¿En qué estado estás?"
      pie={<Boton variante="primario" ancho icono="tilde" onClick={cerrarEstadoEstudio}>Listo</Boton>}>
      {a && <Contenido key={`${a.date}:${a.actividades?.join(',') ?? ''}`} date={a.date} actividades={a.actividades} nota={a.nota} />}
    </Hoja>
  );
}

function Contenido({ date, actividades, nota }: { date: string; actividades?: string[]; nota?: string }) {
  const study = useStore((s) => s.study);
  const libros = actividades ? study.activities.filter((a) => actividades.includes(a.id) && a.units?.length) : librosMate(study);
  return (
    <div className="es-estado">
      {nota && <p className="t-cuerpo">{nota}</p>}
      <p className="t-nota">El capítulo no avanza solo: marcá dónde quedaste. Lo que sigue se agenda solo.</p>
      {libros.map((l) => <Libro key={l.id} a={l} date={date} />)}
    </div>
  );
}

function Libro({ a, date }: { a: Activity; date: string }) {
  const study = useStore((s) => s.study);
  const caps = capitulosEnJuego(study, a, date);
  return (
    <section className="es-estado-libro" aria-label={actShort(a)}>
      <div className="es-estado-cab">
        <h3 className="t-rotulo">{actShort(a)}</h3>
        <Boton variante="fantasma" tamano="s" onClick={() => { cerrarEstadoEstudio(); ir(`estudio/mate/libro/${a.id}`); }}>Ver el libro</Boton>
      </div>
      {caps.length === 0 ? <p className="t-nota">Nada en juego hoy.</p> : caps.map((c) => <Capitulo key={c.n} a={a} c={c} date={date} />)}
    </section>
  );
}

function Capitulo({ a, c, date }: { a: Activity; c: InfoCap; date: string }) {
  const nombre = `${a.unitLabel ?? 'Cap.'} ${c.n} · ${c.unit.title}`;
  const listo = (titulo: string, sub: string) => aviso({ titulo, sub, tono: 'hecho' });
  const sigue = (getState().days[date]?.studyDone ?? []).includes(`learn:${a.id}:${c.n}`);
  const abrir = (ruta: string) => { cerrarEstadoEstudio(); ir(ruta); };
  return (
    <div className="capa-1 es-estado-cap">
      <p className="es-estado-nombre"><b className="t-cuerpo">{nombre}</b><span className="t-rotulo">{c.etiqueta}</span></p>
      <div className="es-estado-botones">
        {c.estado === 'estudiando' && (
          <>
            <Boton variante="secundario" icono={sigue ? 'tilde' : undefined} onClick={() => { seguirEstudiando(date, a.id, c.n); listo('Sigue el mismo capítulo', `${nombre}: mañana continúa, sin test todavía`); }}>Sigo estudiándolo</Boton>
            <Boton variante="secundario" onClick={() => {
              const e = terminarEstudio(date, a.id, c.n);
              if (e) { aviso({ titulo: e, sub: 'Una frase por capítulo, en el libro', tono: 'atencion' }); return; }
              listo('Capítulo estudiado', 'Mañana: cold recall y test completo');
            }}>Lo terminé · test mañana</Boton>
          </>
        )}
        {(c.estado === 'test' || c.estado === 'retest') && (
          <>
            <Boton variante="secundario" onClick={() => abrir(`test/${a.id}/${c.n}`)}>Cargar el test</Boton>
            {c.estado === 'test' && !c.tests.length && (
              <Boton variante="fantasma" onClick={() => { if (volverAEstudiar(a.id, c.n)) listo('Volvió a "estudiando"', `${nombre}: se sacaron el cold recall y el test`); }}>Todavía no lo terminé</Boton>
            )}
          </>
        )}
        {c.estado === 'tesis' && c.tesis && <Boton variante="secundario" icono="editar" onClick={() => abrir(`tesis/${c.tesis!.id}`)}>Escribir la tesis</Boton>}
      </div>
    </div>
  );
}
