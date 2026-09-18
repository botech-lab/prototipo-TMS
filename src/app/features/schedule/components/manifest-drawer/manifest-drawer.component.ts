import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  HostListener,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  output
} from '@angular/core';
import { DayDepartureSlot } from '../../models/schedule.model';
import { mockManifest, ManifestPassenger } from '../../data/manifest.mock';

/**
 * Drawer lateral del manifiesto de una salida (mismo patrón que el drawer de
 * edición): diálogo modal, foco al abrir, trampa de foco, Escape y clic fuera
 * cierran, y el foco vuelve a quien lo abrió.
 */
@Component({
  selector: 'app-manifest-drawer',
  styleUrl: './manifest-drawer.component.scss',
  template: `
    <div class="manifest-drawer" role="dialog" aria-modal="true" aria-labelledby="mf-title">
      <div class="manifest-drawer__backdrop" (click)="closed.emit()"></div>

      <div class="manifest-drawer__panel-wrap">
        <div class="manifest-drawer__panel">
          <div class="manifest-drawer__header">
            <div class="manifest-drawer__heading">
              <span class="manifest-drawer__eyebrow">Manifiesto de despacho</span>
              <h2 id="mf-title" tabindex="-1" class="manifest-drawer__title">
                Salida {{ slot().dayBadge ?? slot().dayLabel }}
              </h2>
              <p class="manifest-drawer__sub">
                <span class="manifest-drawer__figure">{{ time(slot().departureTime) }}</span>
                <span class="manifest-drawer__arrow" aria-label="a"> → </span>
                <span class="manifest-drawer__figure">{{ time(slot().arrivalTime) }}</span>
                · {{ slot().assignedVehicle }}
              </p>
              <p class="manifest-drawer__meta">
                <span class="manifest-drawer__code">{{ slot().serviceCode }}</span>
                · Conductor: {{ slot().driverName || 'Sin asignar' }}
              </p>
            </div>
            <button type="button" class="manifest-drawer__close" aria-label="Cerrar manifiesto" (click)="closed.emit()">✕</button>
          </div>

          <div class="manifest-drawer__body">
            <p class="manifest-drawer__count">
              <strong>{{ slot().occupancyCurrent }} de {{ slot().occupancyTotal }}</strong> pasajes vendidos
              <span class="manifest-drawer__sample">(datos de ejemplo)</span>
            </p>

            @if (passengers().length > 0) {
              <ul class="manifest-drawer__list" aria-label="Pasajeros">
                @for (p of passengers(); track p.seat) {
                  <li class="manifest-drawer__pax">
                    <span class="manifest-drawer__seat" [attr.aria-label]="'Asiento ' + p.seat">{{ p.seat }}</span>
                    <span class="manifest-drawer__name">{{ p.name }}</span>
                    <span class="manifest-drawer__ci">CI {{ p.ci }}</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="manifest-drawer__empty">Aún no hay pasajes vendidos para esta salida.</p>
            }
          </div>

          <div class="manifest-drawer__footer">
            <button type="button" class="manifest-drawer__secondary" (click)="closed.emit()">Cerrar</button>
            <button type="button" class="manifest-drawer__primary" (click)="closed.emit()">Imprimir manifiesto</button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManifestDrawerComponent {
  readonly slot = input.required<DayDepartureSlot>();
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  private static readonly FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  readonly passengers = computed<ManifestPassenger[]>(() => {
    const s = this.slot();
    return mockManifest(s.id, s.occupancyCurrent, s.occupancyTotal);
  });

  constructor() {
    afterNextRender(() => {
      this.host.nativeElement.querySelector<HTMLElement>('#mf-title')?.focus();
    });
    inject(DestroyRef).onDestroy(() => {
      const opener = this.opener;
      if (opener && opener.isConnected) setTimeout(() => opener.focus());
    });
  }

  /** Hora sin el sufijo "Hrs". */
  time(value?: string): string {
    return (value ?? '').replace(/\s*hrs?\.?\s*$/i, '').trim();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    event.stopPropagation();
    this.closed.emit();
  }

  /** Trampa de foco: Tab y Shift+Tab circulan dentro del drawer. */
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const panel = this.host.nativeElement.querySelector<HTMLElement>('.manifest-drawer__panel');
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(ManifestDrawerComponent.FOCUSABLE))
      .filter(el => el.getClientRects().length > 0);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = !!active && items.includes(active);
    if (event.shiftKey && (!inside || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (inside ? active === last : !!active && !panel.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }
}
