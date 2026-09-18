import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * ============================================================================
 * ÍCONOS DE LÍNEA DEL DISEÑADOR DE PLAZAS
 * ============================================================================
 * Mismo lenguaje que `nav-icon` del shell (24x24, trazo 1.8, extremos
 * redondeados). Acepta una clave de ícono o, por compatibilidad, el emoji que
 * todavía declaran `SEAT_LAYOUT_RULES` y los motores (tipos de butaca,
 * instalaciones, rasgos, comodidades): el emoji se traduce aquí, en la capa
 * de presentación, y nunca llega a pintarse.
 * ============================================================================
 */
export type DesignerIconName =
  | 'seat' | 'seat-recline' | 'bed' | 'crown' | 'walk' | 'crew' | 'square'
  | 'wheel' | 'door' | 'restroom' | 'stairs' | 'cup'
  | 'usb' | 'screen' | 'wifi' | 'bolt' | 'tray'
  | 'window' | 'aisle' | 'wall' | 'panorama' | 'legroom'
  | 'eye' | 'sparkles' | 'template' | 'expand' | 'panel-right' | 'panel-left'
  | 'swap' | 'ticket' | 'thermo' | 'pin' | 'duplicate' | 'mirror' | 'trash'
  | 'close' | 'send' | 'grid' | 'check' | 'id-card' | 'monitor' | 'phone'
  | 'pointer' | 'snake' | 'brush' | 'hand' | 'eraser' | 'arrow-up' | 'arrow-down' | 'insert';

/** Traducción de los emojis heredados de las reglas y motores a claves de ícono. */
const EMOJI_TO_ICON: Readonly<Record<string, DesignerIconName>> = {
  '💺': 'seat', '🛋️': 'seat-recline', '🛋': 'seat-recline', '🛏️': 'bed', '🛏': 'bed', '🛌': 'bed',
  '👑': 'crown', '🚶': 'walk', '🧑‍✈️': 'crew', '▪': 'square',
  '🛞': 'wheel', '🚪': 'door', '🚻': 'restroom', '🪜': 'stairs', '☕': 'cup',
  '🔌': 'usb', '📺': 'screen', '📶': 'wifi', '⚡': 'bolt', '🍽️': 'tray', '🍽': 'tray',
  '🪟': 'window', '🚹': 'aisle', '🧱': 'wall', '🌄': 'panorama', '🦵': 'legroom',
  '🎫': 'ticket', '🌡️': 'thermo', '🌡': 'thermo', '📌': 'pin', '🪪': 'id-card', '🖥️': 'monitor', '📱': 'phone'
};

