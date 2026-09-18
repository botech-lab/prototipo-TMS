import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  ElementRef,
  HostListener,
  DestroyRef,
  afterNextRender
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ScheduleService } from '../../services/schedule.service';
import { ToastService } from '../../../../components/toast/toast.service';
import {
  ScheduledCommercialService,
  WeekDay,
  ServiceShift
} from '../../models/schedule.model';

@Component({
  selector: 'app-edit-service-drawer',
  imports: [ReactiveFormsModule],
  styleUrl: './edit-service-drawer.component.scss',
  template: `
    <div
      class="edit-service-drawer"
      aria-labelledby="slide-over-title"
      role="dialog"
      aria-modal="true">
      
      <!-- Fondo oscuro con desenfoque suave -->
      <div
        (click)="requestClose()"
        class="edit-service-drawer__backdrop"></div>

      <div class="edit-service-drawer__panel-wrap">
        <div
          class="edit-service-drawer__panel">
          
          <!-- ============================================================= -->
          <!-- CABECERA DEL DRAWER                                           -->
          <!-- ============================================================= -->
          <div class="edit-service-drawer__header">
            <div class="edit-service-drawer__header-row">
              <div>
                <span class="edit-service-drawer__eyebrow">CONFIGURACIÓN MAESTRA</span>
                <h2 id="slide-over-title" tabindex="-1" class="edit-service-drawer__title">
                  Editar servicio programado
                </h2>
                <p class="edit-service-drawer__code">
                  Código: <span class="edit-service-drawer__code-value">{{ service()?.id }}</span>
                </p>
              </div>
              <button
                type="button"
                (click)="requestClose()"
                aria-label="Cerrar"
                class="edit-service-drawer__close">
                ✕
              </button>
            </div>
          </div>

          <!-- ============================================================= -->
          <!-- FORMULARIO REACTIVO DE EDICIÓN                                -->
          <!-- ============================================================= -->
          <form [formGroup]="editForm" (ngSubmit)="save()" class="edit-service-drawer__form">
            
            <!-- 1. Nombre Comercial del Servicio -->
            <div>
              <label class="edit-service-drawer__label" for="esd-serviceName">Nombre del Servicio</label>
              <input
                id="esd-serviceName"
                type="text"
                formControlName="serviceName"
                placeholder="Ej. Expreso Altiplano Directo"
                class="edit-service-drawer__input" />
            </div>

            <!-- 2. Origen y Destino -->
            <div class="edit-service-drawer__grid">
              <div>
                <label class="edit-service-drawer__label" for="esd-originCity">Ciudad Origen<span class="edit-service-drawer__required" aria-hidden="true"> *</span><span class="edit-service-drawer__sr-only"> (obligatorio)</span></label>
                <input
                  id="esd-originCity"
                  required
                  aria-required="true"
                  [attr.aria-invalid]="!!fieldError('originCity')"
                  [attr.aria-describedby]="fieldError('originCity') ? 'esd-originCity-error' : null"
                  [class.edit-service-drawer__input--invalid]="!!fieldError('originCity')"
                  type="text"
                  formControlName="originCity"
                  class="edit-service-drawer__input" />
                @if (fieldError('originCity'); as msg) {
                  <p id="esd-originCity-error" class="edit-service-drawer__error">{{ msg }}</p>
                }
              </div>
              <div>
                <label class="edit-service-drawer__label" for="esd-destinationCity">Ciudad Destino<span class="edit-service-drawer__required" aria-hidden="true"> *</span><span class="edit-service-drawer__sr-only"> (obligatorio)</span></label>
                <input
                  id="esd-destinationCity"
                  required
                  aria-required="true"
                  [attr.aria-invalid]="!!fieldError('destinationCity')"
                  [attr.aria-describedby]="fieldError('destinationCity') ? 'esd-destinationCity-error' : null"
                  [class.edit-service-drawer__input--invalid]="!!fieldError('destinationCity')"
                  type="text"
                  formControlName="destinationCity"
                  class="edit-service-drawer__input" />
                @if (fieldError('destinationCity'); as msg) {
                  <p id="esd-destinationCity-error" class="edit-service-drawer__error">{{ msg }}</p>
                }
              </div>
            </div>

            <!-- 3. Turno y Estado -->
            <div class="edit-service-drawer__grid">
              <div>
                <label class="edit-service-drawer__label" for="esd-shift">Turno Operativo</label>
                <select
                  id="esd-shift"
                  formControlName="shift"
                  class="edit-service-drawer__input edit-service-drawer__input--select">
                  <option value="MAÑANA">MAÑANA</option>
                  <option value="TARDE">TARDE</option>
                  <option value="NOCHE">NOCHE</option>
                </select>
              </div>

              <div>
                <label class="edit-service-drawer__label" for="esd-status">Estado del Servicio</label>
                <select
                  id="esd-status"
                  formControlName="status"
                  class="edit-service-drawer__input edit-service-drawer__input--select">
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </div>
            </div>

            <!-- 4. Distancia y Frecuencia -->
            <div class="edit-service-drawer__grid">
              <div>
                <label class="edit-service-drawer__label" for="esd-distanceKm">Distancia (km)<span class="edit-service-drawer__required" aria-hidden="true"> *</span><span class="edit-service-drawer__sr-only"> (obligatorio)</span></label>
                <input
                  id="esd-distanceKm"
                  required
                  aria-required="true"
                  [attr.aria-invalid]="!!fieldError('distanceKm')"
                  [attr.aria-describedby]="fieldError('distanceKm') ? 'esd-distanceKm-error' : null"
                  [class.edit-service-drawer__input--invalid]="!!fieldError('distanceKm')"
                  type="number"
                  formControlName="distanceKm"
                  class="edit-service-drawer__input" />
                @if (fieldError('distanceKm'); as msg) {
                  <p id="esd-distanceKm-error" class="edit-service-drawer__error">{{ msg }}</p>
                }
              </div>
              <div>
                <label class="edit-service-drawer__label" for="esd-dailyDeparturesCount">Salidas Diarias<span class="edit-service-drawer__required" aria-hidden="true"> *</span><span class="edit-service-drawer__sr-only"> (obligatorio)</span></label>
                <input
                  id="esd-dailyDeparturesCount"
                  required
                  aria-required="true"
                  [attr.aria-invalid]="!!fieldError('dailyDeparturesCount')"
                  [attr.aria-describedby]="fieldError('dailyDeparturesCount') ? 'esd-dailyDeparturesCount-error' : null"
                  [class.edit-service-drawer__input--invalid]="!!fieldError('dailyDeparturesCount')"
                  type="number"
                  formControlName="dailyDeparturesCount"
                  class="edit-service-drawer__input" />
                @if (fieldError('dailyDeparturesCount'); as msg) {
                  <p id="esd-dailyDeparturesCount-error" class="edit-service-drawer__error">{{ msg }}</p>
                }
              </div>
            </div>

            <!-- 5. Selector Interactivo de Días Operativos -->
            <div class="edit-service-drawer__days">
              <p class="edit-service-drawer__label edit-service-drawer__label--days" id="esd-days-label">
                Días de Operación Semanal<span class="edit-service-drawer__required" aria-hidden="true"> *</span><span class="edit-service-drawer__sr-only"> (obligatorio)</span> ({{ selectedDays().length }} días seleccionados)
              </p>
              <div
                class="edit-service-drawer__days-grid"
                role="group"
                aria-labelledby="esd-days-label"
                [attr.aria-describedby]="selectedDays().length === 0 ? 'esd-days-error' : null">
                @for (d of availableDays; track d.key) {
                  <button
                    type="button"
                    (click)="toggleDay(d.key)"
                    [attr.aria-pressed]="selectedDays().includes(d.key)"
                    [attr.aria-label]="d.name"
                    [class.edit-service-drawer__day--selected]="selectedDays().includes(d.key)"
                    class="edit-service-drawer__day">
                    <span>{{ d.label }}</span>
                  </button>
                }
              </div>
              @if (selectedDays().length === 0) {
                <p id="esd-days-error" class="edit-service-drawer__error">
                  Elige al menos un día de operación.
                </p>
              }
            </div>

          </form>

          <!-- ============================================================= -->
          <!-- FOOTER CON BOTONES DE ACCIÓN                                  -->
          <!-- ============================================================= -->
          <div class="edit-service-drawer__footer">
            @if (confirmingDiscard()) {
              <!-- Confirmación en línea antes de descartar cambios -->
              <div class="edit-service-drawer__discard" role="alertdialog" aria-labelledby="esd-discard-text">
                <p id="esd-discard-text" class="edit-service-drawer__discard-text">
                  Tienes cambios sin guardar. ¿Descartarlos?
                </p>
                <div class="edit-service-drawer__discard-actions">
                  <button
                    type="button"
                    id="esd-keep-editing"
                    (click)="keepEditing()"
                    class="edit-service-drawer__keep">
                    Seguir editando
                  </button>
                  <button
                    type="button"
                    (click)="close()"
                    class="edit-service-drawer__discard-btn">
                    Descartar cambios
                  </button>
                </div>
              </div>
            } @else {
              <button
                type="button"
                (click)="requestClose()"
                class="edit-service-drawer__cancel">
                Cancelar
              </button>
              <button
                type="button"
                (click)="save()"
                class="edit-service-drawer__save">
                <svg class="edit-service-drawer__save-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M7.707 10.293a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L12 8.414V15a1 1 0 11-2 0V8.414l-1.293 1.293a1 1 0 01-1.414 0z" />
                </svg>
                <span>Guardar Cambios</span>
              </button>
            }
          </div>

        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditServiceDrawerComponent {
  private readonly fb = inject(FormBuilder);
  readonly opsService = inject(ScheduleService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Elemento que abrió el drawer: recibe el foco de vuelta al cerrarse. */
  private readonly opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  private static readonly FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /** Confirmación en línea "Descartar cambios / Seguir editando". */
  readonly confirmingDiscard = signal(false);
  /** Los días no viven en el formulario: se marca aparte si cambian. */
  private readonly daysDirty = signal(false);

  /** Orden visual de los campos validados (para enfocar el primero inválido). */
  private readonly validatedFields = ['originCity', 'destinationCity', 'distanceKm', 'dailyDeparturesCount'] as const;

  readonly service = this.opsService.editingService;

  // Semana de lunes a domingo, igual que la vista semanal
  readonly availableDays: { key: WeekDay; label: string; name: string }[] = [
    { key: 'Lun', label: 'Lun', name: 'Lunes' },
    { key: 'Mar', label: 'Mar', name: 'Martes' },
    { key: 'Mié', label: 'Mié', name: 'Miércoles' },
    { key: 'Jue', label: 'Jue', name: 'Jueves' },
    { key: 'Vie', label: 'Vie', name: 'Viernes' },
    { key: 'Sáb', label: 'Sáb', name: 'Sábado' },
    { key: 'Dom', label: 'Dom', name: 'Domingo' }
  ];

  readonly selectedDays = signal<WeekDay[]>(['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']);

  readonly editForm: FormGroup = this.fb.group({
    serviceName: [''],
    originCity: ['', Validators.required],
    destinationCity: ['', Validators.required],
    shift: ['MAÑANA', Validators.required],
    status: ['ACTIVO', Validators.required],
    distanceKm: [228, [Validators.required, Validators.min(1)]],
    dailyDeparturesCount: [8, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    // Al abrir: foco en el título del diálogo (da contexto al lector de pantalla).
    afterNextRender(() => {
      this.host.nativeElement.querySelector<HTMLElement>('#slide-over-title')?.focus();
    });

    // Al cerrar: el foco vuelve a quien abrió el drawer.
    inject(DestroyRef).onDestroy(() => {
      const opener = this.opener;
      if (opener && opener.isConnected) {
        setTimeout(() => opener.focus());
      }
    });

    effect(() => {
      const srv = this.service();
      if (srv) {
        this.editForm.patchValue({
          serviceName: srv.serviceName || '',
          originCity: srv.originCity,
          destinationCity: srv.destinationCity,
          shift: srv.shift ? srv.shift.toUpperCase() : 'MAÑANA',
          status: srv.status,
          distanceKm: srv.distanceKm,
          dailyDeparturesCount: srv.dailyDeparturesCount
        });
        this.selectedDays.set([...srv.operatingDays]);
        this.editForm.markAsPristine();
        this.editForm.markAsUntouched();
        this.daysDirty.set(false);
      }
    });
  }

  toggleDay(day: WeekDay): void {
    this.daysDirty.set(true);
    this.selectedDays.update(days => {
      if (days.includes(day)) {
        return days.filter(d => d !== day);
      } else {
        return [...days, day];
      }
    });
  }

  close(): void {
    this.confirmingDiscard.set(false);
    this.opsService.closeEditDrawer();
  }

  /** Cierre pedido por el usuario: si hay cambios, confirma en línea primero. */
  requestClose(): void {
    if (this.editForm.dirty || this.daysDirty()) {
      this.confirmingDiscard.set(true);
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#esd-keep-editing')?.focus());
      return;
    }
    this.close();
  }

  keepEditing(): void {
    this.confirmingDiscard.set(false);
  }

  /** Trampa de foco: Tab y Shift+Tab circulan solo dentro del drawer. */
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const panel = this.host.nativeElement.querySelector<HTMLElement>('.edit-service-drawer__panel');
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(EditServiceDrawerComponent.FOCUSABLE))
      .filter(el => el.offsetParent !== null || el.getClientRects().length > 0);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = !!active && items.includes(active);
    if (event.shiftKey && (!inside || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!inside ? active !== null && !panel.contains(active) : active === last)) {
      event.preventDefault();
      first.focus();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmingDiscard()) {
      this.keepEditing();
      return;
    }
    this.requestClose();
  }

  /** Mensaje de error de un campo validado (solo tras tocarlo o intentar guardar). */
  fieldError(name: string): string | null {
    const control = this.editForm.get(name);
    if (!control || !control.invalid || !control.touched) return null;
    const errors = control.errors ?? {};
    switch (name) {
      case 'originCity': return 'Ingresa la ciudad de origen.';
      case 'destinationCity': return 'Ingresa la ciudad de destino.';
      case 'distanceKm':
        return errors['required'] ? 'Ingresa la distancia.' : 'La distancia debe ser mayor a 0 km.';
      case 'dailyDeparturesCount':
        return errors['required'] ? 'Ingresa las salidas diarias.' : 'Debe haber al menos 1 salida diaria.';
      default: return 'Revisa este campo.';
    }
  }

  save(): void {
    if (this.editForm.invalid || this.selectedDays().length === 0) {
      this.editForm.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    const current = this.service();
    if (!current) return;

    const formValues = this.editForm.value;
    const updated: ScheduledCommercialService = {
      ...current,
      serviceName: formValues.serviceName ? formValues.serviceName.trim() : undefined,
      originCity: formValues.originCity.trim(),
      destinationCity: formValues.destinationCity.trim(),
      shift: formValues.shift as ServiceShift,
      status: formValues.status,
      distanceKm: Number(formValues.distanceKm),
      dailyDeparturesCount: Number(formValues.dailyDeparturesCount),
      operatingDays: this.selectedDays()
    };

    this.opsService.updateService(updated);
    this.close();
    this.toast.show('Servicio actualizado');
  }

  private focusFirstInvalid(): void {
    setTimeout(() => {
      const root = this.host.nativeElement;
      const field = this.validatedFields.find(name => this.editForm.get(name)?.invalid);
      const target = field
        ? root.querySelector<HTMLElement>(`#esd-${field}`)
        : root.querySelector<HTMLElement>('.edit-service-drawer__day');
      target?.focus();
    });
  }
}
