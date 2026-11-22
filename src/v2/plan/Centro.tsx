/**
 * Trazo 2.0 · el centro del Plan (#/metas). Reemplaza a nueve pantallas de la 1.0 (Ruta, Períodos, Etapas, Mapa, Roadmap…):
 * arriba el bloque que corre ahora y por dónde vas adentro; después lo que viene, con un zoom por horizonte (la semana día por
 * día, el mes, el bimestre, el año); las cuatro etapas; lo de fondo; y abajo, todo lo demás del plan, a un toque.
 */
import { useMemo, useState } from 'react';
import { fondoEn, periodosComerciales, periodosSecundarias } from '../../data/fondo';
import { activoAhora, medir } from '../../data/periodos';
import { SEMANAS, semanaDelPlan } from '../../data/plan';
import { useStore } from '../../state/store';
import { hrefPeriodo } from '../../ui/PeriodoTarjeta';
import { usePeriodos } from '../../ui/usePeriodos';
import { Icono } from '../iconos';
import { Boton, Segmentado } from '../kit/controles';
import { Fila, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { Escalonado } from '../movimiento/componentes';
import { HORIZONTES, enHorizonte, fecha, heroeDe, semana, type Horizonte } from './datos';
import { FilaPeriodo, HeroePeriodo, usarNombres } from './TarjetaPeriodo';

const DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TOPE = 6;

const INFO = (
  <>
    <p className="t-cuerpo-l">El plan entero, de la etapa al lote. Arriba, lo que corre hoy.</p>
    <p className="t-cuerpo">Cada meta es un período: la barra es el trabajo hecho y la raya, cuánto tiempo pasó. Si la barra queda atrás de la raya, vas atrasado.</p>
    <p className="t-cuerpo">El zoom cambia el horizonte: la semana día por día, el mes con versiones y exámenes, el bimestre con bloques y el año con fases.</p>
    <p className="t-cuerpo">Tocá cualquier tarjeta para entrar: crece hasta su pantalla y muestra lo de adentro.</p>
  </>
);

export function Centro({ hoy }: { hoy: string }) {
  const { arbol } = usePeriodos(hoy);
  const plan = useStore((s) => s.plan);
  const t0 = useStore((s) => s.settings?.startDate);
  const [horizonte, setHorizonte] = useState<Horizonte>('semana');
  const [todos, setTodos] = useState(false);
  const vt = usarNombres();
  const cadena = activoAhora(arbol, hoy).filter((p) => p.nivel !== 'etapa');
  const heroe = heroeDe(cadena);
  const adentro = heroe ? cadena.slice(cadena.indexOf(heroe) + 1) : [];
  const sem = semanaDelPlan(hoy, t0);
  const fondo = useMemo(() => {
    const vigente = <T extends { fin: string }>(xs: T[]) => xs.find((x) => x.fin >= hoy);
    return { sec: vigente(periodosSecundarias(plan).map((p) => medir(p, hoy))), com: vigente(periodosComerciales(plan).map((p) => medir(p, hoy))), pausa: fondoEn(hoy).pausa };
  }, [plan, hoy]);
  const lista = horizonte === 'semana' ? [] : enHorizonte(arbol, hoy, horizonte);
  const visibles = todos ? lista : lista.slice(0, TOPE);

  return (
    <Marco className="pl" titulo="Plan" rotulo={sem >= 1 && sem <= SEMANAS ? `Semana ${sem} de ${SEMANAS}` : undefined} info={INFO}
      acciones={<Boton soloIcono variante="fantasma" icono="linea" etiqueta="Línea de tiempo" href="#/metas/linea" />}>
      <nav className="pl-lentes" aria-label="Cómo ver el plan">
        <a href="#/metas" aria-current="page" data-transicion="fundido"><Icono nombre="plan" lado={18} />Ahora</a>
        <a href="#/metas/linea" data-transicion="fundido"><Icono nombre="linea" lado={18} />Línea</a>
        <a href="#/metas/mapa" data-transicion="fundido"><Icono nombre="mapa" lado={18} />Mapa</a>
      </nav>

      {heroe ? <HeroePeriodo p={heroe} hoy={hoy} vt={vt(heroe.id)} href={hrefPeriodo(heroe.id)} conDatos={false} />
        : <Vacio ilustracion="plan" titulo="Sin período activo hoy" texto="El plan arranca más adelante o ya terminó." />}

      {adentro.length > 0 && (
        <Grupo titulo={`Adentro de ${heroe!.nombre}`}>
          <div className="capa-1 pl-lista">{adentro.map((p) => <FilaPeriodo key={p.id} p={p} hoy={hoy} vt={vt(p.id)} href={hrefPeriodo(p.id)} />)}</div>
        </Grupo>
      )}

      <Grupo titulo="Lo que viene">
        <Segmentado etiqueta="Horizonte" valor={horizonte} opciones={HORIZONTES} onCambio={(h) => { setHorizonte(h); setTodos(false); }} />
        {horizonte === 'semana' ? (
          <Escalonado como="ul" className="capa-1 pl-semana" clave="semana">
            {semana(arbol, hoy).map((d, i) => (
              <li key={d.fecha} className={d.fecha === hoy ? 'hoy' : d.fecha < hoy ? 'pasado' : undefined}>
                <span className="pl-semana-dia"><span className="t-rotulo">{DIA[i]}</span><b className={`t-dato${d.fecha === hoy ? ' trazo-marca' : ''}`}>{Number(d.fecha.slice(8))}</b></span>
                <span className="pl-semana-texto">
                  {d.bloque ? <a href={hrefPeriodo(d.bloque.id)} data-transicion="zoom-in">{d.bloque.nombre}</a> : <span className="t-nota">Sin bloque</span>}
                  {d.vence.length > 0 && <small><Icono nombre="reloj" lado={14} />Vence: {d.vence.map((p) => p.nombre).join(' · ')}</small>}
                </span>
              </li>
            ))}
          </Escalonado>
        ) : lista.length ? (
          <>
            <Escalonado className="capa-1 pl-lista" clave={horizonte}>{visibles.map((p) => <FilaPeriodo key={p.id} p={p} hoy={hoy} vt={vt(p.id)} href={hrefPeriodo(p.id)} />)}</Escalonado>
            {lista.length > visibles.length && <Boton tamano="s" variante="fantasma" icono="abajo" onClick={() => setTodos(true)}>Ver {lista.length - visibles.length} más</Boton>}
          </>
        ) : <Vacio ilustracion="plan" titulo="Nada en este horizonte" />}
      </Grupo>

      <Grupo titulo="Las 4 etapas">
        <div className="capa-1 pl-lista">{arbol.map((e) => <FilaPeriodo key={e.id} p={e} hoy={hoy} vt={vt(e.id)} />)}</div>
      </Grupo>

      <Grupo titulo="De fondo" extremo={fondo.pausa ? <span className="t-rotulo">En pausa · {fondo.pausa.nombre}</span> : undefined}>
        <div className="capa-1 pl-lista">
          {fondo.sec && <FilaPeriodo p={fondo.sec} hoy={hoy} href={`#/metas/fondo/${fondo.sec.id}`} />}
          {fondo.com && <FilaPeriodo p={fondo.com} hoy={hoy} href={`#/metas/fondo/${fondo.com.id}`} />}
        </div>
        <div className="capa-1 s-lista">
          <Fila icono="fondo" titulo="Las pistas de fondo" nota="Apps secundarias y showcases" href="#/metas/pista/secundaria" />
          <Fila icono="paquete" titulo="Open source" nota="Alawys y las herramientas" href="#/metas/open-source" />
        </div>
      </Grupo>

      <Grupo titulo="Tus metas">
        <div className="capa-1 s-lista">
          <Fila icono="estrella" titulo="P0 · Constelación v1" nota="Tus metas de siempre" href="#/metas/proyecto/P0" />
          <Fila icono="calendario" titulo="De la semana" href="#/metas/semana" />
          <Fila icono="calendario" titulo="Del mes" href="#/metas/mes" />
          <Fila icono="calendario" titulo="Del bimestre" href="#/metas/bimestre" />
          <Fila icono="calendario" titulo="Del año" href="#/metas/anio" />
        </div>
      </Grupo>

      <Grupo titulo="Más del plan">
        <div className="capa-1 s-lista">
          <Fila icono="grafico" titulo="Análisis" nota="Calibración, diferencia, impacto y revisión" href="#/metas/analisis" />
          <Fila icono="mapa" titulo="El plan entero" nota={`Con lo de fondo · hasta el ${fecha(arbol[arbol.length - 1]?.fin ?? hoy, hoy)}`} href="#/metas/roadmap" />
          <Fila icono="ritmo" titulo="La ruta por ramas" nota="Las seis ramas y lo que viene" href="#/metas/ruta" />
          <Fila icono="hardware" titulo="Etapas, trámites y compras" href="#/metas/etapas" />
        </div>
      </Grupo>
    </Marco>
  );
}
