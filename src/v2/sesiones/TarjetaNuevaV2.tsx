/**
 * Trazo 2.0 · nueva tarjeta (#/tarjeta-nueva): en segundos, unida a su fuente. Cinco tipos (pregunta, completar, explicar, ejercicio e
 * inversa), el mazo y una vista previa de cómo se va a ver. Guarda con `addCards`, igual que la 1.0.
 */
import { useState } from 'react';
import { MAZOS_V12 } from '../../data/mazos';
import type { CardKind } from '../../data/study-types';
import { useStore } from '../../state/store';
import { addCards } from '../../state/study';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Chip, Interruptor, Selector } from '../kit/controles';
import { Fila } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { haptico } from '../movimiento/movimiento';
import type { PropsV2 } from '../registro';
import { areaDeFrente } from './comun';
import '../proyecto/proyecto.css';
import './sesiones.css';

const TIPOS: [CardKind, string, string, string][] = [
  ['pregunta', 'Pregunta', '¿Por qué restar −5 es sumar 5?', 'Porque restar un número es sumar su opuesto: 3 − (−5) = 3 + 5 = 8.'],
  ['completar', 'Completar', 'Restar un número es sumar su [[opuesto]].', ''],
  ['explicar', 'Explicar', 'Explicá con tus palabras qué es el MCD.', 'El número más grande que divide a los dos sin dejar resto.'],
  ['ejercicio', 'Ejercicio', 'MCD de 12 y 18', '12 = 2² · 3, 18 = 2 · 3² → MCD = 2 · 3 = 6'],
  ['inversa', 'Inversa', 'Divisor común más grande de dos números', 'MCD'],
];

const INFO = (
  <>
    <p className="t-cuerpo-l">Hacé la tarjeta en segundos mientras estudiás.</p>
    <p className="t-cuerpo">Pregunta: un frente y su respuesta. Completar: una frase con lo que falta entre [[ ]]. Explicar: pide tus palabras. Ejercicio: un problema y su resolución. Inversa: la respuesta de un lado y la pregunta del otro.</p>
    <p className="t-cuerpo">Las que salen de tu tesis o de una lectura quedan unidas a su fuente. "También al revés" suma la tarjeta inversa.</p>
  </>
);

