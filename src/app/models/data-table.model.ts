/**
 * ============================================================================
 * PAZAVI TMS - MODELO GENÉRICO DE TABLA DE DATOS
 * ============================================================================
 * Contrato único que describe CUALQUIER tabla del sistema (Vehículos,
 * Conductores, Usuarios y las 16 pantallas paramétricas).
 *
 * Principio: la pantalla NO dibuja celdas, solo DECLARA columnas. El
 * renderizado vive en `DataTableComponent`, de modo que un cambio de estilo
 * se propaga a todos los módulos a la vez.
 * ============================================================================
 */

/** Tono semántico de un chip de estado. Mapea a la escala cromática institucional. */
export type ChipTone =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'primary'
  /** Relleno sólido, reservado a la severidad máxima (incidencias CRÍTICAS). */
  | 'critical';

/** Alineación horizontal del contenido de una columna. */
export type ColumnAlign = 'left' | 'center' | 'right';

/** Punto de corte a partir del cual la columna se oculta (densidad responsiva). */
export type ColumnBreakpoint = 'sm' | 'md' | 'lg';

/**
 * Tipos de celda soportados.
 * - `text`    Texto plano secundario.
 * - `strong`  Identificador principal de la fila (placa, usuario, nombre).
 * - `stacked` Dos líneas: valor principal + leyenda de apoyo.
 * - `numeric` Cifra alineada a la derecha con tipografía de datos.
 * - `chip`    Etiqueta de estado con color semántico.
 * - `tags`    Colección de etiquetas (roles, permisos, categorías).
 */
export type CellKind = 'text' | 'strong' | 'stacked' | 'numeric' | 'chip' | 'tags';

/** Representación renderizable de una celda, ya resuelta desde el dominio. */
export interface TableCell {
  readonly kind: CellKind;
  /** Contenido principal. */
  readonly value?: string;
  /** Segunda línea en celdas `stacked`. */
  readonly caption?: string;
  /** Tono cromático en celdas `chip`. */
  readonly tone?: ChipTone;
  /** Colección de etiquetas en celdas `tags`. */
  readonly items?: readonly string[];
}

/** Toda fila debe exponer un identificador estable para el `track` de Angular. */
export interface TableRowBase {
  readonly id: string;
}

/**
 * Definición declarativa de una columna.
 * `cell` es una función pura dominio → presentación: es el único punto donde
 * una entidad de negocio se traduce a píxeles.
 */
export interface TableColumn<T extends TableRowBase> {
  /** Clave técnica, única dentro de la tabla. */
  readonly key: string;
  /** Encabezado visible (se renderiza en mayúsculas). */
  readonly label: string;
  readonly align?: ColumnAlign;
  /** Ancho sugerido de la columna como valor CSS, p. ej. `140px`. */
  readonly width?: string;
  /** Oculta la columna por debajo del breakpoint indicado. */
  readonly showFrom?: ColumnBreakpoint;
  /** Proyección pura de la entidad a una celda renderizable. */
  readonly cell: (row: T) => TableCell;
}

/** Pestaña de filtrado por categoría (usada por el módulo de Conductores). */
export interface FilterTab {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
}

/**
 * Identificador de una acción de fila. `edit` y `delete` son las acciones
 * nativas; cualquier otro valor es el `id` de una `RowActionDef` extra.
 */
export type RowActionKind = 'edit' | 'delete' | (string & {});

/** Acción de fila emitida por la tabla hacia el contenedor inteligente. */
export interface RowAction<T extends TableRowBase> {
  readonly action: RowActionKind;
  readonly row: T;
}

/**
 * Acción de fila adicional, declarada por el módulo (p. ej. «Diseñar plazas»
 * en Vehículos). La tabla la pinta como botón de icono dentro de la fila de
 * 64px; la tarjeta, como píldora con icono y rótulo.
 */
export interface RowActionDef {
  /** Se emite como `RowAction.action`. No usar `edit` ni `delete`. */
  readonly id: string;
  /** Rótulo visible en tarjeta y nombre accesible en tabla. */
  readonly label: string;
  /** Rótulo corto para tarjetas estrechas (móvil). Si se omite, se usa `label`. */
  readonly shortLabel?: string;
  /** Trazo `d` de un icono de 24x24 con `stroke` (mismo lenguaje que editar/eliminar). */
  readonly iconPath: string;
}
