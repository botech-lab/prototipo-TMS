import { ENTITY_CARD_DIMENSIONS } from '@core';
import { EntityCardEngine } from './entity-card-engine';

describe('INTEGRITY GUARDIAN: Motor de Geometría de Tarjeta', () => {
  const D = ENTITY_CARD_DIMENSIONS;

  it('las dimensiones de tarjeta deben ser inmutables', () => {
    expect(Object.isFrozen(ENTITY_CARD_DIMENSIONS)).toBeTrue();
    expect(() => {
      (ENTITY_CARD_DIMENSIONS as any).HEADER_HEIGHT = 99;
    }).toThrow();
  });

  // ---- ECUACIÓN 1 -------------------------------------------------------
  describe('Ecuación 1: escalón por densidad', () => {
    it('debe elegir el escalón correcto según las filas declaradas', () => {
      expect(EntityCardEngine.calculate(0).tier).toBe('compact');
      expect(EntityCardEngine.calculate(3).tier).toBe('compact');
      expect(EntityCardEngine.calculate(4).tier).toBe('normal');
      expect(EntityCardEngine.calculate(5).tier).toBe('normal');
      expect(EntityCardEngine.calculate(6).tier).toBe('dense');
      expect(EntityCardEngine.calculate(20).tier).toBe('dense');
    });

    it('cada escalón debe usar la altura de cuerpo declarada en las reglas', () => {
      expect(EntityCardEngine.calculate(3).bodyHeight).toBe(D.BODY_COMPACT);
      expect(EntityCardEngine.calculate(5).bodyHeight).toBe(D.BODY_NORMAL);
      expect(EntityCardEngine.calculate(7).bodyHeight).toBe(D.BODY_DENSE);
    });
  });

  // ---- ECUACIÓN 2: LA REGLA DE ORO --------------------------------------
  describe('Ecuación 2: identidad aritmética de altura', () => {
    it('la altura expandida debe cumplir la identidad EXACTA en los 3 escalones', () => {
      for (const rows of [3, 5, 8]) {
        const geometry = EntityCardEngine.calculate(rows);
        const expected =
          D.PADDING_Y * 2 +
          D.HEADER_HEIGHT +
          D.GAP_TOP +
          geometry.bodyHeight +
          D.GAP_BOTTOM +
          D.FOOTER_HEIGHT;

        expect(geometry.expandedHeight)
          .withContext(`${rows} filas (escalón ${geometry.tier})`)
          .toBe(expected);
      }
    });

    it('la altura colapsada debe ser marco puro, sin cuerpo', () => {
      const geometry = EntityCardEngine.calculate(5);
      expect(geometry.collapsedHeight)
        .toBe(D.PADDING_Y * 2 + D.HEADER_HEIGHT + D.FOOTER_HEIGHT);
      expect(geometry.collapsedHeight).toBe(164);
    });

    it('la altura colapsada debe ser IDÉNTICA en todos los escalones', () => {
      // Es el invariante que alinea el reposo de cualquier módulo del sistema.
      const heights = [0, 3, 5, 8, 20].map(
        rows => EntityCardEngine.calculate(rows).collapsedHeight
      );
      expect(new Set(heights).size).toBe(1);
    });

    it('los INVARIANTES del marco no deben haber sido alterados', () => {
      expect(D.HEADER_HEIGHT).toBe(76);
      expect(D.FOOTER_HEIGHT).toBe(48);
      expect(D.PADDING_Y).toBe(20);
      expect(D.GAP_TOP).toBe(12);
      expect(D.GAP_BOTTOM).toBe(12);
    });

    it('un cuerpo más denso debe producir una tarjeta estrictamente más alta', () => {
      const compact = EntityCardEngine.calculate(3).expandedHeight;
      const normal = EntityCardEngine.calculate(5).expandedHeight;
      const dense = EntityCardEngine.calculate(8).expandedHeight;
      expect(compact).toBeLessThan(normal);
      expect(normal).toBeLessThan(dense);
    });
  });

  // ---- ECUACIÓN 3 -------------------------------------------------------
  describe('Ecuación 3: capacidad sin scroll', () => {
    it('cada escalón debe absorber sin scroll las filas de su propio umbral', () => {
      expect(EntityCardEngine.calculate(D.TIER_COMPACT_MAX_ROWS).isScrollable).toBeFalse();
      expect(EntityCardEngine.calculate(D.TIER_NORMAL_MAX_ROWS).isScrollable).toBeFalse();
      expect(EntityCardEngine.calculate(7).isScrollable).toBeFalse();
    });

    it('debe activar scroll en vez de crecer cuando se desborda', () => {
      const geometry = EntityCardEngine.calculate(12);
      expect(geometry.isScrollable).toBeTrue();
      // La clave: desbordarse NO aumenta la altura del marco.
      expect(geometry.bodyHeight).toBe(D.BODY_DENSE);
      expect(geometry.expandedHeight).toBe(EntityCardEngine.calculate(8).expandedHeight);
    });

    it('la capacidad debe derivarse de la métrica de fila, no escribirse a mano', () => {
      for (const rows of [3, 5, 8]) {
        const geometry = EntityCardEngine.calculate(rows);
        expect(geometry.rowsWithoutScroll).toBe(
          Math.floor((geometry.bodyHeight - D.DETAIL_TITLE_HEIGHT) / D.DETAIL_ROW_HEIGHT)
        );
      }
    });
  });

  // ---- ROBUSTEZ ---------------------------------------------------------
  it('debe tolerar entradas inválidas sin romper la geometría', () => {
    for (const rows of [-5, 0, 2.7]) {
      const geometry = EntityCardEngine.calculate(rows);
      expect(geometry.expandedHeight).toBeGreaterThan(geometry.collapsedHeight);
      expect(geometry.bodyHeight).toBeGreaterThan(0);
    }
  });

  it('debe ser una función pura', () => {
    expect(EntityCardEngine.calculate(5)).toEqual(EntityCardEngine.calculate(5));
  });
});
