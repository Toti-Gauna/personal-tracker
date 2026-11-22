/**
 * Trazo 2.0 · Perfil (#/perfil): quién sos en números. La tarjeta de identidad con el anillo del nivel, el año como mapa de calor,
 * los hitos que tenés más cerca y los 24 sellos. El historial y el detalle de cada sello van en hojas.
 */
import { useState } from 'react';
import { fmtPct } from '../../data/mejora';
import { GROUP_LABEL, GROUP_ORDER, SEALS, SEAL_XP, XP_PER_GOAL, XP_PER_TASK, history, hitos, type SealDef } from '../../data/profile';
import { contadoresAgenticos } from '../../data/puertas';
import { fmtFecha } from '../../data/time';
import { useStore } from '../../state/store';
import { claimSeal, unclaimSeal } from '../../state/profile';
import { aviso } from '../kit/capas';
import { Boton } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Anillo, Barra, Dato, Fila, Tarjeta } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { FilaHoja } from '../proyecto/piezas';
import type { PropsV2 } from '../registro';
import { Calor } from './Calor';
import { colorDeSello, mapaDelAnio, resumen } from './datos';
import { SelloV2 } from './Sello';
import '../proyecto/proyecto.css';
import './perfil.css';

const n3 = (n: number) => n.toLocaleString('es-AR');
const fmt1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

const INFO = (
  <>
    <p className="t-cuerpo-l">Tu nivel, tu año y tus sellos.</p>
    <p className="t-cuerpo">Sumás {XP_PER_TASK} XP por cada tarea hecha y {XP_PER_GOAL} por cada meta del día cumplida, al cerrar el día. Cada sello suma {SEAL_XP}. Subir de nivel cuesta 300 XP y 100 más por cada nivel.</p>
    <p className="t-cuerpo">En el año, cada celda es un día: cuanto más cumpliste, más llena. Un sello se gana solo cuando se cumple su condición; los que decís vos se marcan desde el sello.</p>
  </>
);

