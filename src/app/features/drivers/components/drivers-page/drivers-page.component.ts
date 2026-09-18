import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DataTableComponent } from '@components/data-table/data-table.component';
import { EntityCardGridComponent } from '@components/entity-card-grid/entity-card-grid.component';
import { FilterTabsComponent } from '@components/filter-tabs/filter-tabs.component';
import { PageHeaderComponent } from '@components/page-header/page-header.component';
import { SearchFieldComponent } from '@components/search-field/search-field.component';
import { ViewSwitcherComponent } from '@components/view-switcher/view-switcher.component';
import { responsiveViewMode } from '@components/view-switcher/responsive-view-mode';
import { RecordDrawerComponent } from '@components/record-drawer/record-drawer.component';
import { ToastService } from '@components/toast/toast.service';
import { CardBlock, CardDefinition, ChipTone, RecordField, RecordValue, RecordValues, RowAction, TableColumn } from '@models';
import { LICENSE_CATEGORIES } from '../../data/drivers.mock';
import { DocumentType, Driver, DriverStatus } from '../../models/driver.model';
import { DriverLicenseEngine } from '../../services/driver-license-engine';
import { DriversService } from '../../services/drivers.service';

/**
 * ============================================================================
 * MÓDULO DE CONDUCTORES (SMART CONTAINER)
 * ============================================================================
 * Añade a la tabla genérica un segundo eje de filtrado por pestañas de
 * categoría de licencia, resuelto íntegramente en `DriversService`.
 * ============================================================================
 */
