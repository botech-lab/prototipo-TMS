import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { ViewMode } from '@models';

/**
 * Conmutador Tabla / Tarjetas.
 * Segmented control compacto, pensado para vivir en la toolbar de cualquier módulo.
 */
@Component({
  selector: 'app-view-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './view-switcher.component.scss',
  template: `
    <div
      role="group"
      data-testid="view-switcher"
      aria-label="Modo de visualización"
      class="view-switcher">

      <button
        type="button"
        data-testid="view-switcher-table"
        (click)="mode.set('table')"
        aria-label="Ver como tabla"
        [attr.aria-pressed]="mode() === 'table'"
        class="view-switcher__option"
        [class.view-switcher__option--active]="mode() === 'table'"
        title="Ver como tabla">
        <svg class="view-switcher__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span class="view-switcher__label">Tabla</span>
      </button>

      <button
        type="button"
        data-testid="view-switcher-cards"
        (click)="mode.set('cards')"
        aria-label="Ver como tarjetas"
        [attr.aria-pressed]="mode() === 'cards'"
        class="view-switcher__option"
        [class.view-switcher__option--active]="mode() === 'cards'"
        title="Ver como tarjetas">
        <svg class="view-switcher__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 5.5A1.5 1.5 0 015.5 4h4A1.5 1.5 0 0111 5.5v4A1.5 1.5 0 019.5 11h-4A1.5 1.5 0 014 9.5v-4zm9 0A1.5 1.5 0 0114.5 4h4A1.5 1.5 0 0120 5.5v4a1.5 1.5 0 01-1.5 1.5h-4A1.5 1.5 0 0113 9.5v-4zm-9 9A1.5 1.5 0 015.5 13h4a1.5 1.5 0 011.5 1.5v4A1.5 1.5 0 019.5 20h-4A1.5 1.5 0 014 18.5v-4zm9 0a1.5 1.5 0 011.5-1.5h4a1.5 1.5 0 011.5 1.5v4a1.5 1.5 0 01-1.5 1.5h-4a1.5 1.5 0 01-1.5-1.5v-4z" />
        </svg>
        <span class="view-switcher__label">Tarjetas</span>
      </button>
    </div>
  `
})
export class ViewSwitcherComponent {
  readonly mode = model<ViewMode>('table');
}
