/**
 * Trazo 2.0 · Impacto (#/metas/impacto): qué cambia en la ruta con la búsqueda intensiva. Las ramas en las 13 semanas, las horas por
 * semana antes y ahora, la matemática a demanda, cuánto se corre Handyx y qué pasa con los ingresos. Mismos datos y mismas funciones
 * que la 1.0 (`horasSemana`, `escenariosHandyx`); la línea de tiempo se dibuja con los colores de área de la 2.0.
 */
import { MOTIVO_INTENSIVA } from '../../data/busqueda';
import { PLAN, T0_PLAN, TRAMOS, finDe, inicioDe, inicioSemana, nombreTramo, semanaDelPlan } from '../../data/plan';
import { escenariosHandyx, horasSemana, type FilaHoras } from '../../data/sprint';
import { addDays } from '../../data/time';
import { planSettings, useStore } from '../../state/store';
import { Icono } from '../iconos';
import { Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { AREA, dm, n1 } from './comun';
import '../proyecto/proyecto.css';
import './trabajo.css';

const FILAS_HORAS: [FilaHoras, string][] = [
  ['Programación', AREA.programacion], ['Matemática', AREA.matematica], ['Inglés', AREA.ingles], ['Búsqueda', AREA.trabajo],
  ['Clipping', AREA.eclipse], ['Entrenamiento', AREA.salud], ['Handyx', AREA.handyx], ['Ventas', AREA.eclipse],
];

const INFO = (
  <>
    <p className="t-cuerpo-l">Dos semanas de búsqueda intensiva, inglés todos los días y Handyx y Eclipse en stand-by.</p>
    <p className="t-cuerpo">Los proyectos y la matemática siguen en su fecha.</p>
    <p className="t-cuerpo">“Antes” es la rutina del plan T+18 sin la búsqueda intensiva. Las fechas de trabajo son escenarios, no promesas.</p>
  </>
);

/** La línea de tiempo de las ramas en las 13 semanas: un segmento por rama, el stand-by punteado y las dos semanas intensivas en una banda. */
function Linea({ t0 }: { t0: string }) {
  const W = 358;
  const X0 = 82;
  const dx = (W - X0 - 4) / 91;
  const xd = (d: string) => X0 + Math.max(0, Math.min(91, (new Date(`${d}T12:00`).getTime() - new Date(`${t0}T12:00`).getTime()) / 864e5)) * dx;
  const t2 = inicioSemana(PLAN.hitos.find((h) => h.id === 'T+2')!.semana, t0);
  const fin = addDays(t0, 91);
  const prog = TRAMOS.filter((t) => inicioDe(t, t0) < fin && t.tipo !== 'descanso');
  const filas: { n: string; c: string; segs: { a: string; b: string; t?: string; sb?: boolean; ancho?: number }[] }[] = [
    { n: 'trabajo', c: AREA.trabajo, segs: [{ a: t0, b: addDays(t0, 13), t: 'sprint', ancho: 5 }, { a: addDays(t0, 14), b: fin, t: 'sigue hasta la oferta' }] },
    { n: 'inglés', c: AREA.ingles, segs: [{ a: t0, b: fin, t: 'ahora: 1 h 30 por día', ancho: 3 }] },
    { n: 'programación', c: AREA.programacion, segs: prog.map((t) => ({ a: inicioDe(t, t0), b: finDe(t, t0) < fin ? finDe(t, t0) : fin, t: t.tipo === 'ventana' ? t.id : t.id === 'P0' ? 'P0' : nombreTramo(t, false) })) },
    { n: 'matemática', c: AREA.matematica, segs: [{ a: t0, b: fin, t: 'Aritmética → Álgebra · 2 h por día' }] },
    { n: 'handyx', c: AREA.handyx, segs: [{ a: t0, b: t2, t: 'stand-by hasta el trabajo', sb: true }, { a: t2, b: fin, sb: true }] },
    { n: 'eclipse', c: AREA.eclipse, segs: [{ a: t0, b: fin, t: 'clipping 1 h 30 por día y 2 h el finde' }] },
  ];
  const FH = 34;
  return (
    <svg className="tr-lin" data-grafico viewBox={`0 0 ${W} ${filas.length * FH + 18}`} role="img" aria-label="Las ramas en las 13 semanas: la búsqueda intensiva las dos primeras, inglés todos los días, Handyx y Eclipse en stand-by hasta el trabajo.">
      <rect x={xd(t0)} y={14} width={xd(addDays(t0, 14)) - xd(t0)} height={filas.length * FH} className="tr-lin-banda" />
      <line x1={xd(t2)} x2={xd(t2)} y1={14} y2={filas.length * FH + 14} className="tr-lin-t2" />
      <text x={xd(t0)} y={10} className="tr-lin-eje">{dm(t0)}</text>
      <text x={xd(t2) - 22} y={10} className="tr-lin-eje">T+2 · {dm(t2)}</text>
      <text x={W - 34} y={10} className="tr-lin-eje">{dm(addDays(fin, -1))}</text>
      {filas.map((f, i) => {
        const y = 14 + i * FH + FH / 2 + 4;
        return (
          <g key={f.n} style={{ ['--c' as string]: f.c }}>
            <text x={0} y={y + 4} className="tr-lin-n">{f.n}</text>
            {f.segs.map((s, k) => (
              <g key={k}>
                <line x1={xd(s.a) + 1} x2={xd(s.b) - 1} y1={y} y2={y} className={`tr-lin-seg${s.sb ? ' sb' : ''}`} strokeWidth={s.ancho ?? 2.5} />
                {s.t && xd(s.b) - xd(s.a) >= 40 && <text x={xd(s.a) + 2} y={y - 6} className="tr-lin-t">{s.t}</text>}
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default function ImpactoV2({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const plan = useStore((s) => s.plan);
  const settings = useStore((s) => s.settings);
  const t0 = settings?.startDate ?? T0_PLAN;
  const cfg = planSettings(settings);
  const antes = horasSemana(cfg.previo?.rutina === 'con-trabajo' ? 'con-trabajo' : 'weekday', 'weekend');
  const ahora = horasSemana('busqueda-intensiva', 'busqueda-intensiva-finde');
  const desdePausa = (plan.pausas ?? []).find((p) => p.objetivo === 'handyx' && p.motivo === MOTIVO_INTENSIVA)?.desde ?? t0;
  const esc = escenariosHandyx(desdePausa, t0);
  const fin = addDays(t0, 90);
  const semana = semanaDelPlan(date, t0);

  return (
    <Marco className="tr" titulo="Impacto" intro="Búsqueda intensiva, inglés diario y Handyx y Eclipse en stand-by." volver={{ href: '#/metas/analisis', nombre: 'Análisis' }} info={INFO}>
      <Tarjeta heroe area={AREA.trabajo} etiqueta="Las ramas en 13 semanas" className="tr-heroe">
        <p className="t-rotulo">Las ramas · {dm(t0)} a {dm(fin)}</p>
        <Linea t0={t0} />
      </Tarjeta>

      <Grupo titulo="Horas por semana" extremo={<span className="t-rotulo">Horas · antes, ahora, cambio</span>}>
        <div className="capa-1 tr-horas-caja"><table className="tr-horas">
          <caption className="tr-oculto">Horas por semana antes y ahora</caption>
          <thead className="tr-oculto"><tr><th scope="col">Rama</th><th scope="col">Antes</th><th scope="col">Ahora</th><th scope="col">Cambio</th></tr></thead>
          <tbody>
            {FILAS_HORAS.map(([n, c]) => {
              const d = Math.round((ahora[n] - antes[n]) * 10) / 10;
              return (
                <tr key={n}>
                  <th scope="row"><i className="area-punto" style={{ ['--area' as string]: c }} /><span className="t-cuerpo">{n}</span></th>
                  <td className="t-dato tr-antes">{n1(antes[n])}</td>
                  <td className="t-dato"><b>{n1(ahora[n])}</b></td>
                  <td className="t-dato"><span className="tr-delta">{d !== 0 && <Icono nombre={d > 0 ? 'arriba' : 'abajo'} lado={14} />}{d === 0 ? '=' : `${d > 0 ? '+' : '−'}${n1(Math.abs(d))}`}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </Grupo>

      <Grupo titulo="Matemática a demanda">
        <div className="capa-1 s-lista">
          {PLAN.matematica.tramos.slice(0, 4).map((m) => {
            const desde = m.inicio ?? inicioSemana(m.desde, t0);
            const enCurso = m.inicio && m.fin ? date >= m.inicio && date <= m.fin : semana >= m.desde && semana <= m.hasta;
            const cuando = enCurso ? 'Ahora' : m.desdeT && m.desdeT !== 'T+0' ? m.desdeT : dm(desde);
            const p = TRAMOS.find((t) => t.id === m.habilita);
            const libros = m.libros.map((l) => l.replace('CONAMAT · ', ''));
            return (
              <FilaHoja key={m.id} icono="matematica" titulo={`Abre ${p ? nombreTramo(p) : m.habilita.toLowerCase()}`} nota={`${libros.length} ${libros.length === 1 ? 'libro' : 'libros'}`} valor={cuando} tituloHoja="Matemática a demanda">
                <ul className="capa-1 pt-revs">{libros.map((l) => <li key={l}><span className="t-cuerpo">{l}</span></li>)}</ul>
              </FilaHoja>
            );
          })}
        </div>
        <p className="t-nota pt-pie">Cada tramo de matemática abre un proyecto. Si un proyecto pide un tema antes de tiempo, se abre una ventana: el bloque de programación de la mañana pasa a ese tema hasta aprobar su test.</p>
      </Grupo>

      <Grupo titulo="Handyx · cuánto se corre" extremo={<span className="t-rotulo">Lanza desde</span>}>
        <div className="capa-1 s-lista">
          {esc.map((e) => <Fila key={e.nombre} area={AREA.handyx} titulo={`Si entra el ${dm(e.fecha)}`} nota={e.nombre} valor={dm(e.lanza)} />)}
        </div>
        <p className="t-nota pt-pie">El lanzamiento se corre, como mínimo, lo que dure el stand-by. La decisión de seguir o no con Handyx (T+12) se corre igual: el año de prueba cuenta desde que vuelve.</p>
      </Grupo>

      <div className="capa-1 s-lista">
        <FilaHoja icono="dinero" titulo="Ingresos a 90 días" nota="El sueldo pasa a ser la fuente principal" tituloHoja="Ingresos a 90 días">
          <p className="t-cuerpo pt-pie">Con Eclipse en stand-by, la fuente principal pasa a ser el sueldo. Cuanto antes entre el trabajo, antes se cobra; el clipping suma mientras tanto.</p>
        </FilaHoja>
      </div>
    </Marco>
  );
}
