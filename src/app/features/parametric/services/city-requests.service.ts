import { Injectable, computed, signal } from '@angular/core';

/**
 * ============================================================================
 * SOLICITUDES DE CIUDADES Y PUEBLOS NUEVOS  ★ NUEVO (no existe en aletadev)
 * ============================================================================
 * El catálogo de ciudades debería traer todos los centros poblados de Bolivia
 * (fuente recomendada: INE / GeoBolivia, Censo 2012). Si aun así falta un
 * pueblo, quien crea una ruta envía una solicitud; el administrador de
 * Paramétricas la aprueba, la rechaza o la une con una ciudad existente.
 * Mientras está pendiente, el pueblo NO se puede usar. Si es urgente, la
 * persona escribe a soporte por WhatsApp citando el número de solicitud.
 *
 * Integración con Aleta: hace falta un endpoint nuevo, p. ej.
 * `POST /api/v1/parametric/solicitudes-ciudad` (+ GET y PATCH de estado).
 * ============================================================================
 */

/**
 * Número de WhatsApp de soporte con código de país, solo dígitos (p. ej. "5917XXXXXXX").
 * Vacío a propósito: esto es un prototipo y el enlace abre WhatsApp pidiendo elegir el
 * contacto. Al integrar, poner aquí el número real de soporte de la empresa.
 */
export const SUPPORT_WHATSAPP = '';

export type CityRequestStatus = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface CityRequest {
  /** "SOL-0001" */
  readonly code: string;
  readonly name: string;
  /** Departamento en mayúsculas, como en el catálogo de rutas ("LA PAZ"). */
  readonly department: string;
  readonly municipality: string;
  readonly reference: string;
  readonly status: CityRequestStatus;
  readonly createdAt: string;
}

export type NewCityRequest = Pick<CityRequest, 'name' | 'department' | 'municipality' | 'reference'>;

@Injectable({ providedIn: 'root' })
export class CityRequestsService {
  private readonly requests = signal<readonly CityRequest[]>([]);

  readonly all = this.requests.asReadonly();
  readonly pending = computed(() => this.requests().filter(request => request.status === 'PENDIENTE'));

  /** Solicitud pendiente con ese nombre (sin tildes ni mayúsculas), si la hay. */
  pendingByName(name: string): CityRequest | undefined {
    const wanted = normalize(name);
    return this.pending().find(request => normalize(request.name) === wanted);
  }

  /** Crea la solicitud; si ya hay una pendiente con el mismo nombre, devuelve esa. */
  create(input: NewCityRequest): CityRequest {
    const existing = this.pendingByName(input.name);
    if (existing) return existing;
    const request: CityRequest = {
      code: `SOL-${String(this.requests().length + 1).padStart(4, '0')}`,
      name: input.name.trim(),
      department: input.department,
      municipality: input.municipality.trim(),
      reference: input.reference.trim(),
      status: 'PENDIENTE',
      createdAt: new Date().toISOString()
    };
    this.requests.update(list => [...list, request]);
    return request;
  }

  /** Enlace para escribir a soporte por WhatsApp con el mensaje ya armado. */
  whatsappLink(request: CityRequest): string {
    const text = `Hola, necesito que aprueben la solicitud ${request.code}: agregar «${request.name}» (${request.department}) al catálogo de ciudades de Aleta TMS.`;
    return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;
  }
}

/** Sin tildes, en minúsculas y sin espacios de sobra, para comparar nombres. */
export function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
