import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { SEAT_LAYOUT_RULES } from '@core';
import { DesignerIconComponent } from './designer-icon.component';
import { Vehicle } from '../../../fleet/models/vehicle.model';
import { VehiclesService } from '../../../fleet/services/vehicles.service';
import { SeatType } from '../../../parametric/models/parametric.model';
import { ParametricCatalogsService } from '../../../parametric/services/parametric-catalogs.service';
import {
  Amenity,
  BathroomPlacement,
  BodyTemplate,
  BuildSpec,
  CellKey,
  ChatAnswers,
  ChatMessage,
  ChatResponse,
  CellPosition,
  ChassisPreset,
  DoorPlacement,
  DeckLayout,
  DesignerTool,
  FixtureKind,
  InspectionLayer,
  LayoutCell,
  LayoutStats,
  NumberingByDeck,
  NumberingDirection,
  NumberingPlan,
  NumberingScope,
  NumberingStrategy,
  PromptResult,
  SeatTrait,
  SeatTypeCode,
  StairsPlacement,
  TrafficLightCheck,
  VehicleLayout
} from '../../models/seat-layout.model';
import { SeatChatEngine } from '../../services/seat-chat-engine';
import { SeatMutationEngine } from '../../services/seat-mutation-engine';
import { SeatCodeEngine } from '../../services/seat-code-engine';
import { SeatLayoutEngine, cellKey, parseKey } from '../../services/seat-layout-engine';
import { SeatMapExportEngine, SyncBundle } from '../../services/seat-map-export-engine';
import { SeatPromptEngine } from '../../services/seat-prompt-engine';
import { SeatTraitEngine } from '../../services/seat-trait-engine';
import { SeatLayoutStore } from '../../services/seat-layout.store';

type Orientation = 'landscape' | 'portrait';

/** Pestaña abierta en el riel lateral. `none` = panel plegado. */
type SidePanel = 'none' | 'assistant' | 'seats' | 'fixtures' | 'templates';
type DragMode = 'none' | 'paint' | 'lasso' | 'snake' | 'stamp' | 'move';

interface SeatAppearance { readonly icon: string; readonly label: string; readonly fill: string; readonly stroke: string; readonly text: string; }
interface SeatTool { readonly code: SeatTypeCode; readonly name: string; readonly appearance: SeatAppearance; readonly shortcut: string; }
interface FixtureTool { readonly kind: FixtureKind; readonly icon: string; readonly label: string; }
interface FareOption { readonly id: string; readonly name: string; readonly rank: number; }

/** Celda ya resuelta a coordenadas de pantalla y a su capa activa. */
interface RenderedCell {
  readonly pos: CellPosition;
  readonly key: CellKey;
  readonly cell: LayoutCell;
  readonly gridRow: number;
  readonly gridCol: number;
  /** La celda cierra el vestíbulo: tras ella va la mampara divisoria. */
  readonly mampara: boolean;
  readonly appearance: SeatAppearance | null;
  readonly fixture: FixtureTool | null;
  readonly traits: readonly SeatTrait[];
  readonly fare: { readonly name: string; readonly rank: number; readonly manual: boolean } | null;
  readonly heat: { readonly fill: string; readonly stroke: string; readonly text: string } | null;
  /** Marcador de salida de emergencia en la ventana (no ocupa celda). */
  readonly exit: 'left' | 'right' | null;
}

interface Point { readonly x: number; readonly y: number; }
interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number; }

/**
 * ============================================================================
 * DISEÑADOR DE PLAZAS (SMART CONTAINER)
 * ============================================================================
 * Un solo lienzo, tres gestos de arrastre, cero modos ocultos: LA HERRAMIENTA
 * ACTIVA DEFINE QUÉ SIGNIFICA ARRASTRAR.
 *   butaca / mobiliario → pinta        Editar → lasso        Numerar → serpiente
 * Y un cuarto arrastre en el asa trasera del chasis: estampa filas.
 *
 * Toda mutación pasa por `SeatLayoutEngine` (puro) y `SeatLayoutStore`
 * (historial). Este componente no calcula planos: los pide.
 * ============================================================================
 */
@Component({
  selector: 'app-seat-designer-page',
  standalone: true,
  imports: [DesignerIconComponent],
  templateUrl: './seat-designer-page.component.html',
  styleUrls: ['./seat-designer-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-preview]': 'preview() ? "" : null',
    '[attr.data-panel]': 'sidePanel()',
    '[attr.data-zen]': 'zen() ? "" : null',
    '[attr.data-tool]': 'tool().kind',
    // Colores semánticos y medidas congeladas de SEAT_LAYOUT_RULES como variables CSS:
    // la hoja de estilos no repite ningún valor de las reglas.
    '[style.--cell-radius.px]': 'rules.CELL.RADIUS',
    '[style.--snake-stroke]': 'rules.SNAKE.STROKE',
    '[style.--snake-glow]': 'rules.SNAKE.GLOW',
    '[style.--heat-1]': 'rules.FARE_HEAT[1].stroke',
    '[style.--heat-2]': 'rules.FARE_HEAT[2].stroke',
    '[style.--heat-3]': 'rules.FARE_HEAT[3].stroke',
    '[style.--heat-4]': 'rules.FARE_HEAT[4].stroke',
    '(window:resize)': 'onResize()',
    '(document:fullscreenchange)': 'onFullscreenChange()',
    '(document:pointermove)': 'onDocumentPointerMove($event)',
    '(document:pointerup)': 'onPointerUp()',
    '(document:pointercancel)': 'onPointerUp()',
    '(document:keydown)': 'onKeydown($event)'
  }
})
export class SeatDesignerPageComponent {
  readonly vehicleId = input.required<string>();

