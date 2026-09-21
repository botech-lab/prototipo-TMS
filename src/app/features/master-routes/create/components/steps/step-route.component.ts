import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CityOption, DraftCity, DraftPath } from '../../models/route-draft.model';
import { RouteDraftStore } from '../../services/route-draft.store';
import * as Engine from '../../services/route-draft-engine';
import { WizardIconComponent } from '../wizard-icon.component';
import { HelpTipComponent } from '../help-tip.component';
import { NewBadgeComponent } from '../new-badge.component';
import { CityPickerComponent, CitySuggestion } from '../city-picker/city-picker.component';
import { departmentColor } from '../../../../../components/route-graph-svg/route-graph-palette';

/**
 * Paso 1 · Recorrido (Aleta: "Información general" + ciudades de "Ciudades y etapas").
 * Origen y destino (compartidos), los tramos de la ruta con sus ciudades
 * intermedias en orden, nombre y ruta de vuelta. No se puede repetir una ruta
 * con el mismo origen y destino: un camino distinto se agrega como otro tramo.
 */
@Component({
  selector: 'app-step-route',
  imports: [WizardIconComponent, HelpTipComponent, NewBadgeComponent, CityPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-route.component.scss',
  template: `
    @let d = store.draft()!;

    <section class="step-block" aria-labelledby="route-ends">
      <h3 id="route-ends" class="step-block__title">Origen y destino</h3>

      <div class="ends">
        <div class="ends__field">
          <label class="ends__label" for="route-origin">Sale de</label>
          <app-city-picker inputId="route-origin" placeholder="Elige la ciudad de origen" [value]="originName()" [reasons]="originReasons()" [suggestion]="popular()" [disabled]="locked()" (picked)="setOrigin($event.name)" />
        </div>

        <button type="button" class="ends__swap" (click)="swap()" [disabled]="mainCities().length < 2 || locked()" aria-label="Invertir origen y destino" title="Invertir origen y destino">
          <app-wizard-icon name="swap" />
        </button>

        <div class="ends__field">
          <label class="ends__label" for="route-destination">Llega a</label>
          <app-city-picker inputId="route-destination" align="end" placeholder="Elige la ciudad de destino" [value]="destinationName()" [reasons]="destinationReasons()" [suggestion]="popular()" [disabled]="!originName() || locked()" (picked)="setDestination($event.name)" />
          @if (!originName()) {
            <p id="dest-hint" class="ends__hint">Primero elige el origen.</p>
          }
        </div>
      </div>
      @if (locked()) {
        <p class="field-help">Es una ruta activa: el origen y el destino no se cambian. Aquí puedes agregarle otro tramo.</p>
      }
    </section>

    @if (store.duplicate(); as dup) {
      <section class="step-block duplicate" role="alert" aria-labelledby="dup-title">
        <app-wizard-icon name="alert" class="duplicate__icon" />
        <div class="duplicate__body">
          <h3 id="dup-title" class="duplicate__title">Esta ruta ya existe: {{ dup.code }} · {{ dup.name }} <app-new-badge detail="Aleta permite crear dos rutas con el mismo origen y destino; aquí se bloquea y se ofrece agregar un tramo." /></h3>
          <p class="duplicate__text">
            No se pueden tener dos rutas maestras de {{ originName() }} a {{ destinationName() }}. Si el bus va por otro camino
            (por ejemplo «por arriba» y «por abajo»), agrégalo como un tramo nuevo dentro de {{ dup.code }}.
          </p>
          <button type="button" class="ink-btn duplicate__btn" (click)="openExisting(dup.id)">
            <app-wizard-icon name="plus" class="add-city__icon" /> Agregar un tramo a {{ dup.code }}
          </button>
        </div>
      </section>
    }

    <section class="step-block" aria-labelledby="route-mid"
      [class.step-block--muted]="mainCities().length < 2"
      [class.guide-text]="mainCities().length < 2">
      <div class="title-row">
        <h3 id="route-mid" class="step-block__title">{{ d.paths.length > 1 ? 'Tramos de la ruta' : 'Ciudades intermedias' }}</h3>
        @if (d.paths.length > 1) { <app-new-badge detail="Una ruta con varios caminos (tramos) entre el mismo origen y destino; en Aleta cada uno sería un mapa con sus propias etapas." /> }
        <app-help-tip label="Ciudades intermedias y tramos" [text]="midHelp()" />
      </div>

      @if (mainCities().length >= 2) {
        <div class="paths" role="tablist" aria-label="Tramos de la ruta">
          @for (path of d.paths; track path.id) {
            <button type="button" role="tab" class="paths__tab" [attr.aria-selected]="path.id === active()?.id" (click)="store.activePathId.set(path.id)">
              <span class="paths__name">{{ path.name || 'Sin nombre' }}</span>
              <span class="paths__via">{{ via(path) }}</span>
              @if (path.status === 'BORRADOR' && d.status === 'ACTIVO') { <span class="paths__new">Nuevo · borrador</span> }
            </button>
          }
          <button type="button" class="paths__add" (click)="store.addPath()">
            <app-wizard-icon name="plus" class="add-city__icon" /> Agregar tramo
          </button>
          @if (d.paths.length < 2) { <app-new-badge detail="Varios caminos (tramos) dentro de una misma ruta maestra." /> }
        </div>

        @if (active(); as path) {
          @if (d.paths.length > 1) {
            <div class="path-head">
              <label class="path-head__name">
                <span class="ends__label">Nombre del tramo</span>
                <input class="text-input" type="text" [value]="path.name" placeholder="Ej.: Tramo por arriba" (input)="store.renamePath(path.id, $any($event.target).value)" />
              </label>
              @if (canRemove(path.id)) {
                <button type="button" class="link-btn link-btn--danger" (click)="store.removePath(path.id)">Quitar este tramo</button>
              }
            </div>
          }

          <ol class="stops-list">
            <li class="stops-list__row stops-list__row--end">
              <span class="stops-list__dot" [style.background-color]="color(path.cities[0].department)"></span>
              <span class="stops-list__name">{{ path.cities[0].name }}</span>
              <span class="stops-list__tag">Origen</span>
            </li>

            @for (city of middle(); track city.id; let i = $index; let first = $first; let last = $last) {
              <li class="stops-list__row">
                <span class="stops-list__dot stops-list__dot--mid" [style.border-color]="color(city.department)"></span>
                <span class="stops-list__name">{{ city.name }}<small>{{ city.department }}</small></span>
                <span class="stops-list__actions">
                  <button type="button" class="icon-btn" (click)="move(i, -1)" [disabled]="first || !editable()" [attr.aria-label]="'Subir ' + city.name"><app-wizard-icon name="up" /></button>
                  <button type="button" class="icon-btn" (click)="move(i, 1)" [disabled]="last || !editable()" [attr.aria-label]="'Bajar ' + city.name"><app-wizard-icon name="down" /></button>
                  <button type="button" class="icon-btn icon-btn--danger" (click)="remove(city)" [disabled]="!editable()" [attr.aria-label]="'Quitar ' + city.name"><app-wizard-icon name="trash" /></button>
                </span>
              </li>
            } @empty {
              <li class="stops-list__empty">Viaje directo, sin ciudades intermedias.</li>
            }

            <li class="stops-list__row stops-list__row--end">
              <span class="stops-list__dot" [style.background-color]="color(path.cities[path.cities.length - 1].department)"></span>
              <span class="stops-list__name">{{ path.cities[path.cities.length - 1].name }}</span>
              <span class="stops-list__tag">Destino</span>
            </li>
          </ol>

          @if (editable()) {
            <div class="add-city">
              <label class="ends__label" for="route-add">Agregar ciudad antes de {{ path.cities[path.cities.length - 1].name }}</label>
              <app-city-picker inputId="route-add" placeholder="Elige una ciudad o pueblo" [reasons]="pathReasons()" [suggestion]="fromRoute()" (picked)="addIntermediate($event)" />
            </div>
          } @else {
            <p class="field-help">Este tramo ya está activo: sus ciudades no se cambian desde aquí.</p>
          }
        }
      } @else {
        <p class="step-block__help">Aparecen cuando elijas el origen y el destino.</p>
      }
    </section>

    <section class="step-block" aria-labelledby="route-name">
      <h3 id="route-name" class="step-block__title">Nombre</h3>
      <div class="name-grid">
        <div>
          <label class="ends__label" for="route-name-input">Nombre de la ruta <span class="optional">(opcional)</span></label>
          <input id="route-name-input" class="text-input" type="text" [value]="d.customName" [placeholder]="autoName()" (input)="setName($any($event.target).value)" [attr.aria-description]="'Si lo dejas vacío se llamará ' + autoName()" />
        </div>
        <div>
          <label class="ends__label" for="route-desc">Descripción <span class="optional">(opcional)</span></label>
          <input id="route-desc" class="text-input" type="text" [value]="d.description" placeholder="Ej.: ruta troncal por la carretera antigua" (input)="setDescription($any($event.target).value)" />
        </div>
      </div>
    </section>

    <section class="step-block" aria-labelledby="route-return">
      <label class="toggle-row">
        <input type="checkbox" class="switch" [checked]="d.createReturn" (change)="setReturn($any($event.target).checked)" [disabled]="mainCities().length < 2" />
        <span>
          <strong id="route-return">Crear también la ruta de vuelta{{ returnLabel() }}</strong>
          <small>Se copia todo al revés como otro borrador, para revisarlo y activarlo.</small>
        </span>
      </label>
    </section>
  `
})
export class StepRouteComponent {
  protected readonly store = inject(RouteDraftStore);
  private readonly router = inject(Router);


  protected readonly active = this.store.activePath;
  /** Ciudades del tramo principal (definen origen y destino). */
  protected readonly mainCities = computed(() => (this.store.draft() ? Engine.mainPath(this.store.draft()!).cities : []));
  /** Ciudades del tramo que se está editando. */
  private readonly cities = computed(() => this.active()?.cities ?? []);
  protected readonly originName = computed(() => this.mainCities()[0]?.name ?? '');
  protected readonly destinationName = computed(() => (this.mainCities().length > 1 ? this.mainCities()[this.mainCities().length - 1].name : ''));
  protected readonly middle = computed(() => this.cities().slice(1, -1));
  protected readonly autoName = computed(() => Engine.autoName(this.store.draft()!));
  /** En una ruta activa, origen y destino quedan fijos. */
  protected readonly locked = computed(() => this.store.draft()?.status === 'ACTIVO');
  /** Los tramos ya aprobados de una ruta activa no se editan aquí. */
  protected readonly editable = computed(() => !(this.locked() && this.active()?.status === 'ACTIVO'));
  protected readonly returnLabel = computed(() => {
    const list = this.mainCities();
    return list.length >= 2 ? ` (${list[list.length - 1].name} → ${list[0].name})` : '';
  });

  protected readonly midHelp = computed(
    () =>
      `Las ciudades donde el bus sube o baja pasajeros, en el orden del viaje. Si hay otro camino entre ${this.originName() || 'el origen'} y ${this.destinationName() || 'el destino'} (por ejemplo «por arriba» y «por abajo»), agrégalo como otro tramo.`
  );

  /** Sugeridos para origen y destino: las ciudades más usadas en tus rutas. */
  protected readonly popular = computed<CitySuggestion>(() => ({ label: 'Más usados', cities: this.store.popularCities() }));

  /** Sugeridos para intermedias: los departamentos del origen y del destino. */
  protected readonly fromRoute = computed<CitySuggestion | null>(() => {
    const departments = [...new Set(this.mainCities().filter((_, i, all) => i === 0 || i === all.length - 1).map(city => city.department))];
    return departments.length ? { label: 'De la ruta', departments } : null;
  });

  /** Para origen/destino: lo que ya ocupa otro lugar del tramo principal. */
  private readonly middleReasons = computed(() =>
    Object.fromEntries(this.mainCities().slice(1, -1).map(city => [city.name, 'ciudad intermedia']))
  );
  protected readonly originReasons = computed(() => ({
    ...this.middleReasons(),
    ...(this.destinationName() ? { [this.destinationName()]: 'destino' } : {})
  }));
  protected readonly destinationReasons = computed(() => ({
    ...this.middleReasons(),
    ...(this.originName() ? { [this.originName()]: 'origen' } : {})
  }));

  /** Motivo de cada ciudad que ya está en el tramo que se edita. */
  protected readonly pathReasons = computed(() => {
    const list = this.cities();
    return Object.fromEntries(
      list.map((city, i) => [city.name, i === 0 ? 'origen' : i === list.length - 1 ? 'destino' : 'ya está en el tramo'])
    );
  });

  protected via(path: DraftPath): string {
    return Engine.pathVia(path);
  }

  protected canRemove(pathId: string): boolean {
    return Engine.canRemovePath(this.store.draft()!, pathId);
  }

  /** Abre la ruta que ya existe para agregarle este camino como tramo. */
  protected openExisting(routeId: string): void {
    this.router.navigate(['/rutas-maestras', routeId, 'continuar'], { queryParams: { tramo: 'nuevo', paso: 'recorrido' } });
  }

  protected color(department: string): string {
    return departmentColor(department);
  }

  /** Ya está en el tramo que se edita (una ciudad puede repetirse en otro tramo). */
  protected isUsed(name: string): boolean {
    return this.cities().some(city => city.name === name);
  }


  protected setOrigin(name: string): void {
    const option = this.store.findCity(name);
    if (option) this.store.setEnds(option, null);
  }

  protected setDestination(name: string): void {
    const option = this.store.findCity(name);
    if (option && this.mainCities().length) this.store.setEnds(null, option);
  }

  protected swap(): void {
    this.store.swapEnds();
  }

  protected addIntermediate(option: CityOption): void {
    const list = this.cities();
    if (list.length < 2 || this.isUsed(option.name)) return;
    this.store.setPathCities([...list.slice(0, -1), Engine.createCity(option), list[list.length - 1]]);
  }

  /** Mueve una ciudad intermedia (índice dentro de las intermedias). */
  protected move(index: number, delta: number): void {
    const list = [...this.cities()];
    const from = index + 1;
    const to = from + delta;
    if (to < 1 || to > list.length - 2) return;
    [list[from], list[to]] = [list[to], list[from]];
    this.store.setPathCities(list);
  }

  protected remove(city: DraftCity): void {
    this.store.setPathCities(this.cities().filter(item => item.id !== city.id));
  }

  protected setName(value: string): void {
    this.store.update(draft => ({ ...draft, customName: value }));
  }

  protected setDescription(value: string): void {
    this.store.update(draft => ({ ...draft, description: value }));
  }

  protected setReturn(value: boolean): void {
    this.store.update(draft => ({ ...draft, createReturn: value }));
  }
}
