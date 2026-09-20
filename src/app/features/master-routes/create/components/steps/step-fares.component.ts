import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DraftFareCard, DraftTramo, PriceGrid, Weekday, WEEKDAYS } from '../../models/route-draft.model';
import { RouteDraftStore } from '../../services/route-draft.store';
import * as Engine from '../../services/route-draft-engine';
import { WizardIconComponent } from '../wizard-icon.component';
import { NewBadgeComponent } from '../new-badge.component';
import { FareOptionsComponent } from './fare-options.component';
import { BusPickerComponent } from './bus-picker.component';
import { HelpTipComponent } from '../help-tip.component';

/**
 * Paso 5 · Buses y tarifas (Aleta: "Tarifas y precios" + "Configuraciones").
 * Primero se eligen los buses de la ruta (BusPickerComponent); el tipo de
 * vehículo de cada tarjeta y sus asientos salen de esos buses.
 * Una tarjeta (en pantalla: "Precios") = categoría + tipo de bus; el uso de
 * ruta es uno para toda la ruta (Opciones avanzadas). Su matriz tiene un
 * precio por tramo y tipo de asiento; por defecto igual toda la semana, con la
 * opción de separar por día como en Aleta. La configuración (una por tipo de
 * bus) se arma sola con las tarjetas (ver FareOptionsComponent).
 */
