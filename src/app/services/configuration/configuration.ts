import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HCDPConfig } from '../../models/config/config';


@Injectable({
  providedIn: 'root',
})
export class Configuration {
  private http = inject(HttpClient);
  private config!: HCDPConfig;

  constructor() {
  }

  async loadConfig(): Promise<void> {
    const config = this.http.get<HCDPConfig>("assets/config.json");
    this.config = await firstValueFrom(config);
  }

  get timezone() {
    return this.config.locationData.timezone;
  }

  get location() {
     return this.config.locationData.location;
  }

  get dataBounds() {
    return this.config.locationData.mapView.bounds.data;
  }

  get mapBounds() {
    return this.config.locationData.mapView.bounds.map;
  }

  get defaultZoom() {
    return this.config.locationData.mapView.zoom;
  }

  get minZoom() {
    return this.config.locationData.mapView.minZoom;
  }
  
  get mapCenter() {
    return this.config.locationData.mapView.center;
  }

  sectionBounds(section: string) {
    return this.config.locationData.mapView.bounds.sections[section]
  }

  api(id: string) {
    return { ...this.config.api[id] };
  }

}