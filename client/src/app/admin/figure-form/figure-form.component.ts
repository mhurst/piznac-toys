import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService, ToyLine, Series, SubSeries, Tag, Figure, Accessory, Photo } from '../../core/api.service';

@Component({
  selector: 'app-figure-form',
  standalone: true,
  imports: [
    RouterLink, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <h1>{{ isEditing ? 'Edit Figure' : 'Add Figure' }}</h1>

      <mat-card class="form-card">
        <mat-card-content>
          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-field">
              <mat-label>Name</mat-label>
              <input matInput [(ngModel)]="name" required>
            </mat-form-field>
            <mat-form-field appearance="outline" class="small-field">
              <mat-label>Year</mat-label>
              <input matInput type="number" [(ngModel)]="year">
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-field">
              <mat-label>Toyline</mat-label>
              <mat-select [(ngModel)]="selectedToylineId" (selectionChange)="onToylineChange()" required>
                @for (tl of toylines; track tl.id) {
                  <mat-option [value]="tl.id">{{ tl.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-field">
              <mat-label>Series</mat-label>
              <mat-select [(ngModel)]="selectedSeriesId" (selectionChange)="onSeriesChange()" required>
                @for (s of availableSeries; track s.id) {
                  <mat-option [value]="s.id">{{ s.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          @if (availableSubSeries.length > 0) {
            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-field">
                <mat-label>Sub-Series</mat-label>
                <mat-select [(ngModel)]="selectedSubSeriesId">
                  <mat-option [value]="null">None</mat-option>
                  @for (ss of availableSubSeries; track ss.id) {
                    <mat-option [value]="ss.id">{{ ss.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          }

          @if (availableTags.length > 0) {
            <div class="tags-section">
              <h3>Tags</h3>
              <mat-chip-listbox multiple>
                @for (tag of availableTags; track tag.id) {
                  <mat-chip-option [selected]="selectedTagIds.includes(tag.id)"
                                   (selectionChange)="toggleTag(tag.id)">
                    {{ tag.name }}
                  </mat-chip-option>
                }
              </mat-chip-listbox>
            </div>
          }

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Notes</mat-label>
            <textarea matInput [(ngModel)]="notes" rows="3"></textarea>
          </mat-form-field>

          <div class="actions">
            <button mat-raised-button color="primary" (click)="save()" [disabled]="!canSave()">
              <mat-icon>save</mat-icon> {{ isEditing ? 'Update' : 'Create' }}
            </button>
            <a mat-button routerLink="/admin/figures">Cancel</a>
          </div>
        </mat-card-content>
      </mat-card>

      @if (isEditing && figure) {
        <mat-divider class="section-divider"></mat-divider>

        <mat-card class="form-card">
          <mat-card-content>
            <h2>Accessories</h2>
            <div class="add-inline">
              <mat-form-field appearance="outline" class="flex-field">
                <mat-label>Accessory Name</mat-label>
                <input matInput [(ngModel)]="newAccessoryName" (keyup.enter)="addAccessory()">
              </mat-form-field>
              <button mat-mini-fab color="primary" (click)="addAccessory()" [disabled]="!newAccessoryName.trim()">
                <mat-icon>add</mat-icon>
              </button>
            </div>
            <div class="accessory-list">
              @for (acc of accessories; track acc.id) {
                <div class="accessory-row">
                  <span>{{ acc.name }}</span>
                  <button mat-icon-button color="warn" (click)="deleteAccessory(acc)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
              @if (accessories.length === 0) {
                <p class="empty-text">No accessories added yet.</p>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <mat-divider class="section-divider"></mat-divider>

        <mat-card class="form-card">
          <mat-card-content>
            <h2>Photos</h2>
            <div class="upload-area"
                 (dragover)="onDragOver($event)"
                 (dragleave)="dragOver = false"
                 (drop)="onDrop($event)"
                 [class.drag-over]="dragOver">
              <mat-icon>cloud_upload</mat-icon>
              <p>Drag photos here or click to upload</p>
              <input type="file" multiple accept="image/*" (change)="onFileSelect($event)" #fileInput hidden>
              <button mat-raised-button (click)="fileInput.click()">Choose Files</button>
            </div>
            @if (uploading) {
              <p class="uploading-text">Uploading...</p>
            }
            <div class="photo-grid">
              @for (photo of photos; track photo.id) {
                <div class="photo-item" [class.primary]="photo.isPrimary">
                  <img [src]="'/uploads/' + photo.filename" [alt]="figure.name">
                  <div class="photo-actions">
                    @if (!photo.isPrimary) {
                      <button mat-icon-button (click)="setPrimary(photo)" matTooltip="Set as primary">
                        <mat-icon>star_border</mat-icon>
                      </button>
                    } @else {
                      <mat-icon class="primary-star">star</mat-icon>
                    }
                    <button mat-icon-button color="warn" (click)="deletePhoto(photo)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    h1 { color: #1565C0; margin-bottom: 24px; font-weight: 700; }
    h2 { color: #333; margin: 0 0 16px; font-weight: 600; }
    h3 { color: #555; font-size: 0.85rem; text-transform: uppercase; margin: 0 0 8px; }
    .form-card { padding: 16px; margin-bottom: 16px; }
    .form-row { display: flex; gap: 16px; }
    .flex-field { flex: 1; }
    .small-field { width: 120px; }
    .full-width { width: 100%; }
    .tags-section { margin-bottom: 16px; }
    .actions { display: flex; gap: 16px; margin-top: 16px; }
    .section-divider { margin: 24px 0; }
    .add-inline { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; }
    .accessory-list { display: flex; flex-direction: column; gap: 4px; }
    .accessory-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .empty-text { color: #999; font-style: italic; }
    .upload-area {
      border: 2px dashed #90CAF9;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      margin-bottom: 16px;
      background: #fafafa;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #1565C0; }
      p { color: #777; margin: 8px 0 16px; }
      &:hover { background: #e3f2fd; }
      &.drag-over { background: #e3f2fd; border-color: #1565C0; }
    }
    .uploading-text { color: #1565C0; text-align: center; }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }
    .photo-item {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid transparent;
      &.primary { border-color: #e4272e; }
      img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
    }
    .photo-actions {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      gap: 4px;
      padding: 4px;
    }
    .primary-star { color: #ffd700; padding: 8px; }
  `],
})
export class FigureFormComponent implements OnInit {
  isEditing = false;
  figure: Figure | null = null;
  toylines: ToyLine[] = [];
  availableSeries: Series[] = [];
  availableSubSeries: SubSeries[] = [];
  availableTags: Tag[] = [];
  accessories: Accessory[] = [];
  photos: Photo[] = [];

  name = '';
  year: number | null = null;
  notes = '';
  selectedToylineId: number | null = null;
  selectedSeriesId: number | null = null;
  selectedSubSeriesId: number | null = null;
  selectedTagIds: number[] = [];
  newAccessoryName = '';
  dragOver = false;
  uploading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    this.api.getToylines().subscribe((toylines) => {
      this.toylines = toylines;
    });

    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditing = true;
      this.api.getFigure(parseInt(id)).subscribe((figure) => {
        this.figure = figure;
        this.name = figure.name;
        this.year = figure.year;
        this.notes = figure.notes || '';
        this.selectedToylineId = figure.toyLineId;
        this.selectedSeriesId = figure.seriesId;
        this.selectedSubSeriesId = figure.subSeriesId;
        this.selectedTagIds = figure.tags.map((t) => t.id);
        this.accessories = figure.accessories;
        this.photos = figure.photos;
        this.onToylineChange();
      });
    }
  }

  onToylineChange(): void {
    if (!this.selectedToylineId) {
      this.availableSeries = [];
      this.availableSubSeries = [];
      this.availableTags = [];
      return;
    }
    const toyline = this.toylines.find((t) => t.id === this.selectedToylineId);
    if (toyline) {
      this.api.getToyline(toyline.slug).subscribe((full) => {
        this.availableSeries = full.series || [];
        this.availableTags = full.tags || [];
        this.onSeriesChange();
      });
    }
  }

  onSeriesChange(): void {
    if (!this.selectedSeriesId) {
      this.availableSubSeries = [];
      this.selectedSubSeriesId = null;
      return;
    }
    const series = this.availableSeries.find((s) => s.id === this.selectedSeriesId);
    this.availableSubSeries = series?.subSeries || [];
    if (this.availableSubSeries.length > 0 && this.selectedSubSeriesId) {
      const exists = this.availableSubSeries.some((ss) => ss.id === this.selectedSubSeriesId);
      if (!exists) this.selectedSubSeriesId = null;
    } else if (this.availableSubSeries.length === 0) {
      this.selectedSubSeriesId = null;
    }
  }

  toggleTag(tagId: number): void {
    const idx = this.selectedTagIds.indexOf(tagId);
    if (idx >= 0) {
      this.selectedTagIds.splice(idx, 1);
    } else {
      this.selectedTagIds.push(tagId);
    }
  }

  canSave(): boolean {
    return !!this.name.trim() && !!this.selectedToylineId && !!this.selectedSeriesId;
  }

  save(): void {
    if (!this.canSave()) return;

    const data = {
      name: this.name.trim(),
      year: this.year || undefined,
      notes: this.notes.trim() || undefined,
      toyLineId: this.selectedToylineId!,
      seriesId: this.selectedSeriesId!,
      subSeriesId: this.selectedSubSeriesId || null,
      tagIds: this.selectedTagIds,
    };

    if (this.isEditing && this.figure) {
      this.api.updateFigure(this.figure.id, data).subscribe((figure) => {
        this.figure = figure;
        this.router.navigate(['/admin/figures']);
      });
    } else {
      this.api.createFigure(data).subscribe((figure) => {
        this.router.navigate(['/admin/figures', figure.id, 'edit']);
      });
    }
  }

  // Accessories
  addAccessory(): void {
    if (!this.newAccessoryName.trim() || !this.figure) return;
    this.api.addAccessory(this.figure.id, this.newAccessoryName.trim()).subscribe((acc) => {
      this.accessories.push(acc);
      this.newAccessoryName = '';
    });
  }

  deleteAccessory(acc: Accessory): void {
    this.api.deleteAccessory(acc.id).subscribe(() => {
      this.accessories = this.accessories.filter((a) => a.id !== acc.id);
    });
  }

  // Photos
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.uploadFiles(Array.from(files));
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFiles(Array.from(input.files));
    }
  }

  uploadFiles(files: File[]): void {
    if (!this.figure || this.uploading) return;
    this.uploading = true;
    this.api.uploadPhotos(this.figure.id, files).subscribe({
      next: (photos) => {
        this.photos.push(...photos);
        this.uploading = false;
      },
      error: () => {
        this.uploading = false;
      },
    });
  }

  setPrimary(photo: Photo): void {
    this.api.setPrimaryPhoto(photo.id).subscribe(() => {
      this.photos.forEach((p) => (p.isPrimary = p.id === photo.id));
    });
  }

  deletePhoto(photo: Photo): void {
    this.api.deletePhoto(photo.id).subscribe(() => {
      this.photos = this.photos.filter((p) => p.id !== photo.id);
      if (photo.isPrimary && this.photos.length > 0) {
        this.photos[0].isPrimary = true;
      }
    });
  }
}
