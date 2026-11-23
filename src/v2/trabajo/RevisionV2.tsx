/**
 * Trazo 2.0 · Revisión semanal (#/metas/revision): la hora del domingo para mirar la semana y dejar lista la que viene. Arriba cuántos
 * de los cinco puntos van; después los puntos, la semana en números (con los dos contadores a mano), lo de fondo, lo que viene, la
 * nota y "Revisión hecha". Mismos datos y mismas funciones que la 1.0; "hecha" se deshace desde el aviso o desde el botón.
 */
import { useState } from 'react';
import { diferenciaRoadmap, resumenDiferencia, textoDelta } from '../../data/diferencia';
import { alertas, calendarioCompleto } from '../../data/plan-vistas';
import { PUNTOS_REVISION, lunesDeFecha, resumenSemana } from '../../data/revision';
import { addDays } from '../../data/time';
import { marcarRevisionHecha, notaRevision, sumarContador, tildarRevision } from '../../state/plan';
import { inicioTrabajo, intensivaEn, useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Contador } from '../kit/controles';
import { Anillo, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja, Lista } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { AREA, dm, dma, n1, useT0 } from './comun';
import { GrupoFondo } from './FondoRevision';
import '../proyecto/proyecto.css';
import './trabajo.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">El domingo a las 14:00, una hora: mirar la semana y dejar lista la que viene.</p>
    <p className="t-cuerpo">Los cinco puntos se tildan a medida que los revisás. Las horas salen del foco de cada bloque; hours.md, en el repo privado, es la copia que queda fuera de Trazo.</p>
    <p className="t-cuerpo">Las revisiones anteriores quedan en el historial.</p>
  </>
);

