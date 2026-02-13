import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import { Person } from '../models/person';
import { PersonsResponse } from '../models/personsResponse';

@Injectable({
  providedIn: 'root'
})
export class PersonsService {
  private apiUrl = '/api/persons';
  
  // Subject to notify components to reload the persons list
  private reloadSubject = new BehaviorSubject<void>(undefined);
  // Observable that components can subscribe to
  reload$ = this.reloadSubject.asObservable();

  constructor(private http: HttpClient) {}

  getPersons(filter: string = '', limit: number = 10, offset: number = 0, order: number = 0): Observable<PersonsResponse> {
    const params = new HttpParams().set('q', filter).set('limit', limit).set('offset', offset).set('order', order); // add query parameters
    return this.http.get<PersonsResponse>(this.apiUrl, { params });
  }

  newPerson(person: Person): Observable<Person> {
    return this.http.post<Person>(this.apiUrl, person);
  }

  modifyPerson(person: Person): Observable<Person> {
    return this.http.put<Person>(this.apiUrl, person);
  }

  deletePerson(id: number): Observable<Person> {
    const params = new HttpParams().set('id', id); // pass id as query parameter
    return this.http.delete<Person>(this.apiUrl, { params });
  }

  // Method to notify subscribers to reload the persons list
  notifyReload() {
    this.reloadSubject.next();
  }
}
