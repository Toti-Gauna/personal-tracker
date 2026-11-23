import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { leerRuta } from '../lib/routes';
import { EXTRAS_V2, type ExtrasV2 } from './extras';
import { PANTALLAS_V2, type RegistroV2 } from './registro';
import { PantallaV2, entradaDe } from './Resolutor';

const A = () => <p>principal</p>;
const B = () => <p>extra b</p>;
const C = () => <p>extra c</p>;
const props = { day: { date: '2026-11-23' } as never, today: '2026-11-23', v1: <p>pantalla 1.0</p> };

describe('2.0 · varias entradas por pantalla', () => {
  const registro: RegistroV2 = { metas: { nombre: 'Plan', Componente: A, cubre: (r) => !r.param } };
  const extras: ExtrasV2 = { metas: [
    { nombre: 'B', Componente: B, cubre: (r) => r.param === 'semana' },
    { nombre: 'C', Componente: C, cubre: (r) => !!r.param?.startsWith('sem') },
  ] };

  it('gana la principal si cubre la ruta; si no, la primera extra que sí; si ninguna, la 1.0 con su marca', () => {
    expect(entradaDe(leerRuta('#/metas'), registro, extras)?.nombre).toBe('Plan');
    expect(entradaDe(leerRuta('#/metas/semana'), registro, extras)?.nombre).toBe('B'); // B va antes que C, y las dos la cubren
    expect(entradaDe(leerRuta('#/metas/semestre'), registro, extras)?.nombre).toBe('C');
    expect(entradaDe(leerRuta('#/metas/otra'), registro, extras)).toBeUndefined();
    expect(entradaDe(leerRuta('#/estudio'), registro, extras)).toBeUndefined();

    const { unmount } = render(<PantallaV2 interfaz="v2" {...props} ruta={leerRuta('#/metas/semana')} registro={registro} extras={extras} />);
    expect(screen.getByText('extra b')).toBeInTheDocument();
    unmount();
    render(<PantallaV2 interfaz="v2" {...props} ruta={leerRuta('#/metas/otra')} registro={registro} extras={extras} />);
    expect(screen.getByText('pantalla 1.0')).toBeInTheDocument();
    expect(screen.getByText('1.0', { selector: '.v2-marca' })).toBeInTheDocument();
  });

  it('una pantalla sin entrada principal puede vivir solo de sus extras', () => {
    expect(entradaDe(leerRuta('#/sonidos'), {}, { sonidos: [{ nombre: 'Sonidos', Componente: B }] })?.nombre).toBe('Sonidos');
  });
});

describe('2.0 · no queda ninguna ruta en 1.0', () => {
  // Todas las rutas de la app (las mismas que arma App.tsx), con un ejemplo de cada forma de parámetro.
  const RUTAS = [
    '#/hoy', '#/elegir/prog', '#/foco', '#/pomodoros', '#/json', '#/importar', '#/cierre',
    '#/estudio', '#/estudio/mate', '#/estudio/mate/W1', '#/estudio/mate/libro/conamat', '#/estudio/mate/libro/conamat/3',
    '#/estudio/idiomas', '#/estudio/idiomas/ingles', '#/estudio/idiomas/biblioteca', '#/estudio/prog', '#/estudio/prog/P1', '#/estudio/prog/P1/stack', '#/estudio/prog/demanda', '#/estudio/prog/algoritmos',
    '#/estudio/libro/mwm', '#/estudio/ruta', '#/estudio/ruta/matematica', '#/estudio/ruta/matematica/M1',
    '#/sesion/make-it-stick', '#/como', '#/actividad', '#/actividad/conamat', '#/test/conamat/1', '#/test/conamat/final', '#/tesis/r1', '#/unidades',
    '#/repaso', '#/flojo', '#/flojo/recall', '#/flojo/analisis', '#/flojo/examenes', '#/flojo/simulacro', '#/flojo/conamat%3A2', '#/recall/r1',
    '#/tarjetas', '#/tarjetas/math', '#/tarjeta-nueva', '#/motor', '#/motor/importar',
    '#/metas', '#/metas/ruta', '#/metas/semana', '#/metas/mes', '#/metas/bimestre', '#/metas/bimestre/2', '#/metas/anio', '#/meta-nueva/semana',
    '#/metas/mapa', '#/metas/etapas', '#/metas/calibracion', '#/metas/diferencia', '#/metas/revision', '#/metas/compras',
    '#/metas/periodos', '#/metas/periodos/P1', '#/metas/linea', '#/metas/constelacion', '#/metas/analisis', '#/metas/cert/claude-architect', '#/metas/ventana/W1',
    '#/metas/pista/secundaria', '#/metas/fondo', '#/metas/fondo/handyx', '#/metas/iman/handyx', '#/metas/roadmap', '#/metas/open-source', '#/metas/evolucion',
    '#/metas/sprint', '#/metas/impacto', '#/metas/trabajo', '#/metas/ingles', '#/metas/handyx',
    '#/metas/clipping', '#/metas/clipping/registro', '#/metas/clipping/campanas', '#/metas/clipping/cuentas', '#/metas/clipping/retainers', '#/metas/clipping/metricas',
    '#/metas/clipping/plan', '#/metas/clipping/nichos', '#/metas/clipping/riesgos', '#/metas/clipping/semana1',
    '#/metas/proyecto', '#/metas/proyecto/P0', '#/metas/proyecto/P1',
    '#/entreno', '#/entreno-semana', '#/entreno-rutina/push-a', '#/entreno-rutina/nueva', '#/entreno-sesion/push-a', '#/entreno-resumen/x', '#/entreno-peso', '#/entreno-motor',
    '#/avance', '#/avance/presentacion', '#/perfil', '#/logro/siete',
    '#/ajustes', '#/ajustes/plan', '#/ajustes/bimestres', '#/ajustes-rutinas', '#/ajustes-rutinas/nueva', '#/ajustes-rutinas/hoy', '#/ajustes-companera', '#/ajustes-datos', '#/sonidos', '#/v2',
  ];

  it('cada ruta de la app tiene su pantalla 2.0', () => {
    const sin = RUTAS.filter((h) => !entradaDe(leerRuta(h), PANTALLAS_V2, EXTRAS_V2));
    expect(sin).toEqual([]);
  });

  it('las pantallas de adentro de otra (las extras) no se nombran aparte en Ajustes, salvo las que son un área', () => {
    const nombradas = [...Object.values(PANTALLAS_V2), ...Object.values(EXTRAS_V2).flat()].filter((e) => !e!.taller && !e!.parte).map((e) => e!.nombre);
    expect(nombradas.length).toBe(new Set(nombradas).size); // ningún nombre repetido en la lista
  });
});