  private readonly vehiclesService = inject(VehiclesService);
  private readonly catalogs = inject(ParametricCatalogsService);
  private readonly store = inject(SeatLayoutStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly rules = SEAT_LAYOUT_RULES;

  /** Leyenda de la capa de tarifa: un rango por color de FARE_HEAT, con su tarifa. */
  protected readonly fareLegend = ([1, 2, 3, 4] as const).map(rank => ({
    rank,
    name: rank === SEAT_LAYOUT_RULES.FARE_DEFAULT.rank
      ? SEAT_LAYOUT_RULES.FARE_DEFAULT.fare
      : SEAT_LAYOUT_RULES.FARE_RULES.find(rule => rule.rank === rank)?.fare ?? `Rango ${rank}`,
    fill: SEAT_LAYOUT_RULES.FARE_HEAT[rank].fill,
    stroke: SEAT_LAYOUT_RULES.FARE_HEAT[rank].stroke
  }));
  protected readonly columnPresets = SEAT_LAYOUT_RULES.COLUMN_PRESETS;
  protected readonly chassisPresets = SEAT_LAYOUT_RULES.CHASSIS_PRESETS as readonly ChassisPreset[];
  protected readonly bodyTemplates = SEAT_LAYOUT_RULES.BODY_TEMPLATES as readonly BodyTemplate[];
  protected readonly bathroomOptions: readonly { id: BathroomPlacement; label: string }[] = [
    { id: 'entry', label: 'Acceso (planta baja)' }, { id: 'entry-both', label: 'Acceso + fondo piso 2' }, { id: 'rear-right', label: 'Fondo derecha' }, { id: 'rear-left', label: 'Fondo izquierda' }, { id: 'middle-right', label: 'Centro derecha' }, { id: 'none', label: 'Sin baño' }
  ];
  protected readonly doorOptions: readonly { id: DoorPlacement; label: string }[] = [
    { id: 'front', label: 'Delantera' }, { id: 'front-middle', label: 'Delantera + central' }, { id: 'front-rear', label: 'Delantera + trasera' }
  ];
  protected readonly stairsOptions: readonly { id: StairsPlacement; label: string }[] = [
    { id: 'front-right', label: 'Delantera · fila 2 derecha' }, { id: 'middle-left', label: 'Centro izquierda' }, { id: 'middle-right', label: 'Centro derecha' }, { id: 'rear-left', label: 'Fondo izquierda' }, { id: 'rear-right', label: 'Fondo derecha' }, { id: 'none', label: 'Sin escalera' }
  ];
  protected readonly accents = Object.entries(SEAT_LAYOUT_RULES.ACCENTS).map(([id, a]) => ({ id, ...a }));
  protected readonly reclineStops = SEAT_LAYOUT_RULES.RECLINE_STOPS;
  protected readonly amenityOptions = (Object.keys(SEAT_LAYOUT_RULES.AMENITIES) as Amenity[]).map(id => ({ id, ...SEAT_LAYOUT_RULES.AMENITIES[id] }));

  // ==========================================
  // ESTADO
  // ==========================================
  protected readonly activeDeck = signal<number>(0);
  protected readonly tool = signal<DesignerTool>({ kind: 'seat', seatType: 'EST' });
  protected readonly selected = signal<CellPosition | null>(null);
  protected readonly selection = signal<ReadonlySet<CellKey>>(new Set());
  protected readonly hovered = signal<CellPosition | null>(null);
  /** Mover: celda levantada y celda bajo el puntero donde caería. */
  protected readonly moveSource = signal<CellPosition | null>(null);
  protected readonly moveTarget = signal<CellPosition | null>(null);
  /** Posición del puntero mientras se arrastra: el "cuadrado" viaja con él. */
  protected readonly ghost = signal<{ x: number; y: number } | null>(null);
  protected readonly ghostCell = computed<RenderedCell | null>(() => {
    const m = this.moveSource();
    return m ? this.renderedCells().find(c => c.pos.row === m.row && c.pos.col === m.col) ?? null : null;
  });
  /** Celda que acaba de aterrizar: rebota un instante al acomodarse. */
  protected readonly landedKey = signal<CellKey | null>(null);
  private landedTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly zoom = signal<number>(SEAT_LAYOUT_RULES.ZOOM.DEFAULT);
  /** Regla de numeración POR PISO (índice = piso). Vacío = la de fábrica. */
  protected readonly deckStrategies = signal<readonly NumberingStrategy[]>([]);
  /** Regla del piso activo: lo que muestra y cambia el menú Auto-numerar. */
  protected readonly strategy = computed<NumberingStrategy>(() => SeatLayoutEngine.strategyFor(this.deckStrategies().length ? this.deckStrategies() : undefined, this.activeDeck()));
  /** Plan completo para el motor: una regla por piso. */
  protected readonly numberingPlan = computed<NumberingPlan>(() => {
    const plan = this.deckStrategies();
    return plan.length ? plan : SEAT_LAYOUT_RULES.NUMBERING.DEFAULT_STRATEGY;
  });
  protected readonly scope = signal<NumberingScope>(SEAT_LAYOUT_RULES.NUMBERING.DEFAULT_SCOPE);
  /** Sentido del recorrido: frente→fondo y por el lado del conductor, salvo que se pida otro. */
  protected readonly direction = signal<NumberingDirection>(SEAT_LAYOUT_RULES.NUMBERING.DEFAULT_DIRECTION as NumberingDirection);
  protected readonly layer = signal<InspectionLayer>('passenger');
  protected readonly preview = signal<boolean>(false);
  protected readonly toast = signal<string | null>(null);
  protected readonly lassoRect = signal<Rect | null>(null);
  protected readonly snakePoints = signal<readonly Point[]>([]);
  protected readonly spawnerOpen = signal<boolean>(false);
  protected readonly presetsOpen = signal<boolean>(false);
  protected readonly spawnName = signal<string>('');
  protected readonly spawnCode = signal<string>('');
  protected readonly spawnAccent = signal<string>('zafiro');
  protected readonly spawnRecline = signal<number>(140);
  protected readonly builderOpen = signal<boolean>(false);
  protected readonly builderSpec = signal<BuildSpec | null>(null);
  protected readonly promptText = signal<string>('');
  protected readonly promptResult = signal<PromptResult | null>(null);
  protected readonly syncBundle = signal<SyncBundle | null>(null);
  protected readonly syncOpen = signal<boolean>(false);

  // ---- Chasis de interfaz (riel + barras flotantes) ----------------------
  protected readonly sidePanel = signal<SidePanel>('seats');
  protected readonly layerMenuOpen = signal<boolean>(false);
  protected readonly columnMenuOpen = signal<boolean>(false);
  protected readonly numberMenuOpen = signal<boolean>(false);
  protected readonly doorHintOpen = signal<boolean>(false);
  /** Modo Zen: riel y panel se retiran y queda una pestaña de 40px. */
  protected readonly zen = signal<boolean>(false);
  protected readonly fullscreen = signal<boolean>(false);
  /** Mientras dura el volteo 1+2 ⇄ 2+1 el chasis se comprime y vuelve. */
  protected readonly flipping = signal<boolean>(false);

  // ---- Asistente conversacional ------------------------------------------
  /** Texto del último bus descrito: cada respuesta lo reinterpreta entero. */
  protected readonly chatText = signal<string>('');
  protected readonly chatDraft = signal<string>('');
  protected readonly chatAnswers = signal<ChatAnswers>({});
  protected readonly chatLog = signal<ChatMessage[]>([]);
  protected readonly chatResponse = signal<ChatResponse | null>(null);

  /**
   * El sanitizador de Angular elimina `<svg>` de cualquier `innerHTML`. Este
   * SVG lo genera `SeatMapExportEngine` a partir de números y glifos fijos,
   * sin texto de usuario, así que es seguro marcarlo de confianza.
   */
  protected readonly syncSvg = computed<SafeHtml | null>(() => {
    const bundle = this.syncBundle();
    return bundle ? this.sanitizer.bypassSecurityTrustHtml(bundle.svg) : null;
  });

  private readonly viewportWidth = signal<number>(typeof window !== 'undefined' ? window.innerWidth : 1280);
  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly chatLogRef = viewChild<ElementRef<HTMLElement>>('chatScroll');
  private readonly gridRef = viewChild<ElementRef<HTMLElement>>('grid');

  private dragMode: DragMode = 'none';
  private lastPainted: CellKey | null = null;
  private lassoStart: CellPosition | null = null;
  private lassoMoved = false;
  private snakePath: CellPosition[] = [];
  private stampStart: { coord: number; length: number; step: number } | null = null;
  private lastFitKey = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // El chat crece hacia abajo: cada turno nuevo se deja a la vista. Se
    // desplaza el último mensaje y no el contenedor, porque quien tiene la
    // barra es el panel: `scrollIntoView` mueve lo justo en cada ancestro.
    effect(() => {
      this.chatLog();
      const log = this.chatLogRef()?.nativeElement;
      if (log) setTimeout(() => { log.scrollTop = log.scrollHeight; }, 60);
    });

    effect(() => {
      const vehicle = this.vehicle();
      if (vehicle && !this.store.present(vehicle.id)) this.store.layoutFor(vehicle);
    }, { allowSignalWrites: true });

    effect(() => {
      const deck = this.deck();
      // Ancho y largo del piso, más el estado del panel: cualquiera de los
      // tres cambia el espacio disponible para el chasis.
      const key = `${deck?.length ?? 0}:${deck?.width ?? 0}:${this.sidePanel()}:${this.zen()}:${this.fullscreen()}`;
      if (this.stageRef() && deck && key !== this.lastFitKey) {
        this.lastFitKey = key;
        // El panel se anima al abrir: se mide cuando ha terminado.
        setTimeout(() => this.fitToStage(), 240);
      }
    }, { allowSignalWrites: true });

    // El código sugerido sigue al nombre mientras el usuario no lo toque.
    effect(() => {
      const name = this.spawnName();
      const existing = this.catalogs.seatTypes.all().map(t => t.code);
      this.spawnCode.set(name.trim() ? SeatCodeEngine.suggest(name, existing) : '');
    }, { allowSignalWrites: true });

    this.destroyRef.onDestroy(() => { if (this.toastTimer) clearTimeout(this.toastTimer); });
  }

  // ==========================================
  // DERIVADOS
  // ==========================================
  protected readonly vehicle = computed<Vehicle | null>(() => this.vehiclesService.byId(this.vehicleId()));
  protected readonly layout = computed<VehicleLayout | null>(() => this.store.present(this.vehicleId()));
  protected readonly deck = computed<DeckLayout | null>(() => this.layout()?.decks[this.activeDeck()] ?? null);
  protected readonly stats = computed<LayoutStats | null>(() => {
    const layout = this.layout();
    return layout ? SeatLayoutEngine.stats(layout, this.vehicle()) : null;
  });
  protected readonly orientation = computed<Orientation>(() =>
    this.viewportWidth() < SEAT_LAYOUT_RULES.PORTRAIT_BREAKPOINT ? 'portrait' : 'landscape'
  );
  protected readonly canUndo = computed(() => this.store.canUndo(this.vehicleId()));
  protected readonly canRedo = computed(() => this.store.canRedo(this.vehicleId()));
  protected readonly isDirty = computed(() => this.store.isDirty(this.vehicleId()));
  protected readonly historySize = computed(() => this.store.historySize(this.vehicleId()));
  protected readonly historyIndex = computed(() => this.store.historyIndex(this.vehicleId()));
  protected readonly cloneSources = computed(() =>
    this.store.savedLayoutsExcept(this.vehicleId())
      .map(l => ({ layout: l, vehicle: this.vehiclesService.byId(l.vehicleId) }))
      .filter(x => !!x.vehicle)
  );

