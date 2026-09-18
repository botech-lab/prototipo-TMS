import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppShellComponent } from './components/app-shell/app-shell.component';
import { ToastHostComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppShellComponent, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-shell>
      <router-outlet></router-outlet>
    </app-shell>
    <app-toast-host />
  `
})
export class AppComponent {}
