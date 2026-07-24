import { inject, Injector, runInInjectionContext, signal, Signal, WritableSignal } from "@angular/core";
import { Tab } from "../layout/tabs";
import { HCDPTimeseriesData } from "./timeseries";
import { Locations } from "../../components/tabs/locations/locations";
import { DatasetOptions } from "../../components/tabs/dataset-options/dataset-options";
import { Timeseries } from "../../components/tabs/timeseries/timeseries";
import { ApiHandler } from "../../services/requests/api-handler";
import { DateTime } from "luxon";
import { firstValueFrom, map } from "rxjs";
import { Period } from "./time";
import { HCDPDatasetDefinition, HCDPLayout, OptionControlData, TimeseriesData, TimeseriesSchemaData, UnitBase, UnitValue } from "./recipe";
import { DataStreamManager } from "./dataStreams";
import { DataStateController, OptionState } from "./stateController";
import { MapState } from "./mapState";
import { ExportTimeseriesDataHandler } from "./export";
import { LocationManager } from "./locationManager";
import { TabManager } from "./tabManager";
import { Configuration } from "../../services/configuration/configuration";



export class HCDPDataset {
  private injector = inject(Injector);
  private requestManager = inject(ApiHandler);
  private config = inject(Configuration);
  
  private _data: Promise<HCDPDatasetVisualization>;
  private _active: WritableSignal<boolean> = signal(false);

  constructor(definition: HCDPDatasetDefinition) {
    const { id, label, datatypeLabel, description, layout } = definition;
    this._data = this.initializeData(id, label, datatypeLabel, description, layout);
  }

  private async initializeData(id: string, label: string , datatypeLabel: string, description: string, visLayout: HCDPLayout) {
    let { schema, data } = visLayout;
    switch(schema) {
      case "timeseries": {
        let layout = data as TimeseriesSchemaData;
        let { datasetParams, timeseries } = layout;
        let range = await this.getDatasetRange(timeseries, datasetParams);
        return runInInjectionContext(this.injector, () => {
          return new HCDPDatasetTimeseriesVisualization(id, label, datatypeLabel, description, layout, { range }, this._active.asReadonly());
        });
      }
      case "static": {
        return new HCDPDatasetStaticVisualization("static", id, label, datatypeLabel, description, [], this._active.asReadonly()); 
      }
    }
  }


  private async getDatasetRange(timeseries: TimeseriesData, datasetParams: Record<string, string>) {
    let rangeOverride = timeseries.range;
    let dateRange: [DateTime, DateTime];
    // if range override provided on both ends resolve directly with these values
    if(rangeOverride && rangeOverride[0] && rangeOverride[1]) {
      dateRange = (rangeOverride as [string, string]).map((isoDate: string) => {
        return DateTime.fromISO(isoDate, { zone: this.config.timezone});
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
                return DateTime.fromISO(isoDate, { zone: this.config.timezone });
              }) as [DateTime, DateTime];
            }
          )
        )
      );
    }
    return dateRange;
  }

  get data() {
    return this._data;
  }

  public activate() {
    this._active.set(true);
  }

  public deactivate() {
    this._active.set(false);
  }
};


export abstract class HCDPDatasetVisualization {
  public readonly type;

  private _id: string;
  private _label: string;
  private _datatypeLabel: string;
  private _description: string;
  private _tabManager: TabManager;
  private _active: Signal<boolean>;

  constructor(type: string, id: string, label: string, datatypeLabel: string, description: string, tabs: Tab[], active: Signal<boolean>) {
    this.type = type;
    this._tabManager = new TabManager(tabs);
    this._active = active;
    this._id = id;
    this._label = label;
    this._datatypeLabel = datatypeLabel;
    this._description = description;
  }

  get tabManager() {
    return this._tabManager;
  }

  protected get active() {
    return this._active;
  }

  get id() {
    return this._id;
  }

  get label() {
    return this._label;
  }

  get datatypeLabel() {
    return this._datatypeLabel;
  }

  get description() {
    return this._description;
  }
};






export class HCDPDatasetTimeseriesVisualization extends HCDPDatasetVisualization {
  private static readonly DATE_CHUNK_SIZE =  2500;

