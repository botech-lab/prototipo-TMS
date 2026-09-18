import { Injectable, signal, computed } from '@angular/core';
import { DepartmentGroup, MasterRoute, StopNode } from '../models/route.model';

@Injectable({
  providedIn: 'root'
})
export class RoutesService {
  // Helper para generar paradas
  private createStops(stopNames: string[]): StopNode[] {
    return stopNames.map((name, index) => ({
      id: `stop-${index + 1}`,
      order: index + 1,
      name,
      isOrigin: index === 0,
      isDestination: index === stopNames.length - 1
    }));
  }

  // ========================================================
  // CATÁLOGO OFICIAL DE 10 RUTAS MAESTRAS (DATOS REALES)
  // ========================================================

  // RM-01: La Paz → Santa Cruz (13 paradas)
  private readonly stopsRM01 = this.createStops([
    'La Paz', 'El Alto', 'Calamarca', 'Caracollo', 'Cochabamba', 
    'Sacaba', 'Colomi', 'Villa Tunari', 'Shinahota', 'Chimoré', 
    'Yapacaní', 'Montero', 'Santa Cruz'
  ]);

  // RM-02: La Paz → Oruro → Potosí → Tarija (11 paradas)
  private readonly stopsRM02 = this.createStops([
    'La Paz', 'El Alto', 'Patacamaya', 'Caracollo', 'Oruro', 
    'Challapata', 'Potosí', 'Tarija', 'Sucre', 'Tupiza', 'Tarija Terminal'
  ]);

  // RM-03: Cochabamba → Sucre → Potosí (8 paradas)
  private readonly stopsRM03 = this.createStops([
    'Cochabamba', 'Tarata', 'Aiquile', 'Puente Arce', 'Tarabuco', 
    'Yamparáez', 'Sucre', 'Potosí'
  ]);

  // RM-04: Santa Cruz → Camiri → Monteagudo → Sucre (8 paradas)
  private readonly stopsRM04 = this.createStops([
    'Santa Cruz', 'Cabezas', 'Abapó', 'Camiri', 'Muyupampa', 
    'Monteagudo', 'Padilla', 'Sucre'
  ]);

  // RM-05: Santa Cruz → Tarija → Yacuiba (8 paradas)
  private readonly stopsRM05 = this.createStops([
    'Santa Cruz', 'Camiri', 'Boyuibe', 'Villamontes', 'Entre Ríos', 
    'Tarija', 'Caraparí', 'Yacuiba'
  ]);

  // RM-06: Potosí → Uyuni → Tupiza → Villazón (6 paradas)
  private readonly stopsRM06 = this.createStops([
    'Potosí', 'Río Mulatos', 'Uyuni', 'Atocha', 'Tupiza', 'Villazón'
  ]);

  // RM-07: Santa Cruz → Trinidad → Riberalta → Guayaramerín (7 paradas)
  private readonly stopsRM07 = this.createStops([
    'Santa Cruz', 'Montero', 'San Julián', 'Trinidad', 'Santa Ana del Yacuma', 
    'Riberalta', 'Guayaramerín'
  ]);

  // RM-08: Riberalta → Puerto Rico → Cobija (5 paradas)
  private readonly stopsRM08 = this.createStops([
    'Riberalta', 'El Triángulo', 'Sena', 'Puerto Rico', 'Cobija'
  ]);

  // RM-09: La Paz → Copacabana (5 paradas)
  private readonly stopsRM09 = this.createStops([
    'La Paz', 'El Alto', 'Huarina', 'San Pedro de Tiquina', 'Copacabana'
  ]);

  // RM-10: La Paz → Caranavi → Rurrenabaque (7 paradas)
  private readonly stopsRM10 = this.createStops([
    'La Paz', 'Unduavi', 'Caranavi', 'Yucumo', 'Palos Blancos', 
    'San Borja', 'Rurrenabaque'
  ]);

