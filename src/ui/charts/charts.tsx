import { areaOf, Leyenda, num, smooth, TablaSR, useDibujo } from './core';

/** Mini gráfico de tendencia: área suave y línea. */
export function Sparkline({ values, color, label, w = 100, h = 32 }: { values: number[]; color: string; label: string; w?: number; h?: number }) {
  const ref = useDibujo<SVGSVGElement>([values.join(',')]);
  const max = Math.max(1e-9, ...values);
  const min = Math.min(0, ...values);
  const vs = values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0];
  const pts: [number, number][] = vs.map((v, i) => [(i / (vs.length - 1)) * w, h - 2 - ((v - min) / (max - min || 1)) * (h - 6)]);
  const line = smooth(pts);
  return (
    <svg ref={ref} className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={label} style={{ ['--c' as string]: color }}>
      <path d={areaOf(line, pts, h)} className="sp-area aparece" />
      <path d={line} className="sp-linea dibujo" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Anillo de avance. */
export function Anillo({ value, label, size = 120, color = 'var(--ing)' }: { value: number; label: string; size?: number; color?: string }) {
  const ref = useDibujo<SVGSVGElement>([value]);
  const r = 46;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg ref={ref} className="anillo" width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${label}: ${Math.round(v * 100)} %`} style={{ ['--c' as string]: color }}>
      <circle cx="60" cy="60" r={r} className="an-fondo" />
      {v > 0 && <path className="an-arco dibujo" d={`M60,14 A46,46 0 ${v > 0.5 ? 1 : 0} 1 ${60 + r * Math.sin(v * 2 * Math.PI - 1e-6)},${60 - r * Math.cos(v * 2 * Math.PI - 1e-6)}`} />}
      <text x="60" y="62" textAnchor="middle" className="an-n">{Math.round(v * 100)} %</text>
      <text x="60" y="82" textAnchor="middle" className="an-l">{label}</text>
    </svg>
  );
}

/** Avance real contra el plan a lo largo de las 9 semanas del bimestre. */
export function PlanBimestre({ plan, real, today, color = 'var(--ing)' }: { plan: number[]; real: number[]; today: number; color?: string }) {
  const ref = useDibujo<SVGSVGElement>([real.length]);
  const W = 320;
  const H = 120;
  const T = 8;
  const B = 92;
  const x = (k: number) => 4 + (k / 63) * (W - 8);
  const y = (v: number) => B - v * (B - T);
  const pp: [number, number][] = plan.map((v, k) => [x(k), y(v)]);
  const rp: [number, number][] = real.map((v, k) => [x(k), y(v)]);
  const rl = smooth(rp);
  const semana = Math.min(9, Math.floor(today / 7) + 1);
  return (
    <>
      <svg ref={ref} className="ch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Avance del bimestre: ${Math.round((real[real.length - 1] ?? 0) * 100)} % real contra ${Math.round((plan[today] ?? 0) * 100)} % del plan a hoy`} style={{ ['--c' as string]: color }}>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={4} x2={W - 4} y1={y(g)} y2={y(g)} className="ch-grid" />)}
        <line x1={4} x2={W - 4} y1={B} y2={B} className="ch-base" />
        <path d={smooth(pp)} className="ch-plan" />
        {rp.length > 1 && <path d={areaOf(rl, rp, B)} className="ch-area aparece" />}
        {rp.length > 1 && <path d={rl} className="ch-linea dibujo" />}
        <line x1={x(today)} x2={x(today)} y1={T} y2={B} className="ch-hoy" />
        {rp.length > 0 && <circle cx={x(rp.length - 1)} cy={rp[rp.length - 1][1]} r={4} className="ch-punto" />}
        {Array.from({ length: 9 }, (_, i) => (
          <text key={i} x={x(i * 7) + (i === 0 ? 2 : 0)} y={H - 6} className={`ch-eje${i + 1 === semana ? ' hoy' : ''}`} textAnchor={i === 0 ? 'start' : 'middle'}>S{i + 1}</text>
        ))}
      </svg>
      <TablaSR caption="Avance del bimestre por semana" head={['Semana', 'Plan', 'Real']}
        rows={Array.from({ length: 9 }, (_, i) => [`S${i + 1}`, `${Math.round((plan[Math.min(63, (i + 1) * 7)] ?? 0) * 100)} %`, real[(i + 1) * 7] != null ? `${Math.round(real[(i + 1) * 7] * 100)} %` : '—'])} />
    </>
  );
}

