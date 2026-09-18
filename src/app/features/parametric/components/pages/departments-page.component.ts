import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { Department } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { codeField, nameField } from './catalog-fields';
import { statusCell } from './catalog-cells';

/** Departamentos y su ubicación dentro del país. */
@Component({
  selector: 'app-departments-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Departamentos"
      subtitle="Departamentos y su ubicación dentro del país"
      icon="map"
      actionLabel="Nuevo departamento"
      searchPlaceholder="Buscar departamento"
      emptyTitle="Sin departamentos"
      emptyMessage="No hay departamentos que coincidan con la búsqueda."
      [store]="catalogs.departments"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="dep" />
  `
})
export class DepartmentsPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    codeField('Código', 'LP'),
    { key: 'country', label: 'País', kind: 'text', required: true, half: true, placeholder: 'Bolivia' },
    nameField('Nombre', 'La Paz'),
    { key: 'capital', label: 'Capital', kind: 'text', required: true, placeholder: 'La Paz', hint: 'Nombre de la ciudad capital' }
  ];

  protected readonly columns: readonly TableColumn<Department>[] = [
    { key: 'code', label: 'Código', width: '110px', cell: department => ({ kind: 'strong', value: department.code }) },
    { key: 'name', label: 'Nombre', cell: department => ({ kind: 'text', value: department.name }) },
    { key: 'country', label: 'País', width: '150px', showFrom: 'sm', cell: department => ({ kind: 'text', value: department.country }) },
    { key: 'capital', label: 'Capital', width: '230px', showFrom: 'md', cell: department => ({ kind: 'text', value: department.capital }) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<Department> = {
    badge: department => department.code,
    status: statusCell,
    title: department => department.name,
    subtitle: department => department.country,
    isEnabled: department => department.status === 'ACTIVO',
    details: [
      { label: 'País', cell: department => ({ kind: 'text', value: department.country }) },
      { label: 'Capital', cell: department => ({ kind: 'text', value: department.capital }) }
    ],
    metric: department => ({ icon: 'map', value: `Capital: ${department.capital}` })
  };
}
