import { inject, Signal, ResourceRef, computed, Injector } from "@angular/core";
import { ApiHandler, HttpOptions } from "../../services/requests/api-handler";
import { DataStreamRecipe, DataStreamType, UnitBase, UnitSource, UnitValue } from "./recipe";
import { Params } from "@angular/router";
import { Observable, of, switchMap, tap } from "rxjs";
import { rxResource } from "@angular/core/rxjs-interop";
import { WorkerInterconnect } from "../../services/workerInterconnect/worker-interconnect";
import { RasterData, RasterStats } from "../leaflet/rasterData";
import { StationMetadataRetreiver } from "../../services/stations/station-metadata-retreiver";
import { HCDPStationDataManager, RawStationData, StationValue } from "./stations";
import { DataStateController } from "./stateController";
import { UnitTranslations } from "../../services/unitHandlers/unit-translations";
import { UnitData } from "./dataset";

export class DataStreamManager {
  private requestManager = inject(ApiHandler);
  private workerInterconnect = inject(WorkerInterconnect);
  private injector = inject(Injector);
  private stationMetadata = inject(StationMetadataRetreiver);
  private unitHandler = inject(UnitTranslations);

  private _streamMap: Record<string, StreamData>;
  private _streamParams: Record<string, Signal<Params | undefined>>;
  private _datasetParams: Record<string, string>;
  private _stateController: DataStateController;


  constructor(datasetParams: Record<string, string>, streams: DataStreamRecipe[], stateController: DataStateController, unitData: UnitData) {
    this._datasetParams = datasetParams;
    this._streamParams = {};

    this._stateController = stateController;

    this.createStreams(streams, unitData);
  }

  private createStreams(streams: DataStreamRecipe[], unitData: UnitData) {
    this._streamMap = {};
    for(let recipe of streams) {
      const { id, type, bind, staticParams } = recipe;

      let resource = null;
      switch(type) {
        case "stations": {
          resource = this.createStationStream(id, bind, staticParams, unitData);
          break;
        }
        case "raster": {
          resource = this.createRasterStream(id, bind, staticParams, unitData);
          break;
        }
      }
      this._streamMap[id] = {
        type,
        stream: resource,
        units: unitData.units
      };
    }
  }

  // T = Raw Data Type
  // R = Transformed Data Type
  // Overload with transform
  private setupResource<T, R>(id: string, endpoint: string, triggers: string[], options: HttpOptions, transform: (data: T, localDeps?: any) => R | Promise<R>, localDepsSignal?: Signal<any>): ResourceRef<R | undefined>;
  // Overload no transform, return T
  private setupResource<T>(id: string, endpoint: string, triggers: string[], options?: HttpOptions): ResourceRef<T | undefined>;
  private setupResource<T, R = T>(id: string, endpoint: string, triggers: string[], options?: HttpOptions, transform?: (data: T, localDeps?: any) => R | Promise<R>, localDepsSignal?: Signal<any>): ResourceRef<R | T | undefined> {
    
    let cachedRawData: T | null = null;
    let lastHttpParamsStr = '';

    const streamParamsSignal = computed<Params | undefined>(() => {
      const baseOptions = options ?? {};
      const staticParams = baseOptions.params ?? {};
      const mergedParams: Params = { ...this._datasetParams, ...staticParams };
      
      for(let param of triggers) {
        const state = this._stateController.getControl(param);
        if (!state) return undefined; 
        mergedParams[param] = state.stringValue;
      }
      return mergedParams;
    }, {
      equal: (a, b) => JSON.stringify(a) === JSON.stringify(b)
    });

    this._streamParams[id] = streamParamsSignal;

    const requestSignal = computed(() => {
      const params = streamParamsSignal();
      if (!params) return undefined;

      const localDeps = localDepsSignal ? localDepsSignal() : undefined;

      const baseOptions = options ?? {};
      const finalOptions = { ...baseOptions, params };
      
      return { endpoint, options: finalOptions, localDeps };
    }, {
      equal: (a, b) => JSON.stringify(a) === JSON.stringify(b)
    });

    return rxResource({
      injector: this.injector,
      params: () => requestSignal(),
      stream: ({ params: source }) => {
        const currentHttpParamsStr = JSON.stringify({ e: source.endpoint, o: source.options });
        
        let data$: Observable<T>;
        
        // cache layer: if HTTP params match, skip the network and use the cached data
        if (cachedRawData !== null && currentHttpParamsStr === lastHttpParamsStr) {
          data$ = of(cachedRawData);
        } else {
          // otherwise fetch new data and cache it
          data$ = this.requestManager.get<T>(source.endpoint, source.options).pipe(
            tap(data => {
              cachedRawData = data;
              lastHttpParamsStr = currentHttpParamsStr;
            })
          );
        }

        return data$.pipe(
          switchMap(async (data: T) => {
            if(transform) {
              // Pass the localDeps down to the transform function
              return await transform(data, source.localDeps);
            }
            return data as unknown as R;
          })
        );
      }
    });
  }

