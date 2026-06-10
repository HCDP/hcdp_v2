import { effect, inject, Injector, Resource, runInInjectionContext, signal, Signal, WritableSignal } from "@angular/core";
import { Tab } from "../layout/tabs";
import { HCDPTimeseriesData } from "./timeseries";
import { Locations } from "../../components/tabs/locations/locations";
import { DatasetOptions } from "../../components/tabs/dataset-options/dataset-options";
import { Timeseries } from "../../components/tabs/timeseries/timeseries";
import { ApiHandler, APISource } from "../../services/requests/api-handler";
import { DateTime, DateTimeUnit } from "luxon";
import { Configuration } from "../../services/configuration/configuration";
import { firstValueFrom, map } from "rxjs";
import { UrlStateManager } from "../../services/state/url-state-manager";
import { Params } from "@angular/router";



export class HCDPDataset {
  private injector = inject(Injector);

  private _id: string;
  private _label: string;
  private _description: string;
  private _visData: HCDPDatasetVisualization;
  private _exportData: HCDPDatasetExport;
  private _active: WritableSignal<boolean>;

  constructor(definition: HCDPDatasetDefinition) {
    const { id, label, description, visLayout, exportLayout } = definition;
    this._id = id;
    this._label = label;
    this._description = description;
    let { schema, data } = visLayout;
    switch(schema) {
      case "timeseries": {
        runInInjectionContext(this.injector, () => {
          this._visData = new HCDPDatasetTimeseriesVisualization(data as TimeseriesSchemaData, this._active.asReadonly());
        })
        break;
      }
    }
    this._exportData = new HCDPDatasetExport(exportLayout);
    this._active = signal<boolean>(false);
  }

  get id() {
    return this._id;
  }

  get label() {
    return this._label;
  }

  get description() {
    return this._description;
  }

  get visData() {
    return this._visData;
  }

  get exportData() {
    return this._exportData;
  }

  public activate() {
    this._active.set(true);
  }

  public deactivate() {
    this._active.set(false);
  }
};


export abstract class HCDPDatasetVisualization {
  private _tabs: Tab[]
  private _active: Signal<boolean>;

  constructor(tabs: Tab[], active: Signal<boolean>) {
    this._tabs = tabs;
  }

  get tabs() {
    return this._tabs;
  }

  protected get active() {
    return this._active;
  }
};


class DataStreamManager {
  private urlStateManager = inject(UrlStateManager);
  private requestManager = inject(ApiHandler);

  private _streamMap: Record<string, { type: DataStreamType, stream: Resource<any> }>;
  private _datasetParams: Record<string, string>;

  private _streamTriggers: {
    triggers: Set<string>,
    next: () => void
  }[]

  constructor(datasetParams: Record<string, string>, streams: DataStreamRecipe[], active: Signal<boolean>) {
    this._datasetParams = datasetParams;
    this._streamTriggers = [];

    this.createStreams(streams);

    effect(() => {
      if(!active()) return;

      let paramChanges = this.urlStateManager.paramDeltaSignal();
      
      for(let triggerData of this._streamTriggers) {
        const { triggers, next } = triggerData;
        // if one of the changed keys matches a trigger for this stream trigger next
        for(let key in paramChanges) {
          if(triggers.has(key)) {
            next();
            break;
          }
        }
      }
    }, {  allowSignalWrites: true });
  }

  private getStreamParams(bindParams: string[], staticParams: Record<string, string>) {
    let mergedParams = { ...this._datasetParams, ...staticParams };
    let urlParams = this.urlStateManager.paramSignal();
    for(let param of bindParams) {
      mergedParams[param] = urlParams[param];
    }
    return mergedParams;
  }

