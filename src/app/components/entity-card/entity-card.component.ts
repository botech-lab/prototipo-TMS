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
import { ENTITY_CARD_DIMENSIONS } from '@core';
import { CardGeometry, EntityCardEngine } from './entity-card-engine';
import { NavIconComponent } from '../app-shell/nav-icon.component';
import { CardDefinition, CardDetail, CardMetric, ChipTone, RowActionDef, TableCell, TableRowBase } from '@models';

/** Dato clave ya proyectado a texto (retícula de 3 columnas del cuerpo). */
interface KeyFact {
  readonly label: string;
  readonly value: string;
}

/** Acción del pie ya resuelta: nativa (editar / eliminar) o extra del módulo. */
interface FooterAction {
  readonly kind: 'edit' | 'delete' | 'extra';
  readonly label: string;
  readonly testId: string;
  readonly iconPath: string;
  readonly extra?: RowActionDef;
}

const EDIT_ICON = 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
const DELETE_ICON = 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16';

/**
 * ============================================================================
 * TARJETA DE ENTIDAD GENÉRICA (COMPONENTE PRESENTACIONAL "DUMB")
 * ============================================================================
 * Anatomía única (Amanecer andino): cabecera (código · estado · switch),
 * cuerpo (título, subtítulo y 3 datos clave) y pie (una acción principal en
 * píldora de contorno, enlaces secundarios y el resto en el menú "⋯").
 *
 * La tarjeta NUNCA crece: "Ver detalle" no la despliega, emite
 * `expandToggle` y la retícula abre el detalle en un cajón lateral.
 * No conoce ninguna entidad: recibe una `CardDefinition<T>`.
 * ============================================================================
 */
@Component({
  selector: 'app-entity-card',
  imports: [NavIconComponent],
  templateUrl: './entity-card.component.html',
  styleUrls: ['./entity-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(focusout)': 'onFocusOut($event)'
  }
})
export class EntityCardComponent<T extends TableRowBase> {
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  // ==========================================
  // INPUTS & OUTPUTS (Angular 17+ Signals API)
  // ==========================================
  readonly row = input.required<T>();
  readonly definition = input.required<CardDefinition<T>>();

  /**
   * Geometría del módulo (se conserva por compatibilidad de API). La tarjeta
   * ya no crece, así que no usa `expandedHeight` para presentarse.
   */
  readonly geometry = input<CardGeometry>(EntityCardEngine.calculate(0));

  /** Botón de edición del pie. */
  readonly showEdit = input<boolean>(true);
  /** Rótulo de la edición cuando es la acción principal. */
  readonly editLabel = input<string>('Editar');
  /** Eliminar (va en el menú "⋯"). */
  readonly showDelete = input<boolean>(false);
  /** Acciones adicionales del módulo. La primera es la acción principal. */
  readonly extraActions = input<readonly RowActionDef[]>([]);

  /** Pide abrir el detalle (cajón lateral de la retícula). */
  readonly expandToggle = output<string>();
  readonly enabledToggle = output<string>();
  readonly edit = output<string>();
  readonly remove = output<string>();
  /** Emite el `id` de la `RowActionDef` pulsada. */
  readonly extraAction = output<string>();

  protected readonly dimensions = ENTITY_CARD_DIMENSIONS;
  protected readonly editIcon = EDIT_ICON;
  protected readonly deleteIcon = DELETE_ICON;

  // ==========================================
  // PROYECCIÓN DOMINIO → RANURAS
  // ==========================================
  protected readonly badge = computed<string>(() => this.definition().badge(this.row()));
  protected readonly title = computed<string>(() => this.definition().title(this.row()));
  protected readonly status = computed<TableCell>(() => this.definition().status(this.row()));
  protected readonly metric = computed<CardMetric>(() => this.definition().metric(this.row()));

  protected readonly subtitle = computed<string>(() => {
    const resolve = this.definition().subtitle;
    return resolve ? resolve(this.row()) : '';
  });

  /** `null` cuando la entidad no admite activación rápida (sin switch). */
  protected readonly isEnabled = computed<boolean | null>(() => {
    const resolve = this.definition().isEnabled;
    return resolve ? resolve(this.row()) : null;
  });

  protected readonly tone = computed<ChipTone>(() => this.status().tone ?? 'neutral');

  /** Inactiva: switch apagado. Se atenúa con la trama de suspendido. */
  protected readonly inactive = computed<boolean>(() => this.isEnabled() === false);

