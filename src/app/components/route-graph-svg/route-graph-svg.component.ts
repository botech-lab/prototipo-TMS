import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  signal,
  HostListener,
  OnInit
} from '@angular/core';

import { StopNode } from '../../models/route.model';
import { RouteGraphEngine, GraphEngineOutput, DeviceBreakpoint } from './route-graph-engine';
import { ROUTE_GRAPH_RULES } from './route-graph-rules';
import { stopColor } from './route-graph-palette';

@Component({
  selector: 'app-route-graph-svg',
  imports: [],
  templateUrl: './route-graph-svg.component.html',
  styleUrls: ['./route-graph-svg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteGraphSvgComponent implements OnInit {
  /** Colores del grafo: salen de ROUTE_GRAPH_RULES (PALETTE), nunca hex en el template. */
  protected readonly palette = ROUTE_GRAPH_RULES;

  readonly stops = input<StopNode[]>([]);

  /** Color de categoría del departamento de la parada. */
  protected colorOf(stopName: string): string {
    return stopColor(stopName);
  }
  readonly currentBreakpoint = signal<DeviceBreakpoint>('desktop');

  ngOnInit() {
    this.updateBreakpoint();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateBreakpoint();
  }

  private updateBreakpoint() {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640;
      this.currentBreakpoint.set(isMobile ? 'mobile' : 'desktop');
    }
  }

  // Geometría vectorial calculada dinámicamente según paradas y breakpoint detectado
  readonly geometry = computed<GraphEngineOutput>(() => {
    return RouteGraphEngine.calculate(this.stops(), this.currentBreakpoint());
  });

  readonly graph = computed<GraphEngineOutput>(() => this.geometry());

  readonly viewBox = computed<string>(() => this.geometry().viewBox);
  readonly pathD = computed<string>(() => this.geometry().pathD);
  readonly calculatedNodes = computed(() => this.geometry().nodes);
  readonly fontSizeCity = computed(() => this.geometry().fontSizeCity);
  readonly fontSizeNode = computed(() => this.geometry().fontSizeNode);
  readonly strokeWidth = computed(() => this.geometry().strokeWidth);

  /** Descripción del grafo para lectores de pantalla, a partir de las paradas. */
  readonly ariaLabel = computed(() => {
    const names = this.stops().map(stop => stop.name);
    if (!names.length) {
      return 'Ruta sin paradas';
    }
    const count = names.length === 1 ? '1 parada' : `${names.length} paradas`;
    return `Ruta ${names[0]} → ${names[names.length - 1]}, ${count}: ${names.join(', ')}`;
  });
}
