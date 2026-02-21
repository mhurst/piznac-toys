import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import {
  ApiService, DrillDownToyline, DrillDownSeries,
  NeedsFigure, ForSaleFigure, PublicProfile,
} from '../../core/api.service';

@Component({
  selector: 'app-user-drill-down',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatChipsModule],
  template: `
    <div class="page-container">
      @if (userName) {
        <div class="breadcrumb">
          <a [routerLink]="['/user', userId]">{{ userName }}</a>
          @if (toylineName) {
            <span> / </span>
            <a [routerLink]="['/user', userId, mode, toylineSlug]">{{ toylineName }}</a>
          }
          @if (seriesName) {
            <span> / </span>
            <span>{{ seriesName }}</span>
          }
        </div>
      }

      <h1>{{ mode === 'needs' ? 'What I Need' : 'For Sale / Trade' }}</h1>

      <!-- Level 1: Toylines -->
      @if (level === 1) {
        @if (toylines.length === 0) {
          <p class="empty">{{ mode === 'needs' ? 'No missing accessories!' : 'Nothing for sale or trade.' }}</p>
        }
        <div class="card-grid">
          @for (tl of toylines; track tl.slug) {
            <a [routerLink]="['/user', userId, mode, tl.slug]" class="card-link">
              <mat-card class="drill-card">
                <div class="card-image">
                  @if (tl.coverImage) {
                    <img [src]="'/uploads/' + tl.coverImage" [alt]="tl.name">
                  } @else {
                    <div class="placeholder-image"><mat-icon>category</mat-icon></div>
                  }
                </div>
                <mat-card-content>
                  <h3>{{ tl.name }}</h3>
                  <p class="count">{{ tl.itemCount }} figure{{ tl.itemCount !== 1 ? 's' : '' }}</p>
                </mat-card-content>
              </mat-card>
            </a>
          }
        </div>
      }

      <!-- Level 2: Series -->
      @if (level === 2) {
        @if (seriesList.length === 0) {
          <p class="empty">No items found in this toyline.</p>
        }
        <div class="card-grid">
          @for (s of seriesList; track s.slug) {
            <a [routerLink]="['/user', userId, mode, toylineSlug, s.slug]" class="card-link">
              <mat-card class="drill-card series-card">
                <mat-card-content>
                  <h3>{{ s.name }}</h3>
                  <p class="count">{{ s.itemCount }} figure{{ s.itemCount !== 1 ? 's' : '' }}</p>
                </mat-card-content>
              </mat-card>
            </a>
          }
        </div>
      }

      <!-- Level 3: Figures -->
      @if (level === 3 && mode === 'needs') {
        @if (needsFigures.length === 0) {
          <p class="empty">No missing accessories in this series.</p>
        }
        @for (fig of needsFigures; track fig.id) {
          <mat-card class="figure-row">
            <a [routerLink]="['/figure', fig.id]" class="figure-link">
              <div class="figure-thumb">
                @if (fig.primaryPhoto) {
                  <img [src]="'/uploads/' + fig.primaryPhoto.filename" [alt]="fig.name">
                } @else {
                  <mat-icon>image</mat-icon>
                }
              </div>
              <div class="figure-info">
                <h3>{{ fig.name }}</h3>
                <div class="items-list">
                  @for (acc of fig.missingAccessories; track acc.id) {
                    <mat-chip>{{ acc.name }}</mat-chip>
                  }
                </div>
              </div>
            </a>
          </mat-card>
        }
      }

      @if (level === 3 && mode === 'for-sale') {
        @if (forSaleFigures.length === 0) {
          <p class="empty">Nothing for sale in this series.</p>
        }
        @for (fig of forSaleFigures; track fig.id) {
          <mat-card class="figure-row">
            <a [routerLink]="['/figure', fig.id]" class="figure-link">
              <div class="figure-thumb">
                @if (fig.primaryPhoto) {
                  <img [src]="'/uploads/' + fig.primaryPhoto.filename" [alt]="fig.name">
                } @else {
                  <mat-icon>image</mat-icon>
                }
              </div>
              <div class="figure-info">
                <h3>
                  {{ fig.name }}
                  @if (fig.figureForSale) {
                    <span class="for-sale-badge">Figure for sale</span>
                  }
                </h3>
                @if (fig.forSaleAccessories.length > 0) {
                  <div class="items-list">
                    @for (acc of fig.forSaleAccessories; track acc.id) {
                      <mat-chip>{{ acc.name }}</mat-chip>
                    }
                  </div>
                }
              </div>
            </a>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    h1 { color: #333; margin: 0 0 24px; }
    .breadcrumb {
      padding: 16px 0;
      color: #777;
      font-size: 0.9rem;
      a { color: #1565C0; text-decoration: none; &:hover { text-decoration: underline; } }
    }
    .empty { color: #999; font-size: 1.1rem; margin-top: 32px; }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .card-link { text-decoration: none; color: inherit; }
    .drill-card {
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      h3 { margin: 8px 0 4px; font-size: 1rem; color: #333; }
      .count { color: #777; font-size: 0.85rem; margin: 0; }
    }
    .card-image {
      height: 140px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fafafa;
      border-radius: 4px 4px 0 0;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .placeholder-image {
      color: #ccc;
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
    }
    .series-card { padding: 16px; }
    .figure-row {
      margin-bottom: 12px;
      .figure-link {
        display: flex;
        gap: 16px;
        align-items: center;
        text-decoration: none;
        color: inherit;
        padding: 12px;
      }
    }
    .figure-thumb {
      width: 80px;
      height: 80px;
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      background: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      img { width: 100%; height: 100%; object-fit: cover; }
      mat-icon { font-size: 36px; width: 36px; height: 36px; color: #ccc; }
    }
    .figure-info {
      h3 { margin: 0 0 8px; color: #333; font-size: 1rem; }
    }
    .items-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .for-sale-badge {
      font-size: 0.75rem;
      background: #ff9800;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      margin-left: 8px;
      font-weight: 500;
    }
  `],
})
export class UserDrillDownComponent implements OnInit {
  mode: 'needs' | 'for-sale' = 'needs';
  level = 1;
  userId = 0;
  userName = '';
  toylineSlug = '';
  toylineName = '';
  seriesName = '';

