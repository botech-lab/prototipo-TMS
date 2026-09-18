import { WeekDay } from './schedule.model';

export interface DerivedServiceSummary {
  serviceId: string;
  masterRouteId: string;
  masterRouteCode: string;
  masterRouteName: string;
  originCity: string;
  destinationCity: string;
  dailyFrequency: number;
  distanceKm: number;
  operatingDays: WeekDay[];
  status: 'ACTIVO' | 'INACTIVO';
}

export interface MasterRouteScheduleGroup {
  masterRouteId: string;
  masterRouteCode: string; // ej: "RM-02"
  masterRouteName: string; // ej: "La Paz → Oruro → Potosí → Tarija"
  originDepartment: string; // ej: "LA PAZ"
  derivedServices: DerivedServiceSummary[];
}

export interface DepartmentScheduleHierarchy {
  departmentName: string;
  masterRoutesCount: number;
  totalDerivedServicesCount: number;
  masterRouteGroups: MasterRouteScheduleGroup[];
}
