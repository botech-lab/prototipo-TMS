import { Injectable, signal, computed } from '@angular/core';

export interface CalendarWeekDay {
  date: Date;
  dayName: string;   // "LUN", "MAR", etc.
  dayNumber: string; // "31", "01", "02"
  badgeLabel: string; // "LUN 31", "MAR 01"
  isoString: string;
}

export interface CurrentWeekInfo {
  offset: number;
  startDate: Date;
  endDate: Date;
  days: CalendarWeekDay[];
  title: string;        // "Septiembre 2026", "Octubre 2026" (sin "Semana X")
  rangeLabel: string;   // "31 Ago – 6 Sep, 2026"
  isFirstWeek: boolean;
}

const DAY_NAMES = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_NAMES_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

@Injectable({
  providedIn: 'root'
})
export class ScheduleCalendarService {
  // Lunes 31 de Agosto de 2026 (Semana de inicio de Septiembre 2026)
  private readonly BASE_MONDAY = new Date(2026, 7, 31);

  // Offset en semanas: 0 = 31 Ago-6 Sep, 1 = 7-13 Sep, etc.
  readonly weekOffset = signal<number>(0);

  readonly currentWeek = computed<CurrentWeekInfo>(() => {
    const offset = this.weekOffset();
    const monday = new Date(this.BASE_MONDAY);
    monday.setDate(this.BASE_MONDAY.getDate() + offset * 7);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const days: CalendarWeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const dayName = DAY_NAMES[d.getDay()];
      const dayNum = String(d.getDate()).padStart(2, '0');
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${dayNum}`;

      days.push({
        date: d,
        dayName,
        dayNumber: dayNum,
        badgeLabel: `${dayName} ${dayNum}`,
        isoString: iso
      });
    }

    // Mes predominante de la semana
    const midWeek = new Date(monday);
    midWeek.setDate(monday.getDate() + 3);
    const monthName = MONTH_NAMES_FULL[midWeek.getMonth()];
    const year = midWeek.getFullYear();

    // Título limpio sin "Semana X"
    const title = `${monthName} ${year}`;

    const startMonth = MONTH_NAMES_SHORT[monday.getMonth()];
    const endMonth = MONTH_NAMES_SHORT[sunday.getMonth()];
    const rangeLabel = startMonth === endMonth
      ? `${monday.getDate()} – ${sunday.getDate()} ${startMonth}, ${year}`
      : `${monday.getDate()} ${startMonth} – ${sunday.getDate()} ${endMonth}, ${year}`;

    return {
      offset,
      startDate: monday,
      endDate: sunday,
      days,
      title,
      rangeLabel,
      isFirstWeek: offset === 0
    };
  });

  nextWeek(): void {
    this.weekOffset.update(w => w + 1);
  }

  prevWeek(): void {
    this.weekOffset.update(w => w - 1);
  }

  goToCurrentWeek(): void {
    this.weekOffset.set(0);
  }

  setWeekOffset(offset: number): void {
    this.weekOffset.set(offset);
  }
}
