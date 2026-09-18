import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { PaymentMethod } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { DESCRIPTION_FIELD, flagField, nameField } from './catalog-fields';
import { optionalText, propertyTags, statusCell } from './catalog-cells';

/** Medios de cobro aceptados por el sistema. */
@Component({
  selector: 'app-payment-methods-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Métodos de Pago"
      subtitle="Medios de cobro aceptados por el sistema"
      icon="payment"
      actionLabel="Nuevo método"
      searchPlaceholder="Buscar método de pago"
      emptyTitle="Sin métodos de pago"
      emptyMessage="No hay métodos de pago que coincidan con la búsqueda."
      [store]="catalogs.paymentMethods"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="pay" />
  `
})
export class PaymentMethodsPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    nameField(),
    DESCRIPTION_FIELD,
    flagField('appliesToCargo', 'Aplica a carga'),
    flagField('appliesToTicket', 'Aplica a boletos')
  ];

  /** Módulos donde el medio de cobro está habilitado. */
  private scope(method: PaymentMethod) {
    return propertyTags([
      { label: 'Carga', on: method.appliesToCargo },
      { label: 'Boleto', on: method.appliesToTicket }
    ]);
  }

  protected readonly columns: readonly TableColumn<PaymentMethod>[] = [
    { key: 'name', label: 'Nombre', width: '230px', cell: m => ({ kind: 'strong', value: m.name }) },
    { key: 'description', label: 'Descripción', cell: m => optionalText(m.description) },
    { key: 'scope', label: 'Aplica a', width: '190px', showFrom: 'md', cell: m => this.scope(m) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<PaymentMethod> = {
    badge: m => {
      if (m.appliesToCargo && m.appliesToTicket) return 'CARGA + BOLETO';
      if (m.appliesToCargo) return 'CARGA';
      return m.appliesToTicket ? 'BOLETO' : 'SIN ÁMBITO';
    },
    status: statusCell,
    title: m => m.name,
    subtitle: m => m.description,
    isEnabled: m => m.status === 'ACTIVO',
    details: [
      { label: 'Descripción', cell: m => optionalText(m.description) },
      { label: 'Aplica a', cell: m => this.scope(m) }
    ],
    metric: m => ({
      icon: 'card',
      value: m.appliesToCargo || m.appliesToTicket ? 'Medio habilitado' : 'Sin ámbito asignado'
    })
  };
}
