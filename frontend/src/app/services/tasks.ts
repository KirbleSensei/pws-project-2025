import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

import { Task } from '../models/task';

@Injectable({
  providedIn: 'root'
})
export class TasksService {
  private apiUrl = '/api/tasks';

  private reloadSubject = new BehaviorSubject<void>(undefined);
  reload$ = this.reloadSubject.asObservable();

  constructor(private http: HttpClient) {}

  getTasks(filter: string = '', order: number = 0, teamIds: number[] = []): Observable<Task[]> {
    let params = new HttpParams().set('q', filter).set('order', order);
    if (teamIds.length > 0) {
      params = params.set('team_ids', teamIds.join(','));
    }
    return this.http.get<Task[]>(this.apiUrl, { params });
  }

  newTask(task: Task): Observable<Task> {
    return this.http.post<Task>(this.apiUrl, task);
  }

  modifyTask(task: Task): Observable<Task> {
    return this.http.put<Task>(this.apiUrl, task);
  }

  deleteTask(id: number): Observable<Task> {
    const params = new HttpParams().set('id', id);
    return this.http.delete<Task>(this.apiUrl, { params });
  }

  notifyReload() {
    this.reloadSubject.next();
  }
}
