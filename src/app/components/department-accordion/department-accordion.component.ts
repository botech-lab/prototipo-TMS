import {
  Component,
  ChangeDetectionStrategy,
  input,
  output
} from '@angular/core';

import { DepartmentGroup } from '../../models/route.model';
import { RouteCardComponent } from '../route-card/route-card.component';

let nextAccordionId = 0;

@Component({
  selector: 'app-department-accordion',
  imports: [RouteCardComponent],
  templateUrl: './department-accordion.component.html',
  styleUrls: ['./department-accordion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentAccordionComponent {
  /** Prefijo único para enlazar el botón con su región (aria-controls). */
  protected readonly uid = `dept-acc-${++nextAccordionId}`;

  readonly department = input.required<DepartmentGroup>();
  readonly secondaryDepartments = input<DepartmentGroup[]>([]);

  readonly toggleDepartment = output<string>();
  readonly selectDepartment = output<string>();
  readonly routeStatusToggle = output<string>();
  readonly routeExpandToggle = output<string>();
  readonly routeEdit = output<string>();

  onHeaderClick(): void {
    this.toggleDepartment.emit(this.department().department);
  }

  onSelectSecondary(deptName: string): void {
    this.selectDepartment.emit(deptName);
  }
}
