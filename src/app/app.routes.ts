import { Routes } from '@angular/router';
import { pageMeta } from './core/routing/route-meta';
import { MasterRoutesDashboardComponent } from './components/master-routes-dashboard/master-routes-dashboard.component';
import { ScheduledServicesComponent } from './features/schedule/components/scheduled-services/scheduled-services.component';
import { VehiclesPageComponent } from './features/fleet/components/vehicles-page/vehicles-page.component';
import { DriversPageComponent } from './features/drivers/components/drivers-page/drivers-page.component';
import { UsersPageComponent } from './features/users/components/users-page/users-page.component';
import { SeatDesignerPageComponent } from './features/seat-designer/components/seat-designer-page/seat-designer-page.component';
import { CitiesPageComponent } from './features/parametric/components/pages/cities-page.component';
import { DepartmentsPageComponent } from './features/parametric/components/pages/departments-page.component';
import { PeoplePageComponent } from './features/parametric/components/pages/people-page.component';
import { CargoTypesPageComponent } from './features/parametric/components/pages/cargo-types-page.component';
import { VehicleTypesPageComponent } from './features/parametric/components/pages/vehicle-types-page.component';
import { DocumentTypesPageComponent } from './features/parametric/components/pages/document-types-page.component';
import { IncidentTypesPageComponent } from './features/parametric/components/pages/incident-types-page.component';
import { LicenseTypesPageComponent } from './features/parametric/components/pages/license-types-page.component';
import { SurchargeTypesPageComponent } from './features/parametric/components/pages/surcharge-types-page.component';
import { PaymentMethodsPageComponent } from './features/parametric/components/pages/payment-methods-page.component';
import { CurrenciesPageComponent } from './features/parametric/components/pages/currencies-page.component';
import { RouteUsageTypesPageComponent } from './features/parametric/components/pages/route-usage-types-page.component';
import { FareCategoryTypesPageComponent } from './features/parametric/components/pages/fare-category-types-page.component';
import { SeatTypesPageComponent } from './features/parametric/components/pages/seat-types-page.component';
import { SalesChannelsPageComponent } from './features/parametric/components/pages/sales-channels-page.component';
import { Component, ChangeDetectionStrategy } from '@angular/core';

/** Estilos compartidos por las vistas placeholder (Ventas / Administración / Informes). */
const PLACEHOLDER_VIEW_STYLES = `
  .placeholder-view {
    padding: 1.5rem;
    border-width: 1px;
    border-color: #E7E5E4;
    border-radius: 1rem;
    background-color: #fff;
  }

  .placeholder-view__title {
    font-size: 1.25rem;
    line-height: 1.75rem;
    font-weight: 700;
    color: #1E293B;
  }

  .placeholder-view__description {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: #64748B;
  }
`;

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div class="placeholder-view"><h2 class="placeholder-view__title">Módulo de Ventas</h2><p class="placeholder-view__description">Emisión de pasajes y reservas en línea.</p></div>`,
  styles: [PLACEHOLDER_VIEW_STYLES]
})
export class VentasViewComponent {}

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div class="placeholder-view"><h2 class="placeholder-view__title">Módulo de Administración</h2><p class="placeholder-view__description">Gestión de usuarios, permisos y configuración empresarial.</p></div>`,
  styles: [PLACEHOLDER_VIEW_STYLES]
})
export class AdministracionViewComponent {}

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div class="placeholder-view"><h2 class="placeholder-view__title">Módulo de Informes</h2><p class="placeholder-view__description">Reportes de recaudación, ocupación y trazabilidad de buses.</p></div>`,
  styles: [PLACEHOLDER_VIEW_STYLES]
})
export class InformesViewComponent {}

const OPERACION = 'Operación';
const ADMINISTRACION = 'Administración';
const CATALOGOS = 'Catálogos';

export const routes: Routes = [
  { path: '', redirectTo: 'operaciones', pathMatch: 'full' },

  // Operación (los alias de URL se mantienen)
  { path: 'operaciones', component: ScheduledServicesComponent, ...pageMeta(OPERACION, 'Servicios programados') },
  { path: 'servicios-programados', component: ScheduledServicesComponent, ...pageMeta(OPERACION, 'Servicios programados') },
  { path: 'rutas-maestras', component: MasterRoutesDashboardComponent, ...pageMeta(OPERACION, 'Rutas maestras') },
  { path: 'programar', component: MasterRoutesDashboardComponent, ...pageMeta(OPERACION, 'Rutas maestras') },

  // Administración
  { path: 'administracion', component: AdministracionViewComponent, ...pageMeta(ADMINISTRACION) },
  { path: 'usuarios', component: UsersPageComponent, ...pageMeta(ADMINISTRACION, 'Usuarios') },
  { path: 'vehiculos', component: VehiclesPageComponent, ...pageMeta(ADMINISTRACION, 'Vehículos') },
  {
    path: 'vehiculos/:vehicleId/plazas',
    component: SeatDesignerPageComponent,
    ...pageMeta(ADMINISTRACION, { label: 'Vehículos', link: '/vehiculos' }, 'Diseñar plazas')
  },
  { path: 'seat-designer/:vehicleId', redirectTo: 'vehiculos/:vehicleId/plazas' },
  { path: 'conductores', component: DriversPageComponent, ...pageMeta(ADMINISTRACION, 'Conductores') },

  // Catálogos paramétricos
  { path: 'parametric/ciudades', component: CitiesPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Ciudades') },
  { path: 'parametric/departamentos', component: DepartmentsPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Departamentos') },
  { path: 'parametric/personas', component: PeoplePageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Personas') },
  { path: 'parametric/tipo-cargas', component: CargoTypesPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Tipos de carga') },
  { path: 'parametric/tipo-vehiculos', component: VehicleTypesPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Tipos de vehículo') },
  { path: 'parametric/tipo-documentos', component: DocumentTypesPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Tipos de documento') },
  { path: 'parametric/tipo-incidencias', component: IncidentTypesPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Tipos de incidencia') },
  { path: 'parametric/tipo-licencias', component: LicenseTypesPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Tipos de licencia') },
  { path: 'parametric/tipo-recargos', component: SurchargeTypesPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Tipos de recargo') },
  { path: 'parametric/metodos-pago', component: PaymentMethodsPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Métodos de pago') },
  { path: 'parametric/monedas', component: CurrenciesPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Monedas') },
  { path: 'parametric/tipos-uso-ruta', component: RouteUsageTypesPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Tipos de uso de ruta') },
  { path: 'parametric/tipos-categoria-tarifa', component: FareCategoryTypesPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Categorías de tarifa') },
  { path: 'parametric/tipos-asiento', component: SeatTypesPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Tipos de asiento') },
  { path: 'parametric/canales-venta', component: SalesChannelsPageComponent, ...pageMeta(ADMINISTRACION, CATALOGOS, 'Canales de venta') },

  // Módulos en preparación (fuera del menú navegable)
  { path: 'ventas', component: VentasViewComponent, ...pageMeta('Ventas') },
  { path: 'informes', component: InformesViewComponent, ...pageMeta('Informes') },

  { path: '**', redirectTo: 'operaciones' }
];
