/**
 * Trazo 2.0 · la hoja de una fila de la planilla (cargar clips y views en tres toques, o corregir una fila). Recuerda la última
 * cuenta y campaña, acepta fechas pasadas y deja "Deshacer" en el aviso. Escribe lo mismo que la 1.0 (`registrarClips`, `editarFila`,
 * `borrarFila`, `restaurarFila`): la planilla es la misma.
 */
import { useState } from 'react';
import { mesDe, MESES_CLIP, CLIP } from '../../data/clipping';
import type { FilaClip } from '../../data/clipping-state';
import { borrarFila, editarFila, registrarClips, restaurarFila } from '../../state/clipping';
import { useStore } from '../../state/store';
import { aviso } from '../kit/capas';
import { Boton, CampoFecha, CampoTexto, Contador, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { aTexto, decimal, entero, fcA, soloNumero, useHojaDe } from './datos';
import './clipping.css';

interface Props { abierta: boolean; onCerrar: () => void; hoy: string; fila?: FilaClip; /** Cambia en cada apertura, para empezar de cero. */ clave: number }

export function HojaFila({ abierta, onCerrar, hoy, fila, clave }: Props) {
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={fila ? 'Editar fila' : 'Registrar clips'}>
      <Formulario key={`${clave}:${fila?.id ?? 'nueva'}`} hoy={hoy} fila={fila} onCerrar={onCerrar} />
    </Hoja>
  );
}

