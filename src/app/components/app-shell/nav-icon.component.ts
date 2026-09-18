import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Iconos de navegación del shell: un solo trazo (viewBox 24, stroke 1.8,
 * extremos y uniones redondeadas, currentColor). El tamaño lo fija el
 * contenedor con `--nav-icon-size` (1.25rem por defecto).
 */
export type NavIconName =
  | 'operation'
  | 'route'
  | 'calendar-check'
  | 'admin'
  | 'users'
  | 'bus'
  | 'id-card'
  | 'catalog'
  | 'city'
  | 'map'
  | 'person'
  | 'box'
  | 'bus-front'
  | 'doc'
  | 'alert'
  | 'license'
  | 'percent'
  | 'card'
  | 'coins'
  | 'signpost'
  | 'tag'
  | 'seat'
  | 'cart'
  | 'ticket'
  | 'chart'
  | 'chevron';

@Component({
  selector: 'app-nav-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'nav-icon' },
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      width: var(--nav-icon-size, 1.25rem);
      height: var(--nav-icon-size, 1.25rem);
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `,
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" focusable="false">
      @switch (name()) {
        @case ('operation') {
          <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
          <path d="M8 2.5v4M16 2.5v4M3 10h18M8 14h2M14 14h2M8 17.5h2" />
        }
        @case ('route') {
          <circle cx="6" cy="19" r="2.5" />
          <circle cx="18" cy="5" r="2.5" />
          <path d="M8.5 19h8a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7h8" />
        }
        @case ('calendar-check') {
          <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
          <path d="M8 2.5v4M16 2.5v4M3 10h18M9 15.5l2 2 4-4" />
        }
        @case ('admin') {
          <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4" />
        }
        @case ('users') {
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20.5v-1a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.7a5 5 0 0 1 3 4.8v1" />
        }
        @case ('bus') {
          <path d="M4 17V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
          <path d="M4 12h16M9 4v8M15 4v8M7 18v2M17 18v2" />
          <path d="M7.5 15h.01M16.5 15h.01" />
        }
        @case ('id-card') {
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <circle cx="8.5" cy="11" r="2" />
          <path d="M5.5 16a3 3 0 0 1 6 0M14.5 10h4M14.5 14h3" />
        }
        @case ('catalog') {
          <path d="M4.5 19V5.5A2.5 2.5 0 0 1 7 3h12.5v14H7a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 7 22h12.5v-5" />
          <path d="M9 7.5h6M9 11h4" />
        }
        @case ('city') {
          <path d="M3 21h18M5 21V10l5-3v14M10 21V4.5L19 8v13" />
          <path d="M13.5 10.5h2M13.5 14h2M13.5 17.5h2M7.5 13.5h.01M7.5 17h.01" />
        }
        @case ('map') {
          <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z" />
          <path d="M9 4v13.5M15 6.5V20" />
        }
        @case ('person') {
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        }
        @case ('box') {
          <path d="M21 7.5 12 3 3 7.5v9l9 4.5 9-4.5z" />
          <path d="M3 7.5l9 4.5 9-4.5M12 12v9M7.5 5.3l9 4.5" />
        }
        @case ('bus-front') {
          <rect x="4.5" y="3" width="15" height="15" rx="3" />
          <path d="M4.5 11h15M8.5 6.5h7M8 14.5h.01M16 14.5h.01M7.5 18v2.5M16.5 18v2.5" />
        }
        @case ('doc') {
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        }
        @case ('alert') {
          <path d="M10.3 4 2.4 17.8A2 2 0 0 0 4.1 21h15.8a2 2 0 0 0 1.7-3.2L13.7 4a2 2 0 0 0-3.4 0z" />
          <path d="M12 9.5v4M12 17h.01" />
        }
        @case ('license') {
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <path d="M7 9h10M7 13h5M14 15.5l1.5 1.5 3-3" />
        }
        @case ('percent') {
          <path d="M19 5 5 19" />
          <circle cx="7" cy="7" r="2.5" />
          <circle cx="17" cy="17" r="2.5" />
        }
        @case ('card') {
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M2.5 10h19M6.5 15h4" />
        }
        @case ('coins') {
          <circle cx="9" cy="9" r="6" />
          <path d="M17.6 10.6a6 6 0 1 1-7 7M9 6.5v5M15.5 14.5h.01" />
        }
        @case ('signpost') {
          <path d="M12 3v2M12 13v8M9 21h6M5 5h11.5l3 3-3 3H5z" />
        }
        @case ('tag') {
          <path d="M3 4.5V11a2 2 0 0 0 .6 1.4l8 8a2 2 0 0 0 2.8 0l6-6a2 2 0 0 0 0-2.8l-8-8A2 2 0 0 0 11 3H4.5A1.5 1.5 0 0 0 3 4.5z" />
          <circle cx="8" cy="8" r="1.25" />
        }
        @case ('seat') {
          <path d="M6.5 11V5.5A2.5 2.5 0 0 1 9 3h6a2.5 2.5 0 0 1 2.5 2.5V11" />
          <path d="M4 12.5a1.5 1.5 0 0 1 3 0V14h10v-1.5a1.5 1.5 0 0 1 3 0V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
          <path d="M6.5 18v2.5M17.5 18v2.5" />
        }
        @case ('cart') {
          <circle cx="9" cy="20" r="1.25" />
          <circle cx="18" cy="20" r="1.25" />
          <path d="M2.5 3h2.5l2.4 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.5L21.5 7H6" />
        }
        @case ('ticket') {
          <path d="M3 8.5V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a3.5 3.5 0 0 0 0 7V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a3.5 3.5 0 0 0 0-7z" />
          <path d="M15 5v2M15 11v2M15 17v2" />
        }
        @case ('chart') {
          <path d="M3 3v16a2 2 0 0 0 2 2h16" />
          <path d="M8 17v-5M13 17V8M18 17v-7" />
        }
        @case ('chevron') {
          <path d="m9 6 6 6-6 6" />
        }
      }
    </svg>
  `
})
export class NavIconComponent {
  readonly name = input.required<NavIconName>();
}
