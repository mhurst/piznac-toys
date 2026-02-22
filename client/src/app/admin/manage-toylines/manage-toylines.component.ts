import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService, ToyLine, Series, SubSeries, Tag } from '../../core/api.service';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-manage-toylines',
  standalone: true,
  imports: [
    FormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatExpansionModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <h1>Manage Toylines</h1>

      <div class="add-form">
        <mat-form-field appearance="outline">
          <mat-label>New Toyline Name</mat-label>
          <input matInput [(ngModel)]="newToylineName" (keyup.enter)="addToyline()">
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="addToyline()" [disabled]="!newToylineName.trim()">
          <mat-icon>add</mat-icon> Add Toyline
        </button>
      </div>

      <mat-accordion>
        @for (toyline of toylines; track toyline.id) {
          <mat-expansion-panel (opened)="onPanelOpen(toyline)">
            <mat-expansion-panel-header>
              <mat-panel-title>{{ toyline.name }}</mat-panel-title>
              <mat-panel-description>
                {{ toyline._count?.figures || 0 }} figures
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="edit-form">
              <div class="form-row">
                <mat-form-field appearance="outline" class="flex-field">
                  <mat-label>Name</mat-label>
                  <input matInput [(ngModel)]="editToylineName">
                </mat-form-field>
              </div>

              <h3>Cover Image</h3>
              <div class="cover-area">
                <div class="cover-preview-box">
                  @if (coverPreviewUrl) {
                    <img [src]="coverPreviewUrl" [alt]="editToylineName" class="cover-img">
                  } @else if (toyline.coverImage) {
                    <img [src]="'/uploads/' + toyline.coverImage" [alt]="toyline.name" class="cover-img">
                  } @else {
                    <div class="cover-placeholder">
                      <mat-icon>image</mat-icon>
                      <span>No cover image</span>
                    </div>
                  }
                </div>
                <div class="cover-actions">
                  <input type="file" accept="image/*" #coverInput hidden
                         (change)="onCoverSelect($event)">
                  <button mat-stroked-button (click)="coverInput.click()">
                    <mat-icon>upload</mat-icon> {{ (toyline.coverImage || coverFile) ? 'Change Image' : 'Choose Image' }}
                  </button>
                  @if (coverPreviewUrl) {
                    <button mat-button color="warn" (click)="clearCoverSelection(coverInput)">
                      <mat-icon>close</mat-icon> Remove
                    </button>
                  }
                </div>
              </div>

              <div class="form-actions">
                <button mat-raised-button color="primary" (click)="saveToyline(toyline)"
                        [disabled]="!editToylineName.trim() || saving">
                  <mat-icon>save</mat-icon> {{ saving ? 'Saving...' : 'Save' }}
                </button>
                <button mat-button color="warn" (click)="deleteToyline(toyline)">
                  <mat-icon>delete</mat-icon> Delete
                </button>
              </div>
            </div>

            <mat-divider></mat-divider>

            <div class="section">
              <h3>Series</h3>
              <div class="add-inline">
                <mat-form-field appearance="outline" class="small-field">
                  <mat-label>New Series</mat-label>
                  <input matInput [(ngModel)]="newSeriesName" (keyup.enter)="addSeries(toyline)">
                </mat-form-field>
                <button mat-mini-fab color="primary" (click)="addSeries(toyline)" [disabled]="!newSeriesName.trim()">
                  <mat-icon>add</mat-icon>
                </button>
              </div>
              <div class="item-list">
                @for (s of toyline.series || []; track s.id) {
                  <div class="item-row">
                    @if (editingSeries === s.id) {
                      <input matInput [(ngModel)]="editSeriesName" (keyup.enter)="saveSeries(s)" class="inline-edit">
                      <button mat-icon-button (click)="saveSeries(s)"><mat-icon>check</mat-icon></button>
                      <button mat-icon-button (click)="editingSeries = null"><mat-icon>close</mat-icon></button>
                    } @else {
                      <span>{{ s.name }}</span>
                      <button mat-icon-button (click)="startEditSeries(s)"><mat-icon>edit</mat-icon></button>
                      <button mat-icon-button color="warn" (click)="deleteSeries(s, toyline)"><mat-icon>delete</mat-icon></button>
                    }
                  </div>
                  <div class="sub-series-section">
                    @for (ss of s.subSeries || []; track ss.id) {
                      <div class="item-row sub-item">
                        @if (editingSubSeries === ss.id) {
                          <input matInput [(ngModel)]="editSubSeriesName" (keyup.enter)="saveSubSeries(ss)" class="inline-edit">
                          <button mat-icon-button (click)="saveSubSeries(ss)"><mat-icon>check</mat-icon></button>
                          <button mat-icon-button (click)="editingSubSeries = null"><mat-icon>close</mat-icon></button>
                        } @else {
                          <span>{{ ss.name }}</span>
                          <button mat-icon-button (click)="startEditSubSeries(ss)"><mat-icon>edit</mat-icon></button>
                          <button mat-icon-button color="warn" (click)="deleteSubSeries(ss, s)"><mat-icon>delete</mat-icon></button>
                        }
                      </div>
                    }
                    <div class="add-inline sub-add">
                      <mat-form-field appearance="outline" class="small-field">
                        <mat-label>New Sub-Series</mat-label>
                        <input matInput [(ngModel)]="newSubSeriesName" (keyup.enter)="addSubSeries(s)">
                      </mat-form-field>
                      <button mat-mini-fab color="primary" (click)="addSubSeries(s)" [disabled]="!newSubSeriesName.trim()">
                        <mat-icon>add</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <mat-divider></mat-divider>

            <div class="section">
              <h3>Tags</h3>
              <div class="add-inline">
                <mat-form-field appearance="outline" class="small-field">
                  <mat-label>New Tag</mat-label>
                  <input matInput [(ngModel)]="newTagName" (keyup.enter)="addTag(toyline)">
                </mat-form-field>
                <button mat-mini-fab color="primary" (click)="addTag(toyline)" [disabled]="!newTagName.trim()">
                  <mat-icon>add</mat-icon>
                </button>
              </div>
              <div class="chip-list">
                @for (tag of toyline.tags || []; track tag.id) {
                  <mat-chip class="tag-chip">
                    @if (editingTag === tag.id) {
                      <ng-container>
                        <input [(ngModel)]="editTagName" (keyup.enter)="saveTag(tag, toyline)" class="chip-edit"
                               (click)="$event.stopPropagation()">
                        <button matChipTrailingIcon (click)="saveTag(tag, toyline)"><mat-icon>check</mat-icon></button>
                      </ng-container>
                    } @else {
                      <ng-container>
                        {{ tag.name }}
                        <button matChipTrailingIcon (click)="startEditTag(tag)"><mat-icon>edit</mat-icon></button>
                        <button matChipTrailingIcon (click)="deleteTag(tag, toyline)"><mat-icon>close</mat-icon></button>
                      </ng-container>
                    }
                  </mat-chip>
                }
              </div>
            </div>
          </mat-expansion-panel>
        }
      </mat-accordion>
    </div>
  `,
  styles: [`
    h1 { color: #1565C0; margin-bottom: 24px; font-weight: 700; }
    h3 { color: #555; font-size: 0.85rem; text-transform: uppercase; margin: 16px 0 8px; }
    .add-form {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 24px;
    }
    .edit-form { padding: 8px 0; }
    .form-row { display: flex; gap: 16px; }
    .flex-field { flex: 1; }
    .form-actions { display: flex; gap: 16px; margin-top: 16px; }
    .add-inline {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }
    .small-field { width: 200px; }
    .inline-edit {
      background: #fff;
      border: 1px solid #1565C0;
      color: #333;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: inherit;
    }
    .item-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .item-row {
      display: flex;
      align-items: center;
      gap: 8px;
      span { flex: 1; color: #333; }
    }
    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip-edit {
      background: transparent;
      border: none;
      color: inherit;
      width: 80px;
      font-size: inherit;
    }
    .sub-series-section { margin-left: 32px; }
    .sub-item { font-size: 0.9rem; }
    .sub-add { margin-top: 4px; }
    .section { padding: 8px 0; }
    .cover-area {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .cover-preview-box {
      width: 200px;
      height: 120px;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #eee;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      flex-shrink: 0;
    }
    .cover-img {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }
    .cover-placeholder {
      text-align: center;
      color: #bbb;
      mat-icon { font-size: 36px; width: 36px; height: 36px; display: block; margin: 0 auto 4px; }
      span { font-size: 0.8rem; }
    }
    .cover-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  `],
})
export class ManageToylinesComponent implements OnInit {
  toylines: ToyLine[] = [];
  newToylineName = '';
  newSeriesName = '';
  newTagName = '';

  // Toyline edit state
  editToylineName = '';
  coverFile: File | null = null;
  coverPreviewUrl: string | null = null;
  saving = false;

  newSubSeriesName = '';

  // Series/tag/sub-series inline edit
  editingSeries: number | null = null;
  editSeriesName = '';
  editingSubSeries: number | null = null;
  editSubSeriesName = '';
  editingTag: number | null = null;
  editTagName = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadToylines();
  }

  loadToylines(): void {
    this.api.getToylines().subscribe((toylines) => {
      this.toylines = toylines;
    });
  }

  onPanelOpen(toyline: ToyLine): void {
    // Load details and initialize edit form
    this.editToylineName = toyline.name;
    this.coverFile = null;
    this.coverPreviewUrl = null;
    this.api.getToyline(toyline.slug).subscribe((full) => {
      toyline.series = full.series;
      toyline.tags = full.tags;
    });
  }

  addToyline(): void {
    if (!this.newToylineName.trim()) return;
    this.api.createToyline(this.newToylineName.trim()).subscribe(() => {
      this.newToylineName = '';
      this.loadToylines();
    });
  }

  onCoverSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.coverFile = file;
    // Create local preview URL
    this.coverPreviewUrl = URL.createObjectURL(file);
  }

  clearCoverSelection(input: HTMLInputElement): void {
    if (this.coverPreviewUrl) URL.revokeObjectURL(this.coverPreviewUrl);
    this.coverFile = null;
    this.coverPreviewUrl = null;
    input.value = '';
  }

  saveToyline(toyline: ToyLine): void {
    if (!this.editToylineName.trim() || this.saving) return;
    this.saving = true;

    const nameChanged = this.editToylineName.trim() !== toyline.name;

    // Run name update and cover upload in parallel if both needed
    const nameUpdate$ = nameChanged
      ? this.api.updateToyline(toyline.id, { name: this.editToylineName.trim() })
      : of(null);
    const coverUpload$ = this.coverFile
      ? this.api.uploadToylineCover(toyline.id, this.coverFile)
      : of(null);

    forkJoin([nameUpdate$, coverUpload$]).subscribe({
      next: ([nameResult, coverResult]) => {
        if (nameResult) {
          toyline.name = nameResult.name;
          toyline.slug = nameResult.slug;
        }
        if (coverResult) {
          toyline.coverImage = coverResult.coverImage;
        }
        if (this.coverPreviewUrl) URL.revokeObjectURL(this.coverPreviewUrl);
        this.coverFile = null;
        this.coverPreviewUrl = null;
        this.saving = false;
      },
      error: (err) => {
        console.error('Error saving toyline:', err);
        alert('Failed to save toyline. Check console for details.');
        this.saving = false;
      },
    });
  }

  deleteToyline(toyline: ToyLine): void {
    if (!confirm(`Delete "${toyline.name}" and all its figures? This cannot be undone.`)) return;
    this.api.deleteToyline(toyline.id).subscribe(() => {
      this.loadToylines();
    });
  }

  addSeries(toyline: ToyLine): void {
    if (!this.newSeriesName.trim()) return;
    this.api.createSeries(this.newSeriesName.trim(), toyline.id).subscribe((series) => {
      this.newSeriesName = '';
      if (!toyline.series) toyline.series = [];
      toyline.series.push(series);
    });
  }

  startEditSeries(series: Series): void {
    this.editingSeries = series.id;
    this.editSeriesName = series.name;
  }

  saveSeries(series: Series): void {
    if (!this.editSeriesName.trim()) return;
    this.api.updateSeries(series.id, this.editSeriesName.trim()).subscribe(() => {
      series.name = this.editSeriesName.trim();
      this.editingSeries = null;
    });
  }

  deleteSeries(series: Series, toyline: ToyLine): void {
    if (!confirm(`Delete series "${series.name}"?`)) return;
    this.api.deleteSeries(series.id).subscribe(() => {
      toyline.series = toyline.series?.filter((s) => s.id !== series.id);
    });
  }

  addSubSeries(series: Series): void {
    if (!this.newSubSeriesName.trim()) return;
    this.api.createSubSeries(this.newSubSeriesName.trim(), series.id).subscribe((ss) => {
      this.newSubSeriesName = '';
      if (!series.subSeries) series.subSeries = [];
      series.subSeries.push(ss);
    });
  }

  startEditSubSeries(ss: SubSeries): void {
    this.editingSubSeries = ss.id;
    this.editSubSeriesName = ss.name;
  }

  saveSubSeries(ss: SubSeries): void {
    if (!this.editSubSeriesName.trim()) return;
    this.api.updateSubSeries(ss.id, this.editSubSeriesName.trim()).subscribe(() => {
      ss.name = this.editSubSeriesName.trim();
      this.editingSubSeries = null;
    });
  }

  deleteSubSeries(ss: SubSeries, series: Series): void {
    if (!confirm(`Delete sub-series "${ss.name}"?`)) return;
    this.api.deleteSubSeries(ss.id).subscribe(() => {
      series.subSeries = series.subSeries?.filter((s) => s.id !== ss.id);
    });
  }

  addTag(toyline: ToyLine): void {
    if (!this.newTagName.trim()) return;
    this.api.createTag(this.newTagName.trim(), toyline.id).subscribe((tag) => {
      this.newTagName = '';
      if (!toyline.tags) toyline.tags = [];
      toyline.tags.push(tag);
    });
  }

  startEditTag(tag: Tag): void {
    this.editingTag = tag.id;
    this.editTagName = tag.name;
  }

  saveTag(tag: Tag, toyline: ToyLine): void {
    if (!this.editTagName.trim()) return;
    this.api.updateTag(tag.id, this.editTagName.trim()).subscribe(() => {
      tag.name = this.editTagName.trim();
      this.editingTag = null;
    });
  }

  deleteTag(tag: Tag, toyline: ToyLine): void {
    if (!confirm(`Delete tag "${tag.name}"?`)) return;
    this.api.deleteTag(tag.id).subscribe(() => {
      toyline.tags = toyline.tags?.filter((t) => t.id !== tag.id);
    });
  }
}
