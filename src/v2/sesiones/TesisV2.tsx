/**
 * Trazo 2.0 · la micro-tesis (#/tesis/<id>): el día 3, al día siguiente de aprobar el test, empezando por sus errores. Tres pasos:
 * escribirla con tus palabras, practicar tres problemas y revisar las tarjetas que salen de las líneas con `::` o `[[ ]]`. Guarda con
 * `saveTesis`, igual que la 1.0.
 */
import { useMemo, useState } from 'react';
import { cardsFromText, tesisStart, unitState } from '../../data/study';
import { fmtFecha } from '../../data/time';
import { useStore } from '../../state/store';
import { saveTesis } from '../../state/study';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Casilla, Segmentado } from '../kit/controles';
import { Fila, Vacio } from '../kit/superficies';
import { Grupo } from '../marco/Marco';
import { haptico } from '../movimiento/movimiento';
import type { PropsV2 } from '../registro';
import { Inmersiva, areaDeFrente, plural } from './comun';

type Paso = 'escribir' | 'practicar' | 'tarjetas';
const PASOS: [Paso, string][] = [['escribir', '1 · Escribir'], ['practicar', '2 · Practicar'], ['tarjetas', '3 · Tarjetas']];

const INFO = (
  <>
    <p className="t-cuerpo-l">La tesis es lo que explicarías sin mirar: el capítulo en tus palabras.</p>
    <p className="t-cuerpo">Empezá por lo que fallaste en el test. Las líneas con :: (pregunta :: respuesta) o con [[ ]] se vuelven tarjetas.</p>
    <p className="t-cuerpo">En papel: la escribís en tu cuaderno, le sacás una foto y se la mandás a Claude. Te la devuelve pasada a texto y con las tarjetas listas para pegar acá.</p>
    <p className="t-cuerpo">Si todavía no vence, ese día va en tu sesión, después del test y antes del capítulo nuevo.</p>
  </>
);

