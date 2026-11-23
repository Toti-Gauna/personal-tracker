/**
 * Trazo 2.0 · actividad de estudio (#/actividad y #/actividad/<id>): cualquier cosa que estudies (un libro, un curso, práctica o un
 * video) entra en tu día y en el repaso. Un formulario con los controles de la 2.0; guarda con `saveActivity` y borra con
 * `deleteActivity` (con deshacer), igual que la 1.0.
 */
import { useState } from 'react';
import { BLOCKS } from '../../data/defaults';
import { AREAS_ESTUDIO, UNIDAD_POR_AREA } from '../../data/libros';
import { newId } from '../../data/schedule';
import { minutesFor } from '../../data/study-catalog';
import type { ActType, Activity } from '../../data/study-types';
import { fmtDur } from '../../data/time';
import type { Area } from '../../data/types';
import { ir } from '../../lib/routes';
import { useStore } from '../../state/store';
import { addFront, deleteActivity, saveActivity } from '../../state/study';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Chip, Contador, Interruptor, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import '../tokens.css';
import './sesiones.css';

const TIPOS: { id: ActType; name: string; unit: string }[] = [
  { id: 'lectura', name: 'Lectura', unit: 'págs' },
  { id: 'curso', name: 'Curso', unit: 'lecciones' },
  { id: 'practica', name: 'Práctica', unit: 'min' },
  { id: 'video', name: 'Video', unit: 'videos' },
  { id: 'otra', name: 'Otra', unit: 'min' },
];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const COLORES: Area[] = ['ing', 'salud', 'handyx', 'eclipse', 'rutina', 'economia'];
const NUEVO = '__nuevo';

const INFO = (
  <>
    <p className="t-cuerpo-l">Cualquier cosa que estudies: un libro, un curso, práctica o un video. Entra en tu día y en el repaso.</p>
    <p className="t-cuerpo">El área dice qué es una unidad: en matemática, 1 capítulo; en programación, 1 bloque del curso; en lenguajes, 1 capítulo o unidad; en libros, 2 capítulos.</p>
    <p className="t-cuerpo">Cada unidad se estudia, al día siguiente va el test (se aprueba con 85 %) y después la tesis.</p>
  </>
);