export default function TarjetaNuevaV2({ day }: PropsV2) {
  const study = useStore((s) => s.study);
  const hoy = study.cards.filter((c) => c.createdOn === day.date).length;
  const [tipo, setTipo] = useState<CardKind>('pregunta');
  const [frente, setFrente] = useState('');
  const [dorso, setDorso] = useState('');
  const [reves, setReves] = useState(false);
  const [mazo, setMazo] = useState(study.fronts[0]?.id ?? '');
  const [fuente, setFuente] = useState('');
  // v12.1: el mazo dentro del área (un libro de inglés, de matemática, un paper o 20 LLM concepts); vacío, el del área.
  const [sub, setSub] = useState('');
  const t = TIPOS.find((x) => x[0] === tipo)!;
  const front = study.fronts.find((f) => f.id === mazo);
  const area = areaDeFrente(study, mazo);

  const cloze = frente.match(/\[\[(.+?)\]\]/);
  const vista = tipo === 'completar'
    ? { f: frente.replace(/\[\[(.+?)\]\]/g, '___'), b: cloze?.[1] ?? '' }
    : { f: frente, b: dorso };
  const valida = !!(vista.f.trim() && vista.b.trim());
  const motivo = valida ? false : tipo === 'completar' ? 'Escribí la frase y poné entre [[ ]] lo que falta.' : 'Escribí el frente y el dorso.';

  const guardar = (otra: boolean) => {
    if (!valida) return;
    const base = { deck: sub || (front?.name ?? 'General'), frontId: front?.id, source: fuente.trim() };
    const kind: CardKind = tipo === 'inversa' ? 'pregunta' : tipo;
    const drafts: { front: string; back: string; kind: CardKind; deck: string; frontId?: string; source: string }[] = [{ ...base, front: vista.f.trim(), back: vista.b.trim(), kind }];
    if (reves || tipo === 'inversa') drafts.push({ ...base, front: vista.b.trim(), back: vista.f.trim(), kind: 'inversa' });
    const n = addCards(day.date, drafts);
    haptico('exito');
    aviso({ titulo: n === 1 ? 'Tarjeta guardada' : `${n} tarjetas guardadas`, sub: `Mazo ${base.deck}${base.source ? ` · ${base.source}` : ''}`, tono: 'hecho' });
    setFrente('');
    setDorso('');
    if (!otra) history.length > 1 ? history.back() : (location.hash = '#/repaso');
  };

  return (
    <Marco titulo="Nueva tarjeta" rotulo={`${hoy} ${hoy === 1 ? 'hecha' : 'hechas'} hoy`} volver={{ href: '#/repaso', nombre: 'Repaso' }} info={INFO} className="se-form">
      <div className="se-campo-grupo" role="group" aria-label="Tipo de tarjeta">
        <div className="se-chips">
          {TIPOS.map(([id, nombre]) => <Chip key={id} activo={tipo === id} onCambio={() => setTipo(id)}>{nombre}</Chip>)}
        </div>
      </div>

      <CampoTexto etiqueta="Frente" multilinea valor={frente} onCambio={setFrente} placeholder={t[2]}
        nota={tipo === 'completar' ? 'Poné entre [[ ]] lo que tenés que completar.' : undefined} />
      {tipo !== 'completar' && (
        <>
          <CampoTexto etiqueta="Dorso" multilinea valor={dorso} onCambio={setDorso} placeholder={t[3]} />
          <div className="se-extras">
            <Boton tamano="s" variante="secundario" icono="mas" onClick={() => setDorso((d) => `${d}${d ? '\n' : ''}Ejemplo: `)}>Ejemplo</Boton>
            <Boton tamano="s" variante="secundario" icono="mas" onClick={() => setDorso((d) => `${d}${d ? '\n' : ''}Fórmula: `)}>Fórmula</Boton>
          </div>
          {tipo !== 'inversa' && <div className="capa-1 se-interruptores"><Interruptor prendido={reves} onCambio={setReves} etiqueta="También al revés" nota="Suma la tarjeta inversa" /></div>}
        </>
      )}

      <Selector etiqueta="Mazo" valor={mazo} onCambio={(v) => { setMazo(v); setSub(''); }} opciones={study.fronts.map((f) => ({ valor: f.id, etiqueta: f.name }))} />
      {MAZOS_V12[mazo]?.length ? (
        <Selector etiqueta="Dentro de" valor={sub} onCambio={setSub} opciones={[{ valor: '', etiqueta: front?.name ?? 'General' }, ...MAZOS_V12[mazo].map((m) => ({ valor: m, etiqueta: m }))]} />
      ) : null}
      <CampoTexto etiqueta="Fuente" valor={fuente} onCambio={setFuente} placeholder="Tesis cap. 2" />

      <Grupo titulo="Así se va a ver">
        <div className="capa-heroe se-vista" style={{ ['--area' as string]: area }} role="group" aria-label="Vista previa de la tarjeta">
          <p className={`t-seccion se-vista-f${vista.f ? '' : ' ejemplo'}`}>{vista.f || t[2].replace(/\[\[(.+?)\]\]/g, '___')}</p>
          <p className={`t-cuerpo-l se-vista-b${vista.b ? '' : ' ejemplo'}`}>{vista.b || (tipo === 'completar' ? 'opuesto' : t[3])}</p>
        </div>
      </Grupo>

      <div className="se-acciones">
        <Boton variante="primario" ancho icono="tilde" deshabilitado={motivo} onClick={() => guardar(true)}>Guardar y otra</Boton>
        <Boton variante="secundario" ancho deshabilitado={!valida} onClick={() => guardar(false)}>Guardar</Boton>
      </div>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista"><Fila icono="importar" titulo="Pegar muchas o importar de Anki" href="#/motor/importar" /></div>
      </Grupo>
    </Marco>
  );
}
