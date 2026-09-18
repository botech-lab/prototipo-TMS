import { Injectable } from '@angular/core';
import { ScheduleOperationsService } from './schedule-operations.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService extends ScheduleOperationsService {}

export * from './schedule-operations.service';
