import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BaseApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${path}`);
  }

  getWithQuery<T>(
    path: string,
    query: Record<string, string | number | boolean | null | undefined>
  ): Observable<T> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined) {
        params = params.set(key, String(value));
      }
    }

    return this.http.get<T>(`${this.apiUrl}/${path}`, { params });
  }

  post<T>(path: string, payload: unknown): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${path}`, payload);
  }
}
