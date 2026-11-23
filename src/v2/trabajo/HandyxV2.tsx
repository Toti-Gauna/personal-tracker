/**
 * Trazo 2.0 · Handyx (#/metas/handyx): el año de prueba. Arriba las horas de esta semana por día contra el plan; después los números
 * de la semana (operaciones, usuarios, horas del año, margen), los cuatro cortes con sus fechas (corridas si hubo stand-by) y el
 * criterio para decidir. En pausa la pantalla queda en modo lectura y se puede retomar. Mismos datos y mismas funciones que la 1.0.
 */
import { useState } from 'react';
import { horasDeRama } from '../../data/metas-plan';
import { PLAN, T0_PLAN, corteHandyx, fechaHito, finSemana, semanaDelPlan } from '../../data/plan';
import { cortesCorridos } from '../../data/busqueda';
import { pausaAbierta } from '../../data/plan-state';
import { addDays } from '../../data/time';
import { lunesDe, retomar, sumarHandyx } from '../../state/plan';
import { planSettings, useStore } from '../../state/store';
import { Barras } from '../estudio/Barras';
import { aviso, confirmar } from '../kit/capas';
import { Boton, CampoTexto } from '../kit/controles';
import { Dato, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { mayuscula } from '../proyecto/datos';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { AREA, dm, dma, miles, n1, useT0 } from './comun';
import '../proyecto/proyecto.css';
import './trabajo.css';
import { numeroEscrito } from '../reglas';

const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Cargar un número a mano (usuarios activos o margen): un campo y un botón. */
function CargarNumero({ etiqueta, nota, modo, placeholder, onGuardar }: { etiqueta: string; nota?: string; modo: 'numeric' | 'decimal'; placeholder?: string; onGuardar: (n: number) => void }) {
  const [v, setV] = useState('');
  const n = numeroEscrito(v) ?? NaN; // "1.500" es mil quinientos
  const valido = v.trim() !== '' && Number.isFinite(n) && n >= 0;
  return (
    <div className="pt-campo-hoja">
      <CampoTexto etiqueta={etiqueta} valor={v} onCambio={(x) => setV(x.replace(modo === 'numeric' ? /\D/g : /[^\d.,]/g, ''))} modo={modo} placeholder={placeholder} nota={nota} />
      <Boton variante="primario" deshabilitado={!valido} onClick={() => { onGuardar(n); setV(''); }}>Guardar</Boton>
    </div>
  );
}

export default function HandyxV2({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const t0 = useT0();
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  const settings = useStore((s) => s.settings);
  const cfg = planSettings(settings);
  const c = corteHandyx(date, t0);
  const decision = fechaHito(PLAN.hitos.find((h) => h.id === 'T+12')!, t0);
  const semanasAnio = PLAN.handyx.cortes[PLAN.handyx.cortes.length - 1].hasta;
  const s = semanaDelPlan(date, t0);
  const l = lunesDe(date);
  const sem = plan.handyx[l] ?? {};
  const porDia = Array.from({ length: 7 }, (_, i) => horasDeRama(days, 'handyx', addDays(l, i), addDays(l, i)));
  const horasSemana = porDia.reduce((a, b) => a + b, 0) + (sem.horas ?? 0);
  const horasAnio = Object.values(plan.handyx).reduce((a, h) => a + (h.horas ?? 0), 0) + horasDeRama(days, 'handyx', t0, finSemana(semanasAnio, t0));
  const usuarios = Math.max(0, ...Object.values(plan.handyx).map((h) => h.clientes ?? 0));
  const margen = Object.entries(plan.handyx).filter(([k]) => k <= l).sort(([a], [b]) => b.localeCompare(a)).find(([, h]) => h.margen != null)?.[1].margen;
  const corteRent = PLAN.handyx.cortes.findIndex((x) => x.id === 'rentabilidad');
  const enRent = !!c && c.indice >= corteRent;
  const hoy = (new Date(`${date}T12:00`).getDay() + 6) % 7;
  // En pausa la pantalla queda en modo lectura y los cortes se corren lo que dure.
  const pa = pausaAbierta(plan, 'handyx');
  const cortes = cortesCorridos(PLAN.handyx.cortes.map((x, i) => ({ id: x.id, fin: i === PLAN.handyx.cortes.length - 1 ? decision : finSemana(x.hasta, t0) })), plan, date);
  const fin = cortes[cortes.length - 1].fecha;

  const retomarHandyx = async () => {
    if (!(await confirmar({ titulo: '¿Retomás Handyx?', texto: 'Termina la pausa y vuelve la rutina anterior, con el bloque de Handyx. Nada se borró.', accion: 'Retomar' }))) return;
    retomar('handyx', date);
    aviso({ titulo: 'Handyx retomado', sub: 'Vuelve la rutina anterior desde el próximo Buen día', tono: 'hecho' });
  };

  const INFO = (
    <>
      <p className="t-cuerpo-l">Un año de prueba a {PLAN.handyx.horasPorDia} h por día. El {dma(fin)} decidís con datos: seguir, delegar o soltar.</p>
      <p className="t-cuerpo">Las horas salen del foco del bloque de Handyx; la raya de las barras son las {PLAN.handyx.horasPorDia} h del plan. “+1 h” suma una hora a mano.</p>
      <p className="t-cuerpo">En pausa, la pantalla queda en modo lectura y los cortes se corren lo que dure. El año de prueba cuenta desde que vuelve.</p>
    </>
  );

  return (
    <Marco className={`tr${pa ? ' tr-pausa' : ''}`} titulo="Handyx" rotulo={pa ? 'En stand-by' : c ? `Semana ${Math.max(1, s)} de ${semanasAnio}` : 'Según la decisión'} volver={{ href: '#/metas', nombre: 'Plan' }} info={INFO}>
      {pa && (
        <Tarjeta capa={2} etiqueta="Handyx en pausa" className="tr-franja">
          <p className="t-encabezado">En pausa desde el {dm(pa.desde)}</p>
          <p className="t-nota">{pa.motivo ? `${mayuscula(pa.motivo)}. ` : ''}Roadmap, cortes y backlog quedan congelados.</p>
          <Boton variante="primario" icono="play" onClick={retomarHandyx}>Retomar Handyx</Boton>
        </Tarjeta>
      )}

      <Tarjeta heroe area={AREA.handyx} etiqueta="Horas de esta semana" className="tr-heroe">
        <Dato grande valor={n1(horasSemana)} unidad={`de ${PLAN.handyx.horasPorSemana} h`} etiqueta="Horas esta semana" />
        <div data-grafico>
          <Barras nombre={`Horas de Handyx por día: ${porDia.map((h, i) => `${LETRAS[i]} ${n1(h)}`).join(', ')}. Plan: ${PLAN.handyx.horasPorDia} horas por día.`} meta={PLAN.handyx.horasPorDia} barras={porDia.map((h, i) => ({ etiqueta: LETRAS[i], valor: h, hoy: i === hoy, texto: h ? n1(h) : '—' }))} alto={88} />
        </div>
        {!pa && <Boton variante="primario" ancho icono="mas" onClick={() => sumarHandyx(date, { horas: 1 })}>Sumar 1 hora</Boton>}
      </Tarjeta>

      <Grupo titulo="Esta semana">
        <div className="capa-1 s-lista">
          <Fila icono="paquete" titulo="Operaciones" valor={String(sem.operaciones ?? 0)} extremo={pa ? undefined : <Boton soloIcono tamano="s" variante="secundario" icono="mas" etiqueta="Sumar una operación" onClick={() => sumarHandyx(date, { operaciones: 1 })} />} />
          {pa ? <Fila icono="perfil" titulo="Usuarios activos" valor={String(usuarios)} /> : (
            <FilaHoja icono="perfil" titulo="Usuarios activos" nota="El mayor que cargaste" valor={String(usuarios)} tituloHoja="Usuarios activos">
              <CargarNumero etiqueta="Usuarios activos hoy" modo="numeric" onGuardar={(n) => sumarHandyx(date, { clientes: n }, false)} />
            </FilaHoja>
          )}
          <Fila icono="reloj" titulo="Horas del año" valor={`${miles(Math.round(horasAnio))} de ${miles(PLAN.handyx.horasPorSemana * semanasAnio)} h`} />
          {enRent && !pa ? (
            <FilaHoja icono="dinero" titulo="Margen por operación" valor={margen != null ? `USD ${n1(margen)}` : 'Sin cargar'} tituloHoja="Margen por operación">
              <CargarNumero etiqueta="Margen por operación (USD)" modo="decimal" placeholder="USD" onGuardar={(n) => sumarHandyx(date, { margen: n }, false)} />
            </FilaHoja>
          ) : <Fila icono="dinero" titulo="Margen por operación" valor={enRent ? (margen != null ? `USD ${n1(margen)}` : 'Sin cargar') : `Desde el corte ${corteRent + 1}`} />}
        </div>
      </Grupo>

      <Grupo titulo={`${PLAN.handyx.cortes.length === 4 ? 'Cuatro' : PLAN.handyx.cortes.length} cortes`}>
        <ol className="capa-1 tr-cortes">
          {PLAN.handyx.cortes.map((x, i) => {
            const k = cortes[i];
            const est = pa ? '' : !c ? 'pas' : i < c.indice ? 'pas' : i === c.indice ? 'on' : '';
            return (
              <li key={x.id} className={est}>
                <i aria-hidden="true" />
                <div className="tr-corte-texto">
                  <span className="tr-corte-cab"><b className="t-cuerpo-l">{x.nombre}</b>{est === 'on' && <span className="tr-aqui">Ahora</span>}{est === 'pas' && <span className="t-rotulo">Pasó</span>}</span>
                  <span className="t-dato tr-corte-fecha">{k.corrido ? <><s>{dm(k.original)}</s> {dm(k.fecha)} · +{k.corrido} días</> : `Hasta el ${dm(k.fecha)}`}</span>
                  <span className="t-nota">{x.texto}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </Grupo>

      <div className="capa-1 s-lista">
        <FilaHoja icono="meta" titulo={`Criterio para el ${dma(fin)}`} nota={!cfg.umbralIngreso || !cfg.horasMaximas ? 'Falta escribir tus umbrales' : undefined} tituloHoja="Criterio para decidir">
          <p className="t-cuerpo pt-pie">Seguir si deja al menos <b>{cfg.umbralIngreso || '[tu umbral de ingreso]'}</b> por mes con <b>{cfg.horasMaximas || '[horas máximas]'}</b> por semana. Si no, delegar u ordenar la salida. Las {PLAN.handyx.horasPorDia} h vuelven a programación o a Eclipse.</p>
          {(!cfg.umbralIngreso || !cfg.horasMaximas) && <div className="pt-acciones"><Boton variante="secundario" icono="ajustes" href="#/ajustes">Escribir los umbrales en Ajustes</Boton></div>}
        </FilaHoja>
      </div>
    </Marco>
  );
}
