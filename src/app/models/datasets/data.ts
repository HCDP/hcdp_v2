import { inject, Signal, ResourceRef, computed, Injector } from "@angular/core";
import { ApiHandler, APISource, HttpOptions } from "../../services/requests/api-handler";
import { DataStreamRecipe, DataStreamType } from "./recipe";
import { Params } from "@angular/router";
import { combineLatest, map, Observable, of, switchMap } from "rxjs";
import { rxResource, toSignal } from "@angular/core/rxjs-interop";
import { WorkerInterconnect } from "../../services/workerInterconnect/worker-interconnect";
import { RasterData } from "../leaflet/rasterData";
import { StationMetadataRetreiver } from "../../services/stations/station-metadata-retreiver";
import { HCDPStationDataManager, RawStationData, StationValue } from "./stations";

export class DataStreamManager {
  private requestManager = inject(ApiHandler);
  private workerInterconnect = inject(WorkerInterconnect);
  private injector = inject(Injector);
  private stationMetadata = inject(StationMetadataRetreiver);

  private _streamMap: Record<string, { type: DataStreamType, stream: ResourceRef<any> }>;
  private _datasetParams: Record<string, string>;
  
  // The bridged signal that rxResource will watch natively
  private _sourceState: Signal<Record<string, string> | undefined>;

  constructor(datasetParams: Record<string, string>, streams: DataStreamRecipe[], active: Observable<boolean>, state: Observable<Record<string, string> | undefined>) {
    this._datasetParams = datasetParams;

    // if inactive resolve to undefined to pause resource, otherwise provide state to signal for conversion to resource
    this._sourceState = toSignal(
      combineLatest([active, state]).pipe(
        map(([isActive, state]) => isActive ? state : undefined)
      ),
      { initialValue: undefined } 
    );

    this.createStreams(streams);
  }

  private createStreams(streams: DataStreamRecipe[]) {
    this._streamMap = {};
    for(let recipe of streams) {
      const { id, type, bind, staticParams } = recipe;
      
      let resource = null;
      switch(type) {
        case "stations": {
          resource = this.createStationStream(bind, staticParams);
          break;
        }
        case "raster": {
          resource = this.createRasterStream(bind, staticParams);
          break;
        }
      }
      this._streamMap[id] = { type, stream: resource! };
    }
  }

  // T = Raw Data Type
  // R = Transformed Data Type
  // Overload with transform
  private setupResource<T, R>(endpoint: string, triggers: string[], options: HttpOptions, transform: (data: T) => R | Promise<R>): ResourceRef<R | undefined>;
  // Overload no transform, return T
  private setupResource<T>(endpoint: string, triggers: string[], options?: HttpOptions): ResourceRef<T | undefined>;
  private setupResource<T, R = T>(endpoint: string, triggers: string[], options?: HttpOptions,transform?: (data: T) => R | Promise<R>): ResourceRef<R | T | undefined> {
    const requestSignal = computed<APISource | undefined>(() => {
      const validParams = this._sourceState();
      if (!validParams) return undefined; 

      options = options ?? {};
      let staticParams = options.params ?? {}
      let mergedParams = { ...this._datasetParams, ...staticParams };
      options = { ...options, params: mergedParams };
      
      for(let param of triggers) {
        if (validParams[param] === undefined || validParams[param] === null) {
          return undefined; 
        }
        mergedParams[param] = validParams[param];
      }
      
      return { endpoint, options };
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

  private createRasterStream(triggers: string[], staticParams: Params) {
    return this.setupResource<ArrayBuffer, RasterData | null>("/raster", triggers, { params: staticParams, responseType: "arraybuffer" }, async (data: ArrayBuffer) => {
      let processedGeotiff = await this.workerInterconnect.workerApi.processArrayBufferGeotiffData(data, -3.3999999521443642e+38, [0], [0]);
      if(processedGeotiff) {
        let imageData = processedGeotiff[0];
        let rasterData = new RasterData(imageData.bands[0].values, imageData.header, imageData.bands[0].stats);
        return rasterData;
      }
      return processedGeotiff;
    });
  }

  private createStationStream(triggers: string[], staticParams: Params) {
    return this.setupResource<RawStationData<StationValue>[], HCDPStationDataManager>("/stations/value", triggers, { params: staticParams }, async (data: RawStationData<StationValue>[]) => {
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

  public getStreamData(id: string) {
    return this._streamMap[id];
  }

  public getStreamType(id: string) {
    return this._streamMap[id].type;
  }
  
  public getStream(id: string) {
    return this._streamMap[id].stream;
  } 
}