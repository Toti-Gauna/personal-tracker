/**
 * Trazo 2.0 · la presentación (#/avance/presentacion): el avance contado en láminas a pantalla completa, una idea por lámina y un
 * número grande, para mostrárselo a alguien. Avanza sola (se puede pausar), con un toque o con las flechas; Esc sale. No muestra lo
 * privado: ni el peso ni la plata.
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { AREAS } from '../../data/defaults';
import { bimester, dayNumber } from '../../data/derive';
import { appliesTo, valueOf } from '../../data/goals';
import { fmtPct } from '../../data/mejora';
import { SEALS } from '../../data/profile';
import { addDays } from '../../data/time';
import type { DayLog } from '../../data/types';
import { ir } from '../../lib/routes';
import { useStore } from '../../state/store';
import { Cuerpo, enPalabras } from '../entreno/Cuerpo';
import { MUSCULOS, calor, cargaDeSeries, indiceEjercicios } from '../entreno/musculos';
import { Barras } from '../estudio/Barras';
import { colorV2 } from '../hoy/datos';
import { Icono } from '../iconos';
import { Boton } from '../kit/controles';
import { Numero } from '../movimiento/componentes';
import { reducido } from '../movimiento/movimiento';
import { Meta } from './AvanceV2';
import { Calor } from './Calor';
import { mapaDelAnio, resumen, ultimosDias } from './datos';
import { SelloDe } from './Sello';
import '../tokens.css';
import '../base.css';
import '../kit/kit.css';
import '../kit/superficies.css';
import '../entreno/entreno.css';
import './perfil.css';
import { cuantos } from '../reglas';

/** Cuánto dura cada lámina cuando avanza sola. */
export const SEGUNDOS = 7;
const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const letraDe = (f: string) => DIAS[new Date(Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)))).getUTCDay()];

interface Lamina { id: string; nombre: string; area: string; contenido: ReactNode }

