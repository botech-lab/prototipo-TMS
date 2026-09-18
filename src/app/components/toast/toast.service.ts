import { Injectable, signal } from '@angular/core';

/** Aviso transitorio con acción opcional (por ejemplo, "Deshacer"). */
export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly actionLabel?: string;
  readonly durationMs: number;
}

export interface ToastOptions {
  readonly actionLabel?: string;
  /** Se ejecuta si el usuario pulsa la acción antes de que el aviso expire. */
  readonly onAction?: () => void;
  readonly durationMs?: number;
}

/**
 * ============================================================================
 * AVISOS (TOAST)
 * ============================================================================
 * Un solo aviso visible a la vez: uno nuevo reemplaza al anterior. El tiempo
 * se pausa mientras el puntero o el foco están sobre el aviso, para que nadie
 * pierda el "Deshacer" mientras lo alcanza.
 * ============================================================================
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private onAction: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private remainingMs = 0;
  private startedAt = 0;

  readonly current = signal<Toast | null>(null);

  show(message: string, options: ToastOptions = {}): void {
    this.clearTimer();
    const toast: Toast = {
      id: this.nextId++,
      message,
      actionLabel: options.actionLabel,
      durationMs: options.durationMs ?? 5000
    };
    this.onAction = options.onAction ?? null;
    this.current.set(toast);
    this.remainingMs = toast.durationMs;
    this.startTimer();
  }

  /** Ejecuta la acción del aviso activo y lo cierra. */
  runAction(): void {
    const action = this.onAction;
    this.dismiss();
    action?.();
  }

  dismiss(): void {
    this.clearTimer();
    this.onAction = null;
    this.current.set(null);
  }

  pause(): void {
    if (!this.timer) {
      return;
    }
    this.remainingMs -= Date.now() - this.startedAt;
    this.clearTimer();
  }

  resume(): void {
    if (this.timer || !this.current()) {
      return;
    }
    this.startTimer();
  }

  private startTimer(): void {
    this.startedAt = Date.now();
    this.timer = setTimeout(() => this.dismiss(), Math.max(this.remainingMs, 1000));
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
