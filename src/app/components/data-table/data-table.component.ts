import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import {
  COLUMN_ALIGN_CLASSES,
  COLUMN_VISIBILITY_CLASSES,
  DATA_TABLE_DIMENSIONS
} from '@core';
import { RowAction, RowActionDef, RowActionKind, TableCell, TableColumn, TableRowBase } from '@models';
import { TableCellComponent } from '../table-cell/table-cell.component';

/** Celda ya proyectada, lista para pintar (evita llamar funciones en plantilla). */
interface RenderedCell<T extends TableRowBase> {
  readonly column: TableColumn<T>;
  readonly cell: TableCell;
}

/** Fila con todas sus celdas resueltas en un único paso reactivo. */
interface RenderedRow<T extends TableRowBase> {
  readonly id: string;
  readonly source: T;
  readonly cells: readonly RenderedCell<T>[];
}

/**
 * ============================================================================
 * TABLA DE DATOS GENÉRICA (COMPONENTE PRESENTACIONAL "DUMB")
 * ============================================================================
 * Motor de renderizado único para todas las tablas del sistema. No conoce
 * ninguna entidad de negocio: recibe columnas declarativas y filas ya
 * filtradas por el contenedor inteligente correspondiente.
 *
 * Respeta las alturas congeladas de `DATA_TABLE_DIMENSIONS`.
 * ============================================================================
 */
@Component({
  selector: 'app-data-table',
  imports: [TableCellComponent],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent<T extends TableRowBase> {
  // ==========================================
  // INDICADOR DE DESPLAZAMIENTO HORIZONTAL
  // Mismo patrón que `filter-tabs`: si la tabla no cabe (p. ej. 768px), el
  // borde con columnas ocultas se desvanece para indicar que hay más.
  // ==========================================
  protected readonly fadeStart = signal<boolean>(false);
  protected readonly fadeEnd = signal<boolean>(false);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.scroller()?.nativeElement;
      this.updateFade();
      if (!el || typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.updateFade());
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    // Cambian filas o columnas: cambia el ancho del contenido.
    effect(() => {
      this.rows();
      this.columns();
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => this.updateFade());
      }
    });
  }

  /** Recalcula los degradados de borde según la posición del desplazamiento. */
  protected updateFade(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) {
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    this.fadeStart.set(el.scrollLeft > 1);
    this.fadeEnd.set(max - el.scrollLeft > 1);
  }

  // ==========================================
  // INPUTS & OUTPUTS (Angular 17+ Signals API)
  // ==========================================
  readonly columns = input.required<readonly TableColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();
  readonly emptyTitle = input<string>('Sin registros');
  readonly emptyMessage = input<string>('No se encontraron datos con los filtros aplicados.');
  /** Muestra la columna de acciones al final de cada fila. */
  readonly showActions = input<boolean>(true);
  /** Acción de edición. Los catálogos paramétricos solo admiten eliminar. */
  readonly showEdit = input<boolean>(true);
  /** Nombre accesible del botón de edición (p. ej. «Editar datos»). */
  readonly editLabel = input<string>('Editar');
  /**
   * Acciones adicionales declaradas por el módulo. Se pintan como botones de
   * icono entre editar y eliminar, sin alterar la fila de 64px.
   */
  readonly extraActions = input<readonly RowActionDef[]>([]);

  readonly rowAction = output<RowAction<T>>();

  protected readonly dimensions = DATA_TABLE_DIMENSIONS;

  // ==========================================
  // COMPUTED SIGNALS
  // ==========================================

  /**
   * Proyecta el dominio a presentación una sola vez por cambio de estado,
   * en lugar de invocar `column.cell(row)` en cada ciclo de detección.
   */
  protected readonly renderedRows = computed<readonly RenderedRow<T>[]>(() => {
    const columns = this.columns();
    return this.rows().map(source => ({
      id: source.id,
      source,
      cells: columns.map(column => ({ column, cell: column.cell(source) }))
    }));
  });

  protected readonly isEmpty = computed<boolean>(() => this.rows().length === 0);

  /** Número total de columnas renderizadas, para el `colspan` del estado vacío. */
  protected readonly columnCount = computed<number>(
    () => this.columns().length + (this.showActions() ? 1 : 0)
  );

  /**
   * Ancho de la columna de acciones: 36px por botón, 4px de separación y
   * 16px de respiro. Con editar + eliminar da los 92px originales.
   */
  protected readonly actionsWidth = computed<number>(() => {
    const count = 1 + (this.showEdit() ? 1 : 0) + this.extraActions().length;
    return 16 + count * 36 + (count - 1) * 4;
  });

  // ==========================================
  // HELPERS DE PRESENTACIÓN
  // ==========================================

  protected alignClass(column: TableColumn<T>): string {
    return COLUMN_ALIGN_CLASSES[column.align ?? 'left'];
  }

  protected visibilityClass(column: TableColumn<T>): string {
    const breakpoint = column.showFrom;
    return breakpoint ? COLUMN_VISIBILITY_CLASSES[breakpoint] : '';
  }

  protected emit(action: RowActionKind, row: T): void {
    this.rowAction.emit({ action, row });
  }
}
