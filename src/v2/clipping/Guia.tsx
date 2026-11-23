/**
 * Trazo 2.0 · lo que se lee del Clipping y casi no se escribe: el Plan de los 12 meses, los Nichos y derechos, los Riesgos con la rutina
 * de la semana y la Semana 1. El texto largo del roadmap va en hojas; en la página quedan las filas, el estado y lo que se tilda.
 */
import { CLIP, finMes, hitosClip, inicioMes, mesDe } from '../../data/clipping';
import { tildarRutina } from '../../state/clipping';
import { lunesDe } from '../../state/plan';
import { useStore } from '../../state/store';
import { Icono } from '../iconos';
import { Dato, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja, Lista, hechasDe } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { corto, fc, fcA, usd } from './datos';
import { BarrasG, rangoCorto } from './piezas';
import '../proyecto/proyecto.css';
import './clipping.css';

const AREA = 'var(--a-eclipse)';
const VOLVER = { href: '#/metas/clipping', nombre: 'Clipping' };

/** La marca de "estás acá": el trazo amarillo. */
const Aca = () => <span className="s-estado hecho"><Icono nombre="ritmo" lado={16} />Acá</span>;

// ——— Plan ———

const INFO_PLAN = (
  <>
    <p className="t-cuerpo-l">El Roadmap Clipper: de cero a USD 10k por mes en 12 meses, en tres fases.</p>
    <p className="t-cuerpo">{CLIP.resumen}</p>
    <p className="t-nota">Es una proyección propia basada en las tarifas de las fuentes: no son cifras garantizadas.</p>
  </>
);

