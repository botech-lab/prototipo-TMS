import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardDefinition, RecordField, TableColumn } from '@models';
import { IncidentType } from '../../models/parametric.model';
import { ParametricCatalogsService } from '../../services/parametric-catalogs.service';
import { CatalogShellComponent } from '../catalog-shell/catalog-shell.component';
import { DESCRIPTION_FIELD, flagField, nameField } from './catalog-fields';
import { optionalText, propertyTags, severityTone, statusCell } from './catalog-cells';

/** Clasificación de eventos y situaciones operativas. */
@Component({
  selector: 'app-incident-types-page',
  imports: [CatalogShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog-shell
      title="Tipos de Incidencia"
      subtitle="Clasificación de eventos y situaciones operativas"
      icon="incident"
      actionLabel="Nueva incidencia"
      searchPlaceholder="Buscar tipo de incidencia"
      emptyTitle="Sin tipos de incidencia"
      emptyMessage="No hay tipos de incidencia que coincidan con la búsqueda."
      [store]="catalogs.incidentTypes"
      [columns]="columns"
      [cardDefinition]="cardDefinition"
      [formFields]="formFields"
      idPrefix="inc" />
  `
})
export class IncidentTypesPageComponent {
  protected readonly catalogs = inject(ParametricCatalogsService);

  protected readonly formFields: readonly RecordField[] = [
    nameField(),
    DESCRIPTION_FIELD,
    {
      key: 'severity', label: 'Severidad', kind: 'select', required: true, half: true,
      options: [
        { value: 'BAJO', label: 'Bajo' },
        { value: 'MEDIO', label: 'Medio' },
        { value: 'ALTO', label: 'Alto' },
        { value: 'CRITICA', label: 'Crítica' }
      ]
    },
    flagField('impactsDispatch', 'Impacta el despacho'),
    flagField('requiresEscalation', 'Requiere escalamiento')
  ];

  /** Consecuencias operativas activas de la incidencia. */
  private properties(incident: IncidentType) {
    return propertyTags([
      { label: 'Impacta despacho', on: incident.impactsDispatch },
      { label: 'Req. escalamiento', on: incident.requiresEscalation }
    ]);
  }

  protected readonly columns: readonly TableColumn<IncidentType>[] = [
    { key: 'name', label: 'Nombre', width: '200px', cell: incident => ({ kind: 'strong', value: incident.name }) },
    { key: 'description', label: 'Descripción', cell: incident => optionalText(incident.description) },
    {
      key: 'severity',
      label: 'Severidad',
      width: '140px',
      cell: incident => ({ kind: 'chip', value: incident.severity, tone: severityTone(incident.severity) })
    },
    { key: 'properties', label: 'Propiedades', width: '260px', showFrom: 'md', cell: incident => this.properties(incident) },
    { key: 'status', label: 'Estado', width: '140px', cell: statusCell }
  ];

  protected readonly cardDefinition: CardDefinition<IncidentType> = {
    // El badge lleva la SEVERIDAD -que es lo que decide la reacción operativa-
    // y el chip conserva el estado del registro, como en el resto de catálogos.
    badge: incident => incident.severity,
    status: statusCell,
    title: incident => incident.name,
    subtitle: incident => incident.description,
    isEnabled: incident => incident.status === 'ACTIVO',
    details: [
      { label: 'Descripción', cell: incident => optionalText(incident.description) },
      { label: 'Severidad', cell: incident => ({ kind: 'chip', value: incident.severity, tone: severityTone(incident.severity) }) },
      { label: 'Consecuencias', cell: incident => this.properties(incident) }
    ],
    metric: incident => ({
      icon: 'alert',
      value: incident.requiresEscalation ? 'Requiere escalamiento' : 'Gestión local'
    })
  };
}
