/**
 * Trazo 2.0 · De fondo (#/metas/fondo): lo que corre mientras vos hacés los proyectos principales. Qué está corriendo ahora, las
 * dos pistas (apps secundarias y showcases comerciales), el Imán de lo que está por lanzarse, el open source y el clipping.
 */
import { useMemo } from 'react';
import { fondoEn, periodosComerciales, periodosSecundarias } from '../../data/fondo';
import { HERRAMIENTAS } from '../../data/herramientas';
import { puntosIman } from '../../data/iman';
import { activoAhora, medir } from '../../data/periodos';
import { PLAN_EXT } from '../../data/plan-extendido';
import { V122 } from '../../data/v12-2';
import { useStore } from '../../state/store';
import { usePeriodos } from '../../ui/usePeriodos';
import { Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaPeriodo } from '../plan/TarjetaPeriodo';
import { AnilloIman, nombreDeItem } from './ImanV2';
import './proyecto.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">Lo que corre de fondo mientras hacés los proyectos principales.</p>
    <p className="t-cuerpo">Hay dos pistas: tus apps (secundaria) y showcases para marcas reales (comercial). No usan tus horas de foco.</p>
    <p className="t-cuerpo">Cada lanzamiento público lleva el Imán: 8 puntos para que se note.</p>
  </>
);

export function FondoHub({ hoy }: { hoy: string }) {
  const plan = useStore((s) => s.plan);
  const { arbol } = usePeriodos(hoy);
  const sec = useMemo(() => periodosSecundarias(plan).map((p) => medir(p, hoy)), [plan, hoy]);
  const com = useMemo(() => periodosComerciales(plan).map((p) => medir(p, hoy)), [plan, hoy]);
  const vigente = <T extends { fin: string }>(xs: T[]) => xs.find((x) => x.fin >= hoy);
  const ahoraSec = vigente(sec), ahoraCom = vigente(com);
  const pausa = fondoEn(hoy).pausa;
  const publicadas = HERRAMIENTAS.filter((h) => Object.values(plan.fondo?.[h.id]?.versiones ?? {}).some((v) => v.publicada)).length;
  const bloque = activoAhora(arbol, hoy).find((p) => p.nivel === 'bloque');
  const principal = bloque && PLAN_EXT.bloques.some((b) => b.id === bloque.id && b.tipo === 'proyecto') ? bloque.id : undefined;
  const lanzamientos = [principal, ahoraSec?.id, ahoraCom?.id].filter(Boolean) as string[];
  const publicados = V122.comerciales.filter((c) => ['published', 'pitched'].includes(plan.fondo?.[c.id]?.estado ?? 'planned')).length;
  return (
    <Marco className="pt" titulo="De fondo" info={INFO} volver={{ href: '#/metas', nombre: 'Plan' }}>
      <Grupo titulo="Corriendo ahora" extremo={pausa ? <span className="t-rotulo">En pausa · {pausa.nombre}</span> : undefined}>
        {ahoraSec || ahoraCom ? (
          <div className="capa-1 pl-lista">
            {ahoraSec && <FilaPeriodo p={ahoraSec} hoy={hoy} href={`#/metas/fondo/${ahoraSec.id}`} />}
            {ahoraCom && <FilaPeriodo p={ahoraCom} hoy={hoy} href={`#/metas/fondo/${ahoraCom.id}`} />}
          </div>
        ) : <p className="capa-1 pt-vacio t-cuerpo">Nada corre de fondo ahora.</p>}
      </Grupo>

      <Grupo titulo="Pistas">
        <div className="pt-pistas">
          <Tarjeta href="#/metas/pista/secundaria" etiqueta="Pista secundaria">
            <span className="t-rotulo">Secundaria</span>
            <b className="t-heroe">{sec.length}</b>
            <span className="t-nota">apps tuyas</span>
          </Tarjeta>
          <Tarjeta href="#/metas/pista/comercial" etiqueta="Pista comercial">
            <span className="t-rotulo">Comercial</span>
            <b className="t-heroe">{publicados}<small className="t-cuerpo"> de {V122.comerciales.length}</small></b>
            <span className="t-nota">showcases</span>
          </Tarjeta>
        </div>
      </Grupo>

      {lanzamientos.length > 0 && (
        <Grupo titulo="Imán de lo que viene">
          <div className="capa-1 s-lista">
            {lanzamientos.map((id) => {
              const ok = puntosIman(plan.iman?.[id]).map((p) => p.ok);
              return <Fila key={id} titulo={nombreDeItem(id, plan.fondo?.[id]?.marca)} nota={`${ok.filter(Boolean).length} de 8 puntos`} extremo={<AnilloIman ok={ok} tamano={36} grosor={4} />} href={`#/metas/iman/${id}`} />;
            })}
          </div>
        </Grupo>
      )}

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <Fila icono="paquete" titulo="Open source" nota={`${publicadas} publicadas · ${HERRAMIENTAS.length} en el plan`} href="#/metas/open-source" />
          <Fila icono="documento" titulo="Clipping" nota="Lo que leés y guardás" href="#/metas/clipping" />
        </div>
      </Grupo>
    </Marco>
  );
}
