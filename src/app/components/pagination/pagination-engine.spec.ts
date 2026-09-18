import { PaginationEngine } from './pagination-engine';

describe('INTEGRITY GUARDIAN: Motor de Paginación', () => {

  // ---- ECUACIÓN 1 -------------------------------------------------------
  describe('Ecuación 1: total de páginas', () => {
    it('debe calcular las páginas exactas de los catálogos reales', () => {
      // Ciudades: 21 registros → 3 páginas. Departamentos: 11 → 2 páginas.
      expect(PaginationEngine.calculate(21, 0, 10).totalPages).toBe(3);
      expect(PaginationEngine.calculate(11, 0, 10).totalPages).toBe(2);
    });

    it('debe existir al menos una página incluso con catálogo vacío', () => {
      expect(PaginationEngine.calculate(0, 0, 10).totalPages).toBe(1);
    });

    it('un múltiplo exacto no debe generar una página vacía de más', () => {
      expect(PaginationEngine.calculate(20, 0, 10).totalPages).toBe(2);
      expect(PaginationEngine.calculate(10, 0, 10).totalPages).toBe(1);
    });
  });

  // ---- ECUACIÓN 2 -------------------------------------------------------
  describe('Ecuación 2: rango visible 1-based', () => {
    it('debe reproducir la etiqueta del pie de Ciudades', () => {
      expect(PaginationEngine.calculate(21, 0, 10).label).toBe('Muestra 1–10 de 21');
      expect(PaginationEngine.calculate(21, 1, 10).label).toBe('Muestra 11–20 de 21');
      expect(PaginationEngine.calculate(21, 2, 10).label).toBe('Muestra 21–21 de 21');
    });

    it('la última página parcial no debe exceder el total', () => {
      const info = PaginationEngine.calculate(21, 2, 10);
      expect(info.to).toBe(21);
      expect(info.to - info.from + 1).toBe(1);
    });

    it('un catálogo vacío debe dar rango 0–0, nunca 1–0', () => {
      const info = PaginationEngine.calculate(0, 0, 10);
      expect(info.from).toBe(0);
      expect(info.to).toBe(0);
      expect(info.label).toBe('Muestra 0–0 de 0');
    });

    it('debe acotar una página fuera de rango a la última válida', () => {
      const info = PaginationEngine.calculate(21, 99, 10);
      expect(info.pageIndex).toBe(2);
      expect(info.hasNext).toBeFalse();
    });

    it('debe acotar un índice negativo a la primera página', () => {
      const info = PaginationEngine.calculate(21, -5, 10);
      expect(info.pageIndex).toBe(0);
      expect(info.hasPrevious).toBeFalse();
    });
  });

  // ---- ECUACIÓN 3 -------------------------------------------------------
  describe('Ecuación 3: ventana deslizante de botones', () => {
    it('debe listar todas las páginas cuando caben', () => {
      expect(PaginationEngine.calculate(21, 0, 10, 7).pages).toEqual([0, 1, 2]);
    });

    it('debe insertar elipsis conservando primera y última como anclas', () => {
      const info = PaginationEngine.calculate(500, 25, 10, 7);
      expect(info.pages[0]).toBe(0);
      expect(info.pages[info.pages.length - 1]).toBe(info.totalPages - 1);
      expect(info.pages).toContain(-1);
      expect(info.pages).toContain(25);
    });

    it('nunca debe dibujar más botones que el máximo declarado', () => {
      for (const current of [0, 3, 25, 49]) {
        const info = PaginationEngine.calculate(500, current, 10, 7);
        expect(info.pages.length)
          .withContext(`página ${current}`)
          .toBeLessThanOrEqual(7);
      }
    });

    it('los botones deben ir en orden ascendente, sin repetir', () => {
      const pages = PaginationEngine.calculate(500, 25, 10, 7).pages.filter(page => page !== -1);
      expect([...pages].sort((a, b) => a - b)).toEqual([...pages]);
      expect(new Set(pages).size).toBe(pages.length);
    });
  });

  // ---- ROBUSTEZ ---------------------------------------------------------
  it('debe tolerar tamaños de página inválidos', () => {
    expect(PaginationEngine.calculate(21, 0, 0).totalPages).toBe(21);
    expect(PaginationEngine.calculate(21, 0, -3).totalPages).toBe(21);
  });

  it('debe ser una función pura', () => {
    expect(PaginationEngine.calculate(21, 1, 10)).toEqual(PaginationEngine.calculate(21, 1, 10));
  });
});