const PATHS: Readonly<Record<DesignerIconName, string>> = {
  seat: 'M7 4h7a2 2 0 012 2v7H7zM5 13h14v3H5zM7 16v4m10-4v4',
  'seat-recline': 'M6 5l3 8h8a2 2 0 012 2v1H7l-3-9M8 16v4m9-4v4',
  bed: 'M3 18V7m0 7h18v4M3 11h4a2 2 0 012 2v1m2-4h8a2 2 0 012 2v2',
  crown: 'M4 17l-1-9 5 4 4-6 4 6 5-4-1 9zM4 20h16',
  walk: 'M13 4.5a1.5 1.5 0 100 .01M10 21l2-6 3 3v3m-5-12l-3 4m3-4l3 1 2 3m-5-4l-1 6',
  crew: 'M12 11a3 3 0 100-6 3 3 0 000 6zM6 20a6 6 0 0112 0M8 5.5h8',
  square: 'M8 8h8v8H8z',
  wheel: 'M12 21a9 9 0 100-18 9 9 0 000 18zm0-6a3 3 0 100-6 3 3 0 000 6zm0-6V3m2.6 7.5l5.2-3M9.4 10.5l-5.2-3M12 15v6',
  door: 'M6 21V4a1 1 0 011-1h10a1 1 0 011 1v17M4 21h16M14 12h.01',
  restroom: 'M7 6.5a1.5 1.5 0 100 .01M17 6.5a1.5 1.5 0 100 .01M12 3v18M5 10h4l-.5 5H8v5M19 10h-4l-1 6h1.5v4',
  stairs: 'M4 20h4v-4h4v-4h4V8h4M4 20V4',
  cup: 'M5 8h11v6a4 4 0 01-4 4H9a4 4 0 01-4-4zM16 10h2a2 2 0 010 4h-2M8 3v2m4-2v2',
  usb: 'M12 3v14M9 6l3-3 3 3M8 11l4 3 4-3M12 17a2 2 0 100 4 2 2 0 000-4z',
  screen: 'M3 5h18v11H3zM9 20h6M12 16v4',
  wifi: 'M5 12.5a10 10 0 0114 0M8 15.5a6 6 0 018 0M12 19h.01M2 9a14 14 0 0120 0',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  tray: 'M4 14h16M6 14a6 6 0 0112 0M12 6v2M3 18h18',
  window: 'M5 4h14v16H5zM12 4v16M5 12h14',
  aisle: 'M9 3v18m6-18v18M12 6v2m0 4v2m0 4v2',
  wall: 'M3 5h18v14H3zM3 9.5h18M3 14h18M9 5v4.5m6 0V14m-6 0v5',
  panorama: 'M3 6h18v12H3zM3 16l5-5 4 4 3-3 6 6M16 9h.01',
  legroom: 'M7 3v8l4 4v6m6-6l-2 6M11 15h6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  template: 'M4 20V4l16 16zM8 16h4l-4-4z',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  'panel-right': 'M4 5h16v14H4zM14 5v14',
  'panel-left': 'M4 5h16v14H4zM10 5v14',
  swap: 'M7 7h13l-4-4M17 17H4l4 4',
  ticket: 'M4 7h16v3a2 2 0 000 4v3H4v-3a2 2 0 000-4zM14 7v10',
  thermo: 'M10 13.5V5a2 2 0 014 0v8.5a4 4 0 11-4 0zM12 9v6',
  pin: 'M9 3h6l-1 6 3 3H7l3-3zM12 12v9',
  duplicate: 'M8 8h11v11H8zM5 16V5h11',
  mirror: 'M12 3v18M9 7L4 17h5zM15 7l5 10h-5z',
  trash: 'M5 7h14M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  close: 'M6 6l12 12M18 6L6 18',
  send: 'M12 19V5M6 11l6-6 6 6',
  grid: 'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16',
  check: 'M5 12.5l4.5 4.5L19 7',
  'id-card': 'M3 6h18v12H3zM8.5 12.5a2 2 0 100-4 2 2 0 000 4zM5.5 16a3 3 0 016 0M14 10h4m-4 3h4',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  phone: 'M7 3h10v18H7zM11 18h2',
  pointer: 'M5 3l6 16 2.5-6.5L20 10z',
  snake: 'M4 7h12a3 3 0 010 6H8a3 3 0 000 6h12',
  brush: 'M14 4l6 6-8 8H6v-6zM6 18l-2 2',
  hand: 'M8 13V6a1.5 1.5 0 013 0v5m0-6a1.5 1.5 0 013 0v6m0-5a1.5 1.5 0 013 0v7a7 7 0 01-7 7h-1a5 5 0 01-4-2l-3-4a1.5 1.5 0 012.3-2L8 14',
  eraser: 'M9 20h11M4 15l9-9 6 6-8 8H8z',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14M6 13l6 6 6-6',
  insert: 'M5 5v6a4 4 0 004 4h10M15 11l4 4-4 4'
};

@Component({
  selector: 'app-designer-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'designer-icon' },
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      width: var(--designer-icon-size, 1em);
      height: var(--designer-icon-size, 1em);
      vertical-align: -0.125em;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `,
  template: `
    @if (path(); as d) {
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round" focusable="false">
        <path [attr.d]="d" />
      </svg>
    }
  `
})
export class DesignerIconComponent {
  /** Clave de ícono o emoji heredado de las reglas. */
  readonly name = input<string | null | undefined>('');

  protected readonly path = computed<string | null>(() => {
    const raw = (this.name() ?? '').trim();
    const key = (EMOJI_TO_ICON[raw] ?? raw) as DesignerIconName;
    return PATHS[key] ?? null;
  });
}
