import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  afterNextRender,
  computed,
  inject,
  input,
  output
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CardBlock, CardDefinition, CardDetail, CardWidthTier, TableCell, TableRowBase } from '@models';
import { CardBlocksComponent } from '../card-blocks/card-blocks.component';
import { StatusChipComponent } from '../status-chip/status-chip.component';
import { captureOpener, focusFirst, restoreFocus, trapTab } from '../record-drawer/focus-trap';
import { EntityCardEngine } from './entity-card-engine';

/** Ancho útil del cuerpo del cajón (28rem menos paddings). */
const BODY_WIDTH = 400;

/**
 * ============================================================================
 * DETALLE DE ENTIDAD EN CAJÓN LATERAL
 * ============================================================================
 * Sustituye al despliegue de la tarjeta: "Ver detalle" abre este cajón con el
 * contenido de la ranura 5 (card-blocks o la plantilla del módulo). Mismo
 * patrón que `record-drawer`: vidrio overlay, radio 24px, foco dentro, Tab
 * atrapado, Escape cierra y el foco vuelve a quien lo abrió.
 * ============================================================================
 */
@Component({
  selector: 'app-entity-detail-drawer',
  imports: [NgTemplateOutlet, CardBlocksComponent, StatusChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './entity-detail-drawer.component.scss',
  host: {
    '(document:keydown.escape)': 'close.emit()',
    '(keydown)': 'onKeydown($event)'
  },
  template: `
    <div class="entity-detail" data-testid="entity-detail-drawer" role="dialog" aria-modal="true" [attr.aria-label]="'Detalle · ' + title()">
      <div class="entity-detail__backdrop" (click)="close.emit()"></div>

      <div class="entity-detail__panel-wrap">
        <section class="entity-detail__panel" tabindex="-1">
          <header class="entity-detail__header">
            <div class="entity-detail__heading">
              <span class="entity-detail__code">{{ badge() }}</span>
              <h2 class="entity-detail__title">{{ title() }}</h2>
              @if (subtitle()) {
                <p class="entity-detail__subtitle">{{ subtitle() }}</p>
              }
              <div class="entity-detail__status">
                <app-status-chip [label]="status().value ?? ''" [tone]="status().tone ?? 'neutral'" />
                <span class="entity-detail__metric">{{ metric() }}</span>
              </div>
            </div>
            <button type="button" class="entity-detail__close" data-testid="entity-detail-close" (click)="close.emit()" aria-label="Cerrar detalle">
              <svg class="entity-detail__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div class="entity-detail__body" data-testid="entity-card-details">
            <!-- Alto del escalón del motor: los bloques no se estiran a todo el cajón. -->
            <div class="entity-detail__blocks" [style.height.px]="blocksHeight()">
              @if (bodyTemplate(); as body) {
                <ng-container *ngTemplateOutlet="body; context: { $implicit: row(), width: bodyWidth, tier: tier }" />
              } @else {
                <app-card-blocks [blocks]="blocks()" [width]="bodyWidth" [tier]="tier" />
              }
            </div>
          </div>

          <footer class="entity-detail__footer">
            <button type="button" class="entity-detail__cancel" (click)="close.emit()">Cerrar</button>
            @if (showEdit()) {
              <button type="button" class="entity-detail__edit" data-testid="entity-detail-edit" (click)="edit.emit()">{{ editLabel() }}</button>
            }
          </footer>
        </section>
      </div>
    </div>
  `
})
export class EntityDetailDrawerComponent<T extends TableRowBase> {
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  readonly row = input.required<T>();
  readonly definition = input.required<CardDefinition<T>>();
  readonly bodyTemplate = input<TemplateRef<{ $implicit: T; width: number; tier: CardWidthTier }> | null>(null);
  readonly showEdit = input<boolean>(true);
  readonly editLabel = input<string>('Editar');

  readonly close = output<void>();
  readonly edit = output<void>();

  protected readonly bodyWidth = BODY_WIDTH;
  protected readonly tier = EntityCardEngine.widthTier(BODY_WIDTH);
  /**
   * Alto de los bloques: el mismo escalón que el motor asignaba al cuerpo
   * desplegado, para que card-blocks conserve sus proporciones en el cajón.
   */
  protected readonly blocksHeight = computed<number>(() => {
    const definition = this.definition();
    return EntityCardEngine.calculate(definition.bodyRows ?? definition.details.length).bodyHeight;
  });

  protected readonly badge = computed<string>(() => this.definition().badge(this.row()));
  protected readonly title = computed<string>(() => this.definition().title(this.row()));
  protected readonly status = computed<TableCell>(() => this.definition().status(this.row()));
  protected readonly metric = computed<string>(() => this.definition().metric(this.row()).value);
  protected readonly subtitle = computed<string>(() => {
    const resolve = this.definition().subtitle;
    return resolve ? resolve(this.row()) : '';
  });

  /** Mismo contenido que tenía el cuerpo desplegable de la tarjeta. */
  protected readonly blocks = computed<readonly CardBlock[]>(() => {
    const definition = this.definition();
    const row = this.row();
    if (definition.body) {
      return definition.body(row);
    }
    return [{
      kind: 'keyvalue',
      rows: definition.details.map((detail: CardDetail<T>) => ({ label: detail.label, cell: detail.cell(row) }))
    }];
  });

  /** Quien abrió el cajón ("Ver detalle"): recupera el foco al cerrarse. */
  private readonly opener = captureOpener();

  constructor() {
    afterNextRender(() => focusFirst(this.panel(), '.entity-detail__close'));
    inject(DestroyRef).onDestroy(() => restoreFocus(this.opener));
  }

  protected onKeydown(event: KeyboardEvent): void {
    trapTab(event, this.panel());
  }

  private panel(): HTMLElement | null {
    return (this.hostRef.nativeElement as HTMLElement).querySelector<HTMLElement>('.entity-detail__panel');
  }
}
