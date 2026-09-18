import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { CargoType } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { DESCRIPTION_FIELD, flagField, nameField } from './catalog-fields';
import { optionalText, propertyTags, statusCell } from './catalog-cells';

/** Clasificación y requerimientos técnicos de mercancías. */
@Component({
  selector: 'app-cargo-types-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Tipos de Carga"
      subtitle="Clasificación y requerimientos técnicos de mercancías"
      icon="cargo"
      actionLabel="Nuevo tipo"
      searchPlaceholder="Buscar tipo de carga"
      emptyTitle="Sin tipos de carga"
      emptyMessage="No hay tipos de carga que coincidan con la búsqueda."
      [store]="catalogs.cargoTypes"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="crg" />
  `
})
export class CargoTypesPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    nameField(),
    DESCRIPTION_FIELD,
    flagField('requiresCold', 'Requiere cadena de frío'),
    flagField('requiresInsurance', 'Requiere seguro'),
    flagField('requiresDocumentation', 'Requiere documentación')
  ];

  /** Requerimientos técnicos activos de la mercancía. */
  private properties(cargo: CargoType) {
    return propertyTags([
      { label: 'Frío', on: cargo.requiresCold },
      { label: 'Seguro', on: cargo.requiresInsurance },
      { label: 'Doc', on: cargo.requiresDocumentation }
    ]);
  }

  protected readonly columns: readonly TableColumn<CargoType>[] = [
    { key: 'name', label: 'Nombre', width: '210px', cell: cargo => ({ kind: 'strong', value: cargo.name }) },
    { key: 'description', label: 'Descripción', cell: cargo => optionalText(cargo.description) },
    { key: 'properties', label: 'Propiedades', width: '220px', showFrom: 'md', cell: cargo => this.properties(cargo) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<CargoType> = {
    // Sin código propio, el badge resume los requerimientos técnicos en vez
    // de repetir el nombre que ya ocupa el título.
    badge: cargo => {
      const count = [cargo.requiresCold, cargo.requiresInsurance, cargo.requiresDocumentation]
        .filter(Boolean).length;
      return count === 0 ? 'SIN REQ.' : `${count} REQ.`;
    },
    status: statusCell,
    title: cargo => cargo.name,
    subtitle: cargo => cargo.description,
    isEnabled: cargo => cargo.status === 'ACTIVO',
    details: [
      { label: 'Descripción', cell: cargo => optionalText(cargo.description) },
      { label: 'Propiedades', cell: cargo => this.properties(cargo) }
    ],
    metric: cargo => ({
      icon: 'box',
      value: cargo.requiresCold ? 'Requiere cadena de frío' : 'Sin cadena de frío'
    })
  };
}
