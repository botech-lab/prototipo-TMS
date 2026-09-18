import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { USER_PRIVILEGE_RULES } from '@core';
import { DataTableComponent } from '@components/data-table/data-table.component';
import { EntityCardGridComponent } from '@components/entity-card-grid/entity-card-grid.component';
import { PageHeaderComponent } from '@components/page-header/page-header.component';
import { SearchFieldComponent } from '@components/search-field/search-field.component';
import { ViewSwitcherComponent } from '@components/view-switcher/view-switcher.component';
import { responsiveViewMode } from '@components/view-switcher/responsive-view-mode';
import { RecordDrawerComponent } from '@components/record-drawer/record-drawer.component';
import { ToastService } from '@components/toast/toast.service';
import { CardBlock, CardDefinition, RecordField, RecordValue, RecordValues, RowAction, TableColumn } from '@models';
import { SystemUser, UserRole, UserStatus } from '../../models/user.model';
import { UserPrivilegeEngine } from '../../services/user-privilege-engine';
import { UsersService } from '../../services/users.service';

/**
 * ============================================================================
 * MÓDULO DE GESTIÓN DE USUARIOS (SMART CONTAINER)
 * ============================================================================
 * Control de accesos, roles y seguridad. Los roles se proyectan como celda
 * `tags`, que ya resuelve por sí sola el caso de cuenta sin permisos.
 * ============================================================================
 */
