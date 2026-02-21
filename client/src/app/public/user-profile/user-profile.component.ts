import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { DatePipe } from '@angular/common';
import { ApiService, PublicProfile, Figure } from '../../core/api.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatPaginatorModule, DatePipe],
  template: `
    <div class="page-container">
      @if (user) {
        <mat-card class="profile-card">
          <div class="profile-header">
            @if (user.avatar) {
              <img [src]="'/uploads/' + user.avatar" class="profile-avatar" alt="Avatar">
            } @else {
              <mat-icon class="profile-avatar-icon">account_circle</mat-icon>
            }
            <div class="profile-info">
              <h1>{{ user.name || 'Anonymous' }}</h1>
              <p class="member-since">Member since {{ user.createdAt | date:'longDate' }}</p>
              <p class="figure-count">{{ user._count.figures }} figure{{ user._count.figures !== 1 ? 's' : '' }} collected</p>
            </div>
          </div>
          @if (user.bio) {
            <div class="bio-section">
              <h3>About</h3>
              <p>{{ user.bio }}</p>
            </div>
          }
        </mat-card>

        @if (figures.length > 0) {
          <h2 class="collection-heading">Collection</h2>
          <div class="figures-grid">
            @for (figure of figures; track figure.id) {
              <a [routerLink]="['/figure', figure.id]" class="figure-link">
                <mat-card class="figure-card">
                  <div class="card-image">
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
                  </mat-card-content>
                </mat-card>
              </a>
            }
          </div>
          @if (totalFigures > pageSize) {
            <mat-paginator
              [length]="totalFigures"
              [pageSize]="pageSize"
              [pageIndex]="currentPage - 1"
              (page)="onPageChange($event)"
              [hidePageSize]="true">
            </mat-paginator>
          }
        }
      } @else if (error) {
        <div class="error-message">{{ error }}</div>
      } @else {
        <p>Loading...</p>
      }
    </div>
  `,
  styles: [`
    .profile-card { max-width: 600px; padding: 32px; }
    .profile-header { display: flex; align-items: center; gap: 24px; }
    .profile-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
    }
    .profile-avatar-icon { font-size: 120px; width: 120px; height: 120px; color: #bdbdbd; }
    h1 { color: #1565C0; margin: 0 0 8px; font-weight: 700; }
    .member-since { color: #777; margin: 0 0 4px; }
    .figure-count { color: #555; margin: 0; font-weight: 600; }
    .bio-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; }
    .bio-section h3 { color: #333; margin: 0 0 8px; font-weight: 600; }
    .bio-section p { color: #555; line-height: 1.6; white-space: pre-wrap; }
    .error-message {
      background: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 4px;
      text-align: center;
    }
    .collection-heading {
      color: #1565C0;
      font-weight: 700;
      margin: 32px 0 16px;
    }
    .figures-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .figure-link { text-decoration: none; }
    .figure-card { cursor: pointer; overflow: hidden; transition: opacity 0.2s; }
    .figure-card:hover { opacity: 0.9; }
    .card-image {
      height: 180px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e3f2fd;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .placeholder-image {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #1565C0; opacity: 0.25; }
    }
    .figure-card mat-card-content {
      padding: 12px;
      h3 { margin: 0 0 4px; font-size: 1rem; color: #333; font-weight: 600; }
    }
    .series-name { color: #777; margin: 0; font-size: 0.85rem; }
    mat-paginator { margin-top: 16px; }
  `],
})
export class UserProfileComponent implements OnInit {
  user: PublicProfile | null = null;
  error = '';
  figures: Figure[] = [];
  totalFigures = 0;
  currentPage = 1;
  pageSize = 20;
  private userId = 0;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getPublicProfile(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        this.loadCollection();
      },
      error: () => this.error = 'User not found',
    });
  }

  loadCollection(): void {
    this.api.getPublicCollection(this.userId, {
      page: this.currentPage,
      limit: this.pageSize,
    }).subscribe((result) => {
      this.figures = result.figures;
      this.totalFigures = result.total;
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.loadCollection();
  }
}
