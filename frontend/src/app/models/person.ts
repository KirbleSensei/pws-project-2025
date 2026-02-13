export interface Person {
  id: number;
  firstname: string;
  lastname: string;
  birthdate: Date;
  email: string;
  team_ids?: number[];
  team_objects?: any[];
}
