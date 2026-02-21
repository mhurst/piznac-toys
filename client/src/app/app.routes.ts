import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/admin.guard';

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
    path: 'user/:id',
    loadComponent: () => import('./public/user-profile/user-profile.component').then((m) => m.UserProfileComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./admin/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./admin/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./public/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./public/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
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
        canActivate: [adminGuard],
        loadComponent: () => import('./admin/manage-toylines/manage-toylines.component').then((m) => m.ManageToylinesComponent),
      },
      {
        path: 'figures',
        canActivate: [adminGuard],
        loadComponent: () => import('./admin/figure-list/figure-list.component').then((m) => m.FigureListComponent),
      },
      {
        path: 'figures/new',
        canActivate: [adminGuard],
        loadComponent: () => import('./admin/figure-form/figure-form.component').then((m) => m.FigureFormComponent),
      },
      {
        path: 'figures/:id/edit',
        canActivate: [adminGuard],
        loadComponent: () => import('./admin/figure-form/figure-form.component').then((m) => m.FigureFormComponent),
      },
      {
        path: 'collection',
        loadComponent: () => import('./admin/my-collection/my-collection.component').then((m) => m.MyCollectionComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./admin/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'invites',
        canActivate: [adminGuard],
        loadComponent: () => import('./admin/invites/invites.component').then((m) => m.InvitesComponent),
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () => import('./admin/manage-users/manage-users.component').then((m) => m.ManageUsersComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
