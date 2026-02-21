import { Component, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { ApiService, UserAdmin } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [MatTableModule, MatSelectModule, MatSlideToggleModule, MatButtonModule, MatIconModule, MatCardModule, FormsModule],
  template: `
    <div class="page-container">
      <h1>Manage Users</h1>

      @if (error) {
        <div class="error-message">{{ error }}</div>
      }

      <mat-card>
        <table mat-table [dataSource]="users" class="full-width">
          <ng-container matColumnDef="avatar">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let user">
              @if (user.avatar) {
                <img [src]="'/uploads/' + user.avatar" class="user-avatar" alt="Avatar">
              } @else {
                <mat-icon class="user-avatar-icon">account_circle</mat-icon>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="info">
            <th mat-header-cell *matHeaderCellDef>User</th>
            <td mat-cell *matCellDef="let user">
              <div class="user-name">{{ user.name || '(no name)' }}</div>
              <div class="user-email">{{ user.email }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Role</th>
            <td mat-cell *matCellDef="let user">
              <mat-select [value]="user.role" (selectionChange)="onRoleChange(user, $event.value)">
                <mat-option value="ADMIN">Admin</mat-option>
                <mat-option value="MEMBER">Member</mat-option>
              </mat-select>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Active</th>
            <td mat-cell *matCellDef="let user">
              <mat-slide-toggle
                [checked]="user.active"
                (change)="onStatusChange(user, $event.checked)">
              </mat-slide-toggle>
            </td>
          </ng-container>

          <ng-container matColumnDef="figures">
            <th mat-header-cell *matHeaderCellDef>Figures</th>
            <td mat-cell *matCellDef="let user">{{ user._count.figures }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let user">
              @if (!isSelf(user)) {
                <button mat-icon-button color="warn" (click)="onDelete(user)">
                  <mat-icon>delete</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </mat-card>
    </div>
  `,
  styles: [`
    h1 { color: #1565C0; margin-bottom: 24px; font-weight: 700; }
    .full-width { width: 100%; }
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }
    .user-avatar-icon { font-size: 40px; width: 40px; height: 40px; color: #bdbdbd; }
    .user-name { font-weight: 600; }
    .user-email { color: #777; font-size: 0.85rem; }
    .error-message {
      background: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      text-align: center;
    }
    mat-select { width: 120px; }
  `],
})
export class ManageUsersComponent implements OnInit {
  users: UserAdmin[] = [];
  displayedColumns = ['avatar', 'info', 'role', 'status', 'figures', 'actions'];
  error = '';
  private currentUserId: number | null = null;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    // Get current user ID from profile
    const user = this.auth.currentUser;
    this.loadUsers();
  }

  isSelf(user: UserAdmin): boolean {
    // We'll compare by email since we don't store id in UserInfo
    return user.email === this.auth.currentUser?.email;
  }

  loadUsers(): void {
    this.api.getUsers().subscribe({
      next: (users) => this.users = users,
      error: () => this.error = 'Failed to load users',
    });
  }

  onRoleChange(user: UserAdmin, role: string): void {
    this.error = '';
    this.api.updateUserRole(user.id, role).subscribe({
      next: (updated) => user.role = updated.role,
      error: (err) => {
        this.error = err.error?.error || 'Failed to update role';
        this.loadUsers(); // Reload to reset UI
      },
    });
  }

  onStatusChange(user: UserAdmin, active: boolean): void {
    this.error = '';
    this.api.updateUserStatus(user.id, active).subscribe({
      next: (updated) => user.active = updated.active,
      error: (err) => {
        this.error = err.error?.error || 'Failed to update status';
        this.loadUsers();
      },
    });
  }

  onDelete(user: UserAdmin): void {
    if (!confirm(`Delete user "${user.name || user.email}"? This cannot be undone.`)) return;
    this.error = '';
    this.api.deleteUser(user.id).subscribe({
      next: () => this.users = this.users.filter((u) => u.id !== user.id),
      error: (err) => this.error = err.error?.error || 'Failed to delete user',
    });
  }
}
