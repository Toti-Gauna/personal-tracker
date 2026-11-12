let ctx: AudioContext | null = null;

/** "Campana de bronce": tres parciales con caída larga, sintetizados. */
export function bell() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    const t = ctx.currentTime;
    for (const [f, g] of [[523.25, 0.25], [1046.5, 0.12], [1568, 0.06]] as const) {
      const o = ctx.createOscillator();
      const v = ctx.createGain();
      o.frequency.value = f;
      v.gain.setValueAtTime(g, t);
      v.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(v).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.7);
    }
    navigator.vibrate?.(120);
  } catch { /* sin audio */ }
}
