/**
 * Trazo 2.0 · las metas del bimestre (#/metas/bimestre y #/metas/bimestre/<n>): el bimestre es la unidad del plan. Sus semanas, una
 * meta por rama con su avance (se puede reescribir), los hitos, lo que pasa al cerrar y tus metas al lado. Se puede cambiar el nombre.
 */
import { useEffect, useRef, useState } from 'react';
import { appliesTo } from '../../data/goals';
import { alCerrar, filasBimestre, nombreBimestre, semanasDelBimestre } from '../../data/metas-plan';
import { BIMESTRES, PLAN, semanaDelPlan } from '../../data/plan';
import { parseDate } from '../../data/time';
import { renameBimester } from '../../state/goals';
import { useStore } from '../../state/store';
import { Boton, CampoTexto } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { dm, useCtx } from './datos';
import { FilaFija, FilaMetaPropia, HitosPeriodo, MapaPortfolio, Pestanas } from './piezas';
import './metas.css';

const INFO = (
  <>
    <p className="t-cuerpo-l">El bimestre es la unidad del plan.</p>
    <p className="t-cuerpo">{BIMESTRES} bimestres de {PLAN.semanasPorBimestre} semanas. Cada rama tiene su meta; la barra es lo que llevás hecho.</p>
    <p className="t-cuerpo">Tocá una meta para reescribirla: si la dejás vacía vuelve al texto del plan. Tocá el lápiz para cambiarle el nombre al bimestre.</p>
    <p className="t-cuerpo">Las letras de arriba son las semanas: la marcada es la de hoy.</p>
  </>
);

export default function BimestreV2({ day, ruta }: PropsV2) {
  const sub = ruta.param?.split('/')[1];
  return <Vista key={sub ?? ''} day={day} elegido={sub ? Number(sub) : undefined} />;
}

function Vista({ day, elegido }: { day: PropsV2['day']; elegido?: number }) {
  const date = day.date;
  const ctx = useCtx();
  const t0 = ctx.t0!;
  const nombres = useStore((s) => s.goals.bimesterNames);
  const actual = Math.min(BIMESTRES, Math.max(1, Math.ceil(Math.max(1, semanaDelPlan(date, t0)) / PLAN.semanasPorBimestre)));
  const [n, setN] = useState(elegido && elegido >= 1 && elegido <= BIMESTRES ? elegido : actual);
  const [renombrando, setRenombrando] = useState(false);
  const [texto, setTexto] = useState('');
  const b = semanasDelBimestre(n, t0);
  const nombre = nombreBimestre(n, nombres);
  const filas = filasBimestre(n, date, ctx, ctx.plan.editadas);
  const cierre = alCerrar(n, t0);
  const sHoy = semanaDelPlan(date, t0);
  const hito = PLAN.hitos.find((h) => h.id !== 'T+0' && h.semana >= b.desde && h.semana <= b.hasta);
  const quedan = Math.round((parseDate(b.fin).getTime() - parseDate(date).getTime()) / 864e5);
  const estado = date < b.inicio ? `empieza el ${dm(b.inicio)}` : date > b.fin ? `cerró el ${dm(b.fin)}` : `${quedan} ${quedan === 1 ? 'día' : 'días'}`;
  const personales = ctx.goals.filter((g) => appliesTo(g, 'bim', date));
  const original = PLAN.nombresBimestre[n - 1] || `B${n}`;
  const fila = useRef<HTMLDivElement>(null);
  // La pestaña elegida queda a la vista cuando hay más bimestres que ancho.
  useEffect(() => { (fila.current?.querySelector('[aria-selected="true"]') as HTMLElement | null)?.scrollIntoView?.({ inline: 'center', block: 'nearest' }); }, [n]);

  const guardarNombre = () => { renameBimester(n, texto); setRenombrando(false); };

  return (
    <Marco className="mt" titulo="Metas" volver={{ href: '#/metas', nombre: 'Plan' }} info={INFO}
      acciones={<Boton soloIcono variante="fantasma" icono="mas" etiqueta="Nueva meta del bimestre" href="#/meta-nueva/bim" />}>
      <Pestanas actual="bimestre" />

      <div className="mt-bims" role="tablist" aria-label="Bimestres del plan" ref={fila}>
        {Array.from({ length: BIMESTRES }, (_, i) => i + 1).map((x) => (
          <button key={x} type="button" role="tab" aria-selected={x === n} className={x === actual ? 'actual' : undefined} aria-label={`B${x}, bimestre ${x}${x === actual ? ', el de ahora' : ''}`} onClick={() => setN(x)}>B{x}</button>
        ))}
      </div>

      <Tarjeta heroe etiqueta={`Bimestre ${n} de ${BIMESTRES}`} className="mt-heroe">
        <p className="t-rotulo">{dm(b.inicio)} – {dm(b.fin)} · {estado}</p>
        <div className="mt-heroe-fila">
          <h2 className="t-seccion">{nombre}</h2>
          <Boton soloIcono variante="fantasma" tamano="s" icono="editar" etiqueta="Cambiar el nombre del bimestre" onClick={() => { setTexto(nombres[n]?.trim() ?? nombre); setRenombrando(true); }} />
        </div>
        <figure className="mt-semanas" role="img" aria-label={`Las ${b.semanas.length} semanas del bimestre: ${b.leyenda.join(', ')}`} data-grafico style={{ ['--n' as string]: b.semanas.length }}>
          <div>{b.semanas.map((x) => <span key={x.s} className={x.s === sHoy ? 'on' : x.s < sHoy ? 'pas' : undefined}>{x.letra}</span>)}</div>
          <figcaption className="t-nota">{b.leyenda.join(' · ')}</figcaption>
        </figure>
      </Tarjeta>

      <Grupo titulo="Ramas">
        <div className="capa-1 mt-lista">
          {filas.map((f) => <FilaFija key={f.rama} rama={f.rama} clave={f.clave} titulo={f.titulo} sub={f.sub} lado={f.lado} avance={f.avance} de="bimestre" />)}
        </div>
      </Grupo>

      <Grupo titulo="Más del bimestre">
        <div className="capa-1 s-lista">
          {n === 1 && <MapaPortfolio />}
          <HitosPeriodo desde={b.inicio} hasta={b.fin} date={date} />
          <Fila icono="meta" titulo={hito ? `Cierra con ${hito.id}` : 'Programación del bimestre'} nota={hito ? hito.titulo : PLAN.metasBimestre.programacion[n - 1]} />
          <Fila icono="reloj" titulo={`Al cerrar B${n} · ${dm(cierre.fecha)}`} nota={cierre.texto} />
        </div>
      </Grupo>

      <Grupo titulo="Tus metas del bimestre">
        <div className="capa-1 mt-lista">
          {personales.map((g) => <FilaMetaPropia key={g.id} g={g} date={date} />)}
          <Fila icono="mas" titulo="Meta del bimestre" nota={personales.length ? 'Agregar otra' : 'Agregar la primera'} href="#/meta-nueva/bim" />
        </div>
      </Grupo>

      <Hoja abierta={renombrando} onCerrar={() => setRenombrando(false)} titulo="Nombre del bimestre"
        pie={<><Boton variante="secundario" onClick={() => setRenombrando(false)}>Cancelar</Boton><Boton variante="primario" icono="tilde" onClick={guardarNombre}>Guardar nombre</Boton></>}>
        <CampoTexto etiqueta={`Nombre de B${n}`} valor={texto} onCambio={setTexto} maximo={30} nota={`Si lo dejás vacío vuelve a «${original}».`} />
      </Hoja>
    </Marco>
  );
}
