import { Component, ChangeDetectionStrategy, ElementRef, HostListener, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../services/schedule.service';
import { ScheduleCalendarService } from '../../services/schedule-calendar.service';
import { SidebarDensityService, SidebarDensityMode } from '../../services/sidebar-density.service';
import { estimateTripMinutes } from '../../data/large-enterprise-schedule.mock';
import { ToastService } from '../../../../components/toast/toast.service';
import { EditServiceDrawerComponent } from '../edit-service-drawer/edit-service-drawer.component';
import { ManifestDrawerComponent } from '../manifest-drawer/manifest-drawer.component';
import { RoutesService } from '../../../../services/routes.service';
import { stopColor } from '../../../../components/route-graph-svg/route-graph-palette';
import {
  ScheduledCommercialService,
  DayDepartureSlot,
  QuickActionType,
  WeekDay,
  ServiceShift
} from '../../models/schedule.model';

/** Hora de la primera salida por turno (minutos desde medianoche). */
const SHIFT_FIRST_DEPARTURE: Record<string, number> = {
  'MAÑANA': 7 * 60,
  'TARDE': 14 * 60,
  'NOCHE': 20 * 60
};

type SlotStateVariant = 'active' | 'warning' | 'standby';

/** Parada dibujada sobre la línea del boleto (posición en % del ancho). */
export interface TicketStop {
  readonly name: string;
  readonly color: string;
  readonly left: number;
  readonly showLabel: boolean;
}

/** Día del selector semanal con sus salidas (para las mini barras). */
export interface WeekDayCell {
  readonly isoString: string;
  readonly dayName: string;
  readonly dayNumber: string;
  readonly fullName: string;
  readonly isToday: boolean;
  readonly slots: DayDepartureSlot[];
}

const MONTHS_LOWER = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAY_FULL_NAMES: Record<string, string> = {
  LUN: 'Lunes', MAR: 'Martes', 'MIÉ': 'Miércoles', JUE: 'Jueves', VIE: 'Viernes', 'SÁB': 'Sábado', DOM: 'Domingo'
};

/** Fecha local en formato ISO corto (AAAA-MM-DD). */
function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CITY_CODES_MAP: Record<string, string> = {
  'LA PAZ': 'LPZ',
  'EL ALTO': 'EAL',
  'ORURO': 'ORU',
  'COCHABAMBA': 'CBB',
  'SANTA CRUZ': 'SCZ',
  'POTOSÍ': 'PSI',
  'POTOSI': 'PSI',
  'SUCRE': 'SRE',
  'TARIJA': 'TJA',
  'UYUNI': 'UYU',
  'TRINIDAD': 'TDD',
  'COROICO': 'COR',
  'COROICO (YUNGAS)': 'COR',
  'COPACABANA': 'COP',
  'CARANAVI': 'CRN',
  'DESAGUADERO': 'DSG',
  'VILLAZÓN': 'VLZ',
  'VILLAZON': 'VLZ',
  'BERMEJO': 'BMJ',
  'PISIGA': 'PSG',
  'PUERTO QUIJARRO': 'PQJ',
  'YACUIBA': 'YAC',
  'MONTERO': 'MON',
  'VILLAMONTES': 'VMT',
  'TUPIZA': 'TPZ',
  'RIBERALTA': 'RIB',
  'VILLA TUNARI': 'VTN',
  'AIQUILE': 'AIQ',
  'CAMIRI': 'CAM',
  'COBIJA': 'CIJ'
};

@Component({
  selector: 'app-scheduled-services',
  imports: [CommonModule, FormsModule, EditServiceDrawerComponent, ManifestDrawerComponent],
  templateUrl: './scheduled-services.component.html',
  styleUrls: ['./scheduled-services.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScheduledServicesComponent {
  readonly opsService = inject(ScheduleService);
  readonly scheduleService = this.opsService;
  readonly calendarService = this.opsService.calendarService;
  private readonly densityService = inject(SidebarDensityService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly toast = inject(ToastService);

  readonly allWeekDays: WeekDay[] = this.opsService.allWeekDays;
  
  // Días de operación (semana de lunes a domingo, abreviaturas sin ambigüedad)
  readonly microDays = [
    { letter: 'Lu', key: 'Lun' as WeekDay, name: 'Lunes' },
    { letter: 'Ma', key: 'Mar' as WeekDay, name: 'Martes' },
    { letter: 'Mi', key: 'Mié' as WeekDay, name: 'Miércoles' },
    { letter: 'Ju', key: 'Jue' as WeekDay, name: 'Jueves' },
    { letter: 'Vi', key: 'Vie' as WeekDay, name: 'Viernes' },
    { letter: 'Sá', key: 'Sáb' as WeekDay, name: 'Sábado' },
    { letter: 'Do', key: 'Dom' as WeekDay, name: 'Domingo' }
  ];

  // Estados visibles de una salida (interruptor de cada tarjeta)
  readonly slotStateLegend: { variant: SlotStateVariant; label: string }[] = [
    { variant: 'active', label: 'Ocupación normal' },
    { variant: 'warning', label: 'Casi llena' },
    { variant: 'standby', label: 'Suspendida' }
  ];

  // Menú de acciones secundarias abierto (id de la salida) o null
  readonly openMenuSlotId = signal<string | null>(null);

  // Filtros y Búsqueda
  readonly searchQuery = this.opsService.searchQuery;
  readonly selectedShiftFilter = this.opsService.selectedShiftFilter;
  readonly filteredServices = this.opsService.filteredServices;

  // Agrupación y Selección
  readonly servicesByOriginCity = this.opsService.groupedFilteredServices;
  readonly openOriginCity = this.opsService.openOriginCity;
  readonly selectedService = this.opsService.selectedService;
  readonly selectedServiceId = this.opsService.selectedServiceId;
  
  // Drawer de Edición
  readonly isEditDrawerOpen = this.opsService.isEditDrawerOpen;

  // Densidad Dinámica del Sidebar
  readonly autoDensityMode = computed<SidebarDensityMode>(() => 
    this.densityService.getDensity(this.servicesByOriginCity().length)
  );
  readonly customDensity = signal<SidebarDensityMode | null>(null);
  readonly densityMode = computed<SidebarDensityMode>(() => 
    this.customDensity() ?? this.autoDensityMode()
  );

  // Calendario Real y Matriz Semanal Dinámica
  readonly currentWeek = this.opsService.currentWeek;
  readonly currentWeekActiveSlots = this.opsService.currentWeekActiveSlots;
  readonly currentWeekSlots = this.opsService.currentWeekSlots;
  readonly modalState = this.opsService.modalState;

  // ========================================================
  // BOLETO DE VIAJE (solo presentación)
  // ========================================================
  private readonly routesService = inject(RoutesService);
  private readonly todayIso = localIso(new Date());

  /**
   * Día elegido en el selector: null = valor por defecto (hoy si está en la
   * semana, si no la semana completa); 'ALL' = semana completa; ISO = ese día.
   */
  readonly selectedDayIso = signal<string | null>(null);

  readonly weekHeading = computed(() => {
    const w = this.calendarService.currentWeek();
    const s = w.startDate;
    const e = w.endDate;
    return `Semana del ${s.getDate()} ${MONTHS_LOWER[s.getMonth()]} al ${e.getDate()} ${MONTHS_LOWER[e.getMonth()]}`;
  });

  readonly weekDays = computed<WeekDayCell[]>(() => {
    const slots = this.currentWeekActiveSlots().slots;
    return this.calendarService.currentWeek().days.map(d => ({
      isoString: d.isoString,
      dayName: d.dayName,
      dayNumber: d.dayNumber,
      fullName: DAY_FULL_NAMES[d.dayName] ?? d.dayName,
      isToday: d.isoString === this.todayIso,
      slots: slots.filter(s => s.isoDate === d.isoString)
    }));
  });

  /** Día activo del filtro (null = semana completa). */
  readonly activeDayIso = computed<string | null>(() => {
    const chosen = this.selectedDayIso();
    const days = this.weekDays();
    if (chosen === 'ALL') return null;
    if (chosen && days.some(d => d.isoString === chosen)) return chosen;
    return days.find(d => d.isToday)?.isoString ?? null;
  });

  /** Salidas visibles según el día elegido. */
  readonly visibleSlots = computed<DayDepartureSlot[]>(() => {
    const iso = this.activeDayIso();
    const all = this.currentWeekActiveSlots().slots;
    return iso ? all.filter(s => s.isoDate === iso) : all;
  });

  /**
   * Paradas intermedias del servicio, tomadas de la ruta maestra que contiene
   * el origen antes que el destino. Sin ruta que coincida: solo extremos.
   */
  readonly ticketStops = computed<TicketStop[]>(() => {
    const srv = this.selectedService();
    if (!srv) return [];
    const norm = (v: string) => v.trim().toLowerCase();
    const origin = norm(srv.originCity);
    const destination = norm(srv.destinationCity);
    let between: string[] = [];
    for (const group of this.routesService.departmentGroups()) {
      for (const route of group.routes) {
        const names = route.stops.map(st => st.name);
        const i = names.findIndex(n => norm(n) === origin);
        const j = names.findIndex(n => norm(n) === destination);
        if (i >= 0 && j > i) {
          between = names.slice(i + 1, j);
          break;
        }
      }
      if (between.length) break;
    }
    const labelEvery = Math.max(1, Math.ceil(between.length / 3));
    return between.map((name, idx) => ({
      name,
      color: stopColor(name),
      left: ((idx + 1) / (between.length + 1)) * 100,
      showLabel: idx % labelEvery === 0
    }));
  });

  readonly ticketStopsText = computed(() => this.ticketStops().map(st => st.name).join(', '));

  /** Color de categoría (departamento) de una ciudad extrema del boleto. */
  cityColor(name: string): string {
    return stopColor(name);
  }

  selectDay(iso: string): void {
    this.selectedDayIso.set(this.activeDayIso() === iso ? 'ALL' : iso);
  }

  showWholeWeek(): void {
    this.selectedDayIso.set('ALL');
  }

  /** Hora de la primera salida del turno ("07:00"). */
  getServiceDeparture(shift?: string): string {
    return this.formatClock(this.getShiftDepartureMinutes(shift));
  }

  /** Nombre del turno en tipo oración ("MAÑANA" -> "Mañana"). */
  formatShift(shift?: string): string {
    if (!shift) return 'Sin turno';
    const lower = shift.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  // Aliases de compatibilidad
  readonly openDept = this.opsService.openOriginCity;
  readonly departmentsWithServices = this.opsService.departmentsWithServices;

  /**
   * Retorna el código oficial de 3 letras de la ciudad
   */
  getCityCode(cityName: string): string {
    if (!cityName) return 'BOL';
    const normalized = cityName.toUpperCase().trim();
    return CITY_CODES_MAP[normalized] || normalized.substring(0, 3);
  }

  /**
   * Minutos de viaje estimados según el kilometraje (60 km/h, redondeo a 15 min).
   * Fuente única para la duración y la hora de llegada de la tarjeta.
   */
  getServiceDurationMinutes(distanceKm: number): number {
    return estimateTripMinutes(distanceKm);
  }

  /**
   * Rango horario de la primera salida: hora del turno + duración del viaje,
   * así el rango siempre coincide con la duración mostrada.
   */
  getServiceTimeRange(shift?: string, distanceKm = 0): string {
    const departure = this.getShiftDepartureMinutes(shift);
    const arrival = departure + this.getServiceDurationMinutes(distanceKm);
    return `${this.formatClock(departure)} – ${this.formatClock(arrival)}`;
  }

  /** true cuando la llegada cae al día siguiente de la salida. */
  arrivesNextDay(shift?: string, distanceKm = 0): boolean {
    return this.getShiftDepartureMinutes(shift) + this.getServiceDurationMinutes(distanceKm) >= 24 * 60;
  }

  /**
   * Calcula la duración estimada de viaje en función del kilometraje
   */
  getServiceDuration(distanceKm: number): string {
    const total = this.getServiceDurationMinutes(distanceKm);
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  /** Hora del dato de despacho sin el sufijo "Hrs" ("07:00 Hrs" -> "07:00"). */
  formatTime(value?: string): string {
    return (value ?? '').replace(/\s*hrs?\.?\s*$/i, '').trim();
  }

  /** Resumen legible de los días de operación ("Todos los días", "Lun a Vie"...). */
  getOperatingDaysSummary(days: WeekDay[]): string {
    const set = new Set(days);
    const ordered = this.microDays.filter(d => set.has(d.key)).map(d => d.key);
    if (ordered.length === 7) return 'Todos los días';
    if (ordered.length === 0) return 'Sin días';
    const weekdays: WeekDay[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
    const isRun = (run: WeekDay[]) => ordered.length === run.length && run.every(d => set.has(d));
    if (isRun([...weekdays, 'Sáb'])) return 'Lun a Sáb';
    if (isRun(weekdays)) return 'Lun a Vie';
    return ordered.join(' · ');
  }

  /** Variante visual del estado de una salida. */
  getSlotState(slot: DayDepartureSlot): SlotStateVariant {
    if (!slot.isActive) return 'standby';
    return slot.statusVariant === 'warning' ? 'warning' : 'active';
  }

  getSlotStateLabel(slot: DayDepartureSlot): string {
    const state = this.getSlotState(slot);
    if (state === 'standby') return 'Suspendida';
    return state === 'warning' ? 'Casi llena' : 'Activa';
  }

  /** Código corto para la cabecera de la tarjeta ("DESP-LPZ-01-800" -> "DESP-800"); el completo va en title. */
  getShortCode(code: string): string {
    const parts = (code ?? '').split('-').filter(Boolean);
    return parts.length > 2 ? `${parts[0]}-${parts[parts.length - 1]}` : code;
  }

  /** Nombre del bus sin la capacidad entre paréntesis ("Bus Cama Suite (36 Asientos)" -> "Bus Cama Suite"). */
  getBusName(label: string): string {
    return (label ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim() || label;
  }

  /** Porcentaje de ocupación (0 a 100) para la barrita del tablero. */
  getOccupancyPercent(slot: DayDepartureSlot): number {
    const total = slot.occupancyTotal;
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.max(0, (slot.occupancyCurrent / total) * 100));
  }

  private getShiftDepartureMinutes(shift?: string): number {
    const s = shift?.toUpperCase() || 'MAÑANA';
    return SHIFT_FIRST_DEPARTURE[s] ?? 8 * 60;
  }

  private formatClock(totalMinutes: number): string {
    const m = ((totalMinutes % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  openEditDrawer(service?: ScheduledCommercialService, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.opsService.openEditDrawer(service);
  }

  closeEditDrawer(): void {
    this.opsService.closeEditDrawer();
  }

  toggleDensity(): void {
    this.customDensity.update(current => {
      const active = current ?? this.autoDensityMode();
      return active === 'compact' ? 'comfortable' : 'compact';
    });
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.opsService.setSearchQuery(input.value);
  }

  clearSearch(): void {
    this.opsService.setSearchQuery('');
  }

  setShiftFilter(shift: string): void {
    this.opsService.setShiftFilter(shift);
  }

  toggleCity(cityName: string): void {
    this.opsService.toggleCity(cityName);
  }

  toggleDept(deptName: string): void {
    this.toggleCity(deptName);
  }

  selectService(srv: ScheduledCommercialService): void {
    this.opsService.selectService(srv);
  }

  /** Enter / Espacio sobre la tarjeta (no sobre sus botones internos). */
  onServiceCardKeydown(srv: ScheduledCommercialService, event: Event): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.selectService(srv);
  }

  closeDetail(): void {
    this.opsService.closeDetail();
  }

  nextWeek(): void {
    this.opsService.nextWeek();
  }

  previousWeek(): void {
    this.opsService.previousWeek();
  }

  goToCurrentWeek(): void {
    this.opsService.goToCurrentWeek();
  }

  requestToggleSlot(slot: DayDepartureSlot): void {
    this.opsService.requestToggleSlot(slot);
  }

  confirmToggleSlot(): void {
    const slot = this.modalState().slot;
    this.opsService.confirmToggleSlot();
    if (slot) this.announceSlotToggle(slot);
  }

  toggleSlotStatus(slot: DayDepartureSlot): void {
    this.opsService.toggleSlotStatus(slot);
    this.announceSlotToggle(slot);
  }

  /**
   * Aviso tras cambiar el estado de una salida. `slot` es el estado previo:
   * si estaba activa, ahora quedó suspendida (con "Deshacer").
   */
  private announceSlotToggle(slot: DayDepartureSlot): void {
    const day = slot.dayBadge ?? slot.dayLabel;
    if (!slot.isActive) {
      this.toast.show(`Salida ${day} reactivada`);
      return;
    }
    const sold = slot.occupancyCurrent;
    const affected = typeof sold === 'number' && sold > 0
      ? `, ${sold} ${sold === 1 ? 'pasajero afectado' : 'pasajeros afectados'}`
      : '';
    this.toast.show(`Salida ${day} suspendida${affected}`, {
      actionLabel: 'Deshacer',
      onAction: () => this.opsService.toggleSlotStatus(slot)
    });
  }

  openQuickModal(type: QuickActionType, slot: DayDepartureSlot): void {
    // Desde el menú: el foco vuelve al "⋯" antes de abrir, para que el drawer o modal lo devuelva ahí.
    this.closeSlotMenu(true);
    this.opsService.openQuickActionModal(type, slot);
  }

  // ========================================================
  // MENÚ "MÁS ACCIONES" DE CADA SALIDA (solo presentación)
  // ========================================================
  slotDomId(slot: DayDepartureSlot): string {
    return slot.id.replace(/[^A-Za-z0-9_-]/g, '-');
  }

  toggleSlotMenu(slot: DayDepartureSlot, event?: Event): void {
    event?.stopPropagation();
    if (this.openMenuSlotId() === slot.id) {
      this.closeSlotMenu();
      return;
    }
    this.openMenuSlotId.set(slot.id);
    this.focusMenuItem(slot, 0);
  }

  onMenuTriggerKeydown(slot: DayDepartureSlot, event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.openMenuSlotId.set(slot.id);
      this.focusMenuItem(slot, event.key === 'ArrowUp' ? -1 : 0);
    }
  }

  onMenuKeydown(slot: DayDepartureSlot, event: KeyboardEvent): void {
    const items = this.getMenuItems(slot);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next = -2;
    switch (event.key) {
      case 'ArrowDown': next = (current + 1) % items.length; break;
      case 'ArrowUp': next = (current - 1 + items.length) % items.length; break;
      case 'Home': next = 0; break;
      case 'End': next = items.length - 1; break;
      case 'Tab': this.closeSlotMenu(); return;
      case 'Escape':
        event.stopPropagation();
        this.closeSlotMenu(true);
        return;
    }
    if (next >= 0) {
      event.preventDefault();
      items[next].focus();
    }
  }

  closeSlotMenu(restoreFocus = false): void {
    const openId = this.openMenuSlotId();
    if (!openId) return;
    this.openMenuSlotId.set(null);
    if (restoreFocus) {
      const trigger = this.host.nativeElement.querySelector<HTMLElement>(
        `#slot-more-${openId.replace(/[^A-Za-z0-9_-]/g, '-')}`
      );
      trigger?.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openMenuSlotId()) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.scheduled-services__slot-more-wrap')) {
      this.closeSlotMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    this.closeSlotMenu(true);
  }

  private getMenuItems(slot: DayDepartureSlot): HTMLElement[] {
    const menu = this.host.nativeElement.querySelector(`#slot-menu-${this.slotDomId(slot)}`);
    return menu ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
  }

  /** Enfoca un ítem del menú tras el render (-1 = último). */
  private focusMenuItem(slot: DayDepartureSlot, index: number): void {
    setTimeout(() => {
      const items = this.getMenuItems(slot);
      if (items.length === 0) return;
      items[index < 0 ? items.length - 1 : Math.min(index, items.length - 1)].focus();
    });
  }

  closeQuickModal(): void {
    this.opsService.closeQuickActionModal();
  }

  saveModalChanges(slot: DayDepartureSlot): void {
    this.closeQuickModal();
  }
}
