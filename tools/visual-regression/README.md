# Regresión visual

Compara capturas de pantalla **píxel por píxel** antes y después de un cambio. Sirve para
confirmar que un refactor de estilos o de plantillas no cambió nada visible, o para ver
exactamente qué cambió.

Con estos escenarios se verificó la migración de Tailwind a SCSS (todo idéntico).

## Uso

Requisitos: Node 24.21 (`fnm use` en la carpeta del proyecto) y la app corriendo:

```bash
pnpm start
```

1. **Antes** de tu cambio, captura la referencia:
   ```bash
   pnpm vr:baseline
   ```
2. Haz tu cambio.
3. Compara:
   ```bash
   pnpm vr:check
   ```
   Termina con `Todo idéntico.` o lista los escenarios distintos. Las diferencias quedan
   marcadas en **magenta** en `tools/visual-regression/.output/diffs/<suite>/`.

Para correr solo algunas suites (más rápido), pásalas por nombre:

```bash
pnpm vr:baseline shell shared
pnpm vr:check shell shared
```

`pnpm vr:list` muestra las suites disponibles. Otra URL: `VR_BASE_URL=http://localhost:4300 pnpm vr:check`.

La comparación es exacta: con la app sin cambios, dos capturas seguidas salen idénticas. Si
necesitas ignorar diferencias mínimas, `VR_TOLERANCE_PX=20 pnpm vr:check` tolera hasta 20
píxeles distintos por captura (se listan como `tolerado`).

Usa el Chrome instalado; si no hay, el Chromium de Playwright (`pnpm exec playwright install chromium`).

## Suites

| Suite | Escenarios | Qué cubre |
|---|---|---|
| `global` | 96 | Las 24 rutas en 1440, 1024, 768 y 390 px de ancho |
| `seat-designer` | 104 | Diseñador de plazas: herramientas, capas, menús, zen, chat, selección, modales |
| `schedule` | 231 | Servicios programados: lista, semana, toggles, modales y drawer de edición |
| `shell` | 97 | Menú lateral y cabecera: colapsado, drawer móvil, activos, hovers |
| `master-routes` | 113 | Rutas maestras: filtros, búsqueda, acordeones, tarjetas expandidas, modal |
| `shared` | 306 | Tablas, tarjetas, chips, paginación, vehículos (wizard), usuarios, conductores, 16 catálogos |

Todas juntas tardan bastante (unas 950 capturas); durante el desarrollo conviene usar solo las
suites de la pantalla que estás tocando.

## Escenarios

Cada archivo en `scenarios/` es una lista de escenarios:

```json
{
  "name": "vehiculos-card-hover-1440",
  "path": "/vehiculos",
  "width": 1440,
  "height": 900,
  "actions": [
    {
      "click": "[data-testid=view-switcher-cards]"
    }
  ],
  "keepHover": "[data-testid=entity-card]"
}
```

Acciones: `click` (selector CSS), `clickText` (texto visible), `hover`, `fill`
(`[selector, texto]`), `press` (tecla), `wait` (ms), `scroll` (`[selector, x, y]`).
`keepHover` deja el mouse sobre un elemento al capturar. `fullPage` (por defecto `true`)
captura la página completa.

Las animaciones y transiciones se desactivan para que las capturas sean deterministas. Si un
selector no existe, la captura falla a propósito: al renombrar una clase usada en un
escenario, actualiza el escenario.

Los datos de la app son de prueba y algunas pantallas dependen de la fecha (Servicios
programados muestra la semana actual): captura la referencia y la comparación el mismo día.
