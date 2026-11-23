/**
 * Trazo 2.0 · una meta nueva (#/meta-nueva/<horizonte>): qué querés lograr, para cuándo, de qué área y de qué rama del plan, sus
 * submetas y cómo se cuenta (tarea, contador o número). Guarda con la misma acción que la 1.0 (`addGoal`).
 */
import { useState } from 'react';
import { AREAS } from '../../data/defaults';
import { HORIZON_LABEL } from '../../data/goals';
import type { GoalType, Horizon } from '../../data/goals-types';
import { enPausa } from '../../data/plan-state';
import { RAMAS, RAMA_NOMBRE } from '../../data/ramas';
import { newId } from '../../data/schedule';
import type { Area, Rama } from '../../data/types';
import { addGoal } from '../../state/goals';
import { useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Interruptor, Segmentado, Selector, type OpcionSelector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { navegar } from '../movimiento/movimiento';
import type { PropsV2 } from '../registro';
import '../proyecto/proyecto.css';
import './metas.css';
import { numeroEscrito } from '../reglas';

const HORIZONTES: Horizon[] = ['dia', 'semana', 'mes', 'bim', 'anio'];
const TIPOS: [GoalType, string, string][] = [
  ['tarea', 'Tarea', 'Se cumple una vez: terminar docs, pagar el alquiler.'],
  ['contador', 'Contador', 'Veces por semana: entrenar 7×, meditar 3×.'],
  ['numero', 'Número', 'Llegar a una cifra: 23 ventas, 100 usuarios.'],
];
/** A qué pestaña de Metas vuelve después de guardar. */
const RUTA: Record<Horizon, string> = { dia: 'semana', semana: 'semana', mes: 'mes', bim: 'bimestre', anio: 'anio' };

const AREAS_OPCIONES = (): OpcionSelector<Area>[] => (Object.keys(AREAS) as Area[]).map((a) => ({ valor: a, etiqueta: AREAS[a].name }));
type RamaElegida = Rama | 'ninguna';
const RAMAS_OPCIONES: OpcionSelector<RamaElegida>[] = [{ valor: 'ninguna', etiqueta: 'Ninguna' }, ...RAMAS.map((r) => ({ valor: r as RamaElegida, etiqueta: RAMA_NOMBRE[r] }))];

const INFO = (
  <>
    <p className="t-cuerpo-l">Una meta propia: se suma al lado de las del plan.</p>
    <ul className="mt-info-lista t-cuerpo">
      {TIPOS.map(([id, nombre, desc]) => <li key={id}><b>{nombre}</b>: {desc}</li>)}
    </ul>
    <p className="t-cuerpo">Con rama, la meta suma al avance de esa rama en la Ruta y aparece en el mapa.</p>
    <p className="t-cuerpo">Con submetas, la meta se cumple al hacer todas. «Mostrar en Hoy» pone un botón en «Sumar a la semana».</p>
    <p className="t-cuerpo">Las metas del día, la semana y el mes se repiten y arrancan de cero; las del bimestre y el año cuentan solo para su período.</p>
  </>
);

export default function NuevaMetaV2({ ruta, today }: PropsV2) {
  const horizon = ruta.param;
  const [titulo, setTitulo] = useState('');
  const [h, setH] = useState<Horizon>(HORIZONTES.includes(horizon as Horizon) ? (horizon as Horizon) : 'semana');
  const [area, setArea] = useState<Area>('salud');
  const [tipo, setTipo] = useState<GoalType>('numero');
  const [meta, setMeta] = useState('10');
  const [unidad, setUnidad] = useState('');
  const [quick, setQuick] = useState(false);
  const [rama, setRama] = useState<RamaElegida>('ninguna');
  const [subs, setSubs] = useState<{ id: string; t: string }[]>([]);
  const [hoja, setHoja] = useState(false);
  const [sub, setSub] = useState('');
  const [diaria, setDiaria] = useState(false);
  const plan = useStore((st) => st.plan);
  const areaEnPausa = area === 'eclipse' && enPausa(plan, 'ventas', today);

  const conSubs = subs.length > 0;
  const porDia = diaria && h === 'semana' && !conSubs && tipo !== 'tarea';
  const target = conSubs ? subs.length : tipo === 'tarea' ? 1 : porDia ? Math.min(7, numeroEscrito(meta) ?? 0) : numeroEscrito(meta) ?? 0; // "10.000 pasos" es diez mil, no diez
  const falta = !titulo.trim() ? 'Escribí qué querés lograr.' : !(target > 0) ? 'Poné a cuánto querés llegar.' : false;

  const guardar = () => {
    if (falta) return;
    addGoal({ title: titulo.trim(), area, horizon: h, type: tipo, target, subs, daily: porDia, unit: tipo === 'tarea' ? undefined : unidad.trim() || undefined, quick: quick && tipo !== 'tarea' && !conSubs && !porDia && (h === 'dia' || h === 'semana'), ...(rama !== 'ninguna' ? { rama } : {}) }, today);
    aviso({ titulo: 'Meta guardada', sub: `${titulo.trim()} · ${HORIZON_LABEL[h].toLowerCase()}`, tono: 'hecho' });
    void navegar(`#/metas/${RUTA[h]}`);
  };
  const agregarSub = () => {
    const t = sub.trim();
    if (!t) return false;
    setSubs((x) => [...x, { id: newId(), t }]);
    setSub('');
    return true;
  };

  return (
    <Marco className="mt" titulo="Nueva meta" volver={{ href: '#/metas', nombre: 'Plan' }} info={INFO}>
      <div className="mt-form">
        <CampoTexto etiqueta="¿Qué querés lograr?" valor={titulo} onCambio={setTitulo} placeholder="Ventas de Roofy" />
        <Segmentado etiqueta="Horizonte" valor={h} opciones={HORIZONTES.map((x) => [x, HORIZON_LABEL[x]] as [Horizon, string])} onCambio={setH} />
        <Selector etiqueta="Área" valor={area} opciones={AREAS_OPCIONES()} onCambio={setArea} />
        {areaEnPausa && <p className="t-nota mt-aviso">Eclipse está en stand-by: la meta se guarda, pero no se ve en Semana hasta que lo retomes. Elegí otra área para verla ahora.</p>}
        <Selector etiqueta="Rama del plan (opcional)" valor={rama} opciones={RAMAS_OPCIONES} onCambio={setRama} />

        <Grupo titulo="Submetas" extremo={<span className="t-rotulo">Opcional</span>}>
          <div className="capa-1 s-lista">
            {subs.map((x, i) => (
              <div key={x.id} className="mt-sub-fila">
                <span className="t-dato mt-sub-n">{i + 1}</span>
                <span className="t-cuerpo">{x.t}</span>
                <Boton soloIcono tamano="s" variante="fantasma" icono="borrar" etiqueta={`Quitar ${x.t}`} onClick={() => setSubs((v) => v.filter((y) => y.id !== x.id))} />
              </div>
            ))}
            <Fila icono="mas" titulo="Agregar submeta" nota={conSubs ? `Se cumple al hacer las ${subs.length}.` : 'Pasos que se tildan dentro de la meta.'} onClick={() => setHoja(true)} />
          </div>
        </Grupo>

        {!conSubs && (
          <>
            <Segmentado etiqueta="Tipo de meta" valor={tipo} opciones={TIPOS.map(([id, n]) => [id, n] as [GoalType, string])} onCambio={setTipo} />
            <p className="t-nota">{TIPOS.find(([id]) => id === tipo)![2]}</p>
          </>
        )}
        {!conSubs && tipo !== 'tarea' && (
          <div className="mt-dos">
            <CampoTexto etiqueta="Llegar a" valor={meta} modo="decimal" onCambio={(v) => setMeta(v.replace(/[^\d.,]/g, ''))} />
            <CampoTexto etiqueta="Unidad" valor={unidad} onCambio={setUnidad} placeholder="ventas" />
          </div>
        )}
        {!conSubs && tipo === 'contador' && h === 'semana' && <Interruptor prendido={diaria} onCambio={setDiaria} etiqueta="Marcar día por día" nota="Una tira L M X J V S D: tocás cada día que lo cumplís." />}
        {!conSubs && tipo !== 'tarea' && (h === 'dia' || h === 'semana') && <Interruptor prendido={quick} onCambio={setQuick} etiqueta="Mostrar en Hoy" nota="Un botón para sumar rápido en «Sumar a la semana»." />}
        <p className="t-nota">{h === 'dia' || h === 'semana' || h === 'mes' ? `Se repite cada ${h === 'dia' ? 'día' : h === 'semana' ? 'semana' : 'mes'} y arranca de cero.` : 'Cuenta solo para este período.'}</p>

        <Boton variante="primario" icono="tilde" ancho deshabilitado={falta} onClick={guardar}>Guardar meta</Boton>
      </div>

      <Hoja abierta={hoja} onCerrar={() => { setHoja(false); setSub(''); }} titulo="Nueva submeta"
        pie={<><Boton variante="primario" deshabilitado={!sub.trim()} onClick={() => { agregarSub(); }}>Agregar y otra</Boton><Boton variante="secundario" onClick={() => { agregarSub(); setHoja(false); }}>{sub.trim() ? 'Agregar y cerrar' : 'Listo'}</Boton></>}>
        <div className="pt-campo-hoja"><CampoTexto etiqueta={`Submeta de ${titulo.trim() || 'la meta'}`} valor={sub} onCambio={setSub} placeholder="Cocinar en casa" /></div>
      </Hoja>
    </Marco>
  );
}
