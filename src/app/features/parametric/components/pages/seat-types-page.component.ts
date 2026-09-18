import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { SeatType } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { DESCRIPTION_FIELD, codeField, nameField } from './catalog-fields';
import { optionalText, statusCell } from './catalog-cells';

/** Clasificación de los tipos de asiento disponibles en los vehículos. */
@Component({
  selector: 'app-seat-types-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Tipos de Asiento"
      subtitle="Clasificación de los tipos de asiento disponibles en los vehículos"
      icon="seat"
      actionLabel="Nuevo tipo de asiento"
      searchPlaceholder="Buscar tipo de asiento"
      emptyTitle="Sin tipos de asiento"
      emptyMessage="No hay tipos de asiento que coincidan con la búsqueda."
      [store]="catalogs.seatTypes"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="seat" />
  `
})
export class SeatTypesPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    codeField('Código', 'SEM'),
    nameField('Nombre', 'Semicama'),
    DESCRIPTION_FIELD
  ];

  protected readonly columns: readonly TableColumn<SeatType>[] = [
    { key: 'code', label: 'Código', width: '120px', cell: s => ({ kind: 'strong', value: s.code }) },
    { key: 'name', label: 'Nombre', width: '240px', cell: s => ({ kind: 'text', value: s.name }) },
    { key: 'description', label: 'Descripción', showFrom: 'md', cell: s => optionalText(s.description) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<SeatType> = {
    badge: s => s.code,
    status: statusCell,
    title: s => s.name,
    subtitle: s => s.description,
    isEnabled: s => s.status === 'ACTIVO',
    details: [
      { label: 'Código', cell: s => ({ kind: 'text', value: s.code }) },
      { label: 'Descripción', cell: s => optionalText(s.description) }
    ],
    metric: s => ({ icon: 'seat', value: `Código ${s.code}` })
  };
}