@Component({
  selector: 'app-drivers-page',
  imports: [
    PageHeaderComponent,
    SearchFieldComponent,
    FilterTabsComponent,
    ViewSwitcherComponent,
    DataTableComponent,
    EntityCardGridComponent,
    RecordDrawerComponent
  ],
  templateUrl: './drivers-page.component.html',
  styleUrl: './drivers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DriversPageComponent {
  protected readonly driversService = inject(DriversService);
  private readonly toasts = inject(ToastService);

  // ==========================================
  // ALTA / EDICIÓN (drawer compartido)
  // ==========================================
  /**
   * Campos del padrón. La etiqueta de categoría se deriva del id al guardar;
   * la vigencia y el semáforo de licencia los sigue calculando el motor.
   */
  protected readonly formFields: readonly RecordField[] = [
    { key: 'fullName', label: 'Nombre completo', kind: 'text', required: true, placeholder: 'Juan Pérez Mamani' },
    {
      key: 'documentType', label: 'Tipo de documento', kind: 'select', required: true, half: true,
      options: [
        { value: 'CI', label: 'CI · Cédula' },
        { value: 'PAS', label: 'PAS · Pasaporte' },
        { value: 'NIT', label: 'NIT' }
      ]
    },
    { key: 'documentNumber', label: 'Nº de documento', kind: 'text', required: true, half: true, placeholder: '6543210' },
    {
      key: 'licenseCategoryId', label: 'Categoría de licencia', kind: 'select', required: true, half: true,
      options: LICENSE_CATEGORIES.map(category => ({ value: category.id, label: category.label }))
    },
    { key: 'licenseNumber', label: 'Nº de licencia', kind: 'text', required: true, half: true, uppercase: true, placeholder: 'LIC-000000' },
    { key: 'licenseIssued', label: 'Emisión', kind: 'date', nullable: true, half: true },
    { key: 'licenseExpiry', label: 'Vencimiento', kind: 'date', required: true, half: true },
    {
      key: 'status', label: 'Estado', kind: 'select', required: true,
      options: [
        { value: 'ACTIVO', label: 'Activo' },
        { value: 'INACTIVO', label: 'Inactivo' },
        { value: 'SUSPENDIDO', label: 'Suspendido' }
      ]
    }
  ];

  /** Conductor en edición (`row`) o alta (`row: null`), con sus valores iniciales. */
  protected readonly editor = signal<{ readonly row: Driver | null; readonly values: RecordValues } | null>(null);

  private openEditor(row: Driver | null): void {
    const values: Record<string, RecordValue> = row
      ? {
          fullName: row.fullName,
          documentType: row.documentType,
          documentNumber: row.documentNumber,
          licenseCategoryId: row.licenseCategoryId,
          licenseNumber: row.licenseNumber,
          licenseIssued: row.licenseIssued ?? null,
          licenseExpiry: row.licenseExpiry,
          status: row.status
        }
      : { documentType: 'CI', status: 'ACTIVO' };
    this.editor.set({ row, values });
  }

  protected onSave(values: RecordValues): void {
    const editing = this.editor();
    if (!editing) return;

    const categoryId = String(values['licenseCategoryId']);
    const data = {
      fullName: String(values['fullName']),
      documentType: values['documentType'] as DocumentType,
      documentNumber: String(values['documentNumber']),
      licenseCategoryId: categoryId,
      licenseCategoryLabel: LICENSE_CATEGORIES.find(category => category.id === categoryId)?.label ?? categoryId,
      licenseNumber: String(values['licenseNumber']),
      licenseIssued: values['licenseIssued'] ? String(values['licenseIssued']) : undefined,
      licenseExpiry: String(values['licenseExpiry']),
      status: values['status'] as DriverStatus
    };

    if (editing.row) {
      const original = editing.row;
      const updated: Driver = { ...original, ...data };
      this.driversService.update(updated);
      this.toasts.show(`Se guardaron los cambios de ${updated.fullName}`, {
        actionLabel: 'Deshacer',
        onAction: () => this.driversService.update(original)
      });
    } else {
      // Mismo formato que la semilla: `drv-<documento>`, con marca de tiempo para no chocar.
      const created: Driver = { id: `drv-${data.documentNumber.replace(/[^a-z0-9]/gi, '').toLowerCase()}-${Date.now().toString(36)}`, ...data };
      this.driversService.add(created);
      this.toasts.show(`Se registró a ${created.fullName}`, {
        actionLabel: 'Deshacer',
        onAction: () => this.driversService.remove(created.id)
      });
    }
    this.editor.set(null);
  }

  /** Modo de visualización activo. Estado puramente presentacional. */
  protected readonly viewMode = responsiveViewMode();

  protected readonly columns: readonly TableColumn<Driver>[] = [
    {
      key: 'driver',
      label: 'Conductor',
      cell: driver => ({ kind: 'strong', value: driver.fullName })
    },
    {
      key: 'document',
      label: 'Documento',
      width: '180px',
      cell: driver => ({
        kind: 'stacked',
        value: driver.documentNumber,
        caption: driver.documentType
      })
    },
    {
      key: 'license',
      label: 'Licencia',
      width: '220px',
      showFrom: 'sm',
      cell: driver => ({
        kind: 'stacked',
        value: driver.licenseCategoryLabel,
        caption: driver.licenseNumber
      })
    },
    {
      key: 'licenseExpiry',
      label: 'Vence licencia',
      align: 'center',
      width: '160px',
      showFrom: 'md',
      cell: driver => ({
        kind: 'stacked',
        value: this.formatDate(driver.licenseExpiry),
        caption: DriverLicenseEngine.calculate(driver).caption
      })
    },
    {
      key: 'status',
      label: 'Estado',
      width: '140px',
      cell: driver => ({
        kind: 'chip',
        value: driver.status,
        tone: this.statusTone(driver.status)
      })
    }
  ];

  /**
   * Proyección a las 7 ranuras de la tarjeta de entidad.
   * El documento de identidad ocupa el badge por ser el identificador
   * inmutable de la persona; el nombre queda como título legible.
   */
  protected readonly cardDefinition: CardDefinition<Driver> = {
    badge: driver => `${driver.documentType} ${driver.documentNumber}`,
    // Estado de la HABILITACIÓN, derivado del motor temporal: una licencia
    // vencida invalida al conductor aunque su ficha siga marcada como activa.
    status: driver => {
      const license = DriverLicenseEngine.calculate(driver);
      return { kind: 'chip', value: license.stateLabel, tone: this.licenseChipTone(license.state, license.tone) };
    },
    title: driver => driver.fullName,
    subtitle: driver => driver.licenseCategoryLabel,
    isEnabled: driver => driver.status === 'ACTIVO',
    // La ranura 5 la ocupa la retícula temporal: 4 filas equivalentes.
    bodyRows: 4,
    body: driver => this.licenseBlocks(driver),
    details: [
      { label: 'Documento', cell: driver => ({ kind: 'text', value: `${driver.documentType} ${driver.documentNumber}` }) },
      { label: 'Categoría', cell: driver => ({ kind: 'text', value: driver.licenseCategoryLabel }) },
      { label: 'N.º licencia', cell: driver => ({ kind: 'numeric', value: driver.licenseNumber }) },
      { label: 'Vence licencia', cell: driver => ({ kind: 'numeric', value: this.formatDate(driver.licenseExpiry) }) }
    ],
    metric: driver => ({ icon: 'id-card', value: DriverLicenseEngine.calculate(driver).caption })
  };

  /**
   * Cuerpo de la tarjeta: la cifra grande de días como ancla, la retícula de
   * meses de vigencia -12 columnas, un año por fila- y los extremos del
   * período al pie.
   */
  private licenseBlocks(driver: Driver): readonly CardBlock[] {
    const license = DriverLicenseEngine.calculate(driver);

    return [
      {
        kind: 'group',
        direction: 'row',
        weights: [3, 2],
        blocks: [
          {
            kind: 'stat',
            emphasis: 'hero',
            value: license.counterValue,
            caption: license.counterCaption,
            tone: license.tone
          },
          {
            kind: 'stat',
            value: license.stateLabel,
            caption: `${license.consumedMonths}/${license.totalMonths} MESES`,
            tone: license.tone
          }
        ]
      },
      {
        kind: 'matrix',
        variant: 'dot',
        columns: 12,
        tone: license.tone,
        cells: license.months.map(month => ({
          state: month.state === 'consumed' ? 'on' : month.state === 'warning' ? 'warn' : 'off',
          title: `Mes ${month.index + 1} de ${license.totalMonths}`
        }))
      },
      { kind: 'caption', text: license.issuedDate, endText: license.expiryDate }
    ];
  }

  /** Convierte una fecha ISO `AAAA-MM-DD` al formato boliviano `DD/MM/AAAA`. */
  private formatDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  /**
   * Tono del chip de habilitación en tabla y tarjeta: una licencia vencida se
   * lee en rojo (Amanecer andino). Solo presentación: el motor no cambia.
   */
  private licenseChipTone(state: string, tone: ChipTone): ChipTone {
    return state === 'VENCIDA' ? 'danger' : tone;
  }

  private statusTone(status: DriverStatus): ChipTone {
    switch (status) {
      case 'ACTIVO':
        return 'success';
      case 'SUSPENDIDO':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected onRowAction(event: RowAction<Driver>): void {
    if (event.action === 'edit') {
      this.openEditor(event.row);
    } else if (event.action === 'delete') {
      const driver = event.row;
      const index = this.driversService.indexOf(driver.id);
      this.driversService.remove(driver.id);
      this.toasts.show(`Se eliminó a ${driver.fullName}`, {
        actionLabel: 'Deshacer',
        onAction: () => this.driversService.restore(driver, index)
      });
    }
  }

  protected onToggleStatus(id: string): void {
    this.driversService.toggleStatus(id);
  }

  protected onNewDriver(): void {
    this.openEditor(null);
  }
}
