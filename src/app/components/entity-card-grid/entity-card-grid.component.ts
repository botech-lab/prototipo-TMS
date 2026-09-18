import { ChangeDetectionStrategy, Component, TemplateRef, computed, input, output, signal } from '@angular/core';
import { ENTITY_CARD_DIMENSIONS } from '@core';
import { CardDefinition, CardWidthTier, RowAction, RowActionDef, TableRowBase } from '@models';
import { CardGeometry, EntityCardEngine } from '../entity-card/entity-card-engine';
import { EntityCardComponent } from '../entity-card/entity-card.component';
import { EntityDetailDrawerComponent } from '../entity-card/entity-detail-drawer.component';

/**
 * ============================================================================
 * GRID DE TARJETAS DE ENTIDAD
 * ============================================================================
 * Equivalente en tarjetas de `DataTableComponent`. Concentra en un único lugar
 * la retícula responsiva (`ENTITY_CARD_DIMENSIONS.GRID`), con tarjetas de
 * igual altura por fila, y el cajón de detalle ("Ver detalle"): las tarjetas
 * nunca crecen, de modo que las pantallas de módulo no lo repliquen.
 *
 * Conforme a la Regla 4 de arquitectura: 1 columna en móvil, 2 columnas
 * amplias en iPad y 3 desde `xl`.
 * ============================================================================
 */
@Component({
  selector: 'app-entity-card-grid',
  imports: [EntityCardComponent, EntityDetailDrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './entity-card-grid.component.scss',
  template: `
    @if (rows().length) {
      <div
        data-testid="entity-card-grid"
        [class]="dimensions.GRID">
        @for (row of rows(); track row.id) {
          <app-entity-card
            [row]="row"
            [definition]="definition()"
            [geometry]="geometry()"
            (expandToggle)="openDetail($event)"
            (enabledToggle)="enabledToggle.emit($event)"
            [showEdit]="showEdit()"
            [editLabel]="editLabel()"
            [showDelete]="showDelete()"
            [extraActions]="extraActions()"
            (edit)="rowAction.emit({ action: 'edit', row })"
            (remove)="rowAction.emit({ action: 'delete', row })"
            (extraAction)="rowAction.emit({ action: $event, row })" />
        }
      </div>

      @if (detailRow(); as detail) {
        <app-entity-detail-drawer
          [row]="detail"
          [definition]="definition()"
          [bodyTemplate]="bodyTemplate()"
          [showEdit]="showEdit()"
          [editLabel]="editLabel()"
          (close)="closeDetail()"
          (edit)="closeDetail(); rowAction.emit({ action: 'edit', row: detail })" />
      }
    } @else {
      <div
        data-testid="entity-card-grid-empty"
        class="entity-card-grid__empty">
        <p class="entity-card-grid__empty-title">{{ emptyTitle() }}</p>
        <p class="entity-card-grid__empty-message">{{ emptyMessage() }}</p>
        @if (emptyActionLabel()) {
          <button type="button" class="entity-card-grid__empty-action" data-testid="entity-card-grid-empty-action" (click)="emptyAction.emit()">
            {{ emptyActionLabel() }}
          </button>
        }
      </div>
    }
  `
})
export class EntityCardGridComponent<T extends TableRowBase> {
  readonly rows = input.required<readonly T[]>();
  readonly definition = input.required<CardDefinition<T>>();
  /** Se reenvía tal cual a cada tarjeta (ranura 5). */
  readonly bodyTemplate = input<TemplateRef<{ $implicit: T; width: number; tier: CardWidthTier }> | null>(null);
  readonly emptyTitle = input<string>('Sin registros');
  readonly emptyMessage = input<string>('No se encontraron datos con los filtros aplicados.');
  /** Acción principal del estado vacío (p. ej. «Nuevo vehículo»). Sin rótulo no se pinta. */
  readonly emptyActionLabel = input<string>('');
  readonly emptyAction = output<void>();

  /** Mismo contrato de acciones que `DataTableComponent`. */
  readonly showEdit = input<boolean>(true);
  readonly editLabel = input<string>('Editar');
  readonly showDelete = input<boolean>(true);
  readonly extraActions = input<readonly RowActionDef[]>([]);

  readonly rowAction = output<RowAction<T>>();
  readonly enabledToggle = output<string>();

  protected readonly dimensions = ENTITY_CARD_DIMENSIONS;

  /**
   * Geometría del MÓDULO, calculada una sola vez y compartida por todas las
   * tarjetas de esta retícula. Es lo que garantiza que ninguna fila brinque:
   * dos módulos pueden medir distinto, pero jamás conviven en el mismo grid.
   */
  protected readonly geometry = computed<CardGeometry>(() => {
    const definition = this.definition();
    return EntityCardEngine.calculate(definition.bodyRows ?? definition.details.length);
  });

  /** Registro abierto en el cajón de detalle. Estado puramente visual. */
  private readonly detailId = signal<string | null>(null);

  protected readonly detailRow = computed<T | null>(() => {
    const id = this.detailId();
    return id === null ? null : this.rows().find(row => row.id === id) ?? null;
  });

  protected openDetail(id: string): void {
    this.detailId.set(id);
  }

  protected closeDetail(): void {
    this.detailId.set(null);
  }
}
