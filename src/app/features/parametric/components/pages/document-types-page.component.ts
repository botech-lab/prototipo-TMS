import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { DocumentTypeEntry } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { DESCRIPTION_FIELD, codeField, nameField } from './catalog-fields';
import { optionalText, statusCell } from './catalog-cells';

/** Clasificación de documentos requeridos por el sistema. */
@Component({
  selector: 'app-document-types-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Tipos de Documento"
      subtitle="Clasificación de documentos requeridos por el sistema"
      icon="document"
      actionLabel="Nuevo tipo"
      searchPlaceholder="Buscar tipo de documento"
      emptyTitle="Sin tipos de documento"
      emptyMessage="No hay tipos de documento que coincidan con la búsqueda."
      [store]="catalogs.documentTypes"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="doc" />
  `
})
export class DocumentTypesPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    codeField('Código', 'CI'),
    nameField('Nombre', 'Cédula de identidad'),
    DESCRIPTION_FIELD
  ];

  protected readonly columns: readonly TableColumn<DocumentTypeEntry>[] = [
    { key: 'code', label: 'Código', width: '140px', cell: type => ({ kind: 'strong', value: type.code }) },
    { key: 'name', label: 'Nombre', width: '280px', cell: type => ({ kind: 'text', value: type.name }) },
    { key: 'description', label: 'Descripción', showFrom: 'md', cell: type => optionalText(type.description) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<DocumentTypeEntry> = {
    badge: type => type.code,
    status: statusCell,
    title: type => type.name,
    subtitle: type => type.description,
    isEnabled: type => type.status === 'ACTIVO',
    details: [
      { label: 'Código', cell: type => ({ kind: 'text', value: type.code }) },
      { label: 'Descripción', cell: type => optionalText(type.description) }
    ],
    metric: type => ({ icon: 'doc', value: `Código ${type.code}` })
  };
}
