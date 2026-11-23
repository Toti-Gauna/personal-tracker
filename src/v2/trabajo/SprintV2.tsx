/**
 * Trazo 2.0 · Búsqueda intensiva (#/metas/sprint): el sprint de 14 días. Arriba en qué día vas y los 14 días; después el embudo contra
 * sus metas (que son supuestos y se cambian), lo que hace funcionar el sprint, lo que está en pausa sin borrar y qué mirar el día 14.
 * Mismos datos y mismas funciones que la 1.0; los números salen de lo registrado.
 */
import { useState } from 'react';
import { T0_PLAN } from '../../data/plan';
import { DIAS_SPRINT, EMBUDO_DEFAULT, acompanaSprint, embudoSprint, sprintActual } from '../../data/sprint';
import { setMetaEmbudo, toggleSprintCheck } from '../../state/plan';
import { useStore } from '../../state/store';
import { Boton, Contador } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Anillo, Barra, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja, Lista } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { AREA, dm, n1 } from './comun';
import '../proyecto/proyecto.css';
import './trabajo.css';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const FILAS_EMBUDO: [keyof typeof EMBUDO_DEFAULT, string][] = [
  ['aMedida', 'A medida'], ['mensajes', 'Mensajes'], ['respuestas', 'Respuestas'], ['recruiter', 'Con recruiter'], ['tecnica', 'Etapa técnica'], ['oferta', 'Oferta'],
];
const CHECKS: [string, string][] = [['cv', 'CV en inglés'], ['linkedin', 'LinkedIn'], ['caso', 'Caso']];

/** Una fila con su barra debajo: cómo va contra la meta. */
function FilaBarra({ titulo, nota, valor, v, meta, area }: { titulo: string; nota?: string; valor: string; v: number; meta: number; area?: string }) {
  return (
    <div className="tr-fila-barra">
      <div className="tr-fila-barra-cab"><span className="t-cuerpo">{titulo}{nota && <small className="t-rotulo"> {nota}</small>}</span><span className="t-dato">{valor}</span></div>
      <Barra valor={v} max={Math.max(1, meta)} nombre={`${titulo}: ${valor}`} area={area} />
    </div>
  );
}

