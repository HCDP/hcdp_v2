import { effect, inject, Injectable, Injector, resource, ResourceRef, runInInjectionContext } from '@angular/core';
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
  private datasetData = resource<HCDPDataset, string>({
    // param triggers
    params: () => this.urlStateManager.pathSignal().dataset as string,
    
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
