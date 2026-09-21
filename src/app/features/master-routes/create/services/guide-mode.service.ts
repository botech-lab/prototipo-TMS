import { Injectable, signal } from '@angular/core';

const KEY = 'tms.guide-mode';

/**
 * ============================================================================
 * MODO GUÍA  ★ NUEVO (no existe en aletadev)
 * ============================================================================
 * Encendido (por defecto): la pantalla explica qué hace cada cosa.
 * Apagado: se van los párrafos y los recuadros, y queda el formulario pelado
 * para quien ya lo sabe de memoria.
 *
 * Dos reglas que lo hacen seguro:
 *   - El botón ⓘ NUNCA se esconde: la explicación sigue a un clic.
 *   - Los avisos y errores TAMPOCO: "faltan los kilómetros" no es guía, es
 *     información de trabajo.
 *
 * Hoy se recuerda en este navegador. Al integrar conviene guardarlo por
 * USUARIO (en la terminal la máquina es compartida y el turno siguiente
 * heredaría la pantalla muda).
 * ============================================================================
 */
@Injectable({ providedIn: 'root' })
export class GuideModeService {
  private readonly state = signal<boolean>(read());

  readonly on = this.state.asReadonly();

  toggle(): void {
    this.set(!this.state());
  }

  set(on: boolean): void {
    this.state.set(on);
    try {
      localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      // Sin almacenamiento: la preferencia dura solo esta sesión.
    }
  }
}

/** Encendido salvo que la persona lo haya apagado antes. */
function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}
