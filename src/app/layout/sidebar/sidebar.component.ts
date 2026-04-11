import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutShellService } from '../layout-shell.service';
import { SidebarMenuItem } from '../../core/models/navigation.model';
import { Role } from '../../core/models/role.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly layoutShellService = inject(LayoutShellService);
  private touchStartX = 0;
  private touchStartY = 0;

  private readonly menuItems: SidebarMenuItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN]
    },
    {
      label: 'Dashboard Two',
      route: '/dashboard-two',
      allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN]
    },
    {
      label: 'Audits',
      route: '/audits',
      allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN]
    },
    {
      label: 'Red Tags',
      route: '/red-tags',
      allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN]
    },
    {
      label: 'Audit Checklist',
      route: '/checklists',
      allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN]
    },
    {
      label: 'User Management',
      route: '/user-management',
      allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN]
    },
    {
      label: 'Zones',
      route: '/zones',
      allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN]
    },
    {
      label: 'Profile',
      route: '/profile',
      allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN]
    },
    {
      label: 'Companies',
      route: '/companies',
      allowedRoles: [Role.SUPER_ADMIN]
    },
    {
      label: 'Reports',
      route: '/reports',
      allowedRoles: [Role.SUPER_ADMIN]
    }
  ];

  readonly visibleMenuItems = computed(() =>
    this.menuItems.filter((item) => this.authService.hasAnyRole(item.allowedRoles))
  );

  protected onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  protected onTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    if (deltaX < -60 && Math.abs(deltaY) < 80) {
      this.closeMobileMenu();
    }
  }

  protected closeMobileMenu(): void {
    this.layoutShellService.closeMobileMenu();
  }
}
