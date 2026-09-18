import { Injectable, signal, computed, inject } from '@angular/core';
import {
  ScheduledCommercialService,
  OriginCityGroup,
  DayDepartureSlot,
  ActiveSlotsResult,
  WeekDay,
  QuickActionModalState,
  QuickActionType,
  DepartmentWithServices
} from '../models/schedule.model';
import {
  MOCK_SCHEDULED_SERVICES,
  MOCK_PASSENGER_FLEET,
  NEARLY_FULL_RATIO,
  mockSoldSeats,
  estimateTripMinutes,
  formatMockClock
} from '../data/large-enterprise-schedule.mock';
import { ScheduleCalendarService, CurrentWeekInfo } from './schedule-calendar.service';

// Mapeo entre el índice del día (0 = Lunes, 6 = Domingo) y la clave de operatingDays
export const DAY_INDEX_TO_KEY: Record<number, 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom'> = {
  0: 'Lun',
  1: 'Mar',
  2: 'Mié',
  3: 'Jue',
  4: 'Vie',
  5: 'Sáb',
  6: 'Dom'
};

@Injectable({
  providedIn: 'root'
})
export class ScheduleOperationsService {
  readonly calendarService = inject(ScheduleCalendarService);

  readonly allWeekDays: WeekDay[] = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // ========================================================
  // SIGNALS DE ESTADO REACTIVO
  // ========================================================
  readonly allServices = signal<ScheduledCommercialService[]>(MOCK_SCHEDULED_SERVICES);
  readonly searchQuery = signal<string>('');
  readonly selectedShiftFilter = signal<string>('TODOS');
  readonly selectedStatusFilter = signal<string>('TODOS');
  readonly selectedService = signal<ScheduledCommercialService | null>(MOCK_SCHEDULED_SERVICES[0]);
  readonly openOriginCity = signal<string>('LA PAZ');
  readonly slotsMap = signal<Record<string, DayDepartureSlot[]>>({});

  // Drawer de Edición Maestra
  readonly isEditDrawerOpen = signal<boolean>(false);
  readonly editingService = signal<ScheduledCommercialService | null>(null);

  readonly modalState = signal<QuickActionModalState>({
    isOpen: false,
    type: null,
    slot: null,
    service: null
  });

  // Exponer calendario
  readonly currentWeek = this.calendarService.currentWeek;
  readonly weekOffset = this.calendarService.weekOffset;