export default function ActividadV2({ ruta }: PropsV2) {
  const id = ruta.param || undefined;
  const study = useStore((s) => s.study);
  const prev = study.activities.find((x) => x.id === id);
  const [a, setA] = useState<Activity>(
    prev ?? { id: `a${newId()}`, title: '', front: study.fronts[2]?.id ?? study.fronts[0].id, type: 'lectura', perSession: 20, total: 300, unit: 'págs', days: [0, 2, 4], block: 'cierre', engine: true, progress: 0, testMode: 'app' },
  );
  const [nuevo, setNuevo] = useState<string | null>(null);
  const set = (p: Partial<Activity>) => setA((x) => ({ ...x, ...p }));
  const titulo = a.title.trim();
  const motivo = !titulo ? 'Poné qué vas a estudiar.' : !a.days.length ? 'Elegí al menos un día.' : false;

  const guardar = () => {
    saveActivity({ ...a, title: titulo });
    aviso({ titulo: prev ? 'Actividad guardada' : 'Actividad nueva', sub: `${titulo} · ${a.days.map((d) => DIAS[d]).join(' ')}`, tono: 'hecho' });
    ir('estudio');
  };
  const borrar = () => {
    if (!prev) return;
    deleteActivity(prev.id);
    aviso({ titulo: 'Actividad borrada', sub: prev.title, tono: 'info', deshacer: () => saveActivity(prev) });
    ir('estudio');
  };
  const crearFrente = () => {
    const n = nuevo?.trim();
    if (n) set({ front: addFront(n, COLORES[study.fronts.length % COLORES.length]) });
    setNuevo(null);
  };
  const por = a.unit.toLowerCase().startsWith('pág') ? 5 : 1;

  return (
    <Marco titulo="Actividad de estudio" rotulo={prev ? 'Editar' : 'Nueva'} volver={{ href: '#/estudio', nombre: 'Estudio' }} info={INFO} className="se-form">
      <CampoTexto etiqueta="Qué vas a estudiar" valor={a.title} onCambio={(v) => set({ title: v })} placeholder="Leer Make It Stick" />

      <Selector etiqueta="Frente" valor={a.front} onCambio={(v) => (v === NUEVO ? setNuevo('') : set({ front: v }))}
        opciones={[...study.fronts.map((f) => ({ valor: f.id, etiqueta: f.name })), { valor: NUEVO, etiqueta: '+ Nuevo frente', nota: 'Un grupo propio de estudio' }]} />

      <div className="se-campo-grupo" role="group" aria-label="Área">
        <span className="k-campo-etiqueta">Área · qué es una unidad</span>
        <div className="se-chips">
          {AREAS_ESTUDIO.map((x) => (
            <Chip key={x} activo={a.area === x} onCambio={() => set({ area: a.area === x ? undefined : x, unitLabel: a.units ? a.unitLabel : UNIDAD_POR_AREA[x].label })}>{UNIDAD_POR_AREA[x].nombre}</Chip>
          ))}
        </div>
        <small className="t-nota">{a.area ? `Una unidad es ${UNIDAD_POR_AREA[a.area].unidad}.` : 'Sin área, se estudia sin test por unidad.'}</small>
      </div>

      {!prev?.units && (
        <>
          <div className="se-campo-grupo" role="group" aria-label="Tipo">
            <span className="k-campo-etiqueta">Tipo</span>
            <div className="se-chips">
              {TIPOS.map((t) => <Chip key={t.id} activo={a.type === t.id} onCambio={() => set({ type: t.id, unit: t.unit })}>{t.name}</Chip>)}
            </div>
          </div>
          <div className="se-campo-grupo">
            <span className="k-campo-etiqueta">Por sesión</span>
            <Contador etiqueta="Por sesión" valor={a.perSession} min={0} paso={por} unidad={a.unit} onCambio={(v) => set({ perSession: v })} />
            <small className="t-nota">Unas {fmtDur(minutesFor(a))} por sesión</small>
          </div>
          <div className="se-campo-grupo">
            <span className="k-campo-etiqueta">Total</span>
            <Contador etiqueta="Total" valor={a.total} min={0} paso={por * 2} unidad={a.unit} onCambio={(v) => set({ total: v })} />
            <small className="t-nota">Llevás {a.progress} {a.unit}</small>
          </div>
        </>
      )}

      <div className="se-campo-grupo" role="group" aria-label="Cuándo">
        <span className="k-campo-etiqueta">Cuándo</span>
        <div className="se-dias">
          {DIAS.map((d, i) => (
            <button key={d} type="button" aria-pressed={a.days.includes(i)} aria-label={`${d}, ${DIAS_LARGO[i].toLowerCase()}`} onClick={() => set({ days: a.days.includes(i) ? a.days.filter((x) => x !== i) : [...a.days, i].sort() })}>{d}</button>
          ))}
        </div>
      </div>

      <Selector etiqueta="En el bloque" valor={a.block} onCambio={(v) => set({ block: v })}
        opciones={BLOCKS.map((b) => ({ valor: b.key, etiqueta: `${b.fixed ?? ''} ${b.title}`.trim(), nota: fmtDur(b.min) }))} />

      <div className="capa-1 se-interruptores">
        <Interruptor prendido={a.engine} onCambio={(v) => set({ engine: v })} etiqueta="Pasar por el motor de repaso"
          nota={`Cold recall al día siguiente${a.units ? ', tesis a +3 y ejercicios a +7, +21 y +60' : ''}`} />
        {a.units && <Interruptor prendido={a.testMode === 'papel'} onCambio={(v) => set({ testMode: v ? 'papel' : 'app' })} etiqueta="Test en papel" nota="Si no, lo cargás en la app" />}
      </div>

      <div className="se-acciones">
        <Boton variante="primario" ancho icono="tilde" deshabilitado={motivo} onClick={guardar}>Guardar actividad</Boton>
        {prev && <Boton variante="peligro" ancho icono="borrar" onClick={borrar}>Borrar actividad</Boton>}
      </div>

      <Hoja abierta={nuevo != null} onCerrar={() => setNuevo(null)} titulo="Nuevo frente"
        pie={<Boton variante="primario" ancho icono="mas" deshabilitado={nuevo?.trim() ? false : 'Poné un nombre.'} onClick={crearFrente}>Crear frente</Boton>}>
        <div className="se-hoja"><CampoTexto etiqueta="Nombre del frente" valor={nuevo ?? ''} onCambio={setNuevo} placeholder="Ej.: Finanzas" /></div>
      </Hoja>
    </Marco>
  );
}
