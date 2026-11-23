/**
 * Trazo 2.0 · el motor de entreno (#/entreno-motor), explicado por el gráfico: cinco sesiones de un ejercicio. Las barras son las
 * repeticiones de cada serie; cuando las tres llegan al tope, la línea del peso da un escalón y las barras vuelven al mínimo.
 * Abajo, las reglas en una línea cada una y lo que toca la próxima vez, por persona.
 */
import { useState, type CSSProperties } from 'react';
import { fmtKg, nextFor, plannedFor } from '../../data/train';
import { RULES } from '../../data/train-catalog';
import type { Who } from '../../data/train-types';
import { useStore } from '../../state/store';
import { Segmentado } from '../kit/controles';
import { Dato } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import '../proyecto/proyecto.css';
import './entreno.css';

/** Sesiones de ejemplo: press de banca, 3 × 8-10. */
export const EJEMPLO = [
  { kg: 80, reps: [8, 8, 8] },
  { kg: 80, reps: [9, 9, 8] },
  { kg: 80, reps: [10, 10, 9] },
  { kg: 80, reps: [10, 10, 10] },
  { kg: 82.5, reps: [8, 8, 8] },
];
const TOPE = 10;
const MINIMO = 8;
const W = 340;
const H = 196;
const BASE = 150;
const cx = (i: number) => 46 + i * 64;
const alto = (reps: number) => (reps - 5) * 16;

