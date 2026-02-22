import { Component, OnInit, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { AsyncPipe } from '@angular/common';
import { AuthService } from './core/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule, MatSidenavModule, MatListModule, AsyncPipe],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav mode="over" position="end" class="mobile-nav">
        <mat-nav-list (click)="sidenav.close()">
          <a mat-list-item routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <mat-icon matListItemIcon>home</mat-icon>
            <span matListItemTitle>Home</span>
          </a>
          @if (auth.isLoggedIn$ | async) {
            <a mat-list-item routerLink="/admin/collection" routerLinkActive="active">
              <mat-icon matListItemIcon>collections_bookmark</mat-icon>
              <span matListItemTitle>My Collection</span>
            </a>
            <a mat-list-item [routerLink]="['/user', auth.userId, 'needs']">
              <mat-icon matListItemIcon>checklist</mat-icon>
              <span matListItemTitle>What I Need</span>
            </a>
            <a mat-list-item [routerLink]="['/user', auth.userId, 'for-sale']">
              <mat-icon matListItemIcon>sell</mat-icon>
              <span matListItemTitle>For Sale / Trade</span>
            </a>
            @if (auth.isAdmin) {
              <a mat-list-item routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
                <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
                <span matListItemTitle>Admin</span>
              </a>
            }
            <a mat-list-item routerLink="/admin/profile">
              <mat-icon matListItemIcon>account_circle</mat-icon>
              <span matListItemTitle>Profile</span>
            </a>
            <a mat-list-item (click)="logout()">
              <mat-icon matListItemIcon>logout</mat-icon>
              <span matListItemTitle>Logout</span>
            </a>
          } @else {
            <a mat-list-item routerLink="/login" routerLinkActive="active">
              <mat-icon matListItemIcon>login</mat-icon>
              <span matListItemTitle>Login</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="app-toolbar">
          <a routerLink="/" class="logo">PIZNAC TOYS</a>
          <span class="spacer"></span>

          <!-- Desktop nav -->
          <div class="desktop-nav">
            <a mat-button routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
            @if (auth.isLoggedIn$ | async) {
              <a mat-button routerLink="/admin/collection" routerLinkActive="active">My Collection</a>
              <a mat-button [routerLink]="['/user', auth.userId, 'needs']">What I Need</a>
              <a mat-button [routerLink]="['/user', auth.userId, 'for-sale']">For Sale / Trade</a>
              @if (auth.isAdmin) {
                <a mat-button routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Admin</a>
              }
              <a mat-icon-button routerLink="/admin/profile" class="avatar-link">
                @if ((auth.currentUser$ | async)?.avatar) {
                  <img [src]="'/uploads/' + (auth.currentUser$ | async)?.avatar" class="nav-avatar" alt="Avatar">
                } @else {
                  <mat-icon>account_circle</mat-icon>
                }
              </a>
              <button mat-button (click)="logout()">
                <mat-icon>logout</mat-icon>
                Logout
              </button>
            } @else {
              <a mat-button routerLink="/login" routerLinkActive="active">Login</a>
            }
          </div>

          <!-- Mobile hamburger -->
          <button mat-icon-button class="mobile-menu-btn" (click)="sidenav.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
        </mat-toolbar>

        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  constructor(public auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Validate session cookie on app startup
    if (this.auth.isLoggedIn) {
      this.auth.checkSession().subscribe();
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
