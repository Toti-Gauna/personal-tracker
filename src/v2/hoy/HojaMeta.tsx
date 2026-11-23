/** Trazo 2.0 · sumar una meta para hoy (surgió algo nuevo): qué es, cuándo y cuánto, y qué pasa con lo que sigue. */
import { useEffect, useState } from 'react';
import type { Modo } from '../../data/editar-dia';
import { RAMA_NOMBRE } from '../../data/ramas';
import { nowMin, toHHMM, toMin } from '../../data/time';
import type { RamaOMain } from '../../data/types';
import { agregarMetaHoy } from '../../state/dia';
import { aviso } from '../kit/capas';
import { Boton, CampoHora, CampoTexto, Contador, Segmentado, Selector, type OpcionSelector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { getState, updateDay } from '../../state/store';

type RamaMeta = RamaOMain | 'ninguna';
const RAMAS: OpcionSelector<RamaMeta>[] = [
  { valor: 'ninguna', etiqueta: 'Fuera del plan' },
  ...(['programacion', 'matematica', 'trabajo', 'ingles', 'handyx', 'salud', 'main'] as RamaOMain[]).map((r) => ({ valor: r as RamaMeta, etiqueta: RAMA_NOMBRE[r] })),
];
const MODOS: [Modo, string][] = [['acortar', 'Acortar lo que sigue'], ['correr', 'Correr lo que sigue']];

export function HojaMeta({ date, abierta, onCerrar }: { date: string; abierta: boolean; onCerrar: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [rama, setRama] = useState<RamaMeta>('ninguna');
  const [start, setStart] = useState('09:00');
  const [min, setMin] = useState<number | null>(60);
  const [pasos, setPasos] = useState('');
  const [modo, setModo] = useState<Modo>('acortar');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!abierta) return;
    setTitulo(''); setRama('ninguna'); setMin(60); setPasos(''); setModo('acortar'); setError('');
    setStart(toHHMM(Math.min(Math.ceil(nowMin() / 5) * 5, 20 * 60 + 30)));
  }, [abierta]);
  const falta = !titulo.trim() ? 'Ponele un nombre.' : !min || min < 5 ? 'La duración mínima es de 5 minutos.' : '';
  const sumar = () => {
    if (falta || !min) return;
    // Sumar una meta acorta o corre las que siguen: Deshacer vuelve el día a como estaba (y la saca).
    const antes = getState().days[date]?.blocks;
    const r = agregarMetaHoy(date, { titulo, rama: rama === 'ninguna' ? undefined : rama, start, min, tareas: pasos.split('\n') }, modo);
    if (!r.ok) { setError(r.error); return; }
    aviso({ titulo: 'Meta sumada a hoy', sub: `${titulo.trim()} · ${start} a ${toHHMM((toMin(start) + min) % (24 * 60))}`, tono: 'hecho', deshacer: antes ? () => updateDay(date, (d) => ({ ...d, blocks: antes })) : undefined });
    onCerrar();
  };
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Meta para hoy"
      pie={<><Boton onClick={onCerrar}>Cancelar</Boton><Boton variante="primario" icono="mas" deshabilitado={falta || false} onClick={sumar}>Sumar a hoy</Boton></>}>
      <CampoTexto etiqueta="Qué es" valor={titulo} onCambio={(v) => { setTitulo(v); setError(''); }} placeholder="Reunión con el cliente" maximo={60} />
      <Selector etiqueta="Rama" valor={rama} opciones={RAMAS} onCambio={setRama} />
      <div className="hb-dos">
        <CampoHora etiqueta="Empieza" valor={start} onCambio={(v) => { setStart(v); setError(''); }} />
        <div className="k-campo"><span className="k-campo-etiqueta">Dura</span><Contador etiqueta="Duración en minutos" valor={min} onCambio={(v) => { setMin(v); setError(''); }} paso={5} min={5} max={720} unidad="min" /></div>
      </div>
      <CampoTexto etiqueta="Pasos (uno por línea, opcional)" valor={pasos} onCambio={setPasos} multilinea />
      <Segmentado etiqueta="Lo que sigue" valor={modo} opciones={MODOS} onCambio={(x) => { setModo(x); setError(''); }} />
      <p className="t-nota">Si cae en medio de una meta, esa se corta ahí. La rutina no cambia: solo hoy.</p>
      {error && <p className="hb-error" role="alert">{error}</p>}
    </Hoja>
  );
}
