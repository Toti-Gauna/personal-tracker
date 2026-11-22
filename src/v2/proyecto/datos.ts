/**
 * Trazo 2.0 · lo que necesitan las páginas de proyecto, certificación y ventana, sin dibujar nada: de dónde sale cada dato de la
 * ficha, cuánto lleva cada lista de cierre y a qué bloque anterior y siguiente se pasa.
 */
import { PLAN_EXT, bloqueExtPorId, type BloqueFechado } from '../../data/plan-extendido';
import { PROY_V7, fichaV7, type ItemV7 } from '../../data/proyectos-v7';
import { EVIDENCIAS, type ProyectoEstado } from '../../data/plan-state';
import { TRAMOS, type Tramo } from '../../data/plan';
import { fp } from '../../ui/PeriodoTarjeta';

export interface FilaFicha { etiqueta: string; texto?: string; lista?: { t: string; estrella?: boolean }[]; nota?: string }
export interface GrupoFicha { grupo: string; filas: FilaFicha[] }

const may1 = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const items = (xs: ItemV7[]): Pick<FilaFicha, 'lista' | 'nota'> => {
  const extras = xs.filter((x) => x.extra);
  return { lista: xs.filter((x) => !x.extra).map((x) => ({ t: may1(x.nombre), estrella: x.estrella })), nota: extras.length ? `Extras: ${extras.map((x) => x.nombre).join(', ')}` : undefined };
};
const lista = (xs: string[]): Pick<FilaFicha, 'lista'> => ({ lista: xs.map((t) => ({ t: may1(t) })) });
const txt = (etiqueta: string, v: string | undefined): FilaFicha | null => (v ? { etiqueta, texto: may1(v) } : null);

/** Las filas de la ficha de un bloque, en tres grupos: qué es, cómo se construye y qué dice al mercado. Vacío si no hay ficha. */
export function fichaFilas(id: string): GrupoFicha[] {
  const f = fichaV7(id);
  const b = bloqueExtPorId(id);
  type Fila = FilaFicha | null | undefined;
  const que: Fila[] = [];
  const como: Fila[] = [];
  const mercado: Fila[] = [];
  if (f) {
    que.push(txt('Puesto', f.puesto), f.queHace && { etiqueta: 'Qué hace', ...lista(f.queHace) }, txt('Problema', f.problema), txt('Valor', f.valor), f.diferencial && { etiqueta: 'Diferencial', ...lista(f.diferencial) });
    como.push(
      f.herramientas && { etiqueta: 'Herramientas', ...items(f.herramientas) }, f.capaFisica && { etiqueta: 'Capa física', ...items(f.capaFisica) },
      f.medir && { etiqueta: f.medir.tipo === 'impacto' ? 'Impacto a medir' : 'Ahorro a medir', ...lista(f.medir.items) },
      f.notificaciones && { etiqueta: 'Notificaciones', ...items(f.notificaciones.items), nota: f.notificaciones.nota },
      f.voz && { etiqueta: 'Voz', ...items(f.voz) }, txt('Escala', f.escala), txt('Operación', f.operacion), f.spots && { etiqueta: 'Algorithm spots', ...lista(f.spots) }, txt('Hardware', f.hardware),
    );
    mercado.push(txt('Por qué hace ruido', f.ruido), txt('Entrevistas', f.entrevistas), txt('Pieza matemática hecha a mano', b?.ficha?.pieza), txt('Referencia externa', b?.ficha?.referencia), txt('Quién lo valida', b?.ficha?.validador));
  } else if (b?.ficha) {
    const x = b.ficha;
    que.push(txt('Rubro', x.rubro), txt('Feature diferencial', x.feature), txt('Tecnología nueva', x.tecnologiaNueva), txt('Perfil al cerrar', x.perfil));
    como.push(txt('Visual', x.visual), txt('Plataforma extra', x.plataforma), txt('Arquitectura', x.arquitectura));
    mercado.push(txt('Pieza matemática hecha a mano', x.pieza), txt('Referencia externa', x.referencia), txt('Quién lo valida', x.validador), txt('Se recorta primero si te pasás de horas', b.recortarPrimero?.join(' y ')));
  }
  if (b?.cert) {
    const c = b.cert;
    const x = PROY_V7.certs[id] ?? {};
    que.push(
      txt('Costo', `${c.costo ?? 'Sin verificar'}${c.costo && !c.verificado ? ' · sin verificar' : c.verificado ? ' · verificado el 15 nov 2026' : ''}`), txt('Requiere', c.requiere), txt('Preparación', x.preparacion), txt('Requisito', x.requisito), txt('Notas', c.notas),
      b.numero != null ? { etiqueta: 'En el roadmap', texto: `Certificación ${b.numero}` } : null,
    );
  }
  if (b?.mate) {
    que.push({ etiqueta: 'Libro principal', texto: b.mate.principal.join(' · ') }, txt('Habilita', b.mate.habilita.join(', ')), txt('Perfil', b.mate.perfil), txt('Contenido', PROY_V7.ventanas[id]?.contenido));
  }
  const ok = (xs: (FilaFicha | null | undefined | false | '')[]) => xs.filter(Boolean) as FilaFicha[];
  return [{ grupo: 'Qué es', filas: ok(que) }, { grupo: 'Cómo se construye', filas: ok(como) }, { grupo: 'Para el mercado', filas: ok(mercado) }].filter((g) => g.filas.length > 0);
}

