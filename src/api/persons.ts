import { Router, Request, Response } from "express";

import { HttpError } from "../helpers/errors";
import { db, logDbChange, personTableDef } from "../helpers/db";
import { Person } from "../model/person";
import { requireRole } from "../helpers/auth";
import { broadcast } from "../helpers/websocket";

export const personsRouter = Router();

// persons endpoints
personsRouter.get('/', requireRole([0, 1]), async (req: Request, res: Response) => {
  let query = `
    SELECT
      id, firstname, lastname, birthdate, email,
      (
        SELECT COALESCE(
          json_group_array(
            json_object(
              'id', t.id,
              'name', t.name,
              'longname', t.longname,
              'color', t.color,
              'has_avatar', CASE WHEN t.has_avatar = 1 THEN true ELSE false END
            )
          ),
          json('[]')
        )
        FROM memberships m
        JOIN teams t ON t.id = m.team_id
        WHERE m.person_id = persons.id
      ) AS team_objects
    FROM persons
`;

  const sqlParams: any[] = [];

  const q = req.query.q as string;
  const { total } = await db.connection!.get("SELECT COUNT(1) AS total FROM persons");
  let filtered = total;
  if (q) {
    let concat = Object.entries(personTableDef.columns)
      .filter(([_name, def]) => !('skipFiltering' in def && def.skipFiltering))
      .map(([name, def]) => {
        if (def.type === 'DATE') {
          return `COALESCE(strftime('%Y-%m-%d', ${personTableDef.name}.${name} / 1000, 'unixepoch'),'')`;
        }
        return `COALESCE(${personTableDef.name}.${name},'')`;
      }).join(" || ' ' || ");
    concat += " || ' ' || COALESCE(team_objects,'')";
    query += ' WHERE ' + concat + ' LIKE ?';
    sqlParams.push(`%${q.replace(/'/g, "''")}%`);
    const row = await db.connection!.get(`SELECT COUNT(1) AS filtered FROM (${query}) f`, sqlParams);
    filtered = row.filtered;
  }
  const order = parseInt(req.query.order as string, 10);
  if (order > 0 && order <= Object.keys(personTableDef.columns).length) {
    query += ` ORDER BY ${order} ASC`;
  } else if (order < 0 && -order <= Object.keys(personTableDef.columns).length) {
    query += ` ORDER BY ${-order} DESC`;
  }
  const limit = parseInt(req.query.limit as string, 10);
  if (!isNaN(limit) && limit > 0) {
    query += ' LIMIT ?';
    sqlParams.push(limit);
  }
  const offset = parseInt(req.query.offset as string, 0);
  if (!isNaN(limit) && limit > 0 && !isNaN(offset)) {
    query += ' OFFSET ?';
    sqlParams.push(offset);
  }
  const persons = (await db.connection!.all(query, sqlParams)).map(p => ({ ...p, team_objects: JSON.parse(p.team_objects) }));
  res.json({ total, filtered, persons });
});

async function ensureTaskConsistency(personId: number, nextTeamIds: number[]) {
  const query = nextTeamIds.length > 0
    ? `SELECT t.id, t.team_id, t.name
       FROM tasks t
       WHERE t.person_id = ?
         AND t.team_id NOT IN (${nextTeamIds.map(() => '?').join(',')})`
    : `SELECT t.id, t.team_id, t.name
       FROM tasks t
       WHERE t.person_id = ?`;

  const blockedTasks = await db.connection!.all(query, personId, ...nextTeamIds);
  if (blockedTasks.length > 0) {
    throw new HttpError(400, 'Cannot remove a team assignment while the person is responsible for tasks in that team');
  }
}

async function setMembership(person_id: number, team_ids: number[]) {
  await db.connection!.run('DELETE FROM memberships WHERE person_id=?', person_id);
  for (const team_id of team_ids) {
    await db.connection!.run('INSERT INTO memberships (person_id, team_id) VALUES (?, ?)', person_id, team_id);
  }
  broadcast([0, 1], { type: 'membership_changed', data: { person_id, team_ids } });
}

