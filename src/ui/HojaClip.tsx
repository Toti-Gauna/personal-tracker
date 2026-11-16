import { useState } from 'react';
import { COLOR_CLIP } from '../data/clipping';
import type { FilaClip } from '../data/clipping-state';
import { borrarFila, editarFila, registrarClips, restaurarFila } from '../state/clipping';
import { getState, useStore } from '../state/store';
import { toast } from './avisos';
import { Hoja } from './Hoja';

const n = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(/\./g, '').replace(',', '.')));
const txt = (v?: number) => (v == null ? '' : String(v).replace('.', ','));
const soloNum = (s: string) => s.replace(/[^\d.,]/g, '');

/**
 * Ola 23 · la hoja "Registrar": cargar en 3 toques (clips, views, guardar). Recuerda la última cuenta
 * y campaña, acepta fechas pasadas y deja "Deshacer" en el aviso. Con `fila`, edita esa fila.
 */
export function HojaClip({ date, fila, onCerrar }: { date: string; fila?: FilaClip; onCerrar: () => void }) {
  const clip = useStore((s) => s.clipping);
  const ultima = clip.ultima ?? {};
  const [fecha, setFecha] = useState(fila?.fecha ?? date);
  const [cuenta, setCuenta] = useState(fila ? fila.cuenta ?? '' : (ultima.cuenta && clip.cuentas.some((c) => c.id === ultima.cuenta) ? ultima.cuenta : clip.cuentas.find((c) => c.estado === 'activa')?.id) ?? '');
  const [campana, setCampana] = useState(fila ? fila.campana ?? '' : (ultima.campana && clip.campanas.some((c) => c.id === ultima.campana) ? ultima.campana : '') ?? '');
  const [v, setV] = useState({
    clips: txt(fila?.clips), views: txt(fila?.views), verificadas: txt(fila?.verificadas), aprobados: txt(fila?.aprobados),
    mas1000: txt(fila?.mas1000), estimado: txt(fila?.estimado), cobrado: txt(fila?.cobrado), nota: fila?.nota ?? '',
  });
  const [mas, setMas] = useState(!!fila && [fila.verificadas, fila.aprobados, fila.mas1000, fila.estimado, fila.cobrado].some((x) => x != null));
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: k === 'nota' ? e.target.value : soloNum(e.target.value) }));
  const clips = n(v.clips);
  const listo = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && (clips != null || n(v.cobrado) != null);
  const aprobOk = n(v.aprobados) == null || clips == null || (n(v.aprobados) ?? 0) <= clips;

  const guardar = () => {
    if (!listo || !aprobOk) return;
    const datos = {
      fecha, cuenta: cuenta || undefined, campana: campana || undefined, clips: clips ?? 0, views: n(v.views) ?? 0,
      verificadas: n(v.verificadas), aprobados: n(v.aprobados), mas1000: n(v.mas1000), estimado: n(v.estimado), cobrado: n(v.cobrado), nota: v.nota.trim() || undefined,
    };
    if (fila) {
      editarFila(fila.id, datos);
      toast({ title: 'Fila actualizada', sub: fecha, color: COLOR_CLIP, action: { label: 'Deshacer', run: () => restaurarFila(fila) } }, false);
    } else {
      const id = registrarClips(datos);
      toast({ title: `Registrado · ${datos.clips} ${datos.clips === 1 ? 'clip' : 'clips'}`, sub: `${datos.views.toLocaleString('es-AR')} views${fecha !== date ? ` · ${fecha}` : ''}`, color: COLOR_CLIP, evento: 'tarea', action: { label: 'Deshacer', run: () => borrarFila(id) } });
    }
    onCerrar();
  };

  const nombreCampana = (id: string) => getState().clipping.campanas.find((c) => c.id === id)?.nombre;
  return (
    <Hoja titulo={fila ? 'Editar fila' : 'Registrar'} kicker="Clipping · planilla" color={COLOR_CLIP} onCerrar={onCerrar}>
      <form className="hclip" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <div className="hclip-dos">
          <label>Clips<input className="campo-texto mono" inputMode="numeric" autoFocus={!fila} enterKeyHint="next" value={v.clips} onChange={set('clips')} placeholder="5" /></label>
          <label>Views<input className="campo-texto mono" inputMode="numeric" enterKeyHint="done" value={v.views} onChange={set('views')} placeholder="12000" /></label>
        </div>
        <div className="hclip-dos">
          <label>Cuenta
            <select className="campo-texto" value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
              <option value="">Todas / sin cuenta</option>
              {clip.cuentas.map((c) => <option key={c.id} value={c.id}>{c.alias} · {c.red}</option>)}
            </select>
          </label>
          <label>Campaña
            <select className="campo-texto" value={campana} onChange={(e) => setCampana(e.target.value)}>
              <option value="">Sin campaña</option>
              {clip.campanas.filter((c) => c.estado !== 'descartada' || c.id === campana).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
        </div>
        <label className="hclip-fecha">Fecha<input className="campo-texto mono" type="date" value={fecha} max={date} onChange={(e) => setFecha(e.target.value)} /></label>
        {!mas ? (
          <button type="button" className="subrayado hclip-mas" onClick={() => setMas(true)}>+ Verificadas, aprobados, cobro y nota</button>
        ) : (
          <fieldset className="hclip-extra">
            <legend className="etiqueta">Lo que llega después {campana && nombreCampana(campana) ? `· ${nombreCampana(campana)}` : ''}</legend>
            <div className="hclip-dos">
              <label>Verificadas<input className="campo-texto mono" inputMode="numeric" value={v.verificadas} onChange={set('verificadas')} placeholder="= views" /></label>
              <label>Aprobados<input className="campo-texto mono" inputMode="numeric" value={v.aprobados} onChange={set('aprobados')} aria-invalid={!aprobOk} /></label>
            </div>
            <div className="hclip-dos">
              <label>Más de 1.000 views<input className="campo-texto mono" inputMode="numeric" value={v.mas1000} onChange={set('mas1000')} /></label>
              <label>Estimado USD<input className="campo-texto mono" inputMode="decimal" value={v.estimado} onChange={set('estimado')} /></label>
            </div>
            <label>Cobrado USD<input className="campo-texto mono" inputMode="decimal" value={v.cobrado} onChange={set('cobrado')} placeholder="Solo si ya cobraste" /></label>
            <label>Nota<input className="campo-texto" value={v.nota} onChange={set('nota')} placeholder="Gancho, horario, qué funcionó" /></label>
            {!aprobOk && <p className="hclip-error">Hay más aprobados que clips.</p>}
          </fieldset>
        )}
        <button className="btn-principal" type="submit" disabled={!listo || !aprobOk}>{fila ? 'Guardar cambios' : 'Guardar'}</button>
        {fila && <button className="btn-borde" type="button" onClick={() => { borrarFila(fila.id); toast({ title: 'Fila borrada', color: COLOR_CLIP, action: { label: 'Deshacer', run: () => restaurarFila(fila) } }, false); onCerrar(); }}>Borrar la fila</button>}
      </form>
    </Hoja>
  );
}