  // ========================================================
  // GRUPOS DEPARTAMENTALES DE ORIGEN
  // ========================================================
  private readonly initialDepartments: DepartmentGroup[] = [
    {
      department: 'LA PAZ',
      totalRoutes: 4,
      isExpanded: true,
      routes: [
        {
          id: 'rm-01',
          code: 'RM-01',
          name: 'La Paz → Santa Cruz',
          originDepartment: 'LA PAZ',
          destinationDepartment: 'SANTA CRUZ',
          status: 'ACTIVO',
          stopsCount: 13,
          isExpanded: true,
          stops: this.stopsRM01,
          avoidedDuplicates: [
            'La Paz–Cochabamba',
            'Cochabamba–Santa Cruz',
            'Villa Tunari–Santa Cruz',
            'Montero–Santa Cruz'
          ]
        },
        {
          id: 'rm-02',
          code: 'RM-02',
          name: 'La Paz → Oruro → Potosí → Tarija',
          originDepartment: 'LA PAZ',
          destinationDepartment: 'TARIJA',
          status: 'ACTIVO',
          stopsCount: 11,
          isExpanded: false,
          stops: this.stopsRM02,
          avoidedDuplicates: [
            'La Paz–Oruro',
            'Oruro–Potosí',
            'Potosí–Tarija',
            'La Paz–Tarija'
          ]
        },
        {
          id: 'rm-09',
          code: 'RM-09',
          name: 'La Paz → Copacabana',
          originDepartment: 'LA PAZ',
          destinationDepartment: 'COPACABANA',
          status: 'ACTIVO',
          stopsCount: 5,
          isExpanded: false,
          stops: this.stopsRM09,
          avoidedDuplicates: [
            'La Paz–Huarina',
            'La Paz–Copacabana',
            'El Alto–Copacabana'
          ]
        },
        {
          id: 'rm-10',
          code: 'RM-10',
          name: 'La Paz → Caranavi → Rurrenabaque',
          originDepartment: 'LA PAZ',
          destinationDepartment: 'RURRENABAQUE',
          status: 'ACTIVO',
          stopsCount: 7,
          isExpanded: false,
          stops: this.stopsRM10,
          avoidedDuplicates: [
            'La Paz–Caranavi',
            'Caranavi–Rurrenabaque',
            'La Paz–Rurrenabaque'
          ]
        }
      ]
    },
    {
      department: 'SANTA CRUZ',
      totalRoutes: 3,
      isExpanded: false,
      routes: [
        {
          id: 'rm-04',
          code: 'RM-04',
          name: 'Santa Cruz → Camiri → Monteagudo → Sucre',
          originDepartment: 'SANTA CRUZ',
          destinationDepartment: 'SUCRE',
          status: 'ACTIVO',
          stopsCount: 8,
          isExpanded: true,
          stops: this.stopsRM04,
          avoidedDuplicates: [
            'Santa Cruz–Camiri',
            'Santa Cruz–Sucre',
            'Camiri–Sucre'
          ]
        },
        {
          id: 'rm-05',
          code: 'RM-05',
          name: 'Santa Cruz → Tarija → Yacuiba',
          originDepartment: 'SANTA CRUZ',
          destinationDepartment: 'YACUIBA',
          status: 'ACTIVO',
          stopsCount: 8,
          isExpanded: false,
          stops: this.stopsRM05,
          avoidedDuplicates: [
            'Santa Cruz–Tarija',
            'Tarija–Yacuiba',
            'Santa Cruz–Yacuiba'
          ]
        },
        {
          id: 'rm-07',
          code: 'RM-07',
          name: 'Santa Cruz → Trinidad → Riberalta → Guayaramerín',
          originDepartment: 'SANTA CRUZ',
          destinationDepartment: 'GUAYARAMERÍN',
          status: 'ACTIVO',
          stopsCount: 7,
          isExpanded: false,
          stops: this.stopsRM07,
          avoidedDuplicates: [
            'Santa Cruz–Trinidad',
            'Trinidad–Riberalta',
            'Riberalta–Guayaramerín'
          ]
        }
      ]
    },
    {
      department: 'COCHABAMBA',
      totalRoutes: 1,
      isExpanded: false,
      routes: [
        {
          id: 'rm-03',
          code: 'RM-03',
          name: 'Cochabamba → Sucre → Potosí',
          originDepartment: 'COCHABAMBA',
          destinationDepartment: 'POTOSÍ',
          status: 'ACTIVO',
          stopsCount: 8,
          isExpanded: true,
          stops: this.stopsRM03,
          avoidedDuplicates: [
            'Cochabamba–Sucre',
            'Sucre–Potosí',
            'Cochabamba–Potosí'
          ]
        }
      ]
    },
    {
      department: 'POTOSÍ',
      totalRoutes: 1,
      isExpanded: false,
      routes: [
        {
          id: 'rm-06',
          code: 'RM-06',
          name: 'Potosí → Uyuni → Tupiza → Villazón',
          originDepartment: 'POTOSÍ',
          destinationDepartment: 'VILLAZÓN',
          status: 'ACTIVO',
          stopsCount: 6,
          isExpanded: true,
          stops: this.stopsRM06,
          avoidedDuplicates: [
            'Potosí–Uyuni',
            'Uyuni–Tupiza',
            'Potosí–Villazón'
          ]
        }
      ]
    },
    {
      department: 'BENI',
      totalRoutes: 1,
      isExpanded: false,
      routes: [
        {
          id: 'rm-08',
          code: 'RM-08',
          name: 'Riberalta → Puerto Rico → Cobija',
          originDepartment: 'BENI',
          destinationDepartment: 'COBIJA',
          status: 'ACTIVO',
          stopsCount: 5,
          isExpanded: true,
          stops: this.stopsRM08,
          avoidedDuplicates: [
            'Riberalta–Cobija',
            'Puerto Rico–Cobija',
            'Servicios Parciales Amazónicos'
          ]
        }
      ]
    },
    {
      department: 'ORURO',
      totalRoutes: 0,
      isExpanded: false,
      routes: []
    },
    {
      department: 'CHUQUISACA',
      totalRoutes: 0,
      isExpanded: false,
      routes: []
    },
    {
      department: 'TARIJA',
      totalRoutes: 0,
      isExpanded: false,
      routes: []
    },
    {
      department: 'PANDO',
      totalRoutes: 0,
      isExpanded: false,
      routes: []
    }
  ];