function actorName(req: Request): string {
  return ((req.user as any)?.username ?? 'system');
}

personsRouter.post('/', requireRole([0]), async (req: Request, res: Response) => {
  const { firstname, lastname, birthdate, email, team_ids } = req.body;
  await db.connection!.exec('BEGIN IMMEDIATE');
  try {
    const newPerson = new Person(firstname, lastname, new Date(birthdate), email);
    newPerson.team_ids = Array.isArray(team_ids) ? team_ids : [];
    const addedPerson = await db.connection!.get('INSERT INTO persons (firstname, lastname, birthdate, email) VALUES (?, ?, ?, ?) RETURNING *',
      newPerson.firstname, newPerson.lastname, newPerson.birthdate, newPerson.email
    );
    await setMembership(addedPerson.id, newPerson.team_ids);
    await logDbChange('persons', 'INSERT', addedPerson.id, actorName(req), { person: addedPerson, team_ids: newPerson.team_ids });
    await db.connection!.exec('COMMIT');
    res.json(addedPerson);
  } catch (error: Error | any) {
    await db.connection!.exec('ROLLBACK');
    throw new HttpError(400, 'Cannot add person: ' + error.message);
  }
});

personsRouter.put('/', requireRole([0]), async (req: Request, res: Response) => {
  const { id, firstname, lastname, birthdate, email, team_ids } = req.body;
  if (typeof id !== 'number' || id <= 0) {
    throw new HttpError(400, 'ID was not provided correctly');
  }
  await db.connection!.exec('BEGIN IMMEDIATE');
  try {
    const personToUpdate = new Person(firstname, lastname, new Date(birthdate), email);
    personToUpdate.id = id;
    personToUpdate.team_ids = Array.isArray(team_ids) ? team_ids : [];
    await ensureTaskConsistency(personToUpdate.id, personToUpdate.team_ids);
    const updatedPerson = await db.connection!.get('UPDATE persons SET firstname = ?, lastname = ?, birthdate = ?, email = ? WHERE id = ? RETURNING *',
      personToUpdate.firstname, personToUpdate.lastname, personToUpdate.birthdate, personToUpdate.email, personToUpdate.id
    );
    if (!updatedPerson) {
      await db.connection!.exec('ROLLBACK');
      throw new HttpError(404, 'Person to update not found');
    }
    await setMembership(updatedPerson.id, personToUpdate.team_ids);
    await logDbChange('persons', 'UPDATE', updatedPerson.id, actorName(req), { person: updatedPerson, team_ids: personToUpdate.team_ids });
    await db.connection!.exec('COMMIT');
    res.json(updatedPerson);
  } catch (error: Error | any) {
    await db.connection!.exec('ROLLBACK');
    throw new HttpError(400, 'Cannot update person: ' + error.message);
  }
});

personsRouter.delete('/', requireRole([0]), async (req: Request, res: Response) => {
  const id = parseInt(req.query.id as string, 10);
  if (isNaN(id) || id <= 0) {
    throw new HttpError(400, 'Cannot delete person');
  }
  await db.connection!.exec('BEGIN IMMEDIATE');
  try {
    const deletedPerson = await db.connection!.get('DELETE FROM persons WHERE id = ? RETURNING *', id);
    if (!deletedPerson) {
      await db.connection!.exec('ROLLBACK');
      throw new HttpError(404, 'Person to delete not found');
    }
    broadcast([0, 1], { type: 'membership_changed', data: { person_id: deletedPerson.id, team_ids: [] } });
    await logDbChange('persons', 'DELETE', deletedPerson.id, actorName(req), deletedPerson);
    await db.connection!.exec('COMMIT');
    res.json(deletedPerson);
  } catch (error: Error | any) {
    await db.connection!.exec('ROLLBACK');
    throw new HttpError(400, 'Cannot delete person: ' + error.message);
  }
});
