import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  model,
  signal,
  viewChild
} from '@angular/core';
import { FilterTab } from '@models';

/**
 * Pestañas de filtrado por categoría (Conductores: TODAS, CATEGORÍA A, B, C...).
 * Con scroll horizontal en móvil para no romper el ancho del contenedor; cuando
 * hay pestañas fuera de vista, un degradado de borde indica que hay más.
 */
@Component({
  selector: 'app-filter-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './filter-tabs.component.scss',
  template: `
    <div
      role="tablist"
      data-testid="filter-tabs"
      class="filter-tabs"
      [attr.aria-label]="label()">
      <div
        #scroller
        class="filter-tabs__scroller"
        [class.filter-tabs__scroller--fade-start]="fadeStart()"
        [class.filter-tabs__scroller--fade-end]="fadeEnd()"
        (scroll)="updateFade()">
        @for (tab of tabs(); track tab.id) {
          <button
            type="button"
            role="tab"
            data-testid="filter-tab"
            [attr.data-tab-id]="tab.id"
            [attr.aria-selected]="tab.id === activeId()"
            (click)="activeId.set(tab.id)"
            class="filter-tabs__tab"
            [class.filter-tabs__tab--active]="tab.id === activeId()">
            {{ tab.label }}
            @if (tab.count !== undefined) {
              <span class="filter-tabs__count">{{ tab.count }}</span>
            }
          </button>
        }
      </div>
    </div>
  `
})
export class FilterTabsComponent {
  readonly tabs = input.required<readonly FilterTab[]>();
  readonly activeId = model<string>('all');
  /** Nombre accesible del grupo de pestañas. */
  readonly label = input<string>('Filtrar por categoría');

  /** Hay pestañas ocultas a la izquierda / a la derecha del área visible. */
  readonly fadeStart = signal<boolean>(false);
  readonly fadeEnd = signal<boolean>(false);

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const el = this.scroller()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') {
        this.updateFade();
        return;
      }
      const observer = new ResizeObserver(() => this.updateFade());
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    // Cambiar las pestañas cambia el ancho del contenido: se recalcula al pintar.
    effect(() => {
      this.tabs();
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => this.updateFade());
      }
    });
  }

  /** Recalcula los degradados de borde según la posición del desplazamiento. */
  updateFade(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) {
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    this.fadeStart.set(el.scrollLeft > 1);
    this.fadeEnd.set(max - el.scrollLeft > 1);
  }
}
