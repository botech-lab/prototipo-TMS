import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { DraftCheck, WizardStepKey } from '../../models/route-draft.model';
import { WIZARD_STEPS } from '../../models/wizard-steps';
import { RouteDraftStore } from '../../services/route-draft.store';
import * as Engine from '../../services/route-draft-engine';
import { WizardIconComponent } from '../wizard-icon.component';
import { NewBadgeComponent } from '../new-badge.component';
import { HelpTipComponent } from '../help-tip.component';

interface CheckGroup {
  readonly step: WizardStepKey;
  readonly number: number;
  readonly title: string;
  readonly items: readonly DraftCheck[];
}

/**
 * Paso 7 · Revisión y activación.
 * Hace explícito el paso de BORRADOR a ACTIVO que en Aleta es un checkbox
 * suelto: lista de verificación con enlace a cada corrección y aprobación
 * manual. Solo se puede activar si no falta nada obligatorio.
 */
@Component({
  selector: 'app-step-review',
  imports: [NewBadgeComponent, WizardIconComponent, HelpTipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-review.component.scss',
  template: `
    @let d = store.draft()!;

    <section class="verdict" [class.verdict--ready]="!blocking().length" aria-live="polite">
      <span class="verdict__icon"><app-wizard-icon [name]="blocking().length ? 'alert' : 'check'" /></span>
      <div>
        @if (blocking().length) {
          <h3 class="verdict__title">{{ blocking().length === 1 ? 'Falta 1 cosa' : 'Faltan ' + blocking().length + ' cosas' }} para poder activarla</h3>
          <p class="verdict__text">Puedes guardarla como borrador y terminarla después. Nadie podrá crear servicios con ella hasta que la actives.</p>
        } @else {
          <h3 class="verdict__title">Todo listo para activar</h3>
          <p class="verdict__text">Revisa el resumen. Cuando la actives, aparecerá al crear servicios.</p>
        }
      </div>
    </section>

    <section class="step-block" aria-labelledby="checklist-title">
      <h3 id="checklist-title" class="step-block__title">Lista de verificación <app-new-badge detail="Aleta activa rutas sin validar; aquí no se puede activar si falta algo obligatorio." /></h3>
      <ol class="groups">
        @for (group of groups(); track group.step) {
          <li class="group">
            <div class="group__head">
              <span class="group__number">{{ group.number }}</span>
              <h4 class="group__title">{{ group.title }}</h4>
              <button type="button" class="link-btn" (click)="goTo.emit(group.step)">{{ hasMissing(group) ? 'Corregir' : 'Ver' }}</button>
            </div>
            <ul class="items">
              @for (item of group.items; track item.id) {
                <li class="item" [class]="'item item--' + item.level">
                  <span class="item__icon">
                    @switch (item.level) {
                      @case ('ok') { <app-wizard-icon name="check" /> }
                      @default { <app-wizard-icon name="alert" /> }
                    }
                  </span>
                  <span class="item__text">
                    <span class="sr-only">{{ levelText(item) }}:</span>
                    <strong>{{ item.label }}</strong>
                    @if (item.detail) { <small>{{ item.detail }}</small> }
                  </span>
                </li>
              }
            </ul>
          </li>
        }
      </ol>
    </section>

    <section class="step-block approve" aria-labelledby="approve-title">
      <div class="title-row">
        <h3 id="approve-title" class="step-block__title">Aprobar y activar {{ name() }}</h3>
        <app-help-tip label="Aprobar y activar" text="Al activarla, cualquier persona que cree un servicio podrá elegir esta ruta, con sus tramos, paradas, tiempos, viajes, días, canales, buses y precios. Si hace falta, se puede desactivar desde Rutas maestras." />
      </div>

      @if (d.createReturn) {
        <p class="inherit-note">
          <app-wizard-icon name="return" />
          <span>También se creará <strong>{{ returnName() }}</strong> con todo copiado en sentido inverso, como <strong>borrador aparte</strong> para que la revises antes de activarla.</span>
        </p>
      }

      <label class="toggle-row">
        <input type="checkbox" class="check" [checked]="confirmed()" (change)="confirmed.set($any($event.target).checked)" [disabled]="blocking().length > 0" />
        <span><strong>Revisé la ruta y apruebo que se use para crear servicios</strong></span>
      </label>

      <div class="approve__actions">
        <button type="button" class="approve__primary" (click)="activate.emit()" [disabled]="blocking().length > 0 || !confirmed()">
          <app-wizard-icon name="check" class="approve__icon" /> Aprobar y activar
        </button>
        <button type="button" class="secondary-btn" (click)="saveDraft.emit()">
          <app-wizard-icon name="save" class="approve__icon" /> Guardar como borrador
        </button>
      </div>
    </section>
  `
})
export class StepReviewComponent {
  protected readonly store = inject(RouteDraftStore);
  readonly goTo = output<WizardStepKey>();
  readonly activate = output<void>();
  readonly saveDraft = output<void>();

  protected readonly confirmed = signal(false);

  protected readonly name = computed(() => Engine.routeName(this.store.draft()!));
  protected readonly returnName = computed(() => {
    const draft = this.store.draft()!;
    return `${Engine.destination(draft)?.name ?? ''} – ${Engine.origin(draft)?.name ?? ''}`;
  });

  private readonly all = computed(() => Engine.checks(this.store.draft()!));
  protected readonly blocking = computed(() => this.all().filter(item => item.level === 'missing'));

  protected readonly groups = computed<CheckGroup[]>(() =>
    WIZARD_STEPS.filter(step => step.key !== 'revision')
      .map((step, index) => ({
        step: step.key,
        number: index + 1,
        title: step.title,
        items: this.all().filter(item => item.step === step.key)
      }))
      .filter(group => group.items.length)
  );

  protected hasMissing(group: CheckGroup): boolean {
    return group.items.some(item => item.level !== 'ok');
  }

  protected levelText(item: DraftCheck): string {
    return item.level === 'ok' ? 'Listo' : item.level === 'warn' ? 'Conviene revisar' : 'Falta';
  }
}
