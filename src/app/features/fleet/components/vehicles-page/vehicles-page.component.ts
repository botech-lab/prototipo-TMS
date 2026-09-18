import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { SEAT_LAYOUT_RULES } from '@core';
import { ParametricCatalogsService } from '../../../parametric/services/parametric-catalogs.service';
import { VehiclePreset } from '../../../seat-designer/models/seat-layout.model';
import { SeatLayoutEngine } from '../../../seat-designer/services/seat-layout-engine';
import { SeatLayoutStore } from '../../../seat-designer/services/seat-layout.store';
import { DataTableComponent } from '@components/data-table/data-table.component';
import { EntityCardGridComponent } from '@components/entity-card-grid/entity-card-grid.component';
import { PageHeaderComponent } from '@components/page-header/page-header.component';
import { SearchFieldComponent } from '@components/search-field/search-field.component';
import { ViewSwitcherComponent } from '@components/view-switcher/view-switcher.component';
import { responsiveViewMode } from '@components/view-switcher/responsive-view-mode';
import { ToastService } from '@components/toast/toast.service';
import { NavIconComponent, NavIconName } from '@components/app-shell/nav-icon.component';
import { captureOpener, focusFirst, restoreFocus, trapTab } from '@components/record-drawer/focus-trap';
import { CardBlock, CardDefinition, RowAction, RowActionDef, TableColumn } from '@models';
import { Vehicle } from '../../models/vehicle.model';
import { VehicleCapacityEngine } from '../../services/vehicle-capacity-engine';
import { VehiclesService } from '../../services/vehicles.service';

/**
 * ============================================================================
 * MÓDULO DE VEHÍCULOS (SMART CONTAINER)
 * ============================================================================
 * Declara las 6 columnas del catálogo de flota y delega todo el renderizado
 * en `DataTableComponent`. El contenedor no dibuja celdas: solo describe
 * cómo se proyecta cada `Vehicle` a la tabla.
 * ============================================================================
 */
