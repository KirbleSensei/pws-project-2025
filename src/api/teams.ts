import { Router, Request, Response } from "express";

import { HttpError } from "../helpers/errors";
import { db, teamTableDef } from "../helpers/db";
import { Team } from "../model/team";
import { deleteUploadedFile } from "../helpers/fileupload";
import { requireRole } from "../helpers/auth";

export const teamsRouter = Router();

// teams endpoints
teamsRouter.get('/', requireRole([0, 1]), async (req: Request, res: Response) => {
  let query = `
    SELECT
      id, name, longname, color, has_avatar, latitude, longitude,
      (
        SELECT COUNT(*)
        FROM memberships m
        WHERE m.team_id = teams.id
    ) AS member_count
    FROM teams
  ` // base query

  const sqlParams: any[] = [];

  const q = req.query.q as string;
  if (q) { // filter query provided
    let concat = Object.entries(teamTableDef.columns)
      .filter(([_name, def]) => !('skipFiltering' in def && def.skipFiltering))
      .map(([name, def]) => {
        if (def.type === 'DATE') {
          // special handling of date by conversion from unix timestamp in ms to YYYY-MM-DD
          return `COALESCE(strftime('%Y-%m-%d', ${teamTableDef.name}.${name} / 1000, 'unixepoch'),'')`;
        }
        return `COALESCE(${teamTableDef.name}.${name},'')`; // coalesce is needed to protect against potential null-values
      }).join(" || ' ' || ");
    query += ' WHERE ' + concat + ' LIKE ?';
    sqlParams.push(`%${q.replace(/'/g, "''")}%`);
  }
  const order = parseInt(req.query.order as string, 10);
  if (order > 0 && order <= Object.keys(teamTableDef.columns).length) { // order column provided; order cannot be parameterized
    query += ` ORDER BY ${order} ASC`; // we have to build this part of query directly
  } else if (order < 0 && -order <= Object.keys(teamTableDef.columns).length) {
    query += ` ORDER BY ${-order} DESC`;
  }
  const limit = parseInt(req.query.limit as string, 10);
  if (!isNaN(limit) && limit > 0) { // limit provided
    query += ' LIMIT ?';
    sqlParams.push(limit);
  }
  const offset = parseInt(req.query.offset as string, 0);
  if (!isNaN(offset)) { // offset provided
    query += ' OFFSET ?';
    sqlParams.push(offset);
  }
  const teams = await db!.connection!.all(query, sqlParams);
  const result = teams.map(({ latitude, longitude, ...rest }) => ({
    ...rest, location: { latitude, longitude }
  }));
  res.json(result);
});

teamsRouter.post('/', requireRole([0]), async (req: Request<{}, {}, Team>, res: Response) => {
  const { name, longname, color, has_avatar, location} = req.body; // assume body has correct shape so name is present
  try {
    const newTeam = new Team(name, longname, color, has_avatar, location);
    const addedTeam = await db!.connection!.get('INSERT INTO teams (name, longname, color, has_avatar, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
      newTeam.name, newTeam.longname, newTeam.color, newTeam.has_avatar, newTeam.location?.latitude ?? null, newTeam.location?.longitude ?? null
    );
    res.json(addedTeam); // return the newly created Team; alternatively, you may consider returning the full list of teams
  } catch (error: Error | any) {
    throw new HttpError(400, 'Cannot add team: ' + error.message); // bad request; validation or database error
  }
});

teamsRouter.put('/', requireRole([0]), async (req: Request<{}, {}, Team>, res: Response) => {
  const { id, name, longname, color, has_avatar, location } = req.body;
  try {
    if (typeof id !== 'number' || id <= 0) {
      throw new HttpError(400, 'ID was not provided correctly');
    }
    const TeamToUpdate = new Team(name, longname, color, has_avatar, location);
    TeamToUpdate.id = id;  // retain the original id
    const updatedTeam = await db!.connection!.get('UPDATE teams SET name = ?, longname = ?, color = ?, has_avatar = ?, latitude = ?, longitude = ? WHERE id = ? RETURNING *',
      TeamToUpdate.name, TeamToUpdate.longname, TeamToUpdate.color, TeamToUpdate.has_avatar, TeamToUpdate.location?.latitude ?? null, TeamToUpdate.location?.longitude ?? null, TeamToUpdate.id
    );
    if (updatedTeam) {
      if(!has_avatar) {
        deleteUploadedFile(id.toString() + '.png', 'avatar'); // delete associated avatar file if exists
      }
      res.json(updatedTeam); // return the updated Team
    } else {
      throw new HttpError(404, 'Team to update not found');
    }
  } catch (error: Error | any) {
    throw new HttpError(400, 'Cannot update team: ' + error.message);
  }
});

teamsRouter.delete('/', requireRole([0]), async (req: Request, res: Response) => {
  const id = parseInt(req.query.id as string, 10);
  if (isNaN(id) || id <= 0) {
    throw new HttpError(404, 'ID was not provided correctly');
  }
  const deletedTeam = await db!.connection!.get('DELETE FROM teams WHERE id = ? RETURNING *', id);
  if (deletedTeam) {
    deleteUploadedFile(id.toString() + '.png', 'avatar'); // delete associated avatar file if exists
    res.json(deletedTeam); // return the deleted Team
  } else {
    throw new HttpError(404, 'Team to delete not found');
  }
});