  protected readonly seatTypesCatalog = computed<readonly SeatType[]>(() =>
    this.catalogs.seatTypes.all().filter(t => t.status === 'ACTIVO')
  );

  protected readonly seatTools = computed<readonly SeatTool[]>(() =>
    this.seatTypesCatalog().map((type, index) => ({
      code: type.code, name: type.name, appearance: this.appearanceOf(type.code),
      shortcut: index < 9 ? String(index + 1) : ''
    }))
  );

  /** Puertas del piso activo como franjas en el borde de la carrocería. */
  protected readonly renderedDoors = computed<readonly { row: number; side: 'left' | 'right'; gridRow: number; gridCol: number; edge: 'top' | 'bottom' | 'left' | 'right' }[]>(() => {
    const deck = this.deck();
    if (!deck) return [];
    const landscape = this.orientation() === 'landscape';
    return (deck.doors ?? []).map(d => ({
      row: d.row, side: d.side,
      // Horizontal: lado derecho arriba, izquierdo abajo. Vertical: a los costados.
      gridRow: landscape ? (d.side === 'right' ? 1 : deck.width) : d.row + 1,
      gridCol: landscape ? d.row + 1 : (d.side === 'right' ? deck.width : 1),
      edge: landscape ? (d.side === 'right' ? 'top' : 'bottom') : (d.side === 'right' ? 'right' : 'left')
    }));
  });

  protected onDoorPointerDown(event: PointerEvent, door: { row: number; side: 'left' | 'right' }): void {
    if (this.preview()) return;
    event.preventDefault(); event.stopPropagation();
    if (this.tool().kind === 'erase') { this.commit(l => SeatLayoutEngine.removeDoor(l, this.activeDeck(), door.row, door.side)); this.notify('Puerta quitada'); }
  }

  protected readonly fixtureTools: readonly FixtureTool[] = (['door', 'bathroom', 'stairs', 'table'] as FixtureKind[])
    .map(kind => ({ kind, icon: SEAT_LAYOUT_RULES.FIXTURES[kind].icon, label: SEAT_LAYOUT_RULES.FIXTURES[kind].label }));

  protected readonly fareOptions = computed<readonly FareOption[]>(() =>
    this.catalogs.fareCategoryTypes.all()
      .filter(f => f.status === 'ACTIVO')
      .map(f => ({ id: f.id, name: f.name, rank: SeatTraitEngine.rankByName(f.name) ?? SEAT_LAYOUT_RULES.FARE_DEFAULT.rank }))
      .sort((a, b) => b.rank - a.rank)
  );

  protected readonly cellSize = computed<number>(() => {
    const raw = SEAT_LAYOUT_RULES.CELL.BASE_SIZE * this.zoom();
    return this.orientation() === 'portrait' ? Math.max(SEAT_LAYOUT_RULES.CELL.MIN_TOUCH_TARGET, raw) : raw;
  });
  protected readonly aisleSize = computed<number>(() => Math.round(this.cellSize() * SEAT_LAYOUT_RULES.CELL.AISLE_RATIO));

  protected readonly activeColumnPreset = computed<string>(() => {
    const deck = this.deck();
    return this.columnPresets.find(p => deck && p.left === deck.left && p.right === deck.right)?.id ?? '';
  });

  /** Rasgos derivados del piso activo, recalculados con cada cambio del plano. */
  private readonly deckTraits = computed<ReadonlyMap<CellKey, readonly SeatTrait[]>>(() => {
    const deck = this.deck();
    return deck ? SeatTraitEngine.traits(deck, this.activeDeck()) : new Map();
  });

  protected readonly renderedCells = computed<readonly RenderedCell[]>(() => {
    const deck = this.deck();
    if (!deck) return [];
    const landscape = this.orientation() === 'landscape';
    const deckIndex = this.activeDeck();
    const traits = this.deckTraits();
    const fares = this.fareOptions();
    const rankOf = (name: string) => fares.find(f => f.name === name)?.rank ?? SeatTraitEngine.rankByName(name);
    const out: RenderedCell[] = [];

    deck.cells.forEach((line, row) => {
      line.forEach((cell, col) => {
        const pos = { deck: deckIndex, row, col };
        const key = cellKey(pos);
        const cellTraits = traits.get(key) ?? [];
        let fare: RenderedCell['fare'] = null;
        let heat: RenderedCell['heat'] = null;
        if (cell.kind === 'seat') {
          const manualName = cell.fareCategoryId ? fares.find(f => f.id === cell.fareCategoryId)?.name ?? null : null;
          const assignment = SeatTraitEngine.fare(cellTraits, manualName, rankOf);
          fare = { name: assignment.fare, rank: assignment.rank, manual: assignment.manual };
          heat = (SEAT_LAYOUT_RULES.FARE_HEAT as Record<number, RenderedCell['heat']>)[assignment.rank] ?? null;
        }
        const exits = deck.emergencyExitRows ?? [];
        out.push({
          pos, key, cell,
          mampara: deckIndex === 0 && row === SEAT_LAYOUT_RULES.VESTIBULE.ROW && line.some(c => c.kind === 'cabin') && deck.length > 1,
          exit: exits.includes(row) ? (col === 0 ? 'left' : col === deck.width - 1 ? 'right' : null) : null,
          // Horizontal: el frente a la izquierda y, visto desde arriba, el
          // lado del conductor (col 0) queda ABAJO; las puertas, arriba.
          gridRow: landscape ? deck.width - col : row + 1,
          gridCol: landscape ? row + 1 : col + 1,
          appearance: cell.kind === 'seat' ? this.appearanceOf(cell.seatType) : null,
          fixture: SeatLayoutEngine.isFixture(cell.kind)
            ? { kind: cell.kind, icon: SEAT_LAYOUT_RULES.FIXTURES[cell.kind].icon, label: cell.kind === 'stairs' && deckIndex > 0 ? SEAT_LAYOUT_RULES.VESTIBULE.HOLE_LABEL : SEAT_LAYOUT_RULES.FIXTURES[cell.kind].label }
            : null,
          traits: cellTraits, fare, heat
        });
      });
    });
    return out;
  });

  protected readonly gridTemplate = computed<{ columns: string; rows: string }>(() => {
    const deck = this.deck();
    if (!deck) return { columns: '', rows: '' };
    const cell = `${this.cellSize()}px`, aisle = `${this.aisleSize()}px`;
    const across = Array.from({ length: deck.width }, (_, c) => (c === deck.aisleCol ? aisle : cell)).join(' ');
    const along = `repeat(${deck.length}, ${cell})`;
    return this.orientation() === 'landscape' ? { columns: along, rows: across } : { columns: across, rows: along };
  });

  protected readonly nextNumber = computed<number>(() => {
    const layout = this.layout();
    return layout ? SeatLayoutEngine.nextSeatNumber(layout) : 1;
  });

  /** Siguiente número que dará la serpiente, para el fantasma adelantado. */
  protected readonly snakeNext = computed<number>(() => this.snakePathLength() + 1);
  private readonly snakePathLength = signal<number>(0);

  protected readonly selectedCell = computed<LayoutCell | null>(() => {
    const layout = this.layout(), pos = this.selected();
    return layout && pos ? SeatLayoutEngine.cellAt(layout, pos) : null;
  });

  protected readonly selectionCount = computed(() => this.selection().size);

  /** Semáforo de coherencia: el rojo bloquea el guardado. */
  protected readonly lights = computed<TrafficLightCheck | null>(() => {
    const layout = this.layout();
    return layout ? SeatLayoutEngine.trafficLights(layout, this.vehicle()) : null;
  });

  /** Miniatura del Grid Builder: se redibuja con cada slider, antes de generar. */
  protected readonly builderPreview = computed(() => {
    const spec = this.builderSpec();
    if (!spec) return null;
    const layout = SeatLayoutEngine.buildFromSpec('preview', spec, this.numberingPlan(), this.scope());
    return layout.decks.map(deck => ({
      floor: deck.floor,
      width: deck.width,
      cells: deck.cells.flat().map(c => c.kind),
      seats: deck.cells.flat().filter(c => c.kind === 'seat').length
    }));
  });

  protected readonly builderSeats = computed(() => this.builderPreview()?.reduce((n, d) => n + d.seats, 0) ?? 0);

