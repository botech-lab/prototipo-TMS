/**
 * Trampa de foco ligera para diálogos y cajones (sin dependencias).
 *
 * Uso típico:
 *   const opener = captureOpener();             // al abrir
 *   focusFirst(panel);                          // tras pintar
 *   (keydown) => trapTab(event, panel);         // mientras está abierto
 *   restoreFocus(opener);                       // al cerrar
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/** Elementos enfocables visibles dentro del contenedor, en orden de tabulación. */
export function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    el => !el.hasAttribute('inert') && el.getClientRects().length > 0
  );
}

/** Lleva el foco al primer elemento enfocable (o al propio contenedor). */
export function focusFirst(container: HTMLElement | null | undefined, preferred?: string): void {
  if (!container) {
    return;
  }
  const target =
    (preferred ? container.querySelector<HTMLElement>(preferred) : null) ?? focusableIn(container)[0] ?? container;
  target.focus();
}

/** Mantiene Tab y Mayús+Tab dentro del contenedor. Devuelve true si actuó. */
export function trapTab(event: KeyboardEvent, container: HTMLElement | null | undefined): boolean {
  if (event.key !== 'Tab' || !container) {
    return false;
  }
  const items = focusableIn(container);
  if (!items.length) {
    event.preventDefault();
    container.focus();
    return true;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement as HTMLElement | null;
  const outside = !active || !container.contains(active);

  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

/** Elemento que tenía el foco al abrir, para devolvérselo al cerrar. */
export function captureOpener(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const active = document.activeElement as HTMLElement | null;
  return active && active !== document.body ? active : null;
}

/** Devuelve el foco al elemento que abrió el diálogo, si sigue en el documento. */
export function restoreFocus(opener: HTMLElement | null | undefined): void {
  if (opener && opener.isConnected) {
    opener.focus();
  }
}
