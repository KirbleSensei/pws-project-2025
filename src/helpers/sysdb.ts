// system database helper
// open sqlite database and create tables if they do not exist

import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";

import { hashPassword, users } from "./auth";
import { User } from "../model/user";

export const db: { connection: Database | null} = {
  connection: null
};

export async function openDb(): Promise<void> {
  db.connection = await open({
    filename: process.env.SYSDBFILE || './db/sysdb.sqlite3',
    driver: sqlite3.Database
  });
  const { user_version } = await db.connection.get('PRAGMA user_version;') // get current db version
  if(!user_version) { // fresh database
    await db.connection!.exec('PRAGMA user_version = 2;');
    console.log('Reinitialize system data...');
    await createSchemaAndData();
  } else if (user_version < 2) {
    await migrateToV2();
  }
}

export async function createSchemaAndData(): Promise<void> {
  const createUsersTable = `
    CREATE TABLE users (  
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    roles TEXT NOT NULL)`;
  try {
    await db.connection!.exec('PRAGMA user_version = 2;'); // set db version to 2
    await db.connection!.run(createUsersTable);
    // we can assume that the table has been just created, insert default users
    await db.connection!.run(
      'INSERT INTO users (username, password, roles) VALUES (?, ?, ?)',
      'admin', hashPassword(process.env.ADMINPASSWORD || 'Admin123'), JSON.stringify([0])
    );
    await db.connection!.run(
      'INSERT INTO users (username, password, roles) VALUES (?, ?, ?)',
      'user', hashPassword(process.env.USERPASSWORD || 'User123'), JSON.stringify([1])
    );
  } catch(err) {
    throw new Error('Error creating system database: ' + (err as Error).message);
  }
}

async function migrateToV2(): Promise<void> {
  await db.connection!.exec('BEGIN IMMEDIATE');
  try {
    // ensure second admin user exists
    const existing = await db.connection!.get('SELECT 1 FROM users WHERE username = ?', 'admin2');
    if (!existing) {
      await db.connection!.run(
        'INSERT INTO users (username, password, roles) VALUES (?, ?, ?)',
        'admin2',
        hashPassword(process.env.ADMIN2PASSWORD || 'Admin2123'),
        JSON.stringify([0])
      );
    }
    await db.connection!.exec('PRAGMA user_version = 2;');
    await db.connection!.exec('COMMIT');
  } catch (err) {
    await db.connection!.exec('ROLLBACK');
    throw new Error('Error migrating system database to v2: ' + (err as Error).message);
  }
}

export async function loadUsers(): Promise<User[]> {
  const rows = await db.connection!.all('SELECT * FROM users');
  return rows.map((row: any) => {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      roles: JSON.parse(row.roles)
    } as User;
  });
}

export function reloadUsers() {
  users.length = 0;
  loadUsers().then(loadedUsers => {
    users.push(...loadedUsers);
  });
}