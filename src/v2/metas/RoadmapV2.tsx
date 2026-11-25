/**
 * Trazo 2.0 · el plan entero (#/metas/roadmap): etapa, fase y bloque, con fechas, horas, versiones o plan del día, y lo que corre de
 * fondo en cada ventana. Cada etapa se abre para ver sus fases y cada fase abre su hoja con todos sus bloques y un enlace a su período.
 */
import { useState } from 'react';
import { PLAN_EXT } from '../../data/plan-extendido';
import { useStore } from '../../state/store';
import { V122 } from '../../data/v12-2';
import { fp } from '../../ui/periodos';
import { Hoja } from '../kit/hoja';
import { Fila } from '../kit/superficies';
import { Marco } from '../marco/Marco';
import { Icono } from '../iconos';
import type { PropsV2 } from '../registro';
import { Plegable } from './piezas';
import './metas.css';

type Fase = NonNullable<typeof PLAN_EXT.fases>[number];

const INFO = (
  <>
    <p className="t-cuerpo-l">El plan entero, de la etapa al bloque.</p>
    <p className="t-cuerpo">Cada etapa tiene sus fases. Tocá una fase para ver sus bloques con fechas y horas, sus versiones, certificaciones o plan del día y lo que corre de fondo en esa ventana; desde ahí entrás al período de cada bloque.</p>
    <p className="t-cuerpo">La etapa de ahora lleva «Estás acá».</p>
  </>
);


export default function RoadmapV2({ day }: PropsV2) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const [abierta, setAbierta] = useState<Fase | null>(null);
  const [ultima, setUltima] = useState<Fase | null>(null);
  const fondoTxt = (id: string) => {
    const f = V122.fondo[id];
    if (!f) return null;
    if (f.pausa) return 'Fondo: en pausa (PNPT)';
    const s = f.secundaria === 'libre' ? 'secundaria libre (elegí de "Ver a futuro")' : f.secundaria?.map((x) => `${x.app} v${x.version}`).join(', ');
    const c = f.comercial ? (() => { const x = V122.comerciales.find((y) => y.n === f.comercial)!; return `#${x.n} ${x.marca ?? plan.fondo?.[x.id]?.marca ?? x.sector ?? 'a definir'}`; })() : '—';
    return `Fondo: ${s} · comercial: ${c}`;
  };
  const fase = abierta ?? ultima;
  const abrir = (f: Fase) => { setUltima(f); setAbierta(f); };
  const bloques = fase ? PLAN_EXT.bloques.filter((b) => b.fase === fase.id && b.fechas) : [];

  return (
    <Marco className="mt" titulo="El plan entero" volver={{ href: '#/metas', nombre: 'Plan' }} info={INFO}>
      {PLAN_EXT.etapas.map((e) => {
        const fases = (PLAN_EXT.fases ?? []).filter((f) => f.etapa === e.n);
        const ahora = e.inicio! <= hoy && hoy <= e.fin!;
        return (
          <Plegable key={e.n} titulo={`Etapa ${e.n} · ${e.nombre}`} nota={`${fp(e.inicio!)} – ${fp(e.fin!)}`} valor={ahora ? 'Estás acá' : `${fases.length} ${fases.length === 1 ? 'fase' : 'fases'}`}>
            <div className="mt-lista-plana">
              {fases.map((f) => {
                const n = PLAN_EXT.bloques.filter((b) => b.fase === f.id && b.fechas).length;
                const enCurso = f.inicio <= hoy && hoy <= f.fin;
                return <Fila key={f.id} titulo={`Fase ${f.id.slice(1)} · ${f.nombre}`} nota={`${fp(f.inicio)} – ${fp(f.fin)} · ${n} ${n === 1 ? 'bloque' : 'bloques'}`} valor={enCurso ? 'Ahora' : undefined} onClick={() => abrir(f)} />;
              })}
            </div>
          </Plegable>
        );
      })}

      <Hoja abierta={!!abierta} onCerrar={() => setAbierta(null)} alto="completa" titulo={fase ? `Fase ${fase.id.slice(1)} · ${fase.nombre}` : ''}>
        {fase && (
          <div className="mt-hoja">
            <p className="t-nota">{fp(fase.inicio)} – {fp(fase.fin)} · {bloques.length} {bloques.length === 1 ? 'bloque' : 'bloques'}</p>
            {bloques.map((b) => {
              const det = V122.detalle[b.id];
              const lineas = [
                ...(det?.versiones.map((v) => `v${v.id}${v.inicio ? ` · ${fp(v.inicio)} – ${fp(v.fin!)}` : ''}: ${v.linea}`) ?? []),
                ...(b.certs?.map((c) => `${c.nombre} · ${c.horas} h · ${c.plan.map((p) => `${fp(p.fecha)} ${p.texto}`).join(' · ')}`) ?? []),
                ...(b.hitos?.map((h) => `d${h.dias[0]}–${h.dias[1]} ${h.tema} → ${h.hito}`) ?? []),
                ...(fondoTxt(b.id) ? [fondoTxt(b.id)!] : []),
              ];
              return (
                <section key={b.id} className={`capa-1 mt-bloque-det ${b.tipo}`} aria-label={b.nombre}>
                  <a className="mt-bloque-titulo" href={`#/metas/periodos/${b.id}`}>
                    <span className="t-encabezado">{b.nombre}</span>
                    <Icono nombre="siguiente" lado={18} />
                  </a>
                  <p className="t-rotulo">{b.id} · {fp(b.fechas!.inicio)} – {fp(b.fechas!.fin)}{b.horas ? ` · ${String(b.horas).replace('.', ',')} h` : ''}{b.horasLim ? ` (lím ${b.horasLim})` : ''}</p>
                  {lineas.length > 0 && <ul className="mt-detalle-lista t-nota">{lineas.map((l, i) => <li key={i}>{l}</li>)}</ul>}
                </section>
              );
            })}
          </div>
        )}
      </Hoja>
    </Marco>
  );
}
