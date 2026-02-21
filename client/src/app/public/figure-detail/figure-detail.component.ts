import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService, Figure, Photo, PriceData } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-figure-detail',
  standalone: true,
  imports: [
    RouterLink, FormsModule, MatCardModule, MatChipsModule, MatIconModule,
    MatButtonModule, MatListModule, MatCheckboxModule, MatFormFieldModule, MatInputModule,
  ],
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
            @if (catalogPhotos.length > 1) {
              <div class="thumbnails">
                @for (photo of catalogPhotos; track photo.id) {
                  <img [src]="'/uploads/' + photo.filename"
                       [class.selected]="photo.id === selectedPhoto?.id"
                       (click)="selectedPhoto = photo"
                       [alt]="figure.name">
                }
              </div>
            }
            @if (auth.isLoggedIn && userPhotos.length > 0) {
              <div class="user-photos-section">
                <h3>My Photos</h3>
                <div class="thumbnails">
                  @for (photo of userPhotos; track photo.id) {
                    <div class="user-thumb-wrapper">
                      <img [src]="'/uploads/' + photo.filename"
                           [class.selected]="photo.id === selectedPhoto?.id"
                           (click)="selectedPhoto = photo"
                           [alt]="figure.name">
                      <button mat-icon-button class="delete-photo-btn" (click)="deleteUserPhoto(photo)">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
            @if (auth.isLoggedIn && figure.inCollection) {
              <div class="upload-section">
                <input type="file" multiple accept="image/*" (change)="onFileSelect($event)" #fileInput hidden>
                <button mat-stroked-button (click)="fileInput.click()" [disabled]="uploading">
                  <mat-icon>add_photo_alternate</mat-icon>
                  {{ uploading ? 'Uploading...' : 'Add My Photos' }}
                </button>
                @if (auth.isAdmin) {
                  <label class="catalog-checkbox">
                    <mat-checkbox [(ngModel)]="uploadToCatalog">Also add to main catalog</mat-checkbox>
                  </label>
                }
              </div>
            }
          </div>
          <div class="info">
            <h1>
              {{ figure.name }}
              @if (figure.inCollection) {
                <mat-icon class="owned-badge">check_circle</mat-icon>
              }
            </h1>
            <div class="meta">
              <span class="series">{{ figure.series.name }}</span>
              @if (figure.year) {
                <span class="year">{{ figure.year }}</span>
              }
            </div>

            @if (auth.isLoggedIn) {
              <div class="collection-actions">
                @if (figure.inCollection) {
                  <button mat-raised-button color="warn" (click)="removeFromCollection()">
                    <mat-icon>remove_circle</mat-icon> Remove from Collection
                  </button>
                  <label class="for-sale-toggle">
                    <mat-checkbox [checked]="figure.forSale" (change)="toggleFigureForSale()">
                      For Sale / Trade
                    </mat-checkbox>
                  </label>
                } @else {
                  <button mat-raised-button color="primary" (click)="addToCollection()">
                    <mat-icon>add_circle</mat-icon> Add to Collection
                  </button>
                }
              </div>
            }

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
            <div class="market-value">
              <h3>Market Value</h3>
              @if (priceLoading) {
                <p class="price-loading">Loading price data...</p>
              } @else if (!priceData || !priceData.configured) {
                <p class="price-na">eBay pricing not configured.</p>
              } @else if (priceData.resultCount === 0) {
                <p class="price-na">No pricing data available.</p>
              } @else {
                <div class="price-grid">
                  <div class="price-item">
                    <span class="price-label">Average</span>
                    <span class="price-value">{{ formatUSD(priceData.avgPrice) }}</span>
                  </div>
                  <div class="price-item">
                    <span class="price-label">Low</span>
                    <span class="price-value low">{{ formatUSD(priceData.lowPrice) }}</span>
                  </div>
                  <div class="price-item">
                    <span class="price-label">High</span>
                    <span class="price-value high">{{ formatUSD(priceData.highPrice) }}</span>
                  </div>
                </div>
                <div class="price-meta">
                  <span>Based on {{ priceData.resultCount }} eBay listings</span>
                  @if (priceData.lastUpdated) {
                    <span>Updated {{ timeAgo(priceData.lastUpdated) }}</span>
                  }
                </div>
                <div class="price-query">Search: "{{ priceData.searchQuery }}"</div>
              }
              @if (auth.isAdmin && priceData?.configured) {
                <button mat-stroked-button class="refresh-btn" (click)="refreshPrice()" [disabled]="priceRefreshing">
                  <mat-icon>refresh</mat-icon> {{ priceRefreshing ? 'Refreshing...' : 'Refresh' }}
                </button>
              }
            </div>
            <div class="accessories">
              <h3>
                Accessories
                @if (figure.accessories.length > 0 && figure.inCollection) {
                  ({{ ownedCount }}/{{ figure.accessories.length }})
                } @else if (figure.accessories.length > 0) {
                  ({{ figure.accessories.length }})
                }
              </h3>
              @if (figure.accessories.length > 0) {
                <mat-list>
                  @for (acc of figure.accessories; track acc.id) {
                    <mat-list-item>
                      @if (auth.isLoggedIn && figure.inCollection) {
                        <mat-checkbox [checked]="acc.owned"
                                      (change)="toggleAccessory(acc)"
                                      matListItemIcon>
                        </mat-checkbox>
                      } @else {
                        <mat-icon matListItemIcon [class.owned]="acc.owned">
                          {{ acc.owned ? 'check_circle' : 'radio_button_unchecked' }}
                        </mat-icon>
                      }
                      <span [class.not-owned]="!acc.owned">{{ acc.name }}</span>
                      @if (auth.isLoggedIn && figure.inCollection && acc.owned) {
                        <mat-checkbox [checked]="acc.forSale" (change)="toggleAccessoryForSale(acc)" class="acc-for-sale">
                          For Sale
                        </mat-checkbox>
                      }
                      @if (auth.isAdmin) {
                        <button mat-icon-button class="delete-acc-btn" (click)="deleteAccessory(acc)">
                          <mat-icon>close</mat-icon>
                        </button>
                      }
                    </mat-list-item>
                  }
                </mat-list>
              } @else {
                <p class="no-accessories">No accessories added yet.</p>
              }
              @if (auth.isAdmin) {
                <div class="add-accessory">
                  <mat-form-field appearance="outline" class="acc-input">
                    <mat-label>Add accessory</mat-label>
                    <input matInput [(ngModel)]="newAccessoryName" (keyup.enter)="addAccessory()" placeholder="e.g. Sword, Shield...">
                  </mat-form-field>
                  <button mat-stroked-button (click)="addAccessory()" [disabled]="!newAccessoryName.trim()">
                    <mat-icon>add</mat-icon> Add
                  </button>
                </div>
              }
            </div>
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
    .user-photos-section {
      margin-top: 16px;
      h3 { color: #555; font-size: 0.85rem; text-transform: uppercase; margin: 0 0 8px; }
    }
    .user-thumb-wrapper {
      position: relative;
      display: inline-block;
    }
    .delete-photo-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      line-height: 24px;
      background: rgba(0,0,0,0.6);
      color: white;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .upload-section { margin-top: 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .catalog-checkbox { font-size: 0.85rem; }
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
    .collection-actions { margin-bottom: 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .for-sale-toggle { font-size: 0.85rem; }
    .acc-for-sale { margin-left: auto; font-size: 0.8rem; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
    .notes {
      margin-bottom: 24px;
      h3 { color: #555; font-size: 0.85rem; text-transform: uppercase; margin: 0 0 8px; }
      p { color: #333; line-height: 1.6; }
    }
    .accessories {
      h3 { color: #555; font-size: 0.85rem; text-transform: uppercase; margin: 0 0 8px; }
    }
    .market-value {
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      h3 { color: #555; font-size: 0.85rem; text-transform: uppercase; margin: 0 0 12px; }
    }
    .price-loading, .price-na { color: #999; font-size: 0.9rem; margin: 0; }
    .price-grid {
      display: flex; gap: 16px; margin-bottom: 8px;
      .price-item { flex: 1; text-align: center; }
      .price-label { display: block; font-size: 0.75rem; color: #777; text-transform: uppercase; }
      .price-value { display: block; font-size: 1.25rem; font-weight: 700; color: #333; }
      .price-value.low { color: #4caf50; }
      .price-value.high { color: #e53935; }
    }
    .price-meta {
      display: flex; gap: 16px; font-size: 0.8rem; color: #777; margin-bottom: 4px; flex-wrap: wrap;
    }
    .price-query { font-size: 0.75rem; color: #aaa; font-style: italic; }
    .refresh-btn { margin-top: 8px; font-size: 0.8rem; }
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
  uploading = false;
  uploadToCatalog = false;
  newAccessoryName = '';
  priceData: PriceData | null = null;
  priceLoading = false;
  priceRefreshing = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    public auth: AuthService,
  ) {}

  get catalogPhotos(): Photo[] {
    return this.figure?.photos.filter((p) => p.userId === null) || [];
  }

  get userPhotos(): Photo[] {
    return this.figure?.photos.filter((p) => p.userId !== null) || [];
  }

  get ownedCount(): number {
    return this.figure?.accessories.filter((a) => a.owned).length || 0;
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = parseInt(params['id']);
      this.loadFigure(id);
    });
  }

  loadFigure(id: number): void {
    this.api.getFigure(id).subscribe((figure) => {
      this.figure = figure;
      this.selectedPhoto = figure.photos.find((p) => p.isPrimary) || figure.photos[0] || null;
      this.loadPrice(id);
    });
  }

  loadPrice(figureId: number): void {
    this.priceLoading = true;
    this.api.getFigurePrice(figureId).subscribe({
      next: (data) => {
        this.priceData = data;
        this.priceLoading = false;
      },
      error: () => {
        this.priceData = null;
        this.priceLoading = false;
      },
    });
  }

  refreshPrice(): void {
    if (!this.figure) return;
    this.priceRefreshing = true;
    this.api.refreshFigurePrice(this.figure.id).subscribe({
      next: (data) => {
        this.priceData = data;
        this.priceRefreshing = false;
      },
      error: () => {
        this.priceRefreshing = false;
      },
    });
  }

  formatUSD(value: number | null): string {
    if (value === null || value === undefined) return '-';
    return '$' + value.toFixed(2);
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  addToCollection(): void {
    if (!this.figure) return;
    this.api.addToCollection(this.figure.id).subscribe(() => {
      this.figure!.inCollection = true;
    });
  }

  removeFromCollection(): void {
    if (!this.figure) return;
    this.api.removeFromCollection(this.figure.id).subscribe(() => {
      this.figure!.inCollection = false;
      this.figure!.accessories.forEach((a) => (a.owned = false));
    });
  }

  toggleAccessory(acc: any): void {
    const newOwned = !acc.owned;
    this.api.toggleAccessoryOwned(acc.id, newOwned).subscribe(() => {
      acc.owned = newOwned;
      // If marking accessory owned auto-added figure to collection
      if (newOwned) {
        this.figure!.inCollection = true;
      }
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length && this.figure) {
      this.uploading = true;
      const catalog = this.auth.isAdmin && this.uploadToCatalog;
      this.api.uploadPhotos(this.figure.id, Array.from(input.files), catalog).subscribe({
        next: (photos) => {
          this.figure!.photos.push(...photos);
          if (!this.selectedPhoto && photos.length > 0) {
            this.selectedPhoto = photos[0];
          }
          this.uploading = false;
          input.value = '';
        },
        error: () => {
          this.uploading = false;
          input.value = '';
        },
      });
    }
  }

  addAccessory(): void {
    const name = this.newAccessoryName.trim();
    if (!name || !this.figure) return;
    this.api.addAccessory(this.figure.id, name).subscribe((acc) => {
      this.figure!.accessories.push({ ...acc, owned: false });
      this.newAccessoryName = '';
    });
  }

  deleteAccessory(acc: any): void {
    this.api.deleteAccessory(acc.id).subscribe(() => {
      this.figure!.accessories = this.figure!.accessories.filter((a) => a.id !== acc.id);
    });
  }

  toggleFigureForSale(): void {
    if (!this.figure) return;
    const newVal = !this.figure.forSale;
    this.api.toggleFigureForSale(this.figure.id, newVal).subscribe(() => {
      this.figure!.forSale = newVal;
    });
  }

  toggleAccessoryForSale(acc: any): void {
    const newVal = !acc.forSale;
    this.api.toggleAccessoryForSale(acc.id, newVal).subscribe(() => {
      acc.forSale = newVal;
    });
  }

  deleteUserPhoto(photo: Photo): void {
    this.api.deletePhoto(photo.id).subscribe(() => {
      this.figure!.photos = this.figure!.photos.filter((p) => p.id !== photo.id);
      if (this.selectedPhoto?.id === photo.id) {
        this.selectedPhoto = this.catalogPhotos[0] || this.userPhotos[0] || null;
      }
    });
  }
}
