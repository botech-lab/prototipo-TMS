import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, signal } from '@angular/core';

/** Lo que ocupan la columna del viaje y cada columna de precio, en píxeles. */
const LABEL_WIDTH = 190;
const COLUMN_WIDTH = 88;
import { DraftFareCard, DraftTramo, PriceGrid, Weekday, WEEKDAYS } from '../../models/route-draft.model';
import { RouteDraftStore } from '../../services/route-draft.store';
import * as Engine from '../../services/route-draft-engine';
import { WizardIconComponent } from '../wizard-icon.component';
import { BusPickerComponent } from './bus-picker.component';
import { FillMethod, FillPricesComponent, FillRequest } from './fill-prices.component';
import { HelpTipComponent } from '../help-tip.component';

/**
 * Paso 5 · Buses y tarifas (Aleta: "Tarifas y precios" + "Configuraciones").
 *
 * UNA SOLA TABLA: viajes × CLASES DE ASIENTO. Las clases salen de los buses
 * elegidos, sin repetir. Antes se pedía una lista por TIPO DE BUS, que es como
 * lo guarda Aleta, y eso obligaba a escribir dos veces el mismo precio cuando
 * dos tipos de bus llevan la misma clase (semicama en el bus mixto y en el
 * semicama). Si los dos números no coincidían, el pasajero pagaba distinto
 * según qué bus le tocaba.
 *
 * Por dentro no cambia nada para Aleta: el store arma una tarjeta por tipo de
 * bus (`rm-tarjetas-tarifa`) y escribe el precio de una clase en todas las que
 * llevan ese asiento. Las pestañas de arriba son las CATEGORÍAS de pasajero
 * (Normal, Estudiante, Niño, Tercera edad).
 */
/** Diferencia habitual de cada clase respecto de la semicama, en porcentaje. */
const DEFAULT_PERCENT: Readonly<Record<string, number>> = {
  'Semicama': 0,
  'Semicama individual': 25,
  'Cama': 50,
  'Cama individual': 80,
  'Súper VIP': 130,
  'VIP Suite': 120,
  'Estándar': -15
};

