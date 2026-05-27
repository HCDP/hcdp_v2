import { Tab } from "../layout/tabs";
import { DateTime, DateTimeUnit } from "luxon";



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

  get timeseriesData() {
    return this._timeseriesData;
  }

  async init() {
    // period: DateTimeUnit, start: DateTime, end: DateTime
  }
}




// dates should already have timezone built in
export class HCDPTimeseriesData {
  private readonly _period: DateTimeUnit
  private readonly _start: DateTime;
  private readonly _end: DateTime;
  private _date: DateTime;

  constructor(period: DateTimeUnit, start: DateTime, end: DateTime, defaultDate?: DateTime) {
    this._period = period;
    this._start = start;
    this._end = end;
    if(defaultDate) {
      this._date = defaultDate;
    }
    else {
      this._date = end;
    } 
  }

  get period() {
    return this._period;
  }

  get start() {
    return this._start;
  }

  get end() {
    return this._end
  }

  get date() {
    return this._date;
  }

  setDate(date: DateTime) {
    date = this.checkDate(date);
    this._date = date;
    return date;
  }

  next(intervals?: number) {
    let date = this.checkNext(intervals);
    this._date = date;
    return date;
  }

  previous(intervals: number) {
    let date = this.checkPrevious(intervals);
    this._date = date;
    return date;
  }

  checkDate(date: DateTime) {
    // set to start of period if invalid
    date = date.startOf(this._period);
    if(date < this._start) {
      date = this._start;
    }
    else if(date > this._end) {
      date = this._end;
    }
    return date;
  }

  checkNext(intervals: number = 1) {
    let date = this._date.plus({[this._period]: intervals});
    if(date > this._end) {
      date = this._end;
    }
    return date;
  }

  checkPrevious(intervals: number = 1) {
    let date = this._date.minus({[this._period]: intervals});
    if(date < this._start) {
      date = this._start
    }
    return date;
  }


  checkJumpBackward(period: DateTimeUnit, intervals: number) {
    let date = this._date.minus({[period]: intervals});
    // round date to valid period and round out of range
    date = this.checkDate(date);
    return date;
  }

  checkJumpForward(period: DateTimeUnit, intervals: number) {
    let date = this._date.plus({[period]: intervals});
    // round date to valid period and round out of range
    date = this.checkDate(date);
    return date;
  }

  jumpForward(period: DateTimeUnit, intervals: number) {
    let date = this.checkJumpForward(period, intervals);
    this._date = date;
    return date;
  }

  jumpBackward(period: DateTimeUnit, intervals: number) {
    let date = this.checkJumpBackward(period, intervals);
    this._date = date;
    return date;
  }

  expandDates(start?: DateTime, end?: DateTime) {
    let dates = [];
    if(!start || start < this._start) {
      start = this._start;
    }
    if(!end || end > this._end) {
      end = this._end;
    }
    let date = start;
    while(date <= end) {
      dates.push(date);
      date = date.plus({[this._period]: 1})
    }
    return dates;
  }
}
  