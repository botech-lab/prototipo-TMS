import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Marca "★ Nuevo": señala a los desarrolladores de Aleta lo que el prototipo
 * agrega y que NO existe en aletadev. `detail` explica qué hace falta (se lee
 * al pasar el mouse y en lectores de pantalla).
 */
@Component({
  selector: 'app-new-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="new-badge" [attr.title]="'No existe en aletadev. ' + detail()" [attr.aria-label]="'Nuevo, no existe en aletadev. ' + detail()">★ Nuevo</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-self: center;
      vertical-align: middle;
    }

    .new-badge {
      display: inline-flex;
      align-items: center;
      padding: 1px 8px;
      border-radius: var(--radius-pill);
      background-color: var(--color-warning-100);
      box-shadow: inset 0 0 0 1px var(--color-warning-600);
      color: var(--color-warning-600);
      font-family: var(--font-family-ui);
      font-size: var(--text-xs);
      font-weight: 800;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
  `
})
export class NewBadgeComponent {
  /** Qué es lo nuevo, en una frase ("Una ruta con varios caminos"). */
  readonly detail = input<string>('');
}
