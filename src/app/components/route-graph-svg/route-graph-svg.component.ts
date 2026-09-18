import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  signal,
  HostListener,
  OnInit,
  ElementRef,
  DestroyRef,
  afterNextRender,
  inject
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

  /**
   * Ancho del lienzo en unidades del viewBox, derivado del tamaño real de la caja
   * (alto fijo CANVAS.HEIGHT). null = aún sin medir: el motor usa su ancho por defecto (460).
   */
  private readonly canvasWidth = signal<number | null>(null);

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(entries => {
        const box = entries[0]?.contentRect;
        if (!box || box.width <= 0 || box.height <= 0) return;
        const width = Math.round(ROUTE_GRAPH_RULES.CANVAS.HEIGHT * box.width / box.height);
        if (width !== this.canvasWidth()) this.canvasWidth.set(width);
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

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

  // Geometría vectorial calculada según paradas, breakpoint y ancho real de la caja
  readonly geometry = computed<GraphEngineOutput>(() => {
    return RouteGraphEngine.calculate(
      this.stops(),
      this.currentBreakpoint(),
      this.canvasWidth() ?? undefined
    );
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
