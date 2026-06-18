import { inject, Injectable } from '@angular/core';
import { ApiHandler } from '../requests/api-handler';
import { firstValueFrom, map } from 'rxjs';
import { RawStationData, StationMetadata } from '../../models/datasets/stations';

@Injectable({
  providedIn: 'root',
})
export class StationMetadataRetreiver {
  apiHandler = inject(ApiHandler);
  
  private stationMetadata: Promise<any>;

  constructor() {
    this.stationMetadata = firstValueFrom(this.apiHandler.get<RawStationData<StationMetadata>[]>("/stations/metadata").pipe(
      map((value: RawStationData<StationMetadata>[]) => {
        let stationMetadata: Record<string, StationMetadata> = {};
        // unwrap metadata and map to skn
        for(let metadata of value) {
          stationMetadata[metadata.value.skn] = metadata.value;
        }
        return stationMetadata;
      })
    ));
  }

  async getMetadata() {
    return this.stationMetadata;
  }
}
