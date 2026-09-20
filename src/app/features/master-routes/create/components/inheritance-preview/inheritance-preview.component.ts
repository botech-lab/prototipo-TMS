import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NewBadgeComponent } from '../new-badge.component';
import { DecimalPipe } from '@angular/common';
import { RouteGraphSvgComponent } from '../../../../../components/route-graph-svg/route-graph-svg.component';
import { StopNode } from '../../../../../models/route.model';
import { DraftPath, RouteDraft } from '../../models/route-draft.model';
import * as Engine from '../../services/route-draft-engine';

/** Salidas de ejemplo para mostrar cómo un servicio convierte tiempos en horas. */
const SAMPLE_DEPARTURES = ['06:00', '07:30', '13:00', '20:30'];

/**
 * ============================================================================
 * "LO QUE HEREDAN LOS SERVICIOS"
 * ============================================================================
 * Panel fijo junto al asistente. Hace visible la relación padre → hijos:
 * la ruta maestra se define una vez y cada servicio nace de ella. Muestra el
 * grafo del recorrido, un servicio de ejemplo con horas reales calculadas
 * desde los tiempos relativos y los servicios que se podrán crear (tramos).
 * ============================================================================
 */
@Component({
  selector: 'app-inheritance-preview',
  imports: [NewBadgeComponent, RouteGraphSvgComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './inheritance-preview.component.scss',
  template: `
    <section class="preview" aria-labelledby="preview-title">
      <header class="preview__head">
        <h2 id="preview-title" class="preview__title">Lo que heredan los servicios <app-new-badge detail="Vista previa de la ruta y de los servicios que nacerán de ella." /></h2>
        <p class="preview__lead">Esta ruta se define una sola vez. Cada servicio que se cree después nace de ella.</p>
      </header>

      @if (hasRoute()) {
        @if (draft().paths.length > 1) {
          <p class="preview__path">{{ line().name }} · {{ via() }}</p>
        }
        <div class="preview__graph">
          <app-route-graph-svg [stops]="graphStops()" />
        </div>

        <dl class="preview__totals">
          <div><dt>Distancia</dt><dd>{{ totals().km | number }} km</dd></div>
          <div><dt>Viaje</dt><dd>{{ duration() }}</dd></div>
          <div><dt>Paradas</dt><dd>{{ totals().stops }}</dd></div>
        </dl>

        <div class="preview__sample">
          <div class="preview__sample-head">
            <h3 class="preview__subtitle">Así nace un servicio</h3>
            <label class="preview__departure">
              <span>Sale a las</span>
              <select [value]="departure()" (change)="departure.set($any($event.target).value)" aria-label="Hora de salida de ejemplo">
                @for (time of departures; track time) {
                  <option [value]="time" [selected]="time === departure()">{{ time }}</option>
                }
              </select>
            </label>
          </div>
          <ol class="preview__times">
            @for (row of sampleRows(); track row.cityId) {
              <li class="preview__time" [class.preview__time--end]="row.isEdge">
                <span class="preview__clock">{{ row.time }}@if (row.nextDay) {<sup>+{{ row.nextDay }}</sup>}</span>
                <span class="preview__city">{{ row.city }}</span>
              </li>
            }
          </ol>
          <p class="preview__note">La hora de salida la elige cada servicio; las demás horas salen de los tiempos de esta ruta.</p>
        </div>

        <div class="preview__services">
          <h3 class="preview__subtitle">
            Servicios que se podrán crear
            <span class="preview__count">{{ services().length }}</span>
          </h3>
          @if (services().length) {
            <ul class="preview__service-list">
              @for (label of visibleServices(); track label) {
                <li>{{ label }}</li>
              }
              @if (services().length > visibleServices().length) {
                <li class="preview__more">y {{ services().length - visibleServices().length }} tramos más</li>
              }
            </ul>
          } @else {
            <p class="preview__note">Habilita tramos en el paso 3 para poder crear servicios.</p>
          }
        </div>
      } @else {
        <div class="preview__empty">
          <svg class="preview__family" viewBox="0 0 260 132" role="img" aria-label="Una ruta maestra y los servicios que nacen de ella">
            <line x1="22" y1="26" x2="222" y2="26" class="preview__family-master" />
            <circle cx="22" cy="26" r="7" class="preview__family-end" />
            <circle cx="88" cy="26" r="5" class="preview__family-mid" />
            <circle cx="155" cy="26" r="5" class="preview__family-mid" />
            <circle cx="222" cy="26" r="7" class="preview__family-end" />
            <text x="122" y="12" text-anchor="middle" class="preview__family-label">Ruta maestra</text>
            <path d="M22 40 V66 H222" class="preview__family-child" />
            <path d="M22 40 V94 H155" class="preview__family-child" />
            <path d="M88 40 V122 H222" class="preview__family-child" />
            <text x="228" y="66" class="preview__family-time">06:00</text>
            <text x="161" y="94" class="preview__family-time">07:30</text>
            <text x="228" y="122" class="preview__family-time">20:30</text>
          </svg>
          <p class="preview__note">Elige el origen y el destino para ver la ruta y los servicios que nacerán de ella.</p>
        </div>
      }
    </section>
  `
})
export class InheritancePreviewComponent {
  readonly draft = input.required<RouteDraft>();
  /** Tramo que se muestra (el que se está editando); por defecto el principal. */
  readonly path = input<DraftPath | null>(null);

  protected readonly line = computed(() => this.path() ?? Engine.mainPath(this.draft()));
  protected readonly via = computed(() => Engine.pathVia(this.line()));

  protected readonly departures = SAMPLE_DEPARTURES;
  protected readonly departure = signal(SAMPLE_DEPARTURES[0]);

  protected readonly hasRoute = computed(() => this.line().cities.length >= 2);

  protected readonly graphStops = computed<StopNode[]>(() =>
    this.line().cities.map((city, index, all) => ({
      id: city.id,
      order: index + 1,
      name: city.name,
      isOrigin: index === 0,
      isDestination: index === all.length - 1
    }))
  );

  protected readonly totals = computed(() => Engine.totals(this.line()));
  protected readonly duration = computed(() => Engine.formatDuration(this.totals().minutes));

  /** Una fila por ciudad (su parada principal), con la hora real para la salida elegida. */
  protected readonly sampleRows = computed(() => {
    const [hh, mm] = this.departure().split(':').map(Number);
    const start = hh * 60 + mm;
    const line = Engine.timeline(this.line());
    return this.line().cities.map((city, index, all) => {
      const own = line.filter(entry => entry.cityId === city.id);
      const anchor = own.find(entry => entry.stop.isMain) ?? own[0];
      const offset = index === 0 ? anchor?.departureOffset ?? 0 : anchor?.arrivalOffset ?? 0;
      const clock = Engine.clockAt(start, offset);
      return { cityId: city.id, city: city.name, time: clock.time, nextDay: clock.nextDay, isEdge: index === 0 || index === all.length - 1 };
    });
  });

  protected readonly services = computed(() =>
    Engine.enabledTramos(this.draft()).map(tramo => Engine.tramoLabel(this.draft(), tramo))
  );

  protected readonly visibleServices = computed(() => this.services().slice(0, 6));
}
