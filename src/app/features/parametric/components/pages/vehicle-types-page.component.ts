import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { VehicleTypeEntry } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { DESCRIPTION_FIELD, nameField } from './catalog-fields';
import { optionalText, statusCell } from './catalog-cells';

/** Clasificación de la flota por capacidad y categoría. */
@Component({
  selector: 'app-vehicle-types-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Tipos de Vehículo"
      subtitle="Clasificación de la flota por capacidad y categoría"
      icon="fleet"
      actionLabel="Nuevo tipo"
      searchPlaceholder="Buscar tipo de vehículo"
      emptyTitle="Sin tipos de vehículo"
      emptyMessage="No hay tipos de vehículo que coincidan con la búsqueda."
      [store]="catalogs.vehicleTypes"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="vt" />
  `
})
export class VehicleTypesPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    nameField(),
    DESCRIPTION_FIELD,
    { key: 'maxWeightKg', label: 'Carga máx. (kg)', kind: 'number', nullable: true, min: 0, step: 1, half: true, placeholder: 'No aplica' },
    { key: 'maxVolumeM3', label: 'Volumen máx. (m³)', kind: 'number', nullable: true, min: 0, step: 0.1, half: true, placeholder: 'No aplica' },
    { key: 'requiredLicense', label: 'Licencia requerida', kind: 'text', uppercase: true, nullable: true, half: true, placeholder: 'C', hint: 'Letra de la categoría' }
  ];

  /** `5000 kg / 20 m³`, o vacío cuando el tipo no declara capacidad. */
  private capacity(type: VehicleTypeEntry): string {
    if (type.maxWeightKg === null && type.maxVolumeM3 === null) {
      return '';
    }
    const parts: string[] = [];
    if (type.maxWeightKg !== null) {
      parts.push(`${type.maxWeightKg} kg`);
    }
    if (type.maxVolumeM3 !== null) {
      parts.push(`${type.maxVolumeM3} m³`);
    }
    return parts.join(' / ');
  }

  protected readonly columns: readonly TableColumn<VehicleTypeEntry>[] = [
    { key: 'name', label: 'Nombre', width: '200px', cell: type => ({ kind: 'strong', value: type.name }) },
    { key: 'description', label: 'Descripción', cell: type => optionalText(type.description) },
    { key: 'capacity', label: 'Capacidad máx.', width: '190px', showFrom: 'md', cell: type => optionalText(this.capacity(type)) },
    { key: 'license', label: 'Licencia req.', align: 'center', width: '130px', showFrom: 'sm', cell: type => optionalText(type.requiredLicense) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<VehicleTypeEntry> = {
    badge: type => type.requiredLicense ? `LIC. ${type.requiredLicense}` : 'SIN LIC.',
    status: statusCell,
    title: type => type.name,
    subtitle: type => type.description,
    isEnabled: type => type.status === 'ACTIVO',
    details: [
      { label: 'Descripción', cell: type => optionalText(type.description) },
      { label: 'Capacidad', cell: type => optionalText(this.capacity(type)) },
      { label: 'Licencia', cell: type => optionalText(type.requiredLicense) }
    ],
    metric: type => ({ icon: 'bus', value: this.capacity(type) || 'Sin capacidad declarada' })
  };
}
