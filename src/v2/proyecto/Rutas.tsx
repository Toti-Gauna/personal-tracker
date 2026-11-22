/**
 * Trazo 2.0 · las rutas de #/metas/… que son de un bloque o de fondo, en un solo trozo que se carga cuando hace falta:
 * proyecto/<id>, cert/<id>, ventana/<id>, pista/<tipo>, fondo, fondo/<id>, iman/<id> y open-source.
 */
import { CertV2 } from './CertV2';
import { FondoHub } from './FondoHub';
import { FondoItemV2 } from './FondoItemV2';
import { ImanV2 } from './ImanV2';
import { OpenSourceV2 } from './OpenSourceV2';
import { PistaV2 } from './PistaV2';
import { ProyectoV2 } from './ProyectoV2';
import { VentanaV2 } from './VentanaV2';

export default function Rutas({ param, hoy }: { param: string; hoy: string }) {
  const [seccion, ...resto] = param.split('/');
  const id = decodeURIComponent(resto.join('/'));
  if (seccion === 'proyecto') return <ProyectoV2 key={id} id={id} hoy={hoy} />;
  if (seccion === 'cert') return <CertV2 key={id} id={id} hoy={hoy} />;
  if (seccion === 'ventana') return <VentanaV2 key={id} id={id} hoy={hoy} />;
  if (seccion === 'pista') return <PistaV2 key={id} tipo={id} hoy={hoy} />;
  if (seccion === 'fondo') return id ? <FondoItemV2 key={id} id={id} hoy={hoy} /> : <FondoHub hoy={hoy} />;
  if (seccion === 'iman') return <ImanV2 key={id} id={id} hoy={hoy} />;
  if (seccion === 'open-source') return <OpenSourceV2 hoy={hoy} />;
  return null;
}
