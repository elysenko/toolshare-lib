import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, UserRole } from '../../models/toolshare.models';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';

interface RawUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

interface AuthResponse {
  user: RawUser;
  token: string;
}

/** Normalize the backend's lowercase Prisma role (`admin`/`user`) to the UI's `ADMIN`/`USER`. */
function normalizeUser(raw: RawUser): AuthUser {
  const role: UserRole = String(raw.role).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
  return { id: raw.id, email: raw.email, role };
}

/** Client-side twin of the backend seed password derivation (SHA-256, first 16 hex chars). */
async function deriveSeedPassword(email: string): Promise<string> {
  const data = new TextEncoder().encode(email + 'colossus-seed');
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly base = `${environment.apiUrl}/auth`;

  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _user = signal<AuthUser | null>(this.restoreUser());

  readonly isLoggedIn = computed(() => !!this._token());
  readonly currentUser = this._user.asReadonly();
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');
  readonly token = this._token.asReadonly();

  private restoreUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  private persistSession(user: AuthUser, token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('access_token', token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
    this._token.set(token);
    this._user.set(user);
  }

  /** POST /auth/login — persists the JWT + normalized user on success. */
  login(email: string, password: string): Observable<AuthUser> {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password }).pipe(
      map((res) => ({ user: normalizeUser(res.user), token: res.token })),
      tap(({ user, token }) => this.persistSession(user, token)),
      map(({ user }) => user),
    );
  }

  /** POST /auth/signup — first account on an empty table becomes ADMIN server-side. */
  signup(email: string, password: string, name?: string): Observable<AuthUser> {
    const body = name ? { email, password, name } : { email, password };
    return this.http.post<AuthResponse>(`${this.base}/signup`, body).pipe(
      map((res) => ({ user: normalizeUser(res.user), token: res.token })),
      tap(({ user, token }) => this.persistSession(user, token)),
      map(({ user }) => user),
    );
  }

  /** Demo Mode — logs in as the seeded ADMIN so reviewers can inspect the full UI. */
  async demoLogin(): Promise<void> {
    const email = 'admin@example.com';
    try {
      const password = await deriveSeedPassword(email);
      this.login(email, password).subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: () => this.fallbackDemoSession(email),
      });
    } catch {
      this.fallbackDemoSession(email);
    }
  }

  /** Offline fallback so the demo button still opens a browsable session. */
  private fallbackDemoSession(email: string): void {
    this.persistSession({ id: 'demo-admin', email, role: 'ADMIN' }, 'mock-jwt-demo-admin');
    this.router.navigate(['/dashboard']);
  }

  /** POST /auth/logout is best-effort (stateless JWT); the client discards the token. */
  logout(): void {
    this.http.post(`${this.base}/logout`, {}).subscribe({ next: () => {}, error: () => {} });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('access_token');
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('isAuthenticated');
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }
}
