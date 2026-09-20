import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NewBadgeComponent } from '../new-badge.component';
import { HelpTipComponent } from '../help-tip.component';
import { DecimalPipe } from '@angular/common';
import { RouteGraphSvgComponent } from '../../../../../components/route-graph-svg/route-graph-svg.component';
import { StopNode } from '../../../../../models/route.model';
import { DraftPath, RouteDraft } from '../../models/route-draft.model';
import * as Engine from '../../services/route-draft-engine';

/** Salidas de ejemplo para mostrar cómo un servicio convierte tiempos en horas. */
const SAMPLE_DEPARTURES = ['06:00', '07:30', '13:00', '20:30'];

/**
 * Ejemplo que se muestra mientras la ruta no tiene ciudades. Con nombres y horas
 * de verdad se entiende de una: arriba lo que se define una vez, abajo lo que
 * nace de eso. Antes había un dibujo con líneas punteadas que no decía qué eran.
 */
const EXAMPLE = {
  cities: ['La Paz', 'Oruro', 'Cochabamba'],
  services: [
    { time: '06:00', trip: 'La Paz → Cochabamba', bus: 'Bus 1234' },
    { time: '13:00', trip: 'La Paz → Cochabamba', bus: 'Bus 5678' },
    { time: '20:30', trip: 'Oruro → Cochabamba', bus: 'Bus 1234' }
  ]
} as const;

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
  imports: [NewBadgeComponent, RouteGraphSvgComponent, DecimalPipe, HelpTipComponent],
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
          <h3 class="preview__subtitle">
            Así nace un servicio
            <app-help-tip
              label="Así nace un servicio"
              text="Es una simulación: así quedarían las horas si crearas un servicio que sale a esa hora. No crea nada ni guarda la hora; cambia la hora de arriba para probar otras salidas." />
          </h3>
          @if (hasTimes()) {
            <div class="preview__sample-head">
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
          } @else {
            <p class="preview__note">
              Esta ruta <strong>no tiene hora de salida</strong>: la pone cada servicio al crearse.
              Carga los tiempos de viaje en <strong>Paradas y tiempos</strong> y aquí verás a qué hora
              llegaría a cada ciudad un servicio que sale a las 06:00.
            </p>
          }
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
          <p class="preview__example-lead">Un ejemplo, mientras eliges las ciudades:</p>

          <div class="example">
            <p class="example__label">La ruta maestra se arma una vez</p>
            <ol class="example__route">
              @for (city of EXAMPLE.cities; track city) {
                <li class="example__city">{{ city }}</li>
              }
            </ol>
            <p class="example__hint">El recorrido, las paradas, los días y los precios.</p>

            <p class="example__label example__label--services">Después se crean los servicios, uno por salida</p>
            <ul class="example__services">
              @for (service of EXAMPLE.services; track service.time) {
                <li class="example__service">
                  <span class="example__time">{{ service.time }}</span>
                  <span class="example__trip">{{ service.trip }}</span>
                  <span class="example__bus">{{ service.bus }}</span>
                </li>
              }
            </ul>
            <p class="example__hint">Cada servicio solo pone su hora de salida y su bus: lo demás lo hereda.</p>
          </div>

          <p class="preview__note">Elige el origen y el destino y aquí verás tu ruta, con las horas de un servicio de verdad.</p>
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

  /**
   * ¿Ya hay tiempos de viaje cargados? Sin ellos, simular horas mostraría la
   * misma hora en todas las ciudades (13:00, 13:00, 13:00), que se lee como si
   * la ruta maestra fijara la hora de salida o como si el viaje fuera
   * instantáneo. Mientras falten, se explica en palabras.
   */
  protected readonly hasTimes = computed(() => this.totals().minutes > 0);

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

  /** Ejemplo del estado vacío (ver la constante EXAMPLE). */
  protected readonly EXAMPLE = EXAMPLE;
}
