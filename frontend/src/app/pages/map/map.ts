import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import * as L from 'leaflet';

import { OsrmService } from '../../services/osrm';
import { Team } from '../../models/team';

interface DistanceRow {
  from: string;
  to: string;
  distanceKm: string;
}

const LEAFLET_MARKER_ICON_2X = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const LEAFLET_MARKER_ICON = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const LEAFLET_MARKER_SHADOW = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

@Component({
  selector: 'map-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.html',
  styleUrls: ['./map.scss']
})
export class MapPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  teams: Team[] = [];
  distanceRows: DistanceRow[] = [];
  loading = true;
  error = '';

  private map?: L.Map;

  constructor(private osrmService: OsrmService) {}

  ngAfterViewInit() {
    this.initMap();
    this.loadData();
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  private initMap() {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: LEAFLET_MARKER_ICON_2X,
      iconUrl: LEAFLET_MARKER_ICON,
      shadowUrl: LEAFLET_MARKER_SHADOW,
    });

    this.map = L.map(this.mapContainer.nativeElement).setView([51.759248, 19.455983], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private loadData() {
    this.osrmService.getWalkingDistances().subscribe({
      next: response => {
        this.teams = response.teams;
        this.renderMarkers();
        this.distanceRows = this.buildDistanceRows(response.teams, response.distances);
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.error = err?.error?.message ?? err?.message ?? 'Failed to load map data';
      }
    });
  }

  private renderMarkers() {
    if (!this.map) return;
    const points: L.LatLngExpression[] = [];
    for (const team of this.teams) {
      if (!team.location) continue;
      const p: L.LatLngExpression = [team.location.latitude, team.location.longitude];
      points.push(p);
      const marker = L.marker(p).addTo(this.map);
      marker.bindPopup(`<b>${team.name}</b><br/>${team.longname}`);
    }
    if (points.length > 0) {
      this.map.fitBounds(L.latLngBounds(points), { padding: [25, 25] });
    }
  }

  private buildDistanceRows(teams: Team[], matrix: Array<Array<number | null>>): DistanceRow[] {
    const rows: DistanceRow[] = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const meters = matrix?.[i]?.[j];
        rows.push({
          from: teams[i].name,
          to: teams[j].name,
          distanceKm: typeof meters === 'number' ? (meters / 1000).toFixed(2) : 'n/a'
        });
      }
    }
    return rows;
  }
}
