import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild
} from '@angular/core';

/** Ancho aproximado de un carácter a 16px (Plus Jakarta Sans, peso 500). */
const CHAR_WIDTH = 8.4;
/** Relleno horizontal del campo: lupa a la izquierda, limpiar a la derecha. */
const INPUT_PADDING = 84;

/**
 * Campo de búsqueda con icono vectorial y botón de limpieza.
 * Usa `model()` (Angular 17.2+) para binding bidireccional sin `.subscribe()`.
 * El texto de ayuda es responsivo: si el largo no cabe a 16px (móvil), usa
 * `shortPlaceholder` (o «Buscar…»), de modo que nunca se ve cortado. El
 * nombre accesible conserva siempre el texto completo.
 */
@Component({
  selector: 'app-search-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './search-field.component.scss',
  template: `
    <div class="search-field">
      <input
        #input
        type="search"
        data-testid="search-field-input"
        [value]="value()"
        (input)="onInput($event)"
        [placeholder]="visiblePlaceholder()"
        [attr.aria-label]="placeholder()"
        class="search-field__input" />

      <svg
        class="search-field__icon"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true">
        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
      </svg>

      @if (value()) {
        <button
          type="button"
          data-testid="search-field-clear"
          (click)="value.set('')"
          class="search-field__clear"
          aria-label="Limpiar búsqueda">
          <svg class="search-field__clear-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    </div>
  `
})
export class SearchFieldComponent {
  readonly value = model<string>('');
  readonly placeholder = input<string>('Buscar...');
  /** Versión corta para campos estrechos. Si se omite, «Buscar…». */
  readonly shortPlaceholder = input<string>('');

  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');
  private readonly inputWidth = signal<number>(Number.POSITIVE_INFINITY);

  /** Texto de ayuda que cabe en el ancho real del campo. */
  protected readonly visiblePlaceholder = computed<string>(() => {
    const available = this.inputWidth() - INPUT_PADDING;
    const fits = (text: string) => text.length * CHAR_WIDTH <= available;
    const full = this.placeholder();
    if (fits(full)) {
      return full;
    }
    const short = this.shortPlaceholder();
    return short && fits(short) ? short : 'Buscar…';
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.input()?.nativeElement;
      if (!el) {
        return;
      }
      this.inputWidth.set(el.clientWidth);
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.inputWidth.set(el.clientWidth));
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
