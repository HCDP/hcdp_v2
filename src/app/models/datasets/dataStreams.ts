import { inject, Signal, ResourceRef, computed, Injector } from "@angular/core";
import { ApiHandler, APISource, HttpOptions } from "../../services/requests/api-handler";
import { DataStreamRecipe, DataStreamType } from "./recipe";
import { Params } from "@angular/router";
import { switchMap } from "rxjs";
import { rxResource } from "@angular/core/rxjs-interop";
import { WorkerInterconnect } from "../../services/workerInterconnect/worker-interconnect";
import { RasterData } from "../leaflet/rasterData";
import { StationMetadataRetreiver } from "../../services/stations/station-metadata-retreiver";
import { HCDPStationDataManager, RawStationData, StationValue } from "./stations";
import { DataStateController } from "./stateController";

export class DataStreamManager {
  private requestManager = inject(ApiHandler);
  private workerInterconnect = inject(WorkerInterconnect);
  private injector = inject(Injector);
  private stationMetadata = inject(StationMetadataRetreiver);

  private _streamMap: Record<string, { type: DataStreamType, stream: ResourceRef<any> }>;
  private _streamParams: Record<string, Signal<Params | undefined>>;

  private _datasetParams: Record<string, string>;
  
  private _stateController: DataStateController;

  constructor(datasetParams: Record<string, string>, streams: DataStreamRecipe[], stateController: DataStateController) {
    this._datasetParams = datasetParams;
    this._streamParams = {};

    this._stateController = stateController;

    this.createStreams(streams);
  }

  private createStreams(streams: DataStreamRecipe[]) {
    this._streamMap = {};
    for(let recipe of streams) {
      const { id, type, bind, staticParams } = recipe;
      
      let resource = null;
      switch(type) {
        case "stations": {
          resource = this.createStationStream(id, bind, staticParams);
          break;
        }
        case "raster": {
          resource = this.createRasterStream(id, bind, staticParams);
          break;
        }
      }
      this._streamMap[id] = { type, stream: resource };
    }
  }

  // T = Raw Data Type
  // R = Transformed Data Type
  // Overload with transform
  private setupResource<T, R>(id: string, endpoint: string, triggers: string[], options: HttpOptions, transform: (data: T) => R | Promise<R>): ResourceRef<R | undefined>;
  // Overload no transform, return T
  private setupResource<T>(id: string, endpoint: string, triggers: string[], options?: HttpOptions): ResourceRef<T | undefined>;
  private setupResource<T, R = T>(id: string, endpoint: string, triggers: string[], options?: HttpOptions, transform?: (data: T) => R | Promise<R>): ResourceRef<R | T | undefined> {
    
    // 1. Create a dedicated computed signal for this stream's parameters
    const streamParamsSignal = computed<Params | undefined>(() => {
      const baseOptions = options ?? {};
      const staticParams = baseOptions.params ?? {};
      const mergedParams: Params = { ...this._datasetParams, ...staticParams };
      
      for(let param of triggers) {
        // Fetch the controller from the orchestrator
        const controller = this._stateController.getControl(param);
        
        // If the control doesn't exist, the params aren't ready
        if (!controller) return undefined; 
        
        mergedParams[param] = controller.state.stringValue;
      }

      return mergedParams;
    }, {
      equal: (a, b) => JSON.stringify(a) === JSON.stringify(b)
    });

    // 2. Assign the computed signal to the dictionary so getStreamParams() can access it natively
    this._streamParams[id] = streamParamsSignal;

    // 3. Create the APISource signal that depends entirely on the params signal
    const requestSignal = computed<APISource | undefined>(() => {
      const params = streamParamsSignal();
      
      // If the params aren't ready, the request isn't ready
      if (!params) return undefined;

      const baseOptions = options ?? {};
      const finalOptions = { ...baseOptions, params };
      
      return { endpoint, options: finalOptions };
    }, {
      equal: (a, b) => JSON.stringify(a) === JSON.stringify(b)
    });

    return rxResource({
      injector: this.injector,
      params: () => requestSignal(),
      stream: ({ params: source }) => {
        return this.requestManager.get<T>(source.endpoint, source.options).pipe(
          switchMap(async (data: T) => {
            if(transform) {
              return await transform(data);
            }
            return data; 
          })
        );
      }
    });
  }

  private createRasterStream(id: string, triggers: string[], staticParams: Params) {
    return this.setupResource<ArrayBuffer, RasterData | null>(id, "/raster", triggers, { params: staticParams, responseType: "arraybuffer" }, async (data: ArrayBuffer) => {
      let processedGeotiff = await this.workerInterconnect.workerApi.processArrayBufferGeotiffData(data, -3.3999999521443642e+38, [0], [0]);
      if(processedGeotiff) {
        let imageData = processedGeotiff[0];
        let rasterData = new RasterData(imageData.bands[0].values, imageData.header, imageData.bands[0].stats);
        return rasterData;
      }
      return processedGeotiff;
    });
  }

  private createStationStream(id: string, triggers: string[], staticParams: Params) {
    return this.setupResource<RawStationData<StationValue>[], HCDPStationDataManager>(id, "/stations/value", triggers, { params: staticParams }, async (data: RawStationData<StationValue>[]) => {
      let metadata = await this.stationMetadata.getMetadata();
      let stationData = new HCDPStationDataManager(metadata, data.map(item => item.value));
      return stationData;
    });
  }

  public get streams() {
    return Object.keys(this._streamMap);
  }

  public getStreamsOfType(type: "stations"): Record<string, ResourceRef<HCDPStationDataManager>>;
  public getStreamsOfType(type: "raster"): Record<string, ResourceRef<RasterData>>;
  public getStreamsOfType(type: DataStreamType) {
    let streams: Record<string, ResourceRef<any>> = {};
    for(let streamID in this._streamMap) {
      if(this._streamMap[streamID].type == type) {
        streams[streamID] = this._streamMap[streamID].stream;
      }
    }
    return streams;
  }

  public getStreamIdsOfType(type: DataStreamType) {
    let ids: string[] = [];
    for(let streamID in this._streamMap) {
      if(this._streamMap[streamID].type == type) {
        ids.push(streamID);
      }
    }
    return ids;
  }

  public getStreamData(id: string) {
    return this._streamMap[id];
  }

  public getStreamType(id: string) {
    return this._streamMap[id].type;
  }
  
  public getStream(id: string) {
    return this._streamMap[id].stream;
  } 

  public getStreamParams(id: string) {
    return this._streamParams[id];
  }
}