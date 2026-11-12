import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { SEAL_XP, sealById } from '../data/profile';
import { fmtFecha } from '../data/time';
import { ir } from '../lib/routes';
import { reducedMotion } from '../lib/motion';
import { useStore } from '../state/store';
import { markSealSeen } from '../state/profile';
import { play } from '../ui/sound';
import { SelloGrande } from '../ui/Sello';
import '../styles/perfil.css';

/** 6.2 Logro desbloqueado: el sello cae como un sello. */
export function Logro({ id }: { id?: string }) {
  const def = id ? sealById(id) : undefined;
  const fecha = useStore((s) => (id ? s.profile.seals[id] : undefined));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !def) return;
    play('sello');
    if (id) markSealSeen(id);
    if (reducedMotion()) {
      gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.15 });
      return;
    }
    // Escala de más a menos y un temblor corto, como un sello que cae.
    const tl = gsap.timeline();
    tl.fromTo(ref.current, { scale: 1.6, rotate: -14, opacity: 0 }, { scale: 1, rotate: -8, opacity: 1, duration: 0.5, ease: 'back.out(2)' })
      .to(ref.current, { x: 3, duration: 0.04, yoyo: true, repeat: 3 });
    return () => { tl.kill(); };
  }, [def, id]);

  if (!def) {
    return <main className="pantalla"><a className="volver" href="#/perfil">Perfil</a><p>No encontré ese sello.</p></main>;
  }
  return (
    <main className="pantalla logro">
      <div className="etiqueta">Nuevo sello · {fecha ? fmtFecha(fecha).toLowerCase() : ''}</div>
      <div ref={ref} className="logro-sello"><SelloGrande name={def.name} detail={def.how.split('.')[0].replace(/^Levantarte a las 4:30 o antes /, '').slice(0, 22)} color={def.color} /></div>
      <h1 className="logro-t">{def.line}</h1>
      <p className="sub">{def.how}</p>
      <p className="mono">+{SEAL_XP} XP</p>
      <button className="btn-principal" onClick={() => ir('perfil')}>Ver mis sellos</button>
    </main>
  );
}
