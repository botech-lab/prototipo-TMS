import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed
} from '@angular/core';

import { MasterRoute } from '../../models/route.model';
import { RouteGraphSvgComponent } from '../route-graph-svg/route-graph-svg.component';
import { NavIconComponent } from '../app-shell/nav-icon.component';
import { ROUTE_CARD_DIMENSIONS } from './route-card-rules';

@Component({
  selector: 'app-route-card',
  imports: [RouteGraphSvgComponent, NavIconComponent],
  templateUrl: './route-card.component.html',
  styleUrls: ['./route-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Reglas de oro (ROUTE_CARD_DIMENSIONS) publicadas como variables CSS para el SCSS.
    '[style.--route-card-expanded-min-h.px]': 'dimensions.CARD_EXPANDED_HEIGHT',
    '[style.--route-card-collapsed-min-h.px]': 'dimensions.CARD_COLLAPSED_HEIGHT',
    '[style.--route-card-header-h.px]': 'dimensions.HEADER_HEIGHT',
    '[style.--route-card-svg-h.px]': 'dimensions.SVG_CONTAINER_HEIGHT',
    '[style.--route-card-services-h.px]': 'dimensions.SERVICES_CONTAINER_HEIGHT',
    '[style.--route-card-footer-h.px]': 'dimensions.FOOTER_HEIGHT',
  },
})
export class RouteCardComponent {
  protected readonly dimensions = ROUTE_CARD_DIMENSIONS;

  readonly route = input.required<MasterRoute>();

  readonly statusToggle = output<string>();
  readonly expandToggle = output<string>();
  readonly editRoute = output<string>();

  readonly isExpanded = computed(() => this.route().isExpanded);

  /** Tramos del nombre separados por "→": la flecha se pinta en cobre aparte. */
  readonly nameParts = computed(() => this.route().name.split('→').map(part => part.trim()).filter(Boolean));

  /** Título: solo origen → destino final, que abarcan todo el recorrido. */
  readonly origin = computed(() => this.nameParts()[0] ?? '');
  readonly destination = computed(() => {
    const parts = this.nameParts();
    return parts.length > 1 ? parts[parts.length - 1] : '';
  });

  /** Ciudades intermedias del nombre, en una línea secundaria ("vía Oruro, Potosí"). */
  readonly via = computed(() => this.nameParts().slice(1, -1).join(', '));

  readonly services = computed(() => {
    const r = this.route();
    return r.derivedServices || r.avoidedDuplicates || [];
  });

  onToggleStatus(event?: Event): void {
    if (event) event.stopPropagation();
    this.statusToggle.emit(this.route().id);
  }

  toggleStatus(event?: Event): void {
    this.onToggleStatus(event);
  }

  onToggleDetails(): void {
    this.expandToggle.emit(this.route().id);
  }

  toggleCollapse(): void {
    this.onToggleDetails();
  }

  onEdit(): void {
    this.editRoute.emit(this.route().id);
  }
}
