import { NavIconName } from './nav-icon.component';

/** Enlace navegable del menú. `aliases` son otras URLs que lo activan. */
export interface ShellNavLink {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly icon: NavIconName;
  readonly aliases?: readonly string[];
}

/** Subgrupo plegable dentro de una sección (p. ej. Catálogos). */
export interface ShellNavSubgroup {
  readonly id: string;
  readonly label: string;
  readonly icon: NavIconName;
  /** Prefijo de URL que marca el subgrupo como actual y lo despliega. */
  readonly urlPrefix: string;
  readonly links: readonly ShellNavLink[];
}

/** Sección de primer nivel: su cabecera navega a `route` y agrupa enlaces. */
export interface ShellNavSection {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly icon: NavIconName;
  /** URLs propias de la sección además de las de sus enlaces. */
  readonly aliases?: readonly string[];
  readonly links: readonly ShellNavLink[];
  readonly subgroup?: ShellNavSubgroup;
}

/** Módulo en preparación: visible, deshabilitado, con píldora "Pronto". */
export interface ShellNavSoon {
  readonly id: string;
  readonly label: string;
  readonly icon: NavIconName;
}

export const SHELL_NAV_SECTIONS: readonly ShellNavSection[] = [
  {
    id: 'operacion',
    label: 'Operación',
    route: '/operaciones',
    icon: 'operation',
    links: [
      { id: 'rutas-maestras', label: 'Rutas maestras', route: '/rutas-maestras', icon: 'route', aliases: ['/programar'] },
      {
        id: 'servicios-programados',
        label: 'Servicios programados',
        route: '/operaciones',
        icon: 'calendar-check',
        aliases: ['/servicios-programados']
      }
    ]
  },
  {
    id: 'administracion',
    label: 'Administración',
    route: '/usuarios',
    icon: 'admin',
    aliases: ['/administracion'],
    links: [
      { id: 'usuarios', label: 'Usuarios', route: '/usuarios', icon: 'users' },
      { id: 'vehiculos', label: 'Vehículos', route: '/vehiculos', icon: 'bus' },
      { id: 'conductores', label: 'Conductores', route: '/conductores', icon: 'id-card' }
    ],
    subgroup: {
      id: 'catalogos',
      label: 'Catálogos',
      icon: 'catalog',
      urlPrefix: '/parametric/',
      links: [
        { id: 'ciudades', label: 'Ciudades', route: '/parametric/ciudades', icon: 'city' },
        { id: 'departamentos', label: 'Departamentos', route: '/parametric/departamentos', icon: 'map' },
        { id: 'personas', label: 'Personas', route: '/parametric/personas', icon: 'person' },
        { id: 'tipo-cargas', label: 'Tipos de carga', route: '/parametric/tipo-cargas', icon: 'box' },
        { id: 'tipo-vehiculos', label: 'Tipos de vehículo', route: '/parametric/tipo-vehiculos', icon: 'bus-front' },
        { id: 'tipo-documentos', label: 'Tipos de documento', route: '/parametric/tipo-documentos', icon: 'doc' },
        { id: 'tipo-incidencias', label: 'Tipos de incidencia', route: '/parametric/tipo-incidencias', icon: 'alert' },
        { id: 'tipo-licencias', label: 'Tipos de licencia', route: '/parametric/tipo-licencias', icon: 'license' },
        { id: 'tipo-recargos', label: 'Tipos de recargo', route: '/parametric/tipo-recargos', icon: 'percent' },
        { id: 'metodos-pago', label: 'Métodos de pago', route: '/parametric/metodos-pago', icon: 'card' },
        { id: 'monedas', label: 'Monedas', route: '/parametric/monedas', icon: 'coins' },
        { id: 'tipos-uso-ruta', label: 'Tipos de uso de ruta', route: '/parametric/tipos-uso-ruta', icon: 'signpost' },
        { id: 'tipos-categoria-tarifa', label: 'Categorías de tarifa', route: '/parametric/tipos-categoria-tarifa', icon: 'tag' },
        { id: 'tipos-asiento', label: 'Tipos de asiento', route: '/parametric/tipos-asiento', icon: 'seat' },
        { id: 'canales-venta', label: 'Canales de venta', route: '/parametric/canales-venta', icon: 'cart' }
      ]
    }
  }
];

export const SHELL_NAV_SOON: readonly ShellNavSoon[] = [
  { id: 'ventas', label: 'Ventas', icon: 'ticket' },
  { id: 'informes', label: 'Informes', icon: 'chart' }
];
