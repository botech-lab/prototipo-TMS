import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DraftCity, DraftPath, DraftStop, TimedStop } from '../../models/route-draft.model';
import { RouteDraftStore } from '../../services/route-draft.store';
import * as Engine from '../../services/route-draft-engine';
import { WizardIconComponent } from '../wizard-icon.component';
import { departmentColor } from '../../../../../components/route-graph-svg/route-graph-palette';

/**
 * Paso 2 · Paradas y tiempos (Aleta: "Ver etapas" de cada ciudad).
 * Los tiempos son relativos: cuánto se tarda desde la parada anterior y cuánto
 * se espera. Las horas de llegada y embarque se calculan solas. Si la ruta
 * tiene varios tramos, cada uno tiene sus paradas y tiempos (una pestaña por tramo).
 */
@Component({
  selector: 'app-step-stops',
  imports: [WizardIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-stops.component.scss',
  template: `
    @let d = store.draft()!;

    @if (d.paths.length > 1) {
      <div class="paths" role="tablist" aria-label="Tramos de la ruta">
        @for (item of d.paths; track item.id) {
          <button type="button" role="tab" class="paths__tab" [attr.aria-selected]="item.id === path().id" (click)="store.activePathId.set(item.id)">
            <span class="paths__name">{{ item.name || 'Sin nombre' }}</span>
            <span class="paths__via">{{ via(item) }}</span>
          </button>
        }
      </div>
    }

    <p class="how-to guide-text">
      <app-wizard-icon name="clock" class="how-to__icon" />
      <span>Sin horas de reloj: pon <strong>cuánto tarda</strong> desde la parada anterior y <strong>cuánto espera</strong> en cada una.</span>
    </p>

    @for (city of path().cities; track city.id; let ci = $index; let lastCity = $last) {
      <section class="city step-block" [attr.aria-labelledby]="'city-' + city.id">
        <header class="city__head">
          <span class="city__dot" [style.background-color]="color(city.department)"></span>
          <div class="city__title-wrap">
            <h3 class="city__title" [id]="'city-' + city.id">{{ city.name }}</h3>
            <p class="city__meta">
              @if (ci === 0) {
                Origen · aquí sale el servicio
              } @else {
                {{ lastCity ? 'Destino' : 'Intermedia' }} · llega {{ arrivalText(city) }} después de salir
              }
            </p>
          </div>
          <span class="city__count">{{ city.stops.length }} {{ city.stops.length === 1 ? 'parada' : 'paradas' }}</span>
        </header>

        <ol class="stops">
          @for (stop of city.stops; track stop.id; let si = $index) {
            @let timed = timedOf(stop.id);
            @let isStart = ci === 0 && si === 0;
            <li class="stop" [class.stop--main]="stop.isMain">
              <div class="stop__top">
                <label class="stop__main" [title]="stop.isMain ? 'Parada principal de ' + city.name : 'Marcar como principal'">
                  <input type="radio" [name]="'main-' + city.id" [checked]="stop.isMain" (change)="setMain(city, stop)" [attr.aria-label]="'Parada principal de ' + city.name + ': ' + stop.name" />
                  <span class="stop__main-mark"></span>
                </label>
                <div class="stop__name">
                  <label class="sr-only" [for]="'name-' + stop.id">Nombre de la parada</label>
                  <input [id]="'name-' + stop.id" class="text-input" type="text" [value]="stop.name" placeholder="Ej.: Terminal de buses" (input)="patch(city, stop, { name: $any($event.target).value })" [attr.aria-invalid]="!stop.name.trim()" />
                </div>
                @if (stop.isMain) {
                  <span class="stop__badge">Principal</span>
                }
                <button type="button" class="icon-btn icon-btn--danger" (click)="removeStop(city, stop)" [disabled]="city.stops.length === 1" [attr.aria-label]="'Quitar parada ' + stop.name">
                  <app-wizard-icon name="trash" />
                </button>
              </div>

              <div class="stop__times">
                @if (isStart) {
                  <div class="time-field time-field--start">
                    <span class="time-field__label">Salida del servicio</span>
                    <span class="time-field__value">A la hora que elija cada servicio</span>
                  </div>
                } @else {
                  <div class="time-field">
                    <span class="time-field__label" [id]="'leg-' + stop.id">Desde la parada anterior</span>
                    <div class="time-field__inputs" role="group" [attr.aria-labelledby]="'leg-' + stop.id">
                      <label class="unit-input">
                        <input class="number-input" type="number" min="0" inputmode="decimal" [value]="stop.distanceKm ?? ''" (input)="patch(city, stop, { distanceKm: num($any($event.target).value) })" aria-label="Distancia en kilómetros" />
                        <span>km</span>
                      </label>
                      <label class="unit-input">
                        <input class="number-input" type="number" min="0" inputmode="numeric" [value]="hours(stop.travelMinutes)" (input)="setTravel(city, stop, $any($event.target).value, null)" aria-label="Horas de viaje" [attr.aria-invalid]="!stop.travelMinutes" />
                        <span>h</span>
                      </label>
                      <label class="unit-input">
                        <input class="number-input" type="number" min="0" max="59" inputmode="numeric" [value]="minutes(stop.travelMinutes)" (input)="setTravel(city, stop, null, $any($event.target).value)" aria-label="Minutos de viaje" [attr.aria-invalid]="!stop.travelMinutes" />
                        <span>min</span>
                      </label>
                    </div>
                  </div>
                }

                @if (!timed?.isLast) {
                  <div class="time-field time-field--wait">
                    <span class="time-field__label">{{ isStart ? 'Embarque antes de salir' : 'Espera en la parada' }}</span>
                    <label class="unit-input">
                      <input class="number-input" type="number" min="0" inputmode="numeric" [value]="stop.waitMinutes" (input)="patch(city, stop, { waitMinutes: num($any($event.target).value) ?? 0 })" [attr.aria-label]="isStart ? 'Minutos de embarque' : 'Minutos de espera'" />
                      <span>min</span>
                    </label>
                  </div>
                }

                @if (timed && !isStart) {
                  <div class="stop__offset" aria-live="polite">
                    <span>Llega</span>
                    <strong>+{{ offset(timed.arrivalOffset) }}</strong>
                    <small>{{ timed.km }} km del origen</small>
                  </div>
                }
              </div>

              <button type="button" class="stop__more" (click)="toggleMore(stop.id)" [attr.aria-expanded]="isOpen(stop.id)" [attr.aria-controls]="'more-' + stop.id">
                <app-wizard-icon name="chevron" class="stop__more-icon" [class.stop__more-icon--open]="isOpen(stop.id)" />
                Dirección, contacto y opciones
              </button>

              @if (isOpen(stop.id)) {
                <div class="stop__extra" [id]="'more-' + stop.id">
                  <div class="extra-grid">
                    <label><span class="ends__label">Dirección</span><input class="text-input" type="text" [value]="stop.address" (input)="patch(city, stop, { address: $any($event.target).value })" /></label>
                    <label><span class="ends__label">Punto de referencia</span><input class="text-input" type="text" [value]="stop.reference" (input)="patch(city, stop, { reference: $any($event.target).value })" /></label>
                    <label class="extra-grid__wide"><span class="ends__label">Enlace de ubicación (Google Maps)</span><input class="text-input" type="url" [value]="stop.mapUrl" placeholder="https://maps.google.com/…" (input)="patch(city, stop, { mapUrl: $any($event.target).value })" /></label>
                    <label><span class="ends__label">Persona de contacto</span><input class="text-input" type="text" [value]="stop.contactName" (input)="patch(city, stop, { contactName: $any($event.target).value })" /></label>
                    <label><span class="ends__label">Teléfono</span><input class="text-input" type="tel" [value]="stop.contactPhone" (input)="patch(city, stop, { contactPhone: $any($event.target).value })" /></label>
                    <label><span class="ends__label">Código PIN</span><input class="text-input" type="text" [value]="stop.pin" (input)="patch(city, stop, { pin: $any($event.target).value })" /></label>
                  </div>
                  <div class="extra-flags">
                    <label class="toggle-row"><input type="checkbox" class="switch" [checked]="stop.isDepartmentMain" (change)="patch(city, stop, { isDepartmentMain: $any($event.target).checked })" /><span><strong>Principal del departamento</strong><small>La parada que representa a {{ city.department }} en búsquedas.</small></span></label>
                    <label class="toggle-row"><input type="checkbox" class="switch" [checked]="stop.isMainArrival" (change)="patch(city, stop, { isMainArrival: $any($event.target).checked })" /><span><strong>Llegada principal</strong><small>Donde bajan los pasajeros que llegan a {{ city.name }}.</small></span></label>
                    <label class="toggle-row"><input type="checkbox" class="switch" [checked]="stop.apiAccessible" (change)="patch(city, stop, { apiAccessible: $any($event.target).checked })" /><span><strong>Visible para integraciones (API)</strong><small>Agencias y OTAs pueden vender desde esta parada.</small></span></label>
                    <label class="toggle-row"><input type="checkbox" class="switch" [checked]="stop.active" (change)="patch(city, stop, { active: $any($event.target).checked })" /><span><strong>Activa</strong><small>Si la apagas, los servicios pasan sin detenerse aquí.</small></span></label>
                  </div>
                </div>
              }
            </li>
          }
        </ol>

        <button type="button" class="link-btn city__add" (click)="addStop(city)">
          <app-wizard-icon name="plus" class="city__add-icon" /> Agregar otra parada en {{ city.name }}
        </button>
      </section>
    }

    <div class="summary" aria-live="polite">
      <span>{{ d.paths.length > 1 ? path().name + ':' : 'Viaje completo' }}</span>
      <strong>{{ totalText() }}</strong>
      <span class="summary__sep" aria-hidden="true">·</span>
      <strong>{{ totals().km }} km</strong>
      <span class="summary__sep" aria-hidden="true">·</span>
      <strong>{{ totals().stops }} paradas</strong>
    </div>
  `
})
export class StepStopsComponent {
  protected readonly store = inject(RouteDraftStore);
  private readonly open = signal<ReadonlySet<string>>(new Set());

  /** Tramo que se está editando (cada tramo tiene sus paradas y tiempos). */
  protected readonly path = computed(() => this.store.activePath()!);
  private readonly line = computed(() => Engine.timeline(this.path()));
  protected readonly totals = computed(() => Engine.totals(this.path()));
  protected readonly totalText = computed(() => Engine.formatDuration(this.totals().minutes));

  protected via(path: DraftPath): string {
    return Engine.pathVia(path);
  }

  protected color(department: string): string {
    return departmentColor(department);
  }

  protected timedOf(stopId: string): TimedStop | undefined {
    return this.line().find(entry => entry.stop.id === stopId);
  }

  protected arrivalText(city: DraftCity): string {
    const own = this.line().filter(entry => entry.cityId === city.id);
    const anchor = own.find(entry => entry.stop.isMain) ?? own[0];
    return Engine.formatDuration(anchor?.arrivalOffset ?? 0);
  }

  protected offset(minutes: number): string {
    return Engine.formatDuration(minutes);
  }

  protected hours(total: number | null): string {
    return total == null ? '' : String(Math.floor(total / 60));
  }

  protected minutes(total: number | null): string {
    return total == null ? '' : String(total % 60);
  }

  protected num(value: string): number | null {
    if (value === '' || value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  protected setTravel(city: DraftCity, stop: DraftStop, hoursValue: string | null, minutesValue: string | null): void {
    const current = stop.travelMinutes ?? 0;
    const h = hoursValue != null ? this.num(hoursValue) ?? 0 : Math.floor(current / 60);
    const m = minutesValue != null ? Math.min(59, this.num(minutesValue) ?? 0) : current % 60;
    const total = h * 60 + m;
    this.patch(city, stop, { travelMinutes: total || null });
  }

  protected patch(city: DraftCity, stop: DraftStop, change: Partial<DraftStop>): void {
    this.replaceStops(city, city.stops.map(item => (item.id === stop.id ? { ...item, ...change } : item)));
  }

  protected setMain(city: DraftCity, stop: DraftStop): void {
    this.replaceStops(city, city.stops.map(item => ({ ...item, isMain: item.id === stop.id })));
  }

  protected addStop(city: DraftCity): void {
    this.replaceStops(city, [...city.stops, Engine.createStop('', false)]);
  }

  protected removeStop(city: DraftCity, stop: DraftStop): void {
    const rest = city.stops.filter(item => item.id !== stop.id);
    if (!rest.length) return;
    const fixed = rest.some(item => item.isMain) ? rest : rest.map((item, index) => ({ ...item, isMain: index === 0 }));
    this.replaceStops(city, fixed);
  }

  protected isOpen(id: string): boolean {
    return this.open().has(id);
  }

  protected toggleMore(id: string): void {
    this.open.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  private replaceStops(city: DraftCity, stops: readonly DraftStop[]): void {
    this.store.patchCity(city.id, item => ({ ...item, stops }));
  }
}