  toylines: DrillDownToyline[] = [];
  seriesList: DrillDownSeries[] = [];
  needsFigures: NeedsFigure[] = [];
  forSaleFigures: ForSaleFigure[] = [];

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] || 'needs';

    this.route.params.subscribe((params) => {
      this.userId = parseInt(params['id']);
      this.toylineSlug = params['toylineSlug'] || '';
      const seriesSlug = params['seriesSlug'] || '';

      if (seriesSlug) {
        this.level = 3;
      } else if (this.toylineSlug) {
        this.level = 2;
      } else {
        this.level = 1;
      }

      this.api.getPublicProfile(this.userId).subscribe((profile) => {
        this.userName = profile.name || 'User';
      });

      this.loadData(seriesSlug);
    });
  }

  private loadData(seriesSlug: string): void {
    if (this.mode === 'needs') {
      this.loadNeeds(seriesSlug);
    } else {
      this.loadForSale(seriesSlug);
    }
  }

  private loadNeeds(seriesSlug: string): void {
    if (this.level === 1) {
      this.api.getUserNeeds(this.userId).subscribe((data) => {
        this.toylines = data;
      });
    } else if (this.level === 2) {
      this.api.getUserNeedsByToyline(this.userId, this.toylineSlug).subscribe((data) => {
        this.toylineName = data.toyline.name;
        this.seriesList = data.series;
      });
    } else {
      this.api.getUserNeedsBySeries(this.userId, this.toylineSlug, seriesSlug).subscribe((data) => {
        this.toylineName = data.toyline.name;
        this.seriesName = data.series.name;
        this.needsFigures = data.figures;
      });
    }
  }

  private loadForSale(seriesSlug: string): void {
    if (this.level === 1) {
      this.api.getUserForSale(this.userId).subscribe((data) => {
        this.toylines = data;
      });
    } else if (this.level === 2) {
      this.api.getUserForSaleByToyline(this.userId, this.toylineSlug).subscribe((data) => {
        this.toylineName = data.toyline.name;
        this.seriesList = data.series;
      });
    } else {
      this.api.getUserForSaleBySeries(this.userId, this.toylineSlug, seriesSlug).subscribe((data) => {
        this.toylineName = data.toyline.name;
        this.seriesName = data.series.name;
        this.forSaleFigures = data.figures;
      });
    }
  }
}
