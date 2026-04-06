import { Role } from './role.model';

export interface SidebarMenuItem {
  label: string;
  route: string;
  allowedRoles: Role[];
}
