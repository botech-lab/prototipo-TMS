import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { SalesChannel } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { codeField, flagField, nameField } from './catalog-fields';
import { optionalText, propertyTags, statusCell } from './catalog-cells';

/** Canales y comisiones aplicables a la venta de servicios. */
@Component({
  selector: 'app-sales-channels-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Canales de Venta"
      subtitle="Canales y comisiones aplicables a la venta de servicios"
      icon="channel"
      actionLabel="Nuevo canal"
      searchPlaceholder="Buscar canal de venta"
      emptyTitle="Sin canales de venta"
      emptyMessage="No hay canales de venta que coincidan con la búsqueda."
      [store]="catalogs.salesChannels"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="chn" />
  `
})
export class SalesChannelsPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    codeField('Código', 'WEB'),
    { key: 'commissionPercent', label: 'Comisión (%)', kind: 'number', nullable: true, min: 0, max: 100, step: 0.01, half: true, placeholder: 'Sin comisión' },
    nameField('Nombre', 'Venta web'),
    flagField('isAgent', 'Opera con agente'),
    flagField('isApi', 'Integración API')
  ];

  /** Naturaleza operativa del canal: humano, integrado, o sin declarar. */
  private properties(channel: SalesChannel) {
    return propertyTags([
      { label: 'Agente', on: channel.isAgent },
      { label: 'API', on: channel.isApi }
    ]);
  }

  /** `0%` es un dato; `null` significa que el canal no declara comisión. */
  private commission(channel: SalesChannel): string {
    return channel.commissionPercent === null ? '' : `${channel.commissionPercent}%`;
  }

  protected readonly columns: readonly TableColumn<SalesChannel>[] = [
    { key: 'code', label: 'Código', width: '180px', cell: c => ({ kind: 'strong', value: c.code }) },
    { key: 'name', label: 'Nombre', cell: c => ({ kind: 'text', value: c.name }) },
    { key: 'commission', label: 'Comisión %', align: 'right', width: '140px', showFrom: 'sm', cell: c => optionalText(this.commission(c)) },
    { key: 'properties', label: 'Propiedades', width: '180px', showFrom: 'md', cell: c => this.properties(c) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<SalesChannel> = {
    badge: c => c.code,
    status: statusCell,
    title: c => c.name,
    subtitle: c => this.commission(c) ? `Comisión ${this.commission(c)}` : 'Sin comisión declarada',
    isEnabled: c => c.status === 'ACTIVO',
    details: [
      { label: 'Comisión', cell: c => optionalText(this.commission(c)) },
      { label: 'Propiedades', cell: c => this.properties(c) }
    ],
    metric: c => ({
      icon: 'cart',
      value: c.isApi ? 'Canal integrado' : c.isAgent ? 'Canal con agente' : 'Canal directo'
    })
  };
}