/** El gráfico de la doble progresión. */
function Progresion() {
  const salto = (cx(3) + cx(4)) / 2;
  return (
    <figure className="capa-1 en-motor" role="img" data-grafico
      aria-label={`Cinco sesiones de press de banca, 3 series de ${MINIMO} a ${TOPE}. Con 80 kilos: 8 8 8, después 9 9 8, 10 10 9 y 10 10 10. Como las tres llegaron al tope, la quinta sube a 82,5 kilos y vuelve a 8 8 8.`}>
      <svg viewBox={`0 -16 ${W} ${H + 16}`} aria-hidden="true" focusable="false">
        <text className="en-motor-eje" x={14} y={-4}>Press de banca · 3 × {MINIMO}-{TOPE}</text>
        <line className="en-motor-tope" x1={14} x2={W - 12} y1={BASE - alto(TOPE)} y2={BASE - alto(TOPE)} />
        <text className="en-motor-eje" x={W - 12} y={BASE - alto(TOPE) - 5} textAnchor="end">tope {TOPE}</text>
        <line className="en-motor-min" x1={14} x2={W - 12} y1={BASE - alto(MINIMO)} y2={BASE - alto(MINIMO)} />
        <path className="en-motor-peso" pathLength={1} d={`M14 44H${salto - 8}q8 0 8 -8v-2q0 -8 8 -8H${W - 12}`} />
        <text className="en-motor-kg" x={14} y={36}>80 kg</text>
        <text className="en-motor-kg en-motor-sube" x={W - 12} y={18} textAnchor="end">82,5 kg</text>
        <text className="en-motor-eje en-motor-sube" x={salto - 12} y={30} textAnchor="end">+{fmtKg(RULES.inc.torso)}</text>
        {EJEMPLO.map((s, i) => (
          <g key={i} className={i === 3 ? 'en-motor-lleno' : undefined} style={{ ['--i' as string]: i } as CSSProperties}>
            {s.reps.map((x, k) => <rect key={k} className={x >= TOPE ? 'en-motor-barra en-al-tope' : 'en-motor-barra'} x={cx(i) - 22 + k * 16} y={BASE - alto(x)} width={12} height={alto(x)} rx={3} />)}
            <text className="en-motor-reps" x={cx(i)} y={BASE + 18} textAnchor="middle">{s.reps.join(' ')}</text>
            <text className="en-motor-eje" x={cx(i)} y={BASE + 34} textAnchor="middle">S{i + 1}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

const incs = Object.values(RULES.inc);
/** Las reglas completas, con las palabras de la 1.0: van en una hoja. */
const REGLAS: { t: string; v: string; d: (n: { me: string; partner: string }) => string }[] = [
  { t: 'Doble progresión', v: 'reps → kg', d: () => 'Dentro del rango sumás repeticiones; al tope, sube el peso y volvés al mínimo.' },
  { t: 'Cuánto sube', v: `+${fmtKg(RULES.inc.pierna)} · +${fmtKg(RULES.inc.torso)} · +${fmtKg(RULES.inc.aislamiento)} kg`, d: () => 'Piernas y peso muerto, torso y aislamiento, en ese orden.' },
  { t: 'Cada sesión', v: '+1 rep', d: () => 'Una repetición más en la serie más baja, sin pasar el tope.' },
  { t: 'Si se estanca', v: `−${Math.round(RULES.dropPct * 100)} %`, d: () => `${RULES.holdAt} sesiones iguales: se mantiene. ${RULES.dropAt} sesiones: baja y vuelve a subir.` },
  { t: 'Semana de descarga', v: `cada ${RULES.deloadEvery} sem.`, d: () => 'Mismo peso y la mitad de las series, para recuperar. No cuenta en la progresión.' },
  { t: 'Cada uno con lo suyo', v: 'por persona', d: (n) => `${n.me} y ${n.partner} tienen rangos, pesos y récords separados.` },
  { t: 'Si no llegás a todo', v: 'no es falla', d: () => 'Lo que queda pasa al principio de la próxima y no frena la progresión.' },
];
const INFO = (
  <>
    <p className="t-cuerpo-l">El motor calcula cuánto levantar cada vez.</p>
    <p className="t-cuerpo">En el gráfico, cada grupo de barras es una sesión y cada barra, una serie. En la cuarta las tres llegan al tope: la quinta sube el peso y vuelve al mínimo.</p>
    <p className="t-cuerpo">Lo de abajo es lo que te toca la próxima vez, con tu historial.</p>
  </>
);

export default function MotorV2({ day }: PropsV2) {
  const t = useStore((s) => s.train);
  const names = useStore((s) => s.settings!.names);
  const t0 = useStore((s) => s.settings?.startDate) || undefined;
  const plan = plannedFor(t, day.date, t0);
  const ultima = t.sessions[t.sessions.length - 1];
  const r = plan.routine ?? t.routines.find((x) => x.id === ultima?.routineId) ?? t.routines.find((x) => !x.archivada) ?? t.routines[0];
  const whos: Who[] = [...(t.active?.athletes ?? ultima?.athletes ?? (['me', 'partner'] as const))];
  const [quien, setQuien] = useState<Who>('me');
  const w = whos.includes(quien) ? quien : whos[0];
  const prox = nextFor(t, r, [w], day.date);

  return (
    <Marco className="en" titulo="Motor de entreno" intro="Primero sumás repeticiones; al tope, sube el peso." info={INFO}
      volver={t.active ? { href: `#/entreno-sesion/${t.active.routineId}`, nombre: 'Sesión' } : { href: '#/entreno', nombre: 'Entreno' }}>
      <Progresion />

      <div className="en-numeros en-motor-numeros">
        <Dato valor="+1" unidad="rep" etiqueta="Cada sesión" />
        <Dato valor={`+${fmtKg(Math.min(...incs))} a ${fmtKg(Math.max(...incs))}`} unidad="kg" etiqueta="Al tope" />
        <Dato valor={`−${Math.round(RULES.dropPct * 100)}`} unidad="%" etiqueta="Si se estanca" />
      </div>
      <div className="capa-1 s-lista en-detalle">
        <FilaHoja icono="documento" titulo="Todas las reglas" valor={String(REGLAS.length)}>
          <dl className="capa-1 pt-ficha">
            {REGLAS.map((x) => <div key={x.t} className="pt-ficha-fila"><dt className="t-rotulo">{x.t} · {x.v}</dt><dd className="t-cuerpo">{x.d(names)}</dd></div>)}
          </dl>
        </FilaHoja>
      </div>

      <Grupo titulo={`Próxima ${r.name}`} extremo={<span className="t-rotulo">Calculado</span>}>
        {whos.length > 1 && <Segmentado etiqueta="De quién" valor={w} onCambio={setQuien} opciones={whos.map((x) => [x, names[x]])} />}
        {t.sessions.length === 0 && <p className="t-nota">La primera vez elegís tu peso; desde ahí calcula el motor.</p>}
        <ul className="capa-1 pt-revs">
          {prox.map((p) => (
            <li key={p.ex.id}>
              <span className="t-rotulo">{p.target.note}</span>
              <span className="t-cuerpo">{p.ex.name}</span>
              <b className="t-dato">{p.target.kg ? `${fmtKg(p.target.kg)} kg` : '—'} × {p.target.reps.join(' ')}</b>
            </li>
          ))}
        </ul>
      </Grupo>
    </Marco>
  );
}
