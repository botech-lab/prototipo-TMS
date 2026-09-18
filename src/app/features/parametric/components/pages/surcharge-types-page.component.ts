import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { SurchargeMethod, SurchargeType } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { DESCRIPTION_FIELD, nameField } from './catalog-fields';
import { optionalText, statusCell } from './catalog-cells';

/** Rótulo visible de cada método de cálculo. */
const METHOD_LABELS: Readonly<Record<SurchargeMethod, string>> = {
  PERCENT: '%',
  FIXED: 'FIJO',
  PER_KM: 'X KM'
};

/** Cargos adicionales aplicables a servicios y tarifas. */
@Component({
  selector: 'app-surcharge-types-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Tipos de Recargo"
      subtitle="Cargos adicionales aplicables a servicios y tarifas"
      icon="percent"
      actionLabel="Nuevo recargo"
      searchPlaceholder="Buscar tipo de recargo"
      emptyTitle="Sin tipos de recargo"
      emptyMessage="No hay tipos de recargo que coincidan con la búsqueda."
      [store]="catalogs.surchargeTypes"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="sur" />
  `
})
export class SurchargeTypesPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    nameField(),
    DESCRIPTION_FIELD,
    {
      key: 'method', label: 'Cálculo', kind: 'select', required: true, half: true,
      options: [
        { value: 'PERCENT', label: 'Porcentaje (%)' },
        { value: 'FIXED', label: 'Monto fijo' },
        { value: 'PER_KM', label: 'Por kilómetro' }
      ]
    },
    { key: 'value', label: 'Valor', kind: 'number', required: true, min: 0, step: 0.01, half: true, placeholder: '0' }
  ];

  /** El importe solo se entiende junto a su método: `2%`, `15 Bs`, `0 Bs/km`. */
  private formattedValue(surcharge: SurchargeType): string {
    switch (surcharge.method) {
      case 'PERCENT':
        return `${surcharge.value}%`;
      case 'PER_KM':
        return `${surcharge.value} Bs/km`;
      default:
        return `${surcharge.value} Bs`;
    }
  }

  protected readonly columns: readonly TableColumn<SurchargeType>[] = [
    { key: 'name', label: 'Nombre', width: '200px', cell: s => ({ kind: 'strong', value: s.name }) },
    { key: 'description', label: 'Descripción', cell: s => optionalText(s.description) },
    {
      key: 'method',
      label: 'Cálculo',
      align: 'center',
      width: '130px',
      showFrom: 'sm',
      cell: s => ({ kind: 'chip', value: METHOD_LABELS[s.method], tone: 'info' })
    },
    { key: 'value', label: 'Valor', align: 'right', width: '110px', showFrom: 'md', cell: s => ({ kind: 'numeric', value: String(s.value) }) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<SurchargeType> = {
    badge: s => METHOD_LABELS[s.method],
    status: statusCell,
    title: s => s.name,
    subtitle: s => s.description,
    isEnabled: s => s.status === 'ACTIVO',
    details: [
      { label: 'Descripción', cell: s => optionalText(s.description) },
      { label: 'Cálculo', cell: s => ({ kind: 'chip', value: METHOD_LABELS[s.method], tone: 'info' }) },
      { label: 'Valor', cell: s => ({ kind: 'numeric', value: this.formattedValue(s) }) }
    ],
    metric: s => ({ icon: 'percent', value: this.formattedValue(s) })
  };
}
