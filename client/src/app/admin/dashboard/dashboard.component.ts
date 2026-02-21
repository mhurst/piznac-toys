import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, Stats } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <h1>Dashboard</h1>

      <h2>Catalog</h2>
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-icon>category</mat-icon>
          <div class="stat-value">{{ stats?.totalToylines || 0 }}</div>
          <div class="stat-label">Toylines</div>
        </mat-card>
        <mat-card class="stat-card">
          <mat-icon>smart_toy</mat-icon>
          <div class="stat-value">{{ stats?.totalFigures || 0 }}</div>
          <div class="stat-label">Figures</div>
        </mat-card>
        <mat-card class="stat-card">
          <mat-icon>build</mat-icon>
          <div class="stat-value">{{ stats?.totalAccessories || 0 }}</div>
          <div class="stat-label">Accessories</div>
        </mat-card>
      </div>

      @if (stats?.userStats) {
        <h2>My Collection</h2>
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-icon>collections_bookmark</mat-icon>
            <div class="stat-value">{{ stats?.userStats?.ownedFigures }}</div>
            <div class="stat-label">Figures Owned</div>
          </mat-card>
          <mat-card class="stat-card">
            <mat-icon>build</mat-icon>
            <div class="stat-value">{{ stats?.userStats?.ownedAccessories }}</div>
            <div class="stat-label">Accessories Owned</div>
          </mat-card>
          <mat-card class="stat-card">
            <mat-icon>pie_chart</mat-icon>
            <div class="stat-value">{{ stats?.userStats?.completionPercent }}%</div>
            <div class="stat-label">Completion</div>
          </mat-card>
        </div>
      }

      <div class="quick-links">
        <h2>Quick Actions</h2>
        <div class="links-grid">
          <a mat-raised-button routerLink="/admin/collection" color="primary">
            <mat-icon>collections_bookmark</mat-icon> My Collection
          </a>
          @if (auth.isAdmin) {
            <a mat-raised-button routerLink="/admin/toylines" color="primary">
              <mat-icon>settings</mat-icon> Manage Toylines
            </a>
            <a mat-raised-button routerLink="/admin/figures" color="primary">
              <mat-icon>list</mat-icon> Manage Figures
            </a>
            <a mat-raised-button routerLink="/admin/figures/new" color="accent">
              <mat-icon>add</mat-icon> Add Figure
            </a>
            <a mat-raised-button routerLink="/admin/invites" color="primary">
              <mat-icon>mail</mat-icon> Manage Invites
            </a>
            <a mat-raised-button routerLink="/admin/users" color="primary">
              <mat-icon>people</mat-icon> Manage Users
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    h1 { color: #1565C0; margin-bottom: 24px; font-weight: 700; }
    h2 { color: #333; margin: 32px 0 16px; font-weight: 600; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .stat-card {
      padding: 24px;
      text-align: center;
      mat-icon { font-size: 36px; width: 36px; height: 36px; color: #1565C0; }
    }
    .stat-value { font-size: 2rem; font-weight: 700; color: #333; margin: 8px 0 4px; }
    .stat-label { color: #777; font-size: 0.9rem; }
    .links-grid { display: flex; gap: 16px; flex-wrap: wrap; }
  `],
})
export class DashboardComponent implements OnInit {
  stats: Stats | null = null;

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.api.getStats().subscribe((stats) => {
      this.stats = stats;
    });
  }
}
