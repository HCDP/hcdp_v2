import * as Comlink from 'comlink';
import { Injectable } from '@angular/core';
import type { GeoTiffWorkerApi } from '../../workers/geotiff.worker';

@Injectable({
  providedIn: 'root',
})
export class WorkerInterconnect {
  workerApi: Comlink.Remote<GeoTiffWorkerApi>;

  constructor() {
    const worker = new Worker(
      new URL('../../workers/geotiff.worker', import.meta.url), 
      { type: "module" }
    );

    this.workerApi = Comlink.wrap<GeoTiffWorkerApi>(worker);
  }
}
