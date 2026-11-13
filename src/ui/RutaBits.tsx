import { AREAS } from '../data/defaults';
import { BIMS, PILOT_WEEKLY, ROADMAP, laneById, laneOfItem, pilotOf, weekOf, weekStart, type LaneId, type RutaState } from '../data/ruta';
import type { RoadmapBimester, RoadmapItem } from '../data/roadmap.schema';

/** Casilla de tres estados: vacía, a medias (mitad izquierda llena) o hecha. */
export function Estado({ value, label, onClick }: { value: number; label: string; onClick?: () => void }) {
  const st = value >= 1 ? 'ec-hecho' : value > 0 ? 'ec-medio' : 'ec-vacio';
  const txt = value >= 1 ? 'hecho' : value > 0 ? 'en curso' : 'pendiente';
  const inner = (
    <span className={`estado-caja ${st}`} aria-hidden="true">
      {st === 'ec-hecho' && <svg viewBox="0 0 14 14"><path d="M2.5 7.5l3 3 6-7" /></svg>}
    </span>
  );
  return onClick
    ? <button type="button" className="estado-btn" role="checkbox" aria-checked={value >= 1 ? 'true' : value > 0 ? 'mixed' : 'false'} aria-label={`${label}: ${txt}`} onClick={onClick}>{inner}</button>
    : <span role="img" aria-label={`${label}: ${txt}`}>{inner}</span>;
}

/** Chip de ruta: "■ B1 · Matemática · cap. 3". */
export function ChipRuta({ lane, texto }: { lane: LaneId; texto: string }) {
  return <span className="chip-ruta mono" style={{ ['--c' as string]: laneById(lane).color }}><i />{texto}</span>;
}

/** "Cap. 3 · Teoría de números" a partir del título del ítem. */
export function corto(i: RoadmapItem, b?: RoadmapBimester) {
  const m = i.title.match(/cap\. (\d+) · (.*)$/);
  if (m) return `Cap. ${m[1]} · ${m[2]}`;
  const t = b ? i.title.replace(`${b.product.name} · `, '') : i.title;
  return t[0].toUpperCase() + t.slice(1);
}

/** La grilla de los 18 bimestres, por año, con las certificaciones en rojo. */
export function GrillaAnios({ actual, avance }: { actual: number; avance: number }) {
  return (
    <div className="grilla-anios">
      {ROADMAP.route.years.map((y) => (
        <section key={y.year} aria-label={`Año ${y.year}: ${y.profile}`}>
          <div className="ga-cab"><b>Año {y.year}</b><span className="sub">{y.profile}</span></div>
          <div className="ga-fila">
            {y.bimesters.map((n) => {
              const b = BIMS[n - 1];
              const cert = b.cert?.name.replace('AWS Security – Specialty', 'AWS Sec').replace('Security+', 'Sec+').replace('Terraform', 'TF').replace('AWS ', '');
              return (
                <a key={n} href={`#/metas/bim/${n}`} className={`ga-b${n === actual ? ' actual' : n < actual ? ' pasado' : ''}`} aria-label={`B${n} · ${b.product.name}${b.cert ? ` · ${b.cert.name}` : ''}`}>
                  <span className="mono">B{n}</span>
                  <b>{b.product.name}</b>
                  {cert && <span className="mono ga-cert">{cert}</span>}
                  {n === actual && <i style={{ width: `${Math.max(4, avance * 100)}%` }} />}
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export const areaColor = (a: keyof typeof AREAS) => AREAS[a].css;

/** El chip de una meta de Hoy con ruta: carril, bimestre y qué empuja. */
export function chipDe(ref: string, ruta: RutaState, date: string): { lane: LaneId; texto: string } | null {
  if (ref.endsWith('-piloto')) {
    const n = Number(ref.slice(1, ref.indexOf('-')));
    const b = BIMS[n - 1];
    const lunes = weekStart(b, weekOf(b, date));
    const calls = pilotOf(ruta, b, lunes, date).calls;
    return { lane: 'piloto', texto: `B${n} · Piloto · ${calls} de ${PILOT_WEEKLY}` };
  }
  const b = BIMS.find((x) => x.items.some((i) => i.id === ref));
  const i = b?.items.find((x) => x.id === ref);
  if (!b || !i) return null;
  const lane = laneOfItem(i);
  const cap = i.title.match(/cap\. (\d+)/);
  return { lane, texto: `B${b.n} · ${laneById(lane).name}${cap ? ` · cap. ${cap[1]}` : lane === 'prog' ? ` · ${i.title}` : ''}` };
}
