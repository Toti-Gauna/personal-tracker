import { useState } from 'react';
import { claveMicro, libroPorId, unidadesDe } from '../data/libros';
import type { Activity } from '../data/study-types';
import { useStore } from '../state/store';
import { guardarMicrotesis } from '../state/study';
import { toast } from './avisos';

/**
 * Las micro-tesis de una unidad de un libro: una frase por capítulo, en tus palabras. Se guardan
 * como puntos de la unidad (el cold recall de mañana compara contra eso) y, si querés, como tarjetas.
 */
export function MicroTesis({ date, a, n, titulo = true }: { date: string; a: Activity; n: number; titulo?: boolean }) {
  const guardado = useStore((s) => s.study.microtesis);
  const micro = guardado ?? {};
  const l = a.libro ? libroPorId(a.libro) : undefined;
  const u = l ? unidadesDe(l).find((x) => x.n === n) : undefined;
  const [textos, setTextos] = useState<Record<number, string>>(() => Object.fromEntries((u?.caps ?? []).map((c) => [c, micro[claveMicro(a.id, c)]?.texto ?? ''])));
  const [tarjeta, setTarjeta] = useState(true);
  if (!l || !u) return null;
  const guardadas = u.caps.filter((c) => micro[claveMicro(a.id, c)]?.texto.trim()).length;
  const cambio = u.caps.some((c) => (textos[c] ?? '').trim() !== (micro[claveMicro(a.id, c)]?.texto ?? ''));
  const guardar = () => {
    for (const c of u.caps) if ((textos[c] ?? '').trim() !== (micro[claveMicro(a.id, c)]?.texto ?? '')) guardarMicrotesis(date, a.id, c, textos[c] ?? '', tarjeta);
    toast({ title: 'Micro-tesis guardadas', sub: tarjeta ? 'Las nuevas también quedan como tarjetas' : 'Quedan para el cold recall de mañana', color: 'var(--handyx)' }, false);
  };
  return (
    <section className="micro" aria-label={`Micro-tesis de la unidad ${n}`}>
      {titulo && (
        <div className="fila-t">
          <span className="etiqueta">Micro-tesis · una por capítulo</span>
          <span className="mono sub">{guardadas} de {u.caps.length}</span>
        </div>
      )}
      {u.caps.map((c) => {
        const cap = l.capitulos.find((x) => x.n === c)!;
        return (
          <label key={c} className="micro-cap">
            <span className="micro-t"><b>Cap. {c} · {cap.titulo}</b>{cap.sub && <small>{cap.sub}</small>}</span>
            <textarea className="campo-texto" rows={2} value={textos[c] ?? ''} onChange={(e) => setTextos((x) => ({ ...x, [c]: e.target.value }))} placeholder="La idea del capítulo en una frase, con tus palabras" aria-label={`Micro-tesis del cap. ${c}`} />
          </label>
        );
      })}
      <label className="micro-tarjeta">
        <input type="checkbox" checked={tarjeta} onChange={(e) => setTarjeta(e.target.checked)} />
        <span>Hacer una tarjeta con cada micro-tesis nueva</span>
      </label>
      <button className="btn-borde" disabled={!cambio} onClick={guardar}>{guardadas === u.caps.length && !cambio ? 'Micro-tesis listas' : 'Guardar micro-tesis'}</button>
    </section>
  );
}
