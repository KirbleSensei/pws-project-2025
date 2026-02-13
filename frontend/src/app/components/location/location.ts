import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, NgZone, Input, Output, EventEmitter } from '@angular/core';
import * as L from 'leaflet';
import { GeoPoint } from '../../models/geopoint';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

@Component({
  selector: 'location',
  templateUrl: './location.html',
  styleUrls: ['./location.scss'],
  imports: [],
  standalone: true
})
export class LocationComponent implements AfterViewInit, OnDestroy {
  constructor(private zone: NgZone) {}

  @ViewChild('mapContainer', { static: true })
  mapContainer!: ElementRef<HTMLDivElement>;
  @Input() location?: GeoPoint;
  @Output() locationChange = new EventEmitter<GeoPoint>();
  
  private map!: L.Map;
  private marker?: L.Marker;
  private resizeObserver!: ResizeObserver;
  private resizeScheduled = false;

  private initMap() {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });

    this.map = L.map(this.mapContainer.nativeElement).setView(
      [51.759248, 19.455983],
      12
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.setMarker({latitude: e.latlng.lat, longitude: e.latlng.lng});
    });

    if (this.location) {
      this.setMarker(this.location);
      this.map.setView([this.location.latitude, this.location.longitude], 12);
    }

    setTimeout(() => this.map.invalidateSize(), 0);
  }

  private setMarker(location: GeoPoint) {
    if (this.marker) {
      this.marker.setLatLng([location.latitude, location.longitude]);
    } else {
      this.marker = L.marker([location.latitude, location.longitude], { draggable: true }).addTo(this.map);

      this.marker.on('dragend', () => {
        const pos = this.marker!.getLatLng();
        this.locationChange.emit(location);
      });
    }
    this.locationChange.emit(location);
  }

  private initResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeScheduled || !this.map) {
        return;
      }

      this.resizeScheduled = true;

      this.zone.runOutsideAngular(() => {
        requestAnimationFrame(() => {
          this.map.invalidateSize();
          this.resizeScheduled = false;
        });
      });
    });

    this.resizeObserver.observe(this.mapContainer.nativeElement);
  }

  ngAfterViewInit() {
    this.initMap();
    this.initResizeObserver();  
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }
}
