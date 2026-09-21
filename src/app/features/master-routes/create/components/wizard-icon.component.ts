import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type WizardIconName =
  | 'check'
  | 'alert'
  | 'arrow-left'
  | 'arrow-right'
  | 'info'
  | 'plus'
  | 'trash'
  | 'up'
  | 'down'
  | 'swap'
  | 'clock'
  | 'save'
  | 'inherit'
  | 'chevron'
  | 'pin'
  | 'return'
  | 'pencil';

/** Íconos de línea del asistente (trazo 1.8, mismo set que el menú). Decorativos: aria-hidden. */
@Component({
  selector: 'app-wizard-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex' },
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%">
      @switch (name()) {
        @case ('check') { <path d="M5 12.5l4.5 4.5L19 7.5" /> }
        @case ('alert') { <path d="M12 8v5m0 3.2v.3M10.3 3.9L2.6 17.3A2 2 0 004.3 20h15.4a2 2 0 001.7-2.7L13.7 3.9a2 2 0 00-3.4 0z" /> }
        @case ('arrow-left') { <path d="M19 12H5m6-6l-6 6 6 6" /> }
        @case ('arrow-right') { <path d="M5 12h14m-6-6l6 6-6 6" /> }
        @case ('info') { <circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8.2v.2" /> }
        @case ('plus') { <path d="M12 5v14M5 12h14" /> }
        @case ('trash') { <path d="M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" /> }
        @case ('up') { <path d="M6 15l6-6 6 6" /> }
        @case ('down') { <path d="M6 9l6 6 6-6" /> }
        @case ('chevron') { <path d="M9 6l6 6-6 6" /> }
        @case ('swap') { <path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4m4 4H7" /> }
        @case ('clock') { <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /> }
        @case ('save') { <path d="M5 4h11l3 3v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /> }
        @case ('inherit') { <circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="18" r="2.2" /><circle cx="18" cy="8" r="2.2" /><path d="M6 8.2v5.3a4.5 4.5 0 004.5 4.5h5.3M8.2 6h7.6" /> }
        @case ('pin') { <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /> }
        @case ('pencil') { <path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17v3z" /><path d="M15 6l3 3" /> }
        @case ('return') { <path d="M9 14l-5-5 5-5" /><path d="M4 9h10.5a5.5 5.5 0 010 11H11" /> }
      }
    </svg>
  `
})
export class WizardIconComponent {
  readonly name = input.required<WizardIconName>();
}
