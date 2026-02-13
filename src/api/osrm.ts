import { Request, Response, Router } from 'express';

import { requireRole } from '../helpers/auth';
import { db } from '../helpers/db';
import { HttpError } from '../helpers/errors';

export const osrmRouter = Router();

function haversineMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const la1 = toRad(aLat);
  const la2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fallbackDistances(teams: any[]) {
  return teams.map((from: any) => teams.map((to: any) => {
    if (from.id === to.id) return 0;
    // rough walking estimate from straight-line distance
    return haversineMeters(from.latitude, from.longitude, to.latitude, to.longitude) * 1.3;
  }));
}

osrmRouter.get('/walking-distances', requireRole([0, 1]), async (_req: Request, res: Response) => {
  const teams = await db.connection!.all(
    `SELECT id, name, longname, color, latitude, longitude
     FROM teams
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL
     ORDER BY id ASC`
  );

  if (teams.length === 0) {
    res.json({ teams: [], distances: [] });
    return;
  }

  if (teams.length === 1) {
    const [team] = teams;
    res.json({
      teams: teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        longname: t.longname,
        color: t.color,
        location: { latitude: t.latitude, longitude: t.longitude }
      })),
      distances: [[0]]
    });
    return;
  }

  const coordinates = teams.map((t: any) => `${t.longitude},${t.latitude}`).join(';');
  const baseUrl = process.env.OSRM_URL || 'https://router.project-osrm.org';
  const url = `${baseUrl}/table/v1/foot/${coordinates}?annotations=distance`;

  let distances: Array<Array<number | null>>;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM HTTP ${response.status}`);
    }
    const body: any = await response.json();
    if (!Array.isArray(body?.distances)) {
      throw new Error('OSRM response malformed');
    }
    distances = body.distances;
  } catch (err) {
    console.warn('OSRM request failed, fallback to haversine estimate', err);
    distances = fallbackDistances(teams);
  }

  res.json({
    teams: teams.map((t: any) => ({
      id: t.id,
      name: t.name,
      longname: t.longname,
      color: t.color,
      location: { latitude: t.latitude, longitude: t.longitude }
    })),
    distances
  });
});
