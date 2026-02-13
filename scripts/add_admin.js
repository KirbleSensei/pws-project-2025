#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const { scryptSync, randomBytes } = require('crypto');
const path = require('path');

const dbFile = process.env.SYSDBFILE || path.join(__dirname, '..', 'db', 'sysdb.sqlite3');
const username = process.env.NEW_ADMIN_USERNAME || 'admin2';
const password = process.env.NEW_ADMIN_PASSWORD || 'Admin234';

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function exitWith(msg, code = 0) {
  console.log(msg);
  process.exit(code);
}

const db = new sqlite3.Database(dbFile, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    exitWith(`Failed to open database file "${dbFile}": ${err.message}`, 2);
  }
  // ensure users table exists
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err2, row) => {
    if (err2) {
      exitWith('Error checking database schema: ' + err2.message, 3);
    }
    if (!row) {
      exitWith('Users table not found in sysdb. If this is a fresh install, the app will create default users on startup.', 4);
    }
    // check if username exists
    db.get('SELECT id FROM users WHERE username = ?', [username], (err3, existing) => {
      if (err3) {
        exitWith('Error querying users table: ' + err3.message, 5);
      }
      if (existing) {
        exitWith(`User "${username}" already exists with id ${existing.id}.`, 0);
      }
      const hashed = hashPassword(password);
      const roles = JSON.stringify([0]);
      db.run('INSERT INTO users (username, password, roles) VALUES (?, ?, ?)', [username, hashed, roles], function(err4) {
        if (err4) {
          exitWith('Error inserting new user: ' + err4.message, 6);
        }
        console.log(`Inserted new admin user "${username}" with id ${this.lastID}.`);
        console.log('Default password used or from env NEW_ADMIN_PASSWORD.');
        db.close();
        process.exit(0);
      });
    });
  });
});
