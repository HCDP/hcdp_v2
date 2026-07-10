import { effect, inject, Injectable, Injector, resource, ResourceRef, runInInjectionContext } from '@angular/core';
import { UrlStateManager } from '../state/url-state-manager';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HCDPDataset } from '../../models/datasets/dataset';
import { HCDPDatasetDefinition } from '../../models/datasets/recipe';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class DatasetFactory {
  private urlStateManager = inject(UrlStateManager)
  private http = inject(HttpClient);
  private injector = inject(Injector);
  // get paths as signal to trigger dataset resource
  private pathParams = this.urlStateManager.paths;

  // resource binds the signal state to an async loader
  private datasetData = resource<HCDPDataset, string>({
    // param triggers
    params: () => this.pathParams().dataset as string,
    
    // loader handles async loading of data
    loader: async ({ params: datasetId }) => {
      // no id, enter error state, router should prevent this
      if(!datasetId) {
        throw new Error("No dataset ID provided in URL");
      }

      // Check if cached, return if it is
      if(this.datasetCache[datasetId]) {
        return this.datasetCache[datasetId];
      }
      // Otherwise validate path definition path exists (router should also ensure this is valid)
      let dsDefPath = this.DS_DEF_INDEX[datasetId];
      if (!dsDefPath) {
        throw new Error(`Dataset definition path for '${datasetId}' not found.`);
      }

      // load the dataset definition and generate the dataset
      let dsDef = await this.loadDatasetDef(dsDefPath);
      let dsObject = this.generateDataset(dsDef);
      
      // add to the cache
      this.datasetCache[datasetId] = dsObject;
      return dsObject;
    }
  });


  public readonly dataset: ResourceRef<HCDPDataset | undefined> = this.datasetData;

  private datasetCache: Record<string, HCDPDataset | null> = {};

  public readonly DEFAULT_DS_ID = "contemporary-rainfall-daily";

  public readonly DS_DEF_INDEX: Record<string, string> = {
    "contemporary-rainfall-daily": "assets/datasets/time-dependent-variables/contemporary-rainfall/contemporary-rainfall-daily.json",
    "contemporary-rainfall-monthly": "assets/datasets/time-dependent-variables/contemporary-rainfall/contemporary-rainfall-monthly.json",
    "legacy-rainfall-monthly": "assets/datasets/time-dependent-variables/legacy-rainfall/legacy-rainfall-monthly.json",
    "tmin-daily": "assets/datasets/time-dependent-variables/minimum-temperature/tmin-daily.json",
    "tmin-monthly": "assets/datasets/time-dependent-variables/minimum-temperature/tmin-monthly.json",
    "tmax-daily": "assets/datasets/time-dependent-variables/maximum-temperature/tmax-daily.json",
    "tmax-monthly": "assets/datasets/time-dependent-variables/maximum-temperature/tmax-monthly.json",
    "tavg-daily": "assets/datasets/time-dependent-variables/average-temperature/tavg-daily.json",
    "tavg-monthly": "assets/datasets/time-dependent-variables/average-temperature/tavg-monthly.json"
  };

  // public readonly DS_DEF_INDEX: Record<string, string> = {
  //   "contemporary-rainfall-daily": "assets/datasets/time-dependent-variables/contemporary-rainfall/contemporary-rainfall-daily.json",
  //   "contemporary-rainfall-monthly": "assets/datasets/time-dependent-variables/contemporary-rainfall/contemporary-rainfall-monthly.json",
  //   "legacy-rainfall-monthly": "assets/datasets/time-dependent-variables/legacy-rainfall/legacy-rainfall-monthly.json",
  //   "tmin-daily": "assets/datasets/time-dependent-variables/minimum-temperature/tmin-daily.json",
  //   "tmin-monthly": "assets/datasets/time-dependent-variables/minimum-temperature/tmin-monthly.json",
  //   "tmax-daily": "assets/datasets/time-dependent-variables/maximum-temperature/tmax-daily.json",
  //   "tmax-monthly": "assets/datasets/time-dependent-variables/maximum-temperature/tmax-monthly.json",
  //   "tavg-daily": "assets/datasets/time-dependent-variables/average-temperature/tavg-daily.json",
  //   "tavg-monthly": "assets/datasets/time-dependent-variables/average-temperature/tavg-monthly.json",
  //   "rh-2pm-avg": "assets/datasets/time-dependent-variables/relative-humidity/rh-2pm-avg.json",
  //   "spi-1-month": "assets/datasets/time-dependent-variables/standardized-precipitation-index/spi-1-month.json",
  //   "spi-3-month": "assets/datasets/time-dependent-variables/standardized-precipitation-index/spi-3-month.json",
  //   "spi-6-month": "assets/datasets/time-dependent-variables/standardized-precipitation-index/spi-6-month.json",
  //   "spi-9-month": "assets/datasets/time-dependent-variables/standardized-precipitation-index/spi-9-month.json",
  //   "spi-12-month": "assets/datasets/time-dependent-variables/standardized-precipitation-index/spi-12-month.json",
  //   "spi-24-month": "assets/datasets/time-dependent-variables/standardized-precipitation-index/spi-24-month.json",
  //   "spi-36-month": "assets/datasets/time-dependent-variables/standardized-precipitation-index/spi-36-month.json",
  //   "spi-64-month": "assets/datasets/time-dependent-variables/standardized-precipitation-index/spi-64-month.json",
  //   "ndvi-daily": "assets/datasets/time-dependent-variables/normalized-difference-vegetation-index/ndvi-daily.json",
  //   "ignition-probability-daily": "assets/datasets/time-dependent-variables/ignition-probability/ignition-probability-daily.json"
  // };

  constructor() {
    effect((onCleanup) => {
      const currentDataset = this.datasetData.value();
      
      if(currentDataset) {
        // activate the dataset
        currentDataset.activate();
        // when the dataset changes onCleanup will trigger
        onCleanup(() => {
        // deactivate the dataset
          currentDataset.deactivate();
        });
      }

    });
  }

  private async loadDatasetDef(path: string) {
    const dataListener = this.http.get<HCDPDatasetDefinition>(path);
    const dsData = await firstValueFrom(dataListener);
    return dsData;
  }

  private generateDataset(dsDef: HCDPDatasetDefinition): HCDPDataset {
    // create dataset
    let dataset = runInInjectionContext(this.injector, () => {
      return new HCDPDataset(dsDef);
    })
    return dataset;
  }
}
