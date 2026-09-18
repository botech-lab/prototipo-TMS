import {
  CargoType,
  City,
  Currency,
  Department,
  DocumentTypeEntry,
  FareCategoryType,
  IncidentType,
  LicenseTypeEntry,
  PaymentMethod,
  Person,
  RouteUsageType,
  SalesChannel,
  SeatType,
  SurchargeType,
  VehicleTypeEntry
} from '../models/parametric.model';

/**
 * ============================================================================
 * SEMILLA DE CATÁLOGOS PARAMÉTRICOS
 * ============================================================================
 * Reemplazar cada arreglo por su endpoint `GET /api/v1/parametric/...`
 * cuando el backend esté disponible.
 * ============================================================================
 */

/** `GET /parametric/ciudades` */
export const CITIES_MOCK: readonly City[] = [
  { id: 'cty-arequipa', name: 'Arequipa', department: 'Arequipa', postalCode: '04000', isCapital: false, status: 'ACTIVO' },
  { id: 'cty-trinidad', name: 'Trinidad', department: 'Beni', postalCode: '0800', isCapital: true, status: 'ACTIVO' },
  { id: 'cty-sucre', name: 'Sucre', department: 'Chuquisaca', postalCode: '0600', isCapital: true, status: 'ACTIVO' },
  { id: 'cty-cochabamba', name: 'Cochabamba', department: 'Cochabamba', postalCode: '0200', isCapital: true, status: 'ACTIVO' },
  { id: 'cty-quillacollo', name: 'Quillacollo', department: 'Cochabamba', postalCode: '0201', isCapital: false, status: 'ACTIVO' },
  { id: 'cty-sacaba', name: 'Sacaba', department: 'Cochabamba', postalCode: '0202', isCapital: false, status: 'ACTIVO' },
  { id: 'cty-ciudad1', name: 'Ciudad1', department: 'La Paz', postalCode: '981891', isCapital: false, status: 'INACTIVO' },
  { id: 'cty-el-alto', name: 'El Alto', department: 'La Paz', postalCode: '0102', isCapital: false, status: 'ACTIVO' },
  { id: 'cty-la-paz', name: 'La Paz', department: 'La Paz', postalCode: '0100', isCapital: true, status: 'ACTIVO' },
  { id: 'cty-viacha', name: 'Viacha', department: 'La Paz', postalCode: '0103', isCapital: false, status: 'ACTIVO' },
  { id: 'cty-oruro', name: 'Oruro', department: 'Oruro', postalCode: '0400', isCapital: true, status: 'ACTIVO' },
  { id: 'cty-challapata', name: 'Challapata', department: 'Oruro', postalCode: '0401', isCapital: false, status: 'ACTIVO' },
  { id: 'cty-cobija', name: 'Cobija', department: 'Pando', postalCode: '0900', isCapital: true, status: 'ACTIVO' },
  { id: 'cty-potosi', name: 'Potosí', department: 'Potosí', postalCode: '0500', isCapital: true, status: 'ACTIVO' },
  { id: 'cty-uyuni', name: 'Uyuni', department: 'Potosí', postalCode: '0501', isCapital: false, status: 'ACTIVO' },
  { id: 'cty-villazon', name: 'Villazón', department: 'Potosí', postalCode: '0502', isCapital: false, status: 'ACTIVO' },
  { id: 'cty-santa-cruz', name: 'Santa Cruz de la Sierra', department: 'Santa Cruz', postalCode: '0300', isCapital: true, status: 'ACTIVO' },
  { id: 'cty-montero', name: 'Montero', department: 'Santa Cruz', postalCode: '0301', isCapital: false, status: 'ACTIVO' },
  { id: 'cty-warnes', name: 'Warnes', department: 'Santa Cruz', postalCode: '0302', isCapital: false, status: 'ACTIVO' },
  { id: 'cty-tarija', name: 'Tarija', department: 'Tarija', postalCode: '0700', isCapital: true, status: 'ACTIVO' },
  { id: 'cty-yacuiba', name: 'Yacuiba', department: 'Tarija', postalCode: '0701', isCapital: false, status: 'ACTIVO' }
];

