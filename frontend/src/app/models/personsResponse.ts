import { Person } from "./person";

export interface PersonsResponse {
  total: number;
  filtered: number;
  persons: Person[];
}