@Component({
  selector: 'app-step-fares',
  imports: [WizardIconComponent, BusPickerComponent, HelpTipComponent, FillPricesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-fares.component.scss',
  template: `
    <app-bus-picker />

    @if (!seats().length) {
      <section class="step-block empty">
        <div class="title-row">
          <h3 class="step-block__title">Precios</h3>
          <app-help-tip label="Precios" text="Los precios se ponen por clase de asiento: lo que cuesta cada viaje en semicama, en cama, etc. Las clases salen de los buses que elegiste arriba." />
        </div>
        <p class="step-block__help">Primero elige los buses de la ruta.</p>
      </section>
    } @else {
      <div class="cards-bar" role="tablist" aria-label="Tarifas de la ruta">
        @for (tariff of tariffs(); track tariff.id) {
          <div class="cards-bar__item">
            <button type="button" role="tab" class="cards-bar__tab" [attr.aria-selected]="tariff.id === tariffId()" (click)="pick(tariff.id)">
              <span class="cards-bar__name">{{ tariff.name }}</span>
              @if (missingFor(tariff.id) > 0) {
                <span class="cards-bar__state cards-bar__state--todo">{{ missingFor(tariff.id) }} sin precio</span>
              } @else {
                <span class="cards-bar__state"><app-wizard-icon name="check" class="cards-bar__check" /> Completa</span>
              }
            </button>
            @if (tariff.id === tariffId()) {
              <button type="button" class="cards-bar__rename" (click)="openRename(tariff)"
                [attr.aria-label]="'Cambiar el nombre de la tarifa ' + tariff.name"
                [attr.title]="'Cambiar el nombre'">
                <app-wizard-icon name="pencil" />
              </button>
            }
            @if (tariffs().length > 1) {
              <button type="button" class="cards-bar__remove" (click)="removeTariff(tariff)"
                [attr.aria-label]="'Quitar la tarifa ' + tariff.name + ' y sus precios'"
                [attr.title]="'Quitar la tarifa ' + tariff.name">
                <span aria-hidden="true">&times;</span>
              </button>
            }
          </div>
        }
        <button type="button" class="cards-bar__add" (click)="openPicker()" [attr.aria-expanded]="picking()">
          <app-wizard-icon name="plus" class="btn-icon" /> Otra tarifa
        </button>
      </div>

      @if (picking()) {
        <section class="step-block add-panel" aria-label="Crear otra tarifa">
          <div class="title-row">
            <h3 class="step-block__title">{{ renaming() ? 'Cambiar el nombre' : 'Nueva tarifa' }}</h3>
            <app-help-tip label="Nueva tarifa" text="Una tarifa es una lista de precios completa para esta ruta: feriados, temporada alta, tercera edad, convenio con una empresa… Le pones el nombre que uses en tu empresa. Al crear un servicio se elige con cuál se vende." />
          </div>
          <label class="field">
            <span class="ends__label">¿Cómo se llama?</span>
            <input class="number-input add-panel__name" type="text" placeholder="Ej.: Feriados, Temporada alta, Tercera edad"
              [value]="newName()" (input)="newName.set($any($event.target).value); nameError.set('')" (keydown.enter)="confirmPanel()" />
          </label>
          @if (nameError()) { <p class="add-panel__error" role="alert">{{ nameError() }}</p> }
          @if (!renaming()) {
            <div class="chips" role="group" aria-label="Nombres frecuentes">
              @for (sugerencia of suggestions(); track sugerencia) {
                <button type="button" class="chip" (click)="newName.set(sugerencia); nameError.set('')">{{ sugerencia }}</button>
              }
            </div>
          }
          <div class="add-panel__row">
            @if (!renaming()) {
            <span>Empezar con los precios de <strong>{{ tariffName() }}</strong></span>
            <select class="ends__select" [value]="newDiscount()" (change)="newDiscount.set($any($event.target).value)" aria-label="Cómo empezar">
              <option value="">en blanco</option>
              <option value="-10">menos 10 %</option>
              <option value="-20">menos 20 %</option>
              <option value="-30">menos 30 %</option>
              <option value="-50">menos 50 %</option>
              <option value="10">más 10 %</option>
              <option value="20">más 20 %</option>
              <option value="50">más 50 %</option>
            </select>
            }
            <button type="button" class="ink-btn" (click)="confirmPanel()" [disabled]="!newName().trim()">{{ renaming() ? 'Guardar el nombre' : 'Crear tarifa' }}</button>
            <button type="button" class="link-btn" (click)="closePanel()">Cancelar</button>
          </div>
        </section>
      }

      <section class="step-block" aria-labelledby="matrix-title">
        <div class="matrix-head">
          <div class="title-row">
            <h3 id="matrix-title" class="step-block__title">
              {{ fixed() ? 'Precio del pasaje (Bs.)' : 'Precio de cada viaje (Bs.)' }}
              @if (tariffs().length > 1) { · {{ tariffName() }} }
            </h3>
            <app-help-tip label="Precio de cada viaje" text="Un precio por viaje y clase de asiento. Las columnas son las clases que llevan tus buses. Deja vacío lo que no se venda. Con «Boleto fijo», un solo precio por clase vale para cualquier viaje." />
          </div>
        </div>

        @if (undoable(); as last) {
          <p class="undo-bar" role="status">
            <app-wizard-icon name="check" class="undo-bar__icon" />
            {{ last.label }}
            <button type="button" class="link-btn" (click)="undo()">Deshacer</button>
          </p>
        }

        <div class="advanced">
          <button type="button" class="advanced__toggle" (click)="showAdvanced.set(!showAdvanced())" [attr.aria-expanded]="showAdvanced()">
            <app-wizard-icon name="chevron" class="advanced__icon" [class.advanced__icon--open]="showAdvanced()" />
            <span class="advanced__text">
              <span class="advanced__title">Modos de precio</span>
              <span class="advanced__summary">{{ advancedSummary() }}</span>
            </span>
          </button>
          @if (showAdvanced()) {
            <div class="advanced__body">
              <div class="matrix-toggles">
                <label class="toggle-row by-day">
                  <input type="checkbox" class="switch" [checked]="fixed()" (change)="setFixed($any($event.target).checked)" />
                  <span><strong>Boleto fijo</strong><small>Mismo precio para cualquier viaje.</small></span>
                </label>
                <label class="toggle-row by-day">
                  <input type="checkbox" class="switch" [checked]="byDay()" (change)="setByDay($any($event.target).checked)" />
                  <span><strong>Precios distintos por día</strong><small>Ej.: más caro viernes y domingo.</small></span>
                </label>
              </div>
            </div>
          }
        </div>

        @if (byDay()) {
          <div class="day-tabs" role="tablist" aria-label="Día de la semana">
            @for (day of weekdays; track day.key) {
              <button type="button" role="tab" class="day-tabs__tab" [attr.aria-selected]="day.key === day$()" (click)="day$.set(day.key)">{{ day.short }}</button>
            }
            <button type="button" class="link-btn day-tabs__copy" (click)="copyDayToWeek()">Copiar {{ dayLong() }} a toda la semana</button>
          </div>
        }

        @if (fixed()) {
          <div class="fixed">
            @for (seat of seats(); track seat.id) {
              <label class="field fixed__field">
                <span class="ends__label">{{ seat.name }} · cualquier viaje</span>
                <input class="number-input" type="number" min="0" step="0.5" inputmode="decimal" placeholder="ej. 10"
                  [value]="fixedPrice(seat.id) ?? ''"
                  (input)="setFixedPrice(seat.id, $any($event.target).value)" />
              </label>
            }
          </div>
        } @else {
          <app-fill-prices
            [seats]="seats()"
            [fullLabel]="fullLabel()"
            [hasKm]="hasKm()"
            [legs]="legCount()"
            [otherTariffs]="otherTariffs()"
            (apply)="fill($event)" />

          @if (crossedPrices().length) {
            <div class="price-alert" role="status">
              <app-wizard-icon name="alert" class="price-alert__icon" />
              <div>
                <p class="price-alert__title">
                  {{ crossedPrices().length === 1 ? 'Una clase tiene los precios cruzados' : crossedPrices().length + ' clases tienen los precios cruzados' }}
                </p>
                @for (aviso of crossedPrices(); track aviso.key) {
                  <p class="price-alert__line">
                    <strong>{{ aviso.seatName }}</strong> · {{ aviso.shortLabel }} ({{ aviso.shortKm }} km) {{ aviso.shortPrice }} Bs.
                    {{ aviso.shortPrice === aviso.longPrice ? 'es lo mismo que' : 'es más que' }}
                    {{ aviso.longLabel }} ({{ aviso.longKm }} km) {{ aviso.longPrice }} Bs.
                  </p>
                }
                <p class="price-alert__help">
                  Un viaje más corto no debería costar más, ni lo mismo, que uno más largo.
                  <span class="guide-text">Suele pasar al repartir una sola clase: las demás se quedan con los números de antes. Usa «Llenar las demás clases» o corrige a mano.</span>
                </p>
              </div>
            </div>
          }

          @if (kmNote(); as nota) {
            <p class="price-note">
              <app-wizard-icon name="info" class="price-note__icon" />
              <span>
                El reparto por kilómetros no cobra el costo fijo de subir al bus:
                <strong>{{ nota.label }}</strong> ({{ nota.km }} km) quedó en <strong>{{ nota.price }} Bs.</strong> en {{ nota.seatName }}.
                Si te parece bajo, prueba «Base + por km».
              </span>
            </p>
          }

          @if (suggestedHere(); as pendientes) {
            <div class="suggested-bar">
              <span class="suggested-bar__text">
                <strong>{{ pendientes }}</strong>
                {{ pendientes === 1 ? 'precio lo puso una herramienta' : 'precios los puso una herramienta' }} y nadie los revisó.
              </span>
              <button type="button" class="link-btn" (click)="confirmSuggested()">Los doy por buenos</button>
            </div>
          }

          @for (bloque of seatBlocks(); track bloque.index) {
            <div class="matrix-block">
              @if (seatBlocks().length > 1) {
                <div class="matrix-block__head">
                  <span class="matrix-block__badge" [class.matrix-block__badge--done]="bloque.done">{{ bloque.index + 1 }}</span>
                  <span class="matrix-block__names">{{ bloque.names }}</span>
                  @if (bloque.done) {
                    <span class="matrix-block__state matrix-block__state--done"><app-wizard-icon name="check" class="cards-bar__check" /> Completo</span>
                  } @else {
                    <span class="matrix-block__state">{{ bloque.missing }} sin precio</span>
                  }
                </div>
              }

              <div class="matrix-wrap" tabindex="0" role="region" [attr.aria-label]="'Precios: ' + bloque.names">
                <table class="matrix">
                  <thead>
                    <tr>
                      <th scope="col">Viaje</th>
                      @for (seat of bloque.seats; track seat.id) { <th scope="col" class="num">{{ seat.name }}</th> }
                    </tr>
                  </thead>
                  <tbody>
                    @for (group of groups(); track group.from) {
                      @if (groups().length > 1) {
                        <tr class="matrix__group">
                          <th scope="colgroup" [attr.colspan]="bloque.seats.length + 1">Desde {{ group.from }}</th>
                        </tr>
                      }
                      @for (row of group.rows; track row.tramo.key) {
                        <tr [class.matrix__row--missing]="rowMissing(row.tramo.key)">
                          <th scope="row" [attr.title]="label(row.tramo)">
                            @if (groups().length > 1) {
                              <!-- El grupo ya dice de dónde sale: repetirlo en cada fila come media tabla
                                   cuando la ciudad se llama "San Pedro de Tiquina". -->
                              <span class="matrix__tramo"><span class="matrix__arrow" aria-hidden="true">→</span> {{ row.tramo.to }}</span>
                              <span class="visually-hidden">desde {{ row.tramo.from }}</span>
                            } @else {
                              <span class="matrix__tramo">{{ label(row.tramo) }}</span>
                            }
                            <span class="matrix__km">{{ km(row.tramo) }} km</span>
                          </th>
                          @for (seat of bloque.seats; track seat.id; let c = $index) {
                            <td class="num">
                              <input class="number-input matrix__input" type="number" min="0" step="0.5" inputmode="decimal"
                                [class.matrix__input--suggested]="suggested(row.tramo.key, seat.id)"
                                [attr.title]="suggested(row.tramo.key, seat.id) ? 'Lo puso una herramienta de llenado. Revísalo.' : null"
                                [id]="'px-' + row.index + '-' + (bloque.first + c)"
                                [value]="price(row.tramo.key, seat.id) ?? ''"
                                (input)="setPrice(row.tramo.key, seat.id, $any($event.target).value)"
                                (keydown.enter)="move($event, row.index, bloque.first + c, 1)"
                                (keydown.arrowDown)="move($event, row.index, bloque.first + c, 1)"
                                (keydown.arrowUp)="move($event, row.index, bloque.first + c, -1)"
                                [attr.aria-label]="'Precio ' + label(row.tramo) + ', ' + seat.name" />
                            </td>
                          }
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }

        <p class="step-block__help applies-to">
          Se aplican a: {{ typeNames() }}.
        </p>


      </section>

    }
  `
})
export class StepFaresComponent {
  protected readonly store = inject(RouteDraftStore);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly weekdays = WEEKDAYS;

  protected readonly day$ = signal<Weekday>('LUN');
  /** Clase base del llenado rápido (la primera de la ruta si no se eligió otra). */
  protected readonly picking = signal(false);
  /** "Más opciones de precios": cerrado hasta que alguien lo pida. */
  protected readonly showAdvanced = signal(false);
  protected readonly newName = signal<string>('');
  /** Id de la tarifa que se está renombrando, o null si se está creando una. */
  protected readonly renaming = signal<string | null>(null);
  protected readonly nameError = signal<string>('');
  protected readonly newDiscount = signal<string>('');
  private readonly percents = signal<Readonly<Record<string, number>>>({});
  protected readonly suggestPrice = signal<string>('');
  protected readonly adjustDir = signal<'UP' | 'DOWN'>('UP');
  protected readonly adjustMode = signal<'PERCENT' | 'AMOUNT'>('PERCENT');
  protected readonly adjustValue = signal<string>('');

  /** Categoría de pasajero que se está editando. */
  private readonly chosen = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      // Las listas por tipo de bus se arman solas al llegar al paso.
      this.store.syncFareCards();
      // Cuántas clases entran depende del ancho real, así que hay que medirlo.
      const caja = this.host.nativeElement.querySelector('.step-block');
      if (!caja) return;
      const observador = new ResizeObserver(entradas => this.width.set(entradas[0].contentRect.width));
      observador.observe(caja);
      this.destroyRef.onDestroy(() => observador.disconnect());
    }, { injector: this.injector });
  }

  /** Clases de asiento de los buses elegidos. */
  protected readonly seats = computed(() => this.store.routeSeatTypes());

  /** Ancho disponible para la tabla; lo mide el navegador y cambia al redimensionar. */
  private readonly width = signal(0);

  /**
   * Las clases repartidas en bloques que entren en la pantalla, uno debajo del
   * otro. Con ocho clases y una pantalla angosta salen tres bloques en vez de
   * una tabla que hay que arrastrar de lado.
   */
  protected readonly seatBlocks = computed(() => {
    const seats = this.seats();
    const ancho = this.width();
    const porBloque = ancho ? Math.max(1, Math.floor((ancho - LABEL_WIDTH) / COLUMN_WIDTH)) : seats.length;
    const bloques: { index: number; first: number; seats: typeof seats; names: string; missing: number; done: boolean }[] = [];
    for (let desde = 0; desde < seats.length; desde += porBloque) {
      const grupo = seats.slice(desde, desde + porBloque);
      const faltan = this.tramos().reduce(
        (total, tramo) => total + grupo.filter(seat => !((this.price(tramo.key, seat.id) ?? 0) > 0)).length,
        0
      );
      bloques.push({
        index: bloques.length,
        first: desde,
        seats: grupo,
        names: grupo.map(seat => seat.name).join(' · '),
        missing: faltan,
        done: faltan === 0
      });
    }
    return bloques;
  });

  protected readonly tariffs = this.store.tariffs;

  /** La tarifa que se está editando. */
  protected readonly tariffId = computed(() => {
    const chosen = this.chosen();
    const list = this.tariffs();
    return chosen && list.some(item => item.id === chosen) ? chosen : list[0]?.id ?? '';
  });

  protected readonly tariffName = computed(() => this.tariffs().find(item => item.id === this.tariffId())?.name ?? 'Normal');

  /** Nombres frecuentes, como atajo: no son una lista cerrada. */
  protected readonly suggestions = computed(() => {
    const usados = new Set(this.tariffs().map(item => item.name.toLowerCase()));
    return ['Estudiante', 'Niño', 'Tercera edad', 'Feriados', 'Temporada alta'].filter(item => !usados.has(item.toLowerCase()));
  });

  protected readonly tramos = computed(() => Engine.enabledTramos(this.store.draft()!));

  /**
   * Viajes agrupados por ciudad de salida ("Desde La Paz"), como en el paso 3.
   * `index` es la posición en la tabla entera: la usa el teclado para bajar de
   * fila sin perderse entre grupos.
   */
  protected readonly groups = computed(() => {
    const out: { from: string; rows: { tramo: DraftTramo; index: number }[] }[] = [];
    this.tramos().forEach((tramo, index) => {
      const last = out[out.length - 1];
      if (last && last.from === tramo.from) last.rows.push({ tramo, index });
      else out.push({ from: tramo.from, rows: [{ tramo, index }] });
    });
    return out;
  });
  protected readonly dayLong = computed(() => WEEKDAYS.find(day => day.key === this.day$())?.long.toLowerCase() ?? '');
  protected readonly byDay = computed(() => this.cards().some(card => !!card.pricesByDay));

  /** Los tipos de bus a los que se aplican estos precios, en texto. */
  protected readonly typeNames = computed(() => Engine.busTypes(this.store.draft()!).map(type => type.name).join(' · '));

  protected readonly fullLabel = computed(() => {
    const draft = this.store.draft()!;
    return `${Engine.origin(draft)?.name ?? 'Origen'} → ${Engine.destination(draft)?.name ?? 'Destino'}`;
  });

  protected readonly canSuggest = computed(() => {
    const value = Number(this.suggestPrice());
    return value > 0 && Engine.totals(this.store.draft()!).km > 0;
  });

  /** Las listas (una por tipo de bus) de la categoría en pantalla. */
  private cards(): DraftFareCard[] {
    return this.store.cardsOfTariff(this.tariffId());
  }

  private day(): Weekday | null {
    return this.byDay() ? this.day$() : null;
  }

  /** Clase base del paso 2: la primera que ya tenga precios cargados. */
  /** Clase que ya tiene precios: de ella salen las demás. */
  protected readonly baseSeat = computed(() => {
    const conPrecio = this.seats().find(seat => this.tramos().some(tramo => (this.price(tramo.key, seat.id) ?? 0) > 0));
    return conPrecio?.id || this.seats()[0]?.id || '';
  });

  /** Las demás clases, que se pueden calcular a partir de la base. */
  protected readonly otherSeats = computed(() => this.seats().filter(seat => seat.id !== this.baseSeat()));

  protected readonly hasKm = computed(() => Engine.totals(this.store.draft()!).km > 0);

  /** ¿La clase base ya tiene precios? Solo entonces tiene sentido el paso 2. */
  protected readonly baseFilled = computed(() =>
    this.tramos().some(tramo => (this.price(tramo.key, this.baseSeat()) ?? 0) > 0)
  );

  protected seatName(seatId: string): string {
    return this.seats().find(seat => seat.id === seatId)?.name ?? '';
  }

  /** Diferencia sugerida para una clase respecto de la base. */
  protected percent(seatId: string): number {
    return this.percents()[seatId] ?? DEFAULT_PERCENT[this.seatName(seatId)] ?? 30;
  }

  protected setPercent(seatId: string, raw: string): void {
    const value = Number(raw);
    this.percents.update(current => ({ ...current, [seatId]: Number.isFinite(value) ? value : 0 }));
  }

  /** Viajes entre ciudades seguidas: los del método "sumando tramos". */
  protected readonly legCount = computed(() => Engine.legTramos(this.store.draft()!).length);

  /** Las demás tarifas de la ruta, para poder copiar de ellas. */
  protected readonly otherTariffs = computed(() => this.tariffs().filter(item => item.id !== this.tariffId()));

  /**
   * Aplica el método de llenado y marca como SUGERIDO todo lo que escribió.
   *
   * Ninguna herramienta calcula costos: reparte o copia un precio que decidió
   * la persona. El resultado sale redondo y con cara de calculado, así que la
   * tabla tiene que distinguir lo que alguien decidió de lo que salió de un
   * reparto, hasta que lo den por bueno.
   */
  protected fill(request: FillRequest): void {
    const antes = this.gridSnapshot();
    this.applyFill(request);
    this.markFilled(antes);
    this.kmFill.set(request.method === 'KM' ? { seatId: request.seatId } : null);
  }

  /** Foto de la matriz visible, para saber después qué celdas cambiaron. */
  private gridSnapshot(): Map<string, number | null> {
    const tariffId = this.tariffId();
    const day = this.day();
    const out = new Map<string, number | null>();
    for (const tramo of this.tramos()) {
      for (const seat of this.seats()) {
        out.set(`${tramo.key}|${seat.id}`, this.store.classPrice(tariffId, tramo.key, seat.id, day));
      }
    }
    return out;
  }

  private markFilled(antes: Map<string, number | null>): void {
    const tariffId = this.tariffId();
    const day = this.day();
    const cells: { tariffId: string; tramoKey: string; seatId: string; day: Weekday | null }[] = [];
    for (const tramo of this.tramos()) {
      for (const seat of this.seats()) {
        const ahora = this.store.classPrice(tariffId, tramo.key, seat.id, day);
        if (ahora === null || ahora === antes.get(`${tramo.key}|${seat.id}`)) continue;
        cells.push({ tariffId, tramoKey: tramo.key, seatId: seat.id, day });
      }
    }
    this.store.markSuggested(cells);
  }

  private applyFill(request: FillRequest): void {
    const draft = this.store.draft()!;
    const clase = this.seatName(request.seatId);

    switch (request.method) {
      case 'FLAT': {
        const otras = request.alsoOtherClasses ? this.seats().filter(seat => seat.id !== request.seatId) : [];
        const percents = request.classPercents ?? {};
        this.remember(
          otras.length
            ? `Se pusieron ${this.tramos().length === 1 ? 'un viaje' : `los ${this.tramos().length} viajes`} a ${request.price} Bs. en ${clase}, y las demás clases salieron de esa.`
            : `Se pusieron todos los viajes de ${clase} a ${request.price} Bs.`
        );
        this.mapGrids(grid => Engine.flatGrid(draft, grid, request.seatId, request.price ?? 0));
        for (const seat of otras) {
          this.mapGrids(grid => Engine.withClassFromBase(grid, request.seatId, seat.id, percents[seat.id] ?? 30));
        }
        break;
      }
      case 'KM': {
        const otras = request.alsoOtherClasses ? this.seats().filter(seat => seat.id !== request.seatId) : [];
        this.remember(
          otras.length
            ? `Se repartieron por kilómetros ${this.tramos().length === 1 ? 'un viaje' : `${this.tramos().length} viajes`} en ${this.seats().length === 1 ? 'una clase' : `${this.seats().length} clases`}.`
            : `Se repartieron los precios de ${clase} por kilómetros.`
        );
        this.mapGrids(grid => Engine.suggestByDistance(draft, grid, request.seatId, request.price ?? 0));
        // El camino simple completa además las demás clases, con su diferencia habitual.
        for (const seat of otras) {
          const percent = this.percent(seat.id);
          this.mapGrids(grid => Engine.withClassFromBase(grid, request.seatId, seat.id, percent));
        }
        break;
      }
      case 'PER_KM':
        this.remember(`Se llenó ${clase} con ${request.base} Bs. de base más ${request.perKm} Bs. por km.`);
        this.mapGrids(grid => Engine.perKmGrid(draft, grid, request.seatId, request.base ?? 0, request.perKm ?? 0));
        break;
      case 'COPY': {
        const origen = this.tariffs().find(item => item.id === request.sourceTariffId);
        const base = this.store.cardsOfTariff(request.sourceTariffId ?? '');
        if (!origen || !base.length) return;
        const percent = request.percent ?? 0;
        this.remember(`Se copiaron los precios de ${origen.name}${percent ? ` con ${percent > 0 ? 'más' : 'menos'} ${Math.abs(percent)} %` : ''}.`);
        this.store.updateTariff(this.tariffId(), card => {
          const from = base.find(item => item.vehicleTypeId === card.vehicleTypeId);
          if (!from) return card;
          return {
            ...card,
            prices: Engine.scaleGrid(from.prices, percent),
            pricesByDay: from.pricesByDay
              ? (Object.fromEntries(Object.entries(from.pricesByDay).map(([day, grid]) => [day, Engine.scaleGrid(grid, percent)])) as Record<Weekday, PriceGrid>)
              : null
          };
        });
        break;
      }
      case 'LEGS':
        this.sumLegs();
        break;
      case 'CLASSES': {
        const percents = request.classPercents ?? {};
        const otras = this.seats().filter(seat => seat.id !== request.seatId);
        if (!otras.length) return;
        this.remember(`Se llenaron ${otras.length === 1 ? 'una clase' : `${otras.length} clases`} a partir de ${clase}.`);
        for (const seat of otras) {
          this.mapGrids(grid => Engine.withClassFromBase(grid, request.seatId, seat.id, percents[seat.id] ?? 30));
        }
        break;
      }
      case 'ADJUST': {
        const value = request.value ?? 0;
        if (!(value > 0)) return;
        const unidad = request.mode === 'PERCENT' ? '%' : 'Bs';
        this.remember(`Se ${request.direction === 'UP' ? 'subieron' : 'bajaron'} todos los precios ${value} ${unidad}.`);
        this.mapGrids(grid => Engine.adjustGrid(grid, request.direction ?? 'UP', request.mode ?? 'PERCENT', value));
        break;
      }
      default:
        return;
    }
  }

  /** Suma los tramos seguidos para completar los viajes largos. */
  private sumLegs(): void {
    const draft = this.store.draft()!;
    this.remember('Se completaron los viajes largos sumando los tramos.');
    for (const seat of this.seats()) {
      this.mapGrids(grid => Engine.sumLegsGrid(draft, grid, seat.id));
    }
  }

  /**
   * Enter y las flechas bajan o suben de fila en la misma columna. Con
   * cincuenta casillas, sacar la mano del teclado cuesta.
   */
  protected move(event: Event, row: number, column: number, delta: number): void {
    const next = document.getElementById(`px-${row + delta}-${column}`);
    if (!(next instanceof HTMLInputElement)) return;
    event.preventDefault();
    next.focus();
    next.select();
  }

  /** Abre (o cierra) el panel para crear otra tarifa, siempre en blanco. */
  protected openPicker(): void {
    if (!this.picking() || this.renaming()) {
      this.newName.set('');
      this.newDiscount.set('');
      this.renaming.set(null);
      this.nameError.set('');
      this.picking.set(true);
      return;
    }
    this.picking.set(false);
  }

  /** Abre el mismo panel para corregir el nombre de una tarifa ya creada. */
  protected openRename(tariff: { id: string; name: string }): void {
    this.renaming.set(tariff.id);
    this.newName.set(tariff.name);
    this.nameError.set('');
    this.picking.set(true);
  }

  protected closePanel(): void {
    this.picking.set(false);
    this.renaming.set(null);
    this.nameError.set('');
  }

  /** ¿Ya hay otra tarifa con ese nombre? Dos iguales no se pueden distinguir. */
  private nameTaken(name: string, exceptId: string | null): boolean {
    const wanted = name.trim().toLowerCase();
    return this.tariffs().some(item => item.id !== exceptId && item.name.trim().toLowerCase() === wanted);
  }

  /** El botón del panel: crea o renombra, según para qué se abrió. */
  protected confirmPanel(): void {
    const name = this.newName().trim();
    if (!name) return;
    const renaming = this.renaming();
    if (this.nameTaken(name, renaming)) {
      this.nameError.set(`Ya existe una tarifa que se llama «${name}». Ponle otro nombre.`);
      return;
    }
    if (renaming) {
      this.store.renameTariff(renaming, name);
      this.closePanel();
      return;
    }
    this.addTariff();
  }

  /** Qué hay detrás de "Más opciones", para no abrirlo a ciegas. */
  protected readonly advancedSummary = computed(() => {
    const partes: string[] = [];
    if (this.fixed()) partes.push('boleto fijo');
    if (this.byDay()) partes.push('precios distintos por día');
    return partes.length ? partes.join(' · ') : 'boleto fijo · precios por día';
  });

  protected pick(categoryId: string): void {
    this.chosen.set(categoryId);
  }

  /** Viajes sin ningún precio en esa tarifa. */
  protected missingFor(tariffId: string): number {
    return this.tramos().filter(tramo =>
      !this.seats().some(seat => (this.store.classPrice(tariffId, tramo.key, seat.id, this.day()) ?? 0) > 0)
    ).length;
  }

  // ---- Sugerencias y avisos -------------------------------------------------

  /** El último reparto por kilómetros, para poder advertir del tramo corto. */
  private readonly kmFill = signal<{ readonly seatId: string } | null>(null);

  protected suggested(key: string, seatId: string): boolean {
    return this.store.isSuggested(this.tariffId(), key, seatId, this.day());
  }

  /** Cuántos precios de ESTA tarifa salieron de una herramienta y nadie miró. */
  protected readonly suggestedHere = computed(() => {
    this.store.suggestedCount();
    let total = 0;
    for (const tramo of this.tramos()) {
      for (const seat of this.seats()) {
        if (this.suggested(tramo.key, seat.id)) total++;
      }
    }
    return total;
  });

  protected confirmSuggested(): void {
    this.store.confirmSuggested(this.tariffId());
    this.kmFill.set(null);
  }

  /** Viajes cortos que cuestan igual o más que uno largo, en esta tarifa. */
  protected readonly crossedPrices = computed(() => {
    const tariffId = this.tariffId();
    return Engine.priceIssues(this.store.draft()!)
      .filter(issue => issue.tariffId === tariffId)
      .map(issue => ({ ...issue, key: issue.seatTypeId, seatName: this.seatName(issue.seatTypeId) }));
  });

  /**
   * El reparto por kilómetros no cobra el costo fijo de subir al bus, así que
   * el tramo corto sale regalado. No inventamos un mínimo: se dice en cuánto
   * quedó y que decida la persona.
   */
  protected readonly kmNote = computed(() => {
    const info = this.kmFill();
    if (!info || !this.suggestedHere()) return null;
    const ordenados = this.tramos()
      .map(tramo => ({ tramo, km: this.km(tramo) }))
      .filter(item => item.km > 0)
      .sort((a, b) => a.km - b.km);
    if (ordenados.length < 2) return null;
    const corto = ordenados[0];
    const largo = ordenados[ordenados.length - 1];
    if (corto.km > largo.km / 2) return null;
    const price = this.price(corto.tramo.key, info.seatId);
    if (price === null) return null;
    return { label: this.label(corto.tramo), km: corto.km, price, seatName: this.seatName(info.seatId) };
  });

  protected label(tramo: DraftTramo): string {
    return Engine.tramoLabel(this.store.draft()!, tramo);
  }

  protected km(tramo: DraftTramo): number {
    return Engine.tramoKm(this.store.draft()!, tramo);
  }

  protected price(key: string, seatId: string): number | null {
    return this.store.classPrice(this.tariffId(), key, seatId, this.day());
  }

  protected setPrice(key: string, seatId: string, raw: string): void {
    const value = raw === '' ? null : Math.max(0, Number(raw));
    this.store.setClassPrice(this.tariffId(), key, seatId, this.day(), Number.isFinite(value as number) ? value : null);
  }

  protected rowMissing(key: string): boolean {
    return !this.seats().some(seat => (this.price(key, seat.id) ?? 0) > 0);
  }

  // ---- Boleto fijo ----

  /** ¿Esta tarifa cobra un boleto fijo? Otra tarifa puede no hacerlo. */
  protected readonly fixed = computed(() => this.cards().some(card => card.fixedTicket));

  /**
   * Boleto fijo. Al prenderlo se guardan los precios de cada viaje y al
   * apagarlo vuelven solos: antes se perdían sin aviso y quedaba el mismo
   * precio en todos los viajes.
   */
  protected setFixed(on: boolean): void {
    const tariffId = this.tariffId();
    if (on) {
      this.remember(`Se igualaron los precios de ${this.tariffName()} en todos los viajes.`);
    } else {
      this.restore();
    }
    this.store.updateTariff(tariffId, card => ({ ...card, fixedTicket: on }));
    if (on) this.store.update(draft => Engine.applyFixedTicket(draft, tariffId));
  }

  protected fixedPrice(seatId: string): number | null {
    const tramo = this.tramos()[0];
    return tramo ? this.price(tramo.key, seatId) : null;
  }

  protected setFixedPrice(seatId: string, raw: string): void {
    const value = raw === '' ? null : Math.max(0, Number(raw));
    const price = Number.isFinite(value as number) ? value : null;
    for (const tramo of this.tramos()) {
      this.store.setClassPrice(this.tariffId(), tramo.key, seatId, this.day(), price);
    }
  }

  // ---- Por día, sugerencia y ajuste: se aplican a toda la categoría ----

  protected setByDay(on: boolean): void {
    this.store.updateTariff(this.tariffId(), card => (on ? Engine.splitByDay(card) : Engine.mergeDays(card)));
  }

  protected copyDayToWeek(): void {
    const day = this.day$();
    this.store.updateTariff(this.tariffId(), card => {
      if (!card.pricesByDay) return card;
      const source = card.pricesByDay[day];
      return { ...card, pricesByDay: Object.fromEntries(Engine.ALL_DAYS.map(d => [d, source])) as Record<Weekday, PriceGrid> };
    });
  }

  /** Lo último que se puede deshacer, con su explicación. */
  protected readonly undoable = signal<{ readonly label: string; readonly cards: readonly DraftFareCard[] } | null>(null);

  /** Guarda los precios actuales antes de un cambio masivo. */
  private remember(label: string): void {
    this.undoable.set({ label, cards: this.store.draft()!.fareCards });
  }

  /** Devuelve los precios al estado anterior al último cambio masivo. */
  private restore(): void {
    const snapshot = this.undoable();
    if (!snapshot) return;
    this.store.update(draft => ({ ...draft, fareCards: [...snapshot.cards] }));
    this.undoable.set(null);
    // Los precios vuelven atrás; las marcas de "sugerido" no tendrían a qué
    // referirse y quedarían señalando números que ya no están.
    this.store.confirmSuggested(this.tariffId());
    this.kmFill.set(null);
  }

  protected undo(): void {
    this.restore();
  }

  /** Aplica un cambio a la matriz visible de cada lista de la categoría. */
  private mapGrids(change: (grid: PriceGrid) => PriceGrid): void {
    const day = this.day();
    this.store.updateTariff(this.tariffId(), card => {
      if (day && card.pricesByDay) {
        return { ...card, pricesByDay: { ...card.pricesByDay, [day]: change(card.pricesByDay[day]) } };
      }
      return { ...card, prices: change(card.prices) };
    });
  }

  // ---- Categorías de pasajero ----

  /**
   * Crea una tarifa nueva con el nombre que puso la persona. Si eligió empezar
   * desde la tarifa actual, nace con esos precios ajustados; si no, en blanco.
   */
  protected addTariff(): void {
    const name = this.newName().trim();
    if (!name) return;
    const source = this.tariffId();
    const base = this.store.cardsOfTariff(source);
    const id = Engine.localId('trf');
    const percent = Number(this.newDiscount());

    this.store.syncFareCards({ id, name });

    if (this.newDiscount() && Number.isFinite(percent)) {
      this.store.updateTariff(id, card => {
        const from = base.find(item => item.vehicleTypeId === card.vehicleTypeId);
        if (!from) return card;
        return {
          ...card,
          prices: Engine.scaleGrid(from.prices, percent),
          pricesByDay: from.pricesByDay
            ? (Object.fromEntries(Object.entries(from.pricesByDay).map(([day, grid]) => [day, Engine.scaleGrid(grid, percent)])) as Record<Weekday, PriceGrid>)
            : null
        };
      });
    }

    this.chosen.set(id);
    this.newName.set('');
    this.closePanel();
  }

  /**
   * Quita una tarifa entera. No pregunta "¿está seguro?": avisa qué se llevó y
   * deja deshacerlo, que es lo que de verdad salva el trabajo.
   */
  protected removeTariff(tariff: { id: string; name: string }): void {
    if (this.tariffs().length < 2) return;
    const precios = this.priceCount(tariff.id);
    const conPrecios = precios === 0 ? '' : precios === 1 ? ' y su precio' : ` y sus ${precios} precios`;
    this.remember(`Se quitó la tarifa ${tariff.name}${conPrecios}.`);
    this.store.removeTariff(tariff.id);
    if (this.chosen() === tariff.id) this.chosen.set(null);
  }

  /** Cuántos precios cargados tiene una tarifa (para decirlo al quitarla). */
  private priceCount(tariffId: string): number {
    let total = 0;
    for (const card of this.store.cardsOfTariff(tariffId)) {
      const grids = card.pricesByDay ? Object.values(card.pricesByDay) : [card.prices];
      for (const grid of grids) {
        for (const row of Object.values(grid)) {
          total += Object.values(row).filter(value => (value ?? 0) > 0).length;
        }
      }
    }
    return total;
  }
}