  // ========================================================
  // SIGNALS COMPUTADOS: FILTRADO REACTIVO ULTRA-RÁPIDO
  // ========================================================
  readonly filteredServices = computed<ScheduledCommercialService[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const shiftFilter = this.selectedShiftFilter().toUpperCase();
    const statusFilter = this.selectedStatusFilter().toUpperCase();

    return this.allServices().filter(srv => {
      const name = srv.serviceName ? srv.serviceName.toLowerCase() : '';
      const matchQuery =
        !query ||
        name.includes(query) ||
        srv.originCity.toLowerCase().includes(query) ||
        srv.destinationCity.toLowerCase().includes(query) ||
        srv.id.toLowerCase().includes(query);

      const matchShift =
        shiftFilter === 'TODOS' || (srv.shift && srv.shift.toUpperCase() === shiftFilter);

      const matchStatus =
        statusFilter === 'TODOS' || srv.status.toUpperCase() === statusFilter;

      return matchQuery && matchShift && matchStatus;
    });
  });

  // Agrupación automática en acordeón de los resultados filtrados por ciudad de origen real
  readonly groupedFilteredServices = computed<OriginCityGroup[]>(() => {
    const list = this.filteredServices();
    const map = new Map<string, ScheduledCommercialService[]>();

    list.forEach(srv => {
      const key = srv.originCity.toUpperCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(srv);
    });

    return Array.from(map.entries()).map(([originCity, services]) => ({
      originCity,
      servicesCount: services.length,
      services
    }));
  });

  // Alias oficial para la vista lateral
  readonly groupedServices = this.groupedFilteredServices;

  // Lista única de orígenes de la red
  readonly availableOriginCities = computed<string[]>(() => {
    const actualCities = new Set(this.allServices().map(s => s.originCity.toUpperCase()));
    return ['TODOS', ...Array.from(actualCities)];
  });

  // ========================================================
  // SIGNALS COMPUTADOS: DESPACHOS FILTRADOS POR OPERATING DAYS
  // ========================================================
  readonly currentWeekActiveSlots = computed<ActiveSlotsResult>(() => {
    const srv = this.selectedService();
    if (!srv) return { slots: [], needsFillerSlot: false };

    const week = this.calendarService.currentWeek();
    const key = `${srv.id}-W${this.calendarService.weekOffset()}`;
    const customSlots = this.slotsMap()[key];
    if (customSlots && customSlots.length > 0) {
      const needsFillerSlot = customSlots.length > 0 && customSlots.length % 2 !== 0;
      return { slots: customSlots, needsFillerSlot };
    }

    // Solo flota de pasajeros; la capacidad del bus es el total de la ocupación
    const fleetOptions = MOCK_PASSENGER_FLEET;
    const tripMinutes = estimateTripMinutes(srv.distanceKm);
    const driverOptions = [
      'Carlos Mendoza (Cat. C)',
      'Roberto Gómez (Cat. C)',
      'Fernando Flores (Cat. T)',
      'Javier Mamani (Cat. C)'
    ];

    const parts = srv.id.split('-');
    const origCode = parts.length > 1 ? parts[1] : 'SRV';
    const numCode = parts.length > 2 ? parts[2] : '01';

    // Filtrar solo los días de la semana donde el servicio opera según su configuración
    const activeDays = week.days.filter((day, index) => {
      const dayKey = DAY_INDEX_TO_KEY[index];
      return srv.operatingDays.includes(dayKey);
    });

    const slots: DayDepartureSlot[] = activeDays.map((day, idx) => {
      const hourBase = 7 + (idx % 3) * 4;
      const departureMinutes = hourBase * 60 + (idx % 2 === 0 ? 0 : 30);
      const bus = fleetOptions[idx % fleetOptions.length];
      const sold = mockSoldSeats(idx, bus.seats);
      // Casi llena: vendidos / asientos >= 85%
      const isWarning = sold / bus.seats >= NEARLY_FULL_RATIO;

      return {
        id: `${srv.id}-${day.isoString}`,
        serviceId: srv.id,
        dayLabel: day.badgeLabel, // Ej: "LUN 31", "MAR 01"
        dayBadge: day.badgeLabel,
        isoDate: day.isoString,
        serviceCode: `DESP-${origCode}-${numCode}-${800 + idx * 30}`,
        departureTime: `${String(hourBase).padStart(2, '0')}:${idx % 2 === 0 ? '00' : '30'} Hrs`,
        arrivalTime: formatMockClock(departureMinutes + tripMinutes),
        assignedVehicle: bus.label,
        vehicleType: bus.label,
        driverName: driverOptions[idx % driverOptions.length],
        licensePlate: `${3000 + idx * 111}-${origCode}`,
        occupancyCurrent: sold,
        occupancyTotal: bus.seats,
        isActive: true,
        statusVariant: isWarning ? 'warning' : 'active'
      };
    });

    const needsFillerSlot = slots.length > 0 && slots.length % 2 !== 0;

    return {
      slots,
      needsFillerSlot
    };
  });

  // Alias para mantener compatibilidad total con tests y componentes
  readonly currentWeekSlots = computed<DayDepartureSlot[]>(() => {
    return this.currentWeekActiveSlots().slots;
  });

  // Identificador de servicio seleccionado
  readonly selectedServiceId = computed<string | null>(() => {
    return this.selectedService()?.id ?? null;
  });

  // Aliases de compatibilidad
  readonly servicesByOriginCity = this.groupedFilteredServices;
  readonly allScheduledServices = this.allServices;
  readonly openDept = this.openOriginCity;
  readonly departmentsWithServices = computed<DepartmentWithServices[]>(() => {
    return this.groupedFilteredServices().map(g => ({
      name: g.originCity,
      servicesCount: g.servicesCount,
      services: g.services
    }));
  });

  // ========================================================
  // MÉTODOS Y ACCIONES REACTIVAS
  // ========================================================
  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  setShiftFilter(shift: string): void {
    this.selectedShiftFilter.set(shift);
  }

  setStatusFilter(status: string): void {
    this.selectedStatusFilter.set(status);
  }

  selectService(srv: ScheduledCommercialService): void {
    this.selectedService.set(srv);
    this.openOriginCity.set(srv.originCity.toUpperCase());
  }

  toggleCity(cityName: string): void {
    this.openOriginCity.update(current => current === cityName ? '' : cityName);
  }

  toggleDept(deptName: string): void {
    this.toggleCity(deptName);
  }

  nextWeek(): void {
    this.calendarService.nextWeek();
  }

  previousWeek(): void {
    this.calendarService.prevWeek();
  }

  goToCurrentWeek(): void {
    this.calendarService.goToCurrentWeek();
  }

  closeDetail(): void {
    this.selectedService.set(null);
  }

  addService(newService: ScheduledCommercialService): void {
    this.allServices.update(list => [...list, newService]);
  }

  /**
   * Actualiza los datos de un servicio en tiempo real
   */
  updateService(updated: ScheduledCommercialService): void {
    this.allServices.update(list =>
      list.map(s => (s.id === updated.id ? { ...s, ...updated } : s))
    );

    if (this.selectedService()?.id === updated.id) {
      this.selectedService.set(updated);
    }
  }

  /**
   * Abre el drawer de edición maestra
   */
  openEditDrawer(service?: ScheduledCommercialService): void {
    const target = service || this.selectedService();
    if (target) {
      this.editingService.set(target);
      this.isEditDrawerOpen.set(true);
    }
  }

  /**
   * Cierra el drawer de edición maestra
   */
  closeEditDrawer(): void {
    this.isEditDrawerOpen.set(false);
    this.editingService.set(null);
  }

  /**
   * Abre modal de confirmación antes de cambiar el estado de la píldora/switch
   */
  requestToggleSlot(slot: DayDepartureSlot): void {
    this.modalState.set({
      isOpen: true,
      type: 'toggle-confirm',
      slot,
      service: this.selectedService()
    });
  }

  /**
   * Confirma y aplica el cambio de estado del despacho
   */
  confirmToggleSlot(): void {
    const state = this.modalState();
    if (state.slot) {
      this.toggleSlotStatus(state.slot);
    }
    this.closeQuickActionModal();
  }

  toggleSlotStatus(slot: DayDepartureSlot): void {
    const srv = this.selectedService();
    if (!srv) return;
    const key = `${srv.id}-W${this.calendarService.weekOffset()}`;

    this.slotsMap.update(all => {
      const currentList = all[key] || this.currentWeekSlots();
      const updatedList: DayDepartureSlot[] = currentList.map(s => {
        if (s.id === slot.id) {
          const nextActive = !s.isActive;
          const nextVariant: DayDepartureSlot['statusVariant'] = nextActive
            ? (s.statusVariant === 'standby' ? 'active' : s.statusVariant)
            : 'standby';
          return {
            ...s,
            isActive: nextActive,
            statusVariant: nextVariant
          };
        }
        return s;
      });
      return {
        ...all,
        [key]: updatedList
      };
    });
  }

  openQuickActionModal(type: QuickActionType, slot: DayDepartureSlot): void {
    this.modalState.set({
      isOpen: true,
      type,
      slot,
      service: this.selectedService()
    });
  }

  closeQuickActionModal(): void {
    this.modalState.set({
      isOpen: false,
      type: null,
      slot: null,
      service: null
    });
  }
}