/** Mejora: área de cada punto y línea del promedio. */
export function MejoraChart({ values, avg, labels, h = 150, label }: { values: number[]; avg: number[]; labels: string[]; h?: number; label: string }) {
  const ref = useDibujo<SVGSVGElement>([values.join(',')]);
  const W = 320;
  const T = 10;
  const B = h - 24;
  const max = Math.max(1, ...values, ...avg);
  const n = Math.max(2, values.length);
  const x = (i: number) => 4 + (i / (n - 1)) * (W - 12);
  const y = (v: number) => B - (v / max) * (B - T);
  const vp: [number, number][] = values.map((v, i) => [x(i), y(v)]);
  const ap: [number, number][] = avg.map((v, i) => [x(i), y(v)]);
  const vl = smooth(vp);
  const ticks = labels.map((l, i) => [i, l] as const).filter(([, l]) => l);
  return (
    <svg ref={ref} className="ch" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
      {[0.33, 0.66, 1].map((g) => <line key={g} x1={4} x2={W - 4} y1={y(g * max)} y2={y(g * max)} className="ch-grid" />)}
      <line x1={4} x2={W - 4} y1={B} y2={B} className="ch-base" />
      {vp.length > 1 && <path d={areaOf(vl, vp, B)} className="ch-area amarillo aparece" />}
      {vp.length > 1 && <path d={vl} className="ch-linea amarillo dibujo" />}
      {ap.length > 1 && <path d={smooth(ap)} className="ch-linea tinta dibujo" />}
      {vp.length > 0 && <circle cx={vp[vp.length - 1][0]} cy={vp[vp.length - 1][1]} r={4} className="ch-punto amarillo" />}
      {ticks.map(([i, l]) => <text key={i} x={x(i)} y={h - 6} textAnchor={i === 0 ? 'start' : i === values.length - 1 ? 'end' : 'middle'} className={`ch-eje${i === values.length - 1 ? ' hoy' : ''}`}>{l}</text>)}
    </svg>
  );
}

/** Constancia: un cuadrado por día; filas de lunes a domingo. El martes libre no es falta. */
export function Heatmap({ cells, weeks }: { cells: { date: string; level: number | null; libre: boolean; futuro: boolean }[]; weeks: number }) {
  const ref = useDibujo<SVGSVGElement>([cells.length]);
  const S = 18;
  const G = 3;
  const W = weeks * (S + G);
  const H = 7 * (S + G);
  return (
    <svg ref={ref} className="ch heat" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Constancia de las últimas ${weeks} semanas: ${cells.filter((c) => (c.level ?? 0) > 0).length} días con metas cumplidas`}>
      {cells.map((c, i) => {
        const col = Math.floor(i / 7);
        const row = i % 7;
        const cls = c.futuro ? 'h-fut' : c.libre ? 'h-libre' : `h${c.level ?? 0}`;
        return <rect key={c.date} x={col * (S + G)} y={row * (S + G)} width={S} height={S} rx={3} className={`${cls} aparece`}><title>{c.date}</title></rect>;
      })}
    </svg>
  );
}

/** Mes a mes: barras apiladas de horas (matemática y programación) y la línea de % de metas cumplidas. */
export function MesAMes({ months }: { months: { label: string; math: number; prog: number; metas: number | null; actual: boolean }[] }) {
  const ref = useDibujo<SVGSVGElement>([months.length]);
  const W = 320;
  const H = 170;
  const T = 12;
  const B = 140;
  const n = Math.max(1, months.length);
  const slot = (W - 8) / n;
  const bw = Math.min(22, slot * 0.55);
  const maxH = Math.max(10, ...months.map((m) => m.math + m.prog));
  const y = (v: number) => B - (v / maxH) * (B - T);
  const yl = (p: number) => B - p * (B - T);
  const cx = (i: number) => 4 + slot * i + slot / 2;
  const lp: [number, number][] = months.flatMap((m, i) => (m.metas == null ? [] : [[cx(i), yl(m.metas)] as [number, number]]));
  return (
    <svg ref={ref} className="ch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Horas por mes y porcentaje de metas cumplidas en ${months.length} meses`}>
      {[0.5, 1].map((g) => <line key={g} x1={4} x2={W - 4} y1={yl(g)} y2={yl(g)} className="ch-grid" />)}
      <line x1={4} x2={W - 4} y1={B} y2={B} className="ch-base" />
      {months.map((m, i) => (
        <g key={m.label} className="crece">
          {m.math > 0 && <rect x={cx(i) - bw / 2} y={y(m.math)} width={bw} height={B - y(m.math)} rx={3} className="b-math" />}
          {m.prog > 0 && <rect x={cx(i) - bw / 2} y={y(m.math + m.prog)} width={bw} height={Math.max(0, y(m.math) - y(m.math + m.prog) - 2)} rx={3} className="b-prog" />}
          <text x={cx(i)} y={H - 8} textAnchor="middle" className={`ch-eje${m.actual ? ' hoy' : ''}`}>{m.label}</text>
        </g>
      ))}
      {lp.length > 1 && <path d={smooth(lp)} className="ch-linea amarillo dibujo" />}
      {lp.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={3.5} className="ch-punto amarillo hueco aparece" />)}
    </svg>
  );
}