  // ==========================================
  // PUNTERO: LA HERRAMIENTA DEFINE EL ARRASTRE
  // ==========================================

  protected onCellPointerDown(event: PointerEvent, rendered: RenderedCell): void {
    if (this.preview()) return;
    event.preventDefault();
    const tool = this.tool();
    this.closeMenus();

    if (tool.kind === 'select') {
      this.dragMode = 'lasso';
      this.lassoStart = rendered.pos;
      this.lassoMoved = false;
      if (!event.shiftKey) this.selection.set(new Set());
      this.updateLasso(rendered.pos);
      return;
    }
    if (tool.kind === 'number') {
      this.dragMode = 'snake';
      this.snakePath = [];
      this.snakePoints.set([]);
      this.appendSnake(rendered);
      return;
    }
    if (tool.kind === 'move') {
      const kind = rendered.cell.kind;
      if (kind === 'empty' || kind === 'aisle' || kind === 'cabin') return;
      this.dragMode = 'move';
      this.moveSource.set(rendered.pos);
      this.moveTarget.set(null);
      this.ghost.set({ x: event.clientX, y: event.clientY });
      return;
    }
    this.selected.set(null);
    this.dragMode = 'paint';
    this.lastPainted = rendered.key;
    this.commit(layout => SeatLayoutEngine.applyTool(layout, rendered.pos, tool));
  }

  protected onStampPointerDown(event: PointerEvent): void {
    if (this.preview()) return;
    event.preventDefault();
    const deck = this.deck();
    if (!deck) return;
    this.dragMode = 'stamp';
    this.stampStart = {
      coord: this.orientation() === 'landscape' ? event.clientX : event.clientY,
      length: deck.length,
      step: this.cellSize() + SEAT_LAYOUT_RULES.CELL.GAP
    };
  }

  protected onDocumentPointerMove(event: PointerEvent): void {
    if (this.dragMode === 'none') return;
    if (this.dragMode === 'move') {
      this.ghost.set({ x: event.clientX, y: event.clientY });
      const over = this.renderedAt(event.clientX, event.clientY);
      const k = over?.cell.kind;
      this.moveTarget.set(over && k !== 'aisle' && k !== 'cabin' ? over.pos : null);
      return;
    }

    if (this.dragMode === 'stamp' && this.stampStart) {
      const coord = this.orientation() === 'landscape' ? event.clientX : event.clientY;
      const delta = Math.round((coord - this.stampStart.coord) / this.stampStart.step);
      const target = this.stampStart.length + delta;
      const deck = this.deck();
      if (deck && target !== deck.length) this.commit(l => SeatLayoutEngine.extendTo(l, this.activeDeck(), target));
      return;
    }

    const rendered = this.renderedAt(event.clientX, event.clientY);
    if (!rendered) return;

    if (this.dragMode === 'paint') {
      if (rendered.key === this.lastPainted) return;
      this.lastPainted = rendered.key;
      this.commit(layout => SeatLayoutEngine.applyTool(layout, rendered.pos, this.tool()));
    } else if (this.dragMode === 'lasso' && this.lassoStart) {
      if (rendered.pos.row !== this.lassoStart.row || rendered.pos.col !== this.lassoStart.col) this.lassoMoved = true;
      this.updateLasso(rendered.pos);
    } else if (this.dragMode === 'snake') {
      this.appendSnake(rendered);
    }
  }

  protected onPointerUp(): void {
    const mode = this.dragMode;
    this.dragMode = 'none';

    // El borrador compacta al soltar: durante el arrastre los números
    // bailarían bajo el dedo y sería imposible apuntar.
    if (mode === 'paint' && this.tool().kind === 'erase') {
      const layout = this.layout();
      if (layout && SeatLayoutEngine.needsCompaction(layout)) {
        this.commit(l => SeatLayoutEngine.recompact(l, this.scope()));
        this.notify('Numeración compactada: la serie no deja huecos');
      }
    }

    if (mode === 'move') {
      const from = this.moveSource(), to = this.moveTarget();
      this.moveSource.set(null); this.moveTarget.set(null); this.ghost.set(null);
      if (from && to && (from.row !== to.row || from.col !== to.col)) {
        const target = this.layout() ? SeatLayoutEngine.cellAt(this.layout()!, to) : null;
        this.commit(l => SeatLayoutEngine.moveCell(l, from, to));
        // La butaca aterriza en su nuevo sitio con un rebote corto.
        this.landedKey.set(cellKey(to));
        if (this.landedTimer) clearTimeout(this.landedTimer);
        this.landedTimer = setTimeout(() => this.landedKey.set(null), SEAT_LAYOUT_RULES.ANIMATION.LAND_MS);
        this.notify(target?.kind === 'empty' ? 'Butaca movida' : 'Posiciones intercambiadas');
      }
      return;
    }

    if (mode === 'lasso' && this.lassoStart) {
      // Un clic sin arrastre sobre una butaca abre su popover.
      if (!this.lassoMoved) {
        const cell = this.layout() ? SeatLayoutEngine.cellAt(this.layout()!, this.lassoStart) : null;
        this.selected.set(cell?.kind === 'seat' ? this.lassoStart : null);
        if (cell?.kind !== 'seat') this.selection.set(new Set());
      } else {
        this.selected.set(null);
      }
      this.lassoRect.set(null);
      this.lassoStart = null;
    } else if (mode === 'snake') {
      if (this.snakePath.length) {
        const path = [...this.snakePath];
        this.commit(layout => SeatLayoutEngine.renumberPath(layout, path));
        this.notify(`${path.length} butacas numeradas siguiendo tu trazo`);
      }
      this.snakePath = [];
      this.snakePathLength.set(0);
      this.snakePoints.set([]);
    }
    this.lastPainted = null;
    this.stampStart = null;
  }

  private renderedAt(x: number, y: number): RenderedCell | null {
    const target = document.elementFromPoint(x, y) as HTMLElement | null;
    const key = target?.closest<HTMLElement>('[data-cell]')?.dataset['cell'];
    return key ? this.renderedCells().find(c => c.key === key) ?? null : null;
  }

  private updateLasso(end: CellPosition): void {
    const deck = this.deck();
    const start = this.lassoStart;
    if (!deck || !start) return;
    const keys = SeatLayoutEngine.keysInRect(deck, this.activeDeck(), start.row, start.col, end.row, end.col);
    this.selection.update(prev => new Set([...prev, ...keys]));
    // Rectángulo visual: unión de las cajas de las celdas extremas, relativa a la retícula.
    const grid = this.gridRef()?.nativeElement;
    const a = grid?.querySelector<HTMLElement>(`[data-cell="${cellKey(start)}"]`)?.getBoundingClientRect();
    const b = grid?.querySelector<HTMLElement>(`[data-cell="${cellKey(end)}"]`)?.getBoundingClientRect();
    const g = grid?.getBoundingClientRect();
    if (a && b && g) {
      const x1 = Math.min(a.left, b.left) - g.left, y1 = Math.min(a.top, b.top) - g.top;
      const x2 = Math.max(a.right, b.right) - g.left, y2 = Math.max(a.bottom, b.bottom) - g.top;
      this.lassoRect.set({ x: x1 - 3, y: y1 - 3, w: x2 - x1 + 6, h: y2 - y1 + 6 });
    }
  }

  private appendSnake(rendered: RenderedCell): void {
    if (rendered.cell.kind !== 'seat') return;
    if (this.snakePath.some(p => p.row === rendered.pos.row && p.col === rendered.pos.col)) return;
    this.snakePath.push(rendered.pos);
    this.snakePathLength.set(this.snakePath.length);
    const grid = this.gridRef()?.nativeElement;
    const el = grid?.querySelector<HTMLElement>(`[data-cell="${rendered.key}"]`)?.getBoundingClientRect();
    const g = grid?.getBoundingClientRect();
    if (el && g) this.snakePoints.update(pts => [...pts, { x: el.left + el.width / 2 - g.left, y: el.top + el.height / 2 - g.top }]);
  }

  protected snakePolyline(): string {
    return this.snakePoints().map(p => `${p.x},${p.y}`).join(' ');
  }

