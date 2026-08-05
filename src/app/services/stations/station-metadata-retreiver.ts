import { inject, Injectable } from '@angular/core';
import { ApiHandler } from '../requests/api-handler';
import { firstValueFrom, map } from 'rxjs';
import { RawStationData, RawStationMetadata, StationMetadata } from '../../models/datasets/stations';

@Injectable({
  providedIn: 'root',
})
export class StationMetadataRetreiver {
  apiHandler = inject(ApiHandler);
  
  private stationMetadata: Promise<any>;

  constructor() {
    this.stationMetadata = firstValueFrom(this.apiHandler.get<RawStationData<RawStationMetadata>[]>("/stations/metadata").pipe(
      map((values: RawStationData<RawStationMetadata>[]) => {
        let stationMetadata: Record<string, StationMetadata> = {};
        // unwrap metadata and map to skn
        for(let rawData of values) {
          const { id_field, station_group, ...metadata } = rawData.value;
          stationMetadata[metadata.skn] = metadata;
        }
        return stationMetadata;
      })
    ));
  }

  async getMetadata() {
    return this.stationMetadata;
  }
}
