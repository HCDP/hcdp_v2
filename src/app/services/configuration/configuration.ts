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
    return this.config.timezone;
  }

  get location() {
     return this.config.location;
  }

  api(id: string) {
    return this.config.api[id];
  }

}
