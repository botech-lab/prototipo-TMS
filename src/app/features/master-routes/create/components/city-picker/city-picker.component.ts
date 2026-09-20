import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { CityOption } from '../../models/route-draft.model';
import { RouteDraftStore } from '../../services/route-draft.store';
import { CityRequest, CityRequestsService, normalize } from '../../../../parametric/services/city-requests.service';
import { WizardIconComponent } from '../wizard-icon.component';
import { NewBadgeComponent } from '../new-badge.component';

/** Grupo corto que se ofrece primero: "De la ruta" (sus departamentos) o "Más usados" (ciudades). */
export interface CitySuggestion {
  readonly label: string;
  readonly departments?: readonly string[];
  readonly cities?: readonly string[];
}

interface Row {
  readonly kind: 'group' | 'city';
  readonly key: string;
  readonly name: string;
  readonly department: string;
  readonly count?: number;
  readonly capital?: boolean;
  /** Por qué no se puede elegir ("origen", "ya está en el tramo", "solicitado · SOL-0001"). */
  readonly reason?: string;
}

type Mode = 'list' | 'request' | 'sent';

let nextId = 0;
const SUGGESTED = '__sugeridos__';
const ALL = '__todos__';

/**
 * ============================================================================
 * LISTA DE CIUDADES Y PUEBLOS
 * ============================================================================
 * Reemplaza al <select> largo sin cambiar la idea: la lista sigue agrupada por
 * departamento, pero con buscador (sin importar tildes), filtro por
 * departamento, nombre del departamento fijo al bajar, marca de capital y el
 * motivo de lo que no se puede elegir. Si un pueblo no está, permite
 * SOLICITAR que se agregue (★ Nuevo): no se puede usar hasta que lo apruebe el
 * administrador de Paramétricas; si es urgente, se escribe a soporte por WhatsApp.
 * ============================================================================
 */
