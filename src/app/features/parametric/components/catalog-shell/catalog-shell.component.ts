import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DataTableComponent } from '@components/data-table/data-table.component';
import { EntityCardGridComponent } from '@components/entity-card-grid/entity-card-grid.component';
import { PageHeaderComponent, PageHeaderIcon } from '@components/page-header/page-header.component';
import { PaginationComponent } from '@components/pagination/pagination.component';
import { SearchFieldComponent } from '@components/search-field/search-field.component';
import { ViewSwitcherComponent } from '@components/view-switcher/view-switcher.component';
import { responsiveViewMode } from '@components/view-switcher/responsive-view-mode';
import { RecordDrawerComponent } from '@components/record-drawer/record-drawer.component';
import { ToastService } from '@components/toast/toast.service';
import { CardDefinition, RecordField, RecordValidator, RecordValue, RecordValues, RowAction, TableColumn } from '@models';
import { CatalogEntry } from '../../models/parametric.model';
import { CatalogStore } from '../../services/catalog-store';

/**
 * ============================================================================
 * SHELL DE CATÁLOGO PARAMÉTRICO
 * ============================================================================
 * Ensambla el módulo completo -cabecera, búsqueda, conmutador de vista, tabla
 * o tarjetas y paginación- a partir de una declaración.
 *
 * Gracias a esto, cada uno de los 16 catálogos se reduce a declarar SUS
 * columnas y SUS ranuras de tarjeta: ni una línea de maquetación repetida.
 * ============================================================================
 */