export default function PerfilV2({ day }: PropsV2) {
  const s = useStore((x) => x);
  const settings = s.settings!;
  const [abierto, setAbierto] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<SealDef | null>(null);
  const r = resumen(s, day.date);
  const mapa = mapaDelAnio(s.days, day.date, settings.startDate);
  const hs = hitos(s, day.date, 3);
  const hist = history(s, settings.startDate);
  const ag = contadoresAgenticos(s.plan);
  const abrir = (d: SealDef) => { setUltimo(d); setAbierto(d.id); };
  const d = ultimo;
  const ganadoEl = d ? s.profile.seals[d.id] : undefined;
  const avance = d && !ganadoEl && d.progress ? d.progress({ s, date: day.date }) : null;

  return (
    <Marco className="pf" titulo="Perfil" info={INFO} acciones={<Boton soloIcono variante="fantasma" icono="ajustes" etiqueta="Ajustes" href="#/ajustes" />}>
      <Tarjeta heroe className="pf-identidad" etiqueta="Tu nivel">
        <div className="pf-id">
          <Anillo valor={r.haciaElProximo / r.costo} tamano={104} grosor={8} etiqueta={r.nivel} sub="nivel" nombre={`Nivel ${r.nivel}, ${n3(r.haciaElProximo)} de ${n3(r.costo)} XP`} />
          <div className="pf-id-texto">
            <h2 className="t-seccion">{settings.names.me}</h2>
            <p className="t-dato">{n3(r.xp)} XP</p>
            <p className="t-nota">Faltan {n3(r.faltan)} para el nivel {r.nivel + 1}</p>
          </div>
        </div>
        <div className="pf-numeros">
          <Dato valor={r.dias} etiqueta="Días" />
          <Dato valor={r.racha} etiqueta="Racha" />
          <Dato valor={`${r.sellos}/${r.sellosTotal}`} etiqueta="Sellos" />
          <Dato valor={`+${fmtPct(r.mejora, 1)}`} unidad="%" etiqueta="Mejora" />
        </div>
      </Tarjeta>

      <Grupo titulo="El año" extremo={<span className="t-rotulo">{mapa.cargados ? `${mapa.cargados} ${mapa.cargados === 1 ? 'día' : 'días'} · promedio ${Math.round((mapa.promedio ?? 0) * 100)} %` : 'Sin días cargados'}</span>}>
        <div className="capa-1 pf-anio">
          <Calor mapa={mapa} nombre={`El año, día por día: ${mapa.cargados} ${mapa.cargados === 1 ? 'día cargado' : 'días cargados'}${mapa.promedio != null ? `, promedio ${Math.round(mapa.promedio * 100)} %` : ''}. Mejor racha: ${r.mejorRacha}.`} />
        </div>
      </Grupo>

      <Grupo titulo="Próximos hitos">
        {hs.length === 0 ? <p className="t-nota">Aparecen cuando te acercás a un sello: una racha, un peso, tus primeros capítulos.</p> : (
          <ul className="capa-1 pf-hitos">
            {hs.map(({ def, p }) => (
              <li key={def.id}>
                <button type="button" onClick={() => abrir(def)} aria-label={`${def.name}: ${p.hint}`}>
                  <SelloV2 marca={def.mark} color={def.color} ganado={false} lado={40} />
                  <span className="pf-hito-texto">
                    <span className="pf-hito-cab"><b className="t-cuerpo">{def.name}</b><span className="t-dato">{def.id.startsWith('peso-') ? `${Math.round(p.value)} %` : `${fmt1(p.value)} de ${p.target}`}</span></span>
                    <Barra valor={p.value} max={p.target} nombre={`${def.name}: avance`} area={colorDeSello(def.color)} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Grupo>

      <Grupo titulo="Sellos" extremo={<span className="t-rotulo">{r.sellos} de {r.sellosTotal}</span>}>
        {GROUP_ORDER.map((g) => {
          const defs = SEALS.filter((x) => x.group === g);
          return (
            <section key={g} className="pf-grupo" aria-label={GROUP_LABEL[g]}>
              <div className="pf-grupo-cab"><h3 className="t-nota">{GROUP_LABEL[g]}</h3><span className="t-dato">{defs.filter((x) => s.profile.seals[x.id]).length}/{defs.length}</span></div>
              <ul className="pf-sellos">
                {defs.map((x, i) => {
                  const ganado = !!s.profile.seals[x.id];
                  return (
                    <li key={x.id}>
                      <button type="button" onClick={() => abrir(x)} aria-label={`${x.name}: ${ganado ? 'ganado' : 'bloqueado'}`}>
                        <SelloV2 marca={x.mark} color={x.color} ganado={ganado} lado={64} i={i} />
                        <span className={ganado ? undefined : 'pf-apagado'}>{x.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </Grupo>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          <Fila icono="grafico" titulo="Avance" nota="Todo el progreso en una vista" href="#/avance" />
          <FilaHoja icono="calendario" titulo="Historial" nota="Día por día, con sus sellos" valor={String(hist.length)}>
            {hist.length === 0 ? <p className="t-nota">Todavía no hay días cerrados. Se cierran desde Hoy.</p> : (
              <ul className="capa-1 pt-revs">
                {hist.map((h) => <li key={h.date}><span className="t-rotulo">{fmtFecha(h.date)}</span><span className="t-cuerpo">{h.text}</span></li>)}
              </ul>
            )}
          </FilaHoja>
          <Fila icono="codigo" titulo="Portfolio agéntico" nota={`${ag.mcp} MCP · ${ag.agentes} agentes · ${ag.defensas} defensas`} valor={`de ${ag.total}`} href="#/metas/proyecto" />
        </div>
      </Grupo>

      <Hoja abierta={!!abierto} onCerrar={() => setAbierto(null)} titulo={d?.name ?? 'Sello'}>
        {d && (
          <div className="pf-detalle">
            <SelloV2 marca={d.mark} color={d.color} ganado={!!ganadoEl} lado={120} nombre={d.name} className="sl-grande" />
            <p className="t-cuerpo-l">{d.how}</p>
            {ganadoEl ? <p className="t-dato">Ganado el {fmtFecha(ganadoEl).toLowerCase()} · +{SEAL_XP} XP</p> : avance && (
              <div className="pf-detalle-avance">
                <Barra valor={avance.value} max={avance.target} nombre={`${d.name}: avance`} area={colorDeSello(d.color)} />
                <p className="t-nota">{avance.hint}</p>
              </div>
            )}
            {d.manual && (ganadoEl
              ? <Boton variante="secundario" onClick={() => { const fecha = ganadoEl; unclaimSeal(d.id); aviso({ titulo: 'Sello quitado', sub: d.name, deshacer: () => claimSeal(d.id, fecha) }); }}>Quitar el sello</Boton>
              : <Boton variante="primario" icono="tilde" onClick={() => claimSeal(d.id, day.date)}>Marcar como logrado</Boton>)}
          </div>
        )}
      </Hoja>
    </Marco>
  );
}
