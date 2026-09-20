import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../../../components/toast/toast.service';
import { WizardStepKey } from '../../models/route-draft.model';
import { WIZARD_STEPS, WizardStep } from '../../models/wizard-steps';
import { RouteDraftStore } from '../../services/route-draft.store';
import * as Engine from '../../services/route-draft-engine';
import { InheritancePreviewComponent } from '../inheritance-preview/inheritance-preview.component';
import { WizardIconComponent } from '../wizard-icon.component';
import { StepRouteComponent } from '../steps/step-route.component';
import { StepStopsComponent } from '../steps/step-stops.component';
import { StepTramosComponent } from '../steps/step-tramos.component';
import { StepOperationComponent } from '../steps/step-operation.component';
import { StepFaresComponent } from '../steps/step-fares.component';
import { StepReviewComponent } from '../steps/step-review.component';

/**
 * ============================================================================
 * ASISTENTE "NUEVA RUTA MAESTRA" (SMART CONTAINER)
 * ============================================================================
 * Rutas: /rutas-maestras/nueva[?origen=La Paz]  y  /rutas-maestras/:id/continuar
 * Riel de pasos con estado, un paso a la vista, y a la derecha "Lo que heredan
 * los servicios". Se puede guardar como borrador en cualquier momento; la
 * activación es manual y solo en el último paso.
 * ============================================================================
 */
