import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, RecordValues, TableColumn } from '@models';
import { Currency } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { codeField, flagField, nameField } from './catalog-fields';
import { flagChip, statusCell } from './catalog-cells';

/** Monedas utilizadas para tarifas y pagos. */
@Component({
  selector: 'app-currencies-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Monedas"
      subtitle="Monedas utilizadas para tarifas y pagos"
      icon="currency"
      actionLabel="Nueva moneda"
      searchPlaceholder="Buscar moneda"
      emptyTitle="Sin monedas"
      emptyMessage="No hay monedas que coincidan con la búsqueda."
      [store]="catalogs.currencies"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      [formValidator]="validatePrimary"
      idPrefix="cur" />
  `
})
export class CurrenciesPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  /** Solo una divisa base: se avisa en línea, nunca se desmarca la otra en silencio. */
  protected readonly validatePrimary = (values: RecordValues, row: Currency | null): Readonly<Record<string, string>> => {
    if (!values['isPrimary']) {
      return {};
    }
    const other = this.catalogs.currencies.all().find(c => c.isPrimary && c.id !== row?.id);
    return other ? { isPrimary: `Ya hay una moneda principal: ${other.code}` } : {};
  };

  protected readonly formFields: readonly RecordField[] = [
    codeField('Código ISO', 'BOB'),
    { key: 'symbol', label: 'Símbolo', kind: 'text', required: true, half: true, placeholder: 'Bs' },
    nameField('Nombre', 'Boliviano'),
    { key: 'decimals', label: 'Decimales', kind: 'number', required: true, min: 0, max: 4, step: 1, half: true, placeholder: '2' },
    flagField('isPrimary', 'Moneda principal')
  ];

  protected readonly columns: readonly TableColumn<Currency>[] = [
    { key: 'code', label: 'Código ISO', width: '120px', cell: c => ({ kind: 'strong', value: c.code }) },
    { key: 'name', label: 'Nombre', cell: c => ({ kind: 'text', value: c.name }) },
    { key: 'symbol', label: 'Símbolo', align: 'center', width: '110px', showFrom: 'sm', cell: c => ({ kind: 'numeric', value: c.symbol }) },
    { key: 'decimals', label: 'Decimales', align: 'center', width: '120px', showFrom: 'md', cell: c => ({ kind: 'numeric', value: String(c.decimals) }) },
    { key: 'isPrimary', label: 'Principal', width: '140px', showFrom: 'sm', cell: c => flagChip(c.isPrimary, 'PRINCIPAL') },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<Currency> = {
    badge: c => c.code,
    status: statusCell,
    title: c => c.name,
    subtitle: c => `Símbolo ${c.symbol}`,
    isEnabled: c => c.status === 'ACTIVO',
    details: [
      { label: 'Símbolo', cell: c => ({ kind: 'text', value: c.symbol }) },
      { label: 'Decimales', cell: c => ({ kind: 'numeric', value: String(c.decimals) }) },
      { label: 'Principal', cell: c => flagChip(c.isPrimary, 'PRINCIPAL') }
    ],
    metric: c => ({
      icon: 'coins',
      value: c.isPrimary ? 'Divisa base del sistema' : `${c.decimals} decimales`
    })
  };
}