function Formulario({ hoy, fila, onCerrar }: { hoy: string; fila?: FilaClip; onCerrar: () => void }) {
  const clip = useStore((s) => s.clipping);
  const ultima = clip.ultima ?? {};
  const planDia = CLIP.meses[Math.min(Math.max(mesDe(hoy), 1), MESES_CLIP) - 1].clipsDia;
  const [fecha, setFecha] = useState(fila?.fecha ?? hoy);
  const [cuenta, setCuenta] = useState(fila ? fila.cuenta ?? '' : (ultima.cuenta && clip.cuentas.some((c) => c.id === ultima.cuenta) ? ultima.cuenta : clip.cuentas.find((c) => c.estado === 'activa')?.id) ?? '');
  const [campana, setCampana] = useState(fila ? fila.campana ?? '' : (ultima.campana && clip.campanas.some((c) => c.id === ultima.campana) ? ultima.campana : '') ?? '');
  const [clips, setClips] = useState<number | null>(fila ? fila.clips : null);
  const [v, setV] = useState({
    views: aTexto(fila?.views), verificadas: aTexto(fila?.verificadas), aprobados: aTexto(fila?.aprobados), mas1000: aTexto(fila?.mas1000),
    estimado: aTexto(fila?.estimado), cobrado: aTexto(fila?.cobrado), nota: fila?.nota ?? '',
  });
  const [mas, setMas] = useState(!!fila && [fila.verificadas, fila.aprobados, fila.mas1000, fila.estimado, fila.cobrado, fila.nota].some((x) => x != null && x !== ''));
  const pon = (k: keyof typeof v, solo = true) => (t: string) => setV((x) => ({ ...x, [k]: solo ? soloNumero(t) : t }));

  const cobrado = decimal(v.cobrado);
  const aprobados = entero(v.aprobados);
  const listo = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && (clips != null || cobrado != null);
  const aprobOk = aprobados == null || clips == null || aprobados <= clips;
  const motivo = !listo ? 'Cargá los clips o lo cobrado.' : !aprobOk ? 'Hay más aprobados que clips.' : undefined;

  const guardar = () => {
    if (!listo || !aprobOk) return;
    const datos = {
      fecha, cuenta: cuenta || undefined, campana: campana || undefined, clips: clips ?? 0, views: entero(v.views) ?? 0,
      verificadas: entero(v.verificadas), aprobados, mas1000: entero(v.mas1000), estimado: decimal(v.estimado), cobrado, nota: v.nota.trim() || undefined,
    };
    if (fila) {
      editarFila(fila.id, datos);
      aviso({ titulo: 'Fila actualizada', sub: fcA(fecha), tono: 'hecho', deshacer: () => restaurarFila(fila) });
    } else {
      const id = registrarClips(datos);
      aviso({ titulo: `Registrado · ${datos.clips} ${datos.clips === 1 ? 'clip' : 'clips'}`, sub: `${datos.views.toLocaleString('es-AR')} views${fecha !== hoy ? ` · ${fcA(fecha)}` : ''}`, tono: 'hecho', deshacer: () => borrarFila(id) });
    }
    onCerrar();
  };
  const borrar = () => {
    if (!fila) return;
    borrarFila(fila.id);
    aviso({ titulo: 'Fila borrada', sub: fcA(fila.fecha), deshacer: () => restaurarFila(fila) });
    onCerrar();
  };
  const nombreCampana = clip.campanas.find((c) => c.id === campana)?.nombre;

  return (
    <form className="cl-form" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
      <div className="cl-campo">
        <span className="k-campo-etiqueta">Clips publicados</span>
        <Contador etiqueta="Clips" valor={clips} inicial={planDia} min={0} max={999} onCambio={setClips} />
      </div>
      <CampoTexto etiqueta="Views" modo="numeric" valor={v.views} onCambio={pon('views')} placeholder="12000" />
      <Selector etiqueta="Cuenta" valor={cuenta} onCambio={setCuenta} opciones={[{ valor: '', etiqueta: 'Todas o sin cuenta' }, ...clip.cuentas.map((c) => ({ valor: c.id, etiqueta: c.alias, nota: c.red }))]} />
      <Selector etiqueta="Campaña" valor={campana} onCambio={setCampana} opciones={[{ valor: '', etiqueta: 'Sin campaña' }, ...clip.campanas.filter((c) => c.estado !== 'descartada' || c.id === campana).map((c) => ({ valor: c.id, etiqueta: c.nombre, nota: c.plataforma }))]} />
      <CampoFecha etiqueta="Fecha" valor={fecha} onCambio={setFecha} hoy={hoy} max={hoy} nota={fecha !== hoy ? 'Una fecha pasada: se carga igual.' : undefined} />

      {!mas ? (
        <Boton variante="fantasma" icono="mas" onClick={() => setMas(true)}>Verificadas, aprobados, cobro y nota</Boton>
      ) : (
        <fieldset className="cl-extra">
          <legend className="t-rotulo">Lo que llega después{nombreCampana ? ` · ${nombreCampana}` : ''}</legend>
          <div className="cl-dos">
            <CampoTexto etiqueta="Verificadas" modo="numeric" valor={v.verificadas} onCambio={pon('verificadas')} placeholder="= views" />
            <CampoTexto etiqueta="Aprobados" modo="numeric" valor={v.aprobados} onCambio={pon('aprobados')} error={aprobOk ? undefined : 'Más aprobados que clips.'} />
          </div>
          <div className="cl-dos">
            <CampoTexto etiqueta="Con más de 1.000 views" modo="numeric" valor={v.mas1000} onCambio={pon('mas1000')} />
            <CampoTexto etiqueta="Estimado · USD" modo="decimal" valor={v.estimado} onCambio={pon('estimado')} />
          </div>
          <CampoTexto etiqueta="Cobrado · USD" modo="decimal" valor={v.cobrado} onCambio={pon('cobrado')} placeholder="Solo si ya cobraste" />
          <CampoTexto etiqueta="Nota" valor={v.nota} onCambio={pon('nota', false)} placeholder="Gancho, horario, qué funcionó" />
        </fieldset>
      )}

      <div className="cl-acciones">
        <Boton variante="primario" ancho tipo="submit" icono="tilde" deshabilitado={motivo ?? false}>{fila ? 'Guardar cambios' : 'Guardar'}</Boton>
        {fila && <Boton variante="fantasma" icono="borrar" onClick={borrar}>Borrar la fila</Boton>}
      </div>
    </form>
  );
}

/** El estado de la hoja de una fila: cuál se abre (ninguna = una nueva) y una clave nueva en cada apertura para empezar de cero. */
export function useHojaFila() {
  const h = useHojaDe<FilaClip>();
  return { props: { abierta: h.abierta, fila: h.item, clave: h.clave, onCerrar: h.cerrar }, abrir: h.abrir };
}
