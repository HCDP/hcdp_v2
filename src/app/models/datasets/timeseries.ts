import { DateTime } from "luxon";
import { Period } from "./time";
import { inject } from "@angular/core";
import { Configuration } from "../../services/configuration/configuration";


// dates should already have timezone built in
export class HCDPTimeseriesData {
  private config = inject(Configuration)

  private readonly _period: Period
  private readonly _start: DateTime;
  private readonly _end: DateTime;

  constructor(period: Period, start: DateTime, end: DateTime) {
    this._period = period;
    this._start = start;
    this._end = end;
  }

  get unit() {
    return this._period.unit
  }

  get interval() {
    return this._period.interval;
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

  checkDate(date: DateTime) {
    date = this._period.round(date);
    if(date > this._end) {
      date = this._end;
    }
    else if(date < this._start) {
      date = this._start;
    }
    return date;
  }

  next(date: DateTime, intervals: number = 1) {
    let nextDate = this._period.add(intervals, date)
    if(nextDate > this._end) {
      nextDate = this._end;
    }
    return nextDate;
  }

  previous(date: DateTime, intervals: number = 1) {
    let previousDate = this._period.subtract(intervals, date);
    if(previousDate < this._start) {
      previousDate = this._start;
    }
    return previousDate;
  }

  jumpBackward(date: DateTime, magnitude: number = 1, intervals = 1) {
    let higherOrder = this.period.getHigherOrder(magnitude);
    let jumpDate = null;
    if(higherOrder) {
      jumpDate = higherOrder.subtract(intervals, date);
      // round date to valid period and round out of range
      jumpDate = this.checkDate(jumpDate);
    }
    return jumpDate;
  }

  jumpForward(date: DateTime, magnitude: number = 1, intervals = 1) {
    let higherOrder = this.period.getHigherOrder(magnitude);
    let jumpDate = null;
    if(higherOrder) {
      jumpDate = higherOrder.add(intervals, date);
      // round date to valid period and round out of range
      jumpDate = this.checkDate(jumpDate);
    }
    return jumpDate;
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
      date = this._period.add(1, date);
    }
    return dates;
  }

  parseDate(dateStr: string): DateTime {
    return DateTime.fromISO(dateStr, {
      // Default to this if string has no timezone
      zone: this.config.timezone,
    });
  }
}