export default function RevisionV2({ today }: PropsV2) {
  const hoy = today;
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  const settings = useStore((s) => s.settings);
  const clipping = useStore((s) => s.clipping);
  const t0 = useT0();
  const inicio = inicioTrabajo(settings);
  const lunes = lunesDeFecha(hoy);
  const r = plan.revisionesSemanales?.[lunes] ?? { checks: [] };
  const [nota, setNota] = useState(r.nota ?? '');
  const res = resumenSemana(lunes, hoy, { plan, days, t0, inicioTrabajo: inicio, intensiva: intensivaEn(settings, hoy) });
  const dif = resumenDiferencia(diferenciaRoadmap(calendarioCompleto(t0)));
  const viene = alertas(hoy, plan, t0, clipping, { days, inicioTrabajo: inicio }).filter((a) => a.fecha <= addDays(hoy, 14)).slice(0, 6);
  const anteriores = Object.entries(plan.revisionesSemanales ?? {}).filter(([l, x]) => l < lunes && x.hecha).sort(([a], [b]) => b.localeCompare(a));
  const total = PUNTOS_REVISION.length;
  const hecha = r.hecha;

  const terminar = () => {
    notaRevision(lunes, nota);
    marcarRevisionHecha(lunes, hoy);
    aviso({ titulo: 'Revisión hecha', sub: `Semana del ${dm(res.lunes)} al ${dm(res.domingo)}`, tono: 'hecho', deshacer: () => marcarRevisionHecha(lunes, null) });
  };
  const deshacer = () => { const antes = hecha!; marcarRevisionHecha(lunes, null); aviso({ titulo: 'Revisión sin marcar', deshacer: () => marcarRevisionHecha(lunes, antes) }); };

  return (
    <Marco className="tr" titulo="Revisión semanal" rotulo={`Semana del ${dm(res.lunes)} al ${dm(res.domingo)}`} volver={{ href: '#/metas/analisis', nombre: 'Análisis' }} info={INFO}>
      <Tarjeta heroe area={AREA.programacion} etiqueta="Cómo va la revisión" className="tr-heroe">
        <div className="tr-heroe-fila">
          <Anillo nombre={`${r.checks.length} de ${total} puntos revisados`} valor={r.checks.length / total} tamano={88} area={AREA.programacion} etiqueta={String(r.checks.length)} sub={`de ${total}`} />
          <div className="tr-heroe-datos">
            <p className="t-seccion">{hecha ? 'Hecha' : 'Puntos revisados'}</p>
            {hecha && <p className="t-nota">El {dm(hecha)}.</p>}
          </div>
        </div>
      </Tarjeta>

      <Grupo titulo="Los cinco puntos">
        <Lista items={PUNTOS_REVISION.map((p, i) => ({ clave: String(i), etiqueta: p, marcada: r.checks.includes(i) }))} onCambio={(k) => tildarRevision(lunes, Number(k))} festejo={false} />
      </Grupo>

      <Grupo titulo="La semana en números">
        <div className="capa-1 s-lista">
          <Fila icono="codigo" titulo="Programación" valor={`${n1(res.horas.prog.real)} de ${n1(res.horas.prog.plan)} h`} />
          <Fila icono="matematica" titulo="Matemática" valor={`${n1(res.horas.mate.real)} de ${n1(res.horas.mate.plan)} h`} />
          <Fila icono="cohete" titulo="Versiones publicadas" valor={res.versiones.length ? res.versiones.map((v) => `${v.proyecto} ${v.version}`).join(', ') : 'Ninguna'} />
          <Fila icono="documento" titulo="Algorithm spots" nota={res.problemas ? `${res.problemas} ${res.problemas === 1 ? 'problema' : 'problemas'} sin IA` : undefined} valor={res.spots.length ? `${res.spots.length} plantados` : 'Ninguno'} />
        </div>
        <div className="tr-contadores">
          {res.contadores.map((c) => (
            <div key={c.id} className="capa-1 tr-contador">
              <span className="t-rotulo">{c.nombre}</span>
              <Contador etiqueta={c.nombre} valor={c.v} min={0} unidad={`de ${c.meta}`} onCambio={(v) => sumarContador(hoy, c.id, v - c.v)} />
              <span className="t-nota">{c.total} en total</span>
            </div>
          ))}
        </div>
      </Grupo>

      <GrupoFondo hoy={hoy} lunes={lunes} />

      {(viene.length > 0 || dif) && (
        <Grupo titulo="Lo que viene">
          <div className="capa-1 s-lista">
            {dif && <Fila icono="calendario" titulo={`El plan termina el ${dma(dif.fin)}`} nota={`${textoDelta(dif.delta)} que el roadmap`} href="#/metas/diferencia" />}
            {viene.map((a) => <Fila key={a.id} icono="campana" titulo={a.titulo} nota={a.texto} href={a.href} />)}
          </div>
        </Grupo>
      )}

      <Grupo titulo="Nota de la semana">
        <div onBlur={() => { if (nota !== (r.nota ?? '')) notaRevision(lunes, nota); }}>
          <CampoTexto etiqueta="Nota de la semana" multilinea valor={nota} onCambio={setNota} placeholder="Qué salió, qué no y qué cambia la semana que viene" />
        </div>
        {hecha
          ? <Boton variante="secundario" ancho icono="deshacer" onClick={deshacer}>Deshacer “hecha”</Boton>
          : <Boton variante="primario" ancho icono="tilde" onClick={terminar}>Revisión hecha</Boton>}
      </Grupo>

      {anteriores.length > 0 && (
        <div className="capa-1 s-lista">
          <FilaHoja icono="calendario" titulo="Revisiones anteriores" valor={String(anteriores.length)}>
            <ul className="capa-1 pt-revs">
              {anteriores.map(([l, x]) => <li key={l}><span className="t-rotulo">{dm(l)} · {x.checks.length} de {total}</span>{x.nota && <span className="t-cuerpo">{x.nota}</span>}</li>)}
            </ul>
          </FilaHoja>
        </div>
      )}
    </Marco>
  );
}
