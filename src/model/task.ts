import { HttpError } from "../helpers/errors";

export class Task {
  id: number;
  name: string;
  team_id: number;
  person_id: number;
  start_date: Date;
  end_date: Date | null;

  constructor(name: string, team_id: number, person_id: number, start_date: Date, end_date: Date | null = null) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new HttpError(400, 'Name was not provided correctly');
    }
    if (!Number.isInteger(team_id) || team_id <= 0) {
      throw new HttpError(400, 'Team ID was not provided correctly');
    }
    if (!Number.isInteger(person_id) || person_id <= 0) {
      throw new HttpError(400, 'Person ID was not provided correctly');
    }
    if (!(start_date instanceof Date) || isNaN(start_date.getTime())) {
      throw new HttpError(400, 'Start date was not provided correctly');
    }
    if (end_date !== null && (!(end_date instanceof Date) || isNaN(end_date.getTime()))) {
      throw new HttpError(400, 'End date was not provided correctly');
    }
    const now = new Date();
    if (start_date > now) {
      throw new HttpError(400, 'Start date cannot be in the future');
    }
    if (end_date && (end_date > now || end_date < start_date)) {
      throw new HttpError(400, 'End date was not provided correctly');
    }

    this.id = 0;
    this.name = name.trim();
    this.team_id = team_id;
    this.person_id = person_id;
    this.start_date = start_date;
    this.end_date = end_date;
  }
}