/** Cuántas de las tres evidencias están marcadas. */
export const evidencias = (p?: ProyectoEstado) => EVIDENCIAS.filter(([k]) => p?.evidencia?.[k]).length;

/** El bloque anterior y el siguiente con trabajo (se saltean los descansos y colchones). */
export function vecinos(id: string): { ant?: Tramo; sig?: Tramo } {
  const i = TRAMOS.findIndex((x) => x.id === id);
  if (i < 0) return {};
  const trabajo = (x: Tramo) => x.tipo !== 'descanso' && x.tipo !== 'colchon';
  return { ant: TRAMOS.slice(0, i).reverse().find(trabajo), sig: TRAMOS.slice(i + 1).find(trabajo) };
}

/** "Proyecto 1 de 10 · petróleo", "Certificación", "Matemática". */
export function rotuloBloque(t: Tramo | undefined, b: BloqueFechado | undefined): string {
  const tipo = t?.tipo ?? b?.tipo;
  if (tipo === 'cert') return 'Certificación';
  if (tipo === 'ventana') return 'Matemática';
  if (tipo === 'ingles') return 'Inglés';
  if (tipo === 'busqueda') return 'Búsqueda de trabajo';
  if (tipo !== 'proyecto') return 'Bloque';
  // Los proyectos del plan, en orden (sin P0, que es tuyo, ni la versión 0 archivada de PetrIA).
  const numerados = PLAN_EXT.bloques.filter((x) => x.tipo === 'proyecto' && !x.archivado && x.fechas && x.id !== 'P0');
  const n = numerados.findIndex((x) => x.id === (t?.id ?? b?.id));
  const ind = t?.industria ?? b?.ficha?.rubro;
  return [n >= 0 ? `Proyecto ${n + 1} de ${numerados.length}` : b?.etapa ? `Proyecto · etapa ${b.etapa}` : 'Proyecto', ind].filter(Boolean).join(' · ');
}

/** "21 nov → 9 dic · 193,5 h". */
export const cuando = (inicio: string, fin: string, horas?: number) => `${fp(inicio)} – ${fp(fin)}${horas ? ` · ${String(horas).replace('.', ',')} h` : ''}`;

/** La primera frase de un texto largo ("A. B. C." → "A."): lo que cabe arriba; el resto va en la ficha. */
export function primeraFrase(texto: string): string {
  const t = texto.trim();
  const i = t.search(/[.!?](\s|$)/);
  return i < 0 ? t : t.slice(0, i + 1);
}

/** Un nombre largo hecho título: lo de antes del guion o los dos puntos ("Claude Certified Architect – Foundations" → "Claude Certified Architect"). */
export function tituloCorto(nombre: string): string {
  const [primero] = nombre.split(/\s[–—-]\s|:\s/);
  return primero.trim() || nombre;
}

/** "26 nov" (sin el año): la fecha cabe en un paso de la línea de versiones. */
export const diaMes = (d: string) => fp(d).replace(/ \d{4}$/, '');
/** La primera letra en mayúscula ("on-demand…" → "On-demand…"). */
export const mayuscula = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** Lo que falta para publicar, en una frase corta: "el Imán (8 puntos) y la seguridad" en vez de una lista de once renglones. */
export function faltaTexto(faltan: string[]): string {
  const iman = faltan.filter((f) => f.startsWith('Imán')).length;
  const partes = [
    iman ? `el Imán (${iman === 1 ? '1 punto' : `${iman} puntos`})` : null,
    faltan.some((f) => /seguridad/i.test(f) && !f.startsWith('Revisión')) ? 'la seguridad' : null,
    faltan.some((f) => f.startsWith('Revisión')) ? 'la revisión en primer plano' : null,
  ].filter(Boolean) as string[];
  if (!partes.length) return faltan.join(', ');
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}
