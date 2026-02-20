import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';
import { AuthService } from './core/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule, AsyncPipe],
  template: `
    <mat-toolbar class="app-toolbar">
      <a routerLink="/" class="logo">PIZNAC TOYS</a>
      <span class="spacer"></span>
      <a mat-button routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
      @if (auth.isLoggedIn$ | async) {
        <a mat-button routerLink="/admin" routerLinkActive="active">Admin</a>
        <a mat-icon-button routerLink="/admin/profile">
          <mat-icon>account_circle</mat-icon>
        </a>
        <button mat-button (click)="logout()">
          <mat-icon>logout</mat-icon>
          Logout
        </button>
      } @else {
        <a mat-button routerLink="/login" routerLinkActive="active">Login</a>
      }
    </mat-toolbar>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      text-decoration: none;
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      letter-spacing: 2px;
    }
    .spacer { flex: 1; }
    .active { font-weight: 700; }
  `],
})
export class AppComponent {
  constructor(public auth: AuthService, private router: Router) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
