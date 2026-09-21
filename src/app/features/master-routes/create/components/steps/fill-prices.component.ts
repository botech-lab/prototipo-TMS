import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { SeatType } from '../../../../parametric/models/parametric.model';
import { WizardIconComponent } from '../wizard-icon.component';
import { NewBadgeComponent } from '../new-badge.component';
import { HelpTipComponent } from '../help-tip.component';

/** Las formas de llenar precios que ofrece la caja de herramientas. */
export type FillMethod = 'FLAT' | 'KM' | 'PER_KM' | 'LEGS' | 'COPY' | 'CLASSES' | 'ADJUST' | 'ATT';

export interface FillRequest {
  readonly method: FillMethod;
  /** El camino simple: además de la clase base, calcula las demás. */
  readonly alsoOtherClasses?: boolean;
  /** Clase de asiento sobre la que se aplica (vacío en COPY, que copia todo). */
  readonly seatId: string;
  /** FLAT: el precio; KM: el del viaje completo. */
  readonly price?: number;
  /** PER_KM. */
  readonly base?: number;
  readonly perKm?: number;
  /** COPY: de qué tarifa y con qué diferencia. */
  readonly sourceTariffId?: string;
  readonly percent?: number;
  /** ADJUST: subir o bajar, en porcentaje o en bolivianos. */
  readonly direction?: 'UP' | 'DOWN';
  readonly mode?: 'PERCENT' | 'AMOUNT';
  readonly value?: number;
  /** CLASSES: qué diferencia lleva cada clase respecto de la base. */
  readonly classPercents?: Readonly<Record<string, number>>;
}

/**
 * ============================================================================
 * CAJA DE HERRAMIENTAS PARA LLENAR PRECIOS  ★ NUEVO
 * ============================================================================
 * No obliga a un solo método: quien pone precios elige cómo. Vive aparte
 * porque lo mismo hace falta al crear un servicio y al cambiar precios de un
 * servicio en marcha; este componente no sabe nada de rutas maestras, solo
 * pide datos y avisa qué hacer (`apply`).
 * ============================================================================
 */
