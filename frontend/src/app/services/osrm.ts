import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Team } from '../models/team';

export interface OsrmWalkingResponse {
  teams: Team[];
  distances: Array<Array<number | null>>;
}

@Injectable({ providedIn: 'root' })
export class OsrmService {
  private apiUrl = '/api/osrm';

  constructor(private http: HttpClient) {}

  getWalkingDistances(): Observable<OsrmWalkingResponse> {
    return this.http.get<OsrmWalkingResponse>(`${this.apiUrl}/walking-distances`);
  }
}
