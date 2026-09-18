import { DestroyRef, WritableSignal, inject, linkedSignal, signal } from '@angular/core';
import { ViewMode } from '@models';

/**
 * Por debajo de este ancho (el breakpoint `sm` de `_mixins.scss`) una tabla
 * no cabe entera: estado y acciones quedarían fuera de pantalla. Ahí la vista
 * por defecto es la de tarjetas.
 */
export const CARD_VIEW_MAX_WIDTH = 639.98;

/**
 * Modo de vista que nace del viewport y sigue siendo escribible.
 *
 * - Móvil (< 640px): arranca en `cards`; tablet y PC: en `table`.
 * - El usuario puede cambiarlo con el `ViewSwitcherComponent` (`[(mode)]`).
 * - Si el viewport cruza el breakpoint (rotar la tablet, redimensionar), el
 *   modo vuelve al valor por defecto de ese tamaño.
 *
 * Debe llamarse en contexto de inyección (inicializador de campo).
 */
export function responsiveViewMode(): WritableSignal<ViewMode> {
  const narrow = signal<boolean>(false);

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const query = window.matchMedia(`(max-width: ${CARD_VIEW_MAX_WIDTH}px)`);
    narrow.set(query.matches);

    const onChange = (event: MediaQueryListEvent) => narrow.set(event.matches);
    query.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
  }

  return linkedSignal<ViewMode>(() => (narrow() ? 'cards' : 'table'));
}
