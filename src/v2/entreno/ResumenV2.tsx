/**
 * Trazo 2.0 · el resumen de un entreno (#/entreno-resumen/<id>): la figura encendida con lo que trabajaste, los números,
 * los récords y lo que toca la próxima vez. La nota se guarda al salir del campo.
 */
import { fmtKg, nextFor, sessionsInWeek, volume } from '../../data/train';
import { REST_DAY } from '../../data/train-catalog';
import { fmtFecha } from '../../data/time';
import { useStore } from '../../state/store';
import { setNote } from '../../state/train';
import { Boton } from '../kit/controles';
import { Dato, Estado, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { CampoAlSalir } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { Cuerpo, enPalabras } from './Cuerpo';
import { indiceEjercicios, luzDeRutina } from './musculos';
import '../proyecto/proyecto.css';
import './entreno.css';

const kgs = (n: number) => Math.round(n).toLocaleString('es-AR');

export default function ResumenV2({ ruta }: PropsV2) {
  const t = useStore((s) => s.train);
  const names = useStore((s) => s.settings!.names);
  const s = t.sessions.find((x) => x.id === ruta.param);
  if (!s) {
    return (
      <Marco className="en" titulo="Resumen" volver={{ href: '#/entreno', nombre: 'Entreno' }}>
        <Vacio ilustracion="datos" titulo="No encontré ese entreno" texto="Los resúmenes se abren al terminar una sesión." accion={<Boton variante="primario" href="#/entreno">Ir a Entreno</Boton>} />
      </Marco>
    );
  }
  const r = t.routines.find((x) => x.id === s.routineId);
  const indice = indiceEjercicios(t.routines);
  const hechos = [...new Set(s.sets.map((x) => x.ex))].flatMap((id) => { const e = indice.get(id); return e ? [e] : []; });
  const luz = luzDeRutina({ exercises: hechos });
  const planeadas = t.plan.days.filter((d) => d && d !== REST_DAY).length;
  // Lo próximo se calcula sobre el historial completo, que ya incluye esta sesión.
  const prox = r ? nextFor(t, r, s.athletes, s.date).filter((p) => p.target.kind !== 'nuevo') : [];
  const interesantes = prox.filter((p) => ['sube', 'baja', 'mantiene', 'falta'].includes(p.target.kind));
  const lista = (interesantes.length ? interesantes : prox).slice(0, 4);
  const dos = s.athletes.length > 1;

  return (
    <Marco className="en" titulo={s.routineName} rotulo={fmtFecha(s.date)} volver={{ href: '#/entreno', nombre: 'Entreno' }}>
      <Tarjeta heroe area="var(--a-salud)" className="en-hoy" etiqueta="Sesión terminada">
        <div className="en-hoy-cab"><span className="t-rotulo">Sesión terminada</span><Estado estado="hecho" /></div>
        <Cuerpo luz={luz} tono="hecho" alto={208} nombre={`Trabajaste ${enPalabras(luz)}.`} />
        <div className="en-numeros">
          <Dato valor={s.minutes} unidad="min" etiqueta="Duración" />
          <Dato valor={`${sessionsInWeek(t, s.date).length}/${planeadas}`} etiqueta="Semana" />
          <Dato valor={kgs(volume(s.sets, 'me'))} unidad="kg" etiqueta="Movidos" />
        </div>
        {dos && <p className="t-nota">{names.partner} movió {kgs(volume(s.sets, 'partner'))} kg.</p>}
        {s.deload && <p className="t-nota">Semana de descarga: mismo peso y la mitad de las series. No cuenta para la progresión.</p>}
      </Tarjeta>

      <Grupo titulo="Récords" extremo={<span className="t-rotulo">{s.records.length || 'Ninguno'}</span>}>
        {s.records.length > 0 ? (
          <ul className="capa-1 pt-revs">
            {s.records.map((x) => (
              <li key={`${x.who}${x.ex}`}>
                <span className="t-rotulo">{dos ? `${names[x.who]} · ` : ''}{x.text}</span>
                <span className="t-cuerpo">{x.name}</span>
                <b className="t-dato en-marca">{fmtKg(x.kg)} kg × {x.reps}</b>
              </li>
            ))}
          </ul>
        ) : <p className="t-nota">La primera vez de cada ejercicio fija la marca.</p>}
      </Grupo>

      {s.skipped.length > 0 && (
        <Grupo titulo="Quedaron">
          <p className="t-cuerpo en-quedaron">{s.skipped.map((id) => indice.get(id)?.name ?? id).join(', ')}.</p>
          <p className="t-nota">Pasan al principio de la próxima {s.routineName}. No cuentan como falla.</p>
        </Grupo>
      )}

      {lista.length > 0 && (
        <Grupo titulo="La próxima" extremo={<a className="pt-enlace t-nota" href="#/entreno-motor">Ver todo</a>}>
          <ul className="capa-1 pt-revs">
            {lista.map((p) => (
              <li key={`${p.who}${p.ex.id}`}>
                <span className="t-rotulo">{dos ? `${names[p.who]} · ` : ''}{p.target.note}</span>
                <span className="t-cuerpo">{p.ex.name}</span>
                <b className="t-dato">{p.target.kind === 'sube' ? `${fmtKg(p.last?.kg ?? 0)} → ${fmtKg(p.target.kg)} kg` : `${fmtKg(p.target.kg)} kg × ${p.target.reps.join(' ')}`}</b>
              </li>
            ))}
          </ul>
        </Grupo>
      )}

      <Grupo titulo="Nota">
        <CampoAlSalir etiqueta="Nota de la sesión" valor={s.note} guardar={(v) => setNote(s.id, v)} placeholder="Rodilla bien. Subir sentadilla el lunes." multilinea />
        <div className="pt-acciones"><Boton variante="primario" icono="hoy" href="#/hoy">Volver a Hoy</Boton></div>
      </Grupo>
    </Marco>
  );
}