@Component({
  selector: 'app-users-page',
  imports: [
    PageHeaderComponent,
    SearchFieldComponent,
    ViewSwitcherComponent,
    DataTableComponent,
    EntityCardGridComponent,
    RecordDrawerComponent
  ],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersPageComponent {
  protected readonly usersService = inject(UsersService);
  private readonly toasts = inject(ToastService);

  // ==========================================
  // ALTA / EDICIÓN (drawer compartido)
  // ==========================================
  /** Universo de roles, en el orden de peso del motor de privilegios. */
  private readonly systemRoles = USER_PRIVILEGE_RULES.SYSTEM_ROLES as readonly UserRole[];

  /** Clave de formulario del switch de cada rol. */
  private roleKey(role: UserRole): string {
    return `role_${role}`;
  }

  /**
   * Datos de la cuenta + un switch por rol (la selección múltiple de roles).
   * El nivel de privilegio lo sigue derivando `UserPrivilegeEngine`.
   */
  protected readonly formFields: readonly RecordField[] = [
    {
      key: 'username', label: 'Usuario', kind: 'text', required: true, half: true, placeholder: 'operador',
      pattern: '^@?[a-zA-Z0-9._-]+$', patternMessage: 'Solo letras, números, punto, guion y guion bajo'
    },
    {
      key: 'status', label: 'Acceso', kind: 'select', required: true, half: true,
      options: [
        { value: 'OPERATIVO', label: 'Operativo' },
        { value: 'BLOQUEADO', label: 'Bloqueado' }
      ]
    },
    { key: 'fullName', label: 'Nombre completo', kind: 'text', required: true, placeholder: 'María Supervisora' },
    {
      key: 'email', label: 'Email', kind: 'text', required: true, placeholder: 'nombre@empresa.com',
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', patternMessage: 'Ingresa un email válido'
    },
    ...this.systemRoles.map(role => ({ key: this.roleKey(role), label: `Rol ${role}`, kind: 'switch' as const, onLabel: 'Concedido', offLabel: 'Sin rol' }))
  ];

  /** Cuenta en edición (`row`) o alta (`row: null`), con sus valores iniciales. */
  protected readonly editor = signal<{ readonly row: SystemUser | null; readonly values: RecordValues } | null>(null);

  private openEditor(row: SystemUser | null): void {
    const values: Record<string, RecordValue> = row
      ? { username: row.username, status: row.status, fullName: row.fullName, email: row.email }
      : { status: 'OPERATIVO' };
    for (const role of this.systemRoles) {
      values[this.roleKey(role)] = !!row?.roles.includes(role);
    }
    this.editor.set({ row, values });
  }

  protected onSave(values: RecordValues): void {
    const editing = this.editor();
    if (!editing) return;

    const data = {
      username: String(values['username']).replace(/^@/, ''),
      fullName: String(values['fullName']),
      email: String(values['email']),
      status: values['status'] as UserStatus,
      roles: this.systemRoles.filter(role => values[this.roleKey(role)] === true)
    };

    if (editing.row) {
      const original = editing.row;
      const updated: SystemUser = { ...original, ...data };
      this.usersService.update(updated);
      this.toasts.show(`Se guardaron los cambios de @${updated.username}`, {
        actionLabel: 'Deshacer',
        onAction: () => this.usersService.update(original)
      });
    } else {
      // Mismo formato que la semilla: `usr-<usuario>`, con marca de tiempo para no chocar.
      const created: SystemUser = { id: `usr-${data.username.toLowerCase()}-${Date.now().toString(36)}`, ...data };
      this.usersService.add(created);
      this.toasts.show(`Se creó la cuenta @${created.username}`, {
        actionLabel: 'Deshacer',
        onAction: () => this.usersService.remove(created.id)
      });
    }
    this.editor.set(null);
  }

  /** Modo de visualización activo. Estado puramente presentacional. */
  protected readonly viewMode = responsiveViewMode();

  protected readonly columns: readonly TableColumn<SystemUser>[] = [
    {
      key: 'username',
      label: 'Usuario',
      width: '170px',
      cell: user => ({ kind: 'strong', value: `@${user.username}` })
    },
    {
      key: 'fullName',
      label: 'Nombre completo',
      width: '210px',
      cell: user => ({ kind: 'text', value: user.fullName })
    },
    {
      key: 'email',
      label: 'Email',
      showFrom: 'md',
      cell: user => ({ kind: 'text', value: user.email })
    },
    {
      key: 'roles',
      label: 'Roles',
      width: '280px',
      showFrom: 'sm',
      cell: user => ({ kind: 'tags', items: user.roles })
    },
    {
      key: 'status',
      label: 'Estado',
      width: '150px',
      cell: user => ({
        kind: 'chip',
        value: user.status,
        tone: user.status === 'OPERATIVO' ? 'success' : 'danger'
      })
    }
  ];

  /**
   * Proyección a las 7 ranuras de la tarjeta de entidad.
   * El identificador `@usuario` ocupa el badge; el correo, al ser largo y de
   * lectura secundaria, baja al subtítulo y al bloque de detalle.
   */
  protected readonly cardDefinition: CardDefinition<SystemUser> = {
    badge: user => `@${user.username}`,
    status: user => ({
      kind: 'chip',
      value: user.status,
      tone: user.status === 'OPERATIVO' ? 'success' : 'danger'
    }),
    title: user => user.fullName,
    subtitle: user => user.email,
    isEnabled: user => user.status === 'OPERATIVO',
    // La ranura 5 la ocupa la matriz de privilegio: 4 filas equivalentes.
    bodyRows: 4,
    body: user => this.privilegeBlocks(user),
    details: [
      { label: 'Usuario', cell: user => ({ kind: 'text', value: `@${user.username}` }) },
      { label: 'Email', cell: user => ({ kind: 'text', value: user.email }) },
      { label: 'Roles', cell: user => ({ kind: 'tags', items: user.roles }) }
    ],
    // La métrica del pie sale del motor: nivel de privilegio real, no un conteo.
    metric: user => ({
      icon: 'admin',
      value: `Privilegio ${UserPrivilegeEngine.calculate(user).levelLabel}`
    })
  };

  /**
   * Cuerpo de la tarjeta: el nivel de privilegio como ancla, la matriz
   * completa de roles del sistema -concedidos encendidos, ausentes en
   * fantasma- y la cobertura al pie.
   */
  private privilegeBlocks(user: SystemUser): readonly CardBlock[] {
    const privilege = UserPrivilegeEngine.calculate(user);

    return [
      {
        kind: 'stat',
        value: privilege.levelLabel,
        caption: 'NIVEL DE PRIVILEGIO',
        tone: privilege.tone
      },
      {
        kind: 'matrix',
        variant: 'tile',
        columns: 4,
        tone: privilege.tone,
        cells: privilege.cells.map(cell => ({
          state: cell.assigned ? 'on' : 'off',
          label: cell.label,
          title: `${cell.label} · peso ${cell.weight}`
        }))
      },
      {
        kind: 'meter',
        ratio: privilege.coverageRatio,
        caption: privilege.summary,
        endCaption: `${privilege.assignedCount}/${privilege.totalSystemRoles}`,
        tone: privilege.tone
      }
    ];
  }

  protected onToggleStatus(id: string): void {
    this.usersService.toggleStatus(id);
  }

  protected onRowAction(event: RowAction<SystemUser>): void {
    if (event.action === 'edit') {
      this.openEditor(event.row);
    } else if (event.action === 'delete') {
      const user = event.row;
      const index = this.usersService.indexOf(user.id);
      this.usersService.remove(user.id);
      this.toasts.show(`Se eliminó la cuenta @${user.username}`, {
        actionLabel: 'Deshacer',
        onAction: () => this.usersService.restore(user, index)
      });
    }
  }

  protected onNewUser(): void {
    this.openEditor(null);
  }
}
