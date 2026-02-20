import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, ToyLine } from '../../core/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule],
  template: `
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
    .toyline-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      margin-top: 8px;
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
      img { max-width: 90%; max-height: 80%; object-fit: contain; }
    }
    .placeholder-image {
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: #1565C0; opacity: 0.3; }
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
  `],
})
export class HomeComponent implements OnInit {
  toylines: ToyLine[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getToylines().subscribe((toylines) => {
      this.toylines = toylines;
    });
  }
}
