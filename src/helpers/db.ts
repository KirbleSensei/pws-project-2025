// open sqlite database and create tables if they do not exist

import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";
import { faker } from "@faker-js/faker";

import { Person } from "../model/person";
import { COLORS } from "../shared/colors";

export const db: { connection: Database | null} = {
  connection: null
};

export async function openDb(): Promise<void> {
  db.connection = await open({
    filename: process.env.DBFILE || './db/data.sqlite3',
    driver: sqlite3.Database
  });
  const { user_version } = await db.connection.get('PRAGMA user_version;') // get current db version
  if(!user_version) { // fresh database
    await db.connection!.exec('PRAGMA user_version = 1;');
    console.log('Reinitialize content...');
    await createSchemaAndData();
  }
  await db.connection.exec('PRAGMA foreign_keys = ON'); // to enforce FOREIGN KEY constraints checking
}

export const personTableDef = {
  name: 'persons',
  columns: {
    id: { type: 'INTEGER', primaryKey: true, autoincrement: true },
    firstname: { type: 'TEXT' },
    lastname: { type: 'TEXT' },
    birthdate: { type: 'DATE' },
    email: { type: 'TEXT' }
  }
};

export const teamTableDef = {
  name: 'teams',
  columns: {
    id: { type: 'INTEGER', primaryKey: true, autoincrement: true },
    name: { type: 'TEXT' },
    longname: { type: 'TEXT' },
    color: { type: 'TEXT', skipFiltering: true },
    has_avatar: { type: 'INTEGER', skipFiltering: true },
    latitude: { type: 'REAL', skipFiltering: true },
    longitude: { type: 'REAL', skipFiltering: true }
  }
};

export const membershipTableDef = {
  name: 'memberships',
  columns: {
    person_id: { type: 'INTEGER', notNull: true },
    team_id: { type: 'INTEGER', notNull: true }
  },
  primaryKey: ['person_id', 'team_id'], // to create composite primary key
  foreignKeys: [
    { column: 'person_id', references: 'persons(id)' },
    { column: 'team_id', references: 'teams(id)' }
  ]
};

function createTableStatement(def: { 
    name: string;
    columns: { [key: string]: { type: string; primaryKey?: boolean; autoincrement?: boolean; notNull?: boolean; unique?: boolean; default?: any; foreignKey?: any }},
    primaryKey?: string[];
    foreignKeys?: { column: string; references: string }[];
  }): string {
  // Create a create query by Def object
  const cols = Object.entries(def.columns).map(([name, opts]) => {
    let colDef = `${name} ${opts.type}`;
    if (opts.primaryKey) colDef += ' PRIMARY KEY';
    if (opts.autoincrement) colDef += ' AUTOINCREMENT';
    if (opts.notNull) colDef += ' NOT NULL';
    if (opts.unique) colDef += ' UNIQUE';
    if (opts.default !== undefined) colDef += ` DEFAULT ${opts.default}`;
    return colDef;
  });    
  if(def.primaryKey) {
    cols.push(`PRIMARY KEY (${def.primaryKey.join(', ')})`);
  }
  if(def.foreignKeys) {
    def.foreignKeys.forEach(fk => {
      cols.push(`FOREIGN KEY (${fk.column}) REFERENCES ${fk.references}`);
    });
  }
  return `CREATE TABLE IF NOT EXISTS ${def.name} (\n ${cols.join(',\n ')} \n);`;
}

// helper function to create shortcut from long name
function initials(name: string): string {
  return name.split(/[\s,&]+/).filter(word => /^[A-Z]/.test(word)).map(word => word[0]).join('');
}

export async function createSchemaAndData(): Promise<void> {
  const createPersonsStatement = createTableStatement(personTableDef);
  await db.connection!.run(createPersonsStatement);
  console.log('Persons table created');
  const personNum: number = parseInt(process.env.DBFAKEPERSONS || '1000');
  for(let i = 0; i < personNum; i++) {
    const options = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName()
    }
    const fakePerson = new Person(
      options.firstName,
      options.lastName,
      faker.date.birthdate({ min: 1950, max: 2007, mode: 'year' }),
      faker.internet.email(options).toLowerCase()
    );
    await db.connection!.run(
      'INSERT INTO persons (firstname, lastname, birthdate, email) VALUES (?, ?, ?, ?)',
      fakePerson.firstname, fakePerson.lastname, fakePerson.birthdate, fakePerson.email
    );
  }
  console.log(`${personNum} fake persons data created`);    

  const createTeamsStatement = createTableStatement(teamTableDef);
  await db.connection!.run(createTeamsStatement);
  console.log('Teams table created');
  const teamsNum: number = parseInt(process.env.DBFAKETEAMS || '10') || 10;
  for(let i = 0; i < teamsNum; i++) { 
    const name = faker.company.name();
    await db.connection!.run('INSERT INTO teams (name, longname, color, has_avatar, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
      initials(name),
      name,
      COLORS[Math.floor(Math.random() * COLORS.length)],
      0,
      51.759248 + Math.random() - 0.5,
      19.455983 + Math.random() - 0.5
    );
  }
  console.log(`${teamsNum} fake teams data created`);

  const createMembershipsStatement = createTableStatement(membershipTableDef);
  await db.connection!.run(createMembershipsStatement);
  for(let membership of [
    [1,1], [1,2], [2,1], [2,3], [3,1], [3,2], [3,3], [3,4], [4,1], [5,1]
  ]) {
    await db.connection!.run('INSERT INTO memberships (person_id, team_id) VALUES (?, ?)', ...membership);
  }
  console.log('Memberships table created with sample data');
}
