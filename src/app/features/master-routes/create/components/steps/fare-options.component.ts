import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DraftChannelCards, DraftConfiguration, DraftFareCard, DraftOmission, OmissionKind } from '../../models/route-draft.model';
import { RouteDraftStore } from '../../services/route-draft.store';
import * as Engine from '../../services/route-draft-engine';
import { WizardIconComponent } from '../wizard-icon.component';
import { HelpTipComponent } from '../help-tip.component';

/**
 * Parte final del paso 5 · Buses y tarifas (Aleta: "Configuraciones").
 * La configuración ya no es un paso aparte: Aleta guarda una por tipo de bus,
 * con mapa y horario de los pasos 3 y 4 y vehículo y uso de la tarjeta
 * predeterminada de ese tipo. Aquí solo queda lo que no se puede deducir: qué
 * tarifa usa cada canal (si un tipo tiene más de una tarjeta) y, si la ruta
 * tiene más de un tipo de bus, en qué paradas no para cada tipo.
 */
@Component({
  selector: 'app-fare-options',
  imports: [WizardIconComponent, HelpTipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './fare-options.component.scss',
  template: `
    @let d = store.draft()!;
    @let c = d.configuration;

    @if (channelTypes().length) {
      <section class="step-block" aria-labelledby="cfg-cards">
        <div class="title-row">
          <h3 id="cfg-cards" class="step-block__title">¿Qué precios usa cada canal?</h3>
          <app-help-tip label="¿Qué precios usa cada canal?" text="Aparece porque un tipo de bus tiene más de una lista de precios. La predeterminada se usa siempre que un canal no tenga una propia." />
        </div>
        @for (type of channelTypes(); track type.id) {
          @let cc = channels(type.id);
          <div class="channel-type">
            @if (channelTypes().length > 1 || multiType()) {
              <h4 class="channel-type__title">Buses {{ type.name }}</h4>
            }
            <div class="card-grid">
              <label>
                <span class="ends__label">Predeterminada <span class="required">(obligatoria)</span></span>
                <select class="ends__select" (change)="patchType(type.id, { defaultCardId: $any($event.target).value })">
                  @for (card of cardsOf(type.id); track card.id) { <option [value]="card.id" [selected]="card.id === defaultCardId(type.id)">{{ card.name }}</option> }
                </select>
              </label>
              <label>
                <span class="ends__label">Agentes y boletería</span>
                <select class="ends__select" (change)="patchType(type.id, { agentCardId: $any($event.target).value || null })">
                  <option value="" [selected]="!cc.agentCardId">Usar la predeterminada</option>
                  @for (card of cardsOf(type.id); track card.id) { <option [value]="card.id" [selected]="card.id === cc.agentCardId">{{ card.name }}</option> }
                </select>
              </label>
              <label>
                <span class="ends__label">Web y app</span>
                <select class="ends__select" (change)="patchType(type.id, { webCardId: $any($event.target).value || null })">
                  <option value="" [selected]="!cc.webCardId">Usar la predeterminada</option>
                  @for (card of cardsOf(type.id); track card.id) { <option [value]="card.id" [selected]="card.id === cc.webCardId">{{ card.name }}</option> }
                </select>
              </label>
            </div>
          </div>
        }
      </section>
    }

    @if (multiType()) {
      <section class="step-block step-block--muted" aria-labelledby="cfg-advanced">
        <button type="button" class="advanced__toggle" id="cfg-advanced" (click)="open.set(!isOpen())" [attr.aria-expanded]="isOpen()" aria-controls="cfg-advanced-body">
          <app-wizard-icon name="chevron" class="advanced__icon" [class.advanced__icon--open]="isOpen()" />
          <span class="advanced__text">
            <span class="advanced__title">¿Algún tipo de bus no para en todas las ciudades? <span class="optional">(opcional)</span></span>
            <span class="advanced__summary">{{ advancedSummary() }}</span>
          </span>
        </button>

        @if (isOpen()) {
          <div class="advanced__body" id="cfg-advanced-body">
            <div class="title-row">
              <h4 class="advanced__subtitle">Paradas que omite cada tipo de bus</h4>
              <app-help-tip label="Paradas que omite cada tipo de bus" text="Por ejemplo, el bus cama no para en El Alto: ese viaje no se vende en los servicios que vayan en bus cama, pero sí en los de semicama. Si ningún bus para en una ciudad, mejor quítala del tramo o apaga el viaje en el paso 3." />
            </div>

            @if (c.omissions.length) {
              <ul class="omissions">
                @for (omission of c.omissions; track omission.vehicleTypeId + omission.ref) {
                  <li class="omissions__item">
                    <span class="omissions__kind">{{ typeName(omission.vehicleTypeId) }}</span>
                    <span class="omissions__name">no para en {{ omissionLabel(omission) }}</span>
                    <button type="button" class="icon-btn icon-btn--danger" (click)="removeOmission(omission)" [attr.aria-label]="'Quitar: ' + typeName(omission.vehicleTypeId) + ' no para en ' + omissionLabel(omission)"><app-wizard-icon name="trash" /></button>
                  </li>
                }
              </ul>
            }

            <div class="omit-add">
              <select class="ends__select" [value]="omitType()" (change)="omitTypeSetter.set($any($event.target).value)" aria-label="Tipo de bus">
                @for (type of types(); track type.id) { <option [value]="type.id" [selected]="type.id === omitType()">{{ type.name }}</option> }
              </select>
              <select class="ends__select omit-add__kind" [value]="omitKind()" (change)="omitKind.set($any($event.target).value); omitRef.set('')" aria-label="Qué omite">
                <option value="CITY">No para en la ciudad</option>
                <option value="TRAMO">No vende el viaje</option>
              </select>
              <select class="ends__select" [value]="omitRef()" (change)="omitRef.set($any($event.target).value)" aria-label="Ciudad o viaje">
                <option value="">{{ omitKind() === 'CITY' ? 'Elige una ciudad' : 'Elige un viaje' }}</option>
                @if (omitKind() === 'CITY') {
                  @for (city of intermediates(); track city.name) { <option [value]="city.name" [selected]="city.name === omitRef()" [disabled]="isOmitted(city.name)">{{ city.name }}</option> }
                } @else {
                  @for (tramo of d.tramos; track tramo.key) { <option [value]="tramo.key" [selected]="tramo.key === omitRef()" [disabled]="isOmitted(tramo.key)">{{ tramoLabel(tramo.key) }}</option> }
                }
              </select>
              <button type="button" class="ink-btn" (click)="addOmission()" [disabled]="!omitRef()">Agregar</button>
            </div>
          </div>
        }
      </section>
    }
  `
})
export class FareOptionsComponent {
  protected readonly store = inject(RouteDraftStore);

  protected readonly omitKind = signal<OmissionKind>('CITY');
  protected readonly omitRef = signal('');
  /** null = sin tocar: se abre solo si ya hay algo configurado. */
  protected readonly open = signal<boolean | null>(null);

  protected readonly intermediates = computed(() => Engine.allIntermediates(this.store.draft()!));
  /** Tipos de bus con más de una tarjeta: solo ahí hay algo que elegir por canal. */
  protected readonly channelTypes = computed(() => {
    const draft = this.store.draft()!;
    return Engine.busTypes(draft).filter(type => Engine.cardsOfType(draft, type.id).length > 1);
  });

  protected readonly multiType = computed(() => Engine.busTypes(this.store.draft()!).length > 1);

  protected readonly types = computed(() => Engine.busTypes(this.store.draft()!));
  /** Tipo de bus elegido para agregar una omisión ("" = el primero). */
  private readonly omitTypeChoice = signal('');
  protected readonly omitType = computed(() => this.omitTypeChoice() || this.types()[0]?.id || '');
  protected readonly omitTypeSetter = this.omitTypeChoice;

  protected readonly isOpen = computed(() => this.open() ?? this.store.draft()!.configuration.omissions.length > 0);

  protected readonly advancedSummary = computed(() => {
    const count = this.store.draft()!.configuration.omissions.length;
    return count ? `${count} ${count === 1 ? 'parada omitida' : 'paradas omitidas'}` : 'Ej.: el bus cama no para en El Alto';
  });

  protected cardsOf(vehicleTypeId: string): DraftFareCard[] {
    return Engine.cardsOfType(this.store.draft()!, vehicleTypeId);
  }

  protected channels(vehicleTypeId: string): DraftChannelCards {
    return Engine.channelCardsOf(this.store.draft()!, vehicleTypeId);
  }

  protected defaultCardId(vehicleTypeId: string): string {
    return Engine.defaultCard(this.store.draft()!, vehicleTypeId)?.id ?? '';
  }

  protected patch(change: Partial<DraftConfiguration>): void {
    this.store.update(draft => ({ ...draft, configuration: { ...draft.configuration, ...change } }));
  }

  protected typeName(vehicleTypeId: string): string {
    return this.types().find(type => type.id === vehicleTypeId)?.name ?? 'Tipo de bus sin buses';
  }

  protected patchType(vehicleTypeId: string, change: Partial<DraftChannelCards>): void {
    this.store.update(draft => {
      const current = Engine.channelCardsOf(draft, vehicleTypeId);
      const channelCards = { ...draft.configuration.channelCards, [vehicleTypeId]: { ...current, ...change } };
      return { ...draft, configuration: { ...draft.configuration, channelCards } };
    });
  }

  protected tramoLabel(key: string): string {
    const draft = this.store.draft()!;
    const tramo = draft.tramos.find(item => item.key === key);
    return tramo ? Engine.tramoLabel(draft, tramo) : key;
  }

  protected omissionLabel(omission: DraftOmission): string {
    return omission.kind === 'CITY' ? omission.ref : this.tramoLabel(omission.ref);
  }

  /** Ya omitido para el tipo de bus elegido. */
  protected isOmitted(ref: string): boolean {
    return this.store.draft()!.configuration.omissions.some(item => item.ref === ref && item.vehicleTypeId === this.omitType());
  }

  protected addOmission(): void {
    const ref = this.omitRef();
    const vehicleTypeId = this.omitType();
    if (!ref || !vehicleTypeId || this.isOmitted(ref)) return;
    const omissions = [...this.store.draft()!.configuration.omissions, { kind: this.omitKind(), ref, vehicleTypeId }];
    this.patch({ omissions });
    this.omitRef.set('');
  }

  protected removeOmission(omission: DraftOmission): void {
    this.patch({
      omissions: this.store.draft()!.configuration.omissions.filter(
        item => !(item.ref === omission.ref && item.vehicleTypeId === omission.vehicleTypeId)
      )
    });
  }
}
