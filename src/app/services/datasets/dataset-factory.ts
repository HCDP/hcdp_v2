import { effect, inject, Injectable, Injector, resource, runInInjectionContext } from '@angular/core';
import { UrlStateManager } from '../state/url-state-manager';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HCDPDataset, HCDPDatasetDefinition } from '../../models/datasets/dataset';

@Injectable({
  providedIn: 'root',
})
export class DatasetFactory {
  private urlStateManager = inject(UrlStateManager)
  private http = inject(HttpClient);
  private injector = inject(Injector);

  // resource binds the signal state to an async loader
  private datasetData = resource({
    defaultValue: null,
    // param triggers
    params: () => this.urlStateManager.pathSignal().dataset as string,
    
    // loader handles async loading of data
    loader: async ({ params: datasetId }) => {
      let dsObject: HCDPDataset | null = null
      if(datasetId) {
        // Check the cache
        if(this.datasetCache[datasetId] !== undefined) {
          dsObject = this.datasetCache[datasetId];
        }
        // If not in cache, fetch the data
        else {
          let dsDefPath = this.DS_DEF_INDEX[datasetId];
          if(dsDefPath) {
            let dsDef = await this.loadDatasetDef(dsDefPath);
            dsObject = this.generateDataset(dsDef);
          }
          // Update the cache
          this.datasetCache[datasetId] = dsObject;
        }
      }
      return dsObject;
    }
  });


  public readonly dataset = this.datasetData;

  private datasetCache: Record<string, HCDPDataset | null> = {};

  public readonly DEFAULT_DS_ID = "contemporary-rainfall-daily";

  public readonly DS_DEF_INDEX: Record<string, string> = {
    "contemporary-rainfall-daily": "assets/datasets/time-dependent-variables/contemporary-rainfall/contemporary-daily-rainfall.json"
  }

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
