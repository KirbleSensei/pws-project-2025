import { GeoPoint } from "./geopoint";

export interface Team {
  id: number;
  name: string;
  longname: string;
  color: string;
  has_avatar: boolean;
  location?: GeoPoint;
  member_count?: number;
}
