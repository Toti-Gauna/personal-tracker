/**
 * Trazo 2.0 · los caminos de estudio como líneas de metro: matemática, idiomas y programación, cada uno una fila de estaciones
 * (tramos, años o proyectos) con las hechas, la actual ("estás acá") y las que vienen. Junta en una sola forma lo que la 1.0
 * calculaba en tres tarjetas distintas, con las mismas funciones de datos.
 */
import { useMemo } from 'react';
import { aniosIdiomas, faseIdiomaEn, nivelesIdiomas, nombreIdioma } from '../../data/idiomas';
import { T0_PLAN } from '../../data/plan';
import { calendarioCompleto, estadoEn, hoySos, perfilMate, rutaMate } from '../../data/plan-vistas';
import { cierreProyecto } from '../../data/puertas';
import { useStore } from '../../state/store';

export type EstadoEstacion = 'hecha' | 'actual' | 'proxima';
export interface Estacion { id: string; nombre: string; estado: EstadoEstacion }
export interface Linea {
  id: 'mate' | 'idiomas' | 'prog';
  nombre: string;
  /** El color del área, como token 2.0. */
  area: string;
  href: string;
  estaciones: Estacion[];
  hechas: number;
  /** Lo que son las estaciones: "tramos", "años" o "proyectos". */
  unidad: string;
  /** Dónde estás, en pocas palabras ("M3 · Álgebra"). */
  ahora: string;
  sos?: string;
  vasASer?: string;
}

const deEstado = (e: 'hecho' | 'actual' | 'proximo' | string): EstadoEstacion => (e === 'hecho' ? 'hecha' : e === 'actual' ? 'actual' : 'proxima');

/** Cuántas estaciones hay hechas, y cuál es la de ahora (la primera que no está hecha, si ninguna corre hoy). */
export const resumenEstaciones = (xs: Estacion[]) => ({
  hechas: xs.filter((x) => x.estado === 'hecha').length,
  actual: xs.find((x) => x.estado === 'actual') ?? xs.find((x) => x.estado === 'proxima'),
});

/** Las tres líneas, a la fecha de `hoy`. */
export function useLineas(hoy: string): Linea[] {
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  useStore((s) => s.plan.extrasApagados);
  return useMemo(() => {
    const mate = rutaMate(t0);
    const pm = perfilMate(mate, hoy, plan);
    const estMate: Estacion[] = mate.map((x) => ({ id: x.id, nombre: x.tipo === 'ventana' ? x.nombre : x.principal.join(' y '), estado: deEstado(estadoEn(x, hoy)) }));

    const anios = aniosIdiomas(t0);
    const fase = faseIdiomaEn(hoy, t0);
    const niv = nivelesIdiomas(hoy, t0);
    const estIdi: Estacion[] = anios.map((a) => ({ id: String(a.n), nombre: `Año ${a.n}`, estado: deEstado(estadoEn(a, hoy)) }));

    const cal = calendarioCompleto(t0).filter((b) => b.semanas > 0);
    const proys = cal.filter((b) => b.tipo === 'proyecto');
    const actual = cal.find((b) => estadoEn(b, hoy) === 'actual') ?? cal.find((b) => estadoEn(b, hoy) === 'proximo') ?? cal[cal.length - 1];
    const ps = hoySos(hoy, plan, t0);
    const estProg: Estacion[] = proys.map((b) => ({ id: b.id, nombre: b.nombre, estado: cierreProyecto(plan, b.id) ? 'hecha' : b.id === actual?.id ? 'actual' : 'proxima' }));

    // Sin ninguna en curso, "estás acá" es la próxima: es donde vas a arrancar.
    for (const xs of [estMate, estIdi, estProg]) { const sig = xs.find((x) => x.estado === 'proxima'); if (sig && !xs.some((x) => x.estado === 'actual')) sig.estado = 'actual'; }

    return [
      { id: 'mate', nombre: 'Matemática', area: 'var(--a-economia)', href: '#/estudio/mate', estaciones: estMate, hechas: estMate.filter((x) => x.estado === 'hecha').length, unidad: 'tramos',
        ahora: pm.actual ? `${pm.actual.id} · ${pm.actual.principal.join(' y ')}` : 'Terminaste', sos: pm.sos ?? undefined, vasASer: pm.vasASer ?? undefined },
      { id: 'idiomas', nombre: 'Idiomas', area: 'var(--a-idi)', href: '#/estudio/idiomas', estaciones: estIdi, hechas: estIdi.filter((x) => x.estado === 'hecha').length, unidad: 'años',
        ahora: `${nombreIdioma(fase.idioma)} · semana ${fase.semana} de ${fase.semanas}`, sos: niv.sos.join(' · ') || undefined, vasASer: niv.vasASer ?? undefined },
      { id: 'prog', nombre: 'Programación', area: 'var(--a-ing)', href: '#/estudio/prog', estaciones: estProg, hechas: estProg.filter((x) => x.estado === 'hecha').length, unidad: 'proyectos',
        ahora: actual ? `${actual.id} · ${actual.nombre}` : 'Terminaste', sos: ps.sos?.perfil, vasASer: ps.vasASer?.perfil },
    ] satisfies Linea[];
  }, [t0, plan, hoy]);
}