  protected onCellHover(rendered: RenderedCell | null): void { this.hovered.set(rendered?.pos ?? null); }
  protected isHovered(r: RenderedCell): boolean { const h = this.hovered(); return !!h && h.row === r.pos.row && h.col === r.pos.col && h.deck === r.pos.deck; }
  protected isSelected(r: RenderedCell): boolean { const s = this.selected(); return !!s && s.row === r.pos.row && s.col === r.pos.col && s.deck === r.pos.deck; }
  protected inSelection(r: RenderedCell): boolean { return this.selection().has(r.key); }
  protected inSnake(r: RenderedCell): number | null {
    const i = this.snakePath.findIndex(p => p.row === r.pos.row && p.col === r.pos.col);
    return i >= 0 ? i + 1 : null;
  }
  protected ghostNumber(r: RenderedCell): number | null {
    if (!this.isHovered(r)) return null;
    const tool = this.tool();
    if (tool.kind === 'seat' && r.cell.kind === 'empty') return this.nextNumber();
    if (tool.kind === 'number' && r.cell.kind === 'seat' && this.dragMode === 'snake' && this.inSnake(r) === null) return this.snakeNext();
    return null;
  }

  // ==========================================
  // HERRAMIENTAS
  // ==========================================
  protected selectSeatTool(code: SeatTypeCode): void { this.tool.set({ kind: 'seat', seatType: code }); this.selected.set(null); }
  protected selectFixtureTool(kind: FixtureKind): void { this.tool.set({ kind: 'fixture', fixture: kind }); this.selected.set(null); }
  protected isMoveSource(r: RenderedCell): boolean { const m = this.moveSource(); return !!m && m.row === r.pos.row && m.col === r.pos.col && m.deck === r.pos.deck; }
  /** Lo que se vende lleva número; lo que no (ambulatorio, relevo), un punto. */
  protected seatLabelOf(cell: LayoutCell): string {
    return cell.kind === 'seat' && SeatLayoutEngine.isSellable(cell.seatType) ? String(cell.number) : '·';
  }

  protected isLanded(r: RenderedCell): boolean { return this.landedKey() === r.key; }
  protected isMoveTarget(r: RenderedCell): boolean { const m = this.moveTarget(); return !!m && m.row === r.pos.row && m.col === r.pos.col && m.deck === r.pos.deck; }
  protected selectTool(kind: 'select' | 'erase' | 'number' | 'move'): void { this.tool.set({ kind }); if (kind !== 'select') { this.selected.set(null); this.selection.set(new Set()); } }
  protected isSeatToolActive(code: SeatTypeCode): boolean { const t = this.tool(); return t.kind === 'seat' && t.seatType === code; }
  protected isFixtureToolActive(kind: FixtureKind): boolean { const t = this.tool(); return t.kind === 'fixture' && t.fixture === kind; }
  protected isToolActive(kind: DesignerTool['kind']): boolean { return this.tool().kind === kind; }
  protected setDeck(index: number): void { this.activeDeck.set(index); this.selected.set(null); this.selection.set(new Set()); }
  protected setLayer(layer: InspectionLayer): void { this.layer.set(layer); }
  protected togglePreview(): void { this.preview.update(v => !v); this.selected.set(null); this.selection.set(new Set()); }

  // ==========================================
  // SELECCIÓN MASIVA
  // ==========================================
  protected selectionSetType(code: SeatTypeCode): void { this.commit(l => SeatLayoutEngine.applyToSelection(l, this.selection(), { kind: 'seatType', seatType: code })); this.notify(`${this.selectionCount()} butacas → ${this.appearanceOf(code).label}`); }
  protected selectionSetFare(id: string | null): void { this.commit(l => SeatLayoutEngine.applyToSelection(l, this.selection(), { kind: 'fare', fareCategoryId: id })); this.layer.set('fare'); }
  protected selectionToggleAmenity(amenity: Amenity, on: boolean): void { this.commit(l => SeatLayoutEngine.applyToSelection(l, this.selection(), { kind: 'amenity', amenity, on })); this.layer.set('amenities'); }
  protected selectionShift(delta: number): void {
    const before = this.layout();
    this.commit(l => SeatLayoutEngine.shiftSelection(l, this.selection(), delta));
    if (this.layout() === before) { this.notify('No hay sitio libre para mover el bloque'); return; }
    this.selection.update(keys => new Set([...keys].map(k => { const p = parseKey(k); return cellKey({ ...p, row: p.row + delta }); })));
  }
  protected selectionErase(): void { this.commit(l => SeatLayoutEngine.applyToSelection(l, this.selection(), { kind: 'erase' }), true); this.selection.set(new Set()); }
  protected clearSelection(): void { this.selection.set(new Set()); }
  protected selectionHasAmenity(amenity: Amenity): boolean {
    const layout = this.layout();
    if (!layout) return false;
    return [...this.selection()].every(k => { const c = SeatLayoutEngine.cellAt(layout, parseKey(k)); return c?.kind === 'seat' && (c.amenities ?? []).includes(amenity); });
  }

  // ==========================================
  // CONSTRUCCIÓN
  // ==========================================
  protected setColumns(presetId: string): void {
    const preset = this.columnPresets.find(p => p.id === presetId);
    if (preset) { this.commit(l => SeatLayoutEngine.resizeWidth(l, this.activeDeck(), preset.left, preset.right)); this.selection.set(new Set()); }
  }
  protected duplicateRow(): void {
    const deck = this.deck();
    if (!deck) return;
    const row = this.selected()?.row ?? (this.selection().size ? Math.max(...[...this.selection()].map(k => parseKey(k).row)) : deck.length - 1);
    this.commit(l => SeatLayoutEngine.duplicateRow(l, this.activeDeck(), row));
    this.notify('Fila duplicada');
  }
  protected applyPreset(preset: ChassisPreset): void {
    this.presetsOpen.set(false);
    this.ensureSeatTypes(preset.seatTypes);
    this.commit(() => SeatLayoutEngine.fromPreset(this.vehicleId(), preset, this.numberingPlan(), this.scope()));
    this.activeDeck.set(0);
    this.notify(`Chasis "${preset.label}" armado`);
  }
  protected cloneFrom(sourceVehicleId: string): void {
    const source = this.cloneSources().find(s => s.layout.vehicleId === sourceVehicleId);
    if (source) { this.commit(() => SeatLayoutEngine.cloneFrom(source.layout, this.vehicleId())); this.notify(`Plano clonado de ${source.vehicle?.plate}`); }
  }

  // ==========================================
  // NUMERACIÓN
  // ==========================================
  protected autoNumber(): void { this.commit(l => SeatLayoutEngine.autoNumber(l, this.numberingPlan(), this.scope(), this.direction())); this.notify('Numeración continua aplicada'); }
  /** Cambia la regla SOLO del piso activo (numeración asimétrica por piso). */
  protected setStrategy(s: NumberingStrategy): void {
    if (s === this.strategy()) return;
    const floors = this.layout()?.decks.length ?? 1;
    const plan = Array.from({ length: floors }, (_, i) => this.deckStrategies()[i] ?? this.strategy());
    plan[this.activeDeck()] = s;
    this.deckStrategies.set(plan);
    this.autoNumber();
  }
  private setNumberingByDeck(n: NumberingByDeck): void {
    this.deckStrategies.set(n.deck_2 ? [n.deck_1, n.deck_2] : [n.deck_1]);
  }
  protected setScope(s: NumberingScope): void { if (s !== this.scope()) { this.scope.set(s); this.autoNumber(); } }
  protected mirror(): void { this.commit(l => SeatLayoutEngine.mirror(l, this.activeDeck(), this.numberingPlan(), this.scope())); this.notify('Lado izquierdo reflejado a la derecha'); }

  /**
   * 1+2 ⇄ 2+1. El chasis se comprime, las columnas se permutan en el punto
   * ciego de la animación y se vuelve a abrir: un volteo, no un parpadeo.
   */
  protected swapSides(): void {
    const deck = this.deck();
    if (!deck || this.flipping()) return;
    const { FLIP_MS } = SEAT_LAYOUT_RULES.ANIMATION;
    this.flipping.set(true);
    setTimeout(() => {
      this.commit(l => SeatLayoutEngine.swapSides(l, this.activeDeck(), this.numberingPlan(), this.scope()));
      this.notify(`Lados invertidos: ${this.schemeLabel()} · ${SEAT_LAYOUT_RULES.NUMBERING.LABELS[this.strategy()]}`);
    }, FLIP_MS / 2);
    setTimeout(() => this.flipping.set(false), FLIP_MS);
  }

  protected schemeLabel(): string {
    const deck = this.deck();
    return deck ? `${deck.left}+${deck.right}` : '—';
  }
  protected fillTemplate(): void {
    const tool = this.tool();
    const seatType = tool.kind === 'seat' ? tool.seatType : this.seatTools()[0]?.code ?? 'EST';
    this.commit(l => SeatLayoutEngine.fillTemplate(l, this.activeDeck(), seatType, this.numberingPlan(), this.scope()));
    this.notify(`Plantilla aplicada con butacas ${this.appearanceOf(seatType).label}`);
  }
  protected clearDeck(): void { this.commit(l => SeatLayoutEngine.clearDeck(l, this.activeDeck())); this.selected.set(null); this.selection.set(new Set()); this.notify('Piso vaciado'); }
  protected resizeDeck(delta: number): void { const d = this.deck(); if (d) this.commit(l => SeatLayoutEngine.resizeDeck(l, this.activeDeck(), d.length + delta)); }

