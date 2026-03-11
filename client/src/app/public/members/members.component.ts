import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DatePipe, SlicePipe } from '@angular/common';
import { ApiService, PublicProfile } from '../../core/api.service';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [RouterLink, FormsModule, MatCardModule, MatIconModule, MatFormFieldModule, MatInputModule, DatePipe, SlicePipe],
  template: `
    <div class="page-container">
      <h1>Members</h1>

      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search members</mat-label>
        <input matInput [(ngModel)]="searchTerm" placeholder="Filter by name...">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <div class="members-grid">
        @for (member of filteredMembers; track member.id) {
          <a [routerLink]="['/user', member.id]" class="member-link">
            <mat-card class="member-card">
              <div class="member-avatar">
                @if (member.avatar) {
                  <img [src]="'/uploads/' + member.avatar" [alt]="member.name || 'Member'">
                } @else {
                  <mat-icon>account_circle</mat-icon>
                }
              </div>
              <mat-card-content>
                <h3>{{ member.name || 'Anonymous' }}</h3>
                @if (member.bio) {
                  <p class="bio">{{ member.bio | slice:0:100 }}{{ member.bio.length > 100 ? '...' : '' }}</p>
                }
                <div class="member-meta">
                  <span class="figure-count">{{ member._count.figures }} figure{{ member._count.figures !== 1 ? 's' : '' }}</span>
                  <span class="join-date">Joined {{ member.createdAt | date:'mediumDate' }}</span>
                </div>
              </mat-card-content>
            </mat-card>
          </a>
        }
      </div>

      @if (loaded && filteredMembers.length === 0) {
        <p class="no-results">No members found.</p>
      }
    </div>
  `,
  styles: [`
    h1 { color: #1565C0; font-weight: 700; margin: 0 0 24px; }
    .search-field { width: 100%; max-width: 400px; margin-bottom: 24px; }
    .members-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .member-link { text-decoration: none; }
    .member-card {
      cursor: pointer;
      transition: box-shadow 0.2s;
      height: 100%;
    }
    .member-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .member-avatar {
      display: flex;
      justify-content: center;
      padding: 24px 0 8px;
      img {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
      }
      mat-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
        color: #bdbdbd;
      }
    }
    mat-card-content {
      text-align: center;
      padding: 8px 16px 16px;
      h3 { margin: 0 0 8px; font-size: 1.1rem; color: #333; font-weight: 600; }
    }
    .bio {
      color: #666;
      font-size: 0.85rem;
      line-height: 1.4;
      margin: 0 0 12px;
    }
    .member-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.8rem;
      color: #888;
    }
    .figure-count { font-weight: 600; color: #555; }
    .no-results { color: #888; text-align: center; margin-top: 32px; }
  `],
})
export class MembersComponent implements OnInit {
  members: PublicProfile[] = [];
  searchTerm = '';
  loaded = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getPublicUsers().subscribe({
      next: (users) => {
        this.members = users;
        this.loaded = true;
      },
      error: () => this.loaded = true,
    });
  }

  get filteredMembers(): PublicProfile[] {
    if (!this.searchTerm.trim()) return this.members;
    const term = this.searchTerm.toLowerCase();
    return this.members.filter((m) => (m.name || '').toLowerCase().includes(term));
  }
}