/** `GET /parametric/departamentos` */
export const DEPARTMENTS_MOCK: readonly Department[] = [
  { id: 'dep-be', code: 'BE', name: 'Beni', country: 'Bolivia', capital: 'Trinidad', status: 'ACTIVO' },
  { id: 'dep-ch', code: 'CH', name: 'Chuquisaca', country: 'Bolivia', capital: 'Sucre', status: 'ACTIVO' },
  { id: 'dep-cb', code: 'CB', name: 'Cochabamba', country: 'Bolivia', capital: 'Cochabamba', status: 'ACTIVO' },
  { id: 'dep-lp', code: 'LP', name: 'La Paz', country: 'Bolivia', capital: 'La Paz', status: 'ACTIVO' },
  { id: 'dep-or', code: 'OR', name: 'Oruro', country: 'Bolivia', capital: 'Oruro', status: 'ACTIVO' },
  { id: 'dep-pa', code: 'PA', name: 'Pando', country: 'Bolivia', capital: 'Cobija', status: 'ACTIVO' },
  { id: 'dep-po', code: 'PO', name: 'Potosí', country: 'Bolivia', capital: 'Potosí', status: 'ACTIVO' },
  { id: 'dep-sc', code: 'SC', name: 'Santa Cruz', country: 'Bolivia', capital: 'Santa Cruz de la Sierra', status: 'ACTIVO' },
  { id: 'dep-tr', code: 'TR', name: 'Tarija', country: 'Bolivia', capital: 'Tarija', status: 'ACTIVO' },
  { id: 'dep-aqp', code: 'AQP', name: 'Arequipa', country: 'Perú', capital: 'Arequipa', status: 'ACTIVO' },
  { id: 'dep-ta', code: 'TA', name: 'Tacna', country: 'Perú', capital: 'Tacna', status: 'ACTIVO' }
];

/** `GET /parametric/personas` */
export const PEOPLE_MOCK: readonly Person[] = [
  { id: 'per-6543210', name: 'María Fernanda Flores Choque', documentType: 'CI', documentNumber: '6543210', phone: '70123456', email: 'maria.flores@test.com', status: 'ACTIVO' },
  { id: 'per-8765432', name: 'Luis Alberto Mamani Rojas', documentType: 'CI', documentNumber: '8765432', phone: '71234567', email: 'luis.mamani@test.com', status: 'ACTIVO' },
  { id: 'per-7654321', name: 'Juan Carlos Quispe Mamani', documentType: 'CI', documentNumber: '7654321', phone: '72098765', email: 'juan.quispe@test.com', status: 'ACTIVO' },
  { id: 'per-1122334', name: 'Diego Alejandro Rojas Fernández', documentType: 'CI', documentNumber: '1122334', phone: '73456789', email: 'diego.rojas@test.com', status: 'ACTIVO' },
  { id: 'per-9876543', name: 'Carla Andrea Vargas Pérez', documentType: 'CI', documentNumber: '9876543', phone: '72345678', email: 'carla.vargas@test.com', status: 'ACTIVO' },
  { id: 'per-1598378', name: 'Artur dragon', documentType: 'CI', documentNumber: '1598378', phone: 'asfdsfsa', email: '9484984@gmail.com', status: 'ACTIVO' }
];

/** `GET /parametric/tipo-cargas` */
export const CARGO_TYPES_MOCK: readonly CargoType[] = [
  { id: 'crg-general', name: 'Carga General', description: 'Mercadería y paquetes de uso general', requiresCold: false, requiresInsurance: false, requiresDocumentation: false, status: 'ACTIVO' },
  { id: 'crg-refrigerada', name: 'Refrigerada', description: 'Productos que requieren cadena de frío', requiresCold: true, requiresInsurance: true, requiresDocumentation: true, status: 'ACTIVO' },
  { id: 'crg-peligrosa', name: 'Peligrosa', description: 'Materiales peligrosos con regulación especial', requiresCold: false, requiresInsurance: true, requiresDocumentation: true, status: 'ACTIVO' },
  { id: 'crg-fragil', name: 'Frágil', description: 'Artículos frágiles con manejo especial', requiresCold: false, requiresInsurance: true, requiresDocumentation: false, status: 'ACTIVO' },
  { id: 'crg-sobredimensionada', name: 'Sobredimensionada', description: 'Carga de dimensiones fuera de estándar', requiresCold: false, requiresInsurance: true, requiresDocumentation: false, status: 'ACTIVO' },
  { id: 'crg-documentos', name: 'Documentos', description: 'Sobres, documentos y correspondencia', requiresCold: false, requiresInsurance: false, requiresDocumentation: false, status: 'ACTIVO' },
  { id: 'crg-animales', name: 'Animales Vivos', description: 'Transporte de animales vivos con guía', requiresCold: false, requiresInsurance: true, requiresDocumentation: true, status: 'ACTIVO' },
  { id: 'crg-dadsad', name: 'dadsad', description: 'asdsa', requiresCold: true, requiresInsurance: true, requiresDocumentation: true, status: 'ACTIVO' }
];

