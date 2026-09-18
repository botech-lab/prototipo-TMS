import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { FareCategoryType } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { DESCRIPTION_FIELD, flagField, nameField } from './catalog-fields';
import { optionalText, propertyTags, statusCell } from './catalog-cells';

/** Clasificación de las categorías de tarifa disponibles. */
@Component({
  selector: 'app-fare-category-types-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Tipos de Categoría de Tarifa"
      subtitle="Clasificación de las categorías de tarifa disponibles"
      icon="fare"
      actionLabel="Nueva categoría"
      searchPlaceholder="Buscar tipo de categoria de tarifa"
      emptyTitle="Sin categorías de tarifa"
      emptyMessage="No hay categorías de tarifa que coincidan con la búsqueda."
      [store]="catalogs.fareCategoryTypes"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="fct" />
  `
})
export class FareCategoryTypesPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    nameField(),
    DESCRIPTION_FIELD,
    flagField('isDefault', 'Predeterminada'),
    flagField('appliesOta', 'Aplica OTA'),
    flagField('appliesAgent', 'Aplica agente'),
    flagField('visibleInPortal', 'Visible en portal')
  ];

  private properties(fare: FareCategoryType) {
    return propertyTags([
      { label: 'Predeterminada', on: fare.isDefault },
      { label: 'Aplica OTA', on: fare.appliesOta },
      { label: 'Aplica agente', on: fare.appliesAgent },
      { label: 'Visible en portal', on: fare.visibleInPortal }
    ]);
  }

  protected readonly columns: readonly TableColumn<FareCategoryType>[] = [
    { key: 'name', label: 'Nombre', width: '190px', cell: f => ({ kind: 'strong', value: f.name }) },
    { key: 'description', label: 'Descripción', cell: f => optionalText(f.description) },
    { key: 'properties', label: 'Propiedades', width: '360px', showFrom: 'md', cell: f => this.properties(f) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<FareCategoryType> = {
    badge: f => f.isDefault ? 'PREDETERMINADA' : 'ESPECÍFICA',
    status: statusCell,
    title: f => f.name,
    subtitle: f => f.description,
    isEnabled: f => f.status === 'ACTIVO',
    // Cuatro propiedades posibles: el escalón NORMAL de tarjeta las absorbe.
    bodyRows: 4,
    details: [
      { label: 'Descripción', cell: f => optionalText(f.description) },
      { label: 'Propiedades', cell: f => this.properties(f) }
    ],
    metric: f => ({
      icon: 'tag',
      value: f.visibleInPortal ? 'Visible en portal público' : 'Solo canales internos'
    })
  };
}
