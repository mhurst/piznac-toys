import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./public/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'browse/:slug',
    loadComponent: () => import('./public/browse/browse.component').then((m) => m.BrowseComponent),
  },
  {
    path: 'figure/:id',
    loadComponent: () => import('./public/figure-detail/figure-detail.component').then((m) => m.FigureDetailComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./admin/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'toylines',
        loadComponent: () => import('./admin/manage-toylines/manage-toylines.component').then((m) => m.ManageToylinesComponent),
      },
      {
        path: 'figures',
        loadComponent: () => import('./admin/figure-list/figure-list.component').then((m) => m.FigureListComponent),
      },
      {
        path: 'figures/new',
        loadComponent: () => import('./admin/figure-form/figure-form.component').then((m) => m.FigureFormComponent),
      },
      {
        path: 'figures/:id/edit',
        loadComponent: () => import('./admin/figure-form/figure-form.component').then((m) => m.FigureFormComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./admin/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
