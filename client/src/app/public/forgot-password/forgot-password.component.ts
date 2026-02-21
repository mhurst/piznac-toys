import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="center-container">
      <mat-card class="form-card">
        <mat-card-header>
          <mat-card-title>Forgot Password</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (sent) {
            <div class="success-message">
              <mat-icon>check_circle</mat-icon>
              <p>If an account with that email exists, a password reset link has been sent. Check your inbox.</p>
            </div>
          } @else {
            <p class="description">Enter your email address and we'll send you a link to reset your password.</p>
            @if (error) {
              <div class="error-message">{{ error }}</div>
            }
            <form (ngSubmit)="onSubmit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="email" name="email" required>
                <mat-icon matSuffix>email</mat-icon>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" class="full-width" [disabled]="loading">
                {{ loading ? 'Sending...' : 'Send Reset Link' }}
              </button>
            </form>
          }
          <div class="back-link">
            <a routerLink="/login">Back to Login</a>
          </div>
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
    .description { color: #666; margin-bottom: 16px; }
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
      p { font-size: 1rem; }
    }
    .back-link { text-align: center; margin-top: 16px; }
    .back-link a { color: #1565C0; text-decoration: none; font-weight: 600; }
  `],
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  sent = false;
  error = '';

  constructor(private api: ApiService) {}

  onSubmit(): void {
    if (!this.email) return;
    this.loading = true;
    this.error = '';

    this.api.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.sent = true;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Something went wrong';
      },
    });
  }
}
