import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * Anfitrión global de avisos. Se monta una sola vez en la raíz de la app,
 * fuera de cualquier superficie de vidrio (su `position: fixed` depende de ello).
 */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './toast.component.scss',
  template: `
    <div class="toast-host" aria-live="polite" aria-atomic="true">
      @if (toasts.current(); as toast) {
        <div
          class="toast"
          role="status"
          data-testid="toast"
          (mouseenter)="toasts.pause()"
          (mouseleave)="toasts.resume()"
          (focusin)="toasts.pause()"
          (focusout)="toasts.resume()">
          <span class="toast__message">{{ toast.message }}</span>

          @if (toast.actionLabel) {
            <button
              type="button"
              class="toast__action"
              data-testid="toast-action"
              (click)="toasts.runAction()">
              {{ toast.actionLabel }}
            </button>
          }

          <button
            type="button"
            class="toast__close"
            aria-label="Cerrar aviso"
            (click)="toasts.dismiss()">
            <svg class="toast__close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}
