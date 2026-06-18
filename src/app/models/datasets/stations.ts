import { formatNumber } from "@angular/common"
import { signal, Signal, WritableSignal } from "@angular/core"

export interface RawStationData<T = StationMetadata | StationValue> {
  name: string,
  value: T,
  _etag: {
    $oid: string
  },
  _id: {
    $oid: string
  }
}

export interface StationMetadata {
  // unused right now
  // station_group: string,
  skn: string,
  lat: number,
  lng: number,
  elevation_m?: number
  name?: string,
  observer?: string,
  network?: string,
  island?: string,
  ncei_id?: string,
  nws_id?: string,
  nesdis_id?: string,
  scan_id?: string,
  smart_node_rf_id?: string
}

// ignore other datatype properties, unimportant here
export interface StationValue {
  value: number,
  station_id: string,
}

export interface StationData {
  skn: string,
  lat: number,
  lng: number,
  elevation_m?: number
  name?: string,
  observer?: string,
  network?: string,
  island?: string,
  ncei_id?: string,
  nws_id?: string,
  nesdis_id?: string,
  scan_id?: string,
  smart_node_rf_id?: string,
  value: number
}

export class HCDPStationDataManager {
  private static readonly FORMAT: Record<string, {
    name: string,
    translate?: (value: any) => string
  }> = {
    skn: {
      name: "Station ID (SKN)"
    },
    name: {
      name: "Name"
    },
    observer: {
      name: "Observer"
    },
    network: {
      name: "Network"
    },
    island: {
      name: "Island",
      translate: (value: string) => {
        let trans: Record<string, string> = {
          BI: "Hawaiʻi",
          OA: "Oʻahu",
          MA: "Maui",
          KA: "Kauai",
          MO: "Molokaʻi",
          KO: "Kahoʻolawe",
          LA: "Lānaʻi"
        }
        return trans[value];
      }
    },
    value: {
      name: "Value",
      translate: (value: number) => {
        return formatNumber(value, navigator.language, "1.2-2");
      }
    },
    elevation_m: {
      name: "Elevation (m)",
      translate: (value: number) => {
        return formatNumber(value, navigator.language, "1.2-2");
      }
    },
    lat: {
      name: "Latitude",
      translate: (value: number) => {
        return formatNumber(value, navigator.language, "1.4-4");
      }
    },
    lng: {
      name: "Longitude",
      translate: (value: number) => {
        return formatNumber(value, navigator.language, "1.4-4");
      }
    },
    ncei_id: {
      name: "NCEI ID"
    },
    nws_id: {
      name: "NWS ID"
    },
    nesdis_id: {
      name: "NESDIS ID"
    },
    scan_id: {
      name: "Scan ID"
    },
    smart_node_rf_id: {
      name: "Smart Node RFID"
    }
  };



  private dataMap: Record<string, StationData>;
  private _stationFilters: StationFilter[];
  private _filteredStationsSignal: WritableSignal<StationData[]>;

  constructor(metadata: Record<string, StationMetadata>, values: StationValue[]) {
    this.dataMap = {};
    // combine
    for(let value of values) {
      let skn = value.station_id;
      let valueMetadata = metadata[skn];
      let stationData: StationData = {
        ...valueMetadata,
        value: value.value
      }
      this.dataMap[skn] = stationData;
    }
    this._stationFilters = [];
    this._filteredStationsSignal = signal(Object.values(this.dataMap));
  }

  getLabel(field: string) {
    return HCDPStationDataManager.FORMAT[field]?.name;
  }

  getFormattedValue(field: string, value: any) {
    let translationFunction = HCDPStationDataManager.FORMAT[field]?.translate;
    if(translationFunction) {
      return translationFunction(value);
    }
    return value;
  }

  get stationData() {
    return this.dataMap;
  }

  getStationData(id: string) {
    return this.dataMap[id];
  }

  get filteredStations() {
    return this._filteredStationsSignal;
  }

  get stationFilters() {
    return this._stationFilters;
  }


  addFilter(field: keyof StationData, type: "value" | "range", values: string[] | [number, number], negate: boolean = false) {
    let filter = new StationFilter(field, type, values, negate);
    this._stationFilters.push(filter);
    this.filterValues();
    return filter;
  }

  removeFilter(filter: StationFilter) {
    let success = false;
    let index = this._stationFilters.indexOf(filter);
    if(index >= 0) {
      this._stationFilters.splice(index, 1);
      success = true;
    }
    this.filterValues();
    return success;
  }

  private filterValues() {
    let filteredStations = [];
    for(let id in this.dataMap) {
      let stationData = this.dataMap[id];
      let pass = true;
      for(let filter of this._stationFilters) {
        if(!filter.match(stationData)) {
          pass = false;
          break;
        }
      }
      if(pass) {
        filteredStations.push(stationData);
      }
    }
    this._filteredStationsSignal.set(filteredStations);
  }
}

export class StationFilter {
  private field: keyof StationData;
  private type: "value" | "range";
  private values: string[] | [number, number];
  private negate: boolean;

  constructor(field: keyof StationData, type: "value" | "range", values: string[] | [number, number], negate: boolean = false) {
    this.field = field;
    this.type = type;
    this.values = values;
    this.negate = negate;
  }

  match(stationData: StationData): boolean {
    let value = stationData[this.field];
    
    if(value === undefined) {
      return false;
    }
    let match: boolean;
    if(this.type == "value") {
      match = (this.values as string[]).includes(value as string);
    }
    else {
      let range = this.values as [number, number];
      let castedValue = value as number;
      match = castedValue >= range[0] && castedValue < range[1];
    }
    if(this.negate){
      match = !match;
    }
    return match;
  }
}