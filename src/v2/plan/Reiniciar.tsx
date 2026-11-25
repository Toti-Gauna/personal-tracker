/**
 * Trazo 2.0 · empezar el plan de nuevo (en el centro del Plan). Si te atrasaste, o empezás más tarde, elegís desde qué día arranca
 * y todo lo planeado se vuelve a fechar desde ahí: el primer bloque sin terminar empieza ese día, lo que sigue lo acompaña (con sus
 * versiones, lotes y exámenes) y se frena en el próximo absorbedor, que se achica. Se ve qué cambia antes de confirmar y se puede
 * deshacer. Solo cambian las fechas: lo hecho (entregables, lotes, horas, notas) queda guardado.
 */
import { useMemo, useState } from 'react';
import { fijasDeReservas } from '../../data/certs-v12';
import { corrimientoDeFondo, reiniciarDesde, type Corrimiento, type PeriodoMedido } from '../../data/periodos';
import { itemsDeFondo } from '../../data/fondo';
import { ABSORBEN, secuenciaPlan } from '../../data/periodos-plan';
import { PLAN_EXT } from '../../data/plan-extendido';
import { confirmarCorrimiento, restaurarCorrimientos, volverTodoAlPlan } from '../../state/plan';
import { getState } from '../../state/store';
import { usePeriodos } from '../../ui/usePeriodos';
import { aviso } from '../kit/capas';
import { Boton, CampoFecha } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Fila } from '../kit/superficies';
import { fecha } from './datos';

/** El primer bloque sin terminar que no es un absorbedor: desde ahí se vuelve a fechar. */
export const anclaDelPlan = (arbol: PeriodoMedido[]): PeriodoMedido | undefined =>
  arbol.flatMap((e) => e.hijos ?? []).flatMap((f) => f.hijos ?? []).find((b) => b.estado !== 'hecho' && !ABSORBEN.has(PLAN_EXT.bloques.find((x) => x.id === b.id)?.tipo ?? ''));

export function ReiniciarPlan({ hoy }: { hoy: string }) {
  const { arbol, cal, plan } = usePeriodos(hoy);
  const [abierta, setAbierta] = useState(false);
  const [desde, setDesde] = useState(hoy);
  const ancla = useMemo(() => anclaDelPlan(arbol), [arbol]);
  const { cs, fondo } = useMemo(() => {
    if (!abierta || !ancla) return { cs: [] as Corrimiento[], fondo: [] as Corrimiento[] };
    const reservas = fijasDeReservas(plan);
    const seq = secuenciaPlan(cal, reservas);
    const cs = reiniciarDesde(seq, ancla.id, desde, [...(PLAN_EXT.capacidad?.fijas ?? []), ...reservas]);
    return { cs, fondo: corrimientoDeFondo(itemsDeFondo(), seq, cs) };
  }, [abierta, ancla, cal, plan, desde]);
  const hayCorridos = Object.keys(plan.corrimientos ?? {}).length > 0;
  const primero = cs.find((c) => c.id === ancla?.id);
  const absorbidos = cs.filter((c) => c.absorbe);
  const bloques = cs.length - absorbidos.length;

  const empezar = () => {
    const antes = getState().plan.corrimientos;
    confirmarCorrimiento([...cs, ...fondo], hoy);
    setAbierta(false);
    aviso({ titulo: 'Plan empezado de nuevo', sub: `${ancla?.nombre ?? 'El plan'} arranca el ${fecha(desde, hoy)}`, tono: 'hecho', deshacer: () => restaurarCorrimientos(antes) });
  };
  const volver = () => {
    const antes = volverTodoAlPlan();
    setAbierta(false);
    aviso({ titulo: 'Fechas del plan', sub: 'Se sacaron todos los corrimientos', tono: 'hecho', deshacer: () => restaurarCorrimientos(antes) });
  };

  return (
    <>
      <Fila icono="deshacer" titulo="Empezar el plan de nuevo" nota="Volver a fechar todo desde un día" onClick={() => { setDesde(hoy); setAbierta(true); }} />
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Empezar de nuevo"
        pie={<Boton variante="primario" icono="calendario" deshabilitado={cs.length ? false : ancla ? 'Ya está fechado desde ese día.' : 'No hay nada sin terminar.'} onClick={empezar}>Empezar el {fecha(desde, hoy)}</Boton>}>
        <p className="t-cuerpo-l">Todo lo planeado se vuelve a fechar desde el día que elijas, para que nada quede atrasado.</p>
        <CampoFecha etiqueta="Empiezo el" valor={desde} onCambio={setDesde} hoy={hoy} />
        {primero && ancla && (
          <div className="capa-2 pl-reiniciar" role="group" aria-label="Qué cambia">
            <p className="t-cuerpo"><b>{ancla.nombre}</b> pasa a <span className="t-dato">{fecha(primero.nuevoInicio, hoy)} – {fecha(primero.nuevoFin, hoy)}</span>.</p>
            {bloques > 1 && <p className="t-nota">Los {bloques - 1} que siguen lo acompañan, con sus versiones, lotes y exámenes.</p>}
            {absorbidos.map((c) => <p key={c.id} className="t-nota">{c.nombre ?? c.id} {c.nuevoFin === c.fin ? 'se achica y conserva su fin' : 'queda en 3 días'}: {fecha(c.nuevoInicio, hoy)} – {fecha(c.nuevoFin, hoy)}.</p>)}
            <p className="t-nota">{absorbidos.length ? 'Desde ahí, nada cambia.' : 'Nada frena el corrimiento: llega hasta el final del plan.'}{fondo.length ? ' Lo de fondo se corre con su ventana.' : ''}</p>
          </div>
        )}
        <p className="t-nota">La pausa de diciembre y los exámenes reservados no se mueven. Lo que ya hiciste (entregables, lotes, horas, notas) queda guardado: solo cambian las fechas.</p>
        {hayCorridos && <Boton variante="fantasma" icono="deshacer" onClick={volver}>Volver todo a las fechas del plan</Boton>}
      </Hoja>
    </>
  );
}
