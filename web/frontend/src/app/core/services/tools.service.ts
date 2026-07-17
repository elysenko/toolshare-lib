import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tool, ToolCategory, ToolCondition } from '../../models/toolshare.models';

export interface ToolFilters {
  q?: string;
  category?: string;
  status?: string;
}

export interface ToolInput {
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
}

/** REST client for the tools catalog (`/api/v1/tools`). */
@Injectable({ providedIn: 'root' })
export class ToolsService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/tools`;

  list(filters: ToolFilters = {}): Observable<Tool[]> {
    let params = new HttpParams();
    if (filters.q) params = params.set('q', filters.q);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<Tool[]>(this.base, { params });
  }

  get(id: string): Observable<Tool> {
    return this.http.get<Tool>(`${this.base}/${id}`);
  }

  create(input: ToolInput): Observable<Tool> {
    return this.http.post<Tool>(this.base, input);
  }

  update(id: string, input: Partial<ToolInput>): Observable<Tool> {
    return this.http.patch<Tool>(`${this.base}/${id}`, input);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