export default function SprintV2({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const sp = sprintActual(date, plan, t0);
  const metas = { ...EMBUDO_DEFAULT, ...(plan.sprint?.metas ?? {}) };
  const real = embudoSprint(plan, sp.desde, sp.hasta);
  const ac = acompanaSprint(plan, days, sp.desde, sp.hasta, plan.sprint?.checks);
  const [editar, setEditar] = useState(false);
  const pausas = (plan.pausas ?? []).filter((p) => !p.hasta);
  const lunes0 = (new Date(`${sp.desde}T12:00`).getDay() + 6) % 7;

  const INFO = (
    <>
      <p className="t-cuerpo-l">Dos semanas para llenar el embudo.</p>
      <p className="t-cuerpo">Un proceso remoto suele tardar de 3 a 6 semanas hasta la oferta: si el día 14 no hay oferta, la rutina sigue igual y se ajusta el mensaje, no el esfuerzo.</p>
      <p className="t-cuerpo">Las metas del embudo son supuestos para medir tus tasas reales: las cambiás cuando quieras. Los números salen de lo que registrás.</p>
    </>
  );

  return (
    <Marco className="tr" titulo="Búsqueda intensiva" rotulo={`${dm(sp.desde)} al ${dm(sp.hasta)}${sp.numero > 1 ? ` · sprint ${sp.numero}` : ''}`} volver={{ href: '#/metas/analisis', nombre: 'Análisis' }} info={INFO}>
      <Tarjeta heroe area={AREA.trabajo} etiqueta="Día del sprint" className="tr-heroe">
        <div className="tr-heroe-fila">
          <Anillo nombre={`Día ${sp.dia} de ${DIAS_SPRINT}`} valor={sp.dia / DIAS_SPRINT} tamano={88} area={AREA.trabajo} etiqueta={String(sp.dia)} sub={`de ${DIAS_SPRINT}`} />
          <div className="tr-heroe-datos">
            <p className="t-seccion">Día {sp.dia}</p>
            <p className="t-nota">{sp.dia >= DIAS_SPRINT ? 'Hoy es la revisión.' : `Faltan ${DIAS_SPRINT - sp.dia} para la revisión.`}</p>
          </div>
        </div>
        <div className="tr-dias" role="img" data-grafico aria-label={`Día ${sp.dia} de ${DIAS_SPRINT}`}>
          {sp.dias.map((d, i) => {
            const dow = (lunes0 + i) % 7;
            return <span key={d} className={[d < date ? 'pas' : '', d === date ? 'hoy' : '', dow >= 5 ? 'finde' : ''].filter(Boolean).join(' ')}><small className="t-rotulo">{DIAS[dow]}</small><b className="t-dato">{Number(d.slice(8))}</b></span>;
          })}
        </div>
      </Tarjeta>

      <Grupo titulo="Embudo de las 2 semanas" extremo={<Boton tamano="s" variante="fantasma" icono="editar" onClick={() => setEditar(true)}>Cambiar metas</Boton>}>
        <div className="capa-1 tr-barras-lista">
          {FILAS_EMBUDO.map(([k, n]) => <FilaBarra key={k} titulo={n} valor={k === 'oferta' ? String(real[k]) : `${real[k]} de ${metas[k]}`} v={real[k]} meta={metas[k]} area={AREA.trabajo} />)}
        </div>
      </Grupo>

      <Grupo titulo="Lo que lo hace funcionar">
        <div className="capa-1 tr-barras-lista">
          <FilaBarra titulo="Inglés · sesiones" nota="inglés" valor={`${n1(ac.ingles)} de ${DIAS_SPRINT}`} v={ac.ingles} meta={DIAS_SPRINT} area={AREA.ingles} />
          <FilaBarra titulo="Simulacros completos" nota="inglés" valor={`${n1(ac.simulacros)} de 2`} v={ac.simulacros} meta={2} area={AREA.ingles} />
          <FilaBarra titulo="Clips publicados" nota="clipping" valor={`${n1(ac.clips)} de 50`} v={ac.clips} meta={50} area={AREA.eclipse} />
          <FilaBarra titulo="Matemática · horas" nota="CONAMAT" valor={`${n1(ac.mate)} de 28 h`} v={ac.mate} meta={28} area={AREA.matematica} />
        </div>
        <div className="capa-1 s-lista">
          <FilaHoja icono="documento" titulo="CV en inglés, LinkedIn y caso" nota="P0" valor={`${ac.cv} de 3`} hecho={ac.cv === 3} tituloHoja="CV, LinkedIn y caso">
            <Lista items={CHECKS.map(([k, n]) => ({ clave: k, etiqueta: n, marcada: !!plan.sprint?.checks?.[k] }))} onCambio={(k) => toggleSprintCheck(k)} />
          </FilaHoja>
        </div>
      </Grupo>

      {pausas.length > 0 && (
        <Grupo titulo="En pausa, sin borrar">
          <div className="capa-1 s-lista">
            {pausas.map((p) => (
              <Fila key={p.id} icono="pausa" titulo={p.objetivo === 'ventas' ? 'Ventas · Eclipse' : 'Handyx'}
                nota={p.objetivo === 'ventas' ? 'Prospectos, guiones y objeciones guardados. El sprint de ventas arranca cuando haya trabajo.' : 'Roadmap, cortes y backlog quedan congelados. El lanzamiento se corre lo mismo que dure la pausa.'}
                href={p.objetivo === 'handyx' ? '#/metas/handyx' : '#/metas/impacto'} />
            ))}
          </div>
        </Grupo>
      )}

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <FilaHoja icono="calendario" titulo="Qué mirar el día 14" valor={dm(sp.hasta)} tituloHoja="Qué mirar el día 14">
            <ol className="tr-pasos">
              <li className="t-cuerpo"><b>0 respuestas:</b> el problema es el CV o el mensaje. Se reescriben con el prompt 3; el volumen no se toca.</li>
              <li className="t-cuerpo"><b>Respuestas, pero no entrevistas:</b> el problema es el primer contacto. Más mensajes a quien decide.</li>
              <li className="t-cuerpo"><b>Entrevistas:</b> inglés y caso pasan adelante. La rutina sigue hasta que entre la oferta.</li>
            </ol>
          </FilaHoja>
          <Fila icono="ritmo" titulo="Qué cambia en la ruta" href="#/metas/impacto" />
        </div>
      </Grupo>

      <Hoja abierta={editar} onCerrar={() => setEditar(false)} titulo="Metas del embudo" pie={<Boton variante="primario" ancho onClick={() => setEditar(false)}>Listo</Boton>}>
        <div className="pt-campo-hoja">
          {FILAS_EMBUDO.map(([k, n]) => <div key={k} className="tr-campo"><span className="t-rotulo">{n}</span><Contador etiqueta={`Meta de ${n}`} valor={metas[k]} min={0} unidad="para el día 14" onCambio={(v) => setMetaEmbudo(k, v)} /></div>)}
          <p className="t-nota">Son supuestos para medir tus tasas reales. Se guardan solos.</p>
        </div>
      </Hoja>
    </Marco>
  );
}