export default function TesisV2({ ruta, day }: PropsV2) {
  const itemId = ruta.param;
  const study = useStore((s) => s.study);
  const item = study.reviews.find((r) => r.id === itemId && r.kind === 'tesis');
  const prev = study.tesis.find((t) => t.itemId === itemId);
  const a = study.activities.find((x) => x.id === item?.activityId);
  const [modo, setModo] = useState<'app' | 'papel'>(prev?.mode ?? 'app');
  const [paso, setPaso] = useState<Paso>('escribir');
  const [texto, setTexto] = useState(prev?.text ?? '');
  const [practica, setPractica] = useState<boolean[]>(prev?.practice ?? [false, false, false]);
  const detectadas = useMemo(() => cardsFromText(texto), [texto]);
  const [fuera, setFuera] = useState<Set<number>>(new Set());

  if (!item || !a) {
    return (
      <Inmersiva titulo="Tesis" salir={{ href: '#/estudio', nombre: 'Estudio' }}>
        <Vacio ilustracion="buscar" titulo="No encontré esa tesis" texto="Puede que ya la hayas guardado." accion={<Boton variante="primario" href="#/estudio">Ir a Estudio</Boton>} />
      </Inmersiva>
    );
  }
  const front = study.fronts.find((f) => f.id === a.front);
  const area = areaDeFrente(study, a.front);
  const titulo = item.label.replace(/^Tesis · /, '');
  const vence = item.due > day.date;
  const tests = item.unit != null ? unitState(study, a.id, item.unit).tests : [];
  const inicio = tesisStart(tests.find((t) => t.approved) ?? tests[tests.length - 1]);
  const elegidas = detectadas.filter((_, i) => !fuera.has(i));
  const mazo = front?.name ?? 'General';
  const i = PASOS.findIndex(([p]) => p === paso);

  const guardar = () => {
    saveTesis(day.date, item.id, { text: texto, mode: modo, practice: practica }, elegidas);
    haptico('exito');
    aviso({ titulo: 'Tesis guardada', sub: `${plural(elegidas.length, 'tarjeta nueva', 'tarjetas nuevas')} en ${mazo}`, tono: 'hecho' });
    history.length > 1 ? history.back() : (location.hash = '#/estudio');
  };
  const siguiente = () => { haptico('leve'); setPaso(PASOS[i + 1][0]); };

  const pie = paso === 'tarjetas'
    ? <Boton variante="primario" ancho icono="tilde" deshabilitado={texto.trim() ? false : 'Escribí la tesis para guardarla.'} onClick={guardar}>Guardar tesis{elegidas.length ? ` y ${plural(elegidas.length, 'tarjeta', 'tarjetas')}` : ''}</Boton>
    : <Boton variante="primario" ancho icono="siguiente" onClick={siguiente}>{paso === 'escribir' ? 'Seguir: practicar' : 'Seguir: tarjetas'}</Boton>;

  return (
    <Inmersiva titulo="Tesis" area={area} salir={{ href: '#/estudio', nombre: 'Estudio' }} info={INFO} pie={pie}>
      <p className="t-rotulo se-kicker">Día 3{vence ? ` · vence el ${fmtFecha(item.due).split(' ').slice(0, 2).join(' ').toLowerCase()}` : ''}</p>
      <h2 className="t-seccion">{titulo}</h2>
      <Segmentado etiqueta="Paso" valor={paso} onCambio={setPaso} opciones={PASOS} />

      {paso === 'escribir' && (
        <>
          {inicio && (
            <div className="capa-2 se-empeza">
              <span className="t-rotulo">Empezá por lo que fallaste</span>
              <p className="t-cuerpo">{inicio}</p>
            </div>
          )}
          <div className="se-cuaderno">
            <CampoTexto etiqueta={modo === 'app' ? 'Explicalo con tus palabras' : 'El texto que te devolvió Claude'} multilinea valor={texto} onCambio={setTexto}
              placeholder={'Los enteros son los naturales, el cero y sus opuestos.\nSumar con signos distintos :: se restan los valores absolutos y queda el signo del mayor.\nRestar un número es sumar su [[opuesto]].'} />
          </div>
          <Segmentado etiqueta="Dónde la escribís" valor={modo} onCambio={setModo} opciones={[['app', 'En la app'], ['papel', 'En papel']]} />
          {detectadas.length > 0 && <p className="t-nota se-tiempo">{plural(detectadas.length, 'tarjeta detectada', 'tarjetas detectadas')}</p>}
        </>
      )}

      {paso === 'practicar' && (
        <>
          <p className="t-cuerpo-l">Resolvé 3 problemas del capítulo sin mirar, explicando cada paso como si se lo contaras a alguien.</p>
          <div className="capa-1 pt-check">
            {practica.map((v, k) => <Casilla key={k} marcada={v} etiqueta={`Problema ${k + 1}`} area={area} onCambio={() => setPractica((p) => p.map((x, j) => (j === k ? !x : x)))} />)}
          </div>
        </>
      )}

      {paso === 'tarjetas' && (
        detectadas.length > 0 ? (
          <Grupo titulo={plural(detectadas.length, 'tarjeta detectada', 'tarjetas detectadas')} extremo={<span className="t-rotulo">Mazo · {mazo}</span>}>
            <div className="capa-1 pt-check">
              {detectadas.map((c, k) => (
                <Casilla key={k} marcada={!fuera.has(k)} festejo={false} etiqueta={c.front} nota={c.back}
                  onCambio={() => setFuera((f) => { const n = new Set(f); if (n.has(k)) n.delete(k); else n.add(k); return n; })} />
              ))}
            </div>
          </Grupo>
        ) : (
          <Vacio ilustracion="escribir" titulo="Todavía no salieron tarjetas" texto="Escribí líneas con :: o con [[ ]] en la tesis y aparecen acá."
            accion={<Boton variante="secundario" icono="editar" onClick={() => setPaso('escribir')}>Volver a la tesis</Boton>} />
        )
      )}

      <Grupo titulo="Más">
        <div className="capa-1 s-lista"><Fila icono="importar" titulo="Pegar un bloque o importar de Anki" href="#/motor/importar" /></div>
      </Grupo>
    </Inmersiva>
  );
}
