import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { Person } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { catalogOptions, nameField } from './catalog-fields';
import { statusCell } from './catalog-cells';

/** Registro de personas naturales. */
@Component({
  selector: 'app-people-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Personas"
      subtitle="Registro de personas naturales (base de conductores, pasajeros y contactos)"
      icon="person"
      actionLabel="Nueva persona"
      searchPlaceholder="Buscar por nombre o documento"
      emptyTitle="Sin personas"
      emptyMessage="No hay personas que coincidan con la búsqueda."
      [store]="catalogs.people"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields()"
      idPrefix="per" />
  `
})
export class PeoplePageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  /** Tipo de documento como select del catálogo de tipos de documento (por código). */
  protected readonly formFields = computed<readonly RecordField[]>(() => [
    nameField('Nombre completo'),
    {
      key: 'documentType', label: 'Tipo de documento', kind: 'select', required: true, half: true,
      options: catalogOptions(this.catalogs.documentTypes.all(), type => type.code, type => `${type.code} · ${type.name}`)
    },
    { key: 'documentNumber', label: 'Número de documento', kind: 'text', required: true, half: true, placeholder: '6543210' },
    { key: 'phone', label: 'Teléfono', kind: 'text', required: true, half: true, placeholder: '70123456' },
    { key: 'email', label: 'Email', kind: 'text', half: true, placeholder: 'nombre@correo.com' }
  ]);

  protected readonly columns: readonly TableColumn<Person>[] = [
    { key: 'name', label: 'Nombre completo', cell: person => ({ kind: 'strong', value: person.name }) },
    { key: 'document', label: 'Documento', width: '170px', cell: person => ({ kind: 'stacked', value: person.documentNumber, caption: person.documentType }) },
    { key: 'phone', label: 'Teléfono', width: '140px', showFrom: 'sm', cell: person => ({ kind: 'numeric', value: person.phone }) },
    { key: 'email', label: 'Email', showFrom: 'md', cell: person => ({ kind: 'text', value: person.email }) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<Person> = {
    badge: person => `${person.documentType} ${person.documentNumber}`,
    status: statusCell,
    title: person => person.name,
    subtitle: person => person.email,
    isEnabled: person => person.status === 'ACTIVO',
    details: [
      { label: 'Documento', cell: person => ({ kind: 'text', value: `${person.documentType} ${person.documentNumber}` }) },
      { label: 'Teléfono', cell: person => ({ kind: 'text', value: person.phone }) },
      { label: 'Email', cell: person => ({ kind: 'text', value: person.email }) }
    ],
    metric: person => ({ icon: 'person', value: person.phone })
  };
}