  // ==========================================
  // SIGNALS REACTIVOS
  // ==========================================
  readonly departmentGroups = signal<DepartmentGroup[]>(this.initialDepartments);
  readonly selectedDepartment = signal<string>('LA PAZ');

  // Único departamento activo
  readonly activeDepartmentGroup = computed<DepartmentGroup | undefined>(() => {
    const activeName = this.selectedDepartment().toUpperCase();
    const match = this.departmentGroups().find(d => d.department.toUpperCase() === activeName);
    if (!match) return this.departmentGroups()[0];
    return {
      ...match,
      isExpanded: true
    };
  });

  // Los 8 departamentos inactivos restantes
  readonly inactiveDepartmentGroups = computed<DepartmentGroup[]>(() => {
    const activeName = this.selectedDepartment().toUpperCase();
    return this.departmentGroups()
      .filter(d => d.department.toUpperCase() !== activeName)
      .map(d => ({ ...d, isExpanded: false }));
  });

  // ==========================================
  // MÉTODOS DE CONSULTA Y ACCIONES
  // ==========================================
  getAllRoutes(): MasterRoute[] {
    return this.departmentGroups().flatMap(g => g.routes);
  }

  getRouteByCode(code: string): MasterRoute | undefined {
    return this.getAllRoutes().find(r => r.code.toUpperCase() === code.toUpperCase());
  }

  getDepartment(name: string): DepartmentGroup | undefined {
    return this.departmentGroups().find(
      (d) => d.department.toUpperCase() === name.toUpperCase()
    );
  }

  getRouteById(id: string): MasterRoute | undefined {
    for (const group of this.departmentGroups()) {
      const match = group.routes.find((r) => r.id === id);
      if (match) return match;
    }
    return undefined;
  }

  selectDepartment(deptName: string): void {
    this.selectedDepartment.set(deptName.toUpperCase());
  }

  toggleDepartment(deptName: string): void {
    this.selectDepartment(deptName);
  }

  toggleRouteStatus(routeId: string): void {
    this.departmentGroups.update((groups) =>
      groups.map((group) => ({
        ...group,
        routes: group.routes.map((route) =>
          route.id === routeId
            ? {
                ...route,
                status: (route.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO') as MasterRoute['status']
              }
            : route
        )
      }))
    );
  }

  /**
   * Fija el estado de una ruta. Lo usa "Deshacer" tras alternar el interruptor:
   * devuelve la ruta a su estado exacto anterior (p. ej. BORRADOR), cosa que un
   * segundo toggleRouteStatus no garantiza.
   */
  setRouteStatus(routeId: string, status: MasterRoute['status']): void {
    this.departmentGroups.update((groups) =>
      groups.map((group) => ({
        ...group,
        routes: group.routes.map((route) =>
          route.id === routeId ? { ...route, status } : route
        )
      }))
    );
  }

  toggleRouteExpand(routeId: string): void {
    this.departmentGroups.update((groups) =>
      groups.map((group) => ({
        ...group,
        routes: group.routes.map((route) =>
          route.id === routeId
            ? { ...route, isExpanded: !route.isExpanded }
            : route
        )
      }))
    );
  }
}