  private _timeseriesData: HCDPTimeseriesData;
  private _dataState: DataStateController;
  private _dataStreamManager: DataStreamManager;
  private _mapState: MapState;
  private _exportData: ExportTimeseriesDataHandler;
  private _locationManager: LocationManager;
  private _dateChunks: [DateTime, DateTime][];
  private _unitData: UnitData;
  

  constructor(id: string, label: string, datatypeLabel: string, description: string, layout: TimeseriesSchemaData, initData: {range: [DateTime, DateTime]}, active: Signal<boolean>) {
    let tabs: Tab[] = [
      new Tab("options", "Options", DatasetOptions),
      new Tab("locations", "Locations", Locations),
      new Tab("timeseries", "Charts", Timeseries)
    ];
    super("timeseries", id, label, datatypeLabel, description, tabs, active);
    
    let { datasetParams, streams, timeseries, options, mapLayers, exportData, unitSource } = layout;
    let { range } = initData;
    let [ startDate, endDate ] = range;
    
    let defaultDate: DateTime;
    if(timeseries.defaultDate) {
      defaultDate = DateTime.fromISO(timeseries.defaultDate);
    }
    else {
      defaultDate = endDate
    }


    let periodData = new Period(timeseries.period.unit, timeseries.period.interval);
    let timeseriesData = new HCDPTimeseriesData(periodData, startDate, endDate);
    this._timeseriesData = timeseriesData;

    // add date control
    let dateControl: OptionControlData<"date"> = {
      id: "date",
      label: "Date",
      description: "The date represented by the data.",
      type: "date",
      values: timeseriesData
    };
    options.controls.unshift(dateControl);
    // add default date value
    options.defaults.date = timeseriesData.period.formatDate(defaultDate);

    this._dataState = new DataStateController(active, options);
    let { source, convertFrom } = unitSource;
    if(typeof source === "string") {
      let controller = this._dataState.getControl(source) as OptionState<"units"> | undefined;
      if(!controller || controller.type !== "units") {
        throw new Error(`Invalid unit controller specified: ${source}`);
      }
      this._unitData = {
        units: controller.value,
        convertFrom
      };
      
    }
    else {
      this._unitData = {
        units: signal<UnitValue>(source),
        convertFrom
      };
    }
    this._dataStreamManager = new DataStreamManager(datasetParams, streams, this._dataState, this._unitData);
    this._mapState = new MapState(mapLayers, this._unitData);
    this._exportData = new ExportTimeseriesDataHandler(exportData, datasetParams, this._timeseriesData);
    this._locationManager = new LocationManager();
    this.createDateChunks();
  }

  private createDateChunks(): void {
    this._dateChunks = [];
    let date = this._timeseriesData.start;
    while(date < this._timeseriesData.end) {
      let chunkEnd = this._timeseriesData.period.add(HCDPDatasetTimeseriesVisualization.DATE_CHUNK_SIZE, date);
      if(chunkEnd > this._timeseriesData.end) {
        chunkEnd = this._timeseriesData.end;
      }
      this._dateChunks.push([date, chunkEnd]);
      date = chunkEnd;
    }
  }

  get exportData() {
    return this._exportData;
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

  get mapState() {
    return this._mapState;
  }

  get locationManager() {
    return this._locationManager;
  }

  get dateChunks() {
    return this._dateChunks;
  }

  get units() {
    return this._unitData.units;
  }

  valueLabel(includePeriod: boolean = false) {
    let datatype = this.datatypeLabel;
    let unit = this.units().shortName;

    let label = "";
    if(includePeriod) {
      let period = this.timeseriesData.period.getLabel("data");
      period = `${period.charAt(0).toUpperCase()}${period.slice(1)}`;
      label += `${period} `
    }
    label += `${datatype}`;
    if(unit) {
      label += ` (${unit})`;
    }
    
    return label;
  }
}

export class HCDPDatasetStaticVisualization extends HCDPDatasetVisualization {
  
}



export type HCDPVisSubtypes = HCDPDatasetTimeseriesVisualization;


export interface UnitData {
  units: Signal<UnitValue>,
  convertFrom?: UnitBase
}