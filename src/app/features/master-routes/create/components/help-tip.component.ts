import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { WizardIconComponent } from './wizard-icon.component';

let nextId = 0;

/**
 * Ayuda a demanda: un botón ⓘ que abre una explicación corta justo debajo.
 * Se abre con clic o teclado (no con hover, para que funcione en el celular).
 *
 * Uso: dentro de un contenedor con `display: flex; flex-wrap: wrap`, al lado
 * del título o etiqueta; la explicación ocupa toda la fila siguiente.
 */
@Component({
  selector: 'app-help-tip',
  imports: [WizardIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'help-tip-host' },
  styleUrl: './help-tip.component.scss',
  template: `
    <button
      type="button"
      class="help-tip__btn"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="id"
      [attr.aria-label]="(open() ? 'Ocultar ayuda: ' : 'Qué es: ') + label()"
      (click)="open.set(!open())">
      <app-wizard-icon name="info" />
    </button>
    @if (open()) {
      <span class="help-tip__text" role="note" [id]="id">{{ text() }}</span>
    }
  `
})
export class HelpTipComponent {
  /** La explicación. */
  readonly text = input.required<string>();
  /** A qué se refiere (para lectores de pantalla), p. ej. "Uso de ruta". */
  readonly label = input.required<string>();

  protected readonly open = signal(false);
  protected readonly id = `help-tip-${++nextId}`;
}
