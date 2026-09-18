import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal
} from '@angular/core';
import { RecordField, RecordFieldOption, RecordValidator, RecordValue, RecordValues } from '@models';
import { captureOpener, focusFirst, restoreFocus, trapTab } from './focus-trap';

/**
 * ============================================================================
 * DRAWER GENÉRICO DE ALTA / EDICIÓN (COMPONENTE PRESENTACIONAL "DUMB")
 * ============================================================================
 * Equivalente en formulario de `DataTableComponent`: no conoce ninguna
 * entidad. Recibe campos declarativos (`RecordField[]`) y valores iniciales,
 * valida en línea y emite los valores ya normalizados:
 *   text   → string recortado (mayúsculas si `uppercase`)
 *   number → number, o null si queda vacío y es `nullable`
 *   select → string, o null en la opción vacía
 *   switch → boolean
 *
 * El contenedor decide qué hacer con ellos (alta, actualización). Se monta
 * con `@if` y se desmonta al cerrar: cada apertura parte de estado limpio.
 * ============================================================================
 */
@Component({
  selector: 'app-record-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './record-drawer.component.scss',
  host: {
    '(document:keydown.escape)': 'close.emit()',
    '(keydown)': 'onKeydown($event)'
  },
  template: `
    <div class="record-drawer" data-testid="record-drawer" role="dialog" aria-modal="true" [attr.aria-label]="title()">
      <div class="record-drawer__backdrop" (click)="close.emit()"></div>

      <div class="record-drawer__panel-wrap">
        <form class="record-drawer__panel" novalidate (submit)="$event.preventDefault(); submit()">

          <!-- CABECERA -->
          <div class="record-drawer__header">
            <div class="record-drawer__heading">
              <span class="record-drawer__eyebrow">{{ eyebrow() }}</span>
              <h2 class="record-drawer__title">{{ title() }}</h2>
              @if (code()) {
                <p class="record-drawer__code">
                  Código <span class="record-drawer__code-value">{{ code() }}</span>
                </p>
              }
            </div>
            <button
              type="button"
              class="record-drawer__close"
              data-testid="record-drawer-close"
              aria-label="Cerrar"
              (click)="close.emit()">
              <svg class="record-drawer__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- CAMPOS -->
          <div class="record-drawer__body">
            @if (inputFields().length) {
              <div class="record-drawer__grid">
                @for (field of inputFields(); track field.key) {
                  <div class="record-drawer__field" [class.record-drawer__field--half]="field.half">
                    <label class="record-drawer__label" [attr.for]="fieldId(field)">
                      {{ field.label }}@if (field.required) {<span class="record-drawer__required" aria-hidden="true"> *</span>}
                    </label>

                    @switch (field.kind) {
                      @case ('select') {
                        <select
                          class="record-drawer__input record-drawer__input--select"
                          [id]="fieldId(field)"
                          [attr.data-testid]="'record-field-' + field.key"
                          [attr.aria-invalid]="!!errorFor(field.key)"
                          [attr.aria-describedby]="errorFor(field.key) ? fieldId(field) + '-error' : null"
                          (change)="set(field.key, $any($event.target).value)"
                          (blur)="touch(field.key)">
                          @if (field.nullable || draft()[field.key] === null || draft()[field.key] === '') {
                            <option value="" [selected]="!draft()[field.key]">{{ field.emptyLabel ?? 'Selecciona…' }}</option>
                          }
                          @for (option of optionsFor(field); track option.value) {
                            <option [value]="option.value" [selected]="option.value === draft()[field.key]">{{ option.label }}</option>
                          }
                        </select>
                      }
                      @default {
                        <input
                          class="record-drawer__input"
                          [class.record-drawer__input--figure]="field.kind === 'number' || field.uppercase"
                          [class.record-drawer__input--uppercase]="field.uppercase"
                          [id]="fieldId(field)"
                          [attr.data-testid]="'record-field-' + field.key"
                          [type]="field.kind === 'text' ? 'text' : field.kind"
                          [attr.inputmode]="field.kind === 'number' ? 'decimal' : null"
                          [attr.min]="field.min ?? null"
                          [attr.max]="field.max ?? null"
                          [attr.step]="field.step ?? null"
                          [attr.placeholder]="field.placeholder ?? null"
                          [attr.aria-invalid]="!!errorFor(field.key)"
                          [attr.aria-describedby]="errorFor(field.key) ? fieldId(field) + '-error' : null"
                          autocomplete="off"
                          [value]="text(field.key)"
                          (input)="set(field.key, $any($event.target).value)"
                          (blur)="touch(field.key)" />
                      }
                    }

                    @if (errorFor(field.key); as error) {
                      <p class="record-drawer__error" [id]="fieldId(field) + '-error'" [attr.data-testid]="'record-error-' + field.key">{{ error }}</p>
                    } @else if (field.hint) {
                      <p class="record-drawer__hint">{{ field.hint }}</p>
                    }
                  </div>
                }
              </div>
            }

            @if (switchFields().length) {
              <div class="record-drawer__switches">
                @for (field of switchFields(); track field.key) {
                  <label class="record-drawer__switch-row" [attr.data-testid]="'record-field-' + field.key">
                    <span class="record-drawer__switch-text">
                      <span class="record-drawer__switch-label">{{ field.label }}</span>
                      <span class="record-drawer__switch-state">{{ draft()[field.key] ? (field.onLabel ?? 'Sí') : (field.offLabel ?? 'No') }}</span>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      class="record-drawer__switch-input"
                      [checked]="!!draft()[field.key]"
                      [attr.aria-checked]="!!draft()[field.key]"
                      [attr.aria-invalid]="!!errorFor(field.key)"
                      [attr.aria-describedby]="errorFor(field.key) ? fieldId(field) + '-error' : null"
                      (change)="set(field.key, $any($event.target).checked); touch(field.key)" />
                    <span class="record-drawer__switch-track" aria-hidden="true"></span>
                  </label>
                  @if (errorFor(field.key); as error) {
                    <p class="record-drawer__error record-drawer__error--row" [id]="fieldId(field) + '-error'" [attr.data-testid]="'record-error-' + field.key">{{ error }}</p>
                  }
                }
              </div>
            }
          </div>

          <!-- PIE: una sola acción en cobre -->
          <div class="record-drawer__footer">
            @if (submitted() && invalidCount() > 0) {
              <p class="record-drawer__summary" role="alert">
                Revisa {{ invalidCount() === 1 ? '1 campo' : invalidCount() + ' campos' }}
              </p>
            }
            <button type="button" class="record-drawer__cancel" data-testid="record-drawer-cancel" (click)="close.emit()">
              Cancelar
            </button>
            <button type="submit" class="record-drawer__save" data-testid="record-drawer-save">
              <svg class="record-drawer__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {{ submitLabel() }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class RecordDrawerComponent {
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  // ==========================================
  // INPUTS & OUTPUTS
  // ==========================================
  readonly title = input.required<string>();
  /** Rótulo superior neutro (NUEVO REGISTRO, EDITAR REGISTRO...). */
  readonly eyebrow = input<string>('');
  /** Identificador mostrado como ficha split-flap (solo en edición). */
  readonly code = input<string>('');
  readonly fields = input.required<readonly RecordField[]>();
  /** Valores iniciales, por clave de campo. */
  readonly values = input<RecordValues>({});
  readonly submitLabel = input<string>('Guardar');
  /** Validación cruzada opcional (p. ej. «solo una moneda principal»). */
  readonly validator = input<RecordValidator | null>(null);

  readonly save = output<RecordValues>();
  readonly close = output<void>();

  private static nextId = 0;
  private readonly uid = `record-drawer-${RecordDrawerComponent.nextId++}`;

  /** Quien abrió el cajón: recupera el foco al cerrarse. */
  private readonly opener = captureOpener();

  constructor() {
    // Foco en el primer campo al abrir: se puede escribir de inmediato.
    afterNextRender(() => {
      focusFirst(this.panel(), 'input, select');
    });
    inject(DestroyRef).onDestroy(() => restoreFocus(this.opener));
  }

  /** Trampa de foco: Tab no sale del panel mientras el cajón está abierto. */
  protected onKeydown(event: KeyboardEvent): void {
    trapTab(event, this.panel());
  }

  private panel(): HTMLElement | null {
    return (this.hostRef.nativeElement as HTMLElement).querySelector<HTMLElement>('.record-drawer__panel');
  }

  // ==========================================
  // ESTADO DEL BORRADOR
  // ==========================================

  /** Borrador editable. Los números se guardan como texto hasta el envío. */
  protected readonly draft = linkedSignal<Readonly<Record<string, RecordValue>>>(() => ({ ...this.values() }));
  private readonly touched = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly submitted = signal<boolean>(false);

  protected readonly inputFields = computed(() => this.fields().filter(field => field.kind !== 'switch'));
  protected readonly switchFields = computed(() => this.fields().filter(field => field.kind === 'switch'));

  /** Mensaje de error por clave; ausente si el campo es válido. */
  private readonly errors = computed<Readonly<Record<string, string>>>(() => {
    const draft = this.draft();
    const result: Record<string, string> = {};
    for (const field of this.fields()) {
      const error = RecordDrawerComponent.validate(field, draft[field.key]);
      if (error) {
        result[field.key] = error;
      }
    }
    const validator = this.validator();
    if (validator) {
      for (const [key, message] of Object.entries(validator(this.normalized()))) {
        result[key] ??= message;
      }
    }
    return result;
  });

  protected readonly invalidCount = computed<number>(() => Object.keys(this.errors()).length);

  // ==========================================
  // HELPERS DE PLANTILLA
  // ==========================================

  protected fieldId(field: RecordField): string {
    return `${this.uid}-${field.key}`;
  }

  protected text(key: string): string {
    const value = this.draft()[key];
    return value === null || value === undefined ? '' : String(value);
  }

  /** Opciones del select; si el valor actual no figura (dato heredado), se conserva. */
  protected optionsFor(field: RecordField): readonly RecordFieldOption[] {
    const options = field.options ?? [];
    const current = this.draft()[field.key];
    if (typeof current === 'string' && current && !options.some(option => option.value === current)) {
      return [{ value: current, label: current }, ...options];
    }
    return options;
  }

  /** Solo se muestra el error tras salir del campo o intentar guardar. */
  protected errorFor(key: string): string | null {
    if (!this.submitted() && !this.touched().has(key)) {
      return null;
    }
    return this.errors()[key] ?? null;
  }

  protected set(key: string, value: RecordValue): void {
    this.draft.update(draft => ({ ...draft, [key]: value }));
  }

  protected touch(key: string): void {
    this.touched.update(current => (current.has(key) ? current : new Set(current).add(key)));
  }

  protected submit(): void {
    this.submitted.set(true);

    if (this.invalidCount() > 0) {
      const host = this.hostRef.nativeElement as HTMLElement;
      queueMicrotask(() => host.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    this.save.emit(this.normalized());
  }

  /** Borrador convertido a valores tipados (lo que se emite al guardar). */
  private readonly normalized = computed<RecordValues>(() => {
    const draft = this.draft();
    const result: Record<string, RecordValue> = {};
    for (const field of this.fields()) {
      result[field.key] = RecordDrawerComponent.normalize(field, draft[field.key]);
    }
    return result;
  });

  // ==========================================
  // REGLAS PURAS
  // ==========================================

  private static isBlank(value: RecordValue | undefined): boolean {
    return value === null || value === undefined || String(value).trim() === '';
  }

  static validate(field: RecordField, value: RecordValue | undefined): string | null {
    if (field.kind === 'switch') {
      return null;
    }

    if (RecordDrawerComponent.isBlank(value)) {
      if (!field.required) {
        return null;
      }
      return field.kind === 'select' ? 'Selecciona una opción' : 'Campo obligatorio';
    }

    if (field.pattern && !new RegExp(field.pattern).test(String(value).trim())) {
      return field.patternMessage ?? 'Formato no válido';
    }

    if (field.kind === 'number') {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        return 'Ingresa un número válido';
      }
      if (field.min !== undefined && number < field.min) {
        return `Mínimo ${field.min}`;
      }
      if (field.max !== undefined && number > field.max) {
        return `Máximo ${field.max}`;
      }
    }

    return null;
  }

  static normalize(field: RecordField, value: RecordValue | undefined): RecordValue {
    switch (field.kind) {
      case 'switch':
        return !!value;
      case 'number':
        return RecordDrawerComponent.isBlank(value) ? (field.nullable ? null : 0) : Number(value);
      case 'select':
        return RecordDrawerComponent.isBlank(value) ? null : String(value);
      default: {
        const text = value === null || value === undefined ? '' : String(value).trim();
        if (!text && field.nullable) {
          return null;
        }
        return field.uppercase ? text.toUpperCase() : text;
      }
    }
  }
}
