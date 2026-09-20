import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DraftSchedule, Weekday, WEEKDAYS } from '../../models/route-draft.model';
import { RouteDraftStore } from '../../services/route-draft.store';
import * as Engine from '../../services/route-draft-engine';
import { WizardIconComponent } from '../wizard-icon.component';
import { HelpTipComponent } from '../help-tip.component';
import { SalesChannel } from '../../../../parametric/models/parametric.model';

interface ChannelGroup {
  readonly key: string;
  readonly title: string;
  readonly help: string;
  readonly channels: readonly SalesChannel[];
}

/**
 * Paso 4 · Días y venta (Aleta: "Horarios y canales").
 * En Aleta el "horario" no lleva horas: son los días de operación y las reglas
 * de venta. Las horas de salida las pone cada servicio.
 */
@Component({
  selector: 'app-step-operation',
  imports: [WizardIconComponent, HelpTipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-operation.component.scss',
  template: `
    @let s = store.draft()!.schedule;

    <section class="step-block" aria-labelledby="days-title">
      <div class="title-row">
        <h3 id="days-title" class="step-block__title">¿Qué días opera?</h3>
        <app-help-tip label="Días de operación" text="Los servicios de esta ruta solo se pueden programar en estos días." />
      </div>
      <p class="step-block__help">Opera {{ daysText() }}.</p>
      <div class="days" role="group" aria-labelledby="days-title">
        @for (day of weekdays; track day.key) {
          <button type="button" class="chip day" [attr.aria-pressed]="s.days.includes(day.key)" (click)="toggleDay(day.key)" [attr.aria-label]="day.long">
            {{ day.short }}
          </button>
        }
      </div>
      <div class="days__shortcuts">
        <button type="button" class="link-btn" (click)="setDays(all)">Todos los días</button>
        <button type="button" class="link-btn" (click)="setDays(workdays)">Lunes a viernes</button>
        <button type="button" class="link-btn" (click)="setDays(weekend)">Fines de semana</button>
      </div>
      <label class="toggle-row">
        <input type="checkbox" class="switch" [checked]="s.alternateDays" (change)="patch({ alternateDays: $any($event.target).checked })" />
        <span><strong>Días alternos</strong><small>Día por medio, en vez de días fijos.</small></span>
      </label>
    </section>

    <section class="step-block" aria-labelledby="rules-title">
      <h3 id="rules-title" class="step-block__title">Reglas de venta</h3>
      <div class="rules">
        <div class="rule">
          <label class="toggle-row">
            <input type="checkbox" class="switch" [checked]="s.reservations" (change)="patch({ reservations: $any($event.target).checked })" />
            <span><strong>Se puede reservar</strong><small>El pasaje se aparta y se paga después.</small></span>
          </label>
          @if (s.reservations) {
            <label class="rule__extra">
              <span>Hasta</span>
              <input class="number-input" type="number" min="1" [value]="s.reservationDaysAhead ?? ''" (input)="patch({ reservationDaysAhead: num($any($event.target).value) })" aria-label="Días de anticipación para reservar" [attr.aria-invalid]="!s.reservationDaysAhead" />
              <span>días antes del viaje</span>
            </label>
          }
        </div>
        <div class="rule">
          <label class="toggle-row">
            <input type="checkbox" class="switch" [checked]="s.allowCancellation" (change)="patch({ allowCancellation: $any($event.target).checked })" />
            <span><strong>Se puede cancelar</strong><small>El pasajero puede anular su pasaje según la política de la empresa.</small></span>
          </label>
        </div>
        <div class="rule">
          <label class="toggle-row">
            <input type="checkbox" class="switch" [checked]="s.allowDiscount" (change)="patch({ allowDiscount: $any($event.target).checked, showDiscountToCustomer: $any($event.target).checked && s.showDiscountToCustomer })" />
            <span><strong>Permite descuentos</strong><small>El vendedor puede aplicar descuentos (estudiante, tercera edad…).</small></span>
          </label>
          @if (s.allowDiscount) {
            <label class="toggle-row rule__nested">
              <input type="checkbox" class="switch" [checked]="s.showDiscountToCustomer" (change)="patch({ showDiscountToCustomer: $any($event.target).checked })" />
              <span><strong>Mostrar el descuento al cliente</strong><small>Se ve en el portal y en el pasaje impreso.</small></span>
            </label>
          }
        </div>
        <div class="rule">
          <label class="toggle-row">
            <input type="checkbox" class="switch" [checked]="s.phoneLock" (change)="patch({ phoneLock: $any($event.target).checked })" />
            <span><strong>Bloqueo telefónico</strong><small>Los asientos apartados por teléfono quedan bloqueados hasta que se paguen.</small></span>
          </label>
        </div>
      </div>
    </section>

    <section class="step-block" aria-labelledby="channels-title">
      <div class="title-row">
        <h3 id="channels-title" class="step-block__title">¿Por dónde se venden los pasajes?</h3>
        <app-help-tip label="Canales de venta" text="Cada servicio de esta ruta solo se vende por estos canales. Si tienes más de una lista de precios, en el paso 5 (Buses y tarifas) eliges cuál usa cada canal." />
      </div>
      <p class="step-block__help">{{ s.channelIds.length }} {{ s.channelIds.length === 1 ? 'canal habilitado' : 'canales habilitados' }}.</p>
      @for (group of channelGroups(); track group.key) {
        <div class="channel-group">
          <div class="channel-group__head">
            <h4 class="channel-group__title">{{ group.title }}</h4>
            <span class="channel-group__help">{{ group.help }}</span>
          </div>
          <div class="chips" role="group" [attr.aria-label]="group.title">
            @for (channel of group.channels; track channel.id) {
              <button type="button" class="chip" [attr.aria-pressed]="s.channelIds.includes(channel.id)" (click)="toggleChannel(channel.id)">
                @if (s.channelIds.includes(channel.id)) { <app-wizard-icon name="check" class="chip__icon" /> }
                {{ channel.name }}
                @if (channel.commissionPercent) { <span class="chip__meta">{{ channel.commissionPercent }} %</span> }
              </button>
            }
          </div>
        </div>
      }
    </section>
  `
})
export class StepOperationComponent {
  protected readonly store = inject(RouteDraftStore);
  protected readonly weekdays = WEEKDAYS;
  protected readonly all = Engine.ALL_DAYS;
  protected readonly workdays: readonly Weekday[] = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE'];
  protected readonly weekend: readonly Weekday[] = ['SAB', 'DOM'];

  protected readonly daysText = computed(() => {
    const days = this.store.draft()!.schedule.days;
    return days.length ? Engine.daysLabel(days) : 'ningún día (elige al menos uno)';
  });

  /** Agrupa los canales del catálogo según cómo operan (isAgent / isApi). */
  protected readonly channelGroups = computed<ChannelGroup[]>(() => {
    const channels = this.store.activeChannels();
    return [
      { key: 'people', title: 'Con vendedor', help: 'Boletería, agentes y teléfono', channels: channels.filter(c => c.isAgent) },
      { key: 'self', title: 'El cliente compra solo', help: 'Portal web y app', channels: channels.filter(c => !c.isAgent && !c.isApi) },
      { key: 'api', title: 'Integraciones', help: 'Agencias en línea y sistemas externos', channels: channels.filter(c => c.isApi) }
    ].filter(group => group.channels.length);
  });

  protected num(value: string): number | null {
    const parsed = Number(value);
    return value !== '' && Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
  }

  protected patch(change: Partial<DraftSchedule>): void {
    this.store.update(draft => ({ ...draft, schedule: { ...draft.schedule, ...change } }));
  }

  protected toggleDay(day: Weekday): void {
    const days = this.store.draft()!.schedule.days;
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    this.setDays(Engine.ALL_DAYS.filter(d => next.includes(d)));
  }

  protected setDays(days: readonly Weekday[]): void {
    this.patch({ days: [...days] });
  }

  protected toggleChannel(id: string): void {
    const ids = this.store.draft()!.schedule.channelIds;
    this.patch({ channelIds: ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id] });
  }
}
