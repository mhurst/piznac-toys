import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface UserInfo {
  id: number;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
}

interface AuthResponse {
  token: string;
  id: number;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'piznac-toys-token';
  private userKey = 'piznac-toys-user';
  private loggedIn$ = new BehaviorSubject<boolean>(this.hasToken());
  private user$ = new BehaviorSubject<UserInfo | null>(this.loadUser());

  constructor(private http: HttpClient) {}

  get isLoggedIn$(): Observable<boolean> {
    return this.loggedIn$.asObservable();
  }

  get isLoggedIn(): boolean {
    return this.loggedIn$.value;
  }

  get currentUser$(): Observable<UserInfo | null> {
    return this.user$.asObservable();
  }

  get currentUser(): UserInfo | null {
    return this.user$.value;
  }

  get isAdmin(): boolean {
    return this.user$.value?.role === 'ADMIN';
  }

  get userId(): number | null {
    return this.user$.value?.id ?? null;
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap((res) => {
        this.setSession(res);
      })
    );
  }

  register(email: string, password: string, name: string, inviteCode: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', { email, password, name, inviteCode }).pipe(
      tap((res) => {
        this.setSession(res);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.loggedIn$.next(false);
    this.user$.next(null);
  }

  updateUser(user: Partial<UserInfo>, token?: string): void {
    const current = this.user$.value;
    if (current) {
      const updated = { ...current, ...user };
      localStorage.setItem(this.userKey, JSON.stringify(updated));
      this.user$.next(updated);
    }
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  private setSession(res: AuthResponse): void {
    localStorage.setItem(this.tokenKey, res.token);
    const user: UserInfo = { id: res.id, email: res.email, name: res.name, role: res.role, avatar: res.avatar };
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.loggedIn$.next(true);
    this.user$.next(user);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  private loadUser(): UserInfo | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
