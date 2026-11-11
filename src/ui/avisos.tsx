import { useEffect, useSyncExternalStore } from 'react';
import { bell } from './sound';
import '../styles/ui.css';

export interface Toast {
  id: number;
  title: string;
  sub?: string;
  color?: string;
  action?: { label: string; run: () => void };
}

export interface ModalSpec {
  kicker: string;
  color?: string;
  title: string;
  body: string;
  primary: { label: string; run: () => void };
  secondary: { label: string; run: () => void };
}

let toasts: Toast[] = [];
let modal: ModalSpec | null = null;
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** Toast arriba, 4 s, con sonido. */
export function toast(t: Omit<Toast, 'id'>, sound = true) {
  const id = ++seq;
  toasts = [...toasts, { ...t, id }];
  emit();
  if (sound) bell();
  setTimeout(() => dismiss(id), 4000);
}

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Modal: frena en los límites del día. Siempre tiene una alternativa. */
export function showModal(m: ModalSpec, sound = true) {
  modal = m;
  emit();
  if (sound) bell();
}

export function closeModal() {
  modal = null;
  emit();
}

export function Avisos() {
  const ts = useSyncExternalStore(subscribe, () => toasts);
  const m = useSyncExternalStore(subscribe, () => modal);

  useEffect(() => {
    if (!m) return;
    const prev = document.activeElement as HTMLElement | null;
    (document.querySelector('.modal .btn-principal') as HTMLElement | null)?.focus();
    return () => prev?.focus?.();
  }, [m]);

  return (
    <>
      <div className="toasts" aria-live="polite">
        {ts.map((t) => (
          <div key={t.id} className="toast" style={{ ['--c' as string]: t.color ?? 'var(--economia)' }}>
            <div className="toast-t">
              <b>{t.title}</b>
              {t.sub && <small>{t.sub}</small>}
            </div>
            {t.action ? (
              <button className="toast-accion" onClick={() => { t.action!.run(); dismiss(t.id); }}>{t.action.label}</button>
            ) : (
              <button className="toast-x" aria-label="Cerrar" onClick={() => dismiss(t.id)}>×</button>
            )}
          </div>
        ))}
      </div>
      {m && (
        <div className="modal-fondo">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-t" style={{ ['--c' as string]: m.color ?? 'var(--ing)' }}>
            <div className="etiqueta modal-k">{m.kicker}</div>
            <h2 id="modal-t" className="titulo">{m.title}</h2>
            <p>{m.body}</p>
            <button className="btn-principal" onClick={() => { closeModal(); m.primary.run(); }}>{m.primary.label}</button>
            <button className="btn-borde" onClick={() => { closeModal(); m.secondary.run(); }}>{m.secondary.label}</button>
          </div>
        </div>
      )}
    </>
  );
}