  // ---- Popover ----
  protected changeSelectedType(code: SeatTypeCode): void { const pos = this.selected(); if (pos) this.commit(l => SeatLayoutEngine.placeSeat(l, pos, code)); }
  protected renumberSelected(value: string): void { const pos = this.selected(); const n = Number(value); if (pos && Number.isFinite(n)) this.commit(l => SeatLayoutEngine.renumberSeat(l, pos, n)); }
  protected insertSelectedNumber(value: string): void {
    const pos = this.selected(); const n = Number(value);
    if (pos && Number.isFinite(n)) { this.commit(l => SeatLayoutEngine.insertNumber(l, pos, n)); this.notify(`Butaca ${n} insertada: las siguientes suben +1`); }
  }
  protected deleteSelected(): void { const pos = this.selected(); if (pos) { this.commit(l => SeatLayoutEngine.applyTool(l, pos, { kind: 'erase' }), true); this.selected.set(null); } }
  protected closePopover(): void { this.selected.set(null); }

  // ==========================================
  // SPAWNER
  // ==========================================
  protected openSpawner(): void { this.spawnerOpen.set(true); this.presetsOpen.set(false); this.spawnName.set(''); this.spawnAccent.set('zafiro'); this.spawnRecline.set(140); }
  protected spawnSeatType(): void {
    const name = this.spawnName().trim();
    if (!name) return;
    const code = this.spawnCode().trim().toUpperCase() || SeatCodeEngine.suggest(name, this.catalogs.seatTypes.all().map(t => t.code));
    this.catalogs.seatTypes.add({
      id: `seat-${code.toLowerCase()}-${Date.now().toString(36)}`, code, name,
      description: `Reclinación ${this.spawnRecline()}°`, status: 'ACTIVO',
      accent: this.spawnAccent(), reclineDegrees: this.spawnRecline()
    });
    this.spawnerOpen.set(false);
    this.selectSeatTool(code);
    this.notify(`Tipo "${name}" creado y seleccionado`);
  }
  private ensureSeatTypes(codes: readonly SeatTypeCode[]): void {
    const existing = new Set(this.catalogs.seatTypes.all().map(t => t.code));
    for (const code of codes) {
      if (!existing.has(code)) {
        const a = (SEAT_LAYOUT_RULES.SEAT_APPEARANCE as Record<string, SeatAppearance>)[code];
        this.catalogs.seatTypes.add({ id: `seat-${code.toLowerCase()}`, code, name: a?.label ?? code, description: '', status: 'ACTIVO' });
      }
    }
  }

  // ==========================================
  // HISTORIAL Y GUARDADO
  // ==========================================
  protected undo(): void { this.store.undo(this.vehicleId()); this.selected.set(null); }
  protected redo(): void { this.store.redo(this.vehicleId()); this.selected.set(null); }
  protected jumpTo(value: string): void { this.store.jumpTo(this.vehicleId(), Number(value)); this.selected.set(null); this.selection.set(new Set()); }
  protected save(): void {
    const lights = this.lights();
    if (lights && !lights.canSave) {
      this.notify(lights.blocking[0]?.message ?? 'El plano tiene un error que impide guardar');
      this.jumpToIssue();
      return;
    }
    this.store.save(this.vehicleId());
    const layout = this.layout();
    if (layout) {
      this.syncBundle.set(SeatMapExportEngine.bundle(layout, this.enricher(layout)));
      this.syncOpen.set(true);
    }
    this.notify('Guardado y sincronizado en 4 canales');
  }

