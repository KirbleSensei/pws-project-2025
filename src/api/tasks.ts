import { Request, Response, Router } from "express";

import { requireRole } from "../helpers/auth";
import { db, taskTableDef } from "../helpers/db";
import { HttpError } from "../helpers/errors";
import { Task } from "../model/task";

export const tasksRouter = Router();

async function ensureResponsiblePersonInTeam(personId: number, teamId: number) {
  const membership = await db.connection!.get(
    'SELECT 1 FROM memberships WHERE person_id = ? AND team_id = ?',
    personId,
    teamId
  );
  if (!membership) {
    throw new HttpError(400, 'Responsible person must belong to assigned team');
  }
}

function parseOptionalMultiTeamFilter(teamIdsParam: string | undefined): number[] {
  if (!teamIdsParam) return [];
  return teamIdsParam
    .split(',')
    .map(s => parseInt(s, 10))
    .filter(id => Number.isInteger(id) && id > 0);
}

tasksRouter.get('/', requireRole([0, 1]), async (req: Request, res: Response) => {
  let query = `
    SELECT
      tasks.id,
      tasks.name,
      tasks.team_id,
      tasks.person_id,
      tasks.start_date,
      tasks.end_date,
      teams.name AS team_name,
      teams.color AS team_color,
      persons.firstname || ' ' || persons.lastname AS person_name
    FROM tasks
    JOIN teams ON teams.id = tasks.team_id
    JOIN persons ON persons.id = tasks.person_id
  `;

  const sqlParams: any[] = [];
  const q = req.query.q as string;
  const selectedTeamIds = parseOptionalMultiTeamFilter(req.query.team_ids as string | undefined);

  const whereParts: string[] = [];
  if (q) {
    let concat = Object.entries(taskTableDef.columns)
      .filter(([_name, def]) => !('skipFiltering' in def && def.skipFiltering))
      .map(([name, def]) => {
        if (def.type === 'DATE') {
          return `COALESCE(strftime('%Y-%m-%d', tasks.${name} / 1000, 'unixepoch'),'')`;
        }
        return `COALESCE(tasks.${name},'')`;
      }).join(" || ' ' || ");
    concat += " || ' ' || COALESCE(team_name,'') || ' ' || COALESCE(person_name,'')";
    whereParts.push(`${concat} LIKE ?`);
    sqlParams.push(`%${q.replace(/'/g, "''")}%`);
  }

  if (selectedTeamIds.length > 0) {
    whereParts.push(`tasks.team_id IN (${selectedTeamIds.map(() => '?').join(',')})`);
    sqlParams.push(...selectedTeamIds);
  }

  if (whereParts.length > 0) {
    query += ' WHERE ' + whereParts.join(' AND ');
  }

  const order = parseInt(req.query.order as string, 10);
  if (order > 0 && order <= Object.keys(taskTableDef.columns).length) {
    query += ` ORDER BY ${order} ASC`;
  } else if (order < 0 && -order <= Object.keys(taskTableDef.columns).length) {
    query += ` ORDER BY ${-order} DESC`;
  }

  res.json(await db.connection!.all(query, sqlParams));
});

tasksRouter.post('/', requireRole([0]), async (req: Request, res: Response) => {
  const { name, team_id, person_id, start_date, end_date } = req.body;
  try {
    const newTask = new Task(name, team_id, person_id, new Date(start_date), end_date ? new Date(end_date) : null);
    await ensureResponsiblePersonInTeam(newTask.person_id, newTask.team_id);
    const addedTask = await db.connection!.get(
      'INSERT INTO tasks (name, team_id, person_id, start_date, end_date) VALUES (?, ?, ?, ?, ?) RETURNING *',
      newTask.name,
      newTask.team_id,
      newTask.person_id,
      newTask.start_date,
      newTask.end_date
    );
    res.json(addedTask);
  } catch (error: Error | any) {
    throw new HttpError(400, 'Cannot add task: ' + error.message);
  }
});

tasksRouter.put('/', requireRole([0]), async (req: Request, res: Response) => {
  const { id, name, team_id, person_id, start_date, end_date } = req.body;
  if (typeof id !== 'number' || id <= 0) {
    throw new HttpError(400, 'ID was not provided correctly');
  }
  try {
    const taskToUpdate = new Task(name, team_id, person_id, new Date(start_date), end_date ? new Date(end_date) : null);
    taskToUpdate.id = id;
    await ensureResponsiblePersonInTeam(taskToUpdate.person_id, taskToUpdate.team_id);
    const updatedTask = await db.connection!.get(
      'UPDATE tasks SET name = ?, team_id = ?, person_id = ?, start_date = ?, end_date = ? WHERE id = ? RETURNING *',
      taskToUpdate.name,
      taskToUpdate.team_id,
      taskToUpdate.person_id,
      taskToUpdate.start_date,
      taskToUpdate.end_date,
      taskToUpdate.id
    );
    if (!updatedTask) {
      throw new HttpError(404, 'Task to update not found');
    }
    res.json(updatedTask);
  } catch (error: Error | any) {
    throw new HttpError(400, 'Cannot update task: ' + error.message);
  }
});

tasksRouter.delete('/', requireRole([0]), async (req: Request, res: Response) => {
  const id = parseInt(req.query.id as string, 10);
  if (isNaN(id) || id <= 0) {
    throw new HttpError(404, 'ID was not provided correctly');
  }
  const deletedTask = await db.connection!.get('DELETE FROM tasks WHERE id = ? RETURNING *', id);
  if (!deletedTask) {
    throw new HttpError(404, 'Task to delete not found');
  }
  res.json(deletedTask);
});
