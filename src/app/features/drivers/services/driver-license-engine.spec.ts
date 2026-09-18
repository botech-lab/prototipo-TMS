import { DRIVER_LICENSE_RULES } from '@core';
import { Driver } from '../models/driver.model';
import { DriverLicenseEngine } from './driver-license-engine';

function buildDriver(overrides: Partial<Driver> = {}): Driver {
  return {
    id: 'drv-test',
    fullName: 'Conductor Prueba',
    documentType: 'CI',
    documentNumber: '1000000',
    licenseCategoryId: 'cat-a',
    licenseCategoryLabel: 'Categoría A',
    licenseNumber: '123456',
    licenseIssued: '2022-06-19',
    licenseExpiry: '2027-06-19',
    status: 'ACTIVO',
    ...overrides
  };
}

/** Fecha de referencia fija: el motor es determinista, nunca lee el reloj. */
const TODAY = new Date(2026, 8, 9); // 9 de septiembre de 2026

describe('INTEGRITY GUARDIAN: Motor Temporal de Vigencia de Licencia', () => {
  const { THRESHOLDS, GRID } = DRIVER_LICENSE_RULES;

  it('las reglas de licencia deben ser inmutables', () => {
    expect(Object.isFrozen(DRIVER_LICENSE_RULES)).toBeTrue();
    expect(() => {
      (DRIVER_LICENSE_RULES.THRESHOLDS as any).CRITICAL_DAYS = 1;
    }).toThrow();
  });

  // ---- ECUACIÓN 1 -------------------------------------------------------
  describe('Ecuación 1: días restantes normalizados a medianoche UTC', () => {
    it('debe calcular los días exactos hasta el vencimiento', () => {
      expect(DriverLicenseEngine.calculate(
        buildDriver({ licenseExpiry: '2026-09-19' }), TODAY
      ).daysLeft).toBe(10);
    });

    it('el resultado NO debe depender de la hora del día', () => {
      const driver = buildDriver({ licenseExpiry: '2027-06-19' });
      const morning = DriverLicenseEngine.calculate(driver, new Date(2026, 8, 9, 0, 1));
      const night = DriverLicenseEngine.calculate(driver, new Date(2026, 8, 9, 23, 59));
      expect(morning.daysLeft).toBe(night.daysLeft);
    });

    it('debe devolver días negativos en una licencia vencida', () => {
      expect(DriverLicenseEngine.calculate(
        buildDriver({ licenseExpiry: '2026-08-30' }), TODAY
      ).daysLeft).toBe(-10);
    });
  });

  // ---- ECUACIÓN 2 -------------------------------------------------------
  describe('Ecuación 2: estado por umbrales escalonados', () => {
    it('debe clasificar cada tramo correctamente', () => {
      const cases = [
        { expiry: '2026-08-01', state: 'VENCIDA' },
        { expiry: '2026-09-09', state: 'CRITICA' },    // vence hoy
        { expiry: '2026-10-09', state: 'CRITICA' },    // 30 días exactos
        { expiry: '2026-10-10', state: 'POR_VENCER' }, // 31 días
        { expiry: '2026-12-08', state: 'POR_VENCER' }, // 90 días exactos
        { expiry: '2026-12-09', state: 'VIGENTE' },    // 91 días
        { expiry: '2027-06-19', state: 'VIGENTE' }
      ];

      for (const testCase of cases) {
        const output = DriverLicenseEngine.calculate(
          buildDriver({ licenseExpiry: testCase.expiry }), TODAY
        );
        expect(output.state)
          .withContext(`vencimiento ${testCase.expiry} (${output.daysLeft} días)`)
          .toBe(testCase.state as never);
      }
    });

    it('debe respetar los umbrales declarados en las reglas', () => {
      expect(THRESHOLDS.CRITICAL_DAYS).toBe(30);
      expect(THRESHOLDS.EXPIRING_SOON_DAYS).toBe(90);
    });

    it('el tono debe derivarse del estado, nunca elegirse a mano', () => {
      expect(DriverLicenseEngine.calculate(buildDriver({ licenseExpiry: '2027-06-19' }), TODAY).tone)
        .toBe('success');
      expect(DriverLicenseEngine.calculate(buildDriver({ licenseExpiry: '2026-11-01' }), TODAY).tone)
        .toBe('warning');
      expect(DriverLicenseEngine.calculate(buildDriver({ licenseExpiry: '2026-09-20' }), TODAY).tone)
        .toBe('danger');
      expect(DriverLicenseEngine.calculate(buildDriver({ licenseExpiry: '2020-01-01' }), TODAY).tone)
        .toBe('neutral');
    });
  });

  // ---- PROPORCIÓN CONSUMIDA ---------------------------------------------
  describe('Proporción consumida de vigencia', () => {
    it('debe acotarse a [0, 1] incluso fuera del período', () => {
      expect(DriverLicenseEngine.calculate(
        buildDriver({ licenseIssued: '2010-01-01', licenseExpiry: '2015-01-01' }), TODAY
      ).elapsedRatio).toBe(1);

      expect(DriverLicenseEngine.calculate(
        buildDriver({ licenseIssued: '2030-01-01', licenseExpiry: '2035-01-01' }), TODAY
      ).elapsedRatio).toBe(0);
    });

    it('debe dar 0.5 justo a mitad del período', () => {
      const output = DriverLicenseEngine.calculate(
        buildDriver({ licenseIssued: '2026-01-01', licenseExpiry: '2027-01-01' }),
        new Date(2026, 6, 2)
      );
      expect(output.elapsedRatio).toBeCloseTo(0.5, 1);
    });

    it('debe derivar la emisión cuando el registro no la trae', () => {
      const output = DriverLicenseEngine.calculate(
        buildDriver({ licenseIssued: undefined, licenseExpiry: '2027-06-19' }), TODAY
      );
      // 2027 − DEFAULT_TERM_YEARS (5) = 2022
      expect(output.issuedDate).toBe('19/06/2022');
    });
  });

  // ---- ECUACIÓN 3 -------------------------------------------------------
  describe('Ecuación 3: el tiempo como retícula', () => {
    it('debe producir una celda por MES real de vigencia', () => {
      const output = DriverLicenseEngine.calculate(
        buildDriver({ licenseIssued: '2022-06-19', licenseExpiry: '2027-06-19' }), TODAY
      );
      expect(output.totalMonths).toBe(60);
      expect(output.months.length).toBe(60);
      expect(output.rows).toBe(5);
    });

    it('un período más corto debe producir menos celdas y menos filas', () => {
      const output = DriverLicenseEngine.calculate(
        buildDriver({ licenseIssued: '2026-01-01', licenseExpiry: '2027-01-01' }), TODAY
      );
      expect(output.totalMonths).toBe(12);
      expect(output.rows).toBe(1);
    });

    it('las filas deben derivarse de los meses y las 12 columnas fijas', () => {
      const output = DriverLicenseEngine.calculate(buildDriver(), TODAY);
      expect(output.rows).toBe(Math.ceil(output.totalMonths / GRID.COLUMNS));
    });

    it('debe respetar el tope de filas dibujables', () => {
      const output = DriverLicenseEngine.calculate(
        buildDriver({ licenseIssued: '2000-01-01', licenseExpiry: '2099-01-01' }), TODAY
      );
      expect(output.rows).toBeLessThanOrEqual(GRID.MAX_ROWS);
      expect(output.totalMonths).toBeLessThanOrEqual(GRID.COLUMNS * GRID.MAX_ROWS);
    });

    it('los índices deben ser consecutivos y sin huecos', () => {
      const output = DriverLicenseEngine.calculate(buildDriver(), TODAY);
      expect(output.months.map(month => month.index))
        .toEqual(Array.from({ length: output.totalMonths }, (_, index) => index));
    });

    it('cada mes debe estar en exactamente uno de los tres estados', () => {
      const output = DriverLicenseEngine.calculate(buildDriver(), TODAY);
      const consumed = output.months.filter(m => m.state === 'consumed').length;
      const warning = output.months.filter(m => m.state === 'warning').length;
      const remaining = output.months.filter(m => m.state === 'remaining').length;
      expect(consumed + warning + remaining).toBe(output.totalMonths);
    });

    it('los meses consumidos deben corresponder a la proporción transcurrida', () => {
      const output = DriverLicenseEngine.calculate(buildDriver(), TODAY);
      expect(output.consumedMonths).toBe(Math.round(output.elapsedRatio * output.totalMonths));
      expect(output.months.filter(month => month.state === 'consumed').length)
        .toBe(output.consumedMonths);
    });

    it('una licencia vencida debe tener TODOS sus meses consumidos', () => {
      const output = DriverLicenseEngine.calculate(
        buildDriver({ licenseIssued: '2010-01-01', licenseExpiry: '2015-01-01' }), TODAY
      );
      expect(output.consumedMonths).toBe(output.totalMonths);
      expect(output.months.every(month => month.state === 'consumed')).toBeTrue();
    });

    it('debe marcar la ventana de renovación en los meses finales', () => {
      const output = DriverLicenseEngine.calculate(buildDriver(), TODAY);
      const warning = output.months.filter(month => month.state === 'warning');
      expect(warning.length).toBeGreaterThan(0);
      expect(warning.length).toBeLessThanOrEqual(4);
      expect(warning[warning.length - 1].index).toBe(output.totalMonths - 1);
    });
  });

  // ---- ROBUSTEZ ---------------------------------------------------------
  it('debe producir una retícula coherente en escenarios extremos', () => {
    const scenarios = [
      { licenseIssued: '2022-06-19', licenseExpiry: '2027-06-19' },
      { licenseIssued: '2026-01-01', licenseExpiry: '2027-01-01' },
      { licenseIssued: '2000-01-01', licenseExpiry: '2099-01-01' },
      { licenseIssued: '2026-08-01', licenseExpiry: '2026-09-01' },
      { licenseIssued: undefined, licenseExpiry: '1990-01-01' }
    ];

    for (const scenario of scenarios) {
      const output = DriverLicenseEngine.calculate(buildDriver(scenario), TODAY);
      const context = `${scenario.licenseIssued} → ${scenario.licenseExpiry}`;

      expect(output.totalMonths).withContext(context).toBeGreaterThan(0);
      expect(output.months.length).withContext(context).toBe(output.totalMonths);
      expect(output.rows).withContext(context).toBeLessThanOrEqual(GRID.MAX_ROWS);
      expect(output.consumedMonths).withContext(context).toBeGreaterThanOrEqual(0);
      expect(output.consumedMonths).withContext(context).toBeLessThanOrEqual(output.totalMonths);
    }
  });

  // ---- LEYENDA ----------------------------------------------------------
  describe('Leyenda legible', () => {
    it('debe usar singular y plural correctamente', () => {
      expect(DriverLicenseEngine.calculate(buildDriver({ licenseExpiry: '2026-09-10' }), TODAY).caption)
        .toBe('Falta 1 día');
      expect(DriverLicenseEngine.calculate(buildDriver({ licenseExpiry: '2026-09-19' }), TODAY).caption)
        .toBe('Faltan 10 días');
      expect(DriverLicenseEngine.calculate(buildDriver({ licenseExpiry: '2026-09-09' }), TODAY).caption)
        .toBe('Vence hoy');
      expect(DriverLicenseEngine.calculate(buildDriver({ licenseExpiry: '2026-09-08' }), TODAY).caption)
        .toBe('Venció hace 1 día');
    });

    it('la cifra grande debe mostrar siempre un valor absoluto', () => {
      const expired = DriverLicenseEngine.calculate(
        buildDriver({ licenseExpiry: '2026-08-30' }), TODAY
      );
      expect(expired.counterValue).toBe('10');
      expect(expired.counterCaption).toBe('DÍAS VENCIDA');
    });
  });

  // ---- PUREZA -----------------------------------------------------------
  it('debe ser una función pura y determinista', () => {
    const driver = buildDriver();
    expect(DriverLicenseEngine.calculate(driver, TODAY))
      .toEqual(DriverLicenseEngine.calculate(driver, TODAY));
  });

  it('debe tolerar la ausencia de conductor', () => {
    const output = DriverLicenseEngine.calculate(null, TODAY);
    expect(output.months).toEqual([]);
    expect(output.caption).toBe('Sin licencia registrada');
  });
});
