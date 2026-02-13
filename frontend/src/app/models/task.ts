export interface Task {
  id: number;
  name: string;
  team_id: number;
  person_id: number;
  start_date: Date;
  end_date: Date | null;
  team_name?: string;
  team_color?: string;
  person_name?: string;
}