@Component({
  selector: 'app-step-fares',
  imports: [NewBadgeComponent, WizardIconComponent, BusPickerComponent, FareOptionsComponent, HelpTipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-fares.component.scss',
  template: `
    @let d = store.draft()!;

    <app-bus-picker />

    @if (!d.fareCards.length) {
      <section class="step-block empty">
        <div class="title-row">
          <h3 class="step-block__title">Precios</h3>
          <app-help-tip label="Precios" text="Empieza con los precios Normal: lo que cuesta cada viaje en tus buses. Solo si vendes a otro valor (estudiantes, VIP…) agrega otra lista de precios." />
        </div>
        @if (!types().length) {
          <p class="step-block__help">Primero elige los buses de la ruta.</p>
        } @else {
          <button type="button" class="ink-btn empty__btn" (click)="addCard()">
            <app-wizard-icon name="plus" class="btn-icon" /> Crear los precios Normal
          </button>
        }
      </section>
    } @else {
      <div class="cards-bar" role="tablist" aria-label="Listas de precios">
        @for (card of d.fareCards; track card.id) {
          <button type="button" role="tab" class="cards-bar__tab" [attr.aria-selected]="card.id === current()?.id" (click)="selected.set(card.id)">
            <span class="cards-bar__name">{{ card.name }}</span>
            @if (missingFor(card) > 0) {
              <span class="cards-bar__state cards-bar__state--todo">{{ missingFor(card) }} sin precio</span>
            } @else {
              <span class="cards-bar__state"><app-wizard-icon name="check" class="cards-bar__check" /> Completa</span>
            }
          </button>
        }
        <button type="button" class="cards-bar__add" (click)="addCard()" [disabled]="!types().length">
          <app-wizard-icon name="plus" class="btn-icon" /> Otros precios
        </button>
      </div>

      @if (current(); as card) {
        <section class="step-block" role="tabpanel" [attr.aria-label]="card.name">
          <div class="card-head">
            <h3 class="step-block__title">{{ card.name }}</h3>
            <button type="button" class="link-btn link-btn--danger" (click)="removeCard(card)">Eliminar estos precios</button>
          </div>

          <div class="card-fields">
            <div class="field">
              <div class="title-row">
                <label class="ends__label" [for]="'cat-' + card.id">¿Para quién es este precio?</label>
                <app-help-tip label="¿Para quién es este precio?" [text]="categoryTip(card)" />
              </div>
              <select class="ends__select" [id]="'cat-' + card.id" [value]="card.categoryId" (change)="patchCard(card, { categoryId: $any($event.target).value }, true)">
                @if (!isPriceCategory(card.categoryId)) {
                  <option [value]="card.categoryId" selected disabled>{{ categoryName(card) }} (ya no se usa)</option>
                }
                @for (item of store.priceCategories(); track item.id) {
                  <option [value]="item.id" [selected]="item.id === card.categoryId">{{ item.name }}{{ store.newCategoryIds.has(item.id) ? ' ★ Nuevo' : '' }}</option>
                }
              </select>
            </div>
            <label class="field">
              <span class="ends__label">Tipo de bus</span>
              <select class="ends__select" [value]="card.vehicleTypeId" (change)="setVehicle(card, $any($event.target).value)">
                @if (!hasType(card.vehicleTypeId)) {
                  <option [value]="card.vehicleTypeId" selected disabled>{{ vehicleName(card) }} (ningún bus de la ruta)</option>
                }
                @for (item of types(); track item.id) { <option [value]="item.id" [selected]="item.id === card.vehicleTypeId">{{ item.name }}</option> }
              </select>
            </label>
          </div>

          <div class="seats">
            <div class="title-row">
              <span class="ends__label" id="seats-label">Asientos a este precio</span>
              <app-help-tip label="Asientos a este precio" [text]="'Salen del plano de los buses ' + vehicleName(card) + ' que elegiste. Desmarca los que no quieras vender a este precio.'" />
            </div>
            <div class="chips" role="group" aria-labelledby="seats-label">
              @for (seat of store.seatTypesFor(card.vehicleTypeId); track seat.id) {
                <button type="button" class="chip" [attr.aria-pressed]="card.seatTypeIds.includes(seat.id)" (click)="toggleSeat(card, seat.id)">
                  @if (card.seatTypeIds.includes(seat.id)) { <app-wizard-icon name="check" class="chip__icon" /> }
                  {{ seat.name }}
                </button>
              }
            </div>
          </div>
        </section>

        @if (card.seatTypeIds.length) {
          <section class="step-block" aria-labelledby="matrix-title">
            <div class="matrix-head">
              <div class="title-row">
                <h3 id="matrix-title" class="step-block__title">{{ fixed() ? 'Precio del pasaje (Bs.)' : 'Precio de cada viaje (Bs.)' }}</h3>
                <app-help-tip label="Precio de cada viaje" text="Un precio por cada viaje que se vende. Deja vacío un asiento si no se vende en ese viaje. Con «Boleto fijo», un solo precio por asiento vale para cualquier viaje." />
              </div>
              <div class="matrix-toggles">
                <label class="toggle-row by-day">
                  <input type="checkbox" class="switch" [checked]="fixed()" (change)="setFixed($any($event.target).checked)" />
                  <span><strong>Boleto fijo</strong><small>Mismo precio para cualquier viaje.</small></span>
                </label>
                <label class="toggle-row by-day">
                  <input type="checkbox" class="switch" [checked]="!!card.pricesByDay" (change)="setByDay(card, $any($event.target).checked)" />
                  <span><strong>Precios distintos por día</strong><small>Ej.: más caro viernes y domingo.</small></span>
                </label>
              </div>
            </div>

            @if (card.pricesByDay) {
              <div class="day-tabs" role="tablist" aria-label="Día de la semana">
                @for (day of weekdays; track day.key) {
                  <button type="button" role="tab" class="day-tabs__tab" [attr.aria-selected]="day.key === day$()" (click)="day$.set(day.key)">{{ day.short }}</button>
                }
                <button type="button" class="link-btn day-tabs__copy" (click)="copyDayToWeek(card)">Copiar {{ dayLong() }} a toda la semana</button>
              </div>
            }

            @if (fixed()) {
              <div class="fixed">
                @for (seatId of card.seatTypeIds; track seatId) {
                  <label class="field fixed__field">
                    <span class="ends__label">{{ seatName(seatId) }} · cualquier viaje</span>
                    <input class="number-input" type="number" min="0" step="0.5" inputmode="decimal" placeholder="ej. 10"
                      [value]="fixedPrice(card, seatId) ?? ''"
                      (input)="setFixedPrice(card, seatId, $any($event.target).value)" />
                  </label>
                }
              </div>
            } @else {
            <div class="helper">
              <app-wizard-icon name="info" class="helper__icon" />
              <div class="helper__body">
                <span class="title-row">
                  <strong>Llenar rápido por distancia</strong>
                  <app-new-badge detail="Calcula los precios de los viajes según sus kilómetros a partir del precio del viaje completo." />
                  <app-help-tip label="Llenar rápido por distancia" text="Pones el precio del viaje completo y los demás se calculan según sus kilómetros, redondeados a 5 Bs. Solo llena las casillas vacías; después puedes corregir cualquiera." />
                </span>
                <div class="helper__row">
                  <span>{{ fullLabel() }} en</span>
                  <select class="ends__select helper__select" [value]="suggestSeat()" (change)="suggestSeat.set($any($event.target).value)" aria-label="Tipo de asiento">
                    @for (seatId of card.seatTypeIds; track seatId) { <option [value]="seatId" [selected]="seatId === suggestSeat()">{{ seatName(seatId) }}</option> }
                  </select>
                  <span>cuesta</span>
                  <input class="number-input helper__price" type="number" min="0" placeholder="ej. 120" [value]="suggestPrice()" (input)="suggestPrice.set($any($event.target).value)" aria-label="Precio del recorrido completo en bolivianos" />
                  <span>Bs.</span>
                  <button type="button" class="secondary-btn" (click)="suggest(card)" [disabled]="!canSuggest()">Llenar tramos vacíos</button>
                </div>
              </div>
            </div>

            <div class="matrix-wrap" tabindex="0" role="region" aria-label="Matriz de precios">
              <table class="matrix">
                <thead>
                  <tr>
                    <th scope="col">Viaje</th>
                    @for (seatId of card.seatTypeIds; track seatId) { <th scope="col" class="num">{{ seatName(seatId) }}</th> }
                  </tr>
                </thead>
                <tbody>
                  @for (tramo of tramos(); track tramo.key) {
                    <tr [class.matrix__row--missing]="rowMissing(card, tramo.key)">
                      <th scope="row">
                        <span class="matrix__tramo">{{ label(tramo) }}</span>
                        <span class="matrix__km">{{ km(tramo) }} km</span>
                      </th>
                      @for (seatId of card.seatTypeIds; track seatId) {
                        <td class="num">
                          <input class="number-input matrix__input" type="number" min="0" step="0.5" inputmode="decimal"
                            [value]="price(card, tramo.key, seatId) ?? ''"
                            (input)="setPrice(card, tramo.key, seatId, $any($event.target).value)"
                            [attr.aria-label]="'Precio ' + label(tramo) + ', ' + seatName(seatId)" />
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            }

            <div class="adjust">
              <strong class="adjust__title">Ajuste masivo</strong>
              <select class="ends__select adjust__select" [value]="adjustDir()" (change)="adjustDir.set($any($event.target).value)" aria-label="Tipo de ajuste">
                <option value="UP">Subir</option>
                <option value="DOWN">Bajar</option>
              </select>
              <span>todos los precios</span>
              <input class="number-input adjust__value" type="number" min="0" [value]="adjustValue()" (input)="adjustValue.set($any($event.target).value)" aria-label="Valor del ajuste" />
              <select class="ends__select adjust__select" [value]="adjustMode()" (change)="adjustMode.set($any($event.target).value)" aria-label="Modo del ajuste">
                <option value="PERCENT">%</option>
                <option value="AMOUNT">Bs.</option>
              </select>
              <button type="button" class="secondary-btn" (click)="adjust(card)" [disabled]="!(+adjustValue() > 0)">Aplicar</button>
            </div>
          </section>
        }
      }

      <app-fare-options />
    }
  `
})
export class StepFaresComponent {
  protected readonly store = inject(RouteDraftStore);
  protected readonly weekdays = WEEKDAYS;

  protected readonly selected = signal<string | null>(null);
  protected readonly day$ = signal<Weekday>('LUN');
  protected readonly suggestSeat = signal<string>('');
  protected readonly suggestPrice = signal<string>('');
  protected readonly adjustDir = signal<'UP' | 'DOWN'>('UP');
  protected readonly adjustMode = signal<'PERCENT' | 'AMOUNT'>('PERCENT');
  protected readonly adjustValue = signal<string>('');

  protected readonly current = computed<DraftFareCard | undefined>(() => {
    const cards = this.store.draft()!.fareCards;
    return cards.find(card => card.id === this.selected()) ?? cards[0];
  });

  protected readonly tramos = computed(() => Engine.enabledTramos(this.store.draft()!));
  /** Tipos de bus de la ruta: los únicos que puede tener una tarjeta. */
  protected readonly types = computed(() => Engine.busTypes(this.store.draft()!));
  protected readonly dayLong = computed(() => WEEKDAYS.find(day => day.key === this.day$())?.long.toLowerCase() ?? '');

  protected readonly fullLabel = computed(() => {
    const draft = this.store.draft()!;
    return `${Engine.origin(draft)?.name ?? 'Origen'} → ${Engine.destination(draft)?.name ?? 'Destino'}`;
  });

  protected readonly canSuggest = computed(() => {
    const value = Number(this.suggestPrice());
    return value > 0 && Engine.totals(this.store.draft()!).km > 0;
  });

  protected missingFor(card: DraftFareCard): number {
    return Engine.tramosWithoutPrice(this.store.draft()!, card).length;
  }

  protected label(tramo: DraftTramo): string {
    return Engine.tramoLabel(this.store.draft()!, tramo);
  }

  protected km(tramo: DraftTramo): number {
    return Engine.tramoKm(this.store.draft()!, tramo);
  }

  protected seatName(id: string): string {
    return this.store.seatTypes().find(seat => seat.id === id)?.name ?? id;
  }

  /** Matriz visible: la del día elegido o la base. */
  private grid(card: DraftFareCard): PriceGrid {
    return card.pricesByDay ? card.pricesByDay[this.day$()] : card.prices;
  }

  protected price(card: DraftFareCard, key: string, seatId: string): number | null {
    return Engine.priceOf(this.grid(card), key, seatId);
  }

  protected rowMissing(card: DraftFareCard, key: string): boolean {
    return !card.seatTypeIds.some(seat => (Engine.priceOf(this.grid(card), key, seat) ?? 0) > 0);
  }

  /** Boleto fijo (para toda la ruta): un precio por asiento, copiado a todos los viajes. */
  protected readonly fixed = computed(() => this.store.draft()!.configuration.fixedTicket);

  protected setFixed(on: boolean): void {
    this.store.update(draft => {
      const next = { ...draft, configuration: { ...draft.configuration, fixedTicket: on } };
      return on ? Engine.applyFixedTicket(next) : next;
    });
  }

  protected fixedPrice(card: DraftFareCard, seatId: string): number | null {
    return Engine.fixedPriceOf(this.store.draft()!, this.grid(card), seatId);
  }

  protected setFixedPrice(card: DraftFareCard, seatId: string, raw: string): void {
    const value = raw === '' ? null : Math.max(0, Number(raw));
    const draft = this.store.draft()!;
    this.updateGrid(card, grid => Engine.withFixedPrice(draft, grid, seatId, Number.isFinite(value as number) ? value : null));
  }

  protected isPriceCategory(categoryId: string): boolean {
    return this.store.priceCategories().some(item => item.id === categoryId);
  }

  protected categoryName(card: DraftFareCard): string {
    return this.store.fareCategories().find(item => item.id === card.categoryId)?.name ?? 'Otra';
  }

  protected hasType(vehicleTypeId: string): boolean {
    return this.types().some(type => type.id === vehicleTypeId);
  }

  /** Nueva tarjeta para el primer tipo de bus que aún no tiene precios (o el primero). */
  protected addCard(): void {
    const draft = this.store.draft()!;
    const types = this.types();
    if (!types.length) return;
    const type = types.find(item => !Engine.cardsOfType(draft, item.id).length) ?? types[0];
    const categories = this.store.priceCategories();
    const used = new Set(Engine.cardsOfType(draft, type.id).map(card => card.categoryId));
    const category = categories.find(c => c.name === 'Normal' && !used.has(c.id)) ?? categories.find(c => !used.has(c.id)) ?? categories[0];
    const card: DraftFareCard = {
      id: Engine.localId('card'),
      name: this.cardName(category?.name, type.name),
      vehicleTypeId: type.id,
      usageTypeId: draft.configuration.usageTypeId ?? this.store.defaultUsage()?.id ?? '',
      categoryId: category?.id ?? '',
      seatTypeIds: this.store.seatTypesFor(type.id).map(seat => seat.id),
      prices: {},
      pricesByDay: null
    };
    this.store.update(current => ({ ...current, fareCards: [...current.fareCards, card] }));
    this.selected.set(card.id);
    this.suggestSeat.set(card.seatTypeIds[0] ?? '');
  }

  protected removeCard(card: DraftFareCard): void {
    this.store.update(draft => ({
      ...draft,
      fareCards: draft.fareCards.filter(item => item.id !== card.id),
      configuration: Engine.withoutCardInChannels(draft.configuration, card.id)
    }));
    this.selected.set(null);
  }

  /** Cambia campos; si cambian categoría o vehículo, el nombre automático se actualiza. */
  protected patchCard(card: DraftFareCard, change: Partial<DraftFareCard>, rename = false): void {
    this.replace(card, current => {
      const next = { ...current, ...change };
      if (!rename) return next;
      const category = this.store.fareCategories().find(c => c.id === next.categoryId)?.name;
      const vehicle = this.store.vehicleTypes().find(v => v.id === next.vehicleTypeId)?.name;
      return { ...next, name: this.cardName(category, vehicle) };
    });
  }

  /** Explicación de la ⓘ de "¿Para quién es este precio?": qué es esta lista + la descripción del catálogo. */
  protected categoryTip(card: DraftFareCard): string {
    const description = this.store.fareCategories().find(item => item.id === card.categoryId)?.description;
    return description ? `${this.cardIntro(card)} En tu catálogo: «${description}».` : this.cardIntro(card);
  }

  protected cardIntro(card: DraftFareCard): string {
    const category = this.store.fareCategories().find(item => item.id === card.categoryId)?.name ?? '';
    const bus = `los buses ${this.vehicleName(card)}`;
    return category === 'Normal'
      ? `El precio de siempre para ${bus}. Crea otros precios solo si vendes a otro valor (estudiantes, VIP…).`
      : `Precios ${category} para ${bus}. Se usan en lugar de los Normal cuando corresponde.`;
  }

  protected vehicleName(card: DraftFareCard): string {
    return this.store.vehicleTypes().find(item => item.id === card.vehicleTypeId)?.name ?? 'de este tipo';
  }

  /** Al cambiar de tipo de bus, los asientos pasan a ser los de esos buses y la tarjeta sale de la tarifa por canal. */
  protected setVehicle(card: DraftFareCard, vehicleTypeId: string): void {
    const seats = this.store.seatTypesFor(vehicleTypeId).map(seat => seat.id);
    this.store.update(draft => ({ ...draft, configuration: Engine.withoutCardInChannels(draft.configuration, card.id) }));
    this.patchCard(card, { vehicleTypeId, seatTypeIds: seats }, true);
    if (!seats.includes(this.suggestSeat())) this.suggestSeat.set(seats[0] ?? '');
  }

  protected toggleSeat(card: DraftFareCard, seatId: string): void {
    const seats = card.seatTypeIds.includes(seatId) ? card.seatTypeIds.filter(id => id !== seatId) : [...card.seatTypeIds, seatId];
    const ordered = this.store.seatTypesFor(card.vehicleTypeId).map(seat => seat.id).filter(id => seats.includes(id));
    this.patchCard(card, { seatTypeIds: ordered });
    if (!ordered.includes(this.suggestSeat())) this.suggestSeat.set(ordered[0] ?? '');
  }

  protected setPrice(card: DraftFareCard, key: string, seatId: string, raw: string): void {
    const value = raw === '' ? null : Math.max(0, Number(raw));
    this.updateGrid(card, grid => Engine.withPrice(grid, key, seatId, Number.isFinite(value as number) ? value : null));
  }

  protected setByDay(card: DraftFareCard, byDay: boolean): void {
    this.replace(card, current => (byDay ? Engine.splitByDay(current) : Engine.mergeDays(current)));
  }

  protected copyDayToWeek(card: DraftFareCard): void {
    const source = this.grid(card);
    this.replace(card, current => ({
      ...current,
      pricesByDay: Object.fromEntries(Engine.ALL_DAYS.map(day => [day, source])) as Record<Weekday, PriceGrid>
    }));
  }

  protected suggest(card: DraftFareCard): void {
    const seat = this.suggestSeat() || card.seatTypeIds[0];
    const price = Number(this.suggestPrice());
    if (!seat || !(price > 0)) return;
    const draft = this.store.draft()!;
    this.updateGrid(card, grid => Engine.suggestByDistance(draft, grid, seat, price));
  }

  protected adjust(card: DraftFareCard): void {
    const value = Number(this.adjustValue());
    if (!(value > 0)) return;
    this.updateGrid(card, grid => Engine.adjustGrid(grid, this.adjustDir(), this.adjustMode(), value));
    this.adjustValue.set('');
  }

  private updateGrid(card: DraftFareCard, change: (grid: PriceGrid) => PriceGrid): void {
    const day = this.day$();
    this.replace(card, current =>
      current.pricesByDay
        ? { ...current, pricesByDay: { ...current.pricesByDay, [day]: change(current.pricesByDay[day]) } }
        : { ...current, prices: change(current.prices) }
    );
  }

  private replace(card: DraftFareCard, change: (card: DraftFareCard) => DraftFareCard): void {
    this.store.update(draft => ({
      ...draft,
      fareCards: draft.fareCards.map(item => (item.id === card.id ? change(item) : item))
    }));
  }

  private cardName(category?: string, vehicle?: string): string {
    return [category ? `Precios ${category}` : 'Precios', vehicle].filter(Boolean).join(' · ');
  }
}