/** La ruta bimestre a bimestre: real contra plan, con un punto por certificación aprobada. */
export function RutaChart({ plan, real, certs }: { plan: number[]; real: number[]; certs: { n: number; name: string; value: number }[] }) {
  const ref = useDibujo<SVGSVGElement>([real.length]);
  const W = 320;
  const H = 150;
  const T = 10;
  const B = 118;
  const x = (k: number) => 6 + (k / 18) * (W - 12);
  const y = (v: number) => B - v * (B - T);
  const pp: [number, number][] = plan.map((v, k) => [x(k), y(v)]);
  const rp: [number, number][] = real.map((v, k) => [x(k), y(v)]);
  const rl = smooth(rp);
  return (
    <svg ref={ref} className="ch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ruta: ${Math.round((real[real.length - 1] ?? 0) * 100)} % real; el plan llega a 100 % en el B18`}>
      {[6, 12].map((k) => <line key={k} x1={x(k)} x2={x(k)} y1={T} y2={B} className="ch-grid" />)}
      {[0.33, 0.66].map((g) => <line key={g} x1={6} x2={W - 6} y1={y(g)} y2={y(g)} className="ch-grid" />)}
      <line x1={6} x2={W - 6} y1={B} y2={B} className="ch-base" />
      <path d={smooth(pp)} className="ch-plan" />
      {rp.length > 1 && <path d={areaOf(rl, rp, B)} className="ch-area aparece" />}
      {rp.length > 1 && <path d={rl} className="ch-linea dibujo" />}
      {rp.length > 0 && <circle cx={rp[rp.length - 1][0]} cy={rp[rp.length - 1][1]} r={4} className="ch-punto" />}
      {certs.map((c) => (
        <g key={c.n} className="aparece">
          <circle cx={x(c.n)} cy={y(c.value)} r={5} className="ch-cert" />
          <text x={x(c.n)} y={y(c.value) - 9} textAnchor="middle" className="ch-cert-t">{c.name}</text>
        </g>
      ))}
      {[[0, 'B1'], [6, 'B6'], [12, 'B12'], [18, 'B18']].map(([k, l]) => <text key={l} x={x(k as number)} y={H - 8} textAnchor={k === 0 ? 'start' : k === 18 ? 'end' : 'middle'} className="ch-eje">{l}</text>)}
    </svg>
  );
}

/** Radar de 6 ejes: hoy, la meta del año 1 y la del año 3. */
export function Radar({ axes, series }: { axes: string[]; series: { label: string; values: number[]; className: string }[] }) {
  const ref = useDibujo<SVGSVGElement>([series.map((s) => s.values.join(',')).join('|')]);
  const C = 150;
  const R = 92;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
  const pt = (i: number, v: number): [number, number] => [C + Math.cos(ang(i)) * R * v, C + Math.sin(ang(i)) * R * v];
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, Math.max(0.02, v / 100)).join(',')).join(' ');
  return (
    <svg ref={ref} className="ch radar" viewBox="0 0 300 300" role="img" aria-label={`Competencias hoy: ${axes.map((a, i) => `${a} ${series[0].values[i]}`).join(', ')}`}>
      {[0.25, 0.5, 0.75, 1].map((g) => <polygon key={g} points={axes.map((_, i) => pt(i, g).join(',')).join(' ')} className="rd-grid" />)}
      {axes.map((_, i) => <line key={i} x1={C} y1={C} x2={pt(i, 1)[0]} y2={pt(i, 1)[1]} className="rd-grid" />)}
      {series.map((s) => <polygon key={s.label} points={poly(s.values)} className={`${s.className} aparece`} />)}
      {axes.map((a, i) => {
        const [lx, ly] = pt(i, 1.2);
        return <text key={a} x={lx} y={ly + 4} textAnchor={Math.abs(lx - C) < 8 ? 'middle' : lx < C ? 'end' : 'start'} className="rd-eje">{a}</text>;
      })}
    </svg>
  );
}

export { Leyenda, num };