  // dont want to trigger this until first set of params applied, on ds change params may not be loaded in url
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
      this._streamMap[id] = {
        type,
        stream: resource
      }
    }
  }

  private setupResource<T>(endpoint: string, triggers: string[], staticParams: Params) {
    const params = this.getStreamParams(triggers, staticParams);
    const dataStream = signal<APISource>({
      endpoint,
      params
    })
    let resource = this.requestManager.getAPIResource<T>(dataStream.asReadonly());

    this._streamTriggers.push({
      triggers: new Set<string>(triggers),
      next: () => {
        const nextParams = this.getStreamParams(triggers, staticParams);
        dataStream.set({
          endpoint,
          params: nextParams
        });
      }
    });
    return resource;
  }

  private createRasterStream(triggers: string[], staticParams: Params) {
    const endpoint = "/raster";
    const resource = this.setupResource<ArrayBuffer>(endpoint, triggers, staticParams);
    return resource;
  }

  private createStationStream(triggers: string[], staticParams: Params) {
    const endpoint = "/stations";
    const resource = this.setupResource<any>(endpoint, triggers, staticParams);
    return resource;
  }

  public get streams() {
    return Object.keys(this._streamMap);
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



export class HCDPDatasetTimeseriesVisualization extends HCDPDatasetVisualization {
  private injector = inject(Injector);
  private requestManager = inject(ApiHandler);
  private configManager = inject(Configuration);

  private _timeseriesData: HCDPTimeseriesData;
  private _dsDateRange: Promise<[DateTime, DateTime]>;

  private _dataStreamManager: DataStreamManager;
  private _dataOptions: DataOptions;


  constructor(layout: TimeseriesSchemaData, active: Signal<boolean>) {
    let tabs: Tab[] = [{
      label: "Options",
      component: DatasetOptions
    }, {
      label: "Locations",
      component: Locations
    }, {
      label: "Timeseries",
      component: Timeseries
    }];
    super(tabs, active);
    let { datasetParams, streams, timeseries } = layout;
    let rangeOverride = timeseries.range;
    // if both ends of a range override are provided map to datetimes and resolve immediately, no need to query API for range
    if(rangeOverride && rangeOverride[0] && rangeOverride[1]) {
      this._dsDateRange = Promise.resolve(
        (rangeOverride as [string, string]).map((isoDate: string) => {
          return DateTime.fromISO(isoDate, { zone: this.configManager.timezone });
        }) as [DateTime, DateTime]
      );
    }
    // otherwise get range from API
    else {
      this._dsDateRange = firstValueFrom(
        this.requestManager.get<[string, string]>("/datasets/date/range", datasetParams)
        .pipe(
          map(
            (dates: [string, string]) => {
              // override if either end of the range has an override
              if(rangeOverride && rangeOverride[0]) {
                dates[0] = rangeOverride[0];
              }
              if(rangeOverride && rangeOverride[1]) {
                dates[1] = rangeOverride[1];
              }
              return dates.map((isoDate: string) => {
                return DateTime.fromISO(isoDate, { zone: this.configManager.timezone });
              }) as [DateTime, DateTime];
            }
          )
        )
      );
    }
    
    runInInjectionContext(this.injector, () => {
      this._dataStreamManager = new DataStreamManager(datasetParams, streams, active);
    });
  }



  public async dateRange() {
    return this._dsDateRange;
  }

  get timeseriesData() {
    return this._timeseriesData;
  }

  get dataStreams() {
    return this._dataStreamManager;
  }

  get dataOptions() {
    return this._dataOptions;
  }
};




















export class HCDPDatasetExport {
  constructor(layout: HCDPExportLayout) {

  }
};



// need to define controls

// control id to value
type HCDPDatasetState = Record<string, string>;



///////////////////////////////////////////////////////////////////////////////////
/////////////////////////////// Dataset Definitions ///////////////////////////////
///////////////////////////////////////////////////////////////////////////////////


export interface HCDPDatasetDefinition {
  id: string,
  label: string,
  description: string,
  visLayout: HCDPVisLayout,
  exportLayout: HCDPExportLayout
};

type HCDPVisSchema = "timeseries" | "static";

interface HCDPVisLayout {
  schema: HCDPVisSchema,
  data: TimeseriesSchemaData | StaticSchemaData
};

type DataStreamType = "stations" | "raster";

interface DataStreamRecipe {
  id: string,
  type: DataStreamType,
  // what controls trigger this datastream
  bind: string[],
  // other static params
  staticParams: Record<string, string>
}

interface TimeseriesData {
  // static start and end dates in iso format
  range?: [string | null, string | null],
  period: {
    unit: DateTimeUnit,
    interval: number
  }
}

type ControlType = "date" | "list" | "units";

export interface ListControlValue {
  id: string,
  label: string,
  description: string
}

export type UnitSystem = "metric" | "usc";

export interface UnitValue {
  id: string,
  name: string,
  shortName: string,
  system: UnitSystem | null
}

export interface OptionControlData {
  id: string,
  label: string,
  description: string,
  type: ControlType,
  values?: ListControlValue[] | UnitValue[]
}

export interface DataOptions {
  defaults: Record<string, string>,
  controls: OptionControlData
}

interface DataRange {
  standard: [number, number],
  extreme?: [number, number],
  limits: [number | null, number | null]
}

type ColorScheme = "viridis" | "monochromatic" | "nws_radar" | "turbo" | "usgs";
type UnitBase = "mm" | "c"

interface DataLayerGroup {
  label: string,
  description: string,
  layers: string[],
  range: DataRange,
  colors: ColorScheme[],
  defaultColor: ColorScheme,
  unitControl: string,
  computeUnitConversionsFrom: UnitBase
}

interface TimeseriesSchemaData {
  experimental: boolean,
  warnings: {
    experimental: boolean,
    usage: string
  },
  datasetParams: Record<string, string>,
  streams: DataStreamRecipe[],
  // dataset option controls
  options: DataOptions,
  timeseries: TimeseriesData,
  dataGroups: DataLayerGroup[]
}


// UPDATE
interface HCDPExportLayout {
  
};

interface StaticSchemaData {
  
}