import { DRIVER_LICENSE_RULES } from '@core';
import { ChipTone } from '@models';
import { Driver } from '../models/driver.model';

/** Estado de la habilitación derivado exclusivamente de los días restantes. */
export type LicenseState = 'VIGENTE' | 'POR_VENCER' | 'CRITICA' | 'VENCIDA';

/** Situación de un mes concreto dentro del período de vigencia. */
export type MonthState = 'consumed' | 'warning' | 'remaining';

/** Una celda de la retícula: un mes real de la licencia. */
export interface MonthCell {
  /** Índice 0-based desde la emisión. */
  readonly index: number;
  readonly state: MonthState;
}

export interface LicenseEngineOutput {
  readonly state: LicenseState;
  readonly stateLabel: string;
  readonly tone: ChipTone;
  /** Negativo si la licencia ya venció. */
  readonly daysLeft: number;
  /** Proporción consumida de la vigencia, acotada a [0, 1]. */
  readonly elapsedRatio: number;
  readonly issuedDate: string;
  readonly expiryDate: string;
  readonly caption: string;
  /** Cifra grande: días restantes, o los vencidos en valor absoluto. */
  readonly counterValue: string;
  readonly counterCaption: string;
  readonly months: readonly MonthCell[];
  readonly totalMonths: number;
  readonly consumedMonths: number;
  readonly rows: number;
}

/** Convierte `AAAA-MM-DD` a un instante UTC de medianoche. */
function toUtcMidnight(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1);
}

/** Formatea `AAAA-MM-DD` al formato boliviano `DD/MM/AAAA`. */
export function formatBolivianDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

const MS_PER_DAY = 86_400_000;

/**
 * ============================================================================
 * MOTOR TEMPORAL PURO DE VIGENCIA (`DriverLicenseEngine`)
 * ============================================================================
 * Hermano de `VehicleCapacityEngine` sobre el eje TIEMPO. La fecha de
 * referencia se INYECTA como parámetro -nunca se lee `Date.now()` dentro-
 * para que el motor sea determinista y auditable.
 *
 * LAS 5 ECUACIONES:
 *
 * 1. DÍAS RESTANTES NORMALIZADOS A MEDIANOCHE UTC
 *    daysLeft = (vencimiento − hoy) / 86.400.000
 *    Ambos extremos se llevan a medianoche UTC antes de restar: el resultado
 *    no depende de la hora del día ni del huso horario.
 *
 * 2. ESTADO POR UMBRALES ESCALONADOS
 *    < 0 → VENCIDA · ≤ 30 → CRÍTICA · ≤ 90 → POR VENCER · resto → VIGENTE
 *    El tono del chip se DERIVA de aquí; no se elige a mano en ningún sitio.
 *
 * 3. EL TIEMPO COMO RETÍCULA (el dato es la geometría)
 *    meses = ⌈(vencimiento − emisión) / 30,44⌉      filas = ⌈meses / 12⌉
 *    Cada mes de vida de la licencia es una celda. 12 columnas fijas mantienen
 *    las columnas alineadas aunque la última fila quede incompleta. El DÓNDE
 *    de cada celda lo resuelve CSS Grid a partir del ancho real.
 *
 * 4. LLENADO EXACTO DE LA REGIÓN (sin aire muerto)
 *    anchoCelda = (anchoÚtil − 11·GAP) / 12
 *    altoCelda  = (altoRegión − (filas−1)·GAP) / filas
 *    La retícula consume el espacio disponible completo.
 *
 * 5. CONTENCIÓN ESTRICTA DEL LIENZO
 *    0 ≤ x  y  x + ancho ≤ WIDTH − MARGIN_X ; ídem en vertical.
 * ============================================================================
 */
