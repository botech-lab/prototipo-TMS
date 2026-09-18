import { CARD_BLOCK_RULES } from './card-block-rules';
import { DATA_TABLE_DIMENSIONS } from './data-table-rules';
import { SEAT_LAYOUT_RULES } from './seat-layout-rules';
import { DRIVER_LICENSE_RULES } from './driver-license-rules';
import { ENTITY_CARD_DIMENSIONS } from './entity-card-rules';
import { USER_PRIVILEGE_RULES } from './user-privilege-rules';
import { VEHICLE_CAPACITY_RULES } from './vehicle-capacity-rules';

/**
 * Auditoría de las reglas de oro introducidas para los módulos de catálogo.
 * Deliberadamente SEPARADA de `golden-rules-integrity.spec.ts`, que custodia
 * ruta maestra y no debe tocarse.
 */
describe('INTEGRITY GUARDIAN: Reglas de Oro del Sistema de Catálogos', () => {

  // 1. Inmutabilidad en tiempo de ejecución
  it('todos los conjuntos de reglas deben ser inmutables', () => {
    expect(Object.isFrozen(ENTITY_CARD_DIMENSIONS)).toBeTrue();
    expect(Object.isFrozen(DATA_TABLE_DIMENSIONS)).toBeTrue();
    expect(Object.isFrozen(VEHICLE_CAPACITY_RULES)).toBeTrue();
    expect(Object.isFrozen(DRIVER_LICENSE_RULES)).toBeTrue();
    expect(Object.isFrozen(USER_PRIVILEGE_RULES)).toBeTrue();
  });

  it('el congelado debe ser PROFUNDO en las reglas de motor', () => {
    expect(Object.isFrozen(VEHICLE_CAPACITY_RULES.DECKS)).toBeTrue();
    expect(Object.isFrozen(DRIVER_LICENSE_RULES.THRESHOLDS)).toBeTrue();
    expect(Object.isFrozen(USER_PRIVILEGE_RULES.ROLE_WEIGHTS)).toBeTrue();
    expect(Object.isFrozen(CARD_BLOCK_RULES.MATRIX)).toBeTrue();
    expect(Object.isFrozen(SEAT_LAYOUT_RULES.GRID)).toBeTrue();
    expect(Object.isFrozen(SEAT_LAYOUT_RULES.SEAT_APPEARANCE)).toBeTrue();
  });

  it('el diseñador de plazas debe respetar el objetivo táctil de Apple HIG', () => {
    expect(SEAT_LAYOUT_RULES.CELL.MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(44);
    // A zoom mínimo en escritorio la celda puede ser menor, pero nunca el
    // tamaño base: el móvil parte de él.
    expect(SEAT_LAYOUT_RULES.CELL.BASE_SIZE).toBeGreaterThanOrEqual(SEAT_LAYOUT_RULES.CELL.MIN_TOUCH_TARGET);
  });

  it('las disposiciones del diseñador deben coincidir con las del mapa de plazas', () => {
    // Un plano diseñado con 2+2 debe coincidir con lo que la tarjeta de flota
    // dibuja como 2+pasillo+2: misma fuente de verdad.
    expect(SEAT_LAYOUT_RULES.GRID.SEATS_ACROSS_NORMAL).toBe(VEHICLE_CAPACITY_RULES.DECKS.SEATS_ACROSS_NORMAL);
    expect(SEAT_LAYOUT_RULES.GRID.SEATS_ACROSS_DENSE).toBe(VEHICLE_CAPACITY_RULES.DECKS.SEATS_ACROSS_DENSE);
    expect(SEAT_LAYOUT_RULES.GRID.DENSE_THRESHOLD).toBe(VEHICLE_CAPACITY_RULES.DECKS.DENSE_THRESHOLD);
  });

  // 2. Escalones de ancho: sustituyen al escalado del lienzo
  it('los umbrales de ancho deben estar ordenados y ser positivos', () => {
    const { NARROW_MAX, MEDIUM_MAX } = CARD_BLOCK_RULES.WIDTH_TIERS;
    expect(NARROW_MAX).toBeGreaterThan(0);
    expect(NARROW_MAX).toBeLessThan(MEDIUM_MAX);
  });

  it('la métrica de celda de matriz debe ser coherente', () => {
    const { MIN_CELL_HEIGHT, MAX_CELL_HEIGHT, TILE_MIN_HEIGHT, MIN_COLUMNS, MAX_COLUMNS } =
      CARD_BLOCK_RULES.MATRIX;
    expect(MIN_CELL_HEIGHT).toBeLessThan(MAX_CELL_HEIGHT);
    // Una celda con rótulo necesita más alto que una muda.
    expect(TILE_MIN_HEIGHT).toBeGreaterThan(MIN_CELL_HEIGHT);
    expect(MIN_COLUMNS).toBeLessThan(MAX_COLUMNS);
  });

  it('el escalonado del movimiento debe tener tope', () => {
    const { STAGGER_MS, MAX_STAGGER_STEPS, EXPAND_MS } = CARD_BLOCK_RULES.MOTION;
    expect(MAX_STAGGER_STEPS).toBeGreaterThan(0);
    // El escalonado completo no debe durar más que el despliegue del marco.
    expect(STAGGER_MS * MAX_STAGGER_STEPS).toBeLessThanOrEqual(EXPAND_MS);
  });

  // 3. Invariantes estructurales de la tarjeta
  it('los invariantes del marco deben coincidir con los de ruta maestra', () => {
    // Header y footer se heredan tal cual de ROUTE_CARD_DIMENSIONS.
    expect(ENTITY_CARD_DIMENSIONS.HEADER_HEIGHT).toBe(76);
    expect(ENTITY_CARD_DIMENSIONS.FOOTER_HEIGHT).toBe(48);
  });

  it('los escalones de cuerpo deben ser estrictamente crecientes', () => {
    expect(ENTITY_CARD_DIMENSIONS.BODY_COMPACT)
      .toBeLessThan(ENTITY_CARD_DIMENSIONS.BODY_NORMAL);
    expect(ENTITY_CARD_DIMENSIONS.BODY_NORMAL)
      .toBeLessThan(ENTITY_CARD_DIMENSIONS.BODY_DENSE);
  });

  it('cada escalón debe absorber sin scroll las filas de su umbral', () => {
    const D = ENTITY_CARD_DIMENSIONS;
    const capacity = (body: number) =>
      Math.floor((body - D.DETAIL_TITLE_HEIGHT) / D.DETAIL_ROW_HEIGHT);

    expect(capacity(D.BODY_COMPACT)).toBeGreaterThanOrEqual(D.TIER_COMPACT_MAX_ROWS);
    expect(capacity(D.BODY_NORMAL)).toBeGreaterThanOrEqual(D.TIER_NORMAL_MAX_ROWS);
    expect(capacity(D.BODY_DENSE)).toBeGreaterThan(D.TIER_NORMAL_MAX_ROWS);
  });

  // 4. Alturas de la tabla
  it('las alturas de la tabla no deben haber sido alteradas', () => {
    expect(DATA_TABLE_DIMENSIONS.headHeight).toBe(44);
    expect(DATA_TABLE_DIMENSIONS.rowHeight).toBe(64);
  });

  // 5. Coherencia semántica de los motores
  it('los umbrales de licencia deben estar ordenados y ser positivos', () => {
    const { CRITICAL_DAYS, EXPIRING_SOON_DAYS, DEFAULT_TERM_YEARS } =
      DRIVER_LICENSE_RULES.THRESHOLDS;
    expect(CRITICAL_DAYS).toBeGreaterThan(0);
    expect(CRITICAL_DAYS).toBeLessThan(EXPIRING_SOON_DAYS);
    expect(DEFAULT_TERM_YEARS).toBeGreaterThan(0);
  });

  it('ADMIN debe ser el rol de mayor peso y coincidir con el nivel máximo', () => {
    const weights = Object.values(USER_PRIVILEGE_RULES.ROLE_WEIGHTS);
    expect<number>(USER_PRIVILEGE_RULES.ROLE_WEIGHTS.ADMIN).toBe(Math.max(...weights));
    expect<number>(USER_PRIVILEGE_RULES.ROLE_WEIGHTS.ADMIN).toBe(USER_PRIVILEGE_RULES.LEVELS.MAX);
  });

  it('debe existir un rótulo y un tono por cada nivel posible, de 0 a MAX', () => {
    const { LEVELS } = USER_PRIVILEGE_RULES;
    // `as const` vuelve literales las longitudes; se ensanchan a number
    // para poder compararlas contra el nivel máximo declarado.
    expect<number>(LEVELS.LABELS.length).toBe(LEVELS.MAX + 1);
    expect<number>(LEVELS.TONES.length).toBe(LEVELS.MAX + 1);
  });

  it('el universo de roles debe estar completo y ordenado por peso', () => {
    const { SYSTEM_ROLES, ROLE_WEIGHTS } = USER_PRIVILEGE_RULES;
    // Toda clave de peso debe existir en el universo dibujable, y viceversa.
    expect<number>(SYSTEM_ROLES.length).toBe(Object.keys(ROLE_WEIGHTS).length);
    for (const role of SYSTEM_ROLES) {
      expect(ROLE_WEIGHTS[role as keyof typeof ROLE_WEIGHTS]).toBeDefined();
    }
  });

  it('las columnas de las retículas deben ser positivas', () => {
    expect(USER_PRIVILEGE_RULES.MATRIX.COLUMNS).toBeGreaterThan(0);
    expect(DRIVER_LICENSE_RULES.GRID.COLUMNS).toBe(12);
  });

  it('la referencia de carga debe ser positiva para no dividir por cero', () => {
    expect(VEHICLE_CAPACITY_RULES.CARGO.REFERENCE_MAX_KG).toBeGreaterThan(0);
  });

  it('el tope de pisos dibujables debe evitar columnas huérfanas', () => {
    expect(VEHICLE_CAPACITY_RULES.DECKS.MAX_RENDERED).toBeGreaterThanOrEqual(2);
  });

  it('la disposición densa debe tener más butacas por fila que la normal', () => {
    expect(VEHICLE_CAPACITY_RULES.DECKS.SEATS_ACROSS_DENSE)
      .toBeGreaterThan(VEHICLE_CAPACITY_RULES.DECKS.SEATS_ACROSS_NORMAL);
  });

  it('ambas disposiciones deben ser pares, para admitir pasillo central', () => {
    expect(VEHICLE_CAPACITY_RULES.DECKS.SEATS_ACROSS_NORMAL % 2).toBe(0);
    expect(VEHICLE_CAPACITY_RULES.DECKS.SEATS_ACROSS_DENSE % 2).toBe(0);
  });
});
