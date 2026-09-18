/**
 * Modelos de Datos para Servicios Comerciales Programados / Operaciones
 * Arquitectura de Alta Densidad de Datos - PAZAVI TMS
 */

export type WeekDay = 'Dom' | 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb';

export type ServiceShift = 'MAÑANA' | 'TARDE' | 'NOCHE' | 'Mañana' | 'Tarde' | 'Noche';

export interface ScheduledCommercialService {
  id: string;
  serviceName?: string;     // Nombre comercial (Ej: "Expreso Troncal Altiplano")
  originCity: string;       // Ej: "El Alto", "La Paz", "Oruro", "Cochabamba", "Santa Cruz", "Potosí", "Tarija"
  destinationCity: string;  // Ej: "Cochabamba", "Oruro", "Potosí", "Santa Cruz", "Sucre", "Tarija"
  dailyDeparturesCount: number;
  distanceKm: number;
  operatingDays: WeekDay[];
  status: 'ACTIVO' | 'INACTIVO';
  shift?: ServiceShift;
}

export interface OriginCityGroup {
  originCity: string;
  servicesCount: number;
  services: ScheduledCommercialService[];
}

export interface DayDepartureSlot {
  id: string;
  serviceId: string;
  dayLabel: string; // Ej: "LUN 31", "MAR 01"
  dayBadge?: string; // Ej: "LUN 31"
  isoDate?: string;
  serviceCode: string; // Ej: "DESP-LPZ-01-800"
  departureTime: string; // "08:00 Hrs"
  arrivalTime: string;   // "09:30 Hrs"
  assignedVehicle: string; // "Bus Cama Suite (36 Asientos)"
  vehicleType?: string;
  driverName?: string;
  licensePlate?: string;
  occupancyCurrent: number;
  occupancyTotal: number;
  isActive: boolean;
  statusVariant: 'active' | 'warning' | 'standby';
}

export interface ActiveSlotsResult {
  slots: DayDepartureSlot[];
  needsFillerSlot: boolean;
}

export type QuickActionType = 'manifest' | 'vehicle' | 'tags' | 'edit' | 'toggle-confirm';

export interface QuickActionModalState {
  isOpen: boolean;
  type: QuickActionType | null;
  slot: DayDepartureSlot | null;
  service: ScheduledCommercialService | null;
}

// Aliases de compatibilidad
export type ServiceScheduleSummary = ScheduledCommercialService;
export type DepartmentWithServices = {
  name: string;
  servicesCount: number;
  services: ScheduledCommercialService[];
};
