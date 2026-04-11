import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

  private readonly menuItems: SidebarMenuItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
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
}
