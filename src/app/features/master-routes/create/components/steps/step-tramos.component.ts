import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DraftCity, DraftTramo } from '../../models/route-draft.model';
import { RouteDraftStore } from '../../services/route-draft.store';
import * as Engine from '../../services/route-draft-engine';
import { WizardIconComponent } from '../wizard-icon.component';
import { HelpTipComponent } from '../help-tip.component';

interface TramoRow {
  readonly tramo: DraftTramo;
  readonly to: string;
  /** "Tramo por arriba", "En todos los tramos" o "" si la ruta tiene un solo tramo. */
  readonly paths: string;
  readonly km: number;
  readonly duration: string;
  readonly isFull: boolean;
}

interface TramoGroup {
  readonly from: string;
  readonly rows: readonly TramoRow[];
}

/**
 * Paso 3 · Viajes que se venden (Aleta: "Mapa y tramos").
 * Los tramos se generan solos con el recorrido (ya no hay botón "Crear mapa");
 * aquí solo se decide cuáles se venden y cuáles también en la web. Si un servicio
 * va directo (sin parar en las intermedias) se decide al crear el servicio.
 */
@Component({
  selector: 'app-step-tramos',
  imports: [WizardIconComponent, HelpTipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-tramos.component.scss',
  template: `
    @let d = store.draft()!;

    <section class="step-block" aria-labelledby="tramos-title">
      <div class="tramos-head">
        <div class="title-row">
          <h3 id="tramos-title" class="step-block__title">{{ enabledCount() }} de {{ d.tramos.length }} viajes se pueden vender</h3>
          <app-help-tip label="Viajes que se venden" text="Son todos los viajes posibles entre las ciudades de la ruta. Apaga los que tu empresa no vende (por ejemplo, uno muy corto). «Se vende»: se pueden crear servicios y vender pasajes de ese viaje. «Web»: también se vende en el portal y la app." />
        </div>
        <div class="tramos-head__bulk">
          <button type="button" class="secondary-btn" (click)="setAll(true)" [disabled]="enabledCount() === d.tramos.length">Habilitar todos</button>
        </div>
      </div>

      @for (group of groups(); track group.from) {
        <div class="group">
          <h4 class="group__title">Desde {{ group.from }}</h4>
          <ul class="rows">
            @for (row of group.rows; track row.tramo.key) {
              <li class="row" [class.row--off]="!row.tramo.enabled">
                <div class="row__label">
                  <span class="row__to">
                    <app-wizard-icon name="arrow-right" class="row__arrow" />
                    {{ row.to }}
                    @if (row.isFull) { <span class="row__full">Recorrido completo</span> }
                  </span>
                  <span class="row__meta">{{ row.km }} km · {{ row.duration }}@if (row.paths) { · <span class="row__paths">{{ row.paths }}</span> }</span>
                </div>
                <div class="row__toggles">
                  <label class="mini-toggle">
                    <input type="checkbox" class="switch" [checked]="row.tramo.enabled" (change)="patch(row.tramo, { enabled: $any($event.target).checked })" [attr.aria-label]="'Se vende ' + label(row.tramo)" />
                    <span>Se vende</span>
                  </label>
                  <label class="mini-toggle">
                    <input type="checkbox" class="switch" [checked]="row.tramo.webSale" [disabled]="!row.tramo.enabled" (change)="patch(row.tramo, { webSale: $any($event.target).checked })" [attr.aria-label]="'Venta web ' + label(row.tramo)" />
                    <span>Web</span>
                  </label>
                </div>
              </li>
            }
          </ul>
        </div>
      }
    </section>

    <section class="step-block" aria-labelledby="web-cities">
      <div class="title-row">
        <h3 id="web-cities" class="step-block__title">Ciudades en la venta web</h3>
        <app-help-tip label="Ciudades en la venta web" text="Apaga una ciudad si no quieres que los clientes la busquen en el portal (Aleta: «Omitir en web»). En boletería se sigue vendiendo." />
      </div>
      <div class="chips" role="group" aria-labelledby="web-cities">
        @for (city of webCities(); track city.name) {
          <button type="button" class="chip" [attr.aria-pressed]="!city.hiddenOnWeb" (click)="toggleWeb(city)">
            @if (!city.hiddenOnWeb) { <app-wizard-icon name="check" class="chip__icon" /> }
            {{ city.name }}
          </button>
        }
      </div>
    </section>
  `
})
export class StepTramosComponent {
  protected readonly store = inject(RouteDraftStore);

  protected readonly enabledCount = computed(() => Engine.enabledTramos(this.store.draft()!).length);

  protected readonly groups = computed<TramoGroup[]>(() => {
    const draft = this.store.draft()!;
    const first = Engine.origin(draft)?.name;
    const last = Engine.destination(draft)?.name;
    const froms = [...new Set(draft.tramos.map(tramo => tramo.from))];
    return froms.map(from => ({
      from,
      rows: draft.tramos
        .filter(tramo => tramo.from === from)
        .map(tramo => ({
          tramo,
          to: tramo.to,
          paths: Engine.tramoPathsLabel(draft, tramo),
          km: Engine.tramoKm(draft, tramo),
          duration: Engine.formatDuration(Engine.tramoMinutes(draft, tramo)),
          isFull: tramo.from === first && tramo.to === last
        }))
    }));
  });

  /** Ciudades de todos los tramos, sin repetir. */
  protected readonly webCities = computed(() => {
    const seen = new Map<string, DraftCity>();
    for (const path of this.store.draft()!.paths) {
      for (const city of path.cities) if (!seen.has(city.name)) seen.set(city.name, city);
    }
    return [...seen.values()];
  });

  protected label(tramo: DraftTramo): string {
    return Engine.tramoLabel(this.store.draft()!, tramo);
  }

  protected patch(tramo: DraftTramo, change: Partial<DraftTramo>): void {
    this.store.update(draft => ({
      ...draft,
      tramos: draft.tramos.map(item => (item.key === tramo.key ? { ...item, ...change } : item))
    }));
  }

  protected setAll(enabled: boolean): void {
    this.store.update(draft => ({ ...draft, tramos: draft.tramos.map(item => ({ ...item, enabled })) }));
  }

  /** "Omitir en web" vale para la ciudad en todos los tramos. */
  protected toggleWeb(city: DraftCity): void {
    const hiddenOnWeb = !city.hiddenOnWeb;
    this.store.update(draft => ({
      ...draft,
      paths: draft.paths.map(path => ({
        ...path,
        cities: path.cities.map(item => (item.name === city.name ? { ...item, hiddenOnWeb } : item))
      }))
    }));
  }
}
