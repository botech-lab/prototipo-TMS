import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BusOption, RouteDraftStore } from '../../services/route-draft.store';
import { WizardIconComponent } from '../wizard-icon.component';
import { NewBadgeComponent } from '../new-badge.component';
import { HelpTipComponent } from '../help-tip.component';

interface BusGroup {
  readonly typeName: string;
  readonly options: readonly BusOption[];
}

/**
 * Parte inicial del paso 5 · Buses y tarifas: qué buses de la flota
 * (pantalla Vehículos) hacen esta ruta. De ellos salen los tipos de vehículo
 * de las tarjetas y los asientos que se venden; al crear un servicio solo se
 * podrá elegir uno de estos buses.
 */
@Component({
  selector: 'app-bus-picker',
  imports: [NewBadgeComponent, WizardIconComponent, HelpTipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './bus-picker.component.scss',
  template: `
    <section class="step-block" aria-labelledby="buses-title">
      <div class="title-row">
        <h3 id="buses-title" class="step-block__title">Buses que hacen esta ruta</h3>
        <app-new-badge detail="Aleta solo guarda el tipo de vehículo; hace falta una relación ruta ↔ idVehiculo y filtrar los buses al crear el servicio." />
        <app-help-tip label="Buses que hacen esta ruta" text="Al crear un servicio solo se podrá elegir uno de estos buses, y cada tipo de bus tiene sus propios precios. Los asientos salen del plano de cada bus; si un bus aún no tiene plano, se asumen los de su tipo." />
      </div>

      @if (!groups().length) {
        <p class="inherit-note">
          <app-wizard-icon name="info" />
          <span>No hay buses registrados. Agrégalos en Vehículos y vuelve a este paso.</span>
        </p>
      }

      @for (group of groups(); track group.typeName) {
        <div class="bus-group">
          <h4 class="bus-group__title">{{ group.typeName }}</h4>
          <ul class="bus-grid">
            @for (option of group.options; track option.vehicle.id) {
              @let active = option.vehicle.status === 'ACTIVO';
              @let on = isChosen(option);
              <li>
                <button
                  type="button"
                  class="bus"
                  [attr.aria-pressed]="on"
                  [disabled]="!active && !on"
                  (click)="store.toggleBus(option)"
                  [attr.aria-label]="'Bus ' + option.vehicle.plate + ', ' + option.vehicleTypeName">
                  <span class="bus__mark" aria-hidden="true">
                    @if (on) { <app-wizard-icon name="check" /> }
                  </span>
                  <span class="bus__body">
                    <span class="bus__plate">{{ option.vehicle.plate }}</span>
                    <span class="bus__model">{{ option.vehicle.brand }} {{ option.vehicle.model }}</span>
                    <span class="bus__meta">
                      {{ option.vehicle.floors }} {{ option.vehicle.floors === 1 ? 'piso' : 'pisos' }} · {{ option.vehicle.passengerCapacity }} pax · {{ seatNames(option) }}{{ option.seatsFromPlan ? '' : ' (sin plano)' }}
                    </span>
                    @if (option.alsoIn.length) {
                      <span class="bus__note">También en {{ option.alsoIn.join(', ') }}</span>
                    }
                    @if (!active) {
                      <span class="bus__note bus__note--off">Inactivo · actívalo en Vehículos</span>
                    }
                  </span>
                </button>
              </li>
            }
          </ul>
        </div>
      }

      @if (chosenCount()) {
        <p class="summary-ok"><app-wizard-icon name="check" /> {{ chosenSummary() }}</p>
      } @else if (groups().length) {
        <p class="needs"><app-wizard-icon name="alert" /> Elige al menos un bus: de él salen el tipo de bus y los asientos que se venden.</p>
      }
    </section>
  `
})
export class BusPickerComponent {
  protected readonly store = inject(RouteDraftStore);

  /** Buses agrupados por tipo; dentro del grupo, activos primero. */
  protected readonly groups = computed<BusGroup[]>(() => {
    const byType = new Map<string, BusOption[]>();
    for (const option of this.store.busOptions()) {
      const list = byType.get(option.vehicleTypeName) ?? [];
      list.push(option);
      byType.set(option.vehicleTypeName, list);
    }
    return [...byType].map(([typeName, options]) => ({
      typeName,
      options: [...options].sort((a, b) => Number(b.vehicle.status === 'ACTIVO') - Number(a.vehicle.status === 'ACTIVO'))
    }));
  });

  protected readonly chosenCount = computed(() => this.store.draft()?.buses.length ?? 0);

  /** "2 buses · Bus Normal, Bus Semicama" */
  protected readonly chosenSummary = computed(() => {
    const draft = this.store.draft();
    if (!draft) return '';
    const count = draft.buses.length;
    const types = [...new Set(draft.buses.map(bus => bus.vehicleTypeName))];
    return `${count} ${count === 1 ? 'bus' : 'buses'} · ${types.join(', ')}`;
  });

  protected isChosen(option: BusOption): boolean {
    return this.store.draft()?.buses.some(bus => bus.vehicleId === option.vehicle.id) ?? false;
  }

  protected seatNames(option: BusOption): string {
    const names = this.store.seatTypes().filter(seat => option.seatTypeIds.includes(seat.id)).map(seat => seat.name);
    return names.length ? names.join(', ') : 'sin asientos';
  }
}