/** `GET /parametric/tipo-vehiculos` */
export const VEHICLE_TYPES_MOCK: readonly VehicleTypeEntry[] = [
  { id: 'vt-prueba1', name: 'Prueba1', description: '', maxWeightKg: null, maxVolumeM3: null, requiredLicense: null, status: 'ACTIVO' },
  { id: 'vt-bus-cama', name: 'Bus Cama Completo', description: 'Bus con asientos cama 180° para viajes nocturnos', maxWeightKg: 5000, maxVolumeM3: 20, requiredLicense: 'C', status: 'ACTIVO' },
  { id: 'vt-bus-semicama', name: 'Bus Semicama', description: 'Bus con asientos semicama 140° reclinables', maxWeightKg: 5000, maxVolumeM3: 20, requiredLicense: 'C', status: 'ACTIVO' },
  { id: 'vt-bus-ejecutivo', name: 'Bus Ejecutivo', description: 'Bus ejecutivo de lujo con servicios premium', maxWeightKg: 4500, maxVolumeM3: 15, requiredLicense: 'C', status: 'ACTIVO' },
  { id: 'vt-bus-normal', name: 'Bus Normal', description: 'Bus estándar con asientos regulares', maxWeightKg: 5000, maxVolumeM3: 20, requiredLicense: 'C', status: 'ACTIVO' },
  { id: 'vt-minibus', name: 'Minibús', description: 'Minibús para rutas cortas y transferencias', maxWeightKg: 2000, maxVolumeM3: 8, requiredLicense: 'B', status: 'ACTIVO' },
  { id: 'vt-van', name: 'Van / Combi', description: 'Van de pasajeros para rutas rurales', maxWeightKg: 1200, maxVolumeM3: 5, requiredLicense: 'B', status: 'ACTIVO' }
];

/** `GET /parametric/tipo-documentos` */
export const DOCUMENT_TYPES_MOCK: readonly DocumentTypeEntry[] = [
  { id: 'doc-ce', code: 'CE', name: 'Cédula de Extranjería', description: 'Documento de identidad para extranjeros residentes', status: 'ACTIVO' },
  { id: 'doc-ci', code: 'CI', name: 'Cédula de Identidad', description: 'Documento nacional de identificación personal', status: 'ACTIVO' },
  { id: 'doc-dni', code: 'DNI', name: 'DNI', description: 'Documento Nacional de Identidad (Perú/Argentina)', status: 'ACTIVO' },
  { id: 'doc-nit', code: 'NIT', name: 'Número de Identificación Tributaria', description: 'Documento tributario para empresas o contribuyentes', status: 'ACTIVO' },
  { id: 'doc-pasaporte', code: 'PASAPORTE', name: 'Pasaporte', description: 'Documento internacional de identificación personal', status: 'ACTIVO' },
  { id: 'doc-pas', code: 'PAS', name: 'Pasaporte', description: 'Pasaporte internacional', status: 'ACTIVO' },
  { id: 'doc-run', code: 'RUN', name: 'RUN/RUT', description: 'Rol Único Nacional (Chile)', status: 'ACTIVO' },
  { id: 'doc-nuevo', code: 'NUEVO', name: 'Viejo', description: '', status: 'INACTIVO' }
];

