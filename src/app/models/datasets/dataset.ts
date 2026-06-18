import { inject, Injector, runInInjectionContext } from "@angular/core";
import { Tab } from "../layout/tabs";
import { HCDPTimeseriesData } from "./timeseries";
import { Locations } from "../../components/tabs/locations/locations";
import { DatasetOptions } from "../../components/tabs/dataset-options/dataset-options";
import { Timeseries } from "../../components/tabs/timeseries/timeseries";
import { ApiHandler } from "../../services/requests/api-handler";
import { DateTime } from "luxon";
import { Configuration } from "../../services/configuration/configuration";
import { BehaviorSubject, firstValueFrom, map, Observable } from "rxjs";
import { Period } from "./time";
import { DataOptions, DataStreamRecipe, HCDPDatasetDefinition, HCDPExportLayout, TimeseriesData, TimeseriesSchemaData } from "./recipe";
import { DataStreamManager } from "./data";
import { TimeseriesDataStateController } from "./state";



export class HCDPDataset {
  private injector = inject(Injector);

  private _id: string;
  private _label: string;
  private _description: string;
  private _visData: HCDPDatasetVisualization;
  private _exportData: HCDPDatasetExport;
  private _active: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(definition: HCDPDatasetDefinition) {
    const { id, label, description, visLayout, exportLayout } = definition;
    this._id = id;
    this._label = label;
    this._description = description;
    let { schema, data } = visLayout;
    switch(schema) {
      case "timeseries": {
        runInInjectionContext(this.injector, () => {
          this._visData = new HCDPDatasetTimeseriesVisualization(data as TimeseriesSchemaData, this._active.asObservable());
        })
        break;
      }
    }
    this._exportData = new HCDPDatasetExport(exportLayout);
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
    this._active.next(true);
  }

  public deactivate() {
    this._active.next(false);
  }
};


export abstract class HCDPDatasetVisualization {
  private _tabs: Tab[]
  private _active: Observable<boolean>;

  constructor(tabs: Tab[], active: Observable<boolean>) {
    this._tabs = tabs;
    this._active = active;
  }

  get tabs() {
    return this._tabs;
  }

  protected get active() {
    return this._active;
  }
};






export class HCDPDatasetTimeseriesVisualization extends HCDPDatasetVisualization {
  private injector = inject(Injector);
  private requestManager = inject(ApiHandler);
  private configManager = inject(Configuration);

  private _timeseriesData: Promise<HCDPTimeseriesData>;
  private _dataState: Promise<TimeseriesDataStateController>;
  private _dataStreamManager: Promise<DataStreamManager>;
  

  constructor(layout: TimeseriesSchemaData, active: Observable<boolean>) {
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
    
    let { datasetParams, streams, timeseries, options } = layout;
    
    this._timeseriesData = this.setupTimeseries(timeseries, datasetParams);
    this._dataState = this.setupState(active, options);
    this._dataStreamManager = this.setupDataStreams(active, datasetParams, streams);
  }

  private async setupTimeseries(timeseries: TimeseriesData, datasetParams: Record<string, string>) {
    let periodData = new Period(timeseries.period.unit, timeseries.period.interval)
    let rangeOverride = timeseries.range;
    let dateRange: [DateTime, DateTime];
    // if range override provided on both ends resolve directly with these values
    if(rangeOverride && rangeOverride[0] && rangeOverride[1]) {
      dateRange = (rangeOverride as [string, string]).map((isoDate: string) => {
        return DateTime.fromISO(isoDate, { zone: this.configManager.timezone });
      }) as [DateTime, DateTime];
    }
    // otherwise get range from API
    else {
      dateRange = await firstValueFrom(
        this.requestManager.get<[string, string]>("/datasets/date/range", {params: datasetParams})
        .pipe(
          map(
            (dates: [string, string]) => {
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
    let defaultDate: DateTime | undefined;
    if(timeseries.defaultDate) {
      defaultDate = DateTime.fromISO(timeseries.defaultDate, { zone: this.configManager.timezone });
    }
      
    return new HCDPTimeseriesData(periodData, dateRange[0], dateRange[1], defaultDate);
  }

  private async setupState(active: Observable<boolean>, options: DataOptions) {
    const timeseriesData = await this._timeseriesData;

    // initilize state controller
    return runInInjectionContext(this.injector, () => {
      return new TimeseriesDataStateController(active, options, timeseriesData);
    });
  }

  private async setupDataStreams(active: Observable<boolean>, datasetParams: Record<string, string>, streams: DataStreamRecipe[]) {
    const dataState = await this._dataState;

    return runInInjectionContext(this.injector, () => {
      return new DataStreamManager(datasetParams, streams, active, dataState.state);
    })
  }

  get timeseriesData() {
    return this._timeseriesData;
  }

  get dataStreams() {
    return this._dataStreamManager;
  }

  get dataState() {
    return this._dataState;
  }
}

export class HCDPDatasetExport {
  constructor(layout: HCDPExportLayout) {

  }
};