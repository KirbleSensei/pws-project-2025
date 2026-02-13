import { HttpError } from "../helpers/errors";

// schema for a person; because of the usage scope, the constructor is also validator, raises HttpError
export class Person {
  id: number;
  firstname: string;
  lastname: string;
  birthdate: Date;
  email: string;
  team_ids?: number[];

  constructor(firstname: string, lastname: string, birthdate: Date, email: string) {
    if (!firstname || typeof firstname !== 'string' || firstname.trim().length === 0)
      throw new HttpError(400, 'First name was not provided correctly');
    if( !lastname || typeof lastname !== 'string' || lastname.trim().length === 0)
      throw new HttpError(400, 'Last name was not provided correctly');
    if( !birthdate || !(birthdate instanceof Date) || isNaN(birthdate.getTime()) || birthdate < new Date('1900-01-01') || birthdate >= new Date())
      throw new HttpError(400, 'Birth date was not provided correctly');
    if( !email || typeof email !== 'string' || email.trim().length === 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new HttpError(400, 'Email was not provided correctly');

    this.id = 0; // will be set by the database AUTOINCREMENT
    this.firstname = firstname.trim();
    this.lastname = lastname.trim();
    this.birthdate = birthdate;
    this.email = email.trim();
  }
}
