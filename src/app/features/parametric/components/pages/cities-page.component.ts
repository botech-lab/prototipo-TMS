import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { City } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { catalogOptions, flagField, nameField } from './catalog-fields';
import { statusCell, statusTone } from './catalog-cells';

/** Catálogo de ciudades del sistema. */
@Component({
  selector: 'app-cities-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Ciudades"
      subtitle="Catálogo de ciudades del sistema"
      icon="city"
      actionLabel="Nueva ciudad"
      searchPlaceholder="Buscar por nombre"
      emptyTitle="Sin ciudades"
      emptyMessage="No hay ciudades que coincidan con la búsqueda."
      [store]="catalogs.cities"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields()"
      idPrefix="cty" />
  `
})
export class CitiesPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  /** Departamento como select del catálogo de departamentos (relación por nombre). */
  protected readonly formFields = computed<readonly RecordField[]>(() => [
    nameField('Nombre', 'Cochabamba'),
    { key: 'department', label: 'Departamento', kind: 'select', required: true, options: catalogOptions(this.catalogs.departments.all()) },
    { key: 'postalCode', label: 'Código postal', kind: 'text', required: true, half: true, placeholder: '0200' },
    flagField('isCapital', 'Capital departamental')
  ]);

  protected readonly columns: readonly TableColumn<City>[] = [
    { key: 'name', label: 'Nombre', cell: city => ({ kind: 'strong', value: city.name }) },
    { key: 'department', label: 'Departamento', width: '200px', cell: city => ({ kind: 'text', value: city.department }) },
    { key: 'postalCode', label: 'Código postal', width: '150px', showFrom: 'sm', cell: city => ({ kind: 'numeric', value: city.postalCode }) },
    { key: 'isCapital', label: 'Capital', align: 'center', width: '110px', showFrom: 'md', cell: city => ({ kind: 'text', value: city.isCapital ? 'Sí' : 'No' }) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<City> = {
    badge: city => city.postalCode,
    status: statusCell,
    title: city => city.name,
    subtitle: city => city.department,
    isEnabled: city => city.status === 'ACTIVO',
    details: [
      { label: 'Departamento', cell: city => ({ kind: 'text', value: city.department }) },
      { label: 'Código postal', cell: city => ({ kind: 'numeric', value: city.postalCode }) },
      { label: 'Capital', cell: city => ({ kind: 'text', value: city.isCapital ? 'Sí' : 'No' }) }
    ],
    metric: city => ({ icon: 'city', value: city.isCapital ? 'Capital departamental' : 'Ciudad' })
  };

  protected readonly statusTone = statusTone;
}
