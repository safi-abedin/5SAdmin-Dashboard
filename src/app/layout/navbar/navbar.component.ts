import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-navbar',
  imports: [NgOptimizedImage],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  logout(): void {
    this.authService.logout();
    this.toastService.info('You have been logged out.');
    this.router.navigate(['/login']);
  }
}