  /** Salta a la primera celda culpable de un rojo y la selecciona. */
  protected jumpToIssue(): void {
    const issue = this.lights()?.firstIssue;
    if (!issue) return;
    this.setDeck(issue.deck);
    this.tool.set({ kind: 'select' });
    this.selected.set(issue);
    setTimeout(() => this.gridRef()?.nativeElement.querySelector<HTMLElement>(`[data-cell="${cellKey(issue)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }

  /** Tarifa y rasgos de cualquier piso, para las salidas de Smart Sync. */
  private enricher(layout: VehicleLayout) {
    const traitsByDeck = layout.decks.map((d, i) => SeatTraitEngine.traits(d, i));
    const fares = this.fareOptions();
    const rankOf = (name: string) => fares.find(f => f.name === name)?.rank ?? SeatTraitEngine.rankByName(name);
    return {
      traits: (pos: CellPosition) => traitsByDeck[pos.deck]?.get(cellKey(pos)) ?? [],
      fare: (pos: CellPosition) => {
        const cell = SeatLayoutEngine.cellAt(layout, pos);
        if (cell?.kind !== 'seat') return null;
        const manual = cell.fareCategoryId ? fares.find(f => f.id === cell.fareCategoryId)?.name ?? null : null;
        return SeatTraitEngine.fare(traitsByDeck[pos.deck]?.get(cellKey(pos)) ?? [], manual, rankOf).fare;
      }
    };
  }

  protected download(kind: 'svg' | 'csv' | 'grid' | 'mobile'): void {
    const bundle = this.syncBundle();
    const vehicle = this.vehicle();
    if (!bundle || !vehicle) return;
    const files = {
      svg: { name: `${vehicle.plate}-plano.svg`, type: 'image/svg+xml', body: bundle.svg },
      csv: { name: `${vehicle.plate}-manifiesto.csv`, type: 'text/csv', body: bundle.manifestCsv },
      grid: { name: `${vehicle.plate}-boleteria.json`, type: 'application/json', body: JSON.stringify(bundle.salesGrid, null, 2) },
      mobile: { name: `${vehicle.plate}-app.json`, type: 'application/json', body: JSON.stringify(bundle.mobileMap, null, 2) }
    }[kind];
    const url = URL.createObjectURL(new Blob([files.body], { type: files.type }));
    const a = document.createElement('a');
    a.href = url; a.download = files.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  protected bytes(text: string): string {
    const n = new Blob([text]).size;
    return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
  }

  // ==========================================
  // GRID BUILDER · QUICK PROMPT · DIGITAL TWIN
  // ==========================================
  protected openBuilder(): void {
    const layout = this.layout();
    if (layout) this.builderSpec.set(SeatLayoutEngine.specOf(layout));
    this.builderOpen.set(true); this.presetsOpen.set(false); this.spawnerOpen.set(false);
  }
  protected patchBuilder(patch: Partial<BuildSpec>): void {
    this.builderSpec.update(spec => spec ? { ...spec, ...patch } : spec);
  }
  protected patchBuilderDeck(index: number, patch: Partial<BuildSpec['decks'][number]>): void {
    this.builderSpec.update(spec => {
      if (!spec) return spec;
      const decks = spec.decks.map((d, i) => (i === index ? { ...d, ...patch } : d));
      return { ...spec, decks };
    });
  }
  protected builderRows(index: number, delta: number): void {
    const spec = this.builderSpec();
    const current = spec?.decks[index]?.length ?? 10;
    const { MIN_LENGTH, MAX_LENGTH } = SEAT_LAYOUT_RULES.GRID;
    this.patchBuilderDeck(index, { length: Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, current + delta)) });
  }
  protected builderFloors(floors: 1 | 2): void {
    this.builderSpec.update(spec => {
      if (!spec) return spec;
      const decks = floors === 2
        ? (spec.decks.length === 2 ? spec.decks : [spec.decks[0], { length: spec.decks[0].length + 4, left: 2, right: 2, seatType: 'SEM' }])
        : [spec.decks[0]];
      return { ...spec, decks, stairs: floors === 2 ? (spec.stairs === 'none' ? 'middle-left' : spec.stairs) : 'none' };
    });
  }
  protected builderScheme(index: number, id: string): void {
    const preset = this.columnPresets.find(p => p.id === id);
    if (preset) this.patchBuilderDeck(index, { left: preset.left, right: preset.right });
  }
  protected generateFromBuilder(): void {
    const spec = this.builderSpec();
    if (!spec) return;
    this.commit(() => SeatLayoutEngine.buildFromSpec(this.vehicleId(), spec, this.numberingPlan(), this.scope()));
    this.builderOpen.set(false); this.activeDeck.set(0);
    this.notify(`Bus generado: ${this.builderSeats()} butacas`);
  }

  /** El texto mueve los selectores del Grid Builder antes de generar nada. */
  protected onPrompt(text: string): void {
    this.promptText.set(text);
    const result = text.trim() ? SeatPromptEngine.parse(text) : null;
    this.promptResult.set(result);
    if (result?.spec) this.builderSpec.set(result.spec);
  }
  protected generateFromPrompt(): void {
    const result = this.promptResult();
    if (!result?.spec) { this.notify('No entendí el bus: prueba "abajo 12 camas, arriba 40 semicama"'); return; }
    this.commit(() => SeatLayoutEngine.buildFromSpec(this.vehicleId(), result.spec!, this.numberingPlan(), this.scope()));
    this.activeDeck.set(0);
    this.notify(`Bus armado desde el texto: ${result.understood.join(' · ')}`);
  }

  // ---- Asistente conversacional ------------------------------------------

  /** Enviar una descripción nueva reinicia las respuestas: es otro bus. */
  /**
   * Con el lienzo vacío, todo mensaje describe un bus nuevo. Con un plano ya
   * dibujado, primero se mira si es un RETOQUE ("renumera el segundo piso"):
   * en ese caso se aplica sobre el plano y NO se reinicia la conversación.
   * Si el retoque no se entiende, el turno cae al flujo de creación.
   */
  protected chatSend(): void {
    const text = this.chatDraft().trim();
    if (!text) return;
    this.chatLog.update(log => [...log, { role: 'user', text }]);
    this.chatDraft.set('');

    if (this.hasDrawnLayout() && SeatMutationEngine.isMutation(text, true) && this.chatMutate(text)) return;

    this.chatText.set(text);
    this.chatAnswers.set({});
    this.chatEvaluate();
  }

  /** `true` si el comando se resolvió como mutación (aplicada o ya vigente). */
  private chatMutate(text: string): boolean {
    const layout = this.layout();
    if (!layout) return false;
    const result = SeatMutationEngine.apply(layout, text, {
      plan: layout.decks.map((_, i) => SeatLayoutEngine.strategyFor(this.deckStrategies().length ? this.deckStrategies() : undefined, i)),
      scope: this.scope(),
      activeDeck: this.activeDeck(),
      direction: this.direction(),
      catalog: this.chatCatalog()
    });
    if (result.status === 'unknown') return false;

    if (result.status === 'applied' && result.layout) {
      if (result.numbering) this.deckStrategies.set(result.numbering);
      if (result.scope) this.scope.set(result.scope);
      if (result.direction) this.direction.set(result.direction);
      const next = result.layout;
      this.commit(() => next);
      if (result.deckIndex !== null) this.setDeck(result.deckIndex);
      this.notify({ swap: 'Lados invertidos', quantity: 'Plazas actualizadas', seat: 'Butaca actualizada', range: 'Tipos aplicados', direction: 'Sentido de numeración', scope: 'Alcance actualizado', numbering: 'Numeración actualizada' }[result.kind ?? 'numbering'] ?? 'Plano actualizado');
    }
    this.chatLog.update(log => [...log, { role: 'assistant', text: result.message, status: 'ready' }]);
    return true;
  }

  /** Hay un plano con butacas sobre el que retocar. */
  private hasDrawnLayout(): boolean { return (this.stats()?.totalSeats ?? 0) > 0; }

  /** Cada clic responde una pregunta y vuelve a evaluar el contrato completo. */
  protected chatAnswer(questionId: string, optionId: string, label: string): void {
    this.chatAnswers.update(a => ({ ...a, [questionId]: optionId }));
    this.chatLog.update(log => [...log, { role: 'user', text: label }]);
    this.chatEvaluate();
  }

  protected chatPicked(questionId: string): string | undefined { return this.chatAnswers()[questionId]; }

  /** El catálogo activo, en la forma mínima que entiende el asistente. */
  private chatCatalog(): readonly { code: string; name: string }[] {
    return this.seatTypesCatalog().map(t => ({ code: t.code, name: t.name }));
  }

  protected chatApply(): void {
    const response = this.chatResponse();
    if (!response?.spec) return;
    if (response.numbering) this.setNumberingByDeck(response.numbering);
    const said = SeatPromptEngine.parse(this.chatText(), this.chatCatalog()).direction;
    if (said) this.direction.set(said);
    // Tipos pedidos al vuelo: inyección reactiva al catálogo local.
    for (const t of response.newSeatTypes) {
      if (!this.catalogs.seatTypes.all().some(x => x.code === t.code)) {
        this.catalogs.seatTypes.add({ id: `seat-${t.code.toLowerCase()}-${Date.now().toString(36)}`, code: t.code, name: t.name, description: 'Creado desde el asistente', status: 'ACTIVO', accent: 'violeta', reclineDegrees: 140 });
      }
    }
    this.ensureSeatTypes(response.spec.decks.flatMap(d => [d.seatType, ...(d.rowOverrides ?? []).map(o => o.seatType)]));
    this.commit(() => SeatLayoutEngine.buildFromSpec(this.vehicleId(), response.spec!, this.numberingPlan(), this.scope()));
    this.activeDeck.set(0);
    this.chatLog.update(log => [...log, { role: 'assistant', text: `Listo: ${this.stats()?.totalSeats ?? 0} butacas en el chasis. Ahora puedes pedirme retoques ("renumera el segundo piso", "invierte las columnas") o seguir a mano con las herramientas.` }]);
    // El bus ya está armado: se retira el botón para que un segundo clic no
    // rehaga el plano y borre los retoques posteriores.
    this.chatResponse.set(null);
    this.notify('Bus armado desde el asistente');
  }

  protected chatReset(): void {
    this.chatText.set(''); this.chatDraft.set(''); this.chatAnswers.set({}); this.chatLog.set([]); this.chatResponse.set(null);
  }

  private chatEvaluate(): void {
    const response = SeatChatEngine.respond(this.chatText(), this.chatAnswers(), this.chatCatalog());
    this.chatResponse.set(response);
    this.chatLog.update(log => [...log, { role: 'assistant', text: response.message, questions: response.questions, status: response.status }]);
    this.promptResult.set(SeatPromptEngine.parse(this.chatText(), this.chatCatalog()));
    if (response.spec) this.builderSpec.set(response.spec);
  }

  protected applyBody(body: BodyTemplate): void {
    this.presetsOpen.set(false);
    this.ensureSeatTypes(body.spec.decks.map(d => d.seatType));
    this.commit(() => SeatLayoutEngine.fromBody(this.vehicleId(), body, this.numberingPlan(), this.scope()));
    this.activeDeck.set(0);
    this.notify(`Carrocería ${body.brand} ${body.model} importada (referencia)`);
  }



  // ==========================================
  // CHASIS DE INTERFAZ
  // ==========================================

  /** Alterna la pestaña del riel; volver a pulsar la activa pliega el panel. */
  protected togglePanel(panel: SidePanel): void {
    this.sidePanel.update(current => (current === panel ? 'none' : panel));
    this.closeMenus();
  }

  protected isPanel(panel: SidePanel): boolean { return this.sidePanel() === panel; }

  /** Ocultar panel: riel y panel se retiran; queda una pestaña para volver. */
  protected hidePanel(): void { this.zen.set(true); this.closeMenus(); }
  protected showPanel(): void { this.zen.set(false); if (this.sidePanel() === 'none') this.sidePanel.set('seats'); }

  /** Expandir: el diseñador ocupa la pantalla completa (API Fullscreen). */
  protected toggleFullscreen(): void {
    const el = this.host.nativeElement;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void el.requestFullscreen?.();
  }
  protected onFullscreenChange(): void { this.fullscreen.set(!!document.fullscreenElement); }

  protected closeMenus(): void {
    this.layerMenuOpen.set(false);
    this.columnMenuOpen.set(false);
    this.numberMenuOpen.set(false);
    this.presetsOpen.set(false);
    this.doorHintOpen.set(false);
  }

  /** Abre un menú flotante cerrando los demás: nunca hay dos abiertos. */
  protected openMenu(menu: 'layer' | 'column' | 'number' | 'chassis'): void {
    const wasOpen = { layer: this.layerMenuOpen(), column: this.columnMenuOpen(), number: this.numberMenuOpen(), chassis: this.presetsOpen() }[menu];
    this.closeMenus();
    if (wasOpen) return;
    ({ layer: this.layerMenuOpen, column: this.columnMenuOpen, number: this.numberMenuOpen, chassis: this.presetsOpen })[menu].set(true);
  }

  // ---- Etiquetas de los semáforos ----------------------------------------

  protected capacityLabel(): string {
    const s = this.stats();
    return s ? `${s.totalSeats}/${s.capacity} plazas` : '—';
  }

  protected exitsLabel(): string {
    const light = this.lights()?.exits;
    return light === 'red' ? 'Sin puerta' : light === 'amber' ? 'Sin escalera' : 'Salidas OK';
  }

  protected numberingLabel(): string {
    const light = this.lights()?.numbering;
    return light === 'red' ? 'Números duplicados' : light === 'amber' ? 'Numeración con huecos' : 'Numeración OK';
  }

  protected layerLabel(): string {
    return { passenger: 'Pasajero', fare: 'Tarifa', amenities: 'Equipamiento' }[this.layer()];
  }

  protected layerIcon(): string {
    return { passenger: 'ticket', fare: 'thermo', amenities: 'usb' }[this.layer()];
  }

  protected columnLabel(): string { return this.activeColumnPreset() || 'libre'; }

  protected strategyLabel(): string {
    return `${SEAT_LAYOUT_RULES.NUMBERING.LABELS[this.strategy()]} · ${this.scope() === 'continuous' ? 'corrida' : 'por piso'}`;
  }

  /** Pulsar un semáforo: el rojo de salidas ofrece la corrección en un clic. */
  protected onLightClick(kind: 'capacity' | 'exits' | 'numbering'): void {
    const lights = this.lights();
    if (!lights) return;
    if (kind === 'exits' && lights.exits === 'red') { this.doorHintOpen.update(v => !v); return; }
    if ((kind === 'capacity' && lights.capacity === 'red') || (kind === 'numbering' && lights.numbering === 'red')) this.jumpToIssue();
  }

  /** Coloca la puerta delantera en la ventana derecha de la planta baja. */
  protected placeFrontDoor(): void {
    const deck = this.layout()?.decks[0];
    this.doorHintOpen.set(false);
    if (!deck) return;
    const col = deck.right > 0 ? deck.width - 1 : 0;
    this.setDeck(0);
    this.commit(l => SeatLayoutEngine.addDoor(l, 0, 0, 'right'));
    this.notify('Puerta delantera colocada');
  }
  protected revert(): void { this.store.revert(this.vehicleId()); this.selected.set(null); this.notify('Cambios descartados'); }
  protected goBack(): void { this.router.navigate(['/vehiculos']); }

  protected zoomBy(delta: number): void {
    const { MIN, MAX } = SEAT_LAYOUT_RULES.ZOOM;
    this.zoom.update(z => Math.min(MAX, Math.max(MIN, Math.round((z + delta) * 10) / 10)));
  }
  /**
   * Ajusta el zoom para que el chasis llene el escenario sin desbordarlo.
   * Mide las DOS dimensiones y toma la menor: con solo el ancho, un bus de
   * pocas filas se acercaba tanto que se salía por arriba y por abajo.
   */
  protected fitToStage(): void {
    const stage = this.stageRef()?.nativeElement, deck = this.deck();
    if (!stage || !deck || this.orientation() === 'portrait') return;
    const { BASE_SIZE, GAP } = SEAT_LAYOUT_RULES.CELL, { MIN, MAX } = SEAT_LAYOUT_RULES.ZOOM;

    // Cromo alrededor de la retícula: padding del escenario, rótulos de
    // frente/atrás, carrocería y asa de estampado.
    const chromeX = 24 * 2 + 60 + 32 + 30;
    const chromeY = 72 + 86 + 32 + 30;   // +rótulos de lado
    const availableX = Math.max(120, stage.clientWidth - chromeX);
    const availableY = Math.max(120, stage.clientHeight - chromeY);

    const along = deck.length * BASE_SIZE + (deck.length - 1) * GAP;
    const across = deck.width * BASE_SIZE + (deck.width - 1) * GAP;

    const fitted = Math.floor(Math.min(availableX / along, availableY / across) * 10) / 10;
    this.zoom.set(Math.min(MAX, Math.max(MIN, fitted)));
  }

  // ==========================================
  // TECLADO
  // ==========================================
  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
    const key = event.key.toLowerCase();
    const S = SEAT_LAYOUT_RULES.SHORTCUTS;
    const mod = event.metaKey || event.ctrlKey;

    if (mod && key === S.UNDO) { event.preventDefault(); event.shiftKey ? this.redo() : this.undo(); return; }
    if (mod && key === S.REDO) { event.preventDefault(); this.redo(); return; }
    if (mod && key === S.DUPLICATE) { event.preventDefault(); this.duplicateRow(); return; }
    if (mod || event.altKey) return;

    if (key === 'escape') { this.selected.set(null); this.selection.set(new Set()); this.spawnerOpen.set(false); this.builderOpen.set(false); this.syncOpen.set(false); this.closeMenus(); }
    else if (key === S.SELECT) this.selectTool('select');
    else if (key === S.ERASE) this.selectTool('erase');
    else if (key === S.NUMBER) this.selectTool('number');
    else if (key === S.MOVE) this.selectTool('move');
    else if (key === S.AUTO_NUMBER) this.autoNumber();
    else if (key === S.MIRROR) this.mirror();
    else if (key === S.PREVIEW) this.togglePreview();
    else if (key === 'delete' || key === 'backspace') {
      if (this.selection().size) { event.preventDefault(); this.selectionErase(); }
      else if (this.selected()) { event.preventDefault(); this.deleteSelected(); }
    }
    else if (/^[1-9]$/.test(key)) { const t = this.seatTools()[Number(key) - 1]; if (t) this.selectSeatTool(t.code); }
  }

  protected onResize(): void { this.viewportWidth.set(window.innerWidth); this.fitToStage(); }

  // ==========================================
  // INTERNOS
  // ==========================================
  /**
   * Toda edición pasa por aquí, así que aquí viven las dos coherencias que no
   * dependen de la herramienta usada:
   *  - la escalera es una sola pieza: si un piso la mueve de lado, el otro la sigue;
   *  - la serie de venta no deja huecos: borrar la 7 y la 8 recorre la numeración.
   */
  private commit(transform: (layout: VehicleLayout) => VehicleLayout, compact = false): void {
    this.store.commit(this.vehicleId(), previous => {
      let next = transform(previous);
      if (next === previous) return next;
      if (this.stairsMoved(previous, next)) next = SeatLayoutEngine.syncStairs(next, this.activeDeck());
      if (compact) next = SeatLayoutEngine.recompact(next, this.scope());
      return next;
    });
  }

  /** ¿Cambió la escalera del piso activo? (dispara el enlace entre pisos) */
  private stairsMoved(previous: VehicleLayout, next: VehicleLayout): boolean {
    if (next.decks.length < 2) return false;
    const at = (l: VehicleLayout) => {
      const deck = l.decks[this.activeDeck()];
      if (!deck) return '';
      let out = '';
      deck.cells.forEach((line, row) => line.forEach((c, col) => { if (c.kind === 'stairs') out += `${row}:${col};`; }));
      return out;
    };
    return at(previous) !== at(next);
  }

  /** Apariencia: acento propio si el tipo se creó desde el diseñador; si no, la tabla fija. */
  protected appearanceOf(code: SeatTypeCode): SeatAppearance {
    const table = SEAT_LAYOUT_RULES.SEAT_APPEARANCE as Record<string, SeatAppearance>;
    const type = this.catalogs.seatTypes.all().find(t => t.code === code);
    if (type?.accent) {
      const accent = (SEAT_LAYOUT_RULES.ACCENTS as Record<string, { label: string; fill: string; stroke: string; text: string }>)[type.accent];
      if (accent) return { icon: this.reclineIcon(type.reclineDegrees ?? 140), label: type.name, fill: accent.fill, stroke: accent.stroke, text: accent.text };
    }
    return table[code] ?? { ...table['DEFAULT'], label: type?.name ?? table['DEFAULT'].label };
  }

  /** El ángulo de reclinación dibuja la butaca. */
  protected reclineIcon(degrees: number): string {
    return degrees >= 160 ? 'bed' : degrees >= 140 ? 'seat-recline' : 'seat';
  }

  protected typeCount(code: SeatTypeCode): number { return this.stats()?.byType.get(code) ?? 0; }
  protected traitIcon(trait: SeatTrait): string { return SEAT_LAYOUT_RULES.TRAITS[trait].icon; }
  protected traitLabel(trait: SeatTrait): string { return SEAT_LAYOUT_RULES.TRAITS[trait].label; }
  protected amenityIcon(a: Amenity): string { return SEAT_LAYOUT_RULES.AMENITIES[a].icon; }

  private notify(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 1800);
  }
}
