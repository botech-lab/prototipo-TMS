import { Injectable } from '@angular/core';
import {
  CARGO_TYPES_MOCK,
  CITIES_MOCK,
  DEPARTMENTS_MOCK,
  DOCUMENT_TYPES_MOCK,
  INCIDENT_TYPES_MOCK,
  CURRENCIES_MOCK,
  FARE_CATEGORY_TYPES_MOCK,
  LICENSE_TYPES_MOCK,
  PAYMENT_METHODS_MOCK,
  PEOPLE_MOCK,
  ROUTE_USAGE_TYPES_MOCK,
  SALES_CHANNELS_MOCK,
  SEAT_TYPES_MOCK,
  SURCHARGE_TYPES_MOCK,
  VEHICLE_TYPES_MOCK
} from '../data/parametric.mock';
import {
  CargoType,
  City,
  Department,
  DocumentTypeEntry,
  IncidentType,
  Currency,
  FareCategoryType,
  LicenseTypeEntry,
  PaymentMethod,
  Person,
  RouteUsageType,
  SalesChannel,
  SeatType,
  SurchargeType,
  VehicleTypeEntry
} from '../models/parametric.model';
import { CatalogStore } from './catalog-store';

/**
 * ============================================================================
 * REGISTRO DE CATÁLOGOS PARAMÉTRICOS
 * ============================================================================
 * Un único servicio raíz que expone un `CatalogStore` por catálogo. Añadir un
 * catálogo nuevo es declarar un store más aquí: no hace falta otro servicio.
 *
 * Cada store recibe su propia proyección de texto buscable, que es lo único
 * que realmente distingue a un catálogo de otro a nivel de estado.
 * ============================================================================
 */
@Injectable({ providedIn: 'root' })
export class ParametricCatalogsService {
  readonly cities = new CatalogStore<City>(
    CITIES_MOCK,
    city => `${city.name} ${city.department} ${city.postalCode}`
  );

  readonly departments = new CatalogStore<Department>(
    DEPARTMENTS_MOCK,
    department => `${department.code} ${department.name} ${department.country} ${department.capital}`
  );

  readonly people = new CatalogStore<Person>(
    PEOPLE_MOCK,
    person => `${person.name} ${person.documentNumber} ${person.email} ${person.phone}`
  );

  readonly cargoTypes = new CatalogStore<CargoType>(
    CARGO_TYPES_MOCK,
    cargo => `${cargo.name} ${cargo.description}`
  );

  readonly vehicleTypes = new CatalogStore<VehicleTypeEntry>(
    VEHICLE_TYPES_MOCK,
    type => `${type.name} ${type.description} ${type.requiredLicense ?? ''}`
  );

  readonly documentTypes = new CatalogStore<DocumentTypeEntry>(
    DOCUMENT_TYPES_MOCK,
    type => `${type.code} ${type.name} ${type.description}`
  );

  readonly incidentTypes = new CatalogStore<IncidentType>(
    INCIDENT_TYPES_MOCK,
    type => `${type.name} ${type.description} ${type.severity}`
  );

  readonly licenseTypes = new CatalogStore<LicenseTypeEntry>(
    LICENSE_TYPES_MOCK,
    type => `${type.name} ${type.description}`
  );

  readonly surchargeTypes = new CatalogStore<SurchargeType>(
    SURCHARGE_TYPES_MOCK,
    type => `${type.name} ${type.description}`
  );

  readonly paymentMethods = new CatalogStore<PaymentMethod>(
    PAYMENT_METHODS_MOCK,
    method => `${method.name} ${method.description}`
  );

  readonly currencies = new CatalogStore<Currency>(
    CURRENCIES_MOCK,
    currency => `${currency.code} ${currency.name} ${currency.symbol}`
  );

  readonly routeUsageTypes = new CatalogStore<RouteUsageType>(
    ROUTE_USAGE_TYPES_MOCK,
    type => `${type.name} ${type.description}`
  );

  readonly fareCategoryTypes = new CatalogStore<FareCategoryType>(
    FARE_CATEGORY_TYPES_MOCK,
    type => `${type.name} ${type.description}`
  );

  readonly seatTypes = new CatalogStore<SeatType>(
    SEAT_TYPES_MOCK,
    type => `${type.code} ${type.name} ${type.description}`
  );

  readonly salesChannels = new CatalogStore<SalesChannel>(
    SALES_CHANNELS_MOCK,
    channel => `${channel.code} ${channel.name}`
  );
}
