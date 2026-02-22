import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService, ToyLine, Figure } from '../../core/api.service';

@Component({
  selector: 'app-figure-list',
  standalone: true,
  imports: [
    RouterLink, FormsModule, MatTableModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatPaginatorModule,
  ],
  template: `
    <div class="page-container">
      <div class="header">
        <h1>Figures</h1>
        <a mat-raised-button color="accent" routerLink="/admin/figures/new">
          <mat-icon>add</mat-icon> Add Figure
        </a>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Search</mat-label>
          <input matInput [(ngModel)]="search" (input)="onFilterChange()" placeholder="Search by name...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Toyline</mat-label>
          <mat-select [(ngModel)]="selectedToylineId" (selectionChange)="onFilterChange()">
            <mat-option [value]="null">All Toylines</mat-option>
            @for (tl of toylines; track tl.id) {
              <mat-option [value]="tl.id">{{ tl.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <table mat-table [dataSource]="figures" class="figure-table">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let fig">{{ fig.name }}</td>
        </ng-container>
        <ng-container matColumnDef="toyline">
          <th mat-header-cell *matHeaderCellDef>Toyline</th>
          <td mat-cell *matCellDef="let fig">{{ fig.toyLine?.name }}</td>
        </ng-container>
        <ng-container matColumnDef="series">
          <th mat-header-cell *matHeaderCellDef>Series</th>
          <td mat-cell *matCellDef="let fig">{{ fig.series?.name }}{{ fig.subSeries ? ' / ' + fig.subSeries.name : '' }}</td>
        </ng-container>
        <ng-container matColumnDef="year">
          <th mat-header-cell *matHeaderCellDef>Year</th>
          <td mat-cell *matCellDef="let fig">{{ fig.year || '–' }}</td>
        </ng-container>
        <ng-container matColumnDef="accessories">
          <th mat-header-cell *matHeaderCellDef>Accessories</th>
          <td mat-cell *matCellDef="let fig">{{ fig.accessoryCount || 0 }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let fig">
            <a mat-icon-button [routerLink]="['/admin/figures', fig.id, 'edit']" matTooltip="Edit">
              <mat-icon>edit</mat-icon>
            </a>
            <button mat-icon-button color="warn" (click)="deleteFigure(fig)" matTooltip="Delete">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      @if (totalFigures > pageSize) {
        <mat-paginator
          [length]="totalFigures"
          [pageSize]="pageSize"
          [pageIndex]="currentPage - 1"
          (page)="onPageChange($event)"
          [hidePageSize]="true">
        </mat-paginator>
      }
    </div>
  `,
  styles: [`
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 16px;
      padding-bottom: 16px;
      h1 { color: #1565C0; margin: 0; font-weight: 700; }
    }
    .filters {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .figure-table {
      width: 100%;
      background: transparent !important;
    }
    td { color: #333; }
    mat-paginator { background: transparent !important; }
  `],
})
export class FigureListComponent implements OnInit {
  figures: Figure[] = [];
  toylines: ToyLine[] = [];
  totalFigures = 0;
  currentPage = 1;
  pageSize = 20;
  search = '';
  selectedToylineId: number | null = null;
  displayedColumns = ['name', 'toyline', 'series', 'year', 'accessories', 'actions'];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getToylines().subscribe((toylines) => {
      this.toylines = toylines;
    });
    this.loadFigures();
  }

  loadFigures(): void {
    this.api.getFigures({
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
    this.loadFigures();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.loadFigures();
  }

  deleteFigure(figure: Figure): void {
    if (!confirm(`Delete "${figure.name}"? This will also delete all accessories and photos.`)) return;
    this.api.deleteFigure(figure.id).subscribe(() => {
      this.loadFigures();
    });
  }
}
