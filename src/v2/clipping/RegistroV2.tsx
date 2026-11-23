/**
 * Trazo 2.0 · el Registro del Clipping (#/metas/clipping/registro): una fila por día (o por clip) con sus clips, views y cobro. Cargar
 * y corregir va en una hoja; los filtros y el JSON de la planilla, en otras dos. Escribe lo mismo que la 1.0.
 */
import { useState } from 'react';
import { CLIP, finMes, inicioMes, mesDe, MESES_CLIP } from '../../data/clipping';
import { filas, totales, type Rango } from '../../data/clipping-metricas';
import { validarPlanilla } from '../../data/clipping-state';
import { addDays } from '../../data/time';
import { importarPlanilla } from '../../state/clipping';
import { getState, setState, useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Dato, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { fc, usd } from './datos';
import { HojaFila, useHojaFila } from './HojaFila';
import '../proyecto/proyecto.css';
import './clipping.css';
import { dateKey } from '../../data/time';

const INFO = (
  <>
    <p className="t-cuerpo-l">Una fila por día, o por clip: cuántos clips publicaste y cuántas views tuvieron.</p>
    <p className="t-cuerpo">Acepta fechas pasadas. El cobro, los aprobados y la nota se cargan cuando llegan: tocá una fila para completarla.</p>
    <p className="t-cuerpo">El pago real por 1.000 views sale solo de las filas con cobro cargado.</p>
  </>
);

export default function RegistroV2({ day, today }: PropsV2) {
  const date = day?.date ?? today;
  const clip = useStore((s) => s.clipping);
  const hoja = useHojaFila();
  const [cuenta, setCuenta] = useState('');
  const [campana, setCampana] = useState('');
  const [mes, setMes] = useState(String(Math.min(Math.max(mesDe(date), 1), MESES_CLIP)));
  const [cuantas, setCuantas] = useState(30);

  const rango: Rango | undefined = mes === 'todo' ? undefined : mes === '0' ? { desde: '2000-01-01', hasta: addDays(CLIP.t0, -1) } : { desde: inicioMes(Number(mes)), hasta: finMes(Number(mes)) };
  const fs = filas(clip, rango, { cuenta: cuenta || undefined, campana: campana || undefined });
  const t = totales(fs);
  const lista = [...fs].reverse();
  const nombre = (id: string | undefined, xs: { id: string; alias?: string; nombre?: string }[]) => (id ? (xs.find((x) => x.id === id)?.alias ?? xs.find((x) => x.id === id)?.nombre ?? '—') : '');
  const opcionesMes = [
    { valor: 'todo', etiqueta: 'Todo' },
    ...(clip.registro.some((f) => f.fecha < CLIP.t0) ? [{ valor: '0', etiqueta: 'Antes del roadmap' }] : []),
    ...CLIP.meses.map((m) => ({ valor: String(m.n), etiqueta: `Mes ${m.n}`, nota: `desde el ${fc(inicioMes(m.n))}` })),
  ];
  const filtros = [mes === 'todo' ? 'Todo' : mes === '0' ? 'Antes del roadmap' : `Mes ${mes}`, cuenta ? nombre(cuenta, clip.cuentas) : null, campana ? nombre(campana, clip.campanas) : null].filter(Boolean).join(' · ');

  return (
    <Marco className="cl" titulo="Registro" volver={{ href: '#/metas/clipping', nombre: 'Clipping' }} info={INFO}>
      <Tarjeta heroe area="var(--a-eclipse)" className="cl-resumen" etiqueta="Totales del período">
        <div className="cl-tres">
          <Dato valor={t.clips.toLocaleString('es-AR')} etiqueta="Clips" />
          <Dato valor={t.views.toLocaleString('es-AR')} etiqueta="Views" />
          <Dato valor={usd(t.cobrado).replace('USD ', '')} unidad="USD" etiqueta="Cobrado" />
        </div>
        {lista.length > 0 && <Boton variante="primario" ancho icono="mas" onClick={() => hoja.abrir()}>Registrar clips</Boton>}
      </Tarjeta>

      <Grupo titulo="Filas" extremo={<span className="t-rotulo">{fs.length} {fs.length === 1 ? 'fila' : 'filas'}</span>}>
        <FiltrosFila resumen={filtros}>
          <Selector etiqueta="Mes" valor={mes} onCambio={(v) => { setMes(v); setCuantas(30); }} opciones={opcionesMes} />
          <Selector etiqueta="Cuenta" valor={cuenta} onCambio={(v) => { setCuenta(v); setCuantas(30); }} opciones={[{ valor: '', etiqueta: 'Todas' }, ...clip.cuentas.map((c) => ({ valor: c.id, etiqueta: c.alias, nota: c.red }))]} />
          <Selector etiqueta="Campaña" valor={campana} onCambio={(v) => { setCampana(v); setCuantas(30); }} opciones={[{ valor: '', etiqueta: 'Todas' }, ...clip.campanas.map((c) => ({ valor: c.id, etiqueta: c.nombre, nota: c.plataforma }))]} />
        </FiltrosFila>
        {lista.length === 0 ? (
          <Vacio ilustracion="clip" titulo={rango ? 'Sin filas en este período' : 'Sin filas todavía'} texto="Cargá clips y views: acepta fechas pasadas."
            accion={<Boton variante="primario" icono="mas" onClick={() => hoja.abrir()}>Registrar clips</Boton>} />
        ) : (
          <div className="capa-1 s-lista">
            {lista.slice(0, cuantas).map((f) => (
              <Fila key={f.id} titulo={`${f.clips} ${f.clips === 1 ? 'clip' : 'clips'} · ${f.views.toLocaleString('es-AR')} views`}
                nota={[fc(f.fecha), nombre(f.cuenta, clip.cuentas), nombre(f.campana, clip.campanas), f.nota].filter(Boolean).join(' · ')}
                valor={f.cobrado != null ? usd(f.cobrado) : f.estimado != null ? `~${usd(f.estimado)}` : undefined} onClick={() => hoja.abrir(f)} />
            ))}
          </div>
        )}
        {lista.length > cuantas && <Boton variante="fantasma" onClick={() => setCuantas((x) => x + 30)}>Ver {Math.min(30, lista.length - cuantas)} más</Boton>}
      </Grupo>

      <Grupo titulo="Más">
        <div className="capa-1 s-lista"><ExportarImportar /></div>
      </Grupo>

      <HojaFila {...hoja.props} hoy={date} />
    </Marco>
  );
}

/** La fila de los filtros: dice cuáles hay y abre sus tres selectores. */
function FiltrosFila({ resumen, children }: { resumen: string; children: React.ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <div className="capa-1 s-lista"><Fila icono="buscar" titulo="Filtros" valor={resumen} onClick={() => setAbierta(true)} /></div>
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Filtros">
        <div className="cl-form">{children}<Boton variante="primario" ancho onClick={() => setAbierta(false)}>Ver las filas</Boton></div>
      </Hoja>
    </>
  );
}

/** El JSON de la planilla: es el esquema de datos del dashboard. Al importar se valida línea por línea y lo que tenga el mismo id se reemplaza. */
function ExportarImportar() {
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState('');
  const [errores, setErrores] = useState<string[]>([]);
  const exportar = () => {
    const blob = new Blob([JSON.stringify({ tipo: 'clipping', version: 1, ...getState().clipping }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trazo-clipping-${dateKey()}.json`; // la fecha de acá (toISOString es la de Greenwich: a las 22 h ya es mañana)
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importar = () => {
    let x: unknown;
    try { x = JSON.parse(texto); } catch { setErrores(['No es un JSON válido.']); return; }
    const e = validarPlanilla(x);
    setErrores(e);
    if (e.length) return;
    const previa = getState().clipping;
    importarPlanilla(x);
    setTexto('');
    setAbierta(false);
    aviso({ titulo: 'Planilla importada', sub: 'Lo que tenía el mismo id se reemplazó', tono: 'hecho', deshacer: () => setState((s) => ({ ...s, clipping: previa })) });
  };
  return (
    <>
      <Fila icono="exportar" titulo="Exportar o importar" nota="El JSON de la planilla" onClick={() => setAbierta(true)} />
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Exportar o importar">
        <div className="cl-form">
          <p className="t-nota">Es el esquema de datos de tu dashboard: exportalo para sembrarlo. Al importar se valida línea por línea y lo que tenga el mismo id se reemplaza.</p>
          <Boton icono="exportar" ancho onClick={exportar}>Exportar la planilla</Boton>
          <CampoTexto etiqueta="JSON para importar" multilinea valor={texto} onCambio={(v) => { setTexto(v); setErrores([]); }} placeholder='{"registro": [{"fecha": "2026-11-19", "clips": 5, "views": 12000}]}' />
          {errores.length > 0 && <ul className="cl-errores" role="alert">{errores.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul>}
          <Boton variante="primario" ancho icono="importar" deshabilitado={texto.trim() ? false : 'Pegá el JSON primero.'} onClick={importar}>Importar</Boton>
        </div>
      </Hoja>
    </>
  );
}