@Component({
  selector: 'app-city-picker',
  imports: [WizardIconComponent, NewBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './city-picker.component.scss',
  host: { '(document:click)': 'onDocumentClick($event)', '[class.cp--open]': 'open()' },
  templateUrl: './city-picker.component.html'
})
export class CityPickerComponent {
  private readonly store = inject(RouteDraftStore);
  private readonly requests = inject(CityRequestsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Ciudad elegida (nombre) o "" si no hay. */
  readonly value = input<string>('');
  readonly placeholder = input<string>('Elige una ciudad o pueblo');
  /** Ciudades que no se pueden elegir y por qué. */
  readonly reasons = input<Readonly<Record<string, string>>>({});
  readonly suggestion = input<CitySuggestion | null>(null);
  readonly disabled = input<boolean>(false);
  /** Hacia dónde se abre la lista: desde el borde izquierdo (por defecto) o el derecho del campo. */
  readonly align = input<'start' | 'end'>('start');
  /** Id del botón, para asociarle un <label for>. */
  readonly inputId = input<string>(`city-picker-${++nextId}`);

  readonly picked = output<CityOption>();

  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly uid = `cp-${nextId}`;
  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly filter = signal<string>(SUGGESTED);
  protected readonly active = signal(0);
  protected readonly mode = signal<Mode>('list');
  protected readonly sent = signal<CityRequest | null>(null);

  // Formulario de solicitud
  protected readonly reqName = signal('');
  protected readonly reqDepartment = signal('');
  protected readonly reqMunicipality = signal('');
  protected readonly reqReference = signal('');
  protected readonly reqError = signal('');

  protected readonly departments = computed(() => [...new Set(this.store.cityOptions().map(city => city.department))].sort((a, b) => a.localeCompare(b, 'es')));

  /** Filtro inicial: el grupo sugerido si existe; si no, todos. */
  protected readonly currentFilter = computed(() => (this.filter() === SUGGESTED && !this.suggestion() ? ALL : this.filter()));

  protected readonly rows = computed<Row[]>(() => {
    const q = normalize(this.query());
    const options = this.store.cityOptions();
    const reasons = this.reasons();
    const capitals = this.store.capitals();
    const filter = this.currentFilter();
    const suggestion = this.suggestion();
    const rows: Row[] = [];

    const city = (option: CityOption): Row => ({
      kind: 'city',
      key: option.name,
      name: option.name,
      department: option.department,
      capital: capitals.has(option.name),
      reason: reasons[option.name]
    });

    if (!q && filter === SUGGESTED && suggestion?.cities?.length) {
      const list = suggestion.cities.map(name => options.find(option => option.name === name)).filter((o): o is CityOption => !!o);
      rows.push({ kind: 'group', key: 'g-sug', name: suggestion.label.toUpperCase(), department: '', count: list.length });
      rows.push(...list.map(city));
      return rows;
    }

    const allowed =
      q || filter === ALL ? null : filter === SUGGESTED ? new Set(suggestion?.departments ?? []) : new Set([filter]);
    // Al buscar, primero lo que coincide por nombre: igual → empieza así → lo contiene → solo por departamento.
    const score = (option: CityOption): number => {
      if (!q) return 0;
      const name = normalize(option.name);
      if (name === q) return 0;
      if (name.startsWith(q)) return 1;
      if (name.includes(q)) return 2;
      return normalize(option.department).includes(q) ? 3 : 99;
    };
    const groups = this.departments()
      .filter(department => !allowed || allowed.has(department))
      .map(department => {
        const cities = options
          .filter(option => option.department === department && score(option) < 99)
          .sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, 'es'));
        return { department, cities, best: cities.length ? score(cities[0]) : 99 };
      })
      .filter(group => group.cities.length)
      .sort((a, b) => a.best - b.best);
    for (const group of groups) {
      rows.push({ kind: 'group', key: `g-${group.department}`, name: group.department, department: group.department, count: group.cities.length });
      rows.push(...group.cities.map(city));
    }
    if (q) {
      const pending = this.requests.pending().filter(request => normalize(request.name).includes(q));
      if (pending.length) {
        rows.push({ kind: 'group', key: 'g-pending', name: 'SOLICITADOS', department: '', count: pending.length });
        rows.push(
          ...pending.map(request => ({
            kind: 'city' as const,
            key: `req-${request.code}`,
            name: request.name,
            department: request.department,
            reason: `solicitado · ${request.code} pendiente`
          }))
        );
      }
    }
    return rows;
  });

  /** Opciones que se pueden elegir con el teclado. */
  protected readonly choices = computed(() => this.rows().filter(row => row.kind === 'city' && !row.reason));
  protected readonly activeKey = computed(() => this.choices()[this.active()]?.key ?? null);
  protected readonly hasCities = computed(() => this.rows().some(row => row.kind === 'city'));

  /** "¿Quisiste decir…?": los nombres más parecidos a lo buscado. */
  protected readonly nearMatches = computed(() => {
    const q = normalize(this.query());
    if (q.length < 3) return [];
    return this.store
      .cityOptions()
      .map(option => ({ option, distance: levenshtein(normalize(option.name), q) }))
      .filter(item => item.distance <= Math.max(2, Math.floor(q.length / 3)))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(item => item.option);
  });

  /** "SANTA CRUZ" → "Santa Cruz". */
  protected label(department: string): string {
    return department
      .toLowerCase()
      .split(' ')
      .map((word, i) => (i > 0 && ['de', 'del'].includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
      .join(' ');
  }

  protected toggle(): void {
    if (this.disabled()) return;
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    this.mode.set('list');
    this.query.set('');
    this.filter.set(SUGGESTED);
    this.active.set(0);
    afterNextRender(() => this.searchBox()?.nativeElement.focus(), { injector: this.injector });
  }

  protected close(returnFocus = true): void {
    this.open.set(false);
    if (returnFocus) this.trigger()?.nativeElement.focus();
  }

  protected setQuery(value: string): void {
    this.query.set(value);
    this.active.set(0);
    this.mode.set('list');
  }

  protected setFilter(value: string): void {
    this.filter.set(value);
    this.query.set('');
    this.active.set(0);
  }

  protected choose(row: Row): void {
    if (row.kind !== 'city' || row.reason) return;
    this.picked.emit({ name: row.name, department: row.department });
    this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.choices().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.active.set((this.active() + 1) % count);
      this.scrollActive();
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.active.set((this.active() - 1 + count) % count);
      this.scrollActive();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = this.choices()[this.active()];
      if (row) this.choose(row);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (this.query()) this.setQuery('');
      else this.close();
    }
  }

  /**
   * Cierra al hacer clic fuera. Usa el recorrido del evento (no `contains`):
   * al cambiar de vista el botón pulsado ya no está en el DOM y parecería "fuera".
   */
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !event.composedPath().includes(this.host.nativeElement)) this.close(false);
  }

  // ---- Solicitud de pueblo nuevo ----

  protected startRequest(): void {
    const name = this.query().trim();
    this.reqName.set(name.charAt(0).toUpperCase() + name.slice(1));
    const filter = this.currentFilter();
    this.reqDepartment.set(filter !== ALL && filter !== SUGGESTED ? filter : '');
    this.reqMunicipality.set('');
    this.reqReference.set('');
    this.reqError.set('');
    this.mode.set('request');
  }

  protected sendRequest(): void {
    if (!this.reqName().trim()) {
      this.reqError.set('Escribe el nombre del pueblo');
      return;
    }
    if (!this.reqDepartment()) {
      this.reqError.set('Elige el departamento');
      return;
    }
    const request = this.requests.create({
      name: this.reqName(),
      department: this.reqDepartment(),
      municipality: this.reqMunicipality(),
      reference: this.reqReference()
    });
    this.sent.set(request);
    this.mode.set('sent');
  }

  protected whatsapp(request: CityRequest): string {
    return this.requests.whatsappLink(request);
  }

  protected backToList(): void {
    this.query.set('');
    this.mode.set('list');
    afterNextRender(() => this.searchBox()?.nativeElement.focus(), { injector: this.injector });
  }

  protected readonly suggestedKey = SUGGESTED;
  protected readonly allKey = ALL;

  private scrollActive(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }),
      { injector: this.injector }
    );
  }
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = temp;
    }
  }
  return row[b.length];
}
