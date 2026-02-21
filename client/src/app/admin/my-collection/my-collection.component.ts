import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService, ToyLine, Figure } from '../../core/api.service';

@Component({
  selector: 'app-my-collection',
  standalone: true,
  imports: [
    RouterLink, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatButtonModule, MatPaginatorModule,
  ],
  template: `
    <div class="page-container">
      <div class="header">
        <h1>My Collection</h1>
        <p>{{ totalFigures }} figures</p>
      </div>
      <div class="layout">
        <aside class="filters">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Search</mat-label>
            <input matInput [(ngModel)]="search" (input)="onFilterChange()" placeholder="Search figures...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          @if (toylines.length > 0) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Toyline</mat-label>
              <mat-select [(ngModel)]="selectedToylineId" (selectionChange)="onFilterChange()">
                <mat-option [value]="null">All Toylines</mat-option>
                @for (tl of toylines; track tl.id) {
                  <mat-option [value]="tl.id">{{ tl.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
        </aside>
        <main class="figures-grid">
          @for (figure of figures; track figure.id) {
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
          } @empty {
            <p class="empty-message">No figures in your collection yet. Browse the catalog and add some!</p>
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
    .figures-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      align-content: start;
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
export class MyCollectionComponent implements OnInit {
  toylines: ToyLine[] = [];
  figures: Figure[] = [];
  totalFigures = 0;
  currentPage = 1;
  pageSize = 20;
  search = '';
  selectedToylineId: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getToylines().subscribe((toylines) => {
      this.toylines = toylines;
    });
    this.loadCollection();
  }

  loadCollection(): void {
    this.api.getMyCollection({
      toylineId: this.selectedToylineId || undefined,
      search: this.search || undefined,
      page: this.currentPage,
      limit: this.pageSize,
    }).subscribe((result) => {
      this.figures = result.figures;
      this.totalFigures = result.total;
    });
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadCollection();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.loadCollection();
  }
}
