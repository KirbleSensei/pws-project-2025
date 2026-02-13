import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { Team } from '../models/team';

@Injectable({
  providedIn: 'root'
})
export class TeamsService {
  private apiUrl = '/api/teams';
  
  // Subject to notify components to reload the teams list
  private reloadSubject = new BehaviorSubject<void>(undefined);
  // Observable that components can subscribe to
  reload$ = this.reloadSubject.asObservable();

  constructor(private http: HttpClient) {}

  getTeams(filter: string = '', order: number = 0): Observable<Team[]> {
    const params = new HttpParams().set('q', filter).set('order', order);
    return this.http.get<Team[]>(this.apiUrl, { params });
  }

  newTeam(team: Team, avatarFile: File | undefined): Observable<Team> {
    return this.http.post<Team>(this.apiUrl, { ...team, has_avatar: !!avatarFile }).pipe(
      tap((createdTeam: Team) => {
        this.uploadAvatar(createdTeam.id, avatarFile);
      })
    );
  }

  modifyTeam(team: Team, avatarFile: File | undefined): Observable<Team> {
    this.uploadAvatar(team.id, avatarFile);
    console.log(team);
    return this.http.put<Team>(this.apiUrl, { ...team, has_avatar: !!avatarFile });
  }

  deleteTeam(id: number): Observable<Team> {
    const params = new HttpParams().set('id', id);
    return this.http.delete<Team>(this.apiUrl, { params });
  }

  // Method to notify subscribers to reload the teams list
  notifyReload() {
    this.reloadSubject.next();
  }

  uploadAvatar(id: number, file: File | undefined) {
    const formData = new FormData();
    if (file) {
      formData.append('file', file.name ? file : new Blob([file], { type: file.type }), file.name);
    }
    formData.append('path', 'avatar');
    formData.append('name', id.toString() + '.png');

    fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });
  }
}
