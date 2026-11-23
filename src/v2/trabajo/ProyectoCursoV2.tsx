/**
 * Trazo 2.0 · el proyecto en curso (#/metas/proyecto) y P0, Constelación v1 (#/metas/proyecto/P0). P0 son tus metas de siempre: sus metas
 * y sus datos no cambian, solo cómo se presentan. Va con las piezas de las páginas de bloque (portada, pestañas, metas propias y
 * una fila por cosa que se carga para cerrar), sin lo que la 1.0 tampoco le mostraba (versiones, estándar de alto valor, entrevista
 * técnica y tiempo real). Sin id, la ruta es "el que está en curso": abre la página de ese bloque (o esta, si el que corre es P0).
 */
import { useState } from 'react';
import { PLAN, tramoActivo, tramoPorId, type Tramo } from '../../data/plan';
import { bloqueConFechas } from '../../data/plan-vistas';
import { avanceBloque } from '../../data/metas-bloque';
import { EVIDENCIAS } from '../../data/plan-state';
import { useStore } from '../../state/store';
import { fp } from '../../ui/periodos';
import { Boton, Segmentado } from '../kit/controles';
import { Dato, Estado, Fila } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { MetasDelBloque } from '../proyecto/MetasBloque';
import { FichaTab, StackTab, tieneStack } from '../proyecto/Pestanas';
import { Portada } from '../proyecto/Portada';
import { ProyectoV2 } from '../proyecto/ProyectoV2';
import { Agentico, Arquitectura, Evidencia, Examen, HorasFechas, Revisiones } from '../proyecto/Secciones';
import { cuando, fichaFilas, primeraFrase, vecinos } from '../proyecto/datos';
import type { PropsV2 } from '../registro';
import { AREA, useT0 } from './comun';
import '../proyecto/proyecto.css';
import './trabajo.css';

type Pestana = 'resumen' | 'ficha' | 'stack';

const info = (que: string) => (
  <>
    <p className="t-cuerpo-l">{que}.</p>
    <p className="t-cuerpo">P0 son tus metas de siempre: el portfolio como mapa 3D, Trazo como caso, el CV, LinkedIn y el pitch.</p>
    <p className="t-cuerpo">Resumen es lo que tenés que ir marcando. Ficha cuenta qué se construye y por qué. Stack, con qué.</p>
    <p className="t-cuerpo">Sin las tres evidencias, además de los tests y la seguridad, el proyecto no cierra.</p>
  </>
);

function P0({ t, hoy, t0 }: { t: Tramo; hoy: string; t0: string }) {
  const b = bloqueConFechas(t.id, t0);
  const metas = useStore((s) => s.plan.metasBloque?.[t.id]);
  const evid = useStore((s) => s.plan.proyectos[t.id]?.evidencia);
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const inicio = b?.inicio ?? '';
  const fin = b?.fin ?? '';
  const av = avanceBloque(metas);
  const nEvid = EVIDENCIAS.filter(([k]) => evid?.[k]).length;
  const estado = hoy < inicio ? 'proximo' : hoy > fin ? 'hecho' : 'en-plan';
  const grupos = fichaFilas(t.id);
  const tabs: [Pestana, string][] = [['resumen', 'Resumen'], ...(grupos.length ? [['ficha', 'Ficha'] as [Pestana, string]] : []), ...(tieneStack(t.id, t) ? [['stack', 'Stack'] as [Pestana, string]] : [])];
  const actual: Pestana = tabs.some(([k]) => k === pestana) ? pestana : 'resumen';
  const creditos = PLAN.programacion.creditos[t.id];
  const { sig } = vecinos(t.id);
  const activo = tramoActivo(hoy, t0);
  return (
    <Marco className="pt" titulo={b?.nombre ?? t.nombre} info={info(t.que)} volver={{ href: '#/metas', nombre: 'Plan' }}>
      <Portada id={t.id} tipo="proyecto" area={AREA.programacion}>
        <span className="t-rotulo">Programación · {t.id}</span>
        <div className="pt-hero-fila"><Estado estado={estado} texto={estado === 'hecho' ? 'Cerrado' : undefined} />{inicio && <span className="t-dato">{cuando(inicio, fin, b?.horas)}</span>}</div>
      </Portada>

      <p className="t-cuerpo-l pt-que">{primeraFrase(t.que.split(';')[0])}</p>
      <div className="pt-datos">
        <Dato valor={av.total ? `${av.hechas} de ${av.total}` : '—'} etiqueta="Metas" />
        <Dato valor={`${nEvid} de ${EVIDENCIAS.length}`} etiqueta="Evidencias" />
        {fin && <Dato valor={fp(fin)} etiqueta="Cierra" />}
      </div>

      {tabs.length > 1 && <div className="pt-pestanas"><Segmentado etiqueta="Qué ver" opciones={tabs} valor={actual} onCambio={setPestana} /></div>}

      {actual === 'ficha' && <FichaTab id={t.id} />}
      {actual === 'stack' && <StackTab id={t.id} t={t} />}
      {actual === 'resumen' && (
        <>
          <MetasDelBloque bloque={t.id} hoy={hoy} titulo={`Metas de ${t.id}`} />

          <Grupo titulo="Para cerrar" extremo={fin ? <span className="t-rotulo">Cierra el {fp(fin)}</span> : undefined}>
            <div className="capa-1 s-lista">
              <Evidencia id={t.id} />
              {b?.ficha?.entregablesArquitectura && <Arquitectura id={t.id} />}
              <Agentico id={t.id} />
              <Revisiones id={t.id} hoy={hoy} />
              <Examen id={t.id} hoy={hoy} />
              {b && <HorasFechas b={b} />}
              {creditos != null && <Fila icono="dinero" titulo="Créditos de la API de Claude" nota="Tope por agente y evals con un modelo chico" valor={`US$ ${creditos} de ${PLAN.programacion.creditos.total}`} />}
            </div>
            <p className="t-nota pt-pie">La base queda lista para los proyectos del plan.</p>
          </Grupo>

          {(sig || t.id !== activo.id) && (
            <nav className="pt-vecinos" aria-label="Bloques vecinos">
              {t.id !== activo.id ? <Boton tamano="s" variante="fantasma" icono="reloj" href="#/metas/proyecto">En curso</Boton> : <span />}
              {sig ? <Boton tamano="s" variante="fantasma" icono="siguiente" href={`#/metas/proyecto/${sig.id}`}>{`Sigue: ${sig.id}`}</Boton> : <span />}
            </nav>
          )}
        </>
      )}
    </Marco>
  );
}

export default function ProyectoCursoV2({ ruta, today }: PropsV2) {
  const t0 = useT0();
  const id = ruta.param === 'proyecto' ? tramoActivo(today, t0).id : 'P0';
  const t = tramoPorId(id);
  if (id === 'P0' && t) return <P0 t={t} hoy={today} t0={t0} />;
  return <ProyectoV2 key={id} id={id} hoy={today} />;
}
