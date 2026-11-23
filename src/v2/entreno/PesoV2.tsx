/**
 * Trazo 2.0 · Peso (#/entreno-peso): el último pesaje en grande, la curva con la meta y tres números. Cargar el de hoy está a un
 * toque; las medidas, la meta y la lista de pesajes van cada una en su hoja. Lo que se borra se puede deshacer.
 */
import { useState } from 'react';
import { weekday } from '../../data/study';
import { fmtFecha, parseDate } from '../../data/time';
import { fmtKg, medidasPendientes, pace, weightAt } from '../../data/train';
import type { Medida, Weigh } from '../../data/train-types';
import { useStore } from '../../state/store';
import { addMedida, addWeight, deleteMedida, deleteWeight, setGoalKg } from '../../state/train';
import { aviso } from '../kit/capas';
import { Boton, Contador } from '../kit/controles';
import { Dato, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { Numero } from '../movimiento/componentes';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { Curva } from './Curva';
import '../proyecto/proyecto.css';
import './entreno.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dm = (d: string) => `${parseDate(d).getDate()} ${MES[parseDate(d).getMonth()]}`;
const r1 = (n: number) => Math.round(n * 10) / 10;
const conSigno = (n: number) => `${n >= 0 ? '+' : '−'}${fmtKg(Math.abs(n))}`;

const INFO = (
  <>
    <p className="t-cuerpo-l">Tu peso, semana a semana, contra la meta.</p>
    <p className="t-cuerpo">Pesate en ayunas, siempre el mismo día: así las semanas se pueden comparar. Con dos pesajes ya sale el ritmo.</p>
    <p className="t-cuerpo">El punto amarillo es el último pesaje. La línea punteada es la meta; si queda lejos, se marca en el borde.</p>
  </>
);

/** Las medidas del mes: cintura, pecho y brazo, en centímetros. Todas opcionales. */
function Medidas({ fecha, medidas }: { fecha: string; medidas: Medida[] }) {
  const [m, setM] = useState<{ cintura: number | null; pecho: number | null; brazo: number | null }>({ cintura: null, pecho: null, brazo: null });
  const ultima = medidas[0];
  const vacio = m.cintura == null && m.pecho == null && m.brazo == null;
  const guardar = () => {
    const previa = medidas.find((x) => x.date === fecha);
    addMedida({ date: fecha, cintura: m.cintura ?? undefined, pecho: m.pecho ?? undefined, brazo: m.brazo ?? undefined });
    setM({ cintura: null, pecho: null, brazo: null });
    aviso({ titulo: 'Medidas guardadas', sub: 'Las próximas, en 4 semanas', tono: 'hecho', deshacer: () => (previa ? addMedida(previa) : deleteMedida(fecha)) });
  };
  return (
    <div className="pt-version">
      <div className="en-medidas">
        {(['cintura', 'pecho', 'brazo'] as const).map((k) => (
          <div key={k}>
            <span className="t-rotulo">{k}</span>
            <Contador etiqueta={`${k[0].toUpperCase()}${k.slice(1)} en centímetros`} valor={m[k]} inicial={ultima?.[k] ?? { cintura: 85, pecho: 100, brazo: 35 }[k]} min={10} max={250} paso={0.5} decimales={1} unidad="cm" onCambio={(v) => setM({ ...m, [k]: v })} />
          </div>
        ))}
      </div>
      <Boton variante="primario" ancho icono="tilde" deshabilitado={vacio} onClick={guardar}>Guardar medidas</Boton>
      {medidas.length > 0 && (
        <ul className="capa-1 pt-revs">
          {medidas.slice(0, 4).map((x) => (
            <li key={x.date} className="en-corrida">
              <span className="t-rotulo">{dm(x.date)}</span>
              <span className="t-dato">{[x.cintura != null && `cintura ${fmtKg(x.cintura)}`, x.pecho != null && `pecho ${fmtKg(x.pecho)}`, x.brazo != null && `brazo ${fmtKg(x.brazo)}`].filter(Boolean).join(' · ')} cm</span>
              <Boton tamano="s" variante="fantasma" icono="borrar" onClick={() => { deleteMedida(x.date); aviso({ titulo: 'Medidas borradas', sub: dm(x.date), deshacer: () => addMedida(x) }); }}>Borrar</Boton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PesoV2({ day }: PropsV2) {
  const t = useStore((s) => s.train);
  const [kg, setKg] = useState<number | null>(null);
  const hoy = day.date;
  const ws = [...t.weights].sort((a, b) => a.date.localeCompare(b.date));
  const ultimo = weightAt(ws, hoy);
  const previo = ws.length > 1 ? ws[ws.length - 2] : undefined;
  const deHoy = ws.find((w) => w.date === hoy);
  const ritmo = pace(ws);
  const falta = ultimo ? t.goalKg - ultimo.kg : null;
  // Semanas a la meta al ritmo de ahora, subiendo o bajando: solo si el ritmo va hacia la meta.
  const semanas = ritmo && falta != null && Math.abs(ritmo.perWeek) > 0.01 && Math.abs(falta) > 0.05 && falta / ritmo.perWeek > 0 ? Math.round(falta / ritmo.perWeek) : null;
  const medidas = [...t.medidas].sort((a, b) => b.date.localeCompare(a.date));
  const tocaMedir = medidasPendientes(t.medidas, hoy);
  const cambio = ultimo && previo ? r1(ultimo.kg - previo.kg) : null;

  const registrar = () => {
    if (kg == null || !(kg > 20 && kg < 400)) return;
    addWeight(hoy, kg);
    setKg(null);
    aviso({ titulo: `Peso guardado · ${fmtKg(kg)} kg`, sub: `Meta ${fmtKg(t.goalKg)} kg`, tono: 'hecho', deshacer: () => (deHoy ? addWeight(hoy, deHoy.kg) : deleteWeight(hoy)) });
  };
  const borrar = (w: Weigh) => { deleteWeight(w.date); aviso({ titulo: 'Pesaje borrado', sub: `${dm(w.date)} · ${fmtKg(w.kg)} kg`, deshacer: () => addWeight(w.date, w.kg) }); };

  return (
    <Marco className="en" titulo="Peso" volver={{ href: '#/entreno', nombre: 'Entreno' }} info={INFO}>
      {ultimo ? (
        <Tarjeta heroe area="var(--a-salud)" className="en-peso" etiqueta="Último pesaje">
          <div className="en-hoy-cab"><span className="t-rotulo">{fmtFecha(ultimo.date)}</span><span className="t-rotulo">Meta {fmtKg(t.goalKg)} kg</span></div>
          <Dato grande valor={<Numero valor={ultimo.kg} decimales={Number.isInteger(ultimo.kg) ? 0 : 1} />} unidad="kg" etiqueta="Último pesaje"
            delta={cambio != null ? { valor: `${fmtKg(Math.abs(cambio))} kg`, sentido: cambio > 0 ? 'sube' : cambio < 0 ? 'baja' : 'igual', nota: 'desde el anterior' } : undefined} />
          <Curva puntos={ws.map((w) => ({ fecha: w.date, valor: w.kg, rotulo: dm(w.date) }))} meta={t.goalKg} fmt={fmtKg}
            nombre={`Curva de peso: ${ws.map((w) => `${dm(w.date)} ${fmtKg(w.kg)} kg`).join(', ')}. Meta: ${fmtKg(t.goalKg)} kg.`} />
          <div className="en-numeros">
            <Dato valor={ritmo ? conSigno(r1(ritmo.change)) : '—'} unidad={ritmo ? 'kg' : undefined} etiqueta={ritmo ? `En ${ritmo.weeks} sem.` : 'Cambio'} />
            <Dato valor={falta != null ? fmtKg(r1(Math.abs(falta))) : '—'} unidad="kg" etiqueta="Para la meta" />
            <Dato valor={semanas ? `~${semanas}` : '—'} unidad={semanas ? 'sem.' : undefined} etiqueta="Al ritmo" />
          </div>
        </Tarjeta>
      ) : (
        <Vacio ilustracion="peso" titulo="Todavía no hay pesajes" texto="Pesate en ayunas y cargalo acá abajo: la curva y el ritmo salen solos." />
      )}

      <Grupo titulo={deHoy ? 'Corregir el de hoy' : 'Pesaje de hoy'} extremo={<span className="t-rotulo">En ayunas</span>}>
        <div className="capa-1 en-pesaje">
          <Contador etiqueta="Peso en kilos" valor={kg} inicial={ultimo?.kg ?? 80} min={20} max={400} paso={0.1} decimales={1} unidad="kg" onCambio={setKg} />
          <Boton variante="primario" ancho icono="tilde" deshabilitado={kg == null} onClick={registrar}>Registrar</Boton>
        </div>
        {weekday(hoy) !== 6 && <p className="t-nota pt-pie">Pesarse los domingos hace comparables las semanas.</p>}
      </Grupo>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <FilaHoja icono="grafico" titulo="Medidas" nota="Una vez por mes, en centímetros" valor={tocaMedir ? 'Toca' : medidas[0] ? dm(medidas[0].date) : undefined}>
            <Medidas fecha={hoy} medidas={medidas} />
          </FilaHoja>
          <FilaHoja icono="meta" titulo="Meta" valor={`${fmtKg(t.goalKg)} kg`} tituloHoja="Meta de peso">
            <div className="pt-version">
              <Contador etiqueta="Meta de peso en kilos" valor={t.goalKg} min={30} max={250} paso={0.5} decimales={1} unidad="kg" onCambio={setGoalKg} />
              <p className="t-nota">Se guarda sola. La curva y las semanas que faltan se calculan contra esta meta.</p>
            </div>
          </FilaHoja>
          {ws.length > 0 && (
            <FilaHoja icono="calendario" titulo="Pesajes" valor={String(ws.length)}>
              <ul className="capa-1 pt-revs">
                {[...ws].reverse().slice(0, 10).map((w) => (
                  <li key={w.date} className="en-corrida">
                    <span className="t-rotulo">{fmtFecha(w.date)}</span>
                    <b className="t-dato">{fmtKg(w.kg)} kg</b>
                    <Boton tamano="s" variante="fantasma" icono="borrar" onClick={() => borrar(w)}>Borrar</Boton>
                  </li>
                ))}
              </ul>
            </FilaHoja>
          )}
        </div>
      </Grupo>
    </Marco>
  );
}
