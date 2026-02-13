import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChangeLogEntry {
  id: number;
  table_name: string;
  operation: string;
  row_id: number | null;
  username: string;
  payload: any;
  created_at: Date;
}

export interface ActiveUserSession {
  sid: string;
  username: string;
  roles: number[];
  userId: number;
  expires_at: number;
  expired: boolean;
  current: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = '/api/admin';

  constructor(private http: HttpClient) {}

  getChanges(limit: number = 200): Observable<ChangeLogEntry[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ChangeLogEntry[]>(`${this.apiUrl}/changes`, { params });
  }

  getActiveUsers(): Observable<ActiveUserSession[]> {
    return this.http.get<ActiveUserSession[]>(`${this.apiUrl}/users`);
  }

  forceLogout(sid: string): Observable<any> {
    const params = new HttpParams().set('sid', sid);
    return this.http.delete(`${this.apiUrl}/users`, { params });
  }

  acquireLock(resource: 'edit-person' | 'edit-task'): Observable<any> {
    return this.http.post(`${this.apiUrl}/locks/acquire`, { resource });
  }

  releaseLock(resource: 'edit-person' | 'edit-task'): Observable<any> {
    return this.http.post(`${this.apiUrl}/locks/release`, { resource });
  }
}
