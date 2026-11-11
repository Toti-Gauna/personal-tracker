import { describe, expect, it } from 'vitest';
import { compareAnswer } from './compare';

describe('active recall', () => {
  it('marca lo que faltó y sugiere Difícil', () => {
    const c = compareAnswer('El número más grande que divide a los dos.', 'El número más grande que divide a los dos sin dejar resto.');
    expect(c.missing).toEqual(['sin dejar resto']);
    expect(c.suggested).toBe(2);
  });

  it('todo bien sugiere Bien; vacío sugiere Otra vez', () => {
    expect(compareAnswer('se restan los valores absolutos y queda el signo del mayor', 'Se restan los valores absolutos y queda el signo del mayor.').suggested).toBe(3);
    expect(compareAnswer('', 'Da positivo.').suggested).toBe(1);
  });
});
