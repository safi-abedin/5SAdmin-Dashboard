import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from './core/models/role.model';

export const routes: Routes = [
	{
		path: 'login',
		loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent)
	},
	{
		path: '',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
		children: [
			{
				path: 'dashboard',
				loadComponent: () =>
					import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
			},
			{
				path: 'companies',
				canActivate: [roleGuard],
				data: {
					roles: [Role.SUPER_ADMIN]
				},
				loadComponent: () =>
					import('./features/company/company.component').then((m) => m.CompanyComponent)
			},
			{
				path: 'checklists',
				loadComponent: () =>
					import('./features/checklist/checklist.component').then((m) => m.ChecklistComponent)
			},
			{
				path: 'user-management',
				data: {
					title: 'User Management'
				},
				loadComponent: () =>
					import('./features/user-management/user-management.component').then(
						(m) => m.UserManagementComponent
					)
			},
			{
				path: 'zones',
				data: {
					title: 'Zone Management'
				},
				loadComponent: () => import('./features/zone/zone.component').then((m) => m.ZoneComponent)
			},
			{
				path: 'audit',
				redirectTo: 'checklists',
				pathMatch: 'full'
			},
			{
				path: 'reports',
				canActivate: [roleGuard],
				data: {
					roles: [Role.SUPER_ADMIN]
				},
				loadComponent: () =>
					import('./features/reports/reports.component').then((m) => m.ReportsComponent)
			},
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'dashboard'
			}
		]
	},
	{
		path: '**',
		redirectTo: ''
	}
];
