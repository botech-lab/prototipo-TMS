import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BusOption, RouteDraftStore } from '../../services/route-draft.store';
import { WizardIconComponent } from '../wizard-icon.component';
import { NewBadgeComponent } from '../new-badge.component';
import { HelpTipComponent } from '../help-tip.component';

interface BusGroup {
  readonly typeName: string;
  readonly options: readonly BusOption[];
  readonly chosen: number;
  readonly total: number;
  readonly active: number;
}

/** Cuántos buses se muestran de entrada dentro de una clase. */
const PAGE = 12;
/** Con una flota chica no hace falta esconder nada. */
const SMALL_FLEET = 12;

/**
 * Parte inicial del paso 5 · Buses y tarifas: qué buses de la flota
 * (pantalla Vehículos) hacen esta ruta. De ellos salen los tipos de vehículo
 * de las tarjetas y los asientos que se venden.
 *
 * PRIMERO LA CLASE, DESPUÉS EL BUS. Una empresa con 180 unidades no marca de a
 * uno: dice "los semicama" y saca las excepciones. Por eso la clase se elige
 * entera con un clic, la lista de buses vive adentro de su clase, con buscador
 * por placa, y se carga de a poco. Con una flota chica todo aparece abierto,
 * como antes.
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
        <app-help-tip label="Buses que hacen esta ruta" text="Elige las clases que hacen la ruta y, si hace falta, saca los buses que no van (por ejemplo, uno en taller). Al crear un servicio solo se podrá elegir uno de estos buses, y los precios son por clase de asiento." />
      </div>

      @if (!groups().length) {
        <p class="inherit-note">
          <app-wizard-icon name="info" />
          <span>No hay buses registrados. Agrégalos en Vehículos y vuelve a este paso.</span>
        </p>
      }

      @for (group of groups(); track group.typeName) {
        @let abierto = isOpen(group);
        <div class="class-row" [class.class-row--on]="group.chosen > 0">
          <div class="class-row__head">
            <button
              type="button"
              class="class-row__pick"
              [attr.aria-pressed]="group.chosen > 0"
              (click)="toggleGroup(group)"
              [attr.aria-label]="(group.chosen ? 'Quitar todos los ' : 'Elegir todos los ') + group.typeName">
              <span class="class-row__mark" aria-hidden="true">
                @if (group.chosen === group.active && group.active > 0) { <app-wizard-icon name="check" /> }
                @else if (group.chosen > 0) { <span class="class-row__partial"></span> }
              </span>
              <span class="class-row__text">
                <span class="class-row__name">{{ group.typeName }}</span>
                <span class="class-row__count">
                  @if (group.chosen === 0) {
                    {{ group.active }} {{ group.active === 1 ? 'bus' : 'buses' }}
                  } @else if (group.chosen === group.active) {
                    todos · {{ group.chosen }} de {{ group.active }}
                  } @else {
                    {{ group.chosen }} de {{ group.active }} · {{ group.active - group.chosen }} fuera
                  }
                </span>
              </span>
            </button>

            @if (group.total > 1) {
              <button type="button" class="class-row__toggle" (click)="toggleOpen(group.typeName)" [attr.aria-expanded]="abierto">
                {{ abierto ? 'Ocultar buses' : 'Ver buses' }}
              </button>
            }
          </div>

          @if (abierto) {
            <div class="class-row__body">
              @if (group.total > PAGE) {
                <input
                  class="class-row__search"
                  type="search"
                  [value]="query()"
                  (input)="query.set($any($event.target).value)"
                  [attr.placeholder]="'Buscar placa entre ' + group.total + ' buses'"
                  [attr.aria-label]="'Buscar bus de ' + group.typeName" />
              }

              <ul class="bus-list">
                @for (option of visible(group); track option.vehicle.id) {
                  @let activo = option.vehicle.status === 'ACTIVO';
                  @let on = isChosen(option);
                  <li>
                    <button
                      type="button"
                      class="bus"
                      [attr.aria-pressed]="on"
                      [disabled]="!activo && !on"
                      (click)="store.toggleBus(option)"
                      [attr.aria-label]="'Bus ' + option.vehicle.plate + ', ' + option.vehicleTypeName">
                      <span class="bus__mark" aria-hidden="true">
                        @if (on) { <app-wizard-icon name="check" /> }
                      </span>
                      <span class="bus__body">
                        <span class="bus__plate">{{ option.vehicle.plate }}</span>
                        <span class="bus__model">{{ option.vehicle.brand }} {{ option.vehicle.model }}</span>
                        <span class="bus__meta">
                          {{ option.vehicle.passengerCapacity }} pax · {{ seatNames(option) }}{{ option.seatsFromPlan ? '' : ' (sin plano)' }}
                        </span>
                        @if (option.alsoIn.length) {
                          <span class="bus__note">También en {{ option.alsoIn.join(', ') }}</span>
                        }
                        @if (!activo) {
                          <span class="bus__note bus__note--off">Inactivo · actívalo en Vehículos</span>
                        }
                      </span>
                    </button>
                  </li>
                }
              </ul>

              @let restantes = hidden(group);
              @if (restantes > 0) {
                <button type="button" class="link-btn" (click)="showMore(group.typeName)">
                  Ver {{ restantes > PAGE ? PAGE : restantes }} buses más ({{ restantes }} sin mostrar)
                </button>
              }
              @if (!visible(group).length) {
                <p class="bus-list__empty">Ningún bus de {{ group.typeName }} con esa placa.</p>
              }
            </div>
          }
        </div>
      }

      @if (chosenCount()) {
        <p class="summary-ok"><app-wizard-icon name="check" /> {{ chosenSummary() }}</p>
      } @else if (groups().length) {
        <p class="needs"><app-wizard-icon name="alert" /> Elige al menos una clase: de ella salen los asientos que se venden.</p>
      }
    </section>
  `
})
export class BusPickerComponent {
  protected readonly store = inject(RouteDraftStore);
  protected readonly PAGE = PAGE;

  /** Clases abiertas a mano (null = todavía nadie tocó nada). */
  private readonly opened = signal<ReadonlySet<string> | null>(null);
  /** Cuántos buses se muestran por clase. */
  private readonly shown = signal<Readonly<Record<string, number>>>({});
  protected readonly query = signal('');

  /** Buses agrupados por clase; dentro del grupo, activos primero. */
  protected readonly groups = computed<BusGroup[]>(() => {
    const elegidos = new Set(this.store.draft()?.buses.map(bus => bus.vehicleId) ?? []);
    const byType = new Map<string, BusOption[]>();
    for (const option of this.store.busOptions()) {
      const list = byType.get(option.vehicleTypeName) ?? [];
      list.push(option);
      byType.set(option.vehicleTypeName, list);
    }
    return [...byType].map(([typeName, options]) => {
      const ordenados = [...options].sort(
        (a, b) => Number(b.vehicle.status === 'ACTIVO') - Number(a.vehicle.status === 'ACTIVO')
      );
      return {
        typeName,
        options: ordenados,
        chosen: ordenados.filter(option => elegidos.has(option.vehicle.id)).length,
        total: ordenados.length,
        active: ordenados.filter(option => option.vehicle.status === 'ACTIVO').length
      };
    });
  });

  /** Con pocos buses en total, las clases arrancan abiertas. */
  private readonly smallFleet = computed(() => this.store.busOptions().length <= SMALL_FLEET);

  protected isOpen(group: BusGroup): boolean {
    const abiertas = this.opened();
    if (abiertas) return abiertas.has(group.typeName);
    return this.smallFleet() || group.chosen > 0;
  }

  protected toggleOpen(typeName: string): void {
    const actuales = new Set(this.opened() ?? this.groups().filter(g => this.isOpen(g)).map(g => g.typeName));
    if (actuales.has(typeName)) actuales.delete(typeName);
    else actuales.add(typeName);
    this.opened.set(actuales);
    this.query.set('');
  }

  /** Elige (o quita) todos los buses activos de una clase de una sola vez. */
  protected toggleGroup(group: BusGroup): void {
    const quitar = group.chosen > 0;
    for (const option of group.options) {
      const on = this.isChosen(option);
      if (quitar && on) this.store.toggleBus(option);
      if (!quitar && !on && option.vehicle.status === 'ACTIVO') this.store.toggleBus(option);
    }
  }

  /** Los buses que se dibujan: filtrados por la búsqueda y cortados por página. */
  protected visible(group: BusGroup): BusOption[] {
    return this.matching(group).slice(0, this.limit(group.typeName));
  }

  protected hidden(group: BusGroup): number {
    return Math.max(0, this.matching(group).length - this.limit(group.typeName));
  }

  protected showMore(typeName: string): void {
    this.shown.update(current => ({ ...current, [typeName]: this.limit(typeName) + PAGE }));
  }

  private limit(typeName: string): number {
    return this.shown()[typeName] ?? PAGE;
  }

  private matching(group: BusGroup): BusOption[] {
    const texto = this.query().trim().toLowerCase();
    if (!texto) return [...group.options];
    return group.options.filter(option =>
      `${option.vehicle.plate} ${option.vehicle.brand} ${option.vehicle.model}`.toLowerCase().includes(texto)
    );
  }

  protected readonly chosenCount = computed(() => this.store.draft()?.buses.length ?? 0);

  /** "80 buses · Bus Semicama, Bus Cama Completo" */
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
