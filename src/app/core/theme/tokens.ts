/**
 * ============================================================================
 * PAZAVI TMS - DESIGN SYSTEM MASTER TOKENS (ARCHIVO MADRE DE DISEÑO)
 * ============================================================================
 * Este archivo es la ÚNICA FUENTE DE LA VERDAD para los tokens de diseño
 * de todas las pantallas y módulos del sistema PAZAVI TMS.
 * 
 * Cualquier cambio realizado en estos valores se propaga automáticamente a:
 * - Constantes tipadas en TypeScript
 * - Variables CSS Custom Properties (:root en styles.scss)
 * - Configuración central de Tailwind CSS
 * ============================================================================
 */

export const PAZAVI_TOKENS = {
  colors: {
    /**
     * PALETA TERRACOTA: Color Primario de Marca (PAZAVI TMS)
     * Equilibra el rigor industrial del transporte con una estética orgánica "Liquid Glass".
     */
    terracota: {
      50: '#FBEDE6',  // Fondo sutil / Rellenos de gran escala
      100: '#F6D9CB', // Velo 15% / Hover en elementos claros
      200: '#E7B9A4', // Bordes enfoque / Divisores suaves
      300: '#E39873', // Ornamentos / Grafismos secundarios glass
      400: '#D9784E', // Alertas secundarias
      500: '#B04E26', // SEED VALUE / Marca Principal / CTAs y navegación activa
      600: '#933F1D', // Hover interactivo para botones primarios
      700: '#7A3317', // Pressed / Selección activa de alta importancia
      800: '#5E2710', // Tipografía alternativa / Títulos de sección
    },

    /**
     * ESCALA SECUNDARIA: Azul Índigo Ambiental
     * Define la profundidad técnica, telemetría y gestión de flotas nocturnas.
     */
    secondary: {
      50: '#E3F1F7',  // Badges informativos / Fondos oscuros
      100: '#C4E2EF', // Tarjetas de soporte / Transportes alternativos
      200: '#9CCBDF', // Bordes interactivos / Focus
      300: '#6FB2CF', // Iconografía secundaria / Links de baja jerarquía
      400: '#3F8FAE', // VALOR SEMILLA / Acentos de flujo
      500: '#1F6F8B', // Estados interactivos base / CTAs secundarios
      600: '#185A71', // Hover en elementos secundarios / Navegación lateral
      700: '#13485B', // Texto alternativo alta lectura
      800: '#0E3746', // Contenedores principales noche / Headers técnicos
      900: '#08222C', // Profundidad extrema / Sombras de oclusión
      950: '#04141A', // Negro azulado absoluto / Z-index superior
    },

    /**
     * ESCALA NEUTRAL: Superficies, Bordes y Textos
     * Base cromática de terracotas y cremas industriales para alta densidad de datos.
     */
    neutral: {
      0: '#FFFFFF',   // Blanco absoluto / Superficies y modales
      50: '#F4F3F1',  // Fondo general del sistema / Canvas principal
      100: '#EFEEEB', // Fondos deshabilitados y secundarios
      200: '#E4E3DF', // Borde suave / Contornos de inputs y separadores
      300: '#BDB8B1', // Bordes glassmorphism / Biseleo táctil flotante
      400: '#8E8983', // Iconografía estructural no interactiva
      500: '#5F5A55', // Placeholders y textos de ayuda
      600: '#4E4A46', // Subtítulos / Etiquetas de formularios / Metadatos
      700: '#3A3734', // Resúmenes de alta densidad / Tablas y miniaturas
      800: '#262422', // Encabezados secundarios / Títulos H3
      900: '#181716', // Texto principal / Body y navegación principal
      950: '#0F0E0D', // Negro tipográfico absoluto / H1 y logotipos
    },

    /**
     * SISTEMA DE COLORES SEMÁNTICOS: Estados y Validación
     */
    semantic: {
      success: {
        100: '#E6F3EC', // Velo: Fondos de notificaciones / Contenedores de éxito
        500: '#2F7A55', // Base: Iconografía principal y botones de confirmación
        600: '#2F7A55', // Hover: Estados de interacción
      },
      warning: {
        100: '#FBF0DC', // Velo: Banners de advertencia preventiva
        500: '#946009', // Base: Indicadores de retraso / Mantenimiento
        600: '#946009', // Hover: Interacciones críticas sobre alerta
      },
      error: {
        100: '#FCE9E7', // Velo: Fondos de mensajes de error críticos
        500: '#B42318', // Base: Acción destructiva primaria / Alertas de emergencia
        600: '#B42318', // Hover: Estado presionado en botones de detención
      },
      info: {
        100: '#EFEEEB', // Velo: Resaltado de información secundaria
        500: '#4E4A46', // Base: Etiquetas de sistema / Enlaces de ayuda
        600: '#4E4A46', // Hover: Interacciones en documentación o guías
      }
    }
  },

  typography: {
    fontFamily: {
      ui: "'Plus Jakarta Sans', sans-serif",
      data: "'DM Sans', monospace, sans-serif"
    },
    
    /**
     * UI GENERAL (Interface Role - Plus Jakarta Sans)
     */
    ui: {
      headingLarge: {
        fontSize: '32px',
        fontWeight: '700',
        lineHeight: '1.2',
        letterSpacing: '-0.02em',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      headingMedium: {
        fontSize: '24px',
        fontWeight: '600',
        lineHeight: '1.3',
        letterSpacing: '-0.01em',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      headingSmall: {
        fontSize: '18px',
        fontWeight: '600',
        lineHeight: '1.4',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      bodyBase: {
        fontSize: '14px',
        fontWeight: '400',
        lineHeight: '1.5',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      bodySmall: {
        fontSize: '12px',
        fontWeight: '400',
        lineHeight: '1.5',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }
    },

    /**
     * DATOS CRÍTICOS (Precision Role - DM Sans Tabular)
     */
    data: {
      pricePrimary: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#B04E26',
        fontFamily: "'DM Sans', monospace, sans-serif"
      },
      metricSecondary: {
        fontSize: '20px',
        fontWeight: '600',
        fontFamily: "'DM Sans', monospace, sans-serif"
      },
      timeSchedule: {
        fontSize: '16px',
        fontWeight: '500',
        fontFamily: "'DM Sans', monospace, sans-serif"
      },
      idCode: {
        fontSize: '13px',
        fontWeight: '400',
        color: '#3A3734',
        fontFamily: "'DM Sans', monospace, sans-serif"
      },
      seatLabel: {
        fontSize: '12px',
        fontWeight: '400',
        color: '#B04E26',
        fontFamily: "'DM Sans', monospace, sans-serif"
      },
      timeHighlight: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#B04E26',
        fontFamily: "'DM Sans', monospace, sans-serif"
      },
      timeDisplay: {
        fontSize: '30px',
        fontWeight: '600',
        color: '#B04E26',
        fontFamily: "'DM Sans', monospace, sans-serif"
      }
    }
  },

  /** Espaciado base 4px (ver _tokens.scss --space-*). */
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 12: '48px' },
  /** Escala tipográfica, mínimo 11px (ver --text-*). */
  textScale: { '2xs': '11px', xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '20px', '2xl': '24px', '3xl': '30px' },
  leading: { tight: 1.2, ui: 1.35, body: 1.5 },

  /** Categorías (máximo 6, siempre con leyenda). */
  categories: {
    1: { name: 'cobre', fg: '#B04E26', bg: '#FBEDE6' },
    2: { name: 'cielo', fg: '#1F6F8B', bg: '#E3F1F7' },
    3: { name: 'salvia', fg: '#356B51', bg: '#E6F2EB' },
    4: { name: 'maíz', fg: '#8C6310', bg: '#FBF1DA' },
    5: { name: 'ciruela', fg: '#7A4B8C', bg: '#F1E9F5' },
    6: { name: 'quinua', fg: '#B03E68', bg: '#FAE8EF' }
  }
} as const;

export type PazaviThemeTokens = typeof PAZAVI_TOKENS;
export const PAZAVI_THEME = PAZAVI_TOKENS;