@Component({
  selector: 'app-fill-prices',
  imports: [WizardIconComponent, NewBadgeComponent, HelpTipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './fill-prices.component.scss',
  template: `
    <div class="fill">
      <div class="fill__head">
        <span class="title-row">
          <app-wizard-icon name="info" class="fill__icon" />
          <strong>Llenar rápido</strong>
          <app-new-badge detail="Varias formas de llenar los precios de todos los viajes de una vez." />
          <app-help-tip label="Llenar rápido" text="Elige cómo llenar los precios: todos iguales, repartidos por kilómetros, con un precio base más un tanto por kilómetro, sumando los tramos seguidos, o copiando otra tarifa. Ninguna de estas formas calcula costos: reparten o copian un precio que decides tú. Todo queda editable después: son sugerencias, no candados." />
        </span>
      </div>

      @if (!advanced()) {
        <div class="fill__row">
          <span>Todos los viajes en</span>
          <select class="ends__select" [value]="seatId()" (change)="seatChoice.set($any($event.target).value)" aria-label="Clase de asiento">
            @for (seat of seats(); track seat.id) { <option [value]="seat.id" [selected]="seat.id === seatId()">{{ seat.name }}</option> }
          </select>
          <span>a</span>
          <input class="number-input fill__price" type="number" min="0" placeholder="ej. 100" [value]="price()" (input)="price.set($any($event.target).value)" (keydown.enter)="sendSimple()" aria-label="Precio para todos los viajes" />
          <span>Bs.</span>
          <button type="button" class="ink-btn" (click)="sendSimple()" [disabled]="!(+price() > 0)">Llenar la tabla</button>
        </div>
        <p class="fill__what guide-text">El mismo precio para cada viaje, y las demás clases salen de esa. Después corriges lo que quieras.</p>
        <button type="button" class="link-btn fill__more" (click)="advanced.set(true)">Otras formas de llenar ({{ methods().length - 1 }})</button>
      } @else {

      <div class="fill__methods" role="radiogroup" aria-label="Cómo llenar los precios">
        @for (item of methods(); track item.key) {
          <button type="button" class="chip" role="radio" [attr.aria-checked]="item.key === method()" (click)="method.set(item.key)">
            @if (item.key === method()) { <app-wizard-icon name="check" class="chip__icon" /> }
            {{ item.label }}
          </button>
        }
      </div>

      <p class="fill__what guide-text">{{ explanation() }}</p>

      @if (method() !== 'COPY' && method() !== 'ATT') {
        <label class="fill__seat">
          <span>Para la clase</span>
          <select class="ends__select" [value]="seatId()" (change)="seatChoice.set($any($event.target).value)" aria-label="Clase de asiento">
            @for (seat of seats(); track seat.id) { <option [value]="seat.id" [selected]="seat.id === seatId()">{{ seat.name }}</option> }
          </select>
        </label>
      }

      <div class="fill__row">
        @switch (method()) {
          @case ('FLAT') {
            <span>Todos los viajes a</span>
            <input class="number-input fill__price" type="number" min="0" placeholder="ej. 100" [value]="price()" (input)="price.set($any($event.target).value)" (keydown.enter)="send()" aria-label="Precio para todos los viajes" />
            <span>Bs.</span>
          }
          @case ('KM') {
            <span>{{ fullLabel() }} cuesta</span>
            <input class="number-input fill__price" type="number" min="0" placeholder="ej. 120" [value]="price()" (input)="price.set($any($event.target).value)" (keydown.enter)="send()" aria-label="Precio del viaje completo" />
            <span>Bs. y el resto se reparte por kilómetros</span>
          }
          @case ('PER_KM') {
            <span>Base</span>
            <input class="number-input fill__price" type="number" min="0" placeholder="ej. 10" [value]="base()" (input)="base.set($any($event.target).value)" aria-label="Precio base" />
            <span>Bs. más</span>
            <input class="number-input fill__price" type="number" min="0" step="0.05" placeholder="ej. 0.30" [value]="perKm()" (input)="perKm.set($any($event.target).value)" (keydown.enter)="send()" aria-label="Precio por kilómetro" />
            <span>Bs. por km</span>
          }
          @case ('LEGS') {
            <span>Carga los {{ legs() }} {{ legs() === 1 ? 'tramo seguido' : 'tramos seguidos' }} en la tabla y el resto se suma solo.</span>
          }
          @case ('COPY') {
            <span>Copiar de</span>
            <select class="ends__select" [value]="sourceTariffId()" (change)="sourceChoice.set($any($event.target).value)" aria-label="Tarifa de origen">
              @for (tariff of otherTariffs(); track tariff.id) { <option [value]="tariff.id" [selected]="tariff.id === sourceTariffId()">{{ tariff.name }}</option> }
            </select>
            <select class="ends__select" [value]="percent()" (change)="percent.set($any($event.target).value)" aria-label="Diferencia">
              <option value="0">igual</option>
              <option value="-10">menos 10 %</option>
              <option value="-20">menos 20 %</option>
              <option value="-30">menos 30 %</option>
              <option value="-50">menos 50 %</option>
              <option value="10">más 10 %</option>
              <option value="20">más 20 %</option>
              <option value="50">más 50 %</option>
            </select>
          }
          @case ('CLASSES') {
            <span>Las demás clases salen de <strong>{{ seatName(seatId()) }}</strong>:</span>
            @for (seat of otherSeats(); track seat.id) {
              <label class="fill__pct">
                <span>{{ seat.name }}</span>
                <input class="number-input" type="number" step="5" [value]="percentOf(seat.id)" (input)="setPercent(seat.id, $any($event.target).value)" [attr.aria-label]="'Diferencia para ' + seat.name" />
                <span>%</span>
              </label>
            }
          }
          @case ('ADJUST') {
            <select class="ends__select" [value]="direction()" (change)="direction.set($any($event.target).value)" aria-label="Subir o bajar">
              <option value="UP">Subir</option>
              <option value="DOWN">Bajar</option>
            </select>
            <span>todos los precios</span>
            <input class="number-input fill__price" type="number" min="0" [value]="adjustValue()" (input)="adjustValue.set($any($event.target).value)" (keydown.enter)="send()" aria-label="Cuánto" />
            <select class="ends__select" [value]="adjustMode()" (change)="adjustMode.set($any($event.target).value)" aria-label="Porcentaje o bolivianos">
              <option value="PERCENT">%</option>
              <option value="AMOUNT">Bs.</option>
            </select>
          }
          @case ('ATT') {
            <span class="fill__pending">Falta cargar el tarifario de la ATT en Paramétricas. Cuando esté, aquí sale el precio mínimo y máximo autorizado de cada viaje y clase, y se llena con el que elijas.</span>
          }
        }

        @if (method() !== 'ATT') {
          <button type="button" class="secondary-btn" (click)="send()" [disabled]="!ready()">{{ actionLabel() }}</button>
        }
      </div>

      @if (method() === 'KM' && !hasKm()) {
        <p class="fill__warn">Faltan los kilómetros en Paradas y tiempos: sin ellos no se puede repartir.</p>
      }
      @if (method() === 'PER_KM' && !hasKm()) {
        <p class="fill__warn">Faltan los kilómetros en Paradas y tiempos: sin ellos solo se aplicaría el precio base.</p>
      }

      <button type="button" class="link-btn fill__more" (click)="advanced.set(false)">Volver a lo simple</button>
      }
    </div>
  `
})
export class FillPricesComponent {
  readonly seats = input.required<readonly SeatType[]>();
  /** "La Paz → Potosí", para el método por kilómetros. */
  readonly fullLabel = input<string>('');
  readonly hasKm = input<boolean>(false);
  /** Cuántos viajes son entre ciudades seguidas (método "sumando tramos"). */
  readonly legs = input<number>(0);
  /** Otras tarifas de las que se puede copiar. */
  readonly otherTariffs = input<readonly { id: string; name: string }[]>([]);

  readonly apply = output<FillRequest>();

  /** Falso: una sola pregunta. Verdadero: todos los métodos (lo pide la persona). */
  protected readonly advanced = signal(false);
  protected readonly method = signal<FillMethod>('FLAT');
  protected readonly price = signal<string>('');
  protected readonly base = signal<string>('10');
  protected readonly perKm = signal<string>('0.30');
  protected readonly percent = signal<string>('0');
  protected readonly direction = signal<'UP' | 'DOWN'>('UP');
  protected readonly adjustMode = signal<'PERCENT' | 'AMOUNT'>('PERCENT');
  protected readonly adjustValue = signal<string>('');
  private readonly percents = signal<Readonly<Record<string, number>>>({});

  protected readonly seatChoice = signal<string>('');
  protected readonly sourceChoice = signal<string>('');

  /** Las clases que se pueden llenar a partir de la base. */
  protected readonly otherSeats = computed(() => this.seats().filter(seat => seat.id !== this.seatId()));

  protected seatName(seatId: string): string {
    return this.seats().find(seat => seat.id === seatId)?.name ?? '';
  }

  /** Diferencia habitual de cada clase respecto de la base. */
  protected percentOf(seatId: string): number {
    return this.percents()[seatId] ?? this.defaults()[this.seatName(seatId)] ?? 30;
  }

  protected setPercent(seatId: string, raw: string): void {
    const value = Number(raw);
    this.percents.update(current => ({ ...current, [seatId]: Number.isFinite(value) ? value : 0 }));
  }

  private readonly defaults = signal<Readonly<Record<string, number>>>({
    'Semicama': 0,
    'Semicama individual': 25,
    'Cama': 50,
    'Cama individual': 80,
    'Súper VIP': 130,
    'VIP Suite': 120,
    'Estándar': -15
  });

  protected readonly seatId = computed(() => this.seatChoice() || this.seats()[0]?.id || '');
  protected readonly sourceTariffId = computed(() => this.sourceChoice() || this.otherTariffs()[0]?.id || '');

  protected readonly methods = computed(() => {
    const list: { key: FillMethod; label: string }[] = [
      { key: 'FLAT', label: 'Un solo precio' },
      { key: 'KM', label: 'Por kilómetros' },
      { key: 'PER_KM', label: 'Base + por km' }
    ];
    if (this.legs() > 0) list.push({ key: 'LEGS', label: 'Sumando tramos' });
    if (this.otherTariffs().length) list.push({ key: 'COPY', label: 'Copiar otra tarifa' });
    if (this.otherSeats().length) list.push({ key: 'CLASSES', label: 'Las demás clases' });
    list.push({ key: 'ADJUST', label: 'Subir o bajar todo' }, { key: 'ATT', label: 'Precios ATT' });
    return list;
  });

  protected readonly explanation = computed(() => {
    switch (this.method()) {
      case 'FLAT': return 'El mismo precio para todos los viajes de esa clase. Útil en rutas cortas o cuando la empresa cobra parejo.';
      case 'KM': return 'Reparte el precio del viaje completo entre los viajes, a proporción de sus kilómetros. No mira costos ni combustible: es un reparto.';
      case 'PER_KM': return 'Un costo fijo por subir al bus más un tanto por kilómetro. El tramo corto no queda regalado.';
      case 'LEGS': return 'Cargas solo los saltos de una ciudad a la siguiente; los viajes largos salen de sumarlos.';
      case 'COPY': return 'Toma los precios de otra tarifa de esta ruta y les aplica una diferencia.';
      case 'CLASSES': return 'Saca cama, súper VIP y las demás a partir de una clase que ya tenga precios.';
      case 'ADJUST': return 'Cambia los precios que YA están cargados: el aumento de temporada, por ejemplo.';
      case 'ATT': return 'La ATT publica un precio mínimo y máximo por destino y clase. Es el único dato de afuera: lo demás lo decides tú.';
    }
  });

  protected readonly actionLabel = computed(() => {
    switch (this.method()) {
      case 'COPY': return 'Copiar precios';
      case 'LEGS': return 'Completar los viajes largos';
      case 'CLASSES': return 'Llenar las demás clases';
      case 'ADJUST': return 'Aplicar';
      default: return 'Llenar la tabla';
    }
  });

  protected readonly ready = computed(() => {
    switch (this.method()) {
      case 'FLAT': return Number(this.price()) > 0;
      case 'KM': return Number(this.price()) > 0 && this.hasKm();
      case 'PER_KM': return Number(this.base()) >= 0 && Number(this.perKm()) > 0;
      case 'COPY': return !!this.sourceTariffId();
      case 'LEGS': return true;
      case 'CLASSES': return this.otherSeats().length > 0;
      case 'ADJUST': return Number(this.adjustValue()) > 0;
      default: return false;
    }
  });

  /**
   * El camino de siempre: un solo precio para todos los viajes, y las demás
   * clases calculadas a partir de esa. No necesita kilómetros.
   */
  protected sendSimple(): void {
    const price = Number(this.price());
    if (!(price > 0)) return;
    this.apply.emit({
      method: 'FLAT',
      seatId: this.seatId(),
      price,
      alsoOtherClasses: true,
      classPercents: Object.fromEntries(this.otherSeats().map(seat => [seat.id, this.percentOf(seat.id)]))
    });
    this.price.set('');
  }

  protected send(): void {
    if (!this.ready()) return;
    this.apply.emit({
      method: this.method(),
      seatId: this.seatId(),
      price: Number(this.price()) || undefined,
      base: Number(this.base()) || 0,
      perKm: Number(this.perKm()) || 0,
      sourceTariffId: this.sourceTariffId(),
      percent: Number(this.percent()) || 0,
      direction: this.direction(),
      mode: this.adjustMode(),
      value: Number(this.adjustValue()) || 0,
      classPercents: Object.fromEntries(this.otherSeats().map(seat => [seat.id, this.percentOf(seat.id)]))
    });
    this.price.set('');
    this.adjustValue.set('');
  }
}
