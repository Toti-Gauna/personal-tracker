/**
 * Trazo 2.0 · las micro-tesis de una unidad de un libro: una frase por capítulo, en tus palabras. Se guardan como puntos de la
 * unidad (el cold recall de mañana compara contra eso) y, si querés, como tarjetas. Mismas acciones que la 1.0.
 */
import { useState } from 'react';
import { claveMicro, libroPorId, unidadesDe } from '../../data/libros';
import type { Activity, StudyState } from '../../data/study-types';
import { useStore } from '../../state/store';
import { guardarMicrotesis } from '../../state/study';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Interruptor } from '../kit/controles';
import { Hoja } from '../kit/hoja';

const unidadDe = (a: Activity, n: number) => { const l = a.libro ? libroPorId(a.libro) : undefined; return l ? { l, u: unidadesDe(l).find((x) => x.n === n) } : { l: undefined, u: undefined }; };

/** Cuántas micro-tesis de la unidad están escritas. */
export function progresoMicro(study: StudyState, a: Activity, n: number) {
  const { u } = unidadDe(a, n);
  const micro = study.microtesis ?? {};
  const caps = u?.caps ?? [];
  return { guardadas: caps.filter((c) => micro[claveMicro(a.id, c)]?.texto.trim()).length, total: caps.length };
}

export function MicroTesisHoja({ abierta, onCerrar, date, a, n }: { abierta: boolean; onCerrar: () => void; date: string; a: Activity; n: number }) {
  const micro = useStore((s) => s.study.microtesis) ?? {};
  const { l, u } = unidadDe(a, n);
  const [textos, setTextos] = useState<Record<number, string>>(() => Object.fromEntries((u?.caps ?? []).map((c) => [c, micro[claveMicro(a.id, c)]?.texto ?? ''])));
  const [tarjeta, setTarjeta] = useState(true);
  if (!l || !u) return null;
  const cambio = u.caps.some((c) => (textos[c] ?? '').trim() !== (micro[claveMicro(a.id, c)]?.texto ?? ''));
  const guardar = () => {
    for (const c of u.caps) if ((textos[c] ?? '').trim() !== (micro[claveMicro(a.id, c)]?.texto ?? '')) guardarMicrotesis(date, a.id, c, textos[c] ?? '', tarjeta);
    aviso({ titulo: 'Micro-tesis guardadas', sub: tarjeta ? 'Las nuevas también quedan como tarjetas' : 'Quedan para el cold recall de mañana', tono: 'hecho' });
    onCerrar();
  };
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={`Micro-tesis · unidad ${n}`} alto="completa"
      pie={<Boton variante="primario" ancho icono="tilde" deshabilitado={cambio ? false : 'No hay nada nuevo para guardar.'} onClick={guardar}>Guardar micro-tesis</Boton>}>
      <div className="se-micro">
        {u.caps.map((c) => {
          const cap = l.capitulos.find((x) => x.n === c)!;
          return (
            <CampoTexto key={c} etiqueta={`Cap. ${c} · ${cap.titulo}`} nota={cap.sub} multilinea valor={textos[c] ?? ''} onCambio={(v) => setTextos((x) => ({ ...x, [c]: v }))} placeholder="La idea del capítulo en una frase, con tus palabras" />
          );
        })}
        <div className="capa-1 se-opcion"><Interruptor prendido={tarjeta} onCambio={setTarjeta} etiqueta="Hacer una tarjeta con cada una" nota="Solo con las micro-tesis nuevas" /></div>
      </div>
    </Hoja>
  );
}
