import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { PageInfo, PaginationEngine } from './pagination-engine';

/**
 * Pie de paginación de los catálogos.
 * Presentacional puro: toda la aritmética vive en `PaginationEngine`.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './pagination.component.scss',
  template: `
    <nav
      data-testid="pagination"
      class="pagination"
      aria-label="Paginación del catálogo">

      <span data-testid="pagination-label" class="pagination__label">
        {{ info().label }}
      </span>

      <div class="pagination__controls">
        <button
          type="button"
          data-testid="pagination-prev"
          [disabled]="!info().hasPrevious"
          (click)="go(info().pageIndex - 1)"
          class="pagination__arrow"
          aria-label="Página anterior">
          <svg class="pagination__arrow-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        @for (page of info().pages; track $index) {
          @if (page === -1) {
            <span class="pagination__ellipsis">…</span>
          } @else {
            <button
              type="button"
              data-testid="pagination-page"
              [attr.aria-current]="page === info().pageIndex ? 'page' : null"
              (click)="go(page)"
              class="pagination__page"
              [class.pagination__page--current]="page === info().pageIndex">
              {{ page + 1 }}
            </button>
          }
        }

        <button
          type="button"
          data-testid="pagination-next"
          [disabled]="!info().hasNext"
          (click)="go(info().pageIndex + 1)"
          class="pagination__arrow"
          aria-label="Página siguiente">
          <svg class="pagination__arrow-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  `
})
export class PaginationComponent {
  readonly totalItems = input.required<number>();
  readonly pageSize = input<number>(10);
  readonly pageIndex = model<number>(0);

  protected readonly info = computed<PageInfo>(
    () => PaginationEngine.calculate(this.totalItems(), this.pageIndex(), this.pageSize())
  );

  protected go(page: number): void {
    this.pageIndex.set(page);
  }
}
