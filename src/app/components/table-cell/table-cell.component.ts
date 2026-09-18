import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableCell } from '@models';
import { StatusChipComponent } from '../status-chip/status-chip.component';

/**
 * ============================================================================
 * RENDERIZADOR ÚNICO DE CELDA
 * ============================================================================
 * Traduce un `TableCell` a píxeles. Lo consumen POR IGUAL la tabla
 * (`DataTableComponent`) y la tarjeta (`EntityCardComponent`), de modo que un
 * mismo dato se ve idéntico en ambas vistas y solo existe un lugar donde
 * cambiar la tipografía de un tipo de celda.
 * ============================================================================
 */
@Component({
  selector: 'app-table-cell',
  imports: [StatusChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './table-cell.component.scss',
  template: `
    @switch (cell().kind) {

      <!-- Identificador principal del registro -->
      @case ('strong') {
        <span class="table-cell__strong">{{ cell().value }}</span>
      }

      <!-- Dos líneas: valor + leyenda de apoyo -->
      @case ('stacked') {
        <div class="table-cell__stacked">
          <span class="table-cell__stacked-value" [attr.title]="cell().value">{{ cell().value }}</span>
          @if (cell().caption) {
            <span class="table-cell__stacked-caption" [attr.title]="cell().caption">{{ cell().caption }}</span>
          }
        </div>
      }

      <!-- Cifra con tipografía de datos -->
      @case ('numeric') {
        <span class="table-cell__numeric">{{ cell().value }}</span>
      }

      <!-- Estado semántico -->
      @case ('chip') {
        <app-status-chip [label]="cell().value ?? ''" [tone]="cell().tone ?? 'neutral'" />
      }

      <!-- Colección de etiquetas (roles, permisos, categorías) -->
      @case ('tags') {
        @if (cell().items?.length) {
          <div class="table-cell__tags">
            @for (item of cell().items; track item) {
              <span class="table-cell__tag">
                {{ item }}
              </span>
            }
          </div>
        } @else {
          <span class="table-cell__empty">—</span>
        }
      }

      <!-- Texto plano secundario -->
      @default {
        <span class="table-cell__text">{{ cell().value || '—' }}</span>
      }
    }
  `
})
export class TableCellComponent {
  readonly cell = input.required<TableCell>();
}
