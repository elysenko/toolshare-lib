import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Loan, LoanStatus } from '../../models/toolshare.models';

export interface CreateLoanInput {
  toolId: string;
  borrowerName: string;
  dueDate: string;
  borrowerUserId?: string;
}

/** REST client for loans (`/api/v1/loans`). */
@Injectable({ providedIn: 'root' })
export class LoansService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/loans`;

  list(status?: LoanStatus | ''): Observable<Loan[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Loan[]>(this.base, { params });
  }

  create(input: CreateLoanInput): Observable<Loan> {
    return this.http.post<Loan>(this.base, input);
  }

  returnLoan(id: string): Observable<Loan> {
    return this.http.post<Loan>(`${this.base}/${id}/return`, {});
  }
}
