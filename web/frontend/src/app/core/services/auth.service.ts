import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUser, UserRole } from '../../models/toolshare.models';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _user = signal<AuthUser | null>(this.restoreUser());

  readonly isLoggedIn = computed(() => !!this._token());
  readonly currentUser = this._user.asReadonly();
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');
  readonly token = this._token.asReadonly();

  constructor(private router: Router) {}

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

  // NOTE: mock auth for the frontend mockup — no backend call. The service_agent
  // stage rewires login/signup to the real /api/auth endpoints.
  login(email: string, _password: string): void {
    const role: UserRole = email.toLowerCase().startsWith('admin') ? 'ADMIN' : 'USER';
    this.persistSession({ id: 'u-login', email, role }, 'mock-jwt-login');
  }

  signup(email: string, _password: string): void {
    // First signup becomes ADMIN in the real backend; mock treats it as USER by default.
    this.persistSession({ id: 'u-signup', email, role: 'USER' }, 'mock-jwt-signup');
  }

  /** Demo Mode bypass — signs in as a mock ADMIN so reviewers can inspect the full UI. */
  demoLogin(): void {
    this.persistSession(
      { id: 'demo-admin', email: 'admin@toolshare.dev', role: 'ADMIN' },
      'mock-jwt-demo-admin',
    );
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('access_token');
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('isAuthenticated');
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }
}