/** `GET /parametric/tipo-incidencias` */
export const INCIDENT_TYPES_MOCK: readonly IncidentType[] = [
  { id: 'inc-demora', name: 'Demora', description: 'Retraso en la salida o llegada', severity: 'BAJO', impactsDispatch: true, requiresEscalation: false, status: 'ACTIVO' },
  { id: 'inc-averia', name: 'Avería Mecánica', description: 'Falla mecánica del vehículo', severity: 'MEDIO', impactsDispatch: true, requiresEscalation: true, status: 'ACTIVO' },
  { id: 'inc-accidente', name: 'Accidente de Tráfico', description: 'Accidente de tráfico con afectados', severity: 'ALTO', impactsDispatch: true, requiresEscalation: true, status: 'ACTIVO' },
  { id: 'inc-perdida', name: 'Pérdida de Carga', description: 'Extravío o pérdida de mercadería', severity: 'MEDIO', impactsDispatch: false, requiresEscalation: true, status: 'ACTIVO' },
  { id: 'inc-dano', name: 'Daño a Carga', description: 'Daño en mercadería durante el transporte', severity: 'BAJO', impactsDispatch: false, requiresEscalation: false, status: 'ACTIVO' },
  { id: 'inc-no-show', name: 'Pasajero No Show', description: 'Pasajero con boleto que no se presentó', severity: 'BAJO', impactsDispatch: false, requiresEscalation: false, status: 'ACTIVO' },
  { id: 'inc-robo', name: 'Robo / Asalto', description: 'Robo o asalto en ruta', severity: 'ALTO', impactsDispatch: true, requiresEscalation: true, status: 'ACTIVO' },
  { id: 'inc-cierre', name: 'Cierre de Carretera', description: 'Bloqueo o cierre de vía por terceros', severity: 'MEDIO', impactsDispatch: true, requiresEscalation: true, status: 'ACTIVO' },
  { id: 'inc-coyote', name: 'Coyote', description: '', severity: 'CRITICA', impactsDispatch: false, requiresEscalation: false, status: 'ACTIVO' }
];

/** `GET /parametric/tipo-licencias` */
export const LICENSE_TYPES_MOCK: readonly LicenseTypeEntry[] = [
  { id: 'lic-bob', name: 'Bob Esponja', description: '', validityMonths: null, status: 'ACTIVO' },
  { id: 'lic-a', name: 'Categoría A', description: 'Motocicletas y vehículos similares hasta 125cc', validityMonths: 60, status: 'ACTIVO' },
  { id: 'lic-b', name: 'Categoría B', description: 'Automóviles, SUV y vehículos ligeros', validityMonths: 60, status: 'ACTIVO' },
  { id: 'lic-c', name: 'Categoría C', description: 'Vehículos pesados, camiones y buses', validityMonths: 36, status: 'ACTIVO' },
  { id: 'lic-d', name: 'Categoría D', description: 'Transporte público de pasajeros profesional', validityMonths: 24, status: 'ACTIVO' },
  { id: 'lic-e', name: 'Categoría E', description: 'Vehículos articulados y de gran porte', validityMonths: 24, status: 'ACTIVO' }
];

/** `GET /parametric/tipo-recargos` */
export const SURCHARGE_TYPES_MOCK: readonly SurchargeType[] = [
  { id: 'sur-seguro', name: 'Seguro de Carga', description: 'Seguro obligatorio para carga especial', method: 'PERCENT', value: 2, status: 'ACTIVO' },
  { id: 'sur-manejo', name: 'Manejo Especial', description: 'Recargo por manejo de carga especial', method: 'FIXED', value: 15, status: 'ACTIVO' },
  { id: 'sur-urgente', name: 'Urgente', description: 'Recargo por servicio urgente o express', method: 'PERCENT', value: 20, status: 'ACTIVO' },
  { id: 'sur-refrigeracion', name: 'Refrigeración', description: 'Recargo por cadena de frío activa', method: 'FIXED', value: 25, status: 'ACTIVO' },
  { id: 'sur-sobredimension', name: 'Sobredimensionada', description: 'Recargo por carga fuera de dimensión', method: 'PERCENT', value: 15, status: 'ACTIVO' },
  { id: 'sur-skynet', name: 'Skynet', description: '', method: 'PER_KM', value: 0, status: 'INACTIVO' }
];

/** `GET /parametric/metodos-pago` */
export const PAYMENT_METHODS_MOCK: readonly PaymentMethod[] = [
  { id: 'pay-efectivo', name: 'Efectivo', description: 'Pago en efectivo en ventanilla', appliesToCargo: true, appliesToTicket: true, status: 'ACTIVO' },
  { id: 'pay-tarjeta', name: 'Tarjeta Crédito/Débito', description: 'Pago con tarjeta bancaria (POS)', appliesToCargo: true, appliesToTicket: true, status: 'ACTIVO' },
  { id: 'pay-transferencia', name: 'Transferencia Bancaria', description: 'Depósito o transferencia bancaria', appliesToCargo: true, appliesToTicket: true, status: 'ACTIVO' },
  { id: 'pay-qr', name: 'Pago QR (Bolivia)', description: 'Pago mediante código QR bancario boliviano', appliesToCargo: true, appliesToTicket: true, status: 'ACTIVO' },
  { id: 'pay-tigo', name: 'Tigo Money', description: 'Pago por billetera Tigo Money', appliesToCargo: false, appliesToTicket: true, status: 'ACTIVO' },
  { id: 'pay-banco', name: 'Banco en Línea', description: 'Pago online por banca internet', appliesToCargo: true, appliesToTicket: true, status: 'ACTIVO' },
  { id: 'pay-tiempo', name: 'Tiempo', description: '', appliesToCargo: false, appliesToTicket: false, status: 'ACTIVO' }
];