@Component({
  selector: 'app-catalog-shell',
  imports: [
    PageHeaderComponent,
    SearchFieldComponent,
    ViewSwitcherComponent,
    DataTableComponent,
    EntityCardGridComponent,
    PaginationComponent,
    RecordDrawerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './catalog-shell.component.scss',
  template: `
    <section class="catalog-shell">

      <!-- 1. CABECERA DEL MÓDULO -->
      <app-page-header
        [title]="title()"
        [subtitle]="subtitle()"
        [icon]="icon()"
        [actionLabel]="actionLabel()"
        (actionClick)="onCreate()" />

      <!-- 2. TOOLBAR: BÚSQUEDA + RECUENTO + CONMUTADOR DE VISTA -->
      <div class="catalog-shell__toolbar">
        <div class="catalog-shell__search">
          <app-search-field
            [value]="store().searchQuery()"
            (valueChange)="store().setSearch($event)"
            [placeholder]="searchPlaceholder()" />
        </div>

        <span class="catalog-shell__summary">
          {{ store().activeCount() }} activos de {{ store().totalCount() }}
        </span>

        <app-view-switcher [(mode)]="viewMode" />
      </div>

      <!-- 3. CATÁLOGO -->
      @if (viewMode() === 'table') {
        <app-data-table
          [columns]="columns()"
          [rows]="store().pageRows()"
          [showEdit]="canEdit()"
          [emptyTitle]="emptyTitle()"
          [emptyMessage]="emptyMessage()"
          (rowAction)="onRowAction($event)" />
      } @else {
        <app-entity-card-grid
          [rows]="store().pageRows()"
          [definition]="cardDefinition()"
          [showEdit]="canEdit()"
          [emptyTitle]="emptyTitle()"
          [emptyMessage]="emptyMessage()"
          [emptyActionLabel]="actionLabel() ?? ''"
          (emptyAction)="onCreate()"
          (rowAction)="onRowAction($event)"
          (enabledToggle)="store().toggleStatus($event)" />
      }

      <!-- 4. PAGINACIÓN (solo si hay más de una página) -->
      @if (store().pageInfo().totalPages > 1) {
        <app-pagination
          [totalItems]="store().filtered().length"
          [pageSize]="store().pageSize"
          [pageIndex]="store().pageIndex()"
          (pageIndexChange)="store().setPage($event)" />
      }
    </section>

    <!-- 5. DRAWER DE ALTA / EDICIÓN (campos declarados por cada catálogo) -->
    @if (editor(); as editing) {
      <app-record-drawer
        [eyebrow]="editing.row ? 'Editar · ' + title() : 'Nuevo registro · ' + title()"
        [title]="editing.row ? cardDefinition().title(editing.row) : (actionLabel() ?? 'Nuevo registro')"
        [code]="editing.row ? cardDefinition().badge(editing.row) : ''"
        [fields]="drawerFields()"
        [values]="editing.values"
        [submitLabel]="editing.row ? 'Guardar cambios' : 'Crear'"
        [validator]="drawerValidator()"
        (save)="onSave($event)"
        (close)="editor.set(null)" />
    }
  `
})
export class CatalogShellComponent<T extends CatalogEntry> {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly icon = input<PageHeaderIcon>('catalog');
  readonly actionLabel = input<string | null>(null);
  readonly searchPlaceholder = input<string>('Buscar...');
  readonly emptyTitle = input<string>('Sin registros');
  readonly emptyMessage = input<string>('No hay registros que coincidan con la búsqueda.');
  /** Muestra la acción de edición. Requiere `formFields`. */
  readonly showEdit = input<boolean>(true);
  /**
   * Campos editables del catálogo. El estado (ACTIVO / INACTIVO) lo añade el
   * shell como switch; no hace falta declararlo. Sin campos, el catálogo
   * queda en solo lectura + eliminar, como antes.
   */
  readonly formFields = input<readonly RecordField[]>([]);
  /**
   * Validación cruzada del catálogo. Recibe los valores del drawer y el
   * registro en edición (`null` en alta) para poder excluirse a sí mismo.
   */
  readonly formValidator = input<((values: RecordValues, row: T | null) => Readonly<Record<string, string>>) | null>(null);
  /** Prefijo de los identificadores nuevos (`cty`, `dep`...), igual que la semilla. */
  readonly idPrefix = input<string>('cat');

  readonly store = input.required<CatalogStore<T>>();
  readonly columns = input.required<readonly TableColumn<T>[]>();
  readonly cardDefinition = input.required<CardDefinition<T>>();

  /** Se sigue emitiendo al pulsar la acción de cabecera (compatibilidad). */
  readonly createClick = output<void>();

  private readonly toasts = inject(ToastService);

  /** Modo de visualización activo: tarjetas en móvil, tabla desde `sm`. */
  readonly viewMode = responsiveViewMode();

  protected readonly canEdit = computed<boolean>(() => this.showEdit() && this.formFields().length > 0);

  /** Campo de estado común a los 15 catálogos. */
  private static readonly STATUS_FIELD: RecordField = {
    key: 'status',
    label: 'Estado del registro',
    kind: 'switch',
    onLabel: 'ACTIVO',
    offLabel: 'INACTIVO'
  };

  protected readonly drawerFields = computed<readonly RecordField[]>(() => [
    CatalogShellComponent.STATUS_FIELD,
    ...this.formFields()
  ]);

  /** Registro en edición (`row`) o alta (`row: null`), con sus valores iniciales. */
  protected readonly editor = signal<{ readonly row: T | null; readonly values: RecordValues } | null>(null);

  protected readonly drawerValidator = computed<RecordValidator | null>(() => {
    const validate = this.formValidator();
    const row = this.editor()?.row ?? null;
    return validate ? (values: RecordValues) => validate(values, row) : null;
  });

  protected onCreate(): void {
    this.createClick.emit();
    if (!this.formFields().length) {
      return;
    }
    const values: Record<string, RecordValue> = { status: true };
    for (const field of this.formFields()) {
      values[field.key] = field.kind === 'switch' ? false : null;
    }
    this.editor.set({ row: null, values });
  }

  private openEdit(row: T): void {
    const source = row as unknown as Readonly<Record<string, unknown>>;
    const values: Record<string, RecordValue> = { status: row.status === 'ACTIVO' };
    for (const field of this.formFields()) {
      const value = source[field.key];
      values[field.key] = value === undefined ? null : (value as RecordValue);
    }
    this.editor.set({ row, values });
  }

  protected onSave(values: RecordValues): void {
    const editing = this.editor();
    if (!editing) {
      return;
    }

    const { status, ...rest } = values;
    const patch = { ...rest, status: status ? 'ACTIVO' : 'INACTIVO' } as Partial<T>;
    const store = this.store();
    const definition = this.cardDefinition();

    if (editing.row) {
      const original = editing.row;
      const updated = { ...original, ...patch } as T;
      store.update(updated);
      this.toasts.show(`Se guardaron los cambios de «${definition.title(updated)}»`, {
        actionLabel: 'Deshacer',
        onAction: () => store.update(original)
      });
    } else {
      const created = { ...patch, id: this.newId(values) } as T;
      store.add(created);
      store.setPage(0);
      this.toasts.show(`Se creó «${definition.title(created)}»`, {
        actionLabel: 'Deshacer',
        onAction: () => store.remove(created.id)
      });
    }

    this.editor.set(null);
  }

  /** `prefijo-slug-marca`, mismo formato que la semilla y el diseñador de plazas. */
  private newId(values: RecordValues): string {
    const base = String(values['code'] ?? values['name'] ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
    return `${this.idPrefix()}-${base || 'nuevo'}-${Date.now().toString(36)}`;
  }

  protected onRowAction(event: RowAction<T>): void {
    if (event.action === 'edit' && this.canEdit()) {
      this.openEdit(event.row);
      return;
    }

    if (event.action === 'delete') {
      const store = this.store();
      const row = event.row;
      const index = store.indexOf(row.id);
      store.remove(row.id);
      this.toasts.show(`Se eliminó «${this.cardDefinition().title(row)}»`, {
        actionLabel: 'Deshacer',
        onAction: () => store.restore(row, index)
      });
    }
  }
}
