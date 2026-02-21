import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="center-container">
      <mat-card class="form-card">
        <mat-card-header>
          <mat-card-title>Reset Password</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (success) {
            <div class="success-message">
              <mat-icon>check_circle</mat-icon>
              <p>Your password has been reset successfully.</p>
              <a mat-raised-button color="primary" routerLink="/login">Go to Login</a>
            </div>
          } @else if (!token || !email) {
            <div class="error-message">Invalid or missing reset link. Please request a new one.</div>
            <div class="back-link"><a routerLink="/forgot-password">Request new link</a></div>
          } @else {
            @if (error) {
              <div class="error-message">{{ error }}</div>
            }
            <form (ngSubmit)="onSubmit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>New Password</mat-label>
                <input matInput [type]="showPassword ? 'text' : 'password'" [(ngModel)]="newPassword" name="newPassword" required minlength="6">
                <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword">
                  <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirm Password</mat-label>
                <input matInput [type]="showConfirm ? 'text' : 'password'" [(ngModel)]="confirmPassword" name="confirmPassword" required>
                <button mat-icon-button matSuffix type="button" (click)="showConfirm = !showConfirm">
                  <mat-icon>{{ showConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" class="full-width" [disabled]="loading">
                {{ loading ? 'Resetting...' : 'Reset Password' }}
              </button>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .center-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 64px);
    }
    .form-card { width: 400px; max-width: 90vw; padding: 24px; }
    mat-card-header { margin-bottom: 24px; }
    mat-card-title { color: #1565C0 !important; font-size: 1.5rem; font-weight: 700; }
    .full-width { width: 100%; }
    form { display: flex; flex-direction: column; gap: 8px; }
    .error-message {
      background: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      text-align: center;
    }
    .success-message {
      text-align: center;
      color: #2e7d32;
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; }
      p { font-size: 1rem; margin-bottom: 16px; }
    }
    .back-link { text-align: center; margin-top: 16px; }
    .back-link a { color: #1565C0; text-decoration: none; font-weight: 600; }
  `],
})
export class ResetPasswordComponent implements OnInit {
  email = '';
  token = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  showConfirm = false;
  loading = false;
  success = false;
  error = '';

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
  }

  onSubmit(): void {
    if (!this.newPassword || !this.confirmPassword) return;

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    if (this.newPassword.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }

    this.loading = true;
    this.error = '';

    this.api.resetPassword(this.email, this.token, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Failed to reset password';
      },
    });
  }
}