  /** Requiere atención: estado de aviso o error en una entidad activa. */
  protected readonly attention = computed<'warning' | 'danger' | null>(() => {
    if (this.inactive()) {
      return null;
    }
    const tone = this.tone();
    if (tone === 'warning') {
      return 'warning';
    }
    return tone === 'danger' || tone === 'critical' ? 'danger' : null;
  });

  /**
   * Hasta 3 datos clave. Se omiten los que ya se leen en el código, el título
   * o el subtítulo, para no repetir información en una tarjeta pequeña.
   */
  protected readonly keyFacts = computed<readonly KeyFact[]>(() => {
    const row = this.row();
    const seen = [this.badge(), this.title(), this.subtitle()].map(text => text.toLowerCase());
    return this.definition()
      .details.map((detail: CardDetail<T>) => ({ label: detail.label, value: cellText(detail.cell(row)) }))
      .filter(fact => fact.value && !seen.some(text => text && text.includes(fact.value.toLowerCase())))
      .slice(0, 3);
  });

  /** Acción principal (píldora de contorno): la primera acción del módulo, o editar. */
  protected readonly primaryAction = computed<FooterAction | null>(() => {
    const [first] = this.extraActions();
    if (first) {
      return this.extraToAction(first);
    }
    return this.showEdit() ? this.editAction(this.editLabel()) : null;
  });

  /** Editar como enlace secundario cuando la principal es otra acción. */
  protected readonly editLink = computed<boolean>(
    () => this.showEdit() && this.primaryAction()?.kind !== 'edit'
  );

  /** Resto de acciones: menú "⋯". */
  protected readonly menuActions = computed<readonly FooterAction[]>(() => {
    const rest = this.extraActions().slice(1).map(extra => this.extraToAction(extra));
    return this.showDelete()
      ? [...rest, { kind: 'delete', label: 'Eliminar', testId: 'btn-delete-entity', iconPath: DELETE_ICON }]
      : rest;
  });

  // ==========================================
  // MENÚ "⋯"
  // ==========================================
  protected readonly menuOpen = signal<boolean>(false);
  private readonly moreButton = viewChild<ElementRef<HTMLElement>>('moreButton');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');

  protected toggleMenu(): void {
    this.menuOpen.update(open => !open);
    if (this.menuOpen()) {
      afterNextRender(() => this.menuItems()[0]?.focus(), { injector: this.injector });
    }
  }

  protected closeMenu(returnFocus: boolean): void {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    if (returnFocus) {
      this.moreButton()?.nativeElement.focus();
    }
  }

  /** Teclado del menú: flechas recorren, Inicio/Fin saltan, Escape cierra. */
  protected onMenuKeydown(event: KeyboardEvent): void {
    const items = this.menuItems();
    const index = items.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.closeMenu(true);
        break;
      case 'Tab':
        this.closeMenu(false);
        break;
    }
  }

  /** El menú se cierra cuando el foco sale de la tarjeta. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    const host = this.hostRef.nativeElement as HTMLElement;
    if (!next || !host.contains(next)) {
      this.closeMenu(false);
    }
  }

  protected runAction(action: FooterAction): void {
    this.closeMenu(false);
    switch (action.kind) {
      case 'edit':
        this.edit.emit(this.row().id);
        break;
      case 'delete':
        this.remove.emit(this.row().id);
        break;
      default:
        if (action.extra) {
          this.extraAction.emit(action.extra.id);
        }
    }
  }

  protected onEdit(): void {
    this.edit.emit(this.row().id);
  }

  protected onShowDetails(): void {
    this.expandToggle.emit(this.row().id);
  }

  protected onToggleEnabled(event: Event): void {
    event.stopPropagation();
    this.enabledToggle.emit(this.row().id);
  }

  private menuItems(): HTMLElement[] {
    const menu = this.menu()?.nativeElement;
    return menu ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
  }

  private editAction(label: string): FooterAction {
    return { kind: 'edit', label, testId: 'btn-edit-entity', iconPath: EDIT_ICON };
  }

  private extraToAction(extra: RowActionDef): FooterAction {
    return { kind: 'extra', label: extra.label, testId: `btn-${extra.id}-entity`, iconPath: extra.iconPath, extra };
  }
}

/** Texto plano de una celda para los datos clave de la tarjeta. */
export function cellText(cell: TableCell): string {
  if (cell.kind === 'tags') {
    return (cell.items ?? []).join(', ');
  }
  return cell.value ?? '';
}
