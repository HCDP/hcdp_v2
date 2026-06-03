import { Tab } from "../layout/tabs";




export class HCDPRaster {

}





export abstract class HCDPDataset {
  private _id: string;

  get id() {
    return this._id;
  }
}


export abstract class HCDPDatasetVisualization {
  private _tabs: Tab[]
  private _initialized: Promise<void>;
  private _layers: string[];
  

  constructor() {
    
  }

  abstract init(): Promise<void>;
}


export abstract class HCDPDatasetExport {
  
}



export class HCDPDatasetTimeseriesVisualization extends HCDPDatasetVisualization {
  private _timeseriesData: HCDPTimeseriesData;

  constructor() {
    super();
  }

  get timeseriesData() {
    return this._timeseriesData;
  }

  async init() {
    // period: DateTimeUnit, start: DateTime, end: DateTime
  }
}





  