@Component({
  selector: 'app-vehicles-page',
  imports: [
    PageHeaderComponent,
    SearchFieldComponent,
    ViewSwitcherComponent,
    DataTableComponent,
    EntityCardGridComponent,
    NavIconComponent
  ],
  templateUrl: './vehicles-page.component.html',
  styleUrl: './vehicles-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehiclesPageComponent {
  protected readonly vehiclesService = inject(VehiclesService);
  private readonly router = inject(Router);
  private readonly catalogs = inject(ParametricCatalogsService);
  private readonly layoutStore = inject(SeatLayoutStore);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);

  /** Diálogo del asistente y quien lo abrió (accesibilidad: foco dentro y de vuelta). */
  private readonly wizardDialog = viewChild<ElementRef<HTMLElement>>('wizardDialog');
  private wizardOpener: HTMLElement | null = null;

  constructor() {
    // Al abrir: foco dentro del diálogo. Al cerrar: foco de vuelta al que lo abrió.
    effect(() => {
      const open = this.wizardOpen();
      untracked(() => {
        if (open) {
          this.wizardOpener ??= captureOpener();
          afterNextRender(() => focusFirst(this.wizardDialog()?.nativeElement, 'input, .vehicles-page__preset'), {
            injector: this.injector
          });
        } else if (this.wizardOpener) {
          restoreFocus(this.wizardOpener);
          this.wizardOpener = null;
        }
      });
    });
  }

  /** Trampa de foco del asistente: Tab no sale del diálogo. */
  protected onWizardKeydown(event: KeyboardEvent): void {
    trapTab(event, this.wizardDialog()?.nativeElement);
  }

  // ==========================================
  // CREACIÓN ASISTIDA (Smart Presets)
  // ==========================================
  protected readonly presets = SEAT_LAYOUT_RULES.VEHICLE_PRESETS as readonly VehiclePreset[];
  protected readonly wizardOpen = signal<boolean>(false);
  protected readonly wizardPreset = signal<VehiclePreset | null>(null);
  protected readonly wizardPlate = signal<string>('');
  protected readonly wizardInternal = signal<string>('');
  protected readonly wizardBrand = signal<string>('');
  protected readonly wizardModel = signal<string>('');

  /** Peso y licencia salen del catálogo `tipo-vehiculos`, no del preset. */
  protected readonly wizardType = computed(() => {
    const preset = this.wizardPreset();
    return preset ? this.catalogs.vehicleTypes.all().find(t => t.name === preset.vehicleTypeName) ?? null : null;
  });

  protected readonly wizardSeats = computed(() => {
    const preset = this.wizardPreset();
    if (!preset?.spec) return 0;
    return SeatLayoutEngine.buildFromSpec('preview', preset.spec, 'sides', 'continuous')
      .decks.reduce((n, d) => n + d.cells.flat().filter(c => c.kind === 'seat').length, 0);
  });

  protected readonly wizardValid = computed(() => !!this.wizardPreset() && this.wizardPlate().trim().length >= 3);

  // ==========================================
  // EDICIÓN DE DATOS (mismo asistente, modo edición)
  // ==========================================
  /** Unidad en edición; `null` cuando el asistente está en modo alta. */
  protected readonly wizardEditing = signal<Vehicle | null>(null);
  protected readonly wizardCapacity = signal<string>('');
  protected readonly wizardCargo = signal<string>('');
  /** Se activa al intentar guardar: a partir de ahí los errores se muestran en línea. */
  protected readonly wizardSubmitted = signal<boolean>(false);

  protected readonly plateError = computed<string | null>(() =>
    this.wizardPlate().trim().length >= 3 ? null : 'La placa necesita al menos 3 caracteres'
  );

  protected readonly capacityError = computed<string | null>(() => {
    const value = Number(this.wizardCapacity());
    return this.wizardCapacity().trim() !== '' && Number.isInteger(value) && value > 0
      ? null
      : 'Indica un número entero de plazas mayor a 0';
  });

  protected readonly cargoError = computed<string | null>(() => {
    const raw = this.wizardCargo().trim();
    return raw === '' || (Number.isFinite(Number(raw)) && Number(raw) >= 0) ? null : 'Indica los kg o déjalo vacío';
  });

  protected readonly editValid = computed(() => !this.plateError() && !this.capacityError() && !this.cargoError());

  /** Acción extra de fila: abre el diseñador de plazas de la unidad. */
  protected readonly rowExtraActions: readonly RowActionDef[] = [
    {
      id: 'seats',
      label: 'Diseñar plazas',
      shortLabel: 'Plazas',
      iconPath: 'M7 4h10a2 2 0 012 2v6H5V6a2 2 0 012-2zM3 12h18v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3zM7 17v3m10-3v3'
    }
  ];

  protected openEditWizard(vehicle: Vehicle): void {
    this.wizardEditing.set(vehicle);
    this.wizardSubmitted.set(false);
    this.wizardPreset.set(this.presets.find(p => p.id === vehicle.presetId) ?? null);
    this.wizardPlate.set(vehicle.plate);
    this.wizardInternal.set(vehicle.internalNumber ?? '');
    this.wizardBrand.set(vehicle.brand);
    this.wizardModel.set(vehicle.model);
    this.wizardCapacity.set(String(vehicle.passengerCapacity));
    this.wizardCargo.set(vehicle.cargoCapacityKg === null ? '' : String(vehicle.cargoCapacityKg));
    this.wizardOpen.set(true);
  }

  protected saveEdit(): void {
    const original = this.wizardEditing();
    this.wizardSubmitted.set(true);
    if (!original || !this.editValid()) return;

    const cargo = this.wizardCargo().trim();
    const updated: Vehicle = {
      ...original,
      plate: this.wizardPlate().trim().toUpperCase(),
      internalNumber: this.wizardInternal().trim() || undefined,
      brand: this.wizardBrand().trim() || 'Sin marca',
      model: this.wizardModel().trim() || original.model,
      passengerCapacity: Number(this.wizardCapacity()),
      cargoCapacityKg: cargo === '' ? null : Number(cargo)
    };
    this.vehiclesService.update(updated);
    this.closeWizard();
    this.toasts.show(`Se guardaron los cambios de ${updated.plate}`, {
      actionLabel: 'Deshacer',
      onAction: () => this.vehiclesService.update(original)
    });
  }

  /** Desde la edición de datos se puede saltar al plano de la misma unidad. */
  protected designSeatsFromWizard(): void {
    const vehicle = this.wizardEditing();
    this.closeWizard();
    if (vehicle) {
      this.router.navigate(['/vehiculos', vehicle.id, 'plazas']);
    }
  }

  protected closeWizard(): void {
    this.wizardOpen.set(false);
    this.wizardEditing.set(null);
  }

  /** Ícono de línea del preset (mismo set que el menú lateral). */
  protected presetIcon(id: string): NavIconName {
    return id === 'clasico' ? 'bus' : id === 'suite-dd' ? 'bus-front' : id === 'minibus' ? 'bus' : 'catalog';
  }

  protected openWizard(): void {
    this.wizardEditing.set(null); this.wizardSubmitted.set(false);
    this.wizardOpen.set(true); this.wizardPreset.set(null);
    this.wizardPlate.set(''); this.wizardInternal.set(''); this.wizardBrand.set(''); this.wizardModel.set('');
  }

  protected createFromWizard(): void {
    const preset = this.wizardPreset();
    if (!preset || !this.wizardValid()) return;
    const type = this.wizardType();
    const plate = this.wizardPlate().trim().toUpperCase();
    const vehicle: Vehicle = {
      id: `veh-${plate.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`,
      plate,
      internalNumber: this.wizardInternal().trim() || undefined,
      presetId: preset.id,
      type: preset.vehicleTypeName,
      brand: this.wizardBrand().trim() || 'Sin marca',
      model: this.wizardModel().trim() || preset.label,
      floors: preset.floors,
      passengerCapacity: preset.spec ? this.wizardSeats() : preset.passengerCapacity,
      cargoCapacityKg: type?.maxWeightKg ?? null,
      status: 'ACTIVO'
    };
    this.vehiclesService.add(vehicle);

    // El plano de plazas nace en el mismo paso, ya numerado y guardado.
    this.layoutStore.layoutFor(vehicle);
    if (preset.spec) {
      const spec = preset.spec;
      this.layoutStore.commit(vehicle.id, () => SeatLayoutEngine.buildFromSpec(vehicle.id, spec, 'sides', 'continuous'));
    }
    this.layoutStore.save(vehicle.id);

    this.wizardOpen.set(false);
    this.router.navigate(['/vehiculos', vehicle.id, 'plazas']);
  }

  /** Modo de visualización activo: tarjetas en móvil, tabla desde `sm`. */
  protected readonly viewMode = responsiveViewMode();

  /**
   * Definición declarativa de columnas (dominio → presentación).
   * Cada `cell` es una función pura y sin efectos secundarios.
   */
  protected readonly columns: readonly TableColumn<Vehicle>[] = [
    {
      key: 'plate',
      label: 'Placa',
      width: '140px',
      cell: vehicle => ({ kind: 'strong', value: vehicle.plate })
    },
    {
      key: 'type',
      label: 'Tipo',
      width: '150px',
      cell: vehicle => ({ kind: 'text', value: vehicle.type })
    },
    {
      key: 'brandModel',
      label: 'Marca / Modelo',
      cell: vehicle => ({ kind: 'stacked', value: vehicle.brand, caption: vehicle.model })
    },
    {
      key: 'floors',
      label: 'Pisos',
      align: 'center',
      width: '90px',
      showFrom: 'sm',
      cell: vehicle => ({ kind: 'numeric', value: String(vehicle.floors) })
    },
    {
      key: 'capacity',
      label: 'Capacidad',
      width: '190px',
      showFrom: 'md',
      cell: vehicle => ({ kind: 'text', value: this.formatCapacity(vehicle) })
    },
    {
      key: 'status',
      label: 'Estado',
      width: '140px',
      cell: vehicle => ({
        kind: 'chip',
        value: vehicle.status,
        tone: vehicle.status === 'ACTIVO' ? 'success' : 'neutral'
      })
    }
  ];

  /**
   * Proyección a las 7 ranuras de la tarjeta de entidad.
   * La placa ocupa la ranura de badge por ser el identificador corto e
   * inmutable de la unidad, igual que el código `RM-01` en ruta maestra.
   */
  protected readonly cardDefinition: CardDefinition<Vehicle> = {
    badge: vehicle => vehicle.plate,
    status: vehicle => ({
      kind: 'chip',
      value: vehicle.status,
      tone: vehicle.status === 'ACTIVO' ? 'success' : 'neutral'
    }),
    title: vehicle => `${vehicle.brand} ${vehicle.model}`,
    subtitle: vehicle => vehicle.type,
    isEnabled: vehicle => vehicle.status === 'ACTIVO',
    // La ranura 5 la ocupa el mapa de plazas: 4 filas equivalentes.
    bodyRows: 4,
    body: vehicle => this.capacityBlocks(vehicle),
    // Respaldo textual: solo se usa si la ranura 5 no recibe plantilla.
    details: [
      { label: 'Tipo', cell: vehicle => ({ kind: 'text', value: vehicle.type }) },
      { label: 'Marca', cell: vehicle => ({ kind: 'text', value: vehicle.brand }) },
      { label: 'Modelo', cell: vehicle => ({ kind: 'text', value: vehicle.model }) },
      { label: 'Pisos', cell: vehicle => ({ kind: 'numeric', value: String(vehicle.floors) }) },
      { label: 'Capacidad', cell: vehicle => ({ kind: 'text', value: this.formatCapacity(vehicle) }) }
    ],
    metric: vehicle => ({ icon: 'bus', value: `${vehicle.passengerCapacity} pasajeros` })
  };

  /**
   * Cuerpo de la tarjeta: los pisos lado a lado, cada uno como matriz de
   * butacas -una celda por plaza declarada-, y la carga como barra inferior.
   */
  private capacityBlocks(vehicle: Vehicle): readonly CardBlock[] {
    const capacity = VehicleCapacityEngine.calculate(vehicle);

    const decks: CardBlock = {
      kind: 'group',
      direction: 'row',
      weights: capacity.decks.map(() => 1),
      blocks: capacity.decks.map(deck => ({
        kind: 'matrix' as const,
        label: deck.label,
        endLabel: `${deck.seats}`,
        columns: deck.seatsAcross,
        variant: 'dot' as const,
        tone: 'primary' as const,
        cells: Array.from({ length: deck.seats }, (_, index) => ({
          state: 'on' as const,
          title: `Butaca ${index + 1}`
        }))
      }))
    };

    const blocks: CardBlock[] = [
      { kind: 'caption', text: 'MAPA DE PLAZAS', endText: `${capacity.totalSeats} pax` },
      decks
    ];

    if (capacity.cargo) {
      blocks.push({
        kind: 'meter',
        label: 'CARGA',
        ratio: capacity.cargo.ratio,
        endCaption: `${capacity.cargo.kg} kg`,
        tone: 'primary'
      });
    }

    return blocks;
  }

  /** `50 pax` cuando no hay carga; `40 pax / 1000 kg` cuando sí la hay. */
  private formatCapacity(vehicle: Vehicle): string {
    const passengers = `${vehicle.passengerCapacity} pax`;
    return vehicle.cargoCapacityKg === null
      ? passengers
      : `${passengers} / ${vehicle.cargoCapacityKg} kg`;
  }

  protected onRowAction(event: RowAction<Vehicle>): void {
    if (event.action === 'delete') {
      const vehicle = event.row;
      const index = this.vehiclesService.indexOf(vehicle.id);
      this.vehiclesService.remove(vehicle.id);
      this.toasts.show(`Se eliminó el vehículo ${vehicle.plate}`, {
        actionLabel: 'Deshacer',
        onAction: () => this.vehiclesService.restore(vehicle, index)
      });
    } else if (event.action === 'edit') {
      // «Editar datos»: placa, marca, modelo y capacidad declarada.
      this.openEditWizard(event.row);
    } else if (event.action === 'seats') {
      // «Diseñar plazas»: el plano de butacas de la unidad.
      this.router.navigate(['/vehiculos', event.row.id, 'plazas']);
    }
  }

  protected onToggleStatus(id: string): void {
    this.vehiclesService.toggleStatus(id);
  }

  protected onNewVehicle(): void {
    this.openWizard();
  }
}
