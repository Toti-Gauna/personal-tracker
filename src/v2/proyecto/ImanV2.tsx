/**
 * Trazo 2.0 · el Imán (#/metas/iman/<id>): lo que tiene que tener un lanzamiento público para no pasar desapercibido. Son 8
 * puntos y se ven como un anillo de 8 tramos que se van encendiendo; cada punto abre su hoja con lo que se carga. El
 * lanzamiento no se marca publicado hasta tener los 8.
 */
import { useState } from 'react';
import { PASOS_ANTES, PASOS_SERIE, PASO_TXT, puntosIman, type Canal, type PasoSerie } from '../../data/iman';
import { PLAN_EXT } from '../../data/plan-extendido';
import { comercial, secundaria } from '../../data/v12-2';
import { agregarPost, borrarPost, setIman } from '../../state/fondo';
import { useStore } from '../../state/store';
import { fp } from '../../ui/periodos';
import { Boton, CampoTexto, Casilla } from '../kit/controles';
import { Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { CampoAlSalir, FilaHoja } from './piezas';
import './proyecto.css';
import { aviso } from '../kit/capas';

const INFO = (
  <>
    <p className="t-cuerpo-l">El Imán es lo que hace que un lanzamiento se note.</p>
    <p className="t-cuerpo">Son 8 puntos: un gancho, un video, una demo, una métrica, una noticia, el repo listo para una prueba técnica, las empresas a las que apuntás y la serie de posts.</p>
    <p className="t-cuerpo">El lanzamiento no se marca publicado hasta tener los 8. De la serie alcanzan teaser, build y launch; deep dive y result van después.</p>
  </>
);

/** Los 8 tramos del Imán: uno por punto, empezando arriba y hacia la derecha; se dibujan encendidos con el trazo. */
export function AnilloIman({ ok, tamano = 168, grosor = 10, nombre, decorativo }: { ok: boolean[]; tamano?: number; grosor?: number; nombre?: string; /** Dentro de un link que ya lo dice. */ decorativo?: boolean }) {
  const r = (tamano - grosor) / 2, c = tamano / 2;
  const punto = (g: number) => [c + r * Math.cos((g * Math.PI) / 180), c + r * Math.sin((g * Math.PI) / 180)].map((x) => Math.round(x * 100) / 100);
  const n = ok.filter(Boolean).length;
  return (
    <span className="pt-iman" {...(decorativo ? { 'aria-hidden': true } : { role: 'img', 'aria-label': nombre ?? `Imán: ${n} de 8 puntos` })} style={{ width: tamano, height: tamano }}>
      <svg viewBox={`0 0 ${tamano} ${tamano}`} aria-hidden="true">
        {ok.map((v, i) => {
          const [x0, y0] = punto(-90 + i * 45 + 3.5), [x1, y1] = punto(-90 + i * 45 + 41.5);
          return <path key={i} d={`M${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}`} pathLength={1} strokeWidth={grosor} className={v ? 'on' : undefined} style={{ ['--i' as string]: i }} />;
        })}
      </svg>
      {tamano >= 120 && <span className="pt-iman-centro"><b className="t-heroe">{n}</b><span className="t-rotulo">de 8</span></span>}
    </span>
  );
}

/** El nombre de lo que lleva el Imán: una app secundaria, un showcase o un proyecto principal. */
export function nombreDeItem(id: string, marcaGuardada?: string) {
  const sec = secundaria(id), com = comercial(id);
  return sec?.nombre ?? (com ? `#${com.n} · ${com.marca ?? marcaGuardada ?? com.sector ?? 'A definir'}` : PLAN_EXT.bloques.find((b) => b.id === id)?.nombre ?? id);
}

export function ImanV2({ id, hoy }: { id: string; hoy: string }) {
  const plan = useStore((s) => s.plan);
  const i = plan.iman?.[id] ?? {};
  const puntos = puntosIman(i);
  const nombre = nombreDeItem(id, plan.fondo?.[id]?.marca);
  const [links, setLinks] = useState<Partial<Record<PasoSerie, string>>>({});
  const pista = secundaria(id) ? 'secundaria' : comercial(id) ? 'comercial' : 'principal';
  const post = (paso: PasoSerie) => plan.posts?.find((p) => p.id === i.posts?.[paso]);
  const listo = puntos.filter((p) => p.ok).length === 8;
  if (!secundaria(id) && !comercial(id) && !PLAN_EXT.bloques.some((b) => b.id === id)) {
    return <Marco titulo="Imán" volver={{ href: '#/metas/fondo', nombre: 'De fondo' }}><Vacio ilustracion="plan" titulo="No hay un ítem con ese nombre" accion={<Boton variante="primario" href="#/metas/fondo">Ir a De fondo</Boton>} /></Marco>;
  }
  const campo = (p: number) => {
    switch (p) {
      case 1: return <CampoAlSalir etiqueta="Gancho de una línea" valor={i.hook} guardar={(v) => setIman(id, { hook: v })} />;
      case 2: return <CampoAlSalir etiqueta="Link del video de 30 s" valor={i.video} guardar={(v) => setIman(id, { video: v })} placeholder="https://…" nota="El momento wow va en los primeros 3 segundos." modo="url" />;
      case 3: return <CampoAlSalir etiqueta="Link de la demo" valor={i.demo} guardar={(v) => setIman(id, { demo: v })} placeholder="https://…" nota="Pública y sin registro." modo="url" />;
      case 4: return (
        <>
          <CampoAlSalir etiqueta="La métrica" valor={i.metrica?.valor} guardar={(v) => setIman(id, { metrica: { ...i.metrica, valor: v } })} nota="Medida, no inventada." />
          <CampoAlSalir etiqueta="Cómo se midió" valor={i.metrica?.como} guardar={(v) => setIman(id, { metrica: { ...i.metrica, como: v } })} />
        </>
      );
      case 5: return (
        <>
          <CampoAlSalir etiqueta="Link de la noticia" valor={i.noticia?.link} guardar={(v) => setIman(id, { noticia: { ...i.noticia, link: v } })} placeholder="https://…" modo="url" />
          <CampoAlSalir etiqueta="Qué tiene que ver, en una línea" valor={i.noticia?.linea} guardar={(v) => setIman(id, { noticia: { ...i.noticia, linea: v } })} />
        </>
      );
      case 6: return (
        <div className="capa-1 pt-check">
          {([['readme', 'README'], ['adrs', 'ADRs'], ['tests', 'Tests']] as const).map(([k, n]) => <Casilla key={k} marcada={!!i[k]} etiqueta={n} onCambio={() => setIman(id, { [k]: !i[k] })} />)}
        </div>
      );
      case 7: return <CampoAlSalir etiqueta="Empresas objetivo" valor={(i.empresas ?? []).join(', ')} guardar={(v) => setIman(id, { empresas: v.split(',').map((x) => x.trim()).filter(Boolean) })} nota="Separadas por coma." />;
      default: return (
        <div className="pt-serie">
          {PASOS_SERIE.map((paso) => {
            const p = post(paso);
            return (
              <div key={paso} className="pt-serie-paso">
                <b className="t-encabezado">{PASO_TXT[paso]}{PASOS_ANTES.includes(paso) ? '' : ' · después del lanzamiento'}</b>
                {p ? <p className="t-nota">{fp(p.fecha)} · LinkedIn (EN y ES) y X{p.link ? <> · <a href={p.link}>link</a></> : ''}</p> : (
                  <>
                    <CampoTexto etiqueta="Link del post (opcional)" valor={links[paso] ?? ''} onCambio={(v) => setLinks({ ...links, [paso]: v })} placeholder="https://…" modo="url" />
                    <Boton variante="secundario" icono="tilde" onClick={() => { const pid = agregarPost({ fecha: hoy, canales: ['linkedin-en', 'linkedin-es', 'x'] as Canal[], pista, item: id, paso, ...(links[paso]?.trim() ? { link: links[paso].trim() } : {}) }); aviso({ titulo: 'Post anotado', sub: 'Cuenta para el Imán', tono: 'hecho', deshacer: () => borrarPost(pid) }); }}>Post hecho hoy</Boton>
                  </>
                )}
              </div>
            );
          })}
        </div>
      );
    }
  };
  return (
    <Marco className="pt" titulo="Imán" info={INFO} volver={{ href: `#/metas/fondo/${id}`, nombre: nombre.length > 18 ? 'Volver' : nombre }}>
      <div className="capa-2 pt-iman-hero">
        <AnilloIman ok={puntos.map((p) => p.ok)} />
        <p className="t-cuerpo-l">{listo ? 'Los 8 puntos están: el lanzamiento se puede publicar.' : 'El lanzamiento se publica con los 8 puntos.'}</p>
      </div>
      <Grupo titulo="Los 8 puntos">
        <div className="capa-1 s-lista">
          {puntos.map((p) => (
            <FilaHoja key={p.n} icono={p.ok ? 'tilde' : 'mas'} titulo={`${p.n} · ${p.nombre}`} valor={p.ok ? 'Listo' : 'Falta'} hecho={p.ok} tituloHoja={p.nombre}>
              <div className="pt-campo-hoja">{campo(p.n)}</div>
            </FilaHoja>
          ))}
        </div>
      </Grupo>
    </Marco>
  );
}
