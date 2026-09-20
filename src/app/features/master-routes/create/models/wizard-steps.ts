import { WizardStepKey } from './route-draft.model';

export interface WizardStep {
  readonly key: WizardStepKey;
  readonly title: string;
  /** Pregunta que responde el paso, en palabras del encargado de rutas. */
  readonly question: string;
  /** Qué reciben los servicios de este paso (el porqué de la ruta maestra). */
  readonly inherits: string;
}

/**
 * Pasos del asistente, en el orden en que se dependen:
 * recorrido → paradas → tramos → días y venta → buses y tarifas (arma la configuración) → revisión.
 */
export const WIZARD_STEPS: readonly WizardStep[] = [
  {
    key: 'recorrido',
    title: 'Recorrido',
    question: '¿De dónde sale, a dónde llega y por qué ciudades pasa? Si hay más de un camino, cada uno es un tramo.',
    inherits: 'Cada servicio elige uno de estos tramos y lo usa completo o solo una parte (por ejemplo, La Paz → Cochabamba dentro de La Paz → Santa Cruz).'
  },
  {
    key: 'paradas',
    title: 'Paradas y tiempos',
    question: '¿Dónde para el bus y cuánto tarda entre una parada y otra?',
    inherits: 'Los servicios copian estas paradas y tiempos. Al crear un servicio solo se elige la hora de salida (06:00, 07:30…) y las demás horas salen solas.'
  },
  {
    key: 'tramos',
    title: 'Viajes que se venden',
    question: '¿Qué viajes se pueden vender dentro de esta ruta?',
    inherits: 'Solo con los viajes habilitados se pueden crear servicios y vender pasajes.'
  },
  {
    key: 'operacion',
    title: 'Días y venta',
    question: '¿Qué días opera y por qué canales se venden los pasajes?',
    inherits: 'Los servicios solo se programan en estos días y solo se venden por estos canales.'
  },
  {
    key: 'tarifas',
    title: 'Buses y tarifas',
    question: '¿Qué buses hacen esta ruta y cuánto cuesta cada viaje?',
    inherits: 'Al crear un servicio solo se elige uno de estos buses, y cada pasaje toma su precio de la tarjeta de ese tipo de bus.'
  },
  {
    key: 'revision',
    title: 'Revisión y activación',
    question: '¿Está todo listo para crear servicios con esta ruta?',
    inherits: 'Solo las rutas activas aparecen al crear un servicio. Mientras sea borrador, nadie puede usarla.'
  }
];
