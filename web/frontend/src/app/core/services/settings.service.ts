import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Masked service setting as returned by the admin settings API. */
export interface BackendSetting {
  key: string;
  label: string;
  description: string;
  configured: boolean;
  maskedValue: string;
  source: 'db' | 'env' | null;
  updatedAt: string | null;
}

/** REST client for admin service settings (`/api/v1/admin/settings`). */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/settings`;

  list(): Observable<BackendSetting[]> {
    return this.http.get<BackendSetting[]>(this.base);
  }

  update(key: string, value: string): Observable<BackendSetting[]> {
    return this.http.patch<BackendSetting[]>(this.base, { key, value });
  }
}
