import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CHIP_TONE_CLASSES } from '@core';
import { ChipTone } from '@models';

/**
 * Chip de estado semántico (ACTIVO, INACTIVO, OPERATIVO, BLOQUEADO...).
 * Componente presentacional puro: no conoce el dominio, solo el tono.
 */
@Component({
  selector: 'app-status-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './status-chip.component.scss',
  template: `
    <span
      data-testid="status-chip"
      class="status-chip"
      [class]="toneClasses()">
      <span class="status-chip__dot"></span>
      {{ label() }}
    </span>
  `
})
export class StatusChipComponent {
  readonly label = input.required<string>();
  readonly tone = input<ChipTone>('neutral');

  /** Traduce el tono semántico a su modificador BEM (`status-chip--<tono>`). */
  readonly toneClasses = computed<string>(() => CHIP_TONE_CLASSES[this.tone()]);
}
