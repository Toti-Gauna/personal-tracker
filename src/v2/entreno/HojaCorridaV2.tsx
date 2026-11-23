/**
 * Trazo 2.0 · la corrida del día: tiempo, distancia (opcional, con el ritmo al lado), tipo y cómo te sentiste. Se abre al tildar
 * "Correr" o con + en la meta, y corrige la de hoy si ya la cargaste. Escribe lo mismo de siempre (`addRun`).
 */
import { useState } from 'react';
import { FEEL_LABEL, fmtPace, runOn, runWeek, RUN_LABEL } from '../../data/train';
import { RUN_KINDS, type Run, type RunKind } from '../../data/train-types';
import { addRun } from '../../state/train';
import { useStore } from '../../state/store';
import { cerrarHojas } from '../../ui/checkins';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Contador, Segmentado } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { cuantos } from '../reglas';
import './entreno.css';

const num = (t: string) => Number(t.replace(',', '.'));
const fmt = (n: number) => String(n).replace('.', ',');
const SENSACIONES: [string, string][] = [1, 2, 3, 4, 5].map((n) => [String(n), String(n)]);

export function HojaCorridaV2({ date, abierta }: { date: string | null; abierta: boolean }) {
  const hoy = useStore((s) => (date ? runOn(s.train.runs, date) : undefined));
  return (
    <Hoja abierta={abierta} onCerrar={cerrarHojas} titulo={hoy ? 'Corregir la de hoy' : '¿Cuánto corriste?'}>
      {date && <Formulario key={date} date={date} />}
    </Hoja>
  );
}

function Formulario({ date }: { date: string }) {
  const runs = useStore((s) => s.train.runs);
  const hoy = runOn(runs, date);
  const ultima = [...runs].sort((a, b) => a.date.localeCompare(b.date)).pop();
  const [min, setMin] = useState<number | null>(hoy?.min ?? ultima?.min ?? 30);
  const [km, setKm] = useState(hoy?.km != null ? fmt(hoy.km) : '');
  const [kind, setKind] = useState<RunKind>(hoy?.kind ?? ultima?.kind ?? 'suave');
  const [feel, setFeel] = useState<Run['feel']>(hoy?.feel ?? 3);
  const m = Math.round(min ?? 0);
  const k = km.trim() ? num(km) : undefined;
  const ritmo = fmtPace(m, k);
  const kmMal = k != null && !(k > 0 && k < 200);
  const valido = m >= 1 && m <= 600 && !kmMal;

  const guardar = () => {
    if (!valido) return;
    addRun({ date, min: m, ...(k ? { km: k } : {}), kind, feel });
    const sem = runWeek([...runs.filter((r) => r.date !== date), { date, min: m, kind, feel }], date);
    aviso({ titulo: `Corrida guardada · ${m} min${k ? ` · ${fmt(k)} km` : ''}`, sub: `${cuantos(sem.n, 'corrida', 'corridas')} esta semana · ${sem.min} min${ritmo ? ` · ${ritmo} /km` : ''}`, tono: 'hecho' });
    cerrarHojas();
  };

  return (
    <form className="en-corrida" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
      <div className="en-corrida-campo">
        <span className="k-campo-etiqueta">Tiempo</span>
        <Contador etiqueta="Tiempo" valor={min} onCambio={setMin} min={5} max={600} paso={5} unidad="min" />
      </div>
      <CampoTexto etiqueta="Distancia · km, opcional" modo="decimal" valor={km} onCambio={(t) => setKm(t.replace(/[^\d.,]/g, ''))} placeholder="5,2"
        nota={ritmo ? `Ritmo ${ritmo} /km` : undefined} error={kmMal ? 'Entre 0 y 200 km.' : undefined} />
      <Segmentado etiqueta="Tipo" valor={kind} onCambio={setKind} opciones={RUN_KINDS.map((x) => [x, RUN_LABEL[x]] as [RunKind, string])} />
      <div className="en-corrida-campo">
        <span className="k-campo-etiqueta">Cómo te sentiste · {FEEL_LABEL[feel].toLowerCase()}</span>
        <Segmentado etiqueta="Cómo te sentiste" valor={String(feel)} onCambio={(v) => setFeel(Number(v) as Run['feel'])} opciones={SENSACIONES} />
      </div>
      <div className="en-corrida-acciones">
        <Boton variante="primario" ancho tipo="submit" icono="tilde" deshabilitado={valido ? false : kmMal ? 'Revisá la distancia.' : 'Cargá el tiempo.'}>Guardar corrida</Boton>
        <Boton variante="fantasma" ancho onClick={cerrarHojas}>Después</Boton>
      </div>
    </form>
  );
}
