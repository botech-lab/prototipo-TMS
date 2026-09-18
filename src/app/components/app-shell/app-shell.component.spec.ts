import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AppShellComponent } from './app-shell.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div data-testid="dummy-content">Vista Contenido Proyectado</div>`
})
class DummyRouteComponent {}

describe('AppShellComponent (TDD Suite - Aleta TMS)', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([
          { path: 'operaciones', component: DummyRouteComponent },
          { path: 'rutas-maestras', component: DummyRouteComponent },
          { path: 'programar', component: DummyRouteComponent },
          { path: 'usuarios', component: DummyRouteComponent },
          { path: 'vehiculos', component: DummyRouteComponent },
          { path: 'conductores', component: DummyRouteComponent },
          { path: 'administracion', component: DummyRouteComponent }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el shell correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe renderizar el logotipo "Aleta TMS" y el isotipo vectorial', () => {
    const brandTitle = fixture.debugElement.query(By.css('[data-testid="brand-name"]'));
    expect(brandTitle).toBeTruthy();
    expect(brandTitle.nativeElement.textContent).toContain('Aleta TMS');
  });

  it('debe renderizar las 4 entradas del menú lateral (Operación, Administración, Ventas, Informes)', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('[data-testid="shell-nav-link"]'));
    expect(navLinks.length).toBe(4);

    const labels = navLinks.map((l) => l.nativeElement.textContent);
    expect(labels[0]).toContain('Operación');
    expect(labels[1]).toContain('Administración');
    expect(labels[2]).toContain('Ventas');
    expect(labels[3]).toContain('Informes');
  });

  it('debe marcar como no navegables los módulos en preparación (Ventas, Informes)', () => {
    for (const id of ['ventas', 'informes']) {
      const soon = fixture.debugElement.query(By.css(`[data-nav-id="${id}"]`));
      expect(soon).toBeTruthy();
      expect(soon.nativeElement.getAttribute('aria-disabled')).toBe('true');
    }
  });

  it('debe marcar la sección y el subítem activos según la URL del router', async () => {
    await TestBed.inject(Router).navigateByUrl('/vehiculos');
    fixture.detectChanges();

    const section = fixture.debugElement.query(By.css('[data-nav-id="administracion"]'));
    expect(section.classes['shell__nav-link--active']).toBeTrue();

    const operacion = fixture.debugElement.query(By.css('[data-nav-id="operacion"]'));
    expect(operacion.classes['shell__nav-link--active']).toBeFalsy();

    const activeSublink = fixture.debugElement.query(By.css('.shell__sublink--active'));
    expect(activeSublink).toBeTruthy();
    expect(activeSublink.nativeElement.textContent).toContain('Vehículos');
    expect(activeSublink.nativeElement.getAttribute('aria-current')).toBe('page');
  });

  it('debe reconocer los alias de ruta (/programar activa "Rutas maestras" en Operación)', async () => {
    await TestBed.inject(Router).navigateByUrl('/programar');
    fixture.detectChanges();

    const section = fixture.debugElement.query(By.css('[data-nav-id="operacion"]'));
    expect(section.classes['shell__nav-link--active']).toBeTrue();

    const activeSublink = fixture.debugElement.query(By.css('.shell__sublink--active'));
    expect(activeSublink.nativeElement.textContent).toContain('Rutas maestras');
  });

  it('debe ofrecer el enlace "Saltar al contenido" como primer elemento enfocable', () => {
    const skip = fixture.debugElement.query(By.css('[data-testid="skip-link"]'));
    expect(skip).toBeTruthy();
    expect(skip.nativeElement.getAttribute('href')).toBe('#shell-main');
    expect(fixture.nativeElement.querySelector('a, button')).toBe(skip.nativeElement);
    expect(fixture.nativeElement.querySelector('#shell-main')).toBeTruthy();
  });

  it('debe renderizar el perfil de usuario en el Top Header con "Alex Rivera" y rol "Operaciones"', () => {
    const userName = fixture.debugElement.query(By.css('[data-testid="user-profile-name"]'));
    const userRole = fixture.debugElement.query(By.css('[data-testid="user-profile-role"]'));
    const avatar = fixture.debugElement.query(By.css('[data-testid="user-avatar"]'));

    expect(userName.nativeElement.textContent).toContain('Alex Rivera');
    expect(userRole.nativeElement.textContent).toContain('Operaciones');
    expect(avatar).toBeTruthy();
  });

  it('debe renderizar el botón de configuración rápida en la barra superior', () => {
    const settingsBtn = fixture.debugElement.query(By.css('[data-testid="btn-quick-settings"]'));
    expect(settingsBtn).toBeTruthy();
  });

  it('debe permitir abrir y cerrar el menú drawer móvil con el botón hamburguesa', () => {
    const burgerBtn = fixture.debugElement.query(By.css('[data-testid="btn-mobile-burger"]'));
    expect(burgerBtn).toBeTruthy();

    expect(fixture.debugElement.query(By.css('[data-testid="mobile-drawer"]'))).toBeNull();
    expect(burgerBtn.nativeElement.getAttribute('aria-expanded')).toBe('false');

    burgerBtn.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="mobile-drawer"]'))).toBeTruthy();
    expect(burgerBtn.nativeElement.getAttribute('aria-expanded')).toBe('true');

    const backdrop = fixture.debugElement.query(By.css('[data-testid="mobile-backdrop"]'));
    backdrop.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="mobile-drawer"]'))).toBeNull();
  });

  it('debe permitir colapsar y expandir el sidebar a modo mini-rail con el botón toggle', () => {
    const toggleBtn = fixture.debugElement.query(By.css('[data-testid="btn-toggle-sidebar"]'));
    expect(toggleBtn).toBeTruthy();

    const sidebar = fixture.debugElement.query(By.css('[data-testid="sidebar-container"]'));
    expect(sidebar.nativeElement.classList.contains('shell__sidebar--collapsed')).toBeFalse();
    expect(toggleBtn.nativeElement.getAttribute('aria-expanded')).toBe('true');

    toggleBtn.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(sidebar.nativeElement.classList.contains('shell__sidebar--collapsed')).toBeTrue();
    expect(toggleBtn.nativeElement.getAttribute('aria-expanded')).toBe('false');
  });

  it('debe cerrar el drawer móvil con Escape y devolver el foco a la hamburguesa', () => {
    const burgerBtn = fixture.debugElement.query(By.css('[data-testid="btn-mobile-burger"]'));
    burgerBtn.triggerEventHandler('click', null);
    fixture.detectChanges();

    const drawer = fixture.debugElement.query(By.css('[data-testid="mobile-drawer"]'));
    drawer.triggerEventHandler('keydown', new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="mobile-drawer"]'))).toBeNull();
    expect(document.activeElement).toBe(burgerBtn.nativeElement);
  });
});