@Component({
  selector: 'app-route-wizard-page',
  imports: [
    RouterLink,
    WizardIconComponent,
    InheritancePreviewComponent,
    StepRouteComponent,
    StepStopsComponent,
    StepTramosComponent,
    StepOperationComponent,
    StepFaresComponent,
    StepReviewComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './route-wizard-page.component.scss',
  templateUrl: './route-wizard-page.component.html'
})
export class RouteWizardPageComponent {
  protected readonly store = inject(RouteDraftStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);

  private readonly stageHeading = viewChild<ElementRef<HTMLElement>>('stageHeading');

  protected readonly steps = WIZARD_STEPS;
  protected readonly stepKey = signal<WizardStepKey>('recorrido');
  /** Pasos ya abiertos: un paso no se marca "completo" hasta que la persona lo vio. */
  private readonly visited = signal<ReadonlySet<WizardStepKey>>(new Set(['recorrido']));

  protected readonly draft = computed(() => this.store.draft());
  protected readonly index = computed(() => this.steps.findIndex(step => step.key === this.stepKey()));
  protected readonly step = computed<WizardStep>(() => this.steps[this.index()]);
  protected readonly previous = computed(() => this.steps[this.index() - 1] ?? null);
  protected readonly next = computed(() => this.steps[this.index() + 1] ?? null);

  protected readonly name = computed(() => (this.draft() ? Engine.routeName(this.draft()!) : ''));
  /** Sin origen y destino no se puede avanzar más allá del recorrido. */
  protected readonly hasEnds = computed(() => (this.draft() ? Engine.mainPath(this.draft()!).cities.length : 0) >= 2);
  /** Ya existe una ruta con el mismo origen y destino: no se avanza ni se guarda. */
  protected readonly duplicate = this.store.duplicate;
  /** Recuadro "Lo heredan los servicios" cerrado con "Entendido" en el paso actual. */
  protected readonly inheritsDismissed = computed(() => this.store.dismissedInherits().has(this.stepKey()));
  /** Partes que se completan (todas menos la revisión). */
  protected readonly partCount = this.steps.length - 1;
  protected readonly doneCount = computed(() => this.steps.filter(step => step.key !== 'revision' && this.state(step.key) === 'done').length);

  constructor() {
    const params = this.route.snapshot.paramMap;
    const query = this.route.snapshot.queryParamMap;
    const id = params.get('id');
    if (id && query.get('tramo') === 'nuevo' && this.store.openToAddPath(id)) {
      // Ruta existente abierta para agregarle un tramo: sus pasos ya están vistos.
      this.visited.set(new Set(this.steps.map(step => step.key)));
    } else if (id && this.store.resume(id)) {
      this.visited.set(new Set(this.steps.map(step => step.key)));
    } else {
      this.store.start(query.get('origen'));
    }
    const wanted = query.get('paso') as WizardStepKey | null;
    if (wanted && this.steps.some(step => step.key === wanted) && (wanted === 'recorrido' || this.hasEnds())) {
      this.stepKey.set(wanted);
      this.visited.update(set => new Set(set).add(wanted));
    }
  }

  /** Estado que muestra el riel: los pasos no visitados siguen pendientes aunque sus valores por defecto sean válidos. */
  protected state(key: WizardStepKey): Engine.StepState {
    const draft = this.draft();
    if (!draft || !this.visited().has(key)) return 'todo';
    return Engine.stepState(draft, key);
  }

  /** Resumen de una línea bajo cada paso del riel. */
  protected summary(key: WizardStepKey): string {
    const draft = this.draft();
    if (!draft) return '';
    if (key !== 'recorrido' && !this.hasEnds()) return 'Primero el recorrido';
    switch (key) {
      case 'recorrido':
        if (!this.hasEnds()) return 'Origen y destino';
        return draft.paths.length > 1 ? `${draft.paths.length} tramos` : `${Engine.mainPath(draft).cities.length} ciudades`;
      case 'paradas': {
        const totals = Engine.totals(draft);
        return totals.minutes ? `${totals.stops} paradas · ${Engine.formatDuration(totals.minutes)}` : `${totals.stops} paradas · faltan tiempos`;
      }
      case 'tramos':
        return `${Engine.enabledTramos(draft).length} de ${draft.tramos.length} se venden`;
      case 'operacion':
        return draft.schedule.days.length ? `${Engine.daysLabel(draft.schedule.days)}` : 'Sin días';
      case 'tarifas': {
        if (!draft.buses.length) return 'Sin buses';
        const buses = `${draft.buses.length} ${draft.buses.length === 1 ? 'bus' : 'buses'}`;
        return draft.fareCards.length ? `${buses} · ${draft.fareCards.length} ${draft.fareCards.length === 1 ? 'lista de precios' : 'listas de precios'}` : `${buses} · sin precios`;
      }
      case 'revision': {
        const missing = Engine.blockingChecks(draft).length;
        return missing ? `Faltan ${missing}` : 'Lista para activar';
      }
    }
  }

  protected canOpen(key: WizardStepKey): boolean {
    return key === 'recorrido' || (this.hasEnds() && !this.duplicate());
  }

  protected goTo(key: WizardStepKey): void {
    if (!this.canOpen(key) || key === this.stepKey()) return;
    this.stepKey.set(key);
    this.visited.update(set => new Set(set).add(key));
    this.router.navigate([], { relativeTo: this.route, queryParams: { paso: key }, queryParamsHandling: 'merge', replaceUrl: true });
    // Accesibilidad: el foco va al título del paso y la vista vuelve arriba.
    afterNextRender(() => {
      const heading = this.stageHeading()?.nativeElement;
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }, { injector: this.injector });
  }

  protected saveDraft(): void {
    const draft = this.draft();
    if (!draft) return;
    if (!this.hasEnds()) {
      this.toast.show('Elige el origen y el destino para poder guardar el borrador');
      return;
    }
    const dup = this.duplicate();
    if (dup) {
      this.toast.show(`No se puede guardar: ya existe ${dup.code} con el mismo origen y destino`);
      return;
    }
    const returnCode = this.store.saveDraft();
    const extra = returnCode ? ` · también se creó la vuelta (${returnCode})` : '';
    this.toast.show(`${draft.code} guardada como borrador${extra}`);
    this.router.navigate(['/rutas-maestras']);
  }

  protected activate(): void {
    const draft = this.draft();
    if (!draft) return;
    if (this.duplicate()) {
      this.toast.show('No se puede activar: ya existe una ruta con el mismo origen y destino');
      return;
    }
    const result = this.store.activate();
    if (!result.ok) {
      this.toast.show('Todavía faltan datos obligatorios');
      return;
    }
    const extra = result.returnCode ? ` · la vuelta ${result.returnCode} quedó como borrador` : '';
    this.toast.show(`${draft.code} activada: ya se pueden crear servicios${extra}`, { durationMs: 7000 });
    this.store.discard();
    this.router.navigate(['/rutas-maestras']);
  }
}