  private checkConvert(convertFrom: UnitBase | undefined, targetUnit: string) {
    if(convertFrom && convertFrom !== targetUnit) {
      return (value: number) => this.unitHandler.convert(convertFrom, targetUnit, value);
    }
    return undefined;
  }

  private getRasterStats(indexedValues: [number, number][]): RasterStats {
    // if empty return NaNs
    if(indexedValues.length == 0) {
      return {
        min: NaN,
        max: NaN,
        mean: NaN,
        stddev: NaN
      };
    }
    let min: number = Infinity;
    let max: number = -Infinity;
    let acc: number = 0;
    let n = indexedValues.length;
    for(let indexedValue of indexedValues) {
      let value = indexedValue[1];
      if(value < min) {
        min = value;
      }
      if(value > max) {
        max = value;
      }
      acc += value;
    }
    let mean: number = acc / n;
    let stddev: number = 0;
    for(let indexedValue of indexedValues) {
      let value = indexedValue[1];
      let delta = value - mean;
      delta = Math.pow(delta, 2);
      stddev += delta;
    }
    stddev /= n;
    stddev = Math.sqrt(stddev);
    return {
      min,
      max,
      mean,
      stddev
    }
  }

  private createRasterStream(id: string, triggers: string[], staticParams: Params, unitData: UnitData) {
    return this.setupResource<ArrayBuffer, RasterData | null>(
      id, 
      "/raster", 
      triggers, 
      { params: { returnEmptyNotFound: true, ...staticParams }, responseType: "arraybuffer" }, 
      async (data: ArrayBuffer, currentUnit?: UnitValue) => {
        // copy data instead of mutating raw data for caching purposes
        let bufferCopy = data.slice(0);
        let processedGeotiff = await this.workerInterconnect.workerApi.processArrayBufferGeotiffData(bufferCopy, -3.3999999521443642e+38, [0], [0]);
        
        if(processedGeotiff) {
          let imageData = processedGeotiff[0];
          let convertedValues = imageData.bands[0];

          let conversion = currentUnit ? this.checkConvert(unitData.convertFrom, currentUnit.id) : undefined;
          
          if(conversion) {
            convertedValues = convertedValues.map((indexedValue: [number, number]) => {
              let convertedValue = conversion!(indexedValue[1]);
              return [indexedValue[0], convertedValue];
            });
          }

          let stats = this.getRasterStats(convertedValues);
          
          let rasterData = new RasterData(convertedValues, imageData.header, stats);
          return rasterData;
        }
        return processedGeotiff;
      },
      unitData.units
    );
  }

  private createStationStream(id: string, triggers: string[], staticParams: Params, unitData: UnitData) {
    return this.setupResource<RawStationData<StationValue>[], HCDPStationDataManager>(
      id, 
      "/stations/value", 
      triggers, 
      { params: staticParams }, 
      async (data: RawStationData<StationValue>[], currentUnit?: UnitValue) => {
        let metadata = await this.stationMetadata.getMetadata();
        let conversion = currentUnit ? this.checkConvert(unitData.convertFrom, currentUnit.id) : undefined;
        let processedData = data.map((item: RawStationData<StationValue>) => {
          // copy data instead of mutating raw data for caching purposes
          let dataBody = { ...item.value }; 
          if(conversion) {
            dataBody.value = conversion(dataBody.value);
          }
          return dataBody;
        });

        let stationData = new HCDPStationDataManager(metadata, processedData);
        return stationData;
      },
      unitData.units
    );
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


export interface StreamData {
  type: DataStreamType,
  stream: ResourceRef<any>,
  units: Signal<UnitValue>
}