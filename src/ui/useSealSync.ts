import { useEffect } from 'react';
import { sealById } from '../data/profile';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import { syncSeals } from '../state/profile';
import { toast } from './avisos';

/** Mira si algún dato nuevo cumple un sello y avisa con un toast. */
export function useSealSync(today: string, listo: boolean) {
  const days = useStore((s) => s.days);
  const study = useStore((s) => s.study);
  const train = useStore((s) => s.train);
  const goals = useStore((s) => s.goals);
  useEffect(() => {
    if (!listo) return;
    for (const id of syncSeals(today)) {
      const d = sealById(id);
      if (d) toast({ title: `Sello nuevo: ${d.name}`, sub: d.line, color: d.color, evento: 'sello', action: { label: 'Ver', run: () => ir(`logro/${id}`) } });
    }
  }, [days, study, train, goals, today, listo]);
}
