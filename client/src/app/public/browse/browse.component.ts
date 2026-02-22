import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService, ToyLine, Series, SubSeries, Tag, Figure } from '../../core/api.service';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [
    RouterLink, FormsModule, MatCardModule, MatChipsModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatIconModule, MatButtonModule, MatPaginatorModule,
  ],
  template: `
    <div class="page-container">
      <div class="header">
        <h1>{{ toyline?.name || 'Loading...' }}</h1>
        <p>{{ totalFigures }} figures</p>
      </div>
      <div class="layout">
        <aside class="filters">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Search</mat-label>
            <input matInput [(ngModel)]="search" (input)="onFilterChange()" placeholder="Search figures...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          @if (seriesList.length > 0) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Series</mat-label>
              <mat-select [(ngModel)]="selectedSeriesId" (selectionChange)="onSeriesFilterChange()">
                <mat-option [value]="null">All Series</mat-option>
                @for (s of seriesList; track s.id) {
                  <mat-option [value]="s.id">{{ s.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
          @if (subSeriesList.length > 0) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Sub-Series</mat-label>
              <mat-select [(ngModel)]="selectedSubSeriesId" (selectionChange)="onFilterChange()">
                <mat-option [value]="null">All Sub-Series</mat-option>
                @for (ss of subSeriesList; track ss.id) {
                  <mat-option [value]="ss.id">{{ ss.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
          @if (tags.length > 0) {
            <div class="tag-section">
              <h4>Tags</h4>
              <mat-chip-listbox multiple (change)="onFilterChange()">
                @for (tag of tags; track tag.id) {
                  <mat-chip-option [selected]="selectedTagIds.includes(tag.id)"
                                   (selectionChange)="toggleTag(tag.id)">
                    {{ tag.name }}
                  </mat-chip-option>
                }
              </mat-chip-listbox>
            </div>
          }
        </aside>
        <main class="figures-grid">
          @for (figure of figures; track figure.id) {
            <a [routerLink]="['/figure', figure.id]" class="figure-link">
              <mat-card class="figure-card" [class.owned]="figure.inCollection">
                <div class="card-image">
                  @if (figure.inCollection) {
                    <div class="owned-badge">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                  }
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
                  <p class="series-name">{{ figure.series.name }}{{ figure.subSeries ? ' / ' + figure.subSeries.name : '' }}</p>
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
          } @empty {
            <p class="empty-message">No figures found matching your filters.</p>
          }
          @if (totalFigures > pageSize) {
            <mat-paginator class="paginator"
                           [length]="totalFigures"
                           [pageSize]="pageSize"
                           [pageIndex]="currentPage - 1"
                           (page)="onPageChange($event)"
                           [hidePageSize]="true">
            </mat-paginator>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .header {
      padding: 24px 0 16px;
      margin-bottom: 16px;
      h1 { color: #1565C0; margin: 0 0 4px; font-weight: 700; }
      p { color: #777; margin: 0; }
    }
    .layout { display: flex; gap: 24px; }
    .filters { width: 260px; flex-shrink: 0; }
    .full-width { width: 100%; }
    .tag-section {
      h4 { color: #555; margin: 0 0 8px; font-size: 0.85rem; text-transform: uppercase; }
    }
    .figures-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      align-content: start;
    }
    .figure-link { text-decoration: none; }
    .figure-card { cursor: pointer; overflow: hidden; opacity: 0.55; transition: opacity 0.2s; }
    .figure-card:hover { opacity: 0.8; }
    .figure-card.owned { opacity: 1; }
    .figure-card.owned:hover { opacity: 1; }
    .card-image {
      height: 180px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e3f2fd;
      position: relative;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .owned-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      mat-icon { color: #4caf50; font-size: 28px; width: 28px; height: 28px;
                 background: white; border-radius: 50%; }
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
      padding: 12px;
      h3 { margin: 0 0 4px; font-size: 1rem; color: #333; font-weight: 600; }
    }
    .series-name { color: #777; margin: 0 0 8px; font-size: 0.85rem; }
    .completion { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #777; }
    .completion-bar { flex: 1; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
    .completion-fill { height: 100%; background: #4caf50; border-radius: 3px; transition: width 0.3s; }
    .empty-message { grid-column: 1 / -1; text-align: center; color: #999; padding: 48px 0; }
    .paginator { grid-column: 1 / -1; }
    @media (max-width: 768px) {
      .layout { flex-direction: column; }
      .filters { width: 100%; }
    }
  `],
})
export class BrowseComponent implements OnInit {
  toyline: ToyLine | null = null;
  seriesList: Series[] = [];
  subSeriesList: SubSeries[] = [];
  tags: Tag[] = [];
  figures: Figure[] = [];
  totalFigures = 0;
  currentPage = 1;
  pageSize = 20;
  search = '';
  selectedSeriesId: number | null = null;
  selectedSubSeriesId: number | null = null;
  selectedTagIds: number[] = [];

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      this.api.getToyline(slug).subscribe((toyline) => {
        this.toyline = toyline;
        this.seriesList = toyline.series || [];
        this.tags = toyline.tags || [];
        this.loadFigures();
      });
    });
  }

  loadFigures(): void {
    if (!this.toyline) return;
    this.api.getFigures({
      toylineId: this.toyline.id,
      seriesId: this.selectedSeriesId || undefined,
      subSeriesId: this.selectedSubSeriesId || undefined,
      tagIds: this.selectedTagIds.length ? this.selectedTagIds : undefined,
      search: this.search || undefined,
      page: this.currentPage,
      limit: this.pageSize,
    }).subscribe((result) => {
      this.figures = result.figures;
      this.totalFigures = result.total;
    });
  }

  onSeriesFilterChange(): void {
    this.selectedSubSeriesId = null;
    if (this.selectedSeriesId) {
      const series = this.seriesList.find((s) => s.id === this.selectedSeriesId);
      this.subSeriesList = series?.subSeries || [];
    } else {
      this.subSeriesList = [];
    }
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadFigures();
  }

  toggleTag(tagId: number): void {
    const idx = this.selectedTagIds.indexOf(tagId);
    if (idx >= 0) {
      this.selectedTagIds.splice(idx, 1);
    } else {
      this.selectedTagIds.push(tagId);
    }
    this.onFilterChange();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.loadFigures();
  }
}
