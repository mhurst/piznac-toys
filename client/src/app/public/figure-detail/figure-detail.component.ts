import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { ApiService, Figure, Photo } from '../../core/api.service';

@Component({
  selector: 'app-figure-detail',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatChipsModule, MatIconModule, MatButtonModule, MatListModule],
  template: `
    <div class="page-container">
      @if (figure) {
        <div class="breadcrumb">
          <a routerLink="/">Home</a>
          <span> / </span>
          <a [routerLink]="['/browse', figure.toyLine.slug]">{{ figure.toyLine.name }}</a>
          <span> / </span>
          <span>{{ figure.name }}</span>
        </div>
        <div class="detail-layout">
          <div class="gallery">
            <div class="main-photo">
              @if (selectedPhoto) {
                <img [src]="'/uploads/' + selectedPhoto.filename" [alt]="figure.name">
              } @else {
                <div class="no-photo">
                  <mat-icon>image</mat-icon>
                  <p>No photos yet</p>
                </div>
              }
            </div>
            @if (figure.photos.length > 1) {
              <div class="thumbnails">
                @for (photo of figure.photos; track photo.id) {
                  <img [src]="'/uploads/' + photo.filename"
                       [class.selected]="photo.id === selectedPhoto?.id"
                       (click)="selectedPhoto = photo"
                       [alt]="figure.name">
                }
              </div>
            }
          </div>
          <div class="info">
            <h1>
              {{ figure.name }}
              @if (figure.owned) {
                <mat-icon class="owned-badge">check_circle</mat-icon>
              }
            </h1>
            <div class="meta">
              <span class="series">{{ figure.series.name }}</span>
              @if (figure.year) {
                <span class="year">{{ figure.year }}</span>
              }
            </div>
            @if (figure.tags.length > 0) {
              <div class="tags">
                @for (tag of figure.tags; track tag.id) {
                  <mat-chip>{{ tag.name }}</mat-chip>
                }
              </div>
            }
            @if (figure.notes) {
              <div class="notes">
                <h3>Notes</h3>
                <p>{{ figure.notes }}</p>
              </div>
            }
            @if (figure.accessories.length > 0) {
              <div class="accessories">
                <h3>Accessories ({{ ownedCount }}/{{ figure.accessories.length }})</h3>
                <mat-list>
                  @for (acc of figure.accessories; track acc.id) {
                    <mat-list-item>
                      <mat-icon matListItemIcon [class.owned]="acc.owned">
                        {{ acc.owned ? 'check_circle' : 'radio_button_unchecked' }}
                      </mat-icon>
                      <span [class.not-owned]="!acc.owned">{{ acc.name }}</span>
                    </mat-list-item>
                  }
                </mat-list>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .breadcrumb {
      padding: 16px 0;
      color: #777;
      font-size: 0.9rem;
      a { color: #1565C0; }
    }
    .detail-layout { display: flex; gap: 32px; }
    .gallery { flex: 1; max-width: 500px; }
    .main-photo {
      width: 100%;
      aspect-ratio: 1;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #eee;
      img { width: 100%; height: 100%; object-fit: contain; }
    }
    .no-photo {
      text-align: center;
      color: #ccc;
      mat-icon { font-size: 64px; width: 64px; height: 64px; }
      p { margin: 8px 0 0; }
    }
    .thumbnails {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      overflow-x: auto;
      img {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 6px;
        cursor: pointer;
        border: 2px solid #eee;
        transition: border-color 0.2s;
        &.selected { border-color: #1565C0; }
        &:hover { border-color: #42A5F5; }
      }
    }
    .info {
      flex: 1;
      h1 { color: #333; margin: 0 0 8px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
      .owned-badge { color: #4caf50; font-size: 28px; width: 28px; height: 28px; }
    }
    .meta {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      .series { color: #1565C0; font-weight: 600; }
      .year { color: #777; }
    }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
    .notes {
      margin-bottom: 24px;
      h3 { color: #555; font-size: 0.85rem; text-transform: uppercase; margin: 0 0 8px; }
      p { color: #333; line-height: 1.6; }
    }
    .accessories {
      h3 { color: #555; font-size: 0.85rem; text-transform: uppercase; margin: 0 0 8px; }
    }
    .owned { color: #4caf50; }
    .not-owned { color: #ccc; }
    @media (max-width: 768px) {
      .detail-layout { flex-direction: column; }
      .gallery { max-width: 100%; }
    }
  `],
})
export class FigureDetailComponent implements OnInit {
  figure: Figure | null = null;
  selectedPhoto: Photo | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  get ownedCount(): number {
    return this.figure?.accessories.filter((a) => a.owned).length || 0;
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = parseInt(params['id']);
      this.api.getFigure(id).subscribe((figure) => {
        this.figure = figure;
        this.selectedPhoto = figure.photos.find((p) => p.isPrimary) || figure.photos[0] || null;
      });
    });
  }
}
