# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Todos los roles de una empresa de transporte interdepartamental de pasajeros (Bolivia) usan el mismo sistema:

- **Operadores / despachadores**: programan servicios y asignan vehículos y conductores durante la jornada en terminal.
- **Administradores de la empresa**: configuran rutas maestras, flota, conductores, usuarios/privilegios y catálogos paramétricos.
- **Vendedores de pasajes**: emiten pasajes y reservas, normalmente con el cliente esperando.
- **Gerencia**: consulta informes de recaudación, ocupación y trazabilidad de buses.

Se usa por igual en PC, tablet y móvil: cada pantalla debe estar completa y ser operable en los tres, no una versión recortada en móvil.

## Product Purpose

Aleta TMS es un sistema de gestión y venta de pasajes para transporte interdepartamental. Este repositorio es un prototipo de referencia (Angular) cuyo objetivo es mejorar el diseño visual y la calidad del frontend para que el equipo de desarrollo de Aleta TMS lo integre fácilmente en el sistema real. Éxito = pantallas claras y eficientes para el trabajo diario, y código que los devs de Aleta puedan adoptar sin reescribir.

## Positioning

Modela la operación como la vive una empresa boliviana: rutas maestras agrupadas por departamento, con paradas intermedias y los servicios (tramos) derivados de ellas, visualizadas como grafo; y diseño de plazas por vehículo ligado a la flota real.

## Operating Context

- Flujo base: catálogos paramétricos → rutas maestras (paradas, servicios) → flota y diseño de plazas → conductores → programación de servicios (operaciones) → venta de pasajes → informes.
- Uso intensivo y repetitivo durante la jornada; en venta, bajo presión de tiempo frente al cliente.
- Terminología del dominio en español (un término por concepto): "Rutas maestras" para el catálogo de rutas y "Servicios programados" para la operación diaria; paradas, plazas/asientos, tarifas, recargos, canales de venta, departamentos, ciudades.

## Capabilities and Constraints

- Stack existente: Angular 22 (standalone, Signals), SCSS con tokens (sin Tailwind: se migró a SCSS), pnpm. Tokens en `src/styles/_tokens.scss` (fuente para CSS) y `src/app/core/theme/tokens.ts` (espejo tipado, con spec).
- Implementado: servicios programados, rutas maestras (tarjetas + grafo SVG), vehículos (alta y edición), diseñador de plazas por vehículo, conductores, usuarios y privilegios, 15 catálogos paramétricos con alta y edición. Eliminaciones con Deshacer.
- Placeholders sin diseñar: Ventas e Informes (en el menú como "Pronto").
- La lógica de negocio (engines, stores con signals, reglas en `core/constants`) se considera correcta: el trabajo de diseño cambia presentación, tokens e integrabilidad, no la lógica.
- `ARCHITECTURE_RULES.md` fija dimensiones de tarjeta de ruta, reglas geométricas del grafo y patrón reactivo; no se modifican sin autorización explícita.
- El código real de Aleta TMS no está disponible localmente; solo su entorno de desarrollo web.

## Brand Commitments

- Nombre del producto en la interfaz: **Aleta TMS**. "PAZAVI" y "Rutas Maestras" son nombres heredados del prototipo.
- Interfaz en español.
- Dirección visual: "Tablero de salidas bajo un amanecer andino" (ver DESIGN.md); no una copia del Aleta TMS actual.

## Evidence on Hand

- Datos mock: `src/app/features/*/data/*.mock.ts`, catálogo de rutas en `src/app/services/routes.service.ts`.
- Capturas de referencia del prototipo: `tools/screenshots/`.
- No hay clientes, testimonios, métricas ni logos oficiales en el repositorio; no inventarlos.

## Product Principles

1. La tarea primero: cada pantalla sirve a un trabajo operativo concreto; velocidad y escaneabilidad por encima de lo decorativo.
2. Completo en cualquier dispositivo: PC, tablet y móvil son ciudadanos de primera clase.
3. Integrable por diseño: componentes, tokens y patrones que los devs de Aleta puedan adoptar sin reescribir la lógica.
4. Un solo sistema para todos los roles: patrones consistentes entre operación, administración, venta e informes.
5. Fiel al dominio: vocabulario y estructura de la operación de transporte interdepartamental boliviano.
