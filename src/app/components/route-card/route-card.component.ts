import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed
} from '@angular/core';

import { MasterRoute } from '../../models/route.model';
import { RouteGraphSvgComponent } from '../route-graph-svg/route-graph-svg.component';
import { stopColor } from '../route-graph-svg/route-graph-palette';
import { NavIconComponent } from '../app-shell/nav-icon.component';
import { ROUTE_CARD_DIMENSIONS } from './route-card-rules';

/** Tramo de texto para resaltar la búsqueda sin usar innerHTML. */
export interface TextSegment {
  readonly text: string;
  readonly match: boolean;
}

/** Servicio creado que se puede abrir en Servicios programados. */
export interface CreatedServiceLink {
  readonly origin: string;
  readonly destination: string;
}

/** Normaliza para comparar sin tildes ni mayúsculas. */
function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Parte un texto en tramos que coinciden (o no) con la búsqueda. */
export function highlightSegments(text: string, query: string): TextSegment[] {
  const q = fold(query.trim());
  if (!q || !text) return [{ text, match: false }];
  const folded = fold(text);
  const segments: TextSegment[] = [];
  let from = 0;
  let index = folded.indexOf(q);
  while (index !== -1) {
    if (index > from) segments.push({ text: text.slice(from, index), match: false });
    segments.push({ text: text.slice(index, index + q.length), match: true });
    from = index + q.length;
    index = folded.indexOf(q, from);
  }
  if (from < text.length) segments.push({ text: text.slice(from), match: false });
  return segments;
}

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

  /** Texto buscado en el panel: se resalta en código, título, "vía" y paradas. */
  readonly highlight = input<string>('');

  readonly statusToggle = output<string>();
  readonly expandToggle = output<string>();
  readonly editRoute = output<string>();
  /** Pulsación sobre un servicio creado: el panel abre Servicios programados. */
  readonly openService = output<CreatedServiceLink>();

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

  /** Tramos resaltados para la plantilla. */
  readonly codeSegments = computed(() => highlightSegments(this.route().code, this.highlight()));
  readonly originSegments = computed(() => highlightSegments(this.origin(), this.highlight()));
  readonly destinationSegments = computed(() => highlightSegments(this.destination(), this.highlight()));
  readonly viaSegments = computed(() => highlightSegments(this.via(), this.highlight()));

  /**
   * Parada que coincide con la búsqueda pero no se ve en el título ni en "vía"
   * (p. ej. "Sacaba" en RM-01). Se muestra en el pie para explicar el resultado.
   */
  readonly matchedStop = computed(() => {
    const q = fold(this.highlight().trim());
    if (!q) return '';
    const visible = fold([this.origin(), this.destination(), this.via()].join(' '));
    if (visible.includes(q)) return '';
    return this.route().stops.find(stop => fold(stop.name).includes(q))?.name ?? '';
  });

  readonly matchedStopSegments = computed(() => highlightSegments(this.matchedStop(), this.highlight()));

  /** Colores de origen y destino para la mini línea del pie (categoría de departamento). */
  readonly originColor = computed(() => stopColor(this.route().stops[0]?.name ?? this.origin()));
  readonly destinationColor = computed(() => {
    const stops = this.route().stops;
    return stopColor(stops[stops.length - 1]?.name ?? this.destination());
  });

  /** "La Paz–Cochabamba" o "La Paz → Cochabamba" → { origin, destination }. */
  serviceLink(service: string): CreatedServiceLink | null {
    const [origin, destination] = service.split(/\s*[–—→-]\s*/).map(part => part.trim());
    return origin && destination ? { origin, destination } : null;
  }

  onOpenService(service: string): void {
    const link = this.serviceLink(service);
    if (link) this.openService.emit(link);
  }

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
