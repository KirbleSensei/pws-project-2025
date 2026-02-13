import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { User } from '../models/user';
import { AppRoute } from '../app.routes';
import { WebsocketService } from './websocket';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth';
  
  // Subject to notify components to reload current user info
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  // Observable that components can subscribe to
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private websocketService: WebsocketService) {}

  whoami(): Observable<User> {
    return this.http.get<User>(this.apiUrl).pipe(
      tap(user => this.currentUserSubject.next(user))
    );
  }

  login(user: User): Observable<User> {
    this.websocketService.close();
    return this.http.post<User>(this.apiUrl, user).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        this.websocketService.connect();
      })
    );
  }

  logout(): Observable<User> {
    this.websocketService.close();
    return this.http.delete<User>(this.apiUrl).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        this.websocketService.connect();
      })
    );
  }

  isInRole(user: User | null, roles: number[]): boolean {
    if (!roles || roles.length === 0) return true;
    if (!user?.roles) return false;
    return user.roles.some((role: number) => roles?.includes(role));
  }  

  isRouteAvailable(user: User | null, route: AppRoute): boolean {
    return this.isInRole(user!, route.roles || []);
  }
}