export class DriverLicenseEngine {
  static calculate(driver: Driver | null, referenceDate: Date = new Date()): LicenseEngineOutput {
    const { THRESHOLDS, GRID, STATES } = DRIVER_LICENSE_RULES;

    if (!driver) {
      return {
        state: 'VENCIDA',
        stateLabel: STATES.VENCIDA.label,
        tone: STATES.VENCIDA.tone,
        daysLeft: 0,
        elapsedRatio: 0,
        issuedDate: '',
        expiryDate: '',
        caption: 'Sin licencia registrada',
        counterValue: '—',
        counterCaption: 'SIN LICENCIA',
        months: [],
        totalMonths: 0,
        consumedMonths: 0,
        rows: 0
      };
    }

    // ---- Ecuación 1: días restantes normalizados -----------------------
    const expiryMs = toUtcMidnight(driver.licenseExpiry);
    const todayMs = Date.UTC(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate()
    );
    const daysLeft = Math.round((expiryMs - todayMs) / MS_PER_DAY);

    // ---- Ecuación 2: estado por umbrales -------------------------------
    const state: LicenseState =
      daysLeft < 0
        ? 'VENCIDA'
        : daysLeft <= THRESHOLDS.CRITICAL_DAYS
          ? 'CRITICA'
          : daysLeft <= THRESHOLDS.EXPIRING_SOON_DAYS
            ? 'POR_VENCER'
            : 'VIGENTE';

    const stateRule = STATES[state];

    // ---- Proporción consumida ------------------------------------------
    const issuedIso = driver.licenseIssued ?? this.deriveIssuedDate(driver.licenseExpiry);
    const issuedMs = toUtcMidnight(issuedIso);
    const termMs = Math.max(MS_PER_DAY, expiryMs - issuedMs);
    const elapsedRatio = Math.min(1, Math.max(0, (todayMs - issuedMs) / termMs));

    // ---- Ecuación 3: el tiempo como retícula ---------------------------
    const termDays = termMs / MS_PER_DAY;
    const rawMonths = Math.max(1, Math.ceil(termDays / GRID.DAYS_PER_MONTH));
    const totalMonths = Math.min(rawMonths, GRID.COLUMNS * GRID.MAX_ROWS);
    const rows = Math.ceil(totalMonths / GRID.COLUMNS);

    const consumedMonths = Math.min(
      totalMonths,
      Math.max(0, Math.round(elapsedRatio * totalMonths))
    );

    // Índice a partir del cual empieza la ventana de renovación.
    const warningMonths = Math.ceil(THRESHOLDS.EXPIRING_SOON_DAYS / GRID.DAYS_PER_MONTH);
    const warningStart = Math.max(0, totalMonths - warningMonths);

    const months: MonthCell[] = [];
    for (let index = 0; index < totalMonths; index++) {
      months.push({
        index,
        state:
          index < consumedMonths
            ? 'consumed'
            : index >= warningStart
              ? 'warning'
              : 'remaining'
      });
    }

    return {
      state,
      stateLabel: stateRule.label,
      tone: stateRule.tone,
      daysLeft,
      elapsedRatio,
      issuedDate: formatBolivianDate(issuedIso),
      expiryDate: formatBolivianDate(driver.licenseExpiry),
      caption: this.buildCaption(daysLeft),
      counterValue: `${Math.abs(daysLeft)}`,
      counterCaption: daysLeft < 0 ? 'DÍAS VENCIDA' : 'DÍAS RESTANTES',
      months,
      totalMonths,
      consumedMonths,
      rows
    };
  }

  /** Respaldo: emisión = vencimiento − término estándar. */
  private static deriveIssuedDate(expiryIso: string): string {
    const [year, month, day] = expiryIso.split('-');
    const issuedYear = Number(year) - DRIVER_LICENSE_RULES.THRESHOLDS.DEFAULT_TERM_YEARS;
    return `${issuedYear}-${month}-${day}`;
  }

  /** Leyenda legible en singular/plural, incluida la licencia ya vencida. */
  private static buildCaption(daysLeft: number): string {
    if (daysLeft < 0) {
      const overdue = Math.abs(daysLeft);
      return overdue === 1 ? 'Venció hace 1 día' : `Venció hace ${overdue} días`;
    }
    if (daysLeft === 0) {
      return 'Vence hoy';
    }
    return daysLeft === 1 ? 'Falta 1 día' : `Faltan ${daysLeft} días`;
  }
}
