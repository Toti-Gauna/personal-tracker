/** Aplica un JSON importado (7.7): cada tipo llama a las mismas acciones que usa la app a mano. */
import { actividadDe, commitDe, queCambia, type Importable } from '../data/importar';
import type { ErrType } from '../data/study-types';
import type { Rama } from '../data/types';
import { estadoPostulacion, fallaEntrevista, guardarEntrevista, guardarExamen, guardarImportacion, nuevaPostulacion, sumarContador, sumarFallaIngles, sumarHandyx, sumarRevision } from './plan';
import { getState } from './store';
import { addCards, saveTest } from './study';

const ERRS: ErrType[] = ['concepto', 'tecnica', 'descuido', 'enunciado'];

export function aplicarImportacion(d: Importable, hoy: string, colores: Record<Rama | 'main' | 'rutina', string>) {
  const st = getState();
  const resumen = queCambia(d, st.study, colores).map((c) => c.titulo);
  if (d.tipo === 'sesion') {
    const a = actividadDe(d, st.study);
    const unit = a?.units?.find((u) => u.n === d.capitulo);
    const deck = st.study.fronts.find((f) => f.id === a?.front)?.name ?? (d.rama === 'matematica' ? 'Matemática' : 'Programación');
    const frontId = a?.front ?? (d.rama === 'matematica' ? 'math' : 'prog');
    const wrong = (d.errores ?? []).map((e) => ({ q: `${e.tema}${e.nota ? `: ${e.nota}` : ''}`, a: 'Explicalo con un ejemplo y resolvé uno nuevo.', type: e.tipo, tema: e.tema }));
    if (d.test && a && unit) {
      const errors = Object.fromEntries(ERRS.map((t) => [t, (d.errores ?? []).filter((e) => e.tipo === t).length])) as Record<ErrType, number>;
      // saveTest crea una tarjeta por error y agenda la tesis y los repasos.
      saveTest(d.fecha, a.id, unit.n, { score: d.test.correctos, total: d.test.hechos, errors, mode: 'papel', wrong });
    } else if (wrong.length) {
      addCards(d.fecha, wrong.map((w) => ({ front: w.q, back: w.a, kind: 'ejercicio' as const, deck, frontId, source: 'Importado' })));
    }
    if (d.tarjetas?.length) addCards(d.fecha, d.tarjetas.map((t) => ({ front: t.frente, back: t.dorso, kind: 'pregunta' as const, deck, frontId, source: `Importado${a ? ` · ${a.title}` : ''}` })));
    if (d.minutos) sumarContador(d.fecha, d.rama === 'matematica' ? 'horas-mate' : 'horas-prog', Math.round((d.minutos / 60) * 10) / 10);
  } else if (d.tipo === 'revision') {
    d.hallazgos!.forEach((h) => sumarRevision(d.proyecto!, d.fecha, h.texto, h.tipo as 'concepto' | 'tecnica' | 'descuido'));
  } else if (d.tipo === 'examen') {
    guardarExamen(d.proyecto!, d.fecha, d.puntaje!);
    d.hallazgos?.forEach((h) => sumarRevision(d.proyecto!, d.fecha, h.texto, h.tipo as 'concepto' | 'tecnica' | 'descuido'));
  } else if (d.tipo === 'entrevista' || d.tipo === 'simulacro') {
    if (d.tipo === 'entrevista' && d.rama === 'trabajo') {
      const ya = getState().plan.entrevistas.find((e) => e.fecha === d.fecha);
      if (!ya) guardarEntrevista({ fecha: d.fecha, rol: d.rol ?? 'Entrevista', fallas: d.preguntas });
    }
    const ent = getState().plan.entrevistas.find((e) => e.fecha === d.fecha);
    for (const f of d.fallas ?? []) {
      if (ent) fallaEntrevista(ent.id, d.fecha, f.texto, d.rama === 'ingles' ? 'ingles' : 'programacion', f.tipo);
      else if (d.rama === 'ingles') sumarFallaIngles(d.fecha, f.texto, f.tipo);
      else addCards(d.fecha, [{ front: `Pregunta de entrevista: ${f.texto}`, back: 'Respondela completa, con un ejemplo de tus proyectos.', kind: 'explicar', deck: 'Programación', frontId: 'prog', source: 'Importado' }]);
    }
    if (d.tipo === 'simulacro' || d.rama === 'ingles') sumarContador(d.fecha, 'simulada');
  } else if (d.tipo === 'postulaciones') {
    for (const p of d.lista!) {
      nuevaPostulacion(d.fecha, { rol: p.rol, empresa: p.empresa, rango: p.rango });
      if (p.estado !== 'enviada') {
        const ultima = getState().plan.postulaciones[getState().plan.postulaciones.length - 1];
        estadoPostulacion(ultima.id, p.estado);
      }
    }
    if (d.mensajes) sumarContador(d.fecha, 'mensajes', d.mensajes);
  } else {
    sumarHandyx(d.fecha, { ...(d.horas !== undefined ? { horas: d.horas } : {}), ...(d.operaciones !== undefined ? { operaciones: d.operaciones } : {}) });
    sumarHandyx(d.fecha, { ...(d.ingresos !== undefined ? { ingresos: d.ingresos } : {}), ...(d.margen !== undefined ? { margen: d.margen } : {}), ...(d.usuarios !== undefined ? { clientes: d.usuarios } : {}) }, false);
  }
  const commit = commitDe(d, getState().study);
  guardarImportacion({ fecha: d.fecha, importado: hoy, tipo: d.tipo, rama: d.rama, resumen: [...resumen, commit] });
  return resumen;
}