/** `GET /parametric/monedas` */
export const CURRENCIES_MOCK: readonly Currency[] = [
  { id: 'cur-bob', code: 'BOB', name: 'Boliviano', symbol: 'Bs.', decimals: 2, isPrimary: true, status: 'ACTIVO' },
  { id: 'cur-usd', code: 'USD', name: 'Dólar Estadounidense', symbol: '$', decimals: 3, isPrimary: false, status: 'ACTIVO' },
  { id: 'cur-bld', code: 'BLD', name: 'Ecos de sangre', symbol: 'Be', decimals: 2, isPrimary: false, status: 'INACTIVO' },
  { id: 'cur-eur', code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, isPrimary: false, status: 'ACTIVO' },
  { id: 'cur-ars', code: 'ARS', name: 'Peso Argentino', symbol: '$', decimals: 2, isPrimary: false, status: 'ACTIVO' },
  { id: 'cur-pen', code: 'PEN', name: 'Sol Peruano', symbol: 'S/.', decimals: 2, isPrimary: false, status: 'ACTIVO' }
];

/** `GET /parametric/tipos-uso-ruta` */
export const ROUTE_USAGE_TYPES_MOCK: readonly RouteUsageType[] = [
  { id: 'rut-estacional', name: 'Estacional', description: '', isDefault: false, appliesConfiguration: true, appliesCard: true, status: 'ACTIVO' },
  { id: 'rut-charter', name: 'Charter', description: 'Servicio charter o alquiler completo', isDefault: false, appliesConfiguration: true, appliesCard: false, status: 'ACTIVO' },
  { id: 'rut-escolar', name: 'Escolar', description: 'Transporte escolar contratado', isDefault: false, appliesConfiguration: true, appliesCard: true, status: 'ACTIVO' },
  { id: 'rut-turistico', name: 'Turístico', description: 'Servicio turístico con guía', isDefault: false, appliesConfiguration: true, appliesCard: true, status: 'ACTIVO' },
  { id: 'rut-comercial', name: 'Comercial Regular', description: 'Ruta de servicio comercial regular', isDefault: true, appliesConfiguration: true, appliesCard: true, status: 'ACTIVO' },
  { id: 'rut-mixto', name: 'Mixto', description: 'Transporte mixto de pasajeros y carga', isDefault: false, appliesConfiguration: true, appliesCard: true, status: 'ACTIVO' },
  { id: 'rut-regular', name: 'Regular', description: '', isDefault: true, appliesConfiguration: true, appliesCard: true, status: 'ACTIVO' },
  { id: 'rut-enterprise', name: 'Enterprise', description: '', isDefault: false, appliesConfiguration: false, appliesCard: false, status: 'ACTIVO' }
];

/** `GET /parametric/tipos-categoria-tarifa` */
export const FARE_CATEGORY_TYPES_MOCK: readonly FareCategoryType[] = [
  { id: 'fct-web', name: 'WEB', description: '', isDefault: false, appliesOta: true, appliesAgent: false, visibleInPortal: true, status: 'ACTIVO' },
  { id: 'fct-agente', name: 'Agente', description: '', isDefault: false, appliesOta: false, appliesAgent: true, visibleInPortal: false, status: 'ACTIVO' },
  { id: 'fct-normal', name: 'Normal', description: 'Tarifa estándar para todos los canales', isDefault: true, appliesOta: true, appliesAgent: true, visibleInPortal: true, status: 'ACTIVO' },
  { id: 'fct-vip', name: 'VIP', description: 'Tarifa VIP con suite completa', isDefault: false, appliesOta: false, appliesAgent: true, visibleInPortal: false, status: 'ACTIVO' },
  { id: 'fct-premium', name: 'Premium', description: 'Tarifa premium de lujo', isDefault: false, appliesOta: false, appliesAgent: true, visibleInPortal: false, status: 'ACTIVO' },
  { id: 'fct-estudiante', name: 'Estudiante', description: 'Tarifa con descuento para estudiantes', isDefault: false, appliesOta: true, appliesAgent: true, visibleInPortal: true, status: 'ACTIVO' },
  { id: 'fct-ejecutivo', name: 'Ejecutivo', description: 'Tarifa ejecutiva con asientos premium', isDefault: false, appliesOta: true, appliesAgent: true, visibleInPortal: true, status: 'ACTIVO' },
  { id: 'fct-predeterminado', name: 'Predeterminado', description: '', isDefault: true, appliesOta: true, appliesAgent: true, visibleInPortal: false, status: 'ACTIVO' },
  { id: 'fct-cibermoto', name: 'Cibermoto', description: '', isDefault: false, appliesOta: false, appliesAgent: false, visibleInPortal: false, status: 'INACTIVO' }
];

