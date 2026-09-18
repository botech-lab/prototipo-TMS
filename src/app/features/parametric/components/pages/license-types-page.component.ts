import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { LicenseTypeEntry } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { DESCRIPTION_FIELD, nameField } from './catalog-fields';
import { optionalText, statusCell } from './catalog-cells';

/** Categorías de licencias de conducción habilitadas. */
@Component({
  selector: 'app-license-types-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Tipos de Licencia"
      subtitle="Categorías de licencias de conducción habilitadas"
      icon="license"
      actionLabel="Nueva licencia"
      searchPlaceholder="Buscar tipo de licencia"
      emptyTitle="Sin tipos de licencia"
      emptyMessage="No hay tipos de licencia que coincidan con la búsqueda."
      [store]="catalogs.licenseTypes"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="lic" />
  `
})
export class LicenseTypesPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    nameField('Nombre', 'Categoría C'),
    DESCRIPTION_FIELD,
    { key: 'validityMonths', label: 'Vigencia (meses)', kind: 'number', nullable: true, min: 1, step: 1, half: true, placeholder: 'Sin definir' }
  ];

  /** `60 meses`, o vacío cuando la categoría no declara vigencia. */
  private validity(type: LicenseTypeEntry): string {
    if (type.validityMonths === null) {
      return '';
    }
    return type.validityMonths === 1 ? '1 mes' : `${type.validityMonths} meses`;
  }

  protected readonly columns: readonly TableColumn<LicenseTypeEntry>[] = [
    { key: 'name', label: 'Nombre', width: '220px', cell: type => ({ kind: 'strong', value: type.name }) },
    { key: 'description', label: 'Descripción', cell: type => optionalText(type.description) },
    { key: 'validity', label: 'Vigencia', align: 'center', width: '150px', showFrom: 'sm', cell: type => optionalText(this.validity(type)) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<LicenseTypeEntry> = {
    badge: type => type.validityMonths === null ? 'SIN VIGENCIA' : `${type.validityMonths} M`,
    status: statusCell,
    title: type => type.name,
    subtitle: type => type.description,
    isEnabled: type => type.status === 'ACTIVO',
    details: [
      { label: 'Descripción', cell: type => optionalText(type.description) },
      { label: 'Vigencia', cell: type => optionalText(this.validity(type)) }
    ],
    metric: type => ({ icon: 'license', value: this.validity(type) || 'Vigencia no definida' })
  };
}
