import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OverdueItem } from '../../models/toolshare.models';

/** REST client for the dashboard overdue watchlist (`/api/v1/dashboard`). */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/dashboard`;

  overdue(): Observable<OverdueItem[]> {
    return this.http.get<OverdueItem[]>(`${this.base}/overdue`);
  }
}
