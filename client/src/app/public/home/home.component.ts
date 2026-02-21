import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService, ToyLine, Figure } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    @if (loggedIn) {
      <div class="hero collection-hero">
        <h1>My Collection</h1>
        <p>{{ collectionTotal }} figure{{ collectionTotal !== 1 ? 's' : '' }}</p>
      </div>
      <div class="page-container">
        @if (collectionFigures.length > 0) {
          <div class="figures-grid">
            @for (figure of collectionFigures; track figure.id) {
              <a [routerLink]="['/figure', figure.id]" class="figure-link">
                <mat-card class="figure-card">
                  <div class="card-image">
                    <div class="owned-badge">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                    @if (figure.primaryPhoto) {
                      <img [src]="'/uploads/' + figure.primaryPhoto.filename" [alt]="figure.name">
                    } @else {
                      <div class="placeholder-image">
                        <mat-icon>image</mat-icon>
                      </div>
                    }
                  </div>
                  <mat-card-content>
                    <h3>{{ figure.name }}</h3>
                    <p class="series-name">{{ figure.series.name }}</p>
                    @if (figure.accessoryCount) {
                      <div class="completion">
                        <div class="completion-bar">
                          <div class="completion-fill"
                               [style.width.%]="(figure.ownedAccessoryCount || 0) / figure.accessoryCount * 100">
                          </div>
                        </div>
                        <span>{{ figure.ownedAccessoryCount }}/{{ figure.accessoryCount }}</span>
                      </div>
                    }
                  </mat-card-content>
                </mat-card>
              </a>
            }
          </div>
          @if (collectionTotal > 20) {
            <div class="view-all">
              <a mat-stroked-button routerLink="/admin/collection">View All {{ collectionTotal }} Figures</a>
            </div>
          }
        } @else {
          <div class="empty-collection">
            <mat-icon>collections_bookmark</mat-icon>
            <p>Your collection is empty. Browse the catalog below and start adding figures!</p>
          </div>
        }

        <div class="browse-section">
          <h2>Browse Catalog</h2>
          <div class="toyline-grid compact">
            @for (toyline of toylines; track toyline.id) {
              <a [routerLink]="['/browse', toyline.slug]" class="toyline-link">
                <mat-card class="toyline-card">
                  <div class="card-image small">
                    @if (toyline.coverImage) {
                      <img [src]="'/uploads/' + toyline.coverImage" [alt]="toyline.name">
                    } @else {
                      <div class="placeholder-image">
                        <mat-icon>toys</mat-icon>
                      </div>
                    }
                  </div>
                  <mat-card-content>
                    <h3>{{ toyline.name }}</h3>
                    <span class="count">{{ toyline._count?.figures || 0 }} figures</span>
                  </mat-card-content>
                </mat-card>
              </a>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="hero">
        <h1>The Collection</h1>
        <p>Vintage toys from the golden era</p>
      </div>
      <div class="page-container">
        <div class="toyline-grid">
          @for (toyline of toylines; track toyline.id) {
            <a [routerLink]="['/browse', toyline.slug]" class="toyline-link">
              <mat-card class="toyline-card">
                <div class="card-image">
                  @if (toyline.coverImage) {
                    <img [src]="'/uploads/' + toyline.coverImage" [alt]="toyline.name">
                  } @else {
                    <div class="placeholder-image">
                      <mat-icon>toys</mat-icon>
                    </div>
                  }
                </div>
                <mat-card-content>
                  <h3>{{ toyline.name }}</h3>
                  <span class="count">{{ toyline._count?.figures || 0 }} figures</span>
                </mat-card-content>
              </mat-card>
            </a>
          } @empty {
            <div class="empty-state">
              <mat-icon>toys</mat-icon>
              <p>No toylines yet. Check back soon!</p>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .hero {
      background: linear-gradient(135deg, #1565C0, #1E88E5);
      padding: 48px 24px;
      text-align: center;
      color: #fff;
      h1 { font-size: 2.5rem; font-weight: 800; margin: 0 0 8px; }
      p { margin: 0; opacity: 0.85; font-size: 1.1rem; }
    }
    .collection-hero {
      background: linear-gradient(135deg, #2E7D32, #43A047);
    }
    .toyline-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      margin-top: 8px;
    }
    .toyline-grid.compact {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .toyline-link { text-decoration: none; }
    .toyline-card { cursor: pointer; overflow: hidden; }
    .card-image {
      height: 200px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      position: relative;
      img { max-width: 90%; max-height: 80%; object-fit: contain; }
    }
    .card-image.small {
      height: 140px;
    }
    .placeholder-image {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #1565C0; opacity: 0.25; }
    }
    mat-card-content {
      padding: 16px;
      h3 { margin: 0 0 4px; font-size: 1.1rem; font-weight: 600; color: #333; }
    }
    .count { color: #777; font-size: 0.85rem; }
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 64px 0;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: #1565C0; opacity: 0.25; }
      p { color: #999; font-size: 1.1rem; margin-top: 12px; }
    }

    /* Collection grid */
    .figures-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      margin-top: 8px;
    }
    .figure-link { text-decoration: none; }
    .figure-card { cursor: pointer; overflow: hidden; transition: opacity 0.2s; }
    .figure-card:hover { opacity: 0.9; }
    .figure-card .card-image {
      height: 180px;
      background: #e3f2fd;
      img { width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: cover; }
    }
    .owned-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      mat-icon { color: #4caf50; font-size: 28px; width: 28px; height: 28px;
                 background: white; border-radius: 50%; }
    }
    .figure-card mat-card-content {
      padding: 12px;
      h3 { font-size: 1rem; }
    }
    .series-name { color: #777; margin: 0 0 8px; font-size: 0.85rem; }
    .completion { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #777; }
    .completion-bar { flex: 1; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
    .completion-fill { height: 100%; background: #4caf50; border-radius: 3px; transition: width 0.3s; }

    .view-all { text-align: center; margin: 24px 0; }
    .empty-collection {
      text-align: center;
      padding: 48px 0;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: #2E7D32; opacity: 0.3; }
      p { color: #999; font-size: 1.1rem; margin-top: 12px; }
    }
    .browse-section {
      margin-top: 48px;
      padding-top: 32px;
      border-top: 1px solid #eee;
      h2 { color: #1565C0; font-weight: 700; margin: 0 0 16px; }
    }
  `],
})
export class HomeComponent implements OnInit {
  toylines: ToyLine[] = [];
  collectionFigures: Figure[] = [];
  collectionTotal = 0;
  loggedIn = false;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.loggedIn = this.auth.isLoggedIn;
    this.api.getToylines().subscribe((toylines) => {
      this.toylines = toylines;
    });

    if (this.loggedIn) {
      this.api.getMyCollection({ page: 1, limit: 20 }).subscribe((result) => {
        this.collectionFigures = result.figures;
        this.collectionTotal = result.total;
      });
    }
  }
}
