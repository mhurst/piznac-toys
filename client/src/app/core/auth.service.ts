import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';

export interface UserInfo {
  id: number;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userKey = 'piznac-toys-user';
  private loggedIn$ = new BehaviorSubject<boolean>(this.hasUser());
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

  login(email: string, password: string): Observable<UserInfo> {
    return this.http.post<UserInfo>('/api/auth/login', { email, password }).pipe(
      tap((user) => {
        this.setUser(user);
      })
    );
  }

  register(email: string, password: string, name: string, inviteCode: string): Observable<UserInfo> {
    return this.http.post<UserInfo>('/api/auth/register', { email, password, name, inviteCode }).pipe(
      tap((user) => {
        this.setUser(user);
      })
    );
  }

  logout(): void {
    this.http.post('/api/auth/logout', {}).subscribe();
    localStorage.removeItem(this.userKey);
    this.loggedIn$.next(false);
    this.user$.next(null);
  }

  /** Check session on app startup — validates httpOnly cookie is still valid */
  checkSession(): Observable<UserInfo | null> {
    return this.http.get<UserInfo>('/api/auth/profile').pipe(
      tap((user) => {
        this.setUser(user);
      }),
      catchError(() => {
        this.clearUser();
        return of(null);
      })
    );
  }

  updateUser(user: Partial<UserInfo>): void {
    const current = this.user$.value;
    if (current) {
      const updated = { ...current, ...user };
      localStorage.setItem(this.userKey, JSON.stringify(updated));
      this.user$.next(updated);
    }
  }

  private setUser(user: UserInfo): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.loggedIn$.next(true);
    this.user$.next(user);
  }

  private clearUser(): void {
    localStorage.removeItem(this.userKey);
    this.loggedIn$.next(false);
    this.user$.next(null);
  }

  private hasUser(): boolean {
    return !!localStorage.getItem(this.userKey);
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