/** `GET /parametric/tipos-asiento` */
export const SEAT_TYPES_MOCK: readonly SeatType[] = [
  // Registros de prueba del sistema real: se dejan INACTIVOS para que no
  // ensucien la paleta del diseñador sin borrar datos existentes.
  { id: 'seat-fe', code: 'FE', name: 'Trono de hierro', description: '', status: 'INACTIVO' },
  { id: 'seat-est', code: 'EST', name: 'Estándar', description: 'Asiento estándar reclinable 120°', status: 'ACTIVO' },
  { id: 'seat-oivb', code: 'OIVB', name: '7941895', description: 'oiuboibhib', status: 'INACTIVO' },
  { id: 'seat-sem', code: 'SEM', name: 'Semicama', description: 'Asiento semicama reclinable 140°', status: 'ACTIVO' },
  { id: 'seat-cam', code: 'CAM', name: 'Cama', description: 'Asiento cama totalmente reclinable 180°', status: 'ACTIVO' },
  { id: 'seat-vip', code: 'VIP', name: 'VIP Suite', description: 'Suite individual doble con cama ancha', status: 'ACTIVO' },
  { id: 'seat-amb', code: 'AMB', name: 'Ambulatorio', description: 'Asiento sin reserva de número', status: 'ACTIVO' }
];

/** `GET /parametric/canales-venta` */
export const SALES_CHANNELS_MOCK: readonly SalesChannel[] = [
  { id: 'chn-telefono', code: 'TELEFONO', name: 'Por teléfono', commissionPercent: null, isAgent: true, isApi: false, status: 'ACTIVO' },
  { id: 'chn-billetes', code: 'BILLETES_ELECT', name: 'Billetes electrónicos', commissionPercent: null, isAgent: false, isApi: true, status: 'ACTIVO' },
  { id: 'chn-en-linea', code: 'EN_LINEA', name: 'En línea', commissionPercent: null, isAgent: false, isApi: true, status: 'ACTIVO' },
  { id: 'chn-api-ota', code: 'API_OTA', name: 'API/OTAs', commissionPercent: null, isAgent: false, isApi: true, status: 'ACTIVO' },
  { id: 'chn-fuera-linea', code: 'FUERA_LINEA', name: 'Fuera de línea', commissionPercent: null, isAgent: true, isApi: false, status: 'ACTIVO' },
  { id: 'chn-web', code: 'WEB', name: 'Portal Web', commissionPercent: 0, isAgent: false, isApi: false, status: 'ACTIVO' },
  { id: 'chn-app', code: 'APP', name: 'App Móvil', commissionPercent: 0, isAgent: false, isApi: false, status: 'ACTIVO' },
  { id: 'chn-age', code: 'AGE', name: 'Agente Presencial', commissionPercent: 5, isAgent: true, isApi: false, status: 'ACTIVO' },
  { id: 'chn-ota', code: 'OTA', name: 'Agencia OTA', commissionPercent: 8, isAgent: false, isApi: true, status: 'ACTIVO' },
  { id: 'chn-tel', code: 'TEL', name: 'Telefónico', commissionPercent: 3, isAgent: true, isApi: false, status: 'ACTIVO' },
  { id: 'chn-counter', code: 'COUNTER', name: 'Mostrador Terminal', commissionPercent: 0, isAgent: true, isApi: false, status: 'ACTIVO' },
  { id: 'chn-kiosco', code: 'KIOSCO', name: 'Kiosco Autoservicio', commissionPercent: 2, isAgent: false, isApi: true, status: 'ACTIVO' }
];
