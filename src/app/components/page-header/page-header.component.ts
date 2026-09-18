import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DATA_TABLE_DIMENSIONS } from '@core';

/** Iconografía disponible para la cabecera de un módulo. */
export type PageHeaderIcon =
  | 'fleet'
  | 'drivers'
  | 'users'
  | 'city'
  | 'map'
  | 'person'
  | 'cargo'
  | 'document'
  | 'incident'
  | 'license'
  | 'percent'
  | 'payment'
  | 'currency'
  | 'route'
  | 'fare'
  | 'seat'
  | 'channel'
  | 'catalog';

/**
 * Cabecera estándar de módulo: icono + título + subtítulo + acción primaria.
 * Respeta `DATA_TABLE_DIMENSIONS.pageHeaderHeight` (72px desde `sm`) para alinear todas las
 * pantallas del sistema a la misma línea base.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './page-header.component.scss',
  template: `
    <header
      data-testid="page-header"
      class="page-header">

      <!-- Identidad del módulo -->
      <div class="page-header__identity">
        <div
          class="page-header__icon"
          aria-hidden="true">
          @switch (icon()) {
            @case ('fleet') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16V6a2 2 0 012-2h12a2 2 0 012 2v10M4 16h16M4 16v2a1 1 0 001 1h1a1 1 0 001-1v-2m10 0v2a1 1 0 001 1h1a1 1 0 001-1v-2M6 8h12M7 12.5h.01M17 12.5h.01" />
              </svg>
            }
            @case ('drivers') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6.5A1.5 1.5 0 014.5 5h15A1.5 1.5 0 0121 6.5v11a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5v-11z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 11.5a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5zm-2.75 4c0-1.24 1.23-2.25 2.75-2.25s2.75 1.01 2.75 2.25M14.5 10h4M14.5 13.5h3" />
              </svg>
            }
            @case ('users') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3l7 3v5.5c0 4.15-2.96 7.72-7 8.5-4.04-.78-7-4.35-7-8.5V6l7-3z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 11.5a1.9 1.9 0 100-3.8 1.9 1.9 0 000 3.8zm-3 4.2c0-1.35 1.34-2.45 3-2.45s3 1.1 3 2.45" />
              </svg>
            }
            @case ('city') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M5 21V7l6-4v18M15 21V11l4-2v12M8 8h.01M8 12h.01M8 16h.01" />
              </svg>
            }
            @case ('map') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4zm0 0v13m6-10.5v13" />
              </svg>
            }
            @case ('person') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 11.5a3 3 0 100-6 3 3 0 000 6zm-7 8.5a7 7 0 0114 0" />
              </svg>
            }
            @case ('cargo') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7.5l-8-4-8 4m16 0L12 11.5m8-4v9l-8 4m0-8.5L4 7.5m8 4V20m-8-4.5v-8" />
              </svg>
            }
            @case ('document') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zm0 0v5h5M9 13h6M9 17h4" />
              </svg>
            }
            @case ('incident') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5L2.8 20h18.4L12 4.5zm0 5.5v5m0 3h.01" />
              </svg>
            }
            @case ('license') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6.5A1.5 1.5 0 014.5 5h15A1.5 1.5 0 0121 6.5v11a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5v-11zM8 11.5a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5zM14 10h4M14 13.5h3" />
              </svg>
            }
            @case ('percent') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 6L6 18M8.5 8.5a2 2 0 100-4 2 2 0 000 4zm7 11a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            }
            @case ('payment') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm0 3h18M6.5 14.5h3" />
              </svg>
            }
            @case ('currency') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm9 7.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6.5 9h.01M17.5 15h.01" />
              </svg>
            }
            @case ('route') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.5 8a2 2 0 100-4 2 2 0 000 4zm11 12a2 2 0 100-4 2 2 0 000 4zM6.5 8v4a4 4 0 004 4h3a4 4 0 014 4" />
              </svg>
            }
            @case ('fare') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 12.5V5a1 1 0 011-1h7.5L21 12.5 12.5 21 4 12.5zM8 8h.01" />
              </svg>
            }
            @case ('seat') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 4h7a2 2 0 012 2v7H9a2 2 0 01-2-2V4zM5 13h13a2 2 0 012 2v5M5 13v7" />
              </svg>
            }
            @case ('channel') {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 9h16l-1 10a2 2 0 01-2 2H7a2 2 0 01-2-2L4 9zm2.5 0L8 4h8l1.5 5M10 13h4" />
              </svg>
            }
            @default {
              <svg class="page-header__glyph" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            }
          }
        </div>

        <div class="page-header__text">
          <h1 data-testid="page-title" class="page-header__title">
            {{ title() }}
          </h1>
          <p data-testid="page-subtitle" class="page-header__subtitle">
            {{ subtitle() }}
          </p>
        </div>
      </div>

      <!-- Acción primaria del módulo -->
      @if (actionLabel(); as label) {
        <button
          type="button"
          data-testid="page-header-action"
          (click)="actionClick.emit()"
          class="page-header__action">
          <svg class="page-header__action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          {{ label }}
        </button>
      }
    </header>
  `
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly icon = input<PageHeaderIcon>('catalog');
  /** Etiqueta del botón primario. Si se omite, el botón no se renderiza. */
  readonly actionLabel = input<string | null>(null);

  readonly actionClick = output<void>();

  /** Alturas congeladas del sistema (ver `DATA_TABLE_DIMENSIONS.pageHeaderHeight`). */
  protected readonly dimensions = DATA_TABLE_DIMENSIONS;
}