export default function Presentacion({ day }: { day: DayLog }) {
  const s = useStore((x) => x);
  const settings = s.settings!;
  const date = day.date;
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(() => reducido());

  const laminas = useMemo<Lamina[]>(() => {
    const r = resumen(s, date);
    const bim = bimester(settings.startDate, date, s.goals.bimesterNames);
    const mapa = mapaDelAnio(s.days, date, settings.startDate);
    const dias = ultimosDias(s.days, date, 14);
    const ctx = { study: s.study, days: s.days, train: s.train };
    const metas = s.goals.goals.filter((g) => appliesTo(g, 'anio', date)).slice(0, 4);
    const frentes = s.study.fronts.map((f) => ({ f, min: Object.values(s.days).flatMap((d) => d.study ?? []).filter((l) => l.front === f.id).reduce((a, l) => a + l.min, 0) })).filter((x) => x.min > 0).sort((a, b) => b.min - a.min).slice(0, 4);
    const mes = s.train.sessions.filter((x) => x.date >= addDays(date, -27));
    // La figura muestra en qué se puso más el trabajo: cada músculo contra el que más series tuvo en estas cuatro semanas.
    const carga = cargaDeSeries(mes.flatMap((x) => x.sets), indiceEjercicios(s.train.routines));
    const tope = Math.max(1, ...Object.values(carga));
    const luz = calor(carga, Object.fromEntries(MUSCULOS.map((m) => [m, tope])));
    const ganados = SEALS.filter((d) => s.profile.seals[d.id]);
    const horas = r.minutosEstudio / 60;
    return [
      { id: 'portada', nombre: 'Portada', area: 'var(--trazo)', contenido: (
        <>
          <p className="t-rotulo wr-sobre">{bim.name} · semana {bim.week} de {bim.weeks}</p>
          <p className="wr-numero"><span className="wr-chico">Día</span> <Numero valor={dayNumber(settings.startDate, date)} /></p>
          <h2 className="wr-frase">{settings.names.me}, {r.racha === 1 ? 'un día seguido' : `${r.racha} días seguidos`}.</h2>
        </>
      ) },
      { id: 'constancia', nombre: 'Constancia', area: 'var(--a-rutina)', contenido: (
        <>
          <p className="t-rotulo wr-sobre">Constancia</p>
          <p className="wr-numero"><Numero valor={r.dias} /> <span className="wr-chico">{r.dias === 1 ? 'día' : 'días'}</span></p>
          <h2 className="wr-frase">Mejor racha: {r.mejorRacha}.</h2>
          <div className="wr-pieza"><Calor mapa={mapa} nombre={`El año, día por día: ${cuantos(mapa.cargados, 'día cargado', 'días cargados')}.`} /></div>
        </>
      ) },
      { id: 'mejora', nombre: 'Mejora', area: 'var(--a-economia)', contenido: (
        <>
          <p className="t-rotulo wr-sobre">Mejora desde el día 0</p>
          <p className="wr-numero wr-largo">+<Numero valor={r.mejora} decimales={1} /><span className="wr-chico"> %</span></p>
          <h2 className="wr-frase">Hasta 1 % por día, todos los días.</h2>
          <div className="wr-pieza"><Barras alto={88} meta={1} barras={dias.map((d) => ({ etiqueta: letraDe(d.fecha), valor: d.mejora, hoy: d.fecha === date, texto: '' }))} nombre={`Mejora de los últimos 14 días: ${dias.map((d) => fmtPct(d.mejora)).join(', ')}.`} /></div>
        </>
      ) },
      { id: 'estudio', nombre: 'Estudio', area: 'var(--a-ing)', contenido: (
        <>
          <p className="t-rotulo wr-sobre">Estudio</p>
          <p className="wr-numero"><Numero valor={horas} decimales={horas < 10 ? 1 : 0} /> <span className="wr-chico">h</span></p>
          <h2 className="wr-frase">{r.tarjetas} {r.tarjetas === 1 ? 'tarjeta' : 'tarjetas'} en la memoria.</h2>
          {frentes.length > 0 && <ul className="wr-pieza pf-metas">{frentes.map((x) => <Meta key={x.f.id} nombre={x.f.name} color={colorV2(AREAS[x.f.color].css)} valor={x.min} meta={frentes[0].min} texto={`${Math.round(x.min / 6) / 10} h`.replace('.', ',')} />)}</ul>}
        </>
      ) },
      { id: 'metas', nombre: 'Metas del año', area: 'var(--a-handyx)', contenido: (
        <>
          <p className="t-rotulo wr-sobre">Metas del año</p>
          <h2 className="wr-frase wr-frase-sola">{metas.length ? 'Hacia dónde va el año.' : 'Las metas del año todavía no se cargaron.'}</h2>
          {metas.length > 0 && (
            <ul className="wr-pieza pf-metas">
              {metas.map((g) => {
                const v = valueOf(g, date, ctx);
                const privada = g.unit === 'USD' || g.unit === 'kg';
                return <Meta key={g.id} nombre={g.title} color={colorV2(AREAS[g.area].css)} valor={privada ? 0 : v} meta={g.target} texto={privada ? '•••' : `${String(v).replace('.', ',')} de ${g.target}`} />;
              })}
            </ul>
          )}
        </>
      ) },
      { id: 'cuerpo', nombre: 'Cuerpo', area: 'var(--a-salud)', contenido: (
        <>
          <p className="t-rotulo wr-sobre">Cuerpo</p>
          <p className="wr-numero"><Numero valor={r.entrenos} /> <span className="wr-chico">{r.entrenos === 1 ? 'entreno' : 'entrenos'}</span></p>
          <h2 className="wr-frase">{String(r.toneladas).replace('.', ',')} toneladas movidas.</h2>
          <div className="wr-pieza"><Cuerpo luz={luz} tono="hecho" alto={188} nombre={`En las últimas cuatro semanas trabajaste ${enPalabras(luz)}.`} /></div>
        </>
      ) },
      { id: 'sellos', nombre: 'Sellos', area: 'var(--trazo)', contenido: (
        <>
          <p className="t-rotulo wr-sobre">Sellos · nivel {r.nivel}</p>
          <p className="wr-numero"><Numero valor={r.sellos} /> <span className="wr-chico">de {r.sellosTotal}</span></p>
          <h2 className="wr-frase">{ganados.length ? ganados[ganados.length - 1].line : 'El primero llega al cerrar un día.'}</h2>
          {ganados.length > 0 && <ul className="wr-pieza pf-fila-sellos">{ganados.slice(-10).map((d, k) => <li key={d.id}><SelloDe def={d} ganado lado={64} nombre={d.name} i={k} /></li>)}</ul>}
        </>
      ) },
      { id: 'cierre', nombre: 'Cierre', area: 'var(--trazo)', contenido: (
        <>
          <p className="t-rotulo wr-sobre">Trazo</p>
          <h2 className="wr-frase wr-frase-sola">Mañana, otro 1 %.</h2>
          <div className="wr-pieza wr-fin">
            <Boton variante="secundario" icono="deshacer" onClick={() => setI(0)}>Ver de nuevo</Boton>
            <Boton variante="primario" href="#/avance">Salir</Boton>
          </div>
        </>
      ) },
    ];
  }, [s, settings, date]);

  const n = laminas.length;
  const ir_a = useCallback((k: number) => setI(Math.max(0, Math.min(n - 1, k))), [n]);
  const ultima = i === n - 1;

  // Flechas, espacio (pausa) y Esc (salir). Pantalla completa mientras dura, como en la 1.0.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ir('avance');
      if (e.key === 'ArrowRight') setI((k) => Math.min(n - 1, k + 1));
      if (e.key === 'ArrowLeft') setI((k) => Math.max(0, k - 1));
      if (e.key === ' ') { e.preventDefault(); setPausa((p) => !p); }
    };
    window.addEventListener('keydown', on);
    try { void document.documentElement.requestFullscreen?.()?.catch?.(() => {}); } catch { /* sin pantalla completa */ }
    return () => {
      window.removeEventListener('keydown', on);
      try { if (document.fullscreenElement) void document.exitFullscreen(); } catch { /* sin pantalla completa */ }
    };
  }, [n]);

  const l = laminas[i];
  return (
    <main className={`v2 wr${pausa ? ' wr-pausa' : ''}`} style={{ ['--area' as string]: l.area, ['--wr-dur' as string]: `${SEGUNDOS}s` } as CSSProperties} aria-label="Presentación del avance">
      <div className="wr-fondo" aria-hidden="true"><i /><i /></div>
      <ol className="wr-progreso" aria-label={`Lámina ${i + 1} de ${n}`}>
        {laminas.map((x, k) => (
          <li key={x.id} className={k < i ? 'wr-vista' : k === i ? 'wr-actual' : undefined}>
            <i key={k === i ? `a${i}` : 'q'} onAnimationEnd={k === i && !ultima ? () => ir_a(i + 1) : undefined} />
          </li>
        ))}
      </ol>
      <div className="wr-arriba">
        <Boton soloIcono variante="fantasma" icono={pausa ? 'play' : 'pausa'} etiqueta={pausa ? 'Seguir' : 'Pausar'} onClick={() => setPausa(!pausa)} />
        <a className="k-boton fantasma solo-icono" href="#/avance" aria-label="Salir de la presentación"><Icono nombre="cerrar" lado={20} /></a>
      </div>
      <button type="button" className="wr-zona wr-atras" aria-label="Lámina anterior" disabled={i === 0} onClick={() => ir_a(i - 1)} />
      <button type="button" className="wr-zona wr-adelante" aria-label="Lámina siguiente" disabled={ultima} onClick={() => ir_a(i + 1)} />
      <section key={l.id} className="wr-lamina" aria-roledescription="lámina" aria-label={`${i + 1} de ${n}: ${l.nombre}`} aria-live="polite">
        {l.contenido}
      </section>
    </main>
  );
}
