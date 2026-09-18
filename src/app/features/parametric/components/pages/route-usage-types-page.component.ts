import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { RouteUsageType } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { DESCRIPTION_FIELD, flagField, nameField } from './catalog-fields';
import { optionalText, propertyTags, statusCell } from './catalog-cells';

/** Clasificación del uso asignado a una ruta maestra. */
@Component({
  selector: 'app-route-usage-types-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Tipos de Uso de Ruta"
      subtitle="Clasificación del uso asignado a una ruta maestra"
      icon="route"
      actionLabel="Nuevo tipo de uso"
      searchPlaceholder="Buscar tipo de uso de ruta"
      emptyTitle="Sin tipos de uso"
      emptyMessage="No hay tipos de uso de ruta que coincidan con la búsqueda."
      [store]="catalogs.routeUsageTypes"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="rut" />
  `
})
export class RouteUsageTypesPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    nameField(),
    DESCRIPTION_FIELD,
    flagField('isDefault', 'Uso por defecto'),
    flagField('appliesConfiguration', 'Aplica configuración'),
    flagField('appliesCard', 'Aplica tarjeta')
  ];

  private properties(usage: RouteUsageType) {
    return propertyTags([
      { label: 'Por defecto', on: usage.isDefault },
      { label: 'Aplica configuración', on: usage.appliesConfiguration },
      { label: 'Aplica tarjeta', on: usage.appliesCard }
    ]);
  }

  protected readonly columns: readonly TableColumn<RouteUsageType>[] = [
    { key: 'name', label: 'Nombre', width: '200px', cell: u => ({ kind: 'strong', value: u.name }) },
    { key: 'description', label: 'Descripción', cell: u => optionalText(u.description) },
    { key: 'properties', label: 'Propiedades', width: '320px', showFrom: 'md', cell: u => this.properties(u) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<RouteUsageType> = {
    badge: u => u.isDefault ? 'POR DEFECTO' : 'OPCIONAL',
    status: statusCell,
    title: u => u.name,
    subtitle: u => u.description,
    isEnabled: u => u.status === 'ACTIVO',
    details: [
      { label: 'Descripción', cell: u => optionalText(u.description) },
      { label: 'Propiedades', cell: u => this.properties(u) }
    ],
    metric: u => ({
      icon: 'signpost',
      value: u.isDefault ? 'Uso asignado por defecto' : 'Uso opcional'
    })
  };
}
