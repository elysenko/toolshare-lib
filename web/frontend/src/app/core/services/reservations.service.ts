import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reservation } from '../../models/toolshare.models';

/** REST client for reservations (`/api/v1/reservations`). */
@Injectable({ providedIn: 'root' })
export class ReservationsService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reservations`;

  list(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(this.base);
  }

  create(toolId: string): Observable<Reservation> {
    return this.http.post<Reservation>(this.base, { toolId });
  }
}
