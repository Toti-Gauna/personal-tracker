import { useEffect, useState } from 'react';

/** ¿Se cumple la media query? Se actualiza al cambiar el tamaño. */
export function useMedia(q: string) {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;
  const [ok, setOk] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return;
    const on = () => setOk(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [q]);
  return ok;
}
