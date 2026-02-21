import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <h1>Profile</h1>

      <!-- Avatar Section -->
      <mat-card class="profile-card">
        <mat-card-content>
          <h3>Avatar</h3>
          <div class="avatar-section">
            @if (avatarUrl) {
              <img [src]="avatarUrl" class="avatar-preview" alt="Avatar">
            } @else {
              <mat-icon class="avatar-placeholder">account_circle</mat-icon>
            }
            <div class="avatar-actions">
              <button mat-raised-button color="primary" (click)="avatarInput.click()">
                <mat-icon>upload</mat-icon> Upload Avatar
              </button>
              @if (avatarUrl) {
                <button mat-button color="warn" (click)="removeAvatar()">
                  <mat-icon>delete</mat-icon> Remove
                </button>
              }
              <input #avatarInput type="file" accept="image/*" hidden (change)="onAvatarSelected($event)">
            </div>
          </div>
          @if (avatarMessage) {
            <div class="message" [class.error]="avatarIsError" [class.success]="!avatarIsError">{{ avatarMessage }}</div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Bio Section -->
      <mat-card class="profile-card">
        <mat-card-content>
          <h3>Bio</h3>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>About you (max 500 characters)</mat-label>
            <textarea matInput [(ngModel)]="bio" name="bio" rows="4" maxlength="500"></textarea>
            <mat-hint>{{ bio.length }}/500</mat-hint>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="saveBio()" [disabled]="savingBio">
            {{ savingBio ? 'Saving...' : 'Save Bio' }}
          </button>
          @if (bioMessage) {
            <div class="message" [class.error]="bioIsError" [class.success]="!bioIsError">{{ bioMessage }}</div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Account Settings -->
      <mat-card class="profile-card">
        <mat-card-content>
          <h3>Account Settings</h3>
          @if (message) {
            <div class="message" [class.error]="isError" [class.success]="!isError">{{ message }}</div>
          }

          <form (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name</mat-label>
              <input matInput [(ngModel)]="name" name="name">
              <mat-icon matSuffix>person</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" [(ngModel)]="email" name="email" required>
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Current Password</mat-label>
              <input matInput [type]="showCurrent ? 'text' : 'password'" [(ngModel)]="currentPassword" name="currentPassword" required>
              <button mat-icon-button matSuffix type="button" (click)="showCurrent = !showCurrent">
                <mat-icon>{{ showCurrent ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>New Password (leave blank to keep current)</mat-label>
              <input matInput [type]="showNew ? 'text' : 'password'" [(ngModel)]="newPassword" name="newPassword">
              <button mat-icon-button matSuffix type="button" (click)="showNew = !showNew">
                <mat-icon>{{ showNew ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" [disabled]="saving || !currentPassword">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    h1 { color: #1565C0; margin-bottom: 24px; font-weight: 700; }
    h3 { color: #333; margin: 0 0 16px; font-weight: 600; }
    .profile-card { max-width: 500px; padding: 24px; margin-bottom: 24px; }
    .full-width { width: 100%; }
    form { display: flex; flex-direction: column; gap: 8px; }
    .message {
      padding: 12px;
      border-radius: 4px;
      margin-top: 12px;
      text-align: center;
    }
    .error { background: #ffebee; color: #c62828; }
    .success { background: #e8f5e9; color: #2e7d32; }
    .avatar-section { display: flex; align-items: center; gap: 24px; }
    .avatar-preview {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      object-fit: cover;
    }
    .avatar-placeholder {
      font-size: 96px;
      width: 96px;
      height: 96px;
      color: #bdbdbd;
    }
    .avatar-actions { display: flex; flex-direction: column; gap: 8px; }
  `],
})
export class ProfileComponent implements OnInit {
  email = '';
  name = '';
  currentPassword = '';
  newPassword = '';
  showCurrent = false;
  showNew = false;
  saving = false;
  message = '';
  isError = false;

  bio = '';
  savingBio = false;
  bioMessage = '';
  bioIsError = false;

  avatarUrl: string | null = null;
  avatarMessage = '';
  avatarIsError = false;

  constructor(private http: HttpClient, private auth: AuthService, private api: ApiService) {}

  ngOnInit(): void {
    this.http.get<{ email: string; name: string | null; avatar: string | null; bio: string | null }>('/api/auth/profile').subscribe({
      next: (res) => {
        this.email = res.email;
        this.name = res.name || '';
        this.bio = res.bio || '';
        this.avatarUrl = res.avatar ? '/uploads/' + res.avatar : null;
      },
      error: () => { this.message = 'Failed to load profile'; this.isError = true; },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.avatarMessage = '';

    this.api.uploadAvatar(input.files[0]).subscribe({
      next: (res) => {
        this.avatarUrl = '/uploads/' + res.avatar;
        this.auth.updateUser({ avatar: res.avatar });
        this.avatarMessage = 'Avatar updated';
        this.avatarIsError = false;
      },
      error: (err) => {
        this.avatarMessage = err.error?.error || 'Upload failed';
        this.avatarIsError = true;
      },
    });
    input.value = '';
  }

  removeAvatar(): void {
    this.api.deleteAvatar().subscribe({
      next: () => {
        this.avatarUrl = null;
        this.auth.updateUser({ avatar: null });
        this.avatarMessage = 'Avatar removed';
        this.avatarIsError = false;
      },
      error: (err) => {
        this.avatarMessage = err.error?.error || 'Failed to remove avatar';
        this.avatarIsError = true;
      },
    });
  }

  saveBio(): void {
    this.savingBio = true;
    this.bioMessage = '';

    this.api.updateBio(this.bio).subscribe({
      next: () => {
        this.savingBio = false;
        this.bioMessage = 'Bio saved';
        this.bioIsError = false;
      },
      error: (err) => {
        this.savingBio = false;
        this.bioMessage = err.error?.error || 'Failed to save bio';
        this.bioIsError = true;
      },
    });
  }

  onSubmit(): void {
    if (!this.currentPassword) return;
    this.saving = true;
    this.message = '';

    const body: any = { email: this.email, name: this.name, currentPassword: this.currentPassword };
    if (this.newPassword) body.newPassword = this.newPassword;

    this.http.put<{ message: string; email: string; name: string | null }>('/api/auth/profile', body).subscribe({
      next: (res) => {
        this.saving = false;
        this.message = res.message;
        this.isError = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.auth.updateUser({ email: res.email, name: res.name });
      },
      error: (err) => {
        this.saving = false;
        this.message = err.error?.error || 'Failed to update profile';
        this.isError = true;
      },
    });
  }
}
