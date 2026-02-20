import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <h1>Profile</h1>

      <mat-card class="profile-card">
        <mat-card-content>
          @if (message) {
            <div class="message" [class.error]="isError" [class.success]="!isError">{{ message }}</div>
          }

          <form (ngSubmit)="onSubmit()">
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
    .profile-card { max-width: 500px; padding: 24px; }
    .full-width { width: 100%; }
    form { display: flex; flex-direction: column; gap: 8px; }
    .message {
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      text-align: center;
    }
    .error { background: #ffebee; color: #c62828; padding: 12px; border-radius: 4px; }
    .success { background: #e8f5e9; color: #2e7d32; padding: 12px; border-radius: 4px; }
  `],
})
export class ProfileComponent implements OnInit {
  email = '';
  currentPassword = '';
  newPassword = '';
  showCurrent = false;
  showNew = false;
  saving = false;
  message = '';
  isError = false;

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.http.get<{ email: string }>('/api/auth/profile').subscribe({
      next: (res) => { this.email = res.email; },
      error: () => { this.message = 'Failed to load profile'; this.isError = true; },
    });
  }

  onSubmit(): void {
    if (!this.currentPassword) return;
    this.saving = true;
    this.message = '';

    const body: any = { email: this.email, currentPassword: this.currentPassword };
    if (this.newPassword) body.newPassword = this.newPassword;

    this.http.put<{ message: string; email: string; token?: string }>('/api/auth/profile', body).subscribe({
      next: (res) => {
        this.saving = false;
        this.message = res.message;
        this.isError = false;
        this.currentPassword = '';
        this.newPassword = '';
        if (res.token) {
          localStorage.setItem('piznac-toys-token', res.token);
        }
      },
      error: (err) => {
        this.saving = false;
        this.message = err.error?.error || 'Failed to update profile';
        this.isError = true;
      },
    });
  }
}
