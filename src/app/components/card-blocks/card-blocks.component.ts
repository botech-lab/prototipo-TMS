import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CARD_BLOCK_RULES } from '@core';
import { CardBlock, CardWidthTier, GroupBlock, MatrixBlock } from '@models';
import { EntityCardEngine } from '../entity-card/entity-card-engine';
import { TableCellComponent } from '../table-cell/table-cell.component';

/**
 * ============================================================================
 * RENDERIZADOR DE BLOQUES DE TARJETA
 * ============================================================================
 * Compone el cuerpo de una tarjeta a partir del vocabulario de bloques.
 * Es recursivo: un `group` vuelve a instanciar este mismo componente.
 *
 * NO calcula coordenadas. La retícula la resuelve CSS Grid, que alinea las
 * columnas por construcción y consume el ancho real sin escalar nada; por eso
 * la tipografía se mantiene en píxeles constantes y no queda aire muerto a
 * los lados, que era el defecto del lienzo SVG de tamaño fijo.
 * ============================================================================
 */
@Component({
  selector: 'app-card-blocks',
  imports: [TableCellComponent],
  templateUrl: './card-blocks.component.html',
  styleUrls: ['./card-blocks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'card-blocks',
    '[attr.data-tier]': 'tier()',
    '[style.--block-gap.px]': 'rules.BLOCK_GAP'
  }
})
export class CardBlocksComponent {
  readonly blocks = input.required<readonly CardBlock[]>();
  /** Ancho real del contenedor, medido por la tarjeta. */
  readonly width = input<number>(0);
  readonly tier = input<CardWidthTier>('medium');
  /** Desactiva el escalonado en bloques anidados, que ya heredan el del padre. */
  readonly animate = input<boolean>(true);

  protected readonly rules = CARD_BLOCK_RULES;

  /** Bloques con su índice de escalonado ya resuelto. */
  protected readonly items = computed(() =>
    this.blocks().map((block, index) => ({
      block,
      delayIndex: Math.min(index, CARD_BLOCK_RULES.MOTION.MAX_STAGGER_STEPS)
    }))
  );

  // ==========================================
  // HELPERS DE COMPOSICIÓN
  // ==========================================

  /** Un grupo horizontal se apila cuando la tarjeta es estrecha. */
  protected groupDirection(group: GroupBlock): 'row' | 'column' {
    if (group.direction === 'column') {
      return 'column';
    }
    return group.stackOnNarrow && this.tier() === 'narrow' ? 'column' : 'row';
  }

  protected groupWeight(group: GroupBlock, index: number): number {
    return group.weights?.[index] ?? 1;
  }

  /** Ancho estimado de un hijo de grupo, para que herede la medida. */
  protected childWidth(group: GroupBlock, index: number): number {
    if (this.groupDirection(group) === 'column') {
      return this.width();
    }
    const total = group.blocks.reduce((sum, _, i) => sum + this.groupWeight(group, i), 0);
    const share = this.groupWeight(group, index) / (total || 1);
    return Math.max(0, this.width() * share - CARD_BLOCK_RULES.BLOCK_GAP);
  }

  /**
   * Columnas de una matriz: las que declare el bloque, o las que quepan en el
   * ancho real. En tarjetas estrechas las matrices con rótulo bajan a 2.
   */
  protected matrixColumns(block: MatrixBlock): number {
    // Las columnas declaradas son SEMÁNTICAS -butacas por fila, meses por
    // año, roles por fila- y no se recortan: reducirlas multiplica las filas
    // y es justo lo que hace desbordar la retícula en tarjetas estrechas.
    if (block.columns) {
      return block.columns;
    }
    return EntityCardEngine.matrixColumns(this.width(), block.cells.length);
  }

  /** Alto mínimo de celda: las que llevan rótulo necesitan más. */
  protected matrixMinHeight(block: MatrixBlock): number {
    if (block.minCellHeight) {
      return block.minCellHeight;
    }
    return block.variant === 'tile'
      ? CARD_BLOCK_RULES.MATRIX.TILE_MIN_HEIGHT
      : CARD_BLOCK_RULES.MATRIX.MIN_CELL_HEIGHT;
  }

  /** Cota de ancho de celda. Las celdas con rótulo llenan; las mudas no. */
  protected matrixMaxWidth(block: MatrixBlock): string {
    return block.variant === 'tile'
      ? '1fr'
      : `${CARD_BLOCK_RULES.MATRIX.DOT_MAX_WIDTH}px`;
  }

  /** Cota de alto de celda muda, para conservar proporción de butaca. */
  protected matrixMaxHeight(block: MatrixBlock): number | null {
    return block.variant === 'tile' ? null : CARD_BLOCK_RULES.MATRIX.DOT_MAX_HEIGHT;
  }

  protected statSize(emphasis: 'hero' | 'normal' | undefined): number {
    if (emphasis !== 'hero') {
      return CARD_BLOCK_RULES.STAT.NORMAL_SIZE;
    }
    return this.tier() === 'narrow'
      ? CARD_BLOCK_RULES.STAT.HERO_SIZE_NARROW
      : CARD_BLOCK_RULES.STAT.HERO_SIZE;
  }

  /** Proporción acotada: un bloque nunca dibuja fuera de su riel. */
  protected clampRatio(ratio: number): number {
    return Math.min(1, Math.max(0, ratio));
  }
}
