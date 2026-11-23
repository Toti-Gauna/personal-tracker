/**
 * Trazo 2.0 · Pomodoros (#/pomodoros): los que tenés, con a qué bloque van, y armar uno a medida en una hoja. Borrar se puede
 * deshacer (vuelve con su lugar y con los bloques a los que estaba asignado).
 */
import { useState } from 'react';
import { BLOCKS } from '../../data/defaults';
import { DEFAULT_SOUNDS, SOUNDS } from '../../data/sounds';
import { presetLabel, presetPattern } from '../../data/pomodoro';
import type { Preset } from '../../data/types';
import { deletePreset, savePreset, setState, useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Contador, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { Etiquetado, Tramos } from './piezas';
import './ajustes.css';

const titulo = (key: string) => BLOCKS.find((b) => b.key === key)?.title.split(' · ')[0] ?? key;

const INFO = (
  <>
    <p className="t-cuerpo-l">Un pomodoro es cuánto te concentrás, cuánto descansás y cuántas veces lo repetís.</p>
    <p className="t-cuerpo">La barra muestra un ciclo: lleno es concentración, rayado es descanso. Podés asignarle uno a cada bloque; al entrar en foco, Trazo lo ajusta a los minutos que quedan.</p>
    <p className="t-cuerpo">El descanso largo, si lo ponés, reemplaza al último descanso del ciclo.</p>
  </>
);

/** Vuelve un pomodoro borrado a su lugar, con los bloques que lo usaban. */
function restaurar(p: Preset, indice: number, claves: string[]) {
  setState((s) => {
    if (!s.settings) return s;
    const otros = s.settings.presets.filter((x) => x.id !== p.id);
    const presets = [...otros.slice(0, indice), p, ...otros.slice(indice)];
    return { ...s, settings: { ...s.settings, presets, blockPresets: { ...s.settings.blockPresets, ...Object.fromEntries(claves.map((k) => [k, p.id])) } } };
  });
}

export default function PomodorosV2(_: PropsV2) {
  const settings = useStore((s) => s.settings)!;
  const enFoco = useStore((s) => !!s.focus);
  const [nuevo, setNuevo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [focus, setFocusMin] = useState(45);
  const [rest, setRest] = useState(10);
  const [cycles, setCycles] = useState(2);
  const [longRest, setLongRest] = useState(0);
  const [asignar, setAsignar] = useState('');
  const sonido = SOUNDS[(settings.sounds ?? DEFAULT_SOUNDS).events.pomodoro].name;

  const clavesDe = (id: string) => Object.entries(settings.blockPresets).filter(([, v]) => v === id).map(([k]) => k);

  const guardar = () => {
    const name = nombre.trim() || `${focus}/${rest}`;
    savePreset({ name, focus, rest, cycles, longRest: longRest || undefined }, asignar || undefined);
    aviso({ titulo: 'Pomodoro guardado', sub: asignar ? `${name} · asignado a ${titulo(asignar)}` : name, tono: 'hecho' });
    setNombre('');
    setNuevo(false);
  };

  const borrar = (p: Preset, indice: number) => {
    const claves = clavesDe(p.id);
    deletePreset(p.id);
    aviso({ titulo: 'Pomodoro borrado', sub: p.name, deshacer: () => restaurar(p, indice, claves) });
  };

  return (
    <Marco className="ax" titulo="Pomodoros" volver={enFoco ? { href: '#/foco', nombre: 'Foco' } : { href: '#/hoy', nombre: 'Hoy' }} info={INFO}
      acciones={settings.presets.length > 0 ? <Boton tamano="s" variante="primario" icono="mas" onClick={() => setNuevo(true)}>Nuevo</Boton> : undefined}>
      {settings.presets.length === 0 ? (
        <Vacio ilustracion="foco" titulo="Sin pomodoros propios" texto="Armá uno con tu ritmo y asignalo a un bloque."
          accion={<Boton variante="primario" icono="mas" onClick={() => setNuevo(true)}>Nuevo pomodoro</Boton>} />
      ) : (
        <Grupo titulo="Tus pomodoros">
          <ul className="capa-1 ax-presets">
            {settings.presets.map((p, i) => {
              const a = clavesDe(p.id).map(titulo);
              return (
                <li key={p.id}>
                  <div className="ax-preset-cab"><b className="t-cuerpo-l">{p.name}</b><span className="t-dato">{presetLabel(p)}</span></div>
                  <Tramos segs={presetPattern(p)} nombre={p.name} area="var(--texto)" />
                  <div className="ax-preset-pie">
                    <span className="t-nota">{a.length ? `Asignado a: ${a.join(', ')}` : 'Sin asignar'}</span>
                    <Boton soloIcono variante="fantasma" icono="borrar" etiqueta={`Borrar ${p.name}`} onClick={() => borrar(p, i)} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Grupo>
      )}
      <div className="capa-1 s-lista"><Fila icono="sonido" titulo="Sonido al terminar" nota={sonido} href="#/sonidos" /></div>

      <Hoja abierta={nuevo} onCerrar={() => setNuevo(false)} titulo="Nuevo pomodoro"
        pie={<><Boton onClick={() => setNuevo(false)}>Cancelar</Boton><Boton variante="primario" icono="tilde" onClick={guardar}>Guardar pomodoro</Boton></>}>
        <CampoTexto etiqueta="Nombre (opcional)" valor={nombre} onCambio={setNombre} placeholder={`${focus}/${rest}`} />
        <Etiquetado etiqueta="Concentración"><Contador etiqueta="Concentración en minutos" valor={focus} onCambio={setFocusMin} min={5} max={180} paso={5} unidad="min" /></Etiquetado>
        <Etiquetado etiqueta="Descanso"><Contador etiqueta="Descanso en minutos" valor={rest} onCambio={setRest} min={0} max={30} paso={5} unidad="min" /></Etiquetado>
        <Etiquetado etiqueta="Ciclos"><Contador etiqueta="Ciclos" valor={cycles} onCambio={setCycles} min={1} max={8} /></Etiquetado>
        <Etiquetado etiqueta="Descanso largo"><Contador etiqueta="Descanso largo en minutos" valor={longRest} onCambio={setLongRest} min={0} max={45} paso={5} unidad="min" /></Etiquetado>
        <p className="t-nota">Con 0 no hay descanso largo.</p>
        <Selector etiqueta="Asignar a" valor={asignar} onCambio={setAsignar} opciones={[{ valor: '', etiqueta: 'Ningún bloque' }, ...BLOCKS.map((b) => ({ valor: b.key, etiqueta: b.title }))]} />
        <div className="ax-previa">
          <span className="t-rotulo">Un ciclo</span>
          <Tramos segs={presetPattern({ id: 'x', name: '', focus, rest, cycles, longRest })} nombre="Vista previa" area="var(--texto)" />
        </div>
      </Hoja>
    </Marco>
  );
}
