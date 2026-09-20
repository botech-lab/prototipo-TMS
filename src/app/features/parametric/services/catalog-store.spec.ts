import {
  CARGO_TYPES_MOCK,
  CITIES_MOCK,
  CURRENCIES_MOCK,
  DEPARTMENTS_MOCK,
  DOCUMENT_TYPES_MOCK,
  FARE_CATEGORY_TYPES_MOCK,
  INCIDENT_TYPES_MOCK,
  LICENSE_TYPES_MOCK,
  PAYMENT_METHODS_MOCK,
  PEOPLE_MOCK,
  ROUTE_USAGE_TYPES_MOCK,
  SALES_CHANNELS_MOCK,
  SEAT_TYPES_MOCK,
  SURCHARGE_TYPES_MOCK,
  VEHICLE_TYPES_MOCK
} from '../data/parametric.mock';
import { City } from '../models/parametric.model';
import { CatalogStore } from './catalog-store';

function buildStore(): CatalogStore<City> {
  return new CatalogStore<City>(
    CITIES_MOCK,
    city => `${city.name} ${city.department} ${city.postalCode}`
  );
}

describe('INTEGRITY GUARDIAN: Store de Catálogo', () => {

  describe('Integridad de los datos semilla', () => {
    const catalogs = [
      { name: 'ciudades', rows: CITIES_MOCK, expected: 21 },
      { name: 'departamentos', rows: DEPARTMENTS_MOCK, expected: 11 },
      { name: 'personas', rows: PEOPLE_MOCK, expected: 6 },
      { name: 'tipos de carga', rows: CARGO_TYPES_MOCK, expected: 8 },
      { name: 'tipos de vehículo', rows: VEHICLE_TYPES_MOCK, expected: 7 },
      { name: 'tipos de documento', rows: DOCUMENT_TYPES_MOCK, expected: 8 },
      { name: 'tipos de incidencia', rows: INCIDENT_TYPES_MOCK, expected: 9 },
      { name: 'tipos de licencia', rows: LICENSE_TYPES_MOCK, expected: 6 },
      { name: 'tipos de recargo', rows: SURCHARGE_TYPES_MOCK, expected: 6 },
      { name: 'métodos de pago', rows: PAYMENT_METHODS_MOCK, expected: 7 },
      { name: 'monedas', rows: CURRENCIES_MOCK, expected: 6 },
      { name: 'tipos de uso de ruta', rows: ROUTE_USAGE_TYPES_MOCK, expected: 8 },
      // 9 de aletadev + 2 ★ Nuevo (Niño, Tercera edad) que pide el asistente de rutas maestras.
      { name: 'categorías de tarifa', rows: FARE_CATEGORY_TYPES_MOCK, expected: 11 },
      { name: 'tipos de asiento', rows: SEAT_TYPES_MOCK, expected: 7 },
      { name: 'canales de venta', rows: SALES_CHANNELS_MOCK, expected: 12 }
    ];

    it('cada catálogo debe traer el número de registros esperado', () => {
      for (const catalog of catalogs) {
        expect(catalog.rows.length).withContext(catalog.name).toBe(catalog.expected);
      }
    });

    it('ningún catálogo debe repetir identificadores', () => {
      for (const catalog of catalogs) {
        const ids = catalog.rows.map(row => row.id);
        expect(new Set(ids).size).withContext(catalog.name).toBe(ids.length);
      }
    });

    it('todo registro debe tener nombre y estado válido', () => {
      for (const catalog of catalogs) {
        for (const row of catalog.rows) {
          expect(row.name.length).withContext(`${catalog.name} · ${row.id}`).toBeGreaterThan(0);
          expect(['ACTIVO', 'INACTIVO']).withContext(`${catalog.name} · ${row.id}`)
            .toContain(row.status);
        }
      }
    });

    it('solo una moneda puede ser la divisa base del sistema', () => {
      expect(CURRENCIES_MOCK.filter(currency => currency.isPrimary).length).toBe(1);
      expect(CURRENCIES_MOCK.find(currency => currency.isPrimary)?.code).toBe('BOB');
    });

    it('los canales de venta deben paginarse en 2 páginas', () => {
      // 12 registros con página de 10 → "Muestra 1–10 de 12".
      expect(SALES_CHANNELS_MOCK.length).toBeGreaterThan(10);
    });
  });

  describe('Paginación', () => {
    it('debe entregar como máximo una página de registros', () => {
      const store = buildStore();
      expect(store.pageRows().length).toBe(10);
      expect(store.pageInfo().label).toBe('Muestra 1–10 de 21');
    });

    it('la última página debe traer solo el resto', () => {
      const store = buildStore();
      store.setPage(2);
      expect(store.pageRows().length).toBe(1);
    });

    it('las páginas no deben solaparse ni perder registros', () => {
      const store = buildStore();
      const seen: string[] = [];

      for (let page = 0; page < store.pageInfo().totalPages; page++) {
        store.setPage(page);
        seen.push(...store.pageRows().map(city => city.id));
      }

      expect(seen.length).toBe(CITIES_MOCK.length);
      expect(new Set(seen).size).toBe(CITIES_MOCK.length);
    });
  });

  describe('Búsqueda', () => {
    it('debe filtrar por cualquiera de los campos declarados', () => {
      const store = buildStore();

      store.setSearch('cochabamba');
      expect(store.filtered().length).toBe(3);

      store.setSearch('0100');
      expect(store.filtered()[0].name).toBe('La Paz');
    });

    it('debe ser indiferente a mayúsculas y espacios', () => {
      const store = buildStore();
      store.setSearch('  EL ALTO  ');
      expect(store.filtered().length).toBe(1);
    });

    it('INVARIANTE: buscar debe devolver la vista a la primera página', () => {
      const store = buildStore();
      store.setPage(2);
      expect(store.pageIndex()).toBe(2);

      store.setSearch('la paz');
      // Sin este reinicio la tabla quedaría vacía sin motivo aparente.
      expect(store.pageIndex()).toBe(0);
      expect(store.pageRows().length).toBeGreaterThan(0);
    });

    it('una búsqueda sin resultados debe dar rango 0–0', () => {
      const store = buildStore();
      store.setSearch('zzzzz');
      expect(store.filtered().length).toBe(0);
      expect(store.pageInfo().label).toBe('Muestra 0–0 de 0');
    });
  });

  describe('Mutaciones inmutables', () => {
    it('eliminar debe quitar el registro sin tocar la semilla original', () => {
      const store = buildStore();
      store.remove('cty-la-paz');

      expect(store.totalCount()).toBe(20);
      expect(store.all().some(city => city.id === 'cty-la-paz')).toBeFalse();
      // La constante compartida no debe haber sido mutada.
      expect(CITIES_MOCK.length).toBe(21);
    });

    it('eliminar debe reajustar la página si queda fuera de rango', () => {
      const store = buildStore();
      store.setPage(2); // última página, con 1 solo registro
      store.remove(store.pageRows()[0].id);

      expect(store.pageIndex()).toBe(1);
      expect(store.pageRows().length).toBeGreaterThan(0);
    });

    it('alternar estado debe invertir solo el registro indicado', () => {
      const store = buildStore();
      const before = store.activeCount();

      store.toggleStatus('cty-la-paz');
      expect(store.activeCount()).toBe(before - 1);
      expect(store.all().find(city => city.id === 'cty-la-paz')?.status).toBe('INACTIVO');

      store.toggleStatus('cty-la-paz');
      expect(store.activeCount()).toBe(before);
    });

    it('el recuento de activos debe ignorar los inactivos de la semilla', () => {
      const store = buildStore();
      // 'Ciudad1' viene INACTIVO en los datos reales.
      expect(store.activeCount()).toBe(20);
    });
  });
});
