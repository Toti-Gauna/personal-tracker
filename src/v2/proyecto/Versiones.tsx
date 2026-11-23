/**
 * Trazo 2.0 · las versiones de un proyecto como un paso a paso: cada versión es un nodo sobre una línea que se pinta con el
 * trazo hasta donde llegaste. Tocar un nodo abre su hoja: fechas contra el roadmap, horas, alcance, lo que sale con ella (notas,
 * video de 30 s y README) y publicarla (el lanzamiento no se publica sin el Imán completo).
 */
import { useState } from 'react';
import { textoDelta } from '../../data/diferencia';
import { lanzamientoDe } from '../../data/fondo';
import { puedePublicar } from '../../data/iman';
import type { BloqueFechado } from '../../data/plan-extendido';
import { ENTREGABLES_VERSION } from '../../data/plan-state';
import { capacidadDelDia } from '../../data/plan';
import { versionesFechadas, type VersionFechada } from '../../data/proyectos-v7';
import { publicarVersion, toggleEntregableVersion } from '../../state/plan';
import { useStore } from '../../state/store';
import { fp } from '../../ui/periodos';
import { Icono, type NombreIcono } from '../iconos';
import { Boton } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Lista } from './piezas';
import { aviso } from '../kit/capas';

export const ESTADO_VERSION: Record<VersionFechada['estado'], { palabra: string; icono: NombreIcono }> = {
  publicada: { palabra: 'Publicada', icono: 'tilde' },
  'en-curso': { palabra: 'En curso', icono: 'ritmo' },
  proxima: { palabra: 'Próxima', icono: 'reloj' },
  atrasada: { palabra: 'Atrasada', icono: 'atencion' },
};

/** Cuántas versiones están publicadas y cuál corre ahora (para el resumen). */
export function resumenVersiones(vs: VersionFechada[]) {
  return { publicadas: vs.filter((v) => v.estado === 'publicada').length, total: vs.length, ahora: vs.find((v) => v.estado === 'en-curso' || v.estado === 'atrasada') };
}

export function useVersiones(id: string, b: BloqueFechado | undefined, hoy: string): VersionFechada[] {
  const plan = useStore((s) => s.plan);
  useStore((s) => s.days);
  return b ? versionesFechadas(id, b, capacidadDelDia, plan, hoy) : [];
}

/** Los pasos de una lista de versiones (las de un proyecto o las de una app de fondo): cada uno es un botón que se elige. */
export function Pasos({ items, onElegir }: { items: { id: string; nombre: string; estado: VersionFechada['estado'] }[]; onElegir: (id: string) => void }) {
  return (
    <ol className="pt-pasos" style={{ ['--n' as string]: items.length }}>
      {items.map((x) => {
        const e = ESTADO_VERSION[x.estado];
        return (
          <li key={x.id} className={`pt-paso ${x.estado}`}>
            <button type="button" onClick={() => onElegir(x.id)} aria-label={`Versión ${x.id}, ${x.nombre}, ${e.palabra.toLowerCase()}`}>
              <span className="pt-nodo"><Icono nombre={e.icono} lado={16} /></span>
              <b className="t-dato">{x.id}</b>
              <small>{x.nombre}</small>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function Versiones({ id, b, hoy }: { id: string; b: BloqueFechado; hoy: string }) {
  const vs = useVersiones(id, b, hoy);
  const [abierta, setAbierta] = useState<string | null>(null);
  if (!vs.length) return null;
  const v = vs.find((x) => x.id === abierta);
  return (
    <>
      <Pasos items={vs} onElegir={setAbierta} />
      <HojaVersion id={id} v={v ?? null} vs={vs} hoy={hoy} onCerrar={() => setAbierta(null)} />
    </>
  );
}

function HojaVersion({ id, v, vs, hoy, onCerrar }: { id: string; v: VersionFechada | null; vs: VersionFechada[]; hoy: string; onCerrar: () => void }) {
  const plan = useStore((s) => s.plan);
  const [ultima, setUltima] = useState<VersionFechada | null>(null);
  if (v && v !== ultima) setUltima(v);
  const x = v ?? ultima;
  if (!x) return null;
  const r = x.registro;
  const e = ESTADO_VERSION[x.estado];
  const g = puedePublicar({ version: x.id, lanzamiento: lanzamientoDe(vs, plan.fondo?.[id]?.lanzamiento), iman: plan.iman?.[id] });
  const fechas = x.enCurso && !x.inicioTrazo ? 'En curso: la arman los agentes' : `${fp(x.inicioTrazo ?? x.inicio!)} – ${fp(x.finTrazo ?? x.fin!)}`;
  const pie = r.publicada
    ? <Boton variante="fantasma" icono="deshacer" onClick={() => { const antes = r.publicada!; publicarVersion(id, x.id, null); aviso({ titulo: `v${x.id}: sin publicar`, sub: `Era del ${fp(antes)}`, deshacer: () => publicarVersion(id, x.id, antes) }); }}>Sacar de publicadas</Boton>
    : g.ok
      ? <Boton variante="primario" icono="tilde" onClick={() => publicarVersion(id, x.id, hoy)}>Publicada hoy</Boton>
      : <Boton variante="primario" icono="iman" href={`#/metas/iman/${id}`}>{g.faltan.length === 1 ? 'Falta 1 punto del Imán' : `Faltan ${g.faltan.length} puntos del Imán`}</Boton>;
  return (
    <Hoja abierta={!!v} onCerrar={onCerrar} titulo={`${x.id} · ${x.nombre}`} pie={pie}>
      <div className="pt-version">
        <p className="pt-version-estado t-encabezado"><Icono nombre={e.icono} lado={18} />{r.publicada ? `Publicada el ${fp(r.publicada)}` : e.palabra}</p>
        <p className="t-dato">{fechas}{x.horas != null ? ` · ${x.derivadas ? '≈ ' : ''}${String(x.horas).replace('.', ',')} h` : ''}</p>
        {x.fin && x.finTrazo && <p className="t-nota">El roadmap la estima para el {fp(x.fin)}: Trazo la termina {textoDelta(x.delta ?? 0)}.</p>}
        {x.alcance.length > 0 && <ul className="pt-items">{x.alcance.map((a) => <li key={a}>{a}</li>)}</ul>}
        <Lista items={ENTREGABLES_VERSION.map(([k, nombre]) => ({ clave: k, etiqueta: nombre, marcada: !!r[k] }))} onCambio={(k) => toggleEntregableVersion(id, x.id, k as (typeof ENTREGABLES_VERSION)[number][0])} />
        {!r.publicada && !g.ok && <p className="t-nota">Es el lanzamiento: se publica con el Imán completo.</p>}
        <p className="t-nota">Cada versión sale con notas de versión, un video demo de 30 s y el README al día. Si una se atrasa, se mueven fechas: no se recorta profundidad.</p>
      </div>
    </Hoja>
  );
}
