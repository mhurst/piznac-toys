import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

interface Invite {
  id: number;
  code: string;
  email: string | null;
  expiresAt: string;
  createdAt: string;
  usedBy: { id: number; email: string; name: string | null } | null;
}

@Component({
  selector: 'app-invites',
  standalone: true,
  imports: [FormsModule, DatePipe, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule],
  template: `
    <div class="page-container">
      <h1>Invite Management</h1>

      <mat-card class="create-card">
        <mat-card-content>
          <form (ngSubmit)="createInvite()" class="create-form">
            <mat-form-field appearance="outline">
              <mat-label>Email (optional, restricts invite to this email)</mat-label>
              <input matInput type="email" [(ngModel)]="newEmail" name="newEmail">
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" [disabled]="creating">
              {{ creating ? 'Creating...' : 'Create Invite' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      @if (message) {
        <div class="message" [class.error]="isError" [class.success]="!isError">{{ message }}</div>
      }

      @if (newCode) {
        <mat-card class="code-card">
          <mat-card-content>
            <div class="code-label">Share this invite code:</div>
            <div class="code-value">{{ newCode }}</div>
            <button mat-button (click)="copyCode()">
              <mat-icon>content_copy</mat-icon> Copy
            </button>
          </mat-card-content>
        </mat-card>
      }

      <table mat-table [dataSource]="invites" class="invites-table">
        <ng-container matColumnDef="code">
          <th mat-header-cell *matHeaderCellDef>Code</th>
          <td mat-cell *matCellDef="let inv" class="code-cell">{{ inv.code.slice(0, 8) }}...</td>
        </ng-container>

        <ng-container matColumnDef="email">
          <th mat-header-cell *matHeaderCellDef>Restricted To</th>
          <td mat-cell *matCellDef="let inv">{{ inv.email || 'Anyone' }}</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let inv">
            @if (inv.usedBy) {
              <mat-chip-set><mat-chip color="primary" highlighted>Used by {{ inv.usedBy.email }}</mat-chip></mat-chip-set>
            } @else if (isExpired(inv)) {
              <mat-chip-set><mat-chip color="warn" highlighted>Expired</mat-chip></mat-chip-set>
            } @else {
              <mat-chip-set><mat-chip highlighted>Pending</mat-chip></mat-chip-set>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="expires">
          <th mat-header-cell *matHeaderCellDef>Expires</th>
          <td mat-cell *matCellDef="let inv">{{ inv.expiresAt | date:'short' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let inv">
            @if (!inv.usedBy) {
              <button mat-icon-button color="warn" (click)="deleteInvite(inv)">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    h1 { color: #1565C0; margin-bottom: 24px; font-weight: 700; }
    .create-card { margin-bottom: 24px; }
    .create-form { display: flex; align-items: center; gap: 16px; }
    .create-form mat-form-field { flex: 1; }
    .message { padding: 12px; border-radius: 4px; margin-bottom: 16px; text-align: center; }
    .error { background: #ffebee; color: #c62828; }
    .success { background: #e8f5e9; color: #2e7d32; }
    .code-card { margin-bottom: 24px; background: #e3f2fd; }
    .code-label { font-size: 0.9rem; color: #666; margin-bottom: 8px; }
    .code-value { font-family: monospace; font-size: 1.1rem; font-weight: 700; color: #1565C0; margin-bottom: 8px; word-break: break-all; }
    .invites-table { width: 100%; }
    .code-cell { font-family: monospace; }
  `],
})
export class InvitesComponent implements OnInit {
  invites: Invite[] = [];
  displayedColumns = ['code', 'email', 'status', 'expires', 'actions'];
  newEmail = '';
  newCode = '';
  creating = false;
  message = '';
  isError = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadInvites();
  }

  loadInvites(): void {
    this.http.get<Invite[]>('/api/auth/invites').subscribe({
      next: (invites) => { this.invites = invites; },
      error: () => { this.message = 'Failed to load invites'; this.isError = true; },
    });
  }

  createInvite(): void {
    this.creating = true;
    this.message = '';
    this.newCode = '';

    this.http.post<Invite>('/api/auth/invites', { email: this.newEmail || undefined }).subscribe({
      next: (invite) => {
        this.creating = false;
        this.newCode = invite.code;
        this.newEmail = '';
        this.loadInvites();
      },
      error: (err) => {
        this.creating = false;
        this.message = err.error?.error || 'Failed to create invite';
        this.isError = true;
      },
    });
  }

  deleteInvite(invite: Invite): void {
    this.http.delete(`/api/auth/invites/${invite.id}`).subscribe({
      next: () => { this.loadInvites(); },
      error: (err) => {
        this.message = err.error?.error || 'Failed to delete invite';
        this.isError = true;
      },
    });
  }

  copyCode(): void {
    navigator.clipboard.writeText(this.newCode);
    this.message = 'Code copied to clipboard';
    this.isError = false;
  }

  isExpired(invite: Invite): boolean {
    return new Date(invite.expiresAt) < new Date();
  }
}