export function PlanClip({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const n = mesDe(date);
  const nPlan = Math.min(Math.max(n, 1), 12);
  const hitos = hitosClip();
  return (
    <Marco className="cl" titulo="Plan" volver={VOLVER} info={INFO_PLAN}>
      <Tarjeta heroe area={AREA} className="cl-resumen" etiqueta="Meta por mes">
        <div className="cl-tres">
          <Dato grande valor={nPlan} etiqueta="Mes actual" />
          <Dato valor={corto(CLIP.meses[nPlan - 1].meta)} unidad="USD" etiqueta="Meta del mes" />
          <Dato valor="10k" unidad="USD" etiqueta="Meta final" />
        </div>
        <BarrasG barras={CLIP.meses.map((m) => ({ etiqueta: String(m.n), valor: m.meta, hoy: m.n === nPlan, texto: m.n === nPlan || m.n === 12 || m.n === 6 ? corto(m.meta) : '' }))}
          nombre={`Meta por mes del roadmap, en USD: ${CLIP.meses.map((m) => `mes ${m.n}, ${m.meta}`).join('; ')}. Estás en el mes ${nPlan}.`} />
      </Tarjeta>

      <Grupo titulo="Fases">
        <div className="capa-1 s-lista">
          {CLIP.fases.map((f) => {
            const meses = CLIP.meses.filter((m) => m.n >= f.meses[0] && m.n <= f.meses[1]);
            const hs = hitos.filter((h) => { const k = mesDe(h.fechaReal); return k >= f.meses[0] && k <= f.meses[1]; });
            const actual = n >= f.meses[0] && n <= f.meses[1];
            return (
              <FilaHoja key={f.n} icono="plan" titulo={f.nombre} nota={`Meses ${f.meses[0]}–${f.meses[1]} · USD ${meses[0].meta.toLocaleString('es-AR')} → ${meses[meses.length - 1].meta.toLocaleString('es-AR')}`}
                valor={actual ? <Aca /> : undefined} tituloHoja={`Fase ${f.n} · ${f.nombre}`}>
                <div className="cl-mes">
                  <p className="t-cuerpo">{f.objetivo}</p>
                  <ol className="cl-meses">
                    {meses.map((m) => (
                      <li key={m.n} className={m.n < n ? 'hecho' : m.n === n ? 'actual' : ''} aria-current={m.n === n ? 'step' : undefined}>
                        <span className="cl-mes-n t-dato">{m.n < n ? <Icono nombre="tilde" lado={16} /> : m.n}</span>
                        <span className="cl-mes-t">
                          <b>{m.titulo}</b>
                          <small className="t-nota">{fc(inicioMes(m.n))} a {fcA(finMes(m.n))} · {m.cuentas} cuentas · {m.clipsDia} clips por día</small>
                          {m.n === n && <small className="t-nota">{m.foco}</small>}
                        </span>
                        <b className="t-dato">{usd(m.meta)}</b>
                      </li>
                    ))}
                  </ol>
                  <span className="t-rotulo">Criterio de paso</span>
                  <ul className="cl-criterios">
                    {f.criterios.map((t) => <li key={t}><Icono nombre="tilde" lado={18} /><span>{t}</span></li>)}
                    <li><Icono nombre="atencion" lado={18} /><span>{f.siNo}</span></li>
                  </ul>
                  {hs.length > 0 && (
                    <>
                      <span className="t-rotulo">Hitos</span>
                      <ul className="cl-hitos">
                        {hs.map((h) => <li key={h.id} className={h.fechaReal < date ? 'hecho' : ''}><span className="t-dato">{fc(h.fechaReal)}</span><span>{h.tipo === 'grande' ? <b>{h.texto}</b> : h.texto}</span></li>)}
                      </ul>
                    </>
                  )}
                </div>
              </FilaHoja>
            );
          })}
        </div>
      </Grupo>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <FilaHoja icono="codigo" titulo="Tus apps" nota="Next.js, Node, TypeScript" valor={String(CLIP.stack.length)} tituloHoja="Tus apps · stack técnico">
            <div className="cl-mes">
              <p className="t-cuerpo">Trazo es la planilla y el tablero: no publica ni entra a las plataformas. El pipeline y el dashboard son tus apps aparte; esta planilla se exporta en JSON para sembrarlos.</p>
              <ol className="cl-lista">{CLIP.stack.map((t) => <li key={t}>{t}</li>)}</ol>
              <p className="t-cuerpo"><b>Regla de oro:</b> {CLIP.reglaDeOro}</p>
            </div>
          </FilaHoja>
        </div>
      </Grupo>
    </Marco>
  );
}

// ——— Nichos y derechos ———

const INFO_NICHOS = (
  <>
    <p className="t-cuerpo-l">Cada nicho tiene su riesgo: cuánto cuidado pide la fuente de los clips.</p>
    <p className="t-cuerpo">Riesgo bajo: la fuente es del propio creador. Medio: hay que seguir las políticas de cada publisher. Alto: solo con campañas oficiales.</p>
  </>
);

const RIESGO = { bajo: { icono: 'tilde', tono: '' }, medio: { icono: 'atencion', tono: '' }, alto: { icono: 'alerta', tono: 'atencion' } } as const;

export function NichosClip(_: PropsV2) {
  return (
    <Marco className="cl" titulo="Nichos y derechos" volver={VOLVER} info={INFO_NICHOS}>
      <Grupo titulo="Nichos" extremo={<span className="t-rotulo">Riesgo de la fuente</span>}>
        <div className="capa-1 s-lista">
          {CLIP.nichos.map((x) => {
            const r = RIESGO[x.riesgo];
            return (
              <FilaHoja key={x.nombre} titulo={x.nombre} nota={x.fuente} valor={<span className={`s-estado ${r.tono}`}><Icono nombre={r.icono} lado={16} />Riesgo {x.riesgo}</span>} tituloHoja={x.nombre}>
                <div className="cl-mes">
                  <p className="t-cuerpo">{x.como}</p>
                  <p className="t-nota">Fuente: {x.fuente}.</p>
                </div>
              </FilaHoja>
            );
          })}
        </div>
      </Grupo>
      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <FilaHoja icono="candado" titulo="Derechos" nota="Sin autorización, strike" tituloHoja="Derechos de los clips">
            <p className="t-cuerpo">{CLIP.derechos}</p>
          </FilaHoja>
          <FilaHoja icono="perfil" titulo="Reglas de la granja" valor={`${CLIP.reglasCuentas.length} reglas`}>
            <ul className="cl-lista">{CLIP.reglasCuentas.map((t) => <li key={t}>{t}</li>)}</ul>
          </FilaHoja>
        </div>
      </Grupo>
    </Marco>
  );
}

// ——— Riesgos y rutina ———

const INFO_RIESGOS = (
  <>
    <p className="t-cuerpo-l">La rutina de la semana, paso por paso, y qué hacer si algo sale mal.</p>
    {CLIP.rutina.map((r) => <p key={r.id} className="t-cuerpo"><b>{r.titulo}.</b> {r.texto}</p>)}
    <p className="t-nota">Se tilda por semana: el lunes arranca limpia.</p>
  </>
);

export function RiesgosClip({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const l = lunesDe(date);
  const hechos = useStore((s) => s.clipping.rutina[l]) ?? [];
  const hoy = new Date(`${date}T12:00:00`).getDay();
  return (
    <Marco className="cl" titulo="Riesgos y rutina" volver={VOLVER} info={INFO_RIESGOS}>
      <Grupo titulo="Rutina de la semana" extremo={<span className="t-rotulo">{hechasDe(hechos.length, CLIP.rutina.length)}</span>}>
        <Lista area={AREA} onCambio={(id) => tildarRutina(date, id)}
          items={CLIP.rutina.map((r) => ({ clave: r.id, etiqueta: r.titulo, nota: r.dias.includes(hoy) ? `Hoy · ${r.texto}` : undefined, marcada: hechos.includes(r.id) }))} />
      </Grupo>
      <Grupo titulo="Riesgos y plan B">
        <div className="capa-1 s-lista">
          {CLIP.riesgos.map((r) => (
            <FilaHoja key={r.riesgo} icono="atencion" titulo={r.riesgo} tituloHoja={r.riesgo}>
              <p className="t-cuerpo">{r.planB}</p>
            </FilaHoja>
          ))}
        </div>
      </Grupo>
      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <FilaHoja icono="documento" titulo="Fuentes" nota={CLIP.datosA} valor={String(CLIP.fuentes.length)}>
            <ul className="cl-lista">{CLIP.fuentes.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="t-nota">Proyección propia basada en las tarifas de las fuentes: no son cifras garantizadas. Sin verificar por Trazo.</p>
          </FilaHoja>
        </div>
      </Grupo>
    </Marco>
  );
}

// ——— Semana 1 ———

const INFO_SEMANA1 = (
  <>
    <p className="t-cuerpo-l">La primera semana del roadmap, día por día: cuentas, campañas y los primeros clips.</p>
    <p className="t-nota">Se oculta sola después del mes 1.</p>
  </>
);

/** Un título corto para cada paso de la semana 1 (el texto entero va en la hoja). Si el plan cambia, cae a las primeras palabras. */
const CORTO: Record<string, string> = { '2026-11-16': 'Cuentas y reglas', '2026-11-17': 'Tres cuentas base', '2026-11-18': 'Tres campañas y primeros clips', '2026-11-21': 'La planilla y el descarte' };
const titulo = (desde: string, texto: string) => CORTO[desde] ?? `${texto.split(' ').slice(0, 5).join(' ')}…`;

export function Semana1Clip({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  return (
    <Marco className="cl" titulo="Semana 1" volver={VOLVER} info={INFO_SEMANA1}>
      <Grupo titulo="GTA 6">
        <div className="capa-1 s-lista">
          <FilaHoja icono="cohete" titulo="Jueves 19 nov" nota="Cómo cobrarlo" tituloHoja="GTA 6 · jueves 19 nov">
            <p className="t-cuerpo">{CLIP.gta6}</p>
          </FilaHoja>
        </div>
      </Grupo>
      <Grupo titulo="Día por día">
        <div className="capa-1 s-lista">
          {CLIP.semana1.map((x) => {
            const est = date > x.hasta ? 'hecho' : date >= x.desde ? 'actual' : '';
            return (
              <FilaHoja key={x.desde + x.texto} titulo={titulo(x.desde, x.texto)} nota={rangoCorto(x.desde, x.hasta)}
                valor={est === 'actual' ? <Aca /> : est === 'hecho' ? 'Hecho' : 'Próximo'} hecho={est === 'hecho'} tituloHoja={titulo(x.desde, x.texto)}>
                <p className="t-cuerpo">{x.texto}</p>
              </FilaHoja>
            );
          })}
        </div>
      </Grupo>
      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <FilaHoja icono="enlace" titulo="Plataformas para probar" nota="Tarifas sin verificar" valor={String(CLIP.plataformas.length)}>
            <ul className="cl-plataformas">{CLIP.plataformas.map((p) => <li key={p.nombre}><b>{p.nombre}</b><span className="t-dato">{p.tarifa}</span><small className="t-nota">{p.nota}</small></li>)}</ul>
            <p className="t-nota">{CLIP.datosA}. Las tarifas cambian por campaña y se agotan: revisalas cada semana.</p>
          </FilaHoja>
        </div>
      </Grupo>
    </Marco>
  );